export interface TrackerCreatedStagePreview {
  mode: 'tailored' | 'fallback';
  entitlementReasonCode?: 'tailored_available' | 'ai_credits_exhausted' | 'subscription_inactive';
  title: string;
  summary: string;
  supportMessage: string;
  aiCreditsRemaining?: number;
  aiCreditsLimit?: number;
  isTailoredEligible?: boolean;
}

const TRACKER_CREATED_STAGE_MODAL_KEY = 'tracker-created-stage-modal-dismissed';

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function shouldSkipTrackerCreatedStageModalForToday() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(TRACKER_CREATED_STAGE_MODAL_KEY) === getTodayKey();
}

export function dismissTrackerCreatedStageModalForToday() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TRACKER_CREATED_STAGE_MODAL_KEY, getTodayKey());
}
