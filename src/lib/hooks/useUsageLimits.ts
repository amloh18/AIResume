'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';

export interface UsageLimits {
  cvJourneyCount: number;
  cvCreatedCount: number;
  exportCount: number;
  atsCheckCount: number;
  planLimits: {
    maxCVs: number;
    maxExports: number;
    storageLimit: number;
  };
  dayPassExpiry?: Date;
}

export interface TimeAccessInfo {
  hasAccess: boolean;
  hoursRemaining?: number;
  daysRemaining?: number;
  expiredAt?: Date;
  isInGracePeriod?: boolean;
  gracePeriodEndsAt?: Date;
}

export interface SubscriptionInfo {
  planKey: string;
  status: string;
  accessExpiresAt?: Date;
  currentPeriodEnd?: Date;
  autoRenew?: boolean;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  resetTime?: Date;
}

export function useUsageLimits() {
  const { data: session } = useSession();
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [timeAccess, setTimeAccess] = useState<TimeAccessInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch usage limits
  const fetchUsageLimits = useCallback(async () => {
    if (!session?.user?.email) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/usage-limits');
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Usage limits response is not JSON. Content-Type:', contentType);
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setUsageLimits(data.usage);
        setTimeAccess(data.timeAccess || null);
        setSubscription(data.subscription || null);
      } else {
        setError(data.error || 'Failed to fetch usage limits');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  // Check if a specific action is allowed
  const checkAction = useCallback(async (
    action: 'cv_journey' | 'cv_create' | 'export' | 'ats_check',
    deviceFingerprint?: string
  ): Promise<UsageCheckResult> => {
    if (!session?.user?.email) {
      return {
        allowed: false,
        reason: 'Not authenticated',
        currentUsage: 0,
        limit: 0
      };
    }

    try {
      const response = await fetch('/api/user/usage-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          deviceFingerprint
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Usage check response is not JSON. Content-Type:', contentType);
        return { canProceed: false, reason: 'Invalid response format' };
      }

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          allowed: data.allowed,
          reason: data.reason,
          currentUsage: data.currentUsage,
          limit: data.limit,
          resetTime: data.resetTime ? new Date(data.resetTime) : undefined
        };
      } else {
        return {
          allowed: false,
          reason: data.error || 'Check failed',
          currentUsage: 0,
          limit: 0
        };
      }
    } catch (err) {
      return {
        allowed: false,
        reason: 'Network error',
        currentUsage: 0,
        limit: 0
      };
    }
  }, [session?.user?.email]);

  // Check if user can perform CV journey
  const canPerformCVJourney = useCallback(async (deviceFingerprint?: string): Promise<UsageCheckResult> => {
    return checkAction('cv_journey', deviceFingerprint);
  }, [checkAction]);

  // Check if user can create CV
  const canCreateCV = useCallback(async (deviceFingerprint?: string): Promise<UsageCheckResult> => {
    return checkAction('cv_create', deviceFingerprint);
  }, [checkAction]);

  // Check if user can export
  const canExport = useCallback(async (deviceFingerprint?: string): Promise<UsageCheckResult> => {
    return checkAction('export', deviceFingerprint);
  }, [checkAction]);

  // Check if user can perform ATS check
  const canPerformATSCheck = useCallback(async (deviceFingerprint?: string): Promise<UsageCheckResult> => {
    return checkAction('ats_check', deviceFingerprint);
  }, [checkAction]);

  // Get remaining usage for a specific action
  const getRemainingUsage = useCallback((action: 'cv_journey' | 'cv_create' | 'export' | 'ats_check'): number => {
    if (!usageLimits) return 0;

    let currentUsage: number;
    let limit: number;

    switch (action) {
      case 'cv_journey':
        currentUsage = usageLimits.cvJourneyCount;
        limit = usageLimits.planLimits.maxCVs;
        break;
      case 'cv_create':
        currentUsage = usageLimits.cvCreatedCount;
        limit = usageLimits.planLimits.maxCVs;
        break;
      case 'export':
        currentUsage = usageLimits.exportCount;
        limit = usageLimits.planLimits.maxExports;
        break;
      case 'ats_check':
        currentUsage = usageLimits.atsCheckCount;
        limit = usageLimits.planLimits.maxCVs;
        break;
      default:
        return 0;
    }

    if (limit === -1) return -1; // Unlimited
    return Math.max(0, limit - currentUsage);
  }, [usageLimits]);

  // Check if user has unlimited access
  const hasUnlimitedAccess = useCallback((): boolean => {
    if (!usageLimits) return false;
    return usageLimits.planLimits.maxCVs === -1 && usageLimits.planLimits.maxExports === -1;
  }, [usageLimits]);

  // Check if day pass is expired
  const isDayPassExpired = useCallback((): boolean => {
    if (!usageLimits?.dayPassExpiry) return false;
    return new Date() > usageLimits.dayPassExpiry;
  }, [usageLimits]);

  // Get time until day pass expires
  const getTimeUntilDayPassExpiry = useCallback((): number | null => {
    if (!usageLimits?.dayPassExpiry) return null;
    const now = new Date();
    const expiry = usageLimits.dayPassExpiry;
    return Math.max(0, expiry.getTime() - now.getTime());
  }, [usageLimits]);

  // Calculate time remaining with formatted display
  const timeRemaining = useMemo(() => {
    if (!timeAccess) return null;

    if (timeAccess.hoursRemaining !== undefined) {
      // Day pass: hours remaining
      const hours = Math.floor(timeAccess.hoursRemaining);
      const minutes = Math.floor((timeAccess.hoursRemaining - hours) * 60);
      const isExpiringSoon = hours < 3;

      return {
        hours,
        minutes,
        totalHours: timeAccess.hoursRemaining,
        formatted: hours > 0 
          ? `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
          : `${minutes} minute${minutes !== 1 ? 's' : ''}`,
        isExpiringSoon,
        expiredAt: timeAccess.expiredAt
      };
    } else if (timeAccess.daysRemaining !== undefined) {
      // Pro plans: days remaining
      const days = Math.floor(timeAccess.daysRemaining);
      const hours = Math.floor((timeAccess.daysRemaining - days) * 24);
      const isExpiringSoon = days < 7;

      return {
        days,
        hours,
        totalDays: timeAccess.daysRemaining,
        formatted: days > 0
          ? `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`
          : `${hours} hour${hours !== 1 ? 's' : ''}`,
        isExpiringSoon,
        expiredAt: timeAccess.expiredAt
      };
    }

    return null;
  }, [timeAccess]);

  // Generate device fingerprint (simple implementation)
  const generateDeviceFingerprint = useCallback((): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }, []);

  // Load usage limits on mount
  useEffect(() => {
    fetchUsageLimits();
  }, [fetchUsageLimits]);

  // Real-time credit sync: Poll for updates every 30 seconds when modal/page is active
  useEffect(() => {
    if (!session?.user?.email) return;

    // Only poll when document is visible (tab is active)
    const isDocumentVisible = () => !document.hidden;

    // Polling interval: 30 seconds
    const POLL_INTERVAL = 30000; // 30 seconds

    let pollInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (pollInterval) return; // Already polling

      pollInterval = setInterval(() => {
        // Only fetch if document is visible
        if (isDocumentVisible()) {
          fetchUsageLimits();
        }
      }, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    // Start polling when component mounts
    startPolling();

    // Handle visibility change - pause polling when tab is hidden
    const handleVisibilityChange = () => {
      if (isDocumentVisible()) {
        startPolling();
        // Immediately fetch when tab becomes visible
        fetchUsageLimits();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.email, fetchUsageLimits]);

  return {
    usageLimits,
    timeAccess,
    subscription,
    timeRemaining,
    loading,
    error,
    fetchUsageLimits,
    checkAction,
    canPerformCVJourney,
    canCreateCV,
    canExport,
    canPerformATSCheck,
    getRemainingUsage,
    hasUnlimitedAccess,
    isDayPassExpired,
    getTimeUntilDayPassExpiry,
    generateDeviceFingerprint
  };
}