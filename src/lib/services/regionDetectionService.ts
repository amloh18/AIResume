import { LocationService, LocationData } from '@/lib/payment/locationService';

export interface RegionInfo {
   countryCode: string;
   countryName: string;
   currency: string;
   currencySymbol: string;
   paymentPartner: 'polar';
 }

// Import currency and payment partner mappings from locationService
// These are used for server-side region detection
const COUNTRY_CURRENCIES: Record<string, { currency: string; symbol: string }> = {
  'IN': { currency: 'INR', symbol: '₹' },
  'US': { currency: 'USD', symbol: '$' },
  'CA': { currency: 'CAD', symbol: '$' },
  'GB': { currency: 'GBP', symbol: '£' },
  'AU': { currency: 'AUD', symbol: '$' },
  'DE': { currency: 'EUR', symbol: '€' },
  'FR': { currency: 'EUR', symbol: '€' },
  'IT': { currency: 'EUR', symbol: '€' },
  'ES': { currency: 'EUR', symbol: '€' },
  'NL': { currency: 'EUR', symbol: '€' },
  'BE': { currency: 'EUR', symbol: '€' },
  'AT': { currency: 'EUR', symbol: '€' },
  'CH': { currency: 'CHF', symbol: 'CHF' },
  'SE': { currency: 'SEK', symbol: 'kr' },
  'NO': { currency: 'NOK', symbol: 'kr' },
  'DK': { currency: 'DKK', symbol: 'kr' },
  'FI': { currency: 'EUR', symbol: '€' },
  'PL': { currency: 'PLN', symbol: 'zł' },
  'CZ': { currency: 'CZK', symbol: 'Kč' },
  'HU': { currency: 'HUF', symbol: 'Ft' },
  'RO': { currency: 'RON', symbol: 'lei' },
  'BG': { currency: 'BGN', symbol: 'лв' },
  'HR': { currency: 'HRK', symbol: 'kn' },
  'SI': { currency: 'EUR', symbol: '€' },
  'SK': { currency: 'EUR', symbol: '€' },
  'LT': { currency: 'EUR', symbol: '€' },
  'LV': { currency: 'EUR', symbol: '€' },
  'EE': { currency: 'EUR', symbol: '€' },
  'IE': { currency: 'EUR', symbol: '€' },
  'PT': { currency: 'EUR', symbol: '€' },
  'GR': { currency: 'EUR', symbol: '€' },
  'CY': { currency: 'EUR', symbol: '€' },
  'MT': { currency: 'EUR', symbol: '€' },
  'LU': { currency: 'EUR', symbol: '€' },
  'IS': { currency: 'ISK', symbol: 'kr' },
  'LI': { currency: 'CHF', symbol: 'CHF' },
  'MC': { currency: 'EUR', symbol: '€' },
  'SM': { currency: 'EUR', symbol: '€' },
  'VA': { currency: 'EUR', symbol: '€' },
  'AD': { currency: 'EUR', symbol: '€' },
  'default': { currency: 'USD', symbol: '$' }
};

const COUNTRY_PAYMENT_PARTNERS: Record<string, 'polar'> = {
  'IN': 'polar',
  'US': 'polar',
  'CA': 'polar',
  'GB': 'polar',
  'AU': 'polar',
  'DE': 'polar',
  'FR': 'polar',
  'IT': 'polar',
  'ES': 'polar',
  'NL': 'polar',
  'BE': 'polar',
  'AT': 'polar',
  'CH': 'polar',
  'SE': 'polar',
  'NO': 'polar',
  'DK': 'polar',
  'FI': 'polar',
  'PL': 'polar',
  'CZ': 'polar',
  'HU': 'polar',
  'RO': 'polar',
  'BG': 'polar',
  'HR': 'polar',
  'SI': 'polar',
  'SK': 'polar',
  'LT': 'polar',
  'LV': 'polar',
  'EE': 'polar',
  'IE': 'polar',
  'PT': 'polar',
  'GR': 'polar',
  'CY': 'polar',
  'MT': 'polar',
  'LU': 'polar',
  'IS': 'polar',
  'LI': 'polar',
  'MC': 'polar',
  'SM': 'polar',
  'VA': 'polar',
  'AD': 'polar',
  'default': 'polar'
};

