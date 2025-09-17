'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type TransitionType = 'none' | 'minimal' | 'full';

interface RouteTransitionConfig {
  from: string;
  to: string;
  type: TransitionType;
}

// Define which route transitions should show loading animations
const ROUTE_TRANSITIONS: RouteTransitionConfig[] = [
  // Full CVCircle animation for major transitions
  { from: '/auth/signin', to: '/master-cv-onboarding', type: 'full' },
  { from: '/auth/signup', to: '/master-cv-onboarding', type: 'full' },
  { from: '/master-cv-onboarding', to: '/dashboard', type: 'full' },
  { from: '/dashboard', to: '/studio', type: 'full' },
  
  // Minimal loading for dashboard page switches
  { from: '/dashboard', to: '/dashboard/pipeline', type: 'minimal' },
  { from: '/dashboard', to: '/dashboard/cv-journey', type: 'minimal' },
  { from: '/dashboard', to: '/dashboard/settings', type: 'minimal' },
  { from: '/dashboard/pipeline', to: '/dashboard', type: 'minimal' },
  { from: '/dashboard/cv-journey', to: '/dashboard', type: 'minimal' },
  { from: '/dashboard/settings', to: '/dashboard', type: 'minimal' },
  
  // No loading for quick navigation
  { from: '/dashboard/settings', to: '/dashboard/pipeline', type: 'none' },
  { from: '/dashboard/pipeline', to: '/dashboard/cv-journey', type: 'none' },
];

export const useRouteTransition = () => {
  const pathname = usePathname();
  const [previousPath, setPreviousPath] = useState<string>('');
  const [transitionType, setTransitionType] = useState<TransitionType>('none');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (previousPath && previousPath !== pathname) {
      // Find matching transition configuration
      const transition = ROUTE_TRANSITIONS.find(
        t => t.from === previousPath && t.to === pathname
      );

      if (transition) {
        setTransitionType(transition.type);
        setIsTransitioning(true);

        // Auto-hide transition after appropriate duration
        const duration = transition.type === 'full' ? 2000 : 500;
        setTimeout(() => {
          setIsTransitioning(false);
        }, duration);
      }
    }

    setPreviousPath(pathname);
  }, [pathname, previousPath]);

  const shouldShowTransition = () => {
    return isTransitioning && transitionType !== 'none';
  };

  const getTransitionVariant = () => {
    if (!isTransitioning) return 'minimal';
    
    switch (transitionType) {
      case 'full':
        return 'app-loading';
      case 'minimal':
        return 'minimal';
      default:
        return 'minimal';
    }
  };

  return {
    shouldShowTransition: shouldShowTransition(),
    transitionVariant: getTransitionVariant(),
    isTransitioning,
    transitionType
  };
};

export default useRouteTransition;