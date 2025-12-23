'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Zap, Star, ArrowRight, X } from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  feature: string;
  currentCount: number;
  limit: number;
  preselectedPlanKey?: string;
  triggerContext?: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  title,
  description,
  feature,
  currentCount,
  limit,
  preselectedPlanKey = 'pro_monthly',
  triggerContext
}) => {
  const { openPaymentModal } = usePaymentModal();

  const handleUpgrade = () => {
    openPaymentModal({
      preselectedPlanKey,
      triggerContext,
      returnUrl: window.location.href
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upgrade Required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {description}
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              You've reached your limit for {feature.toLowerCase()}.
            </p>
          </div>

          {/* Usage Stats */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {feature} Usage
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {currentCount} / {limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (currentCount / limit) * 100)}%` }}
              />
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-6">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Upgrade to unlock:
            </h5>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                {feature === 'Journey CV' ? 'Unlimited Journey CVs' : feature === 'Job' ? 'Unlimited Job Applications' : `Unlimited ${feature.toLowerCase()}s`}
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                Full AI Rewrite & Keyword Injection
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                AI-Generated Cover Letters
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                Premium Templates & DOCX Export
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                Priority Support
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center"
            >
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UpgradePrompt;
