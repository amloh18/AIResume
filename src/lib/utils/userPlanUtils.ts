export type PlanKey =
  | 'free'
  | 'starter_monthly'
  | 'starter_yealry'
  | 'focused_monthly'
  | 'focused_yearly'
  | 'smart_quaterly'
  | 'smart_yearly'
  | 'pro_monthly'
  | 'pro_quarterly'
  | 'pro_yearly'
  | 'pro_lifetime';

export const PLAN_NAMES: Record<PlanKey, string> = {
  free: 'Free Plan',
  starter_monthly: 'Starter Monthly',
  starter_yealry: 'Starter Yearly',
  focused_monthly: 'Focused Monthly',
  focused_yearly: 'Focused Yearly',
  smart_quaterly: 'Smart Quarterly',
  smart_yearly: 'Smart Yearly',
  pro_monthly: 'Pro Monthly',
  pro_quarterly: 'Pro Quarterly',
  pro_yearly: 'Pro Yearly',
  pro_lifetime: 'Pro Lifetime'
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

  const proPlans: PlanKey[] = ['focused_monthly', 'focused_yearly', 'smart_quaterly', 'smart_yearly', 'pro_monthly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime'];
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
      return ['focused_yearly', 'smart_quaterly', 'smart_yearly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime'].includes(userPlan?.currentPlanKey || 'free');
    case 'all':
      return true; // All PRO users get all features
    default:
      return false;
  }
}
