'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Briefcase, 
  Sparkles, 
  Target, 
  Zap, 
  Calendar, 
  Search,
  CheckCircle,
  Brain,
  Plus,
  TrendingUp,
  Award,
  BarChart2,
  Clock,
  Activity,
} from 'lucide-react';
import { UserTier } from '@/types/dashboard-widgets';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { useRouter } from 'next/navigation';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { cn } from '@/lib/utils';
import KPICard from './KPICard';
import CVStrengthRadar from './CVStrengthRadar';
import SuggestedFixesWidget from './SuggestedFixesWidget';
import KeywordGapsWidget from './KeywordGapsWidget';
import JobPipelineWidget from './JobPipelineWidget';
import UpcomingDeadlinesWidget from './UpcomingDeadlinesWidget';
import TailoredCVWidget from './TailoredCVWidget';
import CoverLetterWidget from './CoverLetterWidget';
import InterviewCoachWidget from './InterviewCoachWidget';
import MatchScoreTable from './MatchScoreTable';
import AutonomousBotWidget from './AutonomousBotWidget';
import BotActivityFeed from './BotActivityFeed';
import AutoApplyMetrics from './AutoApplyMetrics';
import AIMatchDiscoveryWidget from './AIMatchDiscoveryWidget';
import AutomationSettingsWidget from './AutomationSettingsWidget';
import RedesignedAIInsightsWidget from './RedesignedAIInsightsWidget';
import UpgradeBanner from './UpgradeBanner';

interface RedesignedDashboardViewProps {
  tier: UserTier;
  isExpanded?: boolean;
}

