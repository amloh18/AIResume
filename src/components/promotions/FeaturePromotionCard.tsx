'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import type { PromotionConfig } from '@/contexts/FeaturePromotionContext';

interface FeaturePromotionCardProps {
  promotion: PromotionConfig;
  onDismiss: () => void;
}

export default function FeaturePromotionCard({ promotion, onDismiss }: FeaturePromotionCardProps) {
  const router = useRouter();
  const { openPaymentModal } = usePaymentModal();
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoDismissMs = promotion.autoDismissMs || 8000;

  // Handle auto-dismiss
  useEffect(() => {
    if (!isHovered && isVisible) {
      autoDismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);
    }

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [isHovered, isVisible, autoDismissMs]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for animation to complete before calling onDismiss
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const handleCTAClick = () => {
    // Check if route is a payment modal route (format: "payment-modal:planKey")
    if (promotion.ctaRoute.startsWith('payment-modal:')) {
      const planKey = promotion.ctaRoute.replace('payment-modal:', '');
      openPaymentModal({
        preselectedPlanKey: planKey || 'pro_monthly',
        triggerContext: 'feature-promotion',
        returnUrl: window.location.href,
      });
      handleDismiss();
    } else if (promotion.ctaRoute.startsWith('action:')) {
      // Trigger a custom event instead of navigation
      const action = promotion.ctaRoute.replace('action:', '');
      window.dispatchEvent(new CustomEvent(action));
      handleDismiss();
    } else if (promotion.ctaRoute) {
      // Regular navigation
      router.push(promotion.ctaRoute);
      handleDismiss();
    } else {
      handleDismiss();
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="fixed bottom-0 sm:bottom-4 right-0 sm:right-4 z-50 w-full sm:w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl shadow-2xl border border-red-200 dark:border-red-500/30 overflow-hidden m-2 sm:m-0"
          role="dialog"
          aria-labelledby="promotion-title"
          aria-describedby="promotion-description"
        >
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Dismiss promotion"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="flex flex-col">
            {/* Image Section */}
            {promotion.imageUrl && (
              <div className="relative w-full h-48 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 overflow-hidden">
                <img
                  src={promotion.imageUrl}
                  alt={promotion.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Hide image on error
                    e.currentTarget.style.display = 'none';
                  }}
                  loading="lazy"
                />
              </div>
            )}

            {/* Content Section */}
            <div className="p-6 space-y-4">
              {/* Title */}
              <h3
                id="promotion-title"
                className="text-xl font-bold text-gray-900 dark:text-white"
              >
                {promotion.title}
              </h3>

              {/* Description */}
              <p
                id="promotion-description"
                className="text-sm text-gray-900 dark:text-white"
              >
                {promotion.description}
              </p>

              {/* Benefits List */}
              {promotion.benefits && promotion.benefits.length > 0 && (
                <ul className="space-y-2">
                  {promotion.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* CTA Button */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCTAClick}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-105"
                >
                  {promotion.ctaText}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400 font-medium rounded-lg transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

