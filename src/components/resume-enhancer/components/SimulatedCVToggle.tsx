'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, GitMerge, RotateCcw, AlertCircle } from 'lucide-react';

interface SimulatedCVToggleProps {
    isSimulated: boolean;
    onToggle: (simulated: boolean) => void;
    strategicFixRequired?: boolean;
    disabled?: boolean;
}

export default function SimulatedCVToggle({
    isSimulated,
    onToggle,
    strategicFixRequired = false,
    disabled = false
}: SimulatedCVToggleProps) {
    return (
        <div className="flex flex-col gap-2">
            {/* Toggle Switch */}
            <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${!isSimulated ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-tertiary)]'}`}>
                    Original
                </span>

                <button
                    onClick={() => onToggle(!isSimulated)}
                    disabled={disabled}
                    className={`relative w-14 h-7 rounded-full transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        } ${isSimulated ? 'bg-purple-500' : 'bg-[var(--bg-tertiary)]'}`}
                >
                    <motion.div
                        className={`absolute top-1 w-5 h-5 rounded-full ${isSimulated ? 'bg-white' : 'bg-[var(--accent-primary)]'
                            }`}
                        animate={{ left: isSimulated ? 'calc(100% - 24px)' : '4px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />

                    {/* Icons inside toggle */}
                    <div className="absolute inset-0 flex items-center justify-between px-1.5">
                        <RotateCcw className={`w-3 h-3 ${!isSimulated ? 'text-black' : 'text-white/50'}`} />
                        <Sparkles className={`w-3 h-3 ${isSimulated ? 'text-purple-900' : 'text-[var(--text-tertiary)]'}`} />
                    </div>
                </button>

                <span className={`text-xs font-medium ${isSimulated ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-tertiary)]'}`}>
                    Simulated
                </span>
            </div>

            {/* Status indicator */}
            <AnimatePresence mode="wait">
                {isSimulated ? (
                    <motion.div
                        key="simulated"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20"
                    >
                        <GitMerge className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-purple-300">
                            Viewing strategic enhancements with [STRATEGIC UPGRADE] projects
                        </span>
                    </motion.div>
                ) : strategicFixRequired ? (
                    <motion.div
                        key="recommended"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                    >
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-yellow-300">
                            Score &lt; 75% — Simulated enhancements recommended
                        </span>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
