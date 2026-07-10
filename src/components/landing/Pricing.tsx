'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, ArrowRight, Brain, Users, Crown, Globe, CreditCard, Shield, Clock, Gift } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PricingData } from '@/lib/payment/locationService';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import { usePricingPlans, DatabasePricingPlan } from '@/lib/hooks/usePricingPlans';
import { useAuthModalStore } from '@/lib/stores/authModalStore';

interface PricingProps {
  onPlanSelect?: (plan: DatabasePricingPlan, pricingData: PricingData) => void;
  onSuccess?: () => void;
}

const HARDCODED_PLANS: DatabasePricingPlan[] = [
  {
    _id: 'starter_monthly',
    key: 'starter_monthly',
    name: 'Starter',
    description: 'Ideal for basic resume building and standard editing.',
    price_monthly: 0,
    price: 0,
    currency: 'USD',
    features: [
      'Access to All Templates',
      'CV & Cover Letter Editing',
      'Spelling-only ATS Scoring',
      'Snippets',
      'Custom ATS Templates',
      'Standard Customer Support'
    ],
    notIncludedFeatures: [
      'AI Cover Letter Generator',
      'LinkedIn Enhancer (Optimizer)',
      'Mori AI Chat',
      'AI Interview Coach Simulator',
      'Job Application Tracker',
      'Auto Job Application Bot',
      'Permanent Career Vault'
    ],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all'
  },
  {
    _id: 'starter_yearly',
    key: 'starter_yearly',
    name: 'Starter',
    description: 'Ideal for basic resume building and standard editing.',
    price_yearly: 19.99,
    price: 19.99,
    currency: 'USD',
    features: [
      'Access to All Templates',
      'CV & Cover Letter Editing',
      'Spelling-only ATS Scoring',
      'Snippets',
      'Custom ATS Templates',
      'Standard Customer Support',
      'Mori AI chat'
    ],
    notIncludedFeatures: [
      'AI Cover Letter Generator',
      'LinkedIn Enhancer (Optimizer)',
      'AI Interview Coach Simulator',
      'Job Application Tracker',
      'Auto Job Application Bot',
      'Permanent Career Vault'
    ],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all'
  },
  {
    _id: 'focused_monthly',
    key: 'focused_monthly',
    name: 'Focused',
    description: 'Best for active job hunters who want AI assistance.',
    price_monthly: 9.99,
    price: 9.99,
    currency: 'USD',
    features: [
      'Access to All Templates',
      'CV & Cover Letter Editing',
      'Live ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer (Optimizer)',
      'AI Interview Coach Simulator',
      'Job Application Tracker (Full)',
      'Snippets',
      'Custom ATS Templates',
      'Priority Customer Support'
    ],
    notIncludedFeatures: [
      'Mori AI Chat',
      'Auto Job Application Bot',
      'Permanent Career Vault'
    ],
    isPopular: true,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all'
  },
  {
    _id: 'focused_yearly',
    key: 'focused_yearly',
    name: 'Focused',
    description: 'Best for active job hunters who want AI assistance.',
    price_yearly: 79.99,
    price: 79.99,
    currency: 'USD',
    features: [
      'Access to All Templates',
      'CV & Cover Letter Editing',
      'Live ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer (Optimizer)',
      'Mori AI chat',
      'AI Interview Coach Simulator',
      'Job Application Tracker (Full)',
      'Snippets',
      'Custom ATS Templates',
      'Priority Customer Support'
    ],
    notIncludedFeatures: [
      'Auto Job Application Bot',
      'Permanent Career Vault'
    ],
    isPopular: true,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all'
  },
  {
    _id: 'smart_quarterly',
    key: 'smart_quarterly',
    name: 'Smart',
    description: 'Our premium tier with automated applications.',
    price_quarterly: 59.99,
    price: 59.99,
    currency: 'USD',
    features: [
      'Access to All Templates',
      'CV & Cover Letter Editing',
      'Live ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer (Optimizer)',
      'Mori AI chat',
      'AI Interview Coach Simulator',
      'Job Application Tracker (Full)',
      'Auto Job Application Bot',
      'Snippets',
      'Custom ATS Templates',
      'VIP 24/7 Support'
    ],
    notIncludedFeatures: [
      'Permanent Career Vault'
    ],
    isPopular: false,
    isBestValue: true,
    displayOnLanding: true,
    targetAudience: 'all'
  },
  {
    _id: 'smart_yearly',
    key: 'smart_yearly',
    name: 'Smart',
    description: 'Our premium tier with automated applications.',
    price_yearly: 199.00,
    price: 199.00,
    currency: 'USD',
    features: [
      'Access to All Templates',
      'CV & Cover Letter Editing',
      'Live ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer (Optimizer)',
      'Mori AI chat',
      'AI Interview Coach Simulator',
      'Job Application Tracker (Full)',
      'Auto Job Application Bot',
      'Snippets',
      'Custom ATS Templates',
      'VIP 24/7 Support'
    ],
    notIncludedFeatures: [
      'Permanent Career Vault'
    ],
    isPopular: false,
    isBestValue: true,
    displayOnLanding: true,
    targetAudience: 'all'
  }
];

