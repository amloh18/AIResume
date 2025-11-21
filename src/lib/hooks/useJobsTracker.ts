'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { CVJourney } from '@/types/cv';

interface JobApplication {
  id: string;
  _id: string;
  userId: string;
  jobTitle: string;
  title?: string;
  company: string;
  status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  jobDescription?: string;
  description?: string;
  location?: string;
  jobUrl?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  type?: string;
  source?: string;
  postedDate?: Date;
  applicationDate?: Date;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  tags?: string[];
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseJobsTrackerOptions {
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useJobsTracker = (options: UseJobsTrackerOptions = {}) => {
  const { userId, autoRefresh = false, refreshInterval = 30000 } = options;
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [journeys, setJourneys] = useState<CVJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef<string>('');

  // Request deduplication
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map());

  const loadData = useCallback(async (requestId?: string) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const currentRequestId = requestId || Math.random().toString(36).substr(2, 9);
    requestIdRef.current = currentRequestId;

    // Check if there's already a pending request
    const requestKey = `jobs-${userId}`;
    if (pendingRequests.current.has(requestKey)) {
      try {
        await pendingRequests.current.get(requestKey);
        return;
      } catch (e) {
        // Request failed, continue with new request
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Create and store the request promise
      const jobsPromise = authenticatedFetchWithUserId('/api/jobs', userId);
      const journeysPromise = authenticatedFetchWithUserId('/api/application-journey', userId, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      pendingRequests.current.set(requestKey, Promise.all([jobsPromise, journeysPromise]));

      const [jobsResponse, journeysResponse] = await Promise.all([jobsPromise, journeysPromise]);

      // Check if this request is still current
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      const jobsResult = await jobsResponse.json();
      const journeysResult = await journeysResponse.json();

      if (jobsResult.success) {
        const transformedJobs = jobsResult.data.jobs.map((job: any) => ({
          id: job.id,
          _id: job.id,
          userId: job.userId,
          jobTitle: job.jobTitle,
          title: job.jobTitle,
          company: job.company,
          status: job.status,
          jobDescription: job.jobDescription,
          description: job.jobDescription,
          location: job.location,
          jobUrl: job.jobUrl,
          salary: job.salary,
          jobType: job.type,
          type: job.type,
          source: job.source,
          sourceUrl: job.sourceUrl,
          postedDate: job.postedDate,
          applicationDate: job.applicationDate,
          deadline: job.deadline,
          priority: job.priority || 'medium',
          notes: job.notes,
          sponsorship: job.sponsorship,
          tags: job.tags || [],
          contactDetails: job.contactDetails || { name: '', email: '', phone: '', role: '' },
          interviews: job.interviews || [],
          followUps: job.followUps || [],
          attachments: job.attachments || [],
          atsScore: job.atsScore,
          isArchived: job.isArchived || false,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        }));
        setJobs(transformedJobs);
      }

      if (journeysResult.success) {
        const loadedJourneys = journeysResult.data.journeys || [];
        setJourneys(loadedJourneys);
      }
    } catch (err) {
      if (requestIdRef.current === currentRequestId) {
        setError(err instanceof Error ? err : new Error('Failed to load data'));
        console.error('Error loading data:', err);
      }
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setLoading(false);
        pendingRequests.current.delete(requestKey);
      }
    }
  }, [userId]);

  // Optimistic update helper
  const updateJobOptimistically = useCallback((jobId: string, updates: Partial<JobApplication>) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId ? { ...job, ...updates } : job
      )
    );
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && userId) {
      const scheduleRefresh = () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          loadData();
          scheduleRefresh();
        }, refreshInterval);
      };

      scheduleRefresh();

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, userId, loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    jobs,
    journeys,
    loading,
    error,
    refresh: loadData,
    updateJobOptimistically,
    setJobs,
    setJourneys
  };
};

