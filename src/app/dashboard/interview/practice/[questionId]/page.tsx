
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import PracticeInterface from '@/components/interview/PracticeInterface';

const PracticePage = () => {
    const params = useParams();
    const router = useRouter();
    const questionId = params.questionId as string;

    const [question, setQuestion] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!questionId) return;

        const fetchQuestion = async () => {
            try {
                const res = await fetch(`/api/interview/question/${questionId}`);
                const data = await res.json();
                if (data.success) {
                    setQuestion(data.question);
                } else {
                    router.push('/interview'); // Redirect on error
                }
            } catch (error) {
                console.error('Failed to load question:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestion();
    }, [questionId, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#141810]">
                <Loader2 className="w-10 h-10 animate-spin text-lime-500" />
            </div>
        );
    }

    if (!question) return null;

    return <PracticeInterface question={question} />;
};

export default PracticePage;
