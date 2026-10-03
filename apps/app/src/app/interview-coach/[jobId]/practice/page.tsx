'use client';

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import RouteGuard from '@/components/auth/RouteGuard';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import PracticeInterface from '@/components/interview-coach/PracticeInterface';

function PracticePageContent() {
    const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
    const params = useParams();
    const searchParams = useSearchParams();
    const jobId = params.jobId as string;
    const moduleId = searchParams.get('module') || undefined;

    if (authLoading) {
        return <LoadingAnimation progress={0.5} showProgressBar={false} />;
    }

    return (
        <RouteGuard requireAuth={true}>
            <PracticeInterface userId={user?.id || ''} jobId={jobId} moduleId={moduleId} />
        </RouteGuard>
    );
}

export default function PracticePage() {
    return (
        <Suspense fallback={<LoadingAnimation progress={0.3} showProgressBar={false} />}>
            <PracticePageContent />
        </Suspense>
    );
}
