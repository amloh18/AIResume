'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle,
    AlertCircle,
    BarChart3,
    FileText,
    Zap,
    Target,
} from 'lucide-react';
import type { AnalysisMode } from '@/lib/utils/analysis-mode';
import type { ScoreResult, CVScoreBreakdown, ATSScoreBreakdown } from '@/lib/utils/cv-scoring';

// ============================================================================
// Types
// ============================================================================

interface FactorBreakdown {
    hardKeywords?: { score: number; weight: number; matched: number; total: number };
    jobTitles?: { score: number; weight: number; matched: boolean };
    experienceLength?: { score: number; weight: number; years: number };
    formatting?: { score: number; weight: number; issues: string[] };
    softSkills?: { score: number; weight: number; matched: number; total: number };
}

interface KnockOutFactors {
    fileFormat?: { passed: boolean; issue?: string };
    sectionHeaders?: { passed: boolean; issues: string[] };
    contactInfo?: { passed: boolean; issues: string[] };
}

interface ProfileLevel {
    title: string;
    yearsExperience: number;
    description: string;
}

// Breakdown Interface matching API
interface BreakdownMetrics {
    C: number; // Completeness or Contactability
    I?: number; // Impact Verbs
    Q?: number; // Quantification
    F: number; // Formatting
    R: number; // Readability or Recency
    K?: number; // Keywords
    S?: number; // Section Alignment
}

export interface ATSResult {
    score: number;
    atsScore?: number;
    // New Structure from API
    audit_report?: {
        cv_profile_strength?: {
            score: number;
            breakdown: BreakdownMetrics;
        };
        ats_match_score?: {
            score: number;
            breakdown: BreakdownMetrics;
        };
    };
    // Legacy support (optional)
    profileLevel?: ProfileLevel;
    factorBreakdown?: FactorBreakdown;
    knockOutFactors?: KnockOutFactors;
    details?: {
        matchedKeywords: string[];
        missingKeywords: string[];
        experienceYears: number;
        educationLevel: string;
        formatIssues: string[];
    };
    suggestions?: string[];
}

interface ScorecardPanelProps {
    atsResult?: ATSResult | null; // Legacy support
    scoreResult?: ScoreResult | null; // New: CentralScoreManager result
    cvType?: 'master' | 'journey' | 'standalone'; // Determines which score to show
    isLoading: boolean;
    analysisMode: AnalysisMode;
    scoreLabel?: string;
    compact?: boolean;
    jobData?: any;
    onAddKeyword?: (keyword: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getScoreColor = (value: number, max: number = 100) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return 'text-green-400 bg-green-400';
    if (percentage >= 60) return 'text-yellow-400 bg-yellow-400';
    return 'text-red-400 bg-red-400';
};

const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-400';
    if (score >= 60) return 'from-yellow-500 to-yellow-400';
    return 'from-red-500 to-red-400';
};

// ============================================================================
// Component
// ============================================================================

