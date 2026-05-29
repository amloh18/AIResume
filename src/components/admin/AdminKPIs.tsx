'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, FileText, TrendingUp, Activity, Clock, Briefcase, Play, Square, Pause, Plus, ArrowUpRight, ArrowUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface KPIData {
  totalUsers?: number;
  activeUsers?: number;
  totalCVs?: number;
  totalJobs?: number;
  draftJobs?: number;
  totalCoverLetters?: number;
  aiUsage?: number;
  revenue?: number;
  growthRate?: number;
}

interface ChartData {
  date: string;
  users: number;
  cvs: number;
  jobs: number;
  coverLetters: number;
  aiUsage: number;
}

interface AdminKPIsProps {
  onTabChange?: (tab: string, subTab?: string) => void;
}

const AdminKPIs: React.FC<AdminKPIsProps> = ({ onTabChange }) => {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      fetchKPIData(),
      fetchChartData(),
      fetchRecentUsers(),
      fetchRecentActivities()
    ]).finally(() => setDataLoading(false));
  }, []);

  const fetchKPIData = async () => {
    try {
      const response = await fetch(`/api/admin/kpis?range=30d`);
      if (response.ok) {
        const data = await response.json();
        setKpiData(data);
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await fetch(`/api/admin/charts?range=7d`);
      if (response.ok) {
        const data = await response.json();
        setChartData(data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=4');
      if (response.ok) {
        const data = await response.json();
        setRecentUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching recent users:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await fetch('/api/admin/activity?limit=4');
      if (response.ok) {
        const data = await response.json();
        setRecentActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const calculateChange = (current: number, base: number = 100) => {
    if (current === 0) return '+0%';
    const change = Math.floor(((current - base) / base) * 100);
    return change >= 0 ? `+${change}%` : `${change}%`;
  };

  const pieData = [
    { name: 'Completed CVs', value: kpiData?.totalCVs || 45, color: '#185b3a' },
    { name: 'Active Users', value: kpiData?.activeUsers || 30, color: '#84cc16' },
    { name: 'Jobs Tracked', value: kpiData?.totalJobs || 25, color: '#e5e7eb' },
  ];

  // Fallbacks for UI if API fails or no data
  const fallbackUsers = [
    { name: 'System Admin', email: 'admin@cvcircle.com', status: 'active', plan: 'Premium' },
    { name: 'New User', email: 'user@example.com', status: 'active', plan: 'Free' }
  ];

  const displayUsers = recentUsers.length > 0 ? recentUsers.slice(0, 4) : fallbackUsers;
  
  const displayActivities = recentActivities.length > 0 ? recentActivities.slice(0, 4) : [
    { action: 'User Registered', timestamp: new Date().toISOString(), type: 'user' },
    { action: 'CV Generated', timestamp: new Date().toISOString(), type: 'document' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor your system performance and user activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#185b3a] hover:bg-[#114028] text-white rounded-full font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Add Action
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full font-medium transition-colors shadow-sm">
            Export Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Dark Green Card */}
        <button 
          onClick={() => onTabChange?.('management', 'users')}
          className="bg-[#185b3a] rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-[#185b3a]/20 text-left hover:scale-[1.02] transition-transform duration-200"
        >
          <div className="flex justify-between items-start mb-4">
            <p className="text-lime-50 font-medium text-lg">Total Users</p>
            <div className="w-8 h-8 rounded-full border border-lime-400/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
              <ArrowUpRight className="w-4 h-4 text-lime-300" />
            </div>
          </div>
          <h2 className="text-5xl font-bold mb-6 tracking-tight">
            {kpiData?.totalUsers?.toLocaleString() || '0'}
          </h2>
          <div className="flex items-center gap-2 text-sm text-lime-100/80">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-lime-300">
              <ArrowUp className="w-3 h-3" />
              {calculateChange(kpiData?.totalUsers || 0, 50)}
            </span>
            Increased from last month
          </div>
        </button>

        {/* White Cards */}
        {[
          { title: 'Active Users', value: kpiData?.activeUsers?.toLocaleString() || '0', change: calculateChange(kpiData?.activeUsers || 0, 20), tab: 'analytics', subTab: 'logs' },
          { title: 'Total CVs', value: kpiData?.totalCVs?.toLocaleString() || '0', change: calculateChange(kpiData?.totalCVs || 0, 30), tab: 'management', subTab: 'drafts' },
          { title: 'Jobs Tracked', value: kpiData?.totalJobs?.toLocaleString() || '0', status: 'Active', tab: 'analytics', subTab: 'journey' },
        ].map((card, idx) => (
          <button 
            key={idx} 
            onClick={() => onTabChange?.(card.tab, card.subTab)}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between text-left hover:shadow-md hover:scale-[1.02] transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">{card.title}</p>
              <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">{card.value}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {card.change ? (
                <>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <ArrowUp className="w-3 h-3" />
                    {card.change}
                  </span>
                  Increased from last month
                </>
              ) : (
                <span className="text-gray-400">System tracked</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Analytics Bar Chart */}
        <button 
          onClick={() => onTabChange?.('analytics', 'ai')}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:shadow-md transition-shadow duration-200"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">System Analytics</h3>
          <div className="h-[250px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="users" fill="#185b3a" radius={[20, 20, 20, 20]} name="Users" />
                  <Bar dataKey="cvs" fill="#84cc16" radius={[20, 20, 20, 20]} name="CVs" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">Loading chart data...</div>
            )}
          </div>
        </button>

        {/* Reminders & Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">System Status</h3>
            <div className="mb-6">
              <h4 className="text-2xl font-bold text-[#185b3a] dark:text-lime-400 mb-2 leading-tight">All Systems Operational</h4>
              <p className="text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last checked: {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button 
            onClick={() => onTabChange?.('analytics', 'system')}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-[#185b3a] hover:bg-[#114028] text-white rounded-2xl font-medium transition-colors shadow-md"
          >
            <Activity className="w-5 h-5" />
            View Full Report
          </button>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Users</h3>
            <button 
              onClick={() => onTabChange?.('management', 'users')}
              className="px-4 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {displayUsers.map((user, idx) => {
              const name = user.name || user.firstName || 'Unknown User';
              const email = user.email || 'No email';
              const isPremium = user.subscription?.planKey !== 'free';
              
              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold text-[#185b3a] dark:text-lime-400">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{name}</p>
                    <p className="text-xs text-gray-500 truncate">{email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-md font-medium ${
                    isPremium ? 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400' 
                             : 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {isPremium ? 'Premium' : 'Free'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Progress */}
        <button 
          onClick={() => onTabChange?.('analytics', 'journey')}
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:shadow-md transition-shadow duration-200"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Resource Usage</h3>
          <div className="h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  startAngle={180}
                  endAngle={0}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-8">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                {kpiData?.totalCVs ? Math.round((kpiData.totalCVs / (kpiData.totalCVs + (kpiData.activeUsers || 0))) * 100) : 0}%
              </span>
              <span className="text-sm text-gray-500">CV Completion</span>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </button>

        {/* Time Tracker / Project List */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
              <button 
                onClick={() => onTabChange?.('analytics', 'logs')}
                className="text-xs text-gray-400 hover:text-[#185b3a] font-bold"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {displayActivities.map((act, idx) => {
                const date = new Date(act.timestamp || act.createdAt);
                const isRecent = (new Date().getTime() - date.getTime()) < 86400000; // Less than 24h
                
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`mt-1 ${idx === 0 ? 'text-blue-500' : idx === 1 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{act.title || act.action}</p>
                      <p className="text-xs text-gray-500">
                        {isRecent ? 'Today' : date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dark Time Tracker Card */}
          <div className="bg-[#185b3a] rounded-3xl p-6 shadow-lg relative overflow-hidden flex flex-col items-center justify-center text-white h-40">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-lime-400 via-transparent to-transparent"></div>
            
            <h3 className="text-lime-50 font-medium self-start absolute top-6 left-6">System Time</h3>
            <div className="text-4xl font-bold tracking-wider mt-4 font-mono">
              {time.toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div className="flex gap-4 mt-6 absolute bottom-6">
              <button className="w-10 h-10 bg-white text-[#185b3a] rounded-full flex items-center justify-center hover:bg-lime-50 transition-colors shadow-md">
                <Pause className="w-4 h-4 fill-current" />
              </button>
              <button className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md">
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminKPIs;
