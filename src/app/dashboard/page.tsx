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
  Settings
} from 'lucide-react';
import RouteGuard from '@/components/auth/RouteGuard';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import RedesignedDashboardView from '@/components/dashboard/redesigned/RedesignedDashboardView';
import { UserTier } from '@/types/dashboard-widgets';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { useMembership } from '@/lib/hooks/useMembership';

// --- Specialized Hero Widgets (Legacy removed or moved if needed) ---

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
  const { membership, loading: membershipLoading } = useMembership();
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [cvScore, setCvScore] = useState(68);
  const [notification, setNotification] = useState<string | null>(null);
  const [demoLayoutType, setDemoLayoutType] = useState<'cv' | 'tracker' | 'auto_apply' | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    // Only fetching onboarding status for non-redirect purposes if needed.
    // The actual redirection is now handled in the server-side layout.
    const fetchStatus = async () => {
      try {
        const res = await authenticatedFetch('/api/user/onboarding');
        const result = await res.json();
        if (result.success && result.data) {
          const onboarding = result.data.onboarding || {};
          setOnboardingData(onboarding);
          
          if (onboarding.confidence_score) {
            setCvScore(onboarding.confidence_score);
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
  }, [status]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setJobsLoading(true);
        const res = await authenticatedFetch('/api/jobs');
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setJobs(result.data);
        }
      } catch (err) {
        console.error('Failed to load jobs:', err);
      } finally {
        setJobsLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchJobs();
    }
  }, [status]);

  // Calculate matched jobs stats
  const activeJobs = jobs.filter((j: any) => !['draft', 'archived'].includes(j.status)).length;
  const highMatchJobs = jobs.filter((j: any) => (j.atsScore || 0) >= 80).length;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50; // Lowered threshold for better responsiveness
    const isDownSwipe = distance < -50;

    if (isUpSwipe && !isExpanded) {
      setIsExpanded(true);
    } else if (isDownSwipe && isExpanded && containerRef.current && containerRef.current.scrollTop === 0) {
      setIsExpanded(false);
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 30 && !isExpanded) { // Lowered threshold
      setIsExpanded(true);
    } else if (e.deltaY < -30 && isExpanded && containerRef.current && containerRef.current.scrollTop === 0) {
      setIsExpanded(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 10 && !isExpanded) { // Lowered threshold
      setIsExpanded(true);
    } else if (scrollTop <= 2 && isExpanded) {
      setIsExpanded(false);
    }
  };

  // Let onboarding data and membership load in the background to speed up dashboard initial paint
  // Only show fallback loader if we explicitly need to redirect due to pending onboarding activation
  if (onboardingData?.activation_status === 'pending' && onboardingData?.activation_route) {
    return <LoadingFallback />;
  }

  const userRole = (session?.user as any)?.role || 'user';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  
  // Determine layout type based on active plan (membership)
  let layoutType: 'cv' | 'tracker' | 'auto_apply' = 'cv';
  if (demoLayoutType) {
    layoutType = demoLayoutType;
  } else if (membership?.planKey) {
    const planKeyLower = membership.planKey.toLowerCase();
    if (planKeyLower.startsWith('smart') || planKeyLower.startsWith('pro')) {
      layoutType = 'auto_apply';
    } else if (planKeyLower.startsWith('focused')) {
      layoutType = 'tracker';
    } else if (planKeyLower.startsWith('starter')) {
      layoutType = 'cv';
    } else {
      layoutType = onboardingData?.dashboard_layout_type || 'cv';
    }
  } else {
    layoutType = onboardingData?.dashboard_layout_type || 'cv';
  }

  const tierMap: Record<string, UserTier> = {
    cv: 'starter',
    tracker: 'focused',
    auto_apply: 'smart'
  };
  const currentTier = tierMap[layoutType] || 'starter';

  const sublines: Record<string, string> = {
    starter: `${highMatchJobs} of ${activeJobs} jobs matched.`,
    focused: `${highMatchJobs} of ${activeJobs} jobs matched.`,
    smart: `${highMatchJobs} of ${activeJobs} jobs matched.`
  };

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
      className="h-screen bg-[#f3f2ee] dark:bg-[var(--bg-primary)] text-[#0f172a] dark:text-gray-150 font-sans overflow-y-auto overflow-x-hidden selection:bg-[#83d60d]/30 relative scrollbar-hide pb-20"
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
          touch-action: pan-y;
        }
      `}</style>

      {/* Admin Layout Switcher - Hidden until hover in corner */}
      {isAdmin && (
        <div className="fixed bottom-0 right-0 z-[60] group">
          {/* Trigger Area - Small but accessible */}
          <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-auto" />
          
          <div className="relative mb-6 mr-6 flex gap-2 bg-white/90 dark:bg-black/90 p-2 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto transform translate-y-4 group-hover:translate-y-0 translate-x-4 group-hover:translate-x-0">
            {(['cv', 'tracker', 'auto_apply'] as const).map(t => (
              <button 
                key={t}
                onClick={() => { setDemoLayoutType(t); triggerNotification(`Admin: Switched to ${t.toUpperCase()} mode`); }}
                className={`px-3 h-10 rounded-xl font-black text-[10px] uppercase transition-all ${layoutType === t ? 'bg-[#83d60d] text-slate-900 shadow-lg' : 'bg-slate-100 dark:bg-gray-800 text-slate-400 hover:bg-slate-200'}`}
              >
                {t.split('_')[0]}
              </button>
            ))}
          </div>
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



      <motion.div 
        layout
        id="dashboard-container" 
        className={`max-w-6xl mx-auto px-4 md:px-6 ${isExpanded ? 'pt-2 pb-12' : 'pt-4'}`}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
                isExpanded ? 'text-4xl' : 'text-5xl md:text-6xl'
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
              {sublines[currentTier]}
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
                  strokeDasharray={`${Math.min(100, (highMatchJobs / Math.max(activeJobs, 1)) * 100)}, 100`}
                  strokeLinecap="round" stroke="currentColor" fill="none" cx="18" cy="18" r="16" 
                />
              </svg>
              <span className="absolute text-[10px] font-black dark:text-white">{highMatchJobs}</span>
            </div>
            <div className="pr-2">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Jobs Matched</h3>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-300">
                {highMatchJobs} / {activeJobs} matched
              </p>
            </div>
          </motion.div>
        </motion.div>
 
        {/* --- LAYER 2+: REDESIGNED VIEW --- */}
        <motion.div
          layout
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <RedesignedDashboardView tier={currentTier} isExpanded={isExpanded} />
        </motion.div>

        {/* Swipe Up Affordance & Collapse Button */}
        <AnimatePresence>
          {!isExpanded ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 inset-x-0 flex flex-col items-center justify-center pointer-events-none z-50"
            >
              <div 
                className="flex flex-col items-center gap-2 cursor-pointer pointer-events-auto"
                onClick={() => setIsExpanded(true)}
              >
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="w-12 h-1 bg-[#83d60d] rounded-full shadow-lg shadow-[#83d60d]/20"
                />
                <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.3em] ml-1">Swipe up for insights</span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex justify-center mt-16 pb-12"
            >
              <button 
                onClick={() => { setIsExpanded(false); containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-[#83d60d] transition-all">
                  <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-[#83d60d] transform rotate-180" />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Back to top</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}

function LoadingFallback() {
  return <LoadingOverlay message="Initializing Dashboard" />;
}
