import { useState, useEffect, useCallback } from 'react';
import { UnifiedCVService } from '@/lib/services/unified-cv-service';
import { JobService } from '@/lib/services/jobService';
import { ActivityService } from '@/lib/services/activityService';
import { CVAnalyticsService } from '@/lib/services/cvAnalyticsService';

export interface DashboardData {
  // User info
  user: {
    name: string;
    email: string;
    greeting: string;
  };
  
  // Continue Where You Left Off
  drafts: {
    id: string;
    type: 'cv' | 'cover_letter';
    title: string;
    progress: number;
    lastEdited: Date;
  }[];
  
  // Activity Trends
  trends: {
    period: string;
    kpis: {
      totalJobs: number;
      cvsCreated: number;
      coverLettersCreated: number;
      applicationsSubmitted: number;
      interviewsScheduled: number;
    };
  };
  
  // This Week's Schedule
  interviews: {
    id: string;
    company: string;
    role: string;
    stage: string;
    datetime: Date;
    type: string;
    location?: string;
    jobId?: string;
    isMock?: boolean;
  }[];
  
  // Recent Activity
  activities: {
    id: string;
    type: string;
    description: string;
    createdAt: Date;
  }[];
  
  // CV Health Score
  cvHealthScore: number;
  
  // AI Job Whisperer
  aiData: {
    jobTips: { tip: string; source: string }[];
    goal: string;
    metrics: {
      cvsPerJob: string;
      coverLetterCoverage: number;
      jobsThisWeek: number;
    };
    strengths: string[];
    gaps: string[];
  };
  
  // My Vault
  vaultCounts: {
    cvs: number;
    coverLetters: number;
    jobDescriptions: number;
    notes: number;
  };
  
  // Loading states
  loading: {
    drafts: boolean;
    trends: boolean;
    interviews: boolean;
    activities: boolean;
    aiData: boolean;
  };
}

