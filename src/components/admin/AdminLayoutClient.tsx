'use client';

import React, { useState, useEffect } from 'react';
import AdminDashboardSelector from '@/components/admin/AdminDashboardSelector';
import { useRouter, usePathname } from 'next/navigation';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  isAdmin: boolean;
  isB2B: boolean;
}

export default function AdminLayoutClient({
  children,
  isAdmin,
  isB2B,
}: AdminLayoutClientProps) {
  const [showSelector, setShowSelector] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only show selector on first visit to admin dashboard
    // and if user hasn't made a selection before
    if (isAdmin && !isB2B && pathname === '/admin/dashboard') {
      const hasSeenSelector = localStorage.getItem('admin-dashboard-selector-confirmed');
      if (!hasSeenSelector) {
        // Small delay to let the page render first
        const timer = setTimeout(() => {
          setShowSelector(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAdmin, isB2B, pathname]);

  const handleSelect = (choice: 'admin' | 'user' | 'b2b') => {
    setShowSelector(false);
    
    // Navigate to the selected dashboard
    switch (choice) {
      case 'admin':
        router.push('/admin/dashboard');
        break;
      case 'user':
        router.push('/dashboard');
        break;
      case 'b2b':
        router.push('/b2b/dashboard');
        break;
    }
  };

  const handleClose = () => {
    setShowSelector(false);
    // If they close without selecting, default to admin panel
    localStorage.setItem('admin-dashboard-selector-confirmed', 'true');
    localStorage.setItem('admin-dashboard-preference', 'admin');
  };

  return (
    <>
      {children}
      <AdminDashboardSelector
        isOpen={showSelector}
        onClose={handleClose}
        onSelect={handleSelect}
      />
    </>
  );
}
