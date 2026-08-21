'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import CreditExhaustionModal from '@/components/payment/CreditExhaustionModal';

interface CreditInfo {
  creditsRemaining: number;
  limit: number;
  resetTime?: Date;
  reason?: string;
}

interface CreditExhaustionContextType {
  showCreditExhaustion: (creditInfo: CreditInfo, preselectedPlanKey?: string) => void;
  hideCreditExhaustion: () => void;
  isCreditExhaustionVisible: boolean;
  checkAndHandleCreditExhaustion: (
    usageCheckResponse: {
      allowed: boolean;
      usage?: {
        currentUsage: number;
        limit: number;
        resetTime?: string | Date;
      };
      reason?: string;
    },
    preselectedPlanKey?: string
  ) => boolean; // Returns true if credits are exhausted, false otherwise
}

const CreditExhaustionContext = createContext<CreditExhaustionContextType | undefined>(undefined);

export const useCreditExhaustion = () => {
  const context = useContext(CreditExhaustionContext);
  if (!context) {
    throw new Error('useCreditExhaustion must be used within a CreditExhaustionProvider');
  }
  return context;
};

interface CreditExhaustionProviderProps {
  children: ReactNode;
}

export const CreditExhaustionProvider: React.FC<CreditExhaustionProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [preselectedPlanKey, setPreselectedPlanKey] = useState<string>('focused_monthly');

  const showCreditExhaustion = useCallback((info: CreditInfo, planKey: string = 'focused_monthly') => {
    setCreditInfo(info);
    setPreselectedPlanKey(planKey);
    setIsVisible(true);
  }, []);

  const hideCreditExhaustion = useCallback(() => {
    setIsVisible(false);
    // Clear credit info after animation completes
    setTimeout(() => {
      setCreditInfo(null);
    }, 300);
  }, []);

  const checkAndHandleCreditExhaustion = useCallback((
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
    planKey: string = 'focused_monthly'
  ): boolean => {
    // Check if credits are exhausted
    if (!usageCheckResponse.allowed && usageCheckResponse.usage) {
      const { currentUsage, limit, resetTime } = usageCheckResponse.usage;
      
      // Only show credit exhaustion modal if:
      // 1. Limit is not unlimited (-1)
      // 2. Current usage has reached or exceeded the limit
      // 3. Time-based access is still valid (if provided) - to distinguish from subscription expiry
      const isTimeAccessValid = usageCheckResponse.timeAccess?.hasAccess !== false;
      
      if (limit !== -1 && currentUsage >= limit && isTimeAccessValid) {
        const resetTimeDate = resetTime 
          ? (typeof resetTime === 'string' ? new Date(resetTime) : resetTime)
          : undefined;

        // Calculate actual remaining credits: limit - currentUsage
        // When exhausted, this will be 0 or negative
        const actualRemaining = Math.max(0, limit - currentUsage);

        showCreditExhaustion(
          {
            creditsRemaining: actualRemaining,
            limit,
            resetTime: resetTimeDate,
            reason: usageCheckResponse.reason
          },
          planKey
        );
        return true; // Credits exhausted
      }
    }
    return false; // Credits not exhausted
  }, [showCreditExhaustion]);

  return (
    <CreditExhaustionContext.Provider
      value={{
        showCreditExhaustion,
        hideCreditExhaustion,
        isCreditExhaustionVisible: isVisible,
        checkAndHandleCreditExhaustion
      }}
    >
      {children}
      {creditInfo && (
        <CreditExhaustionModal
          isOpen={isVisible}
          onClose={hideCreditExhaustion}
          creditsRemaining={creditInfo.creditsRemaining}
          limit={creditInfo.limit}
          resetTime={creditInfo.resetTime}
          preselectedPlanKey={preselectedPlanKey}
          reason={creditInfo.reason}
        />
      )}
    </CreditExhaustionContext.Provider>
  );
};

