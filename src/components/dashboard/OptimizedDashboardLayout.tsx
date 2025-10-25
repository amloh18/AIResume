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

  // Render immediately - pages handle their own loading states
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a230f]">
      <div className="flex h-screen">
        {/* Desktop Sidebar - Hidden on mobile and small screens, visible on xl and up */}
        <div className="hidden xl:flex xl:w-[335px] xl:flex-col xl:fixed xl:inset-y-0 xl:z-50 xl:p-1">
          <OptimizedNavigation />
        </div>

        {/* Mobile/Small Screen Sidebar - Hidden on xl and up */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              className="fixed inset-y-0 left-0 z-50 w-[335px] p-1 xl:hidden"
            >
              <OptimizedNavigation />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile/Small Screen Overlay - Hidden on xl and up */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black bg-opacity-50 xl:hidden"
              onClick={toggleSidebar}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex flex-col flex-1 xl:pl-[335px]">
          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
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
