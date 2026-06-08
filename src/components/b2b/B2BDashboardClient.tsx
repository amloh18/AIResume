// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, UserCheck, Star, Briefcase, ArrowRight, UploadCloud, 
  FileText, Activity, BarChart3, TrendingUp, Clock, AlertCircle, Shield 
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface DashboardStats {
  kpis: {
    totalCandidates: number;
    screenedToday: number;
    shortlistedTotal: number;
    hiresTotal: number;
  };
  pipeline: {
    uploaded: number;
    screening: number;
    shortlisted: number;
    interview: number;
    hired: number;
  };
  scores: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  topSkills: Array<{ name: string; count: number; percentage: number }>;
  topJobs: Array<{ title: string; candidateCount: number; shortlistedCount: number }>;
  recentCandidates: Array<{
    _id: string;
    name: string;
    email: string;
    jobApplied: string;
    score: number;
    match: number;
    status: string;
    createdAt: string;
  }>;
  insights: {
    averageScoreShortlisted: number;
    mostInDemandSkill: string;
  };
}

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444'];

export default function B2BDashboardClient({ userName }: { userName: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/b2b/dashboard-stats');
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        } else {
          toast({ title: 'Failed to load dashboard data', variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: 'Error loading dashboard', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Failed to load dashboard</h2>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  const scoreData = [
    { name: 'Excellent (80-100)', value: stats.scores.excellent },
    { name: 'Good (60-79)', value: stats.scores.good },
    { name: 'Average (40-59)', value: stats.scores.average },
    { name: 'Poor (0-39)', value: stats.scores.poor },
  ].filter(d => d.value > 0);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'hired': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'shortlisted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'reviewed': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
        <div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
            HELLO, <span className="text-[#80FF00]">{userName.toUpperCase()}</span>
          </h1>
          <p className="text-xl text-gray-500 font-medium">Hiring intelligence is active. Your pipeline is healthy.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase">System Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#80FF00] animate-pulse" />
              <span className="font-bold text-sm">LIVE MONITORING</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        
        {/* Main Content Area (Left 3 columns) */}
        <div className="lg:col-span-3 space-y-12">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'CANDIDATES', value: stats.kpis.totalCandidates, icon: Users, href: '/b2b/dashboard/roster', color: '#80FF00' },
              { label: 'SCREENED', value: stats.kpis.screenedToday, icon: Activity, href: '/b2b/dashboard/roster?filter=today', color: '#3b82f6' },
              { label: 'SHORTLISTED', value: stats.kpis.shortlistedTotal, icon: Star, href: '/b2b/dashboard/roster?filter=shortlisted', color: '#eab308' },
              { label: 'TOTAL HIRES', value: stats.kpis.hiresTotal, icon: UserCheck, href: '/b2b/dashboard/roster?filter=hired', color: '#22c55e' },
            ].map((kpi, i) => (
              <Link key={i} href={kpi.href} className="group">
                <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] hover:bg-white/[0.08] transition-all duration-500 h-full relative overflow-hidden">
                  <div className="flex justify-between items-start mb-8">
                    <span className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">{kpi.label}</span>
                    <kpi.icon className="w-5 h-5 text-gray-500 group-hover:text-[#80FF00] transition-colors" />
                  </div>
                  <div className="text-4xl font-black tracking-tighter mb-2">{kpi.value.toLocaleString()}</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#80FF00] opacity-0 group-hover:opacity-100 transition-opacity">
                    VIEW REPORT <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pipeline & Insights Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-white/5 border-white/10 rounded-[40px] p-10 overflow-hidden relative border">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <TrendingUp className="w-32 h-32 text-[#80FF00]" />
               </div>
               <CardHeader className="p-0 mb-12">
                 <CardTitle className="text-2xl font-black tracking-tight uppercase">Pipeline Flow</CardTitle>
               </CardHeader>
               <div className="space-y-8">
                 {[
                   { label: 'Uploads', value: stats.pipeline.uploaded, color: 'white' },
                   { label: 'Screening', value: stats.pipeline.screening, color: '#3b82f6' },
                   { label: 'Shortlisted', value: stats.pipeline.shortlisted, color: '#eab308' },
                   { label: 'Hired', value: stats.pipeline.hired, color: '#80FF00' },
                 ].map((step, i) => (
                   <div key={i} className="group">
                     <div className="flex justify-between items-end mb-3">
                       <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{step.label}</span>
                       <span className="text-lg font-black tracking-tighter">{step.value}</span>
                     </div>
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${stats.pipeline.uploaded > 0 ? (step.value / stats.pipeline.uploaded) * 100 : 0}%` }}
                         className="h-full rounded-full"
                         style={{ backgroundColor: step.color }}
                       />
                     </div>
                   </div>
                 ))}
               </div>
            </Card>

            <Card className="bg-[#80FF00] border-none rounded-[40px] p-10 text-black overflow-hidden relative">
               <div className="absolute top-0 right-0 p-8 opacity-20">
                 <Activity className="w-40 h-40" />
               </div>
               <CardHeader className="p-0 mb-8">
                 <CardTitle className="text-2xl font-black tracking-tight uppercase">AI Intelligence</CardTitle>
               </CardHeader>
               <div className="relative z-10 space-y-12">
                 <div>
                   <p className="text-xs font-black tracking-widest uppercase opacity-60 mb-2">Avg. Candidate Match</p>
                   <div className="text-7xl font-black tracking-tighter">{stats.insights.averageScoreShortlisted}%</div>
                 </div>
                 <div className="bg-black/10 backdrop-blur-xl p-8 rounded-[32px] border border-black/5">
                   <p className="text-xs font-black tracking-widest uppercase opacity-60 mb-4">Trending Skill Requirement</p>
                   <div className="text-3xl font-black tracking-tight uppercase">{stats.insights.mostInDemandSkill}</div>
                 </div>
               </div>
            </Card>
          </div>

          {/* Recent Candidates Table */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight uppercase">Live Roster</h2>
              <Link href="/b2b/dashboard/roster" className="text-xs font-black tracking-widest text-[#80FF00] hover:underline uppercase">View All Assets</Link>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden">
              <table className="w-full text-left">
                <thead className="border-b border-white/5">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase">Candidate Asset</th>
                    <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase">Target Role</th>
                    <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase text-center">Score</th>
                    <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase text-right">Phase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.recentCandidates.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-500 font-bold uppercase tracking-widest">No Active Data</td></tr>
                  ) : (
                    stats.recentCandidates.map(c => (
                      <tr key={c._id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-[#80FF00] group-hover:bg-[#80FF00] group-hover:text-black transition-all">
                              {c.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white uppercase tracking-tight">{c.name}</div>
                              <div className="text-[10px] font-bold text-gray-500 truncate max-w-[150px]">{c.email.toUpperCase()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm font-bold text-gray-400 uppercase tracking-tighter">{c.jobApplied}</td>
                        <td className="px-8 py-6 text-center">
                          <span className={`text-2xl font-black tracking-tighter ${getScoreColor(c.score)}`}>{c.score}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 ${getStatusColor(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1 space-y-12">
          
          {/* Quick Actions */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/b2b/dashboard/roster" className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-[#80FF00] hover:text-black transition-all group">
                <span className="font-black text-xs tracking-widest uppercase">Upload Data</span>
                <UploadCloud className="w-5 h-5" />
              </Link>
              <Link href="/b2b/dashboard/jobs" className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white text-black transition-all group">
                <span className="font-black text-xs tracking-widest uppercase">New Requisition</span>
                <Briefcase className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase">Match Distribution</h3>
            <div className="bg-white/5 border border-white/10 rounded-[40px] p-8">
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={scoreData} innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value">
                      {scoreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0d1209', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black tracking-tighter">{stats.kpis.totalCandidates}</span>
                  <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Guard */}
          <div className="p-8 bg-indigo-900/20 border border-indigo-500/20 rounded-[40px]">
            <Shield className="w-8 h-8 text-indigo-400 mb-6" />
            <h4 className="text-lg font-black tracking-tight uppercase mb-2 text-indigo-300">Enterprise Guard</h4>
            <p className="text-xs text-indigo-300/60 leading-relaxed font-medium">Your data is processed through our SOC2-compliant intelligence infrastructure.</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
