'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, Bell, Command, ChevronRight, ChevronLeft, Activity, Calendar } from 'lucide-react';
import AdminNavigation from '@/components/admin/AdminNavigation';
import RecentActivityPanel from '@/components/admin/RecentActivityPanel';
import AdminLiveStatusBar from '@/components/admin/AdminLiveStatusBar';
import { ADMIN_THEME } from '@/lib/config/adminTheme';

// Import admin components
import AdminKPIs from '@/components/admin/AdminKPIs';
import CVJourneyKPIs from '@/components/admin/CVJourneyKPIs';
import UserManagement from '@/components/admin/UserManagement';
import EmailCampaignManager from '@/components/admin/EmailCampaignManager';
import DraftManagement from '@/components/admin/DraftManagement';
import UnifiedNotificationManager from '@/components/admin/UnifiedNotificationManager';
import SystemHealth from '@/components/admin/SystemHealth';
import PricingPlanManager from '@/components/admin/PricingPlanManager';
import AIAnalytics from '@/components/admin/AIAnalytics';
import LogsViewer from '@/components/admin/LogsViewer';
import ContentAnalytics from '@/components/admin/ContentAnalytics';
import SponsorshipManager from '@/components/admin/SponsorshipManager';
import UserActivityModal from '@/components/admin/UserActivityModal';
import JobIntelligenceDashboard from '@/components/admin/job-intelligence/JobIntelligenceDashboard';

