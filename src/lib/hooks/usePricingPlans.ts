'use client';

import { useState, useEffect } from 'react';
import { LocationService, LocationData, PricingData } from '@/lib/payment/locationService';

// RegionalPricing interface (matches database format)
export interface RegionalPricing {
  currency: string;
  currencySymbol: string;
  dayPass: string;
  monthly: string;
  quarterly: string;
  yearly: string;
}

export interface DatabasePricingPlan {
  _id: string;
  key: string;
  name: string;
  description: string;
  price_monthly?: number;
  price_quarterly?: number;
  price_yearly?: number;
  price_one_time?: number;
  currency: string;
  features: string[];
  notIncludedFeatures: string[];
  isPopular: boolean;
  isBestValue: boolean;
  displayOnLanding: boolean;
  targetAudience: string;
  status?: string;
  // Promotional pricing
  promotionalPrice_monthly?: number;
  promotionalPrice_quarterly?: number;
  promotionalPrice_yearly?: number;
  promotionalPrice_one_time?: number;
  promotionValidFrom?: string;
  promotionValidUntil?: string;
  promotionDescription?: string;
  isPromotionActive?: boolean;
  effectivePrice?: {
    monthly?: number;
    quarterly?: number;
    yearly?: number;
    oneTime?: number;
  };
}

interface UsePricingPlansOptions {
  publicOnly?: boolean; // For landing page - only show plans with displayOnLanding=true
  excludeFree?: boolean; // For settings page - exclude free plan
  includeInactive?: boolean; // For admin panel - include inactive plans
}

interface UsePricingPlansResult {
  plans: DatabasePricingPlan[];
  promotionalOffers: any[];
  locationData: LocationData | null;
  regionalPricing: RegionalPricing | null;
  selectedCurrency: string;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  // Helper functions
  getRegionalPrice: (plan: DatabasePricingPlan) => string;
  getMonthlyEquivalent: (plan: DatabasePricingPlan) => { price: string; showMonthly: boolean };
  getCurrencySymbol: () => string;
  getEffectivePrice: (plan: DatabasePricingPlan) => number;
  hasPromotionalPricing: (plan: DatabasePricingPlan) => boolean;
}

// Simple cache for pricing data to prevent duplicate API calls across components
interface PricingCacheEntry {
  plans: DatabasePricingPlan[];
  promotionalOffers: any[];
  timestamp: number;
}

// Cache with TTL (Time To Live) of 5 minutes
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const pricingCache = new Map<string, PricingCacheEntry>();

// Generate cache key from options
function getCacheKey(options: UsePricingPlansOptions): string {
  return JSON.stringify({
    publicOnly: options.publicOnly || false,
    excludeFree: options.excludeFree || false,
    includeInactive: options.includeInactive || false,
  });
}

