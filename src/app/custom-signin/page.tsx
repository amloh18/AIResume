'use client';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

import CustomSignInForm from '@/components/auth/CustomSignInForm';

/**
 * Custom Sign In Page
 * 
 * Note: This page uses NextAuth for authentication.
 * CustomAuthContext has been deprecated in favor of NextAuth.
 */
export default function CustomSignInPage() {
  return <CustomSignInForm />
}
