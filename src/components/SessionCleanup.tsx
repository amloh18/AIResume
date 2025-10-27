'use client';

import { useEffect } from 'react';
import { clearOversizedSessionCookies } from '@/lib/utils/session-cleanup';

export default function SessionCleanup() {
  useEffect(() => {
    // Run cleanup on component mount
    clearOversizedSessionCookies();
  }, []);

  return null; // This component doesn't render anything
}
