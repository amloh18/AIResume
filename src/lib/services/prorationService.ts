/**
 * Proration Service
 * Calculates prorated charges/credits for mid-cycle plan changes
 */

export interface ProrationCalculationResult {
  proratedAmount: number;
  daysRemaining: number;
  daysInPeriod: number;
  dailyRate: number;
  lineItemDescription: string;
}

/**
 * Calculate prorated amount for mid-cycle upgrade/downgrade
 */
export function calculateProration(
  currentPlanPrice: number,
  newPlanPrice: number,
  currentPeriodStart: Date,
  currentPeriodEnd: Date
): ProrationCalculationResult {
  const now = new Date();
  
  // Calculate days in current billing period
  const periodDuration = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
  const daysInPeriod = Math.ceil(periodDuration / (1000 * 60 * 60 * 24));
  
  // Calculate days remaining in current period
  const remainingDuration = currentPeriodEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(remainingDuration / (1000 * 60 * 60 * 24)));
  
  // Calculate daily rates
  const currentDailyRate = currentPlanPrice / daysInPeriod;
  const newDailyRate = newPlanPrice / daysInPeriod;
  
  // Calculate prorated amount
  // If upgrading: charge the difference for remaining days
  // If downgrading: credit the difference for remaining days
  const priceDifference = newPlanPrice - currentPlanPrice;
  const proratedAmount = (priceDifference / daysInPeriod) * daysRemaining;
  
  const isUpgrade = proratedAmount > 0;
  const lineItemDescription = isUpgrade
    ? `Prorated upgrade charge for ${daysRemaining} remaining days`
    : `Prorated downgrade credit for ${daysRemaining} remaining days`;
  
  return {
    proratedAmount: Math.round(proratedAmount * 100) / 100, // Round to 2 decimal places
    daysRemaining,
    daysInPeriod,
    dailyRate: newDailyRate,
    lineItemDescription
  };
}

/**
 * Calculate prorated credit when downgrading
 */
export function calculateProratedCredit(
  oldPlanPrice: number,
  newPlanPrice: number,
  daysRemaining: number,
  daysInPeriod: number
): number {
  if (oldPlanPrice <= newPlanPrice) {
    return 0; // No credit for upgrade or same price
  }
  
  const priceDifference = oldPlanPrice - newPlanPrice;
  const credit = (priceDifference / daysInPeriod) * daysRemaining;
  
  return Math.round(credit * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate prorated charge when upgrading
 */
export function calculateProratedCharge(
  oldPlanPrice: number,
  newPlanPrice: number,
  daysRemaining: number,
  daysInPeriod: number
): number {
  if (oldPlanPrice >= newPlanPrice) {
    return 0; // No charge for downgrade or same price
  }
  
  const priceDifference = newPlanPrice - oldPlanPrice;
  const charge = (priceDifference / daysInPeriod) * daysRemaining;
  
  return Math.round(charge * 100) / 100; // Round to 2 decimal places
}

