'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import AdminNavigation from '@/components/admin/AdminNavigation';
import RecentActivityPanel from '@/components/admin/RecentActivityPanel';
import { ADMIN_THEME } from '@/lib/config/adminTheme';

// Import admin components
import AdminKPIs from '@/components/admin/AdminKPIs';
import CVJourneyKPIs from '@/components/admin/CVJourneyKPIs';
import UserManagement from '@/components/admin/UserManagement';
import BusinessManagement from '@/components/admin/BusinessManagement';
import EmailCampaignManager from '@/components/admin/EmailCampaignManager';
import DraftManagement from '@/components/admin/DraftManagement';
import UnifiedNotificationManager from '@/components/admin/UnifiedNotificationManager';
import SystemHealth from '@/components/admin/SystemHealth';
import PricingPlanManager from '@/components/admin/PricingPlanManager';
import AIAnalytics from '@/components/admin/AIAnalytics';
import LogsViewer from '@/components/admin/LogsViewer';
import ContentAnalytics from '@/components/admin/ContentAnalytics';
import SponsorshipManager from '@/components/admin/SponsorshipManager';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  // Track if we've already fetched to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Extract admin user from session
  const user = session?.user as any;
  const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';

  // Hash-based navigation state
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('');

  // Parse hash from URL on mount and on hash change
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setActiveTab('overview');
        setActiveSubTab('');
        return;
      }

      const parts = hash.split('-');
      const section = parts[0];
      const subsection = parts.slice(1).join('-') || '';

      setActiveTab(section);
      setActiveSubTab(subsection);
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (tab: string, subTab?: string) => {
    const hash = subTab ? `${tab}-${subTab}` : tab;
    window.location.hash = hash;
    setActiveTab(tab);
    setActiveSubTab(subTab || '');
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

    if (hasFetchedRef.current || status === 'loading' || !isAdmin) {
      return;
    }
    hasFetchedRef.current = true;
  }, [status, isAdmin, router]);

  const fetchActivities = async () => {
    try {
      setActivitiesError(null);
      setActivitiesLoading(true);
      const response = await fetch('/api/admin/activity?limit=15');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setActivities(data.activities || []);
        } else {
          setActivitiesError('Invalid response format from server');
        }
      } else {
        setActivitiesError(`Failed to fetch activities: ${response.status}`);
      }
    } catch (error) {
      setActivitiesError('Network error');
    } finally {
      setActivitiesLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className={`min-h-screen ${ADMIN_THEME.page.background} flex items-center justify-center`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${ADMIN_THEME.loading.spinner} mx-auto mb-4`}></div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className={`min-h-screen ${ADMIN_THEME.page.background} layout-stable ${ADMIN_THEME.text.primary}`}>
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 lg:w-[280px] overflow-visible">
          <AdminNavigation 
            activeTab={activeTab} 
            activeSubTab={activeSubTab} 
            onTabChange={handleTabChange}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
        </div>

        {/* Mobile Full-Screen Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -280 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -280 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            >
              <div className="w-[280px] h-full bg-white">
                <AdminNavigation 
                  activeTab={activeTab} 
                  activeSubTab={activeSubTab} 
                  onTabChange={handleTabChange}
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex flex-col flex-1 lg:pl-[280px] h-screen overflow-hidden relative">
          
          {/* Mobile Header (only visible on small screens) */}
          <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600">
              <Menu className="w-6 h-6" />
            </button>
            <div className="font-bold text-lg">Admin Panel</div>
            <div className="w-10"></div> {/* Spacer */}
          </div>

          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Content Switching */}
              {activeTab === 'overview' && <AdminKPIs />}
              
              {activeTab === 'analytics' && activeSubTab === 'ai' && <AIAnalytics />}
              {activeTab === 'analytics' && activeSubTab === 'journey' && <CVJourneyKPIs />}
              {activeTab === 'analytics' && activeSubTab === 'content' && <ContentAnalytics />}
              {activeTab === 'analytics' && activeSubTab === 'logs' && <LogsViewer />}
              {activeTab === 'analytics' && activeSubTab === 'system' && <SystemHealth />}

              {activeTab === 'management' && activeSubTab === 'users' && <UserManagement />}
              {activeTab === 'management' && activeSubTab === 'businesses' && <BusinessManagement />}
              {activeTab === 'management' && activeSubTab === 'campaigns' && <EmailCampaignManager />}
              {activeTab === 'management' && activeSubTab === 'notifications' && <UnifiedNotificationManager />}
              {activeTab === 'management' && activeSubTab === 'drafts' && <DraftManagement />}
              {activeTab === 'management' && activeSubTab === 'sponsorships' && <SponsorshipManager />}

              {activeTab === 'pricing' && <PricingPlanManager />}

            </div>
          </main>
        </div>
      </div>

      {isActivityPanelOpen && (
        <RecentActivityPanel
          isOpen={isActivityPanelOpen}
          onClose={() => setIsActivityPanelOpen(false)}
          activities={activities}
          loading={activitiesLoading}
          error={activitiesError}
          onRefresh={fetchActivities}
        />
      )}
    </div>
  );
}
