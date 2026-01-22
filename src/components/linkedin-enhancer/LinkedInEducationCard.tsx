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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Education</h2>
                <p className="text-gray-500 text-sm">No education data available</p>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Education</h2>
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
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-gray-400" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Institution */}
                    <div className="flex items-start justify-between gap-2">
                        <CopyableText
                            text={data.institution}
                            className="text-base font-semibold text-gray-900 p-1 -ml-1"
                        />
                        <CopyAllButton content={entryContent} label="Copy" />
                    </div>

                    {/* Degree & Field */}
                    <CopyableText
                        text={`${data.degree}${data.field ? ` (${data.field})` : ''}`}
                        className="text-sm text-gray-700 p-1 -ml-1"
                        showIcon={false}
                    />

                    {/* Grade */}
                    {data.grade && (
                        <div className="flex items-center gap-1 mt-1">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <CopyableText
                                text={data.grade}
                                className="text-sm text-gray-600"
                                showIcon={false}
                            >
                                <span className="font-medium">Grade:</span> {data.grade}
                            </CopyableText>
                        </div>
                    )}

                    {/* Activities as Bullet Points */}
                    {activitiesBullets.length > 0 && (
                        <div className="mt-3 space-y-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activities & Achievements</span>
                            {activitiesBullets.map((bullet, idx) => (
                                <CopyableText
                                    key={idx}
                                    text={bullet}
                                    className="text-sm text-gray-700 pl-3 relative p-1"
                                    showIcon={false}
                                >
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    <span>{bullet}</span>
                                </CopyableText>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
