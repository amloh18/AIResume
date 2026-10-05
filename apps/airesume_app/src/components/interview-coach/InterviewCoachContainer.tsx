'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Flame,
  Filter,
  Plus,
  ChevronDown,
  Play,
  Star,
  Target,
  MessageSquare,
  Lightbulb,
  MoreHorizontal,
  Sparkles,
  Clock,
  Building2,
  MapPin,
  Layers,
  ArrowRight,
  Zap,
  Search,
} from 'lucide-react';
import CompanyLogo from '@/components/ui/CompanyLogo';
import toast from '@/lib/hot-toast';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { useUserData } from '@/lib/hooks/useUserData';

interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  status: string;
  companyLogo?: string;
  location?: string;
  jobType?: string;
  appliedDate?: string;
  interviewCoach?: {
    readinessScore?: number;
    status?: string;
    modules?: any[];
    questions?: any[];
  };
}

interface Stats {
  totalOpportunities: number;
  completedSessions: number;
  averageScore: number;
  currentStreak: number;
}

interface InterviewCoachContainerProps {
  userId?: string;
}

export default function InterviewCoachContainer({ userId }: InterviewCoachContainerProps) {
  const router = useRouter();
  const { openPaymentModal } = usePaymentModal();
  const { userData } = useUserData();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOpportunities: 0,
    completedSessions: 0,
    averageScore: 0,
    currentStreak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'In Progress' | 'Completed' | 'Archived'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/interview/dashboard');
      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = (jobId: string) => {
    router.push(`/dashboard/interview/${jobId}`);
  };

  const handleAddNewRole = () => {
    router.push('/dashboard/jobs');
  };

  // Filtered jobs based on tab, status dropdown, and search query
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Tab filter
      if (activeTab === 'In Progress' && job.interviewCoach?.status !== 'ready') return false;
      if (activeTab === 'Completed') {
        const isCompleted =
          job.status.toLowerCase() === 'offer' ||
          job.status.toLowerCase() === 'accepted' ||
          job.status.toLowerCase() === 'rejected';
        if (!isCompleted) return false;
      }
      if (activeTab === 'Archived') return false;

      // Status dropdown filter
      if (statusFilter !== 'all' && job.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = (job.jobTitle || '').toLowerCase().includes(query);
        const matchesCompany = (job.company || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesCompany) return false;
      }

      return true;
    });
  }, [jobs, activeTab, statusFilter, searchQuery]);

  const getCompanyInitial = (company: string, title: string) => {
    if (company && company.trim()) return company.trim().charAt(0).toUpperCase();
    if (title && title.trim()) return title.trim().charAt(0).toUpperCase();
    return 'J';
  };

  const getInitialBg = (company: string) => {
    const c = (company || '').toLowerCase();
    if (c.includes('google') || c.includes('notion')) return 'bg-emerald-500/10 text-emerald-700 dark:text-lime-400 border border-emerald-500/20';
    if (c.includes('gitlab') || c.includes('amazon')) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
    if (c.includes('cloudflare') || c.includes('elastic')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20';
    return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20';
  };

  const kpiMetrics = [
    {
      label: 'Total Opportunities',
      value: String(stats.totalOpportunities),
      icon: <Briefcase size={16} strokeWidth={1.75} />,
      trend: stats.totalOpportunities > 0 ? 'Active interview prep' : 'Ready to start',
      trendUp: stats.totalOpportunities > 0,
    },
    {
      label: 'Completed Sessions',
      value: String(stats.completedSessions),
      icon: <CheckCircle2 size={16} strokeWidth={1.75} />,
      trend: stats.completedSessions > 0 ? 'Practice rounds' : 'No sessions yet',
      trendUp: stats.completedSessions > 0,
    },
    {
      label: 'Average Score',
      value: stats.averageScore > 0 ? `${stats.averageScore}%` : '—',
      icon: <Target size={16} strokeWidth={1.75} />,
      trend: stats.averageScore > 0 ? 'Readiness index' : 'Complete a round',
      trendUp: stats.averageScore >= 70,
    },
    {
      label: 'Current Streak',
      value: `${stats.currentStreak} days`,
      icon: <Flame size={16} strokeWidth={1.75} />,
      trend: stats.currentStreak > 0 ? 'Consistent practice' : 'Start streak today',
      trendUp: stats.currentStreak > 0,
    },
  ];

  return (
    <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
      <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden px-5 md:px-8">
        <div className="max-w-[1400px] w-full mx-auto flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide py-5 md:py-8 space-y-6">

          {/* 1. Header (Headings & Actions Inline) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                <span
                  className="cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => router.push('/dashboard')}
                >
                  Dashboard
                </span>
                <span>›</span>
                <span className="text-[var(--text-primary)] font-semibold">Interview Prep</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  Interview Prep
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/40">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-lime-400" />
                  AI Simulation
                </span>
              </div>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
                Practice role-specific interview simulations with real-time AI scoring and feedback.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
              <button
                onClick={handleAddNewRole}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-xs transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Opportunity
              </button>
            </div>
          </div>

          {/* 2. KPI Strip (Connected Main Dashboard Style) */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-sm grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--border-primary)]">
            {kpiMetrics.map((m) => (
              <div key={m.label} className="px-5 py-4 flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
                  {m.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] truncate">
                    {m.label}
                  </div>
                  <div className="text-lg font-semibold text-[var(--text-primary)] leading-tight tabular-nums mt-0.5">
                    {m.value}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                    {m.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Section Header: Headings & Tabs Inline (Left and Right) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pt-2 border-b border-[var(--border-primary)] pb-4">
            {/* Left: Heading + Inline Segmented Tabs */}
            <div className="flex flex-wrap items-center gap-3.5">
              <h2 className="text-base font-bold text-[var(--text-primary)] shrink-0">
                Your Opportunities
              </h2>

              {/* Segmented Tab Pill */}
              <div className="flex items-center p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] gap-1">
                {(['All', 'In Progress', 'Completed', 'Archived'] as const).map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        isActive
                          ? 'bg-[#013f2e] text-white dark:bg-lime-500 dark:text-black shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-100/50 dark:hover:bg-white/5'
                      }`}
                    >
                      {tab}
                      {tab === 'All' && jobs.length > 0 && ` (${jobs.length})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Inline Filter Dropdown & Search */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              {/* Status Dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="applied">Applied</option>
                  <option value="interview">Interviewing</option>
                  <option value="screening">Screening</option>
                  <option value="offer">Offer</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 4. Opportunities Section (3 Columns Grid) */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[var(--text-secondary)]">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-600 dark:border-lime-500 border-t-transparent animate-spin mb-3" />
              <span className="text-xs font-medium">Loading interview pipelines...</span>
            </div>
          ) : filteredJobs.length === 0 ? (
            /* Empty State */
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-10 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-lime-500/10 text-emerald-700 dark:text-lime-400 flex items-center justify-center mb-4">
                <Briefcase className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                {jobs.length === 0 ? 'No Interview Opportunities Yet' : 'No matching opportunities found'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mb-6">
                {jobs.length === 0
                  ? 'Add your active applications from the job tracker to initiate customized, role-specific mock interview sessions.'
                  : 'Try adjusting your status filter or tab selection to view other saved pipelines.'}
              </p>
              <button
                onClick={handleAddNewRole}
                className="px-5 py-2.5 bg-[#013f2e] hover:bg-[#025c43] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                + Add Your First Opportunity
              </button>
            </div>
          ) : (
            /* Opportunities 3-Column Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.map((job, idx) => {
                const isReady = job.interviewCoach?.status === 'ready';
                const modules = job.interviewCoach?.modules || [];
                const questions = job.interviewCoach?.questions || [];

                // Calculate module-based progress split
                const moduleSegments =
                  modules.length > 0
                    ? modules.map((m: any, i: number) => {
                        const qIds = m.questionIds || [];
                        const moduleQs = questions.filter(
                          (q: any) =>
                            qIds.includes(q.id || q._id) ||
                            q.moduleId === m.id ||
                            q.moduleId === m._id
                        );
                        const total = moduleQs.length > 0 ? moduleQs.length : (qIds.length || 1);
                        const completed = moduleQs.filter(
                          (q: any) => q.status === 'completed' || q.feedback
                        ).length;
                        const modProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return {
                          id: m.id || String(i),
                          name: m.name || m.title || `Module ${i + 1}`,
                          total,
                          completed,
                          progress: modProgress,
                        };
                      })
                    : [
                        { id: '1', name: 'Behavioral & Fit', total: 1, completed: 0, progress: 0 },
                        { id: '2', name: 'Role Competency', total: 1, completed: 0, progress: 0 },
                        { id: '3', name: 'Technical Depth', total: 1, completed: 0, progress: 0 },
                        { id: '4', name: 'Impact & Leadership', total: 1, completed: 0, progress: 0 },
                      ];

                const completedModulesCount = moduleSegments.filter((s) => s.progress === 100).length;
                const totalCompleted = questions.filter(
                  (q: any) => q.status === 'completed' || q.feedback
                ).length;
                const totalQuestions = questions.length;
                const overallProgress =
                  totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0;

                return (
                  <motion.div
                    key={job._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[#013f2e]/30 dark:hover:border-lime-500/30 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 group"
                  >
                    {/* Top Header Row */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Company Logo Icon */}
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-center shrink-0 shadow-xs">
                            <CompanyLogo
                              company={job.company}
                              size={22}
                              logoUrl={job.companyLogo}
                              jobId={job._id}
                              className="rounded-lg shrink-0"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate group-hover:text-emerald-700 dark:group-hover:text-lime-400 transition-colors">
                              {job.jobTitle}
                            </h3>
                            <p className="text-xs font-semibold text-[var(--text-secondary)] truncate">
                              {job.company}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold capitalize shrink-0 border ${
                            job.status?.toLowerCase() === 'applied'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : job.status?.toLowerCase() === 'interview' || job.status?.toLowerCase() === 'interviewing'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                              : job.status?.toLowerCase() === 'offer'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800'
                              : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10'
                          }`}
                        >
                          {job.status || 'Active'}
                        </span>
                      </div>

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-tertiary)] pt-2 pb-1 border-t border-[var(--border-primary)]">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.appliedDate
                            ? `Applied ${new Date(job.appliedDate).toLocaleDateString()}`
                            : 'Recently applied'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {job.jobType || 'Full-time'}
                        </span>
                      </div>
                    </div>

                    {/* Module-Based Prep Progress Section */}
                    <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-primary)] space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[var(--text-secondary)]">
                          Prep Progress
                        </span>
                        <span className="font-bold text-[var(--text-primary)] tabular-nums">
                          {overallProgress}%{' '}
                          <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
                            ({completedModulesCount}/{moduleSegments.length} mods)
                          </span>
                        </span>
                      </div>

                      {/* Segmented Module-Based Progress Bars */}
                      <div className="flex items-center gap-1.5 w-full">
                        {moduleSegments.map((seg, sIdx) => {
                          return (
                            <div
                              key={seg.id || sIdx}
                              className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden relative"
                              title={`${seg.name}: ${seg.completed}/${seg.total} completed (${seg.progress}%)`}
                            >
                              <div
                                className="h-full bg-emerald-600 dark:bg-lime-500 rounded-full transition-all duration-300"
                                style={{ width: `${seg.progress}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] pt-0.5">
                        <span className="font-bold text-emerald-700 dark:text-lime-400 uppercase tracking-wider truncate max-w-[130px]">
                          {isReady ? `${moduleSegments.length} Modules Active` : 'Next Step'}
                        </span>
                        <span className="truncate">
                          {questions.length > 0 ? `${questions.length} questions` : 'Generate plan'}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleStartPractice(job._id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-xs shadow-sm transition-all active:scale-[0.99]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Continue Practice
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* 5. Performance Focus Areas & Daily Tip (Sections matching Main Dashboard) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* Performance Focus Areas Panel (2 Cols) */}
            <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-lime-500/10 text-emerald-700 dark:text-lime-400 flex items-center justify-center">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                      Improve Your Performance
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Focus on these key interview evaluation pillars to maximize scoring.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                  Target 80%+
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {[
                  {
                    title: 'Behavioral Questions',
                    desc: 'STAR structure & impact',
                    score: 74,
                    icon: <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
                    bg: 'bg-purple-500/10',
                  },
                  {
                    title: 'Technical Skills',
                    desc: 'Role depth & trade-offs',
                    score: 68,
                    icon: <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
                    bg: 'bg-blue-500/10',
                  },
                  {
                    title: 'Communication',
                    desc: 'Clarity, conciseness & tone',
                    score: 82,
                    icon: <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                    bg: 'bg-emerald-500/10',
                  },
                  {
                    title: 'Problem Solving',
                    desc: 'First-principles reasoning',
                    score: 71,
                    icon: <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
                    bg: 'bg-amber-500/10',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{item.title}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">{item.desc}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-[var(--text-primary)] tabular-nums">{item.score}%</span>
                      <div className="w-12 h-1 bg-gray-200 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 dark:bg-lime-500 rounded-full"
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Practice Tip Panel (1 Col) */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                      Daily AI Interview Tip
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)]">Framework of the day</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-primary)]">
                  Use the <strong className="text-[var(--text-primary)]">STAR method</strong> (Situation, Task, Action, Result) for behavioral answers. Spend 70% of your response time emphasizing the specific <strong className="text-[var(--text-primary)]">Action</strong> you took and measurable <strong className="text-[var(--text-primary)]">Results</strong> achieved.
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--border-primary)] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-lime-400">
                  Ready for practice?
                </span>
                {jobs.length > 0 && (
                  <button
                    onClick={() => handleStartPractice(jobs[0]._id)}
                    className="text-xs font-bold text-[var(--text-primary)] hover:text-emerald-700 dark:hover:text-lime-400 flex items-center gap-1 transition-colors"
                  >
                    Quick Start <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
