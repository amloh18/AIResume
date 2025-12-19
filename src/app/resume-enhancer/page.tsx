'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { ResumeEnhancerProvider } from '@/contexts/ResumeEnhancerContext';
import { JobJourneyProvider } from '@/contexts/JobJourneyContext';
import ResumeEnhancerContainer from '@/components/resume-enhancer/ResumeEnhancerContainer';
import RouteGuard from '@/components/auth/RouteGuard';
import LoadingAnimation from '@/components/ui/LoadingAnimation';

function ResumeEnhancerPageContent() {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const searchParams = useSearchParams();

  // Get parameters from URL
  const mode = searchParams.get('mode') as 'create' | 'edit' | 'edit-master' | 'journey' || 'create';
  const cvId = searchParams.get('cvId') || undefined;
  const journeyId = searchParams.get('journeyId') || undefined;

  // Show loading while authenticating
  if (authLoading) {
    return <LoadingAnimation progress={0.5} showProgressBar={false} />;
  }

  // Show error if not authenticated
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
          <ResumeEnhancerContainer
            userId={user.id}
            mode={mode}
            cvId={cvId}
            journeyId={journeyId}
          />
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
