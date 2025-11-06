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
  currentUserPlan: propCurrentUserPlan
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

  // Use the shared pricing hook
  const {
    plans: pricingPlansRaw,
    promotionalOffers,
    locationData,
    regionalPricing,
    loading: plansLoading,
    error: plansError,
    getRegionalPrice,
    getMonthlyEquivalent,
    getCurrencySymbol,
    getEffectivePrice,
    hasPromotionalPricing
  } = usePricingPlans({});

  // Convert DatabasePricingPlan to PricingPlan format
  // Ensure pricingPlans is always an array to prevent filter errors
  const pricingPlans: PricingPlan[] = Array.isArray(pricingPlansRaw) 
    ? (pricingPlansRaw as unknown as PricingPlan[])
    : [];

  // Set preselected plan when plans are loaded
  useEffect(() => {
    if (pricingPlans.length > 0 && !selectedPlan) {
      if (preselectedPlanKey) {
        const plan = pricingPlans.find((p: PricingPlan) => p.key === preselectedPlanKey);
        if (plan) setSelectedPlan(plan);
      } else {
        // Default to first paid plan (not free)
        const paidPlan = pricingPlans.find((p: PricingPlan) => p.key !== 'free');
        if (paidPlan) setSelectedPlan(paidPlan);
      }
    }
  }, [pricingPlans, preselectedPlanKey, selectedPlan]);

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
      const options = {
        key: checkoutData.key_id || (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string),
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: 'CV Circle',
        description: `${selectedPlan?.name} Subscription`,
        order_id: checkoutData.order_id,
        handler: async function (response: any) {
          // Payment successful - verify and process
          try {
            const verifyResponse = await fetch('/api/payment/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
            
            if (verifyData.success) {
              onSuccess?.(verifyData.subscription || verifyData);
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: '',
          email: '',
        },
        theme: {
          color: '#84cc16' // lime-500
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Razorpay checkout error:', error);
      throw new Error('Failed to open Razorpay checkout');
    }
  };

  const getPlanPrice = (plan: PricingPlan) => {
    if (plan.key === 'free') return 0;
    
    // Use regional pricing if available
    const regionalPrice = (plan as any).regionalPricing;
    if (regionalPrice?.price) {
      // Use promotional pricing if available
      const promotional = getPromotionalPricing(plan);
      if (promotional && promotional.pricing) {
        return promotional.pricing.monthly || promotional.pricing.quarterly || promotional.pricing.yearly || promotional.pricing.oneTime || regionalPrice.price;
      }
      return regionalPrice.price;
    }
    
    // Fallback to effective price from hook (convert to DatabasePricingPlan)
    const dbPlan = plan as unknown as DatabasePricingPlan;
    const effectivePrice = getEffectivePrice(dbPlan);
    return effectivePrice || 0;
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
          headers: { 'Content-Type': 'application/json' },
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
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create checkout session');
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
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
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-[#141810] rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {adminMode ? 'Grant Plan' : previewMode ? 'Preview Plans' : 'Choose Your Plan'}
                </h2>
                {adminMode && (
                  <span className="bg-lime-100 dark:bg-lime-900/20 text-lime-800 dark:text-lime-300 text-xs font-medium px-2 py-1 rounded-full">
                    Admin Mode
                  </span>
                )}
                {previewMode && (
                  <span className="bg-lime-100 dark:bg-lime-900/20 text-lime-800 dark:text-lime-300 text-xs font-medium px-2 py-1 rounded-full">
                    Preview
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
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
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            {step === 1 && (
              <>
                {/* Category Toggle - Matching Landing Page */}
                <div className="flex justify-center mb-8">
                  <div className="relative bg-white/5 dark:bg-gray-800 backdrop-blur-sm border border-white/10 dark:border-gray-700 rounded-full p-1 inline-flex">
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
                      className={`relative z-10 min-w-[140px] px-6 py-3 rounded-full font-medium text-sm transition-colors duration-300 ${
                        selectedCategory === 'essential'
                          ? 'text-black'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Essential
                    </button>
                    <button
                      onClick={() => setSelectedCategory('professional')}
                      className={`relative z-10 min-w-[140px] px-6 py-3 rounded-full font-medium text-sm transition-colors duration-300 ${
                        selectedCategory === 'professional'
                          ? 'text-black'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Professional
                    </button>
                  </div>
                </div>

                {/* Plans Grid */}
                {(() => {
                  const filteredPlans = Array.isArray(pricingPlans) && pricingPlans.length > 0 
                    ? pricingPlans.filter(plan => {
                        if (selectedCategory === 'essential') {
                          return plan.key === 'free' || plan.key === 'day_pass';
                        } else {
                          return plan.key === 'pro_monthly' || plan.key === 'pro_quarterly' || plan.key === 'pro_yearly';
                        }
                      })
                    : [];
                  
                  // Determine grid classes based on number of plans
                  const gridClasses = filteredPlans.length === 2
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8';
                  
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

                          return (
                            <motion.div
                              key={plan.key}
                              className={`group relative bg-gradient-to-br from-white/5 to-white/10 dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-xl border border-white/10 dark:border-gray-700 rounded-2xl p-6 flex flex-col cursor-pointer transition-all ${
                                isCurrent || isSelected
                                  ? 'ring-2 ring-lime-400/50'
                                  : plan.isPopular
                                  ? 'ring-2 ring-lime-400/50'
                                  : ''
                              }`}
                              initial={{ opacity: 0, y: 50 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6, delay: 0.1 * index }}
                              whileHover={{ 
                                scale: 1.02,
                                y: -5,
                                boxShadow: "0 15px 30px -5px rgba(132, 204, 22, 0.3)"
                              }}
                              onClick={() => setSelectedPlan(plan)}
                              style={{ willChange: 'transform' }}
                            >
                              {/* Glow Effect */}
                              <motion.div
                                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-lime-400/10 to-lime-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ filter: 'blur(20px)' }}
                              />
                              
                              {/* Current Plan Badge */}
                              {isCurrent && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                                  <span className="bg-lime-400 text-black text-xs font-medium px-3 py-1 rounded-full shadow-lg">
                                    Current Plan
                                  </span>
                                </div>
                              )}
                              
                              {/* Popular Badge */}
                              {plan.isPopular && !isCurrent && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                                  <span className="bg-lime-400 text-black text-xs font-medium px-3 py-1 rounded-full shadow-lg">
                                    Most Popular
                                  </span>
                                </div>
                              )}

                              {/* Promotional Badge */}
                              {hasPromo && (
                                <div className="absolute -top-3 right-3 z-10">
                                  <span className="bg-lime-400 text-black text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                    <Gift size={10} />
                                    Limited Time!
                                  </span>
                                </div>
                              )}

                              {/* Plan Icon */}
                              <motion.div 
                                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-gradient-to-br from-lime-400 to-lime-500 shadow-lg relative z-10`}
                                whileHover={{ 
                                  scale: 1.1,
                                  rotateY: 15,
                                  boxShadow: "0 20px 40px -12px rgba(132, 204, 22, 0.5)"
                                }}
                                style={{
                                  transformStyle: 'preserve-3d',
                                  perspective: '1000px'
                                }}
                              >
                                <Icon size={24} className="text-white" />
                              </motion.div>

                              {/* Plan Name */}
                              <h3 className="text-lg sm:text-xl font-bold mb-3 text-gray-900 dark:text-white relative z-10">{plan.name}</h3>

                              {/* Plan Description */}
                              <p className="text-gray-600 dark:text-gray-400 mb-4 text-xs sm:text-sm leading-relaxed relative z-10">
                                {plan.description}
                              </p>

                              {/* Pricing */}
                              <div className="mb-6 relative z-10">
                                {plan.key === 'free' ? (
                                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Free</div>
                                ) : (
                                  <div>
                                    {hasPromo ? (
                                      <div>
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                              {regionalPrice}
                                            </span>
                                            <span className="text-base sm:text-lg text-gray-500 dark:text-gray-400 line-through">
                                              {(() => {
                                                // Get original price for strikethrough
                                                const originalPrice = plan.price_quarterly || plan.price_yearly || plan.price_monthly || plan.price_one_time || 0;
                                                return originalPrice > 0 ? `${currencySymbol}${originalPrice}` : '';
                                              })()}
                                            </span>
                                          </div>
                                          {monthlyEquivalent.showMonthly && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                              {monthlyEquivalent.price} equivalent
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-xs sm:text-sm text-lime-400 font-medium mt-1">
                                          Limited Time Offer!
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                          {regionalPrice}
                                        </div>
                                        {monthlyEquivalent.showMonthly && (
                                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {monthlyEquivalent.price} equivalent
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1">
                                      {plan.key === 'day_pass' 
                                        ? 'one-time' 
                                        : (plan.price_quarterly ? 'quarterly' : plan.price_yearly ? 'yearly' : plan.price_monthly ? 'monthly' : 'one-time')}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Features */}
                              <ul className="space-y-3 mb-6 relative z-10 flex-grow">
                                {plan.features.map((feature: string, featureIndex: number) => (
                                  <li key={featureIndex} className="flex items-start gap-2">
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: 0.5 + featureIndex * 0.1 }}
                                      whileHover={{ scale: 1.2 }}
                                    >
                                      <Check size={18} className="text-lime-400 flex-shrink-0 mt-0.5" />
                                    </motion.div>
                                    <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">{feature}</span>
                                  </li>
                                ))}
                              </ul>

                              {/* Not Included Features */}
                              {(plan as any).notIncludedFeatures && (plan as any).notIncludedFeatures.length > 0 && (
                                <div className="mb-4 relative z-10">
                                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Not Included:</h4>
                                  <ul className="space-y-1">
                                    {(plan as any).notIncludedFeatures.slice(0, 2).map((feature: string, featureIndex: number) => (
                                      <li key={featureIndex} className="flex items-start gap-2">
                                        <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                                        </div>
                                        <span className="text-gray-500 dark:text-gray-400 text-xs">{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Current Plan Indicator */}
                              {isCurrent && (
                                <div className="w-full py-3 px-4 bg-lime-100 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 rounded-lg text-center font-semibold relative z-10">
                                  Current Plan
                                </div>
                              )}
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500 dark:text-gray-400">
                            {plansLoading ? 'Loading plans...' : 'No plans available'}
                          </p>
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
                    className="px-8 py-3 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
                  className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                >
                  ← Back to Plans
                </button>

                {/* Selected Plan Summary */}
                <div className="bg-white/5 dark:bg-gray-800/50 backdrop-blur-sm border border-white/10 dark:border-gray-700 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedPlan.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedPlan.description}
                      </p>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const regionalPrice = (selectedPlan as any).regionalPricing;
                        const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                        const durationInfo = (selectedPlan as any).durationInfo;
                        const price = getPlanPrice(selectedPlan);
                        
                        return (
                          <>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {currencySymbol}{price}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedPlan.billingCycle === 'one-time' || selectedPlan.key === 'day_pass'
                                ? 'one-time payment'
                                : `per ${getBillingInterval(selectedPlan)}`}
                            </div>
                            {durationInfo && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {durationInfo.displayText} access
                              </div>
                            )}
                            {regionalPrice && regionalPrice.regionName && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                                Price for {regionalPrice.regionName}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Discount Code Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                    Coupon Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 px-3 py-2 border border-white/10 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent bg-white/5 dark:bg-gray-800/50 dark:text-white text-gray-900"
                    />
                    <button
                      onClick={applyDiscountCode}
                      disabled={!discountCode.trim() || loading}
                      className="px-4 py-2 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Apply
                    </button>
                  </div>
                  
                  {appliedDiscount && (
                    <div className="mt-2 flex items-center justify-between bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-lg p-3">
                      <div className="flex items-center">
                        <Gift className="w-4 h-4 text-lime-500 mr-2" />
                        <span className="text-sm text-lime-700 dark:text-lime-300">
                          {appliedDiscount.description}
                        </span>
                      </div>
                      <button
                        onClick={removeDiscountCode}
                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
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

                {/* Payment Summary */}
                <div className="bg-white/5 dark:bg-gray-800/50 backdrop-blur-sm border border-white/10 dark:border-gray-700 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Payment Summary
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {selectedPlan.name}
                        {(selectedPlan as any).durationInfo && (
                          <span className="text-xs ml-2">({(selectedPlan as any).durationInfo.displayText})</span>
                        )}
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {(() => {
                          const regionalPrice = (selectedPlan as any).regionalPricing;
                          const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                          return `${currencySymbol}${getPlanPrice(selectedPlan)}`;
                        })()}
                      </span>
                    </div>
                    
                    {appliedDiscount && (
                      <div className="flex justify-between text-lime-600 dark:text-lime-400">
                        <span>Discount ({appliedDiscount.code})</span>
                        <span>
                          -{(() => {
                            const regionalPrice = selectedPlan ? (selectedPlan as any).regionalPricing : null;
                            const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                            return `${currencySymbol}${getPlanPrice(selectedPlan) - getFinalPrice()}`;
                          })()}
                        </span>
                      </div>
                    )}
                    
                    <div className="border-t border-white/10 dark:border-gray-600 pt-2">
                      <div className="flex justify-between text-lg font-semibold">
                        <span className="text-gray-900 dark:text-white">Total</span>
                        <span className="text-gray-900 dark:text-white">
                          {(() => {
                            const regionalPrice = selectedPlan ? (selectedPlan as any).regionalPricing : null;
                            const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                            return `${currencySymbol}${getFinalPrice()}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection - Hidden for regular users, auto-selected based on location */}
                {/* Payment provider is automatically selected based on user's location */}

                {/* Terms and Conditions */}
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    By proceeding, you agree to our{' '}
                    <a 
                      href="/terms" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a 
                      href="/privacy-policy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </p>
                </div>

                {/* Payment Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="px-8 py-3 bg-lime-500 text-white rounded-lg font-medium hover:bg-lime-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {adminMode 
                          ? `Grant ${selectedPlan.name} Plan`
                          : selectedPlan.key === 'free' 
                            ? 'Activate Free Plan' 
                            : (() => {
                                const regionalPrice = (selectedPlan as any).regionalPricing;
                                const currencySymbol = regionalPrice?.currencySymbol || regionalPricing?.currencySymbol || getCurrencySymbol();
                                return `Pay ${currencySymbol}${getFinalPrice()}`;
                              })()
                        }
                      </>
                    )}
                  </button>
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
