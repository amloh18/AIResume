'use client';

import React from 'react';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export interface RegionalPricingCardProps {
  plan: {
    key: string;
    name: string;
    description: string;
    features: string[];
    regionalPricing?: {
      price: number;
      currency: string;
      currencySymbol: string;
      region: string;
      regionName: string;
      displayPrice?: string;
    };
    durationInfo?: {
      durationInDays: number;
      durationType: string;
      displayText: string;
      durationHours?: number;
    };
    isPopular?: boolean;
    isBestValue?: boolean;
    billingCycle: string;
  };
  onSelect?: () => void;
  isSelected?: boolean;
  isCurrentPlan?: boolean;
}

export function RegionalPricingCard({
  plan,
  onSelect,
  isSelected = false,
  isCurrentPlan = false
}: RegionalPricingCardProps) {
  const getPlanIcon = () => {
    switch (plan.key) {
      case 'free':
        return null;
      case 'pro_monthly':
      case 'pro_quarterly':
      case 'pro_yearly':
      case 'pro_lifetime':
        return <Crown className="w-6 h-6" />;
      default:
        return <Star className="w-6 h-6" />;
    }
  };

  const getPlanColor = () => {
    switch (plan.key) {
      case 'free':
        return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800';
      case 'pro_monthly':
      case 'pro_quarterly':
      case 'pro_yearly':
      case 'pro_lifetime':
        return 'text-lime-600 bg-lime-100 dark:text-lime-300 dark:bg-lime-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800';
    }
  };

  const regionalPrice = plan.regionalPricing;
  const displayPrice = regionalPrice?.displayPrice || 
    (regionalPrice ? `${regionalPrice.currencySymbol}${regionalPrice.price}` : 'Free');

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative border-2 rounded-xl p-6 transition-all ${
        isCurrentPlan
          ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
          : isSelected
          ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
      }`}
      onClick={onSelect}
    >
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-lime-500 text-white text-xs font-medium px-3 py-1 rounded-full">
            Current Plan
          </span>
        </div>
      )}
      
      {plan.isPopular && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-lime-500 text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      {plan.isBestValue && !isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full">
            Best Value
          </span>
        </div>
      )}

      <div className="text-center">
        {getPlanIcon() && (
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${getPlanColor()}`}>
            {getPlanIcon()}
          </div>
        )}
        
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
                {displayPrice}
              </div>
              {plan.billingCycle !== 'one-time' && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  per {plan.billingCycle}
                </div>
              )}
              {plan.durationInfo && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {plan.durationInfo.displayText} access
                </div>
              )}
            </div>
          )}
        </div>

        {/* Regional context note */}
        {regionalPrice && plan.key !== 'free' && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 italic">
            Price for {regionalPrice.regionName} in {regionalPrice.currency}
          </div>
        )}

        <ul className="text-left space-y-2 mb-6">
          {plan.features.map((feature: string, index: number) => (
            <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        {isCurrentPlan ? (
          <div className="w-full py-2 px-4 bg-lime-100 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 rounded-lg text-center font-medium">
            Current Plan
          </div>
        ) : (
          <div className="w-full py-2 px-4 bg-lime-500 text-white rounded-lg text-center font-medium hover:bg-lime-600 transition-colors">
            {plan.key === 'free' ? 'Select Plan' : 'Upgrade'}
          </div>
        )}
      </div>
    </motion.div>
  );
}

