'use client';

import React from 'react';
import dynamicImport from 'next/dynamic';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

// Dynamically import the auth component to avoid SSR issues
const UnifiedAuthPage = dynamicImport(
  () => import('@/components/auth/UnifiedAuthPage'),
  { 
    ssr: false
  }
);

// Main export function
export default function SignUpPage() {
  return <UnifiedAuthPage initialMode="signup" />;
}