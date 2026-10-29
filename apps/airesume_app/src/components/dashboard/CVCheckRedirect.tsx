'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import CreateMasterCVCard from './CreateMasterCVCard';

interface CVCheckRedirectProps {
  children: React.ReactNode;
}

export default function CVCheckRedirect({ children }: CVCheckRedirectProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [hasMasterCV, setHasMasterCV] = useState(false);
  const [showMasterCVCard, setShowMasterCVCard] = useState(false);
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
      // Hide the master CV card when dismissed
      setShowMasterCVCard(false);
    };

    // The user just deleted their Master CV / profile. The server no longer
    // reports a master (see /api/cvs/master), so reflect that here immediately
    // and offer to rebuild the profile instead of leaving the dashboard in a
    // state that still assumes one exists.
    const handleMasterCVDeleted = () => {
      console.log('🔄 Master CV deleted, dropping hasMasterCV and prompting rebuild');
      setHasMasterCV(false);
      setIsChecking(false);
      setShowMasterCVCard(true);
      // Allow a later real check (e.g. after the profile is rebuilt).
      hasCheckedRef.current = false;
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
    window.addEventListener('masterCVDeleted', handleMasterCVDeleted);
    window.addEventListener('welcomeDismissed', handleWelcomeDismissed);
    // Listen for storage events (cross tab)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('masterCVCreated', handleMasterCVCreated);
      window.removeEventListener('masterCVDeleted', handleMasterCVDeleted);
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

      // Bypass check for admins and superadmins
      const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
      if (isAdmin) {
        console.log('✅ User is admin/superadmin, bypassing CV check');
        setHasMasterCV(true);
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

      /* Resume an in-progress AI career report draft — but ONLY when the account
       * has no CV on the server.
       *
       * This used to run before anything was fetched, so a leftover
       * `ai-career-report-data` entry in localStorage (any draft where the user
       * had clicked past step 1) hijacked every dashboard visit: the user was
       * pushed back into the wizard on top of a perfectly good profile CV that
       * already existed server-side, and could never reach their dashboard while
       * that entry survived. The server record is the truth; a local draft is
       * only worth resuming when it is all the user has. */
      const resumeLocalDraft = (): boolean => {
        if (typeof window === 'undefined') return false;
        const aiCareerReportData = localStorage.getItem('ai-career-report-data');
        if (!aiCareerReportData) return false;
        try {
          const parsed = JSON.parse(aiCareerReportData);
          const hasCvData = !!(
            parsed.cvData?.basics?.name ||
            parsed.cvData?.basics?.email ||
            parsed.cvData?.work?.length > 0 ||
            parsed.cvData?.education?.length > 0 ||
            parsed.cvData?.projects?.length > 0 ||
            parsed.currentStep > 1
          );
          if (!hasCvData) return false;

          console.log('✅ Resuming in-progress AI career report draft (no server CV exists)');
          const step = parsed.currentStep || 3;
          router.push(`/ai-career-report?step=${step}`);
          return true;
        } catch (e) {
          console.warn('Failed to parse AI career report data:', e);
          return false;
        }
      };

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
        });

        /* ─── Onboarding is only for accounts with NOTHING ───────────────────
         *
         * This guard's contract is "a brand-new account with no CV at all gets
         * taken to onboarding". It used to also treat "a CV exists but none is
         * flagged master" as needing onboarding, which ambushed users whose
         * profile CV was created without the master marker (or whose marker a
         * later edit cleared): the CV list proved they had a profile and the
         * redirect ignored it.
         *
         * So the decision is now made on ANY CV existing. A missing master is
         * still reported (the Create Master CV card), but it is not a reason to
         * drag someone away from their dashboard.
         */
        console.log('🔍 CVCheckRedirect - Fetching all CVs for user...');
        const response = await fetch(`/api/cvs?userId=${user.id}`);
        const result = await response.json();

        if (response.ok && result.success) {
          const cvs: any[] = Array.isArray(result.data?.cvs) ? result.data.cvs : [];

          if (cvs.length === 0) {
            // Nothing on the server. Only now is an unfinished local draft worth
            // returning to; otherwise this is a genuinely new account.
            if (resumeLocalDraft()) {
              setIsChecking(false);
              return;
            }
            console.log('📝 User has no CVs at all, redirecting to welcome immediately');
            router.push('/welcome');
            setIsChecking(false);
            return;
          }

          // Check if any CV is a master CV
          const hasMaster = cvs.some((cv: any) => {
            const isMasterAtRoot = cv.isMaster === true;
            const isMasterInMetadata = cv.metadata?.isMaster === true;
            const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
            const isMasterByType = cv.cvType === 'master';
            const isMasterByMetadataType = cv.metadata?.cvType === 'master';
            return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString || isMasterByType || isMasterByMetadataType;
          });

          if (hasMaster) {
            console.log('✅ Master CV found in CV list, staying on dashboard');
          } else {
            console.log('✅ CVs exist without a master marker — staying on dashboard, offering the master card');
            setShowMasterCVCard(true);
          }
          setHasMasterCV(true);
          // Clear any onboarding flags since user has master CV
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('fromOnboarding');
            sessionStorage.removeItem('needsCVSetup');
          }
          setIsChecking(false);
          return;
        }

        // The list call itself failed (not "no CVs" — that case returned above).
        // Verify against the master CV endpoint before deciding anything.
        console.log('🔍 CVCheckRedirect - CV list unusable, checking master CV API directly...');
        try {
          const masterCVResponse = await fetch(`/api/cvs/master?userId=${user.id}`);
          const masterCVResult = await masterCVResponse.json();

          if (masterCVResult.success && masterCVResult.data?.masterCV) {
            console.log('✅ Master CV found via master CV API, staying on dashboard');
            setHasMasterCV(true);
            setIsChecking(false);
            return;
          }
        } catch (masterCVError) {
          console.log('⚠️ Master CV API call failed:', masterCVError);
        }

        /* Still unknown — neither call could tell us anything reliable.
         *
         * This used to redirect to /welcome, which turned a transient 500/timeout
         * on the CV list into "you must onboard again" for a user who already had
         * a profile. An unverified answer is not evidence of a new account: keep
         * the dashboard rendered, and clear the checked flag so the next mount can
         * retry with a working API rather than locking the decision in. */
        console.log('⚠️ CV status unknown (API unavailable) — staying on dashboard, will retry');
        hasCheckedRef.current = false;
      } catch (error) {
        console.error('❌ Error checking CV status:', error);
        /* A network/parse failure is NOT evidence that the user has no profile.
         * Forcing onboarding here meant one flaky request (or an offline blip)
         * threw a user with a perfectly good CV back into the wizard. Leaving the
         * dashboard rendered is the safe default; the check re-runs on the next
         * mount because `hasCheckedRef` is reset below. */
        hasCheckedRef.current = false;
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

  const handleMasterCVCardClose = () => {
    // Store dismissal in sessionStorage (temporary, allows showing on add job)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('masterCVCardDismissed', 'true');
    }
    setShowMasterCVCard(false);
  };

  return (
    <>
      {/* Always render children - they handle their own loading states */}
      {children}

      {/* Conditionally show master CV card if needed */}
      {!isChecking && !hasMasterCV && user?.id && showMasterCVCard && (
        <CreateMasterCVCard
          userId={user.id}
          onClose={handleMasterCVCardClose}
        />
      )}
    </>
  );
}
