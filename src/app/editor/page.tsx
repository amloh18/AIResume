'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { ResumeEnhancerProvider } from '@/contexts/ResumeEnhancerContext';
import { JobJourneyProvider } from '@/contexts/JobJourneyContext';
import { ATSProvider } from '@/contexts/ATSContext';
import { DashboardDataProvider } from '@/contexts/DashboardDataContext';
import ResumeEnhancerContainer from '@/components/resume-enhancer/ResumeEnhancerContainer';
import RouteGuard from '@/components/auth/RouteGuard';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import guestCVService from '@/lib/services/guestCVService';

function ResumeEnhancerPageContent() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const searchParams = useSearchParams();
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isCheckingGuestMode, setIsCheckingGuestMode] = useState(true);
  const [restoreDraft, setRestoreDraft] = useState(false);

  // Get parameters from URL and sanitize them (avoid literal 'undefined' strings)
  const typeParam = searchParams.get('type');
  const rawModeParam = searchParams.get('mode');
  const rawCvId = searchParams.get('cvId');
  const rawJourneyId = searchParams.get('journeyId') || searchParams.get('jobJourneyId');
  // Determine the mode
  const normalizedLegacyMode =
    rawModeParam === 'cvedit'
      ? (rawJourneyId ? 'journey' : 'edit')
      : rawModeParam === 'cledit'
        ? 'edit-cover-letter'
        : (rawModeParam === 'improve' || rawModeParam === 'mode-improve')
          ? 'edit-master'
          : rawModeParam;

  let mode: 'create' | 'edit' | 'edit-master' | 'journey' | 'edit-cover-letter' | 'create-cover-letter' =
    (normalizedLegacyMode === 'edit' || normalizedLegacyMode === 'edit-master' || normalizedLegacyMode === 'journey' || normalizedLegacyMode === 'edit-cover-letter' || normalizedLegacyMode === 'create-cover-letter')
      ? normalizedLegacyMode
      : 'create';

  const rawClId = searchParams.get('clId') || searchParams.get('coverLetterId');
  const clId = (rawClId && rawClId !== 'undefined') ? rawClId : undefined;
  
  const cvId = (rawCvId && rawCvId !== 'undefined') ? rawCvId : undefined;
  
  const journeyId = (rawJourneyId && rawJourneyId !== 'undefined') ? rawJourneyId : undefined;
  
  const restoreDraftParam = searchParams.get('restoreDraft') === 'true' || searchParams.get('resumeDraft') === 'true';

  // Automatically determine mode if type or ids are present
  if (typeParam === 'cv' && cvId && mode === 'create') mode = 'edit';
  if ((typeParam === 'cl' || clId) && mode === 'create') mode = 'edit-cover-letter';

  const docParam = searchParams.get('doc');
  const [isRedirecting, setIsRedirecting] = useState(docParam === 'master-cv');

  // Intercept doc=master-cv query parameter and fetch user's Master CV
  useEffect(() => {
    const handleMasterCVRedirect = async () => {
      if (authLoading) return;
      
      if (docParam === 'master-cv') {
        if (!isAuthenticated) {
          // If not authenticated, let RouteGuard/Auth Modal handle it, but stop redirection state
          setIsRedirecting(false);
          return;
        }

        try {
          const res = await fetch(`/api/cvs/master?userId=${user?.id}`);
          const result = await res.json();
          
          // Capture other params to preserve them (like step)
          const currentParams = new URLSearchParams(searchParams.toString());
          currentParams.delete('doc'); // Remove doc=master-cv
          
          if (result.success && result.data?.masterCV?.id) {
            currentParams.set('cvId', result.data.masterCV.id);
            currentParams.set('mode', 'edit-master');
            if (!currentParams.has('improve')) currentParams.set('improve', 'true');
            router.replace(`/editor?${currentParams.toString()}`);
          } else {
            console.log('No master CV found, loading editor defaults.');
            currentParams.set('mode', 'create');
            router.replace(`/editor?${currentParams.toString()}`);
          }
        } catch (error) {
          console.error('Error fetching master CV for redirect:', error);
          const currentParams = new URLSearchParams(searchParams.toString());
          currentParams.delete('doc');
          currentParams.set('mode', 'create');
          router.replace(`/editor?${currentParams.toString()}`);
        }
      } else {
        setIsRedirecting(false);
      }
    };

    handleMasterCVRedirect();
  }, [authLoading, isAuthenticated, user?.id, docParam, router]);

  // Synchronize fromOnboarding URL parameter to sessionStorage for consistent master CV context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fromOnboarding = searchParams.get('fromOnboarding') === 'true';
      if (fromOnboarding) {
        sessionStorage.setItem('fromOnboarding', 'true');
        console.log('✅ Editor - Synchronized fromOnboarding flag to sessionStorage');
      }
    }
  }, [searchParams]);

// Check if user has CVs to determine guest mode
  useEffect(() => {
    const checkGuestMode = async () => {
      if (authLoading) return;

      try {
        if (isAuthenticated && user?.id) {
          setIsGuestMode(false);
        } else {
          // STRICT SECURITY CHECK:
          // A user can ONLY be a guest if they are explicitly trying to create a NEW CV from scratch or restoring an onboarding draft.
          // If they pass a cvId, clId, or journeyId, it implies they are trying to access existing authenticated data.
          // In that case, they MUST authenticate, so we do NOT allow guest mode.
          if ((mode === 'create' || restoreDraftParam) && (!cvId || cvId === 'guest-draft') && !clId && !journeyId) {
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

// Show loading while checking guest mode or authenticating or redirecting
if (authLoading || isCheckingGuestMode || isRedirecting) {
  return <LoadingOverlay message={isRedirecting ? 'Opening Master CV' : 'Loading Editor'} />;
}

  // For guest mode, resolve mode to 'create' or 'create-cover-letter' because guests don't have database documents to edit.
  const resolvedMode = isGuestMode 
    ? (mode === 'edit-cover-letter' || mode === 'create-cover-letter' ? 'create-cover-letter' : 'create')
    : mode;

// For guest mode, allow access without authentication
if (isGuestMode) {
  return (
    <JobJourneyProvider>
      <ResumeEnhancerProvider>
        <ATSProvider>
          <DashboardDataProvider>
            <ResumeEnhancerContainer
              userId="guest"
              mode={resolvedMode}
              cvId={cvId}
              clId={clId}
              journeyId={journeyId}
              isGuestMode={true}
              restoreDraft={restoreDraft}
            />
          </DashboardDataProvider>
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
            <DashboardDataProvider>
              <ResumeEnhancerContainer
                userId={user?.id || ''}
                mode={mode}
                cvId={cvId}
                clId={clId}
                journeyId={journeyId}
                isGuestMode={false}
                restoreDraft={restoreDraft}
              />
            </DashboardDataProvider>
          </ATSProvider>
        </ResumeEnhancerProvider>
      </JobJourneyProvider>
    </RouteGuard>
  );
}

export default function ResumeEnhancerPage() {
  return (
    <Suspense fallback={<LoadingOverlay message="Loading Editor" />}>
      <ResumeEnhancerPageContent />
    </Suspense>
  );
}
