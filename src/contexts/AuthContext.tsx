'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionFromStorage, clearSessionFromStorage, SessionData } from '@/lib/session';

interface AuthContextType {
  user: SessionData['user'] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: SessionData['user'], token: string) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SessionData['user'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuth = (): boolean => {
    const session = getSessionFromStorage();
    if (session) {
      setUser(session.user);
      return true;
    }
    return false;
  };

  const login = (userData: SessionData['user'], token: string) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    clearSessionFromStorage();
    router.push('/auth');
  };

  useEffect(() => {
    const session = getSessionFromStorage();
    if (session) {
      setUser(session.user);
    }
    setIsLoading(false);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
