'use client';

import { useCallback, useRef } from 'react';
import { useJobLiveStatusStore } from '@/lib/stores/jobLiveStatusStore';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for managing real-time progress during the job apply flow.
 * Shows both inline status cards (JobLiveStatusCard) and toast notifications
 * at key pipeline milestones for maximum visibility.
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

      toast({
        title: 'Application started',
        description: `Matching CV for ${company || jobTitle}...`,
        company,
        duration: 3000,
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

      toast({
        title: 'Documents tailoring',
        description: `Generating tailored CV & cover letter for ${company}...`,
        company,
        duration: 4000,
      });
    },
    [updateStep]
  );

  const updateToQueued = useCallback(
    (company: string, mode: string, directJobId?: string) => {
      const jobId = directJobId || activeJobIdRef.current || 'active_apply_job';
      const modeLabel = mode === 'auto' ? 'auto-submit' : mode === 'review' ? 'review' : 'manual';
      updateStep(jobId, {
        step: 'queued',
        title: 'Queued for Processing',
        description: `Application queued for ${modeLabel} processing at ${company}...`,
        progress: 80,
        company,
      });

      toast({
        title: 'Application queued',
        description: `Queued for ${modeLabel} processing at ${company}.`,
        company,
        duration: 4000,
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

      toast({
        title: 'Submitting application',
        description: `Sending application to ${company}...`,
        company,
        duration: 3000,
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
        let title: string;
        let description: string;
        let toastTitle: string;
        let toastDescription: string;

        if (appStatus === 'applied') {
          title = 'Application Submitted';
          description = message || `Application submitted to ${company} successfully.`;
          toastTitle = 'Application submitted';
          toastDescription = message || `Application submitted to ${company}.`;
        } else if (appStatus === 'queued') {
          title = 'Application Queued';
          description = message || `Application queued for automated processing at ${company}. The worker will submit it shortly.`;
          toastTitle = 'Application queued';
          toastDescription = message || `Queued for processing at ${company}.`;
        } else if (appStatus === 'action_required') {
          title = 'Review Required';
          description = message || `Documents prepared for ${company}. Please review and submit manually.`;
          toastTitle = 'Review required';
          toastDescription = message || `Documents ready for ${company}. Review and submit.`;
        } else if (appStatus === 'skipped') {
          title = 'Application Skipped';
          description = message || `This job was skipped based on your preferences.`;
          toastTitle = 'Skipped';
          toastDescription = message || `Job skipped per your preferences.`;
        } else {
          title = 'Documents Ready';
          description = message || `Tailored documents prepared for ${company}. Review or submit.`;
          toastTitle = 'Documents ready';
          toastDescription = message || `Tailored documents prepared for ${company}.`;
        }

        updateStep(jobId, {
          step: 'submitted',
          title,
          description,
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

        toast({
          title: toastTitle,
          description: toastDescription,
          variant: 'success',
          company,
          duration: 6000,
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

        toast({
          title: 'Application failed',
          description: isTechnical
            ? `Could not save this application. Please try again.`
            : message || `Failed to apply to ${jobTitle}. Please try again.`,
          variant: 'destructive',
          company,
          duration: 6000,
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
    updateToQueued,
    updateToSubmitting,
    completeApply,
    cancelProgress,
  };
}
