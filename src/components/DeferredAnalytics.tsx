'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

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

  useEffect(() => {
    // Wait for page to be interactive before loading analytics
    if (typeof window !== 'undefined') {
      // Use requestIdleCallback if available, otherwise use setTimeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          setShouldLoad(true);
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          setShouldLoad(true);
        }, 2000);
      }
    }
  }, []);

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

