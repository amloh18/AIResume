'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Users, FileText, TrendingUp, Activity, Clock, Briefcase, Play, Square, Pause, Plus, ArrowUpRight, ArrowUp, Sparkles, Database, Shield, Zap, Calendar, Cpu
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
  const [ingestionData, setIngestionData] = useState<any>(null);
  const [jobIntelligence, setJobIntelligence] = useState<any>(null);
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
      fetchRecentActivities(),
      fetchIngestionData(),
      fetchJobIntelligence(),
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

  const fetchIngestionData = async () => {
    try {
      const response = await fetch('/api/admin/ingestion-monitor?view=overview');
      if (response.ok) {
        const data = await response.json();
        setIngestionData(data);
      }
    } catch (error) {
      console.error('Error fetching ingestion data:', error);
    }
  };

  const fetchJobIntelligence = async () => {
    try {
      const response = await fetch('/api/admin/job-intelligence?view=overview');
      if (response.ok) {
        const data = await response.json();
        setJobIntelligence(data);
      }
    } catch (error) {
      console.error('Error fetching job intelligence:', error);
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
      className="space-y-4"
    >
      {/* Compact toolbar row — heading lives in breadcrumb already */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">
          Live Platform Telemetry · <span className="font-mono">{format(time, 'HH:mm:ss')}</span>
        </p>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-xs transition-all">
            Export Data
          </button>
          <button className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md">
            + New Task
          </button>
        </div>
      </div>

      {/* Row 1: 6 stat pills */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Total Users',
            value: kpiData?.totalUsers?.toLocaleString() || '0',
            sub: `${kpiData?.activeUsers || 0} online`,
            icon: Users,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            badge: kpiData?.growthRate !== undefined ? `${kpiData.growthRate > 0 ? '+' : ''}${kpiData.growthRate}%` : null,
            onClick: () => onTabChange?.('management', 'users'),
          },
          {
            label: 'Revenue',
            value: `₹${(kpiData?.revenue || 0).toLocaleString()}`,
            sub: 'All time',
            icon: TrendingUp,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            badge: null,
            solid: true,
            onClick: () => onTabChange?.('management', 'pricing'),
          },
          {
            label: 'CVs Created',
            value: (kpiData?.totalCVs || 0).toLocaleString(),
            sub: 'Master CVs',
            icon: FileText,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            badge: null,
            onClick: () => onTabChange?.('analytics', 'cv-journey'),
          },
          {
            label: 'Jobs Tracked',
            value: (kpiData?.totalJobs || 0).toLocaleString(),
            sub: `${kpiData?.draftJobs || 0} drafts`,
            icon: Briefcase,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            badge: null,
            onClick: () => onTabChange?.('jobs'),
          },
          {
            label: 'AI Activity',
            value: (kpiData?.aiUsage || 0).toLocaleString(),
            sub: 'API calls',
            icon: Zap,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            badge: null,
            onClick: () => onTabChange?.('analytics', 'ai'),
          },
          {
            label: 'Cover Letters',
            value: (kpiData?.totalCoverLetters || 0).toLocaleString(),
            sub: 'Generated',
            icon: Sparkles,
            color: 'text-pink-400',
            bg: 'bg-pink-500/10',
            badge: null,
            onClick: () => onTabChange?.('analytics', 'ai'),
          },
        ].map((stat, i) => (
          <motion.button
            key={i}
            variants={item}
            onClick={stat.onClick}
            className={`text-left p-4 rounded-2xl border shadow-xl transition-all group ${
              stat.solid
                ? 'bg-emerald-600 border-transparent hover:bg-emerald-500'
                : 'bg-[#111216] border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-xl ${stat.solid ? 'bg-black/15' : stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.solid ? 'text-black' : stat.color}`} />
              </div>
              {stat.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                  {stat.badge}
                </span>
              )}
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${stat.solid ? 'text-black/60' : 'text-white/40'}`}>
              {stat.label}
            </p>
            <p className={`text-2xl font-black tracking-tight ${stat.solid ? 'text-black' : 'text-white'}`}>
              {stat.value}
            </p>
            <p className={`text-[10px] mt-0.5 ${stat.solid ? 'text-black/50' : 'text-white/30'}`}>
              {stat.sub}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Row 2: Usage trend chart (wide) + System Health + User Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Usage Trends chart */}
        <motion.div
          variants={item}
          className="lg:col-span-5 bg-[#111216] border border-white/5 rounded-2xl p-5 shadow-xl"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-white font-bold text-sm tracking-tight">Usage Trends</h3>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-0.5">Last 7 Days</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-white/40">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />New Users</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />CVs Created</span>
            </div>
          </div>
          <div className="h-[180px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCvs2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers2)" name="New Users" />
                  <Area type="monotone" dataKey="cvs" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCvs2)" name="CVs Created" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-widest">
                Awaiting Data…
              </div>
            )}
          </div>
        </motion.div>

        {/* System Health */}
        <motion.button
          variants={item}
          onClick={() => onTabChange?.('analytics', 'system')}
          className="lg:col-span-4 bg-[#111216] border border-white/5 rounded-2xl p-5 text-left shadow-xl hover:border-white/10 transition-colors relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">System Health</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Healthy</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Speed</p>
                <p className="text-xl font-black text-white">{kpiData?.systemHealth?.speed || 24}<span className="text-[10px] text-white/40 ml-0.5">ms</span></p>
              </div>
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Uptime</p>
                <p className="text-xl font-black text-white">{kpiData?.systemHealth?.status || 100}<span className="text-[10px] text-white/40 ml-0.5">%</span></p>
              </div>
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Load</p>
                <p className="text-xl font-black text-white">{kpiData?.systemHealth?.load || 0}<span className="text-[10px] text-white/40 ml-0.5">%</span></p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold text-white/40 mb-1.5">
                <span>Overall Progress</span>
                <span>{kpiData?.systemHealth?.status || 100}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${kpiData?.systemHealth?.status || 100}%` }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.button>

        {/* User Breakdown pie */}
        <motion.div
          variants={item}
          className="lg:col-span-3 bg-[#111216] border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col"
        >
          <div className="mb-3">
            <h3 className="text-white font-bold text-sm tracking-tight">User Breakdown</h3>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">Platform Activity</p>
          </div>
          <div className="flex-1 relative min-h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-white">{kpiData?.efficiency || 0}%</span>
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Efficiency</span>
            </div>
          </div>
          <div className="space-y-1.5 mt-3">
            {pieData.map((entry, idx) => {
              const total = pieData.reduce((a, c) => a + c.value, 0);
              const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
              return (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-[11px] text-white/60">{entry.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-white">{pct}%</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Row 3: Ingestion Worker + Job Pipeline + Auto-Apply Fleet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Ingestion Worker Report */}
        <motion.button
          variants={item}
          onClick={() => onTabChange?.('job-intelligence', 'sources')}
          className="bg-[#111216] border border-white/5 rounded-2xl p-5 text-left shadow-xl hover:border-white/10 transition-colors relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Ingestion Worker</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${ingestionData?.sources?.unhealthy === 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${ingestionData?.sources?.unhealthy === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {ingestionData?.sources?.unhealthy === 0 ? 'Healthy' : 'Degraded'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Sources</p>
                <p className="text-xl font-black text-white">{ingestionData?.sources?.healthy || 0}<span className="text-[10px] text-white/40 ml-0.5">/ {ingestionData?.sources?.total || 0}</span></p>
              </div>
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Demand Queue</p>
                <p className="text-xl font-black text-white">{ingestionData?.demand?.total || 0}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Stale</p>
                <p className="text-xl font-black text-amber-400">{ingestionData?.demand?.stale || 0}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Fetching</p>
                <p className="text-xl font-black text-cyan-400">{ingestionData?.demand?.fetching || 0}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/30">Scheduler: {ingestionData?.scheduler?.running ? 'Running' : 'Idle'}</span>
              <span className="text-white/20 group-hover:text-amber-400 transition-colors">View Details →</span>
            </div>
          </div>
        </motion.button>

        {/* Job Pipeline Overview */}
        <motion.button
          variants={item}
          onClick={() => onTabChange?.('job-intelligence', 'overview')}
          className="bg-[#111216] border border-white/5 rounded-2xl p-5 text-left shadow-xl hover:border-white/10 transition-colors relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                  <Briefcase className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Job Pipeline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Live</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Active Jobs</p>
                <p className="text-xl font-black text-white">{jobIntelligence?.totalActive || 0}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">New Today</p>
                <p className="text-xl font-black text-emerald-400">{jobIntelligence?.newToday || 0}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Stale</p>
                <p className="text-xl font-black text-amber-400">{jobIntelligence?.totalStale || 0}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Success Rate</p>
                <p className="text-xl font-black text-white">{jobIntelligence?.successRate || 0}<span className="text-[10px] text-white/40 ml-0.5">%</span></p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/30">Duplicates: {jobIntelligence?.duplicateRate || 0}%</span>
              <span className="text-white/20 group-hover:text-purple-400 transition-colors">View Pipeline →</span>
            </div>
          </div>
        </motion.button>

        {/* Auto-Apply Fleet */}
        <motion.div
          variants={item}
          className="bg-[#111216] border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/10 rounded-xl">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Auto-Apply Fleet</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">3 Nodes</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Node Alpha', status: 'running', jobs: 12, latency: '2.1s' },
                { name: 'Node Beta', status: 'running', jobs: 8, latency: '1.8s' },
                { name: 'Node Gamma', status: 'idle', jobs: 0, latency: '—' },
              ].map((node, i) => (
                <div key={i} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'running' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    <span className="text-[11px] font-bold text-white">{node.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-white/40">{node.jobs} jobs</span>
                    <span className="text-white/30">{node.latency}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px]">
              <span className="text-white/30">Queue: 0 pending</span>
              <span className="text-white/40">Total: 20 jobs processed</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 4: Recent Registered Users — compact table */}
      <motion.div
        variants={item}
        className="bg-[#111216] border border-white/5 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Signups</h3>
            <p className="text-[10px] text-white/40 mt-0.5">Latest registered users</p>
          </div>
          <button
            onClick={() => onTabChange?.('management', 'users')}
            className="px-3 py-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white"
          >
            View All Users
          </button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.04] bg-white/[0.01]">
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Email</th>
              <th className="text-center px-5 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Plan</th>
              <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {recentUsers.length > 0 ? recentUsers.slice(0, 8).map((user, idx) => {
              const plan = user.subscription?.planKey || user.currentPlanKey || 'free';
              const isFree = plan === 'free' || plan === 'FREE' || plan === '';
              const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'User';
              const initials = name.charAt(0).toUpperCase();
              return (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      {user.avatar ? (
                        <img src={user.avatar} alt={name} className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-black font-bold text-[11px] shrink-0">
                          {initials}
                        </div>
                      )}
                      <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">{name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-white/50 font-normal truncate max-w-[180px]">{user.email || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    {isFree ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/10 bg-white/5 text-white/40">Free</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 capitalize">{plan}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-white/40 font-mono whitespace-nowrap">
                    {user.createdAt ? format(new Date(user.createdAt), 'dd MMM, HH:mm') : '—'}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-white/20 text-xs">No recent signups</td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

    </motion.div>
  );
};

export default AdminKPIs;
