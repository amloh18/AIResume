'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'feature-promotion-state';
const SESSION_SHOWN_KEY = 'feature-promotion-session-shown';
const PROMOTION_COOLDOWN_MS = 300000; // 5 minutes between promotions

interface DismissedPromotion {
  dismissedAt: number;
  expiresAt: number; // Next day midnight
}

interface PromotionState {
  dismissedPromotions: Record<string, DismissedPromotion>;
  lastPromotionShown: number;
  shownPromotions: Record<string, number>;
}

interface FeaturePromotionContextType {
  currentPromotion: PromotionConfig | null;
  showPromotion: (promotion: PromotionConfig) => void;
  dismissPromotion: (promotionId: string) => void;
  isDismissed: (promotionId: string) => boolean;
  canShowPromotion: () => boolean;
  isPromotionOnCooldown: (promotionId: string, cooldownDays?: number) => boolean;
  clearExpiredDismissals: () => void;
}

// Promotion config will be defined in promotionTypes.ts
export interface PromotionConfig {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  ctaText: string;
  ctaRoute: string;
  imageUrl?: string;
  contexts: string[];
  priority: number;
  autoDismissMs?: number;
  cooldownDays?: number;
}

const FeaturePromotionContext = createContext<FeaturePromotionContextType | undefined>(undefined);

// Get next midnight timestamp
const getNextMidnight = (): number => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
};

// Load state from localStorage
const loadState = (): PromotionState => {
  if (typeof window === 'undefined') {
    return {
      dismissedPromotions: {},
      lastPromotionShown: 0,
      shownPromotions: {},
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        dismissedPromotions: parsed.dismissedPromotions || {},
        lastPromotionShown: parsed.lastPromotionShown || 0,
        shownPromotions: parsed.shownPromotions || {},
      };
    }
  } catch (error) {
    console.error('Error loading promotion state:', error);
  }

  return {
    dismissedPromotions: {},
    lastPromotionShown: 0,
    shownPromotions: {},
  };
};

// Save state to localStorage
const saveState = (state: PromotionState): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving promotion state:', error);
  }
};

export function FeaturePromotionProvider({ children }: { children: React.ReactNode }) {
  const [currentPromotion, setCurrentPromotion] = useState<PromotionConfig | null>(null);
  const [state, setState] = useState<PromotionState>(loadState);
  const isInitializedRef = useRef(false);

  // Initialize and clear expired dismissals on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      const loadedState = loadState();
      const now = Date.now();
      
      // Clear expired dismissals
      const activeDismissals: Record<string, DismissedPromotion> = {};
      Object.entries(loadedState.dismissedPromotions).forEach(([id, dismissal]) => {
        if (dismissal.expiresAt > now) {
          activeDismissals[id] = dismissal;
        }
      });

      const cleanedState: PromotionState = {
        dismissedPromotions: activeDismissals,
        lastPromotionShown: loadedState.lastPromotionShown,
        shownPromotions: loadedState.shownPromotions || {},
      };

      setState(cleanedState);
      saveState(cleanedState);
      isInitializedRef.current = true;
    }
  }, []);

  // Clear expired dismissals
  const clearExpiredDismissals = useCallback(() => {
    const now = Date.now();
    setState((prev) => {
      const activeDismissals: Record<string, DismissedPromotion> = {};
      Object.entries(prev.dismissedPromotions).forEach(([id, dismissal]) => {
        if (dismissal.expiresAt > now) {
          activeDismissals[id] = dismissal;
        }
      });

      const cleanedState: PromotionState = {
        ...prev,
        dismissedPromotions: activeDismissals,
      };

      saveState(cleanedState);
      return cleanedState;
    });
  }, []);

  // Check if promotion is dismissed
  const isDismissed = useCallback(
    (promotionId: string): boolean => {
      const dismissal = state.dismissedPromotions[promotionId];
      if (!dismissal) return false;
      
      const now = Date.now();
      if (dismissal.expiresAt <= now) {
        // Expired, remove it
        setState((prev) => {
          const newDismissals = { ...prev.dismissedPromotions };
          delete newDismissals[promotionId];
          const newState: PromotionState = {
            ...prev,
            dismissedPromotions: newDismissals,
          };
          saveState(newState);
          return newState;
        });
        return false;
      }
      return true;
    },
    [state.dismissedPromotions]
  );

  // Check if we can show a promotion (global cooldown check)
  const canShowPromotion = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    // Don't show if already shown in this session (not on refresh)
    if (sessionStorage.getItem(SESSION_SHOWN_KEY)) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastPromotion = now - state.lastPromotionShown;
    return timeSinceLastPromotion >= PROMOTION_COOLDOWN_MS;
  }, [state.lastPromotionShown]);

  // Check if specific promotion is on cooldown
  const isPromotionOnCooldown = useCallback(
    (promotionId: string, cooldownDays = 0): boolean => {
      if (cooldownDays <= 0) return false;
      
      const lastShown = state.shownPromotions[promotionId];
      if (!lastShown) return false;

      const now = Date.now();
      const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
      return now - lastShown < cooldownMs;
    },
    [state.shownPromotions]
  );

  // Show a promotion
  const showPromotion = useCallback(
    (promotion: PromotionConfig) => {
      // Don't show if dismissed, in global cooldown, or in specific cooldown
      if (
        isDismissed(promotion.id) || 
        !canShowPromotion() || 
        isPromotionOnCooldown(promotion.id, promotion.cooldownDays)
      ) {
        return;
      }

      setCurrentPromotion(promotion);
      
      // Mark as shown in this session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_SHOWN_KEY, 'true');
      }

      setState((prev) => {
        const newState: PromotionState = {
          ...prev,
          lastPromotionShown: Date.now(),
          shownPromotions: {
            ...prev.shownPromotions,
            [promotion.id]: Date.now(),
          },
        };
        saveState(newState);
        return newState;
      });
    },
    [isDismissed, canShowPromotion, isPromotionOnCooldown]
  );

  // Dismiss a promotion
  const dismissPromotion = useCallback(
    (promotionId: string) => {
      setCurrentPromotion(null);
      setState((prev) => {
        const newDismissals = {
          ...prev.dismissedPromotions,
          [promotionId]: {
            dismissedAt: Date.now(),
            expiresAt: getNextMidnight(),
          },
        };

        const newState: PromotionState = {
          ...prev,
          dismissedPromotions: newDismissals,
        };

        saveState(newState);
        return newState;
      });
    },
    []
  );

  // Clear expired dismissals periodically (every hour)
  useEffect(() => {
    const interval = setInterval(() => {
      clearExpiredDismissals();
    }, 3600000); // 1 hour

    return () => clearInterval(interval);
  }, [clearExpiredDismissals]);

  const value: FeaturePromotionContextType = {
    currentPromotion,
    showPromotion,
    dismissPromotion,
    isDismissed,
    canShowPromotion,
    isPromotionOnCooldown,
    clearExpiredDismissals,
  };

  return (
    <FeaturePromotionContext.Provider value={value}>
      {children}
    </FeaturePromotionContext.Provider>
  );
}

export function useFeaturePromotion(): FeaturePromotionContextType {
  const context = useContext(FeaturePromotionContext);
  if (context === undefined) {
    throw new Error('useFeaturePromotion must be used within a FeaturePromotionProvider');
  }
  return context;
}

