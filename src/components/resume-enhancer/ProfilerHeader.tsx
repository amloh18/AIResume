'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Edit2, TrendingUp } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { SeniorityLevel } from '@/lib/data/role-profiler-data';

import Logo from '@/components/ui/Logo';

export default function ProfilerHeader() {
    const { state, dispatch, runCVSurgeon } = useResumeEnhancer();

    const handleEditClick = () => {
        dispatch({ type: 'SET_SHOW_PROFILER_MODAL', payload: true });
    };

    const handleProfileUpdate = async () => {
        // Re-run CV Surgeon when profile is edited
        if (state.targetRole && state.seniorityLevel) {
            await runCVSurgeon();
        }
    };

    React.useEffect(() => {
        // Trigger re-analysis when role or seniority changes
        if (state.targetRole && state.seniorityLevel && state.cvData.basics?.name) {
            handleProfileUpdate();
        }
    }, [state.targetRole, state.seniorityLevel]);

    // if (!state.targetRole || !state.seniorityLevel) {
    //    return null;
    // }

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-50 bg-[var(--header-bg)] px-6 py-4 backdrop-blur-sm shadow-sm shadow-black/10 dark:shadow-black/30"
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Logo & Profile Info */}
                <div className="flex items-center gap-8">
                    <Logo size="md" />

                    <div className="h-10 w-px bg-black/10 dark:bg-white/20" />

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-[color:var(--accent-primary)]/10 rounded-lg">
                                <Briefcase className="h-5 w-5 text-[color:var(--accent-primary)]" />
                            </div>
                            <div>
                                <div className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wide">Target Role</div>
                                <div className="text-[color:var(--text-primary)] font-semibold">{state.targetRole || 'Not Set'}</div>
                            </div>
                        </div>

                        <div className="h-10 w-px bg-black/10 dark:bg-white/20" />

                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-[color:var(--accent-primary)]/10 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-[color:var(--accent-primary)]" />
                            </div>
                            <div>
                                <div className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wide">Seniority</div>
                                <div className="text-[color:var(--text-primary)] font-semibold">{state.seniorityLevel || 'Not Set'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Button */}
                <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-all group shadow-sm shadow-black/10 dark:shadow-black/30"
                >
                    <Edit2 className="h-4 w-4 text-[color:var(--text-secondary)] group-hover:text-[color:var(--accent-primary)] transition-colors" />
                    <span className="text-[color:var(--text-secondary)] group-hover:text-[color:var(--text-primary)] text-sm font-medium transition-colors">
                        Edit Profile
                    </span>
                </button>
            </div>

            {/* Re-analysis indicator */}
            {state.isAnalyzing && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 max-w-7xl mx-auto"
                >
                    <div className="flex items-center gap-3 px-4 py-2 bg-[color:var(--accent-primary)]/10 rounded-lg shadow-sm shadow-black/10 dark:shadow-black/30">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[color:var(--accent-primary)] border-t-transparent" />
                        <span className="text-sm text-[color:var(--accent-primary)]">Re-analyzing CV with new profile...</span>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
