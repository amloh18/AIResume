'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, ArrowRight, Brain, Users, Crown, Globe, CreditCard, Shield, Clock, Gift } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { LocationService, LocationData, PricingData } from '@/lib/payment/locationService';
import { getRegionalPricing, isEUCountry, getEUPricing, RegionalPricing } from '@/lib/pricing/regionalPricing';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';

interface DatabasePricingPlan {
  _id: string;
  key: string;
  name: string;
  description: string;
  price_monthly?: number;
  price_quarterly?: number;
  price_yearly?: number;
  price_one_time?: number;
  currency: string;
  features: string[];
  notIncludedFeatures: string[];
  isPopular: boolean;
  isBestValue: boolean;
  displayOnLanding: boolean;
  targetAudience: string;
  // Promotional pricing
  promotionalPrice_monthly?: number;
  promotionalPrice_quarterly?: number;
  promotionalPrice_yearly?: number;
  promotionalPrice_one_time?: number;
  promotionValidFrom?: string;
  promotionValidUntil?: string;
  promotionDescription?: string;
  isPromotionActive?: boolean;
  effectivePrice?: {
    monthly?: number;
    quarterly?: number;
    yearly?: number;
    oneTime?: number;
  };
}

interface PricingProps {
  onPlanSelect?: (plan: DatabasePricingPlan, pricingData: PricingData) => void;
}

