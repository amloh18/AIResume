/**
 * Active/Archived Job Limit Counter Component
 * 
 * Shows "3/3 active jobs" indicator for free users
 * Suggests archiving jobs when limit is reached
 */

'use client';

import React from 'react';
import { Archive, AlertCircle, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

interface JobLimitCounterProps {
    /** Current number of active jobs */
    activeCount: number;
    /** Maximum allowed active jobs (-1 for unlimited) */
    limit: number;
    /** Current user plan */
    planKey?: string;
    /** Callback when user clicks archive suggestion */
    onArchiveSuggestion?: () => void;
    /** Callback when user clicks upgrade */
    onUpgrade?: () => void;
}

export default function JobLimitCounter({
    activeCount,
    limit,
    planKey = 'free',
    onArchiveSuggestion,
    onUpgrade
}: JobLimitCounterProps) {
    // Don't show for unlimited plans
    if (limit === -1) {
        return null;
    }

    const remaining = Math.max(0, limit - activeCount);
    const isAtLimit = remaining === 0;
    const isNearLimit = remaining <= 1 && remaining > 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border ${isAtLimit
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    : isNearLimit
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                }`}
        >
            {/* Icon */}
            {isAtLimit ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
                <Archive className="w-5 h-5 flex-shrink-0" />
            )}

            {/* Counter */}
            <div className="flex flex-col">
                <span className="text-sm font-semibold">
                    Active Jobs: {activeCount}/{limit}
                </span>
                {isAtLimit && (
                    <span className="text-xs opacity-90">
                        Archive a job to track more
                    </span>
                )}
                {isNearLimit && (
                    <span className="text-xs opacity-90">
                        {remaining} slot remaining
                    </span>
                )}
            </div>

            {/* Actions */}
            {isAtLimit && (
                <div className="flex items-center gap-2 ml-2 border-l border-current/20 pl-3">
                    {onArchiveSuggestion && (
                        <button
                            onClick={onArchiveSuggestion}
                            className="text-xs px-3 py-1 bg-current/10 hover:bg-current/20 rounded-lg font-medium transition-colors"
                        >
                            Archive Job
                        </button>
                    )}
                    {onUpgrade && (
                        <button
                            onClick={onUpgrade}
                            className="flex items-center gap-1.5 text-xs px-3 py-1 bg-[#80FF00] hover:bg-[#70e600] text-black rounded-lg font-medium transition-colors"
                        >
                            <Crown className="w-3.5 h-3.5" />
                            Upgrade
                        </button>
                    )}
                </div>
            )}
        </motion.div>
    );
}
