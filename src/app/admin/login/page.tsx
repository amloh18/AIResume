'use client';

import React, { Suspense, useEffect } from 'react';
import UnifiedAuthPage from '@/components/auth/UnifiedAuthPage';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams ? searchParams.get('callbackUrl') : null;

  useEffect(() => {
    if (!callbackUrl) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('callbackUrl', '/admin/dashboard');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [callbackUrl]);

  return <UnifiedAuthPage initialMode="signin" layoutVariant="admin" callbackUrl={callbackUrl || '/admin/dashboard'} />;
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">Loading...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}