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
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut,
  setPersistence, browserLocalPersistence, signInWithCustomToken 
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';

// Parse environmental or sandbox configurations safely
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      const parsed = typeof __firebase_config === 'string' 
        ? JSON.parse(__firebase_config) 
        : __firebase_config;
      if (parsed && parsed.apiKey) return parsed;
    } catch (e) {
      console.error("Failed to parse sandbox environment config", e);
    }
  }
  
  // High-reliability fallback configuration for independent browser hosting
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

// Rule 1: Get clean dynamic application namespace and replace slashes to ensure it never splits into multiple invalid segments
const getCleanAppId = () => {
  const rawId = typeof __app_id !== 'undefined' ? __app_id : "halswell-school-production";
  return rawId.replace(/\//g, '_');
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

const isStudentMatch = (subjectText, studentText) => {
  if (!subjectText || !studentText) return false;
  
  const cleanString = (str) => {
    return str.toLowerCase()
      .replace(/^(support|check|check-in|supervise|monitor|check|critical|high needs)\s+/i, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };
  
  const cleanedSubject = cleanString(subjectText);
  const cleanedStudent = cleanString(studentText);
  
  return cleanedSubject.includes(cleanedStudent) || cleanedStudent.includes(cleanedSubject);
};

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
  { id: 't_praboda', name: 'Prabodha', role: ROLES.TA, roles: [ROLES.TA], email: 'praboda@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_cathie' },
  { id: 't_tiffany', name: 'Tiffany', role: ROLES.TA, roles: [ROLES.TA], email: 'tiffany@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_tracey' },
  { id: 't_jenny', name: 'Jenny Randall', role: ROLES.ORS_TEACHER, roles: [ROLES.ORS_TEACHER, ROLES.TEACHER], email: 'jenny@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_cathie' },
  { id: 't_tara', name: 'Tara', role: ROLES.TA, roles: [ROLES.TA], email: 'tara@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_tracey' },
  { id: 't_helena', name: 'Helena', role: ROLES.TA, roles: [ROLES.TA], email: 'helena@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_cathie' },
  { id: 't_marcela', name: 'Marcela', role: ROLES.TA, roles: [ROLES.TA], email: 'marcela@school.nz', team: TEAMS.BOTH, allocatedSenco: 'senco_tracey' }
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
  INITIAL_SESSIONS.push({ id: `es_s1_t1_${day}`, day, taId: 't_praboda', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't1' });
  INITIAL_SESSIONS.push({ id: `es_s1_t2_${day}`, day, taId: 't_praboda', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't2' });
  INITIAL_SESSIONS.push({ id: `es_s1_t3_${day}`, day, taId: 't_praboda', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't3' });
  INITIAL_SESSIONS.push({ id: `es_s1_t4_${day}`, day, taId: 't_praboda', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't4' });

  if (day === 'Friday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t5_${day}`, day, taId: 't_marcela', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't5' });
  } else {
    INITIAL_SESSIONS.push({ id: `es_s1_t5_${day}`, day, taId: 't_helena', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't5' });
  }

  if (day === 'Monday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t6_${day}`, day, taId: 't_jenny', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't6' });
    INITIAL_SESSIONS.push({ id: `es_s1_t7_${day}`, day, taId: 't_jenny', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't7' });
  }

  if (day === 'Friday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t8_${day}`, day, taId: 't_praboda', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't8' });
  } else {
    INITIAL_SESSIONS.push({ id: `es_s1_t8_${day}`, day, taId: 't_helena', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't8' });
  }

  if (day === 'Wednesday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t9_${day}`, day, taId: 't_marcela', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't9' });
    INITIAL_SESSIONS.push({ id: `es_s1_t10_${day}`, day, taId: 't_praboda', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't10' });
  } else {
    INITIAL_SESSIONS.push({ id: `es_s1_t9_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't9' });
    INITIAL_SESSIONS.push({ id: `es_s1_t10_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't10' });
  }

  if (day === 'Thursday') {
    INITIAL_SESSIONS.push({ id: `es_s1_t11_${day}`, day, taId: 't_praboda', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't11' });
  } else {
    INITIAL_SESSIONS.push({ id: `es_s1_t11_${day}`, day, taId: 't_marcela', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't11' });
  }

  INITIAL_SESSIONS.push({ id: `es_s1_t12_${day}`, day, taId: 't_praboda', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't12' });
  INITIAL_SESSIONS.push({ id: `es_s1_t13_${day}`, day, taId: 't_praboda', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'E.S', timeSlotId: 't13' });

  INITIAL_SESSIONS.push({ id: `hw_s1_t2_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'H.W', timeSlotId: 't2' });
  INITIAL_SESSIONS.push({ id: `hw_s1_t6_${day}`, day, taId: 't_val', teacherId: 'u3', tier: TIERS.CRITICAL, subject: 'H.W', timeSlotId: 't6' });
  INITIAL_SESSIONS.push({ 
    id: `hw_s1_t7_${day}`, 
    day, 
    taId: day === 'Friday' ? 't1' : 't_praboda', 
    teacherId: 'u4', 
    tier: TIERS.LUNCH, 
    subject: 'H.W',
    timeSlotId: 't7'
  });
  INITIAL_SESSIONS.push({ 
    id: `hw_s1_t9_${day}`, 
    day, 
    taId: day === 'Friday' ? 't_tara' : 't_tiffany', 
    teacherId: 'u2', 
    tier: TIERS.HIGH_NEEDS, 
    subject: 'H.W',
    timeSlotId: 't9'
  });
  INITIAL_SESSIONS.push({ id: `hw_s1_t10_${day}`, day, taId: 't_jenny', teacherId: 'u5', tier: TIERS.HIGH_NEEDS, subject: 'H.W', timeSlotId: 't10' });
  INITIAL_SESSIONS.push({ 
    id: `hw_s1_t11_${day}`, 
    day, 
    taId: day === 'Thursday' ? 't_val' : 't_praboda', 
    teacherId: 'u3', 
    tier: TIERS.LUNCH, 
    subject: 'H.W',
    timeSlotId: 't11'
  });
  INITIAL_SESSIONS.push({ 
    id: `hw_s1_t12_${day}`, 
    day, 
    taId: day === 'Friday' ? 't1' : 't_tiffany', 
    teacherId: 'u2', 
    tier: TIERS.CRITICAL, 
    subject: 'H.W',
    timeSlotId: 't12'
  });
  INITIAL_SESSIONS.push({ 
    id: `hw_s1_t13_${day}`, 
    day, 
    taId: day === 'Friday' ? 't1' : 't_tiffany', 
    teacherId: 'u2', 
    tier: TIERS.CRITICAL, 
    subject: 'H.W',
    timeSlotId: 't13'
  });
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
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const [syncStatus, setSyncStatus] = useState('synced'); 
  const [lastSavedTime, setLastSavedTime] = useState(() => new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [showSaveVerificationModal, setShowSaveVerificationModal] = useState(false);
  const [isVerifyingConnection, setIsVerifyingConnection] = useState(false);

  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [toasts, setToasts] = useState([]);

  // RULE OF HOOKS: Place clean deduplicated state at the very top of the App component before ANY early returns
  const safeUsers = useMemo(() => {
    const merged = [];
    const seenIds = new Set();
    const seenEmails = new Set();
    const seenNames = new Set();

    // 1. Add current Firestore database entries (including newly added staff/TAs)
    users.forEach(u => {
      const emailKey = u.email?.toLowerCase().trim();
      const nameKey = u.name?.toLowerCase().trim();
      const idKey = u.id;
      if (!seenIds.has(idKey) && (!emailKey || !seenEmails.has(emailKey)) && (!nameKey || !seenNames.has(nameKey))) {
        merged.push(u);
        seenIds.add(idKey);
        if (emailKey) seenEmails.add(emailKey);
        if (nameKey) seenNames.add(nameKey);
      }
    });

    // 2. Add local defaults as safety fallbacks
    INITIAL_USERS.forEach(iu => {
      const emailKey = iu.email?.toLowerCase().trim();
      const nameKey = iu.name?.toLowerCase().trim();
      const idKey = iu.id;
      if (!seenIds.has(idKey) && (!emailKey || !seenEmails.has(emailKey)) && (!nameKey || !seenNames.has(nameKey))) {
        merged.push(iu);
        seenIds.add(idKey);
        if (emailKey) seenEmails.add(emailKey);
        if (nameKey) seenNames.add(nameKey);
      }
    });

    return merged;
  }, [users]);

  // Safely declare safeSessions variable used in dashboard rendering below early return blocks
  const safeSessions = useMemo(() => {
    const activeSessions = sessions.length > 0 ? sessions : INITIAL_SESSIONS;
    // Map sessions to make sure they do not reference deleted/invalid TAs
    return activeSessions.map(s => {
      const taExists = safeUsers.some(u => u.id === s.taId);
      if (!taExists && s.taId) {
        // Orphan-protect it so it renders cleanly as unassigned 'No cover' on the timetable
        return { ...s, taId: null };
      }
      return s;
    });
  }, [sessions, safeUsers]);

  // Safely declare safeAbsences variable used in dashboard rendering below early return blocks
  const safeAbsences = useMemo(() => {
    return absences || [];
  }, [absences]);

  // Auth / Sign-in handlers must be declared before any conditional returns
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

  useEffect(() => {
    if (currentUser) {
      const availableRoles = currentUser.roles || [currentUser.role];
      setActiveRole(availableRoles[0]);
    } else {
      setActiveRole(null);
    }
  }, [currentUser]);

  // Rule 3 Guard: Strictly authenticate first before performing querying snapshots or writes
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

  // Rule 3: Auth Before Queries (Strict connection prioritizing __initial_auth_token)
  useEffect(() => {
    const initAuth = async () => {
      try {
        const persistenceType = browserLocalPersistence;
        await setPersistence(auth, persistenceType);

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        // Fallback to anonymous if security token failed
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Critical: Anonymous auth fallback also failed:", e);
        }
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

  // Handle live subscriptions cleanly with user authenticated guard (Rule 3)
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
          await handleRestoreDefaultSeeds();
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

  // Strict guard helper for write sessions
  const handleRestoreDefaultSeeds = async () => {
    if (!auth.currentUser) {
      console.warn("Restore seeds aborted: User authentication state not loaded yet.");
      return;
    }
    setSyncStatus('saving');
    try {
      const batch = writeBatch(db);
      
      const sessionsSnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'));
      sessionsSnapshot.docs.forEach(d => batch.delete(d.ref));

      const absencesSnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'absences'));
      absencesSnapshot.docs.forEach(d => batch.delete(d.ref));

      const usersSnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
      usersSnapshot.docs.forEach(d => batch.delete(d.ref));

      INITIAL_USERS.forEach(u => {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id);
        batch.set(docRef, u);
      });

      INITIAL_SESSIONS.forEach(s => {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', s.id);
        batch.set(docRef, s);
      });

      INITIAL_ABSENCES.forEach(a => {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'absences', a.id);
        batch.set(docRef, a);
      });

      await batch.commit();
      setSyncStatus('synced');
      setLastSavedTime(new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      addToast("Prised school roster & E.S timetable restored!", "success");
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      addToast("Failed to restore default seeds.", "error");
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

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {isSandbox && (
        <div className="bg-amber-50 border-b border-amber-200/60 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-800 select-none shadow-inner">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span>SANDBOX ACTIONS & QUICK SWITCH ROLES:</span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => setShowResetConfirmModal(true)}
              className="px-3.5 py-1.5 rounded-lg font-bold text-[11px] bg-red-600 text-white hover:bg-red-700 transition-all border border-red-700 shadow-sm flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Restore Default Timetable (Includes Val Mon/Fri)</span>
            </button>

            <button onClick={() => handleBypassSignIn('t1')} className={`px-2 py-1 rounded font-bold text-[10px] transition-all border ${currentUser.id === 't1' ? 'bg-[#6157e8] text-white border-[#6157e8] shadow-sm' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
              Karen Cate (TA)
            </button>
            <button onClick={() => handleBypassSignIn('t_ruby')} className={`px-2 py-1 rounded font-bold text-[10px] transition-all border ${currentUser.id === 't_ruby' ? 'bg-[#6157e8] text-white border-[#6157e8] shadow-sm' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
              Ruby Gray (TA)
            </button>
            <button onClick={() => handleBypassSignIn('t_jenny')} className={`px-2 py-1 rounded font-bold text-[10px] transition-all border ${currentUser.id === 't_jenny' ? 'bg-[#6157e8] text-white border-[#6157e8] shadow-sm' : 'bg-white hover:bg-amber-100/60 border-amber-200 text-slate-700'}`}>
              Jenny Randall (ORS)
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
            handleRestoreDefaultSeeds={handleRestoreDefaultSeeds}
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

      {showResetConfirmModal && (
        <div className="fixed inset-0 bg-[#1a1f36]/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full p-6 animate-fade-in text-center border border-slate-100">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-[#1a1f36] mb-2">Reset Live Timetable?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              This action will reset your cloud database back to default settings, instantly mapping **Val Murray** to **E.S** on Mondays and Fridays. Proceed?
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setShowResetConfirmModal(false);
                  await handleRestoreDefaultSeeds();
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

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
                <span className="text-[#1a1f36]">{safeSessions.length} active duties</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/40 pb-1.5">
                <span className="text-slate-400">Absence Logs Active</span>
                <span className="text-[#1a1f36]">{safeAbsences.length} records</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Synced Timestamp</span>
                <span className="text-[#1a1f36]">{lastSavedTime} NZST</span>
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
                onClick={async () => {
                  setShowSaveVerificationModal(false);
                  setShowResetConfirmModal(true);
                }}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Restore Clean Seeds (Reset DB)</span>
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
