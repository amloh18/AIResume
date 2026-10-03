'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/utils/apiUtils';

export interface BootstrapData {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  profile: {
    completionStatus: 'complete' | 'pending';
    activationRoute: string | null;
    masterCvExists: boolean;
  };
  summary: {
    cvs: number;
    jobs: number;
    applications: {
      total: number;
      saved: number;
      created: number;
      applied: number;
      screening: number;
      interview: number;
      offer: number;
      rejected: number;
      accepted: number;
      withdrawn: number;
    };
    coverLetters: number;
  };
  recentJobs: Array<{
    _id: string;
    jobTitle: string;
    company: string;
    companyLogo?: string;
    location?: string;
    status: string;
    priority: string;
    applicationDate?: string;
    createdAt: string;
  }>;
  recentApplications: Array<{
    _id: string;
    jobTitle: string;
    company: string;
    companyLogo?: string;
    status: string;
    location?: string;
    applicationDate?: string;
    createdAt: string;
  }>;
  _meta: {
    generatedAt: string;
    duration: number;
  };
}

export const BOOTSTRAP_QUERY_KEY = ['dashboard', 'bootstrap'] as const;

async function fetchBootstrapData(): Promise<BootstrapData> {
  const response = await authenticatedFetch('/api/dashboard/bootstrap');
  if (!response.ok) {
    throw new Error(`Bootstrap failed: ${response.status}`);
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Bootstrap request failed');
  }
  return result.data;
}

/**
 * Hook that prefetches dashboard bootstrap data immediately after authentication.
 *
 * This hook should be placed at the earliest possible point in the authenticated
 * layout tree (e.g., ClientLayout). It triggers a fetch as soon as the session
 * is available, populating the TanStack Query cache.
 *
 * The Dashboard page and DashboardDataProvider then consume this cached data
 * without re-fetching, eliminating the waterfall:
 *   Auth -> Prefetch -> Dashboard (from cache)
 *
 * The hook returns the bootstrap data if available, which can be used by
 * DashboardDataContext to skip redundant fetches.
 */
export function useDashboardPrefetch() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  const isAuthenticated = status === 'authenticated' && !!session?.user;

  // Prefetch bootstrap data immediately when auth is available
  useEffect(() => {
    if (!isAuthenticated) return;

    // Prefetch into cache - this starts the fetch immediately
    // If data is already in cache (e.g., from a recent fetch), this is a no-op
    queryClient.prefetchQuery({
      queryKey: BOOTSTRAP_QUERY_KEY,
      queryFn: fetchBootstrapData,
      staleTime: 30 * 1000, // 30 seconds - dashboard data changes relatively quickly
    });
  }, [isAuthenticated, queryClient]);

  // Also provide a direct query for components that want to consume bootstrap data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: fetchBootstrapData,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const prefetchJobs = useCallback(async () => {
    if (!isAuthenticated) return;

    await queryClient.prefetchQuery({
      queryKey: ['jobs', 'list'],
      queryFn: async () => {
        const response = await authenticatedFetch('/api/jobs?limit=all');
        if (!response.ok) throw new Error('Jobs fetch failed');
        const result = await response.json();
        return result.data?.jobs || result.jobs || [];
      },
      staleTime: 30 * 1000,
    });
  }, [isAuthenticated, queryClient]);

  return {
    bootstrapData: data ?? null,
    isLoading,
    isError,
    error,
    prefetchJobs,
  };
}

/**
 * Hook for consuming bootstrap data in dashboard components.
 * Returns the cached bootstrap data without triggering a new fetch.
 * If bootstrap data is not yet available, returns null.
 */
export function useBootstrapData(): BootstrapData | null {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<BootstrapData>(BOOTSTRAP_QUERY_KEY) ?? null;
}

/**
 * Invalidate bootstrap data after mutations that affect dashboard summary.
 */
export function useInvalidateBootstrap() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
  }, [queryClient]);
}
