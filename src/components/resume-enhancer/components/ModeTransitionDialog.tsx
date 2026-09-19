'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ArrowRight, Info, Zap } from 'lucide-react';
import type { AnalysisMode } from '@/lib/utils/analysis-mode';
import { getAnalysisModeLabel } from '@/lib/utils/analysis-mode';

interface ModeTransitionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    fromMode: AnalysisMode;
    toMode: AnalysisMode;
    transitionType: 'add-jd' | 'remove-jd' | 'add-role' | 'remove-role' | 'convert-to-journey' | 'unlink-job' | 'relink-job' | 'generic';
    cvType?: 'master' | 'journey' | 'standalone';
    impacts?: string[];
    confirmLabel?: string;
    cancelLabel?: string;
}

export default function ModeTransitionDialog({
    isOpen,
    onClose,
    onConfirm,
    fromMode,
    toMode,
    transitionType,
    cvType,
    impacts = [],
    confirmLabel = 'Continue',
    cancelLabel = 'Cancel'
}: ModeTransitionDialogProps) {
    const [dontShowAgain, setDontShowAgain] = React.useState(false);

    const handleConfirm = () => {
        if (dontShowAgain) {
            // Store preference in session storage
            sessionStorage.setItem('hideModeTrans itionDialogs', 'true');
        }
        onConfirm();
    };

    // Get transition details based on type
    const getTransitionDetails = () => {
        switch (transitionType) {
            case 'add-jd':
                return {
                    title: 'Adding Job Description',
                    description: cvType === 'master'
                        ? 'Master CVs cannot use job descriptions. Would you like to convert this to a Tailored Resume?'
                        : 'Adding a job description will enable ATS-optimized analysis.',
                    icon: Zap,
                    iconColor: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/30',
                    impacts: cvType === 'master'
                        ? ['CV type will change from Master to Tailored', 'Analysis will focus on job description instead of role', 'ATS score will be calculated']
                        : ['Analysis mode will switch to JD-based', 'ATS keywords will be extracted', 'Cached scores will be recalculated']
                };

            case 'remove-jd':
                return {
                    title: 'Removing Job Description',
                    description: cvType === 'journey'
                        ? 'Tailored Resumes require a job description. Removing it will convert this to a Standalone Resume.'
                        : 'Removing the job description will fall back to role-based analysis.',
                    icon: AlertTriangle,
                    iconColor: 'text-yellow-400',
                    bgColor: 'bg-yellow-500/10',
                    borderColor: 'border-yellow-500/30',
                    impacts: cvType === 'journey'
                        ? ['CV will convert to Standalone type', 'Analysis will switch to role-based if role is set', 'Tailored link will be removed', 'Job-specific data will be lost']
                        : ['Analysis mode will switch to role-based', 'ATS score will be cleared', 'JD-specific keywords will be removed']
                };

            case 'convert-to-journey':
                return {
                    title: 'Converting to Tailored Resume',
                    description: 'This will create a Tailored Resume linked to the selected job. Your analysis will focus on the job description.',
                    icon: Zap,
                    iconColor: 'text-purple-400',
                    bgColor: 'bg-purple-500/10',
                    borderColor: 'border-purple-500/30',
                    impacts: [
                        'CV type will change to Tailored',
                        'Analysis will switch from role-based to JD-based',
                        'All scores will be recalculated for this job',
                        'Original CV will remain unchanged'
                    ]
                };

            case 'unlink-job':
                return {
                    title: 'Unlinking Job',
                    description: 'Removing the job link will convert this Tailored Resume to a Standalone Resume.',
                    icon: AlertTriangle,
                    iconColor: 'text-orange-400',
                    bgColor: 'bg-orange-500/10',
                    borderColor: 'border-orange-500/30',
                    impacts: [
                        'Tailored Resume will become Standalone',
                        'Job-specific data will be preserved but unlinked',
                        'You can manually keep or remove the job description',
                        'Analysis can continue with the existing JD'
                    ]
                };

            case 'relink-job':
                return {
                    title: 'Relinking to Different Job',
                    description: 'Changing the linked job will reset all job-specific analysis data.',
                    icon: Info,
                    iconColor: 'text-cyan-400',
                    bgColor: 'bg-cyan-500/10',
                    borderColor: 'border-cyan-500/30',
                    impacts: [
                        'Job description will be updated to new job',
                        'All ATS scores will be recalculated',
                        'Previous job-specific keywords will be replaced',
                        'Changes are irreversible for this Tailored Resume'
                    ]
                };

            default:
                return {
                    title: 'Analysis Mode Change',
                    description: `Analysis will change from ${getAnalysisModeLabel(fromMode)} to ${getAnalysisModeLabel(toMode)}.`,
                    icon: Info,
                    iconColor: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/30',
                    impacts: impacts.length > 0 ? impacts : ['Cached analysis will be invalidated', 'Score will be recalculated']
                };
        }
    };

    const details = getTransitionDetails();
    const Icon = details.icon;
    const displayImpacts = details.impacts.length > 0 ? details.impacts : impacts;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Dialog Container - flex centering */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="w-full max-w-lg pointer-events-auto"
                        >
                            <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
                                {/* Header */}
                                <div className={`p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r ${details.bgColor}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${details.bgColor} border ${details.borderColor}`}>
                                            <Icon size={24} className={details.iconColor} />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                                                {details.title}
                                            </h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {details.description}
                                            </p>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Mode Transition Visual */}
                                <div className="px-6 py-4 bg-gray-50 dark:bg-[#252525]">
                                    <div className="flex items-center justify-center gap-4">
                                        <div className="px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-600 rounded-lg">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Mode</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{getAnalysisModeLabel(fromMode)}</p>
                                        </div>
                                        <ArrowRight size={20} className="text-gray-400 dark:text-gray-500" />
                                        <div className={`px-4 py-2 border rounded-lg ${details.bgColor} ${details.borderColor}`}>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">New Mode</p>
                                            <p className={`text-sm font-medium ${details.iconColor}`}>{getAnalysisModeLabel(toMode)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Impact List */}
                                {displayImpacts.length > 0 && (
                                    <div className="px-6 py-4 bg-white dark:bg-[#1e1e1e]">
                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">What will change:</h3>
                                        <ul className="space-y-2">
                                            {displayImpacts.map((impact, index) => (
                                                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <span className={`${details.iconColor} mt-1 flex-shrink-0`}>•</span>
                                                    <span>{impact}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="px-6 py-4 bg-gray-50 dark:bg-[#252525] border-t border-gray-200 dark:border-gray-700">
                                    {/* Don't show again checkbox */}
                                    <label className="flex items-center gap-2 mb-4 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={dontShowAgain}
                                            onChange={(e) => setDontShowAgain(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                            Don't show this again for this session
                                        </span>
                                    </label>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={onClose}
                                            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg transition-all font-medium"
                                        >
                                            {cancelLabel}
                                        </button>
                                        <button
                                            onClick={handleConfirm}
                                            className={`flex-1 px-4 py-2.5 rounded-lg transition-all font-medium border ${details.borderColor} ${details.bgColor} ${details.iconColor} hover:brightness-110`}
                                        >
                                            {confirmLabel}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
