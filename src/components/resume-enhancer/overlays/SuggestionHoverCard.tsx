import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, Zap, CheckCircle, ArrowRight, X } from 'lucide-react';
import { Issue, IssueSeverity } from '@/lib/pill-engine/types';

interface SuggestionHoverCardProps {
    issue: Issue;
    onFix?: () => void;
    onDismiss?: () => void;
    style?: React.CSSProperties;
}

const severityConfig: Record<IssueSeverity, { icon: any; color: string; bg: string; borderColor: string }> = {
    critical: {
        icon: AlertTriangle,
        color: '#ff4d4d',
        bg: 'rgba(20, 0, 0, 0.95)',
        borderColor: '#ff4d4d'
    },
    warning: {
        icon: AlertCircle,
        color: '#ffaa00',
        bg: 'rgba(20, 10, 0, 0.95)',
        borderColor: '#ffaa00'
    },
    info: {
        icon: Zap,
        color: '#3399ff',
        bg: 'rgba(0, 10, 20, 0.95)',
        borderColor: '#3399ff'
    },
    positive: {
        icon: CheckCircle,
        color: '#80FF00',
        bg: 'rgba(0, 20, 0, 0.95)',
        borderColor: '#80FF00'
    }
};

export function SuggestionHoverCard({ issue, onFix, onDismiss, style }: SuggestionHoverCardProps) {
    const config = severityConfig[issue.severity] || severityConfig.info;
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute z-50 pointer-events-auto"
            style={style}
        >
            <div
                className="w-64 rounded-xl shadow-2xl backdrop-blur-md border border-white/10 overflow-hidden"
                style={{
                    backgroundColor: config.bg,
                    borderLeft: `4px solid ${config.borderColor}`
                }}
            >
                <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon size={14} style={{ color: config.color }} />
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: config.color }}>
                                {issue.type.replace(/_/g, ' ')}
                            </span>
                        </div>
                        {onDismiss && (
                            <button onClick={(e) => { e.stopPropagation(); onDismiss(); }} className="text-white/40 hover:text-white transition-colors">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-white/90 font-medium leading-relaxed my-1">
                        {issue.message}
                    </p>

                    {onFix && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onFix(); }}
                            className="mt-2 flex items-center gap-1.5 text-[10px] font-bold px-2 py-1.5 rounded-md transition-all hover:brightness-110 active:scale-95 text-black"
                            style={{ backgroundColor: config.color }}
                        >
                            <span>Fix Issue</span>
                            <ArrowRight size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Triangle/Arrow pointing to element - optionally added via CSS or SVG if needed */}
        </motion.div>
    );
}
