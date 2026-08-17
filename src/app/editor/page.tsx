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
import { Skeleton } from '@/components/ui/Skeleton';
import guestCVService from '@/lib/services/guestCVService';
import { MobileSidebarProvider } from '@/contexts/MobileSidebarContext';
import { geistFont } from '@/lib/fonts';

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

// Show the editor skeleton while checking guest mode / authenticating / redirecting.
// The skeleton mirrors the editor chrome (top bar + step tabs + content cards) so
// the page structure is visible immediately — only data sections pulse.
if (authLoading || isCheckingGuestMode || isRedirecting) {
  return <EditorSkeleton />;
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
    <div className={`${geistFont.variable} geist-ui`}>
      <MobileSidebarProvider>
        <Suspense fallback={<EditorSkeleton />}>
          <ResumeEnhancerPageContent />
        </Suspense>
      </MobileSidebarProvider>
    </div>
  );
}

/**
 * Editor loading skeleton — mirrors the editor chrome (top bar, step tabs, content
 * cards) so the UI renders immediately and only data-driven sections pulse.
 */
function EditorSkeleton() {
  return (
    <div className="dashboard-workspace min-h-screen flex flex-col overflow-hidden pl-3 lg:pl-0 pb-3">
      {/* Editor top bar skeleton */}
      <div className="h-16 shrink-0 bg-white dark:bg-[#141810] border-b border-[var(--border-primary)] flex items-center gap-3 px-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-5 w-40" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Content card skeleton */}
      <div className="flex-1 min-h-0 mt-3 mr-3 flex flex-col">
        <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm h-full min-h-0 flex flex-col overflow-hidden">
          {/* Step tabs */}
          <div className="shrink-0 flex items-center gap-3 border-b border-[var(--border-primary)] px-6 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 sm:w-24 rounded-full" />
            ))}
          </div>

          {/* Step body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6" role="status" aria-label="Loading editor">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="mt-3 h-4 w-96 max-w-full" />

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] p-6 space-y-3 flex flex-col items-center"
                >
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
