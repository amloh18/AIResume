'use client';

import { useEffect } from 'react';
import {
  clearOversizedSessionCookies,
  monitorAndPreventCookieBloat,
  emergencyCleanup431Error,
  nuclearCleanupAllNonEssentialCookies
} from '@/lib/utils/session-cleanup';

export default function SessionCleanup() {
  useEffect(() => {
    // Run IMMEDIATE fix for 431 error on page load
    
    // Import and run the immediate 431 fix
    import('@/lib/utils/immediate-431-fix').then(({ immediate431Fix }) => {
      immediate431Fix();
    });
    
    // Also run nuclear cleanup as backup
    nuclearCleanupAllNonEssentialCookies();
    
    // Add error listener for 431 errors
    const handle431Error = (event: ErrorEvent) => {
      if (event.message && event.message.includes('431')) {
        emergencyCleanup431Error();
      }
    };
    
    window.addEventListener('error', handle431Error);
    
    // Aggressive follow-up cleanup every 30 seconds
    const aggressiveCleanupInterval = setInterval(() => {
      clearOversizedSessionCookies();
    }, 30000); // 30 seconds - very aggressive for 431 prevention
    
    return () => {
      window.removeEventListener('error', handle431Error);
      clearInterval(aggressiveCleanupInterval);
    };
  }, []);

  return null; // This component doesn't render anything
}
