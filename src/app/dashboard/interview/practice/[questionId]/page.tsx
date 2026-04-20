'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import PracticeInterface from '@/components/interview/PracticeInterface';

const PracticePage = () => {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const questionId = params.questionId as string;
    const jobId = searchParams.get('jobId');

    const [question, setQuestion] = useState<any>(null);
    const [allQuestions, setAllQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!questionId || !jobId) {
            setError('Missing question ID or job ID');
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch the specific question
                const questionRes = await fetch(`/api/interview/question/${questionId}?jobId=${jobId}`);
                const questionData = await questionRes.json();

                if (!questionData.success) {
                    throw new Error(questionData.error || 'Failed to load question');
                }

                // Also fetch all questions for the stepper
                const planRes = await fetch(`/api/interview/${jobId}/plan`);
                const planData = await planRes.json();

                if (planData.success && planData.questionsByModule) {
                    // Flatten questions from all modules
                    const flatQuestions: any[] = [];
                    Object.values(planData.questionsByModule).forEach((moduleQuestions: any) => {
                        flatQuestions.push(...moduleQuestions);
                    });
                    setAllQuestions(flatQuestions);
                }

                setQuestion(questionData.question);
            } catch (err: any) {
                console.error('Failed to load question:', err);
                setError(err.message || 'Failed to load question');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [questionId, jobId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#f3f2ee] dark:bg-[#141810]">
                <Loader2 className="w-10 h-10 animate-spin text-lime-500 mb-4" />
                <p className="text-gray-500 font-medium">Loading question...</p>
            </div>
        );
    }

    if (error || !question) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#f3f2ee] dark:bg-[#141810]">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <div className="text-red-500 mb-2 font-semibold">Error: {error || 'Question not found'}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {!jobId && 'Job ID is missing from URL. '}
                    Please go back and try again.
                </p>
                <button
                    onClick={() => router.push('/dashboard/interview')}
                    className="px-4 py-2 bg-lime-500 text-black font-medium rounded-lg hover:bg-lime-600 transition-colors"
                >
                    Back to Interview Coach
                </button>
            </div>
        );
    }

    return (
        <PracticeInterface
            question={question}
            allQuestions={allQuestions.length > 0 ? allQuestions : [question]}
            jobId={jobId || ''}
        />
    );
};

export default PracticePage;
