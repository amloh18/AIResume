'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useUserData } from '@/lib/hooks/useUserData';
import { MobileSidebarProvider, useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { JobJourneyProvider } from '@/contexts/JobJourneyContext';
import { DashboardDataProvider } from '@/contexts/DashboardDataContext';
import OptimizedNavigation from './OptimizedNavigation';
// DashboardRouter removed - using children prop directly
import CVCheckRedirect from './CVCheckRedirect';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';
import NotificationCenter from '@/components/notifications/NotificationCenter';

interface OptimizedDashboardLayoutProps {
  children?: React.ReactNode;
  noPadding?: boolean;
  bootstrapData?: any; // BootstrapData from useDashboardPrefetch
}

// Inner component that can access contexts
const DashboardContent: React.FC<{ children?: React.ReactNode; noPadding?: boolean }> = ({ children, noPadding }) => {
  const { user, loading: authLoading } = useUnifiedAuth();
  const { userData, loading: userLoading } = useUserData();
  const { isOpen: isMobileMenuOpen, toggleSidebar, isDesktopExpanded } = useMobileSidebar();

  // App Shell Pattern: Render layout structure immediately, regardless of data loading
  // This provides instant visual feedback and prevents layout shifts
  return (
    <div className="h-macro app-page-bg layout-stable overflow-hidden">
      <div className="flex h-full">
        {/* Desktop Sidebar - Hidden on sm/md, visible on lg and up */}
        {/* Render sidebar as a standard flex child on desktop so it pushes content naturally */}
         <div
           data-dashboard-sidebar
           className={`hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:z-[120] lg:py-0 lg:px-0 ${
             isDesktopExpanded ? 'lg:w-[280px]' : 'lg:w-[64px]'
           } overflow-visible pointer-events-auto transition-all duration-300 flex-shrink-0 bg-white dark:bg-[#141810]`}
         >
           <OptimizedNavigation />
         </div>

{/* Mobile/Small Screen Full-Screen Menu - Hidden on lg and up */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[120] bg-white dark:bg-[#141810] lg:hidden"
              >
                <OptimizedNavigation />
              </motion.div>
            )}
          </AnimatePresence>

        {/* Main Content - Always render shell to prevent CLS */}
        {/* Removed padding-left hacks since the sticky sidebar naturally pushes this flex-1 container */}
        <div className="flex flex-col flex-1 layout-stable relative z-0 transition-all duration-300 min-w-0">
          {/* Global Header */}
          <header className="w-full h-14 bg-white dark:bg-[#141810] flex items-center justify-between px-6 z-[60] sticky top-0 flex-shrink-0">
            {/* Left: Mobile hamburger menu toggle */}
            <div className="flex items-center w-[20%] sm:w-[25%] lg:hidden">
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Toggle menu"
              >
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Desktop Left Spacer */}
            <div className="hidden lg:block lg:w-[25%]" />

            {/* Center: Search Bar */}
            <div className="flex justify-center flex-1">
              <GlobalSearchBar />
            </div>

            {/* Right: Notifications */}
            <div className="flex justify-end w-[20%] sm:w-[25%]">
              <NotificationCenter />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto relative">
            <div className={`${noPadding ? '' : 'px-6 py-5'} h-full flex flex-col`}>
              <CVCheckRedirect>
                {children}
              </CVCheckRedirect>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

const OptimizedDashboardLayout: React.FC<OptimizedDashboardLayoutProps> = ({ children, noPadding, bootstrapData }) => {
  return (
    <MobileSidebarProvider>
      <JobJourneyProvider>
        <DashboardDataProvider bootstrapData={bootstrapData}>
          <DashboardContent noPadding={noPadding}>
            {children}
          </DashboardContent>
        </DashboardDataProvider>
      </JobJourneyProvider>
    </MobileSidebarProvider>
  );
};

export default OptimizedDashboardLayout;
