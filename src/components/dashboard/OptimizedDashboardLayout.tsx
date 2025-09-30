'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useUserData } from '@/lib/hooks/useUserData';
import { MobileSidebarProvider, useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { JobJourneyProvider } from '@/contexts/JobJourneyContext';
import OptimizedNavigation from './OptimizedNavigation';
import DashboardRouter from './DashboardRouter';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:w-[335px] lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:p-2">
          <OptimizedNavigation />
        </div>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              className="fixed inset-y-0 left-0 z-50 w-[335px] p-2 lg:hidden"
            >
              <OptimizedNavigation />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
              onClick={toggleSidebar}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex flex-col flex-1 lg:pl-[335px]">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              Circle CV
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-white text-sm font-medium">
              {userData?.name?.charAt(0) || 'U'}
            </div>
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <DashboardRouter />
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
