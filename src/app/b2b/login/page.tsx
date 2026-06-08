'use client';

import React, { Suspense } from 'react';
import UnifiedAuthPage from '@/components/auth/UnifiedAuthPage';
import { useSearchParams } from 'next/navigation';

function B2BLoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/b2b/dashboard';

  return (
    <UnifiedAuthPage 
      initialMode="signin" 
      layoutVariant="b2b" 
      callbackUrl={callbackUrl} 
    />
  );
}

export default function B2BLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0d1209] text-white">
        <div className="w-16 h-16 border-4 border-[#80FF00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <B2BLoginContent />
    </Suspense>
  );
}