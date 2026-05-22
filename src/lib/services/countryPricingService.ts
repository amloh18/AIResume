/**
 * Country Pricing Service
 * Fetches country-specific pricing from CountryPricing collection
 */

import { getConnection } from '../database/connection-manager';
import CountryPricing from '@/models/CountryPricing';
import mongoose from 'mongoose';

export interface CountryPricingData {
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  regionId: string;
  planPrices: {
    free: { price: number; planId: string };
    monthly: { price: number; planId: string };
    quarterly: { price: number; planId: string };
    yearly: { price: number; planId: string };
    lifetime: { price: number; planId: string };
  };
  polarPriceIds?: {
    monthly?: string;
    quarterly?: string;
    yearly?: string;
    lifetime?: string;
  };
}

// Cache for country pricing data (in-memory)
const pricingCache = new Map<string, { data: CountryPricingData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get country pricing for a country code
 */
export async function getCountryPricing(countryCode: string): Promise<CountryPricingData | null> {
  try {
    // Check cache first
    const cacheKey = countryCode.toUpperCase();
    const cached = pricingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    await getConnection();

    const countryPricing = await CountryPricing.findOne({
      countryCode: cacheKey
    }).lean<any>();

    if (!countryPricing) {
      console.warn(`Country pricing not found for: ${cacheKey}`);
      return null;
    }

    // Convert to plain object format
    const pricingData: CountryPricingData = {
      countryCode: countryPricing.countryCode,
      countryName: countryPricing.countryName,
      currency: countryPricing.currency,
      currencySymbol: countryPricing.currencySymbol,
      regionId: countryPricing.regionId,
      planPrices: {
        free: {
          price: countryPricing.planPrices.free.price,
          planId: countryPricing.planPrices.free.planId.toString()
        },
        monthly: {
          price: countryPricing.planPrices.monthly.price,
          planId: countryPricing.planPrices.monthly.planId.toString()
        },
        quarterly: {
          price: countryPricing.planPrices.quarterly.price,
          planId: countryPricing.planPrices.quarterly.planId.toString()
        },
        yearly: {
          price: countryPricing.planPrices.yearly.price,
          planId: countryPricing.planPrices.yearly.planId.toString()
        },
        lifetime: {
          price: countryPricing.planPrices.lifetime.price,
          planId: countryPricing.planPrices.lifetime.planId.toString()
        }
      },
      polarPriceIds: countryPricing.polarPriceIds
    };

    // Cache the result
    pricingCache.set(cacheKey, {
      data: pricingData,
      timestamp: Date.now()
    });

    return pricingData;
  } catch (error) {
    console.error('Error fetching country pricing:', error);
    return null;
  }
}

/**
 * Get pricing for a specific plan in a country
 */
export async function getPricingForPlan(
  countryCode: string,
  planKey: 'free' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly' | 'pro_lifetime'
): Promise<{ price: number; currency: string; currencySymbol: string; planId: string } | null> {
  try {
    let countryPricing = await getCountryPricing(countryCode);
    
    // For non-India countries, if pricing not found, fallback to GB (Polar-compatible)
    // This ensures Polar works for all eligible countries
    if (!countryPricing && countryCode !== 'IN') {
      console.log('No pricing found for non-India country, falling back to GB (Polar-compatible):', {
        countryCode,
        planKey,
        fallbackTo: 'GB'
      });
      countryPricing = await getCountryPricing('GB');
    }
    
    if (!countryPricing) {
      return null;
    }

    // Map planKey to planPrices key
    const planKeyMap: Record<string, keyof typeof countryPricing.planPrices> = {
      'free': 'free',
      'pro_monthly': 'monthly',
      'pro_quarterly': 'quarterly',
      'pro_yearly': 'yearly',
      'pro_lifetime': 'lifetime'
    };

    const planPricesKey = planKeyMap[planKey];
    if (!planPricesKey) {
      return null;
    }

    const planPrice = countryPricing.planPrices[planPricesKey];

    return {
      price: planPrice.price,
      currency: countryPricing.currency,
      currencySymbol: countryPricing.currencySymbol,
      planId: planPrice.planId
    };
  } catch (error) {
    console.error('Error getting pricing for plan:', error);
    return null;
  }
}

/**
 * Get CountryPricing by ObjectId
 * Useful when you have a reference from PricingPlan.defaultCountryPricingId
 */
export async function getCountryPricingById(
  countryPricingId: string | mongoose.Types.ObjectId
): Promise<CountryPricingData | null> {
  try {
    await getConnection();
    
    const countryPricing = await CountryPricing.findById(countryPricingId).lean<any>();
    
    if (!countryPricing) {
      console.warn(`Country pricing not found for ID: ${countryPricingId}`);
      return null;
    }
    
    // Convert to plain object format
    const pricingData: CountryPricingData = {
      countryCode: countryPricing.countryCode,
      countryName: countryPricing.countryName,
      currency: countryPricing.currency,
      currencySymbol: countryPricing.currencySymbol,
      regionId: countryPricing.regionId,
      planPrices: {
        free: {
          price: countryPricing.planPrices.free.price,
          planId: countryPricing.planPrices.free.planId.toString()
        },
        monthly: {
          price: countryPricing.planPrices.monthly.price,
          planId: countryPricing.planPrices.monthly.planId.toString()
        },
        quarterly: {
          price: countryPricing.planPrices.quarterly.price,
          planId: countryPricing.planPrices.quarterly.planId.toString()
        },
        yearly: {
          price: countryPricing.planPrices.yearly.price,
          planId: countryPricing.planPrices.yearly.planId.toString()
        },
        lifetime: {
          price: countryPricing.planPrices.lifetime.price,
          planId: countryPricing.planPrices.lifetime.planId.toString()
        }
      },
      polarPriceIds: countryPricing.polarPriceIds
    };
    
    return pricingData;
  } catch (error) {
    console.error('Error fetching country pricing by ID:', error);
    return null;
  }
}

/**
 * Get all country pricing records
 */
export async function getAllCountryPricing(): Promise<CountryPricingData[]> {
  try {
    await getConnection();

    const allPricing = await CountryPricing.find({}).lean<any[]>();

    return allPricing.map(cp => ({
      countryCode: cp.countryCode,
      countryName: cp.countryName,
      currency: cp.currency,
      currencySymbol: cp.currencySymbol,
      regionId: cp.regionId,
      planPrices: {
        free: {
          price: cp.planPrices.free.price,
          planId: cp.planPrices.free.planId.toString()
        },
        monthly: {
          price: cp.planPrices.monthly.price,
          planId: cp.planPrices.monthly.planId.toString()
        },
        quarterly: {
          price: cp.planPrices.quarterly.price,
          planId: cp.planPrices.quarterly.planId.toString()
        },
        yearly: {
          price: cp.planPrices.yearly.price,
          planId: cp.planPrices.yearly.planId.toString()
        },
        lifetime: {
          price: cp.planPrices.lifetime.price,
          planId: cp.planPrices.lifetime.planId.toString()
        }
      },
      polarPriceIds: cp.polarPriceIds
    }));
  } catch (error) {
    console.error('Error fetching all country pricing:', error);
    return [];
  }
}

/**
 * Clear pricing cache (useful for testing or after updates)
 */
export function clearCountryPricingCache(): void {
  pricingCache.clear();
}
