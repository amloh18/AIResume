'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import guestCVService from '@/lib/services/guestCVService';

/**
 * AuthContext - Thin wrapper around NextAuth's session management
 * 
 * This context provides a simplified API for authentication that wraps NextAuth's useSession hook.
 * All session management is handled by NextAuth with secure HTTP-only cookies.
 */

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role?: string;
  planKey?: string;
  subscriptionStatus?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  checkAuth: () => boolean;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * useAuth Hook
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user: User | null = session?.user ? {
    id: (session.user as any).id || '',
    email: session.user.email || '',
    name: session.user.name || '',
    image: session.user.image || undefined,
    role: (session.user as any).role,
    planKey: (session.user as any).planKey,
    subscriptionStatus: (session.user as any).subscriptionStatus,
  } : null;

  const checkAuth = (): boolean => {
    return status === 'authenticated';
  };

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

  const logout = async () => {
    try {
      console.log('🚪 Logging out via NextAuth...');
      
      // Use NextAuth's signOut with redirect
      await signOut({
        callbackUrl: '/',
        redirect: true,
      });
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Fallback: navigate manually
      window.location.href = '/';
    }
  };

  const value: AuthContextType = {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    logout,
    checkAuth,
    status,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
