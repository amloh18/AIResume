'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Briefcase, 
  FileText, 
  ChevronDown, 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  Trophy, 
  Calendar, 
  Target,
  ArrowUpRight,
  Plus,
  Trash2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Brain,
  Info,
  Menu,
  Settings
} from 'lucide-react';
import RouteGuard from '@/components/auth/RouteGuard';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

// --- Specialized Hero Widgets ---

const CVReadinessBoard = ({ cvScore, onNavigate }: { cvScore: number; onNavigate: (path: string) => void }) => (
  <div className="flex flex-col lg:flex-row gap-6 h-full">
    <div className="flex-1 bg-slate-50/50 dark:bg-gray-800/20 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">Strength Radar</h4>
      <div className="space-y-3">
        {[
          { label: 'Core Skills', val: 90 },
          { label: 'Impact Statements', val: 75 },
          { label: 'ATS Keywords', val: 82 },
          { label: 'Formatting', val: 95 }
        ].map(s => (
          <div key={s.label}>
            <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
              <span>{s.label}</span>
              <span>{s.val}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-[#83d60d]" style={{ width: `${s.val}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="flex-1 bg-slate-50/50 dark:bg-gray-800/20 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">AI Improvement Queue</h4>
      <ul className="space-y-3">
        {[
          'Add measurable achievements to 2 roles',
          'Improve keyword match for "React/Node"',
          'Expand leadership signals'
        ].map((item, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="w-5 h-5 rounded-full bg-[#f0fbc9] dark:bg-[#83d60d]/20 text-[#487e04] dark:text-[#83d60d] flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{item}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className="w-full lg:w-48 flex flex-col gap-3">
      <button 
        onClick={() => onNavigate('/editor?doc=master-cv')}
        className="flex-1 bg-[#83d60d] text-slate-900 rounded-2xl font-bold text-xs p-4 hover:shadow-lg transition-all"
      >
        Continue Master CV
      </button>
      <button 
        onClick={() => onNavigate('/dashboard/canvas')}
        className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-xs p-4 hover:border-[#83d60d] transition-all"
      >
        Tailor for Job
      </button>
      <button 
        onClick={() => onNavigate('/dashboard/canvas?tab=cover-letters')}
        className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-xs p-4 hover:border-[#83d60d] transition-all"
      >
        New Cover Letter
      </button>
    </div>
  </div>
);

const KanbanBoard = ({ onNavigate }: { onNavigate: (path: string) => void }) => (
  <div className="flex gap-4 h-full overflow-x-auto pb-2 scrollbar-hide">
    {[
      { label: 'Saved', count: 5, color: 'bg-slate-100 dark:bg-gray-800/40', path: '/dashboard/tracker?filter=saved' },
      { label: 'Applied', count: 3, color: 'bg-blue-50 dark:bg-blue-900/10', path: '/dashboard/tracker?filter=applied' },
      { label: 'Interview', count: 2, color: 'bg-purple-50 dark:bg-purple-900/10', path: '/dashboard/tracker?filter=interview' },
      { label: 'Offer', count: 1, color: 'bg-[#f0fbc9] dark:bg-[#83d60d]/10', path: '/dashboard/tracker?filter=offer' },
      { label: 'Archive', count: 12, color: 'bg-slate-50 dark:bg-gray-800/20', path: '/dashboard/tracker?filter=archived' }
    ].map(col => (
      <div 
        key={col.label} 
        onClick={() => onNavigate(col.path)}
        className={`min-w-[180px] flex-1 ${col.color} rounded-2xl p-3 border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-[#83d60d]/30 transition-all`}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{col.label}</span>
          <span className="text-[10px] font-bold bg-white/80 dark:bg-black/40 px-1.5 py-0.5 rounded-md text-gray-600 dark:text-gray-400 shadow-sm">{col.count}</span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: Math.min(col.count, 2) }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-850 p-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-[#83d60d] transition-colors">
              <div className="h-2 w-12 bg-gray-100 dark:bg-gray-800 rounded-full mb-2" />
              <div className="h-3 w-full bg-gray-50 dark:bg-gray-800/50 rounded-md" />
            </div>
          ))}
          {col.count > 2 && <div className="text-center text-[9px] font-bold text-gray-400 py-1">+{col.count - 2} more</div>}
        </div>
      </div>
    ))}
  </div>
);

const AutomationPanel = ({ matchesCount, onNavigate }: { matchesCount: number; onNavigate: (path: string) => void }) => (
  <div className="flex flex-col lg:flex-row gap-6 h-full">
    <div className="flex-1 bg-slate-50/50 dark:bg-gray-800/20 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Automation Velocity</h4>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
            <span className="w-2 h-2 rounded-full bg-[#83d60d]" /> Matches
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Sent
          </span>
        </div>
      </div>
      <div className="flex-1 flex items-end gap-2 pb-2">
        {[40, 65, 30, 85, 45, 90, 70].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col-reverse gap-0.5 h-32">
              <div className="bg-[#83d60d]/20 rounded-t-sm" style={{ height: `${h}%` }} />
              <div className="bg-[#83d60d] rounded-t-sm" style={{ height: `${h * 0.6}%` }} />
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="w-full lg:w-64 bg-slate-900 dark:bg-black rounded-2xl p-6 flex flex-col justify-between border border-gray-800">
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Control Rail</span>
          <span className="w-2 h-2 rounded-full bg-[#83d60d] animate-pulse" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-1">Active Rules</div>
            <div className="text-xl font-black text-white">4 <span className="text-[10px] text-gray-400 font-bold ml-1">Running</span></div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <div className="text-[10px] font-bold text-gray-500 mb-1">Current Mode</div>
            <div className="text-xs font-bold text-[#83d60d]">Review-first</div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <button 
          onClick={() => onNavigate('/dashboard/jobs?tab=rules')}
          className="w-full bg-[#83d60d] text-slate-900 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider"
        >
          Tune Rules
        </button>
        <button className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors">Pause Ops</button>
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouteGuard requireAuth={true}>
        <DashboardContent />
      </RouteGuard>
    </Suspense>
  );
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const { toggleSidebar } = useMobileSidebar();
  const router = useRouter();
  
  // --- All Hooks must be at the top ---
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [applications, setApplications] = useState(12);
  const [cvUpdates, setCvUpdates] = useState(2);
  const [interviews, setInterviews] = useState(3);
  const [matchesCount, setMatchesCount] = useState(92);
  
  const [cvScore, setCvScore] = useState(68);
  const [profileStrength, setProfileStrength] = useState(68);

  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Quantified impact metrics in work history', addedScore: 12, completed: false },
    { id: 2, text: 'Added 5 core industry keywords to Skills', addedScore: 8, completed: false },
    { id: 3, text: 'Optimized Summary paragraph for ATS searchability', addedScore: 7, completed: false },
    { id: 4, text: 'Formatted contact info with LinkedIn handle', addedScore: 5, completed: false },
  ]);

  const [notification, setNotification] = useState<string | null>(null);
  const [demoLayoutType, setDemoLayoutType] = useState<'cv' | 'tracker' | 'auto_apply' | null>(null);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/user/onboarding-status');
        const result = await res.json();
        if (result.success && result.data) {
          const onboarding = result.data.onboarding || {};
          setOnboardingData(onboarding);
          
          if (onboarding.confidence_score) {
            setCvScore(onboarding.confidence_score);
            setProfileStrength(onboarding.confidence_score);
          }
          
          if (onboarding.activation_status === 'pending' && onboarding.activation_route) {
            router.push(onboarding.activation_route);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to load onboarding status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (status === 'authenticated') {
      fetchStatus();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, router]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 70;
    const isDownSwipe = distance < -70;

    if (isUpSwipe && !isExpanded) {
      setIsExpanded(true);
      triggerNotification("Expanded detailed dashboard analytics view");
    } else if (isDownSwipe && isExpanded && containerRef.current && containerRef.current.scrollTop === 0) {
      setIsExpanded(false);
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 50 && !isExpanded) {
      setIsExpanded(true);
      triggerNotification("Swiped up for deeper insights");
    } else if (e.deltaY < -50 && isExpanded && containerRef.current && containerRef.current.scrollTop === 0) {
      setIsExpanded(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 20 && !isExpanded) {
      setIsExpanded(true);
    } else if (scrollTop <= 5 && isExpanded) {
      setIsExpanded(false);
    }
  };

  // --- Conditional returns must be AFTER all hooks ---
  if (isLoading || (onboardingData?.activation_status === 'pending' && onboardingData?.activation_route)) {
    return <LoadingFallback />;
  }

  const userRole = (session?.user as any)?.role || 'user';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const layoutType = demoLayoutType || onboardingData?.dashboard_layout_type || 'cv';

  // --- Configuration Mapping ---
  const configs: Record<'cv' | 'tracker' | 'auto_apply', any> = {
    cv: {
      type: "CV & Documents",
      subline: `Your Master CV is ${cvScore}% optimized for ATS.`,
      status: { label: "CV Score", val: cvScore },
      kpis: [
        { label: "Master CV score", val: `${cvScore}%`, note: "+12 from last scan", cta: "Improve now", icon: <FileText />, color: "#163d32", path: '/editor?doc=master-cv' },
        { label: "Tailored CVs", val: "3", note: "1 updated this week", cta: "Open canvas", icon: <Briefcase />, color: "#ffd0b0", path: '/dashboard/canvas' },
        { label: "Cover letters", val: "2", note: "Last created yesterday", cta: "Create new", icon: <FileText />, color: "#1c4ce8", path: '/dashboard/canvas?tab=cover-letters' },
        { label: "Free ATS scans", val: "2 / 3", note: "Use before export", cta: "Run scan", icon: <Sparkles />, color: "#6138db", path: '/editor?mode=ats' }
      ],
      hero: <CVReadinessBoard cvScore={cvScore} onNavigate={(p) => router.push(p)} />,
      hiddenRows: [
        { title: "Recent Documents", items: ["Master CV 2024", "Senior Dev - Google", "Backend - Stripe"], path: '/dashboard/canvas' },
        { title: "Keyword Gaps", items: ["GraphQL", "Docker", "System Design"], path: '/editor?tab=keywords' }
      ],
      featured: [
        { title: "Priority Fixes", desc: "Your CV lacks measurable impact in your current role.", icon: <AlertTriangle />, type: 'warning', path: '/editor' },
        { title: "Pro Upgrade", desc: "Unlock unlimited ATS scans and premium templates.", icon: <Sparkles />, type: 'promo', path: '/pricing' },
        { title: "New Feature", desc: "Save your best cover letter as a reusable template.", icon: <Lightbulb />, type: 'info', path: '/dashboard/canvas' },
        { title: "Expert Review", desc: "Get your CV reviewed by industry veterans.", icon: <Brain />, type: 'promo', path: '/services/review' }
      ]
    },
    tracker: {
      type: "Job Tracker",
      subline: "3 active jobs need attention this week.",
      status: { label: "Follow-ups", val: 2 },
      kpis: [
        { label: "Tracked jobs", val: "12", note: "4 active this week", cta: "Open tracker", icon: <Target />, color: "#163d32", path: '/dashboard/tracker' },
        { label: "Applications sent", val: applications, note: "2 this week", cta: "View list", icon: <Briefcase />, color: "#ffd0b0", path: '/dashboard/tracker?tab=applied' },
        { label: "Upcoming interviews", val: interviews, desc: "Scheduled pipeline", cta: "Prepare", icon: <Calendar />, color: "#1c4ce8", path: '/dashboard/interview' },
        { label: "Follow-ups due", val: "3", note: "1 overdue", cta: "Review tasks", icon: <CheckCircle />, color: "#6138db", path: '/dashboard/tracker?tab=tasks' }
      ],
      hero: <KanbanBoard onNavigate={(p) => router.push(p)} />,
      hiddenRows: [
        { title: "Application Velocity", items: ["Week 1: 2 apps", "Week 2: 5 apps", "Week 3: 1 app"], path: '/dashboard/tracker' },
        { title: "Recent Activity", items: ["Interview scheduled at Meta", "Applied to OpenAI", "Received offer from Stripe"], path: '/dashboard/tracker' }
      ],
      featured: [
        { title: "Follow-up Alert", desc: "You have 1 follow-up overdue for 'Frontend Dev @ Netflix'.", icon: <AlertTriangle />, type: 'warning', path: '/dashboard/tracker' },
        { title: "Premium Tracking", desc: "Enable automated email follow-up reminders.", icon: <Sparkles />, type: 'promo', path: '/pricing' },
        { title: "CV Missing", desc: "Attach a CV to 3 saved jobs to improve tracking stats.", icon: <FileText />, type: 'info', path: '/dashboard/tracker' },
        { title: "Career Coaching", desc: "Book a 1:1 session to optimize your interview strategy.", icon: <Brain />, type: 'promo', path: '/services/coaching' }
      ]
    },
    auto_apply: {
      type: "Auto-Pilot",
      subline: "8 matching jobs found, 3 applications ready.",
      status: { label: "Queue Ready", val: 3 },
      kpis: [
        { label: "Jobs matched", val: "18", note: "8 added today", cta: "Review matches", icon: <Brain />, color: "#163d32", path: '/dashboard/jobs?tab=matches' },
        { label: "Ready to apply", val: "5", note: "2 blocked by info", cta: "Open queue", icon: <CheckCircle />, color: "#ffd0b0", path: '/dashboard/jobs?tab=queue' },
        { label: "Auto-prepared", val: applications, note: "+4 this week", cta: "View apps", icon: <Zap />, color: "#1c4ce8", path: '/dashboard/tracker?tab=auto' },
        { label: "Match quality", val: `${matchesCount}%`, note: "Best for Frontend", cta: "Tune rules", icon: <Target />, color: "#6138db", path: '/dashboard/jobs?tab=rules' }
      ],
      hero: <AutomationPanel matchesCount={matchesCount} onNavigate={(p) => router.push(p)} />,
      hiddenRows: [
        { title: "Queue Preview", items: ["Senior React Eng - Remote (95%)", "Lead Web Dev - NY (88%)", "Staff Engineer - London (92%)"], path: '/dashboard/jobs?tab=queue' },
        { title: "Rule Performance", items: ["Rule #1: 12 matches", "Rule #2: 6 matches"], path: '/dashboard/jobs?tab=rules' }
      ],
      featured: [
        { title: "Missing Info", desc: "2 applications blocked by missing 'Notice Period' field.", icon: <Info />, type: 'warning', path: '/dashboard/settings' },
        { title: "Autopilot Max", desc: "Upgrade to apply to 100+ jobs per month automatically.", icon: <Sparkles />, type: 'promo', path: '/pricing' },
        { title: "Rule Tuning", desc: "Rule #2 is generating poor matches. Try narrowing location filters.", icon: <Settings />, type: 'info', path: '/dashboard/jobs?tab=rules' },
        { title: "AI Interview Prep", desc: "Generate tailored questions for your auto-applied roles.", icon: <Brain />, type: 'promo', path: '/dashboard/interview' }
      ]
    }
  };

  const config = configs[layoutType as 'cv' | 'tracker' | 'auto_apply'] || configs.cv;

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
      className="h-screen bg-[#f3f2ee] dark:bg-[var(--bg-primary)] text-[#0f172a] dark:text-gray-150 font-sans overflow-y-auto overflow-x-hidden selection:bg-[#83d60d]/30 relative scrollbar-hide"
      style={{ scrollBehavior: 'smooth' }}
    >
      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        body {
          overflow: hidden;
        }
      `}</style>

      {/* Admin Layout Switcher */}
      {isAdmin && (
        <div className="fixed bottom-6 right-6 z-[60] flex gap-2 bg-white/90 dark:bg-black/90 p-2 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-800">
          {(['cv', 'tracker', 'auto_apply'] as const).map(t => (
            <button 
              key={t}
              onClick={() => { setDemoLayoutType(t); setIsExpanded(false); triggerNotification(`Admin: Switched to ${t.toUpperCase()} mode`); }}
              className={`px-3 h-10 rounded-xl font-black text-[10px] uppercase transition-all ${layoutType === t ? 'bg-[#83d60d] text-slate-900 shadow-lg' : 'bg-slate-100 dark:bg-gray-800 text-slate-400 hover:bg-slate-200'}`}
            >
              {t.split('_')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 bg-[#0f172a] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-800"
          >
            <div className="w-2 h-2 rounded-full bg-[#83d60d] animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transparent Header (Standardized Position) */}
      <header className="w-full bg-transparent sticky top-0 z-40 transition-colors">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-sm">
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="w-[300px] lg:w-[400px]">
              <GlobalSearchBar />
            </div>
            <div className="flex items-center">
              <NotificationCenter />
            </div>
          </div>
        </div>
      </header>

      <motion.div 
        layout
        id="dashboard-container" 
        className={`max-w-6xl mx-auto px-4 md:px-6 ${isExpanded ? 'pt-2 pb-12' : 'pt-4 pb-24'}`}
      >
        
        {/* --- LAYER 1: GREETING ROW --- */}
        <motion.div 
          layout
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`flex flex-col md:flex-row items-center justify-between gap-6 border-gray-200 dark:border-gray-800 ${
            isExpanded ? 'mb-8 py-2 border-b pb-6' : 'mb-12'
          }`}
        >
          <motion.div layout className={isExpanded ? 'text-center md:text-left flex-1' : ''}>
            <motion.h1 
              layout
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`font-black tracking-tight text-[#0f172a] dark:text-white leading-tight ${
                isExpanded ? 'text-2xl' : 'text-5xl md:text-6xl'
              }`}
            >
              Hello, <span className="text-[#83d60d]">{session?.user?.name?.split(' ')[0] || 'Alex'}</span>
            </motion.h1>
            <motion.p 
              layout
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`text-slate-500 font-bold mt-1 ${
                isExpanded ? 'text-xs' : 'text-sm md:text-base'
              }`}
            >
              {config.subline}
            </motion.p>
          </motion.div>
 
          <motion.div 
            layout
            animate={{ scale: isExpanded ? 0.9 : 1, opacity: isExpanded ? 0.8 : 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white dark:bg-[#121317] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm p-4 flex items-center gap-4"
          >
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle className="text-slate-100 dark:text-gray-800" strokeWidth="4" stroke="currentColor" fill="none" cx="18" cy="18" r="16" />
                <circle 
                  className="text-[#83d60d] transition-all duration-1000" 
                  strokeWidth="4" 
                  strokeDasharray={`${(config.status.val / 100) * 100}, 100`}
                  strokeLinecap="round" stroke="currentColor" fill="none" cx="18" cy="18" r="16" 
                />
              </svg>
              <span className="absolute text-[10px] font-black dark:text-white">{config.status.val}</span>
            </div>
            <div className="pr-2">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{config.status.label}</h3>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-300">Calibrated</p>
            </div>
          </motion.div>
        </motion.div>
 
        {/* --- LAYER 2: KPI STRIP --- */}
        <motion.div 
          layout
          animate={{ scale: isExpanded ? 0.98 : 1, y: isExpanded ? -16 : 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8"
        >
          {config.kpis.map((kpi: any, idx: number) => {
            const isDarkColor = kpi.color === '#163d32' || kpi.color === '#1c4ce8';
            
            return (
              <motion.div 
                layout
                key={idx}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`relative overflow-hidden border border-gray-200 dark:border-gray-800 rounded-[32px] p-5 md:p-6 flex flex-col justify-between group shadow-sm cursor-pointer ${
                  isExpanded ? 'h-32' : 'h-44 md:h-48'
                }`}
                style={{ backgroundColor: kpi.color }}
                onClick={() => { 
                  if (kpi.path) {
                    router.push(kpi.path);
                    triggerNotification(`Opening ${kpi.label}...`);
                  } else {
                    setIsExpanded(true); 
                    triggerNotification(`Reviewing ${kpi.label}`); 
                  }
                }}
              >
                {/* Animated Background Icon */}
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700 rotate-12">
                  {React.cloneElement(kpi.icon, { className: "w-24 h-24 text-white animate-pulse" })}
                </div>

                <div className="flex justify-between items-start relative z-10">
                  <motion.div 
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkColor ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}
                  >
                    {React.cloneElement(kpi.icon, { className: "w-5 h-5" })}
                  </motion.div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkColor ? 'text-[#83d60d]' : 'text-slate-700'}`}>{kpi.cta}</span>
                </div>
                
                <div className="relative z-10">
                  <div className={`font-black group-hover:scale-105 transition-transform origin-left ${isDarkColor ? 'text-white' : 'text-slate-900'} ${isExpanded ? 'text-xl' : 'text-3xl md:text-4xl'}`}>
                    {kpi.val}
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${isDarkColor ? 'text-white/60' : 'text-slate-500'}`}>{kpi.label}</div>
                  {!isExpanded && <div className={`text-[10px] font-bold mt-1 ${isDarkColor ? 'text-[#83d60d]' : 'text-slate-800'}`}>{kpi.note}</div>}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* --- LAYER 3: FULL-WIDTH HERO WIDGET --- */}
        <motion.div 
          layout
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`bg-white dark:bg-[#121317] border border-gray-200 dark:border-gray-800 rounded-[40px] shadow-sm overflow-hidden relative ${
            isExpanded ? 'h-[400px] mb-8' : 'h-[500px] mb-12'
          }`}
        >
          <div className="p-8 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-lg font-black text-[#0f172a] dark:text-white">{config.type}</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Workflow Area</p>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-[#83d60d]" />
                <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-800" />
              </div>
            </div>
            <div className="flex-1">
              {config.hero}
            </div>
          </div>

          {/* Swipe-up Affordance */}
          {!isExpanded && (
            <div 
              onClick={() => setIsExpanded(true)}
              className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white dark:from-[#121317] via-white/80 dark:via-[#121317]/80 to-transparent flex flex-col items-center justify-center cursor-pointer group"
            >
              <div className="w-12 h-1 rounded-full bg-gray-200 dark:bg-gray-800 mb-3 group-hover:bg-[#83d60d] transition-colors" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">Swipe up for insights</span>
            </div>
          )}
        </motion.div>

        {/* --- HIDDEN ROWS (PROGRESSIVE DISCLOSURE) --- */}
        <motion.div 
          initial={false}
          animate={isExpanded ? {
            height: 'auto',
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
          } : {
            height: 0,
            opacity: 0,
            y: 20,
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
          }}
          className="overflow-hidden"
        >
          
          {layoutType === 'cv' && (
            <div className="bg-white dark:bg-[#121317] border border-gray-200 dark:border-gray-800 p-5 rounded-3xl shadow-sm mb-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                <div>
                  <h4 className="text-xs font-extrabold text-[#487e04] uppercase tracking-wider">Interactive CV Optimizer</h4>
                  <p className="text-[11px] text-gray-500 font-medium">Click each dynamic milestone to upgrade CV Score instantly</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-bold">Progress:</span>
                  <span className="text-xs font-extrabold bg-teal-50 dark:bg-[#80FF00]/10 text-teal-600 dark:text-[#80FF00] px-2 py-0.5 rounded-md">
                    {cvScore}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {checklist.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      const updatedChecklist = checklist.map(it => {
                        if (it.id === item.id) {
                          const nextState = !it.completed;
                          const scoreDiff = nextState ? it.addedScore : -it.addedScore;
                          setCvScore(prev => Math.min(100, Math.max(68, prev + scoreDiff)));
                          setProfileStrength(prev => Math.min(100, Math.max(68, prev + Math.round(scoreDiff * 0.8))));
                          return { ...it, completed: nextState };
                        }
                        return it;
                      });
                      setChecklist(updatedChecklist);
                      triggerNotification("Score updated dynamically!");
                    }}
                    className={`cursor-pointer border p-3 rounded-xl transition-all duration-300 flex items-center justify-between ${
                      item.completed 
                        ? 'bg-teal-50/40 border-teal-100 dark:bg-[#80FF00]/5 dark:border-[#80FF00]/25' 
                        : 'bg-slate-50/50 dark:bg-[#121317]/10 hover:bg-slate-50 dark:hover:bg-[#121317]/30 border-gray-150 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        item.completed 
                          ? 'bg-[#83d60d] border-[#83d60d] text-slate-900' 
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-[#121317]'
                      }`}>
                        {item.completed && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-[11px] font-semibold ${item.completed ? 'text-[#487e04] line-through' : 'text-gray-750 dark:text-gray-300'}`}>
                        {item.text}
                      </span>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      item.completed ? 'bg-[#e2f7aa] text-[#487e04]' : 'bg-gray-150 dark:bg-gray-800 text-gray-500'
                    }`}>
                      +{item.addedScore}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {config.hiddenRows.map((row: any, i: number) => (
              <div key={i} className="space-y-4">
                <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest ml-2">{row.title}</h3>
                <div className="bg-white dark:bg-[#121317] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-3">
                  {row.items.map((item: any, j: number) => (
                    <div 
                      key={j} 
                      onClick={() => config.hiddenRows[i].path && router.push(config.hiddenRows[i].path)}
                      className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-gray-800/30 rounded-2xl hover:bg-[#f9fdf0] dark:hover:bg-[#83d60d]/10 transition-colors cursor-pointer group"
                    >
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400 group-hover:text-[#487e04] dark:group-hover:text-[#83d60d]">{item}</span>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#83d60d]" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* FEATURED WIDGETS */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest ml-2">Featured Intelligence</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {config.featured.map((f: any, i: number) => (
                <div 
                  key={i} 
                  onClick={() => f.path && router.push(f.path)}
                  className={`text-white rounded-[32px] p-8 relative overflow-hidden group cursor-pointer ${
                    f.type === 'warning' ? 'bg-orange-600' : f.type === 'promo' ? 'bg-[#0f172a]' : 'bg-teal-700'
                  }`}
                >
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-2xl bg-[#83d60d] text-slate-900 flex items-center justify-center mb-4 shadow-lg shadow-[#83d60d]/20">
                      {f.icon}
                    </div>
                    <h4 className="text-lg font-black mb-2">{f.title}</h4>
                    <p className="text-sm font-medium text-white/80 leading-relaxed mb-6">{f.desc}</p>
                    <button className="text-[10px] font-black uppercase tracking-widest text-[#83d60d] hover:text-white transition-colors">Take Action →</button>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#83d60d]/10 blur-3xl -mr-16 -mt-16 group-hover:bg-[#83d60d]/20 transition-all duration-700" />
                </div>
              ))}
            </div>
          </div>

          {/* Collapse Button */}
          <div className="flex justify-center mt-16 pb-12">
            <button 
              onClick={() => { setIsExpanded(false); containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-[#83d60d] transition-all">
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-[#83d60d] transform rotate-180" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Back to top</span>
            </button>
          </div>

        </motion.div>

      </motion.div>
    </div>
  );
}

function LoadingFallback() {
  return <LoadingOverlay message="Initializing Dashboard" />;
}
