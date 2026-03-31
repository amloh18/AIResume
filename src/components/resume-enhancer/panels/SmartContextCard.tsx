import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Issue, IssueScoreCategory } from '@/lib/pill-engine/types';
import ContextTipItem from './ContextTipItem';
import { Lightbulb, Sparkles, AlertCircle, CheckSquare, Zap, BarChart3, Layout, Search } from 'lucide-react';

interface SmartContextCardProps {
    issues: Issue[];
    onFix: (issue: Issue) => void;
    onDismiss: (issueId: string) => void;
    onAiAssist?: (issue: Issue) => void;
    onRegenerate?: (issue: Issue) => void;
    /** Called when an issue is hovered — for highlighting affected text in preview */
    onIssueHover?: (issue: Issue | null) => void;
    activeSection?: string;
    /** Issue ID to scroll to and highlight (from preview click) */
    focusedIssueId?: string | null;
    // New props for context warning
    onSetRole?: () => void;
    onAddJD?: () => void;
    showMissingContextWarning?: boolean;
}

type FilterKey = IssueScoreCategory | 'all';

const FILTERS: Array<{ key: FilterKey; label: string; icon: React.ElementType; color: string }> = [
    { key: 'all', label: 'All', icon: Sparkles, color: '#80FF00' },
    { key: 'completeness', label: 'Content', icon: CheckSquare, color: '#3b82f6' },
    { key: 'impact', label: 'Impact', icon: Zap, color: '#f59e0b' },
    { key: 'metrics', label: 'Metrics', icon: BarChart3, color: '#10b981' },
    { key: 'formatting', label: 'Format', icon: Layout, color: '#8b5cf6' },
    { key: 'keywords', label: 'Keywords', icon: Search, color: '#ef4444' },
];

export default function SmartContextCard({
    issues = [],
    onFix,
    onDismiss,
    onAiAssist,
    onRegenerate,
    onIssueHover,
    activeSection,
    focusedIssueId,
    onSetRole,
    onAddJD,
    showMissingContextWarning = false
}: SmartContextCardProps) {

    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const focusedItemRef = useRef<HTMLDivElement>(null);

    // Count issues per category
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: issues.length };
        for (const issue of issues) {
            const cat = issue.scoreCategory || 'completeness';
            counts[cat] = (counts[cat] || 0) + 1;
        }
        return counts;
    }, [issues]);

    // Scroll to focused issue when it changes (from preview click)
    useEffect(() => {
        if (focusedIssueId && scrollContainerRef.current) {
            // Small delay to allow DOM to update with the focused item
            const timer = setTimeout(() => {
                if (focusedItemRef.current && scrollContainerRef.current) {
                    focusedItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [focusedIssueId]);

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

    // Filter by active category
    const filteredIssues = useMemo(() => {
        if (activeFilter === 'all') return sortedIssues;
        return sortedIssues.filter(i => (i.scoreCategory || 'completeness') === activeFilter);
    }, [sortedIssues, activeFilter]);

    const displayIssues = filteredIssues.slice(0, 10);

    return (
        <div className="w-full bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[70vh]">
            {/* Header - Title + Filters in one row */}
            <div className="flex-shrink-0 flex items-center justify-between gap-1 px-3 pt-3 pb-2 border-b border-white/10">
                <h3 className="text-xs font-semibold text-[#80FF00] uppercase tracking-wider flex items-center gap-2 flex-shrink-0">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Smart Context
                    {issues.length > 0 && (
                        <span className="bg-[#80FF00]/10 text-[#80FF00] text-[10px] px-2 py-0.5 rounded-full border border-[#80FF00]/20 font-medium">
                            {issues.length}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-0.5">
                    {FILTERS.map(({ key, label, icon: Icon, color }) => {
                        const isActive = activeFilter === key;
                        const count = categoryCounts[key] || 0;
                        if (key !== 'all' && count === 0) return null;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveFilter(key)}
                                className={`p-1.5 rounded-lg transition-all ${
                                    isActive
                                        ? 'bg-white/10'
                                        : 'hover:bg-white/5'
                                }`}
                                style={{ color: isActive ? color : 'rgba(255,255,255,0.3)' }}
                                title={`${label} (${count})`}
                            >
                                <Icon size={13} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Missing Context Warning Card */}
            {showMissingContextWarning && (
                <div className="flex-shrink-0 px-3 pb-2">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
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
                </div>
            )}

            {/* Scrollable Content List */}
            <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {displayIssues.length > 0 ? (
                        displayIssues.map((issue) => {
                            const isFocused = focusedIssueId === issue.id;
                            return (
                                <div key={issue.id}
                                    ref={isFocused ? focusedItemRef : undefined}
                                    onMouseEnter={() => onIssueHover?.(issue)}
                                    onMouseLeave={() => onIssueHover?.(null)}
                                    className={`transition-all duration-300 ${isFocused ? 'ring-2 ring-[#80FF00]/60 rounded-xl' : ''}`}
                                >
                                    <ContextTipItem
                                        issue={issue}
                                        onFix={onFix}
                                        onDismiss={onDismiss}
                                        onAiAssist={onAiAssist}
                                        onRegenerate={onRegenerate}
                                    />
                                </div>
                            );
                        })
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-6 flex flex-col items-center justify-center text-center opacity-50"
                        >
                            <Sparkles size={24} className="mb-2 text-white/30" />
                            <p className="text-xs text-white/50">
                                {activeFilter !== 'all'
                                    ? `No ${FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()} issues found.`
                                    : 'Great job! No active suggestions.'}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            {filteredIssues.length > 10 && (
                <div className="flex-shrink-0 px-3 py-2 border-t border-white/10 text-center">
                    <button className="text-[10px] text-white/40 hover:text-white transition-colors uppercase tracking-wider font-bold flex items-center justify-center gap-1 mx-auto">
                        View {filteredIssues.length - 10} more tips
                        <AlertCircle size={10} />
                    </button>
                </div>
            )}
        </div>
    );
}
