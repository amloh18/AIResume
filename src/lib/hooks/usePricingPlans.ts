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
      try {
        console.log('Detecting user location...');
        const location = await LocationService.getLocationData();
        console.log('Location detected:', location);
        
        setLocationData(location);
        setSelectedCurrency(location.currency);
        
        // Get regional pricing from database API
        let pricingSet = false;
        try {
          const response = await fetch(`/api/pricing/regional?countryCode=${location.countryCode}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.pricing) {
              console.log('Regional pricing from database:', data.pricing);
              setRegionalPricing(data.pricing);
              pricingSet = true;
            } else {
              console.warn('Invalid pricing data received, trying fallback');
            }
          } else {
            console.warn(`Failed to fetch pricing (status: ${response.status}), trying fallback`);
          }
        } catch (pricingError) {
          console.error('Error fetching pricing from database:', pricingError);
        }
        
        // Fallback: try to get default pricing if regional pricing wasn't set
        if (!pricingSet) {
          try {
            const defaultResponse = await fetch('/api/pricing/regional');
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
          } catch (fallbackError) {
            console.error('Error fetching default pricing:', fallbackError);
            // Last resort: set empty pricing (components should handle this gracefully)
            setRegionalPricing(null);
          }
        }
      } catch (error) {
        console.error('Error detecting location:', error);
        // Try to get default pricing
        try {
          const defaultResponse = await fetch('/api/pricing/regional');
          if (defaultResponse.ok) {
            const defaultData = await defaultResponse.json();
            if (defaultData.success && defaultData.pricing) {
              setRegionalPricing(defaultData.pricing);
              setSelectedCurrency(defaultData.pricing.currency);
            }
          }
        } catch (fallbackError) {
          console.error('Error fetching default pricing:', fallbackError);
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

        const [plansResponse, offersResponse] = await Promise.all([
          fetch(plansUrl),
          fetch('/api/promotional-offers/active?userType=all')
        ]);

        let fetchedPlans: DatabasePricingPlan[] = [];
        let fetchedOffers: any[] = [];

        if (plansResponse.ok) {
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
        } else {
          console.error('Error fetching pricing plans:', plansResponse.status);
          setError('Failed to load pricing plans');
          setPlans([]); // Set empty array on error
        }

        if (offersResponse.ok) {
          const offersData = await offersResponse.json();
          if (offersData.success) {
            fetchedOffers = offersData.offers || [];
            setPromotionalOffers(fetchedOffers);
          }
        } else {
          console.error('Error fetching promotional offers:', offersResponse.status);
        }

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
      // Fallback to default prices if regional pricing not loaded yet
      const fallbackPrice = plan.price_one_time || plan.price_monthly || 0;
      return `${plan.currency || 'GBP'} ${fallbackPrice}`;
    }

    // Map plan keys to regional pricing
    switch (plan.key) {
      case 'day_pass':
        return regionalPricing.dayPass;
      case 'pro_monthly':
        return regionalPricing.monthly;
      case 'pro_quarterly':
        return regionalPricing.quarterly;
      case 'pro_yearly':
        return regionalPricing.yearly;
      default:
        const fallbackPrice = plan.price_one_time || plan.price_monthly || 0;
        return `${regionalPricing.currencySymbol}${fallbackPrice}`;
    }
  };

  // Get monthly equivalent price for quarterly and yearly plans
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
      // Extract numeric value from yearly price
      const yearlyNum = extractNumericValue(regionalPricing.yearly);
      const monthlyNum = yearlyNum / 12;
      const formattedMonthly = formatMonthlyPrice(monthlyNum);
      return {
        price: `${regionalPricing.currencySymbol}${formattedMonthly}/month`,
        showMonthly: true
      };
    }

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

