import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken,
  signInAnonymously, 
  onAuthStateChanged, 
  signOut
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { 
  Users, HeartHandshake, ChevronRight, Edit3, X, Save, 
  AlertTriangle, RefreshCw, Database, 
  Coffee, Utensils, CheckCircle2, CalendarX, Star, User,
  UserPlus, Loader2, Trash2, AlertCircle, Copy, Check,
  Smartphone, QrCode, Settings, Link, LogOut, Send, HelpCircle, ShieldCheck, Award
} from 'lucide-react';

let app, auth, db;
try {
  const configSource = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
  const firebaseConfig = JSON.parse(configSource);
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase configuration not fully initialized yet:", e.message);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'halswell-primary-ta-hub-v1';
const MASTER_ADMINS = ['tracey.mora@halswell.school.nz'];
const ROLES = { ADMIN: 'admin', TEACHER: 'teacher', TA: 'ta' }; // ADMIN mapped visually to SENCO

const PRODUCTION_URL = 'https://halswell-support-link.vercel.app/';

const TIME_SLOTS = [
  "9:00 - 9:30", "9:30 - 10:00", "10:00 - 10:30", "10:30 - 10:50",
  "10:50 - 11:10", "11:10 - 11:30", "11:30 - 12:00", "12:00 - 12:30",
  "12:30 - 1:00", "1:00 - 1:30", "1:30 - 2:00", "2:00 - 2:30", "2:30 - 3:00"
];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const PRIORITY_LEVELS = {
  CRITICAL: { id: 1, label: 'Critical', color: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50/30', border: 'border-rose-100/50', iconName: 'alert' },
  HIGH_NEEDS: { id: 2, label: 'High Needs', color: 'bg-orange-400', text: 'text-orange-600', bg: 'bg-orange-50/30', border: 'border-orange-100/50', iconName: 'user' },
  ENRICHMENT: { id: 3, label: 'Enrichment', color: 'bg-blue-400', text: 'text-blue-600', bg: 'bg-blue-50/30', border: 'border-blue-100/50', iconName: 'star' },
  MORNING_TEA: { id: 4, label: 'Morning Tea', color: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50/30', border: 'border-amber-100/50', iconName: 'coffee' },
  LUNCH: { id: 5, label: 'Lunch', color: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50/30', border: 'border-amber-100/50', iconName: 'utensils' },
  NOT_WORKING: { id: 6, label: 'Not Working', color: 'bg-slate-300', text: 'text-slate-400', bg: 'bg-slate-50/30', border: 'border-slate-100/50', iconName: 'x' }
};

const PriorityIcon = ({ iconName, className = "w-4 h-4" }) => {
  switch (iconName) {
    case 'alert': return <AlertTriangle className={className} />;
    case 'user': return <User className={className} />;
    case 'star': return <Star className={className} />;
    case 'coffee': return <Coffee className={className} />;
    case 'utensils': return <Utensils className={className} />;
    case 'x': return <X className={className} />;
    default: return <Users className={className} />;
  }
};

const generateEmptySchedule = () => {
  const fullSched = {};
  DAYS.forEach(day => {
    fullSched[day] = {};
    TIME_SLOTS.forEach(time => {
      let initialTask = 'General Support';
      let initialPriority = 3;
      if (time === "10:30 - 10:50") { initialTask = "Morning Tea"; initialPriority = 4; } 
      else if (time === "12:30 - 1:00" || time === "1:00 - 1:30") { initialTask = "Lunch"; initialPriority = 5; }
      fullSched[day][time] = { task: initialTask, priority: initialPriority };
    });
  });
  return fullSched;
};

const generateKarenDefaultSchedule = () => {
  const sched = {};
  DAYS.forEach(day => {
    sched[day] = {};
    TIME_SLOTS.forEach(time => {
      let task = 'General Support';
      let priority = 3;

      if (time === "9:00 - 9:30" || time === "9:30 - 10:00" || time === "10:00 - 10:30") {
        task = "Ōtawhito/Check Karlee";
        priority = 1; // Critical
      } else if (time === "10:30 - 10:50") {
        task = "Morning Tea";
        priority = 4; // Break
      } else if (time === "10:50 - 11:10") {
        task = "Casey";
        priority = 3; // Enrichment
      } else if (time === "11:10 - 11:30" || time === "11:30 - 12:00") {
        task = "Ōtawhito - Sam C/Check Karlee";
        priority = 1; // Critical
      } else if (time === "12:00 - 12:30") {
        if (day === "Friday") {
          task = "Harry";
          priority = 3;
        } else {
          task = "Casey";
          priority = 3;
        }
      } else if (time === "12:30 - 1:00" || time === "1:00 - 1:30") {
        task = "Lunch";
        priority = 5; // Break
      } else if (time === "1:30 - 2:00") {
        task = "Casey";
        priority = 3;
      } else if (time === "2:00 - 2:30") {
        if (day === "Friday") {
          task = "Harry";
          priority = 3;
        } else {
          task = "Ōtawhito";
          priority = 1;
        }
      } else if (time === "2:30 - 3:00") {
        if (day === "Friday") {
          task = "Harry";
          priority = 3;
        } else {
          task = "Ōtawhito";
          priority = 1;
        }
      }
      sched[day][time] = { task, priority };
    });
  });
  return sched;
};

export default function App() {
  const [googleUser, setGoogleUser] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [appUser, setAppUser] = useState(null); 
  const [view, setView] = useState('login');
  const [tas, setTas] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [resolvedAbsences, setResolvedAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState("Monday");
  const [selectedTAId, setSelectedTAId] = useState(null);
  const [dataReady, setDataReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); 
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showShareHelp, setShowShareHelp] = useState(false);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [newStaffData, setNewStaffData] = useState({ name: '', email: '', role: ROLES.TA });
  const [isSyncing, setIsSyncing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [customLink, setCustomLink] = useState('');
  
  const [showGoogleMockSelector, setShowGoogleMockSelector] = useState(false);
  const [manualGoogleEmail, setManualGoogleEmail] = useState('');

  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [copyTargetDays, setCopyTargetDays] = useState([]);

  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [selectedAbsentTA, setSelectedAbsentTA] = useState(null);
  const [coveragePlan, setCoveragePlan] = useState({}); 
  
  const blockUpdates = useRef(false);
  const isInitializing = useRef(false);
  
  const getMasterDocRef = () => {
    if (!db) return null;
    return doc(db, 'artifacts', appId, 'public', 'data', 'collections', 'master_record');
  };

  const hubUrl = useMemo(() => customLink || PRODUCTION_URL, [customLink]);

  const qrImageUrl = useMemo(() => {
    const encodedUrl = encodeURIComponent(hubUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodedUrl}&ecc=H&margin=2`;
  }, [hubUrl]);

  useEffect(() => {
    if (!auth) {
      setAuthInitialized(true);
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { 
        console.error("Auth initialization error:", e); 
      } finally {
        setAuthInitialized(true);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (userCred) => {
      if (!userCred) {
        setGoogleUser(null);
        setAppUser(null);
        setView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!dataReady || !googleUser) return;
    
    const email = googleUser.email.toLowerCase();
    let staff = directory.find(s => s.email.toLowerCase() === email);

    if (!staff && MASTER_ADMINS.includes(email)) {
      staff = { email, role: ROLES.ADMIN, name: googleUser.displayName || 'Tracey Mora' };
      syncToFirebase([...directory, staff], tas, customLink, resolvedAbsences);
    }

    if (staff) {
      setAppUser(staff);
      if (staff.role === ROLES.TA) {
        const taMatch = tas.find(t => t.email.toLowerCase() === email);
        if (taMatch) {
          setSelectedTAId(taMatch.id);
          setView('schedule');
        } else {
          setView('schedule');
        }
      } else {
        setView('dashboard');
      }
    } else {
      setSaveStatus('error-unauthorized');
    }
  }, [googleUser, directory, dataReady]);

  useEffect(() => {
    if (!authInitialized) return;

    const docRef = getMasterDocRef();
    if (!docRef) {
      setIsOnline(false);
      setLoading(false);
      setDataReady(true);
      return;
    }

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (blockUpdates.current || isEditingSchedule) return;
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        if (data.tas && data.tas.length > 0) {
          setTas(data.tas);
        }
        if (data.directory && data.directory.length > 0) {
          setDirectory(data.directory);
        }
        setResolvedAbsences(data.resolvedAbsences || []);
        setCustomLink(data.customLink || '');
        setDataReady(true);
        setLoading(false);
        setIsOnline(true);
      } else if (!isInitializing.current) {
        isInitializing.current = true;
        initializeMasterRecord(docRef);
      }
    }, (error) => {
      console.error("Snapshot error:", error);
      setIsOnline(false);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [authInitialized, isEditingSchedule]);

  useEffect(() => {
    if (appUser && appUser.role === ROLES.TA && dataReady) {
      const taMatch = tas.find(t => t.email.toLowerCase() === appUser.email.toLowerCase());
      if (taMatch) {
        setSelectedTAId(taMatch.id);
        setView('schedule');
      }
    }
  }, [appUser, tas, dataReady]);

  const initializeMasterRecord = async (docRef) => {
    if (!docRef) return;
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        isInitializing.current = false;
        return;
      }
    } catch (e) {
      console.error("Master check error:", e);
    }

    const initialData = { 
      tas: [
        { id: 'ta-karen-cate', name: 'Karen Cate', email: 'karen.cate@halswell.school.nz', status: 'active', schedule: generateKarenDefaultSchedule() }
      ], 
      directory: [
        { email: 'tracey.mora@halswell.school.nz', role: ROLES.ADMIN, name: 'Tracey Mora' },
        { email: 'karen.cate@halswell.school.nz', role: ROLES.TA, name: 'Karen Cate' },
        { email: 'melissa.botha@halswell.school.nz', role: ROLES.TEACHER, name: 'Melissa Botha' }
      ],
      resolvedAbsences: [],
      customLink: PRODUCTION_URL,
      isInitialized: true,
      lastUpdated: new Date().toISOString()
    };
    try { 
      await setDoc(docRef, initialData); 
      setDataReady(true);
      setTas(initialData.tas);
      setDirectory(initialData.directory);
      setResolvedAbsences([]);
    } 
    catch (err) { console.error("Init Error:", err); } 
    finally { 
      isInitializing.current = false; 
      setLoading(false);
    }
  };

  const syncToFirebase = async (currentDirectory, currentTas, link = customLink, currentArchive = resolvedAbsences) => {
    if (!dataReady) return;
    const docRef = getMasterDocRef();
    if (!docRef) return;
    blockUpdates.current = true;
    setIsSyncing(true);
    setSaveStatus('saving');
    try {
      const payload = { 
        directory: currentDirectory,
        tas: currentTas,
        resolvedAbsences: currentArchive,
        customLink: link || PRODUCTION_URL,
        isInitialized: true,
        lastUpdated: new Date().toISOString() 
      };
      await setDoc(docRef, payload);
      setSaveStatus('success');
      setTimeout(() => {
        blockUpdates.current = false;
        setSaveStatus(null);
        setIsSyncing(false);
      }, 2000); 
    } catch (err) { 
      setSaveStatus('error');
      blockUpdates.current = false;
      setIsSyncing(false);
    }
  };

  const handleGoogleSignIn = () => {
    setShowGoogleMockSelector(true);
  };

  const handleSimulateGoogleSuccess = (selectedEmail, displayName) => {
    setSaveStatus('signing-in');
    setTimeout(() => {
      setGoogleUser({
        email: selectedEmail.trim().toLowerCase(),
        displayName: displayName || selectedEmail.split('@')[0],
        photoURL: null
      });
      setShowGoogleMockSelector(false);
      setSaveStatus(null);
    }, 800);
  };

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
      setGoogleUser(null);
      setAppUser(null);
      setView('login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    const email = newStaffData.email.trim().toLowerCase();
    if (directory.some(s => s.email.toLowerCase() === email)) return;
    const newStaffMember = { 
      name: newStaffData.name.trim(), 
      email, 
      role: newStaffData.role
    };
    const updatedDir = [...directory, newStaffMember];
    let updatedTas = [...tas];
    if (newStaffData.role === ROLES.TA) {
      const startingSchedule = email === 'karen.cate@halswell.school.nz' ? generateKarenDefaultSchedule() : generateEmptySchedule();
      updatedTas.push({ id: `ta-${Date.now()}`, name: newStaffData.name.trim(), email, status: 'active', schedule: startingSchedule });
    }
    setDirectory(updatedDir);
    setTas(updatedTas);
    await syncToFirebase(updatedDir, updatedTas, customLink, resolvedAbsences);
    setNewStaffData({ name: '', email: '', role: ROLES.TA });
    setShowAddStaffModal(false);
  };

  const handleUpdateRole = async (email, newRole) => {
    const emailLower = email.toLowerCase();
    if (MASTER_ADMINS.includes(emailLower)) return;
    const nextDir = directory.map(s => s.email.toLowerCase() === emailLower ? { ...s, role: newRole } : s);
    const isNowTA = newRole === ROLES.TA;
    let nextTas = [...tas];
    const existsInTAList = nextTas.some(t => t.email.toLowerCase() === emailLower);
    
    if (isNowTA && !existsInTAList) {
      const staffMember = directory.find(s => s.email.toLowerCase() === emailLower);
      const startingSchedule = emailLower === 'karen.cate@halswell.school.nz' ? generateKarenDefaultSchedule() : generateEmptySchedule();
      nextTas.push({ id: `ta-${Date.now()}`, name: staffMember?.name || 'New TA', email: emailLower, status: 'active', schedule: startingSchedule });
    } else if (!isNowTA && existsInTAList) {
      nextTas = nextTas.filter(t => t.email.toLowerCase() !== emailLower);
    }
    
    setDirectory(nextDir);
    setTas(nextTas);
    await syncToFirebase(nextDir, nextTas, customLink, resolvedAbsences);
  };

  const executeDelete = async () => {
    if (!staffToDelete) return;
    const emailLower = staffToDelete.email.toLowerCase();
    const nextDir = directory.filter(s => s.email.toLowerCase() !== emailLower);
    const nextTas = tas.filter(t => t.email.toLowerCase() !== emailLower);
    setDirectory(nextDir);
    setTas(nextTas);
    setStaffToDelete(null);
    await syncToFirebase(nextDir, nextTas, customLink, resolvedAbsences);
  };

  const saveSchedule = async () => {
    await syncToFirebase(directory, tas, customLink, resolvedAbsences);
    setIsEditingSchedule(false);
  };

  const handleReportAbsence = (e) => {
    if (e) e.preventDefault();
    const subject = encodeURIComponent(`Absence Report: ${appUser?.name || 'Staff Member'}`);
    const reasonText = absenceReason.trim() ? `Reason: ${absenceReason}` : "I'm unwell and won't be able to make it in today.";
    const body = encodeURIComponent(`Hi Tracey,\n\nI (${appUser?.name}) am reporting absent today.\n\nReason: ${reasonText}\n\nSent via Support Link.`);
    const mailtoLink = `mailto:tracey.mora@halswell.school.nz?subject=${subject}&body=${body}`;
    const win = window.open(mailtoLink, '_blank');
    if (win) { win.close(); }
    setShowAbsenceForm(false);
    setAbsenceReason('');
  };

  const handleCopyLink = () => {
    const url = hubUrl;
    const textArea = document.createElement("textarea");
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {}
    document.body.removeChild(textArea);
  };

  const handleCopyDaySchedule = async () => {
    if (!activeTA || copyTargetDays.length === 0) return;

    const sourceSchedule = activeTA.schedule[currentDay];
    const updatedTas = tas.map(t => {
      if (t.id === activeTA.id) {
        const newSchedule = { ...t.schedule };
        copyTargetDays.forEach(day => {
          newSchedule[day] = JSON.parse(JSON.stringify(sourceSchedule));
        });
        return { ...t, schedule: newSchedule };
      }
      return t;
    });

    setTas(updatedTas);
    setShowCopyDayModal(false);
    setCopyTargetDays([]);
    await syncToFirebase(directory, updatedTas, customLink, resolvedAbsences);
  };

  const absentTAs = useMemo(() => {
    return tas.filter(t => t.status === 'absent');
  }, [tas]);

  const criticalSlotsToCover = useMemo(() => {
    if (!selectedAbsentTA) return [];
    const schedule = selectedAbsentTA.schedule?.[currentDay] || {};
    return TIME_SLOTS.filter(slot => {
      const priority = schedule[slot]?.priority;
      return priority === 1 || priority === 2; 
    }).map(slot => ({
      time: slot,
      task: schedule[slot]?.task || 'General Support',
      priority: schedule[slot]?.priority || 3
    })).sort((a, b) => a.priority - b.priority); 
  }, [selectedAbsentTA, currentDay]);

  const getAvailableCoversForSlot = (timeSlot, excludeAssignedId = null) => {
    return tas.filter(t => {
      if (t.id === selectedAbsentTA?.id) return false;
      if (t.status === 'absent') return false;
      if (excludeAssignedId && t.id === excludeAssignedId) return false;
      
      const currentTask = t.schedule?.[currentDay]?.[timeSlot];
      if (!currentTask) return true;
      
      return currentTask.priority === 3 || currentTask.task === "General Support";
    });
  };

  const handleAutoSuggestAll = () => {
    if (!selectedAbsentTA) return;
    
    const suggestedPlan = {};
    const assignedThisRound = []; 
    
    criticalSlotsToCover.forEach(slot => {
      const available = getAvailableCoversForSlot(slot.time).filter(t => !assignedThisRound.includes(`${slot.time}-${t.id}`));
      
      if (available.length > 0) {
        const match = available[0];
        suggestedPlan[slot.time] = match.id;
        assignedThisRound.push(`${slot.time}-${match.id}`);
      }
    });
    
    setCoveragePlan(suggestedPlan);
  };

  const getOtherTAStatusesForSlot = (timeSlot) => {
    return tas
      .filter(t => t.id !== selectedAbsentTA?.id && t.status !== 'absent')
      .map(t => {
        const sched = t.schedule?.[currentDay]?.[timeSlot] || { task: 'General Support', priority: 3 };
        return {
          name: t.name,
          task: sched.task,
          priority: sched.priority
        };
      });
  };

  const handlePublishCoverage = async () => {
    if (!selectedAbsentTA) return;

    const resolutionTimestamp = new Date().toLocaleString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const archiveEntry = {
      id: `resolved-${Date.now()}-${selectedAbsentTA.id}`,
      name: selectedAbsentTA.name,
      email: selectedAbsentTA.email,
      reason: selectedAbsentTA.absenceReason || 'Unwell',
      resolvedAt: resolutionTimestamp,
      resolutionType: 'Coverage Coordinated'
    };

    const nextArchive = [archiveEntry, ...resolvedAbsences];

    const updatedTas = tas.map(t => {
      if (t.id === selectedAbsentTA.id) {
        const newSched = { ...t.schedule };
        if (!newSched[currentDay]) newSched[currentDay] = {};
        Object.keys(coveragePlan).forEach(slot => {
          newSched[currentDay][slot] = { 
            task: `Covered by ${tas.find(x => x.id === coveragePlan[slot])?.name || 'Staff'}`, 
            priority: 6 
          };
        });
        return { ...t, status: 'active', absenceReason: '', schedule: newSched };
      }

      const coveredSlots = Object.keys(coveragePlan).filter(slot => coveragePlan[slot] === t.id);
      if (coveredSlots.length > 0) {
        const newSched = { ...t.schedule };
        if (!newSched[currentDay]) newSched[currentDay] = {};
        coveredSlots.forEach(slot => {
          const originalCriticalTask = selectedAbsentTA.schedule?.[currentDay]?.[slot];
          newSched[currentDay][slot] = {
            task: `[COVER] ${originalCriticalTask?.task || 'Support'}`,
            priority: originalCriticalTask?.priority || 1
          };
        });
        return { ...t, schedule: newSched };
      }
      return t;
    });

    setTas(updatedTas);
    setResolvedAbsences(nextArchive);
    await syncToFirebase(directory, updatedTas, customLink, nextArchive);

    const notifications = Object.keys(coveragePlan).map(slot => {
      const coveringTA = tas.find(x => x.id === coveragePlan[slot]);
      const task = selectedAbsentTA.schedule?.[currentDay]?.[slot]?.task || 'Support';
      return `${coveringTA?.name || 'Staff'}: ${slot} -> ${task}`;
    }).join('\n');

    const emailList = Object.values(coveragePlan)
      .map(id => tas.find(x => x.id === id)?.email)
      .filter((v, i, a) => v && a.indexOf(v) === i) 
      .join(',');

    const subject = encodeURIComponent(`Support Link: Coverage Adjustment - ${currentDay}`);
    const body = encodeURIComponent(
      `Hi Team,\n\nWe have coordinated active coverage for today's critical support needs due to an absence.\n\nPlease find your updated schedules below:\n\n${notifications}\n\nThank you for your flexibility!\n\nTracey Mora`
    );

    const mailto = `mailto:${emailList}?subject=${subject}&body=${body}`;
    window.open(mailto, '_blank');

    setShowCoverageModal(false);
    setCoveragePlan({});
    setSelectedAbsentTA(null);
  };

  const activeTA = useMemo(() => {
    const emailToFind = appUser?.email?.toLowerCase();
    const id = (appUser?.role === ROLES.TA && !selectedTAId) 
      ? tas.find(t => t.email?.toLowerCase() === emailToFind)?.id 
      : selectedTAId;
    return tas.find(t => t.id === id);
  }, [tas, appUser, selectedTAId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <RefreshCw className="animate-spin text-slate-400 w-6 h-6 mx-auto mb-4" />
        <h2 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">Waking Hub...</h2>
      </div>
    </div>
  );

  if (view === 'login') return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-50 via-[#fcfbf9] to-slate-100 overflow-hidden relative">
      <div className="w-full max-sm:max-w-xs max-w-sm relative z-10">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-16 h-16 bg-[#5c5cd6] rounded-[1.2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-500/20">
            <HeartHandshake className="w-9 h-9 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-[28px] font-semibold text-slate-800 tracking-tight mb-2">Support Link</h1>
          <p className="text-[10px] text-[#5c5cd6] font-bold uppercase tracking-[0.25em]">Halswell School TA Management Portal</p>
        </div>
        
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          <button 
            type="button" 
            onClick={handleGoogleSignIn}
            disabled={saveStatus === 'signing-in'}
            className="w-full py-4 px-6 bg-white border border-slate-200 rounded-[1.4rem] font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all text-sm shadow-md flex items-center justify-center gap-3"
          >
            {saveStatus === 'signing-in' ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#5c5cd6]" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.466 0-6.277-2.85-6.277-6.36s2.81-6.358 6.277-6.358c1.55 0 2.96.568 4.06 1.505l3.11-3.11C18.96 2.053 15.82.96 12.241.96 6.036.961.96 6.037.96 12.241c0 6.205 5.076 11.28 11.28 11.28 6.643 0 11.28-4.704 11.28-11.28 0-.74-.067-1.42-.194-1.956H12.24Z"
                />
              </svg>
            )}
            {saveStatus === 'signing-in' ? 'Connecting...' : 'Sign in with Google'}
          </button>

          {saveStatus === 'error-unauthorized' && (
            <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl text-center space-y-3 animate-in zoom-in-95">
              <p className="text-rose-500 text-xs font-semibold leading-relaxed">
                Unauthorized Account.<br/>
                <span className="text-slate-400 font-normal">"{googleUser?.email}" is not registered in our database. Please sign in with your Halswell Google email or contact Tracey Mora.</span>
              </p>
              <button onClick={handleLogout} className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors shadow-sm">
                Switch Google Account
              </button>
            </div>
          )}
          {saveStatus === 'error-popup' && (
            <p className="text-rose-500 text-xs text-center font-medium animate-pulse leading-relaxed">
              Connection lost.<br/>
              <span className="text-slate-400 text-[10px] font-normal">Ensure your internet is active and try signing in again.</span>
            </p>
          )}
        </div>
        
        <div className="mt-12 text-center animate-in fade-in duration-1000 delay-300">
           <button onClick={handleCopyLink} className="flex items-center gap-2 text-slate-300 font-medium text-[10px] uppercase tracking-widest mx-auto hover:text-[#5c5cd6] transition-colors group">
             <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
               {copyFeedback ? <Check className="w-3 h-3 text-emerald-500" /> : <Link className="w-3 h-3" />}
             </div>
             {copyFeedback ? 'Copied' : 'Direct Link'}
           </button>
        </div>
      </div>

      {showGoogleMockSelector && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="font-semibold text-xs uppercase tracking-wider text-slate-500">Choose Google Account</span>
              </div>
              <button onClick={() => setShowGoogleMockSelector(false)} className="text-slate-300 hover:text-slate-500 p-1"><X className="w-4 h-4" /></button>
            </div>

            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-4">Select or type your Halswell email</p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {directory.map(staff => (
                <button
                  key={staff.email}
                  onClick={() => handleSimulateGoogleSuccess(staff.email, staff.name)}
                  className="w-full text-left p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl transition-all flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs group-hover:bg-[#5c5cd6] group-hover:text-white transition-colors">
                    {staff.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 text-xs truncate leading-none">{staff.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-none">{staff.email}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Use another school account</label>
              <div className="flex gap-2">
                <input 
                  type="email"
                  placeholder="name@halswell.school.nz"
                  value={manualGoogleEmail}
                  onChange={(e) => setManualGoogleEmail(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs"
                />
                <button 
                  onClick={() => {
                    if (manualGoogleEmail.trim()) {
                      handleSimulateGoogleSuccess(manualGoogleEmail, manualGoogleEmail.split('@')[0]);
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-sans text-slate-600">
      {saveStatus === 'success' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300]">
          <div className="bg-slate-900 text-white px-5 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4">
            <Check className="w-3 h-3" />
            <span className="font-medium text-[10px] uppercase tracking-widest">Synced</span>
          </div>
        </div>
      )}

      {/* Coverage Coordinator Modal */}
      {showCoverageModal && selectedAbsentTA && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setShowCoverageModal(false); setSelectedAbsentTA(null); }} className="absolute top-6 right-6 text-slate-300 p-2 hover:text-slate-500"><X className="w-5 h-5" /></button>
            
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-500 text-[9px] font-bold uppercase tracking-widest">Absence Coordinator</span>
                <h3 className="text-xl font-semibold text-slate-800 tracking-tight mt-2">{selectedAbsentTA.name} Absent Today</h3>
                <p className="text-xs text-slate-400 mt-1">Select available Teaching Assistants doing Enrichment to cover critical slots.</p>
              </div>
              
              <button
                type="button"
                onClick={handleAutoSuggestAll}
                className="self-start sm:self-center flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#5c5cd6] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
              >
                <Award className="w-4 h-4" /> Auto-Suggest All Cover
              </button>
            </div>

            <div className="space-y-4">
              {criticalSlotsToCover.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No Critical or High Needs slots require reallocation today.
                </div>
              ) : (
                criticalSlotsToCover.map(slot => {
                  const availableTAs = getAvailableCoversForSlot(slot.time);
                  const otherTAStatuses = getOtherTAStatusesForSlot(slot.time);
                  const recommendedTA = availableTAs[0];
                  
                  return (
                    <div key={slot.time} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-700">{slot.time}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${slot.priority === 1 ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'}`}>
                              {slot.priority === 1 ? 'Critical' : 'High Needs'}
                            </span>
                            {recommendedTA && !coveragePlan[slot.time] && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                                <Award className="w-2.5 h-2.5" /> Suggesting {recommendedTA.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Task needing cover: <strong className="text-slate-600">{slot.task}</strong></p>
                        </div>

                        <div className="w-full sm:w-64">
                          <select 
                            value={coveragePlan[slot.time] || ""}
                            onChange={(e) => setCoveragePlan({ ...coveragePlan, [slot.time]: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 outline-none focus:border-[#5c5cd6]"
                          >
                            <option value="">-- Select Available Cover --</option>
                            {availableTAs.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} (Currently: {t.schedule?.[currentDay]?.[slot.time]?.task || 'Enrichment'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100/50 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live TA Standby:</span>
                        {otherTAStatuses.map(status => {
                          const isBreak = status.priority === 4 || status.priority === 5;
                          const isCritical = status.priority === 1 || status.priority === 2;
                          return (
                            <span key={status.name} className="text-[10px] text-slate-400">
                              {status.name}: <span className={isBreak ? 'text-amber-500 font-medium' : isCritical ? 'text-rose-500 font-medium' : 'text-blue-500 font-medium'}>
                                {status.task}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              <div className="flex gap-2 pt-4">
                <button 
                  onClick={() => { setShowCoverageModal(false); setSelectedAbsentTA(null); }}
                  className="flex-1 py-3.5 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-slate-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePublishCoverage}
                  disabled={Object.keys(coveragePlan).length === 0}
                  className="flex-1 py-3.5 bg-[#4a4ae2] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/10 hover:bg-[#3d3dc9] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Publish & Notify Cover Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Day Modal */}
      {showCopyDayModal && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
          <div className="bg-white w-full max-sm:max-w-xs max-w-sm rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowCopyDayModal(false)} className="absolute top-6 right-6 text-slate-300 p-2 hover:text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#5c5cd6]">
                <Copy className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 tracking-tight">Copy Schedule</h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1 leading-tight">Apply {currentDay}'s plan to other days for {activeTA?.name}</p>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target Days</label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS.filter(d => d !== currentDay).map(day => {
                    const isSelected = copyTargetDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCopyTargetDays(copyTargetDays.filter(d => d !== day));
                          } else {
                            setCopyTargetDays([...copyTargetDays, day]);
                          }
                        }}
                        className={`py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          isSelected 
                            ? 'bg-[#5c5cd6] text-white border-[#5c5cd6] shadow-sm' 
                            : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowCopyDayModal(false)}
                  className="flex-1 py-3.5 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border border-slate-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCopyDaySchedule}
                  disabled={copyTargetDays.length === 0}
                  className="flex-1 py-3.5 bg-[#4a4ae2] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/10 hover:bg-[#3d3dc9] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absence Confirmation/Reason Modal */}
      {showAbsenceForm && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl relative">
            <button onClick={() => setShowAbsenceForm(false)} className="absolute top-6 right-6 text-slate-300 p-2"><X className="w-5 h-5" /></button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarX className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 tracking-tight">Report Absence</h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">Notification for Tracey Mora</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reason (Optional)</label>
                <textarea 
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="e.g. Flu, family emergency, etc."
                  className="w-full h-24 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-rose-100 transition-all resize-none"
                />
              </div>
              <button 
                onClick={handleReportAbsence}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/10 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-3 h-3" /> Send Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-3xl p-8 border border-slate-100 shadow-xl text-center">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <h3 className="text-base font-medium text-slate-800 mb-1">Remove Staff?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">Delete {staffToDelete.name} and their data?</p>
            <div className="flex gap-2">
              <button onClick={() => setStaffToDelete(null)} className="flex-1 py-2.5 bg-slate-50 text-slate-400 rounded-xl text-[10px] uppercase tracking-widest">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-[10px] uppercase tracking-widest">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
          <div className="bg-white w-full max-sm:max-w-xs max-w-sm rounded-[2rem] p-8 border border-slate-100 shadow-2xl relative">
            <button onClick={() => setShowAddStaffModal(false)} className="absolute top-6 right-6 text-slate-300"><X className="w-4 h-4" /></button>
            <h2 className="text-base font-medium text-slate-800 mb-6 tracking-tight uppercase tracking-widest">New Staff Member</h2>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <input required placeholder="Full Name" value={newStaffData.name} onChange={e => setNewStaffData({...newStaffData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-indigo-100" />
              <input required type="email" placeholder="Google Email Address" value={newStaffData.email} onChange={e => setNewStaffData({...newStaffData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-indigo-100" />
              
              <select value={newStaffData.role} onChange={e => setNewStaffData({...newStaffData, role: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none">
                <option value={ROLES.TA}>Teaching Assistant (Strict Self-Timetable)</option>
                <option value={ROLES.TEACHER}>Classroom Teacher (View All Timetables)</option>
                <option value={ROLES.ADMIN}>SENCO (Full Controls)</option>
              </select>
              <button type="submit" disabled={isSyncing} className="w-full py-3.5 bg-indigo-500 text-white rounded-xl font-medium text-[10px] uppercase tracking-widest mt-2 hover:bg-indigo-600 transition-all flex justify-center items-center">
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sync Mobile Modal */}
      {showShareHelp && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[250] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center">
            <button onClick={() => setShowShareHelp(false)} className="absolute top-8 right-8 p-2 text-slate-300"><X className="w-5 h-5" /></button>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium text-slate-800 tracking-tight">Sync Your Device</h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">Scan to access on mobile</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-3xl mb-8 border border-slate-100">
              <img src={qrImageUrl} alt="QR Code" className="w-48 h-48 rounded-xl mix-blend-multiply" />
            </div>

            <div className="space-y-4 w-full mb-8">
              <div className="flex gap-4 items-center text-left p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-indigo-400">1</div>
                <p className="text-xs text-slate-500 leading-relaxed">Scan the code or <button onClick={handleCopyLink} className="text-indigo-500 font-medium">copy this link</button> to your phone.</p>
              </div>
              <div className="flex gap-4 items-center text-left p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-indigo-400">2</div>
                <p className="text-xs text-slate-500 leading-relaxed">In your mobile browser, tap "Share" and select <strong>"Add to Home Screen"</strong>.</p>
              </div>
            </div>

            <button onClick={handleCopyLink} className={`w-full py-3.5 rounded-xl font-medium text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${copyFeedback ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
              {copyFeedback ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copyFeedback ? 'Copied' : 'Copy Direct Link'}
            </button>
          </div>
        </div>
      )}

      {/* --- Main Workspace Frame --- */}
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl text-[#5c5cd6] flex items-center justify-center shrink-0 shadow-sm"><HeartHandshake className="w-5 h-5" /></div>
            <div>
              <h1 className="text-lg font-medium text-slate-800 tracking-tight leading-none mb-1">Support Link</h1>
              <div className="flex items-center gap-2">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Halswell Hub</p>
                <span className={`w-1 h-1 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setShowShareHelp(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-400 hover:text-[#5c5cd6] rounded-lg font-medium text-[9px] uppercase tracking-widest transition-all">
               <QrCode className="w-3 h-3" /> Sync Mobile
             </button>
             {appUser?.role === ROLES.TA && (
               <button onClick={() => setShowAbsenceForm(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-400 hover:bg-rose-100 rounded-lg font-medium text-[9px] uppercase tracking-widest transition-all">
                 <CalendarX className="w-3 h-3" /> Report Absence
               </button>
             )}
             <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-lg font-medium text-[9px] uppercase tracking-widest transition-all border border-transparent hover:border-slate-100">
               <LogOut className="w-3 h-3" /> Exit
             </button>
          </div>
        </header>

        {/* Admin/SENCO Alerts & Coordinator Banner */}
        {appUser?.role === ROLES.ADMIN && absentTAs.length > 0 && (
          <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-3xl animate-in slide-in-from-top-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-4 items-start md:items-center">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Absentee Staff Needs Allocation</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {absentTAs.map(t => `${t.name} (${t.absenceReason || 'Unwell'})`).join(', ')} marked absent today.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setSelectedAbsentTA(absentTAs[0]);
                  setCoveragePlan({});
                  setShowCoverageModal(true);
                }}
                className="px-5 py-2 bg-[#4a4ae2] hover:bg-[#3d3dc9] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md transition-all"
              >
                Coordinate Coverage
              </button>
              <button 
                onClick={async () => {
                  const resolutionTimestamp = new Date().toLocaleString('en-NZ', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  const archivedEntries = absentTAs.map(t => ({
                    id: `resolved-${Date.now()}-${t.id}`,
                    name: t.name,
                    email: t.email,
                    reason: t.absenceReason || 'Unwell',
                    resolvedAt: resolutionTimestamp,
                    resolutionType: 'Marked Active by SENCO'
                  }));

                  const nextArchive = [...archivedEntries, ...resolvedAbsences];
                  const nextTas = tas.map(t => t.status === 'absent' ? { ...t, status: 'active', absenceReason: '' } : t);
                  
                  setTas(nextTas);
                  setResolvedAbsences(nextArchive);
                  await syncToFirebase(directory, nextTas, customLink, nextArchive);
                }}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-100 transition-all"
              >
                Mark Active
              </button>
            </div>
          </div>
        )}

        {/* --- Primary Dashboard Render States --- */}
        {view === 'dashboard' ? (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Left Side: Timetables & Staff Directory */}
              <div className="lg:col-span-2 space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Active Support Log</h2>
                    <div className="flex gap-1 bg-slate-50 p-1 rounded-lg">
                      {DAYS.map(d => (
                        <button key={d} onClick={() => setCurrentDay(d)} className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${currentDay === d ? 'bg-white text-indigo-500 shadow-sm' : 'text-slate-300'}`}>{d.slice(0, 3)}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {tas.map(ta => (
                      <div 
                        key={ta.id} 
                        onClick={() => {setSelectedTAId(ta.id); setView('schedule');}} 
                        className={`group p-6 rounded-2xl border transition-all relative cursor-pointer ${
                          ta.status === 'absent' 
                            ? 'bg-rose-50/20 border-rose-100/50 hover:border-rose-200' 
                            : 'bg-white border-slate-100 hover:border-indigo-100'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 ${
                          ta.status === 'absent' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-400'
                        }`}>
                          {ta.status === 'absent' ? <CalendarX className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        </div>
                        <h3 className="font-medium text-sm text-slate-800 mb-0.5">{ta.name}</h3>
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${ta.status === 'absent' ? 'text-rose-400' : 'text-slate-300'}`}>
                          {ta.status === 'absent' ? 'Absent' : 'Log Sheet'}
                        </p>
                      </div>
                    ))}
                    {appUser?.role === ROLES.ADMIN && (
                      <button onClick={() => setShowAddStaffModal(true)} className="p-6 bg-white rounded-2xl border border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-indigo-100 hover:text-indigo-400 transition-all min-h-[142px]">
                        <UserPlus className="w-5 h-5" />
                        <span className="font-bold text-[8px] uppercase tracking-widest">Register</span>
                      </button>
                    )}
                  </div>
                </div>

                {appUser?.role === ROLES.ADMIN && (
                  <div className="space-y-6">
                    <h2 className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Staff Directory</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {directory.map(staff => (
                        <div key={staff.email} className="flex items-center justify-between p-4 bg-slate-50/30 rounded-xl border border-slate-50 hover:border-indigo-50 transition-all">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-200 shrink-0"><User className="w-4 h-4" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-700 text-xs truncate">{staff.name}</p>
                              <p className="text-[9px] text-slate-300 truncate tracking-wide mb-1">{staff.email}</p>
                              <div className="flex items-center gap-1 text-[9px] text-indigo-500 font-bold uppercase tracking-wider">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>Verified Account</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select value={staff.role} disabled={isSyncing} onChange={(e) => handleUpdateRole(staff.email, e.target.value)} className="bg-white text-[8px] font-bold uppercase px-2 py-1.5 rounded border border-slate-100 outline-none cursor-pointer tracking-widest text-slate-400">
                              <option value={ROLES.ADMIN}>SENCO</option>
                              <option value={ROLES.TEACHER}>Teacher</option>
                              <option value={ROLES.TA}>TA</option>
                            </select>
                            {!MASTER_ADMINS.includes(staff.email.toLowerCase()) && (
                              <button onClick={() => setStaffToDelete(staff)} disabled={isSyncing} className="p-1.5 text-slate-200 hover:text-rose-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side / Sidebar: Resolved Absences Archive Log Panel */}
              {appUser?.role === ROLES.ADMIN && resolvedAbsences.length > 0 && (
                <div className="space-y-6 lg:border-l lg:border-slate-100 lg:pl-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Absence Archive Log</h2>
                    <span className="px-2 py-1 rounded-full bg-slate-50 text-[9px] font-bold text-slate-400 border border-slate-100 uppercase tracking-wider">{resolvedAbsences.length} Total</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                    {resolvedAbsences.map(log => (
                      <div key={log.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-semibold text-slate-700 leading-none">{log.name}</p>
                          <p className="text-[10px] text-slate-400 truncate leading-none">{log.email}</p>
                          <div className="bg-white p-2 rounded-lg border border-slate-100 text-[10px] text-slate-500 mt-2 italic">
                            "{log.reason}"
                          </div>
                          <div className="pt-2 space-y-0.5 text-[8px] text-slate-400 uppercase font-bold tracking-wider">
                            <div>Resolved: <span className="text-[#5c5cd6] font-normal lowercase tracking-normal">{log.resolvedAt}</span></div>
                            <div>Status: <span className="text-emerald-500">{log.resolutionType}</span></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          /* --- Timeline View Render Stage --- */
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {appUser?.role !== ROLES.TA && (
                  <button onClick={() => {setView('dashboard'); setSelectedTAId(null);}} className="p-2 text-slate-300 hover:text-[#5c5cd6] transition-all">
                    <ChevronRight className="rotate-180 w-5 h-5" />
                  </button>
                )}
                <div>
                  <h2 className="text-xl font-medium text-slate-800 tracking-tight">{activeTA?.name}</h2>
                  <p className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">{currentDay} Timeline</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {appUser?.role === ROLES.ADMIN && (
                   <>
                     <button 
                       onClick={() => { setCopyTargetDays([]); setShowCopyDayModal(true); }}
                       className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
                     >
                       <Copy className="w-3.5 h-3.5 text-slate-400" /> Copy {currentDay}
                     </button>
                     <button disabled={isSyncing} onClick={() => isEditingSchedule ? saveSchedule() : setIsEditingSchedule(true)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${isEditingSchedule ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-900 text-white shadow-sm'}`}>
                       {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : isEditingSchedule ? <><Save className="w-3 h-3" /> Sync Update</> : <><Edit3 className="w-3 h-3" /> Adjust Day</>}
                     </button>
                   </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-1 overflow-x-auto pb-4 no-scrollbar border-b border-slate-50">
                {DAYS.map(d => (
                  <button key={d} onClick={() => setCurrentDay(d)} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${currentDay === d ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-100 text-slate-300 hover:border-indigo-100'}`}>{d}</button>
                ))}
              </div>
              
              {isEditingSchedule && appUser?.role === ROLES.ADMIN && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2 animate-in fade-in">
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Tip:</strong> Breaks can be placed at any time slot. Use the <strong>Preset Buttons</strong> next to each slot to instantly schedule breaks, or click them to re-assign Enrichment slots as break slots when needed.
                  </p>
                </div>
              )}

              <div className="grid gap-2 pt-4">
                {TIME_SLOTS.map(time => {
                  const cell = activeTA?.schedule?.[currentDay]?.[time] || { task: 'General Support', priority: 3 };
                  const priority = Object.values(PRIORITY_LEVELS).find(p => p.id === cell.priority) || PRIORITY_LEVELS.ENRICHMENT;
                  return (
                    <div key={time} className="flex gap-4 items-center">
                      <div className="w-14 text-right shrink-0">
                        <p className="text-[11px] font-bold text-slate-700">{time.split(' - ')[0]}</p>
                        <p className="text-[8px] text-slate-300 font-medium uppercase">{time.split(' - ')[1]}</p>
                      </div>
                      <div className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0 ${isEditingSchedule && appUser?.role === ROLES.ADMIN ? 'border-indigo-100 bg-white shadow-sm' : `${priority.bg} ${priority.border} ${priority.text}`}`}>
                        {isEditingSchedule && appUser?.role === ROLES.ADMIN ? (
                          <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <div className="flex-1 flex flex-col gap-2">
                              <input 
                                value={cell.task} 
                                onChange={e => {
                                   const updatedTas = tas.map(t => {
                                     if (t.id === activeTA.id) {
                                       const newSched = {...t.schedule};
                                       newSched[currentDay][time] = {...newSched[currentDay][time], task: e.target.value};
                                       return {...t, schedule: newSched};
                                     }
                                     return t;
                                   });
                                   setTas(updatedTas);
                                }} 
                                className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 outline-none text-slate-800 focus:border-indigo-200 text-xs font-medium w-full" 
                              />
                              
                              <div className="flex gap-1.5 flex-wrap">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const updatedTas = tas.map(t => {
                                      if (t.id === activeTA.id) {
                                        const newSched = {...t.schedule};
                                        newSched[currentDay][time] = { task: 'Morning Tea', priority: 4 };
                                        return {...t, schedule: newSched};
                                      }
                                      return t;
                                    });
                                    setTas(updatedTas);
                                  }}
                                  className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100/50 hover:bg-amber-100 rounded text-[9px] font-bold uppercase transition-colors"
                                >
                                  + Morning Tea
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const updatedTas = tas.map(t => {
                                      if (t.id === activeTA.id) {
                                        const newSched = {...t.schedule};
                                        newSched[currentDay][time] = { task: 'Lunch', priority: 5 };
                                        return {...t, schedule: newSched};
                                      }
                                      return t;
                                    });
                                    setTas(updatedTas);
                                  }}
                                  className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100/50 hover:bg-amber-100 rounded text-[9px] font-bold uppercase transition-colors"
                                >
                                  + Lunch
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const updatedTas = tas.map(t => {
                                      if (t.id === activeTA.id) {
                                        const newSched = {...t.schedule};
                                        newSched[currentDay][time] = { task: 'Enrichment Support', priority: 3 };
                                        return {...t, schedule: newSched};
                                      }
                                      return t;
                                    });
                                    setTas(updatedTas);
                                  }}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100/50 hover:bg-blue-100 rounded text-[9px] font-bold uppercase transition-colors"
                                >
                                  + Enrichment
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const updatedTas = tas.map(t => {
                                      if (t.id === activeTA.id) {
                                        const newSched = {...t.schedule};
                                        newSched[currentDay][time] = { task: 'Critical Cover', priority: 1 };
                                        return {...t, schedule: newSched};
                                      }
                                      return t;
                                    });
                                    setTas(updatedTas);
                                  }}
                                  className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-100/50 hover:bg-rose-100 rounded text-[9px] font-bold uppercase transition-colors"
                                >
                                  + Critical
                                </button>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center sm:self-start">
                              <select 
                                value={cell.priority} 
                                onChange={e => {
                                  const updatedTas = tas.map(t => {
                                    if (t.id === activeTA.id) {
                                      const newSched = {...t.schedule};
                                      newSched[currentDay][time] = {...newSched[currentDay][time], priority: parseInt(e.target.value)};
                                      return {...t, schedule: newSched};
                                    }
                                    return t;
                                  });
                                  setTas(updatedTas);
                                }} 
                                className="bg-slate-50 border border-slate-100 text-[8px] font-bold uppercase px-3 py-2 rounded-lg outline-none text-slate-400 tracking-widest w-full sm:w-auto"
                              >
                                {Object.values(PRIORITY_LEVELS).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-xl ${priority.color} text-white flex items-center justify-center shrink-0 shadow-sm opacity-90`}>
                               <PriorityIcon iconName={priority.iconName} className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium tracking-tight truncate">{cell.task}</p>
                              <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 mt-0.5">{priority.label}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