// Check if cache entry is still valid
function isCacheValid(entry: PricingCacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

export function usePricingPlans(options: UsePricingPlansOptions = {}): UsePricingPlansResult {
  const [plans, setPlans] = useState<DatabasePricingPlan[]>([]);
  const [promotionalOffers, setPromotionalOffers] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [regionalPricing, setRegionalPricing] = useState<RegionalPricing | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GBP');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch location and set regional pricing from database
  useEffect(() => {
    const detectLocation = async () => {
      // Add timeout to prevent blocking
      const timeoutId = setTimeout(() => {
        console.warn('Location detection timeout, using default pricing');
        // Fetch default pricing if location detection takes too long
        fetch('/api/pricing/regional')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.success && data.pricing) {
              setRegionalPricing(data.pricing);
              setSelectedCurrency(data.pricing.currency);
            }
          })
          .catch(err => console.error('Error fetching default pricing after timeout:', err));
      }, 5000); // 5 second timeout

      try {
        console.log('Detecting user location...');
        const location = await Promise.race([
          LocationService.getLocationData(),
          new Promise<LocationData>((_, reject) =>
            setTimeout(() => reject(new Error('Location detection timeout')), 4000)
          )
        ]);

        clearTimeout(timeoutId);
        console.log('Location detected:', location);

        setLocationData(location);
        setSelectedCurrency(location.currency);

        // Get regional pricing from database API
        let pricingSet = false;
        let pricingTimeoutId: NodeJS.Timeout | null = null;
        try {
          const controller = new AbortController();
          pricingTimeoutId = setTimeout(() => controller.abort(), 3000);
          const response = await fetch(`/api/pricing/regional?countryCode=${location.countryCode}`, {
            signal: controller.signal
          });
          if (pricingTimeoutId) {
            clearTimeout(pricingTimeoutId);
            pricingTimeoutId = null;
          }
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              if (data.success && data.pricing) {
                console.log('Regional pricing from database:', data.pricing);
                setRegionalPricing(data.pricing);
                pricingSet = true;
              } else {
                console.warn('Invalid pricing data received, trying fallback');
              }
            } else {
              console.warn('Regional pricing response is not JSON. Content-Type:', contentType);
            }
          } else {
            console.warn(`Failed to fetch pricing (status: ${response.status}), trying fallback`);
          }
        } catch (pricingError: any) {
          if (pricingTimeoutId) {
            clearTimeout(pricingTimeoutId);
            pricingTimeoutId = null;
          }
          // AbortError is expected when timeout occurs - handle gracefully
          if (pricingError?.name === 'AbortError') {
            console.warn('Regional pricing fetch timeout, using fallback');
          } else {
            console.error('Error fetching pricing from database:', pricingError);
          }
        }

        // Fallback: try to get default pricing if regional pricing wasn't set
        if (!pricingSet) {
          let defaultTimeoutId: NodeJS.Timeout | null = null;
          try {
            const defaultController = new AbortController();
            defaultTimeoutId = setTimeout(() => defaultController.abort(), 3000);
            const defaultResponse = await fetch('/api/pricing/regional', {
              signal: defaultController.signal
            });
            if (defaultTimeoutId) {
              clearTimeout(defaultTimeoutId);
              defaultTimeoutId = null;
            }
            if (defaultResponse.ok) {
              const defaultData = await defaultResponse.json();
              if (defaultData.success && defaultData.pricing) {
                console.log('Using default pricing from database');
                setRegionalPricing(defaultData.pricing);
              } else {
                console.warn('No default pricing available');
                setRegionalPricing(null);
              }
            } else {
              console.warn(`Failed to fetch default pricing (status: ${defaultResponse.status})`);
              setRegionalPricing(null);
            }
          } catch (fallbackError: any) {
            if (defaultTimeoutId) {
              clearTimeout(defaultTimeoutId);
              defaultTimeoutId = null;
            }
            // AbortError is expected when timeout occurs - handle gracefully
            if (fallbackError?.name === 'AbortError') {
              console.warn('Default pricing fetch timeout');
            } else {
              console.error('Error fetching default pricing:', fallbackError);
            }
            // Last resort: set empty pricing (components should handle this gracefully)
            setRegionalPricing(null);
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error detecting location:', error);
        // Try to get default pricing immediately on error
        let errorTimeoutId: NodeJS.Timeout | null = null;
        try {
          const errorController = new AbortController();
          errorTimeoutId = setTimeout(() => errorController.abort(), 3000);
          const defaultResponse = await fetch('/api/pricing/regional', {
            signal: errorController.signal
          });
          if (errorTimeoutId) {
            clearTimeout(errorTimeoutId);
            errorTimeoutId = null;
          }
          if (defaultResponse.ok) {
            const defaultData = await defaultResponse.json();
            if (defaultData.success && defaultData.pricing) {
              setRegionalPricing(defaultData.pricing);
              setSelectedCurrency(defaultData.pricing.currency);
            }
          }
        } catch (fallbackError: any) {
          if (errorTimeoutId) {
            clearTimeout(errorTimeoutId);
            errorTimeoutId = null;
          }
          // AbortError is expected when timeout occurs - handle gracefully
          if (fallbackError?.name === 'AbortError') {
            console.warn('Default pricing fetch timeout after location error');
          } else {
            console.error('Error fetching default pricing:', fallbackError);
          }
          setRegionalPricing(null);
        }
      }
    };

    detectLocation();
  }, []);

  // Fetch pricing plans and promotional offers with caching
  useEffect(() => {
    const fetchData = async () => {
      try {
        const cacheKey = getCacheKey(options);
        const cachedEntry = pricingCache.get(cacheKey);

        // Check if we have valid cached data and not forcing a refresh
        if (cachedEntry && isCacheValid(cachedEntry) && refreshTrigger === 0) {
          console.log('Using cached pricing data');
          setPlans(cachedEntry.plans);
          setPromotionalOffers(cachedEntry.promotionalOffers);
          setLoading(false);
          return;
        }

        // Build API URL with query parameters
        const params = new URLSearchParams();
        if (options.publicOnly) {
          params.append('public', 'true');
        }
        if (options.includeInactive) {
          params.append('includeInactive', 'true');
        }
        const plansUrl = `/api/pricing-plans${params.toString() ? '?' + params.toString() : ''}`;

        // Add timeout to prevent blocking
        const plansController = new AbortController();
        const plansTimeoutId = setTimeout(() => plansController.abort(), 10000); // 10 second timeout

        let plansResponse: Response;
        try {
          plansResponse = await fetch(plansUrl, { signal: plansController.signal });
          clearTimeout(plansTimeoutId);
        } catch (err: any) {
          clearTimeout(plansTimeoutId);
          if (err.name === 'AbortError') {
            console.warn('Pricing plans fetch timeout');
            setError('Request timeout - please try again');
          } else {
            console.error('Error fetching pricing plans:', err);
            setError('Failed to load pricing plans');
          }
          setPlans([]);
          setLoading(false);
          return;
        }

        // Fetch offers separately (non-blocking)
        let offersResponse: Response | null = null;
        let offersTimeoutId: NodeJS.Timeout | null = null;
        try {
          const offersController = new AbortController();
          offersTimeoutId = setTimeout(() => offersController.abort(), 5000);
          offersResponse = await fetch('/api/promotional-offers/active?userType=all', {
            signal: offersController.signal
          });
          if (offersTimeoutId) {
            clearTimeout(offersTimeoutId);
            offersTimeoutId = null;
          }
        } catch (err: any) {
          if (offersTimeoutId) {
            clearTimeout(offersTimeoutId);
            offersTimeoutId = null;
          }
          // Offers are optional, don't block on error
          // AbortError is expected when timeout occurs - handle gracefully
          if (err?.name === 'AbortError') {
            console.warn('Promotional offers fetch timeout');
          } else {
            console.warn('Failed to fetch promotional offers:', err);
          }
          offersResponse = null;
        }

        let fetchedPlans: DatabasePricingPlan[] = [];
        let fetchedOffers: any[] = [];

        if (plansResponse.ok) {
          const contentType = plansResponse.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Pricing plans response is not JSON. Content-Type:', contentType);
            setError('Invalid response format from server');
            setPlans([]);
          } else {
            const responseData = await plansResponse.json();

            // Extract plans from response - API returns { plans: [...], region: {...} }
            fetchedPlans = Array.isArray(responseData)
              ? responseData
              : (responseData?.plans || []);

            // Ensure fetchedPlans is always an array
            if (!Array.isArray(fetchedPlans)) {
              console.error('Plans data is not an array:', fetchedPlans);
              fetchedPlans = [];
            }

            // Filter plans that should be displayed on landing page
            if (options.publicOnly) {
              fetchedPlans = fetchedPlans.filter((plan: DatabasePricingPlan) =>
                plan.displayOnLanding && plan.targetAudience === 'all'
              );
            }

            // Exclude free plan if requested
            if (options.excludeFree) {
              fetchedPlans = fetchedPlans.filter((plan: DatabasePricingPlan) =>
                plan.key !== 'free' && plan.status === 'active'
              );
            }

            setPlans(fetchedPlans);
          }
        } else {
          console.error('Error fetching pricing plans:', plansResponse.status);
          setError('Failed to load pricing plans');
          setPlans([]); // Set empty array on error
        }

        if (offersResponse && offersResponse.ok) {
          const contentType = offersResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const offersData = await offersResponse.json();
            if (offersData.success) {
              fetchedOffers = offersData.offers || [];
              setPromotionalOffers(fetchedOffers);
            }
          } else {
            console.error('Promotional offers response is not JSON. Content-Type:', contentType);
          }
        } else if (offersResponse) {
          // Only log if we had a response but it wasn't OK
          console.warn('Promotional offers returned non-OK status:', offersResponse.status);
        }
        // If offersResponse is null (fetch failed), we already logged it above - no need to log again

        // Update cache with fetched data
        if (fetchedPlans.length > 0 || fetchedOffers.length > 0) {
          pricingCache.set(cacheKey, {
            plans: fetchedPlans,
            promotionalOffers: fetchedOffers,
            timestamp: Date.now(),
          });
          console.log('Cached pricing data for key:', cacheKey);
        }
      } catch (error) {
        console.error('Error fetching pricing data:', error);
        setError('Failed to load pricing plans');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [options.publicOnly, options.excludeFree, options.includeInactive, refreshTrigger]);

  // Refetch function - invalidates cache and forces fresh fetch
  const refetch = () => {
    const cacheKey = getCacheKey(options);
    pricingCache.delete(cacheKey); // Clear cache for this key
    setRefreshTrigger(prev => prev + 1);
  };

  // Get regional price for a plan (returns price string with currency symbol)
  const getRegionalPrice = (plan: DatabasePricingPlan): string => {
    if (!regionalPricing) {
      // Fallback: Use the pre-calculated regional pricing from the plan object itself (computed by API)
      // This handles the case where the separate regional pricing fetch fails
      if ((plan as any).regionalPricing?.displayPrice) {
        return (plan as any).regionalPricing.displayPrice;
      }

      // Secondary Fallback: Use the raw price field computed by the API
      const fallbackPrice = (plan as any).price || 0;
      if (fallbackPrice === 0) {
        console.warn(`[Pricing] Zero price fallback for plan ${plan.key}. Missing regional data.`);
      }

      const currencySymbol = (plan as any).currencySymbol ||
        (plan.currency === 'USD' ? '$' : plan.currency === 'GBP' ? '£' : plan.currency === 'EUR' ? '€' : plan.currency || '£');
      return `${currencySymbol}${fallbackPrice}`;
    }

    // Map plan keys to regional pricing
    switch (plan.key) {
      case 'day_pass':
      case 'pro_yearly': // pro_yearly uses the dayPass slot in CountryPricing
        return regionalPricing.dayPass;
      case 'pro_monthly':
        return regionalPricing.monthly;
      case 'pro_quarterly':
        return regionalPricing.quarterly;
      case 'pro_lifetime': // pro_lifetime uses the yearly slot in CountryPricing
        return regionalPricing.yearly;
      default:
        // Use plan.price as fallback if specific key not found in regional pricing
        const fallbackPrice = (plan as any).price || 0;
        return `${regionalPricing.currencySymbol}${fallbackPrice}`;
    }
  };

  // Get monthly equivalent price for quarterly plans only
  // Note: pro_lifetime is a one-time payment, NOT yearly - do not calculate monthly equivalent
  const getMonthlyEquivalent = (plan: DatabasePricingPlan): { price: string; showMonthly: boolean } => {
    if (!regionalPricing) {
      return { price: '', showMonthly: false };
    }

    // Helper function to extract numeric value from price string
    const extractNumericValue = (priceString: string): number => {
      // Remove all non-numeric characters except dots and commas
      let cleaned = priceString.replace(/[^\d.,]/g, '');
      // Handle comma as thousands separator (e.g., 1,999 -> 1999)
      cleaned = cleaned.replace(/,/g, '');
      return parseFloat(cleaned) || 0;
    };

    // Helper function to format price nicely
    const formatMonthlyPrice = (num: number): string => {
      // Round to nearest whole number
      const rounded = Math.round(num);
      return rounded.toString();
    };

    if (plan.key === 'pro_quarterly') {
      // Extract numeric value from quarterly price
      const quarterlyNum = extractNumericValue(regionalPricing.quarterly);
      const monthlyNum = quarterlyNum / 3;
      const formattedMonthly = formatMonthlyPrice(monthlyNum);
      return {
        price: `${regionalPricing.currencySymbol}${formattedMonthly}/month`,
        showMonthly: true
      };
    }
    
    if (plan.key === 'pro_yearly') {
      // Extract numeric value from yearly price (which is in the dayPass slot)
      const yearlyNum = extractNumericValue(regionalPricing.dayPass);
      const monthlyNum = yearlyNum / 12;
      const formattedMonthly = formatMonthlyPrice(monthlyNum);
      return {
        price: `${regionalPricing.currencySymbol}${formattedMonthly}/month`,
        showMonthly: true
      };
    }

    // pro_lifetime is one-time payment - do NOT show monthly equivalent
    return { price: '', showMonthly: false };
  };

  // Get currency symbol for display
  const getCurrencySymbol = (): string => {
    return regionalPricing?.currencySymbol || '£';
  };

  // Get effective price (promotional or regular)
  const getEffectivePrice = (plan: DatabasePricingPlan): number => {
    if (plan.isPromotionActive && plan.effectivePrice) {
      return plan.effectivePrice.oneTime || plan.effectivePrice.monthly || plan.price_one_time || plan.price_monthly || 0;
    }
    return plan.price_one_time || plan.price_monthly || 0;
  };

  // Check if plan has promotional pricing
  const hasPromotionalPricing = (plan: DatabasePricingPlan): boolean => {
    return Boolean(plan.isPromotionActive && plan.effectivePrice &&
      ((plan.effectivePrice.oneTime && plan.effectivePrice.oneTime < (plan.price_one_time || 0)) ||
        (plan.effectivePrice.monthly && plan.effectivePrice.monthly < (plan.price_monthly || 0))));
  };

  return {
    plans,
    promotionalOffers,
    locationData,
    regionalPricing,
    selectedCurrency,
    loading,
    error,
    refetch,
    getRegionalPrice,
    getMonthlyEquivalent,
    getCurrencySymbol,
    getEffectivePrice,
    hasPromotionalPricing
  };
}

