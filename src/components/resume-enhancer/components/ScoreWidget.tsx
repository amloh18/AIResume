'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info } from 'lucide-react';

interface ScoreWidgetProps {
    label: string;
    score: number;
    maxScore?: number;
    multiplier?: number;
    context?: 'jd-specific' | 'industry-general';
    breakdown?: Record<string, number>;
    penaltyReasons?: string[];
    size?: 'sm' | 'md' | 'lg';
    showMultiplier?: boolean;
}

export default function ScoreWidget({
    label,
    score,
    maxScore = 100,
    multiplier = 1.0,
    context,
    breakdown,
    penaltyReasons = [],
    size = 'md',
    showMultiplier = true
}: ScoreWidgetProps) {
    const percentage = Math.min((score / maxScore) * 100, 100);

    // Size configurations
    const sizeConfig = {
        sm: { container: 'w-12 h-12', text: 'text-lg', stroke: 4, radius: 20 },
        md: { container: 'w-16 h-16', text: 'text-2xl', stroke: 6, radius: 28 },
        lg: { container: 'w-20 h-20', text: 'text-3xl', stroke: 6, radius: 34 }
    };

    const config = sizeConfig[size];
    const circumference = 2 * Math.PI * config.radius;
    const strokeDashoffset = circumference * (1 - percentage / 100);

    // Score color based on value
    const getScoreColor = () => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getStrokeColor = () => {
        if (score >= 80) return 'stroke-green-400';
        if (score >= 60) return 'stroke-yellow-400';
        if (score >= 40) return 'stroke-orange-400';
        return 'stroke-red-400';
    };

    const hasPenalty = multiplier < 1.0;

    return (
        <div className="flex flex-col items-center">
            {/* Label */}
            <p className="text-xs text-[color:var(--text-tertiary)] mb-1">{label}</p>

            {/* Circular Gauge */}
            <div className={`relative ${config.container}`}>
                <svg className="w-full h-full transform -rotate-90">
                    {/* Background circle */}
                    <circle
                        cx="50%"
                        cy="50%"
                        r={config.radius}
                        fill="none"
                        strokeWidth={config.stroke}
                        className="stroke-black/10 dark:stroke-white/10"
                    />
                    {/* Progress circle */}
                    <motion.circle
                        cx="50%"
                        cy="50%"
                        r={config.radius}
                        fill="none"
                        strokeWidth={config.stroke}
                        strokeLinecap="round"
                        className={getStrokeColor()}
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </svg>

                {/* Score number */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-bold ${config.text} ${getScoreColor()}`}>
                        {score}
                    </span>
                </div>
            </div>

            {/* Multiplier Badge (if penalty) */}
            {showMultiplier && hasPenalty && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs"
                    title={penaltyReasons.join(', ')}
                >
                    <AlertTriangle className="w-3 h-3" />
                    <span>×{multiplier}</span>
                </motion.div>
            )}

            {/* Context Badge */}
            {context && (
                <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                    <Info className="w-3 h-3" />
                    <span>{context === 'jd-specific' ? 'JD Match' : 'Market Ready'}</span>
                </div>
            )}

            {/* Breakdown Tooltip (on hover) */}
            {breakdown && Object.keys(breakdown).length > 0 && (
                <div className="group relative cursor-help">
                    <span className="text-xs text-[color:var(--text-tertiary)] underline decoration-dotted">
                        View breakdown
                    </span>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-40 p-2 bg-[var(--bg-tertiary)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        {Object.entries(breakdown).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs py-0.5">
                                <span className="text-[color:var(--text-tertiary)]">{key}:</span>
                                <span className="text-[color:var(--text-primary)] font-medium">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
