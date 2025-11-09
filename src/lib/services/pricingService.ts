/**
 * Pricing Service
 * Fetches pricing from database using PriceRegions and CountryMappings
 */

import { getConnection } from '../database/connection-manager';
import PriceRegion from '@/models/PriceRegion';
import CountryMapping from '@/models/CountryMapping';

export interface RegionalPricingData {
  currency: string;
  currencySymbol: string;
  dayPass: number;
  monthly: number;
  quarterly: number;
  yearly: number;
}

// Cache for pricing data (in-memory)
const pricingCache = new Map<string, { data: RegionalPricingData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get regional pricing for a country code from database
 */
export async function getRegionalPricingFromDB(countryCode: string): Promise<RegionalPricingData | null> {
  try {
    // Check cache first
    const cached = pricingCache.get(countryCode);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    await getConnection();

    // Step 1: Find country mapping
    const mapping = await CountryMapping.findOne({ 
      countryCode: countryCode.toUpperCase() 
    });

    let regionId: string;

    if (mapping) {
      regionId = mapping.regionId;
    } else {
      // Fallback to default region
      const defaultRegion = await PriceRegion.findOne({ isDefault: true });
      if (!defaultRegion) {
        console.error('No default pricing region found in database');
        return null;
      }
      regionId = defaultRegion.regionId;
    }

    // Step 2: Get price region
    const priceRegion = await PriceRegion.findOne({ regionId });
    
    if (!priceRegion) {
      console.error(`Price region not found: ${regionId}`);
      return null;
    }

    const pricingData: RegionalPricingData = {
      currency: priceRegion.currency,
      currencySymbol: priceRegion.currencySymbol,
      dayPass: priceRegion.plans.dayPass,
      monthly: priceRegion.plans.monthly,
      quarterly: priceRegion.plans.quarterly,
      yearly: priceRegion.plans.yearly,
    };

    // Cache the result
    pricingCache.set(countryCode.toUpperCase(), {
      data: pricingData,
      timestamp: Date.now(),
    });

    return pricingData;
  } catch (error) {
    console.error('Error fetching regional pricing from database:', error);
    return null;
  }
}

/**
 * Get default pricing from database
 */
export async function getDefaultPricingFromDB(): Promise<RegionalPricingData | null> {
  try {
    await getConnection();
    
    const defaultRegion = await PriceRegion.findOne({ isDefault: true });
    
    if (!defaultRegion) {
      console.error('No default pricing region found in database');
      return null;
    }

    return {
      currency: defaultRegion.currency,
      currencySymbol: defaultRegion.currencySymbol,
      dayPass: defaultRegion.plans.dayPass,
      monthly: defaultRegion.plans.monthly,
      quarterly: defaultRegion.plans.quarterly,
      yearly: defaultRegion.plans.yearly,
    };
  } catch (error) {
    console.error('Error fetching default pricing from database:', error);
    return null;
  }
}

/**
 * Clear pricing cache (useful for testing or after updates)
 */
export function clearPricingCache(): void {
  pricingCache.clear();
}

