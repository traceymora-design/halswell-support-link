import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, AlertCircle, Users, CheckCircle, 
  Copy, LogOut, Bell, HeartHandshake,
  QrCode, User, Star, AlertTriangle, Coffee, Utensils,
  Plus, Edit3, Trash2, Loader2, RefreshCw, Smartphone, ShieldCheck, Laptop, MessageSquare, TrendingUp
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signOut,
  setPersistence, browserLocalPersistence, signInWithCustomToken 
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';

// Safely parse Firebase configurations for sandbox or local use
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      const parsed = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
      if (parsed && parsed.apiKey) return parsed;
    } catch (e) {
      console.error("Failed to parse sandbox config", e);
    }
  }
  return {
    apiKey: "AIzaSyDnWi7OUCjyApvDC0nclGBKWJaaCc-Cr1s",
    authDomain: "support-link-app.firebaseapp.com",
    projectId: "support-link-app",
    storageBucket: "support-link-app.firebasestorage.app",
    messagingSenderId: "1023492857246",
    appId: "1:1023492857246:web:fb16a6d68c26fb4ecd0a8f",
    measurementId: "G-ZL0YYP9Z3T"
  };
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = (typeof __app_id !== 'undefined' ? __app_id : "halswell-school-production").replace(/\//g, '_');

const isSandbox = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname.includes('web-platform') || 
  window.location.hostname.includes('sandbox') || 
  !window.location.hostname.includes('vercel.app')
);

const ROLES = {
  SENCO: 'SENCO',
  TEAM_LEADER: 'Team Leader',
  TEACHER: 'TEACHER',
  ORS_TEACHER: 'ORS Teacher',
  LSC: 'Learning Support Coordinator',
  TA: 'TA'
};

const TEAMS = {
  Y0_4: 'Years 0-4 Team',
  Y5_8: 'Years 5-8 Team',
  BOTH: 'Both Teams',
  ALL: 'All Teams / Master Admin'
};

