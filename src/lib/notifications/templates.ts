export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';
export type NotificationCategory = 
  | 'application_tracker'
  | 'ats_score'
  | 'cv_document'
  | 'analytics'
  | 'payment'
  | 'system'
  | 'account';

export interface NotificationTemplate {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  priority: NotificationPriority;
  category: NotificationCategory;
  interactive: boolean;
  actionType?: string;
  actionUrl?: string;
  persistent: boolean;
  channels: ('in-app' | 'push' | 'email')[];
  expiryHours?: number;
}

export interface TemplateVariables {
  role?: string;
  company?: string;
  score?: number;
  scoreDelta?: number;
  days?: number;
  count?: number;
  planName?: string;
  amount?: string;
  date?: string;
  streak?: number;
}

export const NOTIFICATION_TEMPLATES = {
  APPLICATION_TRACKER: {
    STAGE_DRAFT_TO_CREATED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Application ready: ${vars.role} at ${vars.company}`,
      message: `Your application for ${vars.role} at ${vars.company} is ready. Next step: generate tailored documents.`,
      type: 'success',
      priority: 'medium',
      category: 'application_tracker',
      interactive: true,
      actionType: 'generate_docs',
      actionUrl: `/applications/${vars.company}`,
      persistent: false,
      channels: ['in-app', 'push'],
      expiryHours: 48,
    }),

    STAGE_CREATED_TO_APPLIED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Application submitted 🎯`,
      message: `You've applied to ${vars.role} at ${vars.company}. We'll track progress and deadlines for you.`,
      type: 'success',
      priority: 'high',
      category: 'application_tracker',
      interactive: true,
      actionType: 'view_timeline',
      actionUrl: `/applications/${vars.company}`,
      persistent: true,
      channels: ['in-app', 'push'],
    }),

    STAGE_APPLIED_TO_INTERVIEW: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Interview stage reached 🚀`,
      message: `Interview stage reached for ${vars.role} at ${vars.company}. Time to prepare and stand out.`,
      type: 'success',
      priority: 'high',
      category: 'application_tracker',
      interactive: true,
      actionType: 'open_interview_coach',
      actionUrl: `/interview-prep/${vars.company}`,
      persistent: true,
      channels: ['in-app', 'push', 'email'],
    }),

    STAGE_INTERVIEW_TO_OFFER: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Offer received 🎉`,
      message: `Offer received for ${vars.role} at ${vars.company}! This is a big milestone. Review details carefully.`,
      type: 'success',
      priority: 'critical',
      category: 'application_tracker',
      interactive: true,
      actionType: 'view_offer',
      actionUrl: `/applications/${vars.company}/offer`,
      persistent: true,
      channels: ['in-app', 'push', 'email'],
    }),

    STAGE_ANY_TO_REJECTED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Update from ${vars.company}`,
      message: `This role didn't move forward, but your progress stays on track.`,
      type: 'info',
      priority: 'medium',
      category: 'application_tracker',
      interactive: true,
      actionType: 'find_similar_roles',
      actionUrl: '/job-search',
      persistent: true,
      channels: ['in-app'],
    }),

    DEADLINE_REMINDER: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Deadline approaching`,
      message: `Deadline approaching for ${vars.role} at ${vars.company}. Due in ${vars.days} day${vars.days !== 1 ? 's' : ''}.`,
      type: 'warning',
      priority: 'high',
      category: 'application_tracker',
      interactive: true,
      actionType: 'view_application',
      actionUrl: `/applications/${vars.company}`,
      persistent: false,
      channels: ['in-app', 'push'],
      expiryHours: 24,
    }),

    NO_ACTIVITY_REMINDER: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Keep momentum going`,
      message: `You haven't updated your applications in ${vars.days} days. Small steps today keep momentum going.`,
      type: 'info',
      priority: 'low',
      category: 'application_tracker',
      interactive: true,
      actionType: 'open_tracker',
      actionUrl: '/applications',
      persistent: false,
      channels: ['in-app'],
      expiryHours: 72,
    }),

    APPLICATION_LIMIT_REACHED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Application tracking limit reached`,
      message: `You've reached your application tracking limit. Upgrade to continue tracking without interruptions.`,
      type: 'warning',
      priority: 'high',
      category: 'application_tracker',
      interactive: true,
      actionType: 'upgrade_plan',
      actionUrl: '/pricing',
      persistent: true,
      channels: ['in-app'],
    }),
  },

  ATS_SCORE: {
    SCORE_GENERATED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `ATS score ready`,
      message: `ATS score ready for ${vars.role} at ${vars.company}. Score: ${vars.score}/100. See what's holding it back.`,
      type: vars.score! >= 70 ? 'success' : vars.score! >= 50 ? 'warning' : 'error',
      priority: 'high',
      category: 'ats_score',
      interactive: true,
      actionType: 'view_ats_analysis',
      actionUrl: `/ats-check/${vars.company}`,
      persistent: true,
      channels: ['in-app', 'push'],
    }),

    SCORE_IMPROVED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Nice work! ✨`,
      message: `Your ATS score improved by +${vars.scoreDelta} points. This CV is now more recruiter-friendly.`,
      type: 'success',
      priority: 'medium',
      category: 'ats_score',
      interactive: true,
      actionType: 'view_changes',
      actionUrl: '/cv-builder',
      persistent: false,
      channels: ['in-app'],
      expiryHours: 48,
    }),

    LOW_ATS_WARNING: (vars: TemplateVariables): NotificationTemplate => ({
      title: `ATS optimization needed`,
      message: `Your CV may struggle with ATS for ${vars.role}. A few fixes could significantly improve visibility.`,
      type: 'warning',
      priority: 'high',
      category: 'ats_score',
      interactive: true,
      actionType: 'fix_now',
      actionUrl: '/ats-optimizer',
      persistent: false,
      channels: ['in-app'],
      expiryHours: 72,
    }),
  },

  CV_DOCUMENT: {
    CV_UPDATED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `CV updated successfully`,
      message: `Your CV changes have been saved.`,
      type: 'success',
      priority: 'low',
      category: 'cv_document',
      interactive: false,
      persistent: false,
      channels: ['in-app'],
      expiryHours: 24,
    }),

    COVER_LETTER_GENERATED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Cover letter ready`,
      message: `Your cover letter for ${vars.role} at ${vars.company} is ready.`,
      type: 'success',
      priority: 'medium',
      category: 'cv_document',
      interactive: true,
      actionType: 'review_letter',
      actionUrl: `/cover-letter/${vars.company}`,
      persistent: false,
      channels: ['in-app'],
      expiryHours: 48,
    }),

    INTERVIEW_PRACTICE_COMPLETED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Interview practice completed`,
      message: `Interview practice session completed. Feedback is available when you're ready.`,
      type: 'success',
      priority: 'medium',
      category: 'cv_document',
      interactive: true,
      actionType: 'view_feedback',
      actionUrl: '/interview-prep',
      persistent: false,
      channels: ['in-app'],
      expiryHours: 72,
    }),
  },

  ANALYTICS: {
    WEEKLY_PROGRESS_SUMMARY: (vars: TemplateVariables): NotificationTemplate => ({
      title: `This week's progress`,
      message: `• ${vars.count} applications created\n• Keep going.`,
      type: 'info',
      priority: 'low',
      category: 'analytics',
      interactive: false,
      persistent: false,
      channels: ['in-app', 'email'],
      expiryHours: 168,
    }),

    LOW_CONVERSION_INSIGHT: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Application insights`,
      message: `Your applications aren't converting as expected. Optimising CV alignment could help.`,
      type: 'info',
      priority: 'medium',
      category: 'analytics',
      interactive: true,
      actionType: 'view_insights',
      actionUrl: '/analytics',
      persistent: false,
      channels: ['in-app'],
      expiryHours: 72,
    }),

    STREAK_NOTIFICATION: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Streak milestone 🔥`,
      message: `You're on a ${vars.streak}-day application streak. Consistency builds results.`,
      type: 'success',
      priority: 'low',
      category: 'analytics',
      interactive: false,
      persistent: false,
      channels: ['in-app'],
      expiryHours: 24,
    }),
  },

  PAYMENT: {
    SUBSCRIPTION_ACTIVATED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Subscription activated`,
      message: `Your ${vars.planName} plan is now active. You have full access to premium features.`,
      type: 'success',
      priority: 'high',
      category: 'payment',
      interactive: false,
      persistent: true,
      channels: ['in-app', 'email'],
    }),

    SUBSCRIPTION_RENEWED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Subscription renewed`,
      message: `Your subscription has been renewed successfully. Next billing date: ${vars.date}.`,
      type: 'success',
      priority: 'low',
      category: 'payment',
      interactive: false,
      persistent: true,
      channels: ['in-app', 'email'],
    }),

    PAYMENT_FAILED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Payment failed`,
      message: `Payment failed for your subscription. Update your payment method to avoid interruption.`,
      type: 'error',
      priority: 'critical',
      category: 'payment',
      interactive: true,
      actionType: 'update_payment',
      actionUrl: '/settings/billing',
      persistent: true,
      channels: ['in-app', 'push', 'email'],
    }),

    SUBSCRIPTION_PAST_DUE: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Subscription past due`,
      message: `Your subscription is past due. Some features may be paused soon.`,
      type: 'warning',
      priority: 'critical',
      category: 'payment',
      interactive: true,
      actionType: 'fix_payment',
      actionUrl: '/settings/billing',
      persistent: true,
      channels: ['in-app', 'push', 'email'],
    }),

    SUBSCRIPTION_CANCELLED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Subscription cancelled`,
      message: `Your subscription has been cancelled. Access remains until ${vars.date}.`,
      type: 'info',
      priority: 'medium',
      category: 'payment',
      interactive: false,
      persistent: true,
      channels: ['in-app', 'email'],
    }),

    REFUND_PROCESSED: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Refund processed`,
      message: `Your refund has been processed successfully. Amount: ${vars.amount}.`,
      type: 'success',
      priority: 'medium',
      category: 'payment',
      interactive: false,
      persistent: true,
      channels: ['in-app', 'email'],
    }),
  },

  SYSTEM: {
    LOGIN_NEW_DEVICE: (vars: TemplateVariables): NotificationTemplate => ({
      title: `New login detected`,
      message: `New login detected from a new device. If this wasn't you, secure your account.`,
      type: 'warning',
      priority: 'high',
      category: 'system',
      interactive: false,
      persistent: true,
      channels: ['in-app', 'email'],
    }),

    MAINTENANCE_NOTIFICATION: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Scheduled maintenance`,
      message: `Scheduled maintenance: ${vars.date}. Some features may be temporarily unavailable.`,
      type: 'info',
      priority: 'medium',
      category: 'system',
      interactive: false,
      persistent: false,
      channels: ['in-app', 'push'],
      expiryHours: 24,
    }),

    SYNC_ERROR: (vars: TemplateVariables): NotificationTemplate => ({
      title: `Sync issue`,
      message: `We couldn't sync some data just now. Retrying automatically.`,
      type: 'warning',
      priority: 'low',
      category: 'system',
      interactive: true,
      actionType: 'retry_now',
      persistent: false,
      channels: ['in-app'],
      expiryHours: 1,
    }),
  },
};

export const getPriorityLevel = (priority: NotificationPriority): number => {
  const levels = { critical: 4, high: 3, medium: 2, low: 1 };
  return levels[priority];
};

export const getExpiryDate = (expiryHours?: number): Date | undefined => {
  if (!expiryHours) return undefined;
  const now = new Date();
  return new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
};

export const shouldShowInChannel = (
  template: NotificationTemplate,
  channel: 'in-app' | 'push' | 'email'
): boolean => {
  return template.channels.includes(channel);
};
