'use client';

import React from 'react';
import { useDashboard, useEnhancer } from '@/contexts/linkedin-enhancer';

export default function TopRecommendationsCard({ onActionClick }: { onActionClick: (sectionId: string) => void }) {
    const { state: dashboardState } = useDashboard();
    const { state: enhancerState } = useEnhancer();
    const sections = enhancerState.sections;

    // Generate dynamic recommendations based on section status
    const recommendations: { id: string, sectionId: string, title: string, description: string, icon: React.ReactNode, priority: 'high' | 'medium' | 'low' }[] = [];

    if (sections.hero.status === 'ORIGINAL' || !sections.hero.current.headline) {
        recommendations.push({
            id: 'rec-headline',
            sectionId: 'hero',
            title: 'Improve your Headline',
            description: 'Your headline is the first thing recruiters see. Let AI optimize it for your target role.',
            icon: '🚀',
            priority: 'high',
        });
    }

    if (sections.about.status === 'ORIGINAL' || !sections.about.current) {
        recommendations.push({
            id: 'rec-about',
            sectionId: 'about',
            title: 'Craft a compelling About section',
            description: 'Add a strong hook and narrative to tell your professional story.',
            icon: '✍️',
            priority: 'high',
        });
    }

    if (sections.experience.length === 0 || sections.experience.some(e => e.status === 'ORIGINAL')) {
        recommendations.push({
            id: 'rec-experience',
            sectionId: 'experience',
            title: 'Quantify Work Experience',
            description: 'Transform responsibilities into achievements with metrics and impact.',
            icon: '📈',
            priority: 'medium',
        });
    }

    // Add fallback recommendations if none generated
    if (recommendations.length === 0) {
        recommendations.push({
            id: 'rec-skills',
            sectionId: 'skills',
            title: 'Audit Skills Matrix',
            description: 'Ensure you have the right mix of hard and soft skills for your industry.',
            icon: '🛠️',
            priority: 'low',
        });
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full relative overflow-hidden">
            <div className="flex items-center space-x-2 mb-6 z-10 relative">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Next Best Actions</h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 z-10 relative space-y-4">
                {recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onActionClick(rec.sectionId)}>
                        <div className="flex items-start">
                            <div className="text-xl mr-3 flex-shrink-0">{rec.icon}</div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                        {rec.title}
                                    </h4>
                                    {rec.priority === 'high' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                            High Impact
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                                    {rec.description}
                                </p>
                                <button className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                    Fix Now
                                    <svg className="ml-1 w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-50 rounded-full opacity-50 blur-2xl"></div>
        </div>
    );
}