const TIERS = {
  CRITICAL: 'Critical',
  HIGH_NEEDS: 'High Needs',
  ENRICHMENT: 'Enrichment',
  MORNING_TEA: 'Morning Tea',
  LUNCH: 'Lunch',
  NOT_WORKING: 'Not Working'
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const isStudentMatch = (subjectText, studentText) => {
  if (!subjectText || !studentText) return false;
  const clean = (str) => str.toLowerCase()
    .replace(/^(support|check|check-in|supervise|monitor|check|critical|high needs)\s+/i, '')
    .replace(/[^a-z0-9]/g, '').trim();
  return clean(subjectText).includes(clean(studentText)) || clean(studentText).includes(clean(subjectText));
};

const isSencoSupervisingTa = (senco, ta) => {
  if (!senco || !ta) return false;
  if (senco.team === TEAMS.ALL) return true;
  if (ta.allocatedSenco) {
    if (ta.allocatedSenco === senco.id) return true;
    if (ta.allocatedSenco === 'senco_tracey' && senco.id === 'senco_tracey') return true;
    if (ta.allocatedSenco === 'senco_cathie' && senco.id === 'senco_cathie') return true;
  }
  return ta.team === TEAMS.BOTH || senco.team === ta.team;
};

const TIME_SLOTS = [
  { id: 't1', start: '9:00', end: '9:30', label: '9:00 - 9:30' },
  { id: 't2', start: '9:30', end: '10:00', label: '9:30 - 10:00' },
  { id: 't3', start: '10:00', end: '10:30', label: '10:00 - 10:30' },
  { id: 't4', start: '10:30', end: '10:50', label: '10:30 - 10:50' },
  { id: 't5', start: '10:50', end: '11:10', label: '10:50 - 11:10' },
  { id: 't6', start: '11:10', end: '11:30', label: '11:10 - 11:30' },
  { id: 't7', start: '11:30', end: '12:00', label: '11:30 - 12:00' },
  { id: 't8', start: '12:00', end: '12:30', label: '12:00 - 12:30' },
  { id: 't9', start: '12:30', end: '1:00', label: '12:30 - 1:00' },
  { id: 't10', start: '1:00', end: '1:30', label: '1:00 - 1:30' },
  { id: 't11', start: '1:30', end: '2:00', label: '1:30 - 2:00' },
  { id: 't12', start: '2:00', end: '2:30', label: '2:00 - 2:30' },
  { id: 't13', start: '2:30', end: '3:00', label: '2:30 - 3:00' }
];

const INITIAL_USERS = [
  { id: 'senco_cathie', name: 'Cathie Zelas', role: ROLES.SENCO, roles: [ROLES.SENCO], email: 'cathie@halswell.school.nz', team: TEAMS.Y0_4 },
  { id: 'senco_tracey', name: 'Tracey Mora', role: ROLES.SENCO, roles: [ROLES.SENCO], email: 'tracey@halswell.school.nz', team: TEAMS.Y5_8 },
  { id: 'u2', name: 'Ben Seek', role: ROLES.TEACHER, roles: [ROLES.TEACHER], email: 'smith@school.edu', team: TEAMS.Y5_8 },
  { id: 'u3', name: 'Ally van Rossem', role: ROLES.TEACHER, roles: [ROLES.TEACHER], email: 'ally@school.edu', team: TEAMS.Y0_4 },
  { id: 'u4', name: 'Bryony Astall', role: ROLES.TEACHER, roles: [ROLES.TEACHER], email: 'bryony@school.edu', team: TEAMS.Y5_8 },
  { id: 'u5', name: 'Cameron Eaves', role: ROLES.TEACHER, roles: [ROLES.TEACHER], email: 'cameron@school.edu', team: TEAMS.Y5_8 },
  { id: 'u6', name: 'Cindy Stanford', role: ROLES.TEACHER, roles: [ROLES.TEACHER], email: 'cindy@school.edu', team: TEAMS.Y5_8 },
  { id: 't1', name: 'Karen Cate', role: ROLES.TA, roles: [ROLES.TA], email: 'karen@school.edu', team: TEAMS.Y5_8, allocatedSenco: 'senco_tracey' },
  { id: 'tl1', name: 'Greta Parkes-Dolan', role: ROLES.TEAM_LEADER, roles: [ROLES.TEAM_LEADER, ROLES.TEACHER], email: 'davis@school.edu', team: TEAMS.Y5_8 },
  { id: 't_val', name: 'Val Murray', role: ROLES.TA, roles: [ROLES.TA], email: 'val.murray@school.nz', team: TEAMS.Y5_8, allocatedSenco: 'senco_tracey' },
  { id: 't_ruby', name: 'Ruby Gray', role: ROLES.TA, roles: [ROLES.TA], email: 'ruby.gray@halswell.school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_tracey' },
  { id: 't_jenny', name: 'Jenny Randall', role: ROLES.ORS_TEACHER, roles: [ROLES.ORS_TEACHER, ROLES.TEACHER], email: 'jenny@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_cathie' }
];

const INITIAL_ABSENCES = [
  {
    id: 'abs_demo_1',
    taId: 't1',
    day: 'Monday',
    reason: 'Woke up with a heavy migraine. Seeking reading support session coverage.',
    status: 'Pending',
    reply: '',
    isAdvance: false,
    startDate: '2026-06-15',
    endDate: '2026-06-15',
    formattedDate: '15 Jun 2026',
    approvedByStuart: 'N/A'
  }
];

let INITIAL_SESSIONS = [];
DAYS.forEach(day => {
  INITIAL_SESSIONS.push({ id: `es_s1_t1_${day}`, day, taId: 't_ruby', teacherId: 't_jenny', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't1' });
  INITIAL_SESSIONS.push({ id: `es_s1_t2_${day}`, day, taId: 't_ruby', teacherId: 't_jenny', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't2' });
  INITIAL_SESSIONS.push({ id: `es_s1_t3_${day}`, day, taId: 't_ruby', teacherId: 't_jenny', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't3' });
  INITIAL_SESSIONS.push({ id: `es_s1_t4_${day}`, day, taId: 't_ruby', teacherId: 't_jenny', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't4' });
  
  if (day === 'Monday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t6_${day}`, day, taId: 't_jenny', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't6' });
    INITIAL_SESSIONS.push({ id: `es_s1_t7_${day}`, day, taId: 't_jenny', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't7' });
  }

  INITIAL_SESSIONS.push({ id: `hw_s1_t2_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'H.W', timeSlotId: 't2' });
  INITIAL_SESSIONS.push({ id: `hw_s1_t6_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'H.W', timeSlotId: 't6' });
  INITIAL_SESSIONS.push({ id: `hw_s1_t7_${day}`, day, taId: 't1', teacherId: 'u4', tier: TIERS.LUNCH, subject: 'H.W', timeSlotId: 't7' });
});

const TIER_STYLES = {
  [TIERS.CRITICAL]: { wrapper: 'border-[#ffcfd6] bg-[#fff5f6]', iconBg: 'bg-[#e04f64]', iconColor: 'text-white', icon: AlertTriangle, text: 'text-[#e04f64]', subText: 'text-[#e04f64]' },
  [TIERS.HIGH_NEEDS]: { wrapper: 'border-[#ffebd5] bg-[#fffaf5]', iconBg: 'bg-[#f4a261]', iconColor: 'text-white', icon: User, text: 'text-[#d97706]', subText: 'text-[#f4a261]' },
  [TIERS.ENRICHMENT]: { wrapper: 'border-[#e0e7ff] bg-[#f5f7ff]', iconBg: 'bg-[#6157e8]', iconColor: 'text-white', icon: Star, text: 'text-[#4338ca]', subText: 'text-[#818cf8]' },
  [TIERS.MORNING_TEA]: { wrapper: 'border-[#fef08a] bg-[#fefdf0]', iconBg: 'bg-[#eab308]', iconColor: 'text-white', icon: Coffee, text: 'text-[#ca8a04]', subText: 'text-[#eab308]' },
  [TIERS.LUNCH]: { wrapper: 'border-[#fef08a] bg-[#fefdf0]', iconBg: 'bg-[#eab308]', iconColor: 'text-white', icon: Utensils, text: 'text-[#ca8a04]', subText: 'text-[#eab308]' },
  [TIERS.NOT_WORKING]: { wrapper: 'border-slate-200 bg-slate-50 opacity-60', iconBg: 'bg-slate-200', iconColor: 'text-slate-500', icon: Calendar, text: 'text-slate-500 font-normal', subText: 'text-slate-400' }
};

const Toast = ({ message, type = 'success' }) => (
  <div className={`fixed bottom-4 right-4 flex items-center p-4 rounded-xl shadow-lg text-white transition-all z-50 animate-fade-in
    ${type === 'success' ? 'bg-[#10b981]' : 'bg-[#6157e8]'}`}>
    {type === 'success' ? <CheckCircle className="w-5 h-5 mr-3" /> : <Bell className="w-5 h-5 mr-3" />}
    <p className="font-medium text-sm">{message}</p>
  </div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorInfo: error.message };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Support Link Crash caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col justify-center items-center p-6 font-sans">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md w-full text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1a1f36] mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-500 mb-6">{this.state.errorInfo}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3 bg-[#6157e8] hover:bg-[#5249d6] text-white rounded-xl font-bold text-sm transition-colors"
            >
              Reload Support Link
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SafeApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeRole, setActiveRole] = useState(null); 
  const [authCompleted, setAuthCompleted] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const safeUsers = useMemo(() => {
    const merged = [];
    const seenIds = new Set();
    const seenEmails = new Set();

    const hasFirstAndLastName = (name) => {
      if (!name) return false;
      return name.trim().split(/\s+/).length >= 2;
    };

    users.forEach(u => {
      if (!hasFirstAndLastName(u.name)) return;
      const emailKey = u.email?.toLowerCase().trim();
      const idKey = u.id;
      if (!seenIds.has(idKey) && (!emailKey || !seenEmails.has(emailKey))) {
        merged.push(u);
        seenIds.add(idKey);
        if (emailKey) seenEmails.add(emailKey);
      }
    });

    INITIAL_USERS.forEach(iu => {
      if (!hasFirstAndLastName(iu.name)) return;
      const emailKey = iu.email?.toLowerCase().trim();
      const idKey = iu.id;
      if (!seenIds.has(idKey) && (!emailKey || !seenEmails.has(emailKey))) {
        merged.push(iu);
        seenIds.add(idKey);
        if (emailKey) seenEmails.add(emailKey);
      }
    });

    return merged;
  }, [users]);

  const safeSessions = useMemo(() => {
    const activeSessions = sessions.length > 0 ? sessions : INITIAL_SESSIONS;
    return activeSessions.map(s => {
      const taExists = safeUsers.some(u => u.id === s.taId);
      if (!taExists && s.taId) {
        return { ...s, taId: null };
      }
      return s;
    });
  }, [sessions, safeUsers]);

  const safeAbsences = useMemo(() => absences || [], [absences]);

  const handleBypassSignIn = async (id) => {
    const found = safeUsers.find(u => u.id === id) || INITIAL_USERS.find(u => u.id === id);
    if (found) {
      try {
        await addUserToDb(found);
      } catch (err) {
        console.error("Bypass profile save skipped:", err);
      }
      setCurrentUser(found);
      addToast(`Entered view for ${found.name}`, 'success');
    }
  };

  const handleEmailLoginSubmit = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const searchEmail = emailInput.toLowerCase().trim();
    const matched = safeUsers.find(u => u.email?.toLowerCase().trim() === searchEmail);
    if (matched) {
      setCurrentUser(matched);
      addToast(`Signed in as ${matched.name}`, 'success');
    } else {
      addToast("Email not found. Try one of the test profiles or register first.", "error");
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    addToast("Logged out of session.", "info");
  };

  useEffect(() => {
    if (currentUser) {
      const availableRoles = currentUser.roles || [currentUser.role];
      setActiveRole(availableRoles[0]);
    } else {
      setActiveRole(null);
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    }, () => {});

    const unsubscribeSessions = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    }, () => {});

    const unsubscribeAbsences = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'absences'), (snapshot) => {
      setAbsences(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    }, () => {});

    return () => {
      unsubscribeUsers();
      unsubscribeSessions();
      unsubscribeAbsences();
    };
  }, []);

  const addUserToDb = async (userObj) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userObj.id), userObj);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUserFromDb = async (userId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId));
    } catch (e) {
      console.error(e);
    }
  };

  const saveSessionToDb = async (sessionData) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionData.id), sessionData);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSessionFromDb = async (sessionId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId));
    } catch (e) {
      console.error(e);
    }
  };

  const saveAbsenceToDb = async (absenceData) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absences', absenceData.id), absenceData);
    } catch (e) {
      console.error(e);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center p-4 font-sans">
        <div className="flex flex-col items-center max-w-md w-full">
          <div className="bg-[#6157e8] p-4 rounded-[20px] shadow-sm mb-6">
            <HeartHandshake className="text-white w-10 h-10" strokeWidth={2} />
          </div>
          
          <h1 className="text-[32px] font-bold text-[#1a1f36] mb-1 tracking-tight">Support Link</h1>
          <p className="text-[11px] font-bold text-[#6157e8] tracking-[0.15em] uppercase mt-0.5 text-center">Halswell School TA Management Portal</p>

          <div className="w-full max-w-sm bg-white p-8 rounded-[24px] shadow-sm border border-slate-100 space-y-6 animate-fade-in flex flex-col items-stretch">
            <form onSubmit={handleEmailLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@halswell.school.nz"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-1 focus:ring-[#6157e8] outline-none text-sm font-medium text-slate-700"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 px-4 bg-[#6157e8] hover:bg-[#5249d6] text-white text-sm font-bold rounded-xl flex items-center justify-center shadow-md transition-colors"
              >
                <span>Open Portal</span>
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center space-y-3">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Staff Demo Bypass Profiles</span>
              
              <div className="space-y-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase text-left">SENCO Admins:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => handleBypassSignIn('senco_cathie')} className="py-2 px-1 bg-violet-50 hover:bg-violet-100 text-slate-700 font-semibold border rounded text-[11px] transition-colors">Cathie Zelas</button>
                  <button onClick={() => handleBypassSignIn('senco_tracey')} className="py-2 px-1 bg-violet-50 hover:bg-violet-100 text-slate-[#1a1f36] font-semibold border rounded text-[11px] transition-colors">Tracey Mora</button>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase text-left">Teacher Aides (TAs):</div>
                <div className="grid grid-cols-3 gap-1">
                  <button onClick={() => handleBypassSignIn('t1')} className="py-2 px-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 rounded text-[10px] transition-colors">Karen Cate</button>
                  <button onClick={() => handleBypassSignIn('t_ruby')} className="py-2 px-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 rounded text-[10px] transition-colors">Ruby Gray</button>
                  <button onClick={() => handleBypassSignIn('t_val')} className="py-2 px-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 rounded text-[10px] transition-colors">Val Murray</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans animate-fade-in">
      {isSandbox && (
        <div className="bg-amber-50 border-b border-amber-200/60 px-6 py-2.5 flex items-center justify-between gap-2 text-xs text-amber-800 select-none shadow-inner flex-wrap">
          <span className="font-bold flex items-center gap-1">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
            TESTING MODE — Quick Switch:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['senco_cathie', 'senco_tracey', 't1', 't_ruby', 't_val'].map(id => {
              const u = safeUsers.find(x => x.id === id);
              return (
                <button key={id} onClick={() => handleBypassSignIn(id)} className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${currentUser?.id === id ? 'bg-[#6157e8] text-white border-[#6157e8]' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
                  {u ? u.name : id}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <header className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-white sticky top-0 z-40 shadow-sm flex-wrap gap-3">
        <div className="flex items-center space-x-4">
          <div className="bg-[#f0efff] p-2 rounded-xl text-[#6157e8]"><HeartHandshake size={24} strokeWidth={2.5} /></div>
          <div>
            <h1 className="font-bold text-xl text-[#1a1f36] leading-tight">Support Link</h1>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Halswell Hub</div>
          </div>
        </div>

        {currentUser && (currentUser.roles?.length > 1 || [currentUser.role].filter(Boolean).length > 1) && (
          <div className="flex items-center space-x-2.5 bg-violet-50 border border-violet-100 rounded-xl px-3.5 py-2 shadow-xs transition-all">
            <span className="text-[10px] font-bold text-[#6157e8] uppercase tracking-wider">Active View:</span>
            <select value={activeRole || ''} onChange={(e) => { setActiveRole(e.target.value); addToast(`Switched view to ${e.target.value}`); }} className="bg-white text-slate-800 text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-[#6157e8]">
              {(currentUser.roles || [currentUser.role]).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
        
        <button onClick={handleLogout} className="flex items-center space-x-2 bg-[#f8f9fa] hover:bg-[#f1f3f5] text-slate-500 font-semibold text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl transition-colors"><LogOut size={16} /><span>Exit</span></button>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {activeRole === ROLES.SENCO && (
          <SencoDashboard currentUser={currentUser} users={safeUsers} sessions={safeSessions} absences={safeAbsences} addToast={addToast} addUserToDb={addUserToDb} deleteUserFromDb={deleteUserFromDb} saveSessionToDb={saveSessionToDb} deleteSessionFromDb={deleteSessionFromDb} saveAbsenceToDb={saveAbsenceToDb} />
        )}
        {activeRole === ROLES.TEAM_LEADER && <TeamLeaderDashboard user={currentUser} sessions={safeSessions} users={safeUsers} />}
        {activeRole === ROLES.TEACHER && <TeacherDashboard user={currentUser} sessions={safeSessions} users={safeUsers} />}
        {(activeRole === ROLES.TA || activeRole === ROLES.ORS_TEACHER) && (
          <TADashboard user={currentUser} sessions={safeSessions} absences={safeAbsences} addToast={addToast} saveAbsenceToDb={saveAbsenceToDb} users={safeUsers} />
        )}
      </main>

      {toasts.map((toast, idx) => (
        <div key={toast.id} style={{ bottom: `${1 + idx * 4.5}rem` }} className="fixed right-4 z-50">
          <Toast message={toast.message} type={toast.type} />
        </div>
      ))}
    </div>
  );
}

function TADashboard({ user, sessions, absences, addToast, saveAbsenceToDb, users }) {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceType, setAbsenceType] = useState('sick'); 
  const [approvedByStuart, setApprovedByStuart] = useState(''); 
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const mySessions = sessions.filter(s => s.taId === user.id && s.day === selectedDay);
  const myAbsences = absences.filter(a => a.taId === user.id).sort((a,b) => b.id.localeCompare(a.id)).slice(0, 5); 
  const sortedSessions = TIME_SLOTS.map(slot => ({ slot, session: mySessions.find(s => s.timeSlotId === slot.id) })).filter(item => item.session);

  const handleReportAbsence = () => {
    if (!absenceReason.trim()) { addToast('Please provide a reason.', 'error'); return; }
    if (absenceType === 'advance' && !approvedByStuart) { addToast('Please complete the Stuart leave approval checklist.', 'error'); return; }

    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const targetDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startObj.getDay()];
    const opt = { day: 'numeric', month: 'short', year: 'numeric' };
    const formattedDate = startDate === endDate ? startObj.toLocaleDateString('en-NZ', opt) : `${startObj.toLocaleDateString('en-NZ', opt)} to ${endObj.toLocaleDateString('en-NZ', opt)}`;

    if (absences.some(a => a.taId === user.id && a.startDate === startDate && a.status === 'Pending')) {
      addToast("You already have a pending submission for this date", "error");
      return;
    }
    
    saveAbsenceToDb({
      id: 'abs_' + Date.now(),
      taId: user.id,
      day: targetDay,
      startDate,
      endDate,
      formattedDate,
      isAdvance: absenceType === 'advance',
      reason: absenceReason,
      status: 'Pending',
      reply: '',
      approvedByStuart: absenceType === 'advance' ? approvedByStuart : 'N/A'
    });

    setShowAbsenceForm(false);
    setAbsenceReason('');
    setApprovedByStuart('');
    addToast("Absence submitted successfully to your SENCO.", "success");
  };

  return (
    <div className="animate-fade-in pb-20 max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{user.name} Timetable Portal</h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center">
            Allocated SENCO: <strong className="ml-1 text-[#6157e8]">{user.allocatedSenco === 'senco_cathie' ? 'Cathie Zelas' : user.allocatedSenco === 'senco_tracey' ? 'Tracey Mora' : 'Shared (None / Both)'}</strong>
          </p>
        </div>
        <button onClick={() => setShowAbsenceForm(true)} className="px-5 py-3 bg-[#e04f64] hover:bg-[#c93e53] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm">Report Absence / Leave</button>
      </div>

      {showAbsenceForm && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-red-200 shadow-2xl space-y-4 animate-fade-in max-w-lg w-full max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><AlertCircle className="text-red-500 w-5 h-5" />Report Absence</h4>
              <button onClick={() => setShowAbsenceForm(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button onClick={() => setAbsenceType('sick')} className={`py-2 rounded-lg ${absenceType === 'sick' ? 'bg-white shadow-sm' : 'text-slate-50'}`}>Today's Sick Leave</button>
              <button onClick={() => setAbsenceType('advance')} className={`py-2 rounded-lg ${absenceType === 'advance' ? 'bg-white shadow-sm' : 'text-slate-50'}`}>Leave in Advance</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold text-slate-500 block mb-1">Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-2 rounded-lg w-full" /></div>
              <div><label className="text-xs font-semibold text-slate-500 block mb-1">End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-2 rounded-lg w-full" /></div>
            </div>
            {absenceType === 'advance' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-amber-900 block">* Stuart Leave Authorization Checklist</span>
                <p className="text-amber-800">Has this future leave request already been approved by Stuart?</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1"><input type="radio" name="stuartApproval" value="Yes" checked={approvedByStuart === 'Yes'} onChange={e => setApprovedByStuart(e.target.value)} /> Yes, authorized</label>
                  <label className="flex items-center gap-1"><input type="radio" name="stuartApproval" value="No" checked={approvedByStuart === 'No'} onChange={e => setApprovedByStuart(e.target.value)} /> No, pending</label>
                </div>
              </div>
            )}
            <div><label className="text-xs font-semibold block mb-1 text-slate-500">Reason / Details</label><textarea value={absenceReason} onChange={e => setAbsenceReason(e.target.value)} className="w-full border p-3 rounded-xl text-sm focus:ring-1 focus:ring-[#6157e8] outline-none" rows={3} placeholder="Please specify details..." /></div>
            <div className="flex justify-end space-x-2 pt-3 border-t">
              <button onClick={() => setShowAbsenceForm(false)} className="px-4 py-2.5 text-xs text-slate-500">Cancel</button>
              <button onClick={handleReportAbsence} className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase">Submit to SENCO</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-1 overflow-x-auto bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm scrollbar-hide">
        {DAYS.map(d => (
          <button key={d} onClick={() => setSelectedDay(d)} className={`flex-1 min-w-[90px] py-2.5 text-center text-xs font-bold tracking-wider rounded-lg uppercase transition-all ${
            selectedDay === d ? 'bg-[#1a1f36] text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'
          }`}>
            {d}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-8 space-y-4">
        {sortedSessions.length === 0 ? (
          <div className="text-center p-12 text-slate-400 font-medium">No active support duties allocated for {selectedDay}.</div>
        ) : (
          sortedSessions.map(({ slot, session }) => {
            const style = TIER_STYLES[session?.tier] || TIER_STYLES[TIERS.ENRICHMENT];
            const IconComponent = style?.icon || Star;
            return (
              <div key={slot.id} className="flex items-stretch group border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                <div className="w-16 md:w-28 flex-shrink-0 pr-4 border-r flex flex-col justify-center items-end text-right">
                  <span className="font-normal text-slate-600 text-xs sm:text-sm text-right leading-tight">{slot.label}</span>
                </div>
                <div className={`flex-1 ml-4 md:ml-6 p-4 rounded-xl border flex items-center ${style?.wrapper}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${style?.iconBg} ${style?.iconColor}`}><IconComponent size={18} /></div>
                  <div>
                    <span className={`text-[9px] font-bold tracking-wider uppercase block ${style?.text}`}>{session?.tier}</span>
                    <h4 className="font-medium text-slate-800 text-sm md:text-base mt-0.5">{session?.subject}</h4>
                    {(() => {
                      const assignedTeachers = session?.teacherIds 
                        ? users.filter(u => session.teacherIds.includes(u.id)) 
                        : (session?.teacherId ? [users.find(u => u.id === session.teacherId)].filter(Boolean) : []);
                      if (assignedTeachers.length === 0) return null;
                      return (
                        <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded mt-1.5">
                          Teacher: {assignedTeachers.map(t => t.name).join(' & ')}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {myAbsences.length > 0 && (
        <div className="bg-white rounded-2xl border p-6 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center"><MessageSquare size={16} className="text-[#6157e8] mr-2" /> Recent Absences & SENCO Notes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myAbsences.map(a => (
              <div key={a.id} className="p-4 bg-slate-50 rounded-xl border shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">{a.isAdvance ? 'Advance Leave' : 'Sick Leave'} ({a.formattedDate})</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${a.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>{a.status}</span>
                </div>
                <div className="text-slate-500 text-xs italic bg-white p-2 rounded border">Reason: "{a.reason}"</div>
                {a.reply && (
                  <div className="bg-violet-50 p-3 rounded-lg border border-violet-100 text-xs italic">
                    <span className="font-bold text-[#6157e8] block not-italic uppercase text-[9px] mb-1">SENCO:</span>"{a.reply}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SencoDashboard({ currentUser, users, sessions, absences, addToast, addUserToDb, deleteUserFromDb, saveSessionToDb, deleteSessionFromDb, saveAbsenceToDb }) {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [resolvingAbsence, setResolvingAbsence] = useState(null);
  const [editingCell, setEditingCell] = useState(null); 
  const [showManageStaff, setShowManageStaff] = useState(false);
  const [showCriticalCoverBoard, setShowCriticalCoverBoard] = useState(false); 
  const [activeDashboardTab, setActiveDashboardTab] = useState('timetable');

  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRoles, setNewStaffRoles] = useState([ROLES.TA]); 
  const [newStaffTeam, setNewStaffTeam] = useState(TEAMS.Y5_8);
  const [newStaffSenco, setNewStaffSenco] = useState('');
  const [newStaffTeacher, setNewStaffTeacher] = useState('');
  const [newStaffTeamLeader, setNewStaffTeamLeader] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);

  const [activeTeamFilter, setActiveTeamFilter] = useState(TEAMS.ALL);
  const [sencoReplies, setSencoReplies] = useState({});

  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [copyScope, setCopyScope] = useState('whole-day'); 
  const [copySelectedTaId, setCopySelectedTaId] = useState('');
  const [copyTargetDays, setCopyTargetDays] = useState({ Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false });
  const [copyOverwrite, setCopyOverwrite] = useState(true);

  const [modalSubject, setModalSubject] = useState('');
  const [modalTier, setModalTier] = useState(TIERS.ENRICHMENT);
  const [modalTeacherId, setModalTeacherId] = useState('');
  const [modalTeamLeaderId, setModalTeamLeaderId] = useState('');
  const [overrideConfirm, setOverrideConfirm] = useState(false);

  useEffect(() => {
    if (editingCell) {
      setModalSubject(editingCell.session?.subject || '');
      setModalTier(editingCell.session?.tier || TIERS.ENRICHMENT);
      setModalTeacherId(editingCell.session?.teacherId || '');
      setModalTeamLeaderId(editingCell.session?.teamLeaderId || '');
      setOverrideConfirm(false);
    }
  }, [editingCell]);

  const taConflictSession = useMemo(() => {
    if (!editingCell || !editingCell.taId) return null;
    return sessions.find(s => s.day === selectedDay && s.timeSlotId === editingCell.timeSlotId && s.taId === editingCell.taId && s.tier !== TIERS.NOT_WORKING && (!editingCell.session || s.id !== editingCell.session.id));
  }, [sessions, selectedDay, editingCell]);

  const studentConflictSession = useMemo(() => {
    if (!editingCell || !modalSubject.trim()) return null;
    return sessions.find(s => s.day === selectedDay && s.timeSlotId === editingCell.timeSlotId && s.taId !== editingCell.taId && (s.tier === TIERS.CRITICAL || s.tier === TIERS.HIGH_NEEDS) && (modalTier === TIERS.CRITICAL || modalTier === TIERS.HIGH_NEEDS) && isStudentMatch(s.subject, modalSubject) && (!editingCell.session || s.id !== editingCell.session.id));
  }, [modalSubject, modalTier, sessions, selectedDay, editingCell]);

  const taConflictTaName = useMemo(() => {
    if (!editingCell?.taId) return '';
    const found = users.find(u => u.id === editingCell.taId);
    return found ? found.name : 'Selected TA';
  }, [editingCell, users]);

  const studentConflictTaName = useMemo(() => {
    if (!studentConflictSession) return '';
    const found = users.find(u => u.id === studentConflictSession.taId);
    return found ? found.name : 'Another TA';
  }, [studentConflictSession, users]);

  const isSubmitDisabled = (taConflictSession || studentConflictSession) && !overrideConfirm;

  const directAbsences = absences.filter(a => a.status === 'Pending' && isSencoSupervisingTa(currentUser, users.find(u => u.id === a.taId)));
  const coSencoAbsences = absences.filter(a => a.status === 'Pending' && !isSencoSupervisingTa(currentUser, users.find(u => u.id === a.taId)));
  const resolvedAbsences = absences.filter(a => a.status !== 'Pending').sort((a,b) => b.id.localeCompare(a.id));

  const handleUpdateAbsenceStatus = async (absence, newStatus) => {
    const replyText = sencoReplies[absence.id] || "Approved cover.";
    await saveAbsenceToDb({ ...absence, status: newStatus, reply: replyText });
    addToast("Absence status logged securely to Cloud database.", 'success');
  };

  const handleTriggerTestAlert = async () => {
    const list = users.filter(u => u.roles?.includes(ROLES.TA) || u.role === ROLES.TA);
    const target = list[Math.floor(Math.random() * list.length)] || users[0];
    if (!target) return;
    await saveAbsenceToDb({
      id: 'abs_' + Date.now(),
      taId: target.id,
      day: selectedDay,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      formattedDate: "Today",
      isAdvance: false,
      reason: "Feeling unwell, unable to make morning shift.",
      status: "Pending",
      reply: "",
      approvedByStuart: "N/A"
    });
    addToast(`Simulated absence alert created for ${target.name}!`, "info");
  };

  const handleStartEditStaff = (staff) => {
    setEditingStaff(staff);
    setNewStaffName(staff.name);
    setNewStaffEmail(staff.email || '');
    setNewStaffRoles(staff.roles || [staff.role]);
    setNewStaffTeam(staff.team || TEAMS.Y5_8);
    setNewStaffSenco(staff.allocatedSenco || '');
  };

  const handleCancelEditStaff = () => {
    setEditingStaff(null);
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffRoles([ROLES.TA]);
    setNewStaffTeam(TEAMS.Y5_8);
    setNewStaffSenco('');
    setNewStaffTeacher('');
    setNewStaffTeamLeader('');
  };

  const handleAddOrUpdateStaff = () => {
    if(!newStaffName.trim() || !newStaffEmail.trim()) { addToast('Please enter full details.', 'error'); return; }
    const updated = {
      id: editingStaff ? editingStaff.id : 'u_' + Date.now(),
      name: newStaffName,
      email: newStaffEmail,
      roles: newStaffRoles,
      role: newStaffRoles[0],
      team: newStaffTeam,
      allocatedSenco: newStaffSenco || null
    };
    addUserToDb(updated);
    addToast(editingStaff ? "Staff profile updated." : "Staff profile added.", "success");
    handleCancelEditStaff();
  };

  const handleDeleteStaff = (userId) => {
    deleteUserFromDb(userId);
    addToast("Staff profile removed.", "info");
  };

  const handleSaveSession = (newSessionData) => {
    saveSessionToDb({
      id: editingCell.session ? editingCell.session.id : 'sess_' + Date.now(),
      day: selectedDay,
      timeSlotId: editingCell.timeSlotId,
      taId: editingCell.taId,
      ...newSessionData
    });
    setEditingCell(null);
    addToast("Duties synchronized securely.", "success");
  };

  const handleDeleteSession = () => {
    if (editingCell.session) {
      deleteSessionFromDb(editingCell.session.id);
      addToast("Session removed.", "info");
    }
    setEditingCell(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Welcome back, {currentUser.name}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="font-semibold text-slate-400">Team:</span>
            <select value={activeTeamFilter} onChange={e => setActiveTeamFilter(e.target.value)} className="bg-slate-100 p-1 rounded font-bold border outline-none cursor-pointer">
              {Object.values(TEAMS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveDashboardTab('timetable')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeDashboardTab === 'timetable' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-50'}`}>Master Timetable</button>
          <button onClick={() => setActiveDashboardTab('students')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeDashboardTab === 'students' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-50'}`}>Student Views</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCriticalCoverBoard(true)} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"><AlertTriangle size={14} /> Critical Coverage Board</button>
          <button onClick={() => setShowManageStaff(true)} className="px-4 py-2 bg-[#6157e8] text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"><Users size={14} /> Manage Staff & Teams</button>
        </div>
      </div>

      {directAbsences.length > 0 && (
        <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-red-800 flex items-center gap-2"><Bell className="animate-bounce text-red-600" /> Live TA Absence Alerts</h3>
          <div className="grid grid-cols-1 gap-3">
            {directAbsences.map(a => {
              const ta = users.find(u => u.id === a.taId);
              return (
                <div key={a.id} className="bg-white p-4 rounded-xl border border-red-200 flex justify-between items-start flex-wrap gap-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                  <div className="pl-2">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{ta?.team || 'TA Aide'}</span>
                    <h4 className="font-bold text-slate-800 mt-1">{ta?.name || 'Staff Aide'} reported {a.isAdvance ? 'advance leave' : 'sick'} on {a.formattedDate}</h4>
                    <p className="text-slate-500 text-xs italic mt-2">"{a.reason}"</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="Write reply note..." value={sencoReplies[a.id] || ''} onChange={e => setSencoReplies({ ...sencoReplies, [a.id]: e.target.value })} className="border p-2 rounded-lg text-xs" />
                    <button onClick={() => handleUpdateAbsenceStatus(a, 'Approved')} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs transition-colors">Approve & Archive</button>
                    <button onClick={() => setResolvingAbsence(a)} className="px-4 py-2 bg-[#6157e8] text-white font-bold rounded-lg text-xs transition-colors">Reassign</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeDashboardTab === 'timetable' ? (
        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
          <div className="p-6 border-b flex justify-between items-center bg-white flex-wrap gap-4">
            <div><h2 className="text-xl font-bold">Master Timetable Grid</h2><p className="text-xs text-slate-400">Manage and allocate daily support schedules.</p></div>
            <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="bg-slate-50 border rounded-xl px-4 py-2.5 outline-none font-semibold text-sm cursor-pointer">
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <TimetableGrid sessions={sessions} day={selectedDay} users={users} isEditable={true} teamFilter={activeTeamFilter} onCellClick={(timeSlotId, taId, session) => setEditingCell({timeSlotId, taId, session})} />
        </div>
      ) : (
        <StudentTimetablesView sessions={sessions} users={users} addToast={addToast} />
      )}

      {showManageStaff && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full p-8 animate-fade-in max-h-[90vh] flex flex-col md:grid md:grid-cols-12 md:gap-8 overflow-hidden">
            <div className="col-span-12 border-b pb-4 mb-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold">Manage Staff & Teams</h3>
              <button onClick={() => { setShowManageStaff(false); handleCancelEditStaff(); }} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <div className="col-span-12 md:col-span-6 flex flex-col min-h-0 overflow-hidden pr-6 border-r border-slate-100">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">All Active Staff Directory ({users.length})</h4>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {users.map(u => (
                  <div key={u.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{u.name}</div>
                      <span className="text-[9px] font-bold bg-[#f0efff] text-[#6157e8] px-2 py-0.5 rounded border border-violet-100 uppercase mt-1 inline-block">{(u.roles || [u.role])[0]}</span>
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border ml-1 inline-block">{u.team}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleStartEditStaff(u)} className="p-2 text-[#6157e8] hover:bg-violet-100 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteStaff(u.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-6 flex flex-col min-h-0 overflow-y-auto pt-4 md:pt-0 space-y-4">
              <h4 className="font-bold text-sm mb-3">{editingStaff ? `Edit Details: ${editingStaff.name}` : 'Add New Staff member'}</h4>
              <div className="space-y-4 text-xs font-semibold">
                <div><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Staff Full Name</label><input type="text" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="w-full border rounded-xl px-4 py-3" placeholder="First and last name..." /></div>
                <div><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Google Email Address</label><input type="email" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} className="w-full border rounded-xl px-4 py-3" placeholder="school@email..." /></div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Role</label>
                  <select value={newStaffRoles[0]} onChange={e => setNewStaffRoles([e.target.value])} className="w-full border rounded-xl px-4 py-3 cursor-pointer">
                    {Object.values(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Team Allocation</label>
                  <select value={newStaffTeam} onChange={e => setNewStaffTeam(e.target.value)} className="w-full border rounded-xl px-4 py-3 cursor-pointer">
                    {Object.values(TEAMS).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Assigned Senco supervisor</label>
                  <select value={newStaffSenco} onChange={e => setNewStaffSenco(e.target.value)} className="w-full border rounded-xl px-4 py-3 cursor-pointer">
                    <option value="">None / Both</option>
                    <option value="senco_tracey">Tracey Mora</option>
                    <option value="senco_cathie">Cathie Zelas</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  {editingStaff && <button onClick={handleCancelEditStaff} className="px-5 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">Cancel Edit</button>}
                  <button onClick={handleAddOrUpdateStaff} className="px-6 py-3 bg-[#6157e8] text-white font-bold hover:bg-[#5249d6] rounded-xl transition-colors shadow-md">Save Staff Profile</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingCell && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-fade-in border border-slate-100">
            <h3 className="text-2xl font-bold text-[#1a1f36] mb-6">{editingCell.session ? 'Edit Duty' : 'Assign Duty'}</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSession({ subject: modalSubject, tier: modalTier, teacherId: modalTeacherId || null, teamLeaderId: modalTeamLeaderId || null }); }} className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject / Student Name</label><input type="text" name="subject" required value={modalSubject} onChange={(e) => setModalSubject(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-slate-700" placeholder="e.g. ESOL / Reading Support..." /></div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Priority Tier</label>
                <select name="tier" value={modalTier} onChange={(e) => setModalTier(e.target.value)} className="w-full border rounded-xl px-4 py-3 cursor-pointer">
                  {Object.values(TIERS).map(tier => <option key={tier} value={tier}>{tier}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Teacher</label>
                <select name="teacherId" value={modalTeacherId} onChange={(e) => setModalTeacherId(e.target.value)} className="w-full border rounded-xl px-4 py-3 cursor-pointer">
                  <option value="">None / Self-Directed</option>
                  {users.filter(u => u.roles?.includes(ROLES.TEACHER) || u.role === ROLES.TEACHER).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {(taConflictSession || studentConflictSession) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-800">
                  <div className="flex items-center gap-2 font-bold text-amber-900"><AlertTriangle size={14} className="text-amber-500" />Double-Allocation Warning!</div>
                  {taConflictSession && <p>⚠️ <strong>{taConflictTaName}</strong> is already assigned to support <strong>"{taConflictSession.subject}"</strong> on {selectedDay} during this timeslot.</p>}
                  {studentConflictSession && <p>⚠️ Student receiving support (<strong>"{modalSubject}"</strong>) is already scheduled with <strong>{studentConflictTaName}</strong> during this timeslot.</p>}
                  <label className="flex items-center gap-2 cursor-pointer font-bold"><input type="checkbox" checked={overrideConfirm} onChange={e => setOverrideConfirm(e.target.checked)} className="rounded text-amber-500" /> Allow double-up (Joint support)</label>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                {editingCell.session && <button type="button" onClick={handleDeleteSession} className="px-5 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-bold mr-auto"><Trash2 size={16} /></button>}
                <button type="button" onClick={() => setEditingCell(null)} className="px-5 py-3 text-slate-500">Cancel</button>
                <button type="submit" disabled={isSubmitDisabled} className={`px-6 py-3 font-bold rounded-xl shadow-md ${isSubmitDisabled ? 'bg-slate-200 text-slate-400' : 'bg-[#1a1f36] text-white hover:bg-black'}`}>Save Duty</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resolvingAbsence && (
        <CoverageResolver absence={resolvingAbsence} users={users} sessions={sessions} onClose={() => setResolvingAbsence(null)} onResolve={(assignments) => {
          Object.entries(assignments).forEach(([sessId, coveringTaId]) => {
            const match = sessions.find(s => s.id === sessId);
            if (match && coveringTaId) saveSessionToDb({ ...match, taId: coveringTaId });
          });
          handleUpdateAbsenceStatus(resolvingAbsence, 'Approved');
          setResolvingAbsence(null);
        }} />
      )}

      {showCriticalCoverBoard && (
        <CriticalCoverageBoard day={selectedDay} users={users} sessions={sessions} saveSessionToDb={saveSessionToDb} onClose={() => setShowCriticalCoverBoard(false)} addToast={addToast} />
      )}
    </div>
  );
}

function TeamLeaderDashboard({ user, sessions, users }) {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const teamSessions = sessions.filter(s => s.day === selectedDay && s.teamLeaderId === user.id);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto font-sans">
      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[24px] border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1f36]">{user.name} Dashboard</h2>
          <p className="text-xs font-semibold text-[#6157e8] uppercase mt-1 tracking-wider">Team Leader View</p>
        </div>
        <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-white border border-slate-200 text-[#1a1f36] font-semibold rounded-xl px-4 py-2.5 outline-none cursor-pointer">
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-md">Your Assigned Team Schedules</h3>
        </div>
        <div className="p-0">
          <TimetableGrid sessions={teamSessions} day={selectedDay} users={users} isEditable={false} />
        </div>
      </div>
    </div>
  );
}

function TeacherDashboard({ user, sessions, users }) {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const teacherSessions = sessions.filter(s => 
    s.day === selectedDay && 
    (s.teacherId === user.id || (s.teacherIds && s.teacherIds.includes(user.id)))
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto font-sans">
      <div className="flex justify-between items-center bg-[#f8fafc] p-6 rounded-[24px] border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1f36]">{user.name} Dashboard</h2>
          <p className="text-xs font-semibold text-[#6157e8] uppercase mt-1 tracking-wider">Teacher View</p>
        </div>
        <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-white border border-slate-200 text-[#1a1f36] font-semibold rounded-xl px-4 py-2.5 cursor-pointer">
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-md">Your Supporting TAs</h3>
        </div>
        <div className="p-0">
          <TimetableGrid sessions={teacherSessions} day={selectedDay} users={users} isEditable={false} />
        </div>
      </div>
    </div>
  );
}
