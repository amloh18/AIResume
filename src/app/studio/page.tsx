'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import CVStudio from '@/components/studio/CVStudio';
import RouteGuard from '@/components/auth/RouteGuard';

function StudioPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const cvId = searchParams.get('cvId');

  return (
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <CVStudio 
          jobId={jobId} 
          cvId={cvId}
          userId={session?.user?.id || ''}
        />
      </div>
    </RouteGuard>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudioPageContent />
    </Suspense>
  );
} 