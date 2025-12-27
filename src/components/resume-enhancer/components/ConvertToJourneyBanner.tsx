'use client';

import React from 'react';
import { Target, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConvertToJourneyBannerProps {
    cvId?: string;
    onConvert: () => void;
    canConvertToJourney?: boolean;
    currentMode?: string;
    estimatedScoreBoost?: number;
    className?: string;
}

export default function ConvertToJourneyBanner({
    cvId,
    onConvert,
    canConvertToJourney = true,
    currentMode = 'role-based',
    estimatedScoreBoost = 15,
    className = ''
}: ConvertToJourneyBannerProps) {
    // Only show if conversion is possible
    if (!canConvertToJourney) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-4 p-4 bg-gradient-to-r from-lime-500/10 via-green-500/10 to-emerald-500/10 border border-lime-500/20 rounded-xl ${className}`}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-lime-500/20">
                        <Target size={20} className="text-lime-400" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Track This Application?</h4>
                            <Sparkles size={14} className="text-lime-400" />
                        </div>
                        <p className="text-sm text-gray-400">
                            You've added a job description. Convert this CV to a tracked journey to monitor your application progress, manage documents, and get insights.
                        </p>

                        {/* Mode Change Preview */}
                        <div className="mt-3 p-2 bg-black/20 rounded-lg border border-lime-500/10">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-400">Analysis will switch:</span>
                                <span className="text-purple-400 font-medium">
                                    {currentMode === 'role-based' ? 'Role' : currentMode === 'hybrid' ? 'Hybrid' : 'Current'}
                                </span>
                                <ArrowRight size={12} className="text-gray-600" />
                                <span className="text-blue-400 font-medium">JD-Based ATS</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <TrendingUp size={14} className="text-green-400" />
                                <span className="text-xs text-gray-400">
                                    Potential ATS score boost: <span className="text-green-400 font-medium">+{estimatedScoreBoost}-{estimatedScoreBoost + 5}%</span>
                                </span>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-lime-500"></span>
                                Auto-link to job posting
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-lime-500"></span>
                                Track application status
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-lime-500"></span>
                                Generate cover letter
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onConvert}
                    className="flex items-center gap-2 px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black rounded-lg transition-all font-medium text-sm shadow-lg shadow-lime-500/20 hover:shadow-lime-500/30 whitespace-nowrap"
                >
                    Track Application
                    <ArrowRight size={16} />
                </button>
            </div>
        </motion.div>
    );
}
