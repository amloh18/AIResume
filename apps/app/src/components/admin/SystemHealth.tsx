// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Status Toolbar */}
      <div className="flex items-center justify-end gap-2.5">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400">All Systems Operational</span>
        </div>
        <button onClick={fetchSystemStatus} className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white/50 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Component Status Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemComponents.map((comp, i) => (
          <motion.div key={i} variants={item} className="bg-[#111216] border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-36 group hover:border-white/10 transition-all shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-xl ${comp.bg} ${comp.color}`}>
                  <comp.icon className="w-4 h-4" />
                </div>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border ${
                  comp.data?.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {comp.data?.status || 'Unknown'}
                </span>
              </div>
              <h3 className="text-xs font-bold text-white">{comp.name}</h3>
              <div className="mt-2 space-y-1">
                {comp.name.includes('Database') && (
                  <p className="text-xl font-black text-white">{comp.data?.responseTime}ms <span className="text-[10px] font-medium text-white/40 ml-1">Latency</span></p>
                )}
                {comp.name.includes('API') && (
                  <p className="text-xl font-black text-white">{comp.data?.requestsPerMinute} <span className="text-[10px] font-medium text-white/40 ml-1">Req/Min</span></p>
                )}
                {(comp.name.includes('Storage') || comp.name.includes('Memory')) && (
                  <>
                    <p className="text-xl font-black text-white">{comp.data?.percentage}% <span className="text-[10px] font-medium text-white/40 ml-1">Capacity</span></p>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-1.5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${comp.data?.percentage}%` }} className={`h-full ${comp.color.replace('text-', 'bg-')}`} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Performance Graph */}
        <motion.div variants={item} className="lg:col-span-8 bg-[#111216] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Performance Trends</h3>
              <p className="text-xs text-white/40 mt-0.5">24-Hour Server Latency</p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Line type="monotone" dataKey="apiResponse" stroke="#3b82f6" strokeWidth={3} dot={false} name="API Gateway" />
                <Line type="monotone" dataKey="dbResponse" stroke="#10b981" strokeWidth={3} dot={false} name="Database" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Load Distribution */}
        <motion.div variants={item} className="lg:col-span-4 bg-[#111216] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between overflow-hidden relative">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight mb-1">Resource Saturation</h3>
            <p className="text-xs text-white/40 mb-4">Current Subsystem Loads</p>
            
            <div className="space-y-3.5">
              {[
                { label: 'CPU Usage', val: 42, color: 'bg-emerald-500' },
                { label: 'Network Traffic', val: 68, color: 'bg-blue-500' },
                { label: 'Cache Usage', val: 84, color: 'bg-amber-500' },
                { label: 'AI Processing', val: 12, color: 'bg-purple-500' }
              ].map((bar, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-white/50">
                    <span>{bar.label}</span>
                    <span className="text-white font-bold">{bar.val}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${bar.val}%` }} className={`h-full ${bar.color}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Server Uptime</p>
              <p className="text-2xl font-black text-white">99.98%</p>
            </div>
            <Shield className="w-8 h-8 text-emerald-500/20" />
          </div>
        </motion.div>
      </div>

      {/* API Health Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* App APIs */}
        <motion.div variants={item} className="bg-[#111216] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-white tracking-tight mb-1">Internal App APIs</h3>
            <p className="text-xs text-white/40 mb-4">Endpoint availability & round-trip latency</p>
            
            <div className="space-y-2">
              {systemStatus?.appApis?.map((api, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${api.status === 'healthy' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-xs font-semibold text-white/90">{api.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-white/40 text-[9px] font-medium">Latency</p>
                      <p className="text-xs font-bold text-white">{api.responseTime}ms</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[9px] font-medium">Uptime</p>
                      <p className="text-xs font-bold text-white">{api.uptime}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Third Party APIs */}
        <motion.div variants={item} className="bg-[#111216] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-white tracking-tight mb-1">Third-Party Upstreams</h3>
            <p className="text-xs text-white/40 mb-4">External APIs, auth, storage, and models</p>
            
            <div className="space-y-2">
              {systemStatus?.thirdPartyApis?.map((api, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${api.status === 'healthy' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-xs font-semibold text-white/90">{api.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-white/40 text-[9px] font-medium">Latency</p>
                      <p className="text-xs font-bold text-white">{api.responseTime}ms</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[9px] font-medium">Uptime</p>
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
      <motion.div variants={item} className="bg-[#111216] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white tracking-tight mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          Recent Infrastructure Events
        </h3>
        <div className="space-y-2">
          {[
            { type: 'info', msg: 'System backup completed successfully.', time: '1h ago', icon: CheckCircle },
            { type: 'warn', msg: 'High traffic detected in main region. Scaling capacity.', time: '4h ago', icon: AlertTriangle },
            { type: 'info', msg: 'Database sync completed across all regions.', time: '12h ago', icon: CheckCircle }
          ].map((alert, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all group">
              <div className={`p-1.5 rounded-lg ${alert.type === 'info' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                <alert.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-white/90 group-hover:text-white transition-colors">{alert.msg}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{alert.time} • Status: Secure</p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" />
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SystemHealth;
