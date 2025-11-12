'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import CVStudio from '@/components/studio/CVStudio';
import RouteGuard from '@/components/auth/RouteGuard';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import { JobJourneyProvider } from '@/contexts/JobJourneyContext';
import JourneyStatusBanner from '@/components/JourneyStatusBanner';
import { getPageBackground } from '@/lib/utils/themeUtils';

function StudioPageContent() {
  // CRITICAL FIX: All hooks must be called before any conditional returns (Rules of Hooks)
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentJourney, setCurrentJourney] = useState<{
    id: string;
    jobId: string;
    jobTitle: string;
    company: string;
    status: 'in-progress' | 'completed';
    currentStep: number;
    totalSteps: number;
    atsScore?: number;
    cvId?: string;
    coverLetterId?: string;
  } | undefined>(undefined);

  // Get URL parameters - NEW STRUCTURE: journeyId-first approach
  const journeyId = searchParams.get('journeyId'); // PRIMARY: Journey ID for proper Application Package context
  const type = searchParams.get('type'); // 'cv' or 'cover_letter' (legacy)
  const documentType = searchParams.get('documentType'); // 'cv' or 'cl' (new format - 'cl' maps to 'cover-letter')
  const cvId = searchParams.get('cvId');
  const coverLetterId = searchParams.get('coverLetterId');
  const jobId = searchParams.get('jobId'); // Job ID for context
  const mode = searchParams.get('mode'); // 'cvedit', 'cledit', 'atsedit', etc.

  // Determine which ID to use based on type
  // Map 'cl' to 'cover-letter' for internal use, handle legacy 'cover_letter' as well
  const finalDocumentType: 'cv' | 'cover-letter' = 
    documentType === 'cl' || documentType === 'cover-letter' || type === 'cover_letter' 
      ? 'cover-letter' 
      : 'cv';
  const documentId = finalDocumentType === 'cover-letter' ? coverLetterId : cvId;

  // NEW APPROACH: Use journeyId for reliable Application Package context
  const primaryJourneyId = journeyId;
  
  // Clear any hardcoded localStorage data on mount
  useEffect(() => {
    // Clear any old journey state that might contain hardcoded data
    localStorage.removeItem('jobJourneyState');
    console.log('🔍 Studio Page - Cleared localStorage jobJourneyState');
  }, []);

  // Load current journey data for the banner - MUST be before any conditional returns
  useEffect(() => {
    const loadCurrentJourney = async () => {
      if (!primaryJourneyId || !user?.id) {
        console.log('🔍 Studio Page - Missing journeyId or userId:', { primaryJourneyId, userId: user?.id });
        return;
      }
      
      console.log('🔍 Studio Page - Loading journey data for:', primaryJourneyId);
      
      try {
        const response = await fetch(`/api/application-journey?userId=${user.id}&jobId=${primaryJourneyId}`);
        console.log('🔍 Studio Page - API response status:', response.status);
        
        if (response.ok) {
          const journeyData = await response.json();
          console.log('🔍 Studio Page - Journey data received:', journeyData);
          
          if (journeyData.success && journeyData.data && journeyData.data.journeys && journeyData.data.journeys.length > 0) {
            // Get the first journey from the array
            const journey = journeyData.data.journeys[0];
            const journeyInfo = {
              id: journey.journeyId,
              jobId: journey.jobId,
              jobTitle: journey.jobTitle,
              company: journey.company,
              status: journey.status,
              currentStep: journey.currentStep,
              totalSteps: journey.totalSteps,
              atsScore: journey.atsScore,
              cvId: journey.cvId,
              coverLetterId: journey.coverLetterId
            };
            
            console.log('🔍 Studio Page - Setting current journey:', journeyInfo);
            setCurrentJourney(journeyInfo);
          } else {
            console.warn('🔍 Studio Page - No journey data found in response');
          }
        } else {
          console.error('🔍 Studio Page - API request failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('🔍 Studio Page - Error loading current journey:', error);
      }
    };
    
    loadCurrentJourney();
  }, [primaryJourneyId, user?.id]);

  // NOW we can conditionally return - all hooks have been called
  // Show loading state while auth is loading
  if (authLoading) {
    return <LoadingAnimation progress={0.5} showProgressBar={false} />;
  }

  // Show error if not authenticated
  if (!isAuthenticated || !user?.id) {
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
  
  // Validate required parameters for new structure
  if (!primaryJourneyId) {
    console.warn('⚠️ Studio Page - No journeyId provided. This may cause context loading issues.');
  }

  return (
    <RouteGuard requireAuth={true}>
      <JobJourneyProvider>
        <div className={getPageBackground('studio')}>
          <JourneyStatusBanner journey={currentJourney} />
          <CVStudio
            journeyId={primaryJourneyId}
            cvId={cvId} // Pass cvId directly from URL parameter
            coverLetterId={coverLetterId} // Pass coverLetterId directly from URL parameter
            documentType={finalDocumentType}
            userId={user.id}
            mode={mode}
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