const Pricing: React.FC<PricingProps> = ({ onPlanSelect, onSuccess }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('professional'); // 'essential' or 'professional'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DatabasePricingPlan | null>(null);
  const [selectedMobilePlanKey, setSelectedMobilePlanKey] = useState('focused_yearly');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly');

  const handleIntervalChange = (interval: 'monthly' | 'yearly') => {
    setBillingInterval(interval);
    if (interval === 'monthly') {
      setSelectedMobilePlanKey('focused_monthly');
    } else {
      setSelectedMobilePlanKey('focused_yearly');
    }
  };

  // Use the shared pricing hook
  const {
    plans: databasePlans,
    promotionalOffers,
    locationData,
    regionalPricing,
    selectedCurrency,
    loading: dbLoading,
    error: dbError,
    getRegionalPrice,
    getMonthlyEquivalent,
    getCurrencySymbol,
    getEffectivePrice,
    hasPromotionalPricing
  } = usePricingPlans({ publicOnly: true });

  const pricingPlans = HARDCODED_PLANS;
  const loading = false;
  const error = null;


  // Get plan icon
  const getPlanIcon = (planKey: string) => {
    switch (planKey) {
      case 'free': return Brain;
      case 'pro_monthly': return Crown;
      case 'pro_quarterly': return Users;
      case 'pro_yearly': return Globe;
      case 'pro_lifetime': return Star;
      default: return Brain;
    }
  };


  // Handle plan selection
  const handlePlanSelect = (plan: DatabasePricingPlan) => {
    // Check if user is authenticated using NextAuth session
    const isAuthenticated = status === 'authenticated' && !!session?.user;

    if (!isAuthenticated) {
      // Route to sign in page with plan preselected
      router.push(`/sign-in?callbackUrl=/dashboard?plan=${plan.key}`);
      return;
    }

    // If authenticated, show payment modal directly
    setSelectedPlan(plan);
    setShowPaymentModal(true);

    if (onPlanSelect && locationData && regionalPricing) {
      // Create pricing data from regional pricing
      const regionalPriceStr = getRegionalPrice(plan);
      // Extract numeric value from price string (handles commas, dots, currency symbols)
      const priceValue = parseFloat(regionalPriceStr.replace(/[^\d.,]/g, '').replace(',', ''));
      const pricingData: PricingData = {
        originalPrice: plan.price_one_time || plan.price_monthly || 0,
        originalCurrency: plan.currency,
        convertedPrice: priceValue,
        convertedCurrency: regionalPricing.currency,
        exchangeRate: priceValue / (plan.price_one_time || plan.price_monthly || 1),
        paymentPartner: locationData.paymentPartner
      };
      onPlanSelect(plan, pricingData);
    }
  };

  // Filter plans based on Monthly/Yearly toggle
  const filteredPlans = useMemo(() => {
    // Ensure pricingPlans is always an array
    const safePlans = Array.isArray(pricingPlans) ? pricingPlans : [];
    
    // Support both spellings for robustness — exclude 'free' plan from the table
    const activeKeys = billingInterval === 'monthly'
      ? ['starter_monthly', 'focused_monthly', 'smart_quarterly']
      : ['starter_yearly', 'focused_yearly', 'smart_yearly'];
      
    return safePlans
      .filter(plan => activeKeys.includes(plan.key))
      .sort((a, b) => {
        // Find best match in activeKeys to preserve intended order
        const getIndex = (key: string) => {
          if (billingInterval === 'monthly') {
            if (key === 'starter_monthly') return 0;
            if (key === 'focused_monthly') return 1;
            if (key.includes('smart')) return 2;
          } else {
            if (key.includes('starter')) return 0;
            if (key.includes('focused')) return 1;
            if (key.includes('smart')) return 2;
          }
          return 99;
        };
        return getIndex(a.key) - getIndex(b.key);
      });
  }, [pricingPlans, billingInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingAnimation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-gray-900 dark:text-white text-center">
          <p className="text-red-400 mb-2">Error loading pricing plans</p>
          <p className="text-small text-gray-500 dark:text-white/60">{typeof error === 'object' && error.message ? error.message : String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <section id="pricing" className="relative py-24 bg-gray-50 dark:bg-[#141810] overflow-hidden">
      {/* Grid Pattern Background with Glowing Dots */}
      <div className="absolute inset-0">
        {/* Grid Lines - Much more visible */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(rgba(132, 204, 22, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(132, 204, 22, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Glowing Dots at Grid Intersections */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <filter id="glow-pricing">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Generate dots at grid intersections */}
          {Array.from({ length: 45 }).map((_, i) => {
            // Position dots at regular intervals (grid intersections)
            const col = (i % 15) * 6.67; // Every ~6.67% horizontally (15 columns)
            const row = Math.floor(i / 15) * 6.67; // Every ~6.67% vertically
            // Only show some dots with animation for variety
            const shouldGlow = i % 3 === 0 || i % 5 === 0;

            return shouldGlow ? (
              <circle
                key={i}
                cx={`${col}%`}
                cy={`${row}%`}
                r="2.5"
                fill="#81ff00"
                opacity={0.1}
                filter="url(#glow-pricing)"
              >
                <animate
                  attributeName="opacity"
                  values="0.1;0.4;0.1"
                  dur={`${3 + (i % 3)}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ) : null;
          })}
        </svg>

        {/* Gradient Overlay - Reduced to show grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/50 dark:from-[#141810]/50 dark:to-[#141810]/50"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/5 to-blue-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 w-full flex flex-col items-start">
        {/* Header */}
        <motion.div
          className="text-left mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {/* Decorative squiggle */}
          <motion.div
            className="mb-6 flex justify-start"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#81ff00]">
              <path
                d="M2 12C6 6 10 18 14 12C18 6 22 18 26 12C30 6 34 18 38 12C42 6 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
          <h2 className="!text-[2rem] tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-gray-900 dark:text-white mb-6 text-left tracking-tighter !leading-[1.05]">
            Simple,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-lime-600 dark:from-lime-400 dark:to-lime-500">
              Transparent Pricing
            </span>
          </h2>
          <p className="text-small tablet:text-small desktop:text-body text-gray-600 dark:text-white/70 max-w-3xl leading-relaxed">
            Choose the plan that fits your career goals. No hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Toggle Switcher */}
        <div className="flex justify-start mb-12 relative z-20">
          <div className="relative flex p-1 bg-white/80 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-full shadow-lg">
            <button
              onClick={() => handleIntervalChange('monthly')}
              className={`relative z-10 px-6 py-2.5 text-small tablet:text-small font-bold rounded-full transition-colors duration-300 ${
                billingInterval === 'monthly'
                  ? 'text-black font-extrabold'
                  : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Monthly billing
              {billingInterval === 'monthly' && (
                <motion.div
                  layoutId="billing-active-pill"
                  className="absolute inset-0 bg-[#81ff00] rounded-full -z-10 shadow-md"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </button>
            <button
              onClick={() => handleIntervalChange('yearly')}
              className={`relative z-10 px-6 py-2.5 text-small tablet:text-small font-bold rounded-full transition-colors duration-300 flex items-center gap-1.5 ${
                billingInterval === 'yearly'
                  ? 'text-black font-extrabold'
                  : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Yearly billing</span>
              <span className="inline-flex px-1.5 py-0.5 text-[9px] font-extrabold rounded-full bg-red-500 text-white animate-pulse">
                Save up to 50%
              </span>
              {billingInterval === 'yearly' && (
                <motion.div
                  layoutId="billing-active-pill"
                  className="absolute inset-0 bg-[#81ff00] rounded-full -z-10 shadow-md"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Comparison Table Data */}
        {(() => {
          const comparisonFeatures = [
            { name: 'Access to All Templates', free: '✓', starter_monthly: '✓', starter_yearly: '✓', focused_monthly: '✓', focused_yearly: '✓', smart_quarterly: '✓', smart_yearly: '✓', pro_monthly: '✓', pro_quarterly: '✓', pro_yearly: '✓', pro_lifetime: '✓' },
            { name: 'CV & Cover Letter Editing', free: 'Unlimited', starter_monthly: 'Unlimited', starter_yearly: 'Unlimited', focused_monthly: 'Unlimited', focused_yearly: 'Unlimited', smart_quarterly: 'Unlimited', smart_yearly: 'Unlimited', pro_monthly: 'Unlimited', pro_quarterly: 'Unlimited', pro_yearly: 'Unlimited', pro_lifetime: 'Unlimited' },
            { name: 'Real-time ATS Scoring & Editor', free: 'Spelling Only', starter_monthly: 'Spelling Only', starter_yearly: '✓ (Live ATS)', focused_monthly: '✓ (Live ATS)', focused_yearly: '✓ (Live ATS)', smart_quarterly: '✓ (Live ATS)', smart_yearly: '✓ (Live ATS)', pro_monthly: '✓', pro_quarterly: '✓', pro_yearly: '✓', pro_lifetime: '✓' },
            { name: 'AI Cover Letter Generator', free: '✗', starter_monthly: '✗', starter_yearly: '✓', focused_monthly: '✓', focused_yearly: '✓', smart_quarterly: '✓', smart_yearly: '✓', pro_monthly: '✓', pro_quarterly: '✓', pro_yearly: '✓', pro_lifetime: '✓' },
            { name: 'LinkedIn Enhancer (Optimizer)', free: '✗', starter_monthly: '✗', starter_yearly: '✗', focused_monthly: '✓', focused_yearly: '✓', smart_quarterly: '✓', smart_yearly: '✓', pro_monthly: '✓', pro_quarterly: '✓', pro_yearly: '✓', pro_lifetime: '✓' },
            { name: 'Mori AI Chat', free: '✗', starter_monthly: '✗', starter_yearly: '✓', focused_monthly: '✗', focused_yearly: '✓', smart_quarterly: '✓', smart_yearly: '✓', pro_monthly: '✓', pro_quarterly: '✓', pro_yearly: '✓', pro_lifetime: '✓' },
            { name: 'AI Interview Coach Simulator', free: '✗', starter_monthly: '✗', starter_yearly: '✗', focused_monthly: '✓', focused_yearly: '✓', smart_quarterly: '✓', smart_yearly: '✓', pro_monthly: '✓', pro_quarterly: '✓', pro_yearly: '✓', pro_lifetime: '✓' },
            { name: 'Job Application Tracker', free: '✓ (Basic)', starter_monthly: '✗', starter_yearly: '✗', focused_monthly: '✓ (Full)', focused_yearly: '✓ (Full)', smart_quarterly: '✓ (Full)', smart_yearly: '✓ (Full)', pro_monthly: '✓ (Full)', pro_quarterly: '✓ (Full)', pro_yearly: '✓ (Full)', pro_lifetime: '✓ (Full)' },
            { name: 'Auto Job Application Bot', free: '✗', starter_monthly: '✗', starter_yearly: '✗', focused_monthly: '✗', focused_yearly: '✗', smart_quarterly: '✓', smart_yearly: '✓', pro_monthly: '✗', pro_quarterly: '✗', pro_yearly: '✗', pro_lifetime: '✗' },
            { name: 'Permanent Career Vault', free: '✗', starter_monthly: '✗', starter_yearly: '✗', focused_monthly: '✗', focused_yearly: '✗', smart_quarterly: '✗', smart_yearly: '✗', pro_monthly: '✗', pro_quarterly: '✗', pro_yearly: '✗', pro_lifetime: '✓' },
            { name: 'Snippets', free: '✓', starter_monthly: '✓', starter_yearly: '✓', focused_monthly: '✓', focused_yearly: '✓', smart_quarterly: '✓', smart_yearly: '✓', pro_monthly: '✓', pro_quarterly: '✓', pro_yearly: '✓', pro_lifetime: '✓' },
            { name: 'Custom ATS Templates', free: '✓', starter_monthly: '✓', starter_yearly: '✓', focused_monthly: '✓', focused_yearly: '✓', smart_quarterly: '✓', smart_yearly: '✓', pro_monthly: '✓', pro_quarterly: '✓', pro_yearly: '✓', pro_lifetime: '✓' },
            { name: 'Customer Support Level', free: 'Standard', starter_monthly: 'Standard', starter_yearly: 'Standard', focused_monthly: 'Priority', focused_yearly: 'Priority', smart_quarterly: 'VIP 24/7 Support', smart_yearly: 'VIP 24/7 Support', pro_monthly: 'Standard', pro_quarterly: 'Priority Support', pro_yearly: 'Priority Support', pro_lifetime: 'VIP 24/7 Support' },
          ];

          const leftPlan = billingInterval === 'monthly'
            ? filteredPlans.find(p => p.key === 'starter_monthly')
            : filteredPlans.find(p => p.key === 'starter_yearly');
          const selectedProPlan = filteredPlans.find(p => p.key === selectedMobilePlanKey);

          const getMobilePlanPriceDisplay = (plan: DatabasePricingPlan) => {
            if (plan.key === 'starter_monthly') {
              return 'FREE';
            }
            const regionalPrice = getRegionalPrice(plan);
            if (plan.key === 'starter_yearly') {
              const symbol = plan.regionalPricing?.currencySymbol || '$';
              const yearlyTotalVal = plan.price_yearly || 19.99;
              return `${symbol}${(yearlyTotalVal / 12).toFixed(2)}/mo`;
            }
            const monthlyEquivalent = getMonthlyEquivalent(plan);
            return monthlyEquivalent.showMonthly ? monthlyEquivalent.price : regionalPrice;
          };

          const getMobilePlanSubtext = (plan: DatabasePricingPlan) => {
            if (plan.key === 'starter_monthly') {
              return (
                <div className="flex flex-col items-center text-center">
                  <span className="text-[8px] text-gray-400 line-through font-normal">$3.99/mo</span>
                </div>
              );
            }
            if (plan.key === 'starter_yearly') {
              const rPrice = getRegionalPrice(plan);
              return (
                <div className="flex flex-col items-center">
                  {plan.isPromotionActive && plan.price_yearly !== 19.99 && plan.price_yearly !== 39.99 && (
                    <span className="text-[8px] text-gray-400 line-through font-normal">
                      {plan.regionalPricing?.currencySymbol || '$'}{plan.price_yearly || 39.99} total
                    </span>
                  )}
                  <span className="text-[8px] text-gray-500 dark:text-white/60 font-normal">
                    {rPrice.endsWith('*') ? `${rPrice.slice(0, -1)} total*` : `${rPrice} total`}
                  </span>
                  <span className="text-[8px] text-gray-400 font-normal mt-0.5">billed annually</span>
                </div>
              );
            }
            const monthlyEquivalent = getMonthlyEquivalent(plan);
            const regionalPrice = getRegionalPrice(plan);
            return (
              <div className="flex flex-col items-center">
                {monthlyEquivalent.showMonthly && (
                  <span className="text-[8px] text-gray-500 dark:text-white/60 font-normal">
                    {regionalPrice.endsWith('*') ? `${regionalPrice.slice(0, -1)} total*` : `${regionalPrice} total`}
                  </span>
                )}
                <span className="text-[8px] text-gray-400 font-normal mt-0.5">
                  {plan.key.includes('monthly')
                    ? 'recurring monthly'
                    : plan.key.includes('quarterly')
                      ? 'billed quarterly'
                      : plan.key.includes('yearly')
                        ? 'billed annually'
                        : 'one-time'}
                </span>
              </div>
            );
          };

          const renderFeatureVal = (value: string) => {
            if (value === '✓') {
              return <Check className="w-4 h-4 text-lime-500 mx-auto" />;
            }
            if (value === '✗') {
              return <span className="text-gray-300 dark:text-white/10 font-bold">—</span>;
            }
            return (
              <span className="inline-block px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white/80 font-medium">
                {value}
              </span>
            );
          };

          return (
            <motion.div
              className="w-full max-w-[90rem] mx-auto rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl bg-white dark:bg-[#1A2015] backdrop-blur-sm relative z-10 p-2 desktop:p-0 overflow-hidden"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              {/* Desktop Version */}
              <div className="hidden desktop:block w-full overflow-visible">
                <table className="w-full border-collapse table-layout-fixed">
                  <thead>
                    {/* Row 1: Plan Names */}
                    <tr className="bg-gray-50/50 dark:bg-black/20">
                      <th className="p-4 text-left border-b border-gray-200 dark:border-white/10 w-[25%] sticky left-0 bg-gray-50 dark:bg-[#1A2015] z-20">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold text-lime-600 dark:text-lime-400 uppercase tracking-widest mb-0.5">CVCircle Plans</span>
                          <span className="text-h3 font-bold text-gray-900 dark:text-white">Compare Features</span>
                        </div>
                      </th>
                      {filteredPlans.map((plan) => {
                        const isPopular = plan.isPopular;
                        const isBestValue = plan.isBestValue;
                        return (
                          <th
                            key={`header-${plan.key}`}
                            className={`p-4 text-center align-middle w-[15%] border-b border-gray-200 dark:border-white/10 ${
                              isPopular ? 'bg-lime-500/[0.03] dark:bg-lime-400/[0.02] border-x border-lime-500/30' : ''
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center">
                              {/* Badge */}
                              {isPopular && (
                                <span className="bg-lime-500 dark:bg-lime-400 text-white dark:text-gray-900 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 shadow-md">
                                  Most Popular
                                </span>
                              )}
                              {isBestValue && (
                                <span className="bg-blue-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 shadow-md">
                                  Best Value
                                </span>
                              )}
                              {!isPopular && !isBestValue && <div className="h-[19px] mb-1.5" />}
                               <h3 className="text-small font-bold text-gray-900 dark:text-white">
                                 {plan.name.replace(/\s*(Monthly|Yearly|Quarterly)/gi, '')}
                               </h3>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="group hover:bg-gray-50/50 dark:hover:bg-[#81ff00]/[0.02] transition-colors"
                      >
                        <td className="p-4 text-small font-semibold text-gray-800 dark:text-white/90 border-b border-gray-200 dark:border-white/10 text-left sticky left-0 bg-white dark:bg-[#1A2015] z-10 group-hover:bg-gray-50/80 dark:group-hover:bg-[#20291d] transition-colors duration-200 w-[25%]">
                          {row.name}
                        </td>

                        {filteredPlans.map((plan) => {
                          const value = (row as any)[plan.key];
                          const isPopular = plan.isPopular;

                          return (
                            <td
                              key={`${plan.key}-${rowIndex}`}
                              className={`p-4 text-center border-b border-gray-200 dark:border-white/10 text-small font-medium text-gray-600 dark:text-white/70 w-[15%] ${
                                isPopular ? 'bg-lime-500/[0.015] dark:bg-lime-400/[0.01] border-x border-lime-500/20' : ''
                              }`}
                            >
                              {value === '✓' ? (
                                <Check className="w-5 h-5 text-lime-500 mx-auto" />
                              ) : value === '✗' ? (
                                <span className="text-gray-300 dark:text-white/10 font-bold">—</span>
                              ) : (
                                <span className="inline-block px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white/80 font-medium text-center">
                                  {value}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {/* Row 2: Prices */}
                    <tr className="bg-gray-50/30 dark:bg-black/10 border-t border-gray-200 dark:border-white/10">
                      <td className="p-4 border-b border-gray-200 dark:border-white/10 w-[25%] bg-gray-50 dark:bg-[#1A2015] sticky left-0 z-20 font-bold text-small text-gray-800 dark:text-white/90">
                        Price
                      </td>
                      {filteredPlans.map((plan) => {
                        const regionalPrice = getRegionalPrice(plan);
                        const monthlyEquivalent = getMonthlyEquivalent(plan);
                        const isPopular = plan.isPopular;
                        return (
                          <td
                            key={`price-${plan.key}`}
                            className={`p-4 text-center align-top w-[15%] border-b border-gray-200 dark:border-white/10 ${
                              isPopular ? 'bg-lime-500/[0.03] dark:bg-lime-400/[0.02] border-x border-lime-500/30' : ''
                            }`}
                          >
                            <div className="flex flex-col items-center justify-start min-h-[64px]">
                               {plan.key === 'free' ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-h3 tablet:text-h2 font-extrabold text-gray-900 dark:text-white leading-tight">Free</span>
                                  <span className="text-[9px] text-gray-400 mt-0.5 font-normal">no subscription</span>
                                </div>
                              ) : plan.key === 'starter_monthly' ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-small text-gray-400 line-through font-normal mb-0.5">$3.99/mo</span>
                                  <span className="text-h3 tablet:text-h2 font-extrabold text-lime-600 dark:text-lime-400 leading-tight">FREE</span>
                                </div>
                              ) : plan.key === 'starter_yearly' ? (
                                <div className="flex flex-col items-center">
                                  {plan.isPromotionActive && plan.price_yearly !== 19.99 && plan.price_yearly !== 39.99 && (
                                    <span className="text-small text-gray-400 line-through font-normal mb-0.5">
                                      {plan.regionalPricing?.currencySymbol || '$'}{plan.price_yearly || 39.99}
                                    </span>
                                  )}
                                  <span className="text-h3 tablet:text-h2 font-extrabold text-gray-900 dark:text-white leading-tight">
                                    {plan.regionalPricing?.currencySymbol || '$'}{( (plan.price_yearly || 19.99) / 12 ).toFixed(2)}/mo
                                  </span>
                                  <span className="text-[9px] text-gray-500 dark:text-white/60 mt-0.5 font-normal">
                                    {regionalPrice.endsWith('*') ? `${regionalPrice.slice(0, -1)} total*` : `${regionalPrice} total`}
                                  </span>
                                  <span className="text-[9px] text-gray-400 mt-0.5 font-normal">billed annually</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className="text-h3 tablet:text-h2 font-extrabold text-gray-900 dark:text-white leading-tight">
                                    {(() => {
                                      const basePriceStr = monthlyEquivalent.showMonthly ? monthlyEquivalent.price : regionalPrice;
                                      const suffix = plan.key.includes('monthly') ? '/m' : plan.key.includes('quarterly') ? '/3months' : '';
                                      if (basePriceStr.endsWith('*')) {
                                        return `${basePriceStr.slice(0, -1)}${suffix}*`;
                                      }
                                      return `${basePriceStr}${suffix}`;
                                    })()}
                                  </span>
                                  {monthlyEquivalent.showMonthly && (
                                    <span className="text-[9px] text-gray-500 dark:text-white/60 mt-0.5 font-normal">
                                      {regionalPrice.endsWith('*') ? `${regionalPrice.slice(0, -1)} total*` : `${regionalPrice} total`}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-gray-400 mt-0.5 font-normal">
                                    {plan.key.includes('monthly')
                                      ? 'recurring monthly'
                                      : plan.key.includes('quarterly')
                                        ? 'billed quarterly'
                                        : plan.key.includes('yearly')
                                          ? 'billed annually'
                                          : 'one-time'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row 3: Action Buttons */}
                    <tr className="bg-gray-50/30 dark:bg-black/10">
                      <td className="p-4 border-b border-gray-200 dark:border-white/10 w-[25%] bg-gray-50 dark:bg-[#1A2015] sticky left-0 z-20" />
                      {filteredPlans.map((plan) => {
                        const isPopular = plan.isPopular;
                        return (
                          <td
                            key={`cta-${plan.key}`}
                            className={`p-4 text-center align-middle w-[15%] border-b border-gray-200 dark:border-white/10 ${
                              isPopular ? 'bg-lime-500/[0.03] dark:bg-lime-400/[0.02] border-x border-lime-500/30' : ''
                            }`}
                          >
                              <motion.button
                               onClick={() => handlePlanSelect(plan)}
                               className={`w-full py-2 px-3 text-small font-bold rounded-lg transition-all duration-300 ${
                                 plan.key === 'starter_monthly'
                                   ? 'bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/20 text-gray-900 dark:text-white'
                                   : 'bg-[#81ff00] hover:bg-lime-400 text-black shadow-md hover:shadow-lime-400/20'
                               }`}
                               whileHover={{ scale: 1.03 }}
                               whileTap={{ scale: 0.97 }}
                             >
                               {plan.key === 'starter_monthly' ? 'Subscribe Free' : 'Choose Plan'}
                             </motion.button>
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Version */}
              <div className="block desktop:hidden w-full overflow-visible">
                {/* Pro Plan Selector */}
                <div className="flex justify-center my-4 px-2">
                  <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/5 backdrop-blur-sm">
                    {(billingInterval === 'monthly'
                      ? [
                          { key: 'focused_monthly', label: 'Focused Mo' },
                          { key: 'smart_quarterly', label: 'Smart Qtr' }
                        ]
                      : [
                          { key: 'focused_yearly', label: 'Focused Yr' },
                          { key: 'smart_yearly', label: 'Smart Yr' }
                        ]
                    ).map((interval) => {
                      const isActive = selectedMobilePlanKey === interval.key;
                      return (
                        <button
                          key={interval.key}
                          onClick={() => setSelectedMobilePlanKey(interval.key)}
                          className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-[#81ff00] text-black shadow-md'
                              : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          {interval.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Table */}
                <table className="w-full border-collapse table-layout-fixed">
                  <thead>
                    {/* Row 1: Names */}
                    <tr className="bg-gray-50/50 dark:bg-black/20">
                      <th className="p-3 text-left border-b border-gray-200 dark:border-white/10 w-[40%]">
                        <span className="text-[10px] font-bold text-gray-900 dark:text-white">Features</span>
                      </th>
                      <th className="p-3 text-center border-b border-gray-200 dark:border-white/10 w-[30%]">
                        <span className="text-small font-bold text-gray-900 dark:text-white">
                          {leftPlan ? leftPlan.name.replace(/\s*(Monthly|Yearly|Quarterly)/gi, '') : 'Starter'}
                        </span>
                      </th>
                      <th className="p-3 text-center border-b border-gray-200 dark:border-white/10 w-[30%] bg-lime-500/[0.03] dark:bg-lime-400/[0.02] border-x border-lime-500/20">
                        <div className="flex flex-col items-center">
                          <span className="bg-lime-500 dark:bg-lime-400 text-white dark:text-gray-900 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-1 shadow-md">
                            Pro Choice
                          </span>
                          <span className="text-small font-bold text-gray-900 dark:text-white text-center leading-tight">
                            {selectedProPlan ? selectedProPlan.name.replace(/\s*(Monthly|Yearly|Quarterly)/gi, '') : 'Pro'}
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((row, rowIndex) => {
                      const leftVal = leftPlan ? (row as any)[leftPlan.key] : '✗';
                      const proVal = selectedProPlan ? (row as any)[selectedProPlan.key] : '✗';

                      return (
                        <tr
                          key={`mobile-row-${rowIndex}`}
                          className="group hover:bg-gray-50/50 dark:hover:bg-[#81ff00]/[0.02] transition-colors"
                        >
                          <td className="p-3 text-small font-semibold text-gray-800 dark:text-white/90 border-b border-gray-200 dark:border-white/10 text-left w-[40%]">
                            {row.name}
                          </td>
                          <td className="p-3 text-center border-b border-gray-200 dark:border-white/10 text-[10px] font-medium text-gray-600 dark:text-white/70 w-[30%]">
                            {renderFeatureVal(leftVal)}
                          </td>
                          <td className="p-3 text-center border-b border-gray-200 dark:border-white/10 text-[10px] font-medium text-gray-600 dark:text-white/70 bg-lime-500/[0.015] dark:bg-lime-400/[0.01] border-x border-lime-500/20 w-[30%]">
                            {renderFeatureVal(proVal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {/* Row 2: Prices */}
                    <tr className="bg-gray-50/30 dark:bg-black/10 border-t border-gray-200 dark:border-white/10">
                      <td className="p-3 text-small font-bold text-gray-800 dark:text-white/90 border-b border-gray-200 dark:border-white/10 text-left w-[40%]">
                        Price
                      </td>
                      <td className="p-3 text-center border-b border-gray-200 dark:border-white/10 w-[30%] align-top">
                        {leftPlan && (
                          <div className="flex flex-col items-center min-h-[48px]">
                            <span className="text-small font-extrabold tablet:text-body text-gray-900 dark:text-white text-center">
                              {leftPlan.key === 'starter_monthly' ? 'Free' : getMobilePlanPriceDisplay(leftPlan)}
                            </span>
                            {getMobilePlanSubtext(leftPlan)}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center border-b border-gray-200 dark:border-white/10 w-[30%] bg-lime-500/[0.03] dark:bg-lime-400/[0.02] border-x border-lime-500/20 align-top">
                        {selectedProPlan && (
                          <div className="flex flex-col items-center min-h-[48px]">
                            <span className="text-small font-extrabold tablet:text-body text-gray-900 dark:text-white text-center">
                              {getMobilePlanPriceDisplay(selectedProPlan)}
                            </span>
                            {getMobilePlanSubtext(selectedProPlan)}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Row 3: CTA */}
                    <tr className="bg-gray-50/30 dark:bg-black/10">
                      <td className="p-2 border-b border-gray-200 dark:border-white/10 w-[40%]" />
                      <td className="p-2 text-center border-b border-gray-200 dark:border-white/10 w-[30%] align-middle">
                        {leftPlan && (
                          <motion.button
                            onClick={() => handlePlanSelect(leftPlan)}
                            className={`w-full py-1.5 px-2 text-[10px] font-bold rounded-md transition-all duration-300 ${
                              leftPlan.key === 'starter_monthly'
                                ? 'bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/20 text-gray-900 dark:text-white'
                                : 'bg-[#81ff00] hover:bg-lime-400 text-black shadow-sm hover:shadow-lime-400/20'
                            }`}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {leftPlan.key === 'starter_monthly' ? 'Subscribe Free' : 'Choose Plan'}
                          </motion.button>
                        )}
                      </td>
                      <td className="p-2 text-center border-b border-gray-200 dark:border-white/10 w-[30%] bg-lime-500/[0.03] dark:bg-lime-400/[0.02] border-x border-lime-500/20 align-middle">
                        {selectedProPlan && (
                          <motion.button
                            onClick={() => handlePlanSelect(selectedProPlan)}
                            className="w-full py-1.5 px-2 text-[10px] font-bold rounded-md bg-[#81ff00] hover:bg-lime-400 text-black shadow-sm hover:shadow-lime-400/20"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Choose Plan
                          </motion.button>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </motion.div>
          );
        })()}

        {/* Disclaimer for non-USD currencies */}
        <motion.div
          className="max-w-4xl mx-auto mt-8 text-center text-[10px] tablet:text-small text-gray-500 dark:text-white/40 leading-relaxed px-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          * Prices shown in non-USD currencies are calculated using live exchange rates from the base USD plan price (e.g. Starter Yearly: $39.99/y, Focused Monthly: $9.99/m, Focused Yearly: $79.99/y, Smart Quarterly: $59.99/q, Smart Yearly: $199.00/y) and converted using live exchange values. Actual billing amounts at checkout may vary slightly depending on real-time conversions and payment processing options.
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-gray-600 dark:text-white/70 mb-4 text-small">Have questions about pricing?</p>
          <motion.a
            href="mailto:support@cvcircle.io?subject=Sales%20Inquiry%20-%20CVCircle"
            className="group text-lime-600 dark:text-lime-400 hover:text-lime-700 dark:hover:text-lime-300 font-semibold transition-colors duration-300 flex items-center gap-2 mx-auto w-fit"
            whileHover={{ x: 5 }}
          >
            <span>Contact our sales team</span>
            <motion.div
              whileHover={{ rotate: 45 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowRight size={14} />
            </motion.div>
          </motion.a>
        </motion.div >
      </div >

      {/* Payment Modal */}
      {
        selectedPlan && (
          <UniversalPaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            preselectedPlanKey={selectedPlan.key}
            onSuccess={() => {
              setShowPaymentModal(false);
              if (onSuccess) {
                onSuccess();
              }
            }}
          />
        )
      }
    </section >
  );
};

export default Pricing;