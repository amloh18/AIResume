// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, TrendingUp, ChevronDown, Search } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { COMMON_JOB_TITLES, SENIORITY_LEVELS, filterJobTitles, SeniorityLevel } from '@/lib/data/role-profiler-data';

interface RoleProfilerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (role: string, seniority: SeniorityLevel) => void;
}

export default function RoleProfilerModal({ isOpen, onClose, onComplete }: RoleProfilerModalProps) {
    const { state } = useResumeEnhancer();
    const [targetRole, setTargetRole] = useState(state.targetRole || '');
    const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel | null>(state.seniorityLevel);
    const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
    const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (targetRole) {
            setRoleSuggestions(filterJobTitles(targetRole));
            setShowRoleSuggestions(true);
        } else {
            setShowRoleSuggestions(false);
        }
    }, [targetRole]);

    const handleComplete = () => {
        if (targetRole && seniorityLevel) {
            onComplete(targetRole, seniorityLevel);
        }
    };

    const isComplete = targetRole && seniorityLevel;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full max-w-2xl bg-[var(--modal-bg)] rounded-2xl shadow-2xl shadow-black/30 dark:shadow-black/60 overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 shadow-sm shadow-black/10 dark:shadow-black/30">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-2">Target Role Profiler</h2>
                                <p className="text-[color:var(--text-secondary)] text-sm">
                                    Help us tailor your CV by specifying your target role and experience level
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-[color:var(--text-secondary)]" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Target Role Input */}
                        <div>
                            <label className="block text-[color:var(--text-primary)] font-medium mb-3">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-[color:var(--accent-primary)]" />
                                    <span>What is your target role?</span>
                                </div>
                            </label>

                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--text-tertiary)]" />
                                    <input
                                        type="text"
                                        value={targetRole}
                                        onChange={(e) => setTargetRole(e.target.value)}
                                        onFocus={() => setShowRoleSuggestions(true)}
                                        placeholder="e.g., Data Analyst, Software Engineer..."
                                        className="w-full pl-10 pr-4 py-3 bg-[var(--input-bg)] rounded-xl text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)] transition-all shadow-sm shadow-black/10 dark:shadow-black/30"
                                    />
                                </div>

                                {/* Autocomplete Suggestions */}
                                {showRoleSuggestions && roleSuggestions.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute z-10 w-full mt-2 bg-[var(--bg-tertiary)] rounded-xl shadow-xl shadow-black/20 dark:shadow-black/50 max-h-60 overflow-y-auto"
                                    >
                                        {roleSuggestions.map((role, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setTargetRole(role);
                                                    setShowRoleSuggestions(false);
                                                }}
                                                className="w-full px-4 py-3 text-left text-[color:var(--text-primary)] hover:bg-[color:var(--accent-primary)]/10 transition-colors"
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Seniority Level Selector */}
                        <div>
                            <label className="block text-[color:var(--text-primary)] font-medium mb-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-[color:var(--accent-primary)]" />
                                    <span>What is your seniority level?</span>
                                </div>
                            </label>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {SENIORITY_LEVELS.map((level) => (
                                    <button
                                        key={level.level}
                                        onClick={() => setSeniorityLevel(level.level)}
                                        className={`p-4 rounded-xl transition-all text-left shadow-sm shadow-black/10 dark:shadow-black/30 ${seniorityLevel === level.level
                                                ? 'bg-[color:var(--accent-primary)]/10 shadow-lg shadow-[color:var(--accent-primary)]/10'
                                                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="font-semibold text-[color:var(--text-primary)] mb-1">{level.level}</div>
                                        <div className="text-xs text-[color:var(--text-tertiary)]">{level.yearsOfExperience}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Selected Level Details */}
                            {seniorityLevel && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4 p-4 bg-[color:var(--accent-primary)]/5 rounded-xl shadow-sm shadow-black/10 dark:shadow-black/30"
                                >
                                    <div className="text-sm text-[color:var(--text-secondary)]">
                                        <strong className="text-[color:var(--accent-primary)]">{seniorityLevel}:</strong>{' '}
                                        {SENIORITY_LEVELS.find(l => l.level === seniorityLevel)?.description}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 flex justify-between items-center shadow-[0_-1px_0_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_0_rgba(255,255,255,0.06)]">
                        <div className="text-sm text-[color:var(--text-tertiary)]">
                            {!isComplete && 'Please complete both fields to continue'}
                            {isComplete && '✓ Ready to proceed'}
                        </div>

                        <button
                            onClick={handleComplete}
                            disabled={!isComplete}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all ${isComplete
                                    ? 'bg-gradient-to-r from-[color:var(--accent-primary)] to-[color:var(--accent-hover)] text-black hover:shadow-lg hover:shadow-[color:var(--accent-primary)]/30'
                                    : 'bg-black/5 dark:bg-white/10 text-[color:var(--text-tertiary)] cursor-not-allowed'
                                }`}
                        >
                            Continue
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
