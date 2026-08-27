'use client';

import { useCallback, useRef } from 'react';
import { useJobLiveStatusStore } from '@/lib/stores/jobLiveStatusStore';

/**
 * Hook for managing real-time progress during the job apply flow.
 * Instead of showing floating corner toasts, it synchronizes state with
 * useJobLiveStatusStore so status cards render inline inside JobCard, Tracker, and Sidebar.
 */
export function useApplyProgress() {
  const { setStatus, updateStep, clearStatus } = useJobLiveStatusStore();
  const activeJobIdRef = useRef<string | null>(null);

  const startApplyProgress = useCallback(
    (jobTitle: string, company?: string, directJobId?: string) => {
      const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
      activeJobIdRef.current = jobId;

      setStatus(jobId, {
        step: 'matching',
        title: 'Matching CV',
        description: `Finding best CV match for ${jobTitle}...`,
        progress: 25,
        company,
        jobTitle,
      });

      return jobId;
    },
    [setStatus]
  );

  const setActiveJobId = useCallback((id: string) => {
    activeJobIdRef.current = id;
  }, []);

  const updateToTailoring = useCallback(
    (jobTitle: string, company: string, directJobId?: string) => {
      const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
      updateStep(jobId, {
        step: 'tailoring',
        title: 'Tailoring Documents',
        description: `Generating tailored CV & cover letter for ${company}...`,
        progress: 60,
        company,
        jobTitle,
      });
    },
    [updateStep]
  );

  const updateToSubmitting = useCallback(
    (company: string, directJobId?: string) => {
      const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
      updateStep(jobId, {
        step: 'submitting',
        title: 'Submitting Application',
        description: `Sending application to ${company}...`,
        progress: 85,
        company,
      });
    },
    [updateStep]
  );

  const completeApply = useCallback(
    (jobTitle: string, company: string, success: boolean, message?: string, directJobId?: string) => {
      const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
      const isTechnical = Boolean(
        message && /validation failed|enum value|Internal Server Error|E11000/i.test(message)
      );
      const succeeded = success && !isTechnical;

      if (succeeded) {
        updateStep(jobId, {
          step: 'submitted',
          title: 'Application Submitted',
          description:
            message && !isTechnical
              ? message
              : `Tailored application prepared for ${company}. Review documents in Studio or complete submission.`,
          progress: 100,
          success: true,
          company,
          jobTitle,
          autoCloseSeconds: 10,
          actions: [
            {
              label: 'Check tracker',
              href: '/dashboard/jobs?tab=applications',
            },
            {
              label: 'Prep for the interview',
              href: '/dashboard/interview',
            },
          ],
        });
      } else {
        updateStep(jobId, {
          step: 'failed',
          title: 'Application Failed',
          description: isTechnical
            ? `Could not save this ${jobTitle} application. Please try again.`
            : message || `Failed to apply to ${jobTitle}. Please try again.`,
          progress: 100,
          success: false,
          company,
          jobTitle,
          autoCloseSeconds: 10,
          actions: [
            {
              label: 'Check tracker',
              href: '/dashboard/jobs?tab=applications',
            },
          ],
        });
      }
    },
    [updateStep]
  );

  const cancelProgress = useCallback((directJobId?: string) => {
    const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
    clearStatus(jobId);
    activeJobIdRef.current = null;
  }, [clearStatus]);

  return {
    startApplyProgress,
    setActiveJobId,
    updateToTailoring,
    updateToSubmitting,
    completeApply,
    cancelProgress,
  };
}
