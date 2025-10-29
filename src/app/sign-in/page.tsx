'use client';

import React from 'react';
import UnifiedAuthPage from '@/components/auth/UnifiedAuthPage';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

// Main export function
export default function SignInPage() {
  return <UnifiedAuthPage initialMode="signin" />;
}