const KNOWN_TABS = [
  'job-intelligence',
  'management',
  'pricing',
  'analytics',
  'overview',
];

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const params = useParams();

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track if we've already fetched to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Extract admin user from session
  const user = session?.user as any;
  const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';

  // Path-based navigation state derived from URL (hyphen-safe parsing)
  const slug = params?.slug as string[] | undefined;
  const rawPath = slug?.[0] || 'overview';
  const userIdParam = slug?.[1];

  let activeTab = 'overview';
  let activeSubTab = '';

  for (const knownTab of KNOWN_TABS) {
    if (rawPath === knownTab) {
      activeTab = knownTab;
      activeSubTab = 'overview';
      break;
    } else if (rawPath.startsWith(`${knownTab}-`)) {
      activeTab = knownTab;
      activeSubTab = rawPath.substring(knownTab.length + 1);
      break;
    }
  }

  if (activeTab === 'overview' && rawPath !== 'overview') {
    const parts = rawPath.split('-');
    activeTab = parts[0];
    activeSubTab = parts.slice(1).join('-') || '';
  }

  // Update URL path when tab changes
  const handleTabChange = (tab: string, subTab?: string) => {
    const pathSegment = subTab ? `${tab}-${subTab}` : tab;
    router.push(`/admin/dashboard/${pathSegment}`);
    if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/admin/login';
      return;
    }
    if (status === 'authenticated' && !isAdmin) {
      window.location.href = '/dashboard';
      return;
    }
  }, [status, isAdmin]);

  const fetchActivities = async () => {
    try {
      setActivitiesError(null);
      setActivitiesLoading(true);
      const response = await fetch('/api/admin/activity?limit=15');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch {
      setActivitiesError('Network error');
    } finally {
      setActivitiesLoading(false);
    }
  };

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"
        />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-emerald-500/30 overflow-hidden">
      <div className="flex h-screen relative">
        
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 lg:w-[300px]">
          <AdminNavigation 
            activeTab={activeTab} 
            activeSubTab={activeSubTab} 
            onTabChange={handleTabChange}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
        </div>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md lg:hidden"
            >
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-[300px] h-full"
              >
                <AdminNavigation 
                  activeTab={activeTab} 
                  activeSubTab={activeSubTab} 
                  onTabChange={handleTabChange}
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Workspace */}
        <div className="flex flex-col flex-1 lg:pl-[300px] h-screen overflow-hidden relative z-10">
          
          {/* Header (FlowMate inspired with merged inner breadcrumb) */}
          <header className="h-16 flex items-center justify-between px-6 lg:px-8 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-xl z-30 shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="lg:hidden p-2 text-white/60 hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Merged Breadcrumbs & Back Navigation */}
              {userIdParam ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/admin/dashboard/management-users')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold transition-all group"
                  >
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back to Users</span>
                  </button>
                  <div className="hidden sm:flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/30">
                    <span className="cursor-pointer hover:text-white transition-colors" onClick={() => handleTabChange('overview')}>Admin</span>
                    <span>/</span>
                    <span className="cursor-pointer hover:text-white transition-colors" onClick={() => handleTabChange('management', 'users')}>Management</span>
                    <span>/</span>
                    <span className="cursor-pointer hover:text-white transition-colors" onClick={() => handleTabChange('management', 'users')}>Users</span>
                    <span>/</span>
                    <span className="text-emerald-400 font-bold">User 360</span>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/30">
                  <Command className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="cursor-pointer hover:text-white transition-colors" onClick={() => handleTabChange('overview')}>Admin</span>
                  <span>/</span>
                  <span className={`cursor-pointer hover:text-white transition-colors ${!activeSubTab ? 'text-emerald-400 font-bold' : ''}`} onClick={() => handleTabChange(activeTab)}>
                    {activeTab}
                  </span>
                  {activeSubTab && (
                    <>
                      <span>/</span>
                      <span 
                        className="text-emerald-400 font-bold cursor-pointer hover:text-emerald-300 transition-colors"
                        onClick={() => handleTabChange(activeTab, activeSubTab)}
                      >
                        {activeSubTab}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Top Right Actions (Search, Date, Notifications, User) */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Search Bar */}
              <div className="hidden md:flex items-center relative group">
                <Search className="absolute left-3.5 w-4 h-4 text-white/30 group-focus-within:text-emerald-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search users, tasks, analytics..."
                  className="bg-white/5 border border-white/5 rounded-xl py-1.5 pl-10 pr-9 w-64 lg:w-72 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:bg-white/10 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute right-2.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/30 font-mono">
                  ⌘K
                </div>
              </div>

              {/* Date Filter Pill */}
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 font-medium">
                <Calendar className="w-3.5 h-3.5 text-white/40" />
                <span>Last 7 days</span>
              </div>

              {/* Live Activity Button */}
              <button 
                onClick={() => {
                  fetchActivities();
                  setIsActivityPanelOpen(true);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-emerald-400 transition-all relative"
                title="Activity Log"
              >
                <Activity className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              </button>

              {/* Notification Bell with Badge */}
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-white transition-all relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center border-2 border-[#0a0a0a]">
                  3
                </span>
              </button>
            </div>
          </header>

          {/* Dynamic Content Surface */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-hide">
            <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${activeSubTab}`}
                  initial={{ opacity: 0, y: 15, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 1.01 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="min-h-full"
                >
                  {/* Content Mapping */}
                  {activeTab === 'overview' && <AdminKPIs onTabChange={handleTabChange} />}
                  
                  {activeTab === 'analytics' && activeSubTab === 'ai' && <AIAnalytics />}
                  {activeTab === 'analytics' && activeSubTab === 'journey' && <CVJourneyKPIs />}
                  {activeTab === 'analytics' && activeSubTab === 'content' && <ContentAnalytics />}
                  {activeTab === 'analytics' && activeSubTab === 'logs' && <LogsViewer />}
                  {activeTab === 'analytics' && activeSubTab === 'system' && <SystemHealth />}

                  {activeTab === 'management' && activeSubTab === 'users' && (
                    userIdParam ? (
                      <UserActivityModal 
                        userId={userIdParam} 
                        isOpen={true} 
                        onClose={() => router.push('/admin/dashboard/management-users')} 
                      />
                    ) : (
                      <UserManagement searchQuery={searchQuery} />
                    )
                  )}
                  
                  {activeTab === 'management' && activeSubTab === 'campaigns' && <EmailCampaignManager />}
                  {activeTab === 'management' && activeSubTab === 'notifications' && <UnifiedNotificationManager />}
                  {activeTab === 'management' && activeSubTab === 'drafts' && <DraftManagement />}
                  {activeTab === 'management' && activeSubTab === 'sponsorships' && <SponsorshipManager />}

                  {activeTab === 'job-intelligence' && (
                    <JobIntelligenceDashboard
                      activeSubTab={activeSubTab || 'overview'}
                      onSubTabChange={(sub) => handleTabChange('job-intelligence', sub)}
                    />
                  )}

                  {activeTab === 'pricing' && (
                    <PricingPlanManager 
                      activeSubTab={activeSubTab || 'plans'} 
                      onSubTabChange={(sub) => handleTabChange('pricing', sub)} 
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Live System Status Bar */}
          <AdminLiveStatusBar />
        </div>
      </div>

      <RecentActivityPanel
        isOpen={isActivityPanelOpen}
        onClose={() => setIsActivityPanelOpen(false)}
        activities={activities}
        loading={activitiesLoading}
        error={activitiesError}
        onRefresh={fetchActivities}
      />
    </div>
  );
}
