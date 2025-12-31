
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Briefcase, Calendar, Plus, Loader2 } from 'lucide-react';

interface Job {
    _id: string;
    jobTitle: string;
    company: string;
    status: string;
    companyLogo?: string;
    location?: string;
}

const PotentialSessionCard: React.FC<{ job: Job }> = ({ job }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleStart = async () => {
        setLoading(true);
        // Navigate to hub which will trigger init
        router.push(`/interview-coach/${job._id}`);
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
