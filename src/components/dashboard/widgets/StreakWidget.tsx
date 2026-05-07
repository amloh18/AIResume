'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Target, Calendar, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakWidgetProps {
  className?: string;
}

// Mock data
const streakData = {
  currentStreak: 7,
  longestStreak: 14,
  todayTasks: 3,
  completedToday: 2,
  weeklyGoal: 15,
  applicationsThisWeek: 8,
  lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
};

import { useDashboardData } from '@/contexts/DashboardDataContext';

export default function StreakWidget({ className }: StreakWidgetProps) {
  const { streak, secondaryLoading } = useDashboardData();
  const isLoading = secondaryLoading.streak;
  
  const weeklyProgress = Math.min(100, (streak.applicationsThisWeek / streak.weeklyGoal) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className={cn(
        'bg-white dark:bg-[#111317] rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden',
        className
      )}
    >
      {/* Background flame glow */}
      <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
            <Flame size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Application Streak
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Keep the momentum going!
            </p>
          </div>
        </div>
        <Trophy size={20} className="text-amber-500" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : (
        <>
          {/* Current streak */}
          <div className="relative z-10 flex items-center justify-center my-6">
            <div className="relative">
              {/* Animated flame behind number */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="absolute -inset-4 bg-orange-500/10 dark:bg-orange-400/10 rounded-full blur-md"
              />
              <span className="relative text-6xl font-black text-gray-900 dark:text-white block text-center">
                {streak.current}
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-4 relative z-10">
            day{streak.current !== 1 ? 's' : ''} streak 🔥
          </p>

          {/* Stats grid */}
          <div className="relative z-10 grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col items-center p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
              <Calendar size={14} className="text-violet-600 dark:text-violet-400 mb-1" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {streak.applicationsThisWeek}
              </span>
              <span className="text-[10px] text-gray-500">weekly apps</span>
            </div>
            <div className="flex flex-col items-center p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
              <Trophy size={14} className="text-amber-600 dark:text-amber-400 mb-1" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">{streak.longest}</span>
              <span className="text-[10px] text-gray-500">best ever</span>
            </div>
          </div>

          {/* Weekly progress */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Weekly Goal
              </span>
              <span className="text-xs text-gray-500">
                {streak.applicationsThisWeek}/{streak.weeklyGoal}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weeklyProgress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className={cn(
                  'h-full rounded-full',
                  weeklyProgress >= 100 ? 'bg-emerald-500' : 'bg-orange-500'
                )}
              />
            </div>
          </div>

          {/* Milestone celebration */}
          {streak.current >= 7 && (
            <div className="mt-3 pt-3 border-t border-orange-100 dark:border-orange-900/30 relative z-10">
              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1">
                🎉 {streak.current}-day streak! You&apos;re on fire!
              </p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
