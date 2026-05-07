'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Briefcase,
  Calendar,
  TrendingUp,
  Sparkles,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

import { useDashboardData } from '@/contexts/DashboardDataContext';

interface ActivityFeedProps {
  className?: string;
}

interface ActivityItem {
  id: string;
  type: 'cv_updated' | 'applied' | 'interview' | 'improvement' | 'recommendation';
  message: string;
  timestamp: Date | string;
  metadata?: Record<string, any>;
}

const getIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'cv_updated':
      return FileText;
    case 'applied':
      return Briefcase;
    case 'interview':
      return Calendar;
    case 'improvement':
      return TrendingUp;
    case 'recommendation':
      return Sparkles;
    default:
      return CheckCircle;
  }
};

const getIconColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'cv_updated':
      return 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400';
    case 'applied':
      return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400';
    case 'interview':
      return 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400';
    case 'improvement':
      return 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400';
    case 'recommendation':
      return 'bg-lime-100 dark:bg-lime-900/40 text-lime-600 dark:text-lime-400';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
  }
};

export default function ActivityFeed({ className }: ActivityFeedProps) {
  const { activities, secondaryLoading } = useDashboardData();
  const isLoading = secondaryLoading.activities;

  const formatTimeAgo = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={cn(
        'bg-white dark:bg-[#111317] rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-white/5 h-full flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Recent Activity
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Timeline of your career journey
          </p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center opacity-80">
          <Clock size={16} className="text-white" />
        </div>
      </div>

      {/* Activity feed */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-500">No recent activities found.</p>
          </div>
        ) : (
          activities.map((activity, idx) => {
            const Icon = getIcon(activity.type);
            const iconColors = getIconColor(activity.type);

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative group pl-4 border-l-2 border-transparent hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors cursor-pointer"
              >
                {/* Timeline dot */}
                <div className={cn(
                  'absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800',
                  iconColors
                )} />

                {/* Content */}
                <div className="flex items-start gap-3 py-0.5">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', iconColors)}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white leading-snug">
                      {activity.message.split(': ').length > 1 ? (
                        <>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-1">
                            {activity.message.split(': ')[0]}:
                          </span>
                          <span>{activity.message.split(': ').slice(1).join(': ')}</span>
                        </>
                      ) : (
                        activity.message
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Hover action */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                    View
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Load more */}
      <div className="pt-3 border-t border-gray-100 dark:border-white/5 mt-2">
        <button className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors w-full text-center py-1">
          Load more activity →
        </button>
      </div>
    </motion.div>
  );
}
