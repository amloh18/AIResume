'use client';

import { useCallback, useRef } from 'react';
import { useJobLiveStatusStore, type JobLiveStep } from '@/lib/stores/jobLiveStatusStore';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for managing real-time progress during the job apply flow.
 * Uses inline progress bar in the job card (no overlay).
 *
 * Pipeline stages:
 *   saving → tailoring_cv → tailoring_cover_letter → applying → applied
 */
export function useApplyProgress() {
  const { setStatus, updateStep, clearStatus } = useJobLiveStatusStore();
  const activeJobIdRef = useRef<string | null>(null);

  const startApplyProgress = useCallback(
    (jobTitle: string, company?: string, directJobId?: string) => {
      const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
      activeJobIdRef.current = jobId;

      setStatus(jobId, {
        step: 'saving',
        title: 'Saving Job',
        description: `Saving ${jobTitle} to your tracker...`,
        progress: 10,
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

  const updateToTailoringCV = useCallback(
    (jobTitle: string, company: string, directJobId?: string) => {
      const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
      updateStep(jobId, {
        step: 'tailoring_cv',
        title: 'Tailoring CV',
        description: `Generating tailored CV for ${company}...`,
        progress: 35,
        company,
        jobTitle,
      });
    },
    [updateStep]
  );

  const updateToTailoringCoverLetter = useCallback(
    (jobTitle: string, company: string, directJobId?: string) => {
      const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
      updateStep(jobId, {
        step: 'tailoring_cover_letter',
        title: 'Cover Letter',
        description: `Generating tailored cover letter for ${company}...`,
        progress: 60,
        company,
        jobTitle,
      });
    },
    [updateStep]
  );

  const updateToApplying = useCallback(
    (company: string, directJobId?: string) => {
      const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
      updateStep(jobId, {
        step: 'applying',
        title: 'Submitting',
        description: `Submitting application to ${company}...`,
        progress: 85,
        company,
      });
    },
    [updateStep]
  );

  const completeApply = useCallback(
    (jobTitle: string, company: string, success: boolean, message?: string, directJobId?: string, appStatus?: 'applied' | 'queued' | 'action_required' | 'saved' | 'failed' | 'skipped') => {
      const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
      const isTechnical = Boolean(
        message && /validation failed|enum value|Internal Server Error|E11000/i.test(message)
      );
      const succeeded = success && !isTechnical;

      if (succeeded) {
        let description: string;

        if (appStatus === 'applied') {
          description = message || `Application submitted to ${company} successfully.`;
        } else if (appStatus === 'queued') {
          description = message || `Application queued for automated processing at ${company}.`;
        } else if (appStatus === 'action_required') {
          description = message || `Documents prepared for ${company}. Please review and submit manually.`;
        } else if (appStatus === 'skipped') {
          description = message || `This job was skipped based on your preferences.`;
        } else {
          description = message || `Tailored documents prepared for ${company}.`;
        }

        /*
          The card's pipeline must not claim a stage the request did not reach.

          Every outcome used to be written as `step: 'applied'`, so a job that was
          only *queued for review* rendered the discover card with the "Applied"
          node ticked and a full emerald bar, directly above the message
          "Application queued for review processing". `JobCardProgressBar` maps
          `queued` to the "Applying" node — which is where a queued application
          actually is — so the step has to carry that distinction.
        */
        const stepByOutcome: Record<string, JobLiveStep> = {
          applied: 'applied',
          queued: 'queued',
          action_required: 'queued',
          skipped: 'queued',
          saved: 'queued',
        };

        const titleByOutcome: Record<string, string> = {
          applied: 'Applied',
          queued: 'Queued for review',
          action_required: 'Ready to submit',
          skipped: 'Skipped',
          saved: 'Saved',
        };

        updateStep(jobId, {
          step: stepByOutcome[appStatus ?? ''] ?? 'queued',
          title: titleByOutcome[appStatus ?? ''] ?? 'Complete',
          description,
          progress: 100,
          success: true,
          company,
          jobTitle,
          autoCloseSeconds: 8,
        });
      } else {
        updateStep(jobId, {
          step: 'failed',
          title: 'Failed',
          description: isTechnical
            ? `Could not save this application. Please try again.`
            : message || `Failed to apply. Please try again.`,
          progress: 100,
          success: false,
          company,
          jobTitle,
          autoCloseSeconds: 8,
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

  // Legacy compatibility aliases
  const updateToTailoring = updateToTailoringCV;
  const updateToQueued = updateToApplying;
  const updateToSubmitting = updateToApplying;

  return {
    startApplyProgress,
    setActiveJobId,
    updateToTailoringCV,
    updateToTailoringCoverLetter,
    updateToApplying,
    completeApply,
    cancelProgress,
    // Legacy aliases
    updateToTailoring,
    updateToQueued,
    updateToSubmitting,
  };
}
