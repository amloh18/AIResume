'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetch, authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { requestDeduplication } from '@/lib/utils/requestDeduplication';

interface DashboardDataContextType {
  cvs: any[];
  coverLetters: any[];
  jobs: any[];
  analytics: any;
  profileStrength: number;
  streak: {
    current: number;
    longest: number;
    weeklyGoal: number;
    applicationsThisWeek: number;
  };
  goals: {
    monthlyGoal: number;
    applicationsThisMonth: number;
    cvsCreatedThisMonth: number;
    coverLettersCreatedThisMonth: number;
    cvGoal?: number;
    interviewGoal?: number;
  };
  activities: any[];
  aiInsights: any[];
  skillsMarket: any;
  salaryInsights: any;
  jobRecommendations: any[];
  // Loading states
  criticalLoading: boolean; // User/subscription data
  secondaryLoading: {
    cvs: boolean;
    coverLetters: boolean;
    jobs: boolean;
    analytics: boolean;
    profileStrength: boolean;
    streak: boolean;
    goals: boolean;
    activities: boolean;
    aiInsights: boolean;
    skillsMarket: boolean;
    salaryInsights: boolean;
    jobRecommendations: boolean;
  };
  // Legacy loading for backward compatibility
  loading: boolean;
  // Per-category errors
  errors: {
    cvs?: string | null;
    coverLetters?: string | null;
    jobs?: string | null;
    analytics?: string | null;
    profileStrength?: string | null;
    streak?: string | null;
    goals?: string | null;
    activities?: string | null;
    aiInsights?: string | null;
    skillsMarket?: string | null;
    salaryInsights?: string | null;
    jobRecommendations?: string | null;
  };
  // Legacy error for backward compatibility
  error: string | null;
  // Ready state: true when critical data is loaded
  isReady: boolean;
  refreshCVs: () => Promise<void>;
  refreshCoverLetters: () => Promise<void>;
  refreshJobs: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  refreshProfileStrength: () => Promise<void>;
  refreshStreak: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshActivities: () => Promise<void>;
  refreshAiInsights: () => Promise<void>;
  refreshSkillsMarket: () => Promise<void>;
  refreshSalaryInsights: () => Promise<void>;
  refreshJobRecommendations: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export const useDashboardData = () => {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider');
  }
  return context;
};

