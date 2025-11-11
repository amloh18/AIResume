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
  loading: boolean;
  error: string | null;
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
  const { user } = useUnifiedAuth();
  const [cvs, setCvs] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching CVs:', err);
        setError(err.message || 'Failed to fetch CVs');
      } finally {
        loadingStates.current.set('cvs', false);
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
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching cover letters:', err);
        setError(err.message || 'Failed to fetch cover letters');
      } finally {
        loadingStates.current.set('coverLetters', false);
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
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching jobs:', err);
        setError(err.message || 'Failed to fetch jobs');
      } finally {
        loadingStates.current.set('jobs', false);
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
        }
      } catch (err: any) {
        console.error('❌ DashboardData - Error fetching analytics:', err);
        // Analytics is optional, don't set main error
      } finally {
        loadingStates.current.set('analytics', false);
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
    setLoading(true);
    setError(null);
    
    const startTime = performance.now();
    
    // Fetch all in parallel - request deduplication will handle any overlapping calls
    await Promise.all([
      fetchCVs(userId),
      fetchCoverLetters(userId),
      fetchJobs(userId),
      fetchAnalytics(userId)
    ]);
    
    const duration = Math.round(performance.now() - startTime);
    console.log(`✅ DashboardData - All data loaded in ${duration}ms`);
    
    setLoading(false);
  }, [user, fetchCVs, fetchCoverLetters, fetchJobs, fetchAnalytics]);

  // Initial data load
  useEffect(() => {
    const userId = getUserIdForAPI(user);
    
    if (!userId) {
      setLoading(false);
      return;
    }

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
    }

    // Load data
    console.log('🔍 DashboardData - Initial load for user:', userId);
    hasLoadedRef.current = true;
    lastUserIdRef.current = userId;
    
    refreshAll();
  }, [user?.id, refreshAll]);

  return (
    <DashboardDataContext.Provider
      value={{
        cvs,
        coverLetters,
        jobs,
        analytics,
        loading,
        error,
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

