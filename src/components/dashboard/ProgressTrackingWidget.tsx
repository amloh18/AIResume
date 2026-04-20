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
import SegmentedToggle from '@/components/ui/SegmentedToggle';

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
        if (result.success && result.data) {
          // Always use real data, even if it's all zeros - this is the actual user data
          console.log('ProgressTrackingWidget: Received data from API', {
            dataLength: result.data.length,
            sampleData: result.data.slice(0, 3),
            summary: result.summary
          });
          setData(result.data);
          console.log('ProgressTrackingWidget: Using real data, points:', result.data.length);
        } else {
          console.warn('ProgressTrackingWidget: API returned unsuccessful response:', result);
          // Only use mock data if API explicitly failed
          setData(generateMockData());
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('ProgressTrackingWidget: Failed to fetch progress data:', response.status, errorText);

        // If unauthorized, don't use mock data - show empty state
        if (response.status === 401) {
          console.warn('ProgressTrackingWidget: Unauthorized - user not authenticated');
          setData([]);
        } else {
          // Only use mock data on other API failures
          setData(generateMockData());
        }
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

    console.log('ProgressTrackingWidget: renderChart called', {
      dataLength: data.length,
      filteredDataLength: filteredData.length,
      sampleData: filteredData.slice(0, 3)
    });

    if (filteredData.length === 0) {
      console.warn('ProgressTrackingWidget: No data to render');
      return (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <p>No data available for the selected time range</p>
        </div>
      );
    }

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
              <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="cvsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="coverLettersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34D399" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#34D399" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="1 10" strokeLinecap="round" stroke="#6B7280" opacity={0.4} vertical={true} horizontal={true} />
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
            allowDecimals={false}
            tickCount={5}
          />
          <Tooltip
            cursor={{ stroke: '#10B981', strokeWidth: 2, opacity: 0.5 }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#1F2937] border border-white/10 rounded-xl p-3 shadow-xl backdrop-blur-md">
                    <p className="text-gray-400 text-xs mb-2">{formatDate(label)}</p>
                    {payload.map((entry, index) => (
                      <p key={index} className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}: {entry.value}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="linear"
            dataKey="jobs"
            stroke="#059669"
            fill="url(#jobsGradient)"
            strokeWidth={2}
            dot={false}
            activeDot={(props: any) => {
              const { cx, cy, stroke } = props;
              return (
                <g>
                  <circle cx={cx} cy={cy} r={8} fill="transparent" stroke={stroke} strokeWidth={2} opacity={0.5} />
                  <circle cx={cx} cy={cy} r={4} fill="#fff" stroke={stroke} strokeWidth={2} />
                </g>
              );
            }}
            name="Jobs"
            animationDuration={1000}
            animationEasing="ease-in-out"
            opacity={filter === 'all' || filter === 'jobs' ? 1 : 0.3}
          />
          <Area
            type="linear"
            dataKey="cvs"
            stroke="#10B981"
            fill="url(#cvsGradient)"
            strokeWidth={2}
            dot={false}
            activeDot={(props: any) => {
              const { cx, cy, stroke } = props;
              return (
                <g>
                  <circle cx={cx} cy={cy} r={8} fill="transparent" stroke={stroke} strokeWidth={2} opacity={0.5} />
                  <circle cx={cx} cy={cy} r={4} fill="#fff" stroke={stroke} strokeWidth={2} />
                </g>
              );
            }}
            name="CVs"
            animationDuration={1000}
            animationEasing="ease-in-out"
            opacity={filter === 'all' || filter === 'cvs' ? 1 : 0.3}
          />
          <Area
            type="linear"
            dataKey="coverLetters"
            stroke="#34D399"
            fill="url(#coverLettersGradient)"
            strokeWidth={2}
            dot={false}
            activeDot={(props: any) => {
              const { cx, cy, stroke } = props;
              return (
                <g>
                  <circle cx={cx} cy={cy} r={8} fill="transparent" stroke={stroke} strokeWidth={2} opacity={0.5} />
                  <circle cx={cx} cy={cy} r={4} fill="#fff" stroke={stroke} strokeWidth={2} />
                </g>
              );
            }}
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
      className="bg-white dark:bg-[#111317] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 h-full flex flex-col w-full"
      data-analytics-widget="progress-tracking"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">Progress Tracking</h2>
            <p className="text-gray-600 dark:text-white/60 text-[11px] truncate">Activity over time</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full md:w-auto">
          {/* Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
            <SegmentedToggle
              value={filter}
              onChange={(value) => setFilter(value as any)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'jobs', label: 'Jobs' },
                { value: 'cvs', label: 'CVs' },
                { value: 'coverLetters', label: 'Docs' },
              ]}
              theme="blue"
              size="sm"
            />
          </div>

          {/* Time Range Selector */}
          <SegmentedToggle
            value={timeRange}
            onChange={(value) => setTimeRange(value as '7d' | '30d' | '90d')}
            options={[
              { value: '7d', label: '7D' },
              { value: '30d', label: '30D' },
              { value: '90d', label: '90D' },
            ]}
            theme="blue"
            size="sm"
          />
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[220px] bg-white/5 rounded-lg p-2 sm:p-4 relative">
        {/* Labels in upper right corner */}
        <div className="absolute top-2 right-2 z-10 flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] font-medium max-w-[calc(100%-1rem)] sm:max-w-none">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#10B981] flex-shrink-0"></div>
            <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">CVs</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#34D399] flex-shrink-0"></div>
            <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap hidden sm:inline">Cover Letters</span>
            <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap sm:hidden">CL</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#059669] flex-shrink-0"></div>
            <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">Jobs</span>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          renderChart()
        )}
      </div>
    </div>
  );
};

export default ProgressTrackingWidget;
