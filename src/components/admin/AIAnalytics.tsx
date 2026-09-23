'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity, DollarSign, TrendingUp, Users, Calendar, BarChart3, Zap, 
  Sparkles, Shield, ArrowUpRight, Cpu, Network, Database, Brain
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface AIUsageData {
  totalTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
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
    userEmail?: string;
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAIData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/ai-analytics?range=${timeRange}`);
      const data = await response.json();
      if (data.success || !data.error) {
        setAiData(data);
      }
    } catch (error) {
      setError('Neural Link Interrupted');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) fetchAIData();
  }, [timeRange, mounted]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  if (!mounted) return null;

  if (loading && !aiData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const costBreakdownData = [
    { name: 'Input', value: aiData?.inputCost || 0, color: '#10b981' },
    { name: 'Output', value: aiData?.outputCost || 0, color: '#3b82f6' }
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Time Range Toolbar */}
      <div className="flex items-center justify-end gap-2.5">
        <div className="flex items-center gap-1.5 p-1.5 bg-[#111216] border border-white/5 rounded-full">
          {['7d', '30d', '90d', '1y'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${timeRange === range ? 'bg-emerald-600 text-white shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              {range}
            </button>
          ))}
        </div>
        <button onClick={fetchAIData} className="p-2 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 transition-all text-white/50 hover:text-white">
          <Activity className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Metrics Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Token Velocity', val: aiData?.totalTokens.toLocaleString() || '0', sub: 'Nodes Processed', icon: Brain, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Compute Cost', val: `$${aiData?.totalCost.toFixed(2) || '0.00'}`, sub: 'Sector Budget', icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Cycle Count', val: aiData?.totalRequests.toLocaleString() || '0', sub: 'Total Inferences', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Node Efficiency', val: aiData?.averageTokensPerRequest.toFixed(0) || '0', sub: 'Tokens / Cycle', icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((m, i) => (
          <motion.div key={i} variants={item} className="bg-[#111216] border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 group hover:border-white/10 transition-all shadow-lg">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>
                <m.icon className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-0.5">{m.label}</p>
              <p className="text-2xl font-black text-white tracking-tight">{m.val}</p>
              <p className="text-[10px] font-medium text-white/30">{m.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Performance Chart */}
        <motion.div variants={item} className="lg:col-span-8 bg-[#111216] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Neural Propagation</h3>
              <p className="text-xs text-white/40 mt-0.5">Inference & token density over time</p>
            </div>
            <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-white/40">Temporal Flow</div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aiData?.dailyUsage}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={3} fill="transparent" name="Cycles" />
                <Area type="monotone" dataKey="tokens" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTokens)" name="Tokens" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Cost Matrix */}
        <motion.div variants={item} className="lg:col-span-4 bg-[#111216] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col">
          <h3 className="text-sm font-bold text-white tracking-tight mb-1">Cost Nexus</h3>
          <p className="text-xs text-white/40 mb-4">Resource Allocation</p>
          
          <div className="flex-1 relative min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costBreakdownData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={6} dataKey="value" stroke="none">
                  {costBreakdownData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white">${aiData?.totalCost.toFixed(2)}</span>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Total Load</span>
            </div>
          </div>
          
          <div className="space-y-2.5 mt-4">
            {costBreakdownData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-semibold text-white">{item.name} Protocol</span>
                </div>
                <span className="text-xs font-bold text-emerald-400">${item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Endpoint Table */}
      <motion.div variants={item} className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/5">
          <h3 className="text-sm font-bold text-white tracking-tight">Endpoint Telemetry</h3>
          <p className="text-xs text-white/40 mt-0.5">Interface query volume and token usage</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Interface</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Compute Cycles</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Total Tokens</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Economic Load</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Velocity Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {aiData?.usageByEndpoint.map((ep, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-white/5 text-white/30 group-hover:text-emerald-400 transition-colors">
                        <Network className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-white">{ep.endpoint}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 font-mono text-white/60">{ep.requests.toLocaleString()}</td>
                  <td className="py-3 px-5 font-mono text-white/60">{ep.tokens.toLocaleString()}</td>
                  <td className="py-3 px-5">
                    <span className="font-bold text-emerald-400">${ep.cost?.toFixed(3) || '0.00'}</span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 max-w-[60px] bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((ep.tokens / ep.requests) / 10, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-white/40">{(ep.tokens / ep.requests).toFixed(0)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AIAnalytics;
