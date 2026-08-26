'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

interface QuotaData {
  hourly: {
    used: number;
    limit: number;
    remaining: number;
  };
  daily: {
    used: number;
    limit: number;
    remaining: number;
  };
  monthly?: {
    used: number;
    limit: number;
    remaining: number;
  };
}

interface QuotaIndicatorProps {
  userId?: string;
  initialData?: QuotaData;
  onRefresh?: () => void;
}

export function QuotaIndicator({ userId, initialData, onRefresh }: QuotaIndicatorProps) {
  const [quota, setQuota] = useState<QuotaData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quota) return;
    
    async function fetchQuota() {
      if (!userId) {
        setError('Sign in to view quota');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/applications/quota');
        const data = await response.json();
        
        if (data.success) {
          setQuota(data.data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to load quota');
      } finally {
        setLoading(false);
      }
    }

    fetchQuota();
  }, [userId]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    if (onRefresh) {
      onRefresh();
    }
    
    // Re-fetch quota
    if (userId) {
      try {
        const response = await fetch('/api/applications/quota');
        const data = await response.json();
        
        if (data.success) {
          setQuota(data.data);
        }
      } catch (err) {
        setError('Failed to refresh');
      }
    }
    
    setLoading(false);
  };

  if (loading && !quota) {
    return (
      <div className="flex items-center gap-4 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!quota) return null;

  const hourlyPercent = quota.hourly.limit > 0 
    ? (quota.hourly.used / quota.hourly.limit) * 100 
    : 0;
  
  const dailyPercent = quota.daily.limit > 0 
    ? (quota.daily.used / quota.daily.limit) * 100 
    : 0;

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'bg-red-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-lime-500';
  };

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2">
      {/* Hourly Quota */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span className="text-xs text-gray-600 dark:text-gray-300 hidden sm:inline">
          Hour:
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[40px]">
          {quota.hourly.used}/{quota.hourly.limit}
        </span>
        <div className="w-12 sm:w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${getProgressColor(hourlyPercent)}`}
            style={{ width: `${Math.min(hourlyPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>

      {/* Daily Quota */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span className="text-xs text-gray-600 dark:text-gray-300 hidden sm:inline">
          Day:
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[40px]">
          {quota.daily.used}/{quota.daily.limit}
        </span>
        <div className="w-12 sm:w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${getProgressColor(dailyPercent)}`}
            style={{ width: `${Math.min(dailyPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Warning indicator if quota low */}
      {(hourlyPercent >= 80 || dailyPercent >= 80) && (
        <>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        </>
      )}

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
        title="Refresh quota"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

export default QuotaIndicator;
