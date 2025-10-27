'use client';

import React, { useState, useEffect } from 'react';
import dynamicImport from 'next/dynamic';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

// Dynamically import the auth component to avoid SSR issues
const UnifiedAuthPage = dynamicImport(
  () => import('@/components/auth/UnifiedAuthPage'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    )
  }
);

// Main export function
export default function SignUpPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return <UnifiedAuthPage initialMode="signup" />;
}