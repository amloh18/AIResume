'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Dynamically import analytics components only on client side after page is interactive
const Analytics = dynamic(() => import('@vercel/analytics/next').then(mod => ({ default: mod.Analytics })), {
  ssr: false,
});

const SpeedInsights = dynamic(() => import('@vercel/speed-insights/next').then(mod => ({ default: mod.SpeedInsights })), {
  ssr: false,
});

/**
 * DeferredAnalytics Component
 * Loads analytics scripts only after the page is interactive to improve initial load performance
 */
export default function DeferredAnalytics() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Wait for page to be interactive before loading analytics
    // Use framework-managed deferral: setTimeout with a small delay to
    // avoid timing out main-thread work and race with hydration.
    if (typeof window !== 'undefined') {
      const timeoutId = window.setTimeout(() => setShouldLoad(true), 1500);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;

    // Track page views in the local database
    const trackPageView = async () => {
      try {
        const cleanPathname = pathname || '/';
        const formattedPath = cleanPathname.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home';
        const actionName = `page_view_${formattedPath}`;

        await fetch('/api/activity-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: actionName,
            metadata: {
              pathname: cleanPathname,
              search: typeof window !== 'undefined' ? window.location.search : '',
              title: typeof document !== 'undefined' ? document.title : '',
              referrer: typeof document !== 'undefined' ? document.referrer : '',
            }
          })
        });
      } catch (err) {
        // Fail silently
      }
    };

    trackPageView();
  }, [pathname, shouldLoad]);

  if (!shouldLoad) {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

