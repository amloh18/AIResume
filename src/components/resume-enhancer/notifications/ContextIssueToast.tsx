'use client';

import React from 'react';
import { Issue } from '@/lib/pill-engine/types';
import { Sparkles, ArrowRight, X, AlertCircle, AlertTriangle, Zap, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ContextIssueToastProps {
    issue: Issue;
    onFix: (issue: Issue) => void;
    onDismiss: (issueId: string) => void;
    onAiAssist?: (issue: Issue) => void;
}

export function ContextIssueToast({ issue, onFix, onDismiss, onAiAssist }: ContextIssueToastProps) {

    // Determine Icon & Color based on Priority/Severity
    const getVisuals = () => {
        // Priority takes precedence if set, otherwise severity
        if (issue.priority === 'critical' || issue.severity === 'critical') {
            return {
                icon: AlertTriangle,
                color: '#ff4d4d',
                bg: 'bg-red-500/10',
                border: 'border-red-500/30',
                shadow: 'shadow-red-500/20'
            };
        }
        if (issue.priority === 'ai-insight') {
            return {
                icon: Sparkles,
                color: '#a855f7',
                bg: 'bg-purple-500/10',
                border: 'border-purple-500/30',
                shadow: 'shadow-purple-500/20'
            };
        }
        if (issue.severity === 'warning') {
            return {
                icon: AlertCircle,
                color: '#ffaa00',
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/30',
                shadow: 'shadow-amber-500/20'
            };
        }
        if (issue.severity === 'positive') {
            return {
                icon: CheckCircle,
                color: '#013f2e',
                bg: 'bg-[#013f2e]/10',
                border: 'border-[#013f2e]/30',
                shadow: 'shadow-[#013f2e]/20'
            };
        }
        // default for suggestion/info
        return {
            icon: Zap,
            color: '#3399ff',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            shadow: 'shadow-blue-500/20'
        };
    };

    const visual = getVisuals();
    const Icon = visual.icon;

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`relative min-w-[320px] max-w-[380px] p-4 rounded-xl border ${visual.border} ${visual.bg} backdrop-blur-xl shadow-xl ${visual.shadow}`}
            style={{
                backgroundColor: 'rgba(26, 26, 26, 0.95)'
            }}
        >
            {/* Close button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(issue.id);
                }}
                className="absolute top-2 right-2 text-white/30 hover:text-white/80 transition-colors z-10"
            >
                <X size={14} />
            </button>

            <div className="flex gap-3">
                {/* Icon */}
                <div className="mt-0.5 flex-shrink-0" style={{ color: visual.color }}>
                    <Icon size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3 pr-4">
                    <p className="text-xs text-white/90 leading-relaxed font-medium">
                        {issue.message}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Fix Now Button */}
                        <button
                            onClick={() => onFix(issue)}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg hover:scale-105 transition-transform"
                            style={{
                                backgroundColor: `${visual.color}20`,
                                color: visual.color,
                                borderWidth: '1px',
                                borderColor: `${visual.color}40`
                            }}
                        >
                            <span>Fix Now</span>
                            <ArrowRight size={10} />
                        </button>

                        {/* AI Assist Button (for Tier 2 or AI insights) */}
                        {(issue.tier === 2 || issue.priority === 'ai-insight') && onAiAssist && (
                            <button
                                onClick={() => onAiAssist(issue)}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/20 hover:scale-105 transition-transform"
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
