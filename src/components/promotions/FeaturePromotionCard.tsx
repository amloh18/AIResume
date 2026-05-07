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
  const [progress, setProgress] = useState(100);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoDismissMs = promotion.autoDismissMs || 8000;

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
  }, [isHovered, isVisible, autoDismissMs]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const handleCTAClick = () => {
    if (promotion.ctaRoute.startsWith('payment-modal:')) {
      const planKey = promotion.ctaRoute.replace('payment-modal:', '');
      openPaymentModal({
        preselectedPlanKey: planKey || 'pro_monthly',
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
          initial={{ opacity: 0, y: 100, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, x: 20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="fixed bottom-4 right-4 z-[9999] w-full sm:w-[400px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#141810] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-white/10 overflow-hidden"
          role="dialog"
          aria-labelledby="promotion-title"
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 dark:bg-white/5 z-20">
            <motion.div 
              className="h-full bg-lime-500"
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 0.05 }}
            />
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-all group"
            aria-label="Dismiss promotion"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:scale-110" />
          </button>

          <div className="flex flex-col">
            {/* Image Section with Glass Overlay */}
            {promotion.imageUrl && (
              <div className="relative w-full h-40 overflow-hidden">
                <img
                  src={promotion.imageUrl}
                  alt={promotion.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#141810] to-transparent" />
              </div>
            )}

            {/* Content Section */}
            <div className={`p-8 ${!promotion.imageUrl ? 'pt-10' : 'pt-2'} space-y-6`}>
              <div>
                <h3
                  id="promotion-title"
                  className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-2"
                >
                  {promotion.title}
                </h3>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                  {promotion.description}
                </p>
              </div>

              {/* Benefits List */}
              {promotion.benefits && promotion.benefits.length > 0 && (
                <div className="space-y-3">
                  {promotion.benefits.map((benefit, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-lime-500/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" />
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {benefit}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCTAClick}
                  className="flex-1 px-6 py-4 bg-lime-500 hover:bg-lime-600 text-black font-black rounded-2xl transition-all shadow-xl shadow-lime-500/20 hover:scale-[1.02] active:scale-[0.98] text-sm uppercase tracking-wider"
                >
                  {promotion.ctaText}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-6 py-4 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold rounded-2xl transition-all text-sm"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

