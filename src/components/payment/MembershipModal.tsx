'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  CreditCard, 
  Shield, 
  Lock, 
  Globe,
  Calendar,
  Clock,
  Star,
  Crown,
  Zap,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface PricingPlan {
  _id: string;
  key: string;
  name: string;
  description: string;
  price_monthly?: number;
  price_quarterly?: number;
  price_yearly?: number;
  price_one_time?: number;
  currency: string;
  billingCycle: string;
  maxCVs: number;
  maxExports: number;
  storageLimit: number;
  features: string[];
  status: string;
  isPopular: boolean;
  isBestValue: boolean;
  sortOrder: number;
  dayPassDuration?: number;
}

interface BillingDetails {
  name: string;
  email: string;
  company?: string;
  vatNumber?: string;
  address: string;
  city: string;
  country: string;
  zipcode: string;
  cardName: string;
  cardNumber: string;
  expiryDate: string;
  cvc: string;
}

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanKey?: string;
  preselectedPlanKey?: string;
  onSuccess?: (planKey: string, invoiceId?: string) => void;
  adminMode?: boolean;
  previewMode?: boolean;
  subjectUserId?: string;
}

const MembershipModal: React.FC<MembershipModalProps> = ({
  isOpen,
  onClose,
  currentPlanKey = 'free',
  preselectedPlanKey,
  onSuccess,
  adminMode = false,
  previewMode = false,
  subjectUserId
}) => {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [billingDetails, setBillingDetails] = useState<BillingDetails>({
    name: '',
    email: '',
    company: '',
    vatNumber: '',
    address: '',
    city: '',
    country: '',
    zipcode: '',
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvc: ''
  });
  const [discountCode, setDiscountCode] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'razorpay'>('stripe');

  // Fetch pricing plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/pricing-plans');
        if (response.ok) {
          const plans = await response.json();
          setPricingPlans(plans);
          
          // Set preselected plan or current plan
          if (preselectedPlanKey) {
            const plan = plans.find((p: PricingPlan) => p.key === preselectedPlanKey);
            if (plan) setSelectedPlan(plan);
          } else {
            const currentPlan = plans.find((p: PricingPlan) => p.key === currentPlanKey);
            if (currentPlan) setSelectedPlan(currentPlan);
          }
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };

    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen, preselectedPlanKey, currentPlanKey]);

  // Detect user region for payment provider
  useEffect(() => {
    const detectRegion = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_code === 'IN') {
          setPaymentProvider('razorpay');
        } else {
          setPaymentProvider('stripe');
        }
      } catch (error) {
        console.error('Error detecting region:', error);
        setPaymentProvider('stripe'); // Default to Stripe
      }
    };

    if (isOpen) {
      detectRegion();
    }
  }, [isOpen]);

  const getPlanPrice = (plan: PricingPlan) => {
    if (plan.key === 'free') return 0;
    if (plan.key === 'day_pass') return plan.price_one_time || 0;
    if (plan.key === 'pro_monthly') return plan.price_monthly || 0;
    if (plan.key === 'pro_quarterly') return plan.price_quarterly || 0;
    if (plan.key === 'pro_yearly') return plan.price_yearly || 0;
    return 0;
  };

  const getBillingInterval = (plan: PricingPlan) => {
    if (plan.key === 'day_pass') return 'one-time';
    if (plan.key === 'pro_monthly') return 'monthly';
    if (plan.key === 'pro_quarterly') return 'quarterly';
    if (plan.key === 'pro_yearly') return 'yearly';
    return 'monthly';
  };

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
  };

  const handleNext = () => {
    if (step === 1 && selectedPlan) {
      if (selectedPlan.key === 'free') {
        // Free plan - no payment needed
        handleFreePlanActivation();
      } else {
        setStep(2);
      }
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleFreePlanActivation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription/activate-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: 'free' })
      });

      if (response.ok) {
        onSuccess?.('free');
        onClose();
      }
    } catch (error) {
      console.error('Error activating free plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    try {
      if (selectedPlan.key === 'free') {
        // Activate free plan
        const endpoint = adminMode && subjectUserId 
          ? `/api/admin/users/${subjectUserId}/plan/complimentary`
          : '/api/subscription/activate-free';
        
        const body = adminMode && subjectUserId 
          ? { planKey: selectedPlan.key, note: 'Admin activation' }
          : { planKey: selectedPlan.key };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          onSuccess?.(selectedPlan.key);
          onClose();
        } else {
          console.error('Failed to activate free plan');
        }
      } else {
        // Create checkout session
        const endpoint = adminMode && subjectUserId 
          ? `/api/admin/users/${subjectUserId}/checkout/session`
          : '/api/checkout/session';
        
        const body = adminMode && subjectUserId 
          ? {
              planKey: selectedPlan.key,
              delivery: 'open',
              billingDetails
            }
          : {
              planKey: selectedPlan.key,
              interval: getBillingInterval(selectedPlan),
              billingDetails,
              discountCode: discountCode || undefined,
              provider: paymentProvider
            };

        const response = await fetch(endpoint, {
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
            // This would integrate with Stripe.js
            console.log('Stripe payment intent:', data.client_secret);
          }
        } else {
          console.error('Failed to create checkout session');
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentPlan = (plan: PricingPlan) => plan.key === currentPlanKey;

  const canUpgrade = (plan: PricingPlan) => {
    if (plan.key === 'free') return false;
    if (currentPlanKey === 'free') return true;
    
    const planOrder = { free: 0, day_pass: 1, pro_monthly: 2, pro_quarterly: 3, pro_yearly: 4 };
    return planOrder[plan.key as keyof typeof planOrder] > planOrder[currentPlanKey as keyof typeof planOrder];
  };

  const canDowngrade = (plan: PricingPlan) => {
    if (plan.key === 'free') return true;
    
    const planOrder = { free: 0, day_pass: 1, pro_monthly: 2, pro_quarterly: 3, pro_yearly: 4 };
    return planOrder[plan.key as keyof typeof planOrder] < planOrder[currentPlanKey as keyof typeof planOrder];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {adminMode ? 'Admin: ' : ''}{previewMode ? 'Preview Plan' : step === 1 ? 'Upgrading Plan' : 'Payment Details'}
              </h2>
              {step === 1 && !previewMode && (
                <p className="text-gray-600 mt-1">
                  {adminMode ? 'Admin action - this change will be applied to the user.' : 'This change will be applied immediately.'}
                </p>
              )}
              {previewMode && (
                <p className="text-gray-600 mt-1">Preview mode - no changes will be made.</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex">
            {/* Step 1: Plan Selection */}
            {step === 1 && (
              <div className="w-full p-6">
                {/* Billing Cycle Toggle */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select how you pay
                  </label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        billingCycle === 'monthly'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Essential Access
                    </button>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        billingCycle === 'yearly'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Pro Access
                      <span className="ml-1 text-green-600 text-xs">Save 15%</span>
                    </button>
                  </div>
                </div>

                {/* Plans Grid */}
                <div className="space-y-8 mb-6">
                  {/* Essential Plans - Show only when Essential Access is selected */}
                  {billingCycle === 'monthly' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Essential</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pricingPlans.filter(plan => plan.key === 'free' || plan.key === 'day_pass').map((plan) => (
                        <div
                          key={plan._id}
                          className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedPlan?._id === plan._id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handlePlanSelect(plan)}
                        >
                          {/* Plan Badges */}
                          {plan.isPopular && (
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                Most popular
                              </span>
                            </div>
                          )}
                          {plan.isBestValue && (
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                Best value
                              </span>
                            </div>
                          )}

                          {/* Plan Header */}
                          <div className="text-center mb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">{plan.name}</h3>
                            <div className="mb-2">
                              {plan.key === 'free' ? (
                                <span className="text-2xl font-bold text-gray-900">Free</span>
                              ) : (
                                <>
                                  <span className="text-2xl font-bold text-gray-900">
                                    €{getPlanPrice(plan)}
                                  </span>
                                  <span className="text-gray-600">
                                    {plan.key === 'day_pass' ? '' : billingCycle === 'yearly' ? '/year' : '/month'}
                                  </span>
                                </>
                              )}
                            </div>
                            {plan.key === 'day_pass' && (
                              <p className="text-sm text-gray-600">24-hour access</p>
                            )}
                            {billingCycle === 'yearly' && plan.key !== 'free' && plan.key !== 'day_pass' && (
                              <p className="text-sm text-green-600">Save 15%</p>
                            )}
                          </div>

                          {/* Plan Status */}
                          <div className="text-center mb-4">
                            {isCurrentPlan(plan) ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle size={12} className="mr-1" />
                                Current Plan
                              </span>
                            ) : canUpgrade(plan) ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <ArrowRight size={12} className="mr-1" />
                                Upgrade
                              </span>
                            ) : canDowngrade(plan) ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <ArrowLeft size={12} className="mr-1" />
                                Downgrade
                              </span>
                            ) : null}
                          </div>

                          {/* Features */}
                          <div className="space-y-2">
                            {plan.features.slice(0, 3).map((feature, index) => (
                              <div key={index} className="flex items-center text-sm text-gray-600">
                                <Check size={14} className="text-green-500 mr-2 flex-shrink-0" />
                                <span className="truncate">{feature}</span>
                              </div>
                            ))}
                            {plan.features.length > 3 && (
                              <div className="text-xs text-gray-500 text-center">
                                +{plan.features.length - 3} more features
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Pro Plans - Show only when Pro Access is selected */}
                  {billingCycle === 'yearly' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pro</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {pricingPlans.filter(plan => plan.key === 'pro_monthly' || plan.key === 'pro_quarterly' || plan.key === 'pro_yearly').map((plan) => (
                          <div
                          key={plan._id}
                          className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedPlan?._id === plan._id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handlePlanSelect(plan)}
                        >
                          {/* Plan Badges */}
                          {plan.isPopular && (
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                Most popular
                              </span>
                            </div>
                          )}
                          {plan.isBestValue && (
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                Best value
                              </span>
                            </div>
                          )}

                          {/* Plan Header */}
                          <div className="text-center mb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">{plan.name}</h3>
                                                         <div className="mb-2">
                               <span className="text-2xl font-bold text-gray-900">
                                 €{getPlanPrice(plan)}
                               </span>
                               <span className="text-gray-600">
                                 {plan.key === 'pro_monthly' ? '/month' : plan.key === 'pro_quarterly' ? '/quarter' : '/year'}
                               </span>
                             </div>
                             {plan.key === 'pro_yearly' && (
                               <p className="text-sm text-green-600">Best Value</p>
                             )}
                          </div>

                          {/* Plan Status */}
                          <div className="text-center mb-4">
                            {isCurrentPlan(plan) ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle size={12} className="mr-1" />
                                Current Plan
                              </span>
                            ) : canUpgrade(plan) ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <ArrowRight size={12} className="mr-1" />
                                Upgrade
                              </span>
                            ) : canDowngrade(plan) ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <ArrowLeft size={12} className="mr-1" />
                                Downgrade
                              </span>
                            ) : null}
                          </div>

                          {/* Features */}
                          <div className="space-y-2">
                            {plan.features.slice(0, 3).map((feature, index) => (
                              <div key={index} className="flex items-center text-sm text-gray-600">
                                <Check size={14} className="text-green-500 mr-2 flex-shrink-0" />
                                <span className="truncate">{feature}</span>
                              </div>
                            ))}
                            {plan.features.length > 3 && (
                              <div className="text-xs text-gray-500 text-center">
                                +{plan.features.length - 3} more features
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!selectedPlan || loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        {selectedPlan?.key === 'free' ? 'Activate Free Plan' : 'Continue to Payment'}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Details */}
            {step === 2 && selectedPlan && (
              <div className="w-full p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Billing Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={billingDetails.name}
                          onChange={(e) => setBillingDetails(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                        <input
                          type="text"
                          value={billingDetails.vatNumber}
                          onChange={(e) => setBillingDetails(prev => ({ ...prev, vatNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Vat number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input
                          type="text"
                          value={billingDetails.address}
                          onChange={(e) => setBillingDetails(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Street"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input
                            type="text"
                            value={billingDetails.city}
                            onChange={(e) => setBillingDetails(prev => ({ ...prev, city: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                          <select
                            value={billingDetails.country}
                            onChange={(e) => setBillingDetails(prev => ({ ...prev, country: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select</option>
                            <option value="US">United States</option>
                            <option value="IN">India</option>
                            <option value="GB">United Kingdom</option>
                            <option value="DE">Germany</option>
                            <option value="FR">France</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={billingDetails.zipcode}
                          onChange={(e) => setBillingDetails(prev => ({ ...prev, zipcode: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Postal code"
                        />
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-8">Payment Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name on the Card</label>
                        <input
                          type="text"
                          value={billingDetails.cardName}
                          onChange={(e) => setBillingDetails(prev => ({ ...prev, cardName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Andrea Tangredi"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Credit Card Number</label>
                        <input
                          type="text"
                          value={billingDetails.cardNumber}
                          onChange={(e) => setBillingDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0000 0000 0000 0000"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                          <input
                            type="text"
                            value={billingDetails.expiryDate}
                            onChange={(e) => setBillingDetails(prev => ({ ...prev, expiryDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="MM / YY"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                          <input
                            type="text"
                            value={billingDetails.cvc}
                            onChange={(e) => setBillingDetails(prev => ({ ...prev, cvc: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="XXX"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 text-sm text-gray-600">
                      By clicking "Purchase Plan", you agree to the{' '}
                      <a href="#" className="text-blue-600 hover:underline">Agreement and Terms</a>.
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900">{selectedPlan.name}</h4>
                                                     <p className="text-sm text-gray-600">
                             {selectedPlan.key === 'day_pass' ? 'One-time access' : 
                              selectedPlan.key === 'pro_monthly' ? 'Monthly billing' :
                              selectedPlan.key === 'pro_quarterly' ? 'Quarterly billing' :
                              'Yearly billing'}
                           </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            €{getPlanPrice(selectedPlan)}
                          </div>
                                                     <div className="text-sm text-gray-600">
                             {selectedPlan.key === 'day_pass' ? 'one-time' : 
                              selectedPlan.key === 'pro_monthly' ? 'per month' :
                              selectedPlan.key === 'pro_quarterly' ? 'per quarter' :
                              'per year'}
                           </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Discount Code</label>
                          <input
                            type="text"
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="XXXXXXXX"
                          />
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900">TOTAL</span>
                            <span className="font-bold text-xl text-gray-900">
                              €{getPlanPrice(selectedPlan)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={handlePayment}
                          disabled={loading || previewMode}
                          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                        >
                          {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : previewMode ? (
                            <>
                              <Eye size={16} />
                              Preview Only
                            </>
                          ) : adminMode ? (
                            <>
                              <Lock size={16} />
                              Process Payment
                            </>
                          ) : (
                            <>
                              <Lock size={16} />
                              Pay Securely
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-4 text-xs text-gray-500 text-center">
                        This will be a secure 128-bit SSL encrypted payment
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between mt-6">
                      <button
                        onClick={handleBack}
                        className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <ArrowLeft size={16} />
                        Back
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MembershipModal;
