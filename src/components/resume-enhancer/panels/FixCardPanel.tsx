'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { getScoreColor } from '@/lib/utils/cv-scoring';

interface FixItem {
    id: string;
    issue: string;
    impactScoreDelta?: number;
    status: 'pending' | 'processing' | 'completed';
}

interface FixCardPanelProps {
    fixes: FixItem[];
    currentScore: number;
    targetScore: number;
    onCancel?: () => void;
    onComplete?: () => void;
    isFinished?: boolean;
}

export default function FixCardPanel({
    fixes,
    currentScore,
    targetScore,
    onCancel,
    onComplete,
    isFinished = false
}: FixCardPanelProps) {
    const scoreInfo = getScoreColor(currentScore);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to processing/last completed item
    React.useEffect(() => {
        if (scrollRef.current) {
            const activeLimit = fixes.findIndex(f => f.status === 'processing');
            const scrollIndex = activeLimit === -1 ? fixes.length - 1 : activeLimit;

            // basic logic to scroll slightly
            if (scrollIndex > 2) {
                const itemHeight = 60; // Approx height
                scrollRef.current.scrollTo({
                    top: (scrollIndex - 1) * itemHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, [fixes]);

    return (
        <div className="w-full bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col z-50">
            {/* Header: Score Progress */}
            <div className="px-5 py-4 border-b border-white/10 bg-white/5 relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-white">Optimizing CV...</h3>
                        <p className="text-xs text-white/50">{fixes.filter(f => f.status === 'completed').length} of {fixes.length} fixes applied</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <motion.div
                                className="text-2xl font-bold"
                                key={currentScore}
                                initial={{ scale: 1.2, color: '#fff' }}
                                animate={{ scale: 1, color: scoreInfo.color }} // Let class handle color
                            >
                                {currentScore}
                            </motion.div>
                            {/* <div className="text-[10px] text-white/40">Current Score</div> */}
                        </div>
                    </div>
                </div>

                {/* Progress Bar Background */}
                <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
                    <motion.div
                        className="h-full bg-[#80FF00]"
                        initial={{ width: 0 }}
                        animate={{ width: `${(fixes.filter(f => f.status === 'completed').length / fixes.length) * 100}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            {/* List of Fixes */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 max-h-[60vh] min-h-[300px]"
            >
                <AnimatePresence initial={false}>
                    {fixes.map((fix) => (
                        <motion.div
                            key={fix.id}
                            initial={{ opacity: 0.5, y: 10 }}
                            animate={{
                                opacity: fix.status === 'pending' ? 0.5 : 1,
                                y: 0,
                                scale: fix.status === 'processing' ? 1.02 : 1,
                                borderColor: fix.status === 'processing' ? 'rgba(128, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.05)'
                            }}
                            className={`
                                relative p-3 rounded-xl border transition-colors
                                ${fix.status === 'processing' ? 'bg-[#80FF00]/10 border-[#80FF00]/30' : 'bg-white/5 border-white/5'}
                                ${fix.status === 'completed' ? 'bg-green-500/5 border-green-500/10' : ''}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex-shrink-0">
                                    {fix.status === 'completed' ? (
                                        <motion.div
                                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                                            className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center"
                                        >
                                            <Check size={12} strokeWidth={3} />
                                        </motion.div>
                                    ) : fix.status === 'processing' ? (
                                        <div className="w-5 h-5 rounded-full bg-[#80FF00]/20 text-[#80FF00] flex items-center justify-center">
                                            <Loader2 size={12} className="animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-white/10 border border-white/10" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium leading-relaxed ${fix.status === 'pending' ? 'text-white/40' : 'text-white/90'}`}>
                                        {fix.issue}
                                    </p>

                                    {fix.status === 'completed' && fix.impactScoreDelta && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="mt-1 flex items-center gap-1 text-[10px] text-green-400 font-bold"
                                        >
                                            <Sparkles size={10} />
                                            +{fix.impactScoreDelta} points
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5">
                {isFinished ? (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={onComplete}
                        className="w-full py-2.5 bg-[#80FF00] hover:bg-[#70e600] text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#80FF00]/20"
                    >
                        Success! See Results <ArrowRight size={16} />
                    </motion.button>
                ) : (
                    <button
                        onClick={onCancel}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium rounded-lg transition-colors"
                    >
                        Stop Optimization
                    </button>
                )}
            </div>
        </div>
    );
}
