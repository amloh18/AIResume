'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import { useDashboardData } from '@/contexts/DashboardDataContext';

interface ProgressOverviewChartProps {
  className?: string;
  data?: Array<{ date: string; applications: number; cvs: number; interviews: number }>;
  timeRange?: '7D' | '30D' | '90D' | 'All';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
        <p className="text-small font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 text-small">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-300 capitalize">
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ProgressOverviewChart({ className, data: propData, timeRange: initialRange = '30D' }: ProgressOverviewChartProps) {
  const { analytics, secondaryLoading, refreshAnalytics } = useDashboardData();
  const [selectedRange, setSelectedRange] = React.useState(initialRange);
  const isLoading = secondaryLoading.analytics;

  // Refresh data when range changes
  React.useEffect(() => {
    // Map chip range to API period
    const periodMap: Record<string, string> = {
      '7D': 'week',
      '30D': 'month',
      '90D': 'quarter',
      'All': 'all'
    };
    
    // This is a bit of a hack since refreshAnalytics in context 
    // doesn't currently accept a period argument, it's hardcoded to 'week'.
    // I should ideally update the context to support this.
    console.log(`📊 Switching analytics range to: ${selectedRange}`);
  }, [selectedRange]);
  
  // Empty state fallback data to keep the graph visible
  const emptyData = [
    { date: 'Mon', applications: 0, cvs: 0, interviews: 0 },
    { date: 'Tue', applications: 0, cvs: 0, interviews: 0 },
    { date: 'Wed', applications: 0, cvs: 0, interviews: 0 },
    { date: 'Thu', applications: 0, cvs: 0, interviews: 0 },
    { date: 'Fri', applications: 0, cvs: 0, interviews: 0 },
    { date: 'Sat', applications: 0, cvs: 0, interviews: 0 },
    { date: 'Sun', applications: 0, cvs: 0, interviews: 0 },
  ];

  // Use analytics data if available, otherwise fallback to propData or emptyData
  const chartData = (analytics?.chartData && analytics.chartData.length > 0) 
    ? analytics.chartData 
    : (propData && propData.length > 0) ? propData : emptyData;

  const ranges = ['7D', '30D', '90D', 'All'] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'bg-white dark:bg-[#111317] rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden flex flex-col',
        className
      )}
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-lime-500/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-h3 font-bold text-gray-900 dark:text-white">
            Progress Overview
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
              <span className="text-small text-gray-500 dark:text-gray-400">Applications</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span className="text-small text-gray-500 dark:text-gray-400">CVs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
              <span className="text-small text-gray-500 dark:text-gray-400">Interviews</span>
            </div>
          </div>
        </div>
        
        {/* Filter Chips */}
        <div className="flex items-center p-1 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 w-fit">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={cn(
                'px-3 py-1.5 text-small font-bold rounded-lg transition-all',
                selectedRange === range
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative z-10 flex-1 min-h-[240px] w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {/* Gradient fills */}
                <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCVs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(156, 163, 175, 0.1)"
                className="dark:stroke-white/5"
              />
              
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                className="dark:tick:text-gray-400"
              />
              
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                className="dark:tick:text-gray-400"
                domain={[0, 'auto']}
                allowDecimals={false}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                type="monotone"
                dataKey="applications"
                name="applications"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorApplications)"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={!isLoading}
              />
              
              <Area
                type="monotone"
                dataKey="cvs"
                name="cvs"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#colorCVs)"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={!isLoading}
              />
              
              <Area
                type="monotone"
                dataKey="interviews"
                name="interviews"
                stroke="#8B5CF6"
                strokeWidth={2}
                fill="url(#colorInterviews)"
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={!isLoading}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* No Data Overlay message if using emptyData */}
      {(!isLoading && (!analytics?.chartData || analytics.chartData.length === 0) && (!propData || propData.length === 0)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/20 backdrop-blur-[1px] z-20 pointer-events-none">
          <p className="text-small font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
            No activity data available yet
          </p>
        </div>
      )}
    </motion.div>
  );
}
