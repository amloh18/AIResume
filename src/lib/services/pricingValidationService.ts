// @ts-nocheck
import { getConnection } from '@/lib/database';
import Coupon from '@/models/Coupon';
import { getAdminPricingPlan } from '@/models/admin-models';
import { countryPricingService } from './countryPricingService';
import { taxService } from './taxService';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: {
    code: string;
    type: 'percentage' | 'fixed' | 'trial';
    value: number;
    id: string;
    description?: string;
  };
  error?: string;
}

export interface PlanValidationResult {
  valid: boolean;
  plan?: any;
  error?: string;
}

export interface PricingValidationResult {
  valid: boolean;
  basePrice: number;
  currency: string;
  currencySymbol: string;
  discountAmount?: number;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  error?: string;
}

export interface TaxRateResult {
  rate: number;
  amount: number;
  currency: string;
}

/**
 * Centralized Pricing Validation Service
 * 
 * Consolidates all payment validation logic including:
 * - Coupon code validation
 * - Plan availability validation
 * - Pricing calculation validation
 * - Tax rate calculation
 */
class PricingValidationService {
  /**
   * Validate a coupon code for a specific plan and user
   */
  async validateCouponCode(
    code: string,
    planKey: string,
    userId?: string
  ): Promise<CouponValidationResult> {
    try {
      await getConnection();

      if (!code || !code.trim()) {
        return {
          valid: false,
          error: 'Coupon code is required'
        };
      }

      const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

      if (!coupon) {
        return {
          valid: false,
          error: 'Invalid coupon code'
        };
      }

      // Check if coupon is active
      if (!coupon.isActive) {
        return {
          valid: false,
          error: 'This coupon is no longer active'
        };
      }

      // Validate coupon using model's validation method
      const validation = coupon.isValid();
      if (!validation.valid) {
        return {
          valid: false,
          error: validation.reason || 'Invalid coupon code'
        };
      }

      // Check if coupon is applicable to the selected plan
      const hasApplicablePlans =
        (coupon.applicablePlans && coupon.applicablePlans.length > 0) ||
        (coupon.applicablePlanKeys && coupon.applicablePlanKeys.length > 0);

      if (hasApplicablePlans) {
        const isApplicable =
          (coupon.applicablePlans && coupon.applicablePlans.includes(planKey)) ||
          (coupon.applicablePlanKeys && coupon.applicablePlanKeys.includes(planKey as any));

        if (!isApplicable) {
          return {
            valid: false,
            error: 'This coupon is not applicable to the selected plan'
          };
        }
      }

      return {
        valid: true,
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.discountValue || 0,
          id: coupon._id.toString(),
          description: coupon.description
        }
      };
    } catch (error: any) {
      console.error('Coupon validation error:', error);
      return {
        valid: false,
        error: error.message || 'Failed to validate coupon code'
      };
    }
  }

  /**
   * Validate plan availability for a specific region
   */
  async validatePlanAvailability(
    planKey: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_lifetime',
    region: string
  ): Promise<PlanValidationResult> {
    try {
      await getConnection();

      const validPlanKeys = ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_lifetime'];
      if (!validPlanKeys.includes(planKey)) {
        return {
          valid: false,
          error: 'Invalid plan key'
        };
      }

      // Get plan from database
      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({
        key: planKey,
        status: 'active'
      });

      if (!plan) {
        return {
          valid: false,
          error: 'Plan not found or inactive'
        };
      }

      // Check if plan is available for the region
      const countryPricing = await countryPricingService.getCountryPricing(region);
      if (!countryPricing) {
        return {
          valid: false,
          error: 'Pricing not available for this region'
        };
      }

      return {
        valid: true,
        plan: {
          id: plan._id.toString(),
          key: plan.key,
          name: plan.name,
          status: plan.status
        }
      };
    } catch (error: any) {
      console.error('Plan validation error:', error);
      return {
        valid: false,
        error: error.message || 'Failed to validate plan availability'
      };
    }
  }

  /**
   * Validate pricing for a plan in a specific region with optional coupon
   */
  async validatePricing(
    planKey: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_lifetime',
    region: string,
    currency: string,
    couponCode?: string,
    interval?: 'monthly' | 'quarterly' | 'yearly' | 'one-time'
  ): Promise<PricingValidationResult> {
    try {
      await getConnection();

      // Validate plan first
      const planValidation = await this.validatePlanAvailability(planKey, region);
      if (!planValidation.valid || !planValidation.plan) {
        return {
          valid: false,
          basePrice: 0,
          currency,
          currencySymbol: currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency,
          error: planValidation.error
        };
      }

      // Get country pricing
      const countryPricing = await countryPricingService.getCountryPricing(region);
      if (!countryPricing) {
        return {
          valid: false,
          basePrice: 0,
          currency,
          currencySymbol: currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency,
          error: 'Pricing not available for this region'
        };
      }

      // Get base price based on plan and interval
      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({ key: planKey, status: 'active' });
      if (!plan) {
        return {
          valid: false,
          basePrice: 0,
          currency,
          currencySymbol: currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency,
          error: 'Plan not found'
        };
      }

      let basePrice = 0;
      if (planKey === 'pro_monthly') {
        basePrice = (plan as any).price_monthly || 0;
      } else if (planKey === 'pro_quarterly') {
        basePrice = (plan as any).price_quarterly || 0;
      } else if (planKey === 'pro_lifetime') {
        basePrice = (plan as any).price_yearly || 0;
      } else if (planKey === 'day_pass') {
        basePrice = (plan as any).price_one_time || 0;
      }

      // Apply regional pricing if available
      const regionalPrice = countryPricingService.getRegionalPriceForPlan(
        countryPricing,
        planKey,
        interval
      );
      if (regionalPrice) {
        basePrice = regionalPrice.price;
      }

      // Validate and apply coupon if provided
      let discountAmount = 0;
      if (couponCode) {
        const couponValidation = await this.validateCouponCode(couponCode, planKey);
        if (couponValidation.valid && couponValidation.coupon) {
          const coupon = couponValidation.coupon;
          if (coupon.type === 'percentage') {
            discountAmount = (basePrice * coupon.value) / 100;
          } else if (coupon.type === 'fixed') {
            discountAmount = coupon.value;
          }
          // Trial coupons don't affect price
          discountAmount = Math.min(discountAmount, basePrice);
        }
      }

      const subtotal = basePrice - discountAmount;

      // Calculate tax
      const taxResult = await this.getApplicableTaxRate(region, planKey, subtotal, currency);
      const taxAmount = taxResult?.amount || 0;
      const total = subtotal + taxAmount;

      return {
        valid: true,
        basePrice,
        currency,
        currencySymbol: currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency,
        discountAmount,
        subtotal,
        taxAmount,
        total
      };
    } catch (error: any) {
      console.error('Pricing validation error:', error);
      return {
        valid: false,
        basePrice: 0,
        currency,
        currencySymbol: currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency,
        error: error.message || 'Failed to validate pricing'
      };
    }
  }

  /**
   * Get applicable tax rate for a region and plan
   */
  async getApplicableTaxRate(
    region: string,
    planKey: string,
    amount: number,
    currency: string
  ): Promise<TaxRateResult | null> {
    try {
      const taxRate = await taxService.getTaxRate(region, planKey);
      if (!taxRate) {
        return null;
      }

      const taxAmount = (amount * taxRate.rate) / 100;

      return {
        rate: taxRate.rate,
        amount: taxAmount,
        currency
      };
    } catch (error: any) {
      console.error('Tax rate calculation error:', error);
      return null;
    }
  }
}

export const pricingValidationService = new PricingValidationService();
export default pricingValidationService;

