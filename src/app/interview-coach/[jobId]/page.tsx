'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import RouteGuard from '@/components/auth/RouteGuard';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import SessionHub from '@/components/interview-coach/SessionHub';

function SessionHubPageContent() {
    const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
    const params = useParams();
    const jobId = params.jobId as string;

    if (authLoading) {
        return <LoadingAnimation progress={0.5} showProgressBar={false} />;
    }

    return (
        <RouteGuard requireAuth={true}>
            <SessionHub userId={user?.id || ''} jobId={jobId} />
        </RouteGuard>
    );
}

export default function SessionHubPage() {
    return (
        <Suspense fallback={<LoadingAnimation progress={0.3} showProgressBar={false} />}>
            <SessionHubPageContent />
        </Suspense>
    );
}
