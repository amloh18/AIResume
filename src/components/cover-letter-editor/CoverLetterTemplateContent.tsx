'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Star } from 'lucide-react';
import { CoverLetterTemplate, COVER_LETTER_TEMPLATES } from '@/lib/templates/cover-letter-templates';

interface CoverLetterTemplateContentProps {
    selectedTemplate: CoverLetterTemplate | null;
    onTemplateSelect: (template: CoverLetterTemplate) => void;
}

export default function CoverLetterTemplateContent({
    selectedTemplate,
    onTemplateSelect
}: CoverLetterTemplateContentProps) {
    const getTierIcon = (tier: string) => {
        if (tier === 'premium') return <Crown className="w-3 h-3 text-yellow-500" />;
        return <Star className="w-3 h-3 text-green-500" />;
    };

    const getTierLabel = (tier: string) => {
        return tier === 'premium' ? 'Premium' : 'Free';
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COVER_LETTER_TEMPLATES.map((template) => {
                const isSelected = selectedTemplate?.id === template.id;

                return (
                    <motion.button
                        key={template.id}
                        onClick={() => onTemplateSelect(template)}
                        className={`relative p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-lg'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#1a230f]'
                            }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {/* Selection Indicator */}
                        {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--accent-primary)] rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-black" />
                            </div>
                        )}

                        {/* Template Preview Thumbnail */}
                        <div className="aspect-[8.5/11] bg-gray-100 dark:bg-[#313a28] rounded-lg mb-3 overflow-hidden relative">
                            {/* Simple template preview mockup */}
                            <div
                                className="absolute inset-2 flex flex-col gap-1"
                                style={{
                                    fontFamily: template.layout.typography.fontFamily,
                                }}
                            >
                                {/* Header section */}
                                <div
                                    className={`h-8 flex items-center ${template.layout.headerAlignment === 'center' ? 'justify-center' :
                                            template.layout.headerAlignment === 'right' ? 'justify-end' : 'justify-start'
                                        }`}
                                >
                                    <div
                                        className="h-2 w-16 rounded"
                                        style={{ backgroundColor: template.layout.styling.primaryColor }}
                                    />
                                </div>

                                {/* Date line */}
                                <div className={`flex ${template.layout.datePosition === 'right' ? 'justify-end' : 'justify-start'}`}>
                                    <div className="h-1 w-10 bg-gray-300 dark:bg-gray-600 rounded" />
                                </div>

                                {/* Body lines */}
                                <div className="flex-1 flex flex-col gap-1 mt-2">
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-1 bg-gray-200 dark:bg-gray-600 rounded"
                                            style={{ width: `${85 - (i % 3) * 15}%` }}
                                        />
                                    ))}
                                </div>

                                {/* Signature area */}
                                <div className="mt-auto">
                                    <div className="h-1 w-12 bg-gray-300 dark:bg-gray-600 rounded mb-1" />
                                    <div
                                        className="h-1.5 w-16 rounded"
                                        style={{ backgroundColor: template.layout.styling.primaryColor }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Template Info */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                                    {template.name}
                                </h3>
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${template.tier === 'premium'
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    }`}>
                                    {getTierIcon(template.tier)}
                                    {getTierLabel(template.tier)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {template.description}
                            </p>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}
