'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, ArrowRight, Check, Calendar, TrendingUp, Target, FileText, Shield, Rocket, Star, Users, Clock } from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface CreditExhaustionModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditsRemaining: number;
  limit: number;
  resetTime?: Date;
  preselectedPlanKey?: string;
  reason?: string;
  /**
   * Type of exhaustion to show context-specific messaging:
   * - 'meter': Throughput limit (e.g., monthly job activations)
   * - 'quota': Inventory limit (e.g., active jobs count)
   * - 'gate': Feature gate (e.g., DOCX export requires upgrade)
   */
  exhaustionType?: 'meter' | 'quota' | 'gate';
}

const CreditExhaustionModal: React.FC<CreditExhaustionModalProps> = ({
  isOpen,
  onClose,
  creditsRemaining,
  limit,
  resetTime,
  preselectedPlanKey = 'pro_monthly',
  reason,
  exhaustionType = 'meter'
}) => {
  const { openPaymentModal } = usePaymentModal();

  const handleUpgrade = () => {
    openPaymentModal({
      preselectedPlanKey,
      triggerContext: 'credit-exhaustion',
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full max-h-[90vh] overflow-hidden relative z-[99999] flex flex-col"
        >
          {/* Header with gradient accent */}
          <div className="relative bg-gradient-to-r from-[#80FF00] to-lime-500 p-4 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#80FF00]/20 to-transparent"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Crown className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black">
                    {exhaustionType === 'gate'
                      ? 'Feature Requires Upgrade'
                      : exhaustionType === 'quota'
                        ? 'Inventory Full'
                        : 'Credit Limit Exhausted'}
                  </h3>
                  <p className="text-xs text-black/70 font-medium">
                    {exhaustionType === 'gate'
                      ? 'Unlock premium features'
                      : exhaustionType === 'quota'
                        ? 'Archive items or upgrade'
                        : 'Upgrade to continue'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {/* Main Message */}
              <div className="text-center mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
                  Don't Let Limits Hold You Back
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-2">
                  {reason || "You've reached your monthly credit limit. Every job application matters—upgrade to Pro and never miss an opportunity."}
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#80FF00]/20 to-lime-500/20 dark:from-[#80FF00]/30 dark:to-lime-500/30 rounded-full border border-[#80FF00]/30">
                  <Users className="w-3.5 h-3.5 text-[#80FF00]" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Join thousands of successful job seekers
                  </span>
                </div>
              </div>

              {/* Credit Status Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Credits Used
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {limit - creditsRemaining} / {limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ((limit - creditsRemaining) / limit) * 100)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="bg-gradient-to-r from-[#80FF00] to-lime-500 h-2 rounded-full"
                  />
                </div>
                {resetTime && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-center">
                    Credits reset {formatResetTime()}
                  </p>
                )}
              </div>

              {/* Reassurance Note */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <p className="font-semibold mb-0.5">Your Work is Safe</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      You can still view, edit, and use all your existing jobs and CVs. This limit only applies to creating new jobs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Premium Benefits with Icons */}
              <div className="mb-4">
                <h5 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[#80FF00]" />
                  Unlock Premium Power
                </h5>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {[
                    { icon: Rocket, text: 'Unlimited Job Creation', highlight: 'Never stop applying' },
                    { icon: FileText, text: 'Unlimited CVs & Cover Letters', highlight: 'Tailor for every role' },
                    { icon: Target, text: 'Unlimited ATS Checks', highlight: 'Optimize every application' },
                    { icon: TrendingUp, text: 'Advanced AI Insights', highlight: 'Career growth analytics' },
                    { icon: Shield, text: 'Premium Templates', highlight: 'Stand out designs' },
                    { icon: Clock, text: 'Priority Support', highlight: 'Fast response times' }
                  ].map((feature, index) => (
                    <motion.div
                      key={feature.text}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 hover:border-[#80FF00]/50 dark:hover:border-[#80FF00]/50 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 bg-gradient-to-r from-[#80FF00] to-lime-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-3.5 h-3.5 text-black" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{feature.text}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-tight">{feature.highlight}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Value Proposition */}
                <div className="bg-gradient-to-r from-[#80FF00]/10 to-lime-500/10 dark:from-[#80FF00]/20 dark:to-lime-500/20 rounded-lg p-3 border border-[#80FF00]/30 dark:border-[#80FF00]/50">
                  <div className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-[#80FF00] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white mb-0.5">
                        Join 10,000+ professionals who landed their dream jobs
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Average users see 3x more interview callbacks with tailored CVs and ATS optimization
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141810] flex-shrink-0 space-y-2">
            <motion.button
              onClick={handleUpgrade}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#80FF00] to-lime-500 text-black rounded-lg hover:from-lime-300 hover:to-lime-400 transition-all flex items-center justify-center font-bold text-sm shadow-lg hover:shadow-xl relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro - Start Your Success Journey
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-lime-400 to-[#80FF00] opacity-0 group-hover:opacity-100 transition-opacity"
                initial={false}
              />
            </motion.button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Cancel anytime - with generous trial period</span>
            </div>


            {/* Removed "Continue with Free Plan" button as per requirement to enforce upgrade/close choice */}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreditExhaustionModal;

