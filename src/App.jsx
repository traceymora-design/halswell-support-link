import React, { useState, useEffect } from 'react';
import { 
  Calendar, AlertCircle, Users, CheckCircle, 
  Copy, LogOut, Bell, HeartHandshake, ChevronLeft,
  QrCode, User, Star, AlertTriangle, Coffee, Utensils,
  Plus, Edit3, Trash2, Loader2, RefreshCw, Smartphone, ChevronRight, ShieldCheck, Laptop, MessageSquare
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, 
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
  setPersistence, browserLocalPersistence, browserSessionPersistence 
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

// --- ROLES & TEAMS ---
const ROLES = {
  SENCO: 'SENCO',
  TEAM_LEADER: 'Team Leader',
  TEACHER: 'TEACHER',
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

const TIME_SLOTS = [
  { id: 't1', start: '9:00', end: '9:30' },
  { id: 't2', start: '9:30', end: '10:00' },
  { id: 't3', start: '10:00', end: '10:30' },
  { id: 't4', start: '10:30', end: '10:50' },
  { id: 't5', start: '10:50', end: '11:10' },
  { id: 't6', start: '11:10', end: '11:30' },
  { id: 't7', start: '11:30', end: '12:00' },
  { id: 't8', start: '12:00', end: '12:30' },
  { id: 't9', start: '12:30', end: '1:00' },
  { id: 't10', start: '1:00', end: '1:30' },
  { id: 't11', start: '1:30', end: '2:00' },
  { id: 't12', start: '2:00', end: '2:30' },
  { id: 't13', start: '2:30', end: '3:00' }
];

const INITIAL_USERS = [
  { id: 'senco_cathie', name: 'Cathie', role: ROLES.SENCO, email: 'cathie@halswell.school.nz', team: TEAMS.Y0_4 },
  { id: 'senco_tracey', name: 'Tracey', role: ROLES.SENCO, email: 'tracey@halswell.school.nz', team: TEAMS.Y5_8 },
  { id: 'u2', name: 'Mr. Smith', role: ROLES.TEACHER, email: 'smith@school.edu', team: TEAMS.Y5_8 },
  { id: 't1', name: 'Karen Cate', role: ROLES.TA, email: 'karen@school.edu', team: TEAMS.Y5_8, allocatedSenco: 'senco_tracey' },
  { id: 'tl1', name: 'Mrs. Davis', role: ROLES.TEAM_LEADER, email: 'davis@school.edu', team: TEAMS.Y5_8 },
  { id: 't_val', name: 'Val Murray', role: ROLES.TA, email: 'val.murray@school.nz', team: TEAMS.Y5_8, allocatedSenco: 'senco_tracey' },
  { id: 't_ruby', name: 'Ruby Gray', role: ROLES.TA, email: 'ruby.gray@halswell.school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_tracey' }
];

let INITIAL_SESSIONS = [];
let sessionIdCounter = 1;

// Seed Karen's Monday-Thursday Schedule
['Monday', 'Tuesday', 'Wednesday', 'Thursday'].forEach(day => {
  const daySessions = [
    { timeSlotId: 't1', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito/Check Karlee', teamLeaderId: 'tl1' },
    { timeSlotId: 't2', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito/Check Karlee', teamLeaderId: 'tl1' },
    { timeSlotId: 't3', tier: TIERS.MORNING_TEA, subject: 'Morning Tea', teacherId: null },
    { timeSlotId: 't4', tier: TIERS.ENRICHMENT, subject: 'Casey', teamLeaderId: 'tl1' },
    { timeSlotId: 't5', tier: TIERS.CRITICAL, subject: 'Jess' },
    { timeSlotId: 't6', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito - Sam C/Check Karlee' },
    { timeSlotId: 't7', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito - Sam C/Check Karlee' },
    { timeSlotId: 't8', tier: TIERS.ENRICHMENT, subject: 'Casey' },
    { timeSlotId: 't9', tier: TIERS.LUNCH, subject: 'Lunch', teacherId: null },
    { timeSlotId: 't10', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito' },
    { timeSlotId: 't11', tier: TIERS.ENRICHMENT, subject: 'Casey' },
    { timeSlotId: 't12', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito' },
    { timeSlotId: 't13', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito' }
  ];
  daySessions.forEach(s => {
    INITIAL_SESSIONS.push({ id: `s${sessionIdCounter++}`, day, taId: 't1', teacherId: s.teacherId !== undefined ? s.teacherId : 'u2', ...s });
  });
});

const TIER_STYLES = {
  [TIERS.CRITICAL]: { wrapper: 'border-[#ffcfd6] bg-white', iconBg: 'bg-[#e04f64]', iconColor: 'text-white', icon: AlertTriangle, text: 'text-[#e04f64]', subText: 'text-[#e04f64]' },
  [TIERS.HIGH_NEEDS]: { wrapper: 'border-[#ffebd5] bg-white', iconBg: 'bg-[#f4a261]', iconColor: 'text-white', icon: User, text: 'text-[#d97706]', subText: 'text-[#f4a261]' },
  [TIERS.ENRICHMENT]: { wrapper: 'border-[#e0e7ff] bg-white', iconBg: 'bg-[#6157e8]', iconColor: 'text-white', icon: Star, text: 'text-[#4338ca]', subText: 'text-[#818cf8]' },
  [TIERS.MORNING_TEA]: { wrapper: 'border-[#fef08a] bg-white', iconBg: 'bg-[#eab308]', iconColor: 'text-white', icon: Coffee, text: 'text-[#ca8a04]', subText: 'text-[#eab308]' },
  [TIERS.LUNCH]: { wrapper: 'border-[#fef08a] bg-white', iconBg: 'bg-[#eab308]', iconColor: 'text-white', icon: Utensils, text: 'text-[#ca8a04]', subText: 'text-[#eab308]' },
  [TIERS.NOT_WORKING]: { wrapper: 'border-slate-200 bg-slate-50 opacity-60', iconBg: 'bg-slate-200', iconColor: 'text-slate-500', icon: Calendar, text: 'text-slate-500 font-normal', subText: 'text-slate-400' }
};

const Toast = ({ message, type = 'success' }) => (
  <div className={`fixed bottom-4 right-4 flex items-center p-4 rounded-xl shadow-lg text-white transition-all z-50
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
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-sans">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md w-full text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1a1f36] mb-2">Something went wrong</h2>
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
  const [accessDenied, setAccessDenied] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [authCompleted, setAuthCompleted] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showMobileSync, setShowMobileSync] = useState(false);
  const [verifyingGoogle, setVerifyingGoogle] = useState(false);

  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    document.title = "Support Link";
  }, []);

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
      const fetchedUsers = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      setUsers(fetchedUsers);
      
      if (fetchedUsers.length === 0) {
        INITIAL_USERS.forEach(u => setDoc(doc(usersRef, u.id), u));
        INITIAL_SESSIONS.forEach(s => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', s.id), s));
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

  const addUserToDb = async (userObj) => await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userObj.id), userObj);
  const deleteUserFromDb = async (userId) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId));
  const saveSessionToDb = async (sessionData) => await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionData.id), sessionData);
  const deleteSessionFromDb = async (sessionId) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId));
  const saveAbsenceToDb = async (absenceData) => await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absences', absenceData.id), absenceData);

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
          name: 'Tracey Mora (SENCO Preview)',
          role: ROLES.SENCO,
          email: 'tracey@halswell.school.nz',
          team: TEAMS.Y5_8
        });
        return;
      }

      try {
        const result = await signInWithPopup(auth, provider);
        await handlePostSignIn(result.user);
      } catch (popupErr) {
        console.warn("Popup blocked or failed, falling back to secure Redirect:", popupErr);
        await signInWithRedirect(auth, provider);
      }
    } catch (e) {
      console.error("Google Sign-In failed:", e);
      addToast("Secure verification blocked or failed.", "error");
    } finally {
      setVerifyingGoogle(false);
    }
  };

  const handleBypassSignIn = async (id) => {
    const found = users.find(u => u.id === id) || INITIAL_USERS.find(u => u.id === id);
    if (found) {
      try {
        // Automatically save the selected user's profile to the Firestore database
        await addUserToDb(found);
      } catch (err) {
        console.error("Bypass user write failed:", err);
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
                  <button onClick={() => handleBypassSignIn('senco_tracey')} className="py-2 px-1 bg-violet-50 hover:bg-violet-100 text-slate-700 font-semibold border rounded text-[11px] transition-colors">Tracey (SENCO Y5-8)</button>
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
      {/* 🧪 Sandbox Testing Role Switcher Banner */}
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
            <button onClick={() => handleBypassSignIn('senco_tracey')} className={`px-2 py-1 rounded font-bold text-[10px] transition-all border ${currentUser.id === 'senco_tracey' ? 'bg-amber-200 text-amber-900 border-amber-300 shadow-sm' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
              Tracey (SENCO Y5-8)
            </button>
            <button onClick={() => handleBypassSignIn('senco_cathie')} className={`px-2 py-1 rounded font-bold text-[10px] transition-all border ${currentUser.id === 'senco_cathie' ? 'bg-amber-200 text-amber-900 border-amber-300 shadow-sm' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
              Cathie (SENCO Y0-4)
            </button>
          </div>
        </div>
      )}

      <header className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-white sticky top-0 z-40 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="bg-[#f0efff] p-2 rounded-xl text-[#6157e8]">
            <HeartHandshake size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-xl text-[#1a1f36] leading-tight">Support Link</h1>
            <div className="flex items-center text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mt-0.5">Halswell Hub</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
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
        {currentUser.role === ROLES.SENCO && (
          <SencoDashboard 
            currentUser={currentUser} users={safeUsers} sessions={safeSessions} absences={safeAbsences} addToast={addToast} 
            addUserToDb={addUserToDb} deleteUserFromDb={deleteUserFromDb} saveSessionToDb={saveSessionToDb} deleteSessionFromDb={deleteSessionFromDb} saveAbsenceToDb={saveAbsenceToDb}
          />
        )}
        {currentUser.role === ROLES.TEAM_LEADER && (
          <TeamLeaderDashboard user={currentUser} sessions={safeSessions} users={safeUsers} />
        )}
        {currentUser.role === ROLES.TEACHER && (
          <TeacherDashboard user={currentUser} sessions={safeSessions} users={safeUsers} />
        )}
        {currentUser.role === ROLES.TA && (
          <TADashboard 
            user={currentUser} sessions={safeSessions} absences={safeAbsences} addToast={addToast} saveAbsenceToDb={saveAbsenceToDb} users={safeUsers}
          />
        )}
      </main>

      {showMobileSync && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-sm w-full p-8 text-center animate-fade-in">
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

  const safeAbsencesList = absences || [];
  const mySessions = sessions.filter(s => s.taId === user.id && s.day === selectedDay);
  
  // Sort and reverse so newest updates are always at the top
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
    if (safeAbsencesList.some(a => a.taId === user.id && a.day === selectedDay && a.status === 'Pending')) {
      addToast(`You have a pending absence already submitted for ${selectedDay}`, 'error');
      return;
    }
    
    saveAbsenceToDb({
      id: 'abs_' + Date.now(),
      taId: user.id,
      day: selectedDay,
      reason: absenceReason,
      status: 'Pending',
      reply: '' 
    });

    setShowAbsenceForm(false);
    setAbsenceReason('');
    addToast(`Absence submitted cleanly to your SENCO.`, 'success');
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
          onClick={() => setShowAbsenceForm(!showAbsenceForm)} 
          className="w-full md:w-auto px-5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all"
        >
          Report Absence
        </button>
      </div>

      {showAbsenceForm && (
        <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm space-y-3">
          <h4 className="font-bold text-slate-800 text-md">Report Daily Absence ({selectedDay})</h4>
          <textarea 
            value={absenceReason} 
            onChange={e => setAbsenceReason(e.target.value)} 
            className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-400 focus:outline-none" 
            rows={3} 
            placeholder="Please provide details (e.g. Unwell, medical appointment)..." />
          <div className="flex justify-end space-x-2">
            <button onClick={() => setShowAbsenceForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
            <button onClick={handleReportAbsence} className="px-5 py-2 bg-red-500 text-white font-bold text-xs uppercase rounded-xl">Submit to SENCO</button>
          </div>
        </div>
      )}

      {myAbsences.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
            <MessageSquare size={16} className="text-[#6157e8] mr-2" /> Recent Absences & SENCO Feedback Replies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myAbsences.map(a => (
              <div key={a.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 transition-all hover:border-[#6157e8]/30">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">{a.day} Absence</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                    a.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                    a.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>{a.status}</span>
                </div>
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
                <div className="w-16 md:w-24 flex-shrink-0 pr-4 border-r flex flex-col justify-center items-end text-right">
                  <span className="font-bold text-slate-800 text-sm md:text-base">{slot.start}</span>
                  <span className="text-[10px] md:text-xs font-semibold text-slate-400">{slot.end}</span>
                </div>
                <div className={`flex-1 ml-4 md:ml-6 p-4 rounded-xl border flex items-center ${style?.wrapper}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${style?.iconBg} ${style?.iconColor}`}><IconComponent size={18} /></div>
                  <div>
                    <span className={`text-[9px] font-bold tracking-wider uppercase block ${style?.text}`}>{session?.tier}</span>
                    <h4 className="font-medium text-slate-800 text-sm md:text-base mt-0.5">{session?.subject}</h4>
                    {session?.teacherId && (
                      <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded mt-1.5">
                        Teacher: {users.find(u => u.id === session.teacherId)?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const isSencoSupervisingTa = (senco, ta) => {
  if (!senco || !ta) return false;
  
  // 1. Master Admins / Global SENCOs supervise everyone
  if (senco.team === TEAMS.ALL) return true;
  
  // 2. Direct allocation check with fuzzy name & email matching fallbacks
  if (ta.allocatedSenco) {
    // Exact match
    if (ta.allocatedSenco === senco.id) return true;
    
    // Fuzzy match for Tracey
    if (ta.allocatedSenco === 'senco_tracey') {
      const isTracey = senco.id === 'senco_tracey' || 
                       senco.email?.toLowerCase().includes('tracey') || 
                       senco.name?.toLowerCase().includes('tracey');
      if (isTracey) return true;
    }
    
    // Fuzzy match for Cathie
    if (ta.allocatedSenco === 'senco_cathie') {
      const isCathie = senco.id === 'senco_cathie' || 
                       senco.email?.toLowerCase().includes('cathie') || 
                       senco.name?.toLowerCase().includes('cathie');
      if (isCathie) return true;
    }
  }
  
  // 3. Fallback team matching for unassigned or shared TAs
  if (ta.team === TEAMS.BOTH) return true; // Shared TAs are monitored by both teams
  if (senco.team === ta.team) return true;
  
  return false;
};

function SencoDashboard({ currentUser, users, sessions, absences, addToast, addUserToDb, deleteUserFromDb, saveSessionToDb, deleteSessionFromDb, saveAbsenceToDb }) {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [resolvingAbsence, setResolvingAbsence] = useState(null);
  const [editingCell, setEditingCell] = useState(null); 
  const [showManageStaff, setShowManageStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState(ROLES.TA);
  const [newStaffTeam, setNewStaffTeam] = useState(TEAMS.Y5_8);
  const [newStaffSenco, setNewStaffSenco] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);

  /* INTERACTIVE FILTER STATE: Replaces supervision filter static badge as per Screenshot 2026-06-06 at 11.54.36 AM.png */
  const [activeTeamFilter, setActiveTeamFilter] = useState(currentUser.team || TEAMS.ALL);

  const [sencoReplies, setSencoReplies] = useState({});

  // Duplication Tool States
  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [copyScope, setCopyScope] = useState('specific-staff'); 
  const [copySelectedTaId, setCopySelectedTaId] = useState('');
  const [copyTargetDays, setCopyTargetDays] = useState({
    Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false
  });
  const [copyOverwrite, setCopyOverwrite] = useState(true);

  // Filter absences robustly so Cathie or Tracey see alerts from TAs that they supervise
  const relevantAbsences = absences.filter(a => {
    if (a.status !== 'Pending') return false;
    const ta = users.find(u => u.id === a.taId) || INITIAL_USERS.find(u => u.id === a.taId);
    return isSencoSupervisingTa(currentUser, ta);
  });

  // Collect historical absences robustly so they are mapped correctly in the logs
  const resolvedAbsences = absences.filter(a => {
    if (a.status === 'Pending') return false;
    const ta = users.find(u => u.id === a.taId) || INITIAL_USERS.find(u => u.id === a.taId);
    return isSencoSupervisingTa(currentUser, ta);
  }).sort((a,b) => b.id.localeCompare(a.id));

  const handleUpdateAbsenceStatus = async (absence, newStatus) => {
    const replyText = sencoReplies[absence.id] || "Rest up Karen, coverage approved.";
    await saveAbsenceToDb({ ...absence, status: newStatus, reply: replyText });
    addToast(`Absence marked as ${newStatus}`, 'success');
  };

  const tas = users.filter(u => u.role === ROLES.TA).sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (tas.length > 0 && !copySelectedTaId) {
      setCopySelectedTaId(tas[0].id);
    }
  }, [tas, copySelectedTaId]);

  const handleStartEditStaff = (staff) => {
    setEditingStaff(staff);
    setNewStaffName(staff.name);
    setNewStaffEmail(staff.email || '');
    setNewStaffRole(staff.role);
    setNewStaffTeam(staff.team || TEAMS.Y5_8);
    setNewStaffSenco(staff.allocatedSenco || '');
  };

  const handleCancelEditStaff = () => {
    setEditingStaff(null);
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffRole(ROLES.TA);
    setNewStaffTeam(TEAMS.Y5_8);
    setNewStaffSenco('');
  };

  const handleAddOrUpdateStaff = () => {
    if(!newStaffName.trim() || !newStaffEmail.trim()) {
      addToast('Please provide both name and email.', 'error');
      return;
    }

    if (editingStaff) {
      const updatedStaff = {
        ...editingStaff,
        name: newStaffName,
        email: newStaffEmail.toLowerCase().trim(),
        role: newStaffRole,
        team: newStaffTeam,
        allocatedSenco: newStaffRole === ROLES.TA ? newStaffSenco : ''
      };
      addUserToDb(updatedStaff);
      addToast(`${newStaffName} updated successfully.`, 'success');
      setEditingStaff(null);
    } else {
      const newStaff = {
        id: (newStaffRole === ROLES.TA ? 't' : 'u') + Date.now(),
        name: newStaffName,
        role: newStaffRole,
        email: newStaffEmail.toLowerCase().trim(),
        team: newStaffTeam,
        allocatedSenco: newStaffRole === ROLES.TA ? newStaffSenco : ''
      };
      addUserToDb(newStaff);
      addToast(`${newStaffName} added successfully.`, 'success');
    }

    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffRole(ROLES.TA);
    setNewStaffTeam(TEAMS.Y5_8);
    setNewStaffSenco('');
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
      setCopyTargetDays({
        Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false
      });
      
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
      {/* INTERACTIVE TEAM SELECTOR */}
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
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button onClick={() => setShowManageStaff(true)} className="w-full md:w-auto py-2.5 px-4 bg-[#6157e8] hover:bg-[#5249d6] text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-sm flex items-center justify-center space-x-2 transition-all">
            <Users size={14} /> <span>Manage Staff & Teams</span>
          </button>
        </div>
      </div>

      {/* Relevant Absences Alerts Feed */}
      {relevantAbsences.length > 0 && (
        <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider flex items-center">
            <AlertCircle className="w-4 h-4 mr-1.5 animate-pulse text-red-600" /> Direct Team Absence Alerts ({relevantAbsences.length})
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {relevantAbsences.map(a => {
              const ta = users.find(u => u.id === a.taId) || INITIAL_USERS.find(u => u.id === a.taId);
              return (
                <div key={a.id} className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex flex-col gap-4 animate-fade-in">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wide">{ta?.team}</span>
                      <h4 className="font-bold text-slate-800 text-lg mt-1">{ta?.name} reported absent for {a.day}</h4>
                      <p className="text-sm text-slate-500 font-medium mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">" {a.reason} "</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                      <MessageSquare size={12} className="mr-1 text-[#6157e8]" /> Write a Reply Response Note (This will display live on Karen's dashboard):
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Hope you feel better soon, Karen! Val Murray will cover your morning sessions."
                      value={sencoReplies[a.id] || ''}
                      onChange={e => setSencoReplies({...sencoReplies, [a.id]: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#6157e8] focus:border-[#6157e8] outline-none font-medium text-slate-700"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end">
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
            const replyText = sencoReplies[resolvingAbsence.id] || "Rest up Karen, coverage approved and scheduled.";
            saveAbsenceToDb({ ...resolvingAbsence, status: 'Resolved', reply: replyText });
            setResolvingAbsence(null);
            addToast('Coverage applied successfully.');
          }} 
        />
      )}

      {/* Cloud-Archived Resolved Absence Feed (History) */}
      {resolvedAbsences.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-500" /> Resolved Absences Archive Log
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{resolvedAbsences.length} Total</span>
          </div>
          <div className="max-h-[220px] overflow-y-auto space-y-2 pr-2">
            {resolvedAbsences.map(a => {
              const ta = users.find(u => u.id === a.taId) || INITIAL_USERS.find(u => u.id === a.taId);
              return (
                <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs">
                  <div>
                    <span className="font-bold text-[#1a1f36]">{ta?.name}</span>
                    <span className="text-slate-400 mx-2">•</span>
                    <span className="font-semibold text-slate-500">{a.day} Absence</span>
                    <span className="mx-2 text-slate-400">•</span>
                    <span className="text-slate-500 italic">" {a.reason} "</span>
                  </div>
                  <div className="flex items-center gap-2">
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

      {/* Copy Timetable Day Modal */}
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
                  {users.filter(u => u.role === ROLES.TEACHER).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Supporting Team Leader</label>
                <select name="teamLeaderId" defaultValue={editingCell.session?.teamLeaderId || ''} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none">
                  <option value="">None / No Team Leader</option>
                  {users.filter(u => u.role === ROLES.TEAM_LEADER).map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                {editingCell.session && (
                  <button type="button" onClick={handleDeleteSession} className="px-5 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors mr-auto flex items-center">
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </button>
                )}
                <button type="button" onClick={() => setEditingCell(null)} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Cancel</button>
                <button type="submit" className="px-6 py-3 bg-[#1a1f36] text-white font-bold hover:bg-black rounded-xl transition-colors shadow-md text-sm font-sans">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Two-Column Staff Management Modal */}
      {showManageStaff && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full p-8 animate-fade-in max-h-[90vh] flex flex-col md:grid md:grid-cols-12 md:gap-8 overflow-hidden">
            
            <div className="col-span-12 border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-[#1a1f36]">Manage Staff & Teams</h3>
              <button onClick={() => setShowManageStaff(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">×</button>
            </div>

            {/* Left Column: Staff members list inside a dedicated scroll container */}
            <div className="col-span-12 md:col-span-6 flex flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
              <h4 className="font-bold text-[#1a1f36] text-xs uppercase tracking-wider text-slate-400 mb-3">Current Staff Members</h4>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[40vh] md:max-h-[55vh]">
                {[...users].sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                  <div key={u.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <div className="font-bold text-[#1a1f36] text-sm">{u.name}</div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{u.role}</div>
                      {/* Renamed to SENCO and filtered to only show for TAs */}
                      {u.role === ROLES.TA && (
                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          SENCO: <span className="text-[#6157e8]">{u.allocatedSenco === 'senco_cathie' ? 'Cathie' : u.allocatedSenco === 'senco_tracey' ? 'Tracey' : 'None / Both'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleStartEditStaff(u)} className="p-2 text-[#6157e8] hover:bg-violet-100 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                      {u.id !== currentUser.id && (
                        <button onClick={() => handleDeleteStaff(u.id, u.name)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Interactive Details Edit Form */}
            <div className="col-span-12 md:col-span-6 flex flex-col min-h-0 overflow-y-auto max-h-[45vh] md:max-h-[55vh] pt-4 md:pt-0">
              <h4 className="font-bold text-[#1a1f36] text-sm mb-3">
                {editingStaff ? `Edit Details: ${editingStaff.name}` : 'Add New Staff'}
              </h4>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Staff Full Name</label>
                  <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none" placeholder="e.g. Ruby Gray" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Google Email Address</label>
                  <input type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none" placeholder="e.g. ruby.gray@halswell.school.nz" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Access Role</label>
                    <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none">
                      <option value={ROLES.TA}>Teacher Aide (TA)</option>
                      <option value={ROLES.TEACHER}>Teacher</option>
                      <option value={ROLES.TEAM_LEADER}>Team Leader</option>
                      <option value={ROLES.SENCO}>SENCO (Admin)</option>
                    </select>
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
                </div>

                {/* Only apply the Allocated SENCO selection field to TAs, not teachers or team leaders */}
                {newStaffRole === ROLES.TA && (
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
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                  {editingStaff && <button onClick={handleCancelEditStaff} className="px-5 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">Cancel Edit</button>}
                  <button onClick={() => setShowManageStaff(false)} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Done</button>
                  <button onClick={handleAddOrUpdateStaff} className="px-6 py-3 bg-[#6157e8] text-white font-bold hover:bg-[#5249d6] rounded-xl transition-colors shadow-md text-sm">Save Staff</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Grid Timetable Card Container */}
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
    </div>
  );
}

function TeamLeaderDashboard({ user, sessions, users }) {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const teamSessions = sessions.filter(s => s.day === selectedDay && s.teamLeaderId === user.id);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
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
  const teacherSessions = sessions.filter(s => s.day === selectedDay && s.teacherId === user.id);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[24px] border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1f36]">{user.name} Dashboard</h2>
          <p className="text-xs font-semibold text-[#6157e8] uppercase mt-1 tracking-wider">Teacher View</p>
        </div>
        <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-white border border-slate-200 text-[#1a1f36] font-semibold rounded-xl px-4 py-2.5">
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm">
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
  
  // Sort and filter TAs based on active Team selection filter
  const allTas = users.filter(u => u.role === ROLES.TA).sort((a, b) => a.name.localeCompare(b.name));
  
  const tas = allTas.filter(ta => {
    if (!teamFilter || teamFilter === TEAMS.ALL) return true;
    if (teamFilter === TEAMS.BOTH) return ta.team === TEAMS.BOTH;
    // Subset Logic: TAs working on "Both Teams" always match both of the separate Years teams!
    if (teamFilter === TEAMS.Y0_4) return ta.team === TEAMS.Y0_4 || ta.team === TEAMS.BOTH;
    if (teamFilter === TEAMS.Y5_8) return ta.team === TEAMS.Y5_8 || ta.team === TEAMS.BOTH;
    return true;
  });

  const [activeTaId, setActiveTaId] = useState('');

  // Safeguard: Automatically reset active selection when switching team filters
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
    <div className="space-y-4">
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
          {/* Filtered scrollable list of TAs */}
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
            <div className="space-y-4 max-w-2xl mx-auto">
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
                    <div className="w-14 sm:w-24 flex-shrink-0 flex flex-col items-end pr-2.5 sm:pr-6 pt-4 border-r border-slate-100">
                      <span className="font-bold text-slate-800 text-xs sm:text-sm">{slot.start}</span>
                      <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{slot.end}</span>
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
                                  <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md">
                                    T: {users.find(u => u.id === session.teacherId)?.name || 'Teacher'}
                                  </span>
                                )}
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
                <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-medium text-slate-800 text-sm whitespace-nowrap sticky left-0 z-10 bg-white shadow-[inset_-2px_0_0_#f1f5f9]">
                    {slot.start} <span className="text-slate-400 text-xs ml-1 font-medium">{slot.end}</span>
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

function CoverageResolver({ absence, users, sessions, onClose, onResolve }) {
  const absentTa = users.find(u => u.id === absence.taId) || INITIAL_USERS.find(u => u.id === absence.taId);
  const absentSessions = sessions.filter(s => s.day === absence.day && s.taId === absence.taId);
  
  const otherTas = users
    .filter(u => u.role === ROLES.TA && u.id !== absence.taId)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    const initial = {};
    absentSessions.forEach(s => {
      initial[s.id] = '';
    });
    setAssignments(initial);
  }, [sessions, absence]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-fade-in">
        <h3 className="text-2xl font-bold text-slate-800 mb-2 font-sans">Coverage: {absentTa?.name}</h3>
        <p className="text-slate-500 text-sm mb-6">Assign replacement staff for {absence.day}'s schedule.</p>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6">
          {absentSessions.map(session => {
            const slot = TIME_SLOTS.find(t => t.id === session.timeSlotId);
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
                  className="w-full sm:w-44 border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-medium focus:ring-[#6157e8] outline-none"
                >
                  <option value="">Leave Uncovered</option>
                  {otherTas.map(ta => {
                    const isBusy = sessions.some(s => s.day === absence.day && s.timeSlotId === session.timeSlotId && s.taId === ta.id);
                    return (
                      <option key={ta.id} value={ta.id}>
                        {ta.name} {isBusy ? '(Has Duty)' : '(Available)'}
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
