// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import posthog from 'posthog-js';
import {
  CheckCircle,
  Star,
  Crown,
  Zap,
  ArrowRight,
  ExternalLink,
  Edit,
  Eye,
  Link as LinkIcon,
  Settings
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
  status: 'active' | 'inactive';
  isPopular: boolean;
  isBestValue: boolean;
  sortOrder: number;
  polarPriceId_monthly?: string;
  polarPriceId_quarterly?: string;
  polarPriceId_yearly?: string;
  polarPriceId_one_time?: string;
}

interface RedesignedPricingCardsProps {
  plans: PricingPlan[];
  onEdit?: (plan: PricingPlan) => void;
  onPreview?: (plan: PricingPlan) => void;
  onCheckout?: (plan: PricingPlan) => void;
  adminMode?: boolean;
}

const RedesignedPricingCards: React.FC<RedesignedPricingCardsProps> = ({
  plans,
  onEdit,
  onPreview,
  onCheckout,
  adminMode = false
}) => {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  // Ensure plans is always an array
  const safePlans = Array.isArray(plans) ? plans : [];

  // Group plans into categories
  const essentialPlans = safePlans.filter(plan =>
    plan.key === 'free' || plan.key === 'starter_monthly' || plan.key === 'starter_yearly'
  );
  const proPlans = safePlans.filter(plan =>
    plan.key === 'focused_monthly' || plan.key === 'focused_yearly' || 
    plan.key === 'smart_quarterly' || plan.key === 'smart_yearly' ||
    plan.key === 'pro_monthly' || plan.key === 'pro_quarterly' || plan.key === 'pro_yearly' || plan.key === 'pro_lifetime'
  );

  const getPlanIcon = (key: string) => {
    switch (key) {
      case 'free':
      case 'starter_monthly':
        return <Zap className="w-6 h-6" />;
      case 'starter_yearly':
        return <Star className="w-6 h-6" />;
      case 'focused_monthly':
      case 'focused_yearly':
      case 'pro_monthly':
      case 'pro_quarterly':
      case 'pro_yearly':
        return <Crown className="w-6 h-6" />;
      case 'smart_quarterly':
      case 'smart_yearly':
      case 'pro_lifetime':
        return <Crown className="w-6 h-6" />;
      default:
        return <CheckCircle className="w-6 h-6" />;
    }
  };

  const getPlanPrice = (plan: PricingPlan) => {
    if (plan.key === 'free' || plan.key === 'starter_monthly') return 0;
    
    // Check for promotional price first
    if (plan.isPromotionActive && plan.effectivePrice) {
      return plan.effectivePrice.yearly || plan.effectivePrice.quarterly || plan.effectivePrice.monthly || plan.effectivePrice.oneTime || 0;
    }

    // Use plan prices from database/API
    if (plan.key.includes('monthly')) return plan.price_monthly || 0;
    if (plan.key.includes('yearly')) return plan.price_yearly || 0;
    if (plan.key.includes('quarterly')) return plan.price_quarterly || 0;
    if (plan.key.includes('lifetime') || plan.key.includes('one_time')) return plan.price_one_time || 0;

    return plan.price_monthly || plan.price_quarterly || plan.price_yearly || plan.price_one_time || 0;
  };

  const getBillingText = (plan: PricingPlan) => {
    switch (plan.key) {
      case 'free':
        return '';
      case 'starter_monthly':
        return '/m';
      case 'starter_yearly':
        return '/y';
      case 'focused_monthly':
        return '/m';
      case 'focused_yearly':
        return '/y';
      case 'smart_quarterly':
        return '/3months';
      case 'smart_yearly':
        return '/y';
      case 'pro_monthly':
        return '/m';
      case 'pro_quarterly':
        return '/3months';
      case 'pro_yearly':
        return '/y';
      case 'pro_lifetime':
        return 'One-time';
      default:
        return '';
    }
  };

  const getPlanColor = (plan: PricingPlan) => {
    if (plan.key === 'free' || plan.key === 'starter_monthly') return 'from-gray-500 to-gray-600';
    if (plan.key === 'starter_yearly') return 'from-lime-500 to-lime-600';
    if (plan.key === 'focused_monthly' || plan.key === 'focused_yearly') return 'from-blue-500 to-indigo-600';
    if (plan.key === 'smart_quarterly' || plan.key === 'smart_yearly') return 'from-purple-500 to-pink-600';
    if (plan.key === 'pro_monthly') return 'from-blue-500 to-indigo-600';
    if (plan.key === 'pro_quarterly') return 'from-emerald-500 to-teal-600';
    if (plan.key === 'pro_yearly') return 'from-purple-500 to-pink-600';
    if (plan.key === 'pro_lifetime') return 'from-orange-500 to-red-500';
    return 'from-gray-500 to-gray-600';
  };

  const getCardStyle = (plan: PricingPlan) => {
    const baseStyle = "relative bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-300";

    if (plan.isBestValue || plan.key === 'smart_yearly') {
      return `${baseStyle} border-emerald-200 dark:border-emerald-800 shadow-lg shadow-emerald-500/20`;
    }

    if (plan.isPopular || plan.key === 'focused_yearly') {
      return `${baseStyle} border-blue-200 dark:border-blue-800 shadow-lg shadow-blue-500/20`;
    }

    return `${baseStyle} border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600`;
  };

  const PlanCard: React.FC<{ plan: PricingPlan; category: 'essential' | 'pro' }> = ({ plan, category }) => {
    const price = getPlanPrice(plan);
    const isHovered = hoveredPlan === plan._id;

    return (
      <motion.div
        className={getCardStyle(plan)}
        onHoverStart={() => setHoveredPlan(plan._id)}
        onHoverEnd={() => setHoveredPlan(null)}
        whileHover={{ y: -8, scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {/* Badge */}
        {(plan.isPopular || plan.isBestValue) && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
            <div className={`px-4 py-1 rounded-full text-sm font-bold shadow-lg ${plan.isBestValue
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white'
              : 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white'
              }`}>
              {plan.isBestValue ? 'Best Value' : 'Most Popular'}
            </div>
          </div>
        )}

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`w-16 h-16 bg-gradient-to-br ${getPlanColor(plan)} rounded-2xl flex items-center justify-center mx-auto mb-4 text-white`}>
              {getPlanIcon(plan.key)}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {plan.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {plan.description}
            </p>
          </div>

          {/* Pricing */}
          <div className="text-center mb-8">
            {plan.key === 'free' ? (
              <>
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Free</div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">
                  No subscription required
                </div>
              </>
            ) : plan.key === 'starter_monthly' ? (
              <>
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">$0.00</div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">
                  per month (with $0 invoice receipts)
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                  {plan.isPromotionActive && (
                    <span className="text-xl text-gray-400 dark:text-gray-500 line-through font-semibold">
                      {plan.regionalPricing?.currencySymbol || plan.currencySymbol || '$'}
                      {plan.price_yearly || plan.price_monthly || plan.price_quarterly || plan.price_one_time}
                    </span>
                  )}
                  <span>
                    {plan.regionalPricing?.displayPrice || `${plan.regionalPricing?.currencySymbol || plan.currencySymbol || '$'}${price}`}
                  </span>
                </div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">
                  {getBillingText(plan)}
                </div>
              </>
            )}
          </div>

          {/* Features */}
          <div className="mb-8">
            <div className="space-y-3">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Limits */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {plan.key === 'free' || plan.key === 'starter_monthly' ? '3' : '∞'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Journey CVs</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {plan.key === 'free' || plan.key === 'starter_monthly' ? '3' : plan.key === 'starter_yearly' ? '0' : '∞'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Jobs</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {adminMode ? (
            <div className="space-y-3">
              <button
                onClick={() => onPreview?.(plan)}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => onEdit?.(plan)}
                className="w-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 px-4 py-2 rounded-lg text-sm hover:bg-green-200 dark:hover:bg-green-800 flex items-center justify-center gap-2 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Plan
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                posthog.capture('pricing_plan_selected', {
                  plan_key: plan.key,
                  plan_name: plan.name,
                  plan_price: getPlanPrice(plan),
                  plan_currency: plan.currency,
                  is_popular: plan.isPopular,
                  is_best_value: plan.isBestValue,
                });
                onCheckout?.(plan);
              }}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${plan.isBestValue || plan.isPopular
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              {plan.key === 'free' ? 'Get Started Free' : plan.key === 'starter_monthly' ? 'Subscribe Free' : 'Choose Plan'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div >
    );
  };

  return (
    <div className="space-y-12">
      {/* Essential Plans Section */}
      {essentialPlans.length > 0 && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Get Started
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Perfect for first-time users and quick job applications
            </p>
          </div>

          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {essentialPlans.map((plan) => (
              <PlanCard key={plan._id} plan={plan} category="essential" />
            ))}
          </div>
        </div>
      )}

      {/* Pro Plans Section */}
      {proPlans.length > 0 && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Professional Plans
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              For active job seekers who need unlimited access to all tools
            </p>
          </div>

          <div className={`grid grid-cols-1 ${proPlans.length === 4 ? 'tablet:grid-cols-2 desktop:grid-cols-4 max-w-7xl' : 'tablet:grid-cols-3 max-w-6xl'} gap-8 mx-auto`}>
            {proPlans.map((plan) => (
              <PlanCard key={plan._id} plan={plan} category="pro" />
            ))}
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="text-center">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 max-w-2xl mx-auto">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            All prices include applicable taxes. Cancel anytime.
            <br />
            Need help choosing? <a href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">Contact our support team</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RedesignedPricingCards;
