import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Issue, IssueScoreCategory } from '@/lib/pill-engine/types';
import { Sparkles, ArrowRight, X, AlertCircle, AlertTriangle, Zap, CheckCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ContextTipItemProps {
    issue: Issue;
    onFix: (issue: Issue) => void;
    onDismiss: (issueId: string) => void;
    onAiAssist?: (issue: Issue) => void;
    onRegenerate?: (issue: Issue) => void;
}

// Category-based color system
const CATEGORY_COLORS: Record<IssueScoreCategory | 'default', { color: string; bg: string; border: string; label: string }> = {
    completeness: { color: '#3b82f6', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Content' },
    impact: { color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Impact' },
    metrics: { color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Metrics' },
    formatting: { color: '#8b5cf6', bg: 'bg-violet-500/10', border: 'border-violet-500/20', label: 'Format' },
    keywords: { color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Keywords' },
    default: { color: '#3399ff', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'General' },
};

export default function ContextTipItem({ issue, onFix, onDismiss, onAiAssist, onRegenerate }: ContextTipItemProps) {
    const [expanded, setExpanded] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    // Get category colors
    const categoryKey = issue.scoreCategory || 'default';
    const categoryColor = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.default;

    // Determine Icon & Color based on Priority/Severity
    const getSeverityVisuals = () => {
        if (issue.priority === 'critical' || issue.severity === 'critical') {
            return { icon: AlertTriangle, color: '#ff4d4d', bg: 'bg-red-500/10', border: 'border-red-500/20' };
        }
        if (issue.priority === 'ai-insight') {
            return { icon: Sparkles, color: '#a855f7', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
        }
        if (issue.severity === 'warning') {
            return { icon: AlertCircle, color: '#ffaa00', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
        }
        if (issue.severity === 'positive') {
            return { icon: CheckCircle, color: '#80FF00', bg: 'bg-[#80FF00]/10', border: 'border-[#80FF00]/20' };
        }
        return { icon: Zap, color: categoryColor.color, bg: categoryColor.bg, border: categoryColor.border };
    };

    const visual = getSeverityVisuals();
    const Icon = visual.icon;

    // Extract corrected text from meta if available
    const correctedText = issue.meta?.correctedText || issue.meta?.suggestion || issue.meta?.replacementText;
    const originalText = issue.meta?.originalText || issue.meta?.currentText;
    const explanation = issue.meta?.explanation || issue.meta?.reason;

    const handleRegenerate = async () => {
        if (!onRegenerate) return;
        setRegenerating(true);
        try {
            await onRegenerate(issue);
        } finally {
            setRegenerating(false);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`relative rounded-xl border ${visual.border} ${visual.bg} hover:bg-opacity-20 transition-all group overflow-hidden`}
        >
            {/* Category color strip */}
            <div 
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ backgroundColor: categoryColor.color }}
            />

            <button
                onClick={(e) => { e.stopPropagation(); onDismiss(issue.id); }}
                className="absolute top-2 right-2 text-white/20 hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
            >
                <X size={12} />
            </button>

            <div className="flex gap-2 p-3 pl-4">
                <div className="mt-0.5 flex-shrink-0" style={{ color: visual.color }}>
                    <Icon size={16} />
                </div>

                <div className="flex-1 space-y-2 min-w-0">
                    {/* Issue message */}
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-white/90 leading-relaxed font-medium flex-1">
                            {issue.message}
                        </p>
                        {/* Category badge */}
                        <span 
                            className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                            style={{ 
                                color: categoryColor.color, 
                                backgroundColor: `${categoryColor.color}15`,
                                border: `1px solid ${categoryColor.color}30`
                            }}
                        >
                            {categoryColor.label}
                        </span>
                    </div>

                    {/* Explanation if available */}
                    {explanation && (
                        <p className="text-[11px] text-white/50 leading-relaxed">
                            {explanation}
                        </p>
                    )}

                    {/* Expandable detail section showing original vs corrected */}
                    {(originalText || correctedText) && (
                        <div>
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60 transition-colors"
                            >
                                {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                <span>{expanded ? 'Hide details' : 'Show details'}</span>
                            </button>

                            {expanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-2 space-y-2"
                                >
                                    {/* Original text */}
                                    {originalText && (
                                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                                            <span className="text-[9px] text-red-400 font-semibold uppercase tracking-wider block mb-1">Current</span>
                                            <p className="text-[11px] text-white/70 leading-relaxed line-through decoration-red-500/50">
                                                {originalText}
                                            </p>
                                        </div>
                                    )}

                                    {/* Corrected text */}
                                    {correctedText && (
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
                                            <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider block mb-1">Suggested</span>
                                            <p className="text-[11px] text-white/90 leading-relaxed font-medium">
                                                {correctedText}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {/* Primary Apply Fix Action */}
                        <button
                            onClick={() => onFix(issue)}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg transition-colors"
                            style={{ 
                                color: '#000', 
                                backgroundColor: categoryColor.color,
                            }}
                        >
                            <span>Apply Fix</span>
                            <ArrowRight size={10} />
                        </button>

                        {/* Regenerate button for AI-powered suggestions */}
                        {(issue.tier === 2 || issue.priority === 'ai-insight' || correctedText) && onRegenerate && (
                            <button
                                onClick={handleRegenerate}
                                disabled={regenerating}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10 disabled:opacity-50"
                            >
                                <RefreshCw size={10} className={regenerating ? 'animate-spin' : ''} />
                                <span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
                            </button>
                        )}

                        {/* AI Assist button for Tier 2 content */}
                        {(issue.tier === 2 || issue.priority === 'ai-insight') && onAiAssist && !onRegenerate && (
                            <button
                                onClick={() => onAiAssist(issue)}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                            >
                                <Sparkles size={10} />
                                <span>AI Assist</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
