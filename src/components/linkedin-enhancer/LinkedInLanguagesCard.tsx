'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Globe, MessageCircle } from 'lucide-react';
import CopyableText, { CopyAllButton } from './CopyableText';
import type { LinkedInLanguagesSection } from '@/types/linkedin';

interface LinkedInLanguagesCardProps {
    data: LinkedInLanguagesSection;
}

export default function LinkedInLanguagesCard({ data }: LinkedInLanguagesCardProps) {
    if (!data.languages || data.languages.length === 0) {
        return null; // Don't render if no languages
    }

    // All content for copying
    const allContent = data.languages
        .map(lang => `${lang.name} - ${lang.proficiency}`)
        .join('\n');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-500" />
                    <h2 className="text-h3 font-semibold text-gray-900">Languages</h2>
                </div>
                <CopyAllButton content={allContent} label="Copy All" />
            </div>

            {/* Language List */}
            <div className="space-y-3">
                {data.languages.map((language, idx) => (
                    <CopyableText
                        key={idx}
                        text={`${language.name} - ${language.proficiency}`}
                        className="flex items-center justify-between p-2 -ml-2 rounded-lg"
                        showIcon={false}
                    >
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-small font-medium text-gray-900">{language.name}</span>
                        </div>
                        <span className="text-small text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {language.proficiency}
                        </span>
                    </CopyableText>
                ))}
            </div>
        </motion.div>
    );
}
