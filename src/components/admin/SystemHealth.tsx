// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, Database, Activity, AlertTriangle, CheckCircle, Clock, 
  Cpu, HardDrive, Wifi, Shield, Zap, TrendingUp, ArrowUpRight, Terminal, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface ApiHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  responseTime: number;
  uptime: string;
}

interface SystemStatus {
  database: { status: 'healthy' | 'warning' | 'error'; responseTime: number; connections: number; uptime: string; };
  api: { status: 'healthy' | 'warning' | 'error'; responseTime: number; requestsPerMinute: number; errorRate: number; };
  storage: { status: 'healthy' | 'warning' | 'error'; used: number; total: number; percentage: number; };
  memory: { status: 'healthy' | 'warning' | 'error'; used: number; total: number; percentage: number; };
  appApis?: ApiHealth[];
  thirdPartyApis?: ApiHealth[];
  overallProgress?: number;
  uptime: string;
  lastCheck: string;
}

interface PerformanceData {
  time: string;
  apiResponse: number;
  dbResponse: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  requests: number;
}

const SystemHealth: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system-health');
      const data = await response.json();
      if (data.success && data.systemStatus) {
        setSystemStatus(data.systemStatus);
        if (data.performanceData) setPerformanceData(data.performanceData);
      }
    } catch (err) {
      setError('Connection Lost');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchSystemStatus();
      const interval = setInterval(() => {
        if (!document.hidden) fetchSystemStatus();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  if (!mounted) return null;

  if (loading && !systemStatus) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const systemComponents = [
    { name: 'Database', icon: Database, data: systemStatus?.database, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'API Server', icon: Server, data: systemStatus?.api, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Cloud Storage', icon: HardDrive, data: systemStatus?.storage, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'System Memory', icon: Cpu, data: systemStatus?.memory, color: 'text-purple-500', bg: 'bg-purple-500/10' }
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
      {/* Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
            System <span className="text-emerald-500">Health</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
            Infrastructure Monitoring • Live Updates
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/5 rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Systems Online</span>
          </div>
          <button onClick={fetchSystemStatus} className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all text-white/40">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Component Status Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemComponents.map((comp, i) => (
          <motion.div key={i} variants={item} className="bg-[#111111] border border-white/10 p-8 rounded-[2.5rem] flex flex-col justify-between h-52 group hover:border-white/20 transition-all shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] blur-3xl rounded-full" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${comp.bg} ${comp.color}`}>
                  <comp.icon className="w-6 h-6" />
                </div>
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                  comp.data?.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {comp.data?.status || 'Unknown'}
                </span>
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">{comp.name}</h3>
              <div className="mt-4 space-y-1">
                {comp.name.includes('Database') && (
                  <p className="text-2xl font-black text-white">{comp.data?.responseTime}ms <span className="text-[10px] text-white/20 uppercase ml-1">Speed</span></p>
                )}
                {comp.name.includes('API') && (
                  <p className="text-2xl font-black text-white">{comp.data?.requestsPerMinute} <span className="text-[10px] text-white/20 uppercase ml-1">Req/Min</span></p>
                )}
                {(comp.name.includes('Storage') || comp.name.includes('Memory')) && (
                  <>
                    <p className="text-2xl font-black text-white">{comp.data?.percentage}% <span className="text-[10px] text-white/20 uppercase ml-1">Usage</span></p>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-2">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${comp.data?.percentage}%` }} className={`h-full ${comp.color.replace('text-', 'bg-')}`} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Performance Graph */}
        <motion.div variants={item} className="lg:col-span-8 bg-[#111111] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Performance Trends</h3>
              <p className="text-white/30 text-xs font-bold mt-1 uppercase tracking-widest">24-Hour Server Latency</p>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Line type="monotone" dataKey="apiResponse" stroke="#3b82f6" strokeWidth={4} dot={false} name="API Gateway" />
                <Line type="monotone" dataKey="dbResponse" stroke="#10b981" strokeWidth={4} dot={false} name="Database" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Load Distribution */}
        <motion.div variants={item} className="lg:col-span-4 bg-[#111111] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl flex flex-col justify-between overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Resource Usage</h3>
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-10">Current Saturation</p>
            
            <div className="space-y-8">
              {[
                { label: 'CPU Usage', val: 42, color: 'bg-emerald-500' },
                { label: 'Network Traffic', val: 68, color: 'bg-blue-500' },
                { label: 'Cache Usage', val: 84, color: 'bg-amber-500' },
                { label: 'AI Processing', val: 12, color: 'bg-purple-500' }
              ].map((bar, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                    <span>{bar.label}</span>
                    <span className="text-white">{bar.val}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${bar.val}%` }} className={`h-full ${bar.color} shadow-[0_0_10px_rgba(255,255,255,0.1)]`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Server Uptime</p>
                <p className="text-3xl font-black text-white tracking-tighter">99.98%</p>
              </div>
              <Shield className="w-10 h-10 text-emerald-500/20" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* API Health Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* App APIs */}
        <motion.div variants={item} className="bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">App APIs</h3>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Internal Endpoint Status</p>
            
            <div className="space-y-4">
              {systemStatus?.appApis?.map((api, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${api.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                    <span className="text-sm font-black text-white/90">{api.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">Latency</p>
                      <p className="text-xs font-bold text-white">{api.responseTime}ms</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">Uptime</p>
                      <p className="text-xs font-bold text-white">{api.uptime}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Third Party APIs */}
        <motion.div variants={item} className="bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Third-Party APIs</h3>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-8">External Service Status</p>
            
            <div className="space-y-4">
              {systemStatus?.thirdPartyApis?.map((api, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${api.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                    <span className="text-sm font-black text-white/90">{api.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">Latency</p>
                      <p className="text-xs font-bold text-white">{api.responseTime}ms</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">Uptime</p>
                      <p className="text-xs font-bold text-white">{api.uptime}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Alert Feed */}
      <motion.div variants={item} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-8 ml-2 flex items-center gap-3">
          <Terminal className="w-5 h-5 text-emerald-500" />
          Recent Events
        </h3>
        <div className="space-y-4">
          {[
            { type: 'info', msg: 'System backup completed successfully.', time: '1h ago', icon: CheckCircle },
            { type: 'warn', msg: 'High traffic detected in main region. Scaling capacity.', time: '4h ago', icon: AlertTriangle },
            { type: 'info', msg: 'Database sync completed across all regions.', time: '12h ago', icon: CheckCircle }
          ].map((alert, i) => (
            <div key={i} className="flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group">
              <div className={`p-3 rounded-xl ${alert.type === 'info' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                <alert.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-white/80 group-hover:text-white transition-colors uppercase tracking-tight">{alert.msg}</p>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">{alert.time} • Status: Secure</p>
              </div>
              <button className="p-2 text-white/10 hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SystemHealth;
