'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { ResumeEnhancerProvider } from '@/contexts/ResumeEnhancerContext';
import { JobJourneyProvider } from '@/contexts/JobJourneyContext';
import { ATSProvider } from '@/contexts/ATSContext';
import ResumeEnhancerContainer from '@/components/resume-enhancer/ResumeEnhancerContainer';
import RouteGuard from '@/components/auth/RouteGuard';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import guestCVService from '@/lib/services/guestCVService';

function ResumeEnhancerPageContent() {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const searchParams = useSearchParams();
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isCheckingGuestMode, setIsCheckingGuestMode] = useState(true);
  const [restoreDraft, setRestoreDraft] = useState(false);

  // Get parameters from URL
  const typeParam = searchParams.get('type');
  const modeParam = searchParams.get('mode');
  let mode: 'create' | 'edit' | 'edit-master' | 'journey' | 'edit-cover-letter' | 'create-cover-letter' =
    (modeParam === 'edit' || modeParam === 'edit-master' || modeParam === 'journey' || modeParam === 'edit-cover-letter' || modeParam === 'create-cover-letter')
      ? modeParam
      : 'create';
  const clId = searchParams.get('clId') || searchParams.get('coverLetterId') || undefined;
  const cvId = searchParams.get('cvId') || undefined;
  const journeyId = searchParams.get('journeyId') || undefined;
  const restoreDraftParam = searchParams.get('restoreDraft') === 'true';

  // Automatically determine mode if type or ids are present
  if (typeParam === 'cv' && cvId && mode === 'create') mode = 'edit';
  if ((typeParam === 'cl' || clId) && mode === 'create') mode = 'edit-cover-letter';

  // Check if user has CVs to determine guest mode
  useEffect(() => {
    const checkGuestMode = async () => {
      if (authLoading) return;

      try {
        // If authenticated, check if user has any CVs
        if (isAuthenticated && user?.id) {
          // data.success && data.data?.cvs?.length > 0 check removed to ensure auth users act as auth

          // Guest mode: ONLY if not authenticated
          // We used to check (!hasCVs && mode === 'create' && !cvId) but this caused auth users to see "Guest" UI
          setIsGuestMode(!isAuthenticated);
        } else {
          // Not authenticated - allow guest mode for new CV creation
          setIsGuestMode(mode === 'create' && !cvId);
        }

        // Check for restore draft param
        if (restoreDraftParam) {
          setRestoreDraft(true);
        }

        setIsCheckingGuestMode(false);
      } catch (error) {
        console.error('Error checking CVs:', error);
        setIsGuestMode(!isAuthenticated);
        setIsCheckingGuestMode(false);
      }
    };

    checkGuestMode();
  }, [authLoading, isAuthenticated, user?.id, mode, cvId, restoreDraftParam]);

// Show loading while checking guest mode or authenticating
if (authLoading || isCheckingGuestMode) {
  return <LoadingAnimation progress={0.5} showProgressBar={false} />;
}

// For guest mode, allow access without authentication
if (isGuestMode) {
  return (
    <JobJourneyProvider>
      <ResumeEnhancerProvider>
        <ATSProvider>
          <ResumeEnhancerContainer
            userId="guest"
            mode={mode}
            cvId={cvId}
            clId={clId}
            journeyId={journeyId}
            isGuestMode={true}
            restoreDraft={restoreDraft}
          />
        </ATSProvider>
      </ResumeEnhancerProvider>
    </JobJourneyProvider>
  );
}

// For authenticated users or editing existing CVs, require auth
if (!isAuthenticated || !user?.id) {
  return (
    <div className="dashboard-page resume-enhancer-page min-h-screen bg-[var(--bg-primary)] text-[color:var(--text-primary)] flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 dark:text-red-400 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-2">
          Authentication Required
        </h2>
        <p className="text-[color:var(--text-secondary)] mb-4">
          Please log in to access the Editor.
        </p>
        <button
          onClick={() => window.location.href = '/sign-in'}
          className="px-4 py-2 bg-[var(--accent-primary)] text-black rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-semibold"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

return (
  <RouteGuard requireAuth={true}>
    <JobJourneyProvider>
      <ResumeEnhancerProvider>
        <ATSProvider>
          <ResumeEnhancerContainer
            userId={user.id}
            mode={mode}
            cvId={cvId}
            clId={clId}
            journeyId={journeyId}
            isGuestMode={false}
          />
        </ATSProvider>
      </ResumeEnhancerProvider>
    </JobJourneyProvider>
  </RouteGuard>
);
}

export default function ResumeEnhancerPage() {
  return (
    <Suspense fallback={<LoadingAnimation progress={0.3} showProgressBar={false} />}>
      <ResumeEnhancerPageContent />
    </Suspense>
  );
}