const Pricing: React.FC<PricingProps> = ({ onPlanSelect }) => {
  const { data: session, status } = useSession();
  const [selectedCategory, setSelectedCategory] = useState('professional'); // 'essential' or 'professional'
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GBP');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingPlans, setPricingPlans] = useState<DatabasePricingPlan[]>([]);
  const [promotionalOffers, setPromotionalOffers] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DatabasePricingPlan | null>(null);
  const [regionalPricing, setRegionalPricing] = useState<RegionalPricing | null>(null);

  // Fetch location and set regional pricing
  useEffect(() => {
    const detectLocation = async () => {
      try {
        console.log('Detecting user location...');
        const location = await LocationService.getLocationData();
        console.log('Location detected:', location);
        
        setLocationData(location);
        setSelectedCurrency(location.currency);
        
        // Get regional pricing based on country
        let pricing: RegionalPricing;
        if (isEUCountry(location.countryCode)) {
          pricing = getEUPricing();
        } else {
          pricing = getRegionalPricing(location.countryCode);
        }
        
        console.log('Regional pricing set:', pricing);
        setRegionalPricing(pricing);
      } catch (error) {
        console.error('Error detecting location:', error);
        // Fallback to India pricing if error (more likely in development)
        const fallbackPricing = getRegionalPricing('IN');
        console.log('Using fallback pricing (India):', fallbackPricing);
        setRegionalPricing(fallbackPricing);
        setSelectedCurrency('INR');
      }
    };

    detectLocation();
  }, []);

  // Fetch pricing plans and promotional offers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansResponse, offersResponse] = await Promise.all([
          fetch('/api/pricing-plans?public=true'),
          fetch('/api/promotional-offers/active?userType=all')
        ]);

        if (plansResponse.ok) {
          const plans = await plansResponse.json();
          // Filter plans that should be displayed on landing page
          const landingPlans = plans.filter((plan: DatabasePricingPlan) => 
            plan.displayOnLanding && plan.targetAudience === 'all'
          );
          setPricingPlans(landingPlans);
        } else {
          console.error('Error fetching pricing plans:', plansResponse.status);
          setError('Failed to load pricing plans');
        }

        if (offersResponse.ok) {
          const offersData = await offersResponse.json();
          if (offersData.success) {
            setPromotionalOffers(offersData.offers);
          }
        } else {
          console.error('Error fetching promotional offers:', offersResponse.status);
        }
      } catch (error) {
        console.error('Error fetching pricing data:', error);
        setError('Failed to load pricing plans');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get regional price for a plan (returns price string with currency symbol)
  const getRegionalPrice = (plan: DatabasePricingPlan): string => {
    if (!regionalPricing) {
      // Fallback to default prices if regional pricing not loaded yet
      const fallbackPrice = plan.price_one_time || plan.price_monthly || 0;
      return `${plan.currency || 'GBP'} ${fallbackPrice}`;
    }

    // Map plan keys to regional pricing
    switch (plan.key) {
      case 'day_pass':
        return regionalPricing.dayPass;
      case 'pro_monthly':
        return regionalPricing.monthly;
      case 'pro_quarterly':
        return regionalPricing.quarterly;
      case 'pro_yearly':
        return regionalPricing.yearly;
      default:
        const fallbackPrice = plan.price_one_time || plan.price_monthly || 0;
        return `${regionalPricing.currencySymbol}${fallbackPrice}`;
    }
  };

  // Get monthly equivalent price for quarterly and yearly plans
  const getMonthlyEquivalent = (plan: DatabasePricingPlan): { price: string; showMonthly: boolean } => {
    if (!regionalPricing) {
      return { price: '', showMonthly: false };
    }

    // Helper function to extract numeric value from price string
    const extractNumericValue = (priceString: string): number => {
      // Remove all non-numeric characters except dots and commas
      let cleaned = priceString.replace(/[^\d.,]/g, '');
      // Handle comma as thousands separator (e.g., 1,999 -> 1999)
      cleaned = cleaned.replace(/,/g, '');
      return parseFloat(cleaned) || 0;
    };

    // Helper function to format price nicely
    const formatMonthlyPrice = (num: number): string => {
      // Round to nearest whole number
      const rounded = Math.round(num);
      return rounded.toString();
    };

    if (plan.key === 'pro_quarterly') {
      // Extract numeric value from quarterly price
      const quarterlyNum = extractNumericValue(regionalPricing.quarterly);
      const monthlyNum = quarterlyNum / 3;
      const formattedMonthly = formatMonthlyPrice(monthlyNum);
      return {
        price: `${regionalPricing.currencySymbol}${formattedMonthly}/month`,
        showMonthly: true
      };
    }

    if (plan.key === 'pro_yearly') {
      // Extract numeric value from yearly price
      const yearlyNum = extractNumericValue(regionalPricing.yearly);
      const monthlyNum = yearlyNum / 12;
      const formattedMonthly = formatMonthlyPrice(monthlyNum);
      return {
        price: `${regionalPricing.currencySymbol}${formattedMonthly}/month`,
        showMonthly: true
      };
    }

    return { price: '', showMonthly: false };
  };

  // Get currency symbol for display
  const getCurrencySymbol = (): string => {
    return regionalPricing?.currencySymbol || '£';
  };

  // Get effective price (promotional or regular)
  const getEffectivePrice = (plan: DatabasePricingPlan): number => {
    if (plan.isPromotionActive && plan.effectivePrice) {
      return plan.effectivePrice.oneTime || plan.effectivePrice.monthly || plan.price_one_time || plan.price_monthly || 0;
    }
    return plan.price_one_time || plan.price_monthly || 0;
  };

  // Check if plan has promotional pricing
  const hasPromotionalPricing = (plan: DatabasePricingPlan): boolean => {
    return Boolean(plan.isPromotionActive && plan.effectivePrice && 
           ((plan.effectivePrice.oneTime && plan.effectivePrice.oneTime < (plan.price_one_time || 0)) ||
            (plan.effectivePrice.monthly && plan.effectivePrice.monthly < (plan.price_monthly || 0))));
  };

  // Get plan icon
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


  // Handle plan selection
  const handlePlanSelect = (plan: DatabasePricingPlan) => {
    // Check if user is authenticated using NextAuth session
    const isAuthenticated = status === 'authenticated' && !!session?.user;
    
    if (!isAuthenticated) {
      // Route to signin page with plan preselected
      window.location.href = `/sign-in?plan=${plan.key}&returnUrl=/dashboard`;
      return;
    }
    
    // If authenticated, show payment modal directly
    setSelectedPlan(plan);
    setShowPaymentModal(true);
    
    if (onPlanSelect) {
      // Create pricing data from regional pricing
      const regionalPriceStr = getRegionalPrice(plan);
      // Extract numeric value from price string (handles commas, dots, currency symbols)
      const priceValue = parseFloat(regionalPriceStr.replace(/[^\d.,]/g, '').replace(',', ''));
      const pricingData: PricingData = {
        originalPrice: plan.price_one_time || plan.price_monthly || 0,
        originalCurrency: plan.currency,
        convertedPrice: priceValue,
        convertedCurrency: regionalPricing?.currency || 'GBP',
        exchangeRate: priceValue / (plan.price_one_time || plan.price_monthly || 1),
        paymentPartner: 'stripe' as const
      };
      onPlanSelect(plan, pricingData);
    }
  };

  // Filter plans by category
  const filteredPlans = useMemo(() => {
    const filtered = pricingPlans.filter(plan => {
      if (selectedCategory === 'essential') {
        return plan.key === 'free' || plan.key === 'day_pass';
      } else {
        return plan.key === 'pro_monthly' || plan.key === 'pro_quarterly' || plan.key === 'pro_yearly';
      }
    });
    return filtered;
  }, [pricingPlans, selectedCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingAnimation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-center">
          <p className="text-red-400 mb-2">Error loading pricing plans</p>
          <p className="text-sm text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <section id="pricing" className="relative pt-32 pb-20 flex items-center bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0">
        {/* Grid Lines */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(132, 204, 22, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(132, 204, 22, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Grid Dots */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(132, 204, 22, 0.4) 2px, transparent 2px)
            `,
            backgroundSize: '50px 50px',
            backgroundPosition: '25px 25px'
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-black/80"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/5 to-blue-400/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full flex flex-col justify-center">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 text-center">
            Simple,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              Transparent Pricing
            </span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
            Choose the plan that fits your career goals. No hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Category Toggle */}
        <motion.div 
          className="flex justify-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-full p-1 inline-flex">
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
              className={`relative z-10 min-w-[140px] px-6 py-3 sm:min-w-[160px] sm:px-8 sm:py-4 rounded-full font-medium text-sm sm:text-base transition-colors duration-300 ${
                selectedCategory === 'essential'
                  ? 'text-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Essential
            </button>
            <button
              onClick={() => setSelectedCategory('professional')}
              className={`relative z-10 min-w-[140px] px-6 py-3 sm:min-w-[160px] sm:px-8 sm:py-4 rounded-full font-medium text-sm sm:text-base transition-colors duration-300 ${
                selectedCategory === 'professional'
                  ? 'text-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Professional
            </button>
          </div>
        </motion.div>


        {/* Plans Grid */}
        <motion.div 
          className={`grid gap-6 ${
            filteredPlans.length === 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          {filteredPlans.map((plan, index) => {
            const regionalPrice = getRegionalPrice(plan);
            const currencySymbol = getCurrencySymbol();
            const effectivePrice = getEffectivePrice(plan);
            const hasPromo = hasPromotionalPricing(plan);
            const Icon = getPlanIcon(plan.key);
            const monthlyEquivalent = getMonthlyEquivalent(plan);

            return (
                <motion.div
                  key={plan._id}
                  className={`group relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 min-h-[600px] flex flex-col card-hover ${
                    plan.isPopular ? 'ring-2 ring-lime-400/50' : ''
                  }`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.02,
                  y: -5,
                  boxShadow: "0 15px 30px -5px rgba(132, 204, 22, 0.3)"
                }}
                style={{ willChange: 'transform' }}
              >
                {/* Glow Effect */}
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-lime-400/10 to-lime-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ filter: 'blur(20px)' }}
                />
                {/* Popular Badge */}
                {plan.isPopular && (
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
                      {plan.promotionDescription || 'Limited Time!'}
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
                <h3 className="text-lg sm:text-xl font-bold mb-3 text-white relative z-10">{plan.name}</h3>

                {/* Plan Description */}
                <p className="text-white/80 mb-4 text-xs sm:text-sm leading-relaxed relative z-10">
                  {plan.description}
                </p>

                {/* Pricing */}
                <div className="mb-6 relative z-10">
                  {plan.key === 'free' ? (
                    <div className="text-2xl sm:text-3xl font-bold text-white">Free</div>
                  ) : (
                    <div>
                      {hasPromo ? (
                        <div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-2xl sm:text-3xl font-bold text-white">
                                {monthlyEquivalent.showMonthly ? monthlyEquivalent.price : regionalPrice}
                              </span>
                              <span className="text-base sm:text-lg text-white/50 line-through">
                                {currencySymbol}{plan.price_one_time || plan.price_monthly}
                              </span>
                            </div>
                            {monthlyEquivalent.showMonthly && (
                              <div className="text-sm text-white/60">
                                {regionalPrice} total
                              </div>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm text-lime-400 font-medium mt-1">
                            {plan.promotionDescription || 'Limited Time Offer!'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl sm:text-3xl font-bold text-white">
                            {monthlyEquivalent.showMonthly ? monthlyEquivalent.price : regionalPrice}
                          </div>
                          {monthlyEquivalent.showMonthly && (
                            <div className="text-sm text-white/60 mt-1">
                              {regionalPrice} total
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-white/60 text-xs sm:text-sm mt-1">
                        {plan.key === 'day_pass' 
                          ? 'one-time' 
                          : monthlyEquivalent.showMonthly 
                            ? 'billed as shown above'
                            : (plan.price_quarterly ? 'quarterly' : plan.price_yearly ? 'yearly' : plan.price_monthly ? 'monthly' : 'one-time')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 relative z-10 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + featureIndex * 0.1 }}
                        whileHover={{ scale: 1.2 }}
                      >
                        <Check size={18} className="text-lime-400 flex-shrink-0 mt-0.5" />
                      </motion.div>
                      <span className="text-white/80 text-sm sm:text-base leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Not Included Features */}
                {plan.notIncludedFeatures && plan.notIncludedFeatures.length > 0 && (
                  <div className="mb-4 relative z-10">
                    <h4 className="text-xs font-medium text-white/60 mb-2">Not Included:</h4>
                    <ul className="space-y-1">
                      {plan.notIncludedFeatures.slice(0, 2).map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                          </div>
                          <span className="text-white/60 text-xs">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CTA Button */}
                <motion.button
                  onClick={() => handlePlanSelect(plan)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-lg hover:from-lime-500 hover:to-lime-600 transition-all duration-300 transform hover:scale-105 shadow-lg relative z-10"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 20px 40px -12px rgba(132, 204, 22, 0.5)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {plan.key === 'free' ? 'Get Started Free' : 'Choose Plan'}
                  <ArrowRight size={16} className="inline-block ml-2" />
                </motion.button>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-white/70 mb-4 text-sm">Have questions about pricing?</p>
          <motion.button 
            className="group text-lime-400 hover:text-lime-300 font-semibold transition-colors duration-300 flex items-center gap-2 mx-auto"
            whileHover={{ x: 5 }}
          >
            <span>Contact our sales team</span>
            <motion.div
              whileHover={{ rotate: 45 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowRight size={14} />
            </motion.div>
          </motion.button>
        </motion.div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          preselectedPlanKey={selectedPlan.key}
          onSuccess={() => {
            setShowPaymentModal(false);
            // Handle success (redirect, show success message, etc.)
          }}
        />
      )}
    </section>
  );
};

export default Pricing;