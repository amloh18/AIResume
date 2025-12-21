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
  const modeParam = searchParams.get('mode');
  const mode: 'create' | 'edit' | 'edit-master' | 'journey' = 
    (modeParam === 'edit' || modeParam === 'edit-master' || modeParam === 'journey') 
      ? modeParam 
      : 'create';
  const cvId = searchParams.get('cvId') || undefined;
  const journeyId = searchParams.get('journeyId') || undefined;
  const restoreDraftParam = searchParams.get('restoreDraft') === 'true';

  // Check if user has CVs to determine guest mode
  useEffect(() => {
    const checkGuestMode = async () => {
      if (authLoading) return;

      // If authenticated, check if user has any CVs
      if (isAuthenticated && user?.id) {
        try {
          const response = await fetch(`/api/cvs?projection=summary&limit=1`);
          if (response.ok) {
            const data = await response.json();
            const hasCVs = data.success && data.data?.cvs?.length > 0;
            
            // Guest mode: not authenticated OR (authenticated but no CVs and creating new CV)
            setIsGuestMode(!isAuthenticated || (!hasCVs && mode === 'create' && !cvId));
          } else {
            // On error, allow guest mode if not authenticated
            setIsGuestMode(!isAuthenticated);
          }
        } catch (error) {
          console.error('Error checking CVs:', error);
          setIsGuestMode(!isAuthenticated);
        }
      } else {
        // Not authenticated - allow guest mode for new CV creation
        setIsGuestMode(mode === 'create' && !cvId);
      }

      // Check for restore draft param
      if (restoreDraftParam) {
        setRestoreDraft(true);
      }

      setIsCheckingGuestMode(false);
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
            Please log in to access the Resume Enhancer.
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
