'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import CVStudio from '@/components/studio/CVStudio';
import RouteGuard from '@/components/auth/RouteGuard';
import LoadingAnimation from '@/components/ui/LoadingAnimation';

function StudioPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const cvId = searchParams.get('cvId');

  // Show loading state while session is loading
  if (status === 'loading') {
    return <LoadingAnimation progress={0.5} showProgressBar={false} />;
  }

  // Show error if no session
  if (status === 'unauthenticated' || !session?.user?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Authentication Required</h2>
          <p className="text-white/60 mb-4">Please log in to access the CV Studio.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <CVStudio 
          jobId={jobId} 
          cvId={cvId}
          userId={session.user.id}
        />
      </div>
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