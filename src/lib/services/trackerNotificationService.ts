'use client';

import { useCallback } from 'react';
import { useProgressToast } from '@/components/ui/ProgressToaster';

/**
 * Stage change labels for notifications
 */
const STAGE_LABELS: Record<string, string> = {
  saved: 'Saved',
  created: 'Staging',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  accepted: 'Accepted',
  withdrawn: 'Withdrawn',
};

/**
 * Get human-readable stage transition message
 */
function getStageTransitionMessage(fromStatus: string, toStatus: string): string {
  const from = STAGE_LABELS[fromStatus] || fromStatus;
  const to = STAGE_LABELS[toStatus] || toStatus;
  return `${from} → ${to}`;
}

/**
 * Hook for sending tracker-related notifications
 */
export function useTrackerNotifications() {
  const toast = useProgressToast();

  /**
   * Notify when a job moves between tracker stages
   */
  const notifyStageChange = useCallback(
    (jobTitle: string, company: string, fromStatus: string, toStatus: string) => {
      const transition = getStageTransitionMessage(fromStatus, toStatus);

      // Different toast variants based on the target stage
      switch (toStatus) {
        case 'created':
          toast.info(
            'Job Moved to Staging',
            `${jobTitle} at ${company} — ${transition}. Documents are being generated.`,
            { duration: 4000 }
          );
          break;
        case 'applied':
          toast.success(
            'Application Submitted',
            `${jobTitle} at ${company} — ${transition}. Your application has been sent.`,
            { duration: 5000 }
          );
          break;
        case 'screening':
          toast.info(
            'Screening Stage',
            `${jobTitle} at ${company} — ${transition}. You may receive a screening call.`,
            { duration: 4000 }
          );
          break;
        case 'interview':
          toast.success(
            'Interview Scheduled',
            `${jobTitle} at ${company} — ${transition}. Prepare for your interview!`,
            {
              duration: 6000,
              action: {
                label: 'View Details',
                onClick: () => {
                  // Could open interview prep modal
                },
              },
            }
          );
          break;
        case 'offer':
          toast.success(
            'Offer Received!',
            `${jobTitle} at ${company} — Congratulations! You've received an offer.`,
            {
              duration: 10000,
              action: {
                label: 'Review Offer',
                onClick: () => {
                  // Could open offer details
                },
              },
            }
          );
          break;
        case 'rejected':
          toast.warning(
            'Application Declined',
            `${jobTitle} at ${company} — ${transition}. Don't give up, keep applying!`,
            { duration: 6000 }
          );
          break;
        default:
          toast.info(
            'Status Updated',
            `${jobTitle} at ${company} — ${transition}`,
            { duration: 4000 }
          );
      }
    },
    [toast]
  );

  /**
   * Notify when a job is about to expire or is stale
   */
  const notifyJobExpiring = useCallback(
    (jobTitle: string, company: string, daysLeft: number) => {
      if (daysLeft <= 0) {
        toast.error(
          'Job Draft Expired',
          `${jobTitle} at ${company} has expired. Please recreate or update the application.`,
          {
            duration: 8000,
            action: {
              label: 'Recreate',
              onClick: () => {
                // Could trigger recreation flow
              },
            },
          }
        );
      } else if (daysLeft <= 3) {
        toast.warning(
          'Job Draft Expiring Soon',
          `${jobTitle} at ${company} expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Complete your application soon.`,
          {
            duration: 6000,
            action: {
              label: 'Complete Now',
              onClick: () => {
                // Could navigate to editor
              },
            },
          }
        );
      }
    },
    [toast]
  );

  /**
   * Notify about upcoming interviews
   */
  const notifyInterviewReminder = useCallback(
    (jobTitle: string, company: string, interviewDate: Date, reminderType: '24h' | '1h' | 'soon') => {
      const timeLabel = reminderType === '24h' ? 'tomorrow' : reminderType === '1h' ? 'in 1 hour' : 'very soon';

      toast.warning(
        `Interview ${reminderType === '24h' ? 'Tomorrow' : reminderType === '1h' ? 'In 1 Hour' : 'Starting Soon'}`,
        `Your interview for ${jobTitle} at ${company} is ${timeLabel}. Prepare and be ready!`,
        {
          duration: reminderType === 'soon' ? 15000 : 10000,
          action: {
            label: 'Prepare Now',
            onClick: () => {
              // Could open interview prep
            },
          },
        }
      );
    },
    [toast]
  );

  /**
   * Notify when documents are ready for a job
   */
  const notifyDocumentsReady = useCallback(
    (jobTitle: string, company: string) => {
      toast.success(
        'Documents Ready',
        `CV and cover letter for ${jobTitle} at ${company} have been generated.`,
        {
          duration: 5000,
          action: {
            label: 'Apply Now',
            onClick: () => {
              // Could trigger apply flow
            },
          },
        }
      );
    },
    [toast]
  );

  /**
   * Notify when job limit is approaching
   */
  const notifyJobLimit = useCallback(
    (remaining: number, planName: string) => {
      if (remaining <= 3 && remaining > 0) {
        toast.warning(
          'Job Limit Approaching',
          `You have ${remaining} job application${remaining > 1 ? 's' : ''} left on your ${planName} plan.`,
          {
            duration: 6000,
            action: {
              label: 'Upgrade',
              onClick: () => {
                // Could open upgrade modal
              },
            },
          }
        );
      } else if (remaining <= 0) {
        toast.error(
          'Job Limit Reached',
          `You've reached your ${planName} plan limit. Upgrade to continue applying.`,
          {
            duration: 8000,
            action: {
              label: 'Upgrade Now',
              onClick: () => {
                // Could open upgrade modal
              },
            },
          }
        );
      }
    },
    [toast]
  );

  return {
    notifyStageChange,
    notifyJobExpiring,
    notifyInterviewReminder,
    notifyDocumentsReady,
    notifyJobLimit,
  };
}
