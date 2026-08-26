'use client';

import React, { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import guestCVService from '@/lib/services/guestCVService';

/**
 * AuthProvider - Retained solely for the global guest-to-account draft
 * transfer side effect.
 *
 * Session state is consumed directly via NextAuth's `useSession` (see
 * `useUnifiedAuth` in src/lib/hooks/useUnifiedAuth.ts). The old `useAuth`
 * hook / AuthContext was unused and has been removed.
 */

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status } = useSession();

  // Centralized Global Guest Draft Transfer
  // Whenever the user becomes authenticated, check for an existing guest draft
  // and transfer it to their account automatically.
  React.useEffect(() => {
    let isMounted = true;
    
    async function transferDraft() {
      if (status === 'authenticated' && session?.user?.id) {
        try {
          const sessionId = guestCVService.getSessionId();
          if (sessionId) {
            const hasDraft = await guestCVService.hasDraft(sessionId);
            if (hasDraft && isMounted) {
              console.log('🔄 AuthContext - Automatically transferring guest draft...');
              const transferRes = await guestCVService.transferDraftToUser(sessionId, session.user.id);
              if (transferRes.success && transferRes.cvId && isMounted) {
                console.log('✅ AuthContext - Guest draft transferred! New CV ID:', transferRes.cvId);
                
                // Optionally trigger an onboarding sync to mark CV as created
                await fetch('/api/user/onboarding', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    onboarding: { primary_cv_id: transferRes.cvId },
                    userLifecycleState: 'PRIMARY_CV_CREATED'
                  })
                });
              }
            }
          }
        } catch (err) {
          console.error('Failed to transfer guest draft in AuthContext:', err);
        }
      }
    }

    transferDraft();
    
    return () => {
      isMounted = false;
    };
  }, [status, session?.user?.id]);

  return <>{children}</>;
}

