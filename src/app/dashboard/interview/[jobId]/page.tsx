
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import InterviewHub from '@/components/interview/InterviewHub';

const InterviewHubPage = () => {
    const params = useParams();
    const router = useRouter();
    const jobId = params.jobId as string;

    // We fetch data inside the client component or pass it to a server component wrapper.
    // Given the previous pattern, I'll do client-side fetch for now or use the Hub component to fetch.
    // Let's keep data fetching here to manage loading state for the whole page.

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!jobId) return;

        const fetchData = async () => {
            try {
                // First, initiate/ensure session exists
                const initRes = await fetch('/api/interview/initiate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jobId })
                });

                if (!initRes.ok) {
                    const errorData = await initRes.json().catch(() => ({}));
                    console.error('Init API failed:', initRes.status, errorData);
                    throw new Error(errorData.error || 'Failed to initialize session');
                }

                const initData = await initRes.json();
                console.log('Session initialized:', initData);

                // Then fetch the full plan
                const planRes = await fetch(`/api/interview/${jobId}/plan`);
                const planData = await planRes.json();

                if (planData.success) {
                    setData(planData);
                } else {
                    setError(planData.error || 'Failed to load plan');
                }
            } catch (err: any) {
                console.error('Hub load error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [jobId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-[#141810]">
                <Loader2 className="w-10 h-10 animate-spin text-lime-500 mb-4" />
                <p className="text-gray-500 font-medium">Preparing your interview plan...</p>
                <p className="text-xs text-gray-400 mt-2">This may take a moment while the AI analyzes your profile.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-[#141810]">
                <div className="text-red-500 mb-2 font-semibold">Error: {error}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Please check the console for more details</p>
                <button
                    onClick={() => router.push('/dashboard/interview')}
                    className="px-4 py-2 bg-lime-500 text-black font-medium rounded-lg hover:bg-lime-600 transition-colors"
                >
                    Back to Interview Coach
                </button>
            </div>
        );
    }

    return <InterviewHub session={data.session} questionsByModule={data.questionsByModule} />;
};

export default InterviewHubPage;
