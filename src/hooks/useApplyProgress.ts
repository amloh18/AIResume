'use client';

import { useCallback, useRef } from 'react';
import { useProgressToast } from '@/components/ui/ProgressToaster';
import { useMembership } from '@/lib/hooks/useMembership';

/**
 * Hook for showing real-time progress toasts during the job apply flow.
 * Tracks: CV matching → Document tailoring → Application submission → Completion
 * Also shows contextual premium feature promotions after successful apply.
 */
export function useApplyProgress() {
  const toast = useProgressToast();
  const activeToastId = useRef<string | null>(null);
  const { isPaidMember } = useMembership();
  const isPaidUser = isPaidMember;

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
        if (success) {
          // For free/starter users, show a soft premium nudge after success
          const action = !isPaidUser
            ? {
                label: 'Prep for the interview',
                onClick: () => {
                  window.location.href = '/dashboard/interview';
                },
              }
            : undefined;

          toast.updateToast(activeToastId.current, {
            variant: 'success',
            title: 'Application Submitted',
            description: success
              ? (message || `Successfully applied to ${jobTitle} at ${company}`) +
                (!isPaidUser ? ' — Nail the next step with AI Interview Coach.' : '')
              : message || `Failed to apply to ${jobTitle}. Please try again.`,
            progress: 100,
            showTimer: true,
            duration: action ? 8000 : 5000,
            action,
          });
        } else {
          toast.updateToast(activeToastId.current, {
            variant: 'error',
            title: 'Application Failed',
            description: message || `Failed to apply to ${jobTitle}. Please try again.`,
            duration: 8000,
          });
        }
        activeToastId.current = null;
      }
    },
    [toast, isPaidUser]
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
