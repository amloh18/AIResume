'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import NavigationManager from '@/lib/utils/navigationManager';
import SessionManager from '@/lib/utils/sessionManager';

export const useNavigationGuard = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    const navigationManager = NavigationManager.getInstance();
    const sessionManager = SessionManager.getInstance();

    // Update authentication status
    const isAuthenticated = status === 'authenticated' && !!session;
    navigationManager.setAuthenticationStatus(isAuthenticated);

    // Update route tracking
    if (isAuthenticated && pathname) {
      sessionManager.updateRoute(pathname);
    }

    // Handle navigation prevention
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isAuthenticated) {
        // Save current route before unload
        sessionManager.updateRoute(pathname);
      }
    };

    // Handle popstate (back/forward button)
    const handlePopState = (event: PopStateEvent) => {
      if (isAuthenticated) {
        const currentPath = window.location.pathname;
        
        // If trying to navigate to a public route, prevent it
        if (navigationManager.isPublicRoute(currentPath)) {
          console.log('Preventing navigation to public route:', currentPath);
          
          // Replace with last authenticated route
          const lastRoute = sessionManager.getLastRoute();
          window.history.replaceState(null, '', lastRoute || '/dashboard');
          
          // Prevent the navigation
          event.preventDefault();
          return;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname, session, status]);

  // Custom navigation function that respects guards
  const navigateTo = (path: string, replace: boolean = false) => {
    const navigationManager = NavigationManager.getInstance();
    return navigationManager.navigateToRoute(router, path, replace);
  };

  return {
    navigateTo,
    currentPath: pathname,
    isAuthenticated: status === 'authenticated' && !!session
  };
};
