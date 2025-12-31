'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    X,
    ChevronUp,
    ChevronDown,
    Sparkles,
    ArrowRight,
    Lightbulb,
    Edit3,
} from 'lucide-react';

import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { useStudio } from '../StudioContext';
import { PILLAR_COLORS, ATSPillar } from '@/types/studio';

// ============================================================================
// Props
// ============================================================================

interface WorkbenchPaneProps {
    cvData: UnifiedCVDataStructure | null;
    userId: string;
}

// ============================================================================
// Section Config
// ============================================================================

const SECTION_LABELS: Record<string, string> = {
    personal: 'Personal Information',
    work: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certificates: 'Certificates',
    languages: 'Languages',
    volunteer: 'Volunteer Experience',
    basics: 'Personal Information',
};

// ============================================================================
// Component
// ============================================================================

export default function WorkbenchPane({ cvData, userId }: WorkbenchPaneProps) {
    const { state, dispatch, applyAnnotation, dismissAnnotation } = useStudio();
    const formRef = useRef<HTMLDivElement>(null);

    // Get active annotation
    const activeAnnotation = state.activeAnnotationId
        ? state.annotations.find(a => a.id === state.activeAnnotationId)
        : null;

    // Get section from active annotation
    const activeSection = activeAnnotation?.sectionId || state.activeSection || 'personal';

    // Get annotations for current section
    const sectionAnnotations = state.annotations.filter(
        a => a.sectionId === activeSection && a.status === 'open'
    );

    // Navigation
    const goToNextAnnotation = () => {
        const openAnnotations = state.annotations.filter(a => a.status === 'open');
        if (!activeAnnotation) {
            if (openAnnotations.length > 0) {
                dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: openAnnotations[0].id });
            }
            return;
        }
        const currentIndex = openAnnotations.findIndex(a => a.id === activeAnnotation.id);
        const nextIndex = (currentIndex + 1) % openAnnotations.length;
        dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: openAnnotations[nextIndex].id });
        dispatch({ type: 'SET_ACTIVE_SECTION', payload: openAnnotations[nextIndex].sectionId });
    };

    const goToPrevAnnotation = () => {
        const openAnnotations = state.annotations.filter(a => a.status === 'open');
        if (!activeAnnotation) {
            if (openAnnotations.length > 0) {
                dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: openAnnotations[openAnnotations.length - 1].id });
            }
            return;
        }
        const currentIndex = openAnnotations.findIndex(a => a.id === activeAnnotation.id);
        const prevIndex = currentIndex === 0 ? openAnnotations.length - 1 : currentIndex - 1;
        dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: openAnnotations[prevIndex].id });
        dispatch({ type: 'SET_ACTIVE_SECTION', payload: openAnnotations[prevIndex].sectionId });
    };

    // Handle apply suggestion
    const handleApply = () => {
        if (activeAnnotation) {
            applyAnnotation(activeAnnotation.id, activeAnnotation.replacementText);
            goToNextAnnotation();
        }
    };

    // Handle dismiss
    const handleDismiss = () => {
        if (activeAnnotation) {
            dismissAnnotation(activeAnnotation.id);
        }
    };

    // Get pillar styling
    const getPillarStyle = (pillar: ATSPillar) => {
        const { color } = PILLAR_COLORS[pillar];
        return { color, backgroundColor: `${color}20` };
    };

    // ============================================================================
    // Render
    // ============================================================================

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-[#0a0d07] overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-white/10 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Workbench</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {SECTION_LABELS[activeSection] || 'Select a section'}
                        </p>
                    </div>

                    {/* Navigation Arrows */}
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={goToPrevAnnotation}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                            title="Previous suggestion"
                        >
                            <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                            onClick={goToNextAnnotation}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                            title="Next suggestion"
                        >
                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto" ref={formRef}>
                {activeAnnotation ? (
                    <div className="p-4 space-y-4">
                        {/* Active Suggestion Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden"
                        >
                            {/* Suggestion Header */}
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Lightbulb className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                        Suggestion
                                    </span>
                                </div>
                                <div
                                    className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                                    style={getPillarStyle(activeAnnotation.pillar)}
                                >
                                    {activeAnnotation.pillar.replace(/([A-Z])/g, ' $1').trim()}
                                </div>
                            </div>

                            {/* Issue Description */}
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {activeAnnotation.issue}
                                </p>
                            </div>

                            {/* Before/After Comparison */}
                            <div className="px-4 py-3 space-y-3">
                                {/* Current Text */}
                                <div>
                                    <div className="flex items-center space-x-2 mb-1.5">
                                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            Current
                                        </span>
                                    </div>
                                    <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
                                        <p className="text-sm text-red-800 dark:text-red-300 line-through">
                                            {activeAnnotation.originalText || 'No original text'}
                                        </p>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="flex justify-center">
                                    <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                                </div>

                                {/* Suggested Text */}
                                <div>
                                    <div className="flex items-center space-x-2 mb-1.5">
                                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            Suggested
                                        </span>
                                        <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center space-x-0.5">
                                            <Sparkles className="w-3 h-3" />
                                            <span>+{activeAnnotation.impactScoreDelta} points</span>
                                        </span>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
                                        <p className="text-sm text-green-800 dark:text-green-300">
                                            {activeAnnotation.replacementText || 'No replacement text'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="px-4 py-3 bg-gray-50 dark:bg-[#0a0d07] flex items-center space-x-2">
                                <button
                                    onClick={handleApply}
                                    className="flex-1 px-4 py-2 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] text-black rounded-lg text-sm font-semibold transition-colors flex items-center justify-center space-x-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Apply</span>
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>

                        {/* Other Suggestions in Section */}
                        {sectionAnnotations.length > 1 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase px-1">
                                    Other issues in this section ({sectionAnnotations.length - 1})
                                </h4>
                                {sectionAnnotations
                                    .filter(a => a.id !== activeAnnotation.id)
                                    .slice(0, 3)
                                    .map(annotation => (
                                        <button
                                            key={annotation.id}
                                            onClick={() => dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: annotation.id })}
                                            className="w-full text-left p-3 bg-white dark:bg-[#141810] rounded-lg border border-gray-200 dark:border-white/5 hover:border-lime-500 dark:hover:border-[#80FF00] transition-colors"
                                        >
                                            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                                                {annotation.issue}
                                            </p>
                                            <div className="flex items-center space-x-2 mt-1.5">
                                                <span
                                                    className="px-1.5 py-0.5 rounded text-[9px] font-medium capitalize"
                                                    style={getPillarStyle(annotation.pillar)}
                                                >
                                                    {annotation.pillar.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // Empty State
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-lime-100 dark:bg-[#80FF00]/20 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-lime-600 dark:text-[#80FF00]" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            All suggestions reviewed!
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px]">
                            Click on a pillar in the scorecard or an annotation in the preview to start reviewing suggestions.
                        </p>
                    </div>
                )}
            </div>

            {/* Progress Footer */}
            <div className="bg-white dark:bg-[#141810] border-t border-gray-200 dark:border-white/10 px-4 py-2">
                <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500 dark:text-gray-400">
                        {state.annotations.filter(a => a.status === 'applied').length} applied
                    </span>
                    <div className="flex items-center space-x-2">
                        <div className="w-24 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-lime-500 dark:bg-[#80FF00] rounded-full transition-all"
                                style={{
                                    width: `${state.annotations.length > 0
                                            ? (state.annotations.filter(a => a.status !== 'open').length / state.annotations.length) * 100
                                            : 0
                                        }%`,
                                }}
                            />
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">
                            {state.annotations.filter(a => a.status === 'open').length} remaining
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
