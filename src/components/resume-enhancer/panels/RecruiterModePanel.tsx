'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye,
    AlertTriangle,
    TrendingDown,
    Hash,
    Percent,
    DollarSign,
    Zap,
    Clock,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import {
    detectEmploymentGaps,
    detectTitleRegression,
    extractImpactMetrics,
    getSpeedReadData,
    type EmploymentGap,
    type TitleRegression,
    type ImpactStats,
    type SpeedReadData
} from '@/lib/utils/cv-analysis-utils';
import type { UnifiedCVDataStructure } from '@/types/cv';

// ============================================================================
// Types
// ============================================================================

export interface RecruiterFeatures {
    heatmap: boolean;
    impactHighlighting: boolean;
    redFlags: boolean;
    speedRead: boolean;
}

interface RecruiterModePanelProps {
    cvData: UnifiedCVDataStructure | null;
    features: RecruiterFeatures;
    onFeaturesChange: (features: RecruiterFeatures) => void;
    onSpeedReadToggle?: () => void;
}

// ============================================================================
// Helper Components
// ============================================================================

const FeatureToggle = ({
    label,
    description,
    enabled,
    onToggle,
    icon: Icon,
    color = '#80FF00'
}: {
    label: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    icon: React.ElementType;
    color?: string;
}) => (
    <button
        onClick={onToggle}
        className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all ${enabled
                ? 'bg-white/10 border border-white/20'
                : 'bg-white/5 border border-transparent hover:border-white/10'
            }`}
    >
        <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${enabled ? '' : 'opacity-50'
                }`}
            style={{ backgroundColor: enabled ? `${color}20` : 'rgba(255,255,255,0.1)' }}
        >
            <Icon size={16} style={{ color: enabled ? color : 'rgba(255,255,255,0.5)' }} />
        </div>
        <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${enabled ? 'text-white' : 'text-white/50'}`}>
                    {label}
                </span>
                <div className={`w-8 h-4 rounded-full transition-all ${enabled ? 'bg-[#80FF00]' : 'bg-white/20'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                        }`} />
                </div>
            </div>
            <p className="text-[10px] text-white/40 mt-0.5">{description}</p>
        </div>
    </button>
);

const StatCard = ({
    label,
    value,
    icon: Icon,
    color
}: {
    label: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
}) => (
    <div className="bg-white/5 rounded-lg p-2 text-center">
        <Icon size={14} className="mx-auto mb-1" style={{ color }} />
        <div className="text-lg font-bold text-white">{value}</div>
        <div className="text-[9px] text-white/40 uppercase tracking-wider">{label}</div>
    </div>
);

// ============================================================================
// Main Component
// ============================================================================

export default function RecruiterModePanel({
    cvData,
    features,
    onFeaturesChange,
    onSpeedReadToggle,
}: RecruiterModePanelProps) {
    const [showRedFlags, setShowRedFlags] = useState(false);

    // Compute analysis data
    const gaps = useMemo(() => detectEmploymentGaps(cvData?.work), [cvData?.work]);
    const regressions = useMemo(() => detectTitleRegression(cvData?.work), [cvData?.work]);
    const impactStats = useMemo(() => extractImpactMetrics(cvData), [cvData]);
    const speedReadData = useMemo(() => getSpeedReadData(cvData), [cvData]);

    const totalRedFlags = gaps.length + regressions.length;

    const toggleFeature = (key: keyof RecruiterFeatures) => {
        onFeaturesChange({ ...features, [key]: !features[key] });
    };

    return (
        <div className="w-80 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Eye size={16} className="text-orange-400" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">Recruiter Mode</h3>
                    <p className="text-[10px] text-white/40">The 6-Second Scan View</p>
                </div>
            </div>

            {/* Impact Stats Grid */}
            <div className="px-4 py-3 border-b border-white/10">
                <div className="text-[10px] text-white/50 uppercase tracking-wider mb-2">Impact Metrics Found</div>
                <div className="grid grid-cols-3 gap-2">
                    <StatCard label="Numbers" value={impactStats.numbers.length} icon={Hash} color="#3b82f6" />
                    <StatCard label="Percents" value={impactStats.percentages.length} icon={Percent} color="#10b981" />
                    <StatCard label="Currency" value={impactStats.currencies.length} icon={DollarSign} color="#f59e0b" />
                </div>
            </div>

            {/* Red Flags Section */}
            {totalRedFlags > 0 && (
                <div className="px-4 py-3 border-b border-white/10">
                    <button
                        onClick={() => setShowRedFlags(!showRedFlags)}
                        className="w-full flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle size={12} className="text-red-400" />
                            </div>
                            <span className="text-sm font-medium text-red-400">{totalRedFlags} Red Flags Found</span>
                        </div>
                        {showRedFlags ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                    </button>

                    <AnimatePresence>
                        {showRedFlags && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-3 space-y-2 overflow-hidden"
                            >
                                {/* Employment Gaps */}
                                {gaps.map((gap, idx) => (
                                    <div key={`gap-${idx}`} className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                        <div className="flex items-center gap-2 text-xs text-red-400">
                                            <Clock size={12} />
                                            <span className="font-medium">{gap.durationMonths} month gap</span>
                                        </div>
                                        <p className="text-[10px] text-white/50 mt-1">
                                            Between "{gap.afterPosition}" and "{gap.beforePosition}"
                                        </p>
                                    </div>
                                ))}

                                {/* Title Regressions */}
                                {regressions.map((reg, idx) => (
                                    <div key={`reg-${idx}`} className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                        <div className="flex items-center gap-2 text-xs text-orange-400">
                                            <TrendingDown size={12} />
                                            <span className="font-medium">Title Regression</span>
                                        </div>
                                        <p className="text-[10px] text-white/50 mt-1">
                                            "{reg.fromTitle}" → "{reg.toTitle}"
                                        </p>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Speed Read Preview */}
            {speedReadData && features.speedRead && (
                <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-b from-[#80FF00]/5 to-transparent">
                    <div className="text-[10px] text-[#80FF00] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Zap size={10} />
                        Speed Read View
                    </div>
                    <div className="space-y-2">
                        <div className="text-lg font-bold text-white">{speedReadData.name}</div>
                        <div className="text-sm text-[#80FF00]">{speedReadData.currentTitle}</div>
                        {speedReadData.topSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {speedReadData.topSkills.map((skill, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-white/70">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        )}
                        {speedReadData.recentAchievement && (
                            <p className="text-xs text-white/60 italic line-clamp-2">
                                "{speedReadData.recentAchievement}"
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Feature Toggles */}
            <div className="px-4 py-3 space-y-2">
                <div className="text-[10px] text-white/50 uppercase tracking-wider mb-2">Overlay Features</div>

                <FeatureToggle
                    label="Heatmap Overlay"
                    description="Highlight high-attention areas"
                    enabled={features.heatmap}
                    onToggle={() => toggleFeature('heatmap')}
                    icon={Eye}
                    color="#f97316"
                />

                <FeatureToggle
                    label="Impact Highlighting"
                    description="Pulse on numbers & metrics"
                    enabled={features.impactHighlighting}
                    onToggle={() => toggleFeature('impactHighlighting')}
                    icon={Zap}
                    color="#10b981"
                />

                <FeatureToggle
                    label="Red Flag Badges"
                    description="Show gap & regression warnings"
                    enabled={features.redFlags}
                    onToggle={() => toggleFeature('redFlags')}
                    icon={AlertTriangle}
                    color="#ef4444"
                />

                <FeatureToggle
                    label="Speed-Read Mode"
                    description="Show condensed key info only"
                    enabled={features.speedRead}
                    onToggle={() => {
                        toggleFeature('speedRead');
                        onSpeedReadToggle?.();
                    }}
                    icon={Zap}
                    color="#80FF00"
                />
            </div>
        </div>
    );
}
