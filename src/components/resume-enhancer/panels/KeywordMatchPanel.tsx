'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Target,
    Sparkles,
    AlertCircle,
} from 'lucide-react';
import type { AnalysisMode } from '@/lib/utils/analysis-mode';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { ATSResult } from './ScorecardPanel';
import StrategistPanel from './StrategistPanel';

// ============================================================================
// Types
// ============================================================================

interface KeywordMatchPanelProps {
    analysisMode: AnalysisMode;
    atsResult: ATSResult | null;
    cvData: UnifiedCVDataStructure | null;
    jobData: any | null;
    onAddKeyword?: (keyword: string) => void;
    onAddJobDescription?: () => void;
    compact?: boolean;
}

// ============================================================================
// Mode-Specific Info Cards
// ============================================================================

function RoleBasedInfoCard({ onAddJobDescription }: { onAddJobDescription?: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20"
        >
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white mb-1">
                        Keyword Matching Requires Job Description
                    </h4>
                    <p className="text-xs text-gray-400 mb-3">
                        Add a job description to enable ATS keyword matching and see which keywords are missing from your CV.
                    </p>
                    {onAddJobDescription && (
                        <button
                            onClick={onAddJobDescription}
                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                            <Target className="w-3.5 h-3.5" />
                            <span>Add Job Description</span>
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function InsufficientDataCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
        >
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white mb-1">
                        Analysis Setup Required
                    </h4>
                    <p className="text-xs text-gray-400">
                        Set your target role or add a job description to enable CV analysis and keyword matching.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

function MasterCVInfoCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
        >
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white mb-1">
                        Master CV - Role-Based Analysis
                    </h4>
                    <p className="text-xs text-gray-400">
                        Master CVs are optimized for your target role, not specific job descriptions. Create a Journey CV from this Master to enable job-specific keyword matching.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function KeywordMatchPanel({
    analysisMode,
    atsResult,
    cvData,
    jobData,
    onAddKeyword,
    onAddJobDescription,
    compact = false,
}: KeywordMatchPanelProps) {
    // For JD-based or hybrid modes, show the full StrategistPanel with keywords
    if (analysisMode === 'jd-based' || analysisMode === 'hybrid') {
        return (
            <div className={compact ? 'p-3' : 'p-4'}>
                <StrategistPanel
                    atsResult={atsResult}
                    jobData={jobData}
                    onAddKeyword={onAddKeyword}
                    analysisMode={analysisMode}
                    compact={compact}
                />
            </div>
        );
    }

    // For role-based mode, show info card explaining why keywords aren't available
    if (analysisMode === 'role-based') {
        return (
            <div className={compact ? 'p-3' : 'p-4'}>
                <RoleBasedInfoCard onAddJobDescription={onAddJobDescription} />
            </div>
        );
    }

    // For insufficient-data mode, show setup prompt
    if (analysisMode === 'insufficient-data') {
        return (
            <div className={compact ? 'p-3' : 'p-4'}>
                <InsufficientDataCard />
            </div>
        );
    }

    // Fallback - shouldn't reach here
    return null;
}
