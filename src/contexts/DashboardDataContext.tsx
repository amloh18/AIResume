'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { requestDeduplication } from '@/lib/utils/requestDeduplication';

interface DashboardDataContextType {
  cvs: any[];
  coverLetters: any[];
  jobs: any[];
  analytics: any;
  // Loading states
  criticalLoading: boolean; // User/subscription data
  secondaryLoading: {
    cvs: boolean;
    coverLetters: boolean;
    jobs: boolean;
    analytics: boolean;
  };
  // Legacy loading for backward compatibility
  loading: boolean;
  // Per-category errors
  errors: {
    cvs?: string | null;
    coverLetters?: string | null;
    jobs?: string | null;
    analytics?: string | null;
  };
  // Legacy error for backward compatibility
  error: string | null;
  // Ready state: true when critical data is loaded
  isReady: boolean;
  refreshCVs: () => Promise<void>;
  refreshCoverLetters: () => Promise<void>;
  refreshJobs: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

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
  
  // Separate loading states for critical vs secondary data
  const [criticalLoading, setCriticalLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState({
    cvs: false,
    coverLetters: false,
    jobs: false,
    analytics: false
  });
  
  const [errors, setErrors] = useState<{
    cvs?: string | null;
    coverLetters?: string | null;
    jobs?: string | null;
    analytics?: string | null;
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
        const response = await authenticatedFetch(endpoint);
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
    const endpoint = `/api/jobs`;
    
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
          console.error('Analytics response is not JSON. Content-Type:', contentType);
          throw new Error('Invalid response format');
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

  const refreshAll = useCallback(async () => {
    const userId = getUserIdForAPI(user);
    if (!userId) return;

    console.log('🔄 DashboardData - Refreshing all data for user:', userId);
    setSecondaryLoading({ cvs: true, coverLetters: true, jobs: true, analytics: true });
    setErrors({});
    
    const startTime = performance.now();
    
    // Fetch all secondary data in parallel - request deduplication will handle any overlapping calls
    await Promise.all([
      fetchCVs(userId),
      fetchCoverLetters(userId),
      fetchJobs(userId),
      fetchAnalytics(userId)
    ]);
    
    const duration = Math.round(performance.now() - startTime);
    console.log(`✅ DashboardData - All secondary data loaded in ${duration}ms`);
  }, [user, fetchCVs, fetchCoverLetters, fetchJobs, fetchAnalytics]);

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
        refreshAll
      }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
};

