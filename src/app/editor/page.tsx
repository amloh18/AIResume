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
        if (isAuthenticated && user?.id) {
          setIsGuestMode(false);
        } else {
          // STRICT SECURITY CHECK:
          // A user can ONLY be a guest if they are explicitly trying to create a NEW CV from scratch.
          // If they pass a cvId, clId, or journeyId, it implies they are trying to access existing data.
          // In that case, they MUST authenticate, so we do NOT allow guest mode.
          if (mode === 'create' && !cvId && !clId && !journeyId) {
            setIsGuestMode(true);
          } else {
            setIsGuestMode(false); // Force authentication via RouteGuard
          }
        }

        // Check for restore draft param
        if (restoreDraftParam) {
          setRestoreDraft(true);
        }

        setIsCheckingGuestMode(false);
      } catch (error) {
        console.error('Error checking guest mode:', error);
        setIsGuestMode(false);
        setIsCheckingGuestMode(false);
      }
    };

    checkGuestMode();
  }, [authLoading, isAuthenticated, user?.id, mode, cvId, clId, journeyId, restoreDraftParam]);

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
// We let RouteGuard handle the unauthenticated state so it pops the Auth Modal
return (
  <RouteGuard requireAuth={true}>
    <JobJourneyProvider>
      <ResumeEnhancerProvider>
        <ATSProvider>
          <ResumeEnhancerContainer
            userId={user?.id || ''}
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
