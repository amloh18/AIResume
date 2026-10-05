
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import InterviewHub from '@/components/interview/InterviewHub';

/**
 * Interview plan page.
 *
 * Renders the hub immediately and streams the content in, rather than blocking
 * the whole viewport behind a "Preparing your interview plan..." loader for the
 * entire AI generation (which can run 10–50s).
 *
 * Two-phase load:
 *   1. `GET /plan` — cheap. Returns the finished plan, or (new) a *shell* with
 *      the real role/company plus `needsGeneration: true`.
 *   2. `POST /initiate` — only when phase 1 has no plan. Returns the session
 *      *and* the module-grouped questions, so the follow-up `/plan` call the
 *      old flow made is no longer needed.
 */
const InterviewHubPage = () => {
    const params = useParams();
    const router = useRouter();
    const jobId = params.jobId as string;

    /** Shell session — lets the hub paint its chrome before the plan exists. */
    const [shell, setShell] = useState<any>(null);
    /** Full plan data, once available. */
    const [data, setData] = useState<any>(null);
    /** True only while the AI is actually generating. */
    const [preparing, setPreparing] = useState(true);
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

                if (
                    planData.success &&
                    planData.session &&
                    planData.questionsByModule &&
                    Object.keys(planData.questionsByModule).length > 0
                ) {
                    console.log('⚡ Plan found. Skipping initiation.');
                    setData(planData);
                    setPreparing(false);
                    return;
                }

                // A failure that is *not* "needs generation" is a real error
                // (job missing / not yours) — don't burn an AI generation on it.
                if (!planData.success && !planData.needsGeneration) {
                    throw new Error(planData.error || 'Failed to load interview plan');
                }

                // Paint the shell now: the header and card frames appear
                // immediately while the AI works.
                if (planData.session) setShell(planData.session);

                console.log('Plan not ready or empty. Initiating...');

                // Step 2: Initiate. Returns session + questionsByModule, so the
                // old third round-trip to /plan is gone.
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

                if (!initData.success || !initData.session) {
                    throw new Error(initData.error || 'No interview data returned');
                }

                setData({
                    session: initData.session,
                    questionsByModule: initData.questionsByModule || {},
                });
            } catch (err: any) {
                console.error('Hub load error:', err);
                setError(err.message);
            } finally {
                setPreparing(false);
            }
        };

        fetchData();
    }, [jobId]);

    // Only fall back to the full-page error state when there is nothing at all
    // to render. While generating we keep the hub on screen.
    if (error && !data) {
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
                            setPreparing(true);
                            setError(null);
                            window.location.reload();
                        }}
                        className="px-4 py-2 bg-lime-500 text-white font-medium rounded-lg hover:bg-lime-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Prefer the full plan; fall back to the shell so the UI is on screen from
    // the first paint.
    const session = data?.session || shell;

    return (
        <InterviewHub
            session={session}
            questionsByModule={data?.questionsByModule || {}}
            isPreparing={preparing}
        />
    );
};

export default InterviewHubPage;
