'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CreditCard, Zap, Star, Shield, Crown, Gift } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { PricingPlan } from '@/types/pricing';

interface UniversalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPlanKey?: string;
  onSuccess?: (subscription: any) => void;
  returnUrl?: string; // URL to return to after successful payment
  triggerContext?: string; // Context of what triggered the modal (e.g., 'cv-creation', 'ats-check')
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
  triggerContext
}) => {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'razorpay'>('stripe');
  const [currentUserPlan, setCurrentUserPlan] = useState<string>('free');

  // Fetch pricing plans and user data
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;

      try {
        const [plansResponse, userResponse] = await Promise.all([
          fetch('/api/pricing-plans'),
          fetch('/api/user')
        ]);

        if (plansResponse.ok) {
          const plans = await plansResponse.json();
          setPricingPlans(plans);
          
          // Set preselected plan or default to first paid plan
          if (preselectedPlanKey) {
            const plan = plans.find((p: PricingPlan) => p.key === preselectedPlanKey);
            if (plan) setSelectedPlan(plan);
          } else {
            // Default to first paid plan (not free)
            const paidPlan = plans.find((p: PricingPlan) => p.key !== 'free');
            if (paidPlan) setSelectedPlan(paidPlan);
          }
        }

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.user) {
            setCurrentUserPlan(userData.user.currentPlanKey || 'free');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [isOpen, preselectedPlanKey]);

  // Detect user region for payment provider
  useEffect(() => {
    const detectRegion = async () => {
      try {
        const response = await fetch('/api/user/region');
        if (response.ok) {
          const data = await response.json();
          if (data.country === 'IN') {
            setPaymentProvider('razorpay');
          }
        }
      } catch (error) {
        console.error('Error detecting region:', error);
      }
    };

    if (isOpen) {
      detectRegion();
    }
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

  const getPlanPrice = (plan: PricingPlan) => {
    if (plan.key === 'free') return 0;
    
    switch (billingCycle) {
      case 'monthly':
        return plan.price_monthly || 0;
      case 'yearly':
        return plan.price_yearly || 0;
      default:
        return plan.price_monthly || 0;
    }
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
    return billingCycle === 'monthly' ? 'monthly' : 'yearly';
  };

  const handlePayment = async () => {
    if (!selectedPlan || !session) return;

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
      } else {
        // Create checkout session
        const body = {
          planKey: selectedPlan.key,
          interval: getBillingInterval(selectedPlan),
          discountCode: appliedDiscount?.code || undefined,
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
            // Redirect to payment provider
            window.location.href = data.redirect_url;
          } else if (data.client_secret) {
            // Handle Stripe payment intent
            console.log('Stripe payment intent:', data.client_secret);
          }
        } else {
          console.error('Failed to create checkout session');
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentPlan = (plan: PricingPlan) => plan.key === currentUserPlan;

  const canUpgrade = (plan: PricingPlan) => {
    if (plan.key === 'free') return false;
    if (currentUserPlan === 'free') return true;
    
    const planOrder = { free: 0, day_pass: 1, pro_monthly: 2, pro_quarterly: 3, pro_yearly: 4 };
    return planOrder[plan.key as keyof typeof planOrder] > planOrder[currentUserPlan as keyof typeof planOrder];
  };

  const getPlanIcon = (planKey: string) => {
    switch (planKey) {
      case 'free': return <Shield className="w-6 h-6" />;
      case 'day_pass': return <Zap className="w-6 h-6" />;
      case 'pro_monthly': return <Star className="w-6 h-6" />;
      case 'pro_quarterly': return <Crown className="w-6 h-6" />;
      case 'pro_yearly': return <Crown className="w-6 h-6" />;
      default: return <Star className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planKey: string) => {
    switch (planKey) {
      case 'free': return 'text-gray-600 bg-gray-100';
      case 'day_pass': return 'text-blue-600 bg-blue-100';
      case 'pro_monthly': return 'text-purple-600 bg-purple-100';
      case 'pro_quarterly': return 'text-orange-600 bg-orange-100';
      case 'pro_yearly': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
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
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Choose Your Plan
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Unlock premium features and create unlimited CVs
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
                {/* Billing Cycle Toggle */}
                <div className="flex justify-center mb-8">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        billingCycle === 'monthly'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        billingCycle === 'yearly'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Yearly
                      <span className="ml-1 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">
                        Save 20%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {pricingPlans.map((plan) => (
                    <motion.div
                      key={plan.key}
                      whileHover={{ scale: 1.02 }}
                      className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
                        selectedPlan?.key === plan.key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      {plan.isPopular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="text-center">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${getPlanColor(plan.key)}`}>
                          {getPlanIcon(plan.key)}
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {plan.name}
                        </h3>
                        
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                          {plan.description}
                        </p>

                        <div className="mb-4">
                          {plan.key === 'free' ? (
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">
                              Free
                            </div>
                          ) : (
                            <div>
                              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                €{getPlanPrice(plan)}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                per {billingCycle === 'monthly' ? 'month' : 'year'}
                              </div>
                            </div>
                          )}
                        </div>

                        <ul className="text-left space-y-2 mb-6">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        {isCurrentPlan(plan) ? (
                          <div className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-center">
                            Current Plan
                          </div>
                        ) : canUpgrade(plan) ? (
                          <div className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-center font-medium">
                            Upgrade
                          </div>
                        ) : (
                          <div className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-center">
                            Downgrade
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Continue Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedPlan || isCurrentPlan(selectedPlan)}
                    className="px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Continue to Payment
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
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
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
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        €{getPlanPrice(selectedPlan)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        per {billingCycle === 'monthly' ? 'month' : 'year'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discount Code Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Coupon Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      onClick={applyDiscountCode}
                      disabled={!discountCode.trim() || loading}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  
                  {appliedDiscount && (
                    <div className="mt-2 flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="flex items-center">
                        <Gift className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm text-green-700 dark:text-green-300">
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
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Payment Summary
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {selectedPlan.name}
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        €{getPlanPrice(selectedPlan)}
                      </span>
                    </div>
                    
                    {appliedDiscount && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Discount ({appliedDiscount.code})</span>
                        <span>
                          -€{getPlanPrice(selectedPlan) - getFinalPrice()}
                        </span>
                      </div>
                    )}
                    
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                      <div className="flex justify-between text-lg font-semibold">
                        <span className="text-gray-900 dark:text-white">Total</span>
                        <span className="text-gray-900 dark:text-white">
                          €{getFinalPrice()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Payment Method
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setPaymentProvider('stripe')}
                      className={`flex items-center px-4 py-3 border-2 rounded-lg transition-colors ${
                        paymentProvider === 'stripe'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      <span className="font-medium">Stripe</span>
                    </button>
                    
                    <button
                      onClick={() => setPaymentProvider('razorpay')}
                      className={`flex items-center px-4 py-3 border-2 rounded-lg transition-colors ${
                        paymentProvider === 'razorpay'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      <span className="font-medium">Razorpay</span>
                    </button>
                  </div>
                </div>

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
                    className="px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {selectedPlan.key === 'free' ? 'Activate Free Plan' : `Pay €${getFinalPrice()}`}
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
