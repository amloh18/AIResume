'use client';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

import { CustomAuthProvider } from '@/contexts/CustomAuthContext';
import CustomSignInForm from '@/components/auth/CustomSignInForm';

export default function CustomSignInPage() {
  return (
    <CustomAuthProvider>
      <CustomSignInForm />
    </CustomAuthProvider>
  )
}
