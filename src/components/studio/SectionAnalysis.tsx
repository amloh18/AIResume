'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronRight,
    FileText,
    Briefcase,
    GraduationCap,
    Code,
    FolderOpen,
    Award,
    Globe,
    Heart,
    User,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

import type { StudioAnnotation, ATSPillar, PillarScores } from '@/types/studio';
import { PILLAR_COLORS } from '@/types/studio';
import { useStudio } from './StudioContext';
import { getAnnotationsBySection, sortBySeverity } from './utils/annotation-utils';

// ============================================================================
// Section Icons
// ============================================================================

const SECTION_ICONS: Record<string, React.ElementType> = {
    personal: User,
    work: Briefcase,
    education: GraduationCap,
    skills: Code,
    projects: FolderOpen,
    certificates: Award,
    languages: Globe,
    volunteer: Heart,
};

const SECTION_LABELS: Record<string, string> = {
    personal: 'Personal Info',
    work: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certificates: 'Certificates',
    languages: 'Languages',
    volunteer: 'Volunteer',
};

// ============================================================================
// Props
// ============================================================================

interface SectionAnalysisProps {
    sections?: string[];
    onSectionSelect?: (sectionId: string) => void;
}

// ============================================================================
// Section Score Card
// ============================================================================

interface SectionCardProps {
    sectionId: string;
    annotations: StudioAnnotation[];
    isExpanded: boolean;
    onToggle: () => void;
    onAnnotationSelect: (annotationId: string) => void;
    activeAnnotationId: string | null;
}

function SectionCard({
    sectionId,
    annotations,
    isExpanded,
    onToggle,
    onAnnotationSelect,
    activeAnnotationId,
}: SectionCardProps) {
    const Icon = SECTION_ICONS[sectionId] || FileText;
    const label = SECTION_LABELS[sectionId] || sectionId;

    // Calculate section stats
    const openAnnotations = annotations.filter(a => a.status === 'open');
    const appliedAnnotations = annotations.filter(a => a.status === 'applied');
    const totalPotentialPoints = openAnnotations.reduce((sum, a) => sum + a.impactScoreDelta, 0);

    // Group by pillar
    const pillarCounts: Partial<Record<ATSPillar, number>> = {};
    openAnnotations.forEach(a => {
        pillarCounts[a.pillar] = (pillarCounts[a.pillar] || 0) + 1;
    });

    const hasIssues = openAnnotations.length > 0;
    const allResolved = annotations.length > 0 && openAnnotations.length === 0;

    return (
        <div className="bg-white dark:bg-[#141810] rounded-lg border border-gray-200 dark:border-white/5 overflow-hidden">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>

                    {/* Status Indicator */}
                    {allResolved ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : hasIssues ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                            {openAnnotations.length}
                        </span>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    {/* Potential Points */}
                    {totalPotentialPoints > 0 && (
                        <span className="text-[10px] text-green-600 dark:text-green-400">
                            +{totalPotentialPoints} pts
                        </span>
                    )}

                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 dark:border-white/5 pt-2">
                            {/* Pillar Breakdown */}
                            {Object.keys(pillarCounts).length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {(Object.entries(pillarCounts) as [ATSPillar, number][]).map(([pillar, count]) => {
                                        const { color } = PILLAR_COLORS[pillar];
                                        return (
                                            <span
                                                key={pillar}
                                                className="px-1.5 py-0.5 rounded text-[9px] font-medium capitalize"
                                                style={{ backgroundColor: `${color}20`, color }}
                                            >
                                                {pillar.replace(/([A-Z])/g, ' $1').trim()}: {count}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Annotations List */}
                            {openAnnotations.length > 0 ? (
                                <div className="space-y-1.5">
                                    {sortBySeverity(openAnnotations).slice(0, 5).map(annotation => (
                                        <button
                                            key={annotation.id}
                                            onClick={() => onAnnotationSelect(annotation.id)}
                                            className={`w-full text-left p-2 rounded-md text-xs transition-colors ${activeAnnotationId === annotation.id
                                                    ? 'bg-lime-50 dark:bg-[#80FF00]/10 ring-1 ring-lime-500 dark:ring-[#80FF00]'
                                                    : 'bg-gray-50 dark:bg-[#1a230f] hover:bg-gray-100 dark:hover:bg-[#252a1f]'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-gray-700 dark:text-gray-300 line-clamp-2 flex-1">
                                                    {annotation.issue}
                                                </p>
                                                <div
                                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                                                    style={{ backgroundColor: PILLAR_COLORS[annotation.pillar].color }}
                                                />
                                            </div>
                                        </button>
                                    ))}

                                    {openAnnotations.length > 5 && (
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center py-1">
                                            +{openAnnotations.length - 5} more suggestions
                                        </p>
                                    )}
                                </div>
                            ) : allResolved ? (
                                <div className="flex items-center justify-center gap-2 py-3 text-green-600 dark:text-green-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-xs font-medium">All suggestions applied!</span>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                                    No suggestions for this section
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SectionAnalysis({
    sections = ['personal', 'work', 'education', 'skills', 'projects', 'certificates', 'languages', 'volunteer'],
    onSectionSelect,
}: SectionAnalysisProps) {
    const { state, dispatch, selectAnnotation } = useStudio();
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['work', 'skills']));

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    const handleAnnotationSelect = (annotationId: string) => {
        selectAnnotation(annotationId);
        const annotation = state.annotations.find(a => a.id === annotationId);
        if (annotation && onSectionSelect) {
            onSectionSelect(annotation.sectionId);
        }
    };

    // Filter sections that have annotations or data
    const activeSections = sections.filter(sectionId => {
        const sectionAnnotations = getAnnotationsBySection(state.annotations, sectionId);
        return sectionAnnotations.length > 0;
    });

    // Calculate overall stats
    const totalOpen = state.annotations.filter(a => a.status === 'open').length;
    const totalApplied = state.annotations.filter(a => a.status === 'applied').length;
    const totalPotentialPoints = state.annotations
        .filter(a => a.status === 'open')
        .reduce((sum, a) => sum + a.impactScoreDelta, 0);

    return (
        <div className="space-y-3">
            {/* Overall Stats Header */}
            <div className="bg-white dark:bg-[#141810] rounded-lg border border-gray-200 dark:border-white/5 p-3">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                        Section Analysis
                    </h4>
                    <div className="flex items-center gap-3 text-[10px]">
                        {totalOpen > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {totalOpen} open
                            </span>
                        )}
                        {totalApplied > 0 && (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {totalApplied} applied
                            </span>
                        )}
                    </div>
                </div>

                {totalPotentialPoints > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        Potential gain: <span className="font-semibold text-green-600 dark:text-green-400">+{totalPotentialPoints} points</span>
                    </div>
                )}
            </div>

            {/* Section Cards */}
            {activeSections.length > 0 ? (
                <div className="space-y-2">
                    {activeSections.map(sectionId => (
                        <SectionCard
                            key={sectionId}
                            sectionId={sectionId}
                            annotations={getAnnotationsBySection(state.annotations, sectionId)}
                            isExpanded={expandedSections.has(sectionId)}
                            onToggle={() => toggleSection(sectionId)}
                            onAnnotationSelect={handleAnnotationSelect}
                            activeAnnotationId={state.activeAnnotationId}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Looking great!
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        No suggestions found. Your CV is well-optimized.
                    </p>
                </div>
            )}
        </div>
    );
}
