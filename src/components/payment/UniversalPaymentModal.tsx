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
        if (plan.key === 'pro_monthly') {
          planPrice = dbPlan.price_monthly || 0;
        } else if (plan.key === 'pro_quarterly') {
          planPrice = dbPlan.price_quarterly || 0;
        } else if (plan.key === 'pro_yearly') {
          planPrice = dbPlan.price_yearly || 0;
        } else if (plan.key === 'pro_lifetime') {
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
        p.key === 'pro_monthly' || p.key === 'pro_quarterly' || p.key === 'pro_yearly' || p.key === 'pro_lifetime'
      );

      // Fallback to first paid plan (not free)
      const paidPlan = professionalPlan || pricingPlans.find((p: PricingPlan) => p.key !== 'free');

      if (paidPlan) {
        // Attach regional pricing to default plan
        const dbPlan = paidPlan as unknown as DatabasePricingPlan;
        // Determine the correct price based on plan key and billing interval
        let planPrice = 0;
        if (paidPlan.key === 'pro_monthly') {
          planPrice = dbPlan.price_monthly || 0;
        } else if (paidPlan.key === 'pro_quarterly') {
          planPrice = dbPlan.price_quarterly || 0;
        } else if (paidPlan.key === 'pro_yearly') {
          planPrice = dbPlan.price_yearly || 0;
        } else if (paidPlan.key === 'pro_lifetime') {
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
    
    if (plan.key.includes('pro_monthly')) {
      return (hasPromo && promotional.pricing.monthly) ? promotional.pricing.monthly : (dbPlan.price_monthly || 12.99);
    } else if (plan.key.includes('pro_quarterly')) {
      return (hasPromo && promotional.pricing.quarterly) ? promotional.pricing.quarterly : (dbPlan.price_quarterly || 34.99);
    } else if (plan.key.includes('pro_yearly')) {
      return (hasPromo && promotional.pricing.yearly) ? promotional.pricing.yearly : (dbPlan.price_yearly || 99.00);
    } else if (plan.key.includes('pro_lifetime')) {
      return (hasPromo && promotional.pricing.oneTime) ? promotional.pricing.oneTime : (dbPlan.price_one_time || 199.00);
    } else if (plan.key === 'focused_monthly') {
      return 9.99;
    } else if (plan.key === 'focused_yearly') {
      return 79.99;
    } else if (plan.key === 'smart_quaterly') {
      return 59.99;
    } else if (plan.key === 'smart_yearly') {
      return 199.00;
    } else if (plan.key === 'starter_yealry') {
      return 39.99;
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
    if (plan.key === 'pro_quarterly') return 'quarterly';
    if (plan.key === 'pro_yearly') return 'yearly';
    if (plan.key === 'pro_lifetime') return 'lifetime';
    if (plan.key === 'pro_monthly') return 'monthly';
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

          if (data.zero_amount && data.success) {
            onSuccess?.(data.subscription);
            alert(data.message || 'Plan activated successfully. No payment was required.');
            onClose();
            if (returnUrl) {
              window.location.href = returnUrl;
            } else {
              window.location.reload();
            }
            return;
          }

          // Polar Checkout — always redirect
          if (data.url) {
            window.location.href = data.url;
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

    const planOrder = { free: 0, pro_monthly: 1, pro_quarterly: 2, pro_yearly: 3, pro_lifetime: 4 };
    return planOrder[plan.key as keyof typeof planOrder] > planOrder[currentUserPlan as keyof typeof planOrder];
  };

  // Get plan icon component (matching landing page)
  const getPlanIcon = (planKey: string) => {
    const key = planKey.toLowerCase();
    if (key === 'free') return Brain;
    if (key.includes('starter')) return Target;
    if (key.includes('focused')) return Sparkles;
    if (key.includes('smart')) return Zap;
    
    switch (key) {
      case 'pro_monthly': return Crown;
      case 'pro_quarterly': return Users;
      case 'pro_yearly': return Globe;
      case 'pro_lifetime': return Star;
      default: return Brain;
    }
  };

  const getPlanColor = (planKey: string) => {
    const key = planKey.toLowerCase();
    if (key.includes('focused')) return 'text-lime-500 bg-lime-500/10';
    if (key.includes('smart')) return 'text-purple-500 bg-purple-500/10';
    
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

          {/* Modal Container - Centered with backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose?.()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative flex bg-white dark:bg-[#141810] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button - Moved to outer container */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 tablet:top-6 tablet:right-6 p-2 bg-white/80 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 rounded-full transition-all flex-shrink-0 z-[100] shadow-sm hover:shadow-md active:scale-95"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-800 dark:text-white" />
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
                className="w-full tablet:w-[38%] bg-[#f3f2ee] dark:bg-[#141810] overflow-y-auto hidden tablet:block"
              >
                <div className="p-6 tablet:p-10 max-w-2xl mx-auto h-full flex flex-col bg-[#f3f2ee] dark:bg-[#141810] rounded-l-2xl">
                {/* Logo & Main Heading Combined */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Logo size="sm" />
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Premium Toolkit</span>
                  </div>
                  <h1 className="text-2xl tablet:text-3xl font-bold mb-3 text-gray-900 dark:text-white">
                    Unlock Your Full Career Potential
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    All-in-one solution for your career growth. Create professional CVs, optimize for ATS systems, and track your job applications.
                  </p>
                </div>

                {/* Premium Toolkit Section - More Compact Grid */}
                <div className="mb-6 flex-1">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-lime-500" />
                    <span>EVERYTHING YOU NEED TO SUCCEED</span>
                  </h2>
                  <ul className="grid grid-cols-1 tablet:grid-cols-2 gap-x-6 gap-y-4">
                    <li className="flex items-start gap-2">
                      <div className="p-1 rounded bg-gray-100 dark:bg-white/5 mt-0.5">
                        <FileText className="w-3.5 h-3.5 text-gray-600 dark:text-lime-500" />
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                        <strong className="text-gray-900 dark:text-white block mb-0.5 text-[11px]">Dynamic Layout System</strong>
                        Smart snippet system to create unlimited, tailored resume templates.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="p-1 rounded bg-gray-100 dark:bg-white/5 mt-0.5">
                        <Target className="w-3.5 h-3.5 text-gray-600 dark:text-lime-500" />
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                        <strong className="text-gray-900 dark:text-white block mb-0.5 text-[11px]">Precision Job Pipeline</strong>
                        Real-time stage tracking with AI-generated follow-up & email suggestions.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="p-1 rounded bg-gray-100 dark:bg-white/5 mt-0.5">
                        <Globe className="w-3.5 h-3.5 text-gray-600 dark:text-lime-500" />
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                        <strong className="text-gray-900 dark:text-white block mb-0.5 text-[11px]">One-Click Sourcing</strong>
                        Save roles via extension or paste directly with instant AI insights.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="p-1 rounded bg-gray-100 dark:bg-white/5 mt-0.5">
                        <Zap className="w-3.5 h-3.5 text-gray-600 dark:text-lime-500" />
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                        <strong className="text-gray-900 dark:text-white block mb-0.5 text-[11px]">Automated Tailoring</strong>
                        Save a job and get a perfectly matched CV & Cover Letter instantly.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="p-1 rounded bg-gray-100 dark:bg-white/5 mt-0.5 flex items-center justify-center">
                        <span className="text-[10px] font-black text-gray-600 dark:text-lime-500 leading-none">in</span>
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                        <strong className="text-gray-900 dark:text-white block mb-0.5 text-[11px]">LinkedIn Optimizer</strong>
                        Visual, section-by-section guide to perfecting your professional profile.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="p-1 rounded bg-gray-100 dark:bg-white/5 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-gray-600 dark:text-lime-500" />
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                        <strong className="text-gray-900 dark:text-white block mb-0.5 text-[11px]">AI Interview Simulator</strong>
                        Role-specific mock interviews with real-time performance feedback.
                      </div>
                    </li>
                    <li className="col-span-1 tablet:col-span-2 flex items-start gap-2 p-2 bg-purple-500/5 rounded-lg border border-purple-500/10">
                      <div className="p-1 rounded bg-purple-500/10 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                        <strong className="text-gray-900 dark:text-white flex items-center gap-2 mb-0.5 text-[11px]">
                          Autonomous Applications
                          <span className="text-[8px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Coming Soon</span>
                        </strong>
                        Relax while CVCircle completes the 'Whole Circle' of your job hunt autonomously.
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Live Testimonials - Side-by-Side */}
                <div className="mb-6 pt-6 border-t border-gray-200 dark:border-white/10">
                  <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">SUCCESS STORIES</h2>
                  <div className="grid grid-cols-1 desktop:grid-cols-2 gap-4">
                    <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 italic mb-2 leading-relaxed">
                        "CVCircle doubled my interview callbacks in just two weeks!"
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-lime-500 flex items-center justify-center text-[9px] font-bold text-black flex-shrink-0">
                          S
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate">Sarah B.</p>
                          <p className="text-[8px] text-gray-500 truncate">Sales Director</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 italic mb-2 leading-relaxed">
                        "The AI Interview Coach helped me land my dream role."
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                          A
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate">Aisha T.</p>
                          <p className="text-[8px] text-gray-500 truncate">Recent Graduate</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trust Elements - Bottom */}
                {/* Trust Elements moved to right panel */}
                <div className="mt-auto border-t border-gray-200" />
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
              className="w-full tablet:w-[62%] bg-[#f3f2ee] dark:bg-[#141810] overflow-y-auto"
            >
              <div className="p-4 tablet:p-6 max-w-5xl mx-auto bg-[#f3f2ee] dark:bg-[#141810] rounded-lg">

                {/* Header */}
                {/* Header moved inside plans container */}

                {/* Content */}
                <div className="space-y-6">
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

                        const currentPlan = pricingPlans.find((plan: PricingPlan) => isCurrentPlan(plan));

                        // Filter plans based on selected billing cycle
                        const subscriptionPlans = availablePlans.filter(plan => {
                          const key = plan.key.toLowerCase();
                          if (billingCycle === 'yearly') {
                            return key.includes('yearly') || key.includes('yealry') || key.includes('lifetime');
                          } else {
                            return key.includes('monthly') || key.includes('quarterly') || key.includes('quaterly');
                          }
                        });

                        // Fallback: if no plans for selected cycle, show all
                        const displayPlans = subscriptionPlans.length > 0 ? subscriptionPlans : availablePlans;

                        return (
                          <div className="flex flex-col gap-4 bg-gray-50 dark:bg-[#1A201A] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 max-w-[42rem] mx-auto w-full transition-all duration-300">

                            {/* --- HEADER MOVED INSIDE --- */}
                            <div className="flex flex-col tablet:flex-row tablet:items-center justify-between gap-3 mb-2 px-2">
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
                                    <span className="bg-lime-500 text-black text-[9px] px-1.5 py-0.5 rounded-md font-black">SAVE 25%</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* --- CURRENT PLAN MOVED INSIDE --- */}
                            {currentPlan && !adminMode && (
                              <div className="mx-2 p-3 bg-white dark:bg-[#232f1c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
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
                              <div className="grid grid-cols-1 tablet:grid-cols-3 gap-3 px-2">
                                {displayPlans.map((plan) => {
                                  const dbPlan = plan as unknown as DatabasePricingPlan;
                                  const regionalPrice = getRegionalPrice(dbPlan);
                                  const currencySymbol = getCurrencySymbol();
                                  const effectivePrice = getEffectivePrice(dbPlan);
                                  const monthlyEquivalent = getMonthlyEquivalent(dbPlan);
                                  const isSelected = selectedPlan?.key === plan.key;
                                  const Icon = getPlanIcon(plan.key);
                                  const isFocused = plan.key.includes('focused');

                                  const displayPrice = monthlyEquivalent.showMonthly ? monthlyEquivalent.price : (regionalPrice || `${currencySymbol}${effectivePrice}`);
                                  const totalAmount = regionalPrice || `${currencySymbol}${effectivePrice}`;
                                  const totalText = monthlyEquivalent.showMonthly 
                                    ? `${totalAmount} total`
                                    : '';

                                  return (
                                    <div
                                      key={plan.key}
                                      onClick={() => {
                                        setUserChangedPlan(true);
                                        setSelectedPlan(plan);
                                      }}
                                      className={`group relative flex flex-col p-5 rounded-3xl border-2 transition-all duration-300 cursor-pointer ${
                                        isFocused
                                          ? 'bg-gray-900 border-gray-900 dark:bg-[#1A201A] dark:border-lime-500/50 shadow-xl scale-[1.02] z-10'
                                          : isSelected
                                            ? 'border-lime-500 bg-white dark:bg-[#1A201A]'
                                            : 'border-gray-200 hover:border-gray-300 dark:border-white/5 bg-white dark:bg-white/5'
                                      }`}
                                    >
                                      {/* Selection Indicator & Badge */}
                                      {isFocused && (
                                        <div className="absolute top-4 right-4 text-lime-500 bg-lime-500/10 rounded-full p-0.5">
                                          <CheckCircle className="w-5 h-5" />
                                        </div>
                                      )}
                                      
                                      <div className={`p-2 w-fit rounded-xl mb-4 ${
                                        isFocused ? 'bg-lime-500/20 text-lime-500' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                                      }`}>
                                        <Icon size={18} />
                                      </div>

                                      <div className="mb-6">
                                        <h3 className={`font-bold text-lg mb-1 ${isFocused ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                          {plan.name.replace(' Monthly', '').replace(' Yearly', '').replace(' Quarterly', '')}
                                        </h3>
                                        {isFocused && (
                                          <span className="text-[9px] bg-lime-500 text-black px-2 py-0.5 rounded-md font-black uppercase tracking-wider mb-2 inline-block">
                                            Most Popular
                                          </span>
                                        )}
                                        
                                        <div className="flex items-baseline gap-1 mt-2">
                                          <span className={`text-3xl font-black ${isFocused ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                            {displayPrice.split('/')[0]}
                                          </span>
                                          <span className={`text-xs font-bold ${isFocused ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {monthlyEquivalent.showMonthly ? '/mo' : plan.key.includes('lifetime') ? '/one-time' : '/period'}
                                          </span>
                                        </div>
                                        {totalText && (
                                          <p className={`text-[10px] font-bold mt-1 ${isFocused ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {totalText}
                                          </p>
                                        )}
                                      </div>

                                      {/* Feature Tags */}
                                      <div className="flex-1 space-y-3 mb-8">
                                        {plan.features.slice(0, 4).map((feature, i) => (
                                          <div key={i} className="flex items-start gap-2">
                                            <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${isFocused ? 'text-lime-500' : 'text-lime-500'}`} />
                                            <span className={`text-[11px] font-bold leading-tight ${isFocused ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                              {feature.split(':')[0]}
                                            </span>
                                          </div>
                                        ))}
                                      </div>

                                      <button className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                                        isFocused 
                                          ? 'bg-lime-500 hover:bg-lime-600 text-black shadow-lg shadow-lime-500/20' 
                                          : 'border border-lime-500/50 text-lime-600 dark:text-lime-400 hover:bg-lime-500/5'
                                      }`}>
                                        Choose Plan
                                      </button>
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
                                className="w-full tablet:w-auto px-16 py-4 bg-[#80FF00] hover:bg-[#99ff33] text-black rounded-2xl font-black disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-all shadow-xl shadow-lime-500/20 active:scale-95 text-base flex items-center justify-center gap-3"
                              >
                                <Shield className="w-5 h-5 opacity-50" />
                                <span>Continue to Payment</span>
                              </button>
                              <div className="mt-3 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Shield className="w-3.5 h-3.5 text-lime-500" />
                                <span className="text-[10px] font-bold">Secure payments. Cancel anytime.</span>
                              </div>
                            </div>

                          </div>
                        );
                      })()}

                      {/* Trust Elements Footer (Simplified) */}
                      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5">
                        <div className="grid grid-cols-2 gap-8 mb-6 max-w-[36rem] mx-auto">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-green-500/10 mt-1">
                              <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">100% Satisfaction</span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Full refund if not satisfied. No questions asked.</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 mt-1">
                              <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">No Obligation</span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Switch anytime if you find a better price.</span>
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
                      <>
                        {/* Back Button */}
                        <button
                          onClick={() => setStep(1)}
                          className="flex items-center text-sm tablet:text-base text-gray-600 hover:text-gray-900 mb-4 tablet:mb-6"
                        >
                          <span className="hidden tablet:inline">← Back to Plans</span>
                          <span className="tablet:hidden">← Back</span>
                        </button>

                        {/* Single Column Layout for Side Panel */}
                        <div className="flex flex-col gap-4 tablet:gap-6">
                          {/* Order Summary */}
                          <div className="p-4 tablet:p-6 flex flex-col bg-gray-50 dark:bg-[#232f1c] rounded-2xl border border-gray-200 dark:border-lime-500/20">
                            {/* Title */}
                            <h2 className="text-2xl tablet:text-3xl font-bold text-gray-900 dark:text-white mb-4 tablet:mb-6">
                              Complete Your Order
                            </h2>

                            {/* Plan Details Box */}
                            <div className="rounded-lg p-3 tablet:p-4 mb-4 tablet:mb-6 bg-white dark:bg-[#232f1c] border border-gray-200 dark:border-lime-500/20">
                              <div className="mb-2">
                                <h3 className="text-lg tablet:text-xl font-bold text-gray-900 dark:text-white mb-1">
                                  {(() => {
                                    if (!selectedPlan) return 'No Plan Selected';
                                    if (selectedPlan.key === 'pro_lifetime') return 'Pro Annual Plan';
                                    if (selectedPlan.key === 'pro_yearly') return 'Pro Yearly Plan';
                                    if (selectedPlan.key === 'pro_quarterly') return 'Pro Quarterly Plan';
                                    if (selectedPlan.key === 'pro_monthly') return 'Pro Monthly Plan';
                                    return selectedPlan.name || `Plan ${selectedPlan.key}`;
                                  })()}
                                </h3>
                                <p className="text-gray-600 dark:text-white/60 text-xs tablet:text-sm">
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
                              <div className="text-xl tablet:text-2xl font-bold text-gray-900 dark:text-white">
                                {(() => {
                                  if (!selectedPlan) return 'N/A';
                                  const regionalPrice = (selectedPlan as any).regionalPricing;
                                  const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                                  const price = getPlanPrice(selectedPlan).toFixed(2);
                                  const currency = regionalPrice?.currency || regionalPricing?.currency || 'USD';
                                  const isUSD = currency === 'USD';
                                  return isUSD ? `${currencySymbol}${price}` : `$${getUSDPlanPrice(selectedPlan).toFixed(2)} (~${currencySymbol}${price})`;
                                })()}
                              </div>
                            </div>

                            {/* Coupon Code Section */}
                            <div className="mb-4 tablet:mb-6">
                              <p className="text-gray-900 dark:text-white mb-2 tablet:mb-3 text-xs tablet:text-sm font-medium">Have a coupon code?</p>
                              <div className="flex flex-col tablet:flex-row gap-2">
                                <input
                                  type="text"
                                  value={discountCode}
                                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                  placeholder="Enter code here"
                                  className="flex-1 px-3 tablet:px-4 py-2 tablet:py-2.5 rounded-lg text-sm tablet:text-base bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 border border-gray-300 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-500 dark:focus:ring-[#80FF00]/50 focus:border-lime-500 dark:focus:border-[#80FF00]/50 transition-colors"
                                />
                                <button
                                  onClick={applyDiscountCode}
                                  disabled={!discountCode.trim() || loading}
                                  className="w-full tablet:w-auto px-4 tablet:px-6 py-2 tablet:py-2.5 bg-gray-800 dark:bg-lime-500 hover:bg-gray-900 dark:hover:bg-lime-600 text-white dark:text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm tablet:text-base"
                                >
                                  Apply
                                </button>
                              </div>

                              {appliedDiscount && (
                                <div className="mt-3 flex items-center justify-between rounded-lg p-3 bg-lime-50 dark:bg-lime-900/20 border border-lime-300 dark:border-lime-500/30">
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
                            <div className="mb-4 tablet:mb-6 space-y-2 tablet:space-y-3">
                              <div className="flex justify-between text-gray-900 dark:text-white text-sm tablet:text-base">
                                <span>Subtotal</span>
                                <span>
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

                              <div className="flex justify-between text-gray-900 dark:text-white text-sm tablet:text-base">
                                <span>Discount</span>
                                <span className={appliedDiscount ? 'text-green-600 dark:text-lime-400' : 'text-gray-600 dark:text-white/60'}>
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

                              <div className="flex justify-between text-gray-900 dark:text-white font-bold text-base tablet:text-lg pt-2 border-t border-gray-200 dark:border-lime-500/20">
                                <span>Total</span>
                                <span className="text-blue-600 dark:text-lime-400">
                                  {(() => {
                                    const regionalPrice = selectedPlan ? (selectedPlan as any).regionalPricing : null;
                                    const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                                    const price = getFinalPrice().toFixed(2);
                                    const currency = regionalPrice?.currency || regionalPricing?.currency || 'USD';
                                    const isUSD = currency === 'USD';
                                    return isUSD ? `${currencySymbol}${price}` : `$${getUSDFinalPrice().toFixed(2)} (~${currencySymbol}${price})`;
                                  })()}
                                </span>
                              </div>
                            </div>

                            {/* Provider Health Status */}
                            {providerHealthLoading ? (
                              <div className="mb-4 p-3 bg-gray-100 dark:bg-white/5 rounded-lg text-sm text-gray-500 dark:text-white/40 flex items-center gap-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                                Checking system status...
                              </div>
                            ) : (
                              <>
                                {providerHealth.polar === false && (
                                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
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
                            )}

                            {/* Proceed to Payment Button */}
                            <button
                              onClick={handlePayment}
                              disabled={loading}
                              className="w-full py-4 tablet:py-4 bg-gray-900 dark:bg-[#80FF00] hover:bg-gray-800 dark:hover:bg-[#99ff33] text-white dark:text-black font-black uppercase tracking-tighter italic rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 mt-auto text-base shadow-xl shadow-lime-500/10 active:scale-95"
                            >
                              {loading ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                                  <span>Securing Session...</span>
                                </>
                              ) : (
                                <>
                                  <span>Secure Checkout</span>
                                  <ArrowRight className="w-5 h-5" />
                                </>
                              )}
                            </button>
                            {/* Terms and Conditions */}
                            <div className="mt-4 text-center">
                              <p className="text-xs text-gray-600 dark:text-white/60">
                                By proceeding, you agree to our{' '}
                                <a
                                  href="/terms"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-lime-600 dark:text-[rgb(129,255,0)] hover:underline"
                                >
                                  Terms of Service
                                </a>
                                {' '}and{' '}
                                <a
                                  href="/privacy-policy"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-lime-600 dark:text-[rgb(129,255,0)] hover:underline"
                                >
                                  Privacy Policy
                                </a>
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
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
