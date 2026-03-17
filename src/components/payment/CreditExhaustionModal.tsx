'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, ArrowRight } from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface CreditExhaustionModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditsRemaining: number;
  limit: number;
  resetTime?: Date;
  preselectedPlanKey?: string;
  reason?: string;
  exhaustionType?: 'meter' | 'quota' | 'gate';
}

const CreditExhaustionModal: React.FC<CreditExhaustionModalProps> = ({
  isOpen,
  onClose,
  creditsRemaining,
  limit,
  resetTime,
  preselectedPlanKey = 'pro_monthly',
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
        onClick={handleUpgrade}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#80FF00] via-lime-400 to-emerald-500" />
          
          {/* Content */}
          <div className="relative p-8 text-center">
            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-black/70" />
            </button>

            {/* Crown Icon */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-4"
            >
              <div className="w-16 h-16 mx-auto bg-black/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Crown className="w-8 h-8 text-black" />
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-2xl font-bold text-black mb-2"
            >
              {exhaustionType === 'gate' 
                ? 'Premium Feature' 
                : exhaustionType === 'quota' 
                  ? 'Storage Full' 
                  : 'Upgrade to Continue'}
            </motion.h2>

            {/* Subtext */}
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-black/70 text-sm mb-4"
            >
              {exhaustionType === 'gate'
                ? 'Unlock this feature with Pro'
                : exhaustionType === 'quota'
                  ? 'Upgrade to store more'
                  : 'Get unlimited access to all features'}
            </motion.p>

            {/* CTA Hint */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex items-center justify-center gap-2 text-black font-medium"
            >
              <span>Tap to upgrade</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreditExhaustionModal;