// Cache for region detection results (in-memory, can be replaced with Redis)
const regionCache = new Map<string, { region: RegionInfo; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Detect user region from IP address
 * Uses IP geolocation services with robust fallback chain
 * Always returns a valid RegionInfo - never throws or returns undefined
 */
export async function detectUserRegion(ip?: string): Promise<RegionInfo> {
  // If IP provided, check cache first
  if (ip) {
    const cached = regionCache.get(ip);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.region;
    }
  }

  // Try multiple detection methods with fallbacks
  const detectionMethods: Array<() => Promise<RegionInfo | null>> = [
    // Method 1: Client-side location service (browser only)
    async () => {
      if (typeof window !== 'undefined') {
        try {
          const locationData = await LocationService.getLocationData();
          if (locationData?.countryCode) {
            return {
              countryCode: locationData.countryCode,
              countryName: locationData.country || getCountryName(locationData.countryCode),
              currency: locationData.currency || getCurrencyForCountry(locationData.countryCode),
              currencySymbol: locationData.currencySymbol || getCurrencySymbolForCountry(locationData.countryCode),
              paymentPartner: locationData.paymentPartner || getPaymentPartnerForCountry(locationData.countryCode)
            };
          }
        } catch (error) {
          console.warn('Client-side location detection failed:', error);
        }
      }
      return null;
    },
    // Method 2: Server-side IP detection
    async () => {
      if (ip) {
        try {
          return await detectRegionFromIP(ip);
        } catch (error) {
          console.warn('IP-based region detection failed:', error);
        }
      }
      return null;
    }
  ];

  // Try each method in sequence
  for (const method of detectionMethods) {
    try {
      const region = await Promise.race([
        method(),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]) as RegionInfo | null;
      
      if (region && region.countryCode) {
        // Validate region data
        if (!region.currency) {
          region.currency = getCurrencyForCountry(region.countryCode);
        }
        if (!region.currencySymbol) {
          region.currencySymbol = getCurrencySymbolForCountry(region.countryCode);
        }
        if (!region.paymentPartner) {
          region.paymentPartner = getPaymentPartnerForCountry(region.countryCode);
        }
        if (!region.countryName) {
          region.countryName = getCountryName(region.countryCode);
        }
        
        // Cache the result
        if (ip) {
          regionCache.set(ip, { region, timestamp: Date.now() });
        }
        return region;
      }
    } catch (error) {
      console.warn('Region detection method failed:', error);
      continue;
    }
  }

  // Final fallback: Return default region (GB/GBP/Stripe - our default pricing)
  // This ensures the system never fails even if all detection methods fail
  const defaultRegion: RegionInfo = {
    countryCode: 'GB', // Use GB as default (matches our defaultCountryPricing)
    countryName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    paymentPartner: 'polar'
  };
  
  // Cache the fallback
  if (ip) {
    regionCache.set(ip, { region: defaultRegion, timestamp: Date.now() });
  }
  
  return defaultRegion;
}

/**
 * Helper to get currency for country code with fallback
 */
function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCIES[countryCode]?.currency || COUNTRY_CURRENCIES['default']?.currency || 'GBP';
}

/**
 * Helper to get currency symbol for country code with fallback
 */
function getCurrencySymbolForCountry(countryCode: string): string {
  return COUNTRY_CURRENCIES[countryCode]?.symbol || COUNTRY_CURRENCIES['default']?.symbol || '£';
}

/**
 * Helper to get payment partner for country code with fallback
 */
function getPaymentPartnerForCountry(countryCode: string): 'polar' {
  return COUNTRY_PAYMENT_PARTNERS[countryCode] || COUNTRY_PAYMENT_PARTNERS['default'] || 'polar';
}

/**
 * Helper to get country name for country code
 */
function getCountryName(countryCode: string): string {
  // Basic mapping - can be expanded
  const countryNames: Record<string, string> = {
    'GB': 'United Kingdom',
    'US': 'United States',
    'IN': 'India',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'AT': 'Austria',
    'CH': 'Switzerland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'RO': 'Romania',
    'BG': 'Bulgaria',
    'HR': 'Croatia',
    'SI': 'Slovenia',
    'SK': 'Slovakia',
    'LT': 'Lithuania',
    'LV': 'Latvia',
    'EE': 'Estonia',
    'IE': 'Ireland',
    'PT': 'Portugal',
    'GR': 'Greece',
    'CY': 'Cyprus',
    'MT': 'Malta',
    'LU': 'Luxembourg',
    'IS': 'Iceland',
    'LI': 'Liechtenstein',
    'MC': 'Monaco',
    'SM': 'San Marino',
    'VA': 'Vatican City',
    'AD': 'Andorra'
  };
  return countryNames[countryCode] || 'Unknown';
}

