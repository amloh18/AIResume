'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';
import Logo from '@/components/ui/Logo';
import { X, Check, CreditCard, Zap, Star, Shield, Crown, Gift, Brain, Users, Globe, ArrowRight, Target, BarChart3, Download, FileText, CheckCircle, ChevronDown, ChevronUp, Info, Sparkles } from 'lucide-react';
import { PricingPlan } from '@/types/pricing';
import { usePricingPlans, DatabasePricingPlan } from '@/lib/hooks/usePricingPlans';

interface UniversalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPlanKey?: string;
  onSuccess?: (subscription: any) => void;
  returnUrl?: string; // URL to return to after successful payment
  triggerContext?: string; // Context of what triggered the modal (e.g., 'cv-creation', 'ats-check')
  // Admin mode features
  adminMode?: boolean;
  previewMode?: boolean;
  subjectUserId?: string; // User ID for admin operations
  currentUserPlan?: string; // Current plan of the subject user
  // Optional pricing data props to avoid duplicate API calls
  plans?: DatabasePricingPlan[];
  promotionalOffers?: any[];
  locationData?: any;
  regionalPricing?: any;
  getRegionalPrice?: (plan: DatabasePricingPlan) => string;
  getMonthlyEquivalent?: (plan: DatabasePricingPlan) => { price: string; showMonthly: boolean };
  getCurrencySymbol?: () => string;
  getEffectivePrice?: (plan: DatabasePricingPlan) => number;
  hasPromotionalPricing?: (plan: DatabasePricingPlan) => boolean;
}

interface DiscountCode {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  currency: string;
  description: string;
}

