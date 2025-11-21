'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Ghost, BarChart3, Calendar } from 'lucide-react';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import toast from 'react-hot-toast';

interface AnalyticsData {
  totalJobs: number;
  jobsByStatus: Record<string, number>;
  conversionRates: {
    applicationToInterview: number;
    interviewToOffer: number;
    overall: number;
  };
  avgTimeInStage: Record<string, number>;
  successRateBySource: Record<string, number>;
  sourceROI: Record<string, {
    conversionRate: number;
    draftRate: number;
    createdRate: number;
  }>;
  ghostRate: number;
  ghostJobsCount: number;
  appliedJobsCount: number;
}

const AnalyticsDashboard: React.FC = () => {
  const { user } = useUnifiedAuth();
  const userId = getUserIdForAPI(user);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | '90days'>('all');

  useEffect(() => {
    if (!userId) return;

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetchWithUserId(
          `/api/jobs/analytics?dateRange=${dateRange}`,
          userId
        );
        const data = await response.json();

        if (data.success) {
          setAnalytics(data.data);
        } else {
          toast.error('Failed to load analytics');
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [userId, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="px-3 py-1 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
        >
          <option value="all">All Time</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-4">
        <MetricCard
          title="Total Jobs"
          value={analytics.totalJobs}
          icon={<BarChart3 className="w-5 h-5" />}
        />
        <MetricCard
          title="Ghost Rate"
          value={`${analytics.ghostRate}%`}
          subtitle={`${analytics.ghostJobsCount} of ${analytics.appliedJobsCount} applied`}
          icon={<Ghost className="w-5 h-5" />}
          trend={analytics.ghostRate > 20 ? 'negative' : 'positive'}
        />
        <MetricCard
          title="Interview Rate"
          value={`${analytics.conversionRates.applicationToInterview}%`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Offer Rate"
          value={`${analytics.conversionRates.overall}%`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* Source ROI */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Source ROI Analysis</h3>
        <div className="space-y-3">
          {Object.entries(analytics.sourceROI).map(([source, roi]) => (
            <div key={source} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white capitalize">
                  {source === 'extension' ? 'Chrome Extension' : source}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Draft: {roi.draftRate}% | Created: {roi.createdRate}% | Conversion: {roi.conversionRate}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-lime-600 dark:text-lime-400">
                  {roi.conversionRate}%
                </div>
                <div className="text-xs text-gray-500">Conversion</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'positive' | 'negative';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
        <div className={`${trend === 'negative' ? 'text-red-500' : 'text-lime-500'}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</div>
      )}
    </motion.div>
  );
};

export default AnalyticsDashboard;

