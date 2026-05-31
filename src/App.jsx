import React, { useState, useEffect } from 'react';
import { 
  Calendar, AlertCircle, Users, CheckCircle, 
  Copy, LogOut, Bell, HeartHandshake, ChevronLeft,
  QrCode, User, Star, AlertTriangle, Coffee, Utensils,
  Plus, Edit3, Trash2, Loader2, RefreshCw
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, 
  GoogleAuthProvider, signInWithPopup, signOut 
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
// Safely load the configuration. If we are running in the preview sandbox, we use the global __firebase_config parameter.
// If we are running in production on Vercel, we fallback to the local hardcoded credentials.
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      const parsed = JSON.parse(__firebase_config);
      if (parsed && parsed.apiKey) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse sandbox config", e);
    }
  }
  
  // YOUR FIREBASE WEB APP CONFIGURATION OBJECT FOR HALSWELL SCHOOL PRODUCTION SITE:
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

// If the API key is missing or is a placeholder, we define a dummy config to prevent the app from instantly crashing on boot,
// allowing it to render the UI safely or let the user continue updating keys.
const safeFirebaseConfig = (firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_"))
  ? firebaseConfig
  : {
      apiKey: "dummy-api-key-for-sandbox-preview-only",
      authDomain: "dummy-project.firebaseapp.com",
      projectId: "dummy-project",
      storageBucket: "dummy-project.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:dummy"
    };

const app = initializeApp(safeFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Use a clean static string fallback when appId contains unsafe folder-like segments (such as filenames or paths from the sandbox)
const getCleanAppId = () => {
  const rawId = typeof __app_id !== 'undefined' ? __app_id : "halswell-school-production";
  return rawId.split('/')[0];
};
const appId = getCleanAppId();

// --- MOCK DATA & CONSTANTS ---
const ROLES = {
  SENCO: 'SENCO',
  TEACHER: 'TEACHER',
  TA: 'TA'
};

const TIERS = {
  CRITICAL: 'Critical',
  HIGH_NEEDS: 'High Needs',
  ENRICHMENT: 'Enrichment',
  MORNING_TEA: 'Morning Tea',
  LUNCH: 'Lunch'
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

// Seed data generated for testing
const INITIAL_USERS = [
  { id: 'u2', name: 'Mr. Smith', role: ROLES.TEACHER, email: 'smith@school.edu' },
  { id: 't1', name: 'Karen Cate', role: ROLES.TA, email: 'karen@school.edu' }
];

let INITIAL_SESSIONS = [];
let sessionIdCounter = 1;

// Generate Karen's Mon-Thu Schedule
['Monday', 'Tuesday', 'Wednesday', 'Thursday'].forEach(day => {
  const daySessions = [
    { timeSlotId: 't1', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito/Check Karlee' },
    { timeSlotId: 't2', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito/Check Karlee' },
    { timeSlotId: 't3', tier: TIERS.MORNING_TEA, subject: 'Morning Tea', teacherId: null },
    { timeSlotId: 't4', tier: TIERS.ENRICHMENT, subject: 'Casey' },
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
    INITIAL_SESSIONS.push({
      id: `s${sessionIdCounter++}`, day, taId: 't1', teacherId: s.teacherId !== undefined ? s.teacherId : 'u2', ...s
    });
  });
});

// Generate Karen's Friday Schedule
const fridaySessions = [
  { timeSlotId: 't1', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito/Check Karlee' },
  { timeSlotId: 't2', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito/Check Karlee' },
  { timeSlotId: 't3', tier: TIERS.MORNING_TEA, subject: 'Morning Tea', teacherId: null },
  { timeSlotId: 't4', tier: TIERS.ENRICHMENT, subject: 'Casey' },
  { timeSlotId: 't5', tier: TIERS.CRITICAL, subject: 'Jess' },
  { timeSlotId: 't6', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito - Sam C/Check Karlee' },
  { timeSlotId: 't7', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito - Sam C/Check Karlee' },
  { timeSlotId: 't8', tier: TIERS.ENRICHMENT, subject: 'Harry' }, 
  { timeSlotId: 't9', tier: TIERS.LUNCH, subject: 'Lunch', teacherId: null },
  { timeSlotId: 't10', tier: TIERS.ENRICHMENT, subject: 'Harry' },
  { timeSlotId: 't12', tier: TIERS.ENRICHMENT, subject: 'Harry' },
  { timeSlotId: 't13', tier: TIERS.ENRICHMENT, subject: 'Harry' }
];

fridaySessions.forEach(s => {
  INITIAL_SESSIONS.push({
    id: `s${sessionIdCounter++}`, day: 'Friday', taId: 't1', teacherId: s.teacherId !== undefined ? s.teacherId : 'u2', ...s
  });
});

// --- UI COMPONENTS ---
const TIER_STYLES = {
  [TIERS.CRITICAL]: { wrapper: 'border-[#ffcfd6] bg-white', iconBg: 'bg-[#e04f64]', iconColor: 'text-white', icon: AlertTriangle, text: 'text-[#e04f64]', subText: 'text-[#e04f64]' },
  [TIERS.HIGH_NEEDS]: { wrapper: 'border-[#ffebd5] bg-white', iconBg: 'bg-[#f4a261]', iconColor: 'text-white', icon: User, text: 'text-[#d97706]', subText: 'text-[#f4a261]' },
  [TIERS.ENRICHMENT]: { wrapper: 'border-[#e0e7ff] bg-white', iconBg: 'bg-[#6157e8]', iconColor: 'text-white', icon: Star, text: 'text-[#4338ca]', subText: 'text-[#818cf8]' },
  [TIERS.MORNING_TEA]: { wrapper: 'border-[#fef08a] bg-white', iconBg: 'bg-[#eab308]', iconColor: 'text-white', icon: Coffee, text: 'text-[#ca8a04]', subText: 'text-[#eab308]' },
  [TIERS.LUNCH]: { wrapper: 'border-[#fef08a] bg-white', iconBg: 'bg-[#eab308]', iconColor: 'text-white', icon: Utensils, text: 'text-[#ca8a04]', subText: 'text-[#eab308]' }
};

const Toast = ({ message, type = 'success' }) => {
  return (
    <div className={`fixed bottom-4 right-4 flex items-center p-4 rounded-xl shadow-lg text-white transition-all z-50
      ${type === 'success' ? 'bg-[#10b981]' : 'bg-[#6157e8]'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5 mr-3" /> : <Bell className="w-5 h-5 mr-3" />}
      <p className="font-medium text-sm">{message}</p>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [dbUser, setDbUser] = useState(null); // The Google Auth profile
  const [currentUser, setCurrentUser] = useState(null); // The matching staff profile in your DB
  const [accessDenied, setAccessDenied] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [authCompleted, setAuthCompleted] = useState(false);

  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [toasts, setToasts] = useState([]);

  // 1. Initialize Authentication FIRST and await completion before making Firestore calls
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
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
      if (!firebaseUser) {
        setCurrentUser(null);
        setAccessDenied(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Sync Live Data & Check Authorization -- GUARDED to run ONLY after auth is complete AND user is actively authenticated
  useEffect(() => {
    // Only subscribe to snapshots once authentication is fully completed and dbUser state exists.
    if (!authCompleted || !dbUser) return;

    let usersLoaded = false;
    let sessionsLoaded = false;
    let absencesLoaded = false;

    const checkReady = () => {
      if (usersLoaded && sessionsLoaded && absencesLoaded) setIsDbReady(true);
    };

    // Firebase storage path requirements aligned with rule structure:
    // /artifacts/{appId}/public/data/{collectionName}
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubUsers = onSnapshot(usersRef, async (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      setUsers(fetchedUsers);
      if(!usersLoaded) { usersLoaded = true; checkReady(); }

      if (dbUser.email) {
        const matchedUser = fetchedUsers.find(u => u.email.toLowerCase() === dbUser.email.toLowerCase());
        
        if (matchedUser) {
          setCurrentUser(matchedUser);
          setAccessDenied(false);
        } 
        else if (fetchedUsers.length === 0) {
          // DATABASE IS EMPTY: Make the first person to log in the SENCO!
          const newSenco = {
            id: 'u' + Date.now(),
            name: dbUser.displayName || 'First Admin',
            role: ROLES.SENCO,
            email: dbUser.email.toLowerCase()
          };
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', newSenco.id), newSenco);
          
          for (const u of INITIAL_USERS) {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id), u);
          }
          for (const s of INITIAL_SESSIONS) {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', s.id), s);
          }
        } 
        else {
          setCurrentUser(null);
          setAccessDenied(true);
        }
      } else {
        // Fallback for anonymous login in local sandboxed environment
        const localMatched = fetchedUsers.find(u => u.role === ROLES.SENCO);
        if (localMatched) {
          setCurrentUser(localMatched);
        } else if (fetchedUsers.length > 0) {
          // Fallback to first user in preview environment if no SENCO role is defined yet
          setCurrentUser(fetchedUsers[0]);
        }
      }
    }, (error) => {
      console.warn("Users subscription paused or insufficient permissions. Retrying...");
    });

    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    const unsubSessions = onSnapshot(sessionsRef, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
      if(!sessionsLoaded) { sessionsLoaded = true; checkReady(); }
    }, (error) => {
      console.warn("Sessions subscription paused or insufficient permissions. Retrying...");
    });

    const absencesRef = collection(db, 'artifacts', appId, 'public', 'data', 'absences');
    const unsubAbsences = onSnapshot(absencesRef, (snapshot) => {
      setAbsences(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
      if(!absencesLoaded) { absencesLoaded = true; checkReady(); }
    }, (error) => {
      console.warn("Absences subscription paused or insufficient permissions. Retrying...");
    });

    return () => { unsubUsers(); unsubSessions(); unsubAbsences(); };
  }, [authCompleted, dbUser]);

  // Database Write Methods - Guarded to prevent unauthenticated operations
  const addUserToDb = async (userObj) => {
    if (!auth.currentUser) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userObj.id), userObj);
  };
  const deleteUserFromDb = async (userId) => {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId));
  };
  const saveSessionToDb = async (sessionData) => {
    if (!auth.currentUser) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionData.id), sessionData);
  };
  const deleteSessionFromDb = async (sessionId) => {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId));
  };
  const saveAbsenceToDb = async (absenceData) => {
    if (!auth.currentUser) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absences', absenceData.id), absenceData);
  };
  
  const clearAllDataDb = async () => {
    if (!auth.currentUser) return;
    const deletePromises = [];
    users.forEach(u => {
      if (u.role !== ROLES.SENCO) {
        deletePromises.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id)));
      }
    });
    sessions.forEach(s => deletePromises.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', s.id))));
    absences.forEach(a => deletePromises.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absences', a.id))));
    await Promise.all(deletePromises);
  };

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleGoogleSignIn = async () => {
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      // If we are currently running in the sandbox and no credentials are pasted yet, let them log in instantly as an authorized mock SENCO to test.
      const mockSenco = {
        id: 'u-senco-sandbox',
        name: 'Sarah Admin (SENCO)',
        role: ROLES.SENCO,
        email: 'senco@school.edu'
      };
      await addUserToDb(mockSenco);
      setCurrentUser(mockSenco);
      addToast("Signed in securely as SENCO (Preview Mode)", "info");
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-in Error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        addToast("Sign-in blocked. If testing in preview, please deploy to Vercel.", "error");
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setAccessDenied(false);
    setAuthCompleted(false);
    try {
      await signInAnonymously(auth); 
    } catch (err) {
      console.error(err);
    } finally {
      setAuthCompleted(true);
    }
  };

  // If we are in sandboxed preview mode and permissions/initial state are setting up,
  // we render the main shell immediately instead of hanging on the loader if Firestore permissions fail on start.
  if (!isDbReady && (firebaseConfig && firebaseConfig.apiKey)) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center">
        <Loader2 className="w-12 h-12 text-[#6157e8] animate-spin mb-4" />
        <h2 className="text-[#1a1f36] font-bold text-lg">Syncing with Cloud...</h2>
        <p className="text-xs text-slate-400 mt-2">Checking real-time database credentials</p>
      </div>
    );
  }

  // Fallback database states if in local preview/sandboxed mode with missing permissions
  const safeUsers = users.length > 0 ? users : INITIAL_USERS;
  const safeSessions = sessions.length > 0 ? sessions : INITIAL_SESSIONS;
  const safeAbsences = absences;

  // Real Google Login Screen
  if (!currentUser && (firebaseConfig && firebaseConfig.apiKey)) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center p-4 font-sans">
        <div className="flex flex-col items-center max-w-md w-full">
          <div className="bg-[#6157e8] p-4 rounded-[20px] shadow-sm mb-6">
            <HeartHandshake className="text-white w-10 h-10" strokeWidth={2} />
          </div>
          
          <h1 className="text-[36px] font-bold text-[#1a1f36] mb-3 tracking-tight">Support Link</h1>
          <p className="text-[11px] font-bold text-[#6157e8] tracking-[0.2em] mb-12 uppercase text-center">
            Halswell School TA Management Portal
          </p>

          {accessDenied ? (
            <div className="w-full max-w-sm bg-white p-8 rounded-[24px] shadow-sm border border-red-100 text-center animate-fade-in">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-[#1a1f36] mb-2">Access Denied</h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                The email address <b className="text-slate-800">{dbUser?.email}</b> is not registered in the Support Link system. Please ask the SENCO to add your email via the Manage Staff panel.
              </p>
              <button 
                onClick={handleLogout} 
                className="w-full py-3 bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm"
              >
                Sign out & try another account
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm animate-fade-in flex flex-col items-center">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center space-x-3 py-4 px-6 border border-slate-200 rounded-full hover:shadow-md hover:-translate-y-[1px] transition-all text-[#3c4257] font-bold shadow-[0_2px_10px_rgba(0,0,0,0.04)] bg-white"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                <span>Sign in with Google</span>
              </button>
              <p className="mt-6 text-xs font-semibold text-slate-400 text-center px-4 max-w-[280px] leading-relaxed">
                The first person to sign in will automatically become the Master Admin (SENCO).
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active user representation (fallback to default admin in preview sandbox)
  const activeUser = currentUser || { id: 'u-admin-fallback', name: 'Sarah Admin (SENCO)', role: ROLES.SENCO, email: 'admin@school.edu' };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <header className="px-6 py-4 flex justify-between items-center border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-40">
        <div className="flex items-center space-x-4">
          <div className="bg-[#f0efff] p-2 rounded-xl text-[#6157e8]">
            <HeartHandshake size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-xl text-[#1a1f36] leading-tight">Support Link</h1>
            <div className="flex items-center text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mt-0.5">
              Halswell Hub <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-2"></span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="hidden sm:flex items-center space-x-2 bg-[#f8f9fa] hover:bg-[#f1f3f5] text-slate-500 font-semibold text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl transition-colors">
            <QrCode size={16} />
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

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        {activeUser.role === ROLES.SENCO && (
          <SencoDashboard 
            currentUser={activeUser}
            users={safeUsers} 
            sessions={safeSessions} 
            absences={safeAbsences} 
            addToast={addToast} 
            addUserToDb={addUserToDb}
            deleteUserFromDb={deleteUserFromDb}
            saveSessionToDb={saveSessionToDb}
            deleteSessionFromDb={deleteSessionFromDb}
            saveAbsenceToDb={saveAbsenceToDb}
            clearAllDataDb={clearAllDataDb}
          />
        )}
        {activeUser.role === ROLES.TEACHER && (
          <TeacherDashboard sessions={safeSessions} users={safeUsers} />
        )}
        {activeUser.role === ROLES.TA && (
          <TADashboard 
            user={activeUser} 
            sessions={safeSessions} 
            absences={safeAbsences} 
            addToast={addToast}
            saveAbsenceToDb={saveAbsenceToDb}
          />
        )}
      </main>

      {/* Toasts */}
      {toasts.map((toast, idx) => (
        <div key={toast.id} style={{ bottom: `${1 + idx * 4.5}rem` }} className="fixed right-4 z-50">
          <Toast message={toast.message} type={toast.type} />
        </div>
      ))}
    </div>
  );
}

// --- TA DASHBOARD ---
function TADashboard({ user, sessions, absences, addToast, saveAbsenceToDb }) {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');

  const mySessions = sessions.filter(s => s.taId === user.id && s.day === selectedDay);
  
  const sortedSessions = TIME_SLOTS.map(slot => {
    return {
      slot,
      session: mySessions.find(s => s.timeSlotId === slot.id)
    };
  }).filter(item => item.session);

  const handleReportAbsence = () => {
    if (!absenceReason.trim()) {
      addToast('Please provide a reason for the absence.', 'error');
      return;
    }
    if (absences.some(a => a.taId === user.id && a.day === selectedDay)) {
      addToast(`You have already reported an absence for ${selectedDay}`, 'error');
      return;
    }
    
    saveAbsenceToDb({
      id: Math.random().toString(36).substr(2, 9),
      taId: user.id,
      day: selectedDay,
      reason: absenceReason,
      status: 'Pending',
    });

    setShowAbsenceForm(false);
    setAbsenceReason('');
    addToast(`Absence for ${selectedDay} reported to SENCO.`, 'success');
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex items-center">
          <button className="mr-4 text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[#1a1f36]">{user.name}</h2>
            <p className="text-[11px] font-bold text-[#6157e8] tracking-[0.15em] uppercase mt-0.5">
              {selectedDay} Timeline
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowAbsenceForm(!showAbsenceForm)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs tracking-wider uppercase px-5 py-3 rounded-xl transition-colors"
          >
            <AlertCircle size={16} />
            <span>Report Absence</span>
          </button>
        </div>
      </div>

      {showAbsenceForm && (
        <div className="mb-8 bg-red-50/50 p-6 rounded-[24px] border border-red-100">
          <h3 className="text-lg font-bold text-[#1a1f36] mb-2 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            Report Absence for {selectedDay}
          </h3>
          <p className="text-sm text-slate-600 mb-4">Please provide a reason so the SENCO can arrange appropriate coverage.</p>
          <div className="flex flex-col space-y-4">
            <textarea
              value={absenceReason}
              onChange={(e) => setAbsenceReason(e.target.value)}
              placeholder="Reason for absence (e.g., Unwell, Appointment)..."
              className="border border-red-200 bg-white rounded-xl p-4 w-full min-h-[100px] focus:ring-2 focus:ring-red-400 focus:outline-none transition-shadow"
            />
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleReportAbsence}
                className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-md hover:bg-red-600 transition-colors"
              >
                Submit Absence
              </button>
              <button 
                onClick={() => { setShowAbsenceForm(false); setAbsenceReason(''); }}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {DAYS.map(d => (
          <button 
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-bold tracking-[0.1em] uppercase transition-all duration-200
              ${selectedDay === d 
                ? 'bg-[#1a1f36] text-white shadow-md' 
                : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
              }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="space-y-4 mt-8">
        {sortedSessions.length === 0 ? (
           <div className="text-center p-12 bg-slate-50 rounded-[32px] border border-dashed border-slate-200 text-slate-400 font-medium">
             No duties assigned for this day.
           </div>
        ) : (
          sortedSessions.map(({ slot, session }) => {
            const style = TIER_STYLES[session.tier] || TIER_STYLES[TIERS.ENRICHMENT];
            const IconComponent = style.icon;
            
            return (
              <div key={slot.id} className="flex items-stretch group">
                <div className="w-16 sm:w-20 flex-shrink-0 flex flex-col items-end pr-4 sm:pr-6 pt-5">
                  <span className="font-medium text-slate-800 text-sm">{slot.start}</span>
                  <span className="text-[11px] font-medium text-slate-400 mt-0.5">{slot.end}</span>
                </div>
                
                <div className={`flex-1 flex items-center p-4 sm:p-5 rounded-[28px] border-[1.5px] transition-all duration-200 hover:shadow-sm ${style.wrapper}`}>
                  <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center ${style.iconBg} ${style.iconColor} mr-4 sm:mr-5 shadow-sm`}>
                    <IconComponent size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className={`font-medium text-[15px] leading-tight mb-1 ${style.text}`}>
                      {session.subject}
                    </h3>
                    <p className={`text-[10px] font-medium tracking-[0.15em] uppercase ${style.subText}`}>
                      {session.tier}
                    </p>
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

// --- SENCO DASHBOARD ---
function SencoDashboard({ currentUser, users, sessions, absences, addToast, addUserToDb, deleteUserFromDb, saveSessionToDb, deleteSessionFromDb, saveAbsenceToDb, clearAllDataDb }) {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [resolvingAbsence, setResolvingAbsence] = useState(null);
  const [editingCell, setEditingCell] = useState(null); 
  const [showManageStaff, setShowManageStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState(ROLES.TA);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const pendingAbsences = absences.filter(a => a.status === 'Pending');

  const handleAddStaff = () => {
    if(!newStaffName.trim() || !newStaffEmail.trim()) {
      addToast('Please provide both name and email.', 'error');
      return;
    }
    const newStaff = {
      id: (newStaffRole === ROLES.TA ? 't' : 'u') + Date.now(),
      name: newStaffName,
      role: newStaffRole,
      email: newStaffEmail.toLowerCase().trim()
    };
    addUserToDb(newStaff);
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffRole(ROLES.TA);
    addToast(`${newStaffName} added as ${newStaffRole} successfully.`);
  };

  const handleDeleteStaff = (userId, name) => {
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

  const handleApplyCoverage = (assignments, resolvingAbsence) => {
    Object.entries(assignments).forEach(([sessionId, coveringTaId]) => {
      const session = sessions.find(s => s.id === sessionId);
      if (session) saveSessionToDb({ ...session, taId: coveringTaId });
      
      const coveringTaSession = sessions.find(s => 
        s.day === resolvingAbsence.day && s.timeSlotId === session.timeSlotId && s.taId === coveringTaId
      );
      if (coveringTaSession) {
        saveSessionToDb({ ...coveringTaSession, subject: 'Coverage Reassigned', tier: TIERS.MORNING_TEA });
      }
    });

    saveAbsenceToDb({ ...resolvingAbsence, status: 'Resolved' });
    setResolvingAbsence(null);
    addToast('Coverage Approved & Broadcasted to Live Network!');
  };

  const handleWipeData = async () => {
    await clearAllDataDb();
    setShowWipeConfirm(false);
    addToast('Database cleared. Ready for real data.', 'success');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Alerts Section */}
      {pendingAbsences.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center text-red-800 mb-4">
            <AlertCircle className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-bold">Action Required: TA Absences</h2>
          </div>
          <div className="space-y-3">
            {pendingAbsences.map(absence => {
              const ta = users.find(u => u.id === absence.taId);
              return (
                <div key={absence.id} className="bg-white p-5 rounded-2xl border border-red-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-[#1a1f36] text-lg">{ta?.name} has reported absent for {absence.day}</p>
                    {absence.reason && (
                      <p className="text-sm font-medium text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 mr-2 uppercase text-xs tracking-wider font-bold">Reason:</span> 
                        {absence.reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setResolvingAbsence(absence)}
                    className="w-full sm:w-auto px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-bold text-sm transition-colors shadow-sm"
                  >
                    Resolve Coverage
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Coverage Resolution Modal */}
      {resolvingAbsence && (
        <CoverageResolver {
          ...{
            absence: resolvingAbsence,
            users,
            sessions,
            onClose: () => setResolvingAbsence(null),
            onResolve: (assignments) => handleApplyCoverage(assignments, resolvingAbsence)
          }
        } />
      )}

      {/* Session Editor Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-fade-in">
            <h3 className="text-2xl font-bold text-[#1a1f36] mb-6">
              {editingCell.session ? 'Edit Duty' : 'Assign Duty'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleSaveSession({
                subject: formData.get('subject'),
                tier: formData.get('tier'),
                teacherId: formData.get('teacherId') || null
              });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject / Task Name</label>
                <input 
                  type="text" name="subject" required defaultValue={editingCell.session?.subject}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] focus:border-[#6157e8] outline-none"
                  placeholder="e.g. Reading Support..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tier</label>
                <select name="tier" defaultValue={editingCell.session?.tier || TIERS.ENRICHMENT} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none">
                  {Object.values(TIERS).map(tier => <option key={tier} value={tier}>{tier}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Supporting Teacher</label>
                <select name="teacherId" defaultValue={editingCell.session?.teacherId || ''} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none">
                  <option value="">None / Self-Directed</option>
                  {users.filter(u => u.role === ROLES.TEACHER).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                {editingCell.session && (
                  <button type="button" onClick={handleDeleteSession} className="px-5 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors mr-auto flex items-center">
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </button>
                )}
                <button type="button" onClick={() => setEditingCell(null)} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit"
