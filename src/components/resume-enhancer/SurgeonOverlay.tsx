'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { Sparkles, Target, TrendingUp, CheckCircle2, XCircle, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import MagicFixButton from './MagicFixButton';
import SimulatedCVToggle from './components/SimulatedCVToggle';

const SECTION_LABELS: Record<string, string> = {
    'basics': 'Personal Info',
    'summary': 'Professional Summary',
    'work': 'Work Experience',
    'education': 'Education',
    'skills': 'Skills',
    'projects': 'Projects',
    'certificates': 'Certifications',
    'languages': 'Languages',
    'volunteer': 'Volunteer',
    'awards': 'Awards',
    'publications': 'Publications',
    'interests': 'Interests',
    'references': 'References'
};

const SECTION_COLORS: Record<string, string> = {
    'basics': 'from-blue-500/20 to-blue-600/20',
    'summary': 'from-purple-500/20 to-purple-600/20',
    'work': 'from-green-500/20 to-green-600/20',
    'education': 'from-yellow-500/20 to-yellow-600/20',
    'skills': 'from-pink-500/20 to-pink-600/20',
    'projects': 'from-indigo-500/20 to-indigo-600/20',
    'certificates': 'from-cyan-500/20 to-cyan-600/20',
    'default': 'from-gray-500/20 to-gray-600/20'
};

interface SurgicalFixCardProps {
    fix: any;
    onApply: (fixId: string) => void;
    onDismiss: (fixId: string) => void;
    isApplying: boolean;
}

