'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CreditCard, Zap, Star, Shield, Crown, Gift, Brain, Users, Globe, ArrowRight, Target, BarChart3, Download, FileText, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'razorpay'>('stripe');
  const [currentUserPlan, setCurrentUserPlan] = useState<string>(propCurrentUserPlan || 'free');
  const [userCurrentPlan, setUserCurrentPlan] = useState<any>(null);
  const [showPromotionalPricing, setShowPromotionalPricing] = useState(false);
  const [providerHealth, setProviderHealth] = useState<{
    stripe: boolean | null;
    razorpay: boolean | null;
  }>({ stripe: null, razorpay: null });
  const [providerHealthLoading, setProviderHealthLoading] = useState(false);
  const [userChangedPlan, setUserChangedPlan] = useState(false); // Track if user manually changed plan
  const [isDayPassOpen, setIsDayPassOpen] = useState(false);

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
          } else if (plan.key === 'day_pass') {
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
        p.key === 'pro_monthly' || p.key === 'pro_quarterly' || p.key === 'pro_yearly'
      );

      // If no professional plan, try day pass
      const dayPassPlan = pricingPlans.find((p: PricingPlan) => p.key === 'day_pass');

      // Fallback to first paid plan (not free)
      const paidPlan = professionalPlan || dayPassPlan || pricingPlans.find((p: PricingPlan) => p.key !== 'free');

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
        } else if (paidPlan.key === 'day_pass') {
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

  // Set payment provider based on location data from hook
  useEffect(() => {
    if (locationData) {
      setPaymentProvider(locationData.paymentPartner);
    }
  }, [locationData]);

  // Check provider health when modal opens
  useEffect(() => {
    const checkProviderHealth = async (provider: 'stripe' | 'razorpay') => {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`/api/payment/${provider}/health`, {
          signal: controller.signal,
          cache: 'no-store', // Prevent caching of health check results
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
        const [stripeHealthy, razorpayHealthy] = await Promise.all([
          checkProviderHealth('stripe'),
          checkProviderHealth('razorpay')
        ]);

        setProviderHealth({
          stripe: stripeHealthy,
          razorpay: razorpayHealthy
        });

        // Auto-switch to healthy provider if current provider is down
        if (paymentProvider === 'stripe' && !stripeHealthy && razorpayHealthy) {
          console.warn('Stripe is down, switching to Razorpay');
          setPaymentProvider('razorpay');
        } else if (paymentProvider === 'razorpay' && !razorpayHealthy && stripeHealthy) {
          console.warn('Razorpay is down, switching to Stripe');
          setPaymentProvider('stripe');
        }
      } catch (error) {
        console.error('Error checking provider health:', error);
      } finally {
        setProviderHealthLoading(false);
      }
    };

    checkAllProviders();
  }, [isOpen, paymentProvider]);

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

  // Load Razorpay Checkout script
  useEffect(() => {
    if (paymentProvider === 'razorpay' && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        // Cleanup script on unmount
        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
          document.body.removeChild(existingScript);
        }
      };
    }
  }, [paymentProvider]);

  const handleRazorpayCheckout = async (checkoutData: any) => {
    try {
      // Get user information for prefill (if available)
      let userName = '';
      let userEmail = '';
      let userContact = '';

      try {
        const userResponse = await fetch('/api/user/current');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.user) {
            userName = `${userData.user.firstName || ''} ${userData.user.lastName || ''}`.trim() || userData.user.email || '';
            userEmail = userData.user.email || '';
            userContact = userData.user.phone || '';
          }
        }
      } catch (err) {
        console.warn('Could not fetch user info for prefill:', err);
      }

      // According to Razorpay docs: amount should be in currency subunits (paise for INR)
      // The amount from server is already in paise, ensure it's a number
      const amount = typeof checkoutData.amount === 'string'
        ? parseInt(checkoutData.amount, 10)
        : Math.round(checkoutData.amount);

      if (!amount || amount <= 0) {
        setLoading(false);
        alert('No payment is required for this coupon. Your plan should be active shortly.');
        return;
      }

      // Razorpay checkout.js expects uppercase currency code (ISO 4217 format)
      const currency = (checkoutData.currency || 'INR').toUpperCase();

      // For subscriptions, use subscription_id; for orders, use order_id
      const isSubscription = !!checkoutData.subscription_id;

      const options: any = {
        key: checkoutData.key_id || '',
        name: 'CV Circle',
        description: `${selectedPlan?.name} Subscription`,
        theme: {
          color: '#84cc16' // lime-500
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        },
        // Handle payment failure
        'onPayment.failed': function (response: any) {
          console.error('Payment failed:', response);
          setLoading(false);
          alert(`Payment failed: ${response.error?.description || response.error?.reason || 'Unknown error'}. Please try again.`);
        },
        handler: async function (response: any) {
          // Payment successful - verify signature and poll for subscription activation
          try {
            setLoading(true);

            // Step 1: Verify payment signature
            // For subscriptions, use subscription_id; for orders, use order_id
            const verifyBody: any = {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planKey: selectedPlan?.key,
              interval: selectedPlan ? getBillingInterval(selectedPlan) : 'monthly',
              couponId: checkoutData.coupon?.id
            };

            if (isSubscription) {
              verifyBody.razorpay_subscription_id = response.razorpay_subscription_id || checkoutData.subscription_id;
            } else {
              verifyBody.razorpay_order_id = response.razorpay_order_id || checkoutData.order_id;
            }

            const verifyResponse = await fetch('/api/payment/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(verifyBody)
            });

            const verifyData = await verifyResponse.json();

            if (!verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            // Step 2: If already processed, return immediately
            if (verifyData.alreadyProcessed && verifyData.subscription) {
              onSuccess?.(verifyData.subscription);
              setLoading(false);
              return;
            }

            // Step 3: If pending, poll for subscription activation (webhook processes it)
            if (verifyData.pending) {
              console.log('Payment verified, waiting for webhook to activate subscription...');

              // Poll for subscription status (webhook should activate within 1-2 seconds)
              const maxAttempts = 20; // 20 attempts = ~60 seconds max wait
              const pollInterval = 3000; // Poll every 3 seconds
              let attempts = 0;

              const pollSubscription = async (): Promise<any> => {
                attempts++;

                try {
                  const subscriptionResponse = await fetch('/api/user/subscription', {
                    credentials: 'include',
                    cache: 'no-store'
                  });

                  if (subscriptionResponse.ok) {
                    const subscriptionData = await subscriptionResponse.json();

                    if (subscriptionData.success && subscriptionData.subscription) {
                      const currentPlanKey = subscriptionData.subscription.planKey;
                      const expectedPlanKey = selectedPlan?.key;

                      // Check if the plan has been activated
                      if (currentPlanKey === expectedPlanKey && currentPlanKey !== 'free') {
                        console.log('Subscription activated!', subscriptionData.subscription);
                        return subscriptionData.subscription;
                      }
                    }
                  }

                  // If not activated yet and haven't exceeded max attempts, continue polling
                  if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                    return pollSubscription();
                  } else {
                    // Timeout - subscription not activated yet
                    throw new Error('Subscription activation is taking longer than expected. Please refresh the page in a few moments.');
                  }
                } catch (pollError) {
                  if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                    return pollSubscription();
                  }
                  throw pollError;
                }
              };

              try {
                const activatedSubscription = await pollSubscription();
                onSuccess?.(activatedSubscription);
              } catch (pollError) {
                console.error('Error polling for subscription:', pollError);
                // Show user-friendly message
                alert('Payment verified successfully! Your subscription is being activated. Please refresh the page in a few moments to see your updated plan.');
                // Still call onSuccess to close the modal
                onSuccess?.({ planKey: selectedPlan?.key, status: 'pending' });
              }
            } else {
              // Already processed case (shouldn't reach here, but handle it)
              onSuccess?.(verifyData.subscription || { planKey: selectedPlan?.key });
            }

            setLoading(false);
          } catch (error) {
            console.error('Payment verification error:', error);
            setLoading(false);
            const errorMsg = error instanceof Error ? error.message : 'Payment verification failed';
            alert(`Payment Error: ${errorMsg}. Please contact support if the issue persists.`);
          }
        },
        prefill: {
          name: userName,
          email: userEmail,
          contact: userContact, // Phone number improves conversion rates per Razorpay docs
        }
      };

      // Set subscription_id or order_id based on what's available
      if (isSubscription) {
        options.subscription_id = checkoutData.subscription_id;
        // For subscriptions, amount and currency come from the subscription plan
        // But we can still set them for display purposes
        if (amount > 0) {
          options.amount = amount;
          options.currency = currency;
        }
      } else {
        options.order_id = checkoutData.order_id; // Mandatory: Order ID from server
        options.amount = amount; // Amount in currency subunits (paise for INR)
        options.currency = currency; // Razorpay checkout expects uppercase currency (e.g., 'INR')
      }

      // Validate required fields per Razorpay documentation
      if (!options.key) {
        console.error('Razorpay key ID is missing from checkout response:', checkoutData);
        throw new Error('Razorpay key ID is missing. Please contact support or try again.');
      }
      if (!isSubscription && !options.order_id) {
        throw new Error('Order ID is missing');
      }
      if (isSubscription && !options.subscription_id) {
        throw new Error('Subscription ID is missing');
      }
      // For orders, amount and currency are required; for subscriptions, they're optional
      if (!isSubscription) {
        if (!amount || amount <= 0) {
          throw new Error('Invalid payment amount');
        }
        if (!options.currency || options.currency.length !== 3) {
          throw new Error('Invalid currency code');
        }
      }

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Razorpay checkout error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to open Razorpay checkout';
      alert(`Payment Error: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  };

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
    // This should already contain the full price for quarterly/yearly plans
    const regionalPrice = (plan as any).regionalPricing;
    if (regionalPrice?.price) {
      // Use promotional pricing if available, but ensure we use the correct interval price
      const promotional = getPromotionalPricing(plan);
      if (promotional && promotional.pricing) {
        // For quarterly/yearly, use the full price, not monthly equivalent
        if (plan.key === 'pro_quarterly' && promotional.pricing.quarterly) {
          return promotional.pricing.quarterly;
        }
        if (plan.key === 'pro_yearly' && promotional.pricing.yearly) {
          return promotional.pricing.yearly;
        }
        if (plan.key === 'pro_monthly' && promotional.pricing.monthly) {
          return promotional.pricing.monthly;
        }
        // Fallback to regional price which should already be the correct full price
        return regionalPrice.price;
      }
      // Regional price should already be the full price for the selected plan
      return regionalPrice.price;
    }

    // Fallback: Get price from plan based on key - use FULL price for quarterly/yearly
    const dbPlan = plan as unknown as DatabasePricingPlan;
    let planPrice = 0;
    if (plan.key === 'pro_monthly') {
      planPrice = dbPlan.price_monthly || 0;
    } else if (plan.key === 'pro_quarterly') {
      // Use full quarterly price (one-time charge)
      planPrice = dbPlan.price_quarterly || 0;
    } else if (plan.key === 'pro_yearly') {
      // Use full yearly price (one-time charge)
      planPrice = dbPlan.price_yearly || 0;
    } else if (plan.key === 'day_pass') {
      planPrice = dbPlan.price_one_time || 0;
    } else {
      // Fallback to effective price from hook
      planPrice = getEffectivePrice(dbPlan) || 0;
    }

    return planPrice;
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

  const getBillingInterval = (plan: PricingPlan) => {
    if (plan.key === 'day_pass') return 'one-time';
    if (plan.key === 'free') return 'free';
    // Determine interval from plan key first, then fallback to billingCycle
    if (plan.key === 'pro_quarterly') return 'quarterly';
    if (plan.key === 'pro_yearly') return 'yearly';
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
        // Regular payment flow
        const body = {
          planKey: selectedPlan.key,
          interval: getBillingInterval(selectedPlan),
          discountCode: appliedDiscount?.code || undefined,
          couponCode: appliedDiscount?.code || undefined,
          provider: paymentProvider,
          returnUrl: returnUrl || window.location.href,
          triggerContext
        };

        const response = await fetch('/api/checkout/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
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

          if (data.redirect_url) {
            // Stripe Checkout - redirect to Stripe
            window.location.href = data.redirect_url;
          } else if (data.provider === 'razorpay' && data.checkout && (data.order_id || data.subscription_id)) {
            // Razorpay Checkout - open embedded form (supports both orders and subscriptions)
            await handleRazorpayCheckout(data);
          } else if (data.client_secret) {
            // Handle Stripe payment intent
            console.log('Stripe payment intent:', data.client_secret);
          }
        } else {
          let errorMessage = 'Failed to create checkout session';
          let shouldRetryWithStripe = false;

          // Clone the response to read it multiple times if needed
          const responseClone = response.clone();
          const contentType = response.headers.get('content-type');
          let errorData: any = {};

          try {
            if (contentType && contentType.includes('application/json')) {
              errorData = await response.json();

              // Only log if errorData has meaningful content
              if (errorData && Object.keys(errorData).length > 0) {
                console.error('Checkout session error:', errorData);
                errorMessage = errorData.error || errorData.details || errorData.message || errorMessage;
              } else {
                // Empty object response
                console.error('Checkout session error - Empty response:', {
                  status: response.status,
                  statusText: response.statusText,
                  url: response.url
                });
                errorMessage = `Server error (${response.status}): ${response.statusText || 'Empty response received'}`;
              }
            } else {
              // Not JSON, try to get text
              const errorText = await response.text();
              errorMessage = `Server error (${response.status}): ${errorText || response.statusText || 'Unknown error'}`;
              console.error('Checkout session error - Non-JSON response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText.substring(0, 200)
              });
            }

            // If currency is not supported by Razorpay, automatically retry with Stripe
            if (errorData && errorData.unsupportedCurrency && errorData.suggestedProvider === 'stripe' && paymentProvider === 'razorpay') {
              console.log('Currency not supported by Razorpay, switching to Stripe');
              shouldRetryWithStripe = true;
              setPaymentProvider('stripe');

              // Retry the payment with Stripe
              const retryBody = {
                planKey: selectedPlan?.key,
                interval: selectedPlan ? getBillingInterval(selectedPlan) : 'monthly',
                discountCode: appliedDiscount?.code || undefined,
                couponCode: appliedDiscount?.code || undefined,
                provider: 'stripe',
                returnUrl: returnUrl || window.location.href,
                triggerContext
              };

              const retryResponse = await fetch('/api/checkout/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Include cookies for authentication
                body: JSON.stringify(retryBody)
              });

              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                if (retryData.redirect_url) {
                  window.location.href = retryData.redirect_url;
                  return; // Exit early, redirecting to Stripe
                }
              }
            }
          } catch (parseError) {
            // If we can't parse the response, try to get text from clone
            try {
              const errorText = await responseClone.text();
              console.error('Failed to parse error response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText.substring(0, 200),
                parseError
              });
              errorMessage = `Server error (${response.status}): ${errorText.substring(0, 100) || response.statusText || 'Failed to parse response'}`;
            } catch (textError) {
              // Last resort - use status only
              console.error('Failed to read error response:', {
                status: response.status,
                statusText: response.statusText,
                parseError,
                textError
              });
              errorMessage = `Server error (${response.status}): ${response.statusText || 'Unknown error'}`;
            }
          }

          if (!shouldRetryWithStripe) {
            throw new Error(errorMessage);
          }
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

    const planOrder = { free: 0, day_pass: 1, pro_monthly: 2, pro_quarterly: 3, pro_yearly: 4 };
    return planOrder[plan.key as keyof typeof planOrder] > planOrder[currentUserPlan as keyof typeof planOrder];
  };

  // Get plan icon component (matching landing page)
  const getPlanIcon = (planKey: string) => {
    switch (planKey) {
      case 'free': return Brain;
      case 'day_pass': return Star;
      case 'pro_monthly': return Crown;
      case 'pro_quarterly': return Users;
      case 'pro_yearly': return Globe;
      default: return Brain;
    }
  };

  const getPlanColor = (planKey: string) => {
    switch (planKey) {
      case 'free': return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800';
      case 'day_pass': return 'text-lime-600 bg-lime-100 dark:text-lime-300 dark:bg-lime-900/20';
      case 'pro_monthly': return 'text-lime-600 bg-lime-100 dark:text-lime-300 dark:bg-lime-900/20';
      case 'pro_quarterly': return 'text-lime-600 bg-lime-100 dark:text-lime-300 dark:bg-lime-900/20';
      case 'pro_yearly': return 'text-lime-600 bg-lime-100 dark:text-lime-300 dark:bg-lime-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800';
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
      id: 'smart-extension',
      title: 'Smart Extension',
      description: 'Save and autofill job data instantly from any job board. Never paste again.',
      icon: Target,
      color: 'from-lime-400 to-lime-500',
      bgColor: 'from-lime-400/10 to-lime-500/10',
    },
    {
      id: 'global-opportunities',
      title: 'Global Opportunities',
      description: 'Access sponsored jobs with visa sponsorship for UK and USA. More coming soon.',
      icon: Globe,
      color: 'from-blue-400 to-blue-500',
      bgColor: 'from-blue-400/10 to-blue-500/10',
    },
    {
      id: 'skills-gap',
      title: 'Skills Gap Analysis',
      description: 'Identify missing skills and get actionable recommendations to bridge the gap for your dream role.',
      icon: BarChart3,
      color: 'from-purple-400 to-purple-500',
      bgColor: 'from-purple-400/10 to-purple-500/10',
    },
    {
      id: 'career-insights',
      title: 'Deep Career Insights',
      description: 'Get a detailed CV report highlighting career gaps, strengths, and improvement areas.',
      icon: FileText,
      color: 'from-orange-400 to-orange-500',
      bgColor: 'from-orange-400/10 to-orange-500/10',
    },
    {
      id: 'ats-optimized',
      title: 'ATS-Optimized Documents',
      description: 'Auto-generate CVs and Cover Letters tailored to pass Applicant Tracking Systems with high scores.',
      icon: CheckCircle,
      color: 'from-green-400 to-green-500',
      bgColor: 'from-green-400/10 to-green-500/10',
    },
    {
      id: 'one-click-export',
      title: 'One-Click Export',
      description: 'Download your complete application kit: CV, Cover Letter, and ATS Report in one click.',
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

          {/* Full Screen Modal Container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[99999] flex bg-white dark:bg-[#141810]"
            onClick={(e) => e.stopPropagation()}
          >
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
              className="w-full tablet:w-1/2 bg-white dark:bg-[#141810] overflow-y-auto hidden tablet:block"
            >
              <div className="p-8 tablet:p-12 max-w-2xl mx-auto h-full flex flex-col">
                {/* Logo */}
                <div className="mb-8 flex items-center gap-3">
                  <img
                    src="/images/logo.png"
                    alt="CVCircle Logo"
                    className="w-10 h-10 object-contain"
                    loading="eager"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="text-2xl font-bold">
                    <span className="text-[#80FF00]">CV</span><span className="text-gray-900">Circle</span>
                  </div>
                </div>

                {/* Main Heading */}
                <div className="mb-8">
                  <h1 className="text-3xl tablet:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                    Unlock Your Full Career Potential
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">
                    All-in-one solution for your career growth. Create professional CVs, optimize for ATS systems, and track your job applications—all in one place.
                  </p>
                </div>

                {/* Premium Toolkit Section */}
                <div className="mb-8 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">What's Included</h2>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-[#80FF00] mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        <strong className="text-gray-900 dark:text-white">Smart Extension:</strong> Save and autofill job data instantly from any board. Never copy-paste again.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-[#80FF00] mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        <strong className="text-gray-900 dark:text-white">ATS-Optimized Documents:</strong> Auto-generate CVs and Cover Letters tailored to pass Applicant Tracking Systems with high scores.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-[#80FF00] mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        <strong className="text-gray-900 dark:text-white">Skills Gap Analysis:</strong> Identify missing skills and get actionable recommendations to bridge the gap for your dream role.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-[#80FF00] mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        <strong className="text-gray-900 dark:text-white">Global Opportunities:</strong> Access sponsored jobs with visa sponsorship tags for the UK and USA.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-[#80FF00] mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        <strong className="text-gray-900 dark:text-white">Deep Career Insights:</strong> Get detailed reports highlighting career gaps, strengths, and improvement areas.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-[#80FF00] mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        <strong className="text-gray-900 dark:text-white">One-Click Export:</strong> Download your complete application kit instantly.
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Trust Elements - Bottom */}
                <div className="mt-auto pt-8 border-t border-gray-200">
                  <div className="grid grid-cols-1 gap-4">
                    {/* 100% Satisfaction Guarantee */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-0.5">100% Satisfaction Guarantee</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          If you are not completely satisfied with your purchase, you can receive a full refund with no questions asked.
                        </p>
                      </div>
                    </div>

                    {/* No Obligation */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-0.5">No Obligation</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          If you find another provider with better pricing or any reasons, you are free to move from CV Circle anytime.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions Link */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      By proceeding, you agree to our{' '}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Privacy Policy
                      </a>
                    </p>
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
              className="w-full tablet:w-1/2 bg-white dark:bg-[#141810] overflow-y-auto relative"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0 z-10"
              >
                <X className="w-5 h-5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" />
              </button>

              <div className="p-4 tablet:p-6 max-w-5xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-2xl tablet:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {adminMode ? 'Grant Plan' : previewMode ? 'Preview Plans' : step === 1 ? 'Choose Your Plan' : 'Complete Your Order'}
                  </h2>
                  {adminMode && (
                    <span className="inline-block bg-lime-100 text-lime-800 text-xs font-medium px-2 py-1 rounded-full mb-2">
                      Admin Mode
                    </span>
                  )}
                  {previewMode && (
                    <span className="inline-block bg-lime-100 text-lime-800 text-xs font-medium px-2 py-1 rounded-full mb-2">
                      Preview
                    </span>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {adminMode
                      ? 'Grant a plan to the selected user'
                      : previewMode
                        ? 'Preview available plans and pricing'
                        : 'Review your plan selection and complete payment'
                    }
                  </p>
                </div>

                {/* Content */}
                <div className="space-y-6">
                  {step === 1 && (
                    <>
                      {/* Current Plan Info - Displayed outside cards */}
                      {(() => {
                        // Find current plan from pricing plans
                        const currentPlan = pricingPlans.find((plan: PricingPlan) => isCurrentPlan(plan));

                        // Hide current plan section if it's the free plan (user is upgrading)
                        // Only show current plan if it's a paid plan
                        if (currentPlan && !adminMode && currentPlan.key !== 'free') {
                          const dbPlan = currentPlan as unknown as DatabasePricingPlan;
                          const regionalPrice = getRegionalPrice(dbPlan);
                          const currencySymbol = getCurrencySymbol();
                          const monthlyEquivalent = getMonthlyEquivalent(dbPlan);
                          const Icon = getPlanIcon(currentPlan.key);

                          return (
                            <div className="mb-6 p-4 tablet:p-5">
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-lime-400 to-lime-500 shadow-lg">
                                    <Icon size={24} className="text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg tablet:text-xl font-bold text-gray-900">
                                          {currentPlan.name}
                                        </h3>
                                        <span className="bg-lime-100 text-lime-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                          Current Plan
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        {currentPlan.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Selected Plan Display (if preselected and different from current) - REMOVED DUPLICATE BLOCK */}


                      {/* Plans Logic */}
                      {(() => {
                        // Filter out free plan and current plan
                        const availablePlans = Array.isArray(pricingPlans) && pricingPlans.length > 0
                          ? pricingPlans.filter(plan => plan.key !== 'free' && !isCurrentPlan(plan))
                          : [];

                        // Split into subscriptions and day pass
                        const subscriptionPlans = availablePlans.filter(plan => plan.key !== 'day_pass');
                        const dayPassPlans = availablePlans.filter(plan => plan.key === 'day_pass');

                        // Sort subscription plans to put Yearly first (usually best value) or consistent order
                        // Order: Monthly, Quarterly, Yearly (or whatever is preferred, usually Yearly top if "Individual Plan" style)
                        // User image shows Annual then Monthly. Let's try to sort logic if needed, or rely on API order.
                        // For now assuming API order is sensible or handled elsewhere.

                        return (
                          <div className="flex flex-col gap-6 bg-gray-50 dark:bg-[#1A201A] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 max-w-[34rem] mx-auto w-full">
                            {/* Subscription Plans - Vertical Radio Group */}
                            {subscriptionPlans.length > 0 && (
                              <div className="flex flex-col gap-3">
                                {subscriptionPlans.map((plan) => {
                                  const dbPlan = plan as unknown as DatabasePricingPlan;
                                  const regionalPrice = getRegionalPrice(dbPlan);
                                  const currencySymbol = getCurrencySymbol();
                                  const effectivePrice = getEffectivePrice(dbPlan); // This is monthly effective for subs
                                  const monthlyEquivalent = getMonthlyEquivalent(dbPlan);
                                  const isSelected = selectedPlan?.key === plan.key;
                                  const Icon = getPlanIcon(plan.key);

                                  // Determine display price
                                  // If monthly equivalent is shown, use that as the big number
                                  // Then show billed amount

                                  const displayPrice = monthlyEquivalent.showMonthly ? monthlyEquivalent.price : (regionalPrice || `${currencySymbol}${effectivePrice}`);
                                  const billedAmountText = monthlyEquivalent.showMonthly
                                    ? `${regionalPrice || `${currencySymbol}${effectivePrice}`} billed ${plan.key === 'pro_quarterly' ? 'quarterly' : 'annually'}`
                                    : '';

                                  return (
                                    <div
                                      key={plan.key}
                                      onClick={() => {
                                        setUserChangedPlan(true);
                                        // Same selection logic as before
                                        let planPrice = 0;
                                        if (plan.key === 'pro_monthly') planPrice = dbPlan.price_monthly || 0;
                                        else if (plan.key === 'pro_quarterly') planPrice = dbPlan.price_quarterly || 0;
                                        else if (plan.key === 'pro_yearly') planPrice = dbPlan.price_yearly || 0;
                                        else planPrice = effectivePrice || 0;

                                        // Regional override logic
                                        if (regionalPricing) {
                                          let regionalPriceValue = planPrice;
                                          let hasRegionalPrice = false;

                                          // ... (reusing exact logic would be verbose, but necessary for correctness)
                                          // Simplified for this view: assume standard selection works or copy full logic.
                                          // To avoid huge block, I'll use the exact logic from previous version but inline here.

                                          if (plan.key === 'pro_quarterly' && regionalPricing.quarterly) {
                                            const extracted = extractNumericPrice(regionalPricing.quarterly);
                                            if (extracted > 0) { regionalPriceValue = extracted; hasRegionalPrice = true; }
                                          } else if (plan.key === 'pro_yearly' && regionalPricing.yearly) {
                                            const extracted = extractNumericPrice(regionalPricing.yearly);
                                            if (extracted > 0) { regionalPriceValue = extracted; hasRegionalPrice = true; }
                                          } else if (plan.key === 'pro_monthly' && regionalPricing.monthly) {
                                            const extracted = extractNumericPrice(regionalPricing.monthly);
                                            if (extracted > 0) { regionalPriceValue = extracted; hasRegionalPrice = true; }
                                          }

                                          if (hasRegionalPrice) {
                                            const planWithRegionalPrice = {
                                              ...plan,
                                              regionalPricing: {
                                                price: regionalPriceValue,
                                                currencySymbol: regionalPricing.currencySymbol || currencySymbol,
                                                currency: regionalPricing.currency || 'USD'
                                              },
                                              durationInfo: monthlyEquivalent.showMonthly ? { displayText: monthlyEquivalent.price } : undefined
                                            } as unknown as PricingPlan;
                                            setSelectedPlan(planWithRegionalPrice);
                                            return;
                                          }
                                        }
                                        setSelectedPlan(plan);
                                      }}
                                      className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                        ? 'border-gray-900 bg-gray-900 dark:border-lime-500 dark:bg-lime-500/10'
                                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 bg-white dark:bg-[#232f1c]'
                                        }`}
                                    >
                                      {/* Radio Circle */}
                                      <div className={`w-5 h-5 rounded-full border-[1.5px] mr-4 flex items-center justify-center flex-shrink-0 ${isSelected
                                        ? 'border-white dark:border-lime-500'
                                        : 'border-gray-400 dark:border-gray-500'
                                        }`}>
                                        {isSelected && (
                                          <div className="w-2.5 h-2.5 rounded-full bg-white dark:bg-lime-500" />
                                        )}
                                      </div>

                                      {/* Plan Name */}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <Icon size={20} className={isSelected ? 'text-white' : 'text-gray-900 dark:text-white'} />
                                          <div className={`font-semibold text-lg ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                            {plan.name.replace('Pro ', '')}
                                          </div>
                                        </div>

                                        {/* Embedded Features List for Active Card */}
                                        {isSelected && (
                                          <div className="mt-3">
                                            <p className="text-sm font-bold text-white mb-2">This package includes:</p>
                                            <ul className="space-y-1.5">
                                              {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs tablet:text-sm text-gray-200">
                                                  <Check className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                                                  <span>{feature}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>

                                      {/* Badges */}
                                      {plan.key === 'pro_yearly' && (
                                        <div className="mr-auto ml-2 px-2 py-0.5 bg-[rgb(129,255,0)] text-black text-xs font-bold rounded">
                                          Save ~25%
                                        </div>
                                      )}

                                      {/* Price */}
                                      <div className="text-right">
                                        <div className="flex items-baseline justify-end gap-1">
                                          <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{displayPrice.replace(/\/mo$/, '').replace(/\/month$/, '')}</span>
                                          <span className={`text-sm ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>/month</span>
                                        </div>
                                        {billedAmountText && (
                                          <div className={`text-xs mt-0.5 ${isSelected ? 'text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {billedAmountText}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}



                            {/* Divider for Day Pass */}
                            {dayPassPlans.length > 0 && (
                              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                <button
                                  onClick={() => setIsDayPassOpen(!isDayPassOpen)}
                                  className="w-full flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                  <span className="font-bold text-black dark:text-white">Want to try out for a day?</span>
                                  {isDayPassOpen ? (
                                    <ChevronUp className="w-5 h-5 text-black dark:text-white" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-black dark:text-white" />
                                  )}
                                </button>

                                <AnimatePresence>
                                  {isDayPassOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="pt-4 pb-2">
                                        {dayPassPlans.map((plan) => {
                                          // Render Day Pass as a similar row or simpler card
                                          const dbPlan = plan as unknown as DatabasePricingPlan;
                                          const regionalPrice = getRegionalPrice(dbPlan);
                                          const currencySymbol = getCurrencySymbol();
                                          const effectivePrice = getEffectivePrice(dbPlan);
                                          const isSelected = selectedPlan?.key === plan.key;
                                          const Icon = getPlanIcon(plan.key);

                                          return (
                                            <div
                                              key={plan.key}
                                              onClick={() => {
                                                setUserChangedPlan(true);
                                                // Day pass pricing logic
                                                let planPrice = dbPlan.price_one_time || effectivePrice || 0;
                                                if (regionalPricing && regionalPricing.dayPass) {
                                                  const extracted = extractNumericPrice(regionalPricing.dayPass);
                                                  if (extracted > 0) {
                                                    setSelectedPlan({
                                                      ...plan,
                                                      regionalPricing: {
                                                        price: extracted,
                                                        currencySymbol: regionalPricing.currencySymbol || currencySymbol,
                                                        currency: regionalPricing.currency || 'USD'
                                                      }
                                                    } as unknown as PricingPlan);
                                                    return;
                                                  }
                                                }
                                                setSelectedPlan(plan);
                                              }}
                                              className={`relative flex items-center p-4 m-1 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                                ? 'border-gray-900 bg-gray-900 dark:border-lime-500 dark:bg-lime-500/10'
                                                : 'border-transparent bg-gray-50 dark:bg-[#1A201A] hover:bg-gray-100 dark:hover:bg-gray-800/50'
                                                }`}
                                            >
                                              <div className={`w-5 h-5 rounded-full border-[1.5px] mr-4 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-white dark:border-lime-500' : 'border-gray-400 dark:border-gray-500'
                                                }`}>
                                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white dark:bg-lime-500" />}
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <Icon size={20} className={isSelected ? 'text-white' : 'text-gray-900 dark:text-white'} />
                                                  <div className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Day Pass</div>
                                                </div>
                                                <div className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>Full access for 24 hours</div>

                                                {/* Day Pass Details/Features */}
                                                <ul className={`mt-2 space-y-1 text-xs ${isSelected ? 'text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                                  {plan.features.slice(0, 3).map((feature, idx) => (
                                                    <li key={idx} className="flex items-start gap-1.5">
                                                      <Check size={12} className={`mt-0.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-lime-600 dark:text-lime-500'}`} />
                                                      <span>{feature}</span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                              <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                {regionalPricing?.dayPass || regionalPrice || `${currencySymbol}${effectivePrice}`}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}

                            {/* Empty State */}
                            {availablePlans.length === 0 && (
                              <div className="py-12 text-center text-gray-500">
                                {plansLoading ? 'Loading plans...' : 'No plans available. Please try refreshing the page.'}
                              </div>
                            )}

                          </div>
                        );
                      })()}


                      {/* Continue Button */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => setStep(2)}
                          disabled={!selectedPlan || isCurrentPlan(selectedPlan)}
                          className="px-8 py-3 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          {adminMode ? 'Grant Plan' : previewMode ? 'Preview' : 'Continue to Payment'}
                        </button>
                      </div>
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
                                    if (selectedPlan.key === 'pro_yearly') return 'Pro Annual Plan';
                                    if (selectedPlan.key === 'pro_quarterly') return 'Pro Quarterly Plan';
                                    if (selectedPlan.key === 'pro_monthly') return 'Pro Monthly Plan';
                                    if (selectedPlan.key === 'day_pass') return 'Day Pass';
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
                                  return `${currencySymbol}${getPlanPrice(selectedPlan).toFixed(2)}`;
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
                                    return `${currencySymbol}${getPlanPrice(selectedPlan).toFixed(2)}`;
                                  })()}
                                </span>
                              </div>

                              <div className="flex justify-between text-gray-900 dark:text-white text-sm tablet:text-base">
                                <span>Discount</span>
                                <span className={appliedDiscount ? 'text-green-600 dark:text-lime-400' : 'text-gray-600 dark:text-white/60'}>
                                  {appliedDiscount ? (
                                    <>
                                      -{(() => {
                                        const regionalPrice = selectedPlan ? (selectedPlan as any).regionalPricing : null;
                                        const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                                        const discountAmount = getPlanPrice(selectedPlan) - getFinalPrice();
                                        return `${currencySymbol}${discountAmount.toFixed(2)}`;
                                      })()}
                                    </>
                                  ) : (
                                    <>
                                      -{(() => {
                                        const regionalPrice = selectedPlan ? (selectedPlan as any).regionalPricing : null;
                                        const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                                        return `${currencySymbol}0.00`;
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
                                    return `${currencySymbol}${getFinalPrice().toFixed(2)}`;
                                  })()}
                                </span>
                              </div>
                            </div>

                            {/* Provider Health Status */}
                            {providerHealthLoading ? (
                              <div className="mb-4 p-3 bg-gray-100 dark:bg-[#1a2e1a] rounded-lg text-sm text-gray-600 dark:text-white/60">
                                Checking payment provider status...
                              </div>
                            ) : (
                              <>
                                {providerHealth[paymentProvider] === false && (
                                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                          {paymentProvider === 'stripe' ? 'Stripe' : 'Razorpay'} is currently unavailable
                                        </p>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                                          {providerHealth.stripe && providerHealth.razorpay ? (
                                            'Both providers are available. Please try again.'
                                          ) : providerHealth.stripe ? (
                                            'Switched to Stripe. Please try again.'
                                          ) : providerHealth.razorpay ? (
                                            'Switched to Razorpay. Please try again.'
                                          ) : (
                                            'Payment processing is temporarily unavailable. Please try again later.'
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {providerHealth[paymentProvider] === true && (
                                  <div className="mb-4 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-lg">
                                    <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                                      <Check className="w-4 h-4" />
                                      <span>Payment via {paymentProvider === 'stripe' ? 'Stripe' : 'Razorpay'} is available</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Proceed to Payment Button */}
                            <button
                              onClick={handlePayment}
                              disabled={loading || providerHealth[paymentProvider] === false || providerHealthLoading}
                              className="w-full py-3 tablet:py-3.5 bg-blue-600 dark:bg-lime-500 hover:bg-blue-700 dark:hover:bg-lime-600 text-white dark:text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-auto text-sm tablet:text-base"
                            >
                              {loading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                                  <span className="hidden tablet:inline">Processing...</span>
                                  <span className="tablet:hidden">Processing</span>
                                </>
                              ) : (
                                <>
                                  <span className="hidden tablet:inline">Proceed to Payment</span>
                                  <span className="tablet:hidden">Proceed</span>
                                  <ArrowRight className="w-4 h-4" />
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
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default UniversalPaymentModal;
