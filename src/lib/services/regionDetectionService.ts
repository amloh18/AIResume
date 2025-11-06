import { LocationService, LocationData } from '@/lib/payment/locationService';

export interface RegionInfo {
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  paymentPartner: 'stripe' | 'razorpay';
}

// Cache for region detection results (in-memory, can be replaced with Redis)
const regionCache = new Map<string, { region: RegionInfo; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Detect user region from IP address
 * Uses IP geolocation services with fallback chain
 */
export async function detectUserRegion(ip?: string): Promise<RegionInfo> {
  // If IP provided, check cache first
  if (ip) {
    const cached = regionCache.get(ip);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.region;
    }
  }

  try {
    // Try client-side location service first (works in browser)
    if (typeof window !== 'undefined') {
      const locationData = await LocationService.getLocationData();
      const region: RegionInfo = {
        countryCode: locationData.countryCode,
        countryName: locationData.country || 'Unknown',
        currency: locationData.currency,
        currencySymbol: locationData.currencySymbol,
        paymentPartner: locationData.paymentPartner
      };
      
      if (ip) {
        regionCache.set(ip, { region, timestamp: Date.now() });
      }
      return region;
    }

    // Server-side IP detection
    if (ip) {
      const region = await detectRegionFromIP(ip);
      regionCache.set(ip, { region, timestamp: Date.now() });
      return region;
    }
  } catch (error) {
    console.error('Error detecting region:', error);
  }

  // Fallback to default (US/Stripe)
  return {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    paymentPartner: 'stripe'
  };
}

/**
 * Detect region from IP address using multiple geolocation services
 */
async function detectRegionFromIP(ip: string): Promise<RegionInfo> {
  // Remove port if present
  const cleanIP = ip.split(':')[0];
  
  // List of IP geolocation services (free tier)
  const services = [
    {
      url: `https://ipapi.co/${cleanIP}/json/`,
      parse: (data: any) => ({
        code: data.country_code,
        name: data.country_name,
        currency: data.currency || 'USD',
        currencySymbol: data.currency_symbol || '$'
      })
    },
    {
      url: `https://ip-api.com/json/${cleanIP}`,
      parse: (data: any) => ({
        code: data.countryCode,
        name: data.country,
        currency: 'USD', // ip-api.com doesn't provide currency, use default
        currencySymbol: '$'
      })
    },
    {
      url: `https://api.country.is/${cleanIP}`,
      parse: (data: any) => ({
        code: data.country,
        name: data.country, // country.is doesn't provide name
        currency: 'USD',
        currencySymbol: '$'
      })
    }
  ];

  for (const service of services) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(service.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
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
      
      // Get currency and payment partner from LocationService
      const locationData = await LocationService.getLocationData();
      const currencyInfo = locationData.currency || parsed.currency || 'USD';
      const paymentPartner = locationData.paymentPartner || (currencyInfo === 'INR' ? 'razorpay' : 'stripe');

      return {
        countryCode,
        countryName: parsed.name || countryCode,
        currency: currencyInfo,
        currencySymbol: locationData.currencySymbol || parsed.currencySymbol || '$',
        paymentPartner
      };
    } catch (error) {
      console.warn(`Region detection service ${service.url} failed:`, error);
      continue;
    }
  }

  // Default fallback
  return {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    paymentPartner: 'stripe'
  };
}

/**
 * Get pricing for a specific region from a plan
 */
export function getPricingForRegion(
  plan: any,
  region: string
): { price: number; currency: string; displayPrice: string; stripePriceId?: string; razorpayPlanId?: string } | null {
  if (!plan.regionalPricing || !Array.isArray(plan.regionalPricing)) {
    // Fallback to default pricing
    return {
      price: plan.price_monthly || plan.price_quarterly || plan.price_yearly || plan.price_one_time || 0,
      currency: plan.currency || 'USD',
      displayPrice: `${plan.currency || 'USD'} ${plan.price_monthly || plan.price_quarterly || plan.price_yearly || plan.price_one_time || 0}`
    };
  }

  // Find region-specific pricing
  const regionalPrice = plan.regionalPricing.find((p: any) => p.region === region);
  
  if (regionalPrice) {
    return {
      price: regionalPrice.price,
      currency: regionalPrice.currency,
      displayPrice: regionalPrice.displayPrice,
      stripePriceId: regionalPrice.stripePriceId,
      razorpayPlanId: regionalPrice.razorpayPlanId
    };
  }

  // Try to find default region pricing
  const defaultPrice = plan.regionalPricing.find((p: any) => p.region === 'default' || p.region === 'US');
  
  if (defaultPrice) {
    return {
      price: defaultPrice.price,
      currency: defaultPrice.currency,
      displayPrice: defaultPrice.displayPrice,
      stripePriceId: defaultPrice.stripePriceId,
      razorpayPlanId: defaultPrice.razorpayPlanId
    };
  }

  // Final fallback
  return {
    price: plan.price_monthly || plan.price_quarterly || plan.price_yearly || plan.price_one_time || 0,
    currency: plan.currency || 'USD',
    displayPrice: `${plan.currency || 'USD'} ${plan.price_monthly || plan.price_quarterly || plan.price_yearly || plan.price_one_time || 0}`
  };
}

/**
 * Clear region cache (useful for testing or manual refresh)
 */
export function clearRegionCache(): void {
  regionCache.clear();
}

