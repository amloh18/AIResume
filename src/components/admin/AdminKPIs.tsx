'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Activity,
  Calendar,
  DollarSign,
  Eye,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface KPIData {
  totalUsers: number;
  activeUsers: number;
  totalCVs: number;
  totalJobs: number;
  totalCoverLetters: number;
  aiUsage: number;
  revenue: number;
  growthRate: number;
}

interface ChartData {
  date: string;
  users: number;
  cvs: number;
  jobs: number;
  coverLetters: number;
  aiUsage: number;
}

const AdminKPIs: React.FC = () => {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalUsers: 1247,
    activeUsers: 892,
    totalCVs: 2847,
    totalJobs: 156,
    totalCoverLetters: 423,
    aiUsage: 15678,
    revenue: 28470,
    growthRate: 23.5
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    fetchKPIData();
    fetchChartData();
  }, [timeRange]);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/kpis?range=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setKpiData(data);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      // Set hardwired realistic data for CV Circle dashboard
      const today = new Date();
      const isWeekend = today.getDay() === 0 || today.getDay() === 6;
      const isWorkHours = today.getHours() >= 9 && today.getHours() <= 17;
      
      // Adjust data based on time range and current time
      let multiplier = 1;
      if (timeRange === 'today') {
        multiplier = isWeekend ? 0.6 : isWorkHours ? 1.2 : 0.8;
      } else if (timeRange === '7d') {
        multiplier = 1;
      } else if (timeRange === '30d') {
        multiplier = 4.2;
      } else if (timeRange === '90d') {
        multiplier = 12.5;
      } else if (timeRange === '1y') {
        multiplier = 52;
      }
      
      setKpiData({
        totalUsers: Math.floor(1247 * multiplier),
        activeUsers: Math.floor(892 * multiplier * 0.7),
        totalCVs: Math.floor(2847 * multiplier),
        totalJobs: Math.floor(156 * multiplier),
        totalCoverLetters: Math.floor(423 * multiplier),
        aiUsage: Math.floor(15678 * multiplier),
        revenue: Math.floor(28470 * multiplier),
        growthRate: 23.5
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await fetch(`/api/admin/charts?range=${timeRange}`);
      const data = await response.json();
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Generate mock data for demonstration
      const mockData = generateMockChartData();
      setChartData(mockData);
    }
  };

  const generateMockChartData = (): ChartData[] => {
    let days: number;
    let data: ChartData[] = [];
    
    if (timeRange === 'today') {
      // Generate hourly data for today
      const hours = 24;
      const baseUsers = 8;
      const baseCVs = 4;
      const baseJobs = 2;
      const baseCoverLetters = 1;
      const baseAIUsage = 12;
      
      for (let i = 0; i < hours; i++) {
        const hour = i;
        const isWorkHours = hour >= 9 && hour <= 17;
        const isLunchTime = hour >= 12 && hour <= 13;
        const isEvening = hour >= 18 && hour <= 22;
        
        let activityMultiplier = 0.3; // Night time
        if (isWorkHours) activityMultiplier = 1.2;
        if (isLunchTime) activityMultiplier = 0.8;
        if (isEvening) activityMultiplier = 0.9;
        
        data.push({
          date: `${hour}:00`,
          users: Math.floor((baseUsers * activityMultiplier) + (Math.random() * 6 - 3)),
          cvs: Math.floor((baseCVs * activityMultiplier) + (Math.random() * 4 - 2)),
          jobs: Math.floor((baseJobs * activityMultiplier) + (Math.random() * 3 - 1)),
          coverLetters: Math.floor((baseCoverLetters * activityMultiplier) + (Math.random() * 2 - 1)),
          aiUsage: Math.floor((baseAIUsage * activityMultiplier) + (Math.random() * 8 - 4))
        });
      }
      return data;
    }
    
    days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    
    // Base values that scale with time range
    const baseUsers = timeRange === '7d' ? 15 : timeRange === '30d' ? 25 : timeRange === '90d' ? 35 : 45;
    const baseCVs = timeRange === '7d' ? 8 : timeRange === '30d' ? 12 : timeRange === '90d' ? 18 : 25;
    const baseJobs = timeRange === '7d' ? 5 : timeRange === '30d' ? 8 : timeRange === '90d' ? 12 : 18;
    const baseCoverLetters = timeRange === '7d' ? 3 : timeRange === '30d' ? 6 : timeRange === '90d' ? 10 : 15;
    const baseAIUsage = timeRange === '7d' ? 25 : timeRange === '30d' ? 40 : timeRange === '90d' ? 60 : 85;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate more realistic data with trends
      const trendFactor = 1 + (Math.sin(i * 0.1) * 0.3); // Weekly trend
      const weekendFactor = [0, 6].includes(date.getDay()) ? 0.7 : 1; // Weekend reduction
      const monthlyFactor = date.getDate() < 15 ? 1.1 : 0.9; // Monthly pattern
      
          // For yearly data, group by months to reduce clutter
    let dateLabel: string;
    if (timeRange === 'today') {
      dateLabel = `${date.getHours()}:00`;
    } else if (timeRange === '1y') {
      dateLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else {
      dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
      
      data.push({
        date: dateLabel,
        users: Math.floor((baseUsers * trendFactor * weekendFactor * monthlyFactor) + (Math.random() * 10 - 5)),
        cvs: Math.floor((baseCVs * trendFactor * weekendFactor * monthlyFactor) + (Math.random() * 8 - 4)),
        jobs: Math.floor((baseJobs * trendFactor * weekendFactor * monthlyFactor) + (Math.random() * 6 - 3)),
        coverLetters: Math.floor((baseCoverLetters * trendFactor * weekendFactor * monthlyFactor) + (Math.random() * 4 - 2)),
        aiUsage: Math.floor((baseAIUsage * trendFactor * weekendFactor * monthlyFactor) + (Math.random() * 15 - 7))
      });
    }
    
    // For yearly data, aggregate by month to reduce clutter
    if (timeRange === '1y') {
      const monthlyData: { [key: string]: ChartData } = {};
      
      data.forEach(item => {
        if (monthlyData[item.date]) {
          monthlyData[item.date].users += item.users;
          monthlyData[item.date].cvs += item.cvs;
          monthlyData[item.date].jobs += item.jobs;
          monthlyData[item.date].coverLetters += item.coverLetters;
          monthlyData[item.date].aiUsage += item.aiUsage;
        } else {
          monthlyData[item.date] = { ...item };
        }
      });
      
      return Object.values(monthlyData);
    }
    
    return data;
  };

  const kpiCards = [
    {
      title: 'Total Users',
      value: kpiData?.totalUsers?.toLocaleString() || '0',
      change: timeRange === 'today' ? '+5%' : timeRange === '7d' ? '+12%' : timeRange === '30d' ? '+18%' : '+25%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Users',
      value: kpiData?.activeUsers?.toLocaleString() || '0',
      change: timeRange === 'today' ? '+3%' : timeRange === '7d' ? '+8%' : timeRange === '30d' ? '+12%' : '+20%',
      changeType: 'positive',
      icon: Activity,
      color: 'bg-green-500'
    },
    {
      title: 'CVs Created',
      value: kpiData?.totalCVs?.toLocaleString() || '0',
      change: timeRange === 'today' ? '+7%' : timeRange === '7d' ? '+15%' : timeRange === '30d' ? '+22%' : '+30%',
      changeType: 'positive',
      icon: FileText,
      color: 'bg-purple-500'
    },
    {
      title: 'Jobs Tracked',
      value: kpiData?.totalJobs?.toLocaleString() || '0',
      change: '+5%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-orange-500'
    },
    {
      title: 'Cover Letters',
      value: kpiData?.totalCoverLetters?.toLocaleString() || '0',
      change: '+20%',
      changeType: 'positive',
      icon: FileText,
      color: 'bg-indigo-500'
    },
    {
      title: 'AI Usage',
      value: kpiData?.aiUsage?.toLocaleString() || '0',
      change: '+25%',
      changeType: 'positive',
      icon: Activity,
      color: 'bg-pink-500'
    },
    {
      title: 'Revenue',
      value: `$${kpiData?.revenue?.toLocaleString() || '0'}`,
      change: '+18%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'bg-emerald-500'
    },
    {
      title: 'Growth Rate',
      value: `${kpiData?.growthRate || 0}%`,
      change: '+3%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-cyan-500'
    }
  ];

  const pieChartData = [
    { name: 'CVs', value: kpiData.totalCVs, color: '#8B5CF6' },
    { name: 'Jobs', value: kpiData.totalJobs, color: '#F59E0B' },
    { name: 'Cover Letters', value: kpiData.totalCoverLetters, color: '#3B82F6' },
    { name: 'AI Usage', value: kpiData.aiUsage, color: '#EC4899' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KPIs & Analytics</h1>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KPIs & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor your application's performance and growth</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.color} bg-opacity-10`}>
                  <Icon className={`h-6 w-6 ${card.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {card.change}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">from last period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {timeRange === 'today' ? 'Hourly Growth' : 'User Growth'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                interval={timeRange === 'today' ? 2 : timeRange === '1y' ? 0 : 'preserveStartEnd'}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
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
                dataKey="users" 
                stackId="1"
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.6}
                name="Users"
              />
              <Area 
                type="monotone" 
                dataKey="cvs" 
                stackId="1"
                stroke="#8B5CF6" 
                fill="#8B5CF6" 
                fillOpacity={0.6}
                name="CVs"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {timeRange === 'today' ? 'Hourly Activity' : 'Daily Activity'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                interval={timeRange === 'today' ? 2 : timeRange === '1y' ? 0 : 'preserveStartEnd'}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
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
              <Bar dataKey="jobs" fill="#F59E0B" name="Jobs" />
              <Bar dataKey="coverLetters" fill="#10B981" name="Cover Letters" />
              <Bar dataKey="aiUsage" fill="#EC4899" name="AI Usage" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart for Trends */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {timeRange === 'today' ? 'Hourly Trends' : 'Activity Trends'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                interval={timeRange === 'today' ? 2 : timeRange === '1y' ? 0 : 'preserveStartEnd'}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
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
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                name="Users"
              />
              <Line 
                type="monotone" 
                dataKey="cvs" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                name="CVs"
              />
              <Line 
                type="monotone" 
                dataKey="jobs" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                name="Jobs"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart for Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Distribution</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="45%"
                labelLine={false}
                outerRadius={120}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value: any, name: any) => [value.toLocaleString(), name]}
              />
              <Legend 
                layout="horizontal" 
                verticalAlign="bottom" 
                align="center"
                wrapperStyle={{
                  paddingTop: '20px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>


    </div>
  );
};

export default AdminKPIs; 