export default function ScorecardPanel({
    atsResult,
    scoreResult,
    cvType = 'standalone',
    isLoading,
    analysisMode,
    scoreLabel = 'Score',
    compact = false,
    jobData,
    onAddKeyword
}: ScorecardPanelProps) {
    // 1. Move Helpers to Top of Component Scope
    const isJourneyCV = cvType === 'journey';
    const displayScore = scoreResult
        ? (isJourneyCV && scoreResult.atsScore ? scoreResult.atsScore.total : scoreResult.cvScore.total)
        : (atsResult?.score ?? 0);

    const renderMetricBar = (label: string, value: number, max: number, colorClass: string = 'bg-[#80FF00]') => (
        <div key={label} className="space-y-1">
            <div className="flex justify-between text-[10px]">
                <span className="text-white/70">{label}</span>
                <span className="text-white/90 font-medium">{value}/{max}</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                />
            </div>
        </div>
    );

    const renderScoreRing = (size: string = 'w-24 h-24') => (
        <div className="text-center">
            <div className={`relative inline-block ${size} mb-2`}>
                <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
                    <circle
                        cx="50%"
                        cy="50%"
                        r="42%"
                        stroke="#ffffff1a"
                        strokeWidth="8"
                        fill="transparent"
                    />
                    <motion.circle
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: displayScore / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        cx="50%"
                        cy="50%"
                        r="42%"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeLinecap="round"
                        className={getScoreColor(displayScore, 100).split(' ')[0]}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-3xl font-bold bg-gradient-to-r ${getScoreGradient(displayScore)} bg-clip-text text-transparent`}
                    >
                        {displayScore}
                    </motion.span>
                </div>
            </div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold opacity-50">{scoreLabel}</div>
        </div>
    );

    const renderBreakdown = () => {
        if (isJourneyCV && scoreResult?.atsScore) {
            return (
                <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-[#80FF00] uppercase tracking-wider">ATS Compatibility</span>
                        <span className="text-xs font-bold text-white/90">{scoreResult.atsScore.total}</span>
                    </div>
                    <div className="space-y-1.5">
                        {renderMetricBar('Keywords', scoreResult.atsScore.keywordMatch, 40, 'bg-[#80FF00]')}
                        {renderMetricBar('Formatting', scoreResult.atsScore.formatting, 20, 'bg-[#80FF00]')}
                        {renderMetricBar('Sections', scoreResult.atsScore.sectionAlignment, 15, 'bg-[#80FF00]')}
                    </div>
                </div>
            );
        }

        const cvScore = scoreResult?.cvScore;
        if (cvScore) {
            return (
                <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Profile Strength</span>
                        <span className="text-xs font-bold text-white/90">{cvScore.total}</span>
                    </div>
                    <div className="space-y-1.5">
                        {renderMetricBar('Completeness', cvScore.completeness, 25, 'bg-blue-500')}
                        {renderMetricBar('Impact', cvScore.impactVerbs, 20, 'bg-blue-500')}
                        {renderMetricBar('Formatting', cvScore.formatting, 15, 'bg-blue-500')}
                    </div>
                </div>
            );
        }

        return null;
    };

    // 2. Early Returns
    if (isLoading) {
        return (
            <div className={`${compact ? 'p-3' : 'p-4'} flex items-center justify-center`}>
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#80FF00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Analyzing...</p>
                </div>
            </div>
        );
    }

    if (!scoreResult && !atsResult) {
        return (
            <div className={`${compact ? 'p-3' : 'p-4'} flex items-center justify-center`}>
                <div className="text-center">
                    <BarChart3 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                        {analysisMode === 'insufficient-data'
                            ? 'Set up analysis context to view scorecard'
                            : 'Run analysis to view scorecard'}
                    </p>
                </div>
            </div>
        );
    }

    const details = atsResult?.details;
    const suggestions = atsResult?.suggestions;
    const missingKeywords = details?.missingKeywords || [];
    const matchedKeywords = details?.matchedKeywords || [];

    // 3. Main Render Logic
    if (compact) {
        return (
            <div className="flex items-center p-5 pl-4 pb-6 h-full gap-8">
                {/* Left side - Score Ring with compact footprint */}
                <div className="flex-shrink-0 w-28 flex flex-col items-center justify-center">
                    {renderScoreRing('w-20 h-20')}
                </div>

                {/* Right side - Expanded Breakdown to fill space */}
                <div className="flex-grow pl-8 border-l border-white/5 space-y-1 pr-2">
                    {renderBreakdown()}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Overall Score Circle - Legacy Vertical Mode */}
            <div className="text-center pb-3 border-b border-white/10">
                {renderScoreRing()}
            </div>

            {/* CV Profile Strength (Human-Centric) - using scoreResult.cvScore */}
            {scoreResult?.cvScore && !isJourneyCV && (
                <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        CV Profile Strength (Human)
                    </h3>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-3">
                        <div className="flex justify-between items-end border-b border-white/10 pb-2">
                            <span className="text-xs text-blue-400 font-bold">Total Score</span>
                            <span className="text-xl font-bold text-white">{scoreResult.cvScore.total}</span>
                        </div>
                        <div className="space-y-2">
                            {renderMetricBar('Completeness (C)', scoreResult.cvScore.completeness, 25, 'bg-blue-500')}
                            {renderMetricBar('Impact Verbs (I)', scoreResult.cvScore.impactVerbs, 20, 'bg-blue-500')}
                            {renderMetricBar('Quantification (Q)', scoreResult.cvScore.quantification, 20, 'bg-blue-500')}
                            {renderMetricBar('Formatting (F)', scoreResult.cvScore.formatting, 15, 'bg-blue-500')}
                            {renderMetricBar('Readability (R)', scoreResult.cvScore.readability, 20, 'bg-blue-500')}
                        </div>
                        {scoreResult.cvScore.validityMultiplier < 1 && (
                            <div className="text-xs text-yellow-400 pt-1 border-t border-white/10">
                                ⚠️ Validity penalty applied ({scoreResult.cvScore.validityMultiplier}x)
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ATS Compatibility (Robot-Centric) - using scoreResult.atsScore */}
            {scoreResult?.atsScore && isJourneyCV && (
                <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#80FF00]"></span>
                        ATS Compatibility (Robot)
                    </h3>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-3">
                        <div className="flex justify-between items-end border-b border-white/10 pb-2">
                            <span className="text-xs text-[#80FF00] font-bold">Total Score</span>
                            <span className="text-xl font-bold text-white">{scoreResult.atsScore.total}</span>
                        </div>
                        <div className="space-y-2">
                            {renderMetricBar('Keywords (K)', scoreResult.atsScore.keywordMatch, 40, 'bg-[#80FF00]')}
                            {renderMetricBar('Formatting (F)', scoreResult.atsScore.formatting, 20, 'bg-[#80FF00]')}
                            {renderMetricBar('Section Alignment (S)', scoreResult.atsScore.sectionAlignment, 15, 'bg-[#80FF00]')}
                            {renderMetricBar('Recency (R)', scoreResult.atsScore.recency, 15, 'bg-[#80FF00]')}
                            {renderMetricBar('Contactability (C)', scoreResult.atsScore.contactability, 10, 'bg-[#80FF00]')}
                        </div>
                        {scoreResult.atsScore.parsabilityMultiplier < 1 && (
                            <div className="text-xs text-yellow-400 pt-1 border-t border-white/10">
                                ⚠️ Parsability penalty applied ({scoreResult.atsScore.parsabilityMultiplier}x)
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* EXPANDED DETAILS: Keywords & Suggestions */}
            {!compact && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                    {/* Missing Keywords */}
                    {missingKeywords.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-red-400 uppercase flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Missing Keywords ({missingKeywords.length})
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {missingKeywords.slice(0, 10).map((keyword: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => onAddKeyword?.(keyword)}
                                        className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 transition-colors"
                                        title="Click to add"
                                    >
                                        {keyword}
                                    </button>
                                ))}
                                {missingKeywords.length > 10 && (
                                    <span className="px-2 py-1 text-gray-500 text-[10px]">+{missingKeywords.length - 10} more</span>
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
                                {matchedKeywords.slice(0, 8).map((keyword: string, idx: number) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[10px]"
                                    >
                                        {keyword}
                                    </span>
                                ))}
                                {matchedKeywords.length > 8 && (
                                    <span className="px-2 py-1 text-gray-500 text-[10px]">+{matchedKeywords.length - 8} more</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    {suggestions && suggestions.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-[#80FF00] uppercase flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5" />
                                Suggestions
                            </h3>
                            <div className="space-y-1.5">
                                {suggestions.slice(0, 3).map((suggestion: string, idx: number) => (
                                    <div
                                        key={idx}
                                        className="p-2 bg-[#80FF00]/10 border border-[#80FF00]/20 rounded-lg text-xs text-gray-300"
                                    >
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Job Info */}
                    {jobData && (
                        <div className="pt-2 border-t border-white/10">
                            <h3 className="text-xs font-semibold text-gray-300 uppercase mb-1 flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5" />
                                Target Job
                            </h3>
                            <div className="text-xs text-gray-400">
                                <p className="font-medium text-gray-300">{jobData.jobTitle || jobData.title}</p>
                                <p>{jobData.company}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
