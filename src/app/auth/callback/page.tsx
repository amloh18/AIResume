'use client';

import { useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import { createSession, saveSessionToStorage } from '@/lib/session';

function AuthCallbackContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (status === 'loading') return;
      
      if (status === 'authenticated' && session?.user) {
        try {
          console.log('🔍 Processing Google OAuth callback for user:', session.user);
          
          // Create session for NextAuth user (generate a temporary token)
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            firstName: session.user.firstName || session.user.name?.split(' ')[0] || 'User',
            lastName: session.user.lastName || session.user.name?.split(' ').slice(1).join(' ') || '',
            role: session.user.role || 'user',
            image: session.user.image
          };
          
          // Create session with a temporary token (NextAuth handles the actual auth)
          const sessionData = createSession(userData, 'nextauth-token');
          saveSessionToStorage(sessionData);
          
          // If there's a specific callback URL from middleware, redirect there immediately
          if (callbackUrl && callbackUrl !== '/auth' && callbackUrl !== '/auth/callback') {
            console.log('🔗 Callback URL specified from middleware, redirecting to:', callbackUrl);
            router.push(decodeURIComponent(callbackUrl));
            return;
          }
          
          // Check if user has CVs
          const response = await fetch(`/api/cvs?userId=${session.user.id}&projection=full`);
          const result = await response.json();
          
          if (result.success && result.data.cvs && result.data.cvs.length > 0) {
            // Check if user has any master CVs
            const hasMasterCV = result.data.cvs.some((cv: any) => cv.isMaster === true);
            
            if (hasMasterCV) {
              // User has master CV, redirect to dashboard
              console.log('✅ User has master CV, redirecting to dashboard');
              sessionStorage.removeItem('needsCVSetup');
              sessionStorage.setItem('fromLogin', 'true');
              router.push('/dashboard');
            } else {
              // User has CVs but no master CV, redirect to universal onboarding
              console.log('🆕 User has CVs but no master CV, redirecting to universal onboarding');
              sessionStorage.setItem('needsCVSetup', 'true');
              sessionStorage.setItem('fromRegistration', 'true');
              router.push('/onboarding-universal');
            }
          } else {
            // New user, redirect to universal onboarding
            console.log('🆕 New user, redirecting to universal onboarding');
            sessionStorage.setItem('needsCVSetup', 'true');
            sessionStorage.setItem('fromRegistration', 'true');
            router.push('/onboarding-universal');
          }
        } catch (error) {
          console.error('Error processing auth callback:', error);
          // Fallback to universal onboarding
          sessionStorage.setItem('needsCVSetup', 'true');
          sessionStorage.setItem('fromRegistration', 'true');
          router.push('/onboarding-universal');
        }
      } else if (status === 'unauthenticated') {
        // Authentication failed, redirect back to auth page
        console.log('❌ Authentication failed, redirecting to auth page');
        router.push('/auth');
      }
    };

    handleAuthCallback();
  }, [session, status, router, callbackUrl]);

  return <LoadingAnimation progress={0.8} showProgressBar={false} />;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<LoadingAnimation progress={0.5} showProgressBar={false} />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
