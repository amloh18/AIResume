'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Star, Shield, Loader2 } from 'lucide-react';
import { ITemplate } from '@/types/template';
import { HARDCODED_TEMPLATES, resolveTemplateThumbnails } from '@/lib/templates/hardcoded-templates';
import Image from 'next/image';

interface TemplateSelectorProps {
    selectedTemplate: ITemplate | null;
    onTemplateSelect: (template: ITemplate) => void;
    cvData?: any;
}

// ATS scoring based on layout type
const TEMPLATE_ATS_SCORES: Record<string, number> = {
    'one-column': 100,
    'two-column': 85,
    'three-column': 75,
    'creative': 70,
    'graphic': 60,
    'custom': 80
};

const getTemplateATSScoreCap = (template: ITemplate): number => {
    const layoutType = template.metadata?.layoutType || 'two-column';
    return TEMPLATE_ATS_SCORES[layoutType] || 80;
};

const getATSFriendliness = (scoreCap: number): { label: string; color: string; bgColor: string } => {
    if (scoreCap >= 95) return { label: 'Excellent', color: 'text-green-500', bgColor: 'bg-green-500/20' };
    if (scoreCap >= 85) return { label: 'Good', color: 'text-lime-500', bgColor: 'bg-lime-500/20' };
    if (scoreCap >= 75) return { label: 'Fair', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' };
    return { label: 'Low', color: 'text-red-500', bgColor: 'bg-red-500/20' };
};

export default function TemplateSelector({
    selectedTemplate,
    onTemplateSelect,
    cvData
}: TemplateSelectorProps) {
    const [templates, setTemplates] = useState<ITemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'free' | 'premium'>('all');

    useEffect(() => {
        const loadTemplates = async () => {
            setLoading(true);
            try {
                // First try to load from API
                const response = await fetch('/api/templates?category=cv');
                if (response.ok) {
                    const data = await response.json();
                    if (data.templates && data.templates.length > 0) {
                        setTemplates(data.templates);
                        setLoading(false);
                        return;
                    }
                }
            } catch (error) {
                console.log('API templates not available, using hardcoded templates');
            }

            // Fall back to hardcoded templates
            const resolvedTemplates = resolveTemplateThumbnails(HARDCODED_TEMPLATES);
            setTemplates(resolvedTemplates as ITemplate[]);
            setLoading(false);
        };

        loadTemplates();
    }, []);

    const getTierIcon = (tier: string) => {
        if (tier === 'premium') return <Crown className="w-3 h-3 text-yellow-500" />;
        return <Star className="w-3 h-3 text-green-500" />;
    };

    const getTierLabel = (tier: string) => {
        return tier === 'premium' ? 'Premium' : 'Free';
    };

    const filteredTemplates = templates.filter(template => {
        if (filter === 'all') return true;
        return template.tier === filter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                <span className="ml-3 text-[color:var(--text-secondary)]">Loading templates...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                {(['all', 'free', 'premium'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                            ? 'bg-[var(--accent-primary)] text-black'
                            : 'bg-[var(--bg-tertiary)] text-[color:var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredTemplates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    const atsScore = getTemplateATSScoreCap(template);
                    const atsFriendliness = getATSFriendliness(atsScore);

                    return (
                        <motion.button
                            key={template.id}
                            onClick={() => onTemplateSelect(template)}
                            className={`relative rounded-xl border-2 transition-all text-left overflow-hidden ${isSelected
                                ? 'border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-[var(--accent-primary)] rounded-full flex items-center justify-center shadow-lg">
                                    <Check className="w-4 h-4 text-black" />
                                </div>
                            )}

                            {/* Tier Badge */}
                            <div className="absolute top-2 left-2 z-10">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full backdrop-blur-sm ${template.tier === 'premium'
                                    ? 'bg-yellow-500/80 text-black'
                                    : 'bg-green-500/80 text-black'
                                    }`}>
                                    {getTierIcon(template.tier)}
                                    {getTierLabel(template.tier)}
                                </span>
                            </div>

                            {/* Template Thumbnail */}
                            <div className="aspect-[8.5/11] bg-white dark:bg-[#1a230f] relative border border-gray-200 dark:border-transparent">
                                {template.thumbnail ? (
                                    <Image
                                        src={template.thumbnail}
                                        alt={template.name}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                                    </div>
                                )}
                            </div>

                            {/* Template Info */}
                            <div className="p-3 bg-[var(--bg-secondary)]">
                                <h3 className="font-semibold text-sm text-[color:var(--text-primary)] truncate mb-1">
                                    {template.name}
                                </h3>

                                {/* ATS Score */}
                                <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${atsFriendliness.bgColor} ${atsFriendliness.color}`}>
                                    <Shield className="w-3 h-3" />
                                    ATS: {atsFriendliness.label}
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-[color:var(--text-secondary)]">
                    <p>No templates found for this filter.</p>
                </div>
            )}
        </div>
    );
}
