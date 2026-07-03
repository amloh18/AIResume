'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, RefreshCw, Sparkles, Crown, MessageSquare, PanelRightClose, PanelRightOpen, ExternalLink } from 'lucide-react';
import { useMembership } from '@/lib/hooks/useMembership';
import type { CVSelectionItem, LinkedInUserContext } from '@/types/linkedin';

interface LinkedInHeaderProps {
    availableCvs: CVSelectionItem[];
    selectedCvId: string | null;
    onCvSelect: (id: string, type: 'master' | 'standalone') => void;
    onRegenerate: () => void;
    isEnhancing: boolean;
    currentTone: LinkedInUserContext['tone_selection'];
    onToneChange: (tone: LinkedInUserContext['tone_selection']) => void;
    onToneChangeWithRegenerate?: (tone: LinkedInUserContext['tone_selection']) => void;
    onUpgradeClick?: () => void;
    onFetchFromLinkedIn?: () => void;
    isFetchingFromLinkedIn?: boolean;
    showMoriChat?: boolean;
    setShowMoriChat?: (val: boolean) => void;
    showInsights?: boolean;
    setShowInsights?: (val: boolean) => void;
}

const TONES: LinkedInUserContext['tone_selection'][] = ['Professional', 'Startup-Friendly', 'Executive', 'Conversational'];

export default function LinkedInHeader({
    availableCvs,
    selectedCvId,
    onCvSelect,
    onRegenerate,
    isEnhancing,
    currentTone,
    onToneChange,
    onToneChangeWithRegenerate,
    onUpgradeClick,
    onFetchFromLinkedIn,
    isFetchingFromLinkedIn = false,
    showMoriChat = false,
    setShowMoriChat,
    showInsights = true,
    setShowInsights,
}: LinkedInHeaderProps) {
    const { canAccess } = useMembership();
    const [showCvDropdown, setShowCvDropdown] = useState(false);
    const [showToneDropdown, setShowToneDropdown] = useState(false);
    const [quickMode, setQuickMode] = useState(false);

    const selectedCv = availableCvs.find(cv => cv.id === selectedCvId);

    const canChangeTone = canAccess('linkedinToneChange');
    const canSelectCv = canAccess('linkedinCVSelection');

    return (
        <div
            className="sticky top-0 z-40 bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-gray-800 py-3 px-4 sm:px-6 lg:px-8 shadow-sm transition-colors duration-200"
        >
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Left: Progress Steps */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    {[
                        { step: 1, label: 'Select CV', active: true },
                        { step: 2, label: 'Review & Edit', active: isEnhancing || !!selectedCvId },
                        { step: 3, label: 'Apply to LinkedIn', active: false },
                    ].map((s, idx, arr) => (
                        <div key={s.step} className="flex items-center gap-2">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-small font-semibold ${s.active ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                {s.step}
                            </div>
                            <span className={`text-small font-medium ${s.active ? 'text-gray-950 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400'}`}>
                                {s.label}
                            </span>
                            {idx < arr.length - 1 && (
                                <div className="w-6 h-px bg-gray-300 dark:bg-gray-700 sm:w-8" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Right: Controls (Tone selector, Regenerate button, Open LinkedIn) */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Tone Selector */}
                    <div className="relative">
                        <motion.button
                            onClick={() => canChangeTone ? setShowToneDropdown(!showToneDropdown) : (onUpgradeClick?.())}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${!canChangeTone ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'} hover:border-gray-300 dark:hover:border-gray-600 text-small transition-colors`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {!canChangeTone && <Crown className="w-3 h-3 text-amber-500" />}
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="text-gray-700 dark:text-gray-200">{currentTone}</span>
                            {canChangeTone && <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                            {!canChangeTone && <span className="text-small text-amber-600 font-medium">PRO</span>}
                        </motion.button>

                        {showToneDropdown && canChangeTone && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                            >
                                {TONES.map((tone) => (
                                    <button
                                        key={tone}
                                        onClick={() => {
                                            if (onToneChangeWithRegenerate) {
                                                onToneChangeWithRegenerate(tone);
                                            } else {
                                                onToneChange(tone);
                                            }
                                            setShowToneDropdown(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-small hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${tone === currentTone ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}
                                    >
                                        {tone}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </div>

                    {/* Regenerate Button */}
                    <motion.button
                        onClick={onRegenerate}
                        disabled={isEnhancing || !selectedCvId}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white text-small font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ backgroundColor: '#0a66c2' }}
                        whileHover={{ scale: isEnhancing ? 1 : 1.02 }}
                        whileTap={{ scale: isEnhancing ? 1 : 0.98 }}
                    >
                        <RefreshCw className={`w-4 h-4 ${isEnhancing ? 'animate-spin' : ''}`} />
                        <span>{isEnhancing ? 'Enhancing...' : 'Enhance'}</span>
                    </motion.button>

                    {/* Open LinkedIn link */}
                    <motion.a
                        href="https://www.linkedin.com/in/me/edit/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-small font-medium transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open LinkedIn</span>
                    </motion.a>
                </div>
            </div>

            {/* Click-outside handler for dropdowns */}
            {(showCvDropdown || showToneDropdown) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setShowCvDropdown(false);
                        setShowToneDropdown(false);
                    }}
                />
            )}
        </div>
    );
}
