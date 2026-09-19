'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PricingData } from '@/lib/payment/locationService';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import { usePricingPlans, DatabasePricingPlan } from '@/lib/hooks/usePricingPlans';

interface PricingProps {
  onPlanSelect?: (plan: DatabasePricingPlan, pricingData: PricingData) => void;
  onSuccess?: () => void;
}

interface FeatureRow {
  name: string;
  starter_monthly: string | boolean;
  starter_yearly: string | boolean;
  focused_monthly: string | boolean;
  focused_yearly: string | boolean;
}

export const PRICING_FEATURES: FeatureRow[] = [
  {
    name: 'Access to All Templates & Layouts',
    starter_monthly: true,
    starter_yearly: true,
    focused_monthly: true,
    focused_yearly: true,
  },
  {
    name: 'CV & Cover Letter Live Editing',
    starter_monthly: 'Unlimited',
    starter_yearly: 'Unlimited',
    focused_monthly: 'Unlimited',
    focused_yearly: 'Unlimited',
  },
  {
    name: 'Real-time ATS Scoring & Suggestions',
    starter_monthly: true,
    starter_yearly: true,
    focused_monthly: true,
    focused_yearly: true,
  },
  {
    name: 'AI Cover Letter Generator',
    starter_monthly: true,
    starter_yearly: true,
    focused_monthly: true,
    focused_yearly: true,
  },
  {
    name: 'PDF & DOCX Instant Downloads',
    starter_monthly: true,
    starter_yearly: true,
    focused_monthly: true,
    focused_yearly: true,
  },
  {
    name: 'Mori AI Career Chat Assistant',
    starter_monthly: true,
    starter_yearly: true,
    focused_monthly: true,
    focused_yearly: true,
  },
  {
    name: 'LinkedIn Profile Enhancer',
    starter_monthly: false,
    starter_yearly: false,
    focused_monthly: true,
    focused_yearly: true,
  },
  {
    name: 'Interview Prep & Practice',
    starter_monthly: false,
    starter_yearly: false,
    focused_monthly: true,
    focused_yearly: true,
  },
  {
    name: 'Application Tracker',
    starter_monthly: 'Manual',
    starter_yearly: 'Manual',
    focused_monthly: 'Auto',
    focused_yearly: 'Auto',
  },
  {
    name: 'Auto Applications',
    starter_monthly: '10',
    starter_yearly: '10',
    focused_monthly: 'Unlimited',
    focused_yearly: 'Unlimited',
  },
  {
    name: 'Feature & AI Usage Limits',
    starter_monthly: 'Limited',
    starter_yearly: 'Standard',
    focused_monthly: 'Unlimited',
    focused_yearly: 'Unlimited',
  },
  {
    name: 'Customer Support Level',
    starter_monthly: 'Standard',
    starter_yearly: 'Standard',
    focused_monthly: 'Priority 24/7',
    focused_yearly: 'Priority 24/7',
  },
];

