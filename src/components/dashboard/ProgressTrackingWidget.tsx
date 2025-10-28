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
      console.error('ProgressTrackingWidget: Error fetching progress data:', error);
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

  const renderChart = () => {
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) return null;

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
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
            domain={['dataMin', 'dataMax']}
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
          <Legend />
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
    <div className="glass-widget-premium rounded-xl p-6">
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
            {[
              { key: 'all', label: 'All', color: 'bg-gray-500' },
              { key: 'jobs', label: 'Jobs', color: 'bg-blue-500' },
              { key: 'cvs', label: 'CVs', color: 'bg-red-500' },
              { key: 'coverLetters', label: 'Cover Letters', color: 'bg-green-500' },
            ].map((item) => (
              <motion.button
                key={item.key}
                onClick={() => setFilter(item.key as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors h-8 flex items-center justify-center whitespace-nowrap ${
                  filter === item.key
                    ? `${item.color} text-white shadow-lg`
                    : 'bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2a3a1f]'
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
      <div className="h-72 bg-white/5 rounded-lg p-4" style={{ minHeight: '288px', maxHeight: '288px' }}>
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
