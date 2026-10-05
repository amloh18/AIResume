'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, X, Target, FileText, Sparkles } from 'lucide-react';
import type { AnalysisModeInfo, ValidationState } from '@/lib/utils/analysis-mode';

interface ModeValidationBannerProps {
    modeInfo: AnalysisModeInfo | null;
    onDismiss?: () => void;
    onActionClick?: (action: string) => void;
    className?: string;
}

export default function ModeValidationBanner({
    modeInfo,
    onDismiss,
    onActionClick,
    className = ''
}: ModeValidationBannerProps) {
    // Don't show banner if no issues
    if (!modeInfo || (modeInfo.warnings.length === 0 && modeInfo.missingDataReasons.length === 0)) {
        return null;
    }

    const config = {
        error: {
            icon: AlertCircle,
            gradient: 'from-red-500/10 via-red-500/5 to-transparent',
            border: 'border-red-500/30',
            iconColor: 'text-red-400',
            textColor: 'text-red-300',
            bgColor: 'bg-red-500/10'
        },
        warning: {
            icon: AlertTriangle,
            gradient: 'from-yellow-500/10 via-yellow-500/5 to-transparent',
            border: 'border-yellow-500/30',
            iconColor: 'text-yellow-400',
            textColor: 'text-yellow-300',
            bgColor: 'bg-yellow-500/10'
        },
        valid: {
            icon: Info,
            gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
            border: 'border-blue-500/30',
            iconColor: 'text-blue-400',
            textColor: 'text-blue-300',
            bgColor: 'bg-blue-500/10'
        }
    };

    const { icon: Icon, gradient, border, iconColor, textColor, bgColor } = config[modeInfo.validationState];

    // Determine primary message
    const primaryMessage = modeInfo.missingDataReasons[0] || modeInfo.warnings[0];
    const additionalCount = (modeInfo.warnings.length + modeInfo.missingDataReasons.length) - 1;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`relative overflow-hidden ${className}`}
            >
                <div className={`bg-gradient-to-r ${gradient} border ${border} rounded-xl p-4`}>
                    <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`p-2 rounded-lg ${bgColor} flex-shrink-0`}>
                            <Icon size={20} className={iconColor} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            {/* Primary message */}
                            <p className={`font-medium ${textColor} mb-1`}>
                                {primaryMessage}
                            </p>

                            {/* Additional warnings */}
                            {additionalCount > 0 && (
                                <p className="text-xs text-gray-400">
                                    +{additionalCount} more {additionalCount === 1 ? 'issue' : 'issues'}
                                </p>
                            )}

                            {/* Action buttons */}
                            {modeInfo.suggestedActions.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {modeInfo.suggestedActions.slice(0, 2).map((action, index) => (
                                        <button
                                            key={index}
                                            onClick={() => onActionClick?.(action)}
                                            className={`text-xs px-3 py-1.5 rounded-lg ${bgColor} ${textColor} hover:bg-opacity-80 transition-all border ${border} font-medium`}
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Detailed info (expandable) */}
                            {(modeInfo.warnings.length > 1 || modeInfo.missingDataReasons.length > 1) && (
                                <details className="mt-3">
                                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
                                        View all issues
                                    </summary>
                                    <div className="mt-2 space-y-1">
                                        {modeInfo.missingDataReasons.map((reason, idx) => (
                                            <div key={`missing-${idx}`} className="flex items-start gap-2 text-xs text-gray-400">
                                                <span className={`${iconColor} mt-0.5`}>•</span>
                                                <span>{reason}</span>
                                            </div>
                                        ))}
                                        {modeInfo.warnings.map((warning, idx) => (
                                            <div key={`warning-${idx}`} className="flex items-start gap-2 text-xs text-gray-400">
                                                <span className={`${iconColor} mt-0.5`}>•</span>
                                                <span>{warning}</span>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>

                        {/* Dismiss button */}
                        {onDismiss && modeInfo.validationState !== 'error' && (
                            <button
                                onClick={onDismiss}
                                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-gray-300"
                                aria-label="Dismiss"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Validation metrics (if available) */}
                    {(modeInfo.roleValidation || modeInfo.jdValidation) && (
                        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-3 text-xs">
                            {modeInfo.roleValidation && modeInfo.hasRole && (
                                <div className="flex items-center gap-2">
                                    <Target size={14} className="text-purple-400" />
                                    <span className="text-gray-400">
                                        Role Confidence:
                                        <span className={`ml-1 font-medium ${modeInfo.roleValidation.confidence > 0.8 ? 'text-green-400' :
                                                modeInfo.roleValidation.confidence > 0.5 ? 'text-yellow-400' :
                                                    'text-red-400'
                                            }`}>
                                            {Math.round(modeInfo.roleValidation.confidence * 100)}%
                                        </span>
                                    </span>
                                </div>
                            )}
                            {modeInfo.jdValidation && modeInfo.hasJD && (
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-blue-400" />
                                    <span className="text-gray-400">
                                        JD Word Count:
                                        <span className={`ml-1 font-medium ${modeInfo.jdValidation.wordCount >= 150 ? 'text-green-400' :
                                                modeInfo.jdValidation.wordCount >= 50 ? 'text-yellow-400' :
                                                    'text-red-400'
                                            }`}>
                                            {modeInfo.jdValidation.wordCount}
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
