'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface UpgradePromptCardProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode; // Extra content between the description and the actions
  primaryLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void; // Custom secondary action (defaults to onClose)
  preselectedPlanKey?: string;
  triggerContext?: string;
}

/**
 * Non-blocking upgrade prompt rendered as a card pinned to the bottom-right
 * corner (matching the drawer sidebars' inset). The primary action opens the
 * unified payment modal (UniversalPaymentModal via PaymentModalContext).
 */
export default function UpgradePromptCard({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  primaryLabel = 'Upgrade Now',
  secondaryLabel = 'Maybe Later',
  onSecondary,
  preselectedPlanKey = 'focused_monthly',
  triggerContext = 'upgrade-prompt',
}: UpgradePromptCardProps) {
  const { openPaymentModal } = usePaymentModal();

  const handleUpgrade = () => {
    openPaymentModal({
      preselectedPlanKey,
      triggerContext,
      returnUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    });
    onClose();
  };

  const handleSecondary = () => {
    if (onSecondary) {
      onSecondary();
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="upgrade-prompt-card"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="fixed bottom-3 right-3 z-[10000] w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--border-primary)] bg-white dark:bg-[#141810] shadow-2xl overflow-hidden"
        >
          <div className="p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-lime-500/15 dark:bg-lime-500/10 flex items-center justify-center shrink-0 text-lime-600 dark:text-lime-400">
                  {icon || <Sparkles className="w-4 h-4" />}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                  {title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 -m-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            {description && (
              <div className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
                {description}
              </div>
            )}

            {children}

            {/* Actions */}
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={handleSecondary}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                {secondaryLabel}
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 px-3 py-2 rounded-lg bg-[#80FF00] text-slate-950 text-[13px] font-semibold hover:brightness-95 transition-all"
              >
                {primaryLabel}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
