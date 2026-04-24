'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Home, Bell, ChevronDown, RefreshCw, Sparkles, Crown, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUserData, getUserDisplayName, getUserAvatar } from '@/lib/hooks/useUserData';
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
}

const TONES: LinkedInUserContext['tone_selection'][] = ['Professional', 'Visionary', 'Technical', 'Relatable'];

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
}: LinkedInHeaderProps) {
    const router = useRouter();
    const { userData } = useUserData();
    const { canAccess, membership } = useMembership();
    const [showCvDropdown, setShowCvDropdown] = useState(false);
    const [showToneDropdown, setShowToneDropdown] = useState(false);
    const [quickMode, setQuickMode] = useState(false);

    const selectedCv = availableCvs.find(cv => cv.id === selectedCvId);

    // Check permissions for LinkedIn Enhancer features
    const canChangeTone = canAccess('linkedinToneChange');
    const canSelectCv = canAccess('linkedinCVSelection');

    const handleHomeClick = useCallback(() => {
        router.push('/dashboard');
    }, [router]);

    return (
        <header
            className="sticky top-0 z-50 bg-white border-b border-gray-200"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    {/* Left: Home and Branding */}
                    <div className="flex items-center gap-4">
                        {/* Home Button */}
                        <motion.button
                            onClick={handleHomeClick}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Back to Dashboard"
                        >
                            <Home className="w-5 h-5 text-gray-600" />
                        </motion.button>

                        {/* Branding */}
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                                <span className="text-base font-black tracking-tighter leading-none text-gray-900">
                                    CV<span className="text-lime-500">CIRCLE</span>
                                </span>
                                <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-lime-500/60 leading-none mt-1">
                                    LinkedIn Enhancer
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Center: CV Selector + Tone + Regenerate */}
                    <div className="flex items-center gap-3">
                        {/* CV Selector Dropdown */}
                        {availableCvs.length > 0 && (
                            <div className="relative">
                                <motion.button
                                    onClick={() => canSelectCv ? setShowCvDropdown(!showCvDropdown) : (onUpgradeClick?.())}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${!canSelectCv ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'} hover:border-gray-300 text-sm`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {!canSelectCv && <Crown className="w-3 h-3 text-amber-500" />}
                                    <span className="text-gray-700">
                                        {selectedCv ? selectedCv.name : 'Master CV'}
                                    </span>
                                    {canSelectCv && <ChevronDown className="w-4 h-4 text-gray-500" />}
                                    {!canSelectCv && <span className="text-xs text-amber-600 font-medium">PRO</span>}
                                </motion.button>

                                {showCvDropdown && canSelectCv && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                                    >
                                        {availableCvs.map((cv) => (
                                            <button
                                                key={cv.id}
                                                onClick={() => {
                                                    onCvSelect(cv.id, cv.type);
                                                    setShowCvDropdown(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${cv.id === selectedCvId ? 'bg-blue-50' : ''
                                                    }`}
                                            >
                                                <span className="text-gray-700">{cv.name}</span>
                                                <span className="text-xs text-gray-400 uppercase">{cv.type}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* Tone Selector */}
                        <div className="relative">
                            <motion.button
                                onClick={() => canChangeTone ? setShowToneDropdown(!showToneDropdown) : (onUpgradeClick?.())}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${!canChangeTone ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'} hover:border-gray-300 text-sm`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {!canChangeTone && <Crown className="w-3 h-3 text-amber-500" />}
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span className="text-gray-700">{currentTone}</span>
                                {canChangeTone && <ChevronDown className="w-4 h-4 text-gray-500" />}
                                {!canChangeTone && <span className="text-xs text-amber-600 font-medium">PRO</span>}
                            </motion.button>

                            {showToneDropdown && canChangeTone && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                                >
                                    {TONES.map((tone) => (
                                        <button
                                            key={tone}
                                            onClick={() => {
                                                // Use the regenerate version if available (triggers enhancement with new tone)
                                                if (onToneChangeWithRegenerate) {
                                                    onToneChangeWithRegenerate(tone);
                                                } else {
                                                    onToneChange(tone);
                                                }
                                                setShowToneDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${tone === currentTone ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                                }`}
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
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#0a66c2' }}
                            whileHover={{ scale: isEnhancing ? 1 : 1.02 }}
                            whileTap={{ scale: isEnhancing ? 1 : 0.98 }}
                        >
                            <RefreshCw className={`w-4 h-4 ${isEnhancing ? 'animate-spin' : ''}`} />
                            <span>{isEnhancing ? 'Enhancing...' : 'Regenerate'}</span>
                        </motion.button>
                    </div>

                    {/* Right: Notification and Avatar */}
                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <motion.button
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Bell className="w-5 h-5 text-gray-600" />
                            {/* Notification dot */}
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        </motion.button>

                        {/* User Avatar */}
                        <motion.button
                            className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {getUserAvatar(userData) ? (
                                <Image
                                    src={getUserAvatar(userData)}
                                    alt={getUserDisplayName(userData)}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-white text-sm font-medium"
                                    style={{ backgroundColor: '#0a66c2' }}
                                >
                                    {getUserDisplayName(userData).charAt(0)}
                                </div>
                            )}
                        </motion.button>
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

            {/* 3-Step Progress Header & Quick Mode Toggle */}
            <div className="border-t border-gray-100 bg-gray-50/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-12">
                        {/* Progress Steps */}
                        <div className="flex items-center gap-6">
                            {[
                                { step: 1, label: 'Select CV', active: true },
                                { step: 2, label: 'Review & Edit', active: isEnhancing || !!selectedCvId },
                                { step: 3, label: 'Apply to LinkedIn', active: false },
                            ].map((s, idx, arr) => (
                                <div key={s.step} className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${s.active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        {s.step}
                                    </div>
                                    <span className={`text-sm font-medium ${s.active ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {s.label}
                                    </span>
                                    {idx < arr.length - 1 && (
                                        <div className="w-8 h-px bg-gray-300 ml-4" />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Quick Mode Toggle */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                <span className="text-amber-500">⚡</span> One-click optimize
                            </span>
                            <button
                                onClick={() => setQuickMode(!quickMode)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${quickMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                                role="switch"
                                aria-checked={quickMode}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${quickMode ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
