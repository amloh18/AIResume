'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, Plus, Columns3, List, AlertCircle } from 'lucide-react';
import FocusModeToggle from './FocusModeToggle';
import PageHeader from '@/components/dashboard/PageHeader';

interface JobsHeaderProps {
  onAddJob?: () => void; // Deprecated - kept for backward compatibility
  onQuickAdd?: () => void;
  onToggleFilters: () => void;
  showFilters: boolean;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  viewMode: 'kanban' | 'list';
  onViewModeChange: (mode: 'kanban' | 'list') => void;
  jobLimitInfo?: any; // Added to receive limit info from parent
  user: {
    name: string;
    email: string;
    username?: string;
    profilePhoto?: string;
    designation?: string;
    subscription?: any;
    isEmailVerified?: boolean;
  };
}

const JobsHeader: React.FC<JobsHeaderProps> = ({
  onQuickAdd,
  onToggleFilters,
  showFilters,
  onMobileMenuToggle,
  isMobileMenuOpen = false,
  viewMode,
  onViewModeChange,
  user,
  jobLimitInfo
}) => {
  const limitInfo = jobLimitInfo;


  return (
    <PageHeader
      user={user}
      onMobileMenuToggle={onMobileMenuToggle}
      isMobileMenuOpen={isMobileMenuOpen}
      actions={
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 justify-end">
          {/* Job Limit Indicator */}
          {limitInfo && !limitInfo.isUnlimited && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border h-[36px] ${
              limitInfo.remaining === 0
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : limitInfo.remaining <= 1
                  ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                  : 'bg-white dark:bg-black/20 border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300'
            }`}>
              <span className="font-semibold">
                Jobs: {limitInfo.currentCount}/{limitInfo.limit}
              </span>
              {limitInfo.remaining === 0 && (
                <>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <span className="font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider text-red-500">
                    <AlertCircle size={12} />
                    Full
                  </span>
                </>
              )}
            </div>
          )}

          {/* Quick Add Button */}
          {onQuickAdd && (
            <motion.button
              onClick={onQuickAdd}
              disabled={limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0}
              className={`h-[36px] flex items-center justify-center gap-2 px-3 sm:px-4 text-sm font-bold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex-shrink-0 ${
                limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-[#80FF00] hover:bg-[#70DF00] text-black active:scale-95'
              }`}
              whileHover={limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0 ? {} : { scale: 1.02 }}
              whileTap={limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0 ? {} : { scale: 0.98 }}
              title={limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0 ? 'Tracker Full - Upgrade' : 'Quick Add (Magic Paste)'}
            >
              <Plus size={16} className="flex-shrink-0" />
              <span>Quick Add</span>
            </motion.button>
          )}

          {/* Focus Mode Toggle */}
          <FocusModeToggle />

          {/* Kanban/List View Mode Toggle */}
          <motion.button
            onClick={() => onViewModeChange(viewMode === 'kanban' ? 'list' : 'kanban')}
            className="h-[36px] flex items-center justify-center gap-2 px-3 sm:px-4 text-sm font-medium rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200 bg-white dark:bg-black/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer flex-shrink-0"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={viewMode === 'kanban' ? 'Switch to List View' : 'Switch to Kanban View'}
          >
            {viewMode === 'kanban' ? (
              <>
                <List size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className="hidden xs:inline">List View</span>
              </>
            ) : (
              <>
                <Columns3 size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className="hidden xs:inline">Kanban View</span>
              </>
            )}
          </motion.button>

          {/* Filters & Sorting Button */}
          <motion.button
            onClick={onToggleFilters}
            className={`h-[36px] flex items-center justify-center gap-2 px-3 sm:px-4 text-sm rounded-xl border transition-all duration-200 cursor-pointer flex-shrink-0 ${
              showFilters
                ? 'text-lime-600 dark:text-[#80FF00] font-semibold bg-lime-500/5 dark:bg-lime-500/10 border-lime-500/30 dark:border-lime-500/30'
                : 'bg-white dark:bg-black/20 border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 font-medium'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="Toggle Filters & Sorting"
          >
            <Filter size={16} className={showFilters ? 'text-lime-600 dark:text-[#80FF00]' : 'text-gray-500 dark:text-gray-400'} />
            <span className="hidden sm:inline">Filters & Sorting</span>
            <span className="hidden xs:inline sm:hidden">Filters</span>
          </motion.button>
        </div>
      }
    />
  );
};

export default JobsHeader;
