'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * AuthContext - Thin wrapper around NextAuth's session management
 * 
 * This context provides a simplified API for authentication that wraps NextAuth's useSession hook.
 * All session management is handled by NextAuth with secure HTTP-only cookies.
 * 
 * Migration Notes:
 * - Replaced custom JWT/session logic with NextAuth
 * - Removed localStorage session storage (security vulnerability)
 * - All authentication flows now use NextAuth providers
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
 * 
 * Primary hook for accessing authentication state throughout the application.
 * Use this instead of directly calling NextAuth's useSession in most components.
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
 * 
 * Wraps NextAuth's SessionProvider functionality with a simplified API.
 * Must be nested inside NextAuth's SessionProvider in the app layout.
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

  const logout = async () => {
    try {
      console.log('🚪 Logging out via NextAuth...');
      
      // Use NextAuth's signOut with redirect
      await signOut({
        callbackUrl: '/sign-in',
        redirect: true,
      });
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Fallback: navigate manually
      router.push('/sign-in');
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
