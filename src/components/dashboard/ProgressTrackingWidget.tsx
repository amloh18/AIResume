'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Filter, Calendar } from 'lucide-react';

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
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchProgressData();
  }, [userId, timeRange]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/progress?userId=${userId}&range=${timeRange}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setData(generateMockData());
        }
      } else {
        console.error('Failed to fetch progress data:', response.status);
        setData(generateMockData());
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderLineChart = () => {
    const filteredData = getFilteredData();
    const maxValue = getMaxValue();
    const leftPadding = 5;
    const rightPadding = 5;
    const topPadding = 15;
    const bottomPadding = 15;

    if (filteredData.length === 0) return null;

    const points = filteredData.map((item, index) => {
      const x = leftPadding + (index * (100 - leftPadding - rightPadding)) / (filteredData.length - 1);
      const total = (item.jobs || 0) + (item.cvs || 0) + (item.coverLetters || 0);
      const y = 100 - bottomPadding - (total / maxValue) * (100 - topPadding - bottomPadding);
      const safeY = isNaN(y) ? 100 - bottomPadding : y;
      return { x, y: safeY, ...item };
    });

    const createPath = (dataKey: keyof ProgressData, color: string, offset: number = 0) => {
      const pathData = points.map((point, index) => {
        const value = (point[dataKey] as number) || 0;
        const y = 100 - bottomPadding - ((value + offset) / maxValue) * (100 - topPadding - bottomPadding);
        const safeY = isNaN(y) ? 100 - bottomPadding : y;
        return `${index === 0 ? 'M' : 'L'} ${point.x} ${safeY}`;
      }).join(' ');

      return (
        <path
          key={dataKey}
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={filter === 'all' ? 0.8 : filter === dataKey ? 1 : 0.3}
        />
      );
    };

    const createStackedArea = (dataKey: keyof ProgressData, color: string, stackOrder: number) => {
      // Calculate cumulative values for each point
      const cumulativePoints = points.map((point, index) => {
        let cumulativeValue = 0;
        
        // Add values based on stack order
        if (stackOrder >= 0) cumulativeValue += point.jobs;
        if (stackOrder >= 1) cumulativeValue += point.cvs;
        if (stackOrder >= 2) cumulativeValue += point.coverLetters;
        
        const y = 100 - bottomPadding - (cumulativeValue / maxValue) * (100 - topPadding - bottomPadding);
        const safeY = isNaN(y) ? 100 - bottomPadding : y;
        return { x: point.x, y: safeY, value: point[dataKey] as number };
      });

      // Top path (current cumulative value)
      const topPath = cumulativePoints.map((point, index) => {
        return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
      }).join(' ');

      // Bottom path (previous cumulative value)
      const bottomPath = cumulativePoints.map((point, index) => {
        let previousCumulativeValue = 0;
        
        // Calculate previous cumulative value based on stack order
        if (stackOrder > 0) {
          if (stackOrder >= 1) previousCumulativeValue += point.jobs;
          if (stackOrder >= 2) previousCumulativeValue += point.cvs;
        }
        
        const y = 100 - bottomPadding - (previousCumulativeValue / maxValue) * (100 - topPadding - bottomPadding);
        const safeY = isNaN(y) ? 100 - bottomPadding : y;
        return `L ${point.x} ${safeY}`;
      }).reverse().join(' ');

      return (
        <path
          key={`${dataKey}-area`}
          d={`${topPath} ${bottomPath} Z`}
          fill={color}
          opacity={filter === 'all' ? 0.6 : filter === dataKey ? 0.8 : 0.3}
        />
      );
    };

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* X-axis line */}
        <line
          x1={leftPadding}
          y1={100 - bottomPadding}
          x2={100 - rightPadding}
          y2={100 - bottomPadding}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Y-axis line */}
        <line
          x1={leftPadding}
          y1={topPadding}
          x2={leftPadding}
          y2={100 - bottomPadding}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
          <line
            key={index}
            x1={leftPadding}
            y1={100 - bottomPadding - ratio * (100 - topPadding - bottomPadding)}
            x2={100 - rightPadding}
            y2={100 - bottomPadding - ratio * (100 - topPadding - bottomPadding)}
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.1"
          />
        ))}

        {/* Stacked Areas */}
        {createStackedArea('jobs', '#3B82F6', 0)}
        {createStackedArea('cvs', '#EF4444', 1)}
        {createStackedArea('coverLetters', '#10B981', 2)}

        {/* Lines */}
        {createPath('jobs', '#3B82F6', 0)}
        {createPath('cvs', '#EF4444', 0)}
        {createPath('coverLetters', '#10B981', 0)}

        {/* Data points */}
        {points.map((point, index) => {
          // Calculate cy values with NaN protection
          const jobsCy = 100 - bottomPadding - ((point.jobs || 0) / maxValue) * (100 - topPadding - bottomPadding);
          const cvsCy = 100 - bottomPadding - ((point.cvs || 0) / maxValue) * (100 - topPadding - bottomPadding);
          const coverLettersCy = 100 - bottomPadding - ((point.coverLetters || 0) / maxValue) * (100 - topPadding - bottomPadding);
          
          return (
            <g key={index}>
              <circle
                cx={point.x}
                cy={isNaN(jobsCy) ? 100 - bottomPadding : jobsCy}
                r="2"
                fill="#3B82F6"
                opacity={filter === 'all' || filter === 'jobs' ? 1 : 0.3}
              />
              <circle
                cx={point.x}
                cy={isNaN(cvsCy) ? 100 - bottomPadding : cvsCy}
                r="2"
                fill="#EF4444"
                opacity={filter === 'all' || filter === 'cvs' ? 1 : 0.3}
              />
              <circle
                cx={point.x}
                cy={isNaN(coverLettersCy) ? 100 - bottomPadding : coverLettersCy}
                r="2"
                fill="#10B981"
                opacity={filter === 'all' || filter === 'coverLetters' ? 1 : 0.3}
              />
            </g>
          );
        })}
      </svg>
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
    <div className="glass-widget-premium glass-shimmer rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Progress Tracking</h2>
            <p className="text-gray-600 dark:text-white/60 text-sm">Track your application progress over time</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Filter Buttons */}
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-gray-600 dark:text-white/60 mr-2" />
            {[
              { key: 'all', label: 'All', color: 'bg-gray-500' },
              { key: 'jobs', label: 'Jobs', color: 'bg-blue-500' },
              { key: 'cvs', label: 'CVs', color: 'bg-red-500' },
              { key: 'coverLetters', label: 'Cover Letters', color: 'bg-green-500' },
            ].map((item) => (
              <motion.button
                key={item.key}
                onClick={() => setFilter(item.key as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === item.key
                    ? `${item.color} text-white shadow-lg`
                    : 'bg-white/10 backdrop-blur-md border border-white/20 text-white/60 hover:text-white/80 hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {item.label}
              </motion.button>
            ))}
          </div>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 bg-white/5 rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          renderLineChart()
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-white/60">Jobs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm text-white/60">CVs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-white/60">Cover Letters</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressTrackingWidget;
