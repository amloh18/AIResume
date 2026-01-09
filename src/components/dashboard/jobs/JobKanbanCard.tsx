'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    MapPin, DollarSign, Calendar, Clock, AlertCircle,
    CheckCircle, X, ExternalLink, FileText, Zap,
    Linkedin, Mail, ArrowRight, Eye, GraduationCap,
    Target, Shield, Award, Briefcase, ChevronRight
} from 'lucide-react';
import { CVJourney } from '@/types/cv';

interface JobApplication {
    id: string;
    _id: string;
    userId: string;
    jobTitle: string;
    title?: string;
    company: string;
    companyLogo?: string;
    status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
    location?: string;
    salary?: {
        min?: number;
        max?: number;
        currency?: string;
        period?: 'hourly' | 'monthly' | 'yearly';
    };
    offerDetails?: {
        salary?: number;
        bonus?: string;
        equity?: string;
        deadline?: Date;
        status?: string;
    };
    interviews?: Array<{
        type: string;
        date: Date | string;
        interviewer?: string;
    }>;
    applicationDate?: Date;
    deadline?: Date;
    createdAt: string;
    updatedAt: string;
    matchScore?: number;
    sponsorship?: 'yes' | 'no' | 'unknown';
    jobUrl?: string;
    atsScore?: number;
    jobDescription?: string;
    trustScore?: number;
    trustSnapshot?: {
        ghostRiskLevel?: 'low' | 'medium' | 'high';
    };
    source?: string;
    priority: 'low' | 'medium' | 'high';
}

