'use client';

import { useCallback, useRef } from 'react';
import { useProgressToast } from '@/components/ui/ProgressToaster';

/**
 * Hook for showing real-time progress toasts during the job apply flow.
 * Tracks: CV matching → Document tailoring → Application submission → Completion
 * Also shows contextual premium feature promotions after successful apply.
 */
export function useApplyProgress() {
  const toast = useProgressToast();
  const activeToastId = useRef<string | null>(null);

  const startApplyProgress = useCallback(
    (jobTitle: string) => {
      // Dismiss any existing progress toast
      if (activeToastId.current) {
        toast.removeToast(activeToastId.current);
      }

      // Step 1: Matching CV
      const id = toast.progress(
        'Matching CV',
        15,
        `Finding best CV match for ${jobTitle}...`,
        { duration: 15000 }
      );
      activeToastId.current = id;
      return id;
    },
    [toast]
  );

  const updateToTailoring = useCallback(
    (jobTitle: string, company: string) => {
      if (activeToastId.current) {
        toast.updateToast(activeToastId.current, {
          title: 'Tailoring Documents',
          description: `Generating tailored CV & cover letter for ${company}...`,
          progress: 45,
        });
      }
    },
    [toast]
  );

  const updateToSubmitting = useCallback(
    (company: string) => {
      if (activeToastId.current) {
        toast.updateToast(activeToastId.current, {
          title: 'Submitting Application',
          description: `Sending application to ${company}...`,
          progress: 80,
        });
      }
    },
    [toast]
  );

  const completeApply = useCallback(
    (jobTitle: string, company: string, success: boolean, message?: string) => {
      if (activeToastId.current) {
        const isTechnical = Boolean(
          message && /validation failed|enum value|Internal Server Error|E11000/i.test(message)
        );
        const succeeded = success && !isTechnical;
        const actions = succeeded
          ? [
              {
                label: 'Check tracker',
                onClick: () => {
                  window.location.href = '/dashboard/jobs?tab=applications';
                },
              },
              {
                label: 'Prep for the interview',
                onClick: () => {
                  window.location.href = '/dashboard/interview';
                },
              },
            ]
          : undefined;

        if (succeeded) {
          toast.updateToast(activeToastId.current, {
            variant: 'success',
            title: 'Application Submitted',
            description:
              message && !isTechnical
                ? message
                : `Successfully applied to ${jobTitle} at ${company}`,
            progress: 100,
            showTimer: true,
            duration: 8000,
            action: undefined,
            actions,
          });
        } else {
          toast.updateToast(activeToastId.current, {
            variant: 'error',
            title: 'Application Failed',
            description: isTechnical
              ? `Could not save this ${jobTitle} application. Please try again.`
              : message || `Failed to apply to ${jobTitle}. Please try again.`,
            duration: 8000,
            showTimer: true,
            action: undefined,
            actions: [
              {
                label: 'Check tracker',
                onClick: () => {
                  window.location.href = '/dashboard/jobs?tab=applications';
                },
              },
            ],
          });
        }
        activeToastId.current = null;
      }
    },
    [toast]
  );

  const cancelProgress = useCallback(() => {
    if (activeToastId.current) {
      toast.removeToast(activeToastId.current);
      activeToastId.current = null;
    }
  }, [toast]);

  return {
    startApplyProgress,
    updateToTailoring,
    updateToSubmitting,
    completeApply,
    cancelProgress,
  };
}
