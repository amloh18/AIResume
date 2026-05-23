'use client';

import { useState, useEffect } from 'react';
import { LocationService, LocationData, PricingData } from '@/lib/payment/locationService';

// RegionalPricing interface (matches database format)
export interface RegionalPricing {
  currency: string;
  currencySymbol: string;
  dayPass?: string;
  monthly: string;
  quarterly: string;
  yearly: string;
  lifetime?: string;
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
  publicOnly?: boolean;
  excludeFree?: boolean;
  includeInactive?: boolean;
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

// Simple cache for pricing data
interface PricingCacheEntry {
  plans: DatabasePricingPlan[];
  promotionalOffers: any[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000;
const pricingCache = new Map<string, PricingCacheEntry>();

function getCacheKey(options: UsePricingPlansOptions): string {
  return JSON.stringify({
    publicOnly: options.publicOnly || false,
    excludeFree: options.excludeFree || false,
    includeInactive: options.includeInactive || false,
  });
}

function isCacheValid(entry: PricingCacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

export function usePricingPlans(options: UsePricingPlansOptions = {}): UsePricingPlansResult {
  const [plans, setPlans] = useState<DatabasePricingPlan[]>([]);
  const [promotionalOffers, setPromotionalOffers] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [regionalPricing, setRegionalPricing] = useState<RegionalPricing | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch location and set regional pricing from database
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const location = await LocationService.getLocationData();
        setLocationData(location);
        setSelectedCurrency(location.currency || 'USD');

        // Fetch regional pricing data
        const response = await fetch(`/api/pricing/regional?countryCode=${location.countryCode}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.pricing) {
            setRegionalPricing(data.pricing);
          }
        }
      } catch (error) {
        console.error('Error detecting location/pricing:', error);
      }
    };

    detectLocation();
  }, []);

  // Fetch pricing plans
  useEffect(() => {
    const fetchData = async () => {
      try {
        const cacheKey = getCacheKey(options);
        const cachedEntry = pricingCache.get(cacheKey);

        if (cachedEntry && isCacheValid(cachedEntry) && refreshTrigger === 0) {
          setPlans(cachedEntry.plans);
          setPromotionalOffers(cachedEntry.promotionalOffers);
          setLoading(false);
          return;
        }

        const params = new URLSearchParams();
        if (options.publicOnly) params.append('public', 'true');
        if (options.includeInactive) params.append('includeInactive', 'true');
        
        const response = await fetch(`/api/pricing-plans?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          let fetchedPlans = data.plans || [];
          
          if (options.excludeFree) {
            fetchedPlans = fetchedPlans.filter((p: any) => p.key !== 'free');
          }

          setPlans(fetchedPlans);
          
          if (fetchedPlans.length > 0) {
            pricingCache.set(cacheKey, {
              plans: fetchedPlans,
              promotionalOffers: [],
              timestamp: Date.now(),
            });
          }
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

  const refetch = () => {
    const cacheKey = getCacheKey(options);
    pricingCache.delete(cacheKey);
    setRefreshTrigger(prev => prev + 1);
  };

  // Get regional price for a plan
  const getRegionalPrice = (plan: DatabasePricingPlan): string => {
    const regionalData = (plan as any).regionalPricing;
    const isApprox = regionalData?.isApproximate;
    const currency = regionalData?.currency || regionalPricing?.currency || plan.currency || 'USD';
    const symbol = regionalData?.currencySymbol || regionalPricing?.currencySymbol || '$';
    const isUSD = currency === 'USD';

    // Priority 1: Plan-specific regional data (pre-calculated by API)
    if (regionalData?.displayPrice) {
      const display = regionalData.displayPrice;
      return (isUSD || !isApprox) ? display : `${display} (approx.)`;
    }

    // Priority 2: Use global regionalPricing object
    if (regionalPricing) {
      let priceStr = '';
      switch (plan.key) {
        case 'pro_monthly': priceStr = regionalPricing.monthly; break;
        case 'pro_quarterly': priceStr = regionalPricing.quarterly; break;
        case 'pro_yearly': priceStr = regionalPricing.yearly; break;
        case 'pro_lifetime': priceStr = regionalPricing.lifetime || regionalPricing.yearly; break;
        case 'day_pass': priceStr = (regionalPricing as any).dayPass || regionalPricing.monthly; break;
        default:
          priceStr = `${symbol}${(plan as any).price || 0}`;
      }
      return (isUSD || !isApprox) ? priceStr : `${priceStr} (approx.)`;
    }

    // Fallback
    const fallbackPrice = (plan as any).price || 0;
    const baseDisplay = `${symbol}${fallbackPrice}`;
    return (isUSD || !isApprox) ? baseDisplay : `${baseDisplay} (approx.)`;
  };

  // Get monthly equivalent price
  const getMonthlyEquivalent = (plan: DatabasePricingPlan): { price: string; showMonthly: boolean } => {
    const regionalData = (plan as any).regionalPricing;
    const currency = regionalData?.currency || regionalPricing?.currency || plan.currency || 'USD';
    const symbol = regionalData?.currencySymbol || regionalPricing?.currencySymbol || '$';
    const isUSD = currency === 'USD';
    const isApprox = regionalData?.isApproximate;

    const formatMonthlyPrice = (num: number): string => {
      return num >= 1000 ? Math.round(num).toLocaleString() : Math.round(num).toString();
    };

    if (plan.key === 'pro_quarterly' || plan.key === 'pro_yearly') {
      const totalPrice = regionalData?.price || (plan as any).price || 0;
      const divisor = plan.key === 'pro_quarterly' ? 3 : 12;
      
      if (totalPrice > 0) {
        const monthlyNum = totalPrice / divisor;
        const formattedMonthly = formatMonthlyPrice(monthlyNum);
        const basePrice = `${symbol}${formattedMonthly}/month`;
        return {
          price: (isUSD || !isApprox) ? basePrice : `${basePrice} (approx.)`,
          showMonthly: true
        };
      }
    }

    return { price: '', showMonthly: false };
  };

  const getCurrencySymbol = (): string => {
    return regionalPricing?.currencySymbol || '$';
  };

  const getEffectivePrice = (plan: DatabasePricingPlan): number => {
    if (plan.isPromotionActive && plan.effectivePrice) {
      return plan.effectivePrice.oneTime || plan.effectivePrice.monthly || plan.price_one_time || plan.price_monthly || 0;
    }
    return plan.price_one_time || plan.price_monthly || 0;
  };

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
