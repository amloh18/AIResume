'use client';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

export default function CustomSignInPage() {
  return (
    <CustomAuthProvider>
      <CustomSignInForm />
    </CustomAuthProvider>
  )
}
