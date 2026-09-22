'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, FileText, TrendingUp, Activity, Clock, Briefcase, Play, Square, Pause, Plus, ArrowUpRight, ArrowUp, Sparkles, Database, Shield, Zap, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { motion } from 'framer-motion';
import { CHIP_INLINE, CHIP_TONES_DARK } from '@/components/ui/chip-styles';

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
  systemHealth?: {
    speed: number;
    status: number;
    load: number;
  };
  efficiency?: number;
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
  const [kpiData, setKPIData] = useState<KPIData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    Promise.all([
      fetchKPIData(),
      fetchChartData(),
      fetchRecentUsers(),
      fetchRecentActivities()
    ]).finally(() => setDataLoading(false));
  }, [mounted]);

  if (!mounted) return null;

  const fetchKPIData = async () => {
    try {
      const response = await fetch(`/api/admin/kpis?range=30d`);
      if (response.ok) {
        const data = await response.json();
        setKPIData(data);
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
      const response = await fetch('/api/admin/users?limit=6');
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
      const response = await fetch('/api/admin/activity?limit=6');
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
    { name: 'Completed CVs', value: kpiData?.totalCVs || 0, color: '#10b981' },
    { name: 'Active Users', value: kpiData?.activeUsers || 0, color: '#3b82f6' },
    { name: 'Jobs Tracked', value: kpiData?.totalJobs || 0, color: '#6366f1' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-10"
    >
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-black text-white tracking-tighter"
          >
            ADMIN <span className="text-emerald-500">DASHBOARD</span>
          </motion.h1>
          <p className="text-white/40 font-medium tracking-[0.2em] uppercase text-xs mt-2">
            Live Stats & Analytics • v2.6.0
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm transition-all backdrop-blur-md">
            Export Data
          </button>
          <button className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            + New Task
          </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-[160px]">
        
        {/* Large Stats Card (Obsidian Emerald) */}
        <motion.button 
          variants={item}
          onClick={() => onTabChange?.('management', 'users')}
          className="lg:col-span-4 lg:row-span-2 bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group text-left shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <div className={`${CHIP_INLINE} font-black tracking-widest uppercase ${CHIP_TONES_DARK.emerald}`}>
                <ArrowUp className="w-3 h-3" />
                {kpiData?.growthRate !== undefined ? `${kpiData.growthRate > 0 ? '+' : ''}${kpiData.growthRate}%` : '0%'}
              </div>
            </div>
            <div>
              <p className="text-white/30 text-xs font-black uppercase tracking-[0.2em] mb-2">Total Users</p>
              <h2 className="text-6xl font-black text-white tracking-tighter">
                {kpiData?.totalUsers?.toLocaleString() || '0'}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-white/20">
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {kpiData?.activeUsers || 0} Online
              </span>
              <span>•</span>
              <span>Updated Just Now</span>
            </div>
          </div>
        </motion.button>

        {/* System Health (Medium) */}
        <motion.button 
          variants={item}
          onClick={() => onTabChange?.('analytics', 'system')}
          className="lg:col-span-5 lg:row-span-2 bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group text-left shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-black text-sm uppercase tracking-[0.2em]">System Health</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Healthy</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Speed</p>
                  <p className="text-3xl font-black text-white">{kpiData?.systemHealth?.speed || 24}<span className="text-sm text-white/30 ml-1">ms</span></p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Status</p>
                  <p className="text-3xl font-black text-white">{kpiData?.systemHealth?.status || 100}<span className="text-sm text-white/30 ml-1">%</span></p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">
                <span>Overall Progress</span>
                <span>{kpiData?.systemHealth?.status || 100}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${kpiData?.systemHealth?.status || 100}%` }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                />
              </div>
              <div className="flex gap-2">
                <div className={`h-1 flex-1 rounded-full ${kpiData?.systemHealth?.load && kpiData.systemHealth.load > 25 ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
                <div className={`h-1 flex-1 rounded-full ${kpiData?.systemHealth?.load && kpiData.systemHealth.load > 50 ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
                <div className={`h-1 flex-1 rounded-full ${kpiData?.systemHealth?.load && kpiData.systemHealth.load > 75 ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
                <div className={`h-1 flex-1 rounded-full ${kpiData?.systemHealth?.load && kpiData.systemHealth.load > 90 ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
              </div>
            </div>
          </div>
        </motion.button>

        {/* Small Action Card (Obsidian) */}
        <motion.div 
          variants={item}
          onClick={() => onTabChange?.('management', 'pricing')}
          className="lg:col-span-3 lg:row-span-1 bg-emerald-600 rounded-[2rem] p-6 flex items-center justify-between group cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          <div className="text-black">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Revenue</h4>
            <p className="text-2xl font-black tracking-tighter">₹{(kpiData?.revenue || 0).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-black/10 rounded-2xl">
            <TrendingUp className="w-6 h-6 text-black" />
          </div>
        </motion.div>

        {/* Small Stat Card (Obsidian) */}
        <motion.div 
          variants={item}
          onClick={() => onTabChange?.('analytics', 'ai')}
          className="lg:col-span-3 lg:row-span-1 bg-[#111111] border border-white/10 rounded-[2rem] p-6 flex items-center justify-between group hover:border-emerald-500/50 transition-all cursor-pointer shadow-xl"
        >
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">AI Activity</h4>
            <p className="text-2xl font-black text-white tracking-tighter">{(kpiData?.aiUsage || 0).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl text-emerald-500">
            <Zap className="w-6 h-6" />
          </div>
        </motion.div>

        {/* System Analytics Area Chart (Wide) */}
        <motion.button 
          variants={item}
          onClick={() => onTabChange?.('analytics', 'ai')}
          className="lg:col-span-8 lg:row-span-3 bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 text-left shadow-2xl relative overflow-hidden group"
        >
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-white font-black text-lg tracking-tight">Usage Trends</h3>
              <p className="text-white/30 text-xs font-medium mt-1 uppercase tracking-widest">Last 7 Days</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">
              <Calendar className="w-3 h-3" />
              This Week
            </div>
          </div>
          
          <div className="h-[280px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCvs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" name="New Users" />
                  <Area type="monotone" dataKey="cvs" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCvs)" name="CVs Created" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white/20 uppercase font-black tracking-widest text-xs">Awaiting Data Streams...</div>
            )}
          </div>
        </motion.button>

        {/* Side Panel: Resource Distribution */}
        <motion.div 
          variants={item}
          className="lg:col-span-4 lg:row-span-3 bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col"
        >
          <h3 className="text-white font-black text-lg tracking-tight mb-2">User Breakdown</h3>
          <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-6">Platform Activity</p>
          
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
              <span className="text-3xl font-black text-white tracking-tighter">{kpiData?.efficiency || 0}%</span>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Efficiency</span>
            </div>
          </div>
          
          <div className="space-y-3 mt-6">
            {pieData.map((item, idx) => {
              const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={idx} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-white/60">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-white">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Active Nodes (Small Grid) - NOW FULL WIDTH */}
        <motion.div 
          variants={item}
          className="lg:col-span-12 lg:row-span-2 bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-white font-black text-lg tracking-tight">Users List</h3>
            <button 
              onClick={() => onTabChange?.('management', 'users')}
              className="px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-[10px] font-black uppercase tracking-widest text-white/40"
            >
              View Full Directory
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {recentUsers.slice(0, 12).map((user, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center bg-white/[0.02] p-6 rounded-[1.5rem] border border-white/5 text-center hover:bg-white/[0.05] transition-all group">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={`${user.firstName || 'User'}`}
                    className="w-12 h-12 rounded-2xl object-cover border border-white/10 mb-4 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-black font-black text-lg mb-4 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
                    {(user.name || user.firstName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="text-sm font-black text-white truncate w-full px-2">{user.name || user.firstName || 'User'}</p>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em] mt-1">{user.subscription?.planKey || 'Free'}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default AdminKPIs;
