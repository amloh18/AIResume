'use client';

import React, { Suspense } from 'react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { ResumeEnhancerProvider } from '@/contexts/ResumeEnhancerContext';
import { ATSProvider } from '@/contexts/ATSContext';
import { AICareerReportProvider } from '@/contexts/AICareerReportContext';
import RouteGuard from '@/components/auth/RouteGuard';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import StudioClient from '@/components/studio/StudioClient';

// ============================================================================
// Loading Component
// ============================================================================

function StudioLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0d07]">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-lime-500 dark:border-[#80FF00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading Studio...</p>
            </div>
        </div>
    );
}

// ============================================================================
// Page Content
// ============================================================================

function StudioPageContent() {
    const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();

    // Show loading while authenticating
    if (authLoading) {
        return <LoadingAnimation progress={0.5} showProgressBar={false} />;
    }

    // Require authentication for Studio
    if (!isAuthenticated || !user?.id) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0a0d07] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-amber-500 text-6xl mb-4">🔐</div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                        Authentication Required
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Please log in to access Studio.
                    </p>
                    <button
                        onClick={() => {
                            const callbackUrl = encodeURIComponent(window.location.pathname + window.location.search);
                            window.location.href = `/sign-in?callbackUrl=${callbackUrl}`;
                        }}
                        className="px-4 py-2 bg-lime-500 dark:bg-[#80FF00] text-black rounded-lg hover:bg-lime-600 dark:hover:bg-[#70e600] transition-colors font-semibold"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <RouteGuard requireAuth={true}>
            <AICareerReportProvider>
                <ResumeEnhancerProvider>
                    <ATSProvider>
                        <StudioClient userId={user.id} />
                    </ATSProvider>
                </ResumeEnhancerProvider>
            </AICareerReportProvider>
        </RouteGuard>
    );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function StudioPage() {
    return (
        <Suspense fallback={<StudioLoading />}>
            <StudioPageContent />
        </Suspense>
    );
}
