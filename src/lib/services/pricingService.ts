/**
 * Pricing Service
 * Fetches pricing from database using CountryPricing collection
 * @deprecated Use countryPricingService instead. This is kept for backward compatibility.
 */

import { getCountryPricing } from './countryPricingService';

export interface RegionalPricingData {
  currency: string;
  currencySymbol: string;
  monthly: number;
  quarterly: number;
  yearly: number;
  lifetime: number;
}

/**
 * Get regional pricing for a country code from database
 * @deprecated Use getCountryPricing from countryPricingService instead
 */
export async function getRegionalPricingFromDB(countryCode: string): Promise<RegionalPricingData | null> {
  try {
    const countryPricing = await getCountryPricing(countryCode);
    
    if (!countryPricing) {
      return null;
    }

    return {
      currency: countryPricing.currency,
      currencySymbol: countryPricing.currencySymbol,
      monthly: countryPricing.planPrices?.monthly?.price ?? 0,
      quarterly: countryPricing.planPrices?.quarterly?.price ?? 0,
      yearly: countryPricing.planPrices?.yearly?.price ?? 0,
      lifetime: countryPricing.planPrices?.lifetime?.price ?? 0,
    };
  } catch (error) {
    console.error('Error fetching regional pricing from database:', error);
    return null;
  }
}

/**
 * Get default pricing from database (uses US as default)
 * @deprecated Use getCountryPricing('US') from countryPricingService instead
 */
export async function getDefaultPricingFromDB(): Promise<RegionalPricingData | null> {
  try {
    // Use US as default
    return await getRegionalPricingFromDB('US');
  } catch (error) {
    console.error('Error fetching default pricing from database:', error);
    return null;
  }
}

/**
 * Clear pricing cache (useful for testing or after updates)
 * @deprecated Use clearCountryPricingCache from countryPricingService instead
 */
export function clearPricingCache(): void {
  // Cache is now in countryPricingService
  // This function is kept for backward compatibility
}

