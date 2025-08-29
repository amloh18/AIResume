'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, ArrowRight, Brain, Users, Crown, Globe, CreditCard, Shield } from 'lucide-react';
import { LocationService, LocationData, PricingData } from '@/lib/payment/locationService';
import LoadingAnimation from '@/components/ui/LoadingAnimation';

interface PricingPlan {
  name: string;
  originalPrice: number;
  originalCurrency: string;
  period: string;
  description: string;
  features: string[];
  notIncluded: string[];
  popular: boolean;
  color: string;
  glowColor: string;
  icon: any;
}

interface DynamicPricingProps {
  onPlanSelect?: (plan: PricingPlan, pricingData: PricingData) => void;
}

const DynamicPricing: React.FC<DynamicPricingProps> = ({ onPlanSelect }) => {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR');
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('essential');
  const [loading, setLoading] = useState(true);

  const essentialPlans: PricingPlan[] = [
    {
      name: 'Free Plan',
      originalPrice: 0,
      originalCurrency: 'EUR',
      period: '',
      description: 'First-time users, casual job seekers',
      features: [
        'Create & edit up to 3 CVs',
        '1 export',
        'Basic design snippets'
      ],
      notIncluded: [
        'AI Assistant',
        'Cover Letter Generator',
        'Job Tracker',
        'Community Access'
      ],
      popular: false,
      color: 'from-green-400 to-green-500',
      glowColor: 'from-green-400/20 to-green-500/20',
      icon: Brain
    },
    {
      name: 'Day Pass',
      originalPrice: 2.99,
      originalCurrency: 'EUR',
      period: 'valid for 24 hours',
      description: 'Quick job applications, one-day polishers',
      features: [
        '5 CV exports',
        'AI Assistant included',
        'Cover Letter Generation',
        'Limited Style Snippets'
      ],
      notIncluded: [
        'Job Tracker',
        'Community Access'
      ],
      popular: true,
      color: 'from-blue-400 to-blue-500',
      glowColor: 'from-blue-400/20 to-blue-500/20',
      icon: Star
    }
  ];

  const proPlans: PricingPlan[] = [
    {
      name: 'Monthly Pro',
      originalPrice: 19,
      originalCurrency: 'EUR',
      period: 'per month',
      description: 'Active job seekers needing all tools',
      features: [
        'Unlimited CVs & Exports',
        'AI Assistant + Cover Letters',
        'Full Job Tracker Access',
        'All Style Snippets',
        'Community Access (read-only)',
        'Standard Email Support'
      ],
      notIncluded: [],
      popular: false,
      color: 'from-yellow-400 to-yellow-500',
      glowColor: 'from-yellow-400/20 to-yellow-500/20',
      icon: Crown
    },
    {
      name: 'Quarterly Pro',
      originalPrice: 49,
      originalCurrency: 'EUR',
      period: 'per 3 months',
      description: 'Consistent job hunting or portfolio building',
      features: [
        'Everything in Monthly, plus:',
        'Mock Interview Access',
        'Community Participation',
        'Priority Email Support'
      ],
      notIncluded: [],
      popular: true,
      color: 'from-orange-400 to-orange-500',
      glowColor: 'from-orange-400/20 to-orange-500/20',
      icon: Users
    },
    {
      name: 'Annual Pro',
      originalPrice: 120,
      originalCurrency: 'EUR',
      period: 'per year',
      description: 'Long-term career builders or professionals',
      features: [
        'All features unlocked, including:',
        'Early job access in community',
        'Unlimited everything',
        'Premium Support',
        'Future Pro Add-ons included'
      ],
      notIncluded: [],
      popular: false,
      color: 'from-red-400 to-red-500',
      glowColor: 'from-red-400/20 to-red-500/20',
      icon: Crown
    }
  ];

  useEffect(() => {
    initializeLocation();
  }, []);

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
    } finally {
      setLoading(false);
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

    // Apply annual discount if selected
    let price = plan.originalPrice;
    if (isAnnual && plan.name.includes('Monthly')) {
      price = plan.originalPrice * 10; // 10 months instead of 12 for annual discount
    }

    return LocationService.convertPrice(price, plan.originalCurrency, selectedCurrency);
  };

  const getPaymentPartnerIcon = (currency: string) => {
    return currency === 'INR' ? Shield : CreditCard;
  };

  const getPaymentPartnerName = (currency: string) => {
    return currency === 'INR' ? 'Razorpay' : 'Stripe';
  };

  const plans = selectedCategory === 'essential' ? essentialPlans : proPlans;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingAnimation progress={0.3} showProgressBar={false} />
      </div>
    );
  }

  return (
    <section id="pricing" className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black overflow-hidden py-16 pt-32">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-black"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-12 lg:mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Pricing
          </h2>
          <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            {selectedCategory === 'essential' 
              ? 'Get started, test the tools, or make a quick move — no long-term commitment needed.'
              : 'Everything unlocked. Built for power users, pros, and anyone serious about landing the next opportunity.'
            }
          </p>
        </motion.div>

        {/* Currency Selector */}
        <motion.div 
          className="flex justify-center items-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-2">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LocationService.getSupportedCurrencies().map((currency) => (
                <option key={currency.code} value={currency.code} className="bg-gray-800 text-white">
                  {currency.symbol} {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Pricing Toggle */}
        <motion.div 
          className="flex justify-center items-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center space-x-4">
            <span className={`text-sm font-medium transition-colors duration-300 ${selectedCategory === 'essential' ? 'text-white' : 'text-white/60'}`}>
              Essential Access
            </span>
            <button
              onClick={() => setSelectedCategory(selectedCategory === 'essential' ? 'pro' : 'essential')}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                selectedCategory === 'pro' ? 'bg-lime-400' : 'bg-gray-600'
              }`}
            >
              <motion.span
                className="absolute inline-block h-6 w-6 rounded-full bg-white shadow-lg"
                animate={{
                  x: selectedCategory === 'pro' ? 32 : 4
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                layout
              />
            </button>
            <span className={`text-sm font-medium transition-colors duration-300 ${selectedCategory === 'pro' ? 'text-white' : 'text-white/60'}`}>
              Pro Access
              {selectedCategory === 'pro' && (
                <Crown size={16} className="inline ml-2 text-lime-400" />
              )}
            </span>
          </div>
        </motion.div>

        {/* Plans Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          {plans.map((plan, index) => {
            const pricingData = getConvertedPrice(plan);
            const Icon = plan.icon;
            const PaymentIcon = getPaymentPartnerIcon(pricingData.convertedCurrency);
            
            return (
              <motion.div
                key={plan.name}
                className={`relative bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 ${
                  plan.popular ? 'ring-2 ring-lime-400/50' : ''
                }`}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5, scale: 1.02 }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                      <Star size={12} className="inline mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Plan Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-6`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Plan Name and Description */}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-white/70 mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      {LocationService.formatPrice(pricingData.convertedPrice, pricingData.convertedCurrency)}
                    </span>
                    {plan.period && (
                      <span className="text-white/60">/{plan.period}</span>
                    )}
                  </div>
                  {pricingData.convertedCurrency !== plan.originalCurrency && (
                    <p className="text-sm text-white/50 mt-1">
                      ≈ {LocationService.formatPrice(pricingData.originalPrice, pricingData.originalCurrency)}/{plan.period}
                    </p>
                  )}
                </div>



                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-lime-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Not Included */}
                {plan.notIncluded.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white/50 text-sm mb-3">Not included:</p>
                    <ul className="space-y-2">
                      {plan.notIncluded.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-white/40 text-sm flex items-center gap-2">
                          <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={() => onPlanSelect?.(plan, pricingData)}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-black hover:from-lime-500 hover:to-lime-600'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                  }`}
                >
                  {plan.originalPrice === 0 ? 'Get Started Free' : 'Choose Plan'}
                  <ArrowRight className="inline ml-2 w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Additional Info */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <p className="text-white/60 text-sm">
            All prices include applicable taxes. Cancel anytime.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default DynamicPricing;
