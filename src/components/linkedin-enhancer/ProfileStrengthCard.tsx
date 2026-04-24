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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="w-24 h-24 bg-gray-100 rounded-full border-4 border-gray-200"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mt-4"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full relative overflow-hidden">
            <div className="flex justify-between items-start mb-6 z-10 relative">
                <h3 className="text-lg font-semibold text-gray-900">Profile Strength</h3>
            </div>
            
            <div className="flex-1 flex items-center justify-center z-10 relative gap-6">
                {/* Before Gauge */}
                <div className="flex flex-col items-center">
                    <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="text-gray-100"
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
                            <span className="text-xl font-bold text-gray-900">{beforeScore}</span>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Before</span>
                </div>

                <div className="flex flex-col items-center text-gray-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </div>

                {/* After Gauge */}
                <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="text-gray-100"
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
                            <span className="text-2xl font-bold text-gray-900">{score}</span>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">After AI</span>
                </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-50 rounded-full opacity-50 blur-2xl"></div>
        </div>
    );
}
