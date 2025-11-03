'use client';

import { useSession } from 'next-auth/react';

/**
 * Unified Authentication Hook
 * 
 * Single React hook for accessing authentication state.
 * Replaces multiple auth hooks (useAuth, useCustomAuth, etc.)
 * 
 * Usage:
 *   const { user, isAuthenticated, isLoading } = useUnifiedAuth();
 */
export function useUnifiedAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    status,
  };
}

