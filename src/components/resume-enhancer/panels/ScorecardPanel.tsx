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

export interface ATSResult {
    score: number;
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
    cached?: boolean;
}

interface ScorecardPanelProps {
    atsResult: ATSResult | null;
    isLoading: boolean;
    analysisMode: AnalysisMode;
    scoreLabel?: string;
    compact?: boolean;
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
    isLoading,
    analysisMode,
    scoreLabel = 'ATS Score',
    compact = false,
}: ScorecardPanelProps) {
    // Loading State
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

    // No Data State
    if (!atsResult) {
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

    const { score, factorBreakdown, knockOutFactors, profileLevel } = atsResult;

    return (
        <div className={`${compact ? 'space-y-3' : 'space-y-4'}`}>
            {/* Overall Score */}
            <div className="text-center pb-3 border-b border-white/10">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-4xl font-bold bg-gradient-to-r ${getScoreGradient(score)} bg-clip-text text-transparent`}
                >
                    {score}
                </motion.div>
                <div className="text-xs text-gray-400 mt-1">{scoreLabel}</div>
                {profileLevel && (
                    <div className="mt-2">
                        <span className="px-2 py-1 bg-[#80FF00]/20 text-[#80FF00] rounded text-xs font-medium">
                            {profileLevel.title}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-1">
                            {profileLevel.yearsExperience} years experience
                        </p>
                    </div>
                )}
            </div>

            {/* Factor Breakdown */}
            {factorBreakdown && (
                <div className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-gray-300 uppercase flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" />
                        Score Factors
                    </h3>

                    {/* Hard Keywords */}
                    {factorBreakdown.hardKeywords && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Hard Keywords</span>
                                <span className={getScoreColor(factorBreakdown.hardKeywords.score, factorBreakdown.hardKeywords.weight).split(' ')[0]}>
                                    {factorBreakdown.hardKeywords.matched}/{factorBreakdown.hardKeywords.total}
                                </span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(factorBreakdown.hardKeywords.score / factorBreakdown.hardKeywords.weight) * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                    className={`h-full rounded-full ${getScoreColor(factorBreakdown.hardKeywords.score, factorBreakdown.hardKeywords.weight).split(' ')[1]}`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Experience Length */}
                    {factorBreakdown.experienceLength && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Experience</span>
                                <span className="text-gray-300">{factorBreakdown.experienceLength.years} years</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(factorBreakdown.experienceLength.score / factorBreakdown.experienceLength.weight) * 100}%` }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                    className={`h-full rounded-full ${getScoreColor(factorBreakdown.experienceLength.score, factorBreakdown.experienceLength.weight).split(' ')[1]}`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Soft Skills */}
                    {factorBreakdown.softSkills && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Soft Skills</span>
                                <span className={getScoreColor(factorBreakdown.softSkills.score, factorBreakdown.softSkills.weight).split(' ')[0]}>
                                    {factorBreakdown.softSkills.matched}/{factorBreakdown.softSkills.total}
                                </span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(factorBreakdown.softSkills.score / factorBreakdown.softSkills.weight) * 100}%` }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className={`h-full rounded-full ${getScoreColor(factorBreakdown.softSkills.score, factorBreakdown.softSkills.weight).split(' ')[1]}`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Formatting */}
                    {factorBreakdown.formatting && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Formatting</span>
                                <span className={getScoreColor(factorBreakdown.formatting.score, factorBreakdown.formatting.weight).split(' ')[0]}>
                                    {factorBreakdown.formatting.score}/{factorBreakdown.formatting.weight}
                                </span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(factorBreakdown.formatting.score / factorBreakdown.formatting.weight) * 100}%` }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className={`h-full rounded-full ${getScoreColor(factorBreakdown.formatting.score, factorBreakdown.formatting.weight).split(' ')[1]}`}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Knockout Factors */}
            {knockOutFactors && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                    <h3 className="text-xs font-semibold text-gray-300 uppercase flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Knockout Checks
                    </h3>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                            <CheckCircle className={`w-3.5 h-3.5 ${knockOutFactors.fileFormat?.passed ? 'text-green-400' : 'text-red-400'}`} />
                            <span className="text-gray-400">File Format</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <CheckCircle className={`w-3.5 h-3.5 ${knockOutFactors.sectionHeaders?.passed ? 'text-green-400' : 'text-red-400'}`} />
                            <span className="text-gray-400">Section Headers</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <CheckCircle className={`w-3.5 h-3.5 ${knockOutFactors.contactInfo?.passed ? 'text-green-400' : 'text-red-400'}`} />
                            <span className="text-gray-400">Contact Info</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
