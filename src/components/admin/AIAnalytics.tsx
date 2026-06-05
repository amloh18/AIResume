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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
      {/* Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
            Intelligence <span className="text-emerald-500">Analytics</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
            Neural Network Performance • Cost & Token Telemetry
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 p-1 rounded-2xl">
            {['7d', '30d', '90d', '1y'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white'}`}
              >
                {range}
              </button>
            ))}
          </div>
          <button onClick={fetchAIData} className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all text-white/40">
            <Activity className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Primary Metrics Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Token Velocity', val: aiData?.totalTokens.toLocaleString() || '0', sub: 'Nodes Processed', icon: Brain, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Compute Cost', val: `$${aiData?.totalCost.toFixed(2) || '0.00'}`, sub: 'Sector Budget', icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Cycle Count', val: aiData?.totalRequests.toLocaleString() || '0', sub: 'Total Inferences', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Node Efficiency', val: aiData?.averageTokensPerRequest.toFixed(0) || '0', sub: 'Tokens / Cycle', icon: Cpu, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((m, i) => (
          <motion.div key={i} variants={item} className="bg-[#111111] border border-white/10 p-8 rounded-[2.5rem] flex flex-col justify-between h-44 group hover:border-white/20 transition-all shadow-2xl">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${m.bg} ${m.color}`}>
                <m.icon className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">{m.label}</p>
              <p className="text-3xl font-black text-white tracking-tighter">{m.val}</p>
              <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest mt-1">{m.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Performance Chart */}
        <motion.div variants={item} className="lg:col-span-8 bg-[#111111] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Neural Propagation</h3>
              <p className="text-white/30 text-xs font-bold mt-1 uppercase tracking-widest">Inference & Token Density</p>
            </div>
            <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40">Temporal Flow</div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aiData?.dailyUsage}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={4} fill="transparent" name="Cycles" />
                <Area type="monotone" dataKey="tokens" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorTokens)" name="Tokens" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Cost Matrix */}
        <motion.div variants={item} className="lg:col-span-4 bg-[#111111] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl flex flex-col">
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Cost Nexus</h3>
          <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-10">Resource Allocation</p>
          
          <div className="flex-1 relative min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costBreakdownData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={10} dataKey="value" stroke="none">
                  {costBreakdownData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-white">${aiData?.totalCost.toFixed(2)}</span>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Load</span>
            </div>
          </div>
          
          <div className="space-y-4 mt-10">
            {costBreakdownData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-black text-white uppercase tracking-widest">{item.name} Protocol</span>
                </div>
                <span className="text-xs font-black text-emerald-400">${item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Endpoint Table */}
      <motion.div variants={item} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-white/2">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Endpoint Telemetry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Interface</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Compute Cycles</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total Tokens</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Economic Load</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Velocity Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {aiData?.usageByEndpoint.map((ep, idx) => (
                <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/5 text-white/20 group-hover:text-emerald-500 transition-colors">
                        <Network className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-black text-white">{ep.endpoint}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-mono text-xs text-white/60">{ep.requests.toLocaleString()}</td>
                  <td className="px-8 py-6 font-mono text-xs text-white/60">{ep.tokens.toLocaleString()}</td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-black text-emerald-400/80">${ep.cost?.toFixed(3) || '0.00'}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 max-w-[60px] bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min((ep.tokens / ep.requests) / 10, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-white/20">{(ep.tokens / ep.requests).toFixed(0)}</span>
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
