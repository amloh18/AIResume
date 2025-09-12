'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  bestFor?: string;
}

interface PricingProps {
  onPlanSelect?: (plan: PricingPlan, pricingData: PricingData) => void;
}

const Pricing: React.FC<PricingProps> = ({ onPlanSelect }) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('essential'); // 'essential' or 'pro'
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GBP');
  const [loading, setLoading] = useState(true);

  const essentialPlans: PricingPlan[] = [
    {
      name: 'Essential Plan',
      originalPrice: 0,
      originalCurrency: 'GBP',
      period: '',
      description: 'The Foundation for Opportunity. Craft a single, powerful application that passes initial screenings and opens the door.',
      features: [
        '1 Full Application Journey: Craft your CV, Cover Letter, and track one job',
        'Basic ATS Check: Ensure your CV passes initial automated screeners',
        '1 PDF Export: Download your finished application'
      ],
      notIncluded: [],
      bestFor: 'Testing our tools or for a single, critical application',
      popular: false,
      color: 'from-green-400 to-green-500',
      glowColor: 'from-green-400/20 to-green-500/20',
      icon: Brain
    },
    {
      name: 'Daily Pass',
      originalPrice: 2.99,
      originalCurrency: 'GBP',
      period: 'valid for 24 hours',
      description: 'The 24-Hour Career Sprint. For when opportunity won\'t wait. Get 24-hour access to our Pro tools.',
      features: [
        '5 Application Journeys: Tailor applications for up to five key roles',
        'Pro ATS Optimisation: Rank higher in recruiter searches',
        'All Export Options: Download in both PDF & Word'
      ],
      notIncluded: [],
      bestFor: 'A one-day application blitz, a career fair, or acting on urgent job alerts',
      popular: true,
      color: 'from-blue-400 to-blue-500',
      glowColor: 'from-blue-400/20 to-blue-500/20',
      icon: Star
    }
  ];

  const proPlans: PricingPlan[] = [
    {
      name: 'Pro Monthly',
      originalPrice: 10.99,
      originalCurrency: 'GBP',
      period: 'per month',
      description: 'Your Active Career Campaign. Your command centre for a serious job search.',
      features: [
        'Unlimited Applications: Create a unique CV for every role for 30 days',
        'Pro ATS & All Exports: Maximise your visibility and flexibility',
        'Priority Support: Get faster assistance from our team'
      ],
      notIncluded: [],
      bestFor: 'A dedicated professional in an active, month-long job search',
      popular: false,
      color: 'from-purple-400 to-purple-500',
      glowColor: 'from-purple-400/20 to-purple-500/20',
      icon: Crown
    },
    {
      name: 'Pro Quarterly',
      originalPrice: 25.99,
      originalCurrency: 'GBP',
      period: 'per quarter',
      description: 'The Strategic Advantage. The smart choice for a longer search.',
      features: [
        '90 Days of Unlimited Use: The ideal timeframe for longer hiring cycles',
        'All Pro Features Included: Pro ATS, Unlimited Exports & Priority Support',
        'Future Pro Add-ons: Get our newest features automatically at no extra cost'
      ],
      notIncluded: [],
      bestFor: 'Senior-level job hunts and securing the best long-term value',
      popular: true,
      color: 'from-orange-400 to-orange-500',
      glowColor: 'from-orange-400/20 to-orange-500/20',
      icon: Users
    },
    {
      name: 'Pro Yearly',
      originalPrice: 79.99,
      originalCurrency: 'GBP',
      period: 'per year',
      description: 'The Ultimate Career Investment. A long-term commitment to your professional growth.',
      features: [
        '365 Days of Unlimited Access: Your premium toolkit is always ready, all year long',
        'Includes All Pro Features & Future Add-ons',
        'Maximum Savings: Our absolute best rate, rewarding your commitment'
      ],
      notIncluded: [],
      bestFor: 'Long-term career builders and professionals seeking maximum savings',
      popular: false,
      color: 'from-pink-400 to-pink-500',
      glowColor: 'from-pink-400/20 to-pink-500/20',
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
        country: 'United Kingdom',
        countryCode: 'GB',
        currency: 'GBP',
        currencySymbol: '£',
        paymentPartner: 'stripe',
        exchangeRate: 1.0
      });
      setSelectedCurrency('GBP');
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

    const convertedData = LocationService.convertPrice(price, plan.originalCurrency, selectedCurrency);
    
    // Convert the original price to the same currency for consistent display
    const originalInTargetCurrency = LocationService.convertPrice(plan.originalPrice, plan.originalCurrency, selectedCurrency);
    
    return {
      ...convertedData,
      originalPrice: originalInTargetCurrency.convertedPrice
    };
  };

  const getPaymentPartnerIcon = (currency: string) => {
    return currency === 'INR' ? Shield : CreditCard;
  };

  const getPaymentPartnerName = (currency: string) => {
    return currency === 'INR' ? 'Razorpay' : 'Stripe';
  };

  const plans = useMemo(() => {
    return selectedCategory === 'essential' ? essentialPlans : proPlans;
  }, [selectedCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingAnimation progress={0.3} showProgressBar={false} />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.02
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.98
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1
    }
  };

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
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 text-center">
            Invest in Your Career. Choose Your Advantage.
          </h2>
          <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            The right tools get you noticed. Move forward with confidence by selecting the plan that matches your ambition.
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

        {/* Enhanced Pricing Cards */}
        <motion.div 
          key={selectedCategory}
          className="flex justify-center w-full"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className={`grid gap-6 lg:gap-8 ${selectedCategory === 'essential' ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto'}`}>
          {plans.map((plan, index) => {
            const pricingData = getConvertedPrice(plan);
            const IconComponent = plan.icon;
            const PaymentIcon = getPaymentPartnerIcon(pricingData.convertedCurrency);
            return (
              <motion.div
                key={`${plan.name}-${selectedCategory}`}
                className="relative group w-full"
                variants={cardVariants}
                style={{
                  zIndex: plans.length - index,
                  transform: `translateY(${index * 10}px)`
                }}
              >
                <motion.div
                  className={`relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 h-full min-h-[600px] flex flex-col ${
                    plan.popular ? 'ring-2 ring-lime-400/50 shadow-2xl shadow-lime-400/20' : ''
                  }`}
                  whileHover={{ 
                    scale: 1.02,
                    rotateY: 3,
                    rotateX: 3,
                    y: -5,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  {/* Glow Effect */}
                  <motion.div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${plan.glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    style={{ filter: 'blur(30px)' }}
                  />
                  
                  {/* Popular Badge */}
                  {plan.popular && (
                    <motion.div 
                      className="absolute top-0 right-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                    >
                      <div className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-3 py-1 rounded-bl-3xl rounded-tr-3xl text-xs font-bold shadow-2xl">
                        <Star size={12} className="inline mr-1" />
                        Most Popular
                      </div>
                    </motion.div>
                  )}

                  {/* Plan Name and Icon */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <motion.div 
                        className={`w-10 h-10 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center shadow-2xl`}
                        whileHover={{ 
                          scale: 1.1,
                          rotateY: 15,
                          boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)"
                        }}
                        style={{
                          transformStyle: 'preserve-3d',
                          perspective: '1000px'
                        }}
                      >
                        <IconComponent size={20} className="text-white" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                    </div>
                    <div className="text-base text-white/60 font-medium">{plan.description}</div>
                  </div>

                  {/* Price with 3D Effect */}
                  <motion.div 
                    className="text-center mb-6"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="text-5xl font-bold text-white" style={{
                        textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
                      }}>
                        {plan.originalPrice === 0 ? 'Free' : LocationService.formatPrice(pricingData.convertedPrice, pricingData.convertedCurrency)}
                      </div>
                      {plan.originalPrice > 0 && pricingData.convertedPrice !== pricingData.originalPrice && (
                        <div className="text-lg text-white/50 line-through">
                          {LocationService.formatPrice(pricingData.originalPrice, pricingData.convertedCurrency)}
                        </div>
                      )}
                    </div>
                    <div className="text-white/60 text-base">{plan.period}</div>
                    {plan.originalPrice > 0 && pricingData.convertedPrice !== pricingData.originalPrice && (
                      <div className="text-lime-400 text-sm font-semibold mt-1">
                        Launch Offer
                      </div>
                    )}
                  </motion.div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, fIndex) => (
                      <motion.div 
                        key={`${plan.name}-feature-${fIndex}`}
                        className="flex items-start"
                        whileHover={{ x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="w-5 h-5 bg-lime-400 rounded-full flex items-center justify-center mr-3 shadow-lg mt-0.5 flex-shrink-0">
                          <Check size={12} className="text-black font-bold" />
                        </div>
                        <span className="text-white/80 text-sm leading-relaxed">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Best For */}
                  {plan.bestFor && (
                    <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-lime-400 text-sm font-semibold mb-2">Best for:</div>
                      <div className="text-white/70 text-sm leading-relaxed">{plan.bestFor}</div>
                    </div>
                  )}

                  {/* Not Included */}
                  {plan.notIncluded.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h4 className="text-base font-semibold text-white/60 mb-2">Not Included:</h4>
                      <ul className="space-y-2 text-white/60 text-base">
                        {plan.notIncluded.map((item, niIndex) => (
                          <li key={`${plan.name}-not-included-${niIndex}`} className="flex items-center">
                            <span className="mr-2">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Enhanced CTA Button */}
                  <motion.button 
                    onClick={() => onPlanSelect?.(plan, pricingData)}
                    className={`group relative w-full py-4 px-6 rounded-full font-semibold text-base transition-all duration-300 overflow-hidden mt-auto ${
                      plan.originalPrice === 0
                        ? 'bg-gradient-to-r from-green-400 to-green-500 text-black shadow-2xl shadow-green-400/25'
                        : plan.popular
                          ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-black shadow-2xl shadow-lime-400/25'
                          : 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-xl'
                    }`}
                    whileHover={{ 
                      scale: 1.02,
                      rotateY: 3,
                      boxShadow: plan.originalPrice === 0
                        ? "0 25px 50px -12px rgba(34, 197, 94, 0.4)"
                        : plan.popular 
                          ? "0 25px 50px -12px rgba(132, 204, 22, 0.4)"
                          : "0 20px 40px -12px rgba(0, 0, 0, 0.5)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      transformStyle: 'preserve-3d',
                      perspective: '1000px'
                    }}
                  >
                    <motion.div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                        plan.originalPrice === 0
                          ? 'bg-gradient-to-r from-green-300 to-green-400'
                          : plan.popular 
                            ? 'bg-gradient-to-r from-lime-300 to-lime-400' 
                            : 'bg-gradient-to-r from-gray-600 to-gray-700'
                      }`}
                      style={{ filter: 'blur(20px)' }}
                    />
                    <motion.div
                      className="relative flex items-center justify-center gap-2"
                      whileHover={{ x: 5 }}
                    >
                      <span>{plan.originalPrice === 0 ? 'Get Started Free' : 'Choose Plan'}</span>
                      <motion.div
                        whileHover={{ rotate: 45 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ArrowRight size={16} />
                      </motion.div>
                    </motion.div>
                  </motion.button>

                </motion.div>
              </motion.div>
            );
          })}
          </div>
        </motion.div>

        {/* Enhanced Bottom CTA */}
        <motion.div 
          className="text-center mt-12 lg:mt-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-white/60 mb-4 lg:mb-6 text-base lg:text-lg">Have questions about pricing?</p>
          <motion.button 
            className="group text-lime-400 hover:text-lime-300 font-semibold transition-colors duration-300 flex items-center gap-2 mx-auto"
            whileHover={{ x: 5 }}
          >
            <span>Contact our sales team</span>
            <motion.div
              whileHover={{ rotate: 45 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowRight size={16} />
            </motion.div>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
