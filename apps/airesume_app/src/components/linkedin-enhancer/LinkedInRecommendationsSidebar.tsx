// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
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
import { Skeleton } from '@/components/ui/Skeleton';
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
                {/* Recommended Courses Skeleton */}
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-lime-400" />
                        <h3 className="text-xs font-bold text-[var(--text-primary)]">Recommended Courses for Profile Insights</h3>
                    </div>
                    <div className="space-y-2.5">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-3 bg-[var(--bg-tertiary)]/50 rounded-xl border border-[var(--border-primary)] space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                    <Skeleton className="h-3.5 w-4/5" />
                                    <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                                </div>
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-full" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Networking Groups Skeleton */}
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-emerald-600 dark:text-lime-400" />
                        <h3 className="text-xs font-bold text-[var(--text-primary)]">Networking Groups</h3>
                    </div>
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 bg-[var(--bg-tertiary)]/50 border border-[var(--border-primary)] rounded-xl">
                                <Skeleton className="h-3.5 w-36" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Edge Cases Detected (Audit) */}
            {audit?.detected_edge_cases?.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-amber-50 rounded-lg border border-amber-200 p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <h3 className="text-small font-semibold text-amber-800">Detected & Handled</h3>
                    </div>
                    <ul className="space-y-1.5 text-small text-amber-700">
                        {audit.detected_edge_cases.map((edgeCase, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <CheckCircle className="w-3 h-3 mt-0.5 text-green-600 flex-shrink-0" />
                                <span>{edgeCase}</span>
                            </li>
                        ))}
                    </ul>
                    {audit.strategy_applied && (
                        <p className="mt-3 text-small text-amber-800 bg-amber-100 p-2 rounded">
                            <span className="font-medium">Strategy: </span>
                            {audit.strategy_applied}
                        </p>
                    )}
                </motion.div>
            )}

            {/* Recommended Courses for Profile Insights */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-4"
            >
                <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-lime-400" />
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">Recommended Courses for Profile Insights</h3>
                </div>
                <div className="space-y-2.5">
                    {[
                        {
                            title: 'LinkedIn Profile Optimization for Recruiter Search',
                            provider: 'Udemy',
                            logic: 'Optimize keywords, headlines, and summaries to rank higher in recruiter searches.',
                            url: 'https://www.udemy.com',
                        },
                        {
                            title: 'AI-Powered Personal Branding & Networking',
                            provider: 'Coursera',
                            logic: 'Leverage generative AI models to build a consistent professional narrative.',
                            url: 'https://www.coursera.org',
                        },
                        {
                            title: 'Technical Resume & CV Writing Workshop',
                            provider: 'Coursera',
                            logic: 'Deep dive into ATS keyword mapping and metrics-focused achievements.',
                            url: 'https://www.coursera.org',
                        },
                        {
                            title: 'Mastering the Behavioral & Technical Interview',
                            provider: 'Udemy',
                            logic: 'Practise responses, structure answers, and project confidence.',
                            url: 'https://www.udemy.com',
                        }
                    ].map((course, idx) => (
                        <a
                            key={idx}
                            href={course.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 bg-[var(--bg-tertiary)]/50 rounded-xl hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] transition-colors group"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-lime-400 transition-colors">
                                        {course.title}
                                    </p>
                                    <p className="text-[11px] text-[var(--text-tertiary)]">{course.provider}</p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-emerald-600 dark:group-hover:text-lime-400 flex-shrink-0" />
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-1">{course.logic}</p>
                        </a>
                    ))}
                </div>
            </motion.div>

            {/* Networking Groups */}
            {sideCards.networking?.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-emerald-600 dark:text-lime-400" />
                        <h3 className="text-xs font-bold text-[var(--text-primary)]">Networking Groups</h3>
                    </div>
                    <div className="space-y-2">
                        {sideCards.networking.map((group, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-[var(--bg-tertiary)]/50 border border-[var(--border-primary)] rounded-xl">
                                <span className="text-xs font-semibold text-[var(--text-secondary)]">{group.group_name}</span>
                                <span className="text-[10px] text-[var(--text-tertiary)]">{group.members} members</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Missing Credentials */}
            {careerGuide?.missing_credentials?.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                    className="bg-red-50 rounded-lg border border-red-200 p-4"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <h3 className="text-small font-semibold text-red-800">Missing Credentials</h3>
                    </div>
                    <ul className="space-y-1">
                        {careerGuide.missing_credentials.map((cred, idx) => (
                            <li key={idx} className="text-small text-red-700 flex items-center gap-2">
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
