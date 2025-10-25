'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
// LoadingDashboard removed - using inline loading state

interface CVCheckRedirectProps {
  children: React.ReactNode;
}

export default function CVCheckRedirect({ children }: CVCheckRedirectProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const checkCVsAndRedirect = async () => {
      // Wait for session to be available
      if (status === 'loading') {
        return;
      }

      if (status === 'unauthenticated') {
        setIsChecking(false);
        return;
      }

      if (!session?.user?.id) {
        console.log('❌ No user ID in session');
        setIsChecking(false);
        return;
      }

      // Check if user just completed onboarding
      if (typeof window !== 'undefined' && sessionStorage.getItem('fromOnboarding') === 'true') {
        console.log('✅ User just completed onboarding, skipping CV check');
        sessionStorage.removeItem('fromOnboarding');
        setIsChecking(false);
        return;
      }

      try {
        console.log('🔍 Checking CVs for user:', session.user.id);
        
        // No delay needed - check immediately
        
        // Check if user has any CVs and specifically look for master CV
        const response = await fetch(`/api/cvs?userId=${session.user.id}`);
        const result = await response.json();
        
        console.log('📊 CV Data Result:', result);
        
        if (result.success) {
          if (result.data && result.data.cvs && result.data.cvs.length > 0) {
            // Debug: Log all CVs to see their structure
            console.log('🔍 All CVs for user:', result.data.cvs.map((cv: any) => ({
              id: cv.id,
              title: cv.title,
              isMaster: cv.isMaster,
              metadata: cv.metadata
            })));
            
            // Check if user has any master CVs
            // Handle both old format (isMaster at root) and new format (metadata.isMaster)
            const hasMasterCV = result.data.cvs.some((cv: any) => {
              const isMasterAtRoot = cv.isMaster === true;
              const isMasterInMetadata = cv.metadata?.isMaster === true;
              const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
              
              console.log('🔍 CV Master check:', {
                id: cv.id,
                title: cv.title,
                isMasterAtRoot,
                isMasterInMetadata,
                isMasterInMetadataString,
                metadata: cv.metadata
              });
              
              return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
            });
            
            console.log('🔍 Master CV check result:', {
              hasMasterCV,
              cvCount: result.data.cvs.length,
              masterCVs: result.data.cvs.filter((cv: any) => {
                const isMasterAtRoot = cv.isMaster === true;
                const isMasterInMetadata = cv.metadata?.isMaster === true;
                const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
                return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
              }).length
            });
            
            if (hasMasterCV) {
              console.log('✅ User has master CV, staying on dashboard');
              // Clear any onboarding flags since user has master CV
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('fromOnboarding');
                sessionStorage.removeItem('needsCVSetup');
              }
            } else {
              console.log('📝 User has CVs but no master CV, redirecting to master CV onboarding');
              if (!hasRedirected) {
                setHasRedirected(true);
                router.push('/master-cv-onboarding');
                return;
              }
            }
          } else {
            console.log('📝 User has no CVs, redirecting to master CV onboarding');
            if (!hasRedirected) {
              setHasRedirected(true);
              router.push('/master-cv-onboarding');
              return;
            }
          }
        } else {
          console.log('❌ Failed to check CV data:', result.error);
          // Fallback: redirect to onboarding if we can't check
          if (!hasRedirected) {
            setHasRedirected(true);
            router.push('/master-cv-onboarding');
            return;
          }
        }
      } catch (error) {
        console.error('❌ Error checking CV status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkCVsAndRedirect();
  }, [session, status, router, hasRedirected]);

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
