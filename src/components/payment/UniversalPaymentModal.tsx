'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CreditCard, Zap, Star, Shield, Crown, Gift, Brain, Users, Globe, ArrowRight } from 'lucide-react';
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
  const [selectedCategory, setSelectedCategory] = useState<'essential' | 'professional'>('professional');
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

      // Razorpay checkout.js expects uppercase currency code (ISO 4217 format)
      const currency = (checkoutData.currency || 'INR').toUpperCase();
      
      const options = {
        key: checkoutData.key_id || (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string),
        amount: amount, // Amount in currency subunits (paise for INR)
        currency: currency, // Razorpay checkout expects uppercase currency (e.g., 'INR')
        name: 'CV Circle',
        description: `${selectedPlan?.name} Subscription`,
        order_id: checkoutData.order_id, // Mandatory: Order ID from server
        handler: async function (response: any) {
          // Payment successful - verify signature and poll for subscription activation
          try {
            setLoading(true);
            
            // Step 1: Verify payment signature
            const verifyResponse = await fetch('/api/payment/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planKey: selectedPlan?.key,
                interval: selectedPlan ? getBillingInterval(selectedPlan) : 'monthly',
                couponId: checkoutData.coupon?.id
              })
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
        },
        theme: {
          color: '#84cc16' // lime-500
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        },
        // Handle payment failure
        'onPayment.failed': function(response: any) {
          console.error('Payment failed:', response);
          setLoading(false);
          alert(`Payment failed: ${response.error?.description || response.error?.reason || 'Unknown error'}. Please try again.`);
        }
      };

      // Validate required fields per Razorpay documentation
      if (!options.key) {
        throw new Error('Razorpay key ID is missing');
      }
      if (!options.order_id) {
        throw new Error('Order ID is missing');
      }
      if (!amount || amount <= 0) {
        throw new Error('Invalid payment amount');
      }
      if (!options.currency || options.currency.length !== 3) {
        throw new Error('Invalid currency code');
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
          
          if (data.redirect_url) {
            // Stripe Checkout - redirect to Stripe
            window.location.href = data.redirect_url;
          } else if (data.provider === 'razorpay' && data.checkout && data.order_id) {
            // Razorpay Checkout - open embedded form
            await handleRazorpayCheckout(data);
          } else if (data.client_secret) {
            // Handle Stripe payment intent
            console.log('Stripe payment intent:', data.client_secret);
          }
        } else {
          let errorMessage = 'Failed to create checkout session';
          let shouldRetryWithStripe = false;
          
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
            console.error('Checkout session error:', errorData);
            
            // If currency is not supported by Razorpay, automatically retry with Stripe
            if (errorData.unsupportedCurrency && errorData.suggestedProvider === 'stripe' && paymentProvider === 'razorpay') {
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
            const errorText = await response.text();
            console.error('Failed to parse error response:', errorText);
            errorMessage = `Server error (${response.status}): ${errorText.substring(0, 100)}`;
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[1200] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-[#141810] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-[95%] sm:w-[90%] max-w-6xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col relative z-[1210]"
      >
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {adminMode ? 'Grant Plan' : previewMode ? 'Preview Plans' : 'Choose Your Plan'}
                </h2>
                {adminMode && (
                  <span className="bg-lime-100 dark:bg-lime-900/20 text-lime-800 dark:text-lime-300 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap">
                    Admin Mode
                  </span>
                )}
                {previewMode && (
                  <span className="bg-lime-100 dark:bg-lime-900/20 text-lime-800 dark:text-lime-300 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap">
                    Preview
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                {adminMode 
                  ? 'Grant a plan to the selected user'
                  : previewMode 
                    ? 'Preview available plans and pricing'
                    : 'Unlock premium features and create unlimited CVs'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
            {step === 1 && (
              <>
                {/* Category Toggle - Matching Landing Page */}
                <div className="flex justify-center mb-6 sm:mb-8">
                  <div className="relative bg-white/5 dark:bg-gray-800 backdrop-blur-sm border border-white/10 dark:border-gray-700 rounded-full p-1 inline-flex w-full sm:w-auto">
                    {/* Sliding background indicator */}
                    <motion.div
                      className="absolute top-1 bottom-1 bg-lime-400 rounded-full shadow-lg z-0"
                      initial={false}
                      animate={{
                        left: selectedCategory === 'essential' 
                          ? '4px' 
                          : 'calc(50% + 2px)',
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                      style={{
                        width: 'calc(50% - 4px)',
                      }}
                    />
                    
                    <button
                      onClick={() => setSelectedCategory('essential')}
                      className={`relative z-10 flex-1 sm:flex-none min-w-[120px] sm:min-w-[140px] px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-medium text-xs sm:text-sm transition-colors duration-300 ${
                        selectedCategory === 'essential'
                          ? 'text-black'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Essential
                    </button>
                    <button
                      onClick={() => setSelectedCategory('professional')}
                      className={`relative z-10 flex-1 sm:flex-none min-w-[120px] sm:min-w-[140px] px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-medium text-xs sm:text-sm transition-colors duration-300 ${
                        selectedCategory === 'professional'
                          ? 'text-black'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Professional
                    </button>
                  </div>
                </div>

                {/* Selected Plan Display (if preselected) */}
                {selectedPlan && preselectedPlanKey && (
                  <div className="mb-6 p-4 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          Selected Plan: {selectedPlan.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {(() => {
                            const billingInterval = getBillingInterval(selectedPlan);
                            if (billingInterval === 'one-time') {
                              return 'One-time payment';
                            } else if (billingInterval === 'yearly') {
                              return 'Billed yearly';
                            } else if (billingInterval === 'quarterly') {
                              return 'Billed quarterly';
                            } else {
                              return 'Billed monthly';
                            }
                          })()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {(() => {
                            const regionalPrice = (selectedPlan as any).regionalPricing;
                            const currencySymbol = regionalPrice?.currencySymbol || getCurrencySymbol();
                            return `${currencySymbol}${getPlanPrice(selectedPlan).toFixed(2)}`;
                          })()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPlan(null);
                        setUserChangedPlan(true); // Mark that user manually changed plan
                      }}
                      className="mt-3 text-sm text-lime-600 dark:text-lime-400 hover:text-lime-700 dark:hover:text-lime-300 font-medium"
                    >
                      Change Plan
                    </button>
                  </div>
                )}

                {/* Plans Grid */}
                {(() => {
                  // Define plan hierarchy for upgrade logic
                  const planOrder: Record<string, number> = { 
                    free: 0, 
                    day_pass: 1, 
                    pro_monthly: 2, 
                    pro_quarterly: 3, 
                    pro_yearly: 4 
                  };
                  
                  // Filter plans based on category
                  // Show all plans in the selected category (users should be able to see all options)
                  const filteredPlans = Array.isArray(pricingPlans) && pricingPlans.length > 0 
                    ? pricingPlans.filter(plan => {
                        // Category filter - show all plans in the selected category
                        const matchesCategory = selectedCategory === 'essential'
                          ? (plan.key === 'free' || plan.key === 'day_pass')
                          : (plan.key === 'pro_monthly' || plan.key === 'pro_quarterly' || plan.key === 'pro_yearly');
                        
                        // Return true if plan matches the category
                        // This allows users to see all plans in the category, not just upgrades
                        return matchesCategory;
                      })
                    : [];
                  
                  // Determine grid classes based on number of plans
                  const gridClasses = filteredPlans.length === 2
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-4xl mx-auto'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6';
                  
                  return (
                    <div className={gridClasses}>
                      {filteredPlans.length > 0 ? (
                        filteredPlans.map((plan, index) => {
                          // Convert to DatabasePricingPlan format for hook functions
                          const dbPlan = plan as unknown as DatabasePricingPlan;
                          const regionalPrice = getRegionalPrice(dbPlan);
                          const currencySymbol = getCurrencySymbol();
                          const effectivePrice = getEffectivePrice(dbPlan);
                          const hasPromo = hasPromotionalPricing(dbPlan);
                          const Icon = getPlanIcon(plan.key);
                          const monthlyEquivalent = getMonthlyEquivalent(dbPlan);
                          const isCurrent = isCurrentPlan(plan);
                          const isSelected = selectedPlan?.key === plan.key;
                          
                          // If this is the preselected plan, ensure it's selected
                          const isPreselected = preselectedPlanKey === plan.key;

                          return (
                            <motion.div
                              key={plan.key}
                              className={`group relative bg-gradient-to-br from-white/5 to-white/10 dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-xl rounded-2xl p-4 flex flex-col cursor-pointer transition-all ${
                                isSelected || isPreselected
                                  ? 'border-2 border-lime-400 ring-2 ring-lime-400/50'
                                  : 'border border-white/10 dark:border-gray-700'
                              }`}
                              initial={{ opacity: 0, y: 50 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6, delay: 0.1 * index }}
                              onClick={() => {
                                // Mark that user manually changed plan
                                setUserChangedPlan(true);
                                
                                // Determine the correct FULL price based on plan key and billing interval
                                // IMPORTANT: Use the actual plan price, not regional price string which might be monthly equivalent
                                let planPrice = 0;
                                if (plan.key === 'pro_monthly') {
                                  planPrice = dbPlan.price_monthly || 0;
                                } else if (plan.key === 'pro_quarterly') {
                                  // Use FULL quarterly price (one-time charge), not monthly equivalent
                                  planPrice = dbPlan.price_quarterly || 0;
                                } else if (plan.key === 'pro_yearly') {
                                  // Use FULL yearly price (one-time charge), not monthly equivalent
                                  planPrice = dbPlan.price_yearly || 0;
                                } else if (plan.key === 'day_pass') {
                                  planPrice = dbPlan.price_one_time || 0;
                                } else {
                                  // Fallback to effective price
                                  planPrice = effectivePrice || 0;
                                }
                                
                                // For regional pricing, we need to get the regional price for the SPECIFIC interval
                                // Don't extract from regionalPrice string as it might be the wrong interval
                                let regionalPriceValue = planPrice; // Default to plan price
                                
                                // If we have regional pricing data, get the correct interval price
                                if (regionalPricing) {
                                  if (plan.key === 'pro_quarterly' && regionalPricing.quarterly) {
                                    regionalPriceValue = extractNumericPrice(regionalPricing.quarterly);
                                  } else if (plan.key === 'pro_yearly' && regionalPricing.yearly) {
                                    regionalPriceValue = extractNumericPrice(regionalPricing.yearly);
                                  } else if (plan.key === 'pro_monthly' && regionalPricing.monthly) {
                                    regionalPriceValue = extractNumericPrice(regionalPricing.monthly);
                                  } else if (plan.key === 'day_pass' && regionalPricing.dayPass) {
                                    regionalPriceValue = extractNumericPrice(regionalPricing.dayPass);
                                  }
                                }
                                
                                // Use the regional price if available, otherwise use plan price
                                const finalPrice = regionalPriceValue || planPrice;
                                
                                // Attach regional pricing to plan before selecting
                                const planWithPricing = {
                                  ...plan,
                                  regionalPricing: {
                                    price: finalPrice, // This is the FULL price for the selected interval
                                    currencySymbol: currencySymbol,
                                    currency: regionalPricing?.currency || locationData?.currency || 'USD'
                                  },
                                  durationInfo: monthlyEquivalent.showMonthly ? {
                                    displayText: monthlyEquivalent.price
                                  } : undefined
                                };
                                setSelectedPlan(planWithPricing);
                              }}
                            >
                              
                              {/* Current Plan Badge */}
                              {isCurrent && (
                                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                                  <span className="bg-lime-400 text-black text-xs font-medium px-2 py-0.5 rounded-full shadow-lg">
                                    Current Plan
                                  </span>
                                </div>
                              )}
                              
                              {/* Popular Badge */}
                              {plan.isPopular && !isCurrent && (
                                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                                  <span className="bg-lime-400 text-black text-xs font-medium px-2 py-0.5 rounded-full shadow-lg">
                                    Most Popular
                                  </span>
                                </div>
                              )}

                              {/* Promotional Badge */}
                              {hasPromo && (
                                <div className="absolute -top-2 right-2 z-10">
                                  <span className="bg-lime-400 text-black text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                                    <Gift size={9} />
                                    Limited Time!
                                  </span>
                                </div>
                              )}

                              {/* Plan Icon */}
                              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 bg-gradient-to-br from-lime-400 to-lime-500 shadow-lg relative z-10">
                                <Icon size={20} className="text-white" />
                              </div>

                              {/* Plan Name */}
                              <h3 className="text-base font-bold mb-2 text-gray-900 dark:text-white relative z-10">{plan.name}</h3>

                              {/* Plan Description */}
                              <p className="text-gray-600 dark:text-gray-400 mb-3 text-xs leading-relaxed relative z-10">
                                {plan.description}
                              </p>

                              {/* Pricing */}
                              <div className="mb-4 relative z-10">
                                {plan.key === 'free' ? (
                                  <div className="text-xl font-bold text-gray-900 dark:text-white">Free</div>
                                ) : (
                                  <div>
                                    {hasPromo ? (
                                      <div>
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                              {regionalPrice}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                              {(() => {
                                                // Get original price for strikethrough
                                                const originalPrice = plan.price_quarterly || plan.price_yearly || plan.price_monthly || plan.price_one_time || 0;
                                                return originalPrice > 0 ? `${currencySymbol}${originalPrice}` : '';
                                              })()}
                                            </span>
                                          </div>
                                          {monthlyEquivalent.showMonthly && (
                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                              {monthlyEquivalent.price} equivalent
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-xs text-lime-400 font-medium mt-0.5">
                                          Limited Time Offer!
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                                          {regionalPrice}
                                        </div>
                                        {monthlyEquivalent.showMonthly && (
                                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                            {monthlyEquivalent.price} equivalent
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
                                      {plan.key === 'day_pass' 
                                        ? 'one-time' 
                                        : (plan.price_quarterly ? 'quarterly' : plan.price_yearly ? 'yearly' : plan.price_monthly ? 'monthly' : 'one-time')}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Features */}
                              <ul className="space-y-2 mb-4 relative z-10 flex-grow">
                                {plan.features.map((feature: string, featureIndex: number) => (
                                  <li key={featureIndex} className="flex items-start gap-1.5">
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: 0.5 + featureIndex * 0.1 }}
                                      whileHover={{ scale: 1.2 }}
                                    >
                                      <Check size={14} className="text-lime-400 flex-shrink-0 mt-0.5" />
                                    </motion.div>
                                    <span className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">{feature}</span>
                                  </li>
                                ))}
                              </ul>

                              {/* Not Included Features */}
                              {(plan as any).notIncludedFeatures && (plan as any).notIncludedFeatures.length > 0 && (
                                <div className="mb-3 relative z-10">
                                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Not Included:</h4>
                                  <ul className="space-y-1">
                                    {(plan as any).notIncludedFeatures.slice(0, 2).map((feature: string, featureIndex: number) => (
                                      <li key={featureIndex} className="flex items-start gap-1.5">
                                        <div className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <div className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                                        </div>
                                        <span className="text-gray-500 dark:text-gray-400 text-xs">{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Current Plan Indicator */}
                              {isCurrent && (
                                <div className="w-full py-2 px-3 bg-lime-100 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 rounded-lg text-center text-xs font-semibold relative z-10">
                                  Current Plan
                                </div>
                              )}
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500 dark:text-gray-400">
                            {plansLoading ? 'Loading plans...' : (
                              pricingPlans.length === 0 
                                ? 'No plans available. Please try refreshing the page.'
                                : `No ${selectedCategory === 'essential' ? 'essential' : 'professional'} plans available. Try switching categories.`
                            )}
                          </p>
                          {!plansLoading && pricingPlans.length > 0 && (
                            <button
                              onClick={() => setSelectedCategory(selectedCategory === 'essential' ? 'professional' : 'essential')}
                              className="mt-4 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Switch to {selectedCategory === 'essential' ? 'Professional' : 'Essential'} Plans
                            </button>
                          )}
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

            {step === 2 && selectedPlan && (
              <>
                {/* Back Button */}
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 sm:mb-6"
                >
                  <span className="hidden sm:inline">← Back to Plans</span>
                  <span className="sm:hidden">← Back</span>
                </button>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Left Column - Placeholder Image */}
                  <div className="relative order-2 lg:order-1">
                    {/* Placeholder Image */}
                    <div className="relative w-full h-full min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] rounded-xl overflow-hidden">
                      <img
                        src="/images/paymentsummary.png"
                        alt="Payment Summary"
                        className="w-full h-full object-cover rounded-xl"
                      />
                      {/* Logo and CVCircle Overlay - Top Left */}
                      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 z-10 bg-black/30 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                        <img
                          src="/images/logo.png"
                          alt="CVCircle Logo"
                          className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                        />
                        <span className="text-white font-bold text-sm sm:text-lg drop-shadow-lg">
                          CVCircle
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Order Summary */}
                  <div className="p-4 sm:p-6 flex flex-col order-1 lg:order-2 bg-gray-50 dark:bg-[rgb(20,24,16)] rounded-xl">
                    {/* Title */}
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
                      Complete Your Order
                    </h2>

                    {/* Plan Details Box */}
                    <div className="rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 bg-lime-50 dark:bg-[rgb(34,43,34)] border border-lime-200 dark:border-transparent">
                      <div className="mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {(() => {
                            if (!selectedPlan) return 'No Plan Selected';
                            if (selectedPlan.key === 'pro_yearly') return 'Pro Annual Plan';
                            if (selectedPlan.key === 'pro_quarterly') return 'Pro Quarterly Plan';
                            if (selectedPlan.key === 'pro_monthly') return 'Pro Monthly Plan';
                            if (selectedPlan.key === 'day_pass') return 'Day Pass';
                            return selectedPlan.name || `Plan ${selectedPlan.key}`;
                          })()}
                        </h3>
                        <p className="text-gray-600 dark:text-white/70 text-xs sm:text-sm">
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
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {(() => {
                          if (!selectedPlan) return 'N/A';
                          const regionalPrice = (selectedPlan as any).regionalPricing;
                          const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                          return `${currencySymbol}${getPlanPrice(selectedPlan).toFixed(2)}`;
                        })()}
                      </div>
                    </div>

                    {/* Coupon Code Section */}
                    <div className="mb-4 sm:mb-6">
                      <p className="text-gray-900 dark:text-white mb-2 sm:mb-3 text-xs sm:text-sm font-medium">Have a coupon code?</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                          placeholder="Enter code here"
                          className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base bg-white dark:bg-[rgb(26,26,26)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 border border-gray-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors"
                        />
                        <button
                          onClick={applyDiscountCode}
                          disabled={!discountCode.trim() || loading}
                          className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-800 dark:bg-[rgb(34,43,34)] hover:bg-gray-700 dark:hover:bg-[rgb(40,50,40)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
                        >
                          Apply
                        </button>
                      </div>
                  
                      {appliedDiscount && (
                        <div className="mt-3 flex items-center justify-between rounded-lg p-3 bg-lime-50 dark:bg-lime-900/20 border border-lime-300 dark:border-lime-700">
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
                        <div className="mt-2 text-sm text-red-400">
                      {discountError}
                    </div>
                  )}
                </div>

                    {/* Price Summary */}
                    <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
                      <div className="flex justify-between text-gray-900 dark:text-white text-sm sm:text-base">
                        <span>Subtotal</span>
                        <span>
                          {(() => {
                            const regionalPrice = (selectedPlan as any).regionalPricing;
                            const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                            return `${currencySymbol}${getPlanPrice(selectedPlan).toFixed(2)}`;
                          })()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-gray-900 dark:text-white text-sm sm:text-base">
                        <span>Discount</span>
                        <span className={appliedDiscount ? 'text-lime-600 dark:text-lime-400' : 'text-gray-600 dark:text-white'}>
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
                      
                      <div className="flex justify-between text-gray-900 dark:text-white font-bold text-base sm:text-lg pt-2 border-t border-gray-200 dark:border-white/10">
                        <span>Total</span>
                        <span className="text-lime-600 dark:text-[rgb(129,255,0)]">
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
                      <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                        Checking payment provider status...
                      </div>
                    ) : (
                      <>
                        {providerHealth[paymentProvider] === false && (
                          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
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
                          <div className="mb-4 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
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
                      className="w-full py-3 sm:py-3.5 bg-lime-500 hover:bg-lime-600 dark:bg-[rgb(129,255,0)] dark:hover:bg-[rgb(110,230,0)] text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-auto text-sm sm:text-base"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span className="hidden sm:inline">Processing...</span>
                          <span className="sm:hidden">Processing</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Proceed to Payment</span>
                          <span className="sm:hidden">Proceed</span>
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
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UniversalPaymentModal;
