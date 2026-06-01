import React, { useState, useEffect } from 'react';
import { 
  Calendar, AlertCircle, Users, CheckCircle, 
  Copy, LogOut, Bell, HeartHandshake, ChevronLeft,
  QrCode, User, Star, AlertTriangle, Coffee, Utensils,
  Plus, Edit3, Trash2, Loader2, RefreshCw, Smartphone, ChevronRight, ShieldCheck
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, 
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
  setPersistence, browserLocalPersistence, browserSessionPersistence 
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      const parsed = JSON.parse(__firebase_config);
      if (parsed && parsed.apiKey) return parsed;
    } catch (e) {
      console.error("Failed to parse sandbox config", e);
    }
  }
  
  // LIVE HALSWELL SCHOOL FIREBASE WEB APP CONFIGURATION OBJECT:
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

// --- MOCK DATA & CONSTANTS ---
const ROLES = {
  SENCO: 'SENCO',
  TEAM_LEADER: 'Team Leader',
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

const INITIAL_USERS = [
  { id: 'u2', name: 'Mr. Smith', role: ROLES.TEACHER, email: 'smith@school.edu' },
  { id: 't1', name: 'Karen Cate', role: ROLES.TA, email: 'karen@school.edu' },
  { id: 'tl1', name: 'Mrs. Davis', role: ROLES.TEAM_LEADER, email: 'davis@school.edu' }
];

let INITIAL_SESSIONS = [];
let sessionIdCounter = 1;

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
    INITIAL_SESSIONS.push({
      id: `s${sessionIdCounter++}`, day, taId: 't1', teacherId: s.teacherId !== undefined ? s.teacherId : 'u2', ...s
    });
  });
});

