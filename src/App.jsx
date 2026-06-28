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

// Parse environmental or sandbox configurations safely
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

// Use sanitized appId to replace all slashes with underscores so it doesn't break Firestore segment paths
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

// Secure helper to format any staff name into initials
const toInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts.map(p => p[0].toUpperCase()).join('.') + '.';
};

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
  INITIAL_SESSIONS.push({ id: `es_s1_t1_${day}`, day, taId: 't_ruby', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't1' });
  INITIAL_SESSIONS.push({ id: `es_s1_t2_${day}`, day, taId: 't_ruby', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't2' });
  INITIAL_SESSIONS.push({ id: `es_s1_t3_${day}`, day, taId: 't_ruby', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't3' });
  INITIAL_SESSIONS.push({ id: `es_s1_t4_${day}`, day, taId: 't_ruby', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't4' });
  
  if (day === 'Friday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t5_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't5' });
  } else {
    INITIAL_SESSIONS.push({ id: `es_s1_t5_${day}`, day, taId: 't1', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't5' });
  }
  
  if (day === 'Monday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t6_${day}`, day, taId: 't_jenny', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't6' });
    INITIAL_SESSIONS.push({ id: `es_s1_t7_${day}`, day, taId: 't_jenny', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't7' });
  }
  
  if (day === 'Friday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t8_${day}`, day, taId: 't_ruby', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't8' });
  } else {
    INITIAL_SESSIONS.push({ id: `es_s1_t8_${day}`, day, taId: 't1', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't8' });
  }
  
  if (day === 'Wednesday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t9_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't9' });
    INITIAL_SESSIONS.push({ id: `es_s1_t10_${day}`, day, taId: 't_ruby', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't10' });
  } else {
    INITIAL_SESSIONS.push({ id: `es_s1_t9_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't9' });
    INITIAL_SESSIONS.push({ id: `es_s1_t10_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't10' });
  }
  
  if (day === 'Thursday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t11_${day}`, day, taId: 't_ruby', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't11' });
  } else {
    INITIAL_SESSIONS.push({ id: `es_s1_t11_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't11' });
  }
  
  INITIAL_SESSIONS.push({ id: `es_s1_t12_${day}`, day, taId: 't_ruby', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't12' });
  INITIAL_SESSIONS.push({ id: `es_s1_t13_${day}`, day, taId: 't_ruby', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't13' });

  INITIAL_SESSIONS.push({ id: `hw_s1_t2_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'H.W', timeSlotId: 't2' });
  INITIAL_SESSIONS.push({ id: `hw_s1_t6_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'H.W', timeSlotId: 't6' });
  INITIAL_SESSIONS.push({ id: `hw_s1_t7_${day}`, day, taId: 't1', teacherId: 'u4', tier: TIERS.LUNCH, subject: 'H.W', timeSlotId: 't7' });
});

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
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-sans">
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

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeRole, setActiveRole] = useState(null); 
  const [authCompleted, setAuthCompleted] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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
      } catch (err) {}
      setCurrentUser(found);
      addToast(`Signed in as ${toInitials(found.name)}`, 'success');
    }
  };

  const handleEmailLoginSubmit = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const searchEmail = emailInput.toLowerCase().trim();
    const matched = safeUsers.find(u => u.email?.toLowerCase().trim() === searchEmail);
    if (matched) {
      setCurrentUser(matched);
      addToast(`Signed in as ${toInitials(matched.name)}`, 'success');
    } else {
      addToast("Email not registered. Please use a bypass profile below.", "error");
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    addToast("Logged out of session.", "info");
  };

  // Rule 3: Securely await authentication completion before triggering any database listener setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && __initial_auth_token !== 'null' && __initial_auth_token !== 'undefined') {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth init failed, fallback triggered:", err);
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Critical: Anonymous auth failed:", e);
        }
      } finally {
        setAuthLoading(false);
        setAuthCompleted(true);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Listeners strictly guarded by auth verification to avoid Missing Permission errors
  useEffect(() => {
    if (authLoading || !user) return;

    const unsubscribeUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    }, (error) => {
      console.error("Database listener user error:", error);
    });

    const unsubscribeSessions = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    }, (error) => {
      console.error("Database listener session error:", error);
    });

    const unsubscribeAbsences = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'absences'), (snapshot) => {
      setAbsences(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    }, (error) => {
      console.error("Database listener absence error:", error);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeSessions();
      unsubscribeAbsences();
    };
  }, [user, authLoading]);

  const addUserToDb = async (userObj) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userObj.id), userObj);
    } catch (e) {
      console.error("Error writing user:", e);
    }
  };

  const deleteUserFromDb = async (userId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId));
    } catch (e) {
      console.error("Error deleting user:", e);
    }
  };

  const saveSessionToDb = async (sessionData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionData.id), sessionData);
    } catch (e) {
      console.error("Error saving session:", e);
    }
  };

  const deleteSessionFromDb = async (sessionId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId));
    } catch (e) {
      console.error("Error deleting session:", e);
    }
  };

  const saveAbsenceToDb = async (absenceData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absences', absenceData.id), absenceData);
    } catch (e) {
      console.error("Error saving absence:", e);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center p-4 font-sans animate-pulse">
        <Loader2 className="animate-spin text-[#6157e8] w-8 h-8" />
        <p className="text-xs text-slate-400 mt-2.5 font-bold uppercase tracking-widest">Connecting securely...</p>
      </div>
    );
  }

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
                  {u ? toInitials(u.name) : id}
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
            <h1 className="font-bold text-xl text-[#1a1f36] leading-tight font-sans">Support Link</h1>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Halswell Hub</div>
          </div>
        </div>

        {currentUser && (currentUser.roles?.length > 1 || [currentUser.role].filter(Boolean).length > 1) && (
          <div className="flex items-center space-x-2.5 bg-violet-50 border border-violet-100 rounded-xl px-3.5 py-2 shadow-xs">
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
          <h2 className="text-2xl font-bold text-slate-800">{toInitials(user.name)} Timetable Portal</h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center">
            Allocated SENCO: <strong className="ml-1 text-[#6157e8]">{user.allocatedSenco === 'senco_cathie' ? 'C.Z.' : user.allocatedSenco === 'senco_tracey' ? 'T.M.' : 'Shared (None / Both)'}</strong>
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
          }`}>{d}</button>
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
                          Teacher: {assignedTeachers.map(t => toInitials(t.name)).join(' & ')}
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
    return found ? toInitials(found.name) : 'Selected TA';
  }, [editingCell, users]);

  const studentConflictTaName = useMemo(() => {
    if (!studentConflictSession) return '';
    const found = users.find(u => u.id === studentConflictSession.taId);
    return found ? toInitials(found.name) : 'Another TA';
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
    addToast(`Simulated absence alert created for ${toInitials(target.name)}!`, "info");
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
          <h2 className="text-xl font-bold">Welcome back, {toInitials(currentUser.name)}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="font-semibold text-slate-400">Team:</span>
            <select value={activeTeamFilter} onChange={e => setActiveTeamFilter(e.target.value)} className="bg-slate-100 p-1 rounded font-bold border outline-none cursor-pointer">
              {Object.values(TEAMS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveDashboardTab('timetable')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeDashboardTab === 'timetable' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-505'}`}>Master Timetable</button>
          <button onClick={() => setActiveDashboardTab('students')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeDashboardTab === 'students' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-505'}`}>Student Views</button>
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
                    <h4 className="font-bold text-slate-800 mt-1">{toInitials(ta?.name || 'Staff Aide')} reported {a.isAdvance ? 'advance leave' : 'sick'} on {a.formattedDate}</h4>
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
                  {users.filter(u => u.roles?.includes(ROLES.TEACHER) || u.role === ROLES.TEACHER).map(t => <option key={t.id} value={t.id}>{toInitials(t.name)}</option>)}
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
          <h2 className="text-2xl font-bold text-[#1a1f36]">{toInitials(user.name)} Dashboard</h2>
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
          <h2 className="text-2xl font-bold text-[#1a1f36]">{toInitials(user.name)} Dashboard</h2>
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

function StudentTimetablesView({ sessions, users, addToast }) {
  const autoTrackedStudents = useMemo(() => {
    const ignoredKeywords = [
      'lunch', 'morning tea', 'tea', 'no cover', 'break', 'not working', 
      'interval', 'meeting', 'duty', 'admin', 'planning', 'free session', 
      'Ōtawhito', 'otawhito', 'esol', 'office', 'classroom', 'check-in',
      'monitor', 'support', 'supervise', 'check', 'supervision', 'planning time'
    ];
    const found = new Set();
    
    sessions.forEach(s => {
      if (!s.subject) return;
      const lowerSubject = s.subject.toLowerCase().trim();
      const isIgnored = ignoredKeywords.some(kw => lowerSubject === kw || lowerSubject.includes(kw));
      if (isIgnored) return;

      let cleaned = s.subject.replace(/\s*\(.*?\)\s*/g, ' ').trim();
      if (cleaned) {
        found.add(cleaned);
      }
    });
    
    if (found.size === 0) {
      found.add('E.S');
      found.add('H.W');
    }
    return Array.from(found).sort();
  }, [sessions]);

  const [manualStudents, setManualStudents] = useState([]);
  const allTrackedStudents = useMemo(() => {
    return Array.from(new Set([...autoTrackedStudents, ...manualStudents])).sort();
  }, [autoTrackedStudents, manualStudents]);

  const [activeStudent, setActiveStudent] = useState('E.S');
  const [newStudentName, setNewStudentName] = useState('');
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);

  const handleCreateStudent = (e) => {
    e.preventDefault();
    if (newStudentName.trim()) {
      setManualStudents(prev => [...prev, newStudentName.trim()]);
      setActiveStudent(newStudentName.trim());
      setNewStudentName('');
      setShowAddStudentForm(false);
      addToast(`Added student track for ${newStudentName.trim()}`, 'success');
    }
  };

  const getCoveringStaff = (day, slotId) => {
    const matchingSession = sessions.find(s => {
      if (s.day !== day || s.timeSlotId !== slotId) return false;
      const cleanSubject = s.subject?.toLowerCase() || '';
      const cleanStudent = activeStudent.toLowerCase();
      const strippedSubject = cleanSubject.replace(/^(support|check|check-in|supervise|monitor|check)\s+/i, '').trim();

      return (
        strippedSubject === cleanStudent ||
        cleanSubject === cleanStudent || 
        cleanSubject.startsWith(cleanStudent + ' ') || 
        cleanSubject.endsWith(' ' + cleanStudent) ||
        cleanSubject.includes('(' + cleanStudent + ')') || 
        cleanSubject.includes(' - ' + cleanStudent) ||
        cleanSubject.split(/[-\/&\s]/).some(part => part.trim() === cleanStudent)
      );
    });

    if (!matchingSession || !matchingSession.taId) return null;
    const ta = users.find(u => u.id === matchingSession.taId);
    return ta ? toInitials(ta.name) : null; 
  };

  const totalWeeklySlots = TIME_SLOTS.length * DAYS.length;
  let coveredWeeklyCount = 0;
  
  DAYS.forEach(day => {
    TIME_SLOTS.forEach(slot => {
      if (getCoveringStaff(day, slot.id)) {
        coveredWeeklyCount++;
      }
    });
  });

  const uncoveredWeeklyCount = totalWeeklySlots - coveredWeeklyCount;
  const coveragePercentage = Math.round((coveredWeeklyCount / totalWeeklySlots) * 100);

  const nameToColorClass = (name) => {
    if (!name) return '';
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-blue-50 text-blue-800 border-blue-200/50',
      'bg-emerald-50 text-emerald-800 border-emerald-200/50',
      'bg-purple-50 text-purple-800 border-purple-200/50',
      'bg-pink-50 text-pink-800 border-pink-200/50',
      'bg-amber-50 text-amber-800 border-amber-200/50',
      'bg-indigo-50 text-indigo-800 border-indigo-200/50',
      'bg-teal-50 text-teal-800 border-teal-200/50'
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in font-sans">
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Tracked Students</h3>
            <p className="text-xs text-slate-400">Select a student profile to render their week-at-a-glance coverage.</p>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {allTrackedStudents.map(student => (
              <button
                key={student}
                onClick={() => setActiveStudent(student)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all flex items-center justify-between ${
                  activeStudent === student 
                    ? 'bg-[#1a1f36] text-white shadow-xs font-medium' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50'
                }`}
              >
                <span>{student}</span>
                {activeStudent === student && (
                  <span className="animate-ping h-1.5 w-1.5 rounded-full bg-yellow-400"></span>
                )}
              </button>
            ))}
          </div>

          {showAddStudentForm ? (
            <form onSubmit={handleCreateStudent} className="space-y-2 pt-2 border-t border-slate-100 animate-fade-in">
              <input
                type="text"
                placeholder="Student Name / Initials"
                value={newStudentName}
                onChange={e => setNewStudentName(e.target.value)}
                className="w-full text-xs font-medium border rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-[#6157e8]"
                maxLength={10}
                required
                autoFocus
              />
              <div className="flex gap-1.5">
                <button type="submit" className="flex-1 py-1.5 bg-[#6157e8] hover:bg-[#5249d6] text-white font-bold text-[10px] rounded uppercase tracking-wider">Save</button>
                <button type="button" onClick={() => setShowAddStudentForm(false)} className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-[10px] rounded uppercase">Cancel</button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddStudentForm(true)}
              className="w-full py-3 border border-dashed border-[#6157e8]/50 text-[#6157e8] hover:bg-violet-50/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
            >
              <Plus size={14} />
              <span>Track New Student</span>
            </button>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-1">Funding Coverage</h3>
            <span className="text-[10px] font-bold text-[#6157e8] uppercase tracking-widest block">Operational Audit</span>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-xs text-slate-400 font-medium">Assigned TA Hours:</span>
              <span className="text-xs font-medium text-slate-800">{coveredWeeklyCount * 0.5} hours / wk</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-xs text-slate-400 font-medium">Unscheduled Gaps:</span>
              <span className={`text-xs font-medium ${uncoveredWeeklyCount > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                {uncoveredWeeklyCount * 0.5} hours / wk
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-xs text-slate-400 font-medium">Coverage Rate:</span>
              <span className="text-xs font-semibold text-slate-800">{coveragePercentage}%</span>
            </div>
            
            <div className="space-y-1.5 pt-1">
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    coveragePercentage >= 90 ? 'bg-[#10b981]' :
                    coveragePercentage >= 70 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${coveragePercentage}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-400 block italic leading-relaxed">
                {uncoveredWeeklyCount > 0 
                  ? `💡 Needs attention! You have ${uncoveredWeeklyCount} uncovered slots this week.` 
                  : "🎉 Perfect coverage! No empty slots found."}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-bold text-[#1a1f36]">Week-at-a-Glance Timetable</h2>
          <p className="text-xs text-slate-400 mt-1">Review coverage allocations and identify scheduling gaps immediately.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-max table-fixed">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-4 bg-amber-400 text-[#1a1f36] font-normal text-xs border-r border-slate-200 w-44 uppercase tracking-wider select-none">
                  {activeStudent}
                </th>
                {DAYS.map(day => (
                  <th key={day} className="p-4 bg-slate-100 text-slate-500 font-normal text-xs uppercase tracking-wider border-b border-slate-200">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIME_SLOTS.map(slot => (
                <tr key={slot.id} className="hover:bg-slate-50/30 transition-all">
                  <td className="p-4 font-normal text-slate-500 text-xs border-r border-slate-200 bg-slate-50/50 whitespace-nowrap">
                    {slot.label}
                  </td>
                  
                  {DAYS.map(day => {
                    const coveringName = getCoveringStaff(day, slot.id);
                    
                    return (
                      <td key={`${slot.id}-${day}`} className="p-2 border-r border-slate-100 last:border-r-0" style={{ width: '160px' }}>
                        {coveringName ? (
                          <div className={`py-3 px-2 rounded-xl text-xs font-normal border shadow-xs transition-transform hover:scale-[1.01] ${nameToColorClass(coveringName)}`}>
                            {coveringName}
                          </div>
                        ) : (
                          <div className="py-3 px-2 bg-rose-50/60 border border-dashed border-rose-200 rounded-xl text-rose-400 text-xs font-normal leading-none italic select-none">
                            No cover
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TimetableGrid({ sessions, day, users, isEditable, onCellClick, teamFilter }) {
  const [viewMode, setViewMode] = useState('all'); 
  
  const allTas = users.filter(u => {
    const roles = u.roles || [u.role];
    return roles.includes(ROLES.TA) || roles.includes(ROLES.ORS_TEACHER);
  }).sort((a, b) => a.name.localeCompare(b.name));
  
  const tas = allTas.filter(ta => {
    if (!teamFilter || teamFilter === TEAMS.ALL) return true;
    if (teamFilter === TEAMS.BOTH) return ta.team === TEAMS.BOTH;
    if (teamFilter === TEAMS.Y0_4) return ta.team === TEAMS.Y0_4 || ta.team === TEAMS.BOTH;
    if (teamFilter === TEAMS.Y5_8) return ta.team === TEAMS.Y5_8 || ta.team === TEAMS.BOTH;
    return true;
  });

  const [activeTaId, setActiveTaId] = useState('');

  useEffect(() => {
    if (tas.length > 0) {
      if (!activeTaId || !tas.some(t => t.id === activeTaId)) {
        setActiveTaId(tas[0].id);
      }
    } else {
      setActiveTaId('');
    }
  }, [tas, activeTaId]);

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {viewMode === 'single' ? "Individual TA Mode" : "Birds-Eye Grid Overview"}
        </div>
        <div className="flex bg-slate-200/60 p-1 rounded-xl">
          <button onClick={() => setViewMode('single')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'single' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Individual TA</button>
          <button onClick={() => setViewMode('all')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Full Grid</button>
        </div>
      </div>

      {viewMode === 'single' ? (
        <div className="px-1.5 sm:px-6 py-4 space-y-6 animate-fade-in">
          <div className="flex space-x-2 overflow-x-auto pb-3 border-b border-slate-100 scrollbar-hide">
            {tas.map(ta => (
              <button
                key={ta.id}
                onClick={() => setActiveTaId(ta.id)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider whitespace-nowrap transition-all duration-150 ${
                  activeTaId === ta.id ? 'bg-[#6157e8] text-white shadow-md' : 'bg-slate-50 border border-slate-200/60 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {toInitials(ta.name)}
              </button>
            ))}
          </div>

          {activeTaId ? (
            <div className="space-y-4 max-w-2xl mx-auto animate-fade-in">
              {TIME_SLOTS.map(slot => {
                const session = sessions.find(s => s.day === day && s.timeSlotId === slot.id && s.taId === activeTaId);
                const style = session ? (TIER_STYLES[session.tier] || TIER_STYLES[TIERS.ENRICHMENT]) : null;
                const IconComponent = style ? style.icon : null;

                return (
                  <div 
                    key={slot.id} 
                    className={`flex items-stretch group ${isEditable ? 'cursor-pointer' : ''}`}
                    onClick={() => isEditable && onCellClick(slot.id, activeTaId, session)}
                  >
                    <div className="w-14 sm:w-28 flex-shrink-0 flex items-center justify-end pr-2.5 sm:pr-6 border-r border-slate-100">
                      <span className="font-normal text-slate-500 text-xs sm:text-sm text-right leading-tight">{slot.label}</span>
                    </div>

                    <div className="flex-1 pl-3 sm:pl-6 relative">
                      {session ? (
                        <div className={`border-[1.5px] p-4 rounded-[20px] transition-all flex items-center shadow-sm hover:border-[#6157e8]/40 ${style?.wrapper}`}>
                          <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center mr-4 shadow-sm ${style?.iconBg} ${style?.iconColor}`}>
                            {IconComponent && <IconComponent size={18} strokeWidth={2.5} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1 gap-2">
                              <span className={`text-[9px] tracking-wider uppercase ${session.tier === TIERS.NOT_WORKING ? 'font-normal text-slate-400' : 'font-bold'} ${style?.text}`}>
                                {session.tier}
                              </span>
                              {isEditable && (
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-[#6157e8] transition-opacity">Edit</span>
                              )}
                            </div>
                            
                            <h4 className={`text-sm leading-tight truncate ${session.tier === TIERS.NOT_WORKING ? 'font-normal text-slate-500' : 'font-medium text-slate-800'}`}>
                              {session.subject}
                            </h4>
                            
                            {(session.teacherId || session.teamLeaderId) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {session.teacherId && (
                                  <span className="bg-slate-100 text-slate-600 text-[9px] font-semibold px-2 py-0.5 rounded">
                                    T: {toInitials(users.find(u => u.id === session.teacherId)?.name || 'Teacher')}
                                  </span>
                                )}
                                {session.teamLeaderId && (
                                  <span className="bg-purple-100 text-purple-700 text-[9px] font-semibold px-2 py-0.5 rounded">
                                    L: {toInitials(users.find(u => u.id === session.teamLeaderId)?.name || 'Leader')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 rounded-[20px] p-4 border border-dashed border-slate-200/80 hover:border-[#6157e8]/50 hover:bg-[#f0efff]/20 transition-all flex items-center justify-between min-h-[72px]">
                          <span className="text-slate-400 text-xs font-semibold">Free Session</span>
                          {isEditable && <span className="text-[10px] font-bold text-[#6157e8] opacity-0 group-hover:opacity-100 transition-opacity">+ Assign Duty</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-12 bg-slate-50 rounded-[32px] border border-dashed text-slate-400 font-medium">No matching TAs under this team filter.</div>
          )}
        </div>
      ) : (
        <div className="relative max-h-[75vh] overflow-auto animate-fade-in">
          <table className="w-full text-left border-collapse min-w-max table-fixed">
            <thead>
              <tr>
                <th className="p-4 bg-white text-slate-400 font-medium text-xs uppercase tracking-wider w-32 sticky top-0 left-0 z-30 shadow-[inset_0_-2px_0_#f1f5f9,inset_-2px_0_0_#f1f5f9]">Time</th>
                {tas.map(ta => (
                  <th key={ta.id} className="p-4 bg-white text-[#1a1f36] font-semibold text-sm sticky top-0 z-20 shadow-[inset_0_-2px_0_#f1f5f9]" style={{ width: '220px' }}>
                    <div className="truncate">{toInitials(ta.name)}</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate">{ta.team}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIME_SLOTS.map(slot => (
                <tr key={slot.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="p-4 font-normal text-slate-500 text-xs whitespace-nowrap sticky left-0 z-10 bg-white shadow-[inset_-2px_0_0_#f1f5f9]">
                    {slot.label}
                  </td>
                  {tas.map(ta => {
                    const session = sessions.find(s => s.day === day && s.timeSlotId === slot.id && s.taId === ta.id);
                    const style = session ? (TIER_STYLES[session.tier] || TIER_STYLES[TIERS.ENRICHMENT]) : null;
                    
                    return (
                      <td 
                        key={`${slot.id}-${ta.id}`} 
                        className={`p-2 relative group ${isEditable ? 'cursor-pointer' : ''}`}
                        onClick={() => isEditable && onCellClick(slot.id, ta.id, session)}
                        style={{ width: '220px' }}
                      >
                        {isEditable && (
                           <div className="absolute inset-2 bg-[#6157e8]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center z-10 pointer-events-none">
                              <Edit3 className="text-[#6157e8] w-5 h-5" />
                           </div>
                        )}
                        {session ? (
                          <div className={`border ${style?.wrapper} rounded-xl p-3 h-full flex flex-col justify-center min-h-[80px] group-hover:border-[#6157e8]/30 transition-colors`}>
                            <span className={`text-[9px] tracking-wider uppercase mb-1 ${session.tier === TIERS.NOT_WORKING ? 'font-normal' : 'font-semibold'} ${style?.text}`}>
                              {session.tier}
                            </span>
                            <div className={`text-sm leading-tight font-normal ${session.tier === TIERS.NOT_WORKING ? 'font-normal text-slate-500' : 'font-medium text-slate-800'}`}>
                              {session.subject}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50/50 rounded-xl p-3 h-full border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs font-medium min-h-[80px] group-hover:border-[#6157e8]/50 group-hover:bg-[#f0efff]/50 transition-colors">Free</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CriticalCoverageBoard({ day, users, sessions, saveSessionToDb, onClose, addToast }) {
  const criticalSessions = sessions.filter(s => 
    s.day === day && 
    (s.tier === TIERS.CRITICAL || s.tier === TIERS.HIGH_NEEDS)
  );

  const tas = users.filter(u => {
    const roles = u.roles || [u.role];
    return roles.includes(ROLES.TA) || roles.includes(ROLES.ORS_TEACHER);
  });

  const getTaAvailabilityInfo = (ta, targetSlotId) => {
    const otherSession = sessions.find(s => 
      s.day === day && 
      s.timeSlotId === targetSlotId && 
      s.taId === ta.id
    );

    if (!otherSession) {
      return { label: '⭐ Available (No assigned duty)', score: 0 };
    }
    if (otherSession.tier === TIERS.NOT_WORKING) {
      return { label: '⛔ Not Working', score: 100 };
    }
    if (otherSession.tier === TIERS.ENRICHMENT) {
      return { label: `⚡ Enrichment: ${otherSession.subject} (Safe to reassign)`, score: 1 };
    }
    if (otherSession.tier === TIERS.MORNING_TEA || otherSession.tier === TIERS.LUNCH) {
      return { label: `☕ Break: ${otherSession.subject}`, score: 2 };
    }
    if (otherSession.tier === TIERS.HIGH_NEEDS) {
      return { label: `⚠️ High Needs: ${otherSession.subject}`, score: 3 };
    }
    if (otherSession.tier === TIERS.CRITICAL) {
      return { label: `🚨 Critical: ${otherSession.subject}`, score: 4 };
    }
    return { label: `Busy: ${otherSession.subject}`, score: 5 };
  };

  return (
    <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4 font-sans">
      <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full p-8 animate-fade-in max-h-[90vh] flex flex-col overflow-hidden border border-amber-200">
        <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500 w-6 h-6" />
              <h3 className="text-2xl font-bold text-[#1a1f36]">Critical Student Coverage Manager</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Directly reallocate available Teacher Aides from other duties to ensure high-priority students on {day} are covered.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {criticalSessions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-semibold">
              No Critical or High Needs students require duties on {day}.
            </div>
          ) : (
            criticalSessions.map(session => {
              const slot = TIME_SLOTS.find(t => t.id === session.timeSlotId);
              const assignedTa = tas.find(t => t.id === session.taId);
              
              const sortedTasForSlot = [...tas].sort((a, b) => {
                const infoA = getTaAvailabilityInfo(a, session.timeSlotId);
                const infoB = getTaAvailabilityInfo(b, session.timeSlotId);
                if (infoA.score !== infoB.score) return infoA.score - infoB.score;
                return a.name.localeCompare(b.name);
              });

              return (
                <div key={session.id} className="border border-slate-100 bg-slate-50/40 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-amber-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {session.tier}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {slot?.start} - {slot?.end}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-base">{session.subject}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Current Caretaker: <strong className="text-[#6157e8]">{assignedTa ? assignedTa.name : 'Unassigned'}</strong>
                    </p>
                  </div>

                  <div className="w-full md:w-auto">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reassign Cover (Best Matches First):</label>
                    <select
                      value={session.taId || ''}
                      onChange={(e) => {
                        const newTaId = e.target.value;
                        if (newTaId) {
                          saveSessionToDb({ ...session, taId: newTaId });
                          const targetTaName = tas.find(t => t.id === newTaId)?.name || 'TA';
                          addToast(`Reassigned "${session.subject}" to ${targetTaName}`, 'success');
                        }
                      }}
                      className="w-full md:w-72 border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-[#6157e8] outline-none cursor-pointer"
                    >
                      <option value="">-- Select cover TA --</option>
                      {sortedTasForSlot.map(ta => {
                        const availabilityInfo = getTaAvailabilityInfo(ta, session.timeSlotId);
                        return (
                          <option key={ta.id} value={ta.id} className={availabilityInfo.score === 0 ? "font-bold text-emerald-600" : availabilityInfo.score === 1 ? "text-indigo-600" : "text-slate-50"}>
                            {ta.name} ({availabilityInfo.label})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-100 pt-4 mt-4 flex justify-end">
          <button onClick={onClose} className="px-6 py-3 bg-[#1a1f36] hover:bg-black text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all">
            Close Board
          </button>
        </div>
      </div>
    </div>
  );
}

function CoverageResolver({ absence, users, sessions, onClose, onResolve }) {
  const absentTa = users.find(u => u.id === absence.taId) || INITIAL_USERS.find(u => u.id === absence.taId);
  const absentSessions = sessions.filter(s => s.day === absence.day && s.taId === absence.taId);
  
  const otherTas = users
    .filter(u => {
      const roles = u.roles || [u.role];
      return (roles.includes(ROLES.TA) || roles.includes(ROLES.ORS_TEACHER)) && u.id !== absence.taId;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    const initial = {};
    absentSessions.forEach(s => {
      initial[s.id] = '';
    });
    setAssignments(initial);
  }, [sessions, absence]);

  const getTaAvailabilityInfo = (ta, targetSlotId) => {
    const otherSession = sessions.find(s => 
      s.day === absence.day && 
      s.timeSlotId === targetSlotId && 
      s.taId === ta.id
    );

    if (!otherSession) {
      return { label: '⭐ Available (No assigned duty)', score: 0 };
    }
    if (otherSession.tier === TIERS.NOT_WORKING) {
      return { label: '⛔ Not Working', score: 100 };
    }
    if (otherSession.tier === TIERS.ENRICHMENT) {
      return { label: `⚡ Enrichment: ${otherSession.subject} (Safe to reassign)`, score: 1 };
    }
    if (otherSession.tier === TIERS.MORNING_TEA || otherSession.tier === TIERS.LUNCH) {
      return { label: `☕ Break: ${otherSession.subject}`, score: 2 };
    }
    if (otherSession.tier === TIERS.HIGH_NEEDS) {
      return { label: `⚠️ High Needs: ${otherSession.subject}`, score: 3 };
    }
    if (otherSession.tier === TIERS.CRITICAL) {
      return { label: `🚨 Critical: ${otherSession.subject}`, score: 4 };
    }
    return { label: `Busy: ${otherSession.subject}`, score: 5 };
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-fade-in font-sans">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Coverage: {absentTa?.name}</h3>
        <p className="text-slate-500 text-sm mb-6">Assign replacement staff for {absence.day}'s schedule.</p>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6">
          {absentSessions.map(session => {
            const slot = TIME_SLOTS.find(t => t.id === session.timeSlotId);

            const sortedOtherTas = [...otherTas].sort((a, b) => {
              const infoA = getTaAvailabilityInfo(a, session.timeSlotId);
              const infoB = getTaAvailabilityInfo(b, session.timeSlotId);
              if (infoA.score !== infoB.score) return infoA.score - infoB.score;
              return a.name.localeCompare(b.name);
            });

            return (
              <div key={session.id} className="border border-slate-100 bg-slate-50 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <span>{slot?.start} - {slot?.end}</span>
                    <span className="mx-2">•</span>
                    <span>{session?.tier}</span>
                  </div>
                  <div className="font-bold text-[#1a1f36] text-sm">{session?.subject}</div>
                </div>
                <select
                  value={assignments[session.id] || ''}
                  onChange={(e) => setAssignments(prev => ({ ...prev, [session.id]: e.target.value }))}
                  className="w-full sm:w-56 border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-semibold focus:ring-[#6157e8] outline-none cursor-pointer"
                >
                  <option value="">Leave Uncovered</option>
                  {sortedOtherTas.map(ta => {
                    const availabilityInfo = getTaAvailabilityInfo(ta, session.timeSlotId);
                    return (
                      <option key={ta.id} value={ta.id} className={availabilityInfo.score === 0 ? "font-bold text-emerald-600" : availabilityInfo.score === 1 ? "text-indigo-600" : "text-slate-50"}>
                        {ta.name} ({availabilityInfo.label})
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end space-x-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-sm transition-colors">Cancel</button>
          <button onClick={() => onResolve(assignments)} className="px-6 py-3 bg-[#1a1f36] text-white font-bold hover:bg-black rounded-xl text-sm transition-colors shadow-md">Approve Coverage</button>
        </div>
      </div>
    </div>
  );
}
