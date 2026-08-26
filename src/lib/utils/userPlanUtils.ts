export type PlanKey =
  | 'free'
  | 'starter_monthly'
  | 'starter_yearly'
  | 'starter_yealry'
  | 'focused_monthly'
  | 'focused_yearly'
  | 'focused_quarterly'
  | 'smart_quarterly'
  | 'smart_quaterly'
  | 'smart_yearly';

export const PLAN_NAMES: Record<PlanKey, string> = {
  free: 'Free (No Subscription)',
  starter_monthly: 'Starter Monthly ($0 Subscription)',
  starter_yearly: 'Starter Yearly ($19.99/yr)',
  starter_yealry: 'Starter Yearly ($19.99/yr)',
  focused_monthly: 'Focused Monthly',
  focused_yearly: 'Focused Yearly',
  focused_quarterly: 'Focused Quarterly',
  smart_quarterly: 'Smart Quarterly',
  smart_quaterly: 'Smart Quarterly',
  smart_yearly: 'Smart Yearly',
};

export interface UserPlan {
  currentPlanKey: PlanKey;
  subscription?: {
    planKey: PlanKey;
    status: 'active' | 'inactive' | 'cancelled' | 'expired';
    currentPeriodEnd?: Date;
  };
}

/**
 * Check if user has access to AI features
 * AI features are available for PRO plans only
 */
export function hasAIAccess(userPlan: UserPlan | null): boolean {
  if (!userPlan) return false;

  const proPlans: PlanKey[] = ['focused_monthly', 'focused_yearly', 'smart_quaterly', 'smart_yearly', 'focused_monthly', 'focused_quarterly', 'focused_yearly', 'focused_yearly'];
  const hasProPlan = proPlans.includes(userPlan.currentPlanKey);

  // Check if subscription is active
  const isActive = userPlan.subscription?.status === 'active';

  // Check if subscription hasn't expired
  const notExpired = !userPlan.subscription?.currentPeriodEnd ||
    new Date() < new Date(userPlan.subscription.currentPeriodEnd);

  return hasProPlan && isActive && notExpired;
}

/**
 * Get the user's current plan name
 */
export function getPlanName(planKey: PlanKey): string {
  return PLAN_NAMES[planKey] || 'Unknown Plan';
}

/**
 * Check if user has access to specific AI features
 */
export function hasSpecificAIAccess(userPlan: UserPlan | null, feature: 'basic' | 'advanced' | 'all'): boolean {
  if (!hasAIAccess(userPlan)) return false;

  switch (feature) {
    case 'basic':
      return true; // All PRO users get basic AI
    case 'advanced':
      // Advanced features for quarterly and yearly plans
      return ['focused_yearly', 'smart_quaterly', 'smart_yearly', 'focused_quarterly', 'focused_yearly', 'focused_yearly'].includes(userPlan?.currentPlanKey || 'free');
    case 'all':
      return true; // All PRO users get all features
    default:
      return false;
  }
}
