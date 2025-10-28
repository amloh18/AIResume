import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';

export interface JobInsights {
  keywordMatchScore: number;
  companyHiringTrend: string;
  skillsGap: string;
  marketCompetitiveness: string;
  salaryInsights: {
    averageRange: {
      min: number;
      max: number;
    };
    sampleSize: number;
    currency: string;
  } | null;
  lastAnalyzed: string;
}

export interface JobInsightsResponse {
  success: boolean;
  data?: {
    insights: JobInsights;
    jobId: string;
    lastUpdated: string;
  };
  error?: string;
}

/**
 * Hook to fetch job insights dynamically
 */
export function useJobInsights(jobId: string | null) {
  const { user } = useUnifiedAuth();
  const [insights, setInsights] = useState<JobInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !user?.id) {
      setInsights(null);
      return;
    }

    const fetchInsights = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await authenticatedFetchWithUserId(
          `/api/jobs/${jobId}/insights`,
          user.id
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch insights: ${response.status}`);
        }

        const result: JobInsightsResponse = await response.json();

        if (result.success && result.data) {
          setInsights(result.data.insights);
        } else {
          throw new Error(result.error || 'Failed to fetch insights');
        }
      } catch (err) {
        console.error('Error fetching job insights:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Set fallback insights on error
        setInsights({
          keywordMatchScore: 0,
          companyHiringTrend: 'Unknown',
          skillsGap: 'Unable to analyze',
          marketCompetitiveness: 'Unknown',
          salaryInsights: null,
          lastAnalyzed: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [jobId, user?.id]);

  return { insights, loading, error };
}

/**
 * Hook to get dynamic fallback values for job data
 */
export function useJobFallbacks() {
  const [fallbacks, setFallbacks] = useState({
    defaultLocation: 'Location not specified',
    defaultApplicationDate: 'Not specified',
    defaultJobUrl: 'No URL provided',
    defaultDeadline: 'No deadline set',
    defaultSalary: 'Salary not specified',
    defaultContactName: 'Not specified',
    defaultContactEmail: 'No email provided',
    defaultJobDescription: 'No job description provided yet.'
  });

  useEffect(() => {
    // These could be fetched from user preferences or company settings
    // For now, we'll use generic fallbacks
    setFallbacks({
      defaultLocation: 'Location not specified',
      defaultApplicationDate: 'Not specified',
      defaultJobUrl: 'No URL provided',
      defaultDeadline: 'No deadline set',
      defaultSalary: 'Salary not specified',
      defaultContactName: 'Not specified',
      defaultContactEmail: 'No email provided',
      defaultJobDescription: 'No job description provided yet.'
    });
  }, []);

  return fallbacks;
}

/**
 * Format date for display with fallback
 */
export function formatJobDate(date: string | Date | undefined, fallback: string = 'Not specified'): string {
  if (!date) return fallback;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return fallback;
  }
}

/**
 * Format salary for display with fallback
 */
export function formatJobSalary(salary: any, fallback: string = 'Salary not specified'): string {
  if (!salary) return fallback;
  
  try {
    const { min, max, currency = '$', period = 'yearly' } = salary;
    
    if (min && max) {
      return `${currency}${min.toLocaleString()} - ${max.toLocaleString()} ${period}`;
    } else if (min) {
      return `${currency}${min.toLocaleString()}+ ${period}`;
    } else if (max) {
      return `Up to ${currency}${max.toLocaleString()} ${period}`;
    }
    
    return fallback;
  } catch (error) {
    console.error('Error formatting salary:', error);
    return fallback;
  }
}

/**
 * Format job URL for display with fallback
 */
export function formatJobUrl(url: string | undefined, fallback: string = 'No URL provided'): string {
  if (!url) return fallback;
  
  try {
    // Truncate long URLs for display
    if (url.length > 30) {
      return url.substring(0, 30) + '...';
    }
    return url;
  } catch (error) {
    console.error('Error formatting URL:', error);
    return fallback;
  }
}
