'use client';

import React, { Suspense, useEffect } from 'react';
import UnifiedAuthPage from '@/components/auth/UnifiedAuthPage';
import { useSearchParams } from 'next/navigation';

function B2BLoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams ? searchParams.get('callbackUrl') : null;

  useEffect(() => {
    if (!callbackUrl) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('callbackUrl', '/b2b/dashboard');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [callbackUrl]);

  return <UnifiedAuthPage initialMode="signin" layoutVariant="b2b" callbackUrl={callbackUrl || '/b2b/dashboard'} />;
}

export default function B2BLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">Loading...</div>}>
      <B2BLoginContent />
    </Suspense>
  );
}