export function useDashboardData(userId: string, selectedPeriod: string = 'week') {
  const [data, setData] = useState<DashboardData>({
    user: { name: '', email: '', greeting: '' },
    drafts: [],
    trends: { period: selectedPeriod, kpis: { totalJobs: 0, cvsCreated: 0, coverLettersCreated: 0, applicationsSubmitted: 0, interviewsScheduled: 0 } },
    interviews: [],
    activities: [],
    cvHealthScore: 0,
    aiData: { jobTips: [], goal: '', metrics: { cvsPerJob: '0', coverLetterCoverage: 0, jobsThisWeek: 0 }, strengths: [], gaps: [] },
    vaultCounts: { cvs: 0, coverLetters: 0, jobDescriptions: 0, notes: 0 },
    loading: { drafts: true, trends: true, interviews: true, activities: true, aiData: true }
  });

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const loadDrafts = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: { ...prev.loading, drafts: true } }));
      
      const [cvs, coverLetters] = await Promise.all([
        UnifiedCVService.getCVs(userId, { status: 'draft', projection: 'summary' }),
        UnifiedCVService.getCVs(userId, { status: 'draft', projection: 'summary' })
      ]);

      const calculateProgress = (cv: any) => {
        if (cv.status === 'published') return 100;
        if (cv.status === 'archived') return 0;
        
        // Simple progress calculation based on CV data completeness
        let score = 0;
        if (cv.cvData?.basics?.name) score += 20;
        if (cv.cvData?.basics?.email) score += 20;
        if (cv.cvData?.basics?.summary) score += 20;
        if (cv.cvData?.work?.length > 0) score += 20;
        if (cv.cvData?.education?.length > 0) score += 20;
        return score;
      };

      const draftCVs = cvs.map(cv => ({
        id: cv.id,
        type: 'cv' as const,
        title: cv.title,
        progress: calculateProgress(cv),
        lastEdited: new Date(cv.updatedAt)
      }));

      const draftCoverLetters = coverLetters.map(cv => ({
        id: cv.id,
        type: 'cover_letter' as const,
        title: cv.title,
        progress: calculateProgress(cv),
        lastEdited: new Date(cv.updatedAt)
      }));

      const allDrafts = [...draftCVs, ...draftCoverLetters]
        .sort((a, b) => b.lastEdited.getTime() - a.lastEdited.getTime())
        .slice(0, 4);

      setData(prev => ({
        ...prev,
        drafts: allDrafts,
        loading: { ...prev.loading, drafts: false }
      }));
    } catch (error) {
      console.error('Error loading drafts:', error);
      setData(prev => ({ ...prev, loading: { ...prev.loading, drafts: false } }));
    }
  }, [userId]);

  const loadTrends = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: { ...prev.loading, trends: true } }));
      
      const [jobCounts, cvCounts, coverLetterCounts] = await Promise.all([
        JobService.getJobCounts(userId, selectedPeriod),
        UnifiedCVService.getCVs(userId, { projection: 'summary' }),
        UnifiedCVService.getCVs(userId, { projection: 'summary' })
      ]);

      const kpis = {
        totalJobs: jobCounts.total,
        cvsCreated: cvCounts.length,
        coverLettersCreated: coverLetterCounts.length,
        applicationsSubmitted: jobCounts.applied,
        interviewsScheduled: jobCounts.interview
      };

      setData(prev => ({
        ...prev,
        trends: { period: selectedPeriod, kpis },
        loading: { ...prev.loading, trends: false }
      }));
    } catch (error) {
      console.error('Error loading trends:', error);
      setData(prev => ({ ...prev, loading: { ...prev.loading, trends: false } }));
    }
  }, [userId, selectedPeriod]);

  const loadInterviews = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: { ...prev.loading, interviews: true } }));
      
      const jobs = await JobService.getUpcomingInterviews(userId, 'week');
      
      const interviews = jobs.flatMap((job: any) => 
        ((job.interviews || []) as any[]).map((interview: any) => ({
          id: `${job.id}-${interview.date}`,
          company: job.company,
          role: job.title || job.jobTitle,
          stage: job.status,
          datetime: new Date(interview.date),
          type: interview.type || 'Interview',
          location: interview.location || job.location || 'Remote',
          jobId: job.id
        }))
      ).sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

      setData(prev => ({
        ...prev,
        interviews,
        loading: { ...prev.loading, interviews: false }
      }));
    } catch (error) {
      console.error('Error loading interviews:', error);
      setData(prev => ({ ...prev, loading: { ...prev.loading, interviews: false } }));
    }
  }, [userId]);

  const loadActivities = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: { ...prev.loading, activities: true } }));
      
      const activities = await ActivityService.getDashboardActivity(userId, 10);
      
      setData(prev => ({
        ...prev,
        activities,
        loading: { ...prev.loading, activities: false }
      }));
    } catch (error) {
      console.error('Error loading activities:', error);
      setData(prev => ({ ...prev, loading: { ...prev.loading, activities: false } }));
    }
  }, [userId]);

  const loadAIData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: { ...prev.loading, aiData: true } }));
      
      const [cvCounts, jobCounts, coverLetterCounts] = await Promise.all([
        UnifiedCVService.getCVs(userId, { projection: 'summary' }),
        JobService.getJobCounts(userId, 'week'),
        UnifiedCVService.getCVs(userId, { projection: 'summary' })
      ]);

      // Calculate AI metrics
      const metrics = {
        cvsPerJob: jobCounts.total > 0 ? (cvCounts.length / jobCounts.total).toFixed(1) : '0',
        coverLetterCoverage: jobCounts.total > 0 ? Math.round((coverLetterCounts.length / jobCounts.total) * 100) : 0,
        jobsThisWeek: jobCounts.total
      };

      // Generate AI goal
      const goal = metrics.jobsThisWeek > 0 
        ? `Create cover letters for the ${metrics.jobsThisWeek} jobs added this week`
        : 'Add your first job to start creating targeted cover letters';

      // Generate job tips
      const jobTips: Array<{ tip: string; source: string }> = [];
      if (cvCounts.length === 0) {
        jobTips.push({ tip: 'Create your first CV to get started', source: 'CV Circle' });
      } else if (jobCounts.total === 0) {
        jobTips.push({ tip: 'Start tracking job applications', source: 'CV Circle' });
      } else {
        jobTips.push({ tip: 'Customize your CV for each application', source: 'CareerBuilder' });
      }

      // Get keywords analysis from latest CV
      const latestCVs = await UnifiedCVService.getCVs(userId, { projection: 'summary' });
      let strengths: string[] = [];
      let gaps: string[] = [];
      
      if (latestCVs.length > 0) {
        try {
          const analysis = await CVAnalyticsService.getKeywordsAnalysis(latestCVs[0].id);
          strengths = analysis.strengths;
          gaps = analysis.gaps;
        } catch (error) {
          console.error('Error getting keywords analysis:', error);
        }
      }

      setData(prev => ({
        ...prev,
        aiData: { jobTips, goal, metrics, strengths, gaps },
        loading: { ...prev.loading, aiData: false }
      }));
    } catch (error) {
      console.error('Error loading AI data:', error);
      setData(prev => ({ ...prev, loading: { ...prev.loading, aiData: false } }));
    }
  }, [userId]);

  const loadVaultCounts = useCallback(async () => {
    try {
      const [cvCounts, jobCounts, coverLetterCounts, allJobs] = await Promise.all([
        UnifiedCVService.getCVs(userId, { projection: 'summary' }),
        JobService.getJobCounts(userId, 'all'),
        UnifiedCVService.getCVs(userId, { projection: 'summary' }),
        JobService.getJobs({ userId, status: undefined })
      ]);

      // Filter out rejected jobs for vault count
      const nonRejectedJobs = allJobs.jobs.filter((job: any) => job.status !== 'rejected');

      setData(prev => ({
        ...prev,
        vaultCounts: {
          cvs: cvCounts.length,
          coverLetters: coverLetterCounts.length,
          jobDescriptions: nonRejectedJobs.length,
          notes: Math.floor((cvCounts.length + nonRejectedJobs.length + coverLetterCounts.length) * 0.3)
        }
      }));
    } catch (error) {
      console.error('Error loading vault counts:', error);
    }
  }, [userId]);

  const loadCVHealthScore = useCallback(async () => {
    try {
      const latestCVs = await UnifiedCVService.getCVs(userId, { projection: 'summary' });
      if (latestCVs.length > 0) {
        try {
          const healthMetrics = await CVAnalyticsService.calculateHealthScore(latestCVs[0].id);
          setData(prev => ({ ...prev, cvHealthScore: healthMetrics.overallScore }));
        } catch (error) {
          console.error('Error calculating CV health score:', error);
        }
      }
    } catch (error) {
      console.error('Error loading CV health score:', error);
    }
  }, [userId]);

  // Load all data
  useEffect(() => {
    if (!userId) return;

    setData(prev => ({
      ...prev,
      user: { ...prev.user, greeting: getGreeting() }
    }));

    loadDrafts();
    loadTrends();
    loadInterviews();
    loadActivities();
    loadAIData();
    loadVaultCounts();
    loadCVHealthScore();
  }, [userId, selectedPeriod, getGreeting, loadDrafts, loadTrends, loadInterviews, loadActivities, loadAIData, loadVaultCounts, loadCVHealthScore]);

  // Refresh functions
  const refreshDrafts = () => loadDrafts();
  const refreshTrends = () => loadTrends();
  const refreshInterviews = () => loadInterviews();
  const refreshActivities = () => loadActivities();
  const refreshAIData = () => loadAIData();

  return {
    data,
    refresh: {
      drafts: refreshDrafts,
      trends: refreshTrends,
      interviews: refreshInterviews,
      activities: refreshActivities,
      aiData: refreshAIData
    }
  };
}
