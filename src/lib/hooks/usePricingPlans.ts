'use client';

import { useState, useEffect } from 'react';
import { LocationService, LocationData, PricingData } from '@/lib/payment/locationService';
import { getRegionalPricing, isEUCountry, getEUPricing, RegionalPricing } from '@/lib/pricing/regionalPricing';

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

  // Fetch location and set regional pricing
  useEffect(() => {
    const detectLocation = async () => {
      try {
        console.log('Detecting user location...');
        const location = await LocationService.getLocationData();
        console.log('Location detected:', location);
        
        setLocationData(location);
        setSelectedCurrency(location.currency);
        
        // Get regional pricing based on country
        let pricing: RegionalPricing;
        if (isEUCountry(location.countryCode)) {
          pricing = getEUPricing();
        } else {
          pricing = getRegionalPricing(location.countryCode);
        }
        
        console.log('Regional pricing set:', pricing);
        setRegionalPricing(pricing);
      } catch (error) {
        console.error('Error detecting location:', error);
        // Fallback to India pricing if error (more likely in development)
        const fallbackPricing = getRegionalPricing('IN');
        console.log('Using fallback pricing (India):', fallbackPricing);
        setRegionalPricing(fallbackPricing);
        setSelectedCurrency('INR');
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

