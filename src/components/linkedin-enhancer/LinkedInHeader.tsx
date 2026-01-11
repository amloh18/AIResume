'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Home, Bell, ChevronDown, RefreshCw, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUserData } from '@/lib/hooks/useUserData';
import type { CVSelectionItem, LinkedInUserContext } from '@/types/linkedin';

interface LinkedInHeaderProps {
    availableCvs: CVSelectionItem[];
    selectedCvId: string | null;
    onCvSelect: (id: string, type: 'master' | 'standalone') => void;
    onRegenerate: () => void;
    isEnhancing: boolean;
    currentTone: LinkedInUserContext['tone_selection'];
    onToneChange: (tone: LinkedInUserContext['tone_selection']) => void;
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
}: LinkedInHeaderProps) {
    const router = useRouter();
    const { userData } = useUserData();
    const [showCvDropdown, setShowCvDropdown] = useState(false);
    const [showToneDropdown, setShowToneDropdown] = useState(false);

    const selectedCv = availableCvs.find(cv => cv.id === selectedCvId);

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
                            <div className="flex items-center gap-1">
                                {/* LinkedIn Logo */}
                                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: '#0a66c2' }}>
                                    <span className="text-white text-xs font-bold">in</span>
                                </div>
                                <span className="text-lg font-semibold text-gray-900">LinkedIn Enhancer</span>
                            </div>
                            <span className="text-gray-400">by</span>
                            <div className="flex items-center">
                                <span className="text-lg font-bold" style={{ color: '#84cc16' }}>CV</span>
                                <span className="text-lg font-bold text-gray-600">Circle</span>
                            </div>
                        </div>
                    </div>

                    {/* Center: CV Selector + Tone + Regenerate */}
                    <div className="flex items-center gap-3">
                        {/* CV Selector Dropdown */}
                        {availableCvs.length > 0 && (
                            <div className="relative">
                                <motion.button
                                    onClick={() => setShowCvDropdown(!showCvDropdown)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white text-sm"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <span className="text-gray-700">
                                        {selectedCv ? selectedCv.name : 'Select CV'}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                </motion.button>

                                {showCvDropdown && (
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
                                onClick={() => setShowToneDropdown(!showToneDropdown)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white text-sm"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span className="text-gray-700">{currentTone}</span>
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            </motion.button>

                            {showToneDropdown && (
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
                                                onToneChange(tone);
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
                            {userData?.image ? (
                                <Image
                                    src={userData.image}
                                    alt={userData.name || 'User'}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-white text-sm font-medium"
                                    style={{ backgroundColor: '#0a66c2' }}
                                >
                                    {userData?.name?.charAt(0) || 'U'}
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
        </header>
    );
}
