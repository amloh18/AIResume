'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Clock, AlertCircle, CheckCircle, Pause, Play, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface AutoApplyStatusWidgetProps {
  userId?: string;
}

export function AutoApplyStatusWidget({ userId }: AutoApplyStatusWidgetProps) {
  const [status, setStatus] = useState<{
    enabled: boolean;
    isRunning: boolean;
    lastRun: string | null;
    nextRun: string | null;
    queued: number;
    processed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch auto-apply status
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/applications/process', {
          headers: { 'x-user-id': userId || 'temp-user-id' }
        });
        if (response.ok) {
          const data = await response.json();
          setStatus({
            enabled: data.quota?.autoApplyEnabled || false,
            isRunning: false,
            lastRun: null,
            nextRun: null,
            queued: 0,
            processed: data.stats?.total || 0
          });
        }
      } catch (error) {
        console.error('Error fetching auto-apply status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [userId]);

  const handleToggleAutoApply = async () => {
    // Toggle auto-apply setting
    try {
      await fetch('/api/applications/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId || 'temp-user-id'
        },
        body: JSON.stringify({ 
          action: 'toggleAutoApply',
          enabled: !status?.enabled 
        })
      });
      setStatus(prev => prev ? { ...prev, enabled: !prev.enabled } : null);
    } catch (error) {
      console.error('Error toggling auto-apply:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status?.enabled ? 'bg-lime-100 dark:bg-lime-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Zap className={`w-5 h-5 ${status?.enabled ? 'text-lime-600 dark:text-lime-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Auto-Apply</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {status?.enabled ? 'Active' : 'Paused'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleToggleAutoApply}
          className={`p-2 rounded-lg transition-colors ${
            status?.enabled 
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
              : 'bg-lime-100 dark:bg-lime-900/30 text-lime-600 hover:bg-lime-200 dark:hover:bg-lime-900/50'
          }`}
        >
          {status?.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
            In Queue
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {status?.queued || 0}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
            <CheckCircle className="w-4 h-4" />
            Processed
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {status?.processed || 0}
          </div>
        </div>
      </div>

      {/* Status Message */}
      {status?.enabled && (
        <div className="mt-4 p-3 bg-lime-50 dark:bg-lime-900/20 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-lime-700 dark:text-lime-300">
            <CheckCircle className="w-4 h-4" />
            Auto-apply is running in the background
          </div>
        </div>
      )}

      {status?.enabled === false && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <AlertCircle className="w-4 h-4" />
            Enable auto-apply to automatically apply to matching jobs
          </div>
        </div>
      )}

      {/* Link to Jobs Hub */}
      <Link 
        href="/dashboard/jobs?tab=autoapply"
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-lime-600 dark:text-lime-400 hover:bg-lime-50 dark:hover:bg-lime-900/20 rounded-lg transition-colors"
      >
        Configure Auto-Apply
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default AutoApplyStatusWidget;
