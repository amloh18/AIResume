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
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userName} 👋</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your hiring pipeline today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Content Area (Left 3 columns) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/b2b/dashboard/roster" className="block transition-transform hover:scale-[1.02]">
              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-sm h-full">
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Total Candidates</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.kpis.totalCandidates.toLocaleString()}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/b2b/dashboard/roster?filter=today" className="block transition-transform hover:scale-[1.02]">
              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-sm h-full">
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Screened Today</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.kpis.screenedToday.toLocaleString()}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/b2b/dashboard/roster?filter=shortlisted" className="block transition-transform hover:scale-[1.02]">
              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-sm h-full">
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Star className="h-5 w-5 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Shortlisted</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.kpis.shortlistedTotal.toLocaleString()}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/b2b/dashboard/roster?filter=hired" className="block transition-transform hover:scale-[1.02]">
              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-sm h-full">
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <UserCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Hires</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.kpis.hiresTotal.toLocaleString()}</div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Pipeline Overview */}
          <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pipeline Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
                <div className="flex-1 w-full text-center p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                    <UploadCloud className="h-4 w-4" /> <span className="text-sm font-medium">Uploaded</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.pipeline.uploaded}</div>
                </div>
                <ArrowRight className="hidden md:block text-muted-foreground h-5 w-5 shrink-0" />
                
                <div className="flex-1 w-full text-center p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-center gap-2 text-blue-500 mb-2">
                    <Activity className="h-4 w-4" /> <span className="text-sm font-medium">Screening</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.pipeline.screening}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.pipeline.uploaded > 0 ? Math.round((stats.pipeline.screening / stats.pipeline.uploaded) * 100) : 0}%
                  </div>
                </div>
                <ArrowRight className="hidden md:block text-muted-foreground h-5 w-5 shrink-0" />

                <div className="flex-1 w-full text-center p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-center gap-2 text-amber-500 mb-2">
                    <Star className="h-4 w-4" /> <span className="text-sm font-medium">Shortlisted</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.pipeline.shortlisted}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.pipeline.uploaded > 0 ? Math.round((stats.pipeline.shortlisted / stats.pipeline.uploaded) * 100) : 0}%
                  </div>
                </div>
                <ArrowRight className="hidden md:block text-muted-foreground h-5 w-5 shrink-0" />

                <div className="flex-1 w-full text-center p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-center gap-2 text-green-500 mb-2">
                    <UserCheck className="h-4 w-4" /> <span className="text-sm font-medium">Hired</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.pipeline.hired}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.pipeline.uploaded > 0 ? ((stats.pipeline.hired / stats.pipeline.uploaded) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Top Skills */}
            <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-sm md:col-span-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Top Skills</CardTitle>
                  <Link href="/b2b/dashboard/roster" className="text-xs text-primary hover:underline">View All</Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {stats.topSkills.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">No skills extracted yet.</div>
                ) : (
                  stats.topSkills.map((skill, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-muted-foreground">{skill.percentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${skill.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-sm md:col-span-1 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI Score Distribution</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                {scoreData.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground">No scores generated yet.</div>
                ) : (
                  <div className="w-full h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={scoreData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {scoreData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value} Candidates`, 'Count']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold">{stats.kpis.totalCandidates}</span>
                      <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Job Openings */}
            <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-sm md:col-span-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Top Job Openings</CardTitle>
                  <Link href="/b2b/dashboard/jobs" className="text-xs text-primary hover:underline">View All</Link>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {stats.topJobs.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">No jobs created yet.</div>
                ) : (
                  <div className="space-y-4">
                    {stats.topJobs.map((job, i) => (
                      <Link href="/b2b/dashboard/roster" key={i} className="flex items-center justify-between group">
                        <div>
                          <div className="text-sm font-medium group-hover:text-primary transition-colors">{job.title}</div>
                          <div className="text-xs text-muted-foreground">{job.candidateCount} Candidates</div>
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 text-primary font-medium">
                          {job.shortlistedCount} Shortlisted
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Candidates Table */}
          <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Candidates</CardTitle>
                <Link href="/b2b/dashboard/roster" className="text-sm text-primary hover:underline font-medium">View All Candidates</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground border-y dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Job Applied</th>
                    <th className="px-6 py-3 font-medium">AI Score</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Added On</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {stats.recentCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No candidates found. Upload a CV to get started.
                      </td>
                    </tr>
                  ) : (
                    stats.recentCandidates.map(c => (
                      <tr key={c._id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-6 py-3">
                          <Link href={`/b2b/dashboard/roster/${c._id}`} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {c.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium group-hover:text-primary transition-colors">{c.name}</div>
                              <div className="text-xs text-muted-foreground">{c.email}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{c.jobApplied}</td>
                        <td className="px-6 py-3">
                          <span className={`font-bold ${getScoreColor(c.score)}`}>{c.score}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar (Upload & Insights) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Quick Upload */}
          <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-primary/20 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upload CVs</CardTitle>
              <CardDescription>Drop files to let AI do the screening.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/b2b/dashboard/roster" className="block mt-2">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-all rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer">
                  <UploadCloud className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Drag & drop CVs here</p>
                  <p className="text-xs text-muted-foreground mt-1">or</p>
                  <Button variant="secondary" size="sm" className="mt-3 w-full">Choose Files</Button>
                  <p className="text-[10px] text-muted-foreground mt-3">Supports PDF, DOCX</p>
                </div>
              </Link>
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-500 font-medium mt-4 bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
                <Shield className="h-4 w-4" /> Uploaded files are securely processed
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-300" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-purple-200 mb-1">Average score for shortlisted candidates</p>
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-bold text-green-400">{stats.insights.averageScoreShortlisted}%</div>
                  <div className="flex items-center text-sm text-green-300 pb-1">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Good Match
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                <p className="text-xs text-purple-200 mb-2">Most in-demand skill this month</p>
                <Badge className="bg-white text-purple-900 hover:bg-gray-100 text-sm py-1">
                  {stats.insights.mostInDemandSkill}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity (Mocked using recent candidates for now) */}
          <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-4">
              {stats.recentCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
              ) : (
                stats.recentCandidates.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.jobApplied} - {c.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>Score: {c.score}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}

// Add Shield to lucide-react imports if missing. It's there.
