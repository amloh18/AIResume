'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, CheckCircle2, ArrowRight, MoreHorizontal, X } from 'lucide-react';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import { usePricingPlans, DatabasePricingPlan } from '@/lib/hooks/usePricingPlans';
import { CHIP_INLINE, CHIP_TONES } from '@/components/ui/chip-styles';

interface UpgradeCardProps {
  userId: string;
  onClose: () => void;
}

const UpgradeCard: React.FC<UpgradeCardProps> = ({ userId, onClose }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Get location-based pricing
  const { plans, getRegionalPrice, getMonthlyEquivalent, getCurrencySymbol, loading: pricingLoading } = usePricingPlans({});

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };

  const handleViewMorePlans = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    handleClose();
  };

  // Get recommended plan (Focused Yearly) from pricing plans
  const recommendedPlan = useMemo(() => {
    const plan = plans.find((p: DatabasePricingPlan) => p.key === 'focused_yearly');
    if (!plan || pricingLoading) {
      // Fallback to default values if plan not loaded yet
      return {
        key: 'focused_yearly',
        name: 'Focused Yearly',
        price: 79.99,
        priceString: '$79.99',
        period: 'year',
        monthlyEquivalent: 6.67,
        monthlyEquivalentString: '$6.67',
        savings: '33%',
        currencySymbol: '$'
      };
    }

    const currencySymbol = getCurrencySymbol();
    const monthlyEquivalent = getMonthlyEquivalent(plan);
    const yearlyPriceString = getRegionalPrice(plan);

    // Extract numeric values for calculations
    const extractNumeric = (str: string): number => {
      return parseFloat(str.replace(/[^\d.,]/g, '').replace(',', '')) || 0;
    };

    const yearlyPrice = extractNumeric(yearlyPriceString);
    const monthlyPlan = plans.find((p: DatabasePricingPlan) => p.key === 'focused_monthly');
    const monthlyPrice = monthlyPlan ? extractNumeric(getRegionalPrice(monthlyPlan)) : 0;

    // Calculate savings percentage
    const yearlyMonthlyEquivalent = yearlyPrice / 12;
    const savings = monthlyPrice > 0
      ? Math.round(((monthlyPrice - yearlyMonthlyEquivalent) / monthlyPrice) * 100)
      : 33;

    return {
      key: plan.key,
      name: plan.name,
      price: yearlyPrice,
      priceString: yearlyPriceString,
      period: 'year',
      monthlyEquivalent: monthlyEquivalent.showMonthly
        ? extractNumeric(monthlyEquivalent.price)
        : yearlyMonthlyEquivalent,
      monthlyEquivalentString: monthlyEquivalent.showMonthly
        ? monthlyEquivalent.price
        : `${currencySymbol}${yearlyMonthlyEquivalent.toFixed(2)}`,
      savings: `${savings}%`,
      currencySymbol,
      plan // Store full plan object for regional pricing
    };
  }, [plans, getRegionalPrice, getMonthlyEquivalent, getCurrencySymbol, pricingLoading]);

  const benefits = [
    'Unlimited Tailored Resumes',
    'Unlimited Job Applications',
    'Full AI Rewrite & Keyword Injection',
    'AI-Generated Cover Letters',
    'All Templates & DOCX Export',
    'Priority Support'
  ];

  if (!isVisible) return null;

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 sm:bottom-4 right-0 sm:right-4 z-[60] w-full sm:w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl shadow-2xl border border-red-200 dark:border-red-500/30 overflow-hidden m-2 sm:m-0"
            role="dialog"
            aria-labelledby="upgrade-title"
            aria-describedby="upgrade-description"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Dismiss upgrade card"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="flex flex-col">
              {/* Content Section */}
              <div className="p-6 space-y-4">
                {/* Title */}
                <h3
                  id="upgrade-title"
                  className="text-h3 font-bold text-gray-900 dark:text-white"
                >
                  Unlock Premium
                </h3>

                {/* Description */}
                <p
                  id="upgrade-description"
                  className="text-small text-gray-900 dark:text-white"
                >
                  Upgrade to unlock all features
                </p>

                {/* Plan Info Card */}
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-500/30">
                  <div className="text-center mb-3">
                    <div className={`${CHIP_INLINE} ${CHIP_TONES.rose} font-bold mb-2`}>
                      Recommended
                    </div>
                    <h4 className="text-h3 font-bold text-gray-900 dark:text-white mb-1">
                      {recommendedPlan.name}
                    </h4>
                    <div className="text-h2 font-bold text-gray-900 dark:text-white">
                      {recommendedPlan.monthlyEquivalentString || `${recommendedPlan.currencySymbol}${recommendedPlan.monthlyEquivalent.toFixed(2)}`}
                    </div>
                    <div className="text-small text-gray-600 dark:text-gray-400 mt-1">
                      Billed annually at {recommendedPlan.priceString || `${recommendedPlan.currencySymbol}${recommendedPlan.price}`}
                    </div>
                    <div className="text-small text-red-600 dark:text-red-400 font-medium mt-1">
                      Save {recommendedPlan.savings}
                    </div>
                  </div>
                </div>

                {/* Benefits List */}
                <ul className="space-y-2">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-small text-gray-900 dark:text-white">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleUpgrade}
                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                  >
                    Upgrade Now
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleViewMorePlans}
                    className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400 font-medium rounded-lg transition-all hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-1"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    More Plans
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      {showPaymentModal && (
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          preselectedPlanKey={recommendedPlan.key}
        />
      )}
    </>
  );
};

export default UpgradeCard;

