'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Users,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    ExternalLink,
    Lightbulb,
    DollarSign
} from 'lucide-react';
import type { LinkedInSideCards, LinkedInCareerGuide, LinkedInAudit } from '@/types/linkedin';

interface LinkedInRecommendationsSidebarProps {
    sideCards: LinkedInSideCards;
    careerGuide: LinkedInCareerGuide | null;
    audit: LinkedInAudit | null;
    isLoading: boolean;
}

export default function LinkedInRecommendationsSidebar({
    sideCards,
    careerGuide,
    audit,
    isLoading,
}: LinkedInRecommendationsSidebarProps) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                        <div className="h-20 bg-gray-100 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Profile Strength Score */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Profile Strength</h3>
                <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="6"
                            />
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke="#0a66c2"
                                strokeWidth="6"
                                strokeDasharray={`${(sideCards.profile_strength_score / 100) * 176} 176`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold text-gray-900">
                                {sideCards.profile_strength_score}%
                            </span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-600">
                            {sideCards.profile_strength_score >= 80
                                ? 'All-Star Profile!'
                                : sideCards.profile_strength_score >= 60
                                    ? 'Strong profile, room to improve'
                                    : 'Let\'s boost your profile'}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Edge Cases Detected (Audit) */}
            {audit && audit.detected_edge_cases.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-amber-50 rounded-lg border border-amber-200 p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-semibold text-amber-800">Detected & Handled</h3>
                    </div>
                    <ul className="space-y-1.5 text-xs text-amber-700">
                        {audit.detected_edge_cases.map((edgeCase, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <CheckCircle className="w-3 h-3 mt-0.5 text-green-600 flex-shrink-0" />
                                <span>{edgeCase}</span>
                            </li>
                        ))}
                    </ul>
                    {audit.strategy_applied && (
                        <p className="mt-3 text-xs text-amber-800 bg-amber-100 p-2 rounded">
                            <span className="font-medium">Strategy: </span>
                            {audit.strategy_applied}
                        </p>
                    )}
                </motion.div>
            )}

            {/* Skill Gap Analysis */}
            {sideCards.skill_gap_analysis && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Skill Gap Analysis</h3>
                    </div>
                    <p className="text-sm text-gray-600">{sideCards.skill_gap_analysis}</p>
                </motion.div>
            )}

            {/* Recommended Actions */}
            {sideCards.recommended_actions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Recommended Actions</h3>
                    </div>
                    <ul className="space-y-2">
                        {sideCards.recommended_actions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                <span>{action}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            )}

            {/* Salary Insight */}
            {careerGuide?.salary_insight && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <h3 className="text-sm font-semibold text-green-800">Salary Insight</h3>
                    </div>
                    <p className="text-sm text-green-700">{careerGuide.salary_insight}</p>
                </motion.div>
            )}

            {/* Career Pathway */}
            {sideCards.career_pathway.next_step && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-blue-50 rounded-lg border border-blue-200 p-4"
                >
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">Career Pathway</h3>
                    <p className="text-sm text-blue-700 mb-2">
                        <span className="font-medium">Next Role: </span>
                        {sideCards.career_pathway.next_step}
                    </p>
                    {sideCards.career_pathway.missing_skill && (
                        <p className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                            <span className="font-medium">Gap: </span>
                            {sideCards.career_pathway.missing_skill}
                        </p>
                    )}
                </motion.div>
            )}

            {/* Recommended Courses */}
            {sideCards.affiliate_courses.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Recommended Courses</h3>
                    </div>
                    <div className="space-y-3">
                        {sideCards.affiliate_courses.map((course, idx) => (
                            <a
                                key={idx}
                                href={course.affiliate_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                            {course.title}
                                        </p>
                                        <p className="text-xs text-gray-500">{course.provider}</p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                                </div>
                                {course.logic && (
                                    <p className="text-xs text-gray-500 mt-1">{course.logic}</p>
                                )}
                            </a>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Networking Groups */}
            {sideCards.networking.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Networking Groups</h3>
                    </div>
                    <div className="space-y-2">
                        {sideCards.networking.map((group, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-700">{group.group_name}</span>
                                <span className="text-xs text-gray-500">{group.members} members</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Missing Credentials */}
            {careerGuide?.missing_credentials && careerGuide.missing_credentials.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                    className="bg-red-50 rounded-lg border border-red-200 p-4"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <h3 className="text-sm font-semibold text-red-800">Missing Credentials</h3>
                    </div>
                    <ul className="space-y-1">
                        {careerGuide.missing_credentials.map((cred, idx) => (
                            <li key={idx} className="text-sm text-red-700 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                                {cred}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            )}
        </div>
    );
}
