/**
 * Day Pass Service
 * Handles 24h unlimited access, then read-only mode
 */
import { getConnection } from '@/lib/database';
import User from '@/models/User';

export interface DayPassAccess {
  hasAccess: boolean;
  hoursRemaining: number;
  isExpired: boolean;
  isInGracePeriod: boolean;
}

export async function checkDayPassAccess(userId: string): Promise<DayPassAccess> {
  await getConnection();
  
  const user = await User.findById(userId).select('currentPlanKey subscription');
  
  if (user?.currentPlanKey !== 'day_pass') {
    return { hasAccess: false, hoursRemaining: 0, isExpired: false, isInGracePeriod: false };
  }
  
  const expiresAt = user.subscription?.accessExpiresAt;
  if (!expiresAt) {
    return { hasAccess: false, hoursRemaining: 0, isExpired: true, isInGracePeriod: false };
  }
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // EDGE CASE 12: Grace period for active sessions (30 minutes)
  const GRACE_PERIOD_HOURS = 0.5;
  const isInGracePeriod = hoursRemaining < 0 && hoursRemaining > -GRACE_PERIOD_HOURS;
  
  return {
    hasAccess: hoursRemaining > 0 || isInGracePeriod,
    hoursRemaining: Math.max(0, hoursRemaining),
    isExpired: hoursRemaining <= 0 && !isInGracePeriod,
    isInGracePeriod
  };
}

/**
 * Check if Day Pass timing is valid (24h from purchase, not calendar day)
 * EDGE CASE 11: Day Pass lasts exactly 24h from purchase time
 */
export function checkDayPassTiming(purchasedAt: Date): { expiresAt: Date; isExpired: boolean } {
  const expiresAt = new Date(purchasedAt);
  expiresAt.setHours(expiresAt.getHours() + 24);
  return { expiresAt, isExpired: new Date() > expiresAt };
}

