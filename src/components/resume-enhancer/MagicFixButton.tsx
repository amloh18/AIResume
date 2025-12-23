'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { Sparkles, Zap, X } from 'lucide-react';

export default function MagicFixButton() {
    const { state, dispatch } = useResumeEnhancer();
    const [showModal, setShowModal] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

    const highImpactFixes = state.surgicalFixes.filter(
        f => f.status === 'pending' && f.impact_score_delta >= 10
    );

    const totalImpact = highImpactFixes.reduce((sum, fix) => sum + fix.impact_score_delta, 0);

    const handleApplyAll = async () => {
        setIsApplying(true);

        // Apply fixes one by one with animation delay
        for (const fix of highImpactFixes) {
            dispatch({ type: 'APPLY_SURGICAL_FIX', payload: fix.id });
            await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for visual feedback
        }

        setIsApplying(false);
        setShowModal(false);
    };

    if (highImpactFixes.length === 0) {
        return null;
    }

    return (
        <>
            <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all"
            >
                <Zap className="w-5 h-5" />
                Magic Fix ({highImpactFixes.length})
            </motion.button>

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => !isApplying && setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--modal-bg)] rounded-xl p-6 max-w-md w-full shadow-2xl shadow-black/30 dark:shadow-black/60"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[color:var(--text-primary)]">Magic Fix</h3>
                                </div>
                                {!isApplying && (
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-[color:var(--text-tertiary)]" />
                                    </button>
                                )}
                            </div>

                            {/* Content */}
                            <div className="mb-6">
                                <p className="text-[color:var(--text-secondary)] mb-4">
                                    Apply all <span className="text-purple-400 font-semibold">{highImpactFixes.length} high-impact fixes</span> to boost your CV score instantly!
                                </p>

                                {/* Impact Preview */}
                                <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-4 shadow-sm shadow-black/10 dark:shadow-black/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-[color:var(--text-tertiary)]">Current Score</span>
                                        <span className="text-2xl font-bold text-[color:var(--text-primary)]">{state.cvScore}</span>
                                    </div>
                                    <div className="flex items-center justify-center my-2">
                                        <div className="text-[color:var(--accent-primary)] text-lg">▼</div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[color:var(--text-tertiary)]">Estimated Score</span>
                                        <span className="text-2xl font-bold text-[color:var(--accent-primary)]">
                                            {Math.min(100, state.cvScore + totalImpact)}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <span className="text-xs text-purple-400 font-medium">
                                            +{totalImpact} points boost!
                                        </span>
                                    </div>
                                </div>

                                {/* Fix List */}
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {highImpactFixes.map(fix => (
                                        <div
                                            key={fix.id}
                                            className="bg-[var(--bg-tertiary)] rounded p-2 shadow-sm shadow-black/10 dark:shadow-black/30"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-[color:var(--text-tertiary)]">{fix.section}</span>
                                                <span className="text-xs text-purple-400 font-medium">
                                                    +{fix.impact_score_delta}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[color:var(--text-secondary)] line-clamp-2">{fix.issue}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    disabled={isApplying}
                                    className="flex-1 px-4 py-3 bg-black/5 dark:bg-white/5 text-[color:var(--text-secondary)] rounded-lg font-medium hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApplyAll}
                                    disabled={isApplying}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isApplying ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Applying...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            Apply All
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