function SurgicalFixCard({ fix, onApply, onDismiss, isApplying }: SurgicalFixCardProps) {
    const [showDiff, setShowDiff] = useState(false);
    const sectionKey = fix.section?.toLowerCase().replace(/\s+/g, '_') || 'default';
    const colorClass = SECTION_COLORS[sectionKey] || SECTION_COLORS.default;

    const getImpactColor = (delta: number) => {
        if (delta >= 10) return 'text-red-400 bg-red-500/20';
        if (delta >= 5) return 'text-yellow-400 bg-yellow-500/20';
        return 'text-green-400 bg-green-500/20';
    };

    const getImpactLabel = (delta: number) => {
        if (delta >= 10) return 'Critical';
        if (delta >= 5) return 'High';
        return 'Medium';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-3 transition-all shadow-sm shadow-black/10 dark:shadow-black/30"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full bg-gradient-to-r ${colorClass} shadow-sm shadow-black/10 dark:shadow-black/30`}>
                        {SECTION_LABELS[sectionKey] || fix.section}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full shadow-sm shadow-black/10 dark:shadow-black/30 ${getImpactColor(fix.impact_score_delta)}`}>
                        +{fix.impact_score_delta} • {getImpactLabel(fix.impact_score_delta)}
                    </span>
                </div>
            </div>

            {/* Issue */}
            <div className="mb-3">
                <p className="text-sm text-[color:var(--text-secondary)] mb-2">
                    <span className="text-red-400 font-medium">Issue:</span> {fix.issue}
                </p>
            </div>

            {/* Before/After */}
            <div className="space-y-2 mb-4">
                <button
                    onClick={() => setShowDiff(!showDiff)}
                    className="text-xs text-[color:var(--accent-primary)] hover:underline flex items-center gap-1"
                >
                    {showDiff ? 'Hide' : 'Show'} Before/After
                    <ChevronRight className={`w-3 h-3 transition-transform ${showDiff ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                    {showDiff && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-2 overflow-hidden"
                        >
                            <div className="bg-red-500/10 rounded p-2 shadow-sm shadow-black/10 dark:shadow-black/30">
                                <p className="text-xs text-red-300 font-medium mb-1">Before:</p>
                                <p className="text-xs text-[color:var(--text-tertiary)] line-through">{fix.original_text}</p>
                            </div>
                            <div className="bg-green-500/10 rounded p-2 shadow-sm shadow-black/10 dark:shadow-black/30">
                                <p className="text-xs text-green-300 font-medium mb-1">After:</p>
                                <p className="text-xs text-[color:var(--text-secondary)]">{fix.fixed_text}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={() => onApply(fix.id)}
                    disabled={isApplying || fix.status === 'accepted'}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${fix.status === 'accepted'
                        ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                        : 'bg-[var(--accent-primary)] text-black hover:bg-[var(--accent-hover)] active:scale-95'
                        }`}
                >
                    {isApplying ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Applying...
                        </>
                    ) : fix.status === 'accepted' ? (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Applied
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Apply Fix
                        </>
                    )}
                </button>
                {fix.status !== 'accepted' && (
                    <button
                        onClick={() => onDismiss(fix.id)}
                        disabled={isApplying}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-black/5 dark:bg-white/5 text-[color:var(--text-secondary)] hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all"
                    >
                        Dismiss
                    </button>
                )}
            </div>
        </motion.div>
    );
}

export default function SurgeonOverlay() {
    const { state, dispatch, runCVSurgeon } = useResumeEnhancer();
    const [filterMode, setFilterMode] = useState<'all' | 'high' | 'quick'>('all');
    const [applyingFixId, setApplyingFixId] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const filteredFixes = state.surgicalFixes.filter(fix => {
        if (filterMode === 'high') return fix.impact_score_delta >= 10;
        if (filterMode === 'quick') return fix.impact_score_delta >= 5 && fix.impact_score_delta < 10;
        return true;
    });

    const pendingFixes = state.surgicalFixes.filter(f => f.status === 'pending');
    const acceptedFixes = state.surgicalFixes.filter(f => f.status === 'accepted');

    const handleApplyFix = async (fixId: string) => {
        setApplyingFixId(fixId);

        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 500));

        dispatch({ type: 'APPLY_SURGICAL_FIX', payload: fixId });
        setApplyingFixId(null);
    };

    const handleDismissFix = (fixId: string) => {
        dispatch({ type: 'UPDATE_SURGICAL_FIX_STATUS', payload: { id: fixId, status: 'rejected' } });
    };

    const handleReanalyze = () => {
        runCVSurgeon();
    };

    return (
        <div className="h-full flex flex-col bg-[var(--bg-secondary)] shadow-[ -1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[ -1px_0_0_rgba(255,255,255,0.06)]">
            {/* Header */}
            <div className="p-4 shadow-sm shadow-black/10 dark:shadow-black/30">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[color:var(--accent-primary)]" />
                        CV Surgeon
                    </h2>
                    {state.isAnalyzing && (
                        <Loader2 className="w-5 h-5 text-[color:var(--accent-primary)] animate-spin" />
                    )}
                </div>



                {/* Simulated CV Toggle */}
                {state.strategicFixAvailable && (
                    <div className="mb-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                        <SimulatedCVToggle
                            isSimulated={state.showSimulatedCV || false}
                            onToggle={(simulated) => dispatch({ type: 'TOGGLE_SIMULATED_CV', payload: simulated })}
                            strategicFixRequired={state.cvScore < 75}
                        />
                    </div>
                )}

                {/* Magic Fix Button */}
                <div className="mb-4">
                    <MagicFixButton />
                </div>

                {/* Target Role & Seniority */}
                {state.targetRole && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] rounded-full px-3 py-1 shadow-sm shadow-black/10 dark:shadow-black/30">
                            <Target className="w-3 h-3 text-blue-400" />
                            <span className="text-xs text-[color:var(--text-secondary)]">{state.targetRole}</span>
                        </div>
                        {state.seniorityLevel && (
                            <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] rounded-full px-3 py-1 shadow-sm shadow-black/10 dark:shadow-black/30">
                                <TrendingUp className="w-3 h-3 text-purple-400" />
                                <span className="text-xs text-[color:var(--text-secondary)]">{state.seniorityLevel}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    {[
                        { id: 'all', label: 'All Fixes', count: filteredFixes.length },
                        { id: 'high', label: 'High Impact', count: state.surgicalFixes.filter(f => f.impact_score_delta >= 10).length },
                        { id: 'quick', label: 'Quick Wins', count: state.surgicalFixes.filter(f => f.impact_score_delta >= 5 && f.impact_score_delta < 10).length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterMode(tab.id as any)}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterMode === tab.id
                                ? 'bg-[var(--accent-primary)] text-black'
                                : 'bg-[var(--bg-tertiary)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]'
                                }`}
                        >
                            {tab.label}
                            <span className="ml-1 opacity-70">({tab.count})</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Fixes List */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
                {state.isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center h-full text-[color:var(--text-tertiary)]">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-[color:var(--accent-primary)]" />
                        <p className="text-sm">Analyzing your CV...</p>
                    </div>
                ) : filteredFixes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-400 mb-3" />
                        <h3 className="text-lg font-semibold text-[color:var(--text-primary)] mb-2">Looking Great!</h3>
                        <p className="text-sm text-[color:var(--text-tertiary)] mb-4 max-w-xs">
                            {pendingFixes.length === 0 && acceptedFixes.length > 0
                                ? "You've applied all suggested fixes. Your CV is optimized!"
                                : "No issues found in this category. Try other filters or re-analyze."}
                        </p>
                        {!state.isAnalyzing && (
                            <button
                                onClick={handleReanalyze}
                                className="px-4 py-2 bg-[var(--accent-primary)] text-black rounded-lg font-medium text-sm hover:bg-[var(--accent-hover)] active:scale-95 transition-all"
                            >
                                Re-analyze CV
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {filteredFixes.map(fix => (
                                <SurgicalFixCard
                                    key={fix.id}
                                    fix={fix}
                                    onApply={handleApplyFix}
                                    onDismiss={handleDismissFix}
                                    isApplying={applyingFixId === fix.id}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            {!state.isAnalyzing && state.surgicalFixes.length > 0 && (
                <div className="p-4 bg-[var(--bg-tertiary)] shadow-[0_-1px_0_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_0_rgba(255,255,255,0.06)]">
                    <div className="flex items-center justify-between text-xs text-[color:var(--text-tertiary)]">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                Pending: {pendingFixes.length}
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                Applied: {acceptedFixes.length}
                            </span>
                        </div>
                        <button
                            onClick={handleReanalyze}
                            className="text-[color:var(--accent-primary)] hover:underline"
                        >
                            Re-analyze
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
