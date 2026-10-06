'use client';

import { useCallback } from 'react';
import { useCreditExhaustion } from '@/contexts/CreditExhaustionContext';

/**
 * Hook to handle credit exhaustion checks and modal display
 * 
 * Usage:
 * ```tsx
 * const { checkUsageAndHandleExhaustion } = useCreditExhaustionHandler();
 * 
 * const response = await fetch('/api/user/usage/check', {...});
 * const data = await response.json();
 * 
 * if (checkUsageAndHandleExhaustion(data)) {
 *   // Credits exhausted, modal is shown
 *   return;
 * }
 * // Continue with normal flow
 * ```
 */
export function useCreditExhaustionHandler() {
  const { checkAndHandleCreditExhaustion, showCreditExhaustion, hideCreditExhaustion, isCreditExhaustionVisible } = useCreditExhaustion();

  /**
   * Check usage response and automatically show modal if credits exhausted
   * @param usageCheckResponse - Response from /api/user/usage/check
   * @param preselectedPlanKey - Plan to preselect in payment modal (default: 'focused_monthly')
   * @returns true if credits are exhausted (modal shown), false otherwise
   */
  const checkUsageAndHandleExhaustion = useCallback((
    usageCheckResponse: {
      allowed: boolean;
      usage?: {
        currentUsage: number;
        limit: number;
        resetTime?: string | Date;
      };
      reason?: string;
      timeAccess?: {
        hasAccess: boolean;
      };
    },
    preselectedPlanKey: string = 'focused_monthly'
  ): boolean => {
    return checkAndHandleCreditExhaustion(usageCheckResponse, preselectedPlanKey);
  }, [checkAndHandleCreditExhaustion]);

  /**
   * Manually show credit exhaustion modal
   * @param creditInfo - Credit information to display
   * @param preselectedPlanKey - Plan to preselect in payment modal
   */
  const showExhaustionModal = useCallback((
    creditInfo: {
      creditsRemaining: number;
      limit: number;
      resetTime?: Date;
      reason?: string;
    },
    preselectedPlanKey: string = 'focused_monthly'
  ) => {
    showCreditExhaustion(creditInfo, preselectedPlanKey);
  }, [showCreditExhaustion]);

  return {
    checkUsageAndHandleExhaustion,
    showExhaustionModal,
    hideExhaustionModal: hideCreditExhaustion,
    isExhaustionModalVisible: isCreditExhaustionVisible
  };
}

