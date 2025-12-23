'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Filter, ChevronDown, Plus, Menu, X, Columns3, List, AlertCircle } from 'lucide-react';
import FocusModeToggle from './FocusModeToggle';
import PageHeader from '@/components/dashboard/PageHeader';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useJobLimit } from '@/hooks/useJobLimit';

interface JobsHeaderProps {
  onAddJob?: () => void; // Deprecated - kept for backward compatibility
  onQuickAdd?: () => void;
  onToggleFilters: () => void;
  showFilters: boolean;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  viewMode: 'kanban' | 'list';
  onViewModeChange: (mode: 'kanban' | 'list') => void;
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
  const { limitInfo: hookLimitInfo } = useJobLimit();
  const limitInfo = jobLimitInfo || hookLimitInfo;

  return (
    <div className="space-y-3 sm:space-y-4 pb-2">
      <PageHeader
        title="Application Tracker"
        description="Manage your job applications with integrated CV journeys"
        user={user}
        onMobileMenuToggle={onMobileMenuToggle}
        isMobileMenuOpen={isMobileMenuOpen}
        rightContent={
          <>
            {/* Job Limit Indicator */}
            {limitInfo && !limitInfo.isUnlimited && (
              <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${
                limitInfo.remaining === 0 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                  : limitInfo.remaining <= 1
                    ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}>
                <span className="font-medium">
                  Jobs: {limitInfo.currentCount}/{limitInfo.limit}
                </span>
                {limitInfo.remaining === 0 && (
                  <>
                    <span>•</span>
                    <span className="font-semibold flex items-center gap-1">
                      <AlertCircle size={14} />
                      Limit Reached
                    </span>
                  </>
                )}
              </div>
            )}
            {/* Mobile: Show hamburger menu */}
            <button
              onClick={onMobileMenuToggle}
              className="tablet:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0 w-6 h-6 flex items-center justify-center"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <GlobalSearchBar />
            <NotificationCenter />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 tablet:gap-3 mt-0 mb-4">
        <div className="flex items-center flex-wrap gap-2 tablet:gap-3 ml-auto w-full tablet:w-auto justify-end pr-1">
          {/* Quick Add Button (Magic Paste) */}
          {onQuickAdd && (
            <motion.button
              onClick={onQuickAdd}
              disabled={limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0}
              className={`p-2 tablet:px-3 tablet:px-4 tablet:py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg h-[36px] ${
                limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black'
              }`}
              whileHover={limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0 ? {} : { scale: 1.02 }}
              whileTap={limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0 ? {} : { scale: 0.98 }}
              title={limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0 ? 'Tracker Full - Upgrade' : 'Quick Add (Magic Paste)'}
            >
              <Plus size={16} />
              <span className="hidden tablet:inline">
                {limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0 ? 'Limit Reached' : 'Quick Add'}
              </span>
            </motion.button>
          )}

          {/* Focus Mode Toggle */}
          <FocusModeToggle />

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 rounded-lg p-0.5 h-[36px]">
            <motion.button
              onClick={() => onViewModeChange('kanban')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 h-full ${viewMode === 'kanban'
                  ? 'bg-white dark:bg-[#2a3a1f] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Kanban View"
            >
              <Columns3 size={16} />
              <span className="hidden sm:inline">Kanban</span>
            </motion.button>
            <motion.button
              onClick={() => onViewModeChange('list')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 h-full ${viewMode === 'list'
                  ? 'bg-white dark:bg-[#2a3a1f] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="List View"
            >
              <List size={16} />
              <span className="hidden sm:inline">List</span>
            </motion.button>
          </div>

          <motion.button
            onClick={onToggleFilters}
            className={`p-2 tablet:px-3 tablet:px-4 tablet:py-2 rounded-lg text-sm font-medium border transition-all duration-200 flex items-center gap-2 flex-shrink-0 h-[36px] min-w-0 ${showFilters
              ? 'bg-gray-200 dark:bg-[#2a3a1f] border-gray-400 dark:border-lime-500/40 text-gray-900 dark:text-white'
              : 'bg-gray-100 dark:bg-[#232f1c] border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#2a3a1f]'
              }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="Sort & Filter"
          >
            <Filter size={16} className="flex-shrink-0" />
            <span className="hidden tablet:inline truncate">Sort & Filter</span>
            <ChevronDown
              size={16}
              className={`hidden tablet:inline flex-shrink-0 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
            />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default JobsHeader;

