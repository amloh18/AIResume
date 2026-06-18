'use client';

import React from 'react';
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
  Plus
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

  // Aggregate billing info (mock for now or from context if available)
  const isYearly = false; // TODO: Pull from DashboardDataContext/Subscription context if available

  // Aggregate data for widgets
  const masterCV = cvs.find(cv => cv.metadata?.isMaster || cv.cvType === 'master');
  const cvScore = masterCV?.metadata?.atsScore || 0;
  
  const getKPIs = () => {
    const handleKPIClick = (title: string) => {
      switch (title) {
        case "CV Score":
          router.push('/editor?step=1');
          break;
        case "Tailored CVs":
          router.push('/dashboard/canvas');
          break;
        case "Cover Letters":
          router.push('/dashboard/canvas?tab=cover-letters');
          break;
        case "ATS Scans":
          router.push('/dashboard/tracker');
          break;
        case "Jobs Tracked":
          router.push('/dashboard/tracker');
          break;
        case "Auto Applies":
          router.push('/dashboard/jobs?tab=auto-apply');
          break;
        default:
          break;
      }
    };

    const common = [
      { 
        title: "CV Score", 
        value: cvScore > 0 ? `${cvScore}%` : "---", 
        icon: <Sparkles />, 
        color: "#163d32", 
        trend: cvScore > 0 ? "+12" : undefined, 
        trendDirection: 'up' as const,
        loading: secondaryLoading.cvs,
        onClick: () => handleKPIClick("CV Score"),
        actionLabel: "Open Editor"
      },
      { 
        title: "Tailored CVs", 
        value: cvs.filter(cv => !cv.metadata?.isMaster && cv.cvType !== 'master').length.toString(), 
        icon: <Briefcase />, 
        color: "#ffd0b0", 
        subtitle: `${goals.cvsCreatedThisMonth} this month`,
        loading: secondaryLoading.cvs,
        onClick: () => handleKPIClick("Tailored CVs"),
        actionLabel: "Open Canvas"
      },
      { 
        title: "Cover Letters", 
        value: coverLetters.length.toString(), 
        icon: <FileText />, 
        color: "#1c4ce8",
        loading: secondaryLoading.coverLetters,
        onClick: () => handleKPIClick("Cover Letters"),
        actionLabel: "Open Canvas"
      },
      { 
        title: "ATS Scans", 
        value: analytics?.totalScans || "0", 
        icon: <Search />, 
        color: "#6138db",
        loading: secondaryLoading.analytics,
        onClick: () => handleKPIClick("ATS Scans"),
        actionLabel: "Open Tracker"
      },
    ];

    if (tier === 'starter') return common;
    
    const focused = [
      ...common.slice(0, 3),
      { 
        title: "Jobs Tracked", 
        value: jobs.length.toString(), 
        icon: <Target />, 
        color: "#6138db", 
        trend: `+${streak.applicationsThisWeek}`, 
        trendDirection: 'up' as const,
        loading: secondaryLoading.jobs,
        onClick: () => handleKPIClick("Jobs Tracked"),
        actionLabel: "Open Tracker"
      }
    ];

    if (tier === 'focused') return focused;

    return [
      ...focused.slice(0, 3),
      { 
        title: "Auto Applies", 
        value: analytics?.autoApplies || "0", 
        icon: <Zap />, 
        color: "#0f172a", 
        trend: "+8", 
        trendDirection: 'up' as const,
        loading: secondaryLoading.analytics,
        onClick: () => handleKPIClick("Auto Applies"),
        actionLabel: "View Autopilot"
      }
    ];
  };

  const kpis = getKPIs();

  // Prepare pipeline data
  const pipelineStages = [
    { label: 'Applied', count: jobs.filter(j => j.status === 'applied').length, color: 'bg-blue-500', path: '/dashboard/tracker?filter=applied' },
    { label: 'Screening', count: jobs.filter(j => j.status === 'screening' || j.status === 'phone_screen').length, color: 'bg-indigo-500', path: '/dashboard/tracker?filter=screening' },
    { label: 'Assessment', count: jobs.filter(j => j.status === 'assessment' || j.status === 'technical_test').length, color: 'bg-purple-500', path: '/dashboard/tracker?filter=assessment' },
    { label: 'Interview', count: jobs.filter(j => j.status === 'interview').length, color: 'bg-amber-500', path: '/dashboard/tracker?filter=interview' },
    { label: 'Offer', count: jobs.filter(j => j.status === 'offer').length, color: 'bg-[#83d60d]', path: '/dashboard/tracker?filter=offer' },
    { label: 'Rejected', count: jobs.filter(j => j.status === 'rejected').length, color: 'bg-rose-500', path: '/dashboard/tracker?filter=rejected' },
  ];

  // Prepare upcoming deadlines
  const upcomingDeadlines = jobs
    .filter(j => j.nextActionDate)
    .sort((a, b) => new Date(a.nextActionDate).getTime() - new Date(b.nextActionDate).getTime())
    .slice(0, 3)
    .map(j => ({
      id: j.id || j._id,
      title: `${j.jobTitle} @ ${j.company}`,
      type: (j.nextActionType || 'Application') as any,
      date: new Date(j.nextActionDate).toLocaleDateString(),
      timeLeft: 'Upcoming'
    }));

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
                  empty={cvs.length === 0}
                />
              </motion.div>
              <motion.div 
                layout
                className={cn("lg:col-span-1 transition-all duration-500", !isExpanded && "min-h-[400px]")}
              >
                <SuggestedFixesWidget 
                  loading={secondaryLoading.aiInsights} 
                  empty={aiInsights.length === 0}
                  fixes={aiInsights.filter(i => i.type === 'improvement').map(i => ({
                    id: i.id || Math.random().toString(),
                    text: i.description,
                    priority: i.priority || 'medium'
                  }))}
                />
              </motion.div>
            </motion.div>

            {/* DETAILED ROWS - Slide Up Animation */}
            <motion.div
              initial={false}
              animate={isExpanded ? { height: 'auto', opacity: 1, y: 0 } : { height: 0, opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8 overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <KeywordGapsWidget loading={secondaryLoading.analytics} />
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
                stages={pipelineStages}
              />
            </motion.div>

            {/* DETAILED ROWS - Slide Up Animation */}
            <motion.div
              initial={false}
              animate={isExpanded ? { height: 'auto', opacity: 1, y: 0 } : { height: 0, opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8 overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <CVStrengthRadar loading={secondaryLoading.cvs} empty={cvs.length === 0} />
                </div>
                <div className="lg:col-span-1">
                  <SuggestedFixesWidget 
                    loading={secondaryLoading.aiInsights} 
                    empty={aiInsights.length === 0}
                    fixes={aiInsights.filter(i => i.type === 'improvement').map(i => ({
                      id: i.id || Math.random().toString(),
                      text: i.description,
                      priority: i.priority || 'medium'
                    }))}
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
                    docs={coverLetters.slice(0, 5).map(cl => ({
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
                  <InterviewCoachWidget />
                </div>
                <div className="lg:col-span-2">
                  <MatchScoreTable 
                    loading={secondaryLoading.jobs}
                    empty={jobs.length === 0}
                    matches={jobs.slice(0, 5).map(j => ({
                      job: j.jobTitle,
                      company: j.company,
                      match: j.atsScore || 0,
                      stage: j.status,
                      deadline: j.nextActionDate ? new Date(j.nextActionDate).toLocaleDateString() : '---'
                    }))}
                  />
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
                  stages={pipelineStages}
                />
              </motion.div>
            </motion.div>
            
            {/* DETAILED ROWS - Slide Up Animation */}
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
                  matches={jobs.slice(0, 5).map(j => ({
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
                  activities={activities.slice(0, 5).map(a => ({
                    id: a.id || a._id,
                    type: a.type as any,
                    text: a.description,
                    time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'Recently'
                  }))}
                />
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
                  docs={coverLetters.slice(0, 5).map(cl => ({
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
                  insights={aiInsights.map(i => ({
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
