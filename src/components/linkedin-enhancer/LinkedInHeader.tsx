'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, RefreshCw, Sparkles, Crown } from 'lucide-react';
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
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${s.active ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                {s.step}
                            </div>
                            <span className={`text-sm font-medium ${s.active ? 'text-gray-950 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400'}`}>
                                {s.label}
                            </span>
                            {idx < arr.length - 1 && (
                                <div className="w-6 h-px bg-gray-300 dark:bg-gray-700 sm:w-8" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Right: Controls (CV selector, Import button, Tone selector, Regenerate button, Quick mode) */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* CV Selector Dropdown */}
                    {availableCvs.length > 0 && (
                        <div className="relative">
                            <motion.button
                                onClick={() => canSelectCv ? setShowCvDropdown(!showCvDropdown) : (onUpgradeClick?.())}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${!canSelectCv ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'} hover:border-gray-300 dark:hover:border-gray-600 text-sm transition-colors`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {!canSelectCv && <Crown className="w-3 h-3 text-amber-500" />}
                                <span className="text-gray-700 dark:text-gray-200">
                                    {selectedCv ? selectedCv.name : 'Master CV'}
                                </span>
                                {canSelectCv && <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                                {!canSelectCv && <span className="text-xs text-amber-600 font-medium">PRO</span>}
                            </motion.button>

                            {showCvDropdown && canSelectCv && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                                >
                                    {availableCvs.map((cv) => (
                                        <button
                                            key={cv.id}
                                            onClick={() => {
                                                onCvSelect(cv.id, cv.type);
                                                setShowCvDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors ${cv.id === selectedCvId ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                        >
                                            <span className="text-gray-700 dark:text-gray-200">{cv.name}</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-400 uppercase">{cv.type}</span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Fetch/Import from LinkedIn Button */}
                    {onFetchFromLinkedIn && (
                        <motion.button
                            onClick={onFetchFromLinkedIn}
                            disabled={isFetchingFromLinkedIn}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${isFetchingFromLinkedIn ? 'bg-blue-400' : 'bg-[#0a66c2] hover:bg-[#004182]'}`}
                            whileHover={{ scale: isFetchingFromLinkedIn ? 1 : 1.02 }}
                            whileTap={{ scale: isFetchingFromLinkedIn ? 1 : 0.98 }}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            <span>{isFetchingFromLinkedIn ? 'Importing...' : 'Import'}</span>
                        </motion.button>
                    )}

                    {/* Tone Selector */}
                    <div className="relative">
                        <motion.button
                            onClick={() => canChangeTone ? setShowToneDropdown(!showToneDropdown) : (onUpgradeClick?.())}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${!canChangeTone ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'} hover:border-gray-300 dark:hover:border-gray-600 text-sm transition-colors`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {!canChangeTone && <Crown className="w-3 h-3 text-amber-500" />}
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="text-gray-700 dark:text-gray-200">{currentTone}</span>
                            {canChangeTone && <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                            {!canChangeTone && <span className="text-xs text-amber-600 font-medium">PRO</span>}
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
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${tone === currentTone ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}
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
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ backgroundColor: '#0a66c2' }}
                        whileHover={{ scale: isEnhancing ? 1 : 1.02 }}
                        whileTap={{ scale: isEnhancing ? 1 : 0.98 }}
                    >
                        <RefreshCw className={`w-4 h-4 ${isEnhancing ? 'animate-spin' : ''}`} />
                        <span>{isEnhancing ? 'Enhancing...' : 'Enhance'}</span>
                    </motion.button>

                    {/* Quick Mode Toggle */}
                    <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <span className="text-amber-500">⚡</span> Optimize
                        </span>
                        <button
                            onClick={() => setQuickMode(!quickMode)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${quickMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                            role="switch"
                            aria-checked={quickMode}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${quickMode ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>
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
