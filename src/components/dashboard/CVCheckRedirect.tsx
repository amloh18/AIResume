'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import OnboardingCarouselModal from './OnboardingCarouselModal';

interface CVCheckRedirectProps {
  children: React.ReactNode;
}

export default function CVCheckRedirect({ children }: CVCheckRedirectProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [hasMasterCV, setHasMasterCV] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const hasCheckedRef = useRef(false);

  // Listen for Master CV creation events
  useEffect(() => {
    const handleMasterCVCreated = () => {
      console.log('🔄 Master CV created detected via custom event, updating state');
      setHasMasterCV(true);
      setIsChecking(false);
      // Reset the check flag so we can re-check if needed
      hasCheckedRef.current = false;
    };

    const handleWelcomeDismissed = () => {
      console.log('🔄 Welcome modal dismissed, clearing check to allow CV check');
      // Reset the check flag so we can check for CVs after welcome dismissal
      hasCheckedRef.current = false;
      // Force a re-check by resetting state
      setHasMasterCV(false);
      setIsChecking(false);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'masterCVCreated' && e.newValue === 'true') {
        console.log('🔄 Master CV created detected via storage event, updating state');
        setHasMasterCV(true);
        setIsChecking(false);
        // Reset the check flag so we can re-check if needed
        hasCheckedRef.current = false;
        // Clean up the storage
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('masterCVCreated');
        }
      }
      if (e.key === 'welcomeDismissed' && e.newValue === 'true') {
        console.log('🔄 Welcome dismissed detected via storage event');
        handleWelcomeDismissed();
      }
    };

    // Listen for custom events (same tab)
    window.addEventListener('masterCVCreated', handleMasterCVCreated);
    window.addEventListener('welcomeDismissed', handleWelcomeDismissed);
    // Listen for storage events (cross tab)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('masterCVCreated', handleMasterCVCreated);
      window.removeEventListener('welcomeDismissed', handleWelcomeDismissed);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id, authLoading, isAuthenticated]);

  // Reset check flag when user changes (for new sessions)
  useEffect(() => {
    hasCheckedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    const checkCVsAndRedirect = async () => {
      console.log('🔍 CVCheckRedirect - Starting checkCVsAndRedirect', {
        authLoading,
        userId: user?.id,
        hasMasterCV,
        isChecking,
        hasChecked: hasCheckedRef.current
      });
      
      // Prevent multiple API calls
      if (hasCheckedRef.current) {
        console.log('🔍 CVCheckRedirect - Already checked, skipping');
        return;
      }
      
      // Wait for auth to be available
      if (authLoading) {
        console.log('🔍 CVCheckRedirect - Auth still loading, waiting...');
        return;
      }

      if (!isAuthenticated) {
        setIsChecking(false);
        return;
      }

      if (!user?.id) {
        console.log('❌ No user ID in auth');
        setIsChecking(false);
        return;
      }

      // Mark as checked to prevent multiple calls
      hasCheckedRef.current = true;

      // Check if user has AI career report data in localStorage (in-progress CV creation)
      if (typeof window !== 'undefined') {
        const aiCareerReportData = localStorage.getItem('ai-career-report-data');
        if (aiCareerReportData) {
          try {
            const parsed = JSON.parse(aiCareerReportData);
            // Check if we have meaningful CV data (not just empty structure)
            const hasCvData = !!(
              parsed.cvData?.basics?.name ||
              parsed.cvData?.basics?.email ||
              parsed.cvData?.work?.length > 0 ||
              parsed.cvData?.education?.length > 0 ||
              parsed.cvData?.projects?.length > 0 ||
              parsed.currentStep > 1
            );
            
            if (hasCvData) {
              console.log('✅ User has AI career report data in localStorage, redirecting to continue...');
              console.log('🔍 CVCheckRedirect - AI Career Report data:', {
                currentStep: parsed.currentStep,
                hasWork: parsed.cvData?.work?.length > 0,
                hasEducation: parsed.cvData?.education?.length > 0
              });
              
              // Redirect to AI career report to continue where they left off
              const step = parsed.currentStep || 3;
              router.push(`/ai-career-report?step=${step}`);
              setIsChecking(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse AI career report data:', e);
          }
        }
      }

      // Check if user just completed onboarding or AI career report
      if (typeof window !== 'undefined' && (
        sessionStorage.getItem('fromOnboarding') === 'true' ||
        sessionStorage.getItem('fromAICareerReport') === 'true' ||
        sessionStorage.getItem('masterCVCreated') === 'true'
      )) {
        console.log('✅ User just completed onboarding/AI career report, skipping CV check');
        console.log('🔍 CVCheckRedirect - Session storage flags:', {
          fromOnboarding: sessionStorage.getItem('fromOnboarding'),
          fromAICareerReport: sessionStorage.getItem('fromAICareerReport'),
          masterCVCreated: sessionStorage.getItem('masterCVCreated')
        });
        sessionStorage.removeItem('fromOnboarding');
        sessionStorage.removeItem('fromAICareerReport');
        sessionStorage.removeItem('masterCVCreated');
        
        
        // Set hasMasterCV to true since we're skipping the check
        setHasMasterCV(true);
        setIsChecking(false);
        return;
      }

      try {
        console.log('🔍 Checking CVs for user:', user.id);
      console.log('🔍 CVCheckRedirect - User details:', {
        id: user.id,
        email: user.email,
        name: user.name,
        isNextAuthUser: user.isNextAuthUser,
        isFirebaseUser: user.isFirebaseUser
      });
        
        // Add a small delay to ensure database is updated after master CV creation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // First, try the master CV API endpoint for a direct check
        console.log('🔍 CVCheckRedirect - Checking master CV API first');
        try {
          const masterCVResponse = await fetch(`/api/cvs/master?userId=${user.id}`);
          const masterCVResult = await masterCVResponse.json();
          
          console.log('🔍 CVCheckRedirect - Master CV API result:', masterCVResult);
          
          if (masterCVResult.success && masterCVResult.data?.masterCV) {
            console.log('✅ Master CV found via master CV API, staying on dashboard');
            setHasMasterCV(true);
            setIsChecking(false);
            return;
          }
          
          // If master CV API didn't find it, try again after a short delay
          console.log('🔍 CVCheckRedirect - Master CV not found, retrying after delay...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const retryResponse = await fetch(`/api/cvs/master?userId=${user.id}`);
          const retryResult = await retryResponse.json();
          
          console.log('🔍 CVCheckRedirect - Master CV API retry result:', retryResult);
          
          if (retryResult.success && retryResult.data?.masterCV) {
            console.log('✅ Master CV found via master CV API retry, staying on dashboard');
            setHasMasterCV(true);
            setIsChecking(false);
            return;
          }
        } catch (masterCVError) {
          console.log('⚠️ Master CV API call failed, falling back to all CVs check:', masterCVError);
        }
        
        // Fallback: Check all CVs and look for master CV
        console.log('🔍 CVCheckRedirect - Master CV not found, checking all CVs');
        const response = await fetch(`/api/cvs?userId=${user.id}`);
        const result = await response.json();
        
        console.log('📊 CV Data Result:', result);
        console.log('🔍 CVCheckRedirect - Full API response:', JSON.stringify(result, null, 2));
        
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
              setHasMasterCV(true);
              // Clear any onboarding flags since user has master CV
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('fromOnboarding');
                sessionStorage.removeItem('needsCVSetup');
              }
            } else {
              console.log('📝 User has CVs but no master CV, showing onboarding modal');
              setHasMasterCV(false);
              setIsChecking(false);
              return;
            }
          } else {
            console.log('📝 User has no CVs, showing onboarding modal');
            setHasMasterCV(false);
            setIsChecking(false);
            return;
          }
        } else {
          console.log('❌ Failed to check CV data:', result.error);
          console.log('🔍 CVCheckRedirect - API error details:', {
            status: response.status,
            statusText: response.statusText,
            error: result.error,
            message: result.message
          });
          // Fallback: show onboarding modal if we can't check
          setHasMasterCV(false);
          setIsChecking(false);
          return;
        }
      } catch (error) {
        console.error('❌ Error checking CV status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkCVsAndRedirect();
  }, [authLoading, isAuthenticated, user?.id]);

  // CRITICAL FIX: Always render the same structure to maintain consistent hook count
  // Conditionally show/hide content instead of conditionally returning different components
  // This prevents "Rendered fewer hooks than expected" errors
  
  console.log('🔍 CVCheckRedirect - Rendering', {
    isChecking,
    hasMasterCV,
    userId: user?.id
  });

  return (
    <>
      {/* Always render children - they handle their own loading states */}
      {children}
      
      {/* Conditionally show onboarding modal overlay if needed */}
      {!isChecking && !hasMasterCV && user?.id && (
        <OnboardingCarouselModal userId={user.id} />
      )}
    </>
  );
}
