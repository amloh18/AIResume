import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Issue } from '@/lib/pill-engine/types';
import ContextTipItem from './ContextTipItem';
import { Lightbulb, Sparkles, AlertCircle } from 'lucide-react';

interface SmartContextCardProps {
    issues: Issue[];
    onFix: (issue: Issue) => void;
    onDismiss: (issueId: string) => void;
    onAiAssist?: (issue: Issue) => void;
    activeSection?: string;
    // New props for context warning
    onSetRole?: () => void;
    onAddJD?: () => void;
    showMissingContextWarning?: boolean;
}

export default function SmartContextCard({
    issues = [],
    onFix,
    onDismiss,
    onAiAssist,
    activeSection,
    onSetRole,
    onAddJD,
    showMissingContextWarning = false
}: SmartContextCardProps) {

    // Sort issues: Critical -> AI Insight -> Suggestion -> Info
    const sortedIssues = useMemo(() => {
        return [...issues].sort((a, b) => {
            const score = (i: Issue) => {
                let s = 0;
                if (i.sectionId === activeSection || i.section === activeSection) s += 100;
                if (i.priority === 'critical' || i.severity === 'critical') s += 50;
                if (i.priority === 'ai-insight') s += 40;
                if (i.severity === 'warning') s += 30;
                return s;
            };
            return score(b) - score(a);
        });
    }, [issues, activeSection]);

    const displayIssues = sortedIssues.slice(0, 5);

    return (
        <div className="w-[340px] bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-4 space-y-4">
            {/* Header - Simple Style matching ScorecardPanel section headers */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-semibold text-[#80FF00] uppercase tracking-wider flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Smart Context
                </h3>
                {issues.length > 0 && (
                    <span className="bg-[#80FF00]/10 text-[#80FF00] text-[10px] px-2 py-0.5 rounded-full border border-[#80FF00]/20 font-medium">
                        {issues.length}
                    </span>
                )}
            </div>

            {/* Missing Context Warning Card */}
            {showMissingContextWarning && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-2">
                    <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                        <p className="text-xs text-red-300 font-medium leading-normal">
                            Add a target role or job description to enable AI analysis
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 pl-6">
                        <button
                            onClick={onSetRole}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-red-500/30 transition-colors text-left w-full"
                        >
                            Set target role
                        </button>
                        <button
                            onClick={onAddJD}
                            className="bg-transparent hover:bg-red-500/10 text-red-300/70 hover:text-red-200 text-[10px] font-medium px-0 py-1 rounded transition-colors text-left"
                        >
                            Or paste a job description
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {displayIssues.length > 0 ? (
                        displayIssues.map((issue) => (
                            <ContextTipItem
                                key={issue.id}
                                issue={issue}
                                onFix={onFix}
                                onDismiss={onDismiss}
                                onAiAssist={onAiAssist}
                            />
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-6 flex flex-col items-center justify-center text-center opacity-50"
                        >
                            <Sparkles size={24} className="mb-2 text-white/30" />
                            <p className="text-xs text-white/50">Great job! No active suggestions.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer - Minimal */}
            {issues.length > 5 && (
                <div className="pt-3 border-t border-white/10 text-center">
                    <button className="text-[10px] text-white/40 hover:text-white transition-colors uppercase tracking-wider font-bold flex items-center justify-center gap-1 mx-auto">
                        View {issues.length - 5} more tips
                        <AlertCircle size={10} />
                    </button>
                </div>
            )}
        </div>
    );
}
