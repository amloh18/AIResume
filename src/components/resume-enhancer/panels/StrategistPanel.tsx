'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    CheckCircle,
    Zap,
    Plus,
    Briefcase,
} from 'lucide-react';
import type { AnalysisMode } from '@/lib/utils/analysis-mode';
import type { ATSResult } from './ScorecardPanel';

// ============================================================================
// Types
// ============================================================================

interface StrategistPanelProps {
    atsResult: ATSResult | null;
    jobData: any | null;
    onAddKeyword?: (keyword: string) => void;
    analysisMode: AnalysisMode;
    compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function StrategistPanel({
    atsResult,
    jobData,
    onAddKeyword,
    analysisMode,
    compact = false,
}: StrategistPanelProps) {
    // Don't show keywords for role-based or insufficient-data modes
    if (analysisMode === 'role-based' || analysisMode === 'insufficient-data') {
        return null;
    }

    if (!atsResult) {
        return (
            <div className={`${compact ? 'p-3' : 'p-4'} flex items-center justify-center`}>
                <p className="text-sm text-gray-400">Run analysis to see suggestions</p>
            </div>
        );
    }

    const { details, suggestions } = atsResult;
    const missingKeywords = details?.missingKeywords || [];
    const matchedKeywords = details?.matchedKeywords || [];

    return (
        <div className={`${compact ? 'space-y-3' : 'space-y-4'}`}>
            {/* Missing Keywords */}
            {missingKeywords.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-red-400 uppercase flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Missing Keywords ({missingKeywords.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                        {missingKeywords.slice(0, 15).map((keyword: string, idx: number) => (
                            <motion.button
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.03 }}
                                onClick={() => onAddKeyword?.(keyword)}
                                className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 transition-colors flex items-center gap-1 group"
                                title={`Add "${keyword}" to CV`}
                            >
                                <span>{keyword}</span>
                                <Plus className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.button>
                        ))}
                        {missingKeywords.length > 15 && (
                            <span className="px-2 py-1 text-gray-500 text-[10px]">
                                +{missingKeywords.length - 15} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Matched Keywords */}
            {matchedKeywords.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-green-400 uppercase flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Matched Keywords ({matchedKeywords.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                        {matchedKeywords.slice(0, 10).map((keyword: string, idx: number) => (
                            <motion.span
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.03 }}
                                className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[10px]"
                            >
                                {keyword}
                            </motion.span>
                        ))}
                        {matchedKeywords.length > 10 && (
                            <span className="px-2 py-1 text-gray-500 text-[10px]">
                                +{matchedKeywords.length - 10} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Suggestions */}
            {suggestions && suggestions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                    <h3 className="text-xs font-semibold text-[#80FF00] uppercase flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Suggestions
                    </h3>
                    <div className="space-y-1.5">
                        {suggestions.slice(0, 5).map((suggestion: string, idx: number) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="p-2 bg-[#80FF00]/10 border border-[#80FF00]/20 rounded-lg text-xs text-gray-300"
                            >
                                {suggestion}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Job Info */}
            {jobData && (
                <div className="pt-2 border-t border-white/10">
                    <h3 className="text-xs font-semibold text-gray-300 uppercase mb-2 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" />
                        Target Job
                    </h3>
                    <div className="text-xs text-gray-400">
                        <p className="font-medium text-gray-300">{jobData.jobTitle || jobData.title}</p>
                        <p>{jobData.company}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
