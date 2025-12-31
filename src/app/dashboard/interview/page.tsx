'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, Plus } from 'lucide-react';
import InterviewSessionGrid from '@/components/interview/InterviewSessionGrid';
import PotentialSessionCard from '@/components/interview/PotentialSessionCard';
import EmptyState from '@/components/interview/EmptyState';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface Session {
    _id: string;
    targetRole: string;
    readinessScore: number;
    lastPracticedAt: string;
    jobId: {
        _id: string;
        jobTitle: string;
        company: string;
        status: string;
        companyLogo?: string;
        location?: string;
    };
    updatedAt: string;
}

interface Job {
    _id: string;
    jobTitle: string;
    company: string;
    status: string;
    companyLogo?: string;
    location?: string;
}

const InterviewDashboard = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [potentialSessions, setPotentialSessions] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await fetch('/api/interview/dashboard');
                const data = await res.json();
                if (data.success) {
                    setSessions(data.sessions);
                    setPotentialSessions(data.potentialSessions || []);
                }
            } catch (error) {
                console.error('Failed to load dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#1a230f]">
                <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
            </div>
        );
    }

    const hasContent = sessions.length > 0 || potentialSessions.length > 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1a230f]">
            {/* Header */}
            <div className="bg-white dark:bg-[#1a230f] border-b border-gray-200 dark:border-gray-800 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                Interview Coach
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-10">
                {!hasContent ? (
                    <EmptyState onAction={() => router.push('/dashboard/tracker')} />
                ) : (
                    <>
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                    Interview Preparation
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Practice for your upcoming interviews with AI-powered coaching.
                                </p>
                            </div>
                        </div>

                        {/* All Jobs (Applied & Interview Stage) */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                                Your Opportunities ({potentialSessions.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {potentialSessions.map(job => (
                                    <PotentialSessionCard key={job._id} job={job} />
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default InterviewDashboard;
