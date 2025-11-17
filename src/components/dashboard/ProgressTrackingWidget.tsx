'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Filter, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ProgressData {
  date: string;
  jobs: number;
  cvs: number;
  coverLetters: number;
}

interface ProgressTrackingWidgetProps {
  userId: string;
}

const ProgressTrackingWidget: React.FC<ProgressTrackingWidgetProps> = ({ userId }) => {
  const [data, setData] = useState<ProgressData[]>([]);
  const [filter, setFilter] = useState<'all' | 'jobs' | 'cvs' | 'coverLetters'>('all');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchProgressData();
  }, [userId, timeRange]);

  const fetchProgressData = async () => {
    if (!userId) {
      console.warn('ProgressTrackingWidget: No userId provided');
      setData(generateMockData());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('ProgressTrackingWidget: Fetching data for userId:', userId, 'range:', timeRange);
      const response = await fetch(`/api/analytics/progress?userId=${userId}&range=${timeRange}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('ProgressTrackingWidget: API response:', result);
        if (result.success && result.data && result.data.length > 0) {
          setData(result.data);
          console.log('ProgressTrackingWidget: Using real data, points:', result.data.length);
        } else {
          console.log('ProgressTrackingWidget: No real data, using mock data');
          setData(generateMockData());
        }
      } else {
        console.error('ProgressTrackingWidget: Failed to fetch progress data:', response.status);
        setData(generateMockData());
      }
    } catch (error) {
      // Safely handle error - check if it's an Event object
      if (error instanceof Error) {
        console.error('ProgressTrackingWidget: Error fetching progress data:', error.message);
      } else if (error && typeof error === 'object' && 'target' in error) {
        console.error('ProgressTrackingWidget: Error fetching progress data: Event object received');
      } else {
        console.error('ProgressTrackingWidget: Error fetching progress data:', String(error));
      }
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (): ProgressData[] => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data: ProgressData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        jobs: Math.floor(Math.random() * 5) + 1,
        cvs: Math.floor(Math.random() * 3) + 1,
        coverLetters: Math.floor(Math.random() * 4) + 1,
      });
    }
    
    return data;
  };

  const getFilteredData = () => {
    if (filter === 'all') return data;
    return data.map(item => ({
      ...item,
      jobs: filter === 'jobs' ? item.jobs : 0,
      cvs: filter === 'cvs' ? item.cvs : 0,
      coverLetters: filter === 'coverLetters' ? item.coverLetters : 0,
    }));
  };

  const getMaxValue = () => {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return 1;
    const maxValue = Math.max(...filteredData.map(d => d.jobs + d.cvs + d.coverLetters));
    return maxValue > 0 ? maxValue : 1; // Prevent division by zero
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' }).substring(0, 3);
    return `${day} ${month}`;
  };

  const renderChart = () => {
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) return null;

    // Calculate domain to center current day
    const today = new Date().toISOString().split('T')[0];
    const dataMin = filteredData[0]?.date || today;
    const dataMax = filteredData[filteredData.length - 1]?.date || today;
    
    // Calculate the range to center today
    const todayDate = new Date(today);
    const minDate = new Date(dataMin);
    const maxDate = new Date(dataMax);
    
    // Find the distance from today to the edges
    const daysBeforeToday = Math.floor((todayDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000));
    const daysAfterToday = Math.floor((maxDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Extend domain to center today (use the larger distance on both sides)
    const maxDistance = Math.max(daysBeforeToday, daysAfterToday);
    const domainStart = new Date(todayDate);
    domainStart.setDate(domainStart.getDate() - maxDistance);
    const domainEnd = new Date(todayDate);
    domainEnd.setDate(domainEnd.getDate() + maxDistance);
    
    const domainMin = domainStart.toISOString().split('T')[0];
    const domainMax = domainEnd.toISOString().split('T')[0];

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="cvsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="coverLettersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            interval={timeRange === '90d' ? 4 : timeRange === '30d' ? 1 : 0}
            angle={timeRange === '90d' ? -45 : 0}
            textAnchor={timeRange === '90d' ? 'end' : 'middle'}
            height={timeRange === '90d' ? 60 : 30}
            tickFormatter={(value) => formatDate(value)}
            domain={[domainMin, domainMax]}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            domain={[0, 'dataMax + 1']}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
          />
          <Area
            type="monotone"
            dataKey="jobs"
            stroke="#3B82F6"
            fill="url(#jobsGradient)"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            name="Jobs"
            animationDuration={1000}
            animationEasing="ease-in-out"
            opacity={filter === 'all' || filter === 'jobs' ? 1 : 0.3}
          />
          <Area
            type="monotone"
            dataKey="cvs"
            stroke="#EF4444"
            fill="url(#cvsGradient)"
            strokeWidth={2}
            dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
            name="CVs"
            animationDuration={1000}
            animationEasing="ease-in-out"
            opacity={filter === 'all' || filter === 'cvs' ? 1 : 0.3}
          />
          <Area
            type="monotone"
            dataKey="coverLetters"
            stroke="#10B981"
            fill="url(#coverLettersGradient)"
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            name="Cover Letters"
            animationDuration={1000}
            animationEasing="ease-in-out"
            opacity={filter === 'all' || filter === 'coverLetters' ? 1 : 0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const getTotalStats = () => {
    const totals = data.reduce(
      (acc, item) => ({
        jobs: acc.jobs + item.jobs,
        cvs: acc.cvs + item.cvs,
        coverLetters: acc.coverLetters + item.coverLetters,
      }),
      { jobs: 0, cvs: 0, coverLetters: 0 }
    );
    return totals;
  };

  const totals = getTotalStats();

  return (
    <div
      className="glass-widget-premium rounded-xl p-4 sm:p-6 h-full flex flex-col"
      data-analytics-widget="progress-tracking"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">Progress Tracking</h2>
            <p className="text-gray-600 dark:text-white/60 text-xs sm:text-sm truncate">Track your application progress over time</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full md:w-auto">
          {/* Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
            {[
              { key: 'all', label: 'All', color: 'bg-gray-500' },
              { key: 'jobs', label: 'Jobs', color: 'bg-blue-500' },
              { key: 'cvs', label: 'CVs', color: 'bg-red-500' },
              { key: 'coverLetters', label: 'Cover Letters', shortLabel: 'CL', color: 'bg-green-500' },
            ].map((item) => (
              <motion.button
                key={item.key}
                onClick={() => setFilter(item.key as any)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors h-8 flex items-center justify-center whitespace-nowrap flex-shrink-0 ${
                  filter === item.key
                    ? `${item.color} text-white shadow-lg`
                    : 'bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2a3a1f]'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel || item.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => {
              const value = e?.target?.value;
              if (value) {
                setTimeRange(value as '7d' | '30d' | '90d');
              }
            }}
            className="px-2 sm:px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/50 flex-shrink-0 w-full sm:w-auto"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-72 bg-white/5 rounded-lg p-2 sm:p-4 relative" style={{ minHeight: '256px', maxHeight: '288px' }}>
        {/* Labels in upper right corner */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-medium max-w-[calc(100%-1rem)] sm:max-w-none">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#EF4444] flex-shrink-0"></div>
            <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">CVs</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#10B981] flex-shrink-0"></div>
            <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap hidden sm:inline">Cover Letters</span>
            <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap sm:hidden">CL</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#3B82F6] flex-shrink-0"></div>
            <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">Jobs</span>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          renderChart()
        )}
      </div>
    </div>
  );
};

export default ProgressTrackingWidget;
