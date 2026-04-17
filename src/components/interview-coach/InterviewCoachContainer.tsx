'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Search, Filter, Plus, Briefcase, MapPin, Play, Info, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import InterviewCoachHeader from './InterviewCoachHeader';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { useUserData } from '@/lib/hooks/useUserData';

interface Job {
    _id: string;
    jobTitle: string;
    company: string;
    status: string;
    companyLogo?: string;
    location?: string;
}

interface InterviewCoachContainerProps {
    userId: string;
}

const InterviewCoachContainer: React.FC<InterviewCoachContainerProps> = ({ userId }) => {
    const router = useRouter();
    const { openPaymentModal } = usePaymentModal();
    const { userData, loading: userLoading } = useUserData();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        industry: '',
        experience: '',
        remote: ''
    });

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await fetch('/api/interview/dashboard');
            const data = await response.json();

            if (data.success) {
                setJobs(data.potentialSessions || []);
            }
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
            toast.error('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleStartPractice = (jobId: string) => {
        if (userData?.currentPlanKey === 'free' || !userData?.subscription || userData.subscription.status !== 'active') {
            openPaymentModal({ preselectedPlanKey: 'pro_monthly', triggerContext: 'interview-coach' });
            return;
        }
        router.push(`/dashboard/interview/${jobId}`);
    };

    const handleAddNewRole = () => {
        router.push('/dashboard/tracker');
    };

    const filteredJobs = jobs.filter(job => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                job.jobTitle.toLowerCase().includes(query) ||
                job.company.toLowerCase().includes(query) ||
                (job.location && job.location.toLowerCase().includes(query))
            );
        }
        return true;
    });

    const hasJobs = filteredJobs.length > 0;

    // Icon based on job title (simplified heuristic)
    const getJobIcon = (title: string) => {
        const t = title.toLowerCase();
        if (t.includes('design') || t.includes('ux')) return '✦';
        if (t.includes('data') || t.includes('analyst')) return '📊';
        if (t.includes('market')) return '📢';
        if (t.includes('engineer') || t.includes('developer')) return '⟨/⟩';
        if (t.includes('product') || t.includes('manager')) return '⚡';
        return '💼';
    };

    const getIconBgColor = (title: string) => {
        const t = title.toLowerCase();
        if (t.includes('design') || t.includes('ux')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
        if (t.includes('data') || t.includes('analyst')) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
        if (t.includes('market')) return 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400';
        if (t.includes('engineer') || t.includes('developer')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1a230f] flex flex-col">
            <InterviewCoachHeader />
            <div className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        What role are you interviewing for?
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        Choose a target role to begin your AI-powered preparation session or add a new job description.
                    </p>
                </div>

                {/* Search and Filters */}
                {hasJobs && (
                    <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        {/* Search Bar */}
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search for job titles, industries, or companies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#141810] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Filter by:</span>
                            {['Industry', 'Experience', 'Remote'].map((filter) => (
                                <button
                                    key={filter}
                                    className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-[#141810] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    {filter}
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-lime-500 border-t-transparent rounded-full" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && !hasJobs && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-16"
                    >
                        <div className="bg-white dark:bg-[#141810] rounded-2xl p-8 shadow-lg max-w-md text-center">
                            <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
                                <Info className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                No jobs found in 'Applied' or 'Interview' stage.
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                To start preparing for an interview, please move relevant jobs to the 'Applied' or 'Interview' stage in your Job Tracker.
                            </p>
                            <button
                                onClick={handleAddNewRole}
                                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                <Briefcase className="w-5 h-5" />
                                Go to Job Tracker
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Job Cards Grid */}
                {!loading && hasJobs && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Add New Role Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={handleAddNewRole}
                            className="bg-white dark:bg-[#141810] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:border-lime-500 dark:hover:border-lime-500 transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center mb-4 group-hover:border-lime-500 transition-colors">
                                <Plus className="w-5 h-5 text-gray-400 group-hover:text-lime-500 transition-colors" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Add New Role</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                Paste a job description to start a custom session.
                            </p>
                        </motion.div>

                        {/* Job Cards */}
                        {filteredJobs.map((job, index) => (
                            <motion.div
                                key={job._id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${getIconBgColor(job.jobTitle)}`}>
                                        {getJobIcon(job.jobTitle)}
                                    </div>
                                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                                        <span className="text-gray-400">•••</span>
                                    </button>
                                </div>

                                {/* Title */}
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 line-clamp-1">
                                    {job.jobTitle}
                                </h3>

                                {/* Company & Location */}
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
                                    {job.company}
                                    {job.location && (
                                        <>
                                            <span>•</span>
                                            <span>{job.location}</span>
                                        </>
                                    )}
                                </p>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded">
                                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                    </span>
                                </div>

                                {/* Practice Button */}
                                <button
                                    onClick={() => handleStartPractice(job._id)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Practice Now
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewCoachContainer;
