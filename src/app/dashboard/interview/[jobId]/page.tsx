
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import InterviewHub from '@/components/interview/InterviewHub';

const InterviewHubPage = () => {
    const params = useParams();
    const router = useRouter();
    const jobId = params.jobId as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Prevent double fetch with ref
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (!jobId || fetchedRef.current) return;
        fetchedRef.current = true;

        const fetchData = async () => {
            try {
                // Step 1: Try to fetch existing plan first (Smart Load)
                const planRes = await fetch(`/api/interview/${jobId}/plan`);
                const planData = await planRes.json();

                if (planData.success && planData.session && planData.questionsByModule && Object.keys(planData.questionsByModule).length > 0) {
                    console.log("⚡ Plan found. Skipping initiation.");
                    setData(planData);
                    setLoading(false);
                    return;
                }

                console.log("Plan not ready or empty. Initiating...");

                // Step 2: Initiate if no plan found
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

                if (!initData.success || !initData.interviewCoach) {
                    throw new Error('No interview data returned');
                }

                // Step 3: Fetch plan again to get questionsByModule grouping (if init didn't return it in that format)
                // Note: initiate returns raw arrays/objects, 'plan' endpoint returns formatted questionsByModule
                const finalPlanRes = await fetch(`/api/interview/${jobId}/plan`);
                const finalPlanData = await finalPlanRes.json();

                if (finalPlanData.success) {
                    setData(finalPlanData);
                } else {
                    throw new Error(finalPlanData.error || 'Failed to load plan');
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
            <div className="flex flex-col items-center justify-center h-screen app-page-bg">
                <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
                <p className="text-gray-500 font-medium">Preparing your interview plan...</p>
                <p className="text-small text-gray-400 mt-2">This may take a moment while the AI analyzes your profile.</p>
            </div>
        );
    }

    if (error || !data?.session) {
        return (
            <div className="flex flex-col items-center justify-center h-screen app-page-bg">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                <h2 className="text-h3 font-bold text-gray-900 dark:text-white mb-2">Could not load session</h2>
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg mb-6 max-w-md w-full">
                    <p className="text-small font-mono text-red-600 dark:text-red-400 break-words text-center">
                        Error: {error || 'Unknown error occurred'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/dashboard/interview')}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={() => {
                            fetchedRef.current = false;
                            setLoading(true);
                            setError(null);
                            window.location.reload();
                        }}
                        className="px-4 py-2 bg-lime-500 text-black font-medium rounded-lg hover:bg-lime-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return <InterviewHub session={data.session} questionsByModule={data.questionsByModule} />;
};

export default InterviewHubPage;
