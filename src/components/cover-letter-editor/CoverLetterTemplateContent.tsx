'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Star } from 'lucide-react';
import { CoverLetterTemplate, COVER_LETTER_TEMPLATES } from '@/lib/templates/cover-letter-templates';

interface CoverLetterTemplateContentProps {
    selectedTemplate: CoverLetterTemplate | null | undefined;
    onTemplateSelect: (template: CoverLetterTemplate) => void;
}

export default function CoverLetterTemplateContent({
    selectedTemplate,
    onTemplateSelect
}: CoverLetterTemplateContentProps) {
    const getTierIcon = (tier: string) => {
        if (tier === 'premium') return <Crown size={14} className="text-amber-500" />;
        return <Star size={14} className="text-green-500" />;
    };

    const getTierLabel = (tier: string) => {
        return tier === 'premium' ? 'Premium' : 'Free';
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {COVER_LETTER_TEMPLATES.map((template, index) => {
                const isSelected = selectedTemplate?.id === template.id;

                return (
                    <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className={`relative bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all shadow-md hover:shadow-lg ${isSelected
                            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                        onClick={() => onTemplateSelect(template)}
                    >
                        <div className="relative aspect-[0.707] overflow-hidden bg-white group">
                            {template.thumbnail ? (
                                <img
                                    src={template.thumbnail}
                                    alt={`${template.name} preview`}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                        // Try S3 fallback if local image fails
                                        const target = e.target as HTMLImageElement;
                                        const currentSrc = target.src;
                                        const filename = template.thumbnail?.split('/').pop() || '';

                                        // If we haven't tried S3 yet and we have a filename
                                        if (!currentSrc.includes('s3.') && !currentSrc.includes('amazonaws.com') && filename) {
                                            const s3BaseUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;
                                            if (s3BaseUrl) {
                                                // Try S3 bucket
                                                target.src = `${s3BaseUrl}/${encodeURIComponent(filename)}`;
                                                return;
                                            }
                                        }

                                        // If S3 failed or not available, hide image and show fallback
                                        target.style.display = 'none';
                                        target.parentElement!.setAttribute('data-error', 'true');
                                    }}
                                />
                            ) : null}

                            {/* Fallback for missing images */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 -z-10">
                                <span className="text-gray-400 font-medium">{template.name}</span>
                            </div>

                            {/* Template Name Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 via-white/90 to-transparent p-3 backdrop-blur-sm">
                                <h4 className="text-black font-semibold text-sm">{template.name}</h4>
                                <p className="text-black/70 text-xs mt-0.5">{getTierLabel(template.tier)}</p>
                            </div>

                            {/* Selected Indicator */}
                            {isSelected && (
                                <div className="absolute top-2 right-2 bg-[var(--accent-primary)] text-black rounded-full p-1.5 shadow-lg z-10">
                                    <Check size={16} />
                                </div>
                            )}

                            {/* Tier Badge */}
                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-full z-10">
                                {getTierIcon(template.tier)}
                                <span className="text-white text-xs font-medium">{getTierLabel(template.tier)}</span>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
