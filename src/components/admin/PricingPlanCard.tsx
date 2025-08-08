'use client';

import React from 'react';
import { 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Star,
  Crown,
  Brain,
  Users
} from 'lucide-react';

interface PricingPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'one-time';
  features: {
    maxCVs: number | string;
    maxExports: number | string;
    aiAssistant: boolean;
    coverLetterGenerator: boolean;
    jobTracker: boolean;
    communityAccess: boolean;
    prioritySupport: boolean;
    customTemplates: boolean;
    storageLimit: number;
  };
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PricingPlanCardProps {
  plan: PricingPlan;
  onEdit: (plan: PricingPlan) => void;
  onDelete: (planId: string) => void;
}

const PricingPlanCard: React.FC<PricingPlanCardProps> = ({ plan, onEdit, onDelete }) => {
  const getPlanIcon = (name: string) => {
    if (name.includes('Free')) return Brain;
    if (name.includes('Day')) return Star;
    if (name.includes('Annual')) return Crown;
    return Users;
  };

  const getPlanColor = (name: string) => {
    if (name.includes('Free')) return 'from-green-400 to-green-500';
    if (name.includes('Day')) return 'from-blue-400 to-blue-500';
    if (name.includes('Monthly')) return 'from-yellow-400 to-yellow-500';
    if (name.includes('Quarterly')) return 'from-orange-400 to-orange-500';
    if (name.includes('Annual')) return 'from-red-400 to-red-500';
    return 'from-gray-400 to-gray-500';
  };

  const IconComponent = getPlanIcon(plan.name);
  const colorClass = getPlanColor(plan.name);

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${
        plan.isPopular ? 'ring-2 ring-yellow-400' : 'border-gray-200 dark:border-gray-700'
      } hover:shadow-md transition-all duration-200`}
    >
      {/* Popular Badge */}
      {plan.isPopular && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            <Star size={12} className="inline mr-1" />
            Popular
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center shadow-lg`}>
              <IconComponent size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {plan.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {plan.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {plan.isActive ? (
              <CheckCircle size={16} className="text-green-500" />
            ) : (
              <AlertCircle size={16} className="text-red-500" />
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan.currency} {plan.price}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              plan.billingCycle === 'one-time' 
                ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                : plan.billingCycle === 'monthly'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
            }`}>
              {plan.billingCycle}
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {plan.billingCycle === 'one-time' && plan.price === 0 && 'Free forever'}
            {plan.billingCycle === 'one-time' && plan.price > 0 && 'One-time purchase'}
            {plan.billingCycle === 'monthly' && 'Billed monthly'}
            {plan.billingCycle === 'yearly' && 'Billed annually'}
          </div>
        </div>

        {/* Features Summary */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">CVs:</span>
            <span className="text-sm font-medium">
              {plan.features.maxCVs === 'Unlimited' ? '∞' : plan.features.maxCVs}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Exports:</span>
            <span className="text-sm font-medium">
              {plan.features.maxExports === 'Unlimited' ? '∞' : plan.features.maxExports}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Storage:</span>
            <span className="text-sm font-medium">{plan.features.storageLimit}MB</span>
          </div>
        </div>

        {/* Features List */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mb-6">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">FEATURES</div>
          <div className="grid grid-cols-2 gap-1">
            {plan.features.aiAssistant && (
              <div className="flex items-center gap-1">
                <CheckCircle size={10} className="text-green-500" />
                <span className="text-xs">AI Assistant</span>
              </div>
            )}
            {plan.features.coverLetterGenerator && (
              <div className="flex items-center gap-1">
                <CheckCircle size={10} className="text-green-500" />
                <span className="text-xs">Cover Letters</span>
              </div>
            )}
            {plan.features.jobTracker && (
              <div className="flex items-center gap-1">
                <CheckCircle size={10} className="text-green-500" />
                <span className="text-xs">Job Tracker</span>
              </div>
            )}
            {plan.features.communityAccess && (
              <div className="flex items-center gap-1">
                <CheckCircle size={10} className="text-green-500" />
                <span className="text-xs">Community</span>
              </div>
            )}
            {plan.features.prioritySupport && (
              <div className="flex items-center gap-1">
                <CheckCircle size={10} className="text-green-500" />
                <span className="text-xs">Priority Support</span>
              </div>
            )}
            {plan.features.customTemplates && (
              <div className="flex items-center gap-1">
                <CheckCircle size={10} className="text-green-500" />
                <span className="text-xs">Custom Templates</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(plan)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={() => onDelete(plan._id)}
            className="flex items-center justify-center px-3 py-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Status Badge */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Sort Order: {plan.sortOrder}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            plan.isActive 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
          }`}>
            {plan.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PricingPlanCard;
