'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Calendar, Sparkles } from 'lucide-react';
import CopyableText, { CopyAllButton } from './CopyableText';
import { ExperienceGuard } from './CharacterGuard';
import type { LinkedInExperienceEntry } from '@/types/linkedin';

interface LinkedInExperienceCardProps {
    data: LinkedInExperienceEntry[];
    showEnhanced?: boolean;
}

export default function LinkedInExperienceCard({ data, showEnhanced = true }: LinkedInExperienceCardProps) {
    // Guard against undefined or non-array data
    if (!data || !Array.isArray(data)) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Experience</h2>
                <p className="text-gray-500 text-sm">No experience data available</p>
            </motion.div>
        );
    }

    // Filter out entries with missing required data
    const validData = data.filter(exp => exp && exp.original_data);

    if (validData.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Experience</h2>
                <p className="text-gray-500 text-sm">No experience data available</p>
            </motion.div>
        );
    }

    // All content for "Copy All Section"
    const allContent = validData.map((exp) => {
        const title = showEnhanced && exp.enhanced_data?.title
            ? exp.enhanced_data.title
            : exp.original_data?.role || '';
        const bullets = showEnhanced && exp.enhanced_data?.description_bullets?.length > 0
            ? exp.enhanced_data.description_bullets.join('\n• ')
            : exp.original_data?.description || '';

        return `${title}\n${exp.original_data?.company || ''}${exp.original_data?.duration ? ` | ${exp.original_data.duration}` : ''}\n${bullets ? '• ' + bullets : ''}`;
    }).join('\n\n---\n\n');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Experience</h2>
                <CopyAllButton content={allContent} label="Copy All" />
            </div>

            {/* Experience Entries */}
            <div className="space-y-6">
                {validData.map((experience, index) => (
                    <ExperienceEntry
                        key={experience.id || index}
                        data={experience}
                        showEnhanced={showEnhanced}
                        isLast={index === validData.length - 1}
                    />
                ))}
            </div>
        </motion.div>
    );
}

interface ExperienceEntryProps {
    data: LinkedInExperienceEntry;
    showEnhanced: boolean;
    isLast: boolean;
}

function ExperienceEntry({ data, showEnhanced, isLast }: ExperienceEntryProps) {
    // Ensure we have required nested objects
    const originalData = data.original_data || {};
    const enhancedData = data.enhanced_data || { title: '', description_bullets: [], tagged_skills: [], improvement_notes: '' };

    const hasEnhancements = enhancedData.title && enhancedData.description_bullets?.length > 0;
    const displayTitle = showEnhanced && hasEnhancements
        ? enhancedData.title
        : originalData.role || '';

    const displayBullets = showEnhanced && hasEnhancements
        ? enhancedData.description_bullets
        : originalData.description
            ? originalData.description
                .split(/\n|(?<=[.!?])\s+(?=[A-Z])/)  // Split by newlines or sentence boundaries
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0)
            : [];

    const allEntryContent = `${displayTitle}\n${originalData.company || ''}\n${displayBullets.map(b => `• ${b}`).join('\n')}`;

    // Calculate character count for description
    const descriptionLength = displayBullets.join('\n').length;

    return (
        <div className={`relative ${!isLast ? 'pb-6 border-b border-gray-100' : ''}`}>
            <div className="flex gap-4">
                {/* Company Logo Placeholder */}
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div className="flex items-start justify-between gap-2">
                        <CopyableText
                            text={displayTitle}
                            className="text-base font-semibold text-gray-900 p-1 -ml-1"
                        >
                            <span>{displayTitle}</span>
                            {hasEnhancements && showEnhanced && (
                                <Sparkles className="inline-block w-3.5 h-3.5 ml-1.5 text-amber-500" />
                            )}
                        </CopyableText>
                        <CopyAllButton content={allEntryContent} label="Copy" />
                    </div>

                    {/* Company & Employment Type */}
                    <CopyableText
                        text={`${originalData.company || ''}${originalData.employment_type ? ` · ${originalData.employment_type}` : ''}`}
                        className="text-sm text-gray-700 p-1 -ml-1"
                        showIcon={false}
                    />

                    {/* Duration & Location */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        {originalData.duration && (
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{originalData.duration}</span>
                            </div>
                        )}
                        {originalData.location && (
                            <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{originalData.location}</span>
                            </div>
                        )}
                    </div>

                    {/* Description Bullets */}
                    {displayBullets.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {displayBullets.map((bullet, idx) => (
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

                    {/* Tagged Skills */}
                    {showEnhanced && hasEnhancements && enhancedData.tagged_skills?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {enhancedData.tagged_skills.map((skill, idx) => (
                                <CopyableText
                                    key={idx}
                                    text={skill}
                                    className="px-2 py-0.5 bg-blue-50 text-xs text-blue-700 rounded-full border border-blue-200"
                                    showIcon={false}
                                />
                            ))}
                        </div>
                    )}

                    {/* Improvement Notes */}
                    {showEnhanced && hasEnhancements && enhancedData.improvement_notes && (
                        <div className="mt-3 p-2 bg-amber-50 rounded-lg">
                            <p className="text-xs text-amber-800">
                                <span className="font-medium">💡 Improvement: </span>
                                {enhancedData.improvement_notes}
                            </p>
                        </div>
                    )}

                    {/* Character Guard */}
                    {displayBullets.length > 0 && (
                        <div className="mt-3">
                            <ExperienceGuard current={descriptionLength} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
