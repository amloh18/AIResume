'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Quote } from 'lucide-react';
import CopyableText, { CopyAllButton } from './CopyableText';
import { AboutGuard } from './CharacterGuard';
import type { LinkedInAboutSection } from '@/types/linkedin';

interface LinkedInAboutCardProps {
    data: LinkedInAboutSection;
    showEnhanced?: boolean;
}

export default function LinkedInAboutCard({ data, showEnhanced = true }: LinkedInAboutCardProps) {
    const hasEnhancements = data.status === 'suggestion_available' && data.enhanced.hook;

    // Enhanced content as structured sections
    const enhancedContent = hasEnhancements && showEnhanced
        ? `${data.enhanced.hook}\n\n${data.enhanced.body}\n\n${data.enhanced.cta}`
        : data.current;

    const displayContent = showEnhanced && hasEnhancements ? enhancedContent : data.current;
    const characterCount = displayContent.length;

    // All content for copying
    const allContent = enhancedContent || data.current;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">About</h2>
                <CopyAllButton content={allContent} label="Copy All" />
            </div>

            {/* Enhanced View - Structured Hook/Body/CTA */}
            {hasEnhancements && showEnhanced ? (
                <div className="space-y-4">
                    {/* Hook Section - Highlighted */}
                    <div className="relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full" />
                        <div className="pl-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Quote className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                                    Hook (First 200 chars - Mobile Visible)
                                </span>
                            </div>
                            <CopyableText
                                text={data.enhanced.hook}
                                className="text-base font-medium text-gray-900 p-2 -ml-2"
                            >
                                <span className="text-gray-800">{data.enhanced.hook}</span>
                                <Sparkles className="inline-block w-3.5 h-3.5 ml-1.5 text-amber-500" />
                            </CopyableText>
                        </div>
                    </div>

                    {/* Body Section */}
                    <CopyableText
                        text={data.enhanced.body}
                        multiline
                        className="text-sm text-gray-700 leading-relaxed p-2 -ml-2"
                    >
                        <span className="whitespace-pre-wrap">{data.enhanced.body}</span>
                    </CopyableText>

                    {/* CTA Section */}
                    <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
                                Call to Action
                            </span>
                        </div>
                        <CopyableText
                            text={data.enhanced.cta}
                            className="text-sm font-medium text-green-800"
                        />
                    </div>

                    {/* Strategy Note */}
                    {data.enhanced.narrative_strategy && (
                        <div className="p-3 bg-amber-50 rounded-lg">
                            <p className="text-xs text-amber-800">
                                <span className="font-medium">💡 Strategy: </span>
                                {data.enhanced.narrative_strategy}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                /* Original View - Plain text */
                <CopyableText
                    text={data.current}
                    multiline
                    className="text-sm text-gray-700 leading-relaxed p-2 -ml-2 whitespace-pre-wrap"
                />
            )}

            {/* Character Guard */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <AboutGuard current={characterCount} />
            </div>
        </motion.div>
    );
}
