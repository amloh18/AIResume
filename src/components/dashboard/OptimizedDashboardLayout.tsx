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

interface OptimizedDashboardLayoutProps {
  children?: React.ReactNode;
}

// Inner component that can access contexts
const DashboardContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useUnifiedAuth();
  const { userData, loading: userLoading } = useUserData();
  const { isOpen: isMobileMenuOpen, toggleSidebar, isDesktopExpanded } = useMobileSidebar();

  // App Shell Pattern: Render layout structure immediately, regardless of data loading
  // This provides instant visual feedback and prevents layout shifts
  return (
    <div className="min-h-screen bg-[#f3f2ee] dark:bg-[#1a230f] layout-stable">
      <div className="flex h-screen">
        {/* Desktop Sidebar - Hidden on sm/md, visible on lg and up */}
        {/* Render sidebar as a standard flex child on desktop so it pushes content naturally */}
         <div
           data-dashboard-sidebar
           className={`hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:z-40 lg:py-0 lg:px-0 ${
             isDesktopExpanded ? 'lg:w-[280px]' : 'lg:w-[84px]'
           } overflow-visible pointer-events-auto transition-all duration-300 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141810]`}
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
                className="fixed inset-0 z-40 bg-white dark:bg-[#141810] lg:hidden"
              >
                <OptimizedNavigation />
              </motion.div>
            )}
          </AnimatePresence>

        {/* Main Content - Always render shell to prevent CLS */}
        {/* Removed padding-left hacks since the sticky sidebar naturally pushes this flex-1 container */}
        <div className="flex flex-col flex-1 layout-stable relative z-0 transition-all duration-300 min-w-0">
          {/* Page Content */}
          <main className="flex-1 overflow-auto relative z-0">
            <div className="px-6 pb-[10px] h-full flex flex-col">
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

const OptimizedDashboardLayout: React.FC<OptimizedDashboardLayoutProps> = ({ children }) => {
  return (
    <MobileSidebarProvider>
      <JobJourneyProvider>
        <DashboardDataProvider>
          <DashboardContent>
            {children}
          </DashboardContent>
        </DashboardDataProvider>
      </JobJourneyProvider>
    </MobileSidebarProvider>
  );
};

export default OptimizedDashboardLayout;
