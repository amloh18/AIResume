'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { ApplicationProgress } from '@/lib/applications/live-progress';

/**
 * The one place live application progress is fetched and cached.
 *
 * ⚠️ Why a shared cache rather than per-screen state: the Discover feed, the
 * dashboard Top-matches carousel, the tracker table/kanban and the journey
 * sidebar all show the same applications. When each kept its own copy they
 * disagreed — one said "Generating tailored CV", another said "Submitting",
 * a third said "Apply manually" — because each had fetched at a different
 * moment. One query key means one answer, and one poll means they all advance
 * together.
 *
 * Polling is adaptive: 3 s while any run is actually executing, off otherwise.
 * A parked row (`waiting_user`) does NOT keep the poll alive — nothing will
 * change until the user acts, so polling it would be pure noise. That is also
 * what keeps this cheap on a dashboard with hundreds of cards.
 */

export const APPLICATION_PROGRESS_QUERY_KEY = ['application-progress'] as const;

const RUNNING_POLL_MS = 3_000;

export interface ApplicationProgressResponse {
  success: boolean;
  /** Keyed by JobApplication._id. */
  progress: Record<string, ApplicationProgress>;
  /** Keyed by the external source job id — what Discover/feed listings carry. */
  byJobId: Record<string, ApplicationProgress>;
  activeCount: number;
  runningCount: number;
  updatedAt: string;
}

async function fetchApplicationProgress(): Promise<ApplicationProgressResponse> {
  const response = await fetch('/api/applications/progress', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load application progress');
  }

  return data as ApplicationProgressResponse;
}

/**
 * Invalidate the shared progress cache. Call this right after anything that
 * changes an application's state (enqueue, approve, dismiss, retry, manual
 * status change) so the UI reflects it immediately instead of waiting for the
 * next poll.
 */
export function invalidateApplicationProgress(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: APPLICATION_PROGRESS_QUERY_KEY });
}

export interface ApplicationProgressResult {
  /** Live progress for one application id, if it has any. */
  getForApplication: (applicationId?: string | null) => ApplicationProgress | undefined;
  /** Live progress for one external job id (the Discover/feed key space). */
  getForJob: (jobId?: string | null) => ApplicationProgress | undefined;
  /** Every progress row currently in flight or waiting on the user. */
  active: ApplicationProgress[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useApplicationProgress(): ApplicationProgressResult {
  const query = useQuery<ApplicationProgressResponse>({
    queryKey: APPLICATION_PROGRESS_QUERY_KEY,
    queryFn: fetchApplicationProgress,
    staleTime: 1_000,
    /*
      Adaptive polling. The function form re-evaluates after every fetch, so the
      moment the last run finishes the interval stops by itself — no cleanup
      effect, no dangling timer, and no polling for parked rows.
    */
    refetchInterval: (q) => {
      const running = q.state.data?.runningCount ?? 0;
      return running > 0 ? RUNNING_POLL_MS : false;
    },
    // The dashboard keeps this mounted across tab switches; refetching on every
    // focus would fight the poll rather than help it.
    refetchOnWindowFocus: false,
  });

  const queryClient = useQueryClient();

  /*
    Anything that mutates an application broadcasts `jobUpdated`. Riding that
    event is what makes "enqueue on the Discover card → the tracker row moves"
    instant, without wiring the two screens to each other.
  */
  useEffect(() => {
    const handler = () => invalidateApplicationProgress(queryClient);
    window.addEventListener('jobUpdated', handler as EventListener);
    return () => window.removeEventListener('jobUpdated', handler as EventListener);
  }, [queryClient]);

  const progress = query.data?.progress;
  const byJobId = query.data?.byJobId;

  const getForApplication = useCallback(
    (applicationId?: string | null) => {
      if (!applicationId) return undefined;
      return progress?.[String(applicationId)];
    },
    [progress],
  );

  const getForJob = useCallback(
    (jobId?: string | null) => {
      if (!jobId) return undefined;
      const key = String(jobId);
      // Both key spaces, because a caller holding an application id should not
      // have to know it is not holding a listing id (and vice versa).
      return byJobId?.[key] || progress?.[key];
    },
    [byJobId, progress],
  );

  const active = useMemo(
    () => Object.values(progress || {}).filter((p) => p.isActive),
    [progress],
  );

  return {
    getForApplication,
    getForJob,
    active,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
