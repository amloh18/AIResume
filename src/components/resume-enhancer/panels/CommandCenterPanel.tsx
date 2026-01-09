import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Issue, IssueTier } from '@/lib/pill-engine/types';
import { FeedbackCard } from './FeedbackCard';
import { CheckCheck, TrendingUp } from 'lucide-react';

interface CommandCenterPanelProps {
    issues: Issue[];
    healthScore: number;
    onIssueClick: (issue: Issue) => void;
}

export default function CommandCenterPanel({ issues, healthScore, onIssueClick }: CommandCenterPanelProps) {

    // Group issues by Tier
    const tieredIssues = useMemo(() => {
        const t1 = issues.filter(i => i.tier === 1 && i.severity !== 'positive');
        const t2 = issues.filter(i => i.tier === 2 && i.severity !== 'positive');
        const t3 = issues.filter(i => i.tier === 3 && i.severity !== 'positive');
        const wins = issues.filter(i => i.severity === 'positive');
        return { t1, t2, t3, wins };
    }, [issues]);

    // Display Priority: Tier 1 -> Tier 2 -> Tier 3 -> Wins (interleaved or bottom)
    // For now, simple stack.
    const displayList = [
        ...tieredIssues.t1,
        ...tieredIssues.t2,
        ...tieredIssues.t3,
        ...tieredIssues.wins
    ];

    const getScoreColor = (score: number) => {
        if (score >= 80) return '#80FF00'; // Green
        if (score >= 50) return '#ffaa00'; // Orange
        return '#ff4d4d'; // Red
    };

    const color = getScoreColor(healthScore);

    return (
        <div className="w-[320px] max-h-[60vh] flex flex-col">
            {/* Header / Health Status */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        {/* Circle Background */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/10" />
                            <circle
                                cx="20" cy="20" r="16"
                                stroke={color}
                                strokeWidth="3"
                                fill="transparent"
                                strokeDasharray={100}
                                strokeDashoffset={100 - healthScore}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <span className="absolute text-[10px] font-bold" style={{ color }}>{Math.round(healthScore)}</span>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-white">Resume Health</h3>
                        <p className="text-[10px] text-white/50">
                            {issues.length === 0 ? 'All systems go!' : `${issues.length} items to optimize`}
                        </p>
                    </div>
                </div>

                {healthScore === 100 && (
                    <div className="w-8 h-8 rounded-full bg-[#80FF00]/10 flex items-center justify-center text-[#80FF00]">
                        <CheckCheck size={16} />
                    </div>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                <AnimatePresence>
                    {displayList.map((issue) => (
                        <FeedbackCard
                            key={issue.id}
                            issue={issue}
                            onClick={() => onIssueClick(issue)}
                        />
                    ))}

                    {displayList.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-8 text-center"
                        >
                            <TrendingUp className="text-[#80FF00] mb-2" size={24} />
                            <p className="text-xs text-white/60 font-medium">No critical issues found.</p>
                            <p className="text-[10px] text-white/40 mt-1">You're ready to rock!</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Context Actions */}
            <div className="p-2 border-t border-white/5 bg-white/[0.02] flex justify-between">
                <button className="text-[10px] text-white/40 hover:text-white px-2 py-1 rounded transition-colors">
                    Reset Ignored
                </button>
            </div>
        </div>
    );
}
