'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  type: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  signOut: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const response = await fetch('/api/admin/verify');
        const data = await response.json();

        if (data.success) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Admin verification error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAdmin();
  }, []);

  const signOut = () => {
    document.cookie = 'admin-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    router.push('/admin/signin');
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
