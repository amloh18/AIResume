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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
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
        setLoadError(null);
      } else {
        setLoadError("Couldn't load logs. Try again.");
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setLoadError("Couldn't load logs. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/admin/logs/metrics?range=${timeRange}`);
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
        setMetricsError(null);
      } else {
        setMetricsError("Couldn't load metrics. Try again.");
      }
    } catch (error) {
      console.error('Fetch metrics error:', error);
      setMetricsError("Couldn't load metrics. Try again.");
    }
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-emerald-400 transition-colors" />
          <input
            type="text"
            placeholder="Search action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:bg-white/10 w-full sm:w-48 transition-all"
          />
        </div>

        <button onClick={() => { fetchLogs(); fetchMetrics(); }} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white/50 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Load error (inline, with retry) */}
      {(loadError || metricsError) && (
        <div role="alert" className="flex items-center justify-between gap-3 bg-red-500/[0.06] border border-red-500/20 rounded-2xl px-4 py-2.5">
          <span className="text-xs text-red-400 font-medium">{loadError || metricsError}</span>
          <button
            onClick={() => { fetchLogs(); fetchMetrics(); }}
            className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-semibold transition-all shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Event Volume', val: metrics?.totalLogs.toLocaleString() || '0', sub: 'Total Signals', icon: Terminal, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Anomaly Rate', val: `${metrics?.errorRate.toFixed(2) || '0.00'}%`, sub: 'Sector Stability', icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Latency Avg', val: `${metrics?.avgResponseTime || '0'}ms`, sub: 'Response Velocity', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Neural Cost', val: `$${metrics?.totalAIUsage.cost.toFixed(4) || '0.0000'}`, sub: 'AI Overhead', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((m, i) => (
          <div key={i} className="bg-[#111216] border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 group hover:border-white/10 transition-all shadow-lg">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>
                <m.icon className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-0.5">{m.label}</p>
              <p className="text-2xl font-black text-white tracking-tight">{m.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-[#111216] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <Filter className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Filter Matrix</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Refine system audit stream</p>
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
                className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-semibold transition-all"
              >
                <X className="w-3 h-3" /> Clear Filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Event Type</label>
              <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
                <SelectTrigger className="bg-white/5 border-white/10 w-full rounded-xl text-white text-xs h-9 focus:ring-emerald-500/20"><SelectValue placeholder="Type" /></SelectTrigger>
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

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/5 border-white/10 w-full rounded-xl text-white text-xs h-9 focus:ring-emerald-500/20"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Nominal (Success)</SelectItem>
                  <SelectItem value="failed">Anomaly (Failed)</SelectItem>
                  <SelectItem value="warning">Degraded (Warning)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Window</label>
              <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                <SelectTrigger className="bg-white/5 border-white/10 w-full rounded-xl text-white text-xs h-9 focus:ring-emerald-500/20"><SelectValue placeholder="Window" /></SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                  <SelectItem value="today">Cycle: 24h</SelectItem>
                  <SelectItem value="7d">Cycle: 7d</SelectItem>
                  <SelectItem value="30d">Cycle: 30d</SelectItem>
                  <SelectItem value="90d">Cycle: 90d</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Subject Node (User)</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="text"
                  placeholder="User ID or Email..."
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:bg-white/10 h-9 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Protocol</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Timestamp</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Subject Node</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Action Vector</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Status</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Details</th>
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
                    <td className="py-3 px-5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border ${
                        log.logType === 'ai' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        log.logType === 'api' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-white/5 text-white/40 border-white/10'
                      }`}>
                        <span className="truncate max-w-[80px]">{log.logType.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-[11px] font-mono text-white/40">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-5 font-semibold text-white/70 truncate max-w-[150px]">{log.userEmail || 'System'}</td>
                    <td className="py-3 px-5 font-semibold text-white group-hover:text-emerald-400 transition-colors">{log.action}</td>
                    <td className="py-3 px-5">
                      <div className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
                        log.status === 'success' ? 'text-emerald-400' : 
                        log.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-emerald-400' : log.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'}`} />
                        {log.status}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className={`inline-flex p-1.5 rounded-lg transition-all ${expandedLog === log._id ? 'bg-emerald-600 text-white' : 'text-white/30 hover:text-white bg-white/5'}`}>
                        {expandedLog === log._id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </td>
                  </motion.tr>
                  <AnimatePresence>
                    {expandedLog === log._id && (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td colSpan={6} className="px-6 py-4 bg-black/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Network Context</h5>
                              <div className="space-y-1 p-3 bg-white/5 rounded-xl border border-white/5 font-mono text-[11px] text-white/60">
                                <div><span className="text-white/30 mr-2">Endpoint:</span> {log.method} {log.endpoint}</div>
                                <div><span className="text-white/30 mr-2">Latency:</span> {log.responseTime}ms</div>
                                <div><span className="text-white/30 mr-2">Code:</span> {log.statusCode}</div>
                              </div>
                            </div>
                            {log.aiMetadata && (
                              <div className="space-y-2">
                                <h5 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Neural Payload</h5>
                                <div className="space-y-1 p-3 bg-purple-500/5 rounded-xl border border-purple-500/10 font-mono text-[11px] text-purple-200/60">
                                  <div><span className="text-purple-400/50 mr-2">Model:</span> {log.aiMetadata.model}</div>
                                  <div><span className="text-purple-400/50 mr-2">Tokens:</span> {log.aiMetadata.tokensUsed}</div>
                                  <div><span className="text-purple-400/50 mr-2">Cost:</span> ${log.aiMetadata.cost?.toFixed(4)}</div>
                                </div>
                              </div>
                            )}
                            {log.errorMessage && (
                              <div className="space-y-2">
                                <h5 className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Anomaly Report</h5>
                                <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 text-[11px] text-red-200/70 leading-relaxed italic">
                                  &quot;{log.errorMessage}&quot;
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
        <div className="py-3 px-5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-xs">
          <p className="text-[11px] text-white/40 font-medium">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalLogs)} of {totalLogs} events
          </p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-xs border border-white/10 disabled:opacity-30">Previous</button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-xs border border-white/10 disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
