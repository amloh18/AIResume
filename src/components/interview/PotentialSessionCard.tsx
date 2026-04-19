'use client';


import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Briefcase, Calendar, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Job {
    _id: string;
    jobTitle: string;
    company: string;
    status: string;
    companyLogo?: string;
    location?: string;
    interviewCoach?: {
        status: string;
        questions?: any[];
        updatedAt?: string;
    };
}

const PotentialSessionCard: React.FC<{ job: Job }> = ({ job }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const isFresh = (dateString?: string) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffHours = diffTime / (1000 * 60 * 60);
        return diffHours < 72;
    };

    const handleStart = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // 🟢 1. CHECK LOCAL STATUS FIRST
        // If the job prop passed to this component already has the data, skip the API entirely.
        if (
            job.interviewCoach?.status === 'ready' &&
            (job.interviewCoach?.questions?.length || 0) > 0 &&
            isFresh(job.interviewCoach?.updatedAt)
        ) {
            console.log("⚡ Plan ready locally. Redirecting...");
            router.push(`/dashboard/interview/${job._id}`);
            return;
        }

        // 🟡 2. OTHERWISE, CALL API
        setLoading(true);
        try {
            const response = await fetch('/api/interview/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: job._id })
            });

            const data = await response.json();

            if (data.success) {
                router.push(`/dashboard/interview/${job._id}`);
            } else {
                toast.error(data.error || 'Failed to start session');
                setLoading(false);
            }
        } catch (err) {
            console.error('Failed to initiate session:', err);
            toast.error('Something went wrong');
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-white dark:bg-[#141810] border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 hover:border-lime-500 transition-colors cursor-pointer"
            onClick={handleStart}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-sm font-bold text-gray-400 overflow-hidden">
                        {job.companyLogo ? (
                            <img
                                src={job.companyLogo}
                                alt={job.company}
                                className="w-full h-full object-contain"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                        ) : (
                            <span>{job.company?.substring(0, 2).toUpperCase() || '??'}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                            {job.jobTitle}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {job.company}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-lime-50 dark:bg-lime-900/10 rounded-xl p-3 flex items-center justify-center gap-2 text-lime-700 dark:text-lime-400 font-medium text-sm">
                    <Plus className="w-4 h-4" />
                    Start Prep
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{job.status === 'interview' ? 'Interview Stage' : 'Applied'}</span>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center rounded-2xl">
                    <Loader2 className="w-6 h-6 animate-spin text-lime-500" />
                </div>
            )}
        </motion.div>
    );
};

export default PotentialSessionCard;
