'use client';

import React from 'react';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';
import UnifiedAuthPage from '@/components/auth/UnifiedAuthPage';

// Main export function
export default function MagicLinkPage() {
  return <UnifiedAuthPage initialMode="magic-link" />;
}
