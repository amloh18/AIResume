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

    if (!isAuthenticated || !user?.id) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#1a230f] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 dark:text-red-400 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                        Authentication Required
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Please log in to access the Interview Coach.
                    </p>
                    <button
                        onClick={() => window.location.href = '/sign-in'}
                        className="px-4 py-2 bg-lime-500 text-black rounded-lg hover:bg-lime-400 transition-colors font-semibold"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <RouteGuard requireAuth={true}>
            <PracticeInterface userId={user.id} jobId={jobId} moduleId={moduleId} />
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
