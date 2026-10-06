'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Sparkles, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import type { PromotionConfig } from '@/contexts/FeaturePromotionContext';

interface FeaturePromotionCardProps {
  promotion: PromotionConfig;
  onDismiss: () => void;
}

/**
 * Non-blocking promotion card pinned to the bottom-right corner, styled to
 * match the app's bottom paywall card (UpgradePromptCard): compact card,
 * icon-badge header, small copy, and an outline + lime primary action row.
 */
export default function FeaturePromotionCard({ promotion, onDismiss }: FeaturePromotionCardProps) {
  const router = useRouter();
  const { openPaymentModal } = usePaymentModal();
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoDismissMs = promotion.autoDismissMs || 8000;

  const isUpgrade = promotion.ctaRoute.startsWith('payment-modal:');
  const HeaderIcon = isUpgrade ? Sparkles : Briefcase;

  const handleDismiss = React.useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  }, [onDismiss]);

  // Handle auto-dismiss and progress bar
  useEffect(() => {
    if (isVisible && !isHovered) {
      const startTime = Date.now();
      const endTime = startTime + autoDismissMs;

      autoDismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);

      progressIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        const newProgress = (remaining / autoDismissMs) * 100;
        setProgress(newProgress);

        if (remaining <= 0) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }
      }, 50);
    } else {
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }

    return () => {
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isHovered, isVisible, autoDismissMs, handleDismiss]);

  const handleCTAClick = () => {
    if (promotion.ctaRoute.startsWith('payment-modal:')) {
      const planKey = promotion.ctaRoute.replace('payment-modal:', '');
      openPaymentModal({
        preselectedPlanKey: planKey || 'focused_monthly',
        triggerContext: 'feature-promotion',
        returnUrl: window.location.href,
      });
      handleDismiss();
    } else if (promotion.ctaRoute.startsWith('action:')) {
      const action = promotion.ctaRoute.replace('action:', '');
      window.dispatchEvent(new CustomEvent(action));
      handleDismiss();
    } else if (promotion.ctaRoute) {
      router.push(promotion.ctaRoute);
      handleDismiss();
    } else {
      handleDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="feature-promotion-card"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="fixed bottom-3 right-3 z-[10000] w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--border-primary)] bg-white dark:bg-[#141810] shadow-2xl overflow-hidden"
          role="dialog"
          aria-labelledby="promotion-title"
        >
          {/* Auto-dismiss progress line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-white/5 z-20">
            <motion.div
              className="h-full bg-[#013f2e]"
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 0.05 }}
            />
          </div>

          <div className="p-4 sm:p-5 pt-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-lime-500/15 dark:bg-lime-500/10 flex items-center justify-center shrink-0 text-lime-600 dark:text-lime-400">
                  <HeaderIcon className="w-4 h-4" />
                </div>
                <p
                  id="promotion-title"
                  className="dashboard-promo-title text-gray-900 dark:text-white"
                >
                  {promotion.title}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 -m-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
                aria-label="Dismiss promotion"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <p className="dashboard-promo-body text-gray-600 dark:text-gray-300">
              {promotion.description}
            </p>

            {/* Benefits List */}
            {promotion.benefits && promotion.benefits.length > 0 && (
              <div className="mt-3 space-y-2">
                {promotion.benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + index * 0.08 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded-full bg-lime-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-lime-600 dark:text-lime-400" />
                    </div>
                    <span className="dashboard-promo-small text-gray-700 dark:text-gray-300">
                      {benefit}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={handleDismiss}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 dashboard-promo-small font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Later
              </button>
              <button
                onClick={handleCTAClick}
                className="flex-1 px-3 py-2 rounded-lg bg-[#013f2e] text-slate-950 dashboard-promo-small font-semibold hover:brightness-95 transition-all"
              >
                {promotion.ctaText}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
