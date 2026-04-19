'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, Plus } from 'lucide-react';
import InterviewSessionGrid from '@/components/interview/InterviewSessionGrid';
import PotentialSessionCard from '@/components/interview/PotentialSessionCard';
import EmptyState from '@/components/interview/EmptyState';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import PageHeader from '@/components/dashboard/PageHeader';

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
    const { userData, loading: userLoading } = useUserData();
    const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
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
            <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-12 sm:pb-20">
                <PageHeader
                    title="Interview Coach"
                    description="Practice for your upcoming interviews with AI-powered coaching."
                    user={{
                        name: getUserDisplayName(userData),
                        email: getUserEmail(userData),
                        profilePhoto: getUserAvatar(userData)
                    }}
                    onMobileMenuToggle={toggleSidebar}
                    isMobileMenuOpen={isMobileMenuOpen}
                />

                {!hasContent ? (
                    <EmptyState onAction={() => router.push('/dashboard/tracker')} />
                ) : (
                    <>
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
