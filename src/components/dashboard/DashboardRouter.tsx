'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useUserData } from '@/lib/hooks/useUserData';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';

// Lazy load components for better performance
import dynamic from 'next/dynamic';

// Preload critical components
const Analytics = dynamic(() => import('@/components/dashboard/Analytics'), {
  loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
});

const ApplicationTracker = dynamic(() => import('@/components/dashboard/ApplicationTracker'), {
  loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
});

const Canvas = dynamic(() => import('@/components/dashboard/Canvas'), {
  loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
});

const ApplicationJourney = dynamic(() => import('@/app/dashboard/application-journey/page'), {
  loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
});

const Settings = dynamic(() => import('@/app/dashboard/settings/page'), {
  loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
});

// Component cache to prevent re-mounting
const componentCache = new Map();

interface DashboardRouterProps {
  children?: React.ReactNode;
}

// Internal component that uses useSearchParams
const DashboardRouterInternal: React.FC<DashboardRouterProps> = ({ children }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useUnifiedAuth();
  const { userData, loading: userLoading } = useUserData();
  const { isOpen: isMobileMenuOpen } = useMobileSidebar();

  // Track loading state for each route
  const [routeLoading, setRouteLoading] = useState<Record<string, boolean>>({});
  const [currentRoute, setCurrentRoute] = useState('analytics');

  // Determine current route and switch immediately
  useEffect(() => {
    let newRoute = 'analytics';
    if (pathname === '/dashboard') newRoute = 'analytics';
    else if (pathname.includes('/application-tracker')) newRoute = 'application-tracker';
    else if (pathname.includes('/canvas')) newRoute = 'canvas';
    else if (pathname.includes('/application-journey')) newRoute = 'application-journey';
    else if (pathname.includes('/settings')) newRoute = 'settings';

    // Switch route immediately
    if (newRoute !== currentRoute) {
      setCurrentRoute(newRoute);
      setRouteLoading(prev => ({ ...prev, [newRoute]: true }));
    }
  }, [pathname, currentRoute]);

  // Preload components in background
  useEffect(() => {
    const preloadComponents = async () => {
      const routesToPreload = ['analytics', 'application-tracker', 'canvas', 'application-journey', 'settings'];
      
      for (const route of routesToPreload) {
        if (!componentCache.has(route)) {
          try {
            switch (route) {
              case 'analytics':
                await import('@/components/dashboard/Analytics');
                break;
              case 'application-tracker':
                await import('@/components/dashboard/ApplicationTracker');
                break;
              case 'canvas':
                await import('@/components/dashboard/Canvas');
                break;
              case 'application-journey':
                await import('@/app/dashboard/application-journey/page');
                break;
              case 'settings':
                await import('@/app/dashboard/settings/page');
                break;
            }
            componentCache.set(route, true);
            setRouteLoading(prev => ({ ...prev, [route]: false }));
          } catch (error) {
            console.warn(`Failed to preload ${route}:`, error);
            setRouteLoading(prev => ({ ...prev, [route]: false }));
          }
        }
      }
    };

    // Start preloading immediately
    preloadComponents();
  }, []);

  // Render immediately - pages handle their own loading states
  // Route component mapping
  const routeComponents = {
    'analytics': Analytics,
    'application-tracker': ApplicationTracker,
    'canvas': Canvas,
    'application-journey': ApplicationJourney,
    'settings': Settings
  };

  const CurrentComponent = routeComponents[currentRoute] || Analytics;
  const isLoading = routeLoading[currentRoute];

  // Animation variants for smooth transitions
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.2
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRoute}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          className="w-full"
        >
          <Suspense fallback={<div />}>
            <CurrentComponent />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Wrapper component with Suspense boundary for useSearchParams
const DashboardRouter: React.FC<DashboardRouterProps> = ({ children }) => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500"></div>
      </div>
    }>
      <DashboardRouterInternal>{children}</DashboardRouterInternal>
    </Suspense>
  );
};

export default DashboardRouter;
