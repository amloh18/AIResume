'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Star, 
  Check, 
  X, 
  CreditCard, 
  Shield, 
  Globe,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { LocationService, LocationData, PricingData } from '@/lib/payment/locationService';

interface PricingPlan {
  name: string;
  originalPrice: number;
  originalCurrency: string;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
  color: string;
  icon: any;
}

interface MembershipSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userSubscription?: any;
}

const MembershipSidebar: React.FC<MembershipSidebarProps> = ({ 
  isOpen, 
  onClose, 
  userSubscription 
}) => {
  const { data: session } = useSession();
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const plans: PricingPlan[] = [
    {
      name: 'Free Plan',
      originalPrice: 0,
      originalCurrency: 'EUR',
      period: '',
      description: 'Basic access for casual users',
      features: [
        'Create & edit up to 3 CVs',
        '1 export',
        'Basic design snippets'
      ],
      popular: false,
      color: 'from-green-400 to-green-500',
      icon: Crown
    },
    {
      name: 'Day Pass',
      originalPrice: 2.99,
      originalCurrency: 'EUR',
      period: '24 hours',
      description: 'Quick access for immediate needs',
      features: [
        '5 CV exports',
        'AI Assistant included',
        'Cover Letter Generation',
        'Limited Style Snippets'
      ],
      popular: true,
      color: 'from-blue-400 to-blue-500',
      icon: Star
    },
    {
      name: 'Monthly Pro',
      originalPrice: 19,
      originalCurrency: 'EUR',
      period: 'month',
      description: 'Full access for active job seekers',
      features: [
        'Unlimited CVs & Exports',
        'AI Assistant + Cover Letters',
        'Full Job Tracker Access',
        'All Style Snippets',
        'Community Access',
        'Standard Email Support'
      ],
      popular: false,
      color: 'from-yellow-400 to-yellow-500',
      icon: Crown
    },
    {
      name: 'Annual Pro',
      originalPrice: 120,
      originalCurrency: 'EUR',
      period: 'year',
      description: 'Best value for long-term users',
      features: [
        'Everything in Monthly Pro',
        'Priority Support',
        'Early Access to Features',
        'Exclusive Templates',
        'Advanced Analytics'
      ],
      popular: false,
      color: 'from-purple-400 to-purple-500',
      icon: Crown
    }
  ];

  useEffect(() => {
    if (isOpen) {
      initializeLocation();
    }
  }, [isOpen]);

  const initializeLocation = async () => {
    try {
      const location = await LocationService.getLocationData();
      setLocationData(location);
      setSelectedCurrency(location.currency);
    } catch (error) {
      console.error('Error initializing location:', error);
      setLocationData({
        country: 'United States',
        countryCode: 'US',
        currency: 'USD',
        currencySymbol: '$',
        paymentPartner: 'stripe',
        exchangeRate: 1.08
      });
      setSelectedCurrency('USD');
    }
  };

  const getConvertedPrice = (plan: PricingPlan): PricingData => {
    if (plan.originalPrice === 0) {
      return {
        originalPrice: 0,
        originalCurrency: plan.originalCurrency,
        convertedPrice: 0,
        convertedCurrency: selectedCurrency,
        exchangeRate: 1,
        paymentPartner: 'stripe'
      };
    }

    return LocationService.convertPrice(plan.originalPrice, plan.originalCurrency, selectedCurrency);
  };

  const getPaymentPartnerIcon = (currency: string) => {
    return currency === 'INR' ? Shield : CreditCard;
  };

  const getPaymentPartnerName = (currency: string) => {
    return currency === 'INR' ? 'Razorpay' : 'Stripe';
  };

  const handlePlanSelect = (plan: PricingPlan) => {
    if (plan.originalPrice === 0) {
      // Handle free plan
      handleFreePlanActivation();
    } else {
      setSelectedPlan(plan);
      setShowPaymentForm(true);
    }
  };

  const handleFreePlanActivation = async () => {
    setLoading(true);
    try {
      // API call to activate free plan
      const response = await fetch('/api/subscription/activate-free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setPaymentStatus('success');
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        throw new Error('Failed to activate free plan');
      }
    } catch (error) {
      setPaymentStatus('error');
      setErrorMessage('Failed to activate free plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPlan || !session) return;

    setLoading(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const pricingData = getConvertedPrice(selectedPlan);

      // Create payment intent
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: selectedPlan.name,
          amount: pricingData.convertedPrice,
          currency: pricingData.convertedCurrency,
          paymentMethod: pricingData.paymentPartner,
          billingCycle: selectedPlan.period.includes('month') ? 'monthly' : 
                       selectedPlan.period.includes('year') ? 'yearly' : 'one-time'
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment');
      }

      // Simulate payment processing (in real implementation, this would integrate with Stripe/Razorpay)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirm payment
      const confirmResponse = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: data.paymentIntentId,
          planName: selectedPlan.name,
          amount: pricingData.convertedPrice,
          currency: pricingData.convertedCurrency,
          paymentMethod: pricingData.paymentPartner
        }),
      });

      const confirmData = await confirmResponse.json();

      if (confirmData.success) {
        setPaymentStatus('success');
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(confirmData.error || 'Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlan = () => {
    if (!userSubscription) return null;
    
    return plans.find(plan => 
      plan.name.toLowerCase().includes(userSubscription.plan?.toLowerCase() || '')
    );
  };

  const currentPlan = getCurrentPlan();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Membership
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Current Plan Status */}
            {currentPlan && (
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Current Plan: {currentPlan.name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You have access to all {currentPlan.name} features
                  </p>
                </div>
              </div>
            )}

            {/* Currency Selector */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Currency
                </label>
                {locationData && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Globe size={12} />
                    <span>Detected: {locationData.country}</span>
                  </div>
                )}
              </div>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                {LocationService.getSupportedCurrencies().map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Plans */}
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Available Plans
              </h3>
              
              {plans.map((plan) => {
                const pricingData = getConvertedPrice(plan);
                const Icon = plan.icon;
                const PaymentIcon = getPaymentPartnerIcon(pricingData.convertedCurrency);
                const isCurrentPlan = currentPlan?.name === plan.name;
                
                return (
                  <motion.div
                    key={plan.name}
                    className={`relative p-4 rounded-lg border transition-all duration-200 ${
                      isCurrentPlan
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div className="absolute -top-2 -right-2">
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold">
                          <Star size={10} className="inline mr-1" />
                          Popular
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {plan.name}
                          </h4>
                          <div className="text-right">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {LocationService.formatPrice(pricingData.convertedPrice, pricingData.convertedCurrency)}
                            </div>
                            {plan.period && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                /{plan.period}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {plan.description}
                        </p>

                        {/* Payment Partner */}
                        <div className="flex items-center gap-2 mb-3">
                          <PaymentIcon size={14} className="text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {getPaymentPartnerName(pricingData.convertedCurrency)}
                          </span>
                        </div>

                        {/* Features */}
                        <ul className="space-y-1 mb-4">
                          {plan.features.slice(0, 3).map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Check size={12} className="text-green-500 flex-shrink-0" />
                              <span className="truncate">{feature}</span>
                            </li>
                          ))}
                          {plan.features.length > 3 && (
                            <li className="text-xs text-gray-500 dark:text-gray-400">
                              +{plan.features.length - 3} more features
                            </li>
                          )}
                        </ul>

                        {/* Action Button */}
                        {isCurrentPlan ? (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle size={16} />
                            <span className="text-sm font-medium">Current Plan</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePlanSelect(plan)}
                            disabled={loading}
                            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                              plan.popular
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {plan.originalPrice === 0 ? 'Activate Free' : 'Choose Plan'}
                            <ChevronRight size={16} className="inline ml-2" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Payment Form Modal */}
            <AnimatePresence>
              {showPaymentForm && selectedPlan && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
                  >
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Complete Purchase
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedPlan.name} - {LocationService.formatPrice(
                          getConvertedPrice(selectedPlan).convertedPrice,
                          getConvertedPrice(selectedPlan).convertedCurrency
                        )}
                      </p>
                    </div>

                    {paymentStatus === 'processing' && (
                      <div className="text-center py-8">
                        <Loader2 size={32} className="animate-spin mx-auto mb-4 text-blue-600" />
                        <p className="text-gray-600 dark:text-gray-400">
                          Processing your payment...
                        </p>
                      </div>
                    )}

                    {paymentStatus === 'success' && (
                      <div className="text-center py-8">
                        <CheckCircle size={32} className="mx-auto mb-4 text-green-600" />
                        <p className="text-green-600 font-medium mb-2">Payment Successful!</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          Your plan has been activated.
                        </p>
                      </div>
                    )}

                    {paymentStatus === 'error' && (
                      <div className="text-center py-8">
                        <AlertCircle size={32} className="mx-auto mb-4 text-red-600" />
                        <p className="text-red-600 font-medium mb-2">Payment Failed</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {errorMessage}
                        </p>
                      </div>
                    )}

                    {paymentStatus === 'idle' && (
                      <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {selectedPlan.name}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {LocationService.formatPrice(
                                getConvertedPrice(selectedPlan).convertedPrice,
                                getConvertedPrice(selectedPlan).convertedCurrency
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowPaymentForm(false)}
                            className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handlePayment}
                            disabled={loading}
                            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {loading ? (
                              <>
                                <Loader2 size={16} className="animate-spin inline mr-2" />
                                Processing...
                              </>
                            ) : (
                              'Pay Now'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MembershipSidebar;