interface JobKanbanCardProps {
    job: JobApplication;
    stage: string;
    jobJourneys: CVJourney[];
    isSelected: boolean;
    isDragging: boolean;
    canDrag: boolean;
    onClick: (job: JobApplication) => void;
    onDragStart: (e: React.DragEvent, jobId: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onAction?: (action: string, job: JobApplication, e: React.MouseEvent) => void;
}

// Global set to track analyzed jobs across component remounts
// This prevents the infinite loop where:
// 1. Analysis triggers update -> 2. Update triggers refresh -> 3. Refresh unmounts cards -> 4. Remount forgets local ref -> 5. Analysis triggers again
const analyzedJobIds = new Set<string>();

const JobKanbanCard: React.FC<JobKanbanCardProps> = ({
    job,
    stage,
    jobJourneys,
    isSelected,
    isDragging,
    canDrag,
    onClick,
    onDragStart,
    onDragEnd,
    onDragOver,
    onAction
}) => {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    // Prevent infinite loops by tracking attempts locally
    const hasAnalyzedRef = React.useRef(false);

    // Auto-trigger analysis if score is missing
    React.useEffect(() => {
        const checkAndAnalyze = async () => {
            // Only trigger if:
            // 1. matchScore is undefined
            // 2. job has description (needed for analysis)
            // 3. Not already analyzing
            // 3. Not already analyzing
            // 4. Not analyzed in this session (global check)
            if (job.matchScore === undefined && job.jobDescription && !isAnalyzing &&
                !hasAnalyzedRef.current && !analyzedJobIds.has(job.id)) {
                try {
                    setIsAnalyzing(true);
                    hasAnalyzedRef.current = true; // Mark as attempted locally
                    analyzedJobIds.add(job.id); // Mark as attempted globally

                    // Dynamically import to avoid circular dependencies if any
                    const { triggerJobAnalysis } = await import('@/lib/services/jobAnalysisService');
                    const result = await triggerJobAnalysis(job);

                    if (result) {
                        // Dispatch event to refresh jobs
                        window.dispatchEvent(new CustomEvent('jobUpdated', {
                            detail: { jobId: job.id, ...result }
                        }));
                    }
                } catch (error) {
                    console.error('Failed to auto-analyze job:', error);
                } finally {
                    setIsAnalyzing(false);
                }
            }
        };

        const timeoutId = setTimeout(checkAndAnalyze, 1000); // Small delay to prevent immediate flood on mount
        return () => clearTimeout(timeoutId);
    }, [job.matchScore, job.jobDescription, job.id, isAnalyzing]); // Dependencies

    const handlePracticeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/interview-coach/${job._id}`);
    };

    // Helper to format currency
    const formatSalary = (amount?: number, currency = '$') => {
        if (!amount) return 'N/A';
        return amount >= 1000
            ? `${currency}${(amount / 1000).toFixed(0)}k`
            : `${currency}${amount}`;
    };

    // Helper for dates
    const formatDate = (date?: Date | string) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getDaysAgo = (date?: Date | string) => {
        if (!date) return '';
        const d = new Date(date);
        const now = new Date();
        const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : `${diff}d ago`;
    };

    // --- STAGE SPECIFIC RENDERERS ---

    const renderDraftContent = () => (
        <>
            {/* Compact View */}
            <div className="flex justify-between items-center mt-2">
                <div className={`px-2 py-1 text-xs font-bold rounded-full ${job.matchScore !== undefined ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}>
                    {job.matchScore !== undefined ? `${job.matchScore}% Match` : (isAnalyzing ? 'Calculating...' : 'Score Pending')}
                </div>
                {job.sponsorship === 'yes' && (
                    <div className="text-gray-500" title="Sponsorship Available">
                        <Award size={14} />
                    </div>
                )}
            </div>

            {/* Hover View */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                            <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                                {job.salary && (
                                    <span className="flex items-center gap-1">
                                        <DollarSign size={10} />
                                        {formatSalary(job.salary.min)} - {formatSalary(job.salary.max)}
                                    </span>
                                )}
                                {job.location && (
                                    <span className="flex items-center gap-1 truncate max-w-[100px]">
                                        <MapPin size={10} />
                                        {job.location}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAction?.('generate_docs', job, e); }}
                                className="w-full py-1.5 bg-lime-500 text-[#141810] text-xs font-bold rounded-lg hover:bg-lime-400 transition-colors"
                            >
                                Generate Docs
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    const renderCreatedContent = () => {
        const primaryJourney = jobJourneys[0];
        const atsScore = primaryJourney?.atsScore;
        const hasCV = !!primaryJourney?.cvId;
        const hasCL = !!primaryJourney?.coverLetterId;

        return (
            <>
                {/* Compact View */}
                <div className="flex justify-between items-center mt-2">
                    <div className="flex-1 mr-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-gray-600 dark:text-gray-300">ATS Score</span>
                            <span className={atsScore && atsScore >= 80 ? 'text-green-600' : 'text-amber-600'}>
                                {atsScore || 0}/100
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                                className={`h-1.5 rounded-full ${atsScore && atsScore >= 80 ? 'bg-green-500' : 'bg-amber-500'}`}
                                style={{ width: `${atsScore || 0}%` }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-1.5">
                        <div className={`p-1 rounded-full ${hasCV ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            <FileText size={12} />
                        </div>
                        <div className={`p-1 rounded-full ${hasCL ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            <FileText size={12} />
                        </div>
                    </div>
                </div>

                {/* Hover View */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                    <Shield size={12} className="text-blue-500" />
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {job.trustSnapshot?.ghostRiskLevel === 'low' ? 'Low Risk' : 'Risk Analysis Pending'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAction?.('inject_data', job, e); }}
                                        className="py-1.5 bg-lime-500/10 text-lime-600 dark:text-lime-400 border border-lime-500/20 rounded-lg text-xs font-medium hover:bg-lime-500/20 transition-colors"
                                    >
                                        Improve ATS
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAction?.('download', job, e); }}
                                        className="py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        );
    };

    const renderAppliedContent = () => (
        <>
            {/* Compact View */}
            <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <Clock size={12} />
                    <span>Applied {getDaysAgo(job.applicationDate)}</span>
                </div>
                <div className="text-xs text-gray-400 font-medium">
                    {job.source || 'Manual'}
                </div>
            </div>

            {/* Hover View */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                                <AlertCircle size={12} />
                                <span>Follow up in 3 days</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAction?.('move_interview', job, e); }}
                                    className="py-1.5 bg-lime-500 text-[#141810] rounded-lg text-xs font-bold hover:bg-lime-400 transition-colors"
                                >
                                    Move Stage
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAction?.('log_activity', job, e); }}
                                    className="py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                >
                                    Log Activity
                                </button>
                                <button
                                    onClick={handlePracticeClick}
                                    className="col-span-2 mt-2 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:text-lime-500 dark:hover:text-[#80FF00] transition-colors flex items-center justify-center gap-2"
                                >
                                    <GraduationCap size={12} />
                                    Practice
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    const renderInterviewContent = () => {
        const nextInterview = job.interviews?.[0]; // Assuming sorted by date

        return (
            <>
                {/* Compact View */}
                <div className="flex justify-between items-center mt-2">
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${!nextInterview ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700 font-medium'
                        }`}>
                        <Calendar size={12} />
                        <span>
                            {nextInterview
                                ? `${new Date(nextInterview.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} @ ${new Date(nextInterview.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : 'Schedule Pending'}
                        </span>
                    </div>
                    {nextInterview && (
                        <div className="text-xs text-gray-500">
                            {nextInterview.type}
                        </div>
                    )}
                </div>

                {/* Hover View */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                                {nextInterview?.interviewer && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Target size={12} />
                                        <span>with {nextInterview.interviewer}</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAction?.('view_notes', job, e); }}
                                        className="py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                    >
                                        View Notes
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAction?.('add_feedback', job, e); }}
                                        className="py-1.5 bg-lime-500 text-[#141810] rounded-lg text-xs font-bold hover:bg-lime-400 transition-colors"
                                    >
                                        Add Feedback
                                    </button>
                                </div>
                                <button
                                    onClick={handlePracticeClick}
                                    className="w-full mt-2 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:text-lime-500 dark:hover:text-[#80FF00] transition-colors flex items-center justify-center gap-2"
                                >
                                    <GraduationCap size={12} />
                                    Practice
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        );
    };

    const renderOfferContent = () => (
        <>
            {/* Compact View */}
            <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-1 text-sm font-bold text-green-600 dark:text-green-400">
                    <DollarSign size={14} />
                    {job.offerDetails?.salary
                        ? formatSalary(job.offerDetails.salary, '')
                        : formatSalary(job.salary?.min || 0, '')}/yr
                </div>
                <div className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">
                    {job.offerDetails?.deadline ? `Expires in ${getDaysAgo(job.offerDetails.deadline).replace(' ago', '')}` : 'Pending'}
                </div>
            </div>

            {/* Hover View */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                            {/* Equity/Bonus */}
                            {(job.offerDetails?.equity || job.offerDetails?.bonus) && (
                                <div className="flex gap-3 text-xs text-gray-600">
                                    {job.offerDetails.bonus && (
                                        <span>+{job.offerDetails.bonus} Bonus</span>
                                    )}
                                    {job.offerDetails.equity && (
                                        <span>+{job.offerDetails.equity} Equity</span>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAction?.('accept_offer', job, e); }}
                                    className="py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAction?.('decline_offer', job, e); }}
                                    className="py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    return (
        <div
            draggable={canDrag}
            onDragStart={(e) => onDragStart(e, job.id)}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onClick={() => onClick(job)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`group relative overflow-hidden bg-white dark:bg-[#141810] rounded-xl border transition-all duration-300 ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : 'border-gray-200 dark:border-white/20'
                } ${isDragging ? 'opacity-50' : ''} ${!canDrag ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
      shadow-lg group-hover:shadow-xl
      `}
        >
            <div className="p-4">
                {/* Visual Anchor: Logo & Title */}
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-gray-500 overflow-hidden flex-shrink-0">
                        {job.companyLogo ? (
                            <img
                                src={job.companyLogo}
                                alt={`${job.company} logo`}
                                className="w-full h-full object-contain"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                        ) : null}
                        <span style={{ display: job.companyLogo ? 'none' : 'block' }}>
                            {job.company.substring(0, 2).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {job.jobTitle || job.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {job.company}
                        </p>
                    </div>
                </div>

                {/* Stage Specific Content */}
                <div className="mt-1">
                    {stage === 'draft' && renderDraftContent()}
                    {stage === 'created' && renderCreatedContent()}
                    {stage === 'applied' && renderAppliedContent()}
                    {stage === 'interview' && renderInterviewContent()}
                    {stage === 'offer' && renderOfferContent()}
                    {stage === 'rejected' && (
                        <div className="mt-2 text-xs text-red-500 font-medium">Application Rejected</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobKanbanCard;
