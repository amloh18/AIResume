'use client';

import React, { useEffect, useMemo } from 'react';
import { FeaturePromotionProvider as ContextProvider, useFeaturePromotion } from '@/contexts/FeaturePromotionContext';
import { usePromotionContext } from '@/hooks/usePromotionContext';
import { selectPromotion } from '@/lib/promotions/promotionManager';
import FeaturePromotionCard from './FeaturePromotionCard';

function PromotionRenderer() {
  const { currentPromotion, showPromotion, dismissPromotion, isDismissed, canShowPromotion } = useFeaturePromotion();
  const contextData = usePromotionContext();

  // Select and show promotion when context changes
  useEffect(() => {
    // Only check for promotions if we don't have one showing and cooldown has passed
    if (!currentPromotion && canShowPromotion()) {
      const promotion = selectPromotion({
        contexts: contextData.contexts,
        cvId: contextData.cvId,
        jobId: contextData.jobId,
        journeyId: contextData.journeyId,
        coverLetterId: contextData.coverLetterId,
        hasCoverLetter: contextData.hasCoverLetter,
        hasCV: contextData.hasCV,
        hasJobs: contextData.hasJobs,
        isPaidUser: contextData.isPaidUser,
        isDismissed,
        canShowPromotion,
      });

      if (promotion) {
        // Small delay to avoid showing immediately on page load
        const timer = setTimeout(() => {
          showPromotion(promotion);
        }, 2000); // 2 second delay

        return () => clearTimeout(timer);
      }
    }
  }, [
    currentPromotion,
    contextData.contexts,
    contextData.cvId,
    contextData.jobId,
    contextData.journeyId,
    contextData.hasCoverLetter,
    contextData.hasCV,
    contextData.hasJobs,
    contextData.isPaidUser,
    isDismissed,
    canShowPromotion,
    showPromotion,
  ]);

  const handleDismiss = () => {
    if (currentPromotion) {
      dismissPromotion(currentPromotion.id);
    }
  };

  return (
    <>
      {currentPromotion && (
        <FeaturePromotionCard
          promotion={currentPromotion}
          onDismiss={handleDismiss}
        />
      )}
    </>
  );
}

export default function FeaturePromotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <ContextProvider>
      {children}
      <PromotionRenderer />
    </ContextProvider>
  );
}

