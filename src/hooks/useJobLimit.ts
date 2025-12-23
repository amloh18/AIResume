import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';

export interface JobLimitInfo {
  currentCount: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  allowed: boolean;
}

export function useJobLimit() {
  const { user } = useUnifiedAuth();
  const [limitInfo, setLimitInfo] = useState<JobLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetch('/api/jobs/limit-check')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch limit');
        return res.json();
      })
      .then(data => {
        setLimitInfo({
          currentCount: data.currentCount,
          limit: data.limit,
          remaining: data.remaining,
          isUnlimited: data.isUnlimited,
          allowed: data.allowed
        });
      })
      .catch(error => {
        console.error('Error fetching job limit:', error);
        setLimitInfo(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.id]);
  
  return { limitInfo, loading };
}

