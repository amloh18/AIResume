'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import CVStudio from '@/components/studio/CVStudio';

function StudioPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const cvId = searchParams.get('cvId');

  // Loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!session) {
    router.push('/auth/login?callbackUrl=/studio');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CVStudio 
        jobId={jobId} 
        cvId={cvId}
        userId={session.user.id}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudioPageContent />
    </Suspense>
  );
} 