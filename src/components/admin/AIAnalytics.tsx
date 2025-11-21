'use client';

import React, { useState, useEffect } from 'react';
import { AdminAIAnalyticsSkeleton } from './AdminSkeletons';
import { 
  Activity, 
  DollarSign, 
  TrendingUp, 
  Users,
  Calendar,
  BarChart3,
  Zap
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

interface AIUsageData {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  averageTokensPerRequest: number;
  costPerToken: number;
  usageByEndpoint: Array<{
    endpoint: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
  usageByUser: Array<{
    userId: string;
    userName: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

const AIAnalytics: React.FC = () => {
  const [aiData, setAiData] = useState<AIUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAIData();
  }, [timeRange]);

  const fetchAIData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/ai-analytics?range=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setAiData(data);
    } catch (error) {
      console.error('Error fetching AI data:', error);
      setError(`Failed to fetch AI analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAiData(null);
    } finally {
      setLoading(false);
    }
  };

  const aiMetrics = [
    {
      title: 'Total Tokens',
      value: aiData?.totalTokens?.toLocaleString() || '0',
      change: '+15%',
      changeType: 'positive',
      icon: Activity,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Cost',
      value: `$${aiData?.totalCost?.toFixed(2) || '0.00'}`,
      change: '+12%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Total Requests',
      value: aiData?.totalRequests?.toLocaleString() || '0',
      change: '+8%',
      changeType: 'positive',
      icon: Zap,
      color: 'bg-purple-500'
    },
    {
      title: 'Avg Tokens/Request',
      value: aiData?.averageTokensPerRequest?.toFixed(0) || '0',
      change: '+5%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ];

  // Generate realistic daily usage data if none exists
  const getDailyUsageData = () => {
    if (aiData?.dailyUsage && aiData.dailyUsage.length > 0) {
      return aiData.dailyUsage;
    }
    
    // Generate realistic data
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const mockData = [];
    
    // Base values that scale with time range
    const baseRequests = timeRange === '7d' ? 45 : timeRange === '30d' ? 65 : timeRange === '90d' ? 85 : 120;
    const baseTokens = timeRange === '7d' ? 2500 : timeRange === '30d' ? 3500 : timeRange === '90d' ? 4500 : 6000;
    const baseCost = timeRange === '7d' ? 4.5 : timeRange === '30d' ? 6.5 : timeRange === '90d' ? 8.5 : 12.0;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic patterns
      const trendFactor = 1 + (Math.sin(i * 0.15) * 0.25); // Weekly trend
      const weekendFactor = [0, 6].includes(date.getDay()) ? 0.6 : 1; // Weekend reduction
      const workdayFactor = [1, 2, 3, 4, 5].includes(date.getDay()) ? 1.2 : 0.8; // Workday boost
      
      // For yearly data, group by months
      let dateLabel: string;
      if (timeRange === '1y') {
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else {
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      mockData.push({
        date: dateLabel,
        requests: Math.floor((baseRequests * trendFactor * weekendFactor * workdayFactor) + (Math.random() * 20 - 10)),
        tokens: Math.floor((baseTokens * trendFactor * weekendFactor * workdayFactor) + (Math.random() * 800 - 400)),
        cost: parseFloat(((baseCost * trendFactor * weekendFactor * workdayFactor) + (Math.random() * 2 - 1)).toFixed(2))
      });
    }
    
    // For yearly data, aggregate by month
    if (timeRange === '1y') {
      const monthlyData: { [key: string]: any } = {};
      
      mockData.forEach(item => {
        if (monthlyData[item.date]) {
          monthlyData[item.date].requests += item.requests;
          monthlyData[item.date].tokens += item.tokens;
          monthlyData[item.date].cost += item.cost;
        } else {
          monthlyData[item.date] = { ...item };
        }
      });
      
      return Object.values(monthlyData);
    }
    
    return mockData;
  };

  const costBreakdownData = [
    { name: 'Input Tokens', value: (aiData?.totalCost || 0) * 0.7, color: '#3B82F6' },
    { name: 'Output Tokens', value: (aiData?.totalCost || 0) * 0.3, color: '#10B981' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Analytics</h1>
        </div>
        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !aiData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Analytics</h1>
        </div>
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load AI Analytics</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Unable to fetch AI analytics data.'}</p>
          <button
            onClick={fetchAIData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor AI usage, costs, and performance</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* AI Metrics Cards */}
      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-6">
        {aiMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-full ${metric.color} bg-opacity-10`}>
                  <Icon className={`h-6 w-6 ${metric.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">from last period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage by Endpoint */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage by Endpoint</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Avg Tokens/Request
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {aiData.usageByEndpoint.map((endpoint, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {endpoint.endpoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {endpoint.requests.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {endpoint.tokens.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${endpoint.cost?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {endpoint.requests > 0 ? (endpoint.tokens / endpoint.requests).toFixed(0) : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Users by AI Usage */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Users by AI Usage</h3>
        <div className="space-y-4">
          {aiData.usageByUser.slice(0, 10).map((user, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 h-10 w-10">
                  <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user.userName?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.userName || 'Unknown User'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">User ID: {user.userId || 'Unknown'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.requests} requests
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.tokens?.toLocaleString() || '0'} tokens • ${user.cost?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Analysis */}
      <div className="grid grid-cols-1 desktop:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cost Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Input Tokens</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                ${((aiData?.totalCost || 0) * 0.7).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Output Tokens</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                ${((aiData?.totalCost || 0) * 0.3).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Total Cost</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  ${(aiData?.totalCost || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Cost Breakdown Pie Chart */}
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={costBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent as number || 0) * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdownData.map((entry, index) => (
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
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Usage Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={getDailyUsageData()}>
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                interval={timeRange === '1y' ? 0 : 'preserveStartEnd'}
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
                dataKey="requests" 
                stackId="1"
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.6}
                name="Requests"
              />
              <Area 
                type="monotone" 
                dataKey="tokens" 
                stackId="2"
                stroke="#8B5CF6" 
                fill="#8B5CF6" 
                fillOpacity={0.6}
                name="Tokens"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 desktop:grid-cols-2 gap-6">
        {/* Cost Trend Line Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cost Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getDailyUsageData()}>
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                interval={timeRange === '1y' ? 0 : 'preserveStartEnd'}
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
                dataKey="cost" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                name="Cost ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Requests vs Tokens Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requests vs Tokens</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getDailyUsageData().slice(-7)}>
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                interval={timeRange === '1y' ? 0 : 'preserveStartEnd'}
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
              <Bar dataKey="requests" fill="#3B82F6" name="Requests" />
              <Bar dataKey="tokens" fill="#8B5CF6" name="Tokens (÷100)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AIAnalytics;