const UniversalPaymentModal: React.FC<UniversalPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedPlanKey,
  onSuccess,
  returnUrl,
  triggerContext,
  adminMode = false,
  previewMode = false,
  subjectUserId,
  currentUserPlan: propCurrentUserPlan,
  // Optional pricing data props
  plans: propPlans,
  promotionalOffers: propPromotionalOffers,
  locationData: propLocationData,
  regionalPricing: propRegionalPricing,
  getRegionalPrice: propGetRegionalPrice,
  getMonthlyEquivalent: propGetMonthlyEquivalent,
  getCurrencySymbol: propGetCurrencySymbol,
  getEffectivePrice: propGetEffectivePrice,
  hasPromotionalPricing: propHasPromotionalPricing
}) => {
  const session = null; // Session handling - using unified auth system
  const [step, setStep] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [currentUserPlan, setCurrentUserPlan] = useState<string>(propCurrentUserPlan || 'free');
  const [userCurrentPlan, setUserCurrentPlan] = useState<any>(null);
  const [showPromotionalPricing, setShowPromotionalPricing] = useState(false);
  const [userChangedPlan, setUserChangedPlan] = useState(false); // Track if user manually changed plan
  const [providerHealth, setProviderHealth] = useState<{
    polar: boolean | null;
  }>({ polar: null });
  const [providerHealthLoading, setProviderHealthLoading] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  const PLAN_TIERS: Record<string, number> = {
    free: 1,
    starter_monthly: 1,
    starter_yearly: 1,
    focused_monthly: 2,
    focused_yearly: 2,
  };

  const getTransitionInfo = (targetPlanKey: string) => {
    const currentPlanKey = currentUserPlan || 'free';
    const currentTier = PLAN_TIERS[currentPlanKey] || 1;
    const targetTier = PLAN_TIERS[targetPlanKey] || 1;
    
    const currentInterval = currentPlanKey.includes('yearly') ? 'yearly' : currentPlanKey.includes('quarterly') ? 'quarterly' : 'monthly';
    const targetInterval = targetPlanKey.includes('yearly') ? 'yearly' : targetPlanKey.includes('quarterly') ? 'quarterly' : 'monthly';

    if (currentPlanKey === targetPlanKey) {
      return { type: 'none', message: '', isDowngrade: false, isImmediate: true };
    }

    if (targetTier > currentTier) {
      return {
        type: 'upgrade',
        message: 'Upgrade Mode: You will get immediate access. Unused time will be credited.',
        isDowngrade: false,
        isImmediate: true
      };
    }

    if (targetTier < currentTier) {
      return {
        type: 'downgrade',
        message: 'Downgrade Mode: You will retain access until the end of your billing cycle. Changes will take effect on renewal.',
        isDowngrade: true,
        isImmediate: false
      };
    }

    // Same tier, check billing frequency
    const isCurrentShorter = currentInterval === 'monthly' || currentInterval === 'quarterly';
    const isTargetYearly = targetInterval === 'yearly';

    if (isCurrentShorter && isTargetYearly) {
      return {
        type: 'cross_cycle_upgrade',
        message: 'Switching to Annual: Unused credit will apply to your annual plan immediately.',
        isDowngrade: false,
        isImmediate: true
      };
    }

    if (currentInterval === 'yearly' && (targetInterval === 'monthly' || targetInterval === 'quarterly')) {
      return {
        type: 'downgrade',
        message: 'Downgrade Mode: You will retain access until the end of your billing cycle. Changes will take effect on renewal.',
        isDowngrade: true,
        isImmediate: false
      };
    }

    return { type: 'none', message: '', isDowngrade: false, isImmediate: true };
  };

  const getSimulatedProrationCredit = () => {
    if (!userSubscription || !selectedPlan) return 0;
    
    const transition = getTransitionInfo(selectedPlan.key);
    if (transition.type !== 'upgrade' && transition.type !== 'cross_cycle_upgrade') {
      return 0;
    }

    const { currentPeriodStart, currentPeriodEnd, purchasePrice } = userSubscription;
    if (!currentPeriodStart || !currentPeriodEnd || !purchasePrice || purchasePrice <= 0) {
      return 0;
    }

    const start = new Date(currentPeriodStart);
    const end = new Date(currentPeriodEnd);
    const now = new Date();

    if (now >= end || now <= start) {
      return 0;
    }

    const oneDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / oneDay);
    const remainingDays = Math.ceil((end.getTime() - now.getTime()) / oneDay);

    if (totalDays <= 0 || remainingDays <= 0) {
      return 0;
    }

    const credit = (remainingDays / totalDays) * purchasePrice;
    return Math.round(credit * 100) / 100;
  };

  // Use the shared pricing hook only if props are not provided
  // Hooks must be called unconditionally at top level
  const hookResult = usePricingPlans({});

  // Use props if provided and non-empty, otherwise fall back to hook result
  // This ensures we always have plans if available from either source
  const pricingPlansRaw = (propPlans && propPlans.length > 0)
    ? propPlans
    : (hookResult.plans.length > 0 ? hookResult.plans : (propPlans ?? hookResult.plans));
  const promotionalOffers = propPromotionalOffers ?? hookResult.promotionalOffers;
  const locationData = propLocationData ?? hookResult.locationData;
  const regionalPricing = propRegionalPricing ?? hookResult.regionalPricing;
  // Show loading if: we're using hook and it's loading, OR props are provided but empty and hook is loading
  const plansLoading = (propPlans && propPlans.length > 0)
    ? false
    : hookResult.loading;
  const plansError = (propPlans && propPlans.length > 0) ? null : hookResult.error;
  const getRegionalPrice = propGetRegionalPrice ?? hookResult.getRegionalPrice;
  const getMonthlyEquivalent = propGetMonthlyEquivalent ?? hookResult.getMonthlyEquivalent;
  const getCurrencySymbol = propGetCurrencySymbol ?? hookResult.getCurrencySymbol;
  const getEffectivePrice = propGetEffectivePrice ?? hookResult.getEffectivePrice;
  const hasPromotionalPricing = propHasPromotionalPricing ?? hookResult.hasPromotionalPricing;

  // Convert DatabasePricingPlan to PricingPlan format
  // Ensure pricingPlans is always an array to prevent filter errors
  const basePricingPlans: PricingPlan[] = Array.isArray(pricingPlansRaw)
    ? (pricingPlansRaw as unknown as PricingPlan[])
    : [];

  // Ensure current user's plan is always included in the list, even if it was filtered out
  // This allows the "Current Plan" label to be shown when invoked from settings
  const [enhancedPricingPlans, setEnhancedPricingPlans] = useState<PricingPlan[]>(basePricingPlans);

  useEffect(() => {
    if (isOpen && currentUserPlan) {
      const currentPlanExists = basePricingPlans.some(plan => plan.key === currentUserPlan);

      if (!currentPlanExists && hookResult.plans.length > 0) {
        // Find current plan from the hook result (which has all plans, not filtered)
        const currentPlan = hookResult.plans.find((plan: DatabasePricingPlan) => plan.key === currentUserPlan);

        if (currentPlan) {
          // Add current plan to the list so it can be displayed with "Current Plan" label
          setEnhancedPricingPlans([...basePricingPlans, currentPlan as unknown as PricingPlan]);
        } else {
          setEnhancedPricingPlans(basePricingPlans);
        }
      } else {
        setEnhancedPricingPlans(basePricingPlans);
      }
    } else {
      setEnhancedPricingPlans(basePricingPlans);
    }
  }, [isOpen, currentUserPlan, basePricingPlans, hookResult.plans]);

  // Use enhanced pricing plans (includes current plan if it was filtered out)
  const pricingPlans = enhancedPricingPlans;

  // Debug logging to help diagnose issues
  useEffect(() => {
    if (isOpen) {
      console.log('UniversalPaymentModal - Plans state:', {
        propPlans: propPlans?.length ?? 0,
        hookPlans: hookResult.plans?.length ?? 0,
        pricingPlansRaw: pricingPlansRaw?.length ?? 0,
        pricingPlans: pricingPlans.length,
        plansLoading,
        plansError,
        usingProps: !!propPlans
      });
    }
  }, [isOpen, propPlans, hookResult.plans, pricingPlansRaw, pricingPlans, plansLoading, plansError]);

  // Track modal open events
  useEffect(() => {
    if (isOpen) {
      posthog.capture('payment_modal_opened', {
        preselected_plan: preselectedPlanKey ?? null,
        trigger_context: triggerContext ?? null,
        admin_mode: adminMode,
      });
    }
  }, [isOpen]);

  // Reset selected plan when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlan(null);
      setStep(1);
      setDiscountCode('');
      setAppliedDiscount(null);
      setDiscountError(null);
    }
  }, [isOpen]);

  // Reset userChangedPlan when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUserChangedPlan(false);
    }
  }, [isOpen]);

  // Set preselected plan when plans are loaded or when preselectedPlanKey changes
  useEffect(() => {
    // Only proceed if modal is open and we have plans
    if (!isOpen || pricingPlans.length === 0) {
      return;
    }

    // Don't auto-select if user has manually changed the plan
    if (userChangedPlan) return;

    if (preselectedPlanKey) {
      // Always set the preselected plan, even if one is already selected
      const plan = pricingPlans.find((p: PricingPlan) => p.key === preselectedPlanKey);
      if (plan) {
        // Only update if it's different from current selection
        if (!selectedPlan || selectedPlan.key !== preselectedPlanKey) {
          // Attach regional pricing to preselected plan
          const dbPlan = plan as unknown as DatabasePricingPlan;
          // Determine the correct price based on plan key and billing interval
        let planPrice = 0;
        if (plan.key === 'focused_monthly') {
          planPrice = dbPlan.price_monthly || 0;
        } else if (plan.key === 'focused_quarterly') {
          planPrice = dbPlan.price_quarterly || 0;
        } else if (plan.key === 'focused_yearly') {
          planPrice = dbPlan.price_yearly || 0;
        } else if (plan.key === 'focused_yearly') {
          planPrice = dbPlan.price_one_time || 0;
        } else {
          planPrice = getEffectivePrice(dbPlan) || 0;
        }

          const currencySymbol = getCurrencySymbol();
          const monthlyEquivalent = getMonthlyEquivalent(dbPlan);
          const regionalPriceStr = getRegionalPrice(dbPlan);
          // Extract numeric price from regional price string
          const extractNumericFromString = (priceString: string): number => {
            if (!priceString) return 0;
            let cleaned = priceString.replace(/[^\d.,]/g, '');
            cleaned = cleaned.replace(/,/g, '');
            return parseFloat(cleaned) || 0;
          };
          const finalPrice = regionalPriceStr ? extractNumericFromString(regionalPriceStr) : planPrice;

          const planWithPricing = {
            ...plan,
            regionalPricing: {
              price: finalPrice || planPrice || 0,
              currencySymbol: currencySymbol,
              currency: regionalPricing?.currency || locationData?.currency || 'USD'
            },
            durationInfo: monthlyEquivalent.showMonthly ? {
              displayText: monthlyEquivalent.price
            } : undefined
          };
          setSelectedPlan(planWithPricing);
        }
      } else {
        console.warn(`Plan with key "${preselectedPlanKey}" not found in pricing plans`);
      }
    } else if (!selectedPlan && pricingPlans.length > 0) {
      // Default to first paid plan (prefer professional plans)
      // Try to find a professional plan first
      const professionalPlan = pricingPlans.find((p: PricingPlan) =>
        p.key === 'focused_monthly' || p.key === 'focused_quarterly' || p.key === 'focused_yearly' || p.key === 'focused_yearly'
      );

      // Fallback to first paid plan (not free)
      const paidPlan = professionalPlan || pricingPlans.find((p: PricingPlan) => p.key !== 'free');

      if (paidPlan) {
        // Attach regional pricing to default plan
        const dbPlan = paidPlan as unknown as DatabasePricingPlan;
        // Determine the correct price based on plan key and billing interval
        let planPrice = 0;
        if (paidPlan.key === 'focused_monthly') {
          planPrice = dbPlan.price_monthly || 0;
        } else if (paidPlan.key === 'focused_quarterly') {
          planPrice = dbPlan.price_quarterly || 0;
        } else if (paidPlan.key === 'focused_yearly') {
          planPrice = dbPlan.price_yearly || 0;
        } else if (paidPlan.key === 'focused_yearly') {
          planPrice = dbPlan.price_one_time || 0;
        } else {
          planPrice = getEffectivePrice(dbPlan) || 0;
        }

        // Use regional currency symbol, not hardcoded
        const currencySymbol = getCurrencySymbol();
        const monthlyEquivalent = getMonthlyEquivalent(dbPlan);
        const regionalPriceStr = getRegionalPrice(dbPlan);
        // Extract numeric price from regional price string
        const extractNumericFromString = (priceString: string): number => {
          if (!priceString) return 0;
          let cleaned = priceString.replace(/[^\d.,]/g, '');
          cleaned = cleaned.replace(/,/g, '');
          return parseFloat(cleaned) || 0;
        };
        const finalPrice = regionalPriceStr ? extractNumericFromString(regionalPriceStr) : planPrice;

        const planWithPricing = {
          ...paidPlan,
          regionalPricing: {
            price: finalPrice || planPrice || 0,
            currencySymbol: currencySymbol,
            currency: regionalPricing?.currency || locationData?.currency || 'USD'
          },
          durationInfo: monthlyEquivalent.showMonthly ? {
            displayText: monthlyEquivalent.price
          } : undefined
        };
        setSelectedPlan(planWithPricing);
      }
    }
  }, [pricingPlans, preselectedPlanKey, isOpen, getEffectivePrice, getCurrencySymbol, getMonthlyEquivalent, regionalPricing, locationData, getRegionalPrice, userChangedPlan]);

  // Check if any plans have promotional pricing
  useEffect(() => {
    if (promotionalOffers.length > 0) {
      const hasPromo = promotionalOffers.some((offer: any) =>
        offer.promotionalPricing && offer.promotionalPricing.length > 0
      );
      setShowPromotionalPricing(hasPromo);
    }
  }, [promotionalOffers]);

  // Fetch user data when modal opens (only if not in admin mode)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isOpen || adminMode) return;

      try {
        const [userResponse, planResponse] = await Promise.all([
          fetch('/api/user'),
          fetch('/api/user/current-plan')
        ]);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.user) {
            setCurrentUserPlan(userData.user.currentPlanKey || 'free');
            setUserSubscription(userData.user.subscription || null);
          }
        }

        if (planResponse.ok) {
          const planData = await planResponse.json();
          setUserCurrentPlan(planData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [isOpen, adminMode]);

  // Check Polar health when modal opens
  useEffect(() => {
    const checkProviderHealth = async (provider: 'polar') => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`/api/payment/${provider}/health`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`${provider} health check failed:`, response.status, response.statusText);
          return false;
        }

        const data = await response.json();
        return data.healthy === true;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`${provider} health check timed out`);
        } else {
          console.error(`Error checking ${provider} health:`, error);
        }
        return false;
      }
    };

    const checkAllProviders = async () => {
      if (!isOpen) return;

      setProviderHealthLoading(true);
      try {
        const [polarHealthy] = await Promise.all([
          checkProviderHealth('polar'),
        ]);

        setProviderHealth({
          polar: polarHealthy,
        });
      } catch (error) {
        console.error('Error checking provider health:', error);
      } finally {
        setProviderHealthLoading(false);
      }
    };

    checkAllProviders();
  }, [isOpen]);

  const applyDiscountCode = async () => {
    if (!discountCode.trim() || !selectedPlan) return;

    setDiscountError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/discount/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCode.trim().toUpperCase(),
          planId: selectedPlan._id,
          amount: getPlanPrice(selectedPlan)
        })
      });

      const data = await response.json();

      if (data.success) {
        setAppliedDiscount(data.discount);
        setDiscountError(null);
      } else {
        setDiscountError(data.error || 'Invalid discount code');
        setAppliedDiscount(null);
      }
    } catch (error) {
      setDiscountError('Failed to validate discount code');
      setAppliedDiscount(null);
    } finally {
      setLoading(false);
    }
  };

  const removeDiscountCode = () => {
    setDiscountCode('');
    setAppliedDiscount(null);
    setDiscountError(null);
  };

  // Helper function to extract numeric value from price string

  // Helper function to extract numeric value from price string
  const extractNumericPrice = (priceString: string): number => {
    if (!priceString) return 0;
    // Remove all non-numeric characters except dots and commas
    let cleaned = priceString.replace(/[^\d.,]/g, '');
    // Handle comma as thousands separator (e.g., 1,999 -> 1999)
    cleaned = cleaned.replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  };

  const getPlanPrice = (plan: PricingPlan) => {
    if (plan.key === 'free') return 0;

    // Use regional pricing if available (attached when plan is selected)
    const regionalPrice = (plan as any).regionalPricing;
    if (regionalPrice?.price) {
      return regionalPrice.price;
    }

    // Fallback to computed price field from API
    const dbPlan = plan as unknown as DatabasePricingPlan;
    if (dbPlan.price) return dbPlan.price;

    return 0;
  };

  const getFinalPrice = () => {
    if (!selectedPlan) return 0;

    const basePrice = getPlanPrice(selectedPlan);
    if (!appliedDiscount) return basePrice;

    let discountAmount = 0;
    if (appliedDiscount.discountType === 'percentage') {
      discountAmount = (basePrice * appliedDiscount.discountValue) / 100;
    } else {
      discountAmount = appliedDiscount.discountValue;
    }

    return Math.max(0, basePrice - discountAmount);
  };

  const getUSDPlanPrice = (plan: PricingPlan) => {
    if (plan.key === 'free') return 0;
    
    // Use the explicit usdPrice field from our updated API
    const dbPlan = plan as unknown as any;
    if (dbPlan.usdPrice !== undefined && dbPlan.usdPrice > 0) return dbPlan.usdPrice;

    // Legacy fallbacks if usdPrice is missing or 0
    const promotional = getPromotionalPricing(plan);
    const hasPromo = promotional && promotional.pricing;
    
    if (plan.key.includes('focused_monthly')) {
      return (hasPromo && promotional.pricing.monthly) ? promotional.pricing.monthly : (dbPlan.price_monthly || 12.99);
    } else if (plan.key.includes('focused_quarterly')) {
      return (hasPromo && promotional.pricing.quarterly) ? promotional.pricing.quarterly : (dbPlan.price_quarterly || 34.99);
    } else if (plan.key.includes('focused_yearly')) {
      return (hasPromo && promotional.pricing.yearly) ? promotional.pricing.yearly : (dbPlan.price_yearly || 99.00);
    } else if (plan.key.includes('focused_yearly')) {
      return (hasPromo && promotional.pricing.oneTime) ? promotional.pricing.oneTime : (dbPlan.price_one_time || 199.00);
    } else if (plan.key === 'starter_monthly') {
      return 0;
    } else if (plan.key === 'starter_yearly') {
      return 19.99;
    } else if (plan.key === 'focused_monthly') {
      return 9.99;
    } else if (plan.key === 'focused_yearly') {
      return 79.99;
    }

    return getEffectivePrice(dbPlan) || 0;
  };

  const getUSDFinalPrice = () => {
    if (!selectedPlan) return 0;

    const basePrice = getUSDPlanPrice(selectedPlan);
    if (!appliedDiscount) return basePrice;

    let discountAmount = 0;
    if (appliedDiscount.discountType === 'percentage') {
      discountAmount = (basePrice * appliedDiscount.discountValue) / 100;
    } else {
      discountAmount = appliedDiscount.discountValue;
    }

    return Math.max(0, basePrice - discountAmount);
  };

  const getBillingInterval = (plan: PricingPlan) => {
    if (plan.key === 'free') return 'free';
    // Determine interval from plan key first, then fallback to billingCycle
    if (plan.key.includes('quarterly') || plan.key.includes('quaterly')) return 'quarterly';
    if (plan.key.includes('yearly') || plan.key.includes('yealry')) return 'yearly';
    if (plan.key.includes('lifetime')) return 'lifetime';
    if (plan.key.includes('monthly')) return 'monthly';
    return plan.billingCycle || 'monthly';
  };

  // Get promotional pricing for a plan
  const getPromotionalPricing = (plan: PricingPlan) => {
    if (!showPromotionalPricing || !promotionalOffers.length) return null;

    for (const offer of promotionalOffers) {
      const promotionalPricing = offer.promotionalPricing?.find((pp: any) =>
        pp.planId === plan._id || pp.planId === plan.key
      );
      if (promotionalPricing) {
        return {
          offer,
          pricing: promotionalPricing
        };
      }
    }
    return null;
  };

  // getEffectivePrice is now provided by the usePricingPlans hook

  // Check if a plan is the user's current plan
  const isCurrentPlan = (plan: PricingPlan) => {
    if (adminMode) return false;
    if (currentUserPlan === 'free' && plan.key === 'starter_monthly') return true;
    return plan.key === currentUserPlan;
  };

  // Get plan status text
  const getPlanStatusText = (plan: PricingPlan) => {
    if (isCurrentPlan(plan)) {
      return 'Current Plan';
    }
    if (plan.key === 'free' && currentUserPlan !== 'free') {
      return 'Downgrade';
    }
    if (plan.key !== 'free' && currentUserPlan === 'free') {
      return 'Upgrade';
    }
    if (plan.key !== 'free' && currentUserPlan !== 'free') {
      return 'Change Plan';
    }
    return 'Select Plan';
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    // In preview mode, just close the modal
    if (previewMode) {
      onClose();
      return;
    }

    setLoading(true);

    try {
      if (selectedPlan.key === 'free') {
        // Activate free plan
        const response = await fetch('/api/subscription/activate-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            onSuccess?.(data.subscription);
            onClose();
            // Refresh the page to update UI
            if (returnUrl) {
              window.location.href = returnUrl;
            } else {
              window.location.reload();
            }
          }
        }
      } else if (adminMode && subjectUserId) {
        // Admin mode - grant plan directly
        try {
          const response = await fetch(`/api/admin/users/${subjectUserId}/subscription/upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planKey: selectedPlan.key,
              interval: getBillingInterval(selectedPlan),
              reason: 'Admin granted via payment modal'
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              onSuccess?.(data.subscription);
              onClose();
              alert(`Plan ${selectedPlan.name} granted successfully!`);
            } else {
              alert(`Error: ${data.error || 'Failed to grant plan'}`);
            }
          } else {
            // Try to parse JSON error, fallback to text if it's HTML
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              alert(`Error: ${errorData.error || 'Failed to grant plan'}`);
            } else {
              const errorText = await response.text();
              console.error('Non-JSON error response:', errorText);
              alert(`Error: Failed to grant plan (Status: ${response.status}). Please check the console for details.`);
            }
          }
        } catch (fetchError) {
          console.error('Error granting plan:', fetchError);
          alert(`Error: Network error while granting plan. Please try again.`);
        }
      } else {
        // Regular payment flow — Polar-only redirect
        const body = {
          planKey: selectedPlan.key,
          interval: getBillingInterval(selectedPlan),
          discountCode: appliedDiscount?.code || undefined,
          couponCode: appliedDiscount?.code || undefined,
          returnUrl: returnUrl || window.location.href,
          triggerContext
        };

        const response = await fetch('/api/checkout/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const data = await response.json();

          if (data.downgrade_scheduled && data.success) {
            onSuccess?.(data.subscription);
            onClose();
            alert(data.message || 'Subscription scheduled to downgrade at renewal.');
            if (returnUrl) {
              window.location.href = returnUrl;
            } else {
              window.location.reload();
            }
            return;
          }

          if (data.zero_amount && data.success) {
            onSuccess?.(data.subscription);
            onClose();
            // Use the URL returned by the server (it has the correct query params already)
            const redirectTarget = data.url || data.redirect_url || returnUrl;
            if (redirectTarget) {
              window.location.href = redirectTarget;
            } else {
              window.location.reload();
            }
            return;
          }

          // Polar Checkout — always redirect
          if (data.url || data.redirect_url) {
            window.location.href = data.url || data.redirect_url;
          }

        } else {
          // Handle error response
          let errorMessage = 'Failed to create checkout session';

          const contentType = response.headers.get('content-type');

          try {
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              if (errorData && Object.keys(errorData).length > 0) {
                console.error('Checkout session error:', errorData);
                errorMessage = errorData.error || errorData.details || errorData.message || errorMessage;
              } else {
                console.error('Checkout session error - Empty response:', {
                  status: response.status,
                  statusText: response.statusText,
                  url: response.url
                });
                errorMessage = `Server error (${response.status}): ${response.statusText || 'Empty response received'}`;
              }
            } else {
              const errorText = await response.text();
              errorMessage = `Server error (${response.status}): ${errorText || response.statusText || 'Unknown error'}`;
              console.error('Checkout session error - Non-JSON response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText.substring(0, 200)
              });
            }
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorMessage = `Server error (${response.status}): ${response.statusText || 'Unknown error'}`;
          }

          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);

      // Provide more detailed error messages
      let errorMsg = 'An unknown error occurred';
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMsg = 'Network error: Unable to connect to payment server. Please check your internet connection and try again.';
        console.error('Network error details:', {
          message: error.message,
          stack: error.stack,
          url: '/api/checkout/session'
        });
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }

      alert(`Payment Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const canUpgrade = (plan: PricingPlan) => {
    if (plan.key === 'free') return false;
    if (currentUserPlan === 'free') return true;

    const planOrder: Record<string, number> = {
      free: 0,
      starter_monthly: 1,
      starter_yearly: 2,
      focused_monthly: 3,
      focused_yearly: 4,
    };
    
    const targetOrder = planOrder[plan.key] ?? 0;
    const currentOrder = planOrder[currentUserPlan] ?? 0;
    return targetOrder > currentOrder;
  };

  // Get plan icon component (matching landing page)
  const getPlanIcon = (planKey: string) => {
    const key = planKey.toLowerCase();
    if (key === 'free') return Brain;
    if (key.includes('starter')) return Target;
    if (key.includes('focused')) return Sparkles;
    
    switch (key) {
      case 'focused_monthly': return Crown;
      case 'focused_quarterly': return Users;
      case 'focused_yearly': return Globe;
      case 'focused_yearly': return Star;
      default: return Brain;
    }
  };

  const getPlanColor = (planKey: string) => {
    const key = planKey.toLowerCase();
    if (key.includes('focused')) return 'text-lime-500 bg-lime-500/10';
    
    switch (key) {
      case 'free': return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-white/5';
    }
  };

  // Track window width for responsive sidebar (matching JobSidebar)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Features data for left side panel
  const features = [
    {
      id: 'ats-scoring',
      title: 'ATS Scoring & Editing',
      description: 'Real-time feedback on how well your CV parses for specific job descriptions.',
      icon: CheckCircle,
      color: 'from-lime-400 to-lime-500',
      bgColor: 'from-lime-400/10 to-lime-500/10',
    },
    {
      id: 'advanced-structuring',
      title: 'Advanced Sentence Structuring',
      description: 'AI that rewrites your bullets using the STAR method (Situation, Task, Action, Result).',
      icon: Target,
      color: 'from-blue-400 to-blue-500',
      bgColor: 'from-blue-400/10 to-blue-500/10',
    },
    {
      id: 'ai-cover-letter',
      title: 'AI Cover Letter Generator',
      description: 'Generate unlimited tailored cover letters for specific job URLs.',
      icon: FileText,
      color: 'from-purple-400 to-purple-500',
      bgColor: 'from-purple-400/10 to-purple-500/10',
    },
    {
      id: 'linkedin-enhancer',
      title: 'LinkedIn Enhancer',
      description: 'Get AI suggestions for profile headlines and "About" sections to stand out.',
      icon: Globe,
      color: 'from-orange-400 to-orange-500',
      bgColor: 'from-orange-400/10 to-orange-500/10',
    },
    {
      id: 'interview-coach',
      title: 'Interview Coach',
      description: 'Access the AI-driven mock interview simulator to practice and perfect your answers.',
      icon: BarChart3,
      color: 'from-green-400 to-green-500',
      bgColor: 'from-green-400/10 to-green-500/10',
    },
    {
      id: 'unlimited-ai',
      title: 'Unlimited AI Generation',
      description: 'Break free from credit limits. Generate as much optimized content as you need.',
      icon: Download,
      color: 'from-pink-400 to-pink-500',
      bgColor: 'from-pink-400/10 to-pink-500/10',
    }
  ];

  // Handle hydration for portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-black/50 backdrop-blur-sm z-[99999]"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
            onClick={onClose}
          />
          {/* Modal Container - Full Screen Takeover */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[99999] w-screen h-screen bg-black/60 dark:bg-black/70 backdrop-blur-sm overflow-hidden"
            onClick={(e) => e.target === e.currentTarget && onClose?.()}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="relative flex flex-col tablet:flex-row bg-[#FAF9F5] dark:bg-[#0B0D08] w-full h-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button - Premium floating layout */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 tablet:top-6 tablet:right-6 p-2.5 bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-full border border-gray-200/60 dark:border-white/10 transition-all flex-shrink-0 z-[100] shadow-sm hover:shadow-md active:scale-95 group"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-800 dark:text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>

              {/* Left Side - Features & Info */}
              <motion.div
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{
                  type: 'spring',
                  damping: 25,
                  stiffness: 200,
                  mass: 0.8
                }}
                className="w-full tablet:w-[40%] bg-[#F5F4F0] dark:bg-[#12140F] overflow-y-auto hidden tablet:flex flex-col border-r border-gray-200/50 dark:border-white/5 h-full"
              >
                <div className="p-8 tablet:p-12 max-w-2xl mx-auto h-full flex flex-col justify-between">
                  {/* Brand & Hero */}
                  <div className="space-y-6 mb-8">
                    <div className="flex items-center gap-3">
                      <Logo size="sm" />
                      <span className="text-[10px] font-mono tracking-widest text-gray-400 dark:text-gray-500 uppercase border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded">
                        [ 01 / PREMIUM SUITE ]
                      </span>
                    </div>
                    
                    <h1 className="text-3xl tablet:text-4xl font-extrabold text-gray-900 dark:text-white leading-[1.15] tracking-tight">
                      Empowering career growth through design and intelligence.
                    </h1>
                    
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-md">
                      Join thousands of top professionals who use AI Resume to land roles at Google, Stripe, and Apple. Fully integrated toolkit for CV analysis, tracking, and preparation.
                    </p>
                  </div>

                  {/* High-End Feature Grid */}
                  <div className="space-y-4 mb-8 flex-1">
                    <span className="text-[10px] font-mono tracking-widest text-gray-400 dark:text-gray-500 uppercase block">
                      [ KEY ADVANTAGES ]
                    </span>
                    
                    <div className="divide-y divide-gray-200/60 dark:divide-white/5 border-t border-b border-gray-200/60 dark:border-white/5">
                      <div className="py-3.5 flex items-start gap-4 hover:bg-white/30 dark:hover:bg-white/5 px-2 rounded-xl transition-all duration-200 group">
                        <div className="p-2 bg-white dark:bg-[#1A201A] border border-gray-200/60 dark:border-white/5 rounded-xl group-hover:scale-105 transition-transform flex-shrink-0">
                          <FileText className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-gray-950 dark:text-white tracking-wide uppercase">Dynamic Snippet System</h3>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mt-0.5">Build unlimited, tailored resume segments with precision templates.</p>
                        </div>
                      </div>

                      <div className="py-3.5 flex items-start gap-4 hover:bg-white/30 dark:hover:bg-white/5 px-2 rounded-xl transition-all duration-200 group">
                        <div className="p-2 bg-white dark:bg-[#1A201A] border border-gray-200/60 dark:border-white/5 rounded-xl group-hover:scale-105 transition-transform flex-shrink-0">
                          <Target className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-gray-950 dark:text-white tracking-wide uppercase">Automated ATS Alignment</h3>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mt-0.5">Optimize layout, spelling, and keywords instantly to match jobs.</p>
                        </div>
                      </div>

                      <div className="py-3.5 flex items-start gap-4 hover:bg-white/30 dark:hover:bg-white/5 px-2 rounded-xl transition-all duration-200 group">
                        <div className="p-2 bg-white dark:bg-[#1A201A] border border-gray-200/60 dark:border-white/5 rounded-xl group-hover:scale-105 transition-transform flex-shrink-0">
                          <Users className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-gray-950 dark:text-white tracking-wide uppercase">AI Interview Simulation</h3>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mt-0.5">Interactive, role-specific coaching with instant feedback.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Success Stories & Testimonials */}
                  <div className="space-y-4 mb-8 pt-4">
                    <span className="text-[10px] font-mono tracking-widest text-gray-400 dark:text-gray-500 uppercase block">
                      [ SOCIAL PROOF ]
                    </span>
                    
                    <div className="bg-white/60 dark:bg-white/5 border border-gray-200/60 dark:border-white/5 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
                      <div className="flex gap-0.5 text-lime-500 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-lime-500 text-lime-500" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
                        "AI Resume completely modernized my application flow. The ATS scoring was spot-on, and I secured 3 callbacks within the first week of upgrading."
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-lime-400 to-lime-600 flex items-center justify-center text-[10px] font-black text-black">
                          SB
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-gray-900 dark:text-white">Sarah Bernstein</h4>
                          <p className="text-[9px] font-mono text-gray-500 uppercase">Sales Director, FinTech</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="pt-4 border-t border-gray-200/60 dark:border-white/5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      <span className="text-[10px] font-mono uppercase text-gray-500 dark:text-gray-400">Secure SSL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      <span className="text-[10px] font-mono uppercase text-gray-500 dark:text-gray-400">Cancel Anytime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      <span className="text-[10px] font-mono uppercase text-gray-500 dark:text-gray-400">99.8% Success</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right Side - Payment Interface */}
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{
                  type: 'spring',
                  damping: 25,
                  stiffness: 200,
                  mass: 0.8,
                  delay: 0.1
                }}
                className="w-full tablet:w-[60%] bg-white dark:bg-[#0B0D08] overflow-y-auto h-full flex flex-col"
              >
                <div className="p-8 tablet:p-12 max-w-6xl mx-auto w-full flex flex-col justify-between min-h-full bg-transparent">

                {/* Header */}
                {/* Header moved inside plans container */}

                {/* Content */}
                 <div className="flex-1 flex flex-col justify-between w-full">
                  {step === 1 && (
                    <>
                      {/* Current Plan Info - Displayed outside cards */}
                      {/* Current Plan moved inside plans container */}

                      {/* Selected Plan Display (if preselected and different from current) - REMOVED DUPLICATE BLOCK */}


                      {/* Unified Plans Container with Header & Current Plan */}
                      {(() => {
                        const availablePlans = Array.isArray(pricingPlans) && pricingPlans.length > 0
                          ? pricingPlans.filter(plan => plan.key !== 'free' && !isCurrentPlan(plan))
                          : [];

                        let currentPlan = pricingPlans.find((plan: PricingPlan) => isCurrentPlan(plan));
                        if (currentPlan && (currentPlan.key === 'free' || currentPlan.key === 'starter_monthly')) {
                          const starterPlan = pricingPlans.find(p => p.key === 'starter_monthly');
                          if (starterPlan) {
                            currentPlan = starterPlan;
                          }
                        }

                        // Filter plans based on selected billing cycle for the 4 canonical plans
                        const subscriptionPlans = availablePlans.filter(plan => {
                          if (adminMode) return true;
                          const key = plan.key.toLowerCase();
                          if (key.includes('smart')) return false;
                          if (billingCycle === 'yearly') {
                            return key === 'starter_yearly' || key === 'focused_yearly';
                          } else {
                            return key === 'starter_monthly' || key === 'focused_monthly';
                          }
                        }).sort((a, b) => {
                          if (a.key.includes('starter')) return -1;
                          if (b.key.includes('starter')) return 1;
                          return 0;
                        });

                        // Fallback: if no plans for selected cycle, show all non-smart plans
                        const displayPlans = subscriptionPlans.length > 0
                          ? subscriptionPlans
                          : availablePlans.filter(p => !p.key.toLowerCase().includes('smart'));

                        return (
                          <div className="flex flex-col gap-6 max-w-full mx-auto w-full transition-all duration-300">

                            {/* --- HEADER MOVED INSIDE --- */}
                            <div className="flex flex-col tablet:flex-row tablet:items-center justify-between gap-3 mb-2 px-0">
                              <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                  Choose Your Plan
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Review and complete payment
                                </p>
                              </div>

                              {/* Billing Cycle Toggle */}
                              {!adminMode && !previewMode && (
                                <div className="flex items-center p-1 bg-gray-200/50 dark:bg-white/5 rounded-xl self-start tablet:self-center">
                                  <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                      billingCycle === 'monthly'
                                        ? 'bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                  >
                                    Monthly
                                  </button>
                                  <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                      billingCycle === 'yearly'
                                        ? 'bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                  >
                                    Yearly
                                    <span className="bg-lime-500 text-black text-[9px] px-1.5 py-0.5 rounded-md font-black">SAVE 50%</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* --- CURRENT PLAN MOVED INSIDE --- */}
                            {currentPlan && !adminMode && (
                              <div className="mx-0 p-3 bg-white dark:bg-[#232f1c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="flex-shrink-0">
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-lime-500/10 text-lime-600 dark:text-lime-400">
                                      {(() => { const Icon = getPlanIcon(currentPlan.key); return <Icon size={20} />; })()}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-md font-bold text-gray-900 dark:text-white">{currentPlan.name}</h3>
                                      <span className="bg-lime-100 text-lime-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Current</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Subscription Plans - Grid Layout */}
                            {displayPlans.length > 0 && (
                              <div className={`grid grid-cols-1 ${displayPlans.length === 2 ? 'tablet:grid-cols-2 max-w-[800px] mx-auto' : 'tablet:grid-cols-3'} gap-4 px-0 w-full`}>
                                {displayPlans.map((plan) => {
                                  const dbPlan = plan as unknown as DatabasePricingPlan;
                                  const regionalPrice = getRegionalPrice(dbPlan);
                                  const currencySymbol = getCurrencySymbol();
                                  const effectivePrice = getEffectivePrice(dbPlan);
                                  const monthlyEquivalent = getMonthlyEquivalent(dbPlan);
                                  const isSelected = selectedPlan?.key === plan.key;
                                  const Icon = getPlanIcon(plan.key);
                                  const isFocused = plan.key.includes('focused');
                                  const isFocusedYearly = plan.key === 'focused_yearly';

                                  return (
                                    <div
                                      key={plan.key}
                                      onClick={() => {
                                        setUserChangedPlan(true);
                                        setSelectedPlan(plan);
                                      }}
                                      className={`group relative flex flex-col p-5 rounded-3xl border-2 transition-all duration-300 cursor-pointer ${
                                        isSelected
                                          ? 'border-lime-500 bg-white dark:bg-[#1A201A] shadow-lg shadow-lime-500/10 scale-[1.02] z-10'
                                          : 'border-gray-200 hover:border-gray-300 dark:border-white/5 bg-white dark:bg-white/5'
                                      }`}
                                    >
                                      {/* Selection Indicator & Badge */}
                                      {isSelected && (
                                        <div className="absolute top-4 right-4 text-lime-500 bg-lime-500/10 rounded-full p-0.5">
                                          <CheckCircle className="w-5 h-5 fill-lime-500 text-black dark:text-[#1A201A]" />
                                        </div>
                                      )}
                                      
                                      <div className={`p-2 w-fit rounded-xl mb-4 ${
                                        isSelected ? 'bg-lime-500/20 text-lime-500' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                                      }`}>
                                        <Icon size={18} />
                                      </div>

                                      <div className="mb-6">
                                        <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">
                                          {plan.name.replace(' Monthly', '').replace(' Yearly', '').replace(' Quarterly', '')}
                                        </h3>
                                        {isFocusedYearly && (
                                          <span className="text-[9px] bg-lime-500 text-black px-2 py-0.5 rounded-md font-black uppercase tracking-wider mb-2 inline-block shadow-sm">
                                            Most Popular
                                          </span>
                                        )}
                                        
                                        {plan.key === 'starter_monthly' ? (
                                           <div className="mt-2">
                                             <div className="flex items-baseline gap-2">
                                               <span className="text-sm line-through text-gray-400 dark:text-gray-500 font-bold">
                                                 $4.99
                                               </span>
                                               <span className="text-3xl font-black text-gray-900 dark:text-white">
                                                 $0.00
                                               </span>
                                               <span className="text-xs font-bold text-gray-500">
                                                 /month
                                               </span>
                                             </div>
                                             <p className="text-[10px] font-bold text-lime-600 dark:text-lime-400 mt-1 leading-tight">
                                               Free for now ($0 invoices will be emailed)
                                             </p>
                                           </div>
                                         ) : plan.key === 'starter_yearly' ? (
                                           <div className="mt-2">
                                             <div className="flex items-baseline gap-1">
                                               <span className="text-3xl font-black text-gray-900 dark:text-white">
                                                 $2
                                               </span>
                                               <span className="text-xs font-bold text-gray-500">
                                                 /month
                                               </span>
                                             </div>
                                             <p className="text-[10px] font-bold mt-1 text-gray-500 dark:text-gray-400">
                                               $19.99 total (billed annually)
                                             </p>
                                           </div>
                                         ) : plan.key === 'focused_monthly' ? (
                                           <div className="mt-2">
                                             <div className="flex items-baseline gap-1">
                                               <span className="text-3xl font-black text-gray-900 dark:text-white">
                                                 $9.99
                                               </span>
                                               <span className="text-xs font-bold text-gray-500">
                                                 /month
                                               </span>
                                             </div>
                                           </div>
                                         ) : plan.key === 'focused_yearly' ? (
                                           <div className="mt-2">
                                             <div className="flex items-baseline gap-1">
                                               <span className="text-3xl font-black text-gray-900 dark:text-white">
                                                 $7
                                               </span>
                                               <span className="text-xs font-bold text-gray-500">
                                                 /month
                                               </span>
                                             </div>
                                             <p className="text-[10px] font-bold mt-1 text-gray-500 dark:text-gray-400">
                                               $79.99 total (billed annually)
                                             </p>
                                           </div>
                                         ) : (
                                           <>
                                             <div className="flex items-baseline gap-1 mt-2">
                                               <span className="text-3xl font-black text-gray-900 dark:text-white">
                                                 {monthlyEquivalent.showMonthly ? monthlyEquivalent.price : (regionalPrice || `$${effectivePrice}`)}
                                               </span>
                                               <span className="text-xs font-bold text-gray-500">
                                                 {monthlyEquivalent.showMonthly ? '/month' : '/period'}
                                               </span>
                                             </div>
                                           </>
                                         )}
                                      </div>
                                      {/* Feature Tags */}
                                      <div className="flex-1 space-y-3 mb-6">
                                        {plan.features.slice(0, 6).map((feature, i) => (
                                          <div key={i} className="flex items-start gap-2.5">
                                            <div className="w-4 h-4 rounded-full bg-lime-500/10 dark:bg-lime-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                                              <Check className="w-2.5 h-2.5 text-lime-600 dark:text-lime-400" />
                                            </div>
                                            <span className="text-[11px] font-medium leading-tight text-gray-600 dark:text-gray-400">
                                              {feature.split(':')[0]}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Continue Button (Moved Inside) */}
                            <div className="pt-4 flex flex-col items-center w-full">
                              <button
                                onClick={() => setStep(2)}
                                disabled={!selectedPlan || isCurrentPlan(selectedPlan)}
                                className="w-full tablet:w-auto px-16 py-4 bg-[#80FF00] hover:bg-[#99ff33] text-black rounded-2xl font-black disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-all shadow-xl shadow-lime-500/20 active:scale-95 text-base flex items-center justify-center gap-3 group"
                              >
                                <Shield className="w-5 h-5 opacity-50 group-hover:scale-110 transition-transform" />
                                <span>
                                  {!selectedPlan
                                    ? 'Select a Plan'
                                    : isCurrentPlan(selectedPlan)
                                      ? 'Active Plan Selected'
                                      : selectedPlan.key === 'starter_monthly'
                                        ? 'Activate Free Plan'
                                        : `Continue with ${selectedPlan.name.replace(' Monthly', '').replace(' Yearly', '').replace(' Quarterly', '')}`}
                                </span>
                                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                              </button>
                              <div className="mt-3 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Shield className="w-3.5 h-3.5 text-lime-500" />
                                <span className="text-[10px] font-bold">Secure payments. Cancel anytime.</span>
                              </div>
                            </div>

                          </div>
                        );
                      })()}

                      {/* Trust Elements Footer */}
                      <div className="mt-auto pt-8 border-t border-gray-200/40 dark:border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
                          <div className="flex items-start gap-3 p-3 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/5">
                            <Shield className="w-5 h-5 text-lime-600 dark:text-lime-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="block text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">Secure Checkout</span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">256-bit SSL encrypted transaction via Polar.</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/5">
                            <CheckCircle className="w-5 h-5 text-lime-600 dark:text-lime-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="block text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">Flexible Billing</span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Cancel your subscription at any time with one click.</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/5">
                            <Gift className="w-5 h-5 text-lime-600 dark:text-lime-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="block text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">Value Guarantee</span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Get invoice receipt and immediate account update.</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                          By proceeding, you agree to our <a href="/terms" target="_blank" className="underline hover:text-gray-600 dark:hover:text-gray-300">Terms of Service</a> & <a href="/privacy-policy" target="_blank" className="underline hover:text-gray-600 dark:hover:text-gray-300">Privacy Policy</a>
                        </p>
                      </div>


                      {/* Continue Button */}
                      {/* Continue Button moved inside container */}
                    </>
                  )}

                  {
                    step === 2 && selectedPlan && (
                      <div className="flex flex-col flex-1 w-full justify-between items-center text-center max-w-2xl mx-auto py-4">
                        {/* Centered Back Button */}
                        <button
                          onClick={() => setStep(1)}
                          className="flex items-center gap-2 text-xs font-mono uppercase text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors mx-auto"
                        >
                          <span>← Back to Plans</span>
                        </button>

                        <div className="w-full flex flex-col items-center">
                          {/* Heading */}
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                            Complete Your Order
                          </h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                            Please review your subscription details below
                          </p>

                          {/* Plan Details Display */}
                          <div className="mb-6">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                              {(() => {
                                if (!selectedPlan) return 'No Plan Selected';
                                if (selectedPlan.key === 'focused_yearly') return 'Pro Annual Plan';
                                if (selectedPlan.key === 'focused_yearly') return 'Pro Yearly Plan';
                                if (selectedPlan.key === 'focused_quarterly') return 'Pro Quarterly Plan';
                                if (selectedPlan.key === 'focused_monthly') return 'Pro Monthly Plan';
                                return selectedPlan.name || `Plan ${selectedPlan.key}`;
                              })()}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                              {(() => {
                                if (!selectedPlan) return 'Please select a plan';
                                const billingInterval = getBillingInterval(selectedPlan);
                                if (billingInterval === 'one-time') {
                                  return 'One-time payment. Access to all premium features.';
                                } else if (billingInterval === 'yearly') {
                                  return 'Billed once yearly. Access to all premium features.';
                                } else if (billingInterval === 'quarterly') {
                                  return 'Billed once quarterly. Access to all premium features.';
                                } else {
                                  return 'Billed monthly. Access to all premium features.';
                                }
                              })()}
                            </p>
                          </div>

                          {/* Transition Info Banner */}
                          {(() => {
                            const transitionInfo = getTransitionInfo(selectedPlan.key);
                            if (transitionInfo.type === 'none') return null;
                            const prorationCredit = getSimulatedProrationCredit();
                            
                            if (transitionInfo.isDowngrade) {
                              return (
                                <div className="my-2 p-4 rounded-3xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 text-left max-w-md w-full mx-auto shadow-sm">
                                  <div className="flex gap-2">
                                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Downgrade Scheduled</p>
                                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-normal">
                                        {transitionInfo.message}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else {
                              const targetPrice = getPlanPrice(selectedPlan);
                              const isYearly = selectedPlan.key.includes('yearly');
                              const daysInPeriod = isYearly ? 365 : (selectedPlan.key.includes('quarterly') ? 90 : 30);
                              const extensionDays = targetPrice > 0 ? Math.round(prorationCredit / (targetPrice / daysInPeriod)) : 0;
                              
                              return (
                                <div className="my-2 p-4 rounded-3xl bg-lime-50/70 dark:bg-lime-950/10 border border-lime-200 dark:border-lime-500/30 text-left max-w-md w-full mx-auto shadow-sm">
                                  <div className="flex gap-2">
                                    <Sparkles className="w-5 h-5 text-lime-600 dark:text-lime-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-bold text-lime-800 dark:text-lime-300 uppercase tracking-wider">Immediate Plan Switch</p>
                                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-normal">
                                        {transitionInfo.message}
                                      </p>
                                      {prorationCredit > 0 && extensionDays > 0 && (
                                        <p className="text-[11px] text-lime-700 dark:text-lime-400 font-extrabold mt-1.5 leading-snug">
                                          ★ Proration credit of {getCurrencySymbol()}{prorationCredit.toFixed(2)} will extend your new plan by {extensionDays} additional days!
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          })()}

                          {/* Selected Plan Benefits box */}
                          <div className="w-full max-w-md mx-auto my-6 p-6 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-gray-200/50 dark:border-white/5 text-left">
                            <h4 className="text-[10px] font-mono tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-4 text-center">
                              [ INCLUDED BENEFITS ]
                            </h4>
                            <div className="space-y-3">
                              {selectedPlan.features.slice(0, 6).map((feature, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                  <div className="w-4 h-4 rounded-full bg-lime-500/10 dark:bg-lime-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                                    <Check className="w-2.5 h-2.5 text-lime-600 dark:text-lime-400" />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {feature.split(':')[0]}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Coupon Code Section */}
                          <div className="w-full max-w-md mx-auto mb-6 text-left">
                            <p className="text-gray-900 dark:text-white mb-2 text-xs font-mono uppercase tracking-wider text-center">[ Have a coupon code? ]</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={discountCode}
                                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                placeholder="Enter code here"
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 border border-gray-300 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-500 dark:focus:ring-[#80FF00]/50 focus:border-lime-500 dark:focus:border-[#80FF00]/50 transition-colors"
                              />
                              <button
                                onClick={applyDiscountCode}
                                disabled={!discountCode.trim() || loading}
                                className="px-6 py-2.5 bg-gray-950 dark:bg-lime-500 hover:bg-gray-900 dark:hover:bg-lime-600 text-white dark:text-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-sm"
                              >
                                Apply
                              </button>
                            </div>

                            {appliedDiscount && (
                              <div className="mt-3 flex items-center justify-between rounded-xl p-3 bg-lime-50 dark:bg-lime-900/20 border border-lime-300 dark:border-lime-500/30">
                                <div className="flex items-center">
                                  <Gift className="w-4 h-4 mr-2 text-lime-600 dark:text-lime-400" />
                                  <span className="text-sm text-lime-700 dark:text-lime-300">
                                    {appliedDiscount.description}
                                  </span>
                                </div>
                                <button
                                  onClick={removeDiscountCode}
                                  className="text-lime-600 dark:text-lime-400 hover:opacity-80 transition-opacity"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {discountError && (
                              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {discountError}
                              </div>
                            )}
                          </div>

                          {/* Price Summary */}
                          <div className="w-full max-w-md mx-auto mb-6 space-y-3 p-4 bg-gray-50/30 dark:bg-white/5 rounded-2xl border border-gray-200/40 dark:border-white/5">
                            <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs">
                              <span>Subtotal</span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {(() => {
                                  const regionalPrice = (selectedPlan as any).regionalPricing;
                                  const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                                  const price = getPlanPrice(selectedPlan).toFixed(2);
                                  const currency = regionalPrice?.currency || regionalPricing?.currency || 'USD';
                                  const isUSD = currency === 'USD';
                                  return isUSD ? `${currencySymbol}${price}` : `$${getUSDPlanPrice(selectedPlan).toFixed(2)} (~${currencySymbol}${price})`;
                                })()}
                              </span>
                            </div>

                            <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs">
                              <span>Discount</span>
                              <span className={appliedDiscount ? 'text-green-600 dark:text-lime-400 font-bold' : 'text-gray-500'}>
                                {appliedDiscount ? (
                                  <>
                                    {(() => {
                                      const regionalPrice = selectedPlan ? (selectedPlan as any).regionalPricing : null;
                                      const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                                      const discountAmount = getPlanPrice(selectedPlan) - getFinalPrice();
                                      const currency = regionalPrice?.currency || regionalPricing?.currency || 'USD';
                                      const isUSD = currency === 'USD';
                                      if (isUSD) {
                                        return `-${currencySymbol}${discountAmount.toFixed(2)}`;
                                      } else {
                                        const usdDiscountAmount = getUSDPlanPrice(selectedPlan) - getUSDFinalPrice();
                                        return `-$${usdDiscountAmount.toFixed(2)} (~${currencySymbol}${discountAmount.toFixed(2)})`;
                                      }
                                    })()}
                                  </>
                                ) : (
                                  <>
                                    {(() => {
                                      const regionalPrice = selectedPlan ? (selectedPlan as any).regionalPricing : null;
                                      const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                                      const currency = regionalPrice?.currency || regionalPricing?.currency || 'USD';
                                      const isUSD = currency === 'USD';
                                      return isUSD ? `-${currencySymbol}0.00` : `-$0.00 (~${currencySymbol}0.00)`;
                                    })()}
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Proration Credit Row */}
                            {(() => {
                              const prorationCredit = getSimulatedProrationCredit();
                              if (prorationCredit <= 0) return null;
                              return (
                                <div className="flex justify-between text-green-600 dark:text-lime-400 text-xs">
                                  <span>Proration Credit Applied</span>
                                  <span className="font-bold">
                                    -{getCurrencySymbol()}{prorationCredit.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Cost display split by upgrade/downgrade */}
                            {(() => {
                              const transitionInfo = getTransitionInfo(selectedPlan.key);
                              const currencySymbol = getCurrencySymbol();
                              
                              if (transitionInfo.isDowngrade) {
                                return (
                                  <>
                                    <div className="flex justify-between text-gray-900 dark:text-white font-black text-sm pt-2 border-t border-gray-200/50 dark:border-white/10">
                                      <span>Due Today</span>
                                      <span className="text-gray-500">
                                        {currencySymbol}0.00
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-gray-900 dark:text-white font-black text-base pt-1">
                                      <span>Next Renewal Rate</span>
                                      <span className="text-lime-600 dark:text-lime-400">
                                        {currencySymbol}{getFinalPrice().toFixed(2)}
                                      </span>
                                    </div>
                                    {userSubscription?.currentPeriodEnd && (
                                      <div className="text-[10px] text-gray-400 mt-1 text-center font-bold">
                                        Downgrade takes effect on: {new Date(userSubscription.currentPeriodEnd).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </div>
                                    )}
                                  </>
                                );
                              } else {
                                return (
                                  <div className="flex justify-between text-gray-900 dark:text-white font-black text-base pt-2 border-t border-gray-200/50 dark:border-white/10">
                                    <span>Total Amount</span>
                                    <span className="text-lime-600 dark:text-lime-400">
                                      {(() => {
                                        const regionalPrice = selectedPlan ? (selectedPlan as any).regionalPricing : null;
                                        const price = getFinalPrice().toFixed(2);
                                        const currency = regionalPrice?.currency || regionalPricing?.currency || 'USD';
                                        const isUSD = currency === 'USD';
                                        return isUSD ? `${currencySymbol}${price}` : `$${getUSDFinalPrice().toFixed(2)} (~${currencySymbol}${price})`;
                                      })()}
                                    </span>
                                  </div>
                                );
                              }
                            })()}

                          </div>

                          {/* Provider Health Status */}
                          {!getTransitionInfo(selectedPlan.key).isDowngrade && (
                            providerHealthLoading ? (
                              <div className="mb-4 p-3 bg-gray-100 dark:bg-white/5 rounded-lg text-sm text-gray-500 dark:text-white/40 flex items-center justify-center gap-2 max-w-md w-full mx-auto">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                                <span>Checking system status...</span>
                              </div>
                            ) : (
                              <>
                                {providerHealth.polar === false && (
                                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/30 rounded-lg max-w-md w-full mx-auto text-left">
                                    <div className="flex items-start gap-2">
                                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                          External System Check
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                                          Our automated check is taking longer than expected. You can still try to proceed, or try again in a few moments.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            )
                          )}

                          {/* Proceed to Payment Button */}
                          <button
                            onClick={handlePayment}
                            disabled={loading}
                            className="w-full max-w-md py-4 bg-[#80FF00] hover:bg-[#99ff33] text-black rounded-2xl font-black disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-all shadow-xl shadow-lime-500/20 active:scale-95 text-base flex items-center justify-center gap-3 mx-auto"
                          >
                            {loading ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                                <span>Securing Session...</span>
                              </>
                            ) : (
                              <>
                                <span>
                                  {(() => {
                                    if (selectedPlan?.key === 'starter_monthly') return 'Subscribe for Free';
                                    if (getTransitionInfo(selectedPlan.key).isDowngrade) return 'Schedule Downgrade';
                                    return 'Secure Checkout';
                                  })()}
                                </span>
                                <ArrowRight className="w-5 h-5" />
                              </>
                            )}
                          </button>

                          {/* Terms and Conditions */}
                          <div className="mt-4 text-center max-w-md mx-auto">
                            <p className="text-[10px] text-gray-500 dark:text-white/40 leading-relaxed">
                              By proceeding, you agree to our{' '}
                              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-lime-600 dark:text-[rgb(129,255,0)] hover:underline">
                                Terms of Service
                              </a>{' '}and{' '}
                              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-lime-600 dark:text-[rgb(129,255,0)] hover:underline">
                                Privacy Policy
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                </div>
              </div>
            </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default UniversalPaymentModal;
