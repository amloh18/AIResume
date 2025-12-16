'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Eye, CheckCircle, Calendar, MapPin } from 'lucide-react';
import { DuplicateCheckResult } from '@/lib/services/duplicateJobService';
import CompanyIcon from '@/components/ui/CompanyIcon';

interface DuplicateJobWarningModalProps {
    isOpen: boolean;
    duplicateCheck: DuplicateCheckResult | null;
    newJobData: {
        jobTitle: string;
        company: string;
        location?: string;
    };
    onProceed: () => void;
    onCancel: () => void;
    onViewExisting: (jobId: string) => void;
}

const DuplicateJobWarningModal: React.FC<DuplicateJobWarningModalProps> = ({
    isOpen,
    duplicateCheck,
    newJobData,
    onProceed,
    onCancel,
    onViewExisting
}) => {
    if (!isOpen || !duplicateCheck || !duplicateCheck.isDuplicate) return null;

    const { matchedJobs, confidence } = duplicateCheck;

    // Get confidence color and icon
    const getConfidenceColor = () => {
        switch (confidence) {
            case 'high':
                return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
            case 'medium':
                return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
            default:
                return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
        }
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={onCancel}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden pointer-events-auto border border-gray-200 dark:border-gray-700"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${getConfidenceColor()}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 rounded-full bg-white/50 dark:bg-gray-800/50">
                                            <AlertTriangle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                                Potential Duplicate Job Detected
                                            </h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {confidence === 'high' && 'This job appears to be very similar to an existing entry'}
                                                {confidence === 'medium' && 'This job might be a duplicate of an existing entry'}
                                                {confidence === 'low' && 'This job has some similarities to existing entries'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onCancel}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(80vh-220px)]">
                                {/* New Job Being Added */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                        Job You're Adding:
                                    </h3>
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                                        <div className="flex items-start gap-3">
                                            <CompanyIcon
                                                company={newJobData.company}
                                                className="w-12 h-12 flex-shrink-0"
                                                size={48}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-gray-900 dark:text-white text-base">
                                                    {newJobData.jobTitle}
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {newJobData.company}
                                                </p>
                                                {newJobData.location && (
                                                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {newJobData.location}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Matched Jobs */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                        Similar Jobs Already in Your Tracker:
                                    </h3>
                                    <div className="space-y-3">
                                        {matchedJobs.slice(0, 3).map((job) => (
                                            <div
                                                key={job.id}
                                                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <CompanyIcon
                                                        company={job.company}
                                                        className="w-12 h-12 flex-shrink-0"
                                                        size={48}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                                                    {job.jobTitle}
                                                                </h4>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                    {job.company}
                                                                </p>
                                                                {job.location && (
                                                                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                                        <MapPin className="w-3 h-3" />
                                                                        {job.location}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${job.similarity >= 0.95
                                                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                                        : job.similarity >= 0.85
                                                                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                                                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                                    }`}>
                                                                    {Math.round(job.similarity * 100)}% match
                                                                </div>
                                                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {formatDate(job.createdAt)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => onViewExisting(job.id)}
                                                            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                                                        >
                                                            <Eye className="w-3 h-3" />
                                                            View Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {matchedJobs.length > 3 && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                                                +{matchedJobs.length - 3} more similar {matchedJobs.length - 3 === 1 ? 'job' : 'jobs'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={onCancel}
                                        className="px-4 py-2 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <motion.button
                                        onClick={onProceed}
                                        className="px-4 py-2 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Save Anyway
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default DuplicateJobWarningModal;
