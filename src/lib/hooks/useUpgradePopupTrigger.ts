import { useState, useEffect, useCallback } from 'react';
import { useUnifiedAuth } from './useUnifiedAuth';

interface ActivityStatus {
  hasJourney: boolean;
  hasStandaloneCV: boolean;
  journeyCount: number;
  standaloneCVCount: number;
}

interface UseUpgradePopupTriggerReturn {
  shouldShow: boolean;
  show: () => void;
  dismiss: () => void;
  isChecking: boolean;
}

export function useUpgradePopupTrigger(): UseUpgradePopupTriggerReturn {
  const { user } = useUnifiedAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [activityStatus, setActivityStatus] = useState<ActivityStatus | null>(null);

  // Check if popup was already dismissed
  const checkDismissal = useCallback((userId: string): boolean => {
    if (typeof window === 'undefined') return false;
    
    // Check localStorage for dismissal
    const dismissalKey = `upgradePopupDismissed_${userId}`;
    const dismissed = localStorage.getItem(dismissalKey);
    
    if (dismissed === 'true') {
      return true; // Already dismissed
    }
    
    // Also check for timestamp-based dismissals (old format)
    const keys = Object.keys(localStorage);
    const dismissalKeys = keys.filter(key => key.startsWith(`upgradePopupDismissed_${userId}_`));
    
    return dismissalKeys.length > 0; // If any dismissal key exists, consider it dismissed
  }, []);

  // Fetch user activity status
  const checkActivityStatus = useCallback(async (userId: string) => {
    try {
      setIsChecking(true);
      const response = await fetch(`/api/user/activity-status`);
      const result = await response.json();

      if (result.success && result.data) {
        setActivityStatus(result.data);
        
        // Show popup if user has created at least 1 journey OR 1 standalone CV
        // and hasn't dismissed it
        const hasActivity = result.data.hasJourney || result.data.hasStandaloneCV;
        const isDismissed = checkDismissal(userId);
        
        setShouldShow(hasActivity && !isDismissed);
      } else {
        setShouldShow(false);
      }
    } catch (error) {
      console.error('Error checking activity status:', error);
      setShouldShow(false);
    } finally {
      setIsChecking(false);
    }
  }, [checkDismissal]);

  // Check on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      checkActivityStatus(user.id);
    } else {
      setIsChecking(false);
      setShouldShow(false);
    }
  }, [user?.id, checkActivityStatus]);

  const show = useCallback(() => {
    if (activityStatus && (activityStatus.hasJourney || activityStatus.hasStandaloneCV)) {
      setShouldShow(true);
    }
  }, [activityStatus]);

  const dismiss = useCallback(() => {
    if (user?.id) {
      // Store dismissal in localStorage
      const dismissalKey = `upgradePopupDismissed_${user.id}`;
      localStorage.setItem(dismissalKey, 'true');
      setShouldShow(false);
    }
  }, [user?.id]);

  return {
    shouldShow,
    show,
    dismiss,
    isChecking
  };
}

