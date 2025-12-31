'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, Sparkles, AlertTriangle, Info } from 'lucide-react';
import type { StudioAnnotation, ATSPillar } from '@/types/studio';
import { PILLAR_COLORS } from '@/types/studio';

// ============================================================================
// Props
// ============================================================================

interface StudioAnnotationCardProps {
    annotation: StudioAnnotation;
    isActive?: boolean;
    variant?: 'compact' | 'full';
    onSelect?: () => void;
    onApply?: () => void;
    onDismiss?: () => void;
}

// ============================================================================
// Severity Icon
// ============================================================================

const SeverityIcon: React.FC<{ severity: 'low' | 'medium' | 'high' }> = ({ severity }) => {
    switch (severity) {
        case 'high':
            return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
        case 'medium':
            return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
        default:
            return <Info className="w-3.5 h-3.5 text-blue-500" />;
    }
};

// ============================================================================
// Pillar Badge
// ============================================================================

interface PillarBadgeProps {
    pillar: ATSPillar;
    size?: 'sm' | 'md';
}

export const PillarBadge: React.FC<PillarBadgeProps> = ({ pillar, size = 'sm' }) => {
    const { color } = PILLAR_COLORS[pillar];
    const sizeClasses = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1';

    return (
        <span
            className={`${sizeClasses} rounded-full font-medium capitalize`}
            style={{ backgroundColor: `${color}20`, color }}
        >
            {pillar.replace(/([A-Z])/g, ' $1').trim()}
        </span>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export default function StudioAnnotationCard({
    annotation,
    isActive = false,
    variant = 'full',
    onSelect,
    onApply,
    onDismiss,
}: StudioAnnotationCardProps) {
    const { color } = PILLAR_COLORS[annotation.pillar];

    // Compact variant for lists
    if (variant === 'compact') {
        return (
            <motion.button
                onClick={onSelect}
                className={`w-full text-left p-3 rounded-lg border transition-all ${isActive
                        ? 'bg-lime-50 dark:bg-[#80FF00]/10 border-lime-500 dark:border-[#80FF00]'
                        : 'bg-white dark:bg-[#141810] border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                    }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-900 dark:text-white line-clamp-2 mb-1.5">
                            {annotation.issue}
                        </p>
                        <div className="flex items-center gap-2">
                            <PillarBadge pillar={annotation.pillar} />
                            <SeverityIcon severity={annotation.severity} />
                            {annotation.impactScoreDelta > 0 && (
                                <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5">
                                    <Sparkles className="w-3 h-3" />
                                    +{annotation.impactScoreDelta}
                                </span>
                            )}
                        </div>
                    </div>
                    <div
                        className="w-1 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                    />
                </div>
            </motion.button>
        );
    }

    // Full variant with before/after
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`bg-white dark:bg-[#141810] rounded-xl border overflow-hidden ${isActive
                    ? 'border-lime-500 dark:border-[#80FF00] shadow-lg shadow-lime-500/10 dark:shadow-[#80FF00]/10'
                    : 'border-gray-200 dark:border-white/5'
                }`}
        >
            {/* Header */}
            <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: `2px solid ${color}` }}
            >
                <div className="flex items-center gap-2">
                    <SeverityIcon severity={annotation.severity} />
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        Suggestion
                    </span>
                </div>
                <PillarBadge pillar={annotation.pillar} size="md" />
            </div>

            {/* Issue Description */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    {annotation.issue}
                </p>
            </div>

            {/* Before/After Comparison */}
            <div className="px-4 py-3 space-y-3">
                {/* Current Text */}
                {annotation.originalText && (
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                Current
                            </span>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
                            <p className="text-sm text-red-800 dark:text-red-300 line-through">
                                {annotation.originalText}
                            </p>
                        </div>
                    </div>
                )}

                {/* Arrow */}
                <div className="flex justify-center">
                    <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                </div>

                {/* Suggested Text */}
                {annotation.replacementText && (
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                Suggested
                            </span>
                            {annotation.impactScoreDelta > 0 && (
                                <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5">
                                    <Sparkles className="w-3 h-3" />
                                    +{annotation.impactScoreDelta} points
                                </span>
                            )}
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
                            <p className="text-sm text-green-800 dark:text-green-300">
                                {annotation.replacementText}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-[#0a0d07] flex items-center gap-2">
                <button
                    onClick={onApply}
                    className="flex-1 px-4 py-2 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] text-black rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Apply
                </button>
                <button
                    onClick={onDismiss}
                    className="px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                    <XCircle className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}
