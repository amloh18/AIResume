'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, Zap } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { getScoreColor } from '@/lib/utils/cv-scoring';

export default function FloatingPulsePill() {
    const { state, dispatch } = useResumeEnhancer();

    const handleClick = () => {
        // Toggle surgeon overlay visibility
        dispatch({ type: 'SET_SHOW_SURGEON_OVERLAY', payload: !state.showSurgeonOverlay });
    };

    const scoreInfo = getScoreColor(state.cvScore);
    const hasSuggestions = state.surgicalFixes.filter(f => f.status === 'pending').length > 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className={`${state.showSurgeonOverlay ? 'absolute bottom-4 right-4' : 'fixed top-4 right-4'} z-50`}
            >
                <button
                    onClick={handleClick}
                    className={`relative group ${state.showSurgeonOverlay ? 'scale-95' : ''} transition-transform`}
                >
                    {/* Pulse animation ring - Custom subtler animation */}
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: scoreInfo.color }}
                        initial={{ opacity: 0, scale: 1 }}
                        animate={{ opacity: [0, 0.1, 0], scale: [1, 1.1, 1.2] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Main pill */}
                    <div
                        className="relative flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl transition-all"
                        style={{
                            backgroundColor: 'var(--bg-secondary)',
                            boxShadow: `0 0 12px ${scoreInfo.color}40`
                        }}
                    >
                        {/* Score */}
                        <div className="flex items-center gap-2">
                            <div
                                className="text-2xl font-bold"
                                style={{ color: scoreInfo.color }}
                            >
                                {state.cvScore}
                            </div>
                            <div className="text-[color:var(--text-tertiary)] text-sm">/100</div>
                        </div>

                        <div className="h-6 w-px bg-black/10 dark:bg-white/20" />

                        {/* Label */}
                        <div className="text-left">
                            <div className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wide">CV Score</div>
                            <div className="text-[color:var(--text-primary)] font-medium text-sm">{scoreInfo.label}</div>
                        </div>

                        {/* Sparkles icon when suggestions available */}
                        {hasSuggestions && !state.showSurgeonOverlay && (
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="ml-2"
                            >
                                <Sparkles className="h-5 w-5 text-[color:var(--accent-primary)]" />
                            </motion.div>
                        )}

                        {/* Expand indicator */}
                        <motion.div
                            animate={{ rotate: state.showSurgeonOverlay ? 180 : 0 }}
                            className="ml-2"
                        >
                            <Zap className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                        </motion.div>
                    </div>

                    {/* Notification badge for pending fixes */}
                    {hasSuggestions && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 px-2 py-1 bg-[var(--accent-primary)] text-black text-xs font-bold rounded-full shadow-lg"
                        >
                            {state.surgicalFixes.filter(f => f.status === 'pending').length}
                        </motion.div>
                    )}

                    {/* Tooltip on hover */}
                    <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="px-3 py-2 bg-[var(--modal-bg)] text-[color:var(--text-primary)] text-xs rounded-lg whitespace-nowrap shadow-xl shadow-black/20 dark:shadow-black/40">
                            {state.showSurgeonOverlay ? 'Close CV Surgeon' : 'Open CV Surgeon'}
                        </div>
                    </div>
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
