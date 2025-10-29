'use client';

import React from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { useRecentActivity } from '@/lib/hooks/useRecentActivity';

interface RecentActivityWidgetProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({
  limit = 5,
  showHeader = true,
  className = ''
}) => {
  const { activities, loading, error, refetch } = useRecentActivity(limit);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cv':
        return 'bg-lime-400';
      case 'job':
        return 'bg-blue-400';
      case 'cover-letter':
        return 'bg-purple-400';
      case 'application':
        return 'bg-green-400';
      default:
        return 'bg-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 ${className}`}>
        {showHeader && (
          <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-4 flex items-center gap-2">
            <Activity size={14} className="text-blue-400" />
            Recent Activity
          </h3>
        )}
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="h-3 bg-gray-400 rounded animate-pulse flex-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 ${className}`}>
        {showHeader && (
          <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-4 flex items-center gap-2">
            <Activity size={14} className="text-blue-400" />
            Recent Activity
          </h3>
        )}
        <div className="text-gray-900 dark:text-gray-600 dark:text-white/60 text-xs text-center py-4">
          Failed to load activities
          <button
            onClick={refetch}
            className="ml-2 text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 dark:text-white font-medium text-sm flex items-center gap-2">
            <Activity size={14} className="text-blue-400" />
            Recent Activity
          </h3>
          <button
            onClick={refetch}
            className="p-1 text-gray-900 dark:text-gray-600 dark:text-white/60 hover:text-gray-900 dark:text-white transition-colors"
            title="Refresh activities"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      )}
      
      {activities.length === 0 ? (
        <div className="text-gray-900 dark:text-gray-600 dark:text-white/60 text-xs text-center py-4">
          No recent activity
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 text-gray-900 dark:text-gray-600 dark:text-white/60 text-xs">
              <div className={`w-2 h-2 ${getActivityIcon(activity.type)} rounded-full`}></div>
              <div className="flex-1">
                <span>{activity.description}</span>
                <span className="text-gray-900 dark:text-white/40 ml-2">
                  {formatTimestamp(activity.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivityWidget;
