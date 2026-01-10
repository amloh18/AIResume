'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import creditService from '@/lib/services/creditService';

export interface CreditInfo {
  jobCredits: number;
  limit: number;
  available: boolean;
  creditsRemaining: number;
  lastResetDate?: Date;
  nextResetDate?: Date;
  resetSchedule?: 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'never';
  planKey: string;
}

export interface UseCreditsReturn {
  credits: CreditInfo | null;
  loading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  checkAvailability: (actionType: 'job_create') => Promise<{ available: boolean; creditsRemaining: number; limit: number }>;
  spendCredit: (actionType: 'job_create') => Promise<boolean>;
}

/**
 * Consolidated Credit Hook
 * 
 * Provides a single interface for all credit-related operations:
 * - Fetching credit status
 * - Checking credit availability
 * - Spending credits
 * - Real-time sync with polling
 * 
 * Replaces scattered credit logic across components.
 */
export function useCredits(): UseCreditsReturn {
  const { data: session } = useSession();
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch current credit status from API
   */
  const fetchCredits = useCallback(async () => {
    if (!session?.user?.id) {
      setCredits(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use usage-limits endpoint which includes credit info
      const response = await fetch('/api/user/usage-limits', {
        headers: {
          'If-Modified-Since': lastFetchRef.current > 0 
            ? new Date(lastFetchRef.current).toUTCString() 
            : undefined
        } as any
      });

      if (response.status === 304) {
        // Not modified - no update needed
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }

      const data = await response.json();

      if (data.success) {
        // Extract credit information
        const planKey = data.subscription?.planKey || 'free';
        const creditInfo = data.credits;

        if (creditInfo) {
          setCredits({
            jobCredits: creditInfo.remaining ?? 0,
            limit: creditInfo.limit ?? 0,
            available: creditInfo.remaining > 0 || creditInfo.limit === -1,
            creditsRemaining: creditInfo.remaining ?? 0,
            planKey
          });
        } else {
          // For pro plans, credits are unlimited
          if (['pro_monthly', 'pro_quarterly', 'pro_lifetime'].includes(planKey)) {
            setCredits({
              jobCredits: -1,
              limit: -1,
              available: true,
              creditsRemaining: -1,
              planKey
            });
          } else {
            // Fallback for free/day pass without credit info
            setCredits({
              jobCredits: 0,
              limit: 0,
              available: false,
              creditsRemaining: 0,
              planKey
            });
          }
        }

        lastFetchRef.current = Date.now();
      } else {
        throw new Error(data.error || 'Failed to fetch credits');
      }
    } catch (err: any) {
      console.error('Error fetching credits:', err);
      setError(err.message || 'Failed to fetch credits');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  /**
   * Check if credits are available for an action
   */
  const checkAvailability = useCallback(async (
    actionType: 'job_create'
  ): Promise<{ available: boolean; creditsRemaining: number; limit: number }> => {
    if (!session?.user?.id) {
      return { available: false, creditsRemaining: 0, limit: 0 };
    }

    try {
      // Call credit service directly (server-side)
      const response = await fetch('/api/user/usage-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionType === 'job_create' ? 'job_create' : actionType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check credit availability');
      }

      const data = await response.json();

      if (data.success) {
        return {
          available: data.allowed || false,
          creditsRemaining: data.currentUsage !== undefined 
            ? (data.limit === -1 ? -1 : data.limit - data.currentUsage)
            : 0,
          limit: data.limit ?? 0
        };
      }

      return { available: false, creditsRemaining: 0, limit: 0 };
    } catch (err: any) {
      console.error('Error checking credit availability:', err);
      return { available: false, creditsRemaining: 0, limit: 0 };
    }
  }, [session?.user?.id]);

  /**
   * Spend a credit (triggers refresh after spending)
   */
  const spendCredit = useCallback(async (
    actionType: 'job_create'
  ): Promise<boolean> => {
    if (!session?.user?.id) {
      return false;
    }

    try {
      // Credit spending is handled server-side in job creation API
      // This function is mainly for UI feedback
      // After spending, refresh credits
      await fetchCredits();
      return true;
    } catch (err: any) {
      console.error('Error spending credit:', err);
      return false;
    }
  }, [session?.user?.id, fetchCredits]);

  /**
   * Manual refresh function
   */
  const refreshCredits = useCallback(async () => {
    lastFetchRef.current = 0; // Force refresh
    await fetchCredits();
  }, [fetchCredits]);

  // Initial fetch on mount
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Real-time sync: Poll for updates every 30 seconds when tab is active
  useEffect(() => {
    if (!session?.user?.id) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const isDocumentVisible = () => !document.hidden;
    const POLL_INTERVAL = 30000; // 30 seconds

    const startPolling = () => {
      if (pollIntervalRef.current) return;

      pollIntervalRef.current = setInterval(() => {
        if (isDocumentVisible()) {
          fetchCredits();
        }
      }, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (isDocumentVisible()) {
        startPolling();
        fetchCredits(); // Immediate fetch when tab becomes visible
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.id, fetchCredits]);

  return {
    credits,
    loading,
    error,
    refreshCredits,
    checkAvailability,
    spendCredit
  };
}

