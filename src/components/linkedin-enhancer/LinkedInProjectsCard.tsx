'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, FolderGit2, Calendar, Building2, Sparkles } from 'lucide-react';
import CopyableText, { CopyAllButton } from './CopyableText';
import type { LinkedInProjectEntry } from '@/types/linkedin';

interface LinkedInProjectsCardProps {
    data: LinkedInProjectEntry[];
    showEnhanced?: boolean;
}

export default function LinkedInProjectsCard({ data, showEnhanced = true }: LinkedInProjectsCardProps) {
    // Guard against invalid data
    if (!data || !Array.isArray(data) || data.length === 0) {
        return null;
    }

    // Filter entries with valid original_data
    const validData = data.filter(p => p && p.original_data);

    if (validData.length === 0) {
        return null;
    }

    // Compile all projects for "Copy All"
    const allContent = validData.map(project => {
        const origData = project.original_data || {};
        const enhData = project.enhanced_data || { title: '', description_bullets: [], tagged_skills: [] };

        const title = showEnhanced && enhData.title
            ? enhData.title
            : origData.title || '';
        const bullets = showEnhanced && enhData.description_bullets?.length > 0
            ? enhData.description_bullets
            : [origData.description || ''];
        const skills = showEnhanced ? (enhData.tagged_skills || []) : [];

        return [
            title,
            origData.date_range || '',
            origData.associated_with ? `Associated with ${origData.associated_with}` : '',
            origData.url || '',
            ...bullets,
            skills.length > 0 ? `Skills: ${skills.join(', ')}` : '',
        ].filter(Boolean).join('\n');
    }).join('\n\n---\n\n');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FolderGit2 className="w-5 h-5 text-gray-700" />
                    <h2 className="text-h3 font-semibold text-gray-900">Projects</h2>
                </div>
                <CopyAllButton content={allContent} label="Copy All" />
            </div>

            {/* Projects List */}
            <div className="divide-y divide-gray-100">
                {validData.map((project, index) => (
                    <ProjectEntry
                        key={project.id || index}
                        project={project}
                        index={index}
                        showEnhanced={showEnhanced}
                    />
                ))}
            </div>
        </motion.div>
    );
}

interface ProjectEntryProps {
    project: LinkedInProjectEntry;
    index: number;
    showEnhanced: boolean;
}

function ProjectEntry({ project, index, showEnhanced }: ProjectEntryProps) {
    // Safe access with defaults
    const origData = project.original_data || {};
    const enhData = project.enhanced_data || { title: '', description_bullets: [], tagged_skills: [], improvement_notes: '' };

    const displayTitle = showEnhanced && enhData.title
        ? enhData.title
        : origData.title || '';

    const displayBullets = showEnhanced && enhData.description_bullets?.length > 0
        ? enhData.description_bullets
        : origData.description
            ? origData.description.split('\n').filter(Boolean)
            : [];

    const displaySkills = showEnhanced
        ? (enhData.tagged_skills || [])
        : [];

    // Build copyable content for this project
    const projectContent = [
        displayTitle,
        origData.date_range || '',
        origData.associated_with ? `Associated with ${origData.associated_with}` : '',
        origData.url || '',
        ...displayBullets,
        displaySkills.length > 0 ? `Skills: ${displaySkills.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    return (
        <div className="p-6">
            <div className="flex gap-4">
                {/* Project Icon */}
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FolderGit2 className="w-6 h-6 text-gray-400" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <CopyableText
                            text={displayTitle}
                            className="text-body font-semibold text-gray-900 block"
                        />
                        <button
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent('mori-cv-selection', {
                                    detail: { 
                                        path: `projects[${index}].description`, 
                                        text: origData.description || ''
                                    }
                                }));
                            }}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-semibold flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded transition-colors shrink-0"
                        >
                            <Sparkles className="w-2.5 h-2.5" /> Edit with Mori
                        </button>
                    </div>

                    {/* Date Range */}
                    {origData.date_range && (
                        <div className="flex items-center gap-1.5 text-small text-gray-500 mb-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <CopyableText
                                text={origData.date_range}
                                className="inline"
                                showIcon={false}
                            />
                        </div>
                    )}

                    {/* Associated With */}
                    {origData.associated_with && (
                        <div className="flex items-center gap-1.5 text-small text-gray-600 mb-2">
                            <Building2 className="w-3.5 h-3.5" />
                            <CopyableText
                                text={`Associated with ${origData.associated_with}`}
                                className="inline"
                                showIcon={false}
                            />
                        </div>
                    )}

                    {/* URL */}
                    {origData.url && (
                        <div className="mb-3">
                            <a
                                href={origData.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-small text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="truncate max-w-xs">{origData.url}</span>
                            </a>
                        </div>
                    )}

                    {/* Description Bullets */}
                    {displayBullets.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                            {displayBullets.map((bullet, idx) => (
                                <CopyableText
                                    key={idx}
                                    text={bullet.startsWith('•') ? bullet : `• ${bullet}`}
                                    className="text-small text-gray-700 block leading-relaxed"
                                    showIcon={false}
                                />
                            ))}
                        </div>
                    )}

                    {/* Skills Tags */}
                    {displaySkills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            <span className="text-small text-gray-500">◇</span>
                            {displaySkills.map((skill, idx) => (
                                <CopyableText
                                    key={idx}
                                    text={skill}
                                    className="text-small text-gray-700"
                                    showIcon={false}
                                >
                                    <span>{skill}</span>
                                    {idx < displaySkills.length - 1 && (
                                        <span className="text-gray-400 mx-1">·</span>
                                    )}
                                </CopyableText>
                            ))}
                            {displaySkills.length > 3 && (
                                <span className="text-small text-gray-500">
                                    and +{displaySkills.length - 3} skills
                                </span>
                            )}
                        </div>
                    )}

                    {/* Copy All for this entry */}
                    <div className="mt-3 flex justify-end">
                        <CopyAllButton
                            content={projectContent}
                            label="Copy Project"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
