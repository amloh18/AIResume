// @ts-nocheck
'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import PracticeInterface from '@/components/interview-coach/PracticeInterface';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { Loader2 } from 'lucide-react';

const PracticePage = () => {
    const params = useParams();
    const searchParams = useSearchParams();
    const { user, loading } = useUnifiedAuth();

    const questionId = params.questionId as string;
    const jobId = searchParams.get('jobId') || '';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen app-page-bg">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <PracticeInterface
            userId={user.uid}
            jobId={jobId}
            initialQuestionId={questionId}
        />
    );
};

export default PracticePage;
