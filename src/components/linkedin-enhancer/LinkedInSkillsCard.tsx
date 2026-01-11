'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Star, Sparkles } from 'lucide-react';
import CopyableText, { CopyAllButton } from './CopyableText';
import type { LinkedInSkillsMatrix } from '@/types/linkedin';

interface LinkedInSkillsCardProps {
    data: LinkedInSkillsMatrix;
    showEnhanced?: boolean;
}

export default function LinkedInSkillsCard({ data, showEnhanced = true }: LinkedInSkillsCardProps) {
    const currentSkills = data.current || [];
    const enhancedTop3 = data.top_3_priority || [];
    const suggestedSkills = data.suggested_additions || [];
    const industrySkills = data.industry_specific || [];
    const interpersonalSkills = data.interpersonal || [];

    // Combine all skills for "Copy All"
    const allSkills = [
        ...enhancedTop3,
        ...currentSkills.filter(s => !enhancedTop3.includes(s)),
        ...(showEnhanced ? suggestedSkills : []),
    ];
    const allContent = allSkills.join(', ');

    const hasEnhancements = showEnhanced && (enhancedTop3.length > 0 || suggestedSkills.length > 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Skills</h2>
                <CopyAllButton content={allContent} label="Copy All" />
            </div>

            {/* Top 3 Priority Skills */}
            {hasEnhancements && enhancedTop3.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-gray-700">Top Skills</span>
                        <Sparkles className="w-3 h-3 text-amber-500" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {enhancedTop3.map((skill, idx) => (
                            <CopyableText
                                key={idx}
                                text={skill}
                                className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200"
                                showIcon={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Current Skills */}
            {currentSkills.length > 0 && (
                <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Your Skills</div>
                    <div className="flex flex-wrap gap-2">
                        {currentSkills.map((skill, idx) => (
                            <CopyableText
                                key={idx}
                                text={skill}
                                className="px-2.5 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200"
                                showIcon={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Industry-Specific Skills */}
            {hasEnhancements && industrySkills.length > 0 && (
                <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Industry-Specific</div>
                    <div className="flex flex-wrap gap-2">
                        {industrySkills.map((skill, idx) => (
                            <CopyableText
                                key={idx}
                                text={skill}
                                className="px-2.5 py-1 bg-purple-50 text-purple-700 text-sm rounded-full border border-purple-200"
                                showIcon={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Interpersonal/Soft Skills */}
            {hasEnhancements && interpersonalSkills.length > 0 && (
                <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Interpersonal</div>
                    <div className="flex flex-wrap gap-2">
                        {interpersonalSkills.map((skill, idx) => (
                            <CopyableText
                                key={idx}
                                text={skill}
                                className="px-2.5 py-1 bg-green-50 text-green-700 text-sm rounded-full border border-green-200"
                                showIcon={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Suggested Additions */}
            {hasEnhancements && suggestedSkills.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Plus className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Suggested Additions</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {suggestedSkills.map((skill, idx) => (
                            <CopyableText
                                key={idx}
                                text={skill}
                                className="px-2.5 py-1 bg-green-50 text-green-700 text-sm rounded-full border border-green-300 border-dashed"
                                showIcon={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Verified Badges */}
            {data.verified_badges_eligible && data.verified_badges_eligible.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-700 mb-2">Verification Eligible</div>
                    <div className="space-y-2">
                        {data.verified_badges_eligible.map((badge, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-sm text-amber-800"
                            >
                                <span className="text-lg">🏅</span>
                                <span>{badge}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
