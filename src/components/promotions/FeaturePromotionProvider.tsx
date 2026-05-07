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
    // DO NOT show for Admin or B2B users
    if (contextData.isAdmin || contextData.isB2B) {
      return;
    }

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
        // Don't show upgrade-free-user promotion for paid users
        if (promotion.id === 'upgrade-free-user' && contextData.isPaidUser) {
          return;
        }
        
        // Increased delay to avoid showing immediately on page load
        const timer = setTimeout(() => {
          showPromotion(promotion);
        }, 5000); // 5 second delay

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
    contextData.isAdmin,
    contextData.isB2B,
    isDismissed,
    canShowPromotion,
    showPromotion,
  ]);

  // Dismiss upgrade-free-user promotion if user becomes paid
  useEffect(() => {
    if (currentPromotion?.id === 'upgrade-free-user' && contextData.isPaidUser) {
      dismissPromotion(currentPromotion.id);
    }
  }, [currentPromotion, contextData.isPaidUser, dismissPromotion]);

  const handleDismiss = () => {
    if (currentPromotion) {
      dismissPromotion(currentPromotion.id);
    }
  };

  // Don't render upgrade-free-user promotion for paid users
  const shouldShowPromotion = currentPromotion && 
    !(currentPromotion.id === 'upgrade-free-user' && contextData.isPaidUser);

  return (
    <>
      {shouldShowPromotion && (
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

