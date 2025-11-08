'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useUserData } from '@/lib/hooks/useUserData';
import { MobileSidebarProvider, useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { JobJourneyProvider } from '@/contexts/JobJourneyContext';
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
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();

  // App Shell Pattern: Render layout structure immediately, regardless of data loading
  // This provides instant visual feedback and prevents layout shifts
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a230f] layout-stable">
      <div className="flex h-screen">
        {/* Desktop Sidebar - Hidden on sm/md, visible on lg and up */}
        {/* Always render sidebar shell for layout stability */}
        <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:py-0.5 lg:px-0.5 lg:w-[108px] xl:w-[108px] 2xl:w-[335px] overflow-visible">
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
              className="fixed inset-0 z-50 bg-white dark:bg-[#141810] lg:hidden"
            >
              <OptimizedNavigation />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content - Always render shell to prevent CLS */}
        <div className="flex flex-col flex-1 lg:pl-[108px] xl:pl-[108px] 2xl:pl-[335px] layout-stable">
          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6 pb-[10px]">
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
        <DashboardContent>
          {children}
        </DashboardContent>
      </JobJourneyProvider>
    </MobileSidebarProvider>
  );
};

export default OptimizedDashboardLayout;