const Pricing: React.FC<PricingProps> = ({ onPlanSelect, onSuccess }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DatabasePricingPlan | null>(null);
  const [focusedBillingInterval, setFocusedBillingInterval] = useState<'yearly' | 'monthly'>('yearly');

  // Use the shared pricing hook
  const {
    plans: pricingPlans,
    locationData,
    regionalPricing,
    loading,
    error,
    getRegionalPrice,
  } = usePricingPlans({ publicOnly: true });

  const plansMap = useMemo(() => {
    const map = new Map<string, DatabasePricingPlan>();
    if (Array.isArray(pricingPlans)) {
      pricingPlans.forEach((p) => map.set(p.key, p));
    }
    return map;
  }, [pricingPlans]);

  const starterMonthlyPlan = plansMap.get('starter_monthly') || {
    _id: 'starter_monthly',
    key: 'starter_monthly',
    name: 'Starter Monthly',
    description: 'Basic access to essential resume tools',
    price_monthly: 0,
    currency: 'USD',
    features: [],
    notIncludedFeatures: [],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'Job seekers getting started',
  };

  const starterYearlyPlan = plansMap.get('starter_yearly') || {
    _id: 'starter_yearly',
    key: 'starter_yearly',
    name: 'Starter Yearly',
    description: 'Yearly access to standard features',
    price_yearly: 19.99,
    currency: 'USD',
    features: [],
    notIncludedFeatures: [],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'Job seekers planning ahead',
  };

  const focusedMonthlyPlan = plansMap.get('focused_monthly') || {
    _id: 'focused_monthly',
    key: 'focused_monthly',
    name: 'Focused Monthly',
    description: 'Full unmetered power billed monthly',
    price_monthly: 9.99,
    currency: 'USD',
    features: [],
    notIncludedFeatures: [],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'Active job seekers',
  };

  const focusedYearlyPlan = plansMap.get('focused_yearly') || {
    _id: 'focused_yearly',
    key: 'focused_yearly',
    name: 'Focused Yearly',
    description: 'Full unmetered power billed yearly',
    price_yearly: 79.99,
    currency: 'USD',
    features: [],
    notIncludedFeatures: [],
    isPopular: true,
    isBestValue: true,
    displayOnLanding: true,
    targetAudience: 'Serious career climbers',
  };

  const activeFocusedPlan = focusedBillingInterval === 'yearly' ? focusedYearlyPlan : focusedMonthlyPlan;

  // Handle plan selection
  const handlePlanSelect = (plan: DatabasePricingPlan) => {
    const isAuthenticated = status === 'authenticated' && !!session?.user;

    if (!isAuthenticated) {
      router.push(`/sign-in?callbackUrl=/dashboard?plan=${plan.key}`);
      return;
    }

    setSelectedPlan(plan);
    setShowPaymentModal(true);

    if (onPlanSelect && locationData && regionalPricing) {
      const regionalPriceStr = getRegionalPrice(plan);
      const priceValue = parseFloat(regionalPriceStr.replace(/[^\d.,]/g, '').replace(',', ''));
      const pricingData: PricingData = {
        originalPrice: plan.price_one_time || plan.price_yearly || plan.price_monthly || 0,
        originalCurrency: plan.currency,
        convertedPrice: priceValue,
        convertedCurrency: regionalPricing.currency,
        exchangeRate: priceValue / (plan.price_one_time || plan.price_yearly || plan.price_monthly || 1),
        paymentPartner: locationData.paymentPartner,
      };
      onPlanSelect(plan, pricingData);
    }
  };

  const renderValue = (val: string | boolean, isHighlighted = false) => {
    if (val === true) {
      return (
        <div className="w-5 h-5 rounded-full border border-emerald-400/40 bg-emerald-500/10 flex items-center justify-center text-[#36D39B] mx-auto shadow-sm">
          <Check className="w-3 h-3 stroke-[3]" />
        </div>
      );
    }
    if (val === false) {
      return <span className="text-white/20 font-bold text-sm select-none">—</span>;
    }
    return (
      <span
        className={`text-xs font-semibold ${
          isHighlighted ? 'text-white' : 'text-gray-300'
        }`}
      >
        {val}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 bg-[#0a0a0c]">
        <LoadingAnimation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32 bg-[#0a0a0c]">
        <div className="text-white text-center">
          <p className="text-red-400 mb-2">Error loading pricing plans</p>
          <p className="text-xs text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <section id="pricing" className="relative py-24 bg-[#0a0a0c] overflow-hidden">
      {/* Background Ambient Glows (Matching Everyday Superpowers) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 50% 15%, rgba(1, 63, 46, 0.25) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 80% 50%, rgba(20, 184, 166, 0.08) 0%, transparent 65%),
            radial-gradient(ellipse 70% 50% at 50% 85%, rgba(1, 63, 46, 0.2) 0%, transparent 65%),
            linear-gradient(180deg, #0e1013 0%, #0a0a0c 50%, #060708 100%)
          `,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 w-full flex flex-col items-start">
        {/* Header - Kept exactly as current implementation */}
        <motion.div
          className="text-left mb-14"
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
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#36D39B]">
              <path
                d="M2 12C6 6 10 18 14 12C18 6 22 18 26 12C30 6 34 18 38 12C42 6 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
          <h2 className="tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-[#F5F7F7] mb-4 text-left tracking-tighter text-4xl! tracking-normal!">
            Simple,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">
              Transparent Pricing
            </span>
          </h2>
          <p className="text-sm tablet:text-base text-gray-400 max-w-3xl leading-relaxed">
            Choose the plan that fits your career goals. No hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Pricing Comparison Table (Inspired by Reference Design) */}
        <motion.div
          className="w-full rounded-3xl bg-[#0e1014]/90 border border-white/[0.08] shadow-2xl backdrop-blur-xl relative"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          {/* Desktop & Tablet Table */}
          <div className="hidden md:block w-full overflow-visible">
            <table className="w-full border-collapse table-fixed text-left min-w-[760px]">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {/* Category Title Column */}
                  <th className="w-[34%] p-6 lg:p-8 align-bottom rounded-tl-3xl">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#36D39B] block mb-1">
                      Plan Comparison
                    </span>
                    <h3 className="text-xl lg:text-2xl font-extrabold text-[#F5F7F7] tracking-tight">
                      Feature Details
                    </h3>
                  </th>

                  {/* Starter Monthly Column */}
                  <th className="w-[22%] p-6 lg:p-8 text-center align-top border-l border-white/[0.06] bg-white/[0.01]">
                    <div className="flex flex-col items-center justify-between h-full space-y-4">
                      <div className="w-full flex flex-col items-center">
                        <h4 className="text-base font-bold text-white mb-1">Starter Monthly</h4>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">$0</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-center gap-1.5">
                          <span className="line-through text-xs text-gray-500 font-medium">$4.99</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#36D39B] text-[10px] font-extrabold uppercase tracking-wider">
                            Limited Time
                          </span>
                        </div>
                      </div>

                      <motion.button
                        onClick={() => handlePlanSelect(starterMonthlyPlan)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-colors shadow"
                      >
                        Start today
                      </motion.button>
                    </div>
                  </th>

                  {/* Starter Yearly Column */}
                  <th className="w-[22%] p-6 lg:p-8 text-center align-top border-l border-white/[0.06] bg-white/[0.01]">
                    <div className="flex flex-col items-center justify-between h-full space-y-4">
                      <div className="w-full flex flex-col items-center">
                        <h4 className="text-base font-bold text-[#36D39B] mb-1">Starter Yearly</h4>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">$2</span>
                          <span className="text-xs font-normal text-gray-400">/ mo</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400 font-normal">
                          $19.99 billed annually
                        </div>
                      </div>

                      <motion.button
                        onClick={() => handlePlanSelect(starterYearlyPlan)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-colors shadow"
                      >
                        Get Starter Yearly
                      </motion.button>
                    </div>
                  </th>

                  {/* Focused (Monthly / Yearly) Column - Highlighted Glowing Theme */}
                  <th className="w-[22%] p-6 lg:p-8 text-center align-top border-l border-emerald-500/30 bg-gradient-to-b from-[#36D39B]/20 via-[#14B8A6]/10 to-[#36D39B]/15 relative rounded-tr-3xl">
                    {/* Top edge MOST POPULAR badge - 50% above the border */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#36D39B] text-white text-[9px] font-black uppercase tracking-widest shadow-[0_0_18px_rgba(54,211,155,0.7)] whitespace-nowrap">
                      <Sparkles className="w-2.5 h-2.5 fill-current" /> Most Popular
                    </div>

                    {/* Top ambient highlight line */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1] rounded-tr-3xl" />

                    <div className="flex flex-col items-center justify-between h-full space-y-4">
                      <div className="w-full flex flex-col items-center">
                        <h4 className="text-base font-extrabold text-white mb-2">Focused</h4>

                        {/* Interactive In-Column Billing Toggle */}
                        <div className="flex p-0.5 bg-black/60 border border-emerald-500/30 rounded-lg mb-3 mx-auto w-fit">
                          <button
                            type="button"
                            onClick={() => setFocusedBillingInterval('yearly')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                              focusedBillingInterval === 'yearly'
                                ? 'bg-[#36D39B] text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Yearly (-30%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setFocusedBillingInterval('monthly')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                              focusedBillingInterval === 'monthly'
                                ? 'bg-[#36D39B] text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Monthly
                          </button>
                        </div>

                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                            {focusedBillingInterval === 'yearly' ? '$7' : '$9.99'}
                          </span>
                          <span className="text-xs font-normal text-emerald-200">/ mo</span>
                        </div>

                        <div className="mt-1 text-xs text-emerald-300/80 font-medium">
                          {focusedBillingInterval === 'yearly' ? '$79.99 billed annually' : 'billed monthly'}
                        </div>
                      </div>

                      <motion.button
                        onClick={() => handlePlanSelect(activeFocusedPlan)}
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-black text-black bg-white hover:bg-gray-100 shadow-[0_0_20px_rgba(54,211,155,0.4)] transition-all"
                      >
                        Get Focused
                      </motion.button>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {PRICING_FEATURES.map((feature, featIndex) => {
                  const isLastRow = featIndex === PRICING_FEATURES.length - 1;
                  return (
                    <tr
                      key={`feat-${featIndex}`}
                      className={`${isLastRow ? 'border-b-0' : 'border-b border-white/[0.04]'} hover:bg-white/[0.02] transition-colors group`}
                    >
                      <td className={`py-4 px-6 lg:px-8 text-xs font-medium text-gray-300 group-hover:text-white transition-colors ${isLastRow ? 'rounded-bl-3xl' : ''}`}>
                        {feature.name}
                      </td>

                      <td className="py-4 px-6 text-center border-l border-white/[0.06] bg-white/[0.01]">
                        {renderValue(feature.starter_monthly)}
                      </td>

                      <td className="py-4 px-6 text-center border-l border-white/[0.06] bg-white/[0.01]">
                        {renderValue(feature.starter_yearly)}
                      </td>

                      <td className={`py-4 px-6 text-center border-l border-emerald-500/30 bg-gradient-to-b from-[#36D39B]/[0.08] to-[#14B8A6]/[0.04] ${isLastRow ? 'rounded-br-3xl' : ''}`}>
                        {renderValue(
                          focusedBillingInterval === 'yearly'
                            ? feature.focused_yearly
                            : feature.focused_monthly,
                          true
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card & Switcher View */}
          <div className="block md:hidden p-4 space-y-6">
            {/* Mobile Plan Selector Tabs */}
            <div className="flex p-1 bg-black/60 border border-white/10 rounded-2xl">
              <button
                type="button"
                onClick={() => setFocusedBillingInterval('yearly')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  focusedBillingInterval === 'yearly'
                    ? 'bg-[#36D39B] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Focused (Yearly)
              </button>
              <button
                type="button"
                onClick={() => setFocusedBillingInterval('monthly')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  focusedBillingInterval === 'monthly'
                    ? 'bg-[#36D39B] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Focused (Monthly)
              </button>
            </div>

            {/* Focused Highlight Mobile Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#36D39B]/20 via-[#14B8A6]/10 to-[#36D39B]/15 border border-emerald-500/40 relative shadow-xl">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3" /> Most Popular
              </div>
              <h3 className="text-xl font-extrabold text-white">Focused</h3>
              <div className="flex items-baseline gap-1 my-2">
                <span className="text-3xl font-black text-white">
                  {focusedBillingInterval === 'yearly' ? '$7' : '$9.99'}
                </span>
                <span className="text-xs text-emerald-200">/ mo</span>
              </div>
              <p className="text-xs text-emerald-300/80 mb-4">
                {focusedBillingInterval === 'yearly' ? '$79.99 billed annually (Save 30%)' : 'recurring monthly'}
              </p>

              <motion.button
                onClick={() => handlePlanSelect(activeFocusedPlan)}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-xl text-xs font-black text-black bg-white hover:bg-gray-100 shadow-lg"
              >
                Get Focused
              </motion.button>
            </div>

            {/* Other Mobile Plans Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">Starter Monthly</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xl font-black text-white">$0</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#36D39B] text-[9px] font-extrabold uppercase tracking-wider">
                      Limited Time
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handlePlanSelect(starterMonthlyPlan)}
                  className="mt-3 w-full py-2 text-[11px] font-bold text-white bg-white/10 rounded-lg"
                >
                  Start today
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#36D39B] mb-1">Starter Yearly</h4>
                  <div className="text-xl font-black text-white">$2<span className="text-[10px] font-normal text-gray-400">/mo</span></div>
                  <p className="text-[10px] text-gray-400">$19.99/yr</p>
                </div>
                <button
                  onClick={() => handlePlanSelect(starterYearlyPlan)}
                  className="mt-3 w-full py-2 text-[11px] font-bold text-white bg-white/10 rounded-lg"
                >
                  Get Starter
                </button>
              </div>
            </div>

            {/* Mobile Feature Checklist */}
            <div className="space-y-1.5 pt-4 border-t border-white/[0.08]">
              {PRICING_FEATURES.map((f, j) => (
                <div key={j} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04]">
                  <span className="text-gray-300">{f.name}</span>
                  <div className="text-right">
                    {renderValue(
                      focusedBillingInterval === 'yearly' ? f.focused_yearly : f.focused_monthly,
                      true
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Non-USD Currency Footnote */}
        <motion.div
          className="max-w-4xl mx-auto mt-8 text-center text-[11px] text-gray-500 leading-relaxed px-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          * Prices shown in non-USD currencies are converted using live exchange rates from the base USD plan price (Starter Yearly: $19.99/yr, Focused Monthly: $9.99/mo, Focused Yearly: $79.99/yr).
        </motion.div>

        {/* Bottom Support Callout */}
        <motion.div
          className="text-center mt-10 w-full"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-gray-400 mb-3 text-xs">Have questions about our plans or enterprise licensing?</p>
          <motion.a
            href="mailto:support@buildairesume.com?subject=Sales%20Inquiry%20-%20AI%20Resume"
            className="group text-[#36D39B] hover:text-emerald-300 font-semibold transition-colors duration-300 inline-flex items-center gap-2 text-xs"
            whileHover={{ x: 3 }}
          >
            <span>Contact our team</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </motion.a>
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
            if (onSuccess) {
              onSuccess();
            }
          }}
        />
      )}
    </section>
  );
};

export default Pricing;