'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Briefcase, CheckCircle, Clock, XCircle, Star, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface SuccessRateWidgetProps {
  userId?: string;
}

export function SuccessRateWidget({ userId }: SuccessRateWidgetProps) {
  const [stats, setStats] = useState<{
    total: number;
    successRate: number;
    applied: number;
    interview: number;
    offer: number;
    pending: number;
    rejected: number;
    applicationsThisWeek: number;
    applicationsThisMonth: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Sample data for demo
  const sampleStats = {
    total: 47,
    successRate: 34,
    applied: 15,
    interview: 8,
    offer: 2,
    pending: 5,
    rejected: 17,
    applicationsThisWeek: 12,
    applicationsThisMonth: 32
  };

  useEffect(() => {
    // Fetch application stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/applications/process', {
          headers: { 'x-user-id': userId || 'temp-user-id' }
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats || sampleStats);
        } else {
          setStats(sampleStats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats(sampleStats);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getTrendIcon = () => {
    if (stats!.successRate >= 50) return <TrendingUp className="w-5 h-5 text-lime-500" />;
    if (stats!.successRate >= 25) return <Minus className="w-5 h-5 text-yellow-500" />;
    return <TrendingDown className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Success Rate</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Based on {stats?.total || 0} applications
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className={`text-2xl font-bold ${
            (stats?.successRate || 0) >= 50 ? 'text-lime-500' :
            (stats?.successRate || 0) >= 25 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {stats?.successRate || 0}%
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats?.applied || 0}</div>
          <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Applied</div>
        </div>
        <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats?.interview || 0}</div>
          <div className="text-xs text-purple-600/70 dark:text-purple-400/70">Interview</div>
        </div>
        <div className="text-center p-2 bg-lime-50 dark:bg-lime-900/20 rounded-lg">
          <div className="text-lg font-bold text-lime-600 dark:text-lime-400">{stats?.offer || 0}</div>
          <div className="text-xs text-lime-600/70 dark:text-lime-400/70">Offers</div>
        </div>
        <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{stats?.rejected || 0}</div>
          <div className="text-xs text-red-600/70 dark:text-red-400/70">Rejected</div>
        </div>
      </div>

      {/* Weekly/Monthly Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">This Week</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {stats?.applicationsThisWeek || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">applications</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">This Month</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {stats?.applicationsThisMonth || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">applications</div>
        </div>
      </div>

      {/* Link to Applications */}
      <Link 
        href="/dashboard/jobs?tab=applications"
        className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-lime-600 dark:text-lime-400 hover:bg-lime-50 dark:hover:bg-lime-900/20 rounded-lg transition-colors"
      >
        View All Applications
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default SuccessRateWidget;
