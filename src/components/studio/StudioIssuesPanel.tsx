'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    CheckCircle,
} from 'lucide-react';
import type { FixAnnotation, FixCategory } from '@/components/resume-enhancer/annotations/fix-annotation';
import { getFieldPathLabel } from '@/lib/utils/fieldPathLabels';
import { AnimatedScore, AnimatedProgressBar } from '@/components/ui/AnimatedScore';

// ============================================================================
// Props
// ============================================================================

interface StudioIssuesPanelProps {
    fixAnnotations: FixAnnotation[];
    activeFixId: string | null;
    onSelectFix: (fixId: string) => void;
    atsScore: number | null;
    cvScore: number;
    isLoading?: boolean;
    onRefresh?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_LABELS: Record<FixCategory, string> = {
    impact: 'Impact',
    keywords: 'Keywords',
    clarity: 'Clarity',
    formatting: 'Formatting',
    grammar: 'Grammar',
    structure: 'Structure',
    other: 'Other',
};

// ============================================================================
// Sub-components
// ============================================================================

interface FixRowProps {
    fix: FixAnnotation;
    isActive: boolean;
    onClick: () => void;
    disabled?: boolean;
}

function FixRow({ fix, isActive, onClick, disabled = false }: FixRowProps) {
    const location = getFieldPathLabel(fix.fieldPath);
    const catLabel = CATEGORY_LABELS[fix.category] || fix.category;
    const isSemanticMatch = fix.status === 'semantic_match';

    // Determine icon and color based on status
    let IconComponent: typeof CheckCircle2 | typeof AlertTriangle | typeof CheckCircle;
    let iconColor: string;

    if (disabled || fix.status === 'applied') {
        IconComponent = CheckCircle2;
        iconColor = 'text-emerald-400';
    } else if (isSemanticMatch) {
        IconComponent = CheckCircle;
        iconColor = 'text-yellow-400';
    } else if (fix.severity === 'high') {
        IconComponent = AlertTriangle;
        iconColor = 'text-red-400';
    } else {
        IconComponent = AlertTriangle;
        iconColor = 'text-amber-400';
    }

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                'w-full text-left rounded-xl px-3 py-2 transition-colors border',
                disabled
                    ? 'opacity-60 cursor-not-allowed border-transparent'
                    : isActive
                        ? 'bg-[#80FF00]/10 border-[#80FF00]/40'
                        : 'bg-white/0 hover:bg-white/5 border-white/10',
            ].join(' ')}
        >
            <div className="flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0">
                    <IconComponent className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-gray-900 dark:text-white break-words line-clamp-2">
                        {fix.issue}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/80">
                            {catLabel}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/80">
                            {location}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/80 tabular-nums">
                            +{fix.impactScoreDelta || 0}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}

interface BucketProps {
    title: string;
    count: number;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    badgeClassName: string;
}

function Bucket({ title, count, expanded, onToggle, children, badgeClassName }: BucketProps) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{title}</span>
                    <span className={['text-[10px] px-2 py-0.5 rounded-full font-semibold', badgeClassName].join(' ')}>
                        {count}
                    </span>
                </div>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-white/60" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-white/60" />
                )}
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 pt-0 space-y-2">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function StudioIssuesPanel({
    fixAnnotations,
    activeFixId,
    onSelectFix,
    atsScore,
    cvScore,
    isLoading = false,
    onRefresh,
}: StudioIssuesPanelProps) {
    const [isCriticalExpanded, setIsCriticalExpanded] = useState(true);
    const [isImprovementsExpanded, setIsImprovementsExpanded] = useState(true);
    const [isGoodExpanded, setIsGoodExpanded] = useState(false);

    // Categorize fixes
    const openFixes = useMemo(
        () => fixAnnotations.filter((f) => f.status === 'open'),
        [fixAnnotations]
    );

    const appliedFixes = useMemo(
        () => fixAnnotations.filter((f) => f.status === 'applied'),
        [fixAnnotations]
    );

    const criticalFixes = useMemo(() => {
        return openFixes
            .filter((f) => f.severity === 'high')
            .sort((a, b) => (b.impactScoreDelta || 0) - (a.impactScoreDelta || 0));
    }, [openFixes]);

    const improvementFixes = useMemo(() => {
        return openFixes
            .filter((f) => f.severity !== 'high')
            .sort((a, b) => (b.impactScoreDelta || 0) - (a.impactScoreDelta || 0));
    }, [openFixes]);

    const displayScore = atsScore !== null ? atsScore : cvScore;
    const scoreLabel = atsScore !== null ? 'ATS Score' : 'CV Score';

    return (
        <div className="h-full flex flex-col bg-white dark:bg-[#141810] border-r border-gray-200 dark:border-white/10">
            {/* Score Header */}
            <div className="p-4 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {scoreLabel}
                    </span>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh Analysis"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
                <div className="flex items-baseline gap-2">
                    <AnimatedScore value={displayScore} suffix="/100" size="lg" showChange={true} />
                </div>
                <div className="mt-2">
                    <AnimatedProgressBar
                        value={displayScore}
                        height={8}
                        showLabel={false}
                        colorStops={[
                            { threshold: 0, color: '#ef4444' },
                            { threshold: 50, color: '#f59e0b' },
                            { threshold: 70, color: '#80FF00' },
                        ]}
                    />
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-red-400">{criticalFixes.length} critical</span>
                    <span className="text-amber-400">{improvementFixes.length} improvements</span>
                </div>
            </div>

            {/* Fix Buckets */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Critical */}
                <Bucket
                    title="Critical"
                    count={criticalFixes.length}
                    expanded={isCriticalExpanded}
                    onToggle={() => setIsCriticalExpanded((v) => !v)}
                    badgeClassName="bg-red-500/20 text-red-300"
                >
                    {criticalFixes.length === 0 ? (
                        <div className="text-xs text-white/50 italic">No critical fixes.</div>
                    ) : (
                        criticalFixes.map((fix) => (
                            <FixRow
                                key={fix.id}
                                fix={fix}
                                isActive={activeFixId === fix.id}
                                onClick={() => onSelectFix(fix.id)}
                            />
                        ))
                    )}
                </Bucket>

                {/* Improvements */}
                <Bucket
                    title="Improvements"
                    count={improvementFixes.length}
                    expanded={isImprovementsExpanded}
                    onToggle={() => setIsImprovementsExpanded((v) => !v)}
                    badgeClassName="bg-amber-500/20 text-amber-200"
                >
                    {improvementFixes.length === 0 ? (
                        <div className="text-xs text-white/50 italic">No improvements available.</div>
                    ) : (
                        improvementFixes.map((fix) => (
                            <FixRow
                                key={fix.id}
                                fix={fix}
                                isActive={activeFixId === fix.id}
                                onClick={() => onSelectFix(fix.id)}
                            />
                        ))
                    )}
                </Bucket>

                {/* Good */}
                <Bucket
                    title="Good"
                    count={appliedFixes.length}
                    expanded={isGoodExpanded}
                    onToggle={() => setIsGoodExpanded((v) => !v)}
                    badgeClassName="bg-emerald-500/20 text-emerald-200"
                >
                    {appliedFixes.length === 0 ? (
                        <div className="text-xs text-white/50 italic">No applied fixes yet.</div>
                    ) : (
                        appliedFixes.slice(0, 20).map((fix) => (
                            <FixRow
                                key={fix.id}
                                fix={fix}
                                isActive={activeFixId === fix.id}
                                onClick={() => onSelectFix(fix.id)}
                                disabled={true}
                            />
                        ))
                    )}
                </Bucket>
            </div>
        </div>
    );
}
