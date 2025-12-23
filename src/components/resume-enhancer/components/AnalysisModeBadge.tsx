'use client';

import React, { useState } from 'react';
import { User, FileText, Sparkles, AlertCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalysisMode, ValidationState } from '@/lib/utils/analysis-mode';

interface AnalysisModeBadgeProps {
    mode: AnalysisMode;
    cvType?: 'master' | 'journey' | 'standalone';
    validationState?: ValidationState;
    warnings?: string[];
    className?: string;
    expandable?: boolean;
}


export default function AnalysisModeBadge({
    mode,
    cvType,
    validationState = 'valid',
    warnings = [],
    expandable = true,
    className = ''
}: AnalysisModeBadgeProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const config = {
        'role-based': {
            icon: User,
            text: 'Role-Based Analysis',
            description: cvType === 'master'
                ? 'Optimized for your target role and seniority'
                : 'Analyzing against your target role',
            gradient: 'from-purple-500 to-pink-500',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            textColor: 'text-purple-400'
        },
        'jd-based': {
            icon: FileText,
            text: 'JD-Based Analysis',
            description: 'ATS-optimized for the job description',
            gradient: 'from-blue-500 to-cyan-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            textColor: 'text-blue-400'
        },
        'hybrid': {
            icon: Sparkles,
            text: 'JD-Based Analysis',
            description: 'Prioritizing job description with role context',
            gradient: 'from-lime-500 to-green-500',
            bg: 'bg-lime-500/10',
            border: 'border-lime-500/20',
            textColor: 'text-lime-400'
        },
        'insufficient-data': {
            icon: AlertCircle,
            text: 'Setup Required',
            description: 'Add target role or job description to enable AI analysis',
            gradient: 'from-gray-500 to-gray-600',
            bg: 'bg-gray-500/10',
            border: 'border-gray-500/20',
            textColor: 'text-gray-400'
        }
    };

    const { icon: Icon, text, description, gradient, bg, border, textColor } = config[mode];

    // Validation state border/ring
    const validationBorder = {
        valid: border,
        warning: 'border-yellow-500/40 ring-2 ring-yellow-500/20',
        error: 'border-red-500/40 ring-2 ring-red-500/20'
    }[validationState];

    const hasWarnings = warnings.length > 0;
    const canExpand = expandable && hasWarnings;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${bg} ${validationBorder} border rounded-xl overflow-hidden ${className}`}
        >
            <div
                className={`p-4 ${canExpand ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
                onClick={() => canExpand && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} bg-opacity-10 flex-shrink-0`}>
                        <Icon size={20} className={textColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className={`text-sm font-semibold ${textColor}`}>{text}</h4>
                            {mode === 'hybrid' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-500/20 text-lime-400 border border-lime-500/30">
                                    SMART
                                </span>
                            )}
                            {hasWarnings && (
                                <div className="flex items-center gap-1">
                                    <AlertTriangle
                                        size={14}
                                        className={validationState === 'error' ? 'text-red-400' : 'text-yellow-400'}
                                    />
                                    <span className="text-[10px] text-gray-400">
                                        {warnings.length} {warnings.length === 1 ? 'issue' : 'issues'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400">{description}</p>
                    </div>
                    {canExpand && (
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-shrink-0"
                        >
                            <ChevronDown size={16} className="text-gray-400" />
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Expandable Warnings */}
            <AnimatePresence>
                {isExpanded && hasWarnings && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-white/5"
                    >
                        <div className="p-4 pt-3 space-y-2 bg-black/20">
                            {warnings.map((warning, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs">
                                    <span className="text-yellow-400 mt-0.5">•</span>
                                    <span className="text-gray-400">{warning}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

