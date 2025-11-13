'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Zap, X, ArrowRight, Check, Calendar, Sparkles } from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface CreditExhaustionModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditsRemaining: number;
  limit: number;
  resetTime?: Date;
  preselectedPlanKey?: string;
  reason?: string;
}

const CreditExhaustionModal: React.FC<CreditExhaustionModalProps> = ({
  isOpen,
  onClose,
  creditsRemaining,
  limit,
  resetTime,
  preselectedPlanKey = 'pro_monthly',
  reason
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
        className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full overflow-hidden"
        >
          {/* Header with gradient accent */}
          <div className="relative bg-gradient-to-r from-[#80FF00] to-lime-500 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[#80FF00]/20 to-transparent"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">
                    Credit Limit Exhausted
                  </h3>
                  <p className="text-sm text-black/70 font-medium">
                    Upgrade to continue
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Main Message */}
            <div className="text-center mb-6">
              <div className="relative inline-block mb-4">
                <div className="w-20 h-20 bg-gradient-to-r from-[#80FF00] to-lime-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <Sparkles className="w-10 h-10 text-black" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-[#80FF00]/30 rounded-full blur-xl"
                />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                You've Exhausted Your Limit
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
                {reason || "You've reached your monthly credit limit. Upgrade to Pro for unlimited access and continue building your career."}
              </p>
            </div>

            {/* Credit Status Card */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Credits Used
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {limit - creditsRemaining} / {limit}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((limit - creditsRemaining) / limit) * 100)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="bg-gradient-to-r from-[#80FF00] to-lime-500 h-3 rounded-full"
                />
              </div>
              {resetTime && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Credits reset {formatResetTime()}
                </p>
              )}
            </div>

            {/* Reassurance Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-1">Your Work is Safe</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    You can still view, edit, and use all your existing jobs and CVs. This limit only applies to creating new jobs.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits List */}
            <div className="mb-6">
              <h5 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#80FF00]" />
                Upgrade to Unlock:
              </h5>
              <div className="space-y-3">
                {[
                  'Unlimited job creation',
                  'Unlimited CVs and cover letters',
                  'Unlimited ATS checks per job',
                  'Priority support & faster responses',
                  'Advanced AI career insights',
                  'Premium templates & designs'
                ].map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center text-sm text-gray-700 dark:text-gray-300"
                  >
                    <div className="w-5 h-5 bg-gradient-to-r from-[#80FF00] to-lime-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                    <span className="font-medium">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-medium"
              >
                Maybe Later
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#80FF00] to-lime-500 text-black rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all flex items-center justify-center font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Upgrade to Pro
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreditExhaustionModal;

