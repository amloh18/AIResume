import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';

export interface JourneyCVLimitInfo {
  currentActiveCount: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  allowed: boolean;
  canDeleteToMakeSpace?: boolean;
}

export function useJourneyCVLimit() {
  const { user } = useUnifiedAuth();
  const [limitInfo, setLimitInfo] = useState<JourneyCVLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetch('/api/cvs/journey-limit-check')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch limit');
        return res.json();
      })
      .then(data => {
        setLimitInfo({
          currentActiveCount: data.currentActiveCount,
          limit: data.limit,
          remaining: data.remaining,
          isUnlimited: data.isUnlimited,
          allowed: data.allowed,
          canDeleteToMakeSpace: data.canDeleteToMakeSpace
        });
      })
      .catch(error => {
        console.error('Error fetching journey CV limit:', error);
        setLimitInfo(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.id]);
  
  return { limitInfo, loading };
}