/**
 * Detect region from IP address using multiple geolocation services
 */
async function detectRegionFromIP(ip: string): Promise<RegionInfo> {
  // Remove port if present
  const cleanIP = ip.split(':')[0];

  // List of IP geolocation services with improved reliability
  const services = [
    {
      url: `https://api.country.is/${cleanIP}`,
      parse: (data: any) => ({
        code: data.country,
        name: data.country, // Limited data but reliable
        currency: 'USD',
        currencySymbol: '$'
      })
    },
    {
      url: `https://ipapi.co/${cleanIP}/json/`,
      parse: (data: any) => ({
        code: data.country_code,
        name: data.country_name,
        currency: data.currency || 'USD',
        currencySymbol: data.currency_symbol || '$'
      })
    },
    // Removed ip-api.com as it requires paid SSL certificate
  ];

  for (const service of services) {
    try {
      const controller = new AbortController();
      // Increased timeout to 5 seconds for better reliability
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(service.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CVCircle/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      const parsed = service.parse(data);

      if (!parsed || !parsed.code || parsed.code.length !== 2) {
        continue;
      }

      const countryCode = parsed.code.toUpperCase();

      // Get currency and payment partner from mappings (server-side safe)
      const currencyInfo = COUNTRY_CURRENCIES[countryCode] || COUNTRY_CURRENCIES.default;
      const paymentPartner = COUNTRY_PAYMENT_PARTNERS[countryCode] || COUNTRY_PAYMENT_PARTNERS.default;

      return {
        countryCode,
        countryName: parsed.name || countryCode,
        currency: currencyInfo.currency,
        currencySymbol: currencyInfo.symbol,
        paymentPartner
      };
    } catch (error) {
      console.warn(`Region detection service ${service.url} failed:`, error);
      continue;
    }
  }

  // If all services fail, use default (GB/GBP/Stripe - matches our defaultCountryPricing)
  // This ensures we always have a valid region that matches our default pricing
  return {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    paymentPartner: 'polar'
  };
}

/**
 * Get pricing for a specific region from CountryPricing collection
 * @deprecated Use getPricingForPlan from countryPricingService instead
 * This function is kept for backward compatibility
 */
export async function getPricingForRegion(
  plan: any,
  region: string
): Promise<{ price: number; currency: string; displayPrice: string; polarPriceId?: string } | null> {
  // Map plan key
  const planKeyMap: Record<string, 'free' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly' | 'pro_lifetime'> = {
    'free': 'free',
    'pro_monthly': 'pro_monthly',
    'pro_quarterly': 'pro_quarterly',
    'pro_yearly': 'pro_yearly',
    'pro_lifetime': 'pro_lifetime'
  };
  
  const planKey = planKeyMap[plan.key] || 'pro_monthly';

  try {
    // Use CountryPricing service
    const { getPricingForPlan } = await import('@/lib/services/countryPricingService');
    const countryPricing = await getPricingForPlan(region, planKey);
    
    if (countryPricing) {
      return {
        price: countryPricing.price,
        currency: countryPricing.currency,
        displayPrice: `${countryPricing.currencySymbol}${countryPricing.price}`,
        polarPriceId: undefined // Would need to get from CountryPricing if needed
      };
    }
  } catch (error) {
    console.error('Error getting pricing for region:', error);
  }
  
  // Fallback: Try to get default CountryPricing for GB (our default)
  try {
    const { getPricingForPlan } = await import('@/lib/services/countryPricingService');
    const defaultPricing = await getPricingForPlan('GB', planKey);
    if (defaultPricing) {
      return {
        price: defaultPricing.price,
        currency: defaultPricing.currency,
        displayPrice: `${defaultPricing.currencySymbol}${defaultPricing.price}`
      };
    }
  } catch (error) {
    console.error('Error getting default pricing:', error);
  }
  
  // Final fallback: Return zero price with GBP currency
  return {
    price: 0,
    currency: 'GBP',
    displayPrice: '£0'
  };
}

/**
 * Clear region cache (useful for testing or manual refresh)
 */
export function clearRegionCache(): void {
  regionCache.clear();
}
