'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Filter, Calendar, DollarSign, Star, Clock } from 'lucide-react';

interface JobsFiltersProps {
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  sortBy: 'lastUpdated' | 'followUpDate' | 'salaryRange' | 'priority';
  setSortBy: (sort: 'lastUpdated' | 'followUpDate' | 'salaryRange' | 'priority') => void;
  lastUpdatedFilter: 'today' | 'last7days' | 'last30days' | 'all';
  setLastUpdatedFilter: (filter: 'today' | 'last7days' | 'last30days' | 'all') => void;
  followUpFilter: 'upcoming' | 'overdue' | 'all';
  setFollowUpFilter: (filter: 'upcoming' | 'overdue' | 'all') => void;
  salaryRangeFilter: 'all' | 'under50k' | '50k-75k' | '75k-100k' | '100k-150k' | '150k-200k' | 'over200k';
  setSalaryRangeFilter: (filter: 'all' | 'under50k' | '50k-75k' | '75k-100k' | '100k-150k' | '150k-200k' | 'over200k') => void;
  priorityFilter: 'high' | 'medium' | 'low' | 'all';
  setPriorityFilter: (filter: 'high' | 'medium' | 'low' | 'all') => void;
  onClose: () => void;
}

const JobsFilters: React.FC<JobsFiltersProps> = ({
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  lastUpdatedFilter,
  setLastUpdatedFilter,
  followUpFilter,
  setFollowUpFilter,
  salaryRangeFilter,
  setSalaryRangeFilter,
  priorityFilter,
  setPriorityFilter,
  onClose
}) => {
  const hasActiveFilters = filterStatus !== 'all' ||
    sortBy !== 'lastUpdated' ||
    lastUpdatedFilter !== 'all' ||
    followUpFilter !== 'all' ||
    salaryRangeFilter !== 'all' ||
    priorityFilter !== 'all';

  const clearAllFilters = () => {
    setFilterStatus('all');
    setSortBy('lastUpdated');
    setLastUpdatedFilter('all');
    setFollowUpFilter('all');
    setSalaryRangeFilter('all');
    setPriorityFilter('all');
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gray-50 dark:bg-[#1A201A] border border-gray-200 dark:border-lime-500/20 rounded-xl p-4 mb-4 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters & Sorting</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close filters"
          >
            <X size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="created">Staging</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Clock size={14} />
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'lastUpdated' | 'followUpDate' | 'salaryRange' | 'priority')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="lastUpdated">Last Updated</option>
            <option value="followUpDate">Follow-up Date</option>
            <option value="salaryRange">Salary Range</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Star size={14} />
            Priority
          </label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'high' | 'medium' | 'low' | 'all')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Last Updated Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Calendar size={14} />
            Last Updated
          </label>
          <select
            value={lastUpdatedFilter}
            onChange={(e) => setLastUpdatedFilter(e.target.value as 'today' | 'last7days' | 'last30days' | 'all')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
          </select>
        </div>

        {/* Follow-up Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Follow-up</label>
          <select
            value={followUpFilter}
            onChange={(e) => setFollowUpFilter(e.target.value as 'upcoming' | 'overdue' | 'all')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Salary Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <DollarSign size={14} />
            Salary Range
          </label>
          <select
            value={salaryRangeFilter}
            onChange={(e) => setSalaryRangeFilter(e.target.value as 'all' | 'under50k' | '50k-75k' | '75k-100k' | '100k-150k' | '150k-200k' | 'over200k')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Ranges</option>
            <option value="under50k">Under $50k</option>
            <option value="50k-75k">$50k - $75k</option>
            <option value="75k-100k">$75k - $100k</option>
            <option value="100k-150k">$100k - $150k</option>
            <option value="150k-200k">$150k - $200k</option>
            <option value="over200k">Over $200k</option>
          </select>
        </div>
      </div>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-lime-500/20">
          <div className="flex flex-wrap gap-2">
            {filterStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs">
                Status: {filterStatus}
                <button
                  onClick={() => setFilterStatus('all')}
                  className="ml-1 hover:text-blue-900 dark:hover:text-blue-300"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {priorityFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs">
                Priority: {priorityFilter}
                <button
                  onClick={() => setPriorityFilter('all')}
                  className="ml-1 hover:text-yellow-900 dark:hover:text-yellow-300"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {lastUpdatedFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
                Updated: {lastUpdatedFilter}
                <button
                  onClick={() => setLastUpdatedFilter('all')}
                  className="ml-1 hover:text-green-900 dark:hover:text-green-300"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {followUpFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs">
                Follow-up: {followUpFilter}
                <button
                  onClick={() => setFollowUpFilter('all')}
                  className="ml-1 hover:text-purple-900 dark:hover:text-purple-300"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {salaryRangeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs">
                Salary: {salaryRangeFilter}
                <button
                  onClick={() => setSalaryRangeFilter('all')}
                  className="ml-1 hover:text-orange-900 dark:hover:text-orange-300"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default JobsFilters;