export default function RedesignedDashboardView({ tier, isExpanded = false }: RedesignedDashboardViewProps) {
  const router = useRouter();
  const { openPaymentModal } = usePaymentModal();
  const { 
    cvs, 
    coverLetters, 
    jobs, 
    analytics, 
    streak, 
    goals, 
    activities, 
    aiInsights,
    secondaryLoading,
    isReady
  } = useDashboardData();

  const isYearly = false;

  // ── Master CV & Analysis Data ─────────────────────────────────────────────
  const masterCV = useMemo(() => 
    cvs.find(cv => cv.metadata?.isMaster || cv.cvType === 'master'),
    [cvs]
  );

  const surgeonAnalysis = masterCV?.metadata?.surgeonAnalysis;

  const cvScore: number = useMemo(() =>
    surgeonAnalysis?.scoreReport?.overall_score ||
    surgeonAnalysis?.score ||
    masterCV?.metadata?.cvScore ||
    masterCV?.cv_score_master ||
    masterCV?.metadata?.atsScore ||
    0,
    [masterCV, surgeonAnalysis]
  );

  // Build radar metrics from real analysis data if available
  const radarMetrics = useMemo(() => {
    const report = surgeonAnalysis?.scoreReport;
    if (report) {
      // Map CVScoreBreakdown fields → radar subjects with 0-100 scale
      const norm = (val: number, max: number) => Math.round(Math.min(100, (val / max) * 100));
      return [
        { subject: 'Completeness', A: norm(report.completeness ?? report.overall_score ?? 0, 25), fullMark: 100 },
        { subject: 'Impact',       A: norm(report.impactVerbs ?? 0, 20), fullMark: 100 },
        { subject: 'Quantify',     A: norm(report.quantification ?? 0, 20), fullMark: 100 },
        { subject: 'Formatting',   A: norm(report.formatting ?? 0, 15), fullMark: 100 },
        { subject: 'Readability',  A: norm(report.readability ?? 0, 20), fullMark: 100 },
      ];
    }
    // Fallback: derive from overall score
    if (cvScore > 0) {
      const base = cvScore;
      return [
        { subject: 'Formatting',  A: Math.min(100, base + 8), fullMark: 100 },
        { subject: 'Keywords',    A: Math.max(30, base - 15), fullMark: 100 },
        { subject: 'Readability', A: Math.min(100, base + 4), fullMark: 100 },
        { subject: 'Impact',      A: Math.max(25, base - 20), fullMark: 100 },
        { subject: 'Skills',      A: Math.min(100, base + 10), fullMark: 100 },
      ];
    }
    // Pure defaults when no CV exists
    return [
      { subject: 'Formatting',  A: 0, fullMark: 100 },
      { subject: 'Keywords',    A: 0, fullMark: 100 },
      { subject: 'Readability', A: 0, fullMark: 100 },
      { subject: 'Impact',      A: 0, fullMark: 100 },
      { subject: 'Skills',      A: 0, fullMark: 100 },
    ];
  }, [surgeonAnalysis, cvScore]);

  // Build suggested fixes from real analysis data
  const suggestedFixes = useMemo(() => {
    // Primary: surgeon analysis fixes
    const rawFixes = surgeonAnalysis?.fixes ?? [];
    if (rawFixes.length > 0) {
      return rawFixes.slice(0, 6).map((fix: any, i: number) => ({
        id: fix.id || fix._id || String(i),
        text: fix.message || fix.suggestion || fix.text || fix.description || String(fix),
        priority: fix.priority === 'critical' || fix.severity === 'high' ? 'high' as const :
                  fix.priority === 'low' || fix.severity === 'low' ? 'low' as const : 'medium' as const,
      }));
    }
    // Secondary: AI insights improvements
    const insightFixes = aiInsights
      .filter((i: any) => i.type === 'improvement' || i.type === 'warning')
      .slice(0, 5)
      .map((i: any) => ({
        id: i.id || Math.random().toString(),
        text: i.description || i.title,
        priority: i.priority as 'high' | 'medium' | 'low' || 'medium',
      }));
    return insightFixes;
  }, [surgeonAnalysis, aiInsights]);

  // Build keyword gaps from penalty reasons or analysis report
  const keywordGaps = useMemo(() => {
    const report = surgeonAnalysis?.scoreReport;
    // If scoreReport has penalty reasons, map those to keyword gaps
    const penalties: string[] = report?.penaltyReasons ?? [];
    if (penalties.length > 0) {
      return penalties.slice(0, 8).map((p: string) => ({
        name: p.replace(/^Missing keyword:\s*/i, '').replace(/^Add\s*/i, '').substring(0, 30),
        category: p.toLowerCase().includes('skill') ? 'Skill' : 
                  p.toLowerCase().includes('tool') ? 'Tool' : 'Keyword',
      }));
    }
    // Fallback: derive from master CV data using industry standard keywords not present
    return [];
  }, [surgeonAnalysis]);

  // ── Derived Stats ─────────────────────────────────────────────────────────
  const tailoredCVCount = cvs.filter(cv => !cv.metadata?.isMaster && cv.cvType !== 'master').length;
  const tailoredCVsThisMonth = goals.cvsCreatedThisMonth || 0;
  const avgAtsScore = useMemo(() => {
    const journeyCVs = cvs.filter(cv => !cv.metadata?.isMaster && (cv.metadata?.atsScore || 0) > 0);
    if (!journeyCVs.length) return 0;
    return Math.round(journeyCVs.reduce((acc, cv) => acc + (cv.metadata?.atsScore || 0), 0) / journeyCVs.length);
  }, [cvs]);

  const interviewRate = useMemo(() => {
    if (!jobs.length) return 0;
    const interviewed = jobs.filter((j: any) => ['interview', 'offer', 'accepted'].includes(j.status)).length;
    return Math.round((interviewed / jobs.length) * 100);
  }, [jobs]);

  const activeApplications = jobs.filter((j: any) => 
    ['applied', 'screening', 'assessment', 'phone_screen', 'technical_test', 'interview'].includes(j.status)
  ).length;

  const offerCount = jobs.filter((j: any) => j.status === 'offer').length;

  const trackerPipelineStages = useMemo(() => {
    const stageDefs = [
      { label: 'Draft', status: 'draft', color: 'bg-slate-400' },
      { label: 'Staging', status: 'created', color: 'bg-cyan-500' },
      { label: 'Applied', status: 'applied', color: 'bg-blue-500' },
      { label: 'Screening', status: 'screening', color: 'bg-indigo-500' },
      { label: 'Interview', status: 'interview', color: 'bg-amber-500' },
      { label: 'Offer', status: 'offer', color: 'bg-[#83d60d]' },
      { label: 'Accepted', status: 'accepted', color: 'bg-emerald-500' },
      { label: 'Rejected', status: 'rejected', color: 'bg-rose-500' },
      { label: 'Withdrawn', status: 'withdrawn', color: 'bg-zinc-500' },
    ] as const;

    return stageDefs.map((stage) => ({
      label: stage.label,
      count: jobs.filter((j: any) => j.status === stage.status).length,
      color: stage.color,
      path: `/dashboard/tracker?filter=${stage.status}`,
    }));
  }, [jobs]);

  // ── KPI Definitions ───────────────────────────────────────────────────────
  const getKPIs = () => {
    const handleKPIClick = (title: string) => {
      switch (title) {
        case 'CV Score':         router.push('/editor?step=1'); break;
        case 'Tailored CVs':    router.push('/editor'); break;
        case 'Cover Letters':   router.push('/editor?tab=cover-letters'); break;
        case 'ATS Avg':         router.push('/dashboard/tracker'); break;
        case 'Jobs Tracked':    router.push('/dashboard/tracker'); break;
        case 'Active Apps':     router.push('/dashboard/tracker?filter=active'); break;
        case 'Interview Rate':  router.push('/dashboard/tracker?filter=interview'); break;
        case 'Offers':          router.push('/dashboard/tracker?filter=offer'); break;
        case 'Auto Applies':    router.push('/dashboard/jobs?tab=auto-apply'); break;
      }
    };

    // ── STARTER: CV-focused — quality & output ────────────────────────────
    if (tier === 'starter') {
      return [
        {
          title: 'CV Score',
          value: cvScore > 0 ? `${cvScore}%` : '—',
          icon: <Sparkles />,
          color: '#163d32',
          trend: cvScore > 0 ? (cvScore >= 70 ? '↑ Good' : cvScore >= 50 ? '↑ Fair' : 'Needs work') : undefined,
          trendDirection: cvScore >= 70 ? 'up' as const : cvScore >= 50 ? 'neutral' as const : 'down' as const,
          subtitle: cvScore > 0 ? (cvScore >= 80 ? 'Excellent quality' : cvScore >= 60 ? 'Above average' : 'Needs improvement') : 'Analyse your CV',
          loading: secondaryLoading.cvs,
          onClick: () => handleKPIClick('CV Score'),
          actionLabel: 'Open Editor',
        },
        {
          title: 'Tailored CVs',
          value: tailoredCVCount.toString(),
          icon: <Briefcase />,
          color: '#ffd0b0',
          subtitle: tailoredCVsThisMonth > 0 ? `+${tailoredCVsThisMonth} this month` : 'Create your first',
          loading: secondaryLoading.cvs,
          onClick: () => handleKPIClick('Tailored CVs'),
          actionLabel: 'Open Canvas',
        },
        {
          title: 'Cover Letters',
          value: coverLetters.length.toString(),
          icon: <FileText />,
          color: '#1c4ce8',
          subtitle: coverLetters.length > 0
            ? `${goals.coverLettersCreatedThisMonth || 0} this month`
            : 'Personalise your pitch',
          loading: secondaryLoading.coverLetters,
          onClick: () => handleKPIClick('Cover Letters'),
          actionLabel: 'Open Canvas',
        },
        {
          title: 'ATS Avg',
          value: avgAtsScore > 0 ? `${avgAtsScore}%` : '—',
          icon: <Search />,
          color: '#6138db',
          subtitle: avgAtsScore > 0
            ? (avgAtsScore >= 70 ? 'ATS-ready' : 'Optimise keywords')
            : 'Run ATS check',
          loading: secondaryLoading.analytics,
          onClick: () => handleKPIClick('ATS Avg'),
          actionLabel: 'Open Tracker',
        },
      ];
    }

    // ── FOCUSED: Job-search-focused — applications & pipeline ─────────────
    if (tier === 'focused') {
      return [
        {
          title: 'CV Score',
          value: cvScore > 0 ? `${cvScore}%` : '—',
          icon: <Sparkles />,
          color: '#163d32',
          subtitle: cvScore > 0 ? (cvScore >= 80 ? 'Excellent' : cvScore >= 60 ? 'Above avg' : 'Needs work') : 'No CV analysed',
          loading: secondaryLoading.cvs,
          onClick: () => handleKPIClick('CV Score'),
          actionLabel: 'Open Editor',
        },
        {
          title: 'Jobs Tracked',
          value: jobs.length.toString(),
          icon: <Target />,
          color: '#ffd0b0',
          trend: streak.applicationsThisWeek > 0 ? `+${streak.applicationsThisWeek} this week` : undefined,
          trendDirection: 'up' as const,
          subtitle: `${activeApplications} active`,
          loading: secondaryLoading.jobs,
          onClick: () => handleKPIClick('Jobs Tracked'),
          actionLabel: 'Open Tracker',
        },
        {
          title: 'Interview Rate',
          value: interviewRate > 0 ? `${interviewRate}%` : '—',
          icon: <Award />,
          color: '#1c4ce8',
          subtitle: interviewRate >= 20 ? 'Above average' : interviewRate > 0 ? 'Keep applying' : 'No interviews yet',
          loading: secondaryLoading.jobs,
          onClick: () => handleKPIClick('Interview Rate'),
          actionLabel: 'Open Tracker',
        },
        {
          title: 'Offers',
          value: offerCount > 0 ? offerCount.toString() : '—',
          icon: <TrendingUp />,
          color: '#6138db',
          subtitle: offerCount > 0 ? '🎉 Congrats!' : jobs.length > 0 ? 'Keep going!' : 'Start applying',
          loading: secondaryLoading.jobs,
          onClick: () => handleKPIClick('Offers'),
          actionLabel: 'View Offers',
        },
      ];
    }

    // ── SMART: Automation-focused — pipeline velocity & reach ─────────────
    return [
      {
        title: 'Active Apps',
        value: activeApplications.toString(),
        icon: <Activity />,
        color: '#163d32',
        trend: streak.applicationsThisWeek > 0 ? `+${streak.applicationsThisWeek}/wk` : undefined,
        trendDirection: 'up' as const,
        subtitle: `${jobs.length} total tracked`,
        loading: secondaryLoading.jobs,
        onClick: () => handleKPIClick('Active Apps'),
        actionLabel: 'View Pipeline',
      },
      {
        title: 'Auto Applies',
        value: analytics?.autoApplies !== undefined ? String(analytics.autoApplies) : '—',
        icon: <Zap />,
        color: '#0f172a',
        trend: analytics?.autoApplies > 0 ? '+8 this week' : undefined,
        trendDirection: 'up' as const,
        subtitle: 'Autopilot active',
        loading: secondaryLoading.analytics,
        onClick: () => handleKPIClick('Auto Applies'),
        actionLabel: 'View Autopilot',
      },
      {
        title: 'Interview Rate',
        value: interviewRate > 0 ? `${interviewRate}%` : '—',
        icon: <Award />,
        color: '#1c4ce8',
        subtitle: interviewRate >= 20 ? '🎯 Above average' : interviewRate > 0 ? 'Improving…' : 'Getting started',
        loading: secondaryLoading.jobs,
        onClick: () => handleKPIClick('Interview Rate'),
        actionLabel: 'Open Tracker',
      },
      {
        title: 'Offers',
        value: offerCount > 0 ? offerCount.toString() : '—',
        icon: <TrendingUp />,
        color: '#6138db',
        subtitle: offerCount > 0 ? '🎉 Congrats!' : `${jobs.length > 0 ? 'Pipeline active' : 'No jobs yet'}`,
        loading: secondaryLoading.jobs,
        onClick: () => handleKPIClick('Offers'),
        actionLabel: 'View Offers',
      },
    ];
  };

  const kpis = getKPIs();

  // ── Upcoming Deadlines ────────────────────────────────────────────────────
  const upcomingDeadlines = jobs
    .filter((j: any) => j.nextActionDate)
    .sort((a: any, b: any) => new Date(a.nextActionDate).getTime() - new Date(b.nextActionDate).getTime())
    .slice(0, 3)
    .map((j: any) => ({
      id: j.id || j._id,
      title: `${j.jobTitle} @ ${j.company}`,
      type: (j.nextActionType || 'Application') as any,
      date: new Date(j.nextActionDate).toLocaleDateString(),
      timeLeft: 'Upcoming',
    }));

  const isMasterCVEmpty = !masterCV;
  const isAnalysisEmpty = !surgeonAnalysis;

  return (
    <div className="space-y-8">
      {/* KPI Row - ROW 1 */}
      <motion.div 
        layout
        animate={{ scale: isExpanded ? 0.98 : 1, y: isExpanded ? -16 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
      >
        {kpis.map((kpi, i) => (
          <KPICard 
            key={i} 
            {...kpi} 
            className={cn(
              "transition-all duration-500",
              isExpanded ? "min-h-[120px] p-4" : "min-h-[160px] p-6"
            )}
            isExpanded={isExpanded}
          />
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {tier === 'starter' && (
          <motion.div 
            layout
            key="starter"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* ROW 2 */}
            <motion.div 
              layout
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <motion.div 
                layout
                className={cn("lg:col-span-2 transition-all duration-500", !isExpanded && "min-h-[400px]")}
              >
                <CVStrengthRadar 
                  loading={secondaryLoading.cvs} 
                  empty={isMasterCVEmpty}
                  metrics={radarMetrics}
                />
              </motion.div>
              <motion.div 
                layout
                className={cn("lg:col-span-1 transition-all duration-500", !isExpanded && "min-h-[400px]")}
              >
                <SuggestedFixesWidget 
                  loading={secondaryLoading.cvs || secondaryLoading.aiInsights}
                  empty={suggestedFixes.length === 0}
                  fixes={suggestedFixes}
                />
              </motion.div>
            </motion.div>

            {/* DETAILED ROWS */}
            <motion.div
              initial={false}
              animate={isExpanded ? { height: 'auto', opacity: 1, y: 0 } : { height: 0, opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8 overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <KeywordGapsWidget
                    loading={secondaryLoading.cvs}
                    empty={keywordGaps.length === 0}
                    keywords={keywordGaps}
                  />
                </div>
                <div className="lg:col-span-2">
                  <TailoredCVWidget 
                    loading={secondaryLoading.cvs}
                    empty={cvs.filter(cv => !cv.metadata?.isMaster).length === 0}
                    docs={cvs.filter(cv => !cv.metadata?.isMaster).slice(0, 5).map(cv => ({
                      id: cv.id || cv._id,
                      title: cv.title,
                      matchScore: cv.metadata?.atsScore || 0,
                      updatedAt: new Date(cv.updatedAt).toLocaleDateString(),
                      role: cv.cvData?.basics?.label || 'Target Role'
                    }))}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {tier === 'focused' && (
          <motion.div 
            layout
            key="focused"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* ROW 2 */}
            <motion.div 
              layout
              className={cn("transition-all duration-500", !isExpanded && "min-h-[400px]")}
            >
              <JobPipelineWidget 
                loading={secondaryLoading.jobs}
                empty={jobs.length === 0}
                stages={trackerPipelineStages}
              />
            </motion.div>

            {/* DETAILED ROWS */}
            <motion.div
              initial={false}
              animate={isExpanded ? { height: 'auto', opacity: 1, y: 0 } : { height: 0, opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8 overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <CVStrengthRadar
                    loading={secondaryLoading.cvs}
                    empty={isMasterCVEmpty}
                    metrics={radarMetrics}
                  />
                </div>
                <div className="lg:col-span-1">
                  <SuggestedFixesWidget 
                    loading={secondaryLoading.cvs || secondaryLoading.aiInsights}
                    empty={suggestedFixes.length === 0}
                    fixes={suggestedFixes}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TailoredCVWidget 
                  loading={secondaryLoading.cvs}
                  empty={cvs.filter(cv => !cv.metadata?.isMaster).length === 0}
                  docs={cvs.filter(cv => !cv.metadata?.isMaster).slice(0, 5).map(cv => ({
                    id: cv.id || cv._id,
                    title: cv.title,
                    matchScore: cv.metadata?.atsScore || 0,
                    updatedAt: new Date(cv.updatedAt).toLocaleDateString(),
                    role: cv.cvData?.basics?.label || 'Target Role'
                  }))}
                />
                <div className="space-y-8">
                  <UpcomingDeadlinesWidget 
                    loading={secondaryLoading.jobs}
                    empty={upcomingDeadlines.length === 0}
                    deadlines={upcomingDeadlines}
                  />
                  <CoverLetterWidget 
                    loading={secondaryLoading.coverLetters}
                    empty={coverLetters.length === 0}
                    docs={coverLetters.slice(0, 5).map((cl: any) => ({
                      id: cl.id || cl._id,
                      title: cl.title || 'Cover Letter',
                      updatedAt: new Date(cl.updatedAt).toLocaleDateString(),
                      role: cl.jobTitle || 'Target Role'
                    }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <KeywordGapsWidget
                    loading={secondaryLoading.cvs}
                    empty={keywordGaps.length === 0}
                    keywords={keywordGaps}
                  />
                </div>
                <div className="lg:col-span-2">
                  <MatchScoreTable 
                    loading={secondaryLoading.jobs}
                    empty={jobs.length === 0}
                    matches={jobs.slice(0, 5).map((j: any) => ({
                      job: j.jobTitle,
                      company: j.company,
                      match: j.atsScore || 0,
                      stage: j.status,
                      deadline: j.nextActionDate ? new Date(j.nextActionDate).toLocaleDateString() : '---'
                    }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <InterviewCoachWidget />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {tier === 'smart' && (
          <motion.div 
            layout
            key="smart"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* ROW 2 */}
            <motion.div 
              layout
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <motion.div 
                layout
                className={cn("lg:col-span-2 transition-all duration-500", !isExpanded && "min-h-[400px]")}
              >
                <AutonomousBotWidget />
              </motion.div>
              <motion.div 
                layout
                className={cn("lg:col-span-1 transition-all duration-500", !isExpanded && "min-h-[400px]")}
              >
                <JobPipelineWidget 
                  loading={secondaryLoading.jobs}
                  empty={jobs.length === 0}
                  stages={trackerPipelineStages}
                />
              </motion.div>
            </motion.div>
            
            {/* DETAILED ROWS */}
            <motion.div
              initial={false}
              animate={isExpanded ? { height: 'auto', opacity: 1, y: 0 } : { height: 0, opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8 overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <MatchScoreTable 
                  loading={secondaryLoading.jobs}
                  empty={jobs.length === 0}
                  matches={jobs.slice(0, 5).map((j: any) => ({
                    job: j.jobTitle,
                    company: j.company,
                    match: j.atsScore || 0,
                    stage: j.status,
                    deadline: j.nextActionDate ? new Date(j.nextActionDate).toLocaleDateString() : '---'
                  }))}
                />
                <BotActivityFeed 
                  loading={secondaryLoading.activities}
                  empty={activities.length === 0}
                  activities={activities.slice(0, 5).map((a: any) => ({
                    id: a.id || a._id,
                    type: a.type as any,
                    text: a.description,
                    time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'Recently'
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <CVStrengthRadar
                    loading={secondaryLoading.cvs}
                    empty={isMasterCVEmpty}
                    metrics={radarMetrics}
                  />
                </div>
                <div className="lg:col-span-1">
                  <SuggestedFixesWidget 
                    loading={secondaryLoading.cvs || secondaryLoading.aiInsights}
                    empty={suggestedFixes.length === 0}
                    fixes={suggestedFixes}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <TailoredCVWidget 
                  loading={secondaryLoading.cvs}
                  empty={cvs.filter(cv => !cv.metadata?.isMaster).length === 0}
                  docs={cvs.filter(cv => !cv.metadata?.isMaster).slice(0, 5).map(cv => ({
                    id: cv.id || cv._id,
                    title: cv.title,
                    matchScore: cv.metadata?.atsScore || 0,
                    updatedAt: new Date(cv.updatedAt).toLocaleDateString(),
                    role: cv.cvData?.basics?.label || 'Target Role'
                  }))}
                />
                <CoverLetterWidget 
                  loading={secondaryLoading.coverLetters}
                  empty={coverLetters.length === 0}
                  docs={coverLetters.slice(0, 5).map((cl: any) => ({
                    id: cl.id || cl._id,
                    title: cl.title || 'Cover Letter',
                    updatedAt: new Date(cl.updatedAt).toLocaleDateString(),
                    role: cl.jobTitle || 'Target Role'
                  }))}
                />
                <InterviewCoachWidget />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AutoApplyMetrics />
                <AIMatchDiscoveryWidget />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AutomationSettingsWidget />
                <RedesignedAIInsightsWidget 
                  loading={secondaryLoading.aiInsights}
                  empty={aiInsights.length === 0}
                  insights={aiInsights.map((i: any) => ({
                    id: i.id || Math.random().toString(),
                    title: i.title,
                    description: i.description,
                    type: i.type as any
                  }))}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <UpgradeBanner tier={tier} isYearly={isYearly} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
