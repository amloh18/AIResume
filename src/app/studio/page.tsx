'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import CVStudio from '@/components/studio/CVStudio';
import RouteGuard from '@/components/auth/RouteGuard';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import { JobJourneyProvider } from '@/contexts/JobJourneyContext';
import JourneyStatusBanner from '@/components/JourneyStatusBanner';
import { getPageBackground } from '@/lib/utils/themeUtils';

function StudioPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get URL parameters - NEW STRUCTURE: journeyId-first approach
  const journeyId = searchParams.get('journeyId'); // PRIMARY: Journey ID for proper Application Package context
  const type = searchParams.get('type'); // 'cv' or 'cover_letter'
  const cvId = searchParams.get('cvId');
  const coverLetterId = searchParams.get('coverLetterId');
  const jobId = searchParams.get('jobId'); // DEPRECATED: Direct jobId usage violates Application Package model
  const mode = searchParams.get('mode'); // 'cv-onboarding', 'ats-edit', 'cover-letter-edit', 'document-first'
  const cvJourneyId = searchParams.get('cvJourneyId'); // LEGACY: Being replaced by journeyId

  // Determine which ID to use based on type
  const documentId = type === 'cover_letter' ? coverLetterId : cvId;
  
  // Determine document type - default to 'cv' if not specified
  const documentType = type === 'cover_letter' ? 'cover-letter' : 'cv';

  // Show loading state while session is loading
  if (status === 'loading') {
    return <LoadingAnimation progress={0.5} showProgressBar={false} />;
  }

  // Show error if no session
  if (status === 'unauthenticated' || !session?.user?.id) {
    return (
      <div className={`min-h-screen ${getPageBackground('studio')} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-red-500 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-white/60 mb-4">Please log in to access the Studio.</p>
          <button
            onClick={() => router.push('/sign-in')}
            className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  console.log('🔍 Studio Page - Session user ID:', session.user.id);
  console.log('🔍 Studio Page - URL params:', { journeyId, type, cvId, coverLetterId, jobId, mode, cvJourneyId });
  
  // NEW APPROACH: Prioritize journeyId for reliable Application Package context
  // Fallback to cvJourneyId only for legacy compatibility
  const primaryJourneyId = journeyId || cvJourneyId;
  
  // Validate required parameters for new structure
  if (!primaryJourneyId) {
    console.warn('⚠️ Studio Page - No journeyId provided. This may cause context loading issues.');
  }

  return (
    <RouteGuard requireAuth={true}>
      <JobJourneyProvider>
        <div className={getPageBackground('studio')}>
          <JourneyStatusBanner />
          <CVStudio
            journeyId={primaryJourneyId}
            jobId={jobId} // DEPRECATED: Kept for backwards compatibility
            cvId={cvId} // Pass cvId directly from URL parameter
            coverLetterId={coverLetterId} // Pass coverLetterId directly from URL parameter
            documentType={documentType}
            userId={session.user.id}
            mode={mode}
            cvJourneyId={cvJourneyId} // LEGACY: Kept for backwards compatibility
          />
        </div>
      </JobJourneyProvider>
    </RouteGuard>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<LoadingAnimation progress={0.3} showProgressBar={false} />}>
      <StudioPageContent />
    </Suspense>
  );
}
