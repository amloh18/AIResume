/**
 * Price Calculation Service
 * Calculates final price including base price, discounts, and taxes
 */

import { getPricingForPlan } from './countryPricingService';
import { calculateTax } from './taxService';
import { getConnection } from '../database/connection-manager';
import DiscountCode from '@/models/DiscountCode';
import Coupon from '@/models/Coupon';

export interface PriceCalculationResult {
  basePrice: number;
  discountAmount: number;
  subtotal: number; // basePrice - discountAmount
  taxAmount: number;
  totalAmount: number; // subtotal + taxAmount
  currency: string;
  currencySymbol: string;
  breakdown: {
    basePrice: number;
    discountCode?: string;
    discountType?: 'percentage' | 'fixed' | 'trial';
    discountValue?: number;
    discountAmount: number;
    subtotal: number;
    taxRate: number;
    taxType: string;
    taxAmount: number;
    totalAmount: number;
  };
}

/**
 * Calculate final price for a plan with optional discount code
 */
export async function calculateFinalPrice(
  userCountry: string,
  planKey: 'free' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly' | 'pro_lifetime',
  couponCode?: string,
  regionCode?: string
): Promise<PriceCalculationResult | null> {
  try {
    // Step 1: Fetch base price from CountryPricing
    const pricing = await getPricingForPlan(userCountry, planKey);
    
    if (!pricing) {
      console.error(`Pricing not found for country: ${userCountry}, plan: ${planKey}`);
      return null;
    }

    const basePrice = pricing.price;
    let discountAmount = 0;
    let discountCode: string | undefined;
    let discountType: 'percentage' | 'fixed' | 'trial' | undefined;
    let discountValue: number | undefined;

    // Step 2: Validate and apply Discount/Coupon if provided
    if (couponCode) {
      await getConnection();
      
      // Try DiscountCode first
      const discount = await DiscountCode.findOne({
        code: couponCode.toUpperCase(),
        isActive: true
      });

      if (discount && discount.isValid) {
        // Check if discount is applicable to this plan
        const planId = pricing.planId;
        const isApplicable = 
          discount.applicablePlans.length === 0 || 
          discount.applicablePlans.includes(planId);

        if (isApplicable) {
          if (discount.discountType === 'percentage') {
            discountAmount = (basePrice * discount.discountValue) / 100;
          } else {
            discountAmount = discount.discountValue;
          }
          
          // Don't discount more than the base price
          discountAmount = Math.min(discountAmount, basePrice);
          
          discountCode = discount.code;
          discountType = discount.discountType;
          discountValue = discount.discountValue;
        }
      } else {
        // Try Coupon model
        const coupon = await Coupon.findOne({
          code: couponCode.toUpperCase(),
          isActive: true
        });

        if (coupon) {
          const validation = coupon.isValid();
          if (validation.valid) {
            // Check if coupon is applicable to this plan
            const planKeyMap: Record<string, string> = {
              'free': 'free',
              'pro_monthly': 'pro_monthly',
              'pro_quarterly': 'pro_quarterly',
              'pro_yearly': 'pro_yearly',
              'pro_lifetime': 'pro_lifetime'
            };
            
            const applicablePlanKey = planKeyMap[planKey];
            const isApplicable = 
              (coupon.applicablePlans.length === 0 && (!coupon.applicablePlanKeys || coupon.applicablePlanKeys.length === 0)) ||
              coupon.applicablePlans.includes(planKey) ||
              (coupon.applicablePlanKeys && coupon.applicablePlanKeys.includes(applicablePlanKey as any));

            if (isApplicable) {
              if (coupon.type === 'percentage' && coupon.discountValue) {
                discountAmount = (basePrice * coupon.discountValue) / 100;
              } else if (coupon.type === 'fixed' && coupon.discountValue) {
                discountAmount = coupon.discountValue;
              }
              // Trial coupons don't affect price calculation
              
              discountAmount = Math.min(discountAmount, basePrice);
              
              discountCode = coupon.code;
              discountType = coupon.type;
              discountValue = coupon.discountValue;
            }
          }
        }
      }
    }

    // Step 3: Calculate subtotal (base price - discount)
    const subtotal = basePrice - discountAmount;

    // Step 4: Determine tax rate and calculate tax
    const taxResult = await calculateTax(subtotal, userCountry, regionCode);
    
    if (!taxResult) {
      console.error(`Tax calculation failed for country: ${userCountry}`);
      return null;
    }

    const taxAmount = taxResult.amount;

    // Step 5: Calculate final price
    const totalAmount = subtotal + taxAmount;

    return {
      basePrice,
      discountAmount,
      subtotal,
      taxAmount,
      totalAmount,
      currency: pricing.currency,
      currencySymbol: pricing.currencySymbol,
      breakdown: {
        basePrice,
        discountCode,
        discountType,
        discountValue,
        discountAmount,
        subtotal,
        taxRate: taxResult.rate,
        taxType: taxResult.taxType,
        taxAmount,
        totalAmount
      }
    };
  } catch (error) {
    console.error('Error calculating final price:', error);
    return null;
  }
}

