'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface OnboardingState {
  showWelcome: boolean;
  showMasterCVOnboarding: boolean;
  showSubscriptionCheck: boolean;
  hasMasterCV: boolean;
  isNewUser: boolean;
}

/**
 * Hook to manage the onboarding flow
 * Handles:
 * - Welcome modal for new users
 * - Master CV onboarding check
 * - Subscription check for returning users
 */
export function useOnboardingFlow() {
  const { data: session, status } = useSession();
  const [state, setState] = useState<OnboardingState>({
    showWelcome: false,
    showMasterCVOnboarding: false,
    showSubscriptionCheck: false,
    hasMasterCV: false,
    isNewUser: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (status === 'loading') return;
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user is new (created in last 5 minutes)
        const response = await fetch('/api/user/onboarding-status');
        const data = await response.json();

        if (data.success) {
          const {
            isNewUser,
            hasMasterCV,
            hasSeenWelcome,
            subscription
          } = data.data;

          // Determine which modals to show
          if (isNewUser && !hasSeenWelcome) {
            // New user flow: Show welcome -> Master CV onboarding
            setState({
              showWelcome: true,
              showMasterCVOnboarding: false,
              showSubscriptionCheck: false,
              hasMasterCV,
              isNewUser: true
            });
          } else if (!hasMasterCV) {
            // Returning user without Master CV: Show welcome -> Master CV onboarding
            setState({
              showWelcome: true,
              showMasterCVOnboarding: false,
              showSubscriptionCheck: false,
              hasMasterCV: false,
              isNewUser: false
            });
          } else if (subscription?.plan === 'free') {
            // Returning user with Master CV on free plan: Show subscription check
            setState({
              showWelcome: false,
              showMasterCVOnboarding: false,
              showSubscriptionCheck: true,
              hasMasterCV: true,
              isNewUser: false
            });
          } else {
            // All good, no modals
            setState({
              showWelcome: false,
              showMasterCVOnboarding: false,
              showSubscriptionCheck: false,
              hasMasterCV: true,
              isNewUser: false
            });
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [session, status]);

  const dismissWelcome = async () => {
    setState(prev => ({ ...prev, showWelcome: false, showMasterCVOnboarding: true }));
    
    // Mark welcome as seen
    try {
      await fetch('/api/user/onboarding-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasSeenWelcome: true })
      });
    } catch (error) {
      console.error('Error updating welcome status:', error);
    }
  };

  const dismissMasterCVOnboarding = () => {
    setState(prev => ({ ...prev, showMasterCVOnboarding: false }));
  };

  const dismissSubscriptionCheck = () => {
    setState(prev => ({ ...prev, showSubscriptionCheck: false }));
  };

  return {
    ...state,
    isLoading,
    dismissWelcome,
    dismissMasterCVOnboarding,
    dismissSubscriptionCheck
  };
}


