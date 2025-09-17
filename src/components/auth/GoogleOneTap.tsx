'use client';

import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { createSession, saveSessionToStorage } from '@/lib/session';

const GoogleOneTap = () => {
  const router = useRouter();

  const handleGoogleSignIn = async (response: any) => {
    try {
      console.log('🔍 Google One Tap response received');
      
      // Send the credential to our backend via NextAuth
      const result = await signIn('google-one-tap', {
        credential: response.credential,
        redirect: false,
      });

      if (result?.ok) {
        console.log('✅ Google One Tap authentication successful');
        
        // Get the session to access user data
        const sessionResponse = await fetch('/api/auth/session');
        const session = await sessionResponse.json();
        
        if (session?.user) {
          // Create session for One Tap user
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            firstName: session.user.firstName || session.user.name?.split(' ')[0] || 'User',
            lastName: session.user.lastName || session.user.name?.split(' ').slice(1).join(' ') || '',
            role: session.user.role || 'user',
            image: session.user.image
          };
          
          // Create and save session
          const sessionData = createSession(userData, 'nextauth-token');
          saveSessionToStorage(sessionData);
          
          // Check if user has CVs before deciding where to route
          try {
            console.log('🔍 Checking CVs for One Tap user:', session.user.id);
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
                // User has CVs but no master CV, redirect to onboarding
                console.log('🆕 User has CVs but no master CV, redirecting to onboarding');
                sessionStorage.setItem('needsCVSetup', 'true');
                sessionStorage.setItem('fromRegistration', 'true');
                router.push('/master-cv-onboarding');
              }
            } else {
              // New user, redirect to onboarding
              console.log('🆕 New user, redirecting to onboarding');
              sessionStorage.setItem('needsCVSetup', 'true');
              sessionStorage.setItem('fromRegistration', 'true');
              router.push('/master-cv-onboarding');
            }
          } catch (error) {
            console.log('Error checking CVs, redirecting to onboarding:', error);
            sessionStorage.setItem('needsCVSetup', 'true');
            sessionStorage.setItem('fromRegistration', 'true');
            router.push('/master-cv-onboarding');
          }
        }
      } else if (result?.error) {
        console.error('❌ Google One Tap authentication failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Google One Tap error:', error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      console.log('🔍 Initializing Google One Tap');
      
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn,
        auto_select: false, // Don't auto-select, let user choose
        cancel_on_tap_outside: true,
      });

      // Display the One Tap prompt
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.log('One Tap prompt was not displayed.');
        } else if (notification.isSkippedMoment()) {
          console.log('One Tap prompt was skipped by the user.');
        } else if (notification.isDismissedMoment()) {
          console.log('One Tap prompt was dismissed by the user.');
        }
      });

      return () => {
        // Clean up on component unmount
        if (window.google?.accounts?.id) {
          window.google.accounts.id.cancel();
        }
      };
    }
  }, []);

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={() => {
        console.log('✅ Google One Tap script loaded');
      }}
    />
  );
};

export default GoogleOneTap;
