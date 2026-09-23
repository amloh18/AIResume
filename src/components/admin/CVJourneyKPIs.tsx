'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, FileText, TrendingUp, Activity, Calendar, Target, CheckCircle, 
  AlertTriangle, BarChart3, PieChart, LineChart, Clock, UserCheck, 
  FileCheck, Briefcase, Award, Database, RefreshCw, Sparkles, Shield, ArrowUpRight
} from 'lucide-react';
import {
  LineChart as RechartsLineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { motion } from 'framer-motion';

interface CVJourneyKPIData {
  userEngagement: {
    cvJourneysInitiated: number;
    cvJourneyCompletionRate: number;
    averageDocumentsPerJourney: number;
    masterCVOnboardingCompletion: number;
    studioUsageFrequency: number;
    userRetentionRate: number;
  };
  applicationFunnel: {
    applicationStatusFunnel: Array<{ _id: string; count: number }>;
    trackedToAppliedConversionRate: number;
    averageATSScore: number;
    atsScoreCount: number;
    totalTrackedJobs: number;
    appliedJobs: number;
  };
  contentHealth: {
    orphanedJourneys: number;
    assetGrowthData: {
      cvs: Array<{ _id: any; count: number }>;
      coverLetters: Array<{ _id: any; count: number }>;
    };
    masterCVToTailoredCVRatio: number;
    journeyStatusDistribution: Array<{ _id: string; count: number }>;
    averageCompletionTime: number;
  };
  summary: {
    totalUsers: number;
    totalMasterCVs: number;
    totalTailoredCVs: number;
    totalCoverLetters: number;
    totalJourneys: number;
    completedJourneys: number;
  };
}

const CVJourneyKPIs: React.FC = () => {
  const [kpiData, setKpiData] = useState<CVJourneyKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cv-journey-kpis?range=${timeRange}`);
      const result = await response.json();
      if (result.success) setKpiData(result.data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) fetchKPIData();
  }, [timeRange, mounted]);

  if (!mounted) return null;

  if (loading && !kpiData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'applied': '#10b981', 'screening': '#3b82f6', 'interview': '#f59e0b', 
      'offer': '#8b5cf6', 'rejected': '#ef4444', 'accepted': '#10b981'
    };
    return colors[status] || '#475569';
  };

  const assetGrowthChartData = kpiData?.contentHealth.assetGrowthData.cvs.map((cvItem, index) => {
    const coverLetterItem = kpiData.contentHealth.assetGrowthData.coverLetters[index];
    return {
      date: `${cvItem._id.month}/${cvItem._id.day}`,
      cvs: cvItem.count,
      coverLetters: coverLetterItem ? coverLetterItem.count : 0
    };
  });

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            User Journeys & Funnel
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Application funnel, completion rates, and journey retention telemetry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-white/5 border border-white/5 p-1 rounded-xl">
            {['7d', '30d', '90d', '1y'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${timeRange === range ? 'bg-emerald-600 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
              >
                {range}
              </button>
            ))}
          </div>
          <button onClick={fetchKPIData} className="p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all text-white/50 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Engagement Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Journeys Initiated', val: kpiData?.userEngagement.cvJourneysInitiated || 0, sub: 'Target Locked', icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Completion Flux', val: `${kpiData?.userEngagement.cvJourneyCompletionRate.toFixed(1)}%`, sub: 'Sector Ready', icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Node Retention', val: `${kpiData?.userEngagement.userRetentionRate.toFixed(1)}%`, sub: 'Return Signal', icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Studio Pulse', val: kpiData?.userEngagement.studioUsageFrequency.toLocaleString() || 0, sub: 'Save Events', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((m, i) => (
          <div key={i} className="bg-[#111216] border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 group hover:border-white/10 transition-all shadow-lg relative overflow-hidden">
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
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Growth Vector */}
        <motion.div variants={item} className="lg:col-span-8 bg-[#111216] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Asset Accrual</h3>
              <p className="text-xs text-white/40 mt-0.5">CV & cover letter propagation over time</p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assetGrowthChartData}>
                <defs>
                  <linearGradient id="colorCVs" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="cvs" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCVs)" name="CVs" />
                <Area type="monotone" dataKey="coverLetters" stroke="#3b82f6" strokeWidth={3} fill="transparent" name="Cover Letters" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Status Funnel */}
        <motion.div variants={item} className="lg:col-span-4 bg-[#111216] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight mb-1">Process Funnel</h3>
            <p className="text-xs text-white/40 mb-4">Application Status Velocity</p>
            
            <div className="space-y-3.5">
              {kpiData?.applicationFunnel.applicationStatusFunnel.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-white/40">{item._id}</span>
                    <span className="text-white font-semibold">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${(item.count / (kpiData?.summary.totalJourneys || 1)) * 100}%` }} 
                      className="h-full rounded-full"
                      style={{ backgroundColor: getStatusColor(item._id) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Conversion Vector</p>
                <p className="text-2xl font-black text-emerald-400">{kpiData?.applicationFunnel.trackedToAppliedConversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500/20" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Nodes', val: kpiData?.summary.totalUsers, icon: Users },
          { label: 'Master CVs', val: kpiData?.summary.totalMasterCVs, icon: UserCheck },
          { label: 'Tailored CVs', val: kpiData?.summary.totalTailoredCVs, icon: FileText },
          { label: 'Cover Letters', val: kpiData?.summary.totalCoverLetters, icon: FileCheck },
          { label: 'Total Journeys', val: kpiData?.summary.totalJourneys, icon: Briefcase },
          { label: 'Completed', val: kpiData?.summary.completedJourneys, icon: Award },
        ].map((s, i) => (
          <div key={i} className="bg-[#111216] border border-white/5 p-4 rounded-xl text-center hover:bg-white/[0.04] transition-all">
            <p className="text-lg font-black text-white">{s.val?.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default CVJourneyKPIs;
