'use client';

import React from 'react';
import { useDashboard, useEnhancer } from '@/contexts/linkedin-enhancer';

export default function ProfileStrengthCard() {
    const { state: dashboardState } = useDashboard();
    const { state: enhancerState } = useEnhancer();
    const score = dashboardState.side_cards.profile_strength_score || 0;
    
    // Calculate a mock "Before" score if we have enhanced data
    const hasEnhancedData = enhancerState.sections.hero.status !== 'ORIGINAL';
    const beforeScore = hasEnhancedData ? Math.max(0, score - 25) : score;

    // Check if any profile data is imported by looking at the hero section
    const hasProfileData = !!enhancerState.sections.hero.current.headline || !!enhancerState.sections.hero.current.name;

    if (!hasProfileData) {
        return (
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-5 flex flex-col h-full animate-pulse">
                <div className="h-5 bg-[var(--bg-tertiary)] rounded w-1/2 mb-4"></div>
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full border-4 border-[var(--border-primary)]"></div>
                    <div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-5 flex flex-col h-full relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 z-10 relative">
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Profile Strength</h3>
            </div>
            
            <div className="flex-1 flex items-center justify-center z-10 relative gap-6">
                {/* Before Gauge */}
                <div className="flex flex-col items-center">
                    <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="text-gray-100 dark:text-gray-700"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className={`${beforeScore > 80 ? 'text-green-500' : beforeScore > 50 ? 'text-blue-500' : 'text-amber-500'}`}
                                strokeDasharray={`${beforeScore}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-h3 font-bold text-gray-900 dark:text-white">{beforeScore}</span>
                        </div>
                    </div>
                    <span className="text-small font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Before</span>
                </div>

                <div className="flex flex-col items-center text-gray-300 dark:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </div>

                {/* After Gauge */}
                <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="text-gray-100 dark:text-gray-700"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className={`${score > 80 ? 'text-green-500' : score > 50 ? 'text-blue-500' : 'text-amber-500'}`}
                                strokeDasharray={`${score}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-h2 font-bold text-gray-900 dark:text-white">{score}</span>
                        </div>
                    </div>
                    <span className="text-small font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">After AI</span>
                </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-50 dark:bg-blue-900/20 rounded-full opacity-50 blur-2xl"></div>
        </div>
    );
}
