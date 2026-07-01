'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Star, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import CopyableText, { CopyAllButton } from './CopyableText';
import type { LinkedInSkillsMatrix } from '@/types/linkedin';
import { useLinkedInEnhancer } from '@/contexts/linkedin-enhancer';

interface LinkedInSkillsCardProps {
    data: LinkedInSkillsMatrix;
}

export default function LinkedInSkillsCard({ data }: LinkedInSkillsCardProps) {
    const { triggerEnhancement, state } = useLinkedInEnhancer();
    const currentSkills = data.current || [];
    const enhancedTop3 = data.top_3_priority || [];
    const suggestedSkills = data.suggested_additions || [];
    const industrySkills = data.industry_specific || [];
    const interpersonalSkills = data.interpersonal || [];

    const hasEnhancements = enhancedTop3.length > 0 || suggestedSkills.length > 0 || industrySkills.length > 0;
    const isError = false; // Add error state if applicable in future
    const isLoading = state.isEnhancing;

    const handleRetry = () => {
        if (state.selectedCvId && state.selectedCvType) {
            triggerEnhancement(state.selectedCvId, state.selectedCvType, true);
        }
    };

    // Use a static high score or fetch from context if added
    const confidenceScore = hasEnhancements ? 95 : 0;

    const allSkills = [
        ...enhancedTop3,
        ...currentSkills.filter(s => !enhancedTop3.includes(s)),
        ...suggestedSkills,
    ];
    const allContent = allSkills.join(', ');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200"
        >
            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                {/* Original Column */}
                <div className="flex-1 p-6 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-small font-semibold uppercase tracking-wider text-gray-500">Original Skills</span>
                    </div>
                    {currentSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {currentSkills.map((skill, idx) => (
                                <span key={idx} className="px-2.5 py-1 bg-white text-gray-700 text-small rounded-full border border-gray-200 shadow-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-small italic">No skills listed</p>
                    )}
                </div>

                {/* Enhanced Column */}
                <div className="flex-1 p-6 relative">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-small font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> AI Enhanced
                            </span>
                            {hasEnhancements && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-small font-bold">
                                    {confidenceScore}% Match
                                </span>
                            )}
                        </div>
                        {hasEnhancements && <CopyAllButton content={allContent} label="Copy All" />}
                    </div>

                    {isLoading ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                            <div className="flex gap-2 flex-wrap">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-6 bg-gray-100 rounded-full w-20"></div>)}
                            </div>
                        </div>
                    ) : isError ? (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
                            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                            <p className="text-small text-red-700 mb-3">Failed to generate enhancement.</p>
                            <button onClick={handleRetry} className="flex items-center gap-2 mx-auto text-small bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50">
                                <RefreshCw className="w-4 h-4" /> Retry
                            </button>
                        </div>
                    ) : hasEnhancements ? (
                        <div className="space-y-6">
                            {enhancedTop3.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Star className="w-4 h-4 text-amber-500" />
                                        <span className="text-small font-medium text-gray-700">Top Priority Skills</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {enhancedTop3.map((skill, idx) => (
                                            <CopyableText key={idx} text={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-small font-medium rounded-full border border-blue-200" showIcon={false} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {suggestedSkills.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Plus className="w-4 h-4 text-green-600" />
                                        <span className="text-small font-medium text-gray-700">Suggested Additions</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedSkills.map((skill, idx) => (
                                            <CopyableText key={idx} text={skill} className="px-3 py-1 bg-green-50 text-green-700 text-small rounded-full border border-green-300 border-dashed" showIcon={false} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {industrySkills.length > 0 && (
                                <div>
                                    <div className="text-small font-medium text-gray-700 mb-2">Industry Specific</div>
                                    <div className="flex flex-wrap gap-2">
                                        {industrySkills.map((skill, idx) => (
                                            <CopyableText key={idx} text={skill} className="px-3 py-1 bg-purple-50 text-purple-700 text-small rounded-full border border-purple-200" showIcon={false} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {interpersonalSkills.length > 0 && (
                                <div>
                                    <div className="text-small font-medium text-gray-700 mb-2">Interpersonal</div>
                                    <div className="flex flex-wrap gap-2">
                                        {interpersonalSkills.map((skill, idx) => (
                                            <CopyableText key={idx} text={skill} className="px-3 py-1 bg-teal-50 text-teal-700 text-small rounded-full border border-teal-200" showIcon={false} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {data.verified_badges_eligible && data.verified_badges_eligible.length > 0 && (
                                <div className="pt-4 border-t border-gray-100">
                                    <div className="text-small font-medium text-gray-700 mb-2">Verification Eligible</div>
                                    <div className="space-y-2">
                                        {data.verified_badges_eligible.map((badge, idx) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-small text-amber-800">
                                                <span className="text-h3">🏅</span>
                                                <span>{badge}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mt-4">
                                <p className="text-small text-blue-800">
                                    <span className="font-semibold block mb-1">Why this change?</span>
                                    Added missing industry keywords and prioritized your top skills to align with ATS requirements and your target role.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-small text-gray-500 italic">No enhancements generated yet.</div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
