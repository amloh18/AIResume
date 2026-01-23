import React from 'react';
import { motion } from 'framer-motion';
import { Issue } from '@/lib/pill-engine/types';
import { Sparkles, ArrowRight, X, AlertCircle, AlertTriangle, Zap, CheckCircle } from 'lucide-react';

interface ContextTipItemProps {
    issue: Issue;
    onFix: (issue: Issue) => void;
    onDismiss: (issueId: string) => void;
    onAiAssist?: (issue: Issue) => void;
}

export default function ContextTipItem({ issue, onFix, onDismiss, onAiAssist }: ContextTipItemProps) {

    // Determine Icon & Color based on Priority/Severity
    const getVisuals = () => {
        // Priority takes precedence if set, otherwise severity
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
        // distinct default for suggestion/info
        return { icon: Zap, color: '#3399ff', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    };

    const visual = getVisuals();
    const Icon = visual.icon;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`relative p-2 rounded-xl border ${visual.border} ${visual.bg} hover:bg-opacity-20 transition-all group`}
        >
            <button
                onClick={(e) => { e.stopPropagation(); onDismiss(issue.id); }}
                className="absolute top-1 right-1 text-white/20 hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100"
            >
                <X size={12} />
            </button>

            <div className="flex gap-2 pr-4">
                <div className="mt-0.5 flex-shrink-0" style={{ color: visual.color }}>
                    <Icon size={16} />
                </div>

                <div className="flex-1 space-y-2">
                    <p className="text-xs text-white/90 leading-relaxed font-medium">
                        {issue.message}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                        {/* Primary Action */}
                        <button
                            onClick={() => onFix(issue)}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                            style={{ color: visual.color }}
                        >
                            <span>Fix Now</span>
                            <ArrowRight size={10} />
                        </button>

                        {/* AI Action (Only for Tier 2/Content or explicit AI Insights) */}
                        {(issue.tier === 2 || issue.priority === 'ai-insight') && onAiAssist && (
                            <button
                                onClick={() => onAiAssist(issue)}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/20"
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
