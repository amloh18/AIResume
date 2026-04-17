'use client';

import React, { Suspense } from 'react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import RouteGuard from '@/components/auth/RouteGuard';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import InterviewCoachContainer from '@/components/interview-coach/InterviewCoachContainer';

function InterviewCoachPageContent() {
    const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();

    if (authLoading) {
        return <LoadingAnimation progress={0.5} showProgressBar={false} />;
    }

    return (
        <RouteGuard requireAuth={true}>
            <InterviewCoachContainer userId={user?.id || ''} />
        </RouteGuard>
    );
}

export default function InterviewCoachPage() {
    return (
        <Suspense fallback={<LoadingAnimation progress={0.3} showProgressBar={false} />}>
            <InterviewCoachPageContent />
        </Suspense>
    );
}
