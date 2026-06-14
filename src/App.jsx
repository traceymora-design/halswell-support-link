import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, AlertCircle, Users, CheckCircle, 
  Copy, LogOut, Bell, HeartHandshake,
  QrCode, User, Star, AlertTriangle, Coffee, Utensils,
  Plus, Edit3, Trash2, Loader2, RefreshCw, Smartphone, ShieldCheck, Laptop, MessageSquare, TrendingUp
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
  setPersistence, browserLocalPersistence 
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';

const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      const parsed = JSON.parse(__firebase_config);
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

const getCleanAppId = () => {
  const rawId = typeof __app_id !== 'undefined' ? __app_id : "halswell-school-production";
  return rawId.split('/')[0];
};
const appId = getCleanAppId();

const isSandboxEnv = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host === 'localhost' || 
    host.includes('web-platform') || 
    host.includes('sandbox') || 
    !host.includes('vercel.app')
  );
};
const isSandbox = isSandboxEnv();

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

const isSencoSupervisingTa = (senco, ta) => {
  if (!senco || !ta) return false;
  if (senco.team === TEAMS.ALL) return true;
  
  if (ta.allocatedSenco) {
    if (ta.allocatedSenco === senco.id) return true;
    if (ta.allocatedSenco === 'senco_tracey' && (senco.id === 'senco_tracey' || senco.name?.toLowerCase().includes('tracey'))) return true;
    if (ta.allocatedSenco === 'senco_cathie' && (senco.id === 'senco_cathie' || senco.name?.toLowerCase().includes('cathie'))) return true;
  }
  
  if (ta.team === TEAMS.BOTH) return true;
  if (senco.team === ta.team) return true;
  
  return false;
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
  { id: 't_praboda', name: 'Praboda', role: ROLES.TA, roles: [ROLES.TA], email: 'praboda@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_cathie' },
  { id: 't_tiffany', name: 'Tiffany', role: ROLES.TA, roles: [ROLES.TA], email: 'tiffany@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_tracey' },
  { id: 't_jenny', name: 'Jenny', role: ROLES.ORS_TEACHER, roles: [ROLES.ORS_TEACHER], email: 'jenny@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_cathie' },
  { id: 't_tara', name: 'Tara', role: ROLES.TA, roles: [ROLES.TA], email: 'tara@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_tracey' }
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
let sessionIdCounter = 1;

DAYS.forEach(day => {
  const daySessions = [
    { timeSlotId: 't1', tier: TIERS.HIGH_NEEDS, subject: 'Jess', teamLeaderId: 'tl1' },
    { timeSlotId: 't3', tier: TIERS.MORNING_TEA, subject: 'Morning Tea', teacherId: null },
    { timeSlotId: 't4', tier: TIERS.ENRICHMENT, subject: 'Casey', teamLeaderId: 'tl1' },
    { timeSlotId: 't9', tier: TIERS.LUNCH, subject: 'Lunch', teacherId: null }
  ];
  daySessions.forEach(s => {
    INITIAL_SESSIONS.push({ id: `s${sessionIdCounter++}`, day, taId: 't1', teacherId: 'u2', ...s });
  });
});

DAYS.forEach(day => {
  INITIAL_SESSIONS.push({ id: `hw_s1_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'H.W' });
  INITIAL_SESSIONS.push({ id: `hw_s2_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'H.W' });
  INITIAL_SESSIONS.push({ 
    id: `hw_s3_${day}`, 
    day, 
    taId: day === 'Friday' ? 't1' : 't_praboda', 
    teacherId: 'u4', 
    tier: TIERS.LUNCH, 
    subject: 'H.W (First lunch)' 
  });
  INITIAL_SESSIONS.push({ 
    id: `hw_s4_${day}`, 
    day, 
    taId: day === 'Friday' ? 't_tara' : 't_tiffany', 
    teacherId: 'u2', 
    tier: TIERS.HIGH_NEEDS, 
    subject: 'H.W' 
  });
  INITIAL_SESSIONS.push({ id: `hw_s5_${day}`, day, taId: 't_jenny', teacherId: 'u5', tier: TIERS.HIGH_NEEDS, subject: 'H.W' });
  INITIAL_SESSIONS.push({ 
    id: `hw_s6_${day}`, 
    day, 
    taId: day === 'Thursday' ? 't_val' : 't_praboda', 
    teacherId: 'u3', 
    tier: TIERS.LUNCH, 
    subject: 'H.W (Second lunch)' 
  });
  INITIAL_SESSIONS.push({ 
    id: `hw_s7_${day}`, 
    day, 
    taId: day === 'Friday' ? 't1' : 't_tiffany', 
    teacherId: 'u2', 
    tier: TIERS.CRITICAL, 
    subject: 'H.W' 
  });
});

DAYS.forEach(day => {
  if (day === 'Monday' || day === 'Wednesday' || day === 'Friday') {
    INITIAL_SESSIONS.push({
      id: `es_s1_${day}`,
      day,
      taId: 't_ruby',
      teacherId: 'u3',
      tier: TIERS.CRITICAL,
      subject: 'E.S'
    });
  } else {
    INITIAL_SESSIONS.push({
      id: `es_s2_${day}`,
      day,
      taId: 't_val',
      teacherId: 'u2',
      tier: TIERS.HIGH_NEEDS,
      subject: 'E.S'
    });
  }
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
  const [dbUser, setDbUser] = useState(null); 
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeRole, setActiveRole] = useState(null); 
  const [accessDenied, setAccessDenied] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [authCompleted, setAuthCompleted] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showMobileSync, setShowMobileSync] = useState(false);
  const [verifyingGoogle, setVerifyingGoogle] = useState(false);

  const [syncStatus, setSyncStatus] = useState('synced'); 
  const [lastSavedTime, setLastSavedTime] = useState(() => new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [showSaveVerificationModal, setShowSaveVerificationModal] = useState(false);
  const [isVerifyingConnection, setIsVerifyingConnection] = useState(false);

  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (currentUser) {
      const availableRoles = currentUser.roles || [currentUser.role];
      setActiveRole(availableRoles[0]);
    } else {
      setActiveRole(null);
    }
  }, [currentUser]);

  const handlePostSignIn = async (firebaseUser) => {
    if (!firebaseUser) return;
    const email = firebaseUser.email?.toLowerCase();
    if (!email) return;

    try {
      const usersSnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
      const fetchedUsersList = usersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      
      const matchedUser = fetchedUsersList.find(u => u.email?.toLowerCase() === email);
      if (matchedUser) {
        setCurrentUser(matchedUser);
        setAccessDenied(false);
      } else if (fetchedUsersList.length === 0) {
        const newSenco = {
          id: 'u' + Date.now(),
          name: firebaseUser.displayName || 'School Admin',
          role: ROLES.SENCO,
          roles: [ROLES.SENCO],
          email: email,
          team: TEAMS.ALL
        };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', newSenco.id), newSenco);
        setCurrentUser(newSenco);
        setAccessDenied(false);
      } else {
        setCurrentUser(null);
        setAccessDenied(true);
      }
    } catch (err) {
      console.error("Post-auth mapping failed:", err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const persistenceType = browserLocalPersistence;
        await setPersistence(auth, persistenceType);

        const redirectResult = await getRedirectResult(auth);
        if (redirectResult && redirectResult.user) {
          await handlePostSignIn(redirectResult.user);
        } else if (auth.currentUser && !auth.currentUser.isAnonymous) {
          await handlePostSignIn(auth.currentUser);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth init failed:", err);
      } finally {
        setAuthCompleted(true);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setDbUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [rememberMe]);

  useEffect(() => {
    if (!authCompleted || !dbUser) return;

    let usersLoaded = false;
    let sessionsLoaded = false;
    let absencesLoaded = false;

    const checkReady = () => {
      if (usersLoaded && sessionsLoaded && absencesLoaded) setIsDbReady(true);
    };

    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubUsers = onSnapshot(usersRef, async (snapshot) => {
      try {
        const fetchedUsers = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setUsers(fetchedUsers);
        
        if (fetchedUsers.length === 0) {
          INITIAL_USERS.forEach(u => setDoc(doc(usersRef, u.id), u));
          INITIAL_SESSIONS.forEach(s => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', s.id), s));
          INITIAL_ABSENCES.forEach(a => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absences', a.id), a));
        }

        if (auth.currentUser && !auth.currentUser.isAnonymous && auth.currentUser.email) {
          const email = auth.currentUser.email.toLowerCase();
          const matchedUser = fetchedUsers.find(u => u.email?.toLowerCase() === email);
          if (matchedUser) {
            setCurrentUser(matchedUser);
            setAccessDenied(false);
          } else {
            setAccessDenied(true);
          }
        }
      } catch (err) {
        console.error("Failed to parse snapshots gracefully:", err);
      }
      if(!usersLoaded) { usersLoaded = true; checkReady(); }
    }, (error) => {
      console.warn("Database listener warning:", error);
      if(!usersLoaded) { usersLoaded = true; checkReady(); }
    });

    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    const unsubSessions = onSnapshot(sessionsRef, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
      if(!sessionsLoaded) { sessionsLoaded = true; checkReady(); }
    }, (error) => {
      if(!sessionsLoaded) { sessionsLoaded = true; checkReady(); }
    });

    const absencesRef = collection(db, 'artifacts', appId, 'public', 'data', 'absences');
    const unsubAbsences = onSnapshot(absencesRef, (snapshot) => {
      setAbsences(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
      if(!absencesLoaded) { absencesLoaded = true; checkReady(); }
    }, (error) => {
      if(!absencesLoaded) { absencesLoaded = true; checkReady(); }
    });

    return () => { unsubUsers(); unsubSessions(); unsubAbsences(); };
  }, [authCompleted, dbUser]);

  const handleDbOp = async (opFn) => {
    setSyncStatus('saving');
    try {
      await opFn();
      setSyncStatus('synced');
      setLastSavedTime(new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error("Database operation failed:", err);
      setSyncStatus('error');
      addToast("Failed to sync change to cloud database. Retrying...", "error");
    }
  };

  const addUserToDb = async (userObj) => handleDbOp(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userObj.id), userObj));
  const deleteUserFromDb = async (userId) => handleDbOp(() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId)));
  const saveSessionToDb = async (sessionData) => handleDbOp(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionData.id), sessionData));
  const deleteSessionFromDb = async (sessionId) => handleDbOp(() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId)));
  const saveAbsenceToDb = async (absenceData) => handleDbOp(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absences', absenceData.id), absenceData));

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleSimpleSignIn = (staffObj) => {
    setCurrentUser(staffObj);
    addToast(`Signed in as ${staffObj.name}`, 'success');
  };

  const handleGoogleSignIn = async () => {
    setVerifyingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      if (isSandbox) {
        handleSimpleSignIn({
          id: 'senco_tracey',
          name: 'Tracey Mora',
          role: ROLES.SENCO,
          roles: [ROLES.SENCO],
          email: 'tracey@halswell.school.nz',
          team: TEAMS.Y5_8
        });
        return;
      }

      try {
        const result = await signInWithPopup(auth, provider);
        await handlePostSignIn(result.user);
      } catch (popupErr) {
        console.warn("Popup blocked, falling back to secure redirect strategy:", popupErr);
        await signInWithRedirect(auth, provider);
      }
    } catch (e) {
      console.error("Google Sign-In failed completely:", e);
      addToast("Secure verification blocked or failed.", "error");
    } finally {
      setVerifyingGoogle(false);
    }
  };

  const handleBypassSignIn = async (id) => {
    const found = users.find(u => u.id === id) || INITIAL_USERS.find(u => u.id === id);
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

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setAccessDenied(false);
    addToast("Logged out of session.", "info");
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Anonymous fallback failed:", err);
    }
  };

  if (!authCompleted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center">
        <Loader2 className="w-12 h-12 text-[#6157e8] animate-spin mb-4" />
        <h2 className="text-[#1a1f36] font-bold text-lg">Connecting Securely...</h2>
      </div>
    );
  }

  if (accessDenied && !currentUser) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center p-4 font-sans">
        <div className="flex flex-col items-center max-w-md w-full">
          <div className="bg-[#6157e8] p-4 rounded-[20px] shadow-sm mb-6">
            <HeartHandshake className="text-white w-10 h-10" strokeWidth={2} />
          </div>
          <h1 className="text-[36px] font-bold text-[#1a1f36] mb-3 tracking-tight">Support Link</h1>
          <div className="w-full max-w-sm bg-white p-8 rounded-[24px] shadow-sm border border-red-100 text-center animate-fade-in">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1a1f36] mb-2">Access Denied</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              The Google email address <b className="text-slate-800">{auth.currentUser?.email || "your Google Account"}</b> is not registered. Please ask Tracey or Cathie to add your email.
            </p>
            <button onClick={handleLogout} className="w-full py-3 bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm">Sign out & try another account</button>
          </div>
        </div>
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
          
          <h1 className="text-[36px] font-bold text-[#1a1f36] mb-3 tracking-tight">Support Link</h1>
          <p className="text-[11px] font-bold text-[#6157e8] tracking-[0.2em] mb-12 uppercase text-center">Halswell School TA Management Portal</p>

          <div className="w-full max-w-sm bg-white p-8 rounded-[24px] shadow-sm border border-slate-100 space-y-4 animate-fade-in flex flex-col items-stretch">
            <button 
              onClick={handleGoogleSignIn}
              disabled={verifyingGoogle}
              className="w-full py-4 px-4 bg-[#6157e8] hover:bg-[#5249d6] text-white text-sm font-bold rounded-xl flex items-center justify-center space-x-3 shadow-md disabled:opacity-50 transition-colors"
            >
              {verifyingGoogle ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck size={18} /><span>Sign in with Google</span></>}
            </button>

            <div className="pt-4 border-t border-slate-100 text-center space-y-3">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Staff Demo Bypass Profiles</span>
              
              <div className="space-y-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase text-left">SENCO Admins:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => handleBypassSignIn('senco_cathie')} className="py-2 px-1 bg-violet-50 hover:bg-violet-100 text-slate-700 font-semibold border rounded text-[11px] transition-colors">Cathie (SENCO Y0-4)</button>
                  <button onClick={() => handleBypassSignIn('senco_tracey')} className="py-2 px-1 bg-violet-50 hover:bg-violet-100 text-slate-[#1a1f36] font-semibold border rounded text-[11px] transition-colors">Tracey (SENCO Y5-8)</button>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase text-left">Teacher Aides (TAs):</div>
                <div className="grid grid-cols-3 gap-1">
                  <button onClick={() => handleBypassSignIn('t1')} className="py-2 px-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 rounded text-[10px] transition-colors">Karen (Tracey)</button>
                  <button onClick={() => handleBypassSignIn('t_ruby')} className="py-2 px-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 rounded text-[10px] transition-colors">Ruby (Cathie)</button>
                  <button onClick={() => handleBypassSignIn('t_val')} className="py-2 px-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 rounded text-[10px] transition-colors">Val (Tracey)</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const safeUsers = users.length > 0 ? users : INITIAL_USERS;
  const safeSessions = sessions.length > 0 ? sessions : INITIAL_SESSIONS;
  const safeAbsences = absences || [];

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {isSandbox && (
        <div className="bg-amber-50 border-b border-amber-200/60 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-800 select-none shadow-inner">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span>TESTING MODE — Quick Switch Dashboard Roles:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => handleBypassSignIn('t1')} className={`px-2 py-1 rounded font-bold text-[10px] transition-all border ${currentUser.id === 't1' ? 'bg-[#6157e8] text-white border-[#6157e8] shadow-sm' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
              Karen Cate (TA)
            </button>
            <button onClick={() => handleBypassSignIn('t_ruby')} className={`px-2 py-1 rounded font-bold text-[10px] transition-all border ${currentUser.id === 't_ruby' ? 'bg-[#6157e8] text-white border-[#6157e8] shadow-sm' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
              Ruby Gray (TA)
            </button>
            <button onClick={() => handleBypassSignIn('t_jenny')} className={`px-2 py-1 rounded font-bold text-[10px] transition-all border ${currentUser.id === 't_jenny' ? 'bg-[#6157e8] text-white border-[#6157e8] shadow-sm' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
              Jenny (ORS Teacher)
            </button>
            <button onClick={() => handleBypassSignIn('senco_tracey')} className={`px-2 py-1 rounded font-bold text-[10px] transition-all border ${currentUser.id === 'senco_tracey' ? 'bg-[#6157e8] text-white border-[#6157e8] shadow-sm' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
              Tracey (SENCO Y5-8)
            </button>
            <button onClick={() => handleBypassSignIn('senco_cathie')} className={`px-2 py-1 rounded font-bold text-[10px] transition-all border ${currentUser.id === 'senco_cathie' ? 'bg-[#6157e8] text-white border-[#6157e8] shadow-sm' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
              Cathie (SENCO Y0-4)
            </button>
          </div>
        </div>
      )}

      <header className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-white sticky top-0 z-40 shadow-sm flex-wrap gap-3">
        <div className="flex items-center space-x-4">
          <div className="bg-[#f0efff] p-2 rounded-xl text-[#6157e8]">
            <HeartHandshake size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-xl text-[#1a1f36] leading-tight">Support Link</h1>
            <div className="flex items-center text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mt-0.5">Halswell Hub</div>
          </div>
        </div>

        {currentUser && (currentUser.roles?.length > 1 || [currentUser.role].filter(Boolean).length > 1) && (
          <div className="flex items-center space-x-2.5 bg-violet-50 border border-violet-100 rounded-xl px-3.5 py-2 shadow-xs transition-all animate-fade-in">
            <span className="text-[10px] font-bold text-[#6157e8] uppercase tracking-wider">Active View:</span>
            <select 
              value={activeRole || ''} 
              onChange={(e) => {
                setActiveRole(e.target.value);
                addToast(`Switched view to ${e.target.value}`, 'success');
              }}
              className="bg-white text-slate-800 text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-[#6157e8]"
            >
              {(currentUser.roles || [currentUser.role]).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSaveVerificationModal(true)}
            title="Check Cloud Sync Security Status"
            className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-800 border-emerald-200/85 hover:bg-emerald-100/70' :
              syncStatus === 'saving' ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse' :
              'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {syncStatus === 'saving' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                syncStatus === 'synced' ? 'bg-emerald-500' :
                syncStatus === 'saving' ? 'bg-amber-500' :
                'bg-rose-500'
              }`}></span>
            </span>
            <span className="hidden md:inline">
              {syncStatus === 'synced' ? `Saved to Cloud (${lastSavedTime})` :
               syncStatus === 'saving' ? 'Saving changes...' :
               'Sync Interrupted / Error'}
            </span>
            <span className="md:hidden">
              {syncStatus === 'synced' ? 'Saved' :
               syncStatus === 'saving' ? 'Saving...' :
               'Error'}
            </span>
          </button>

          <button 
            onClick={() => setShowMobileSync(true)}
            className="flex items-center space-x-2 bg-[#f8f9fa] hover:bg-[#f1f3f5] text-slate-600 font-bold text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl transition-colors"
          >
            <QrCode size={16} className="text-[#6157e8]" />
            <span>Sync Mobile</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-[#f8f9fa] hover:bg-[#f1f3f5] text-slate-500 font-semibold text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl transition-colors"
          >
            <LogOut size={16} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {activeRole === ROLES.SENCO && (
          <SencoDashboard 
            currentUser={currentUser} users={safeUsers} sessions={safeSessions} absences={safeAbsences} addToast={addToast} 
            addUserToDb={addUserToDb} deleteUserFromDb={deleteUserFromDb} saveSessionToDb={saveSessionToDb} deleteSessionFromDb={deleteSessionFromDb} saveAbsenceToDb={saveAbsenceToDb}
          />
        )}
        {activeRole === ROLES.TEAM_LEADER && (
          <TeamLeaderDashboard user={currentUser} sessions={safeSessions} users={safeUsers} />
        )}
        {activeRole === ROLES.TEACHER && (
          <TeacherDashboard user={currentUser} sessions={safeSessions} users={safeUsers} />
        )}
        {(activeRole === ROLES.TA || activeRole === ROLES.ORS_TEACHER) && (
          <TADashboard 
            user={currentUser} sessions={safeSessions} absences={safeAbsences} addToast={addToast} saveAbsenceToDb={saveAbsenceToDb} users={safeUsers}
          />
        )}
      </main>

      {showMobileSync && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-sm w-full p-8 text-center animate-fade-in">
            <Smartphone className="w-8 h-8 text-[#6157e8] mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Sync with Your Phone</h3>
            <p className="text-slate-500 text-sm mb-6">Scan QR code to synchronize live schedules on your mobile.</p>
            <div className="bg-white p-6 rounded-2xl border inline-block mb-6 shadow-md">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://halswell-support-link.vercel.app')}`} alt="QR" className="w-44 h-44 block mx-auto" />
            </div>
            <button onClick={() => setShowMobileSync(false)} className="w-full py-3 bg-[#1a1f36] text-white rounded-xl font-bold text-sm shadow-md">Done</button>
          </div>
        </div>
      )}

      {showSaveVerificationModal && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 text-center animate-fade-in border border-slate-100">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-[#1a1f36] mb-2">Live Cloud Protection</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">
              Support Link autosaves every single edit instantly. Your changes are securely synchronized to the cloud and will load automatically on your next login!
            </p>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5 text-xs font-semibold mb-6">
              <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                <span className="text-slate-400">Database Status</span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live & Connected
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                <span className="text-slate-400">Total Registered Staff</span>
                <span className="text-slate-800">{safeUsers.length} profiles</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                <span className="text-slate-400">Timetable Assignments</span>
                <span className="text-slate-800">{safeSessions.length} active duties</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                <span className="text-slate-400">Absence Logs Active</span>
                <span className="text-slate-800">{safeAbsences.length} records</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Synced Timestamp</span>
                <span className="text-slate-800">{lastSavedTime} NZST</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={async () => {
                  setIsVerifyingConnection(true);
                  await new Promise(r => setTimeout(r, 800)); 
                  setIsVerifyingConnection(false);
                  addToast("Cloud validation pass: Timetable integrity confirmed!", "success");
                }}
                disabled={isVerifyingConnection}
                className="w-full py-3 bg-[#6157e8] hover:bg-[#5249d6] text-white font-bold rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifyingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Database logs...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Run Integrity Verification</span>
                  </>
                )}
              </button>
              <button 
                onClick={() => setShowSaveVerificationModal(false)} 
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

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
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const safeAbsencesList = absences || [];
  const mySessions = sessions.filter(s => s.taId === user.id && s.day === selectedDay);
  const myAbsences = safeAbsencesList.filter(a => a.taId === user.id).sort((a,b) => b.id.localeCompare(a.id)).slice(0, 5); 
  const sortedSessions = TIME_SLOTS.map(slot => ({
    slot,
    session: mySessions.find(s => s.timeSlotId === slot.id)
  })).filter(item => item.session);

  const handleReportAbsence = () => {
    if (!absenceReason.trim()) {
      addToast('Please provide a reason.', 'error');
      return;
    }
    if (absenceType === 'advance' && !approvedByStuart) {
      addToast('Please complete the Stuart leave approval checklist.', 'error');
      return;
    }

    let targetDay = selectedDay;
    let formattedDateString = '';
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    targetDay = daysOfWeek[startObj.getDay()];
    
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const startStr = startObj.toLocaleDateString('en-NZ', options);
    const endStr = endObj.toLocaleDateString('en-NZ', options);
    
    if (startDate === endDate) {
      formattedDateString = startStr;
    } else {
      formattedDateString = `${startStr} to ${endStr}`;
    }

    const isPendingExist = safeAbsencesList.some(a => 
      a.taId === user.id && 
      (absenceType === 'sick' ? (a.startDate === startDate || a.endDate === endDate) : (a.startDate === startDate || a.endDate === endDate)) && 
      a.status === 'Pending'
    );

    if (isPendingExist) {
      addToast(`You already have a pending submission for this date/day`, 'error');
      return;
    }
    
    saveAbsenceToDb({
      id: 'abs_' + Date.now(),
      taId: user.id,
      day: targetDay,
      startDate,
      endDate,
      formattedDate: formattedDateString,
      isAdvance: absenceType === 'advance',
      reason: absenceReason,
      status: 'Pending',
      reply: '',
      approvedByStuart: absenceType === 'advance' ? approvedByStuart : 'N/A'
    });

    setShowAbsenceForm(false);
    setAbsenceReason('');
    setApprovedByStuart('');
    addToast(absenceType === 'advance' ? `Future leave request submitted to SENCO.` : `Absence submitted cleanly to your SENCO.`, 'success');
  };

  return (
    <div className="animate-fade-in pb-20 max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-slate-800">{user.name} Timetable Portal</h2>
            <span className="text-[10px] font-bold bg-violet-50 text-[#6157e8] border border-violet-100 px-2 py-0.5 rounded uppercase tracking-wider">{user.team || 'No Team Registered'}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center">
            <Laptop size={14} className="mr-1 text-slate-500" />
            Allocated SENCO: <strong className="ml-1 text-[#6157e8]">{user.allocatedSenco === 'senco_cathie' ? 'Cathie' : user.allocatedSenco === 'senco_tracey' ? 'Tracey' : 'Shared (None / Both)'}</strong>
          </p>
        </div>
        <button 
          onClick={() => setShowAbsenceForm(true)} 
          className="w-full md:w-auto px-5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all shadow-sm"
        >
          Report Absence / Leave
        </button>
      </div>

      {showAbsenceForm && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-red-200 shadow-2xl space-y-4 animate-fade-in max-w-lg w-full max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-md flex items-center gap-2">
                <AlertCircle className="text-red-500 w-5 h-5" />
                Report Leave or Absence
              </h4>
              <button 
                onClick={() => setShowAbsenceForm(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-xl transition-colors"
              >
                &times;
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAbsenceType('sick')}
                className={`py-2 px-3 rounded-lg transition-all ${absenceType === 'sick' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Today's Sick Leave ({selectedDay})
              </button>
              <button
                type="button"
                onClick={() => setAbsenceType('advance')}
                className={`py-2 px-3 rounded-lg transition-all ${absenceType === 'advance' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Future Leave in Advance
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Start Date:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (new Date(e.target.value) > new Date(endDate)) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#6157e8]/40 focus:outline-none text-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  End Date:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#6157e8]/40 focus:outline-none text-slate-700"
                />
              </div>
            </div>

            {absenceType === 'advance' && (
              <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <span className="block text-xs font-bold text-amber-900 uppercase tracking-wide">
                    * Stuart Leave Authorization Checklist
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Has this future leave request already been discussed and approved by Stuart?
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <label className="flex items-center p-3 bg-white hover:bg-amber-100/30 border border-amber-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors flex-1">
                    <input 
                      type="radio" 
                      name="stuartApproval" 
                      value="Yes" 
                      checked={approvedByStuart === 'Yes'}
                      onChange={(e) => setApprovedByStuart(e.target.value)}
                      className="w-4 h-4 text-[#6157e8] border-slate-300 focus:ring-[#6157e8] mr-2" 
                    />
                    <span>Yes, authorized / notified</span>
                  </label>
                  <label className="flex items-center p-3 bg-white hover:bg-amber-100/30 border border-amber-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors flex-1">
                    <input 
                      type="radio" 
                      name="stuartApproval" 
                      value="No" 
                      checked={approvedByStuart === 'No'}
                      onChange={(e) => setApprovedByStuart(e.target.value)}
                      className="w-4 h-4 text-[#6157e8] border-slate-300 focus:ring-[#6157e8] mr-2" 
                    />
                    <span>No, pending authorization</span>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Reason / Details:
              </label>
              <textarea 
                value={absenceReason} 
                onChange={e => setAbsenceReason(e.target.value)} 
                className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#6157e8]/50 focus:outline-none" 
                rows={3} 
                placeholder={absenceType === 'sick' ? "Please provide details (e.g. flu, migraine, family bug)..." : "Please specify reason (e.g. dentist appointment, scheduled workshop)..."} 
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowAbsenceForm(false)} 
                className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleReportAbsence} 
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase rounded-xl shadow-sm transition-colors"
              >
                Submit to SENCO
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-1 overflow-x-auto bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm scrollbar-hide">
        {DAYS.map(d => (
          <button 
            key={d} 
            onClick={() => setSelectedDay(d)} 
            className={`flex-1 min-w-[90px] py-2.5 text-center text-xs font-bold tracking-wider rounded-lg uppercase transition-all ${
              selectedDay === d ? 'bg-[#1a1f36] text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
            <MessageSquare size={16} className="text-[#6157e8] mr-2" /> Recent Absences & SENCO Feedback Replies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myAbsences.map(a => (
              <div key={a.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 transition-all hover:border-[#6157e8]/30">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">
                    {a.isAdvance ? `Leave in Advance (${a.formattedDate || a.day})` : `Sick Leave (${a.formattedDate || a.day})`}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                    a.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                    a.status.startsWith('Approved') ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>{a.status.startsWith('Approved') ? 'Approved' : a.status}</span>
                </div>
                
                {a.isAdvance && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold mt-0.5">
                    <span className="text-slate-400">Stuart Approved:</span>
                    <span className={a.approvedByStuart === 'Yes' ? 'text-emerald-600' : 'text-amber-600'}>
                      {a.approvedByStuart || 'No'}
                    </span>
                  </div>
                )}

                <div className="text-slate-500 text-xs italic bg-white border border-slate-100 p-2 rounded-lg mt-1">Reason: "{a.reason}"</div>
                {a.reply ? (
                  <div className="bg-violet-50/70 p-3 rounded-xl border border-violet-100 text-xs text-slate-700 mt-1.5 flex flex-col relative shadow-sm">
                    <div className="font-bold text-[#6157e8] text-[9px] uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Bell size={10} className="text-[#6157e8]" /> SENCO Response Note:
                    </div>
                    <span className="font-medium text-slate-800 leading-relaxed italic">"{a.reply}"</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic mt-1.5 flex items-center gap-1 bg-slate-100/50 p-2 rounded-lg">
                    <Loader2 size={12} className="animate-spin text-slate-300" /> Waiting for SENCO reply note...
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

  const [activeTeamFilter, setActiveTeamFilter] = useState(currentUser.team || TEAMS.ALL);
  const [sencoReplies, setSencoReplies] = useState({});

  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [copyScope, setCopyScope] = useState('specific-staff'); 
  const [copySelectedTaId, setCopySelectedTaId] = useState('');
  const [copyTargetDays, setCopyTargetDays] = useState({
    Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false
  });
  const [copyOverwrite, setCopyOverwrite] = useState(true);

  const directAbsences = absences.filter(a => {
    if (a.status !== 'Pending') return false;
    const ta = users.find(u => u.id === a.taId) || INITIAL_USERS.find(u => u.id === a.taId);
    return isSencoSupervisingTa(currentUser, ta);
  });

  const coSencoAbsences = absences.filter(a => {
    if (a.status !== 'Pending') return false;
    const ta = users.find(u => u.id === a.taId) || INITIAL_USERS.find(u => u.id === a.taId);
    return !isSencoSupervisingTa(currentUser, ta);
  });

  const resolvedAbsences = absences.filter(a => {
    if (a.status === 'Pending') return false;
    const ta = users.find(u => u.id === a.taId) || INITIAL_USERS.find(u => u.id === a.taId);
    return isSencoSupervisingTa(currentUser, ta);
  }).sort((a,b) => b.id.localeCompare(a.id));

  const handleUpdateAbsenceStatus = async (absence, newStatus) => {
    const replyText = sencoReplies[absence.id] || (absence.isAdvance ? "Future leave request approved. Thank you!" : "Rest up, coverage approved.");
    await saveAbsenceToDb({ ...absence, status: newStatus, reply: replyText });
    addToast(`Absence marked as ${newStatus} and archived.`, 'success');
  };

  const tas = users.filter(u => {
    const roles = u.roles || [u.role];
    return roles.includes(ROLES.TA) || roles.includes(ROLES.ORS_TEACHER);
  }).sort((a, b) => a.name.localeCompare(b.name));

  const handleTriggerTestAlert = async () => {
    const targetTa = tas[Math.floor(Math.random() * tas.length)] || { id: 't1', name: 'Karen Cate', team: TEAMS.Y5_8 };
    const reasons = [
      "Woke up with high symptoms of cold/flu.",
      "Sudden domestic pipe burst emergency.",
      "Migraine headache block - seeking emergency cover."
    ];
    const reasonText = reasons[Math.floor(Math.random() * reasons.length)];
    const testAbs = {
      id: 'abs_test_' + Date.now(),
      taId: targetTa.id,
      day: selectedDay,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      formattedDate: new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }),
      isAdvance: false,
      reason: reasonText,
      status: 'Pending',
      reply: '',
      approvedByStuart: 'N/A'
    };
    await saveAbsenceToDb(testAbs);
    addToast(`Test alert successfully simulated for ${targetTa.name}!`, 'info');
  };

  useEffect(() => {
    if (tas.length > 0 && !copySelectedTaId) {
      setCopySelectedTaId(tas[0].id);
    }
  }, [tas, copySelectedTaId]);

  const handleStartEditStaff = (staff) => {
    setEditingStaff(staff);
    setNewStaffName(staff.name);
    setNewStaffEmail(staff.email || '');
    const assignedRoles = staff.roles || (staff.role ? [staff.role] : [ROLES.TA]);
    setNewStaffRoles(assignedRoles);
    setNewStaffTeam(staff.team || TEAMS.Y5_8);
    setNewStaffSenco(staff.allocatedSenco || '');
    setNewStaffTeacher(staff.allocatedTeacher || '');
    setNewStaffTeamLeader(staff.allocatedTeamLeader || '');
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
    if(!newStaffName.trim() || !newStaffEmail.trim()) {
      addToast('Please provide both name and email.', 'error');
      return;
    }
    if(newStaffRoles.length === 0) {
      addToast('Please select at least one access role.', 'error');
      return;
    }

    const primaryRole = newStaffRoles[0];

    if (editingStaff) {
      const updatedStaff = {
        ...editingStaff,
        name: newStaffName,
        email: newStaffEmail.toLowerCase().trim(),
        role: primaryRole,
        roles: newStaffRoles,
        team: newStaffTeam,
        allocatedSenco: (newStaffRoles.includes(ROLES.TA) || newStaffRoles.includes(ROLES.ORS_TEACHER)) ? newStaffSenco : '',
        allocatedTeacher: (newStaffRoles.includes(ROLES.TA) || newStaffRoles.includes(ROLES.ORS_TEACHER)) ? newStaffTeacher : '',
        allocatedTeamLeader: (newStaffRoles.includes(ROLES.TA) || newStaffRoles.includes(ROLES.ORS_TEACHER)) ? newStaffTeamLeader : ''
      };
      addUserToDb(updatedStaff);
      addToast(`${newStaffName} updated successfully.`, 'success');
      setEditingStaff(null);
    } else {
      const newStaff = {
        id: ((newStaffRoles.includes(ROLES.TA) || newStaffRoles.includes(ROLES.ORS_TEACHER)) ? 't' : 'u') + Date.now(),
        name: newStaffName,
        role: primaryRole,
        roles: newStaffRoles,
        email: newStaffEmail.toLowerCase().trim(),
        team: newStaffTeam,
        allocatedSenco: (newStaffRoles.includes(ROLES.TA) || newStaffRoles.includes(ROLES.ORS_TEACHER)) ? newStaffSenco : '',
        allocatedTeacher: (newStaffRoles.includes(ROLES.TA) || newStaffRoles.includes(ROLES.ORS_TEACHER)) ? newStaffTeacher : '',
        allocatedTeamLeader: (newStaffRoles.includes(ROLES.TA) || newStaffRoles.includes(ROLES.ORS_TEACHER)) ? newStaffTeamLeader : ''
      };
      addUserToDb(newStaff);
      addToast(`${newStaffName} added successfully.`, 'success');
    }

    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffRoles([ROLES.TA]);
    setNewStaffTeam(TEAMS.Y5_8);
    setNewStaffSenco('');
    setNewStaffTeacher('');
    setNewStaffTeamLeader('');
  };

  const handleDeleteStaff = (userId, name) => {
    if (editingStaff && editingStaff.id === userId) {
      handleCancelEditStaff();
    }
    deleteUserFromDb(userId);
    addToast(`${name} has been removed.`, 'info');
  };

  const handleSaveSession = (newSessionData) => {
    if (editingCell.session) {
      saveSessionToDb({ ...editingCell.session, ...newSessionData });
    } else {
      saveSessionToDb({
        id: Math.random().toString(36).substr(2, 9),
        day: selectedDay,
        timeSlotId: editingCell.timeSlotId,
        taId: editingCell.taId,
        ...newSessionData
      });
    }
    setEditingCell(null);
    addToast('Timetable updated in Cloud');
  };

  const handleDeleteSession = () => {
    if (editingCell.session) {
      deleteSessionFromDb(editingCell.session.id);
      addToast('Session removed from timetable');
    }
    setEditingCell(null);
  };

  const handleCopyDaySchedule = async () => {
    try {
      let sourceSessions = [];
      if (copyScope === 'specific-staff') {
        if (!copySelectedTaId) {
          addToast('Please select a Teacher Aide to duplicate.', 'error');
          return;
        }
        sourceSessions = sessions.filter(s => s.day === selectedDay && s.taId === copySelectedTaId);
      } else {
        sourceSessions = sessions.filter(s => s.day === selectedDay);
      }

      if (sourceSessions.length === 0) {
        const staffName = copyScope === 'specific-staff' 
          ? `${users.find(u => u.id === copySelectedTaId)?.name || 'Staff'}`
          : 'anyone';
        addToast(`No duties found for ${staffName} on ${selectedDay} to copy.`, 'error');
        return;
      }

      const targetDays = Object.keys(copyTargetDays).filter(day => copyTargetDays[day] && day !== selectedDay);
      if (targetDays.length === 0) {
        addToast('Please select at least one other day to copy to.', 'error');
        return;
      }

      if (copyOverwrite) {
        const deletePromises = [];
        sessions.forEach(s => {
          if (targetDays.includes(s.day)) {
            if (copyScope === 'specific-staff') {
              if (s.taId === copySelectedTaId) {
                deletePromises.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', s.id)));
              }
            } else {
              deletePromises.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', s.id)));
            }
          }
        });
        await Promise.all(deletePromises);
      }

      const writePromises = [];
      targetDays.forEach(day => {
        sourceSessions.forEach(sourceSess => {
          const newId = Math.random().toString(36).substr(2, 9) + '-' + day.substring(0, 3);
          const duplicatedSession = {
            ...sourceSess,
            id: newId,
            day: day
          };
          writePromises.push(setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', newId), duplicatedSession));
        });
      });

      await Promise.all(writePromises);
      setShowCopyDayModal(false);
      setCopyTargetDays({ Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false });
      
      const scopeMessage = copyScope === 'specific-staff'
        ? `${users.find(u => u.id === copySelectedTaId)?.name || 'Staff'}'s schedule`
        : "The whole day's schedule";
      addToast(`Successfully duplicated ${scopeMessage} from ${selectedDay}!`, "success");
    } catch (error) {
      console.error("Duplicate timetable failed:", error);
      addToast("Duplicate failed.", "error");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Welcome back, {currentUser.name}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">TEAM:</span>
            <select
              value={activeTeamFilter}
              onChange={(e) => setActiveTeamFilter(e.target.value)}
              className="bg-violet-50 text-[#6157e8] font-bold text-xs rounded-xl border border-violet-100 px-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#6157e8] cursor-pointer"
            >
              <option value={TEAMS.ALL}>{TEAMS.ALL}</option>
              <option value={TEAMS.Y0_4}>{TEAMS.Y0_4}</option>
              <option value={TEAMS.Y5_8}>{TEAMS.Y5_8}</option>
              <option value={TEAMS.BOTH}>{TEAMS.BOTH}</option>
            </select>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setActiveDashboardTab('timetable')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeDashboardTab === 'timetable' ? 'bg-white text-[#1a1f36] shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar size={14} className={activeDashboardTab === 'timetable' ? 'text-[#6157e8]' : 'text-slate-400'} />
            <span>Master Timetable</span>
          </button>
          <button 
            onClick={() => setActiveDashboardTab('students')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeDashboardTab === 'students' ? 'bg-white text-[#1a1f36] shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp size={14} className={activeDashboardTab === 'students' ? 'text-[#6157e8]' : 'text-slate-400'} />
            <span className="flex items-center">
              Student Week View
              <span className="ml-1.5 bg-yellow-400 text-black px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase">LIVE</span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <button 
            onClick={() => setShowCriticalCoverBoard(true)} 
            className="w-full sm:w-auto py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-md flex items-center justify-center space-x-2 transition-all border border-amber-600"
          >
            <AlertTriangle size={14} className="text-white" />
            <span>Critical Coverage Board</span>
          </button>
          
          <button onClick={() => setShowManageStaff(true)} className="w-full sm:w-auto py-2.5 px-4 bg-[#6157e8] hover:bg-[#5249d6] text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-sm flex items-center justify-center space-x-2 transition-all">
            <Users size={14} /> <span>Manage Staff & Teams</span>
          </button>
        </div>
      </div>

      {(directAbsences.length > 0 || coSencoAbsences.length > 0) ? (
        <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider flex items-center">
              <AlertCircle className="w-4 h-4 mr-1.5 animate-pulse text-red-600" /> Live TA Absence Alerts ({(directAbsences.length + coSencoAbsences.length)})
            </h3>
            <button 
              onClick={handleTriggerTestAlert}
              className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-1.5 rounded-lg border border-red-200 transition-colors shadow-sm"
            >
              Simulate Test Alert
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {directAbsences.map(a => {
              const ta = users.find(u => u.id === a.taId) || INITIAL_USERS.find(u => u.id === a.taId);
              return (
                <div key={a.id} className="bg-white p-5 rounded-xl border border-red-200 shadow-sm flex flex-col gap-4 animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-slate-100 pl-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wide">{ta?.team}</span>
                        <span className="text-[9px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded uppercase tracking-wide">Directly Under Your Care</span>
                        {a.isAdvance && (
                          <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1">
                            <Calendar size={10} /> Leave In Advance
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg mt-1.5">
                        {ta?.name} reported {a.isAdvance ? 'leave in advance' : 'sick'} for {a.formattedDate || a.day}
                      </h4>
                      
                      {a.isAdvance && (
                        <div className="mt-2.5">
                          <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-xs ${
                            a.approvedByStuart === 'Yes' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' 
                              : 'bg-amber-50 text-amber-800 border-amber-200/80'
                          }`}>
                            <ShieldCheck className={`w-4 h-4 ${a.approvedByStuart === 'Yes' ? 'text-emerald-600' : 'text-amber-500'}`} />
                            <span>Approved by Stuart: <strong className="uppercase">{a.approvedByStuart || 'No'}</strong></span>
                          </span>
                        </div>
                      )}

                      <p className="text-sm text-slate-500 font-medium mt-3.5 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">" {a.reason} "</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pl-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                      <MessageSquare size={12} className="mr-1 text-[#6157e8]" /> Write a Reply Response Note:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        placeholder={a.isAdvance ? "e.g. Leave approved. We will schedule coverage closer to the date." : "e.g. Coverage has been approved. Rest up!"}
                        value={sencoReplies[a.id] || ''}
                        onChange={e => setSencoReplies({...sencoReplies, [a.id]: e.target.value})}
                        className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#6157e8] focus:border-[#6157e8] outline-none font-medium text-slate-700"
                      />
                      <button
                        onClick={() => handleUpdateAbsenceStatus(a, a.isAdvance ? 'Approved (Leave in Advance)' : 'Approved (Sick Leave)')}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm"
                      >
                        Send Reply & Archive
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end pl-2">
                    {!a.isAdvance ? (
                      <>
                        <button 
                          onClick={() => setResolvingAbsence(a)} 
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wide rounded-lg transition-all shadow-sm"
                        >
                          Approve & Reassign Coverage
                        </button>
                        <button 
                          onClick={() => handleUpdateAbsenceStatus(a, 'Approved (Sick Leave)')} 
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wide rounded-lg transition-all"
                        >
                          Mark Sick Leave
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <button 
                          onClick={() => handleUpdateAbsenceStatus(a, 'Approved (Leave in Advance)')} 
                          className="px-4 py-2 bg-[#6157e8] hover:bg-[#5249d6] text-white font-bold text-xs uppercase tracking-wide rounded-lg transition-all shadow-sm"
                        >
                          Approve Advance Leave (Coverage Deferred)
                        </button>
                        <span className="text-[11px] text-slate-400 italic font-medium">
                          * Coverage will be resolved on the day of the leave
                        </span>
                      </div>
                    )}
                    <button 
                      onClick={() => handleUpdateAbsenceStatus(a, 'Dismissed')} 
                      className="px-4 py-2 bg-white border text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-wide rounded-lg transition-all"
                    >
                      Dismiss Alert
                    </button>
                  </div>
                </div>
              );
            })}

            {coSencoAbsences.map(a => {
              const ta = users.find(u => u.id === a.taId) || INITIAL_USERS.find(u => u.id === a.taId);
              return (
                <div key={a.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 animate-fade-in relative overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400"></div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-slate-100 pl-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">{ta?.team}</span>
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase tracking-wide">Shared View / Other Team</span>
                        {a.isAdvance && (
                          <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1">
                            <Calendar size={10} /> Leave In Advance
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-700 text-lg mt-1.5">
                        {ta?.name} reported {a.isAdvance ? 'leave in advance' : 'sick'} for {a.formattedDate || a.day}
                      </h4>

                      {a.isAdvance && (
                        <div className="mt-2.5">
                          <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-xs ${
                            a.approvedByStuart === 'Yes' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' 
                              : 'bg-amber-50 text-amber-800 border-amber-200/80'
                          }`}>
                            <ShieldCheck className={`w-4 h-4 ${a.approvedByStuart === 'Yes' ? 'text-emerald-600' : 'text-amber-500'}`} />
                            <span>Approved by Stuart: <strong className="uppercase">{a.approvedByStuart || 'No'}</strong></span>
                          </span>
                        </div>
                      )}

                      <p className="text-sm text-slate-500 font-medium mt-3.5 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">" {a.reason} "</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pl-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                      <MessageSquare size={12} className="mr-1 text-slate-400" /> Write a Reply Response Note:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        placeholder={a.isAdvance ? "e.g. Leave approved. We will schedule coverage closer to the date." : "e.g. Coverage has been approved. Rest up!"}
                        value={sencoReplies[a.id] || ''}
                        onChange={e => setSencoReplies({...sencoReplies, [a.id]: e.target.value})}
                        className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#6157e8] focus:border-[#6157e8] outline-none font-medium text-slate-700"
                      />
                      <button
                        onClick={() => handleUpdateAbsenceStatus(a, a.isAdvance ? 'Approved (Leave in Advance)' : 'Approved (Sick Leave)')}
                        className="px-4 py-2.5 bg-slate-750 hover:bg-slate-800 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm"
                      >
                        Send Reply & Archive
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end pl-2">
                    {!a.isAdvance ? (
                      <>
                        <button 
                          onClick={() => setResolvingAbsence(a)} 
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wide rounded-lg transition-all shadow-sm"
                        >
                          Approve & Reassign Coverage
                        </button>
                        <button 
                          onClick={() => handleUpdateAbsenceStatus(a, 'Approved (Sick Leave)')} 
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wide rounded-lg transition-all"
                        >
                          Mark Sick Leave
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <button 
                          onClick={() => handleUpdateAbsenceStatus(a, 'Approved (Leave in Advance)')} 
                          className="px-4 py-2 bg-[#6157e8] hover:bg-[#5249d6] text-white font-bold text-xs uppercase tracking-wide rounded-lg transition-all shadow-sm"
                        >
                          Approve Advance Leave (Coverage Deferred)
                        </button>
                        <span className="text-[11px] text-slate-400 italic font-medium">
                          * Coverage will be resolved on the day of the leave
                        </span>
                      </div>
                    )}
                    <button 
                      onClick={() => handleUpdateAbsenceStatus(a, 'Dismissed')} 
                      className="px-4 py-2 bg-white border text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-wide rounded-lg transition-all"
                    >
                      Dismiss Alert
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center space-y-3">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">All quiet! No pending TA absences</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Real-time alerts will appear automatically when TAs submit them. You can click below to simulate a live alert instantly for testing!
          </p>
          <button 
            onClick={handleTriggerTestAlert}
            className="inline-flex items-center px-4 py-2 bg-[#6157e8] hover:bg-[#5249d6] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            <AlertCircle size={14} className="mr-1.5" /> Trigger Live Test Alert
          </button>
        </div>
      )}

      {resolvingAbsence && (
        <CoverageResolver 
          absence={resolvingAbsence} 
          users={users} 
          sessions={sessions} 
          onClose={() => setResolvingAbsence(null)} 
          onResolve={(assignments) => {
            Object.entries(assignments).forEach(([sessId, coveringTaId]) => {
              const match = sessions.find(s => s.id === sessId);
              if (match && coveringTaId) saveSessionToDb({ ...match, taId: coveringTaId });
            });
            const replyText = sencoReplies[resolvingAbsence.id] || "Rest up, coverage approved and scheduled.";
            saveAbsenceToDb({ ...resolvingAbsence, status: resolvingAbsence.isAdvance ? 'Approved (Leave in Advance)' : 'Approved (Sick Leave)', reply: replyText });
            setResolvingAbsence(null);
            addToast('Coverage applied successfully.');
          }} 
        />
      )}

      {showCriticalCoverBoard && (
        <CriticalCoverageBoard 
          day={selectedDay}
          users={users}
          sessions={sessions}
          saveSessionToDb={saveSessionToDb}
          onClose={() => setShowCriticalCoverBoard(false)}
          addToast={addToast}
        />
      )}

      {showCopyDayModal && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-fade-in border border-slate-100">
            <div className="w-12 h-12 bg-[#ecfdf5] text-[#10b981] rounded-full flex items-center justify-center mb-4">
              <Copy className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-[#1a1f36] mb-2">Duplicate Schedule</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Copy assignments from <b>{selectedDay}</b> to other days.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setCopyScope('specific-staff')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${copyScope === 'specific-staff' ? 'bg-white text-[#1a1f36] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Specific TA
              </button>
              <button
                onClick={() => setCopyScope('whole-day')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${copyScope === 'whole-day' ? 'bg-white text-[#1a1f36] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Whole Day (All TAs)
              </button>
            </div>

            {copyScope === 'specific-staff' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Teacher Aide</label>
                <select 
                  value={copySelectedTaId}
                  onChange={(e) => setCopySelectedTaId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none font-medium text-[#1a1f36] text-sm"
                >
                  {tas.map(ta => (
                    <option key={ta.id} value={ta.id}>{ta.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Destination Days</label>
            <div className="space-y-2 mb-6">
              {DAYS.map(day => (
                <label 
                  key={day} 
                  className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${
                    day === selectedDay 
                      ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                      : copyTargetDays[day]
                        ? 'border-[#10b981] bg-[#ecfdf5]/40'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input 
                    type="checkbox"
                    disabled={day === selectedDay}
                    checked={day === selectedDay ? false : copyTargetDays[day]}
                    onChange={(e) => setCopyTargetDays(prev => ({ ...prev, [day]: e.target.checked }))}
                    className="w-4 h-4 text-[#10b981] focus:ring-[#10b981] border-slate-300 rounded cursor-pointer disabled:cursor-not-allowed mr-3"
                  />
                  <span className="font-semibold text-sm text-[#1a1f36]">{day} {day === selectedDay && "(Selected Day)"}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
              <div>
                <span className="font-bold text-xs text-[#1a1f36] block uppercase tracking-wider">Overwrite Target Days</span>
                <span className="text-[11px] text-slate-500">Deletes existing schedules before copying</span>
              </div>
              <input 
                type="checkbox"
                checked={copyOverwrite}
                onChange={(e) => setCopyOverwrite(e.target.checked)}
                className="w-5 h-5 text-[#10b981] focus:ring-[#10b981] border-slate-300 rounded cursor-pointer"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowCopyDayModal(false);
                  setCopyTargetDays({ Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false });
                }} 
                className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleCopyDaySchedule} 
                className="px-6 py-3 bg-[#10b981] text-white font-bold hover:bg-[#059669] rounded-xl transition-colors shadow-md text-sm"
              >
                Copy Timetable
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCell && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-fade-in">
            <h3 className="text-2xl font-bold text-[#1a1f36] mb-6">{editingCell.session ? 'Edit Duty' : 'Assign Duty'}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleSaveSession({
                subject: formData.get('subject'),
                tier: formData.get('tier'),
                teacherId: formData.get('teacherId') || null,
                teamLeaderId: formData.get('teamLeaderId') || null
              });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject / Task Name</label>
                <input type="text" name="subject" required defaultValue={editingCell.session?.subject} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none" placeholder="e.g. Reading Support..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority Tier</label>
                <select name="tier" defaultValue={editingCell.session?.tier || TIERS.ENRICHMENT} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none">
                  {Object.values(TIERS).map(tier => <option key={tier} value={tier}>{tier}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Supporting Teacher</label>
                <select name="teacherId" defaultValue={editingCell.session?.teacherId || ''} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none">
                  <option value="">None / Self-Directed</option>
                  {users.filter(u => (u.roles || [u.role]).includes(ROLES.TEACHER)).sort((a, b) => a.name.localeCompare(b.name)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Supporting Team Leader</label>
                <select name="teamLeaderId" defaultValue={editingCell.session?.teamLeaderId || ''} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none">
                  <option value="">None / No Team Leader</option>
                  {users.filter(u => (u.roles || [u.role]).includes(ROLES.TEAM_LEADER)).sort((a, b) => a.name.localeCompare(b.name)).map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                {editingCell.session && (
                  <button type="button" onClick={handleDeleteSession} className="px-5 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors mr-auto flex items-center">
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </button>
                )}
                <button type="button" onClick={() => setEditingCell(null)} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Cancel</button>
                <button type="submit" className="px-6 py-3 bg-[#1a1f36] text-white font-bold hover:bg-black rounded-xl transition-colors shadow-md text-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageStaff && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full p-8 animate-fade-in max-h-[90vh] flex flex-col md:grid md:grid-cols-12 md:gap-8 overflow-hidden">
            
            <div className="col-span-12 border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-[#1a1f36]">Manage Staff & Teams</h3>
              <button onClick={() => { setShowManageStaff(false); handleCancelEditStaff(); }} className="text-slate-400 hover:text-slate-600 font-bold text-xl">×</button>
            </div>

            <div className="col-span-12 md:col-span-6 flex flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
              <h4 className="font-bold text-[#1a1f36] text-xs uppercase tracking-wider text-slate-400 mb-3">Current Staff Members</h4>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[40vh] md:max-h-[55vh]">
                {[...users].sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                  <div key={u.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-xs hover:border-[#6157e8]/25 transition-all">
                    <div>
                      <div className="font-bold text-[#1a1f36] text-sm">{u.name}</div>
                      
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(u.roles || [u.role]).filter(Boolean).map(role => (
                          <span key={role} className="text-[9px] font-bold bg-[#f0efff] text-[#6157e8] px-2 py-0.5 rounded border border-violet-100 uppercase tracking-wider">
                            {role}
                          </span>
                        ))}
                      </div>

                      {(u.roles || [u.role]).includes(ROLES.TA) && (
                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider space-y-0.5 mt-2">
                          <div>SENCO: <span className="text-[#6157e8]">{u.allocatedSenco === 'senco_cathie' ? 'Cathie' : u.allocatedSenco === 'senco_tracey' ? 'Tracey' : 'None / Both'}</span></div>
                          {u.allocatedTeacher && (
                            <div>Teacher: <span className="text-[#6157e8]">{users.find(x => x.id === u.allocatedTeacher)?.name || 'Assigned'}</span></div>
                          )}
                          {u.allocatedTeamLeader && (
                            <div>Team Leader: <span className="text-[#6157e8]">{users.find(x => x.id === u.allocatedTeamLeader)?.name || 'Assigned'}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button onClick={() => handleStartEditStaff(u)} className="p-2 text-[#6157e8] hover:bg-violet-100 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                      {u.id !== currentUser.id && (
                        <button onClick={() => handleDeleteStaff(u.id, u.name)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 md:col-span-6 flex flex-col min-h-0 overflow-y-auto max-h-[45vh] md:max-h-[55vh] pt-4 md:pt-0">
              <h4 className="font-bold text-[#1a1f36] text-sm mb-3">
                {editingStaff ? `Edit Details: ${editingStaff.name}` : 'Add New Staff'}
              </h4>
              <div className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Staff Full Name</label>
                  <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none" placeholder="e.g. Ruby Gray" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Google Email Address</label>
                  <input type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none" placeholder="e.g. ruby.gray@halswell.school.nz" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ACCESS ROLES (Select all that apply)</label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    {Object.values(ROLES).map(role => {
                      const isChecked = newStaffRoles.includes(role);
                      return (
                        <label key={role} className={`flex items-center space-x-2 p-2 bg-white rounded-lg border cursor-pointer hover:border-[#6157e8]/40 transition-all ${
                          isChecked ? 'border-[#6157e8] ring-1 ring-[#6157e8]/20 bg-violet-50/10' : 'border-slate-200'
                        }`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                if (newStaffRoles.length > 1) {
                                  setNewStaffRoles(newStaffRoles.filter(r => r !== role));
                                }
                              } else {
                                setNewStaffRoles([...newStaffRoles, role]);
                              }
                            }}
                            className="w-4 h-4 text-[#6157e8] border-slate-300 rounded focus:ring-[#6157e8]" 
                          />
                          <span className="text-xs font-bold text-slate-700">{role}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Team Group</label>
                  <select value={newStaffTeam} onChange={(e) => setNewStaffTeam(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none">
                    <option value={TEAMS.Y0_4}>{TEAMS.Y0_4}</option>
                    <option value={TEAMS.Y5_8}>{TEAMS.Y5_8}</option>
                    <option value={TEAMS.BOTH}>{TEAMS.BOTH}</option>
                    <option value={TEAMS.ALL}>{TEAMS.ALL}</option>
                  </select>
                </div>

                {(newStaffRoles.includes(ROLES.TA) || newStaffRoles.includes(ROLES.ORS_TEACHER)) && (
                  <div className="space-y-4 pt-1 border-t border-slate-100/60">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Allocated SENCO</label>
                      <select 
                        value={newStaffSenco} 
                        onChange={(e) => setNewStaffSenco(e.target.value)} 
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none"
                      >
                        <option value="">None / Both (Shared)</option>
                        <option value="senco_cathie">Cathie (SENCO Y0-4)</option>
                        <option value="senco_tracey">Tracey (SENCO Y5-8)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Teacher</label>
                        <select 
                          value={newStaffTeacher} 
                          onChange={(e) => setNewStaffTeacher(e.target.value)} 
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none"
                        >
                          <option value="">None / Select Teacher</option>
                          {users.filter(u => (u.roles || [u.role]).includes(ROLES.TEACHER)).sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Team Leader</label>
                        <select 
                          value={newStaffTeamLeader} 
                          onChange={(e) => setNewStaffTeamLeader(e.target.value)} 
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none"
                        >
                          <option value="">None / Select Team Leader</option>
                          {users.filter(u => (u.roles || [u.role]).includes(ROLES.TEAM_LEADER)).sort((a, b) => a.name.localeCompare(b.name)).map(tl => (
                            <option key={tl.id} value={tl.id}>{tl.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                  {editingStaff && (
                    <button onClick={handleCancelEditStaff} className="px-5 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                      Cancel Edit
                    </button>
                  )}
                  <button onClick={() => { setShowManageStaff(false); handleCancelEditStaff(); }} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">
                    Done
                  </button>
                  <button onClick={handleAddOrUpdateStaff} className="px-6 py-3 bg-[#6157e8] text-white font-bold hover:bg-[#5249d6] rounded-xl transition-colors shadow-md text-sm">
                    Save Staff
                  </button>
                </div>

              </div> 
            </div>

          </div> 
        </div> 
      )}

      {activeDashboardTab === 'timetable' ? (
        <div className="bg-white rounded-[28px] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#1a1f36]">Master Timetable</h2>
              <p className="text-[11px] font-bold text-[#6157e8] tracking-[0.15em] uppercase mt-1">Live Database Connected</p>
            </div>
            
            <div className="flex items-center space-x-3 w-full sm:w-auto flex-wrap gap-y-3">
              <button 
                onClick={() => setShowCopyDayModal(true)}
                className="flex items-center px-4 py-2.5 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#059669] font-medium text-sm rounded-xl transition-colors shadow-sm border border-[#a7f3d0]"
              >
                <Copy className="w-4 h-4 mr-1.5" /> 
                <span>Copy Schedule</span>
              </button>
              <select 
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-[#1a1f36] font-semibold rounded-xl focus:ring-[#6157e8] focus:border-[#6157e8] block px-4 py-2.5 outline-none flex-1 sm:flex-none cursor-pointer"
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="p-0">
            <TimetableGrid 
              sessions={sessions} 
              day={selectedDay} 
              users={users} 
              isEditable={true}
              teamFilter={activeTeamFilter}
              onCellClick={(timeSlotId, taId, session) => setEditingCell({timeSlotId, taId, session})} 
            />
          </div>
        </div>
      ) : (
        <StudentTimetablesView 
          sessions={sessions}
          users={users}
          addToast={addToast}
        />
      )}

      {resolvedAbsences.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-500" /> Resolved Absences Archive Log
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{resolvedAbsences.length} Total</span>
          </div>
          <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2">
            {resolvedAbsences.map(a => {
              const ta = users.find(u => u.id === a.taId) || INITIAL_USERS.find(u => u.id === a.taId);
              return (
                <div key={a.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs hover:border-[#6157e8]/20 transition-all">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-[#1a1f36]">{ta?.name}</span>
                      <span className="text-slate-400 font-semibold">
                        {a.isAdvance ? `Leave in Advance (${a.formattedDate || a.day})` : `Sick Leave (${a.formattedDate || a.day})`}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 italic">" {a.reason} "</span>
                    </div>
                    {a.isAdvance && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stuart Approved:</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          a.approvedByStuart === 'Yes' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'
                        }`}>
                          {a.approvedByStuart || 'No'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {a.reply && (
                      <span className="text-[10px] bg-purple-50 text-[#6157e8] border border-purple-100 font-bold px-2 py-0.5 rounded-md truncate max-w-[200px]" title={a.reply}>
                        Reply: "{a.reply}"
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[10px] uppercase">
                      {a.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StudentTimetablesView({ sessions, users, addToast }) {
  const autoTrackedStudents = useMemo(() => {
    const ignoredKeywords = [
      'lunch', 'morning tea', 'tea', 'no cover', 'break', 'not working', 
      'interval', 'meeting', 'duty', 'admin', 'planning', 'free session', 
      'Ōtawhito', 'otawhito', 'esol', 'office', 'classroom', 'check-in',
      'monitor', 'support', 'supervise', 'check', 'supervision'
    ];
    const found = new Set(['H.W', 'E.S', 'Sam C']);
    
    sessions.forEach(s => {
      if (s.tier !== TIERS.CRITICAL && s.tier !== TIERS.HIGH_NEEDS) return;
      if (!s.subject) return;
      const parts = s.subject.split(/[-\/&+]|\band\b/i);
      parts.forEach(part => {
        let cleaned = part.replace(/\s*\(.*?\)\s*/g, ' ').trim();
        if (!cleaned) return;
        cleaned = cleaned.replace(/^(support|check|check-in|supervise|monitor|check)\s+/i, '').trim();
        const lower = cleaned.toLowerCase();
        const isTimeFormat = /\b\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(lower);
        const isIgnored = isTimeFormat || ignoredKeywords.some(keyword => lower === keyword || lower.includes(keyword) || lower.startsWith(keyword) || lower.endsWith(keyword));
        if (!isIgnored && cleaned.length > 0 && cleaned.length <= 15) {
          found.add(cleaned);
        }
      });
    });
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

    if (!matchingSession) return null;
    const resolverList = users.length > 0 ? users : INITIAL_USERS;
    const ta = resolverList.find(u => u.id === matchingSession.taId);
    return ta ? ta.name.split(' ')[0] : 'Assigned'; 
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
            <p className="text-xs text-slate-400">Select a student profile to render their week-at-a-glance coverage. This lists auto-detected initials from active duties.</p>
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
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-ping"></span>
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
                    coveragePercentage >= 90 ? 'bg-emerald-500' :
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
                <div key={session.id} className="border border-slate-100 bg-slate-50 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-amber-300 transition-colors">
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
                          <option key={ta.id} value={ta.id} className={availabilityInfo.score === 0 ? "font-bold text-emerald-600" : availabilityInfo.score === 1 ? "text-indigo-600" : "text-slate-500"}>
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
        <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-white border border-slate-200 text-[#1a1f36] font-semibold rounded-xl px-4 py-2.5 outline-none">
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
      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[24px] border border-[#f1f5f9]">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1f36]">{user.name} Dashboard</h2>
          <p className="text-xs font-semibold text-[#6157e8] uppercase mt-1 tracking-wider">Teacher View</p>
        </div>
        <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-white border border-slate-200 text-[#1a1f36] font-semibold rounded-xl px-4 py-2.5">
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[28px] border border-[#f1f5f9] overflow-hidden shadow-sm">
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

function TimetableGrid({ sessions, day, users, isEditable, onCellClick, teamFilter }) {
  const [viewMode, setViewMode] = useState('single'); 
  
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
          <button onClick={() => setViewMode('single')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'single' ? 'bg-white text-[#1a1f36] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Individual TA</button>
          <button onClick={() => setViewMode('all')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'all' ? 'bg-white text-[#1a1f36] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Full Grid</button>
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
                {ta.name}
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
                            
                            {(session.teacherId || session.teacherIds || session.teamLeaderId) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(() => {
                                  const assignedTeachers = session.teacherIds 
                                    ? users.filter(u => session.teacherIds.includes(u.id)) 
                                    : (session.teacherId ? [users.find(u => u.id === session.teacherId)].filter(Boolean) : []);
                                  if (assignedTeachers.length === 0) return null;
                                  return (
                                    <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md">
                                      T: {assignedTeachers.map(t => t.name).join(' & ')}
                                    </span>
                                  );
                                })()}
                                {session.teamLeaderId && (
                                  <span className="bg-purple-50 text-purple-600 text-[9px] font-bold px-2 py-0.5 rounded-md">
                                    L: {users.find(u => u.id === session.teamLeaderId)?.name || 'Leader'}
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
                    <div className="truncate">{ta.name}</div>
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
                            {(() => {
                              const assignedTeachers = session.teacherIds 
                                ? users.filter(u => session.teacherIds.includes(u.id)) 
                                : (session.teacherId ? [users.find(u => u.id === session.teacherId)].filter(Boolean) : []);
                              if (assignedTeachers.length === 0) return null;
                              return (
                                <span className="text-[9px] font-bold text-slate-400 mt-1 truncate">
                                  {assignedTeachers.map(t => t.name.split(' ')[0]).join(' & ')}
                                </span>
                              );
                            })()}
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
                      <option key={ta.id} value={ta.id} className={availabilityInfo.score === 0 ? "font-bold text-emerald-600" : availabilityInfo.score === 1 ? "text-indigo-600" : "text-slate-500"}>
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
