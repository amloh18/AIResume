'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  stripePriceId_monthly?: string;
  stripePriceId_quarterly?: string;
  stripePriceId_yearly?: string;
  stripePriceId_one_time?: string;
  razorpayPlanId_monthly?: string;
  razorpayPlanId_quarterly?: string;
  razorpayPlanId_yearly?: string;
  dayPassDuration?: number;
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
    plan.key === 'free' || plan.key === 'day_pass'
  );
  const proPlans = safePlans.filter(plan =>
    plan.key === 'pro_monthly' || plan.key === 'pro_quarterly' || plan.key === 'pro_yearly'
  );

  const getPlanIcon = (key: string) => {
    switch (key) {
      case 'free':
        return <Zap className="w-6 h-6" />;
      case 'day_pass':
        return <Star className="w-6 h-6" />;
      case 'pro_monthly':
      case 'pro_quarterly':
      case 'pro_yearly':
        return <Crown className="w-6 h-6" />;
      default:
        return <CheckCircle className="w-6 h-6" />;
    }
  };

  const getPlanPrice = (plan: PricingPlan) => {
    if (plan.key === 'free') return 0;
    if (plan.key === 'day_pass') return plan.price_one_time || 0;
    if (plan.key === 'pro_monthly') return plan.price_monthly || 0;
    if (plan.key === 'pro_quarterly') return plan.price_quarterly || 0;
    if (plan.key === 'pro_yearly') return plan.price_yearly || 0;
    return 0;
  };

  const getBillingText = (plan: PricingPlan) => {
    switch (plan.key) {
      case 'free':
        return 'Forever free';
      case 'day_pass':
        return 'One-time payment';
      case 'pro_monthly':
        return 'recurring';
      case 'pro_quarterly':
        return 'Per quarter';
      case 'pro_yearly':
        return 'Per year';
      default:
        return '';
    }
  };

  const getPlanColor = (plan: PricingPlan) => {
    if (plan.isBestValue) return 'from-emerald-500 to-teal-600';
    if (plan.isPopular) return 'from-blue-500 to-indigo-600';
    if (plan.key === 'free') return 'from-gray-500 to-gray-600';
    if (plan.key === 'day_pass') return 'from-orange-500 to-red-500';
    return 'from-purple-500 to-pink-600';
  };

  const getCardStyle = (plan: PricingPlan) => {
    const baseStyle = "relative bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-300";

    if (plan.isBestValue) {
      return `${baseStyle} border-emerald-200 dark:border-emerald-800 shadow-lg shadow-emerald-500/20`;
    }

    if (plan.isPopular) {
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
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {plan.key === 'free' ? 'Free' : `€${price}${plan.key === 'pro_monthly' ? '/month' : ''}`}
            </div>
            <div className="text-gray-600 dark:text-gray-300 text-sm">
              {getBillingText(plan)}
            </div>
            {plan.key === 'day_pass' && plan.dayPassDuration && (
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Valid for {plan.dayPassDuration} hours
              </div>
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
                  {plan.maxJourneys === -1 ? '∞' : plan.maxJourneys || (plan.key === 'free' ? '1' : plan.key === 'pro_monthly' ? '50' : '∞')}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Journey CVs</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {plan.maxJobs === -1 ? '∞' : plan.maxJobs || (plan.key === 'free' ? '3' : '∞')}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Jobs</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {adminMode ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => onPreview?.(plan)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => onCheckout?.(plan)}
                  className="flex-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-4 py-2 rounded-lg text-sm hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center gap-2 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Checkout
                </button>
              </div>
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
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${plan.isBestValue || plan.isPopular
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              {plan.key === 'free' ? 'Get Started Free' : 'Choose Plan'}
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

      {/* Pro Plans Section */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Professional Plans
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            For active job seekers who need unlimited access to all tools
          </p>
        </div>

        <div className="grid grid-cols-1 tablet:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {proPlans.map((plan) => (
            <PlanCard key={plan._id} plan={plan} category="pro" />
          ))}
        </div>
      </div>

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
