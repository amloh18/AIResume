'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    FileText,
    Sparkles,
    Type,
    Hash,
    Layout,
    BookOpen,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';

import { useStudio } from '../StudioContext';
import { ATSPillar, PILLAR_COLORS } from '@/types/studio';

// ============================================================================
// Pillar Icon Map
// ============================================================================

const PILLAR_ICONS: Record<ATSPillar, React.ElementType> = {
    completeness: FileText,
    impactVerbs: Sparkles,
    quantification: Hash,
    formatting: Layout,
    readability: BookOpen,
};

// ============================================================================
// Component
// ============================================================================

export default function ScorecardPane() {
    const { state, dispatch, filterByPillar, selectAnnotation } = useStudio();
    const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(['pillars']));

    // ============================================================================
    // Handlers
    // ============================================================================

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

    // Calculate totals
    const totalPillarScore = Object.values(state.pillarScores).reduce((sum, score) => sum + score, 0);
    const openAnnotations = state.annotations.filter(a => a.status === 'open');
    const appliedAnnotations = state.annotations.filter(a => a.status === 'applied');

    // Get annotations by pillar
    const getAnnotationsByPillar = (pillar: ATSPillar) => {
        return openAnnotations.filter(a => a.pillar === pillar);
    };

    // Get score color
    const getScoreColor = (score: number, max: number = 20) => {
        const percent = (score / max) * 100;
        if (percent >= 80) return 'text-green-500';
        if (percent >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getProgressColor = (score: number, max: number = 20) => {
        const percent = (score / max) * 100;
        if (percent >= 80) return 'bg-green-500';
        if (percent >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    // ============================================================================
    // Render
    // ============================================================================

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-[#0a0d07] overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-white/10 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Scorecard</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {openAnnotations.length} fixes available
                </p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Overall Score */}
                <div className="bg-white dark:bg-[#141810] rounded-xl p-4 border border-gray-200 dark:border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Overall Score</span>
                        <span className={`text-2xl font-bold ${getScoreColor(totalPillarScore, 100)}`}>
                            {totalPillarScore}
                        </span>
                    </div>
                    <div className="relative h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${totalPillarScore}%` }}
                            transition={{ duration: 0.5 }}
                            className={`absolute h-full rounded-full ${getProgressColor(totalPillarScore, 100)}`}
                        />
                    </div>

                    {/* Progress Stats */}
                    <div className="flex items-center justify-between mt-3 text-[10px]">
                        <div className="flex items-center space-x-1 text-green-500">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{appliedAnnotations.length} applied</span>
                        </div>
                        <div className="flex items-center space-x-1 text-amber-500">
                            <AlertCircle className="w-3 h-3" />
                            <span>{openAnnotations.length} remaining</span>
                        </div>
                    </div>
                </div>

                {/* 5 Pillars Section */}
                <div className="bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                    <button
                        onClick={() => toggleSection('pillars')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">ATS Pillars</span>
                        {expandedSections.has('pillars') ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                    </button>

                    {expandedSections.has('pillars') && (
                        <div className="px-4 pb-3 space-y-2">
                            {(Object.entries(state.pillarScores) as [ATSPillar, number][]).map(([pillar, score]) => {
                                const Icon = PILLAR_ICONS[pillar];
                                const { color } = PILLAR_COLORS[pillar];
                                const pillarAnnotations = getAnnotationsByPillar(pillar);
                                const isActive = state.activePillar === pillar;

                                return (
                                    <motion.div
                                        key={pillar}
                                        className={`p-2.5 rounded-lg cursor-pointer transition-all ${isActive
                                                ? 'bg-lime-50 dark:bg-[#80FF00]/10 ring-1 ring-lime-500 dark:ring-[#80FF00]'
                                                : 'bg-gray-50 dark:bg-[#1a230f] hover:bg-gray-100 dark:hover:bg-[#252a1f]'
                                            }`}
                                        onClick={() => filterByPillar(isActive ? null : pillar)}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center space-x-2">
                                                <div
                                                    className="w-6 h-6 rounded-md flex items-center justify-center"
                                                    style={{ backgroundColor: `${color}20` }}
                                                >
                                                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                                                </div>
                                                <span className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                                                    {pillar.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {pillarAnnotations.length > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                                        {pillarAnnotations.length}
                                                    </span>
                                                )}
                                                <span className={`text-xs font-semibold ${getScoreColor(score)}`}>
                                                    {score}/20
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${(score / 20) * 100}%`,
                                                    backgroundColor: color,
                                                }}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Active Pillar Suggestions */}
                {state.activePillar && (
                    <div className="bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/5">
                            <h4 className="text-xs font-semibold text-gray-900 dark:text-white capitalize flex items-center space-x-2">
                                <span>{state.activePillar.replace(/([A-Z])/g, ' $1').trim()} Issues</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                                    {getAnnotationsByPillar(state.activePillar).length}
                                </span>
                            </h4>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            {getAnnotationsByPillar(state.activePillar).map((annotation, idx) => (
                                <button
                                    key={annotation.id}
                                    onClick={() => selectAnnotation(annotation.id)}
                                    className={`w-full text-left px-4 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${state.activeAnnotationId === annotation.id
                                            ? 'bg-lime-50 dark:bg-[#80FF00]/10'
                                            : ''
                                        }`}
                                >
                                    <p className="text-xs text-gray-900 dark:text-white line-clamp-2">
                                        {annotation.issue}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${annotation.severity === 'high'
                                                ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                                : annotation.severity === 'medium'
                                                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                                            }`}>
                                            {annotation.severity}
                                        </span>
                                        {annotation.impactScoreDelta > 0 && (
                                            <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center space-x-0.5">
                                                <TrendingUp className="w-3 h-3" />
                                                <span>+{annotation.impactScoreDelta}</span>
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}

                            {getAnnotationsByPillar(state.activePillar).length === 0 && (
                                <div className="px-4 py-6 text-center">
                                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        All {state.activePillar} issues resolved!
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