const fridaySessions = [
  { timeSlotId: 't1', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito/Check Karlee', teamLeaderId: 'tl1' },
  { timeSlotId: 't2', tier: TIERS.HIGH_NEEDS, subject: 'Ōtawhito/Check Karlee', teamLeaderId: 'tl1' },
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

const Toast = ({ message, type = 'success' }) => (
  <div className={`fixed bottom-4 right-4 flex items-center p-4 rounded-xl shadow-lg text-white transition-all z-50
    ${type === 'success' ? 'bg-[#10b981]' : 'bg-[#6157e8]'}`}>
    {type === 'success' ? <CheckCircle className="w-5 h-5 mr-3" /> : <Bell className="w-5 h-5 mr-3" />}
    <p className="font-medium text-sm">{message}</p>
  </div>
);

// --- SECURE ERROR BOUNDARY (CRASH PROTECTOR) ---
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
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              We caught a small visual layout error. Press the button below to cleanly refresh the app.
            </p>
            <div className="bg-red-50 text-red-700 text-xs font-mono p-3 rounded-xl mb-6 text-left overflow-auto max-h-32">
              {this.state.errorInfo}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3 bg-[#6157e8] hover:bg-[#5249d6] text-white rounded-xl font-bold text-sm transition-colors shadow-md"
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

// --- MAIN APP COMPONENT ---
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

  // Simple Entrance Flow States
  const [activeLoginTab, setActiveLoginTab] = useState(null); // 'SENCO' | 'TEAM_LEADER' | 'TEACHER' | 'TA'
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [verifyingGoogle, setVerifyingGoogle] = useState(false);

  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Dynamic Touch/Homescreen Icon Injection Effect
  useEffect(() => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="46" fill="#6157e8"/><g transform="translate(40, 40) scale(4.16)"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.8.8 2.1 1 2.96.47l2-1.23" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="m12 5 2.96 2.96a2.17 2.17 0 0 1 0 3.08v0c-.8.8-2.1 1-2.96.47l-2-1.23" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.43 13.43a2.17 2.17 0 0 1-3.06 0L9 12.04" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.57 13.43a2.17 2.17 0 0 0 3.06 0L15 12.04" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
    const svgBase64 = btoa(svgString);
    const iconUrl = `data:image/svg+xml;base64,${svgBase64}`;

    let appleTouchLink = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleTouchLink) {
      appleTouchLink = document.createElement('link');
      appleTouchLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouchLink);
    }
    appleTouchLink.href = iconUrl;

    let favIconLink = document.querySelector("link[rel='icon']");
    if (!favIconLink) {
      favIconLink = document.createElement('link');
      favIconLink.rel = 'icon';
      document.head.appendChild(favIconLink);
    }
    favIconLink.href = iconUrl;

    document.title = "Support Link";

    const manifestObj = {
      short_name: "Support Link",
      name: "Support Link - Halswell Hub",
      icons: [
        {
          src: iconUrl,
          sizes: "180x180",
          type: "image/svg+xml",
          purpose: "any maskable"
        }
      ],
      start_url: window.location.origin,
      background_color: "#ffffff",
      theme_color: "#6157e8",
      display: "standalone"
    };
    
    let manifestLink = document.querySelector("link[rel='manifest']");
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    const manifestBlob = new Blob([JSON.stringify(manifestObj)], {type: 'application/json'});
    manifestLink.href = URL.createObjectURL(manifestBlob);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('support_link_remember');
    if (saved !== null) {
      setRememberMe(saved === 'true');
    }
    
    const savedStaffProfile = localStorage.getItem('support_link_active_profile');
    if (savedStaffProfile && saved !== 'false') {
      try {
        const profile = JSON.parse(savedStaffProfile);
        setCurrentUser(profile);
      } catch (e) {
        console.error("Failed to restore saved profile", e);
      }
    }
  }, []);

  // 1. Initialize Authentication and track load status
  useEffect(() => {
    const initAuth = async () => {
      try {
        const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistenceType);

        // Standardize handling of redirect result logins (greatly prevents standalone blank-screen bugs)
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult && redirectResult.user) {
          const email = redirectResult.user.email?.toLowerCase();
          if (email) {
            // Fetch users snapshots directly to see if profile needs matching
            const usersSnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
            const fetchedUsersList = usersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            const matchedUser = fetchedUsersList.find(u => u.email.toLowerCase() === email);
            
            if (matchedUser) {
              handleSimpleSignIn(matchedUser);
            } else if (fetchedUsersList.length === 0) {
              // Auto initialize empty database with the redirect result user
              const newSencoProfile = {
                id: 'u' + Date.now(),
                name: redirectResult.user.displayName || 'School Admin',
                role: ROLES.SENCO,
                email: email
              };
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', newSencoProfile.id), newSencoProfile);
              handleSimpleSignIn(newSencoProfile);
            }
          }
        }

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
    });
    return () => unsubscribe();
  }, [rememberMe]);

  // 2. Sync Live Data & Check Authorization
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
      
      // Seed initial dummy users if database is fresh and completely empty
      if (fetchedUsers.length === 0) {
        INITIAL_USERS.forEach(u => setDoc(doc(usersRef, u.id), u));
        INITIAL_SESSIONS.forEach(s => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', s.id), s));
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

  // Database Write Methods
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
    if (rememberMe) {
      localStorage.setItem('support_link_active_profile', JSON.stringify(staffObj));
    }
    addToast(`Signed in as ${staffObj.name}`, 'success');
  };

  const handleGoogleVerification = async (expectedProfile) => {
    if (isSandbox) {
      // Sandbox bypass directly signs you in without popup blocker interruption
      handleSimpleSignIn(expectedProfile);
      return;
    }

    setVerifyingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user?.email?.toLowerCase();
      if (email && email === expectedProfile.email.toLowerCase()) {
        handleSimpleSignIn(expectedProfile);
      } else {
        await signOut(auth);
        addToast("Verification failed: Authenticated Google email does not match selected profile.", "error");
      }
    } catch (e) {
      console.error("Popup failed, trying redirect fallback:", e);
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        // Fallback transparently to Google redirect authentication inside standalone/iOS frames
        await signInWithRedirect(auth, provider);
      } else {
        addToast("Secure verification blocked or failed.", "error");
      }
    } finally {
      setVerifyingGoogle(false);
    }
  };

  const handleBypassSencoLogin = async () => {
    const existingSenco = users.find(u => u.role === ROLES.SENCO);
    
    if (isSandbox) {
      const sencoProfile = existingSenco || {
        id: 'mock-senco-id-preview',
        name: 'Sarah Admin (SENCO Preview)',
        role: ROLES.SENCO,
        email: 'senco@school.edu'
      };
      if (!existingSenco) {
        await addUserToDb(sencoProfile);
      }
      handleSimpleSignIn(sencoProfile);
      return;
    }

    // Live Website Google Auth with Auto-Register Support
    setVerifyingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user?.email?.toLowerCase();
      const displayName = result.user?.displayName || 'School Admin';
      
      if (!email) {
        throw new Error("No secure email received from Google account.");
      }

      if (existingSenco) {
        if (email === existingSenco.email.toLowerCase()) {
          handleSimpleSignIn(existingSenco);
        } else {
          await signOut(auth);
          addToast("Verification failed: This Google email is not the registered SENCO.", "error");
        }
      } else {
        const newSenco = {
          id: 'u' + Date.now(),
          name: displayName,
          role: ROLES.SENCO,
          email: email
        };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', newSenco.id), newSenco);
        handleSimpleSignIn(newSenco);
        addToast("Master SENCO profile successfully initialized with your Google Account!", "success");
      }
    } catch (e) {
      console.error("Popup failed, trying redirect fallback:", e);
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, provider);
      } else {
        addToast(e.message || "Google Sign-In failed.", "error");
      }
    } finally {
      setVerifyingGoogle(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setActiveLoginTab(null);
    setSelectedStaffId('');
    localStorage.removeItem('support_link_active_profile');
    addToast("Logged out of session.", "info");
  };

  const toggleRememberMe = (val) => {
    setRememberMe(val);
    localStorage.setItem('support_link_remember', val ? 'true' : 'false');
  };

  if (!authCompleted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center">
        <Loader2 className="w-12 h-12 text-[#6157e8] animate-spin mb-4" />
        <h2 className="text-[#1a1f36] font-bold text-lg">Connecting Securely...</h2>
      </div>
    );
  }

  // Render Login Panel
  if (!currentUser) {
    const listOptions = users.filter(u => {
      if (activeLoginTab === 'TEACHER') return u.role === ROLES.TEACHER;
      if (activeLoginTab === 'TA') return u.role === ROLES.TA;
      if (activeLoginTab === 'TEAM_LEADER') return u.role === ROLES.TEAM_LEADER;
      return false;
    });

    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center p-4 font-sans">
        <div className="flex flex-col items-center max-w-md w-full">
          <div className="bg-[#6157e8] p-4 rounded-[20px] shadow-sm mb-6">
            <HeartHandshake className="text-white w-10 h-10" strokeWidth={2} />
          </div>
          
          <h1 className="text-[36px] font-bold text-[#1a1f36] mb-3 tracking-tight">Support Link</h1>
          <p className="text-[11px] font-bold text-[#6157e8] tracking-[0.2em] mb-8 uppercase text-center">
            Halswell School TA Management Portal
          </p>

          <div className="w-full max-w-sm bg-white p-8 rounded-[24px] shadow-sm border border-slate-100 animate-fade-in flex flex-col items-stretch space-y-4">
            {activeLoginTab === null ? (
              <>
                <h3 className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Select Your Role</h3>
                
                <button 
                  onClick={handleBypassSencoLogin}
                  className="w-full py-3.5 px-4 bg-slate-50 border border-slate-200 text-[#1a1f36] text-sm font-bold rounded-xl hover:border-[#6157e8] hover:text-[#6157e8] hover:bg-violet-50/50 transition-all flex items-center justify-center space-x-3 shadow-sm"
                >
                  <User size={18} className="text-[#6157e8]" />
                  <span>Enter as SENCO</span>
                </button>

                <button 
                  onClick={() => { setActiveLoginTab('TEAM_LEADER'); setSelectedStaffId(users.filter(u => u.role === ROLES.TEAM_LEADER)[0]?.id || ''); }}
                  className="w-full py-3.5 px-4 bg-slate-50 border border-slate-200 text-[#1a1f36] text-sm font-bold rounded-xl hover:border-[#6157e8] hover:text-[#6157e8] hover:bg-violet-50/50 transition-all flex items-center justify-center space-x-3 shadow-sm"
                >
                  <Users size={18} className="text-[#6157e8]" />
                  <span>Enter as Team Leader</span>
                </button>
                
                <button 
                  onClick={() => { setActiveLoginTab('TEACHER'); setSelectedStaffId(users.filter(u => u.role === ROLES.TEACHER)[0]?.id || ''); }}
                  className="w-full py-3.5 px-4 bg-slate-50 border border-slate-200 text-[#1a1f36] text-sm font-bold rounded-xl hover:border-[#6157e8] hover:text-[#6157e8] hover:bg-violet-50/50 transition-all flex items-center justify-center space-x-3 shadow-sm"
                >
                  <Users size={18} className="text-[#6157e8]" />
                  <span>Enter as Teacher</span>
                </button>
                
                <button 
                  onClick={() => { setActiveLoginTab('TA'); setSelectedStaffId(users.filter(u => u.role === ROLES.TA)[0]?.id || ''); }}
                  className="w-full py-3.5 px-4 bg-slate-50 border border-slate-200 text-[#1a1f36] text-sm font-bold rounded-xl hover:border-[#6157e8] hover:text-[#6157e8] hover:bg-violet-50/50 transition-all flex items-center justify-center space-x-3 shadow-sm"
                >
                  <Star size={18} className="text-[#6157e8]" />
                  <span>Enter as Teacher Aide</span>
                </button>
              </>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <button 
                  onClick={() => setActiveLoginTab(null)}
                  className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
                >
                  <ChevronLeft size={16} className="mr-1" /> Back
                </button>

                <h3 className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Choose Your Name
                </h3>

                {listOptions.length > 0 ? (
                  <div className="space-y-4">
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-[#6157e8] outline-none font-bold text-[#1a1f36] text-sm bg-slate-50"
                    >
                      <option value="" disabled>-- Select Name --</option>
                      {listOptions.map(staff => (
                        <option key={staff.id} value={staff.id}>{staff.name}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        const matched = users.find(u => u.id === selectedStaffId);
                        if (matched) {
                          handleGoogleVerification(matched);
                        } else {
                          addToast("Please select a profile to continue.", "error");
                        }
                      }}
                      disabled={verifyingGoogle}
                      className="w-full py-3.5 bg-[#6157e8] text-white font-bold rounded-xl hover:bg-[#5249d6] transition-colors shadow-md text-sm flex items-center justify-center space-x-2"
                    >
                      {verifyingGoogle ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck size={18} />
                          <span>Verify & Sign In</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      No staff members are registered under this role yet. Please ask your SENCO to add your name in "Manage Staff".
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Remember Me Checkbox */}
            <div className="flex items-center pt-3 self-center">
              <input 
                id="remember_me_checkbox"
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => toggleRememberMe(e.target.checked)}
                className="w-4 h-4 text-[#6157e8] border-slate-300 rounded focus:ring-[#6157e8] cursor-pointer"
              />
              <label htmlFor="remember_me_checkbox" className="ml-2 text-xs font-bold text-slate-500 cursor-pointer uppercase tracking-wider select-none">
                Keep me signed in
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Database loading state (Syncing live cloud records)
  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center">
        <Loader2 className="w-12 h-12 text-[#6157e8] animate-spin mb-4" />
        <h2 className="text-[#1a1f36] font-bold text-lg">Syncing with Cloud...</h2>
        <p className="text-xs text-slate-400 mt-2">Retrieving Halswell School Live Data</p>
      </div>
    );
  }

  const safeUsers = users.length > 0 ? users : INITIAL_USERS;
  const safeSessions = sessions.length > 0 ? sessions : INITIAL_SESSIONS;
  const safeAbsences = absences;
  const activeUser = currentUser;

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
        {activeUser.role === ROLES.TEAM_LEADER && (
          <TeamLeaderDashboard user={activeUser} sessions={safeSessions} users={safeUsers} />
        )}
        {activeUser.role === ROLES.TEACHER && (
          <TeacherDashboard user={activeUser} sessions={safeSessions} users={safeUsers} />
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

      {showMobileSync && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-sm w-full p-8 animate-fade-in text-center">
            <div className="w-12 h-12 bg-[#f0efff] text-[#6157e8] rounded-full flex items-center justify-center mb-4 mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#1a1f36] mb-2">Sync with Your Phone</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Scan this QR code with your mobile camera to take your Support Link timetable on the go!
            </p>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 inline-block mb-6 shadow-md">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://halswell-support-link.vercel.app')}`} 
                alt="Live QR Code" 
                className="w-44 h-44 mx-auto block"
              />
            </div>
            
            <div className="text-xs text-slate-400 font-semibold mb-6">
              https://halswell-support-link.vercel.app
            </div>

            <button 
              onClick={() => setShowMobileSync(false)}
              className="w-full py-3 bg-[#1a1f36] hover:bg-black text-white rounded-xl font-bold text-sm transition-colors shadow-md"
            >
              Done
            </button>
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
    addToast(`Absence reported to SENCO.`, 'success');
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
          <p className="text-sm text-slate-600 mb-4">Please provide a reason so the SENCO can arrange coverage.</p>
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
  
  // Duplication Tool States
  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [copyScope, setCopyScope] = useState('specific-staff'); 
  const [copySelectedTaId, setCopySelectedTaId] = useState('');
  const [copyTargetDays, setCopyTargetDays] = useState({
    Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false
  });
  const [copyOverwrite, setCopyOverwrite] = useState(true);

  const pendingAbsences = absences.filter(a => a.status === 'Pending');
  const tas = users.filter(u => u.role === ROLES.TA);

  useEffect(() => {
    if (tas.length > 0 && !copySelectedTaId) {
      setCopySelectedTaId(tas[0].id);
    }
  }, [tas, copySelectedTaId]);

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
    addToast('Coverage Approved!');
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
          ? (users.find(u => u.id === copySelectedTaId)?.name || 'the selected TA')
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
      addToast(`Duplicate failed.`, "error");
    }
  };

  return (
    <div className="space-y-8 pb-12">
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

      {resolvingAbsence && (
        <CoverageResolver 
          absence={resolvingAbsence} 
          users={users}
          sessions={sessions} 
          onClose={() => setResolvingAbsence(null)}
          onResolve={(assignments) => handleApplyCoverage(assignments, resolvingAbsence)}
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
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none font-medium text-[#1a1f36] text-sm bg-slate-50"
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
                  <span className="font-semibold text-sm text-[#1a1f36]">{day} {day === selectedDay && "(Selected)"}</span>
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
                className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-sm transition-colors"
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
            <h3 className="text-2xl font-bold text-[#1a1f36] mb-6">
              {editingCell.session ? 'Edit Duty' : 'Assign Duty'}
            </h3>
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
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Supporting Team Leader</label>
                <select name="teamLeaderId" defaultValue={editingCell.session?.teamLeaderId || ''} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] outline-none">
                  <option value="">None / No Team Leader</option>
                  {users.filter(u => u.role === ROLES.TEAM_LEADER).map(tl => (
                    <option key={tl.id} value={tl.id}>{tl.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                {editingCell.session && (
                  <button type="button" onClick={handleDeleteSession} className="px-5 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors mr-auto flex items-center">
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </button>
                )}
                <button type="button" onClick={() => setEditingCell(null)} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-[#1a1f36] text-white font-bold hover:bg-black rounded-xl transition-colors shadow-md text-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageStaff && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-fade-in max-h-[90vh] flex flex-col">
            <h3 className="text-2xl font-bold text-[#1a1f36] mb-6">Manage Staff</h3>
            
            <div className="flex-1 overflow-y-auto pr-2 mb-6 space-y-2 border-b border-slate-100 pb-4">
              {users.map(u => (
                <div key={u.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <div className="font-bold text-[#1a1f36] text-sm">{u.name}</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{u.role}</div>
                  </div>
                  {u.id !== currentUser.id && (
                    <button onClick={() => handleDeleteStaff(u.id, u.name)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-[#1a1f36] text-sm">Add New Staff</h4>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Staff Full Name</label>
                <input 
                  type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] focus:border-[#6157e8] outline-none mb-3"
                  placeholder="e.g. Val Murray"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Google Email Address</label>
                <input 
                  type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] focus:border-[#6157e8] outline-none mb-3"
                  placeholder="e.g. val.murray@school.nz"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role / Access Level</label>
                <select 
                  value={newStaffRole} 
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-[#6157e8] focus:border-[#6157e8] outline-none"
                >
                  <option value={ROLES.TA}>Teacher Aide (TA)</option>
                  <option value={ROLES.TEACHER}>Teacher</option>
                  <option value={ROLES.TEAM_LEADER}>Team Leader</option>
                  <option value={ROLES.SENCO}>SENCO (Admin)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setShowManageStaff(false)} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-sm transition-colors">
                  Done
                </button>
                <button onClick={handleAddStaff} className="px-6 py-3 bg-[#6157e8] text-white font-bold hover:bg-[#5249d6] rounded-xl transition-colors shadow-md text-sm">
                  Add Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[28px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#1a1f36] flex items-center">
              Master Timetable
            </h2>
            <p className="text-[11px] font-bold text-[#6157e8] tracking-[0.15em] uppercase mt-1">Live Database Connected</p>
          </div>
          
          <div className="flex items-center space-x-3 w-full sm:w-auto flex-wrap gap-y-3">
            {/* Soft Green Copy Day Schedule Button (No Bold Text) */}
            <button 
              onClick={() => setShowCopyDayModal(true)}
              className="flex items-center px-4 py-2.5 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#059669] font-medium text-sm rounded-xl transition-colors shadow-sm border border-[#a7f3d0]"
            >
              <Copy className="w-4 h-4 mr-1.5" /> 
              <span>Copy Schedule</span>
            </button>
            <button 
              onClick={() => setShowManageStaff(true)}
              className="flex items-center px-4 py-2.5 bg-[#f0efff] text-[#6157e8] font-medium text-sm rounded-xl hover:bg-[#e0dfff] transition-colors border border-slate-100"
            >
              <Users className="w-4 h-4 mr-1.5" strokeWidth={3} /> Manage Staff
            </button>
            <select 
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-[#1a1f36] font-semibold rounded-xl focus:ring-[#6157e8] focus:border-[#6157e8] block px-4 py-2.5 outline-none flex-1 sm:flex-none"
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
            onCellClick={(timeSlotId, taId, session) => setEditingCell({timeSlotId, taId, session})} 
          />
        </div>
      </div>
    </div>
  );
}

// --- TEAM LEADER DASHBOARD ---
function TeamLeaderDashboard({ user, sessions, users }) {
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Filter sessions where this Team Leader is explicitly assigned
  const teamSessions = sessions.filter(s => s.day === selectedDay && s.teamLeaderId === user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[24px] border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1f36]">{user.name} Dashboard</h2>
          <p className="text-xs font-semibold text-[#6157e8] uppercase mt-1 tracking-wider">Team Leader View</p>
        </div>
        <select 
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="bg-white border border-slate-200 text-[#1a1f36] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-[#6157e8]"
        >
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-md">Your Assigned Team Schedules</h3>
          <p className="text-xs text-slate-400 mt-1">Showing only duties where you are designated as Supporting Team Leader</p>
        </div>
        <div className="p-0">
          <TimetableGrid sessions={teamSessions} day={selectedDay} users={users} isEditable={false} />
        </div>
      </div>
    </div>
  );
}

// --- TEACHER DASHBOARD ---
function TeacherDashboard({ user, sessions, users }) {
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Teachers only see timetables where they are assigned as the teacher
  const teacherSessions = sessions.filter(s => s.day === selectedDay && s.teacherId === user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[24px] border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1f36]">{user.name} Dashboard</h2>
          <p className="text-xs font-semibold text-[#6157e8] uppercase mt-1 tracking-wider">Teacher View</p>
        </div>
        <select 
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="bg-white border border-slate-200 text-[#1a1f36] font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-[#6157e8]"
        >
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-md">Your Supporting TAs</h3>
          <p className="text-xs text-slate-400 mt-1">Showing only duties where you are designated as Supporting Teacher</p>
        </div>
        <div className="p-0">
          <TimetableGrid sessions={teacherSessions} day={selectedDay} users={users} isEditable={false} />
        </div>
      </div>
    </div>
  );
}

// --- SHARED TIMETABLE GRID COMPONENT ---
function TimetableGrid({ sessions, day, users, isEditable, onCellClick }) {
  const tas = users.filter(u => u.role === ROLES.TA);
  
  return (
    <div className="relative max-h-[75vh] overflow-auto">
      <table className="w-full text-left border-collapse min-w-max">
        <thead>
          <tr>
            <th className="p-4 bg-white text-slate-400 font-medium text-xs uppercase tracking-wider w-32 sticky top-0 left-0 z-30 shadow-[inset_0_-2px_0_#f1f5f9,inset_-2px_0_0_#f1f5f9]">Time</th>
            {tas.map(ta => (
              <th key={ta.id} className="p-4 bg-white text-[#1a1f36] font-medium text-sm min-w-[150px] sticky top-0 z-20 shadow-[inset_0_-2px_0_#f1f5f9]">
                {ta.name}
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
                  >
                    {isEditable && (
                       <div className="absolute inset-2 bg-[#6157e8]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center z-10 pointer-events-none">
                          <Edit3 className="text-[#6157e8] w-5 h-5" />
                       </div>
                    )}
                    {session ? (
                      <div className={`border ${style.wrapper} rounded-xl p-3 h-full flex flex-col justify-center min-h-[80px] group-hover:border-[#6157e8]/30 transition-colors`}>
                        <span className={`text-[9px] font-medium tracking-wider uppercase mb-1 ${style.text}`}>{session.tier}</span>
                        <div className="font-medium text-slate-800 text-sm leading-tight">{session.subject}</div>
                        
                        {/* Display assigned staff on the cell */}
                        {(session.teacherId || session.teamLeaderId) && (
                          <div className="mt-2 pt-1 border-t border-slate-100 flex flex-wrap gap-1 text-[9px] text-slate-400 font-semibold">
                            {session.teacherId && (
                              <span className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                                T: {users.find(u => u.id === session.teacherId)?.name}
                              </span>
                            )}
                            {session.teamLeaderId && (
                              <span className="bg-purple-50 px-1 py-0.5 rounded text-purple-600">
                                L: {users.find(u => u.id === session.teamLeaderId)?.name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50/50 rounded-xl p-3 h-full border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs font-medium min-h-[80px] group-hover:border-[#6157e8]/50 group-hover:bg-[#f0efff]/50 transition-colors">
                        Free
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
  );
}

// --- ABSENCE RESOLVER COMPONENT ---
function CoverageResolver({ absence, users, sessions, onClose, onResolve }) {
  const absentTa = users.find(u => u.id === absence.taId);
  const absentSessions = sessions.filter(s => s.day === absence.day && s.taId === absence.taId);
  const otherTas = users.filter(u => u.role === ROLES.TA && u.id !== absence.taId);
  
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    const initial = {};
    absentSessions.forEach(s => {
      initial[s.id] = '';
    });
    setAssignments(initial);
  }, [sessions, absence]);

  return (
    <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full p-8 animate-fade-in max-h-[85vh] flex flex-col">
        <h3 className="text-2xl font-bold text-[#1a1f36] mb-2">Coverage: {absentTa?.name}</h3>
        {/* Changed SVG group tag to semantic paragraph element to prevent rendering engine block */}
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
                    <span>{session.tier}</span>
                  </div>
                  <div className="font-bold text-[#1a1f36] text-sm">{session.subject}</div>
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
          <button onClick={onClose} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-sm transition-colors">
            Cancel
          </button>
          <button onClick={() => onResolve(assignments)} className="px-6 py-3 bg-[#1a1f36] text-white font-bold hover:bg-black rounded-xl text-sm transition-colors shadow-md">
            Approve Coverage
          </button>
        </div>
      </div>
    </div>
  );
}
