'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ProfileStrengthCard from './ProfileStrengthCard';
import ProfileChecklistCard from './ProfileChecklistCard';
import AISummaryCard from './AISummaryCard';
import TopRecommendationsCard from './TopRecommendationsCard';

export default function LinkedInEnhancerDashboard({ onStartEnhancing }: { onStartEnhancing: (sectionId?: string) => void }) {
    const router = useRouter();
    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-[#1a230f] min-h-screen">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <button 
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </button>

                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">LinkedIn Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400">Overview of your profile strength and next best actions.</p>
                    </div>
                    <button 
                        onClick={() => onStartEnhancing()}
                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Start Enhancing Profile
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 auto-rows-fr">
                    {/* Top Left: Profile Strength */}
                    <div className="h-full">
                        <ProfileStrengthCard />
                    </div>

                    {/* Top Right: Next Best Actions (Top Recommendations) */}
                    <div className="h-full">
                        <TopRecommendationsCard onActionClick={(sectionId) => onStartEnhancing(sectionId)} />
                    </div>

                    {/* Bottom Left: Profile Checklist */}
                    <div className="h-full">
                        <ProfileChecklistCard />
                    </div>

                    {/* Bottom Right: AI Summary */}
                    <div className="h-full">
                        <AISummaryCard />
                    </div>
                </div>
            </div>
        </div>
    );
}
