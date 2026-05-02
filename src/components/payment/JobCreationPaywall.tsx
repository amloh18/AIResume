// @ts-nocheck
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Briefcase, X, ArrowRight, Check, Calendar } from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface JobCreationPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  limit: number;
  preselectedPlanKey?: string;
}

const JobCreationPaywall: React.FC<JobCreationPaywallProps> = ({
  isOpen,
  onClose,
  currentCount,
  limit,
  preselectedPlanKey = 'pro_monthly'
}) => {
  const { openPaymentModal } = usePaymentModal();

  const handleUpgrade = () => {
    openPaymentModal({
      preselectedPlanKey,
      triggerContext: 'job-creation-limit',
      returnUrl: window.location.href
    });
    onClose();
  };

  const formatResetTime = () => {
    if (!resetTime) return 'next month';
    const now = new Date();
    const reset = new Date(resetTime);

    if (reset.getMonth() === now.getMonth() && reset.getFullYear() === now.getFullYear()) {
      return `on ${reset.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
    }

    return `on ${reset.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
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
            <div className="w-10 h-10 bg-gradient-to-r from-[#80FF00] to-lime-500 rounded-lg flex items-center justify-center mr-3">
              <Briefcase className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Job Creation Limit Reached
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upgrade to Continue
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
            <div className="w-16 h-16 bg-gradient-to-r from-[#80FF00] to-lime-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-black" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Tracker Full
            </h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              You have reached your job limit ({limit} jobs). Archive or delete a job to add more, or upgrade to Pro for unlimited jobs.
            </p>
          </div>

          {/* Important Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Full Access to Existing Work</p>
                <p className="text-blue-700 dark:text-blue-300">
                  You can still view, edit, and use all your existing jobs and CVs. This limit only applies to creating new jobs. Archive or delete a job to free up space.
                </p>
              </div>
            </div>
          </div>

          {/* Job Limit Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Jobs in Tracker
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {currentCount} / {limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#80FF00] to-lime-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (currentCount / limit) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Archive or delete a job to free up space, or upgrade for unlimited jobs.
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-6">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Upgrade to unlock:
            </h5>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Check className="w-4 h-4 text-[#80FF00] mr-2 flex-shrink-0" />
                Unlimited Job Applications
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Check className="w-4 h-4 text-[#80FF00] mr-2 flex-shrink-0" />
                Unlimited Journey CVs
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Check className="w-4 h-4 text-[#80FF00] mr-2 flex-shrink-0" />
                Full AI Rewrite & Keyword Injection
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Check className="w-4 h-4 text-[#80FF00] mr-2 flex-shrink-0" />
                AI-Generated Cover Letters
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Check className="w-4 h-4 text-[#80FF00] mr-2 flex-shrink-0" />
                Premium Templates & DOCX Export
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
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#80FF00] to-lime-500 text-black rounded-lg hover:from-lime-300 hover:to-lime-400 transition-all flex items-center justify-center font-medium"
            >
              Upgrade to Pro
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default JobCreationPaywall;

