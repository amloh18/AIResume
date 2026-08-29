'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, RefreshCw, AlertCircle, CheckCircle, Clock,
  FileText, Brain, Activity, CreditCard, Upload, Settings, X, 
  ChevronDown, ChevronUp, Zap, Shield, Globe, ArrowUpRight, Terminal, User
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LogType, LogStatus } from '@/models/ActivityLog';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityLog {
  _id: string;
  logType: LogType;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  action: string;
  status: LogStatus;
  errorMessage?: string;
  aiMetadata?: { model?: string; tokensUsed?: number; cost?: number; };
}

interface LogMetrics {
  totalLogs: number;
  errorRate: number;
  avgResponseTime: number;
  totalAIUsage: { tokens: number; cost: number; requests: number; };
}

export default function LogsViewer() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<LogMetrics | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | '90d'>('7d');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: String(pageSize),
        skip: String((currentPage - 1) * pageSize),
      });
      if (logTypeFilter !== 'all') params.append('logType', logTypeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('action', searchTerm);
      if (userFilter) {
        if (userFilter.includes('@')) {
          params.append('userEmail', userFilter.trim());
        } else {
          params.append('userId', userFilter.trim());
        }
      }

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotalLogs(data.total || 0);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/admin/logs/metrics?range=${timeRange}`);
      const data = await response.json();
      if (data.success) setMetrics(data.metrics);
    } catch (error) {}
  };

  useEffect(() => {
    if (mounted) {
      fetchLogs();
      fetchMetrics();
    }
  }, [currentPage, logTypeFilter, statusFilter, timeRange, userFilter, mounted]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  if (!mounted) return null;

  const totalPages = Math.ceil(totalLogs / pageSize);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
      {/* Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
            System <span className="text-emerald-500">Logs</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
            Real-time Audit Trail • {totalLogs.toLocaleString()} Entries Indexed
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              placeholder="Search Protocol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/10 w-full sm:w-64 transition-all"
            />
          </div>
          
          <button onClick={() => { fetchLogs(); fetchMetrics(); }} className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all text-white/40">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Metrics Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Event Volume', val: metrics?.totalLogs.toLocaleString() || '0', sub: 'Total Signals', icon: Terminal, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Anomaly Rate', val: `${metrics?.errorRate.toFixed(2) || '0.00'}%`, sub: 'Sector Stability', icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Latency Avg', val: `${metrics?.avgResponseTime || '0'}ms`, sub: 'Response Velocity', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Neural Cost', val: `$${metrics?.totalAIUsage.cost.toFixed(4) || '0.0000'}`, sub: 'AI Overhead', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((m, i) => (
          <div key={i} className="bg-[#111111] border border-white/10 p-8 rounded-[2rem] flex flex-col justify-between h-40 group hover:border-white/20 transition-all shadow-2xl">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${m.bg} ${m.color}`}>
                <m.icon className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">{m.label}</p>
              <p className="text-2xl font-black text-white tracking-tighter">{m.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-[#111111] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Filter Matrix</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Refine system audit stream</p>
              </div>
            </div>
            {(logTypeFilter !== 'all' || statusFilter !== 'all' || timeRange !== '7d' || userFilter || searchTerm) && (
              <button 
                onClick={() => {
                  setLogTypeFilter('all');
                  setStatusFilter('all');
                  setTimeRange('7d');
                  setUserFilter('');
                  setSearchTerm('');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Event Stream Type</label>
              <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
                <SelectTrigger className="bg-white/5 border-white/5 w-full rounded-xl text-white text-xs h-12 focus:ring-emerald-500/20"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="api">API Streams</SelectItem>
                  <SelectItem value="ai">Neural Cycles</SelectItem>
                  <SelectItem value="user_action">Identity Acts</SelectItem>
                  <SelectItem value="admin_action">Root Protocols</SelectItem>
                  <SelectItem value="payment">Payment Cycles</SelectItem>
                  <SelectItem value="export">Export Streams</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Anomaly Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/5 border-white/5 w-full rounded-xl text-white text-xs h-12 focus:ring-emerald-500/20"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Nominal (Success)</SelectItem>
                  <SelectItem value="failed">Anomaly (Failed)</SelectItem>
                  <SelectItem value="warning">Degraded (Warning)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Temporal Window</label>
              <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                <SelectTrigger className="bg-white/5 border-white/5 w-full rounded-xl text-white text-xs h-12 focus:ring-emerald-500/20"><SelectValue placeholder="Window" /></SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                  <SelectItem value="today">Cycle: 24h</SelectItem>
                  <SelectItem value="7d">Cycle: 7d</SelectItem>
                  <SelectItem value="30d">Cycle: 30d</SelectItem>
                  <SelectItem value="90d">Cycle: 90d</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Subject Node (User)</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="text"
                  placeholder="User ID or Email..."
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/10 h-12 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#111111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Protocol</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Subject Node</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Action Vector</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <React.Fragment key={log._id}>
                  <motion.tr 
                    variants={item}
                    className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                  >
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        log.logType === 'ai' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        log.logType === 'api' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-white/5 text-white/40 border-white/10'
                      }`}>
                        <span className="truncate max-w-[80px]">{log.logType.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[11px] font-mono text-white/40">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-8 py-6 text-sm font-bold text-white/60 truncate max-w-[150px]">{log.userEmail || 'System'}</td>
                    <td className="px-8 py-6 text-sm font-black text-white group-hover:text-emerald-400 transition-colors">{log.action}</td>
                    <td className="px-8 py-6">
                      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
                        log.status === 'success' ? 'text-emerald-500' : 
                        log.status === 'failed' ? 'text-red-500' : 'text-amber-500'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : log.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        {log.status}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className={`p-2 rounded-lg bg-white/5 transition-all ${expandedLog === log._id ? 'bg-emerald-500 text-white' : 'text-white/20 hover:text-white'}`}>
                        {expandedLog === log._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </td>
                  </motion.tr>
                  <AnimatePresence>
                    {expandedLog === log._id && (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td colSpan={6} className="px-12 py-10 bg-black/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="space-y-4">
                              <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Network Context</h5>
                              <div className="space-y-2 p-5 bg-white/5 rounded-2xl border border-white/5 font-mono text-[11px] text-white/60">
                                <div><span className="text-white/20 uppercase mr-2">Endpoint:</span> {log.method} {log.endpoint}</div>
                                <div><span className="text-white/20 uppercase mr-2">Latency:</span> {log.responseTime}ms</div>
                                <div><span className="text-white/20 uppercase mr-2">Code:</span> {log.statusCode}</div>
                              </div>
                            </div>
                            {log.aiMetadata && (
                              <div className="space-y-4">
                                <h5 className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Neural Payload</h5>
                                <div className="space-y-2 p-5 bg-purple-500/5 rounded-2xl border border-purple-500/10 font-mono text-[11px] text-purple-200/60">
                                  <div><span className="text-purple-400/30 uppercase mr-2">Model:</span> {log.aiMetadata.model}</div>
                                  <div><span className="text-purple-400/30 uppercase mr-2">Tokens:</span> {log.aiMetadata.tokensUsed}</div>
                                  <div><span className="text-purple-400/30 uppercase mr-2">Load:</span> ${log.aiMetadata.cost?.toFixed(4)}</div>
                                </div>
                              </div>
                            )}
                            {log.errorMessage && (
                              <div className="space-y-4">
                                <h5 className="text-[10px] font-black text-red-400 uppercase tracking-widest">Anomaly Report</h5>
                                <div className="p-5 bg-red-500/5 rounded-2xl border border-red-500/10 text-[11px] text-red-200/60 leading-relaxed italic">
                                  "{log.errorMessage}"
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="p-8 bg-white/2 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
            Stream Index: {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalLogs)} of {totalLogs} Signals
          </p>
          <div className="flex gap-4">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest border border-white/5 disabled:opacity-30">Shift Back</button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest border border-white/5 disabled:opacity-30">Shift Next</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