export const DashboardDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, userId } = useUnifiedAuth();
  const [cvs, setCvs] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [profileStrength, setProfileStrength] = useState<number>(0);
  const [streak, setStreak] = useState<{
    current: number;
    longest: number;
    weeklyGoal: number;
    applicationsThisWeek: number;
  }>({
    current: 0,
    longest: 0,
    weeklyGoal: 15,
    applicationsThisWeek: 0
  });
  const [goals, setGoals] = useState<{
    monthlyGoal: number;
    applicationsThisMonth: number;
    cvsCreatedThisMonth: number;
    coverLettersCreatedThisMonth: number;
    cvGoal?: number;
    interviewGoal?: number;
  }>({
    monthlyGoal: 20,
    applicationsThisMonth: 0,
    cvsCreatedThisMonth: 0,
    coverLettersCreatedThisMonth: 0,
    cvGoal: 5,
    interviewGoal: 10
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [skillsMarket, setSkillsMarket] = useState<any>(null);
  const [salaryInsights, setSalaryInsights] = useState<any>(null);
  const [jobRecommendations, setJobRecommendations] = useState<any[]>([]);

  // Separate loading states for critical vs secondary data
  const [criticalLoading, setCriticalLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState({
    cvs: false,
    coverLetters: false,
    jobs: false,
    analytics: false,
    profileStrength: false,
    streak: false,
    goals: false,
    activities: false,
    aiInsights: false,
    skillsMarket: false,
    salaryInsights: false,
    jobRecommendations: false
  });

  const [errors, setErrors] = useState<{
    cvs?: string | null;
    coverLetters?: string | null;
    jobs?: string | null;
    analytics?: string | null;
    profileStrength?: string | null;
    streak?: string | null;
    goals?: string | null;
    activities?: string | null;
    aiInsights?: string | null;
    skillsMarket?: string | null;
    salaryInsights?: string | null;
    jobRecommendations?: string | null;
  }>({});

  // Track if data has been loaded to prevent duplicate fetches
  const hasLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Use Map to track loading state per endpoint
  const loadingStates = useRef(new Map<string, boolean>());

  const fetchCVs = useCallback(async (userId: string) => {
    const endpoint = `/api/cvs?projection=summary`;

    // Use request deduplication to prevent multiple simultaneous calls
    return requestDeduplication.deduplicate(endpoint, async () => {
      if (loadingStates.current.get('cvs')) {
        console.log('⏭️ DashboardData - CV fetch already in progress, skipping');
        return;
      }

      try {
        loadingStates.current.set('cvs', true);
        setSecondaryLoading(prev => ({ ...prev, cvs: true }));
        setErrors(prev => ({ ...prev, cvs: null }));
        console.log('🔍 DashboardData - Fetching CVs');
        const response = await authenticatedFetch(endpoint);
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();

          if (result.success && result.data?.cvs) {
            console.log(`✅ DashboardData - CVs loaded: ${result.data.cvs.length} items`);
            setCvs(result.data.cvs);
          }
        } else {
          console.error('CVs response is not JSON. Content-Type:', contentType);
          throw new Error('Invalid response format');
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching CVs:', err);
        const errorMsg = err.message || 'Failed to fetch CVs';
        setErrors(prev => ({ ...prev, cvs: errorMsg }));
      } finally {
        loadingStates.current.set('cvs', false);
        setSecondaryLoading(prev => ({ ...prev, cvs: false }));
      }
    });
  }, []);

  const fetchCoverLetters = useCallback(async (userId: string) => {
    const endpoint = `/api/cover-letters`;

    // Use request deduplication to prevent multiple simultaneous calls
    return requestDeduplication.deduplicate(endpoint, async () => {
      if (loadingStates.current.get('coverLetters')) {
        console.log('⏭️ DashboardData - Cover letters fetch already in progress, skipping');
        return;
      }

      try {
        loadingStates.current.set('coverLetters', true);
        setSecondaryLoading(prev => ({ ...prev, coverLetters: true }));
        setErrors(prev => ({ ...prev, coverLetters: null }));
        console.log('🔍 DashboardData - Fetching cover letters');
        const response = await authenticatedFetchWithUserId(endpoint, userId);
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();

          if (result.success && result.data?.coverLetters) {
            console.log(`✅ DashboardData - Cover letters loaded: ${result.data.coverLetters.length} items`);
            setCoverLetters(result.data.coverLetters);
          }
        } else {
          console.error('Cover letters response is not JSON. Content-Type:', contentType);
          throw new Error('Invalid response format');
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching cover letters:', err);
        const errorMsg = err.message || 'Failed to fetch cover letters';
        setErrors(prev => ({ ...prev, coverLetters: errorMsg }));
      } finally {
        loadingStates.current.set('coverLetters', false);
        setSecondaryLoading(prev => ({ ...prev, coverLetters: false }));
      }
    });
  }, []);

  const fetchJobs = useCallback(async (userId: string) => {
    const endpoint = `/api/jobs?limit=all`;

    // Use request deduplication to prevent multiple simultaneous calls
    return requestDeduplication.deduplicate(endpoint, async () => {
      if (loadingStates.current.get('jobs')) {
        console.log('⏭️ DashboardData - Jobs fetch already in progress, skipping');
        return;
      }

      try {
        loadingStates.current.set('jobs', true);
        setSecondaryLoading(prev => ({ ...prev, jobs: true }));
        setErrors(prev => ({ ...prev, jobs: null }));
        console.log('🔍 DashboardData - Fetching jobs');
        const response = await authenticatedFetch(endpoint);
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();

          if (result.success && result.data?.jobs) {
            console.log(`✅ DashboardData - Jobs loaded: ${result.data.jobs.length} items`);
            setJobs(result.data.jobs);
          }
        } else {
          console.error('Jobs response is not JSON. Content-Type:', contentType);
          throw new Error('Invalid response format');
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching jobs:', err);
        const errorMsg = err.message || 'Failed to fetch jobs';
        setErrors(prev => ({ ...prev, jobs: errorMsg }));
      } finally {
        loadingStates.current.set('jobs', false);
        setSecondaryLoading(prev => ({ ...prev, jobs: false }));
      }
    });
  }, []);

  const fetchAnalytics = useCallback(async (userId: string, period: string = 'week') => {
    const endpoint = `/api/analytics/progress?userId=${userId}&period=${period}`;

    // Use request deduplication to prevent multiple simultaneous calls
    return requestDeduplication.deduplicate(endpoint, async () => {
      if (loadingStates.current.get('analytics')) {
        console.log('⏭️ DashboardData - Analytics fetch already in progress, skipping');
        return;
      }

      try {
        loadingStates.current.set('analytics', true);
        setSecondaryLoading(prev => ({ ...prev, analytics: true }));
        setErrors(prev => ({ ...prev, analytics: null }));
        console.log('🔍 DashboardData - Fetching analytics');
        const response = await authenticatedFetch(endpoint);
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();

          if (result.success) {
            console.log('✅ DashboardData - Analytics loaded');
            setAnalytics(result.data);
          }
        } else {
          console.warn('Analytics response is not JSON. Content-Type:', contentType);
          setAnalytics(null);
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching analytics:', err);
        // Analytics is optional, but still track error
        setErrors(prev => ({ ...prev, analytics: err.message || 'Failed to fetch analytics' }));
      } finally {
        loadingStates.current.set('analytics', false);
        setSecondaryLoading(prev => ({ ...prev, analytics: false }));
      }
    });
  }, []);

  const fetchProfileStrength = useCallback(async (userId: string) => {
    return requestDeduplication.deduplicate('/api/dashboard/profile-strength', async () => {
      if (loadingStates.current.get('profileStrength')) {
        console.log('⏭️ DashboardData - Profile strength fetch already in progress, skipping');
        return;
      }

      try {
        loadingStates.current.set('profileStrength', true);
        setSecondaryLoading(prev => ({ ...prev, profileStrength: true }));
        setErrors(prev => ({ ...prev, profileStrength: null }));
        console.log('🔍 DashboardData - Fetching profile strength');
        const response = await authenticatedFetch(`/api/dashboard/profile-strength?userId=${userId}`);
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();

          if (result.success && result.data?.strength !== undefined) {
            console.log(`✅ DashboardData - Profile strength loaded: ${result.data.strength}%`);
            setProfileStrength(result.data.strength);
          }
        } else {
          console.warn('Profile strength response is not JSON. Content-Type:', contentType);
          setProfileStrength(0);
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching profile strength:', err);
        const errorMsg = err.message || 'Failed to fetch profile strength';
        setErrors(prev => ({ ...prev, profileStrength: errorMsg }));
      } finally {
        loadingStates.current.set('profileStrength', false);
        setSecondaryLoading(prev => ({ ...prev, profileStrength: false }));
      }
    });
  }, []);

  const fetchStreak = useCallback(async (userId: string) => {
    return requestDeduplication.deduplicate('/api/dashboard/streak', async () => {
      if (loadingStates.current.get('streak')) {
        console.log('⏭️ DashboardData - Streak fetch already in progress, skipping');
        return;
      }

      try {
        loadingStates.current.set('streak', true);
        setSecondaryLoading(prev => ({ ...prev, streak: true }));
        setErrors(prev => ({ ...prev, streak: null }));
        console.log('🔍 DashboardData - Fetching streak');
        const response = await authenticatedFetch(`/api/dashboard/streak?userId=${userId}`);
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();

          if (result.success && result.data) {
            console.log(`✅ DashboardData - Streak loaded: ${result.data.current} days`);
            setStreak({
              current: result.data.current || 0,
              longest: result.data.longest || 0,
              weeklyGoal: result.data.weeklyGoal || 15,
              applicationsThisWeek: result.data.applicationsThisWeek || 0
            });
          }
        } else {
          console.error('Streak response is not JSON. Content-Type:', contentType);
          throw new Error('Invalid response format');
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching streak:', err);
        const errorMsg = err.message || 'Failed to fetch streak';
        setErrors(prev => ({ ...prev, streak: errorMsg }));
      } finally {
        loadingStates.current.set('streak', false);
        setSecondaryLoading(prev => ({ ...prev, streak: false }));
      }
    });
  }, []);

  const fetchGoals = useCallback(async (userId: string) => {
    return requestDeduplication.deduplicate('/api/dashboard/goals', async () => {
      if (loadingStates.current.get('goals')) {
        console.log('⏭️ DashboardData - Goals fetch already in progress, skipping');
        return;
      }

      try {
        loadingStates.current.set('goals', true);
        setSecondaryLoading(prev => ({ ...prev, goals: true }));
        setErrors(prev => ({ ...prev, goals: null }));
        console.log('🔍 DashboardData - Fetching goals');
        const response = await authenticatedFetch(`/api/dashboard/goals?userId=${userId}`);
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const result = await response.json();

          if (result.success && result.data) {
            console.log(`✅ DashboardData - Goals loaded`);
            setGoals({
              monthlyGoal: result.data.monthlyGoal || 20,
              applicationsThisMonth: result.data.applicationsThisMonth || 0,
              cvsCreatedThisMonth: result.data.cvsCreatedThisMonth || 0,
              coverLettersCreatedThisMonth: result.data.coverLettersCreatedThisMonth || 0,
              cvGoal: result.data.cvGoal || 5,
              interviewGoal: result.data.interviewGoal || 10
            });
          }
        } else {
          console.error('Goals response is not JSON. Content-Type:', contentType);
          throw new Error('Invalid response format');
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching goals:', err);
        const errorMsg = err.message || 'Failed to fetch goals';
        setErrors(prev => ({ ...prev, goals: errorMsg }));
      } finally {
        loadingStates.current.set('goals', false);
        setSecondaryLoading(prev => ({ ...prev, goals: false }));
      }
    });
  }, []);

  const fetchActivities = useCallback(async (userId: string) => {
    return requestDeduplication.deduplicate('/api/dashboard/activities', async () => {
      if (loadingStates.current.get('activities')) return;
      try {
        loadingStates.current.set('activities', true);
        setSecondaryLoading(prev => ({ ...prev, activities: true }));
        const response = await authenticatedFetch(`/api/dashboard/activities?userId=${userId}`);
        const result = await response.json();
        if (result.success) setActivities(result.data.activities);
      } catch (err: any) {
        setErrors(prev => ({ ...prev, activities: err.message }));
      } finally {
        loadingStates.current.set('activities', false);
        setSecondaryLoading(prev => ({ ...prev, activities: false }));
      }
    });
  }, []);

  const fetchAiInsights = useCallback(async (userId: string) => {
    return requestDeduplication.deduplicate('/api/dashboard/ai-insights', async () => {
      if (loadingStates.current.get('aiInsights')) return;
      try {
        loadingStates.current.set('aiInsights', true);
        setSecondaryLoading(prev => ({ ...prev, aiInsights: true }));
        const response = await authenticatedFetch(`/api/dashboard/ai-insights?userId=${userId}`);
        const result = await response.json();
        if (result.success) setAiInsights(result.data.insights);
      } catch (err: any) {
        setErrors(prev => ({ ...prev, aiInsights: err.message }));
      } finally {
        loadingStates.current.set('aiInsights', false);
        setSecondaryLoading(prev => ({ ...prev, aiInsights: false }));
      }
    });
  }, []);

  const fetchSkillsMarket = useCallback(async (userId: string) => {
    return requestDeduplication.deduplicate('/api/dashboard/skills-market', async () => {
      if (loadingStates.current.get('skillsMarket')) return;
      try {
        loadingStates.current.set('skillsMarket', true);
        setSecondaryLoading(prev => ({ ...prev, skillsMarket: true }));
        const response = await authenticatedFetch(`/api/dashboard/skills-market?userId=${userId}`);
        const result = await response.json();
        if (result.success) setSkillsMarket(result.data);
      } catch (err: any) {
        setErrors(prev => ({ ...prev, skillsMarket: err.message }));
      } finally {
        loadingStates.current.set('skillsMarket', false);
        setSecondaryLoading(prev => ({ ...prev, skillsMarket: false }));
      }
    });
  }, []);

  const fetchSalaryInsights = useCallback(async (userId: string) => {
    return requestDeduplication.deduplicate('/api/dashboard/salary-insights', async () => {
      if (loadingStates.current.get('salaryInsights')) return;
      try {
        loadingStates.current.set('salaryInsights', true);
        setSecondaryLoading(prev => ({ ...prev, salaryInsights: true }));
        const response = await authenticatedFetch(`/api/dashboard/salary-insights?userId=${userId}`);
        const result = await response.json();
        if (result.success) setSalaryInsights(result.data);
      } catch (err: any) {
        setErrors(prev => ({ ...prev, salaryInsights: err.message }));
      } finally {
        loadingStates.current.set('salaryInsights', false);
        setSecondaryLoading(prev => ({ ...prev, salaryInsights: false }));
      }
    });
  }, []);

  const fetchJobRecommendations = useCallback(async (userId: string) => {
    return requestDeduplication.deduplicate('/api/dashboard/job-recommendations', async () => {
      if (loadingStates.current.get('jobRecommendations')) return;
      try {
        loadingStates.current.set('jobRecommendations', true);
        setSecondaryLoading(prev => ({ ...prev, jobRecommendations: true }));
        const response = await authenticatedFetch(`/api/dashboard/job-recommendations?userId=${userId}`);
        const result = await response.json();
        if (result.success) setJobRecommendations(result.data.recommendations);
      } catch (err: any) {
        setErrors(prev => ({ ...prev, jobRecommendations: err.message }));
      } finally {
        loadingStates.current.set('jobRecommendations', false);
        setSecondaryLoading(prev => ({ ...prev, jobRecommendations: false }));
      }
    });
  }, []);

  const refreshCVs = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) {
      await fetchCVs(userId);
    }
  }, [user, fetchCVs]);

  const refreshCoverLetters = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) {
      await fetchCoverLetters(userId);
    }
  }, [user, fetchCoverLetters]);

  const refreshJobs = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) {
      await fetchJobs(userId);
    }
  }, [user, fetchJobs]);

  const refreshAnalytics = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) {
      await fetchAnalytics(userId);
    }
  }, [user, fetchAnalytics]);

  const refreshProfileStrength = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) {
      await fetchProfileStrength(userId);
    }
  }, [user, fetchProfileStrength]);

  const refreshStreak = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) {
      await fetchStreak(userId);
    }
  }, [user, fetchStreak]);

  const refreshGoals = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) {
      await fetchGoals(userId);
    }
  }, [user, fetchGoals]);

  const refreshActivities = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) await fetchActivities(userId);
  }, [user, fetchActivities]);

  const refreshAiInsights = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) await fetchAiInsights(userId);
  }, [user, fetchAiInsights]);

  const refreshSkillsMarket = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) await fetchSkillsMarket(userId);
  }, [user, fetchSkillsMarket]);

  const refreshSalaryInsights = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) await fetchSalaryInsights(userId);
  }, [user, fetchSalaryInsights]);

  const refreshJobRecommendations = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (userId) await fetchJobRecommendations(userId);
  }, [user, fetchJobRecommendations]);

  const refreshAll = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (!userId) return;

    console.log('🔄 DashboardData - Refreshing all data for user:', userId);
    setSecondaryLoading({
      cvs: true,
      coverLetters: true,
      jobs: true,
      analytics: true,
      profileStrength: true,
      streak: true,
      goals: true,
      activities: true,
      aiInsights: true,
      skillsMarket: true,
      salaryInsights: true,
      jobRecommendations: true
    });
    setErrors({});

    const startTime = performance.now();

    // Fetch all secondary data in parallel - request deduplication will handle any overlapping calls
    await Promise.all([
      fetchCVs(userId),
      fetchCoverLetters(userId),
      fetchJobs(userId),
      fetchAnalytics(userId),
      fetchProfileStrength(userId),
      fetchStreak(userId),
      fetchGoals(userId),
      fetchActivities(userId),
      fetchAiInsights(userId),
      fetchSkillsMarket(userId),
      fetchSalaryInsights(userId),
      fetchJobRecommendations(userId)
    ]);

    const duration = Math.round(performance.now() - startTime);
    console.log(`✅ DashboardData - All secondary data loaded in ${duration}ms`);
  }, [user, fetchCVs, fetchCoverLetters, fetchJobs, fetchAnalytics, fetchProfileStrength, fetchStreak, fetchGoals, fetchActivities, fetchAiInsights, fetchSkillsMarket, fetchSalaryInsights, fetchJobRecommendations]);

  // CRITICAL PATH LOADING: Wait for auth, then load secondary data
  useEffect(() => {
    // Wait for authentication to complete
    if (authLoading) {
      setCriticalLoading(true);
      return;
    }

    const userId = getUserIdForAPI(user);

    if (!userId) {
      setCriticalLoading(false);
      return;
    }

    // Critical data is ready (user is authenticated)
    setCriticalLoading(false);

    // Prevent duplicate fetches on tab switch or re-render
    if (hasLoadedRef.current && lastUserIdRef.current === userId) {
      console.log('⏭️ DashboardData - Data already loaded for this user, skipping');
      return;
    }

    // Reset if user changed
    if (lastUserIdRef.current && lastUserIdRef.current !== userId) {
      console.log('🔄 DashboardData - User changed, resetting');
      hasLoadedRef.current = false;
      setCvs([]);
      setCoverLetters([]);
      setJobs([]);
      setAnalytics(null);
      setProfileStrength(0);
      setStreak({
        current: 0,
        longest: 0,
        weeklyGoal: 15,
        applicationsThisWeek: 0
      });
      setGoals({
        monthlyGoal: 20,
        applicationsThisMonth: 0,
        cvsCreatedThisMonth: 0,
        coverLettersCreatedThisMonth: 0
      });
      setActivities([]);
      setAiInsights([]);
      setSkillsMarket(null);
      setSalaryInsights(null);
      setJobRecommendations([]);
      setErrors({});
    }

    // Load secondary data (parallel, after critical data is ready)
    console.log('🔍 DashboardData - Initial load for user:', userId);
    hasLoadedRef.current = true;
    lastUserIdRef.current = userId;

    refreshAll();
  }, [authLoading, user?.id, refreshAll]);

  // Calculate legacy loading state (for backward compatibility)
  const loading = criticalLoading || Object.values(secondaryLoading).some(v => v);

  // Calculate legacy error state (for backward compatibility)
  const error = Object.values(errors).find(e => e) || null;

  // Ready state: true when critical data is loaded
  const isReady = !criticalLoading && !!userId;

  return (
    <DashboardDataContext.Provider
      value={{
        cvs,
        coverLetters,
        jobs,
        analytics,
        profileStrength,
        streak,
        goals,
        activities,
        aiInsights,
        skillsMarket,
        salaryInsights,
        jobRecommendations,
        criticalLoading,
        secondaryLoading,
        loading, // Legacy
        errors,
        error, // Legacy
        isReady,
        refreshCVs,
        refreshCoverLetters,
        refreshJobs,
        refreshAnalytics,
        refreshProfileStrength,
        refreshStreak,
        refreshGoals,
        refreshActivities,
        refreshAiInsights,
        refreshSkillsMarket,
        refreshSalaryInsights,
        refreshJobRecommendations,
        refreshAll
      }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
};

