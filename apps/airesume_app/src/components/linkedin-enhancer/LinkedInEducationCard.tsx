'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Award } from 'lucide-react';
import CopyableText, { CopyAllButton } from './CopyableText';
import type { LinkedInEducationEntry } from '@/types/linkedin';

interface LinkedInEducationCardProps {
    data: LinkedInEducationEntry[];
}

export default function LinkedInEducationCard({ data }: LinkedInEducationCardProps) {
    if (data.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-5 sm:p-6"
            >
                <h2 className="text-xs font-bold text-[var(--text-primary)] mb-3">Education</h2>
                <p className="text-[var(--text-tertiary)] text-xs">No education data available</p>
            </motion.div>
        );
    }

    // All content for "Copy All"
    const allContent = data.map((edu) => {
        return [
            edu.institution,
            `${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`,
            edu.grade ? `Grade: ${edu.grade}` : '',
        ].filter(Boolean).join('\n');
    }).join('\n\n---\n\n');

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-5 sm:p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-[var(--text-primary)]">Education</h2>
                    <span className="px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-md text-[10px] font-semibold border border-[var(--border-primary)]">
                        Original (No AI Optimization Needed)
                    </span>
                </div>
                <CopyAllButton content={allContent} label="Copy All" />
            </div>

            {/* Education Entries */}
            <div className="space-y-6">
                {data.map((education, index) => (
                    <EducationEntry
                        key={education.id}
                        data={education}
                        isLast={index === data.length - 1}
                    />
                ))}
            </div>
        </motion.div>
    );
}

interface EducationEntryProps {
    data: LinkedInEducationEntry;
    isLast: boolean;
}

function EducationEntry({ data, isLast }: EducationEntryProps) {
    // Parse activities into bullet points
    const activitiesBullets = data.activities
        ? data.activities
            .split(/\n|;|(?<=[.!?])\s+(?=[A-Z])/)  // Split by newlines, semicolons, or sentence boundaries
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
        : [];

    const entryContent = [
        data.institution,
        `${data.degree}${data.field ? ` in ${data.field}` : ''}`,
        data.grade ? `Grade: ${data.grade}` : '',
        ...activitiesBullets.map(a => `• ${a}`),
    ].filter(Boolean).join('\n');

    return (
        <div className={`relative ${!isLast ? 'pb-6 border-b border-gray-100' : ''}`}>
            <div className="flex gap-4">
                {/* Institution Logo Placeholder */}
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-gray-400" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Institution */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="text-small font-semibold text-gray-900">
                            {data.institution}
                        </div>
                        <CopyAllButton content={entryContent} label="Copy" />
                    </div>

                    {/* Degree & Field */}
                    <div className="text-small text-gray-700 mt-0.5">
                        {`${data.degree}${data.field ? ` (${data.field})` : ''}`}
                    </div>

                    {/* Grade */}
                    {data.grade && (
                        <div className="flex items-center gap-1 mt-1">
                            <Award className="w-3 h-3 text-amber-500" />
                            <div className="text-[10px] text-gray-600">
                                <span className="font-medium">Grade:</span> {data.grade}
                            </div>
                        </div>
                    )}

                    {/* Activities as Bullet Points */}
                    {activitiesBullets.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Activities & Achievements</span>
                            {activitiesBullets.map((bullet, idx) => (
                                <div key={idx} className="text-small text-gray-700 pl-3 relative">
                                    <span className="absolute left-0 top-1.5 w-1 h-1 bg-gray-400 rounded-full" />
                                    {bullet}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
