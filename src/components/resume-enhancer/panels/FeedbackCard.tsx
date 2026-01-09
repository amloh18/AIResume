import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { Issue, IssueSeverity } from '@/lib/pill-engine/types';

interface FeedbackCardProps {
    issue: Issue;
    onClick?: () => void;
}

const severityConfig: Record<IssueSeverity, { icon: any; color: string; bg: string; borderColor: string }> = {
    critical: {
        icon: AlertTriangle,
        color: '#ff4d4d',
        bg: 'rgba(255, 77, 77, 0.1)',
        borderColor: 'rgba(255, 77, 77, 0.2)'
    },
    warning: {
        icon: AlertCircle,
        color: '#ffaa00',
        bg: 'rgba(255, 170, 0, 0.1)',
        borderColor: 'rgba(255, 170, 0, 0.2)'
    },
    info: {
        icon: Zap,
        color: '#3399ff',
        bg: 'rgba(51, 153, 255, 0.1)',
        borderColor: 'rgba(51, 153, 255, 0.2)'
    },
    positive: {
        icon: CheckCircle,
        color: '#80FF00',
        bg: 'rgba(128, 255, 0, 0.1)',
        borderColor: 'rgba(128, 255, 0, 0.2)'
    }
};

export function FeedbackCard({ issue, onClick }: FeedbackCardProps) {
    const config = severityConfig[issue.severity] || severityConfig.info;
    const Icon = config.icon;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onClick}
            className="relative group cursor-pointer overflow-hidden rounded-xl border p-3 transition-all hover:bg-white/5 active:scale-[0.99]"
            style={{
                backgroundColor: config.bg,
                borderColor: config.borderColor
            }}
        >
            <div className="flex gap-3 items-start">
                <div
                    className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ color: config.color }}
                >
                    <Icon size={16} strokeWidth={2.5} />
                </div>

                <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-semibold text-white/90 leading-tight">
                        {issue.type.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-[11px] text-white/70 leading-relaxed">
                        {issue.message}
                    </p>

                    {issue.deepLink && (
                        <div className="flex items-center gap-1 text-[10px] font-medium mt-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                            style={{ color: config.color }}>
                            <span>Fix now</span>
                            <ArrowRight size={10} />
                        </div>
                    )}
                </div>
            </div>

            {/* Hover Glow */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${config.color}, transparent 70%)` }}
            />
        </motion.div>
    );
}
