'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    detectEmploymentGaps,
    detectTitleRegression,
    extractImpactMetrics,
    type EmploymentGap,
    type TitleRegression,
    type ImpactStats
} from '@/lib/utils/cv-analysis-utils';
import type { UnifiedCVDataStructure } from '@/types/cv';
import type { RecruiterFeatures } from '../panels/RecruiterModePanel';

// ============================================================================
// Types
// ============================================================================

interface RecruiterModeOverlayProps {
    cvData: UnifiedCVDataStructure | null;
    features: RecruiterFeatures;
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

interface ElementRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface OverlayPositions {
    summary?: ElementRect;
    recentJob?: ElementRect;
    workItems: Record<number, ElementRect>; // Keyed by item index
}

// ============================================================================
// Helper: Element Tracking
// ============================================================================

function useElementTracking(
    containerRef: React.RefObject<HTMLDivElement | null> | undefined,
    dependencies: any[]
): OverlayPositions {
    const [positions, setPositions] = useState<OverlayPositions>({ workItems: {} });

    useEffect(() => {
        if (!containerRef?.current) return;

        const measureElements = () => {
            const container = containerRef.current;
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            const newPositions: OverlayPositions = { workItems: {} };

            // Helper to get relative rect
            const getRelativeRect = (el: Element): ElementRect => {
                const rect = el.getBoundingClientRect();
                return {
                    top: rect.top - containerRect.top + container.scrollTop,
                    left: rect.left - containerRect.left + container.scrollLeft,
                    width: rect.width,
                    height: rect.height,
                };
            };

            // 1. Find Summary
            const summaryEl = container.querySelector('[data-section-id="summary"]');
            if (summaryEl) {
                newPositions.summary = getRelativeRect(summaryEl);
            }

            // 2. Find Work Items
            const workSection = container.querySelector('[data-section-id="work"]');
            if (workSection) {
                // Find all work items
                // Try standard selector from template
                const items = workSection.querySelectorAll('[data-item-id]');
                items.forEach(el => {
                    const index = parseInt(el.getAttribute('data-item-id') || '-1');
                    if (index >= 0) {
                        newPositions.workItems[index] = getRelativeRect(el);
                    }
                });

                // Most recent job (usually item 0)
                if (newPositions.workItems[0]) {
                    newPositions.recentJob = newPositions.workItems[0];
                }
            }

            setPositions(newPositions);
        };

        // Measure initially
        measureElements();

        // Re-measure on resize or mutation (content changes)
        const resizeObserver = new ResizeObserver(measureElements);
        resizeObserver.observe(containerRef.current);

        // Also observe mutations in case content re-renders
        const mutationObserver = new MutationObserver(measureElements);
        mutationObserver.observe(containerRef.current, { childList: true, subtree: true, attributes: true });

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [containerRef, ...dependencies]);

    return positions;
}

// ============================================================================
// Heatmap Gradient Overlay
// ============================================================================

const HeatmapBlob = ({ rect, type }: { rect: ElementRect, type: 'summary' | 'recent' | 'top-left' }) => {
    const style: React.CSSProperties = {
        position: 'absolute',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        background: type === 'summary'
            ? 'radial-gradient(ellipse at center, rgba(255, 150, 50, 0.15) 0%, transparent 70%)'
            : type === 'recent'
                ? 'linear-gradient(to bottom, rgba(255, 200, 50, 0.12) 0%, transparent 100%)'
                : 'radial-gradient(ellipse at top left, rgba(255, 100, 50, 0.2) 0%, transparent 70%)',
        pointerEvents: 'none',
        borderRadius: '8px',
    };

    return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={style} />;
};

const HeatmapOverlay = ({ positions }: { positions: OverlayPositions }) => (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {/* Always show Top Left Hotspot */}
        <HeatmapBlob
            rect={{ top: 0, left: 0, width: 400, height: 200 }}
            type="top-left"
        />

        {/* Scan Summary */}
        {positions.summary && (
            <HeatmapBlob rect={positions.summary} type="summary" />
        )}

        {/* Scan Recent Job */}
        {positions.recentJob && (
            <HeatmapBlob rect={positions.recentJob} type="recent" />
        )}

        {/* Legend */}
        <div className="absolute top-2 right-2 flex items-center gap-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full z-50">
            <span className="text-[8px] text-white/60">Eye Focus:</span>
            <div className="flex gap-0.5">
                <div className="w-3 h-2 rounded-sm bg-gradient-to-r from-orange-500 to-orange-400" title="High" />
                <div className="w-3 h-2 rounded-sm bg-gradient-to-r from-yellow-500 to-yellow-400" title="Medium" />
                <div className="w-3 h-2 rounded-sm bg-gradient-to-r from-gray-500 to-gray-400" title="Low" />
            </div>
        </div>
    </div>
);

// ============================================================================
// Impact Highlighting Overlay
// ============================================================================

const ImpactHighlightOverlay = ({ stats }: { stats: ImpactStats }) => {
    return (
        <>
            <style>{`
        @keyframes pulse-impact {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.9; }
        }
        
        .recruiter-impact-active .cv-page-custom,
        .recruiter-impact-active .cv-page {
          /* Targeting via JS mutation or specific classes if supported */
        }
        
        /* These classes would need to be applied by the renderer or via DOM manipulation */
        /* Currently we rely on the Stats Badge to show detection */
      `}</style>

            {/* Stats overlay - bottom right */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 right-4 px-3 py-2 bg-black/70 backdrop-blur-sm rounded-lg border border-white/10 z-20"
            >
                <div className="text-[9px] text-white/50 uppercase tracking-wider mb-1">Impact Found</div>
                <div className="flex gap-3 text-xs">
                    <span className="text-emerald-400">{stats.numbers.length} #'s</span>
                    <span className="text-cyan-400">{stats.percentages.length} %'s</span>
                    <span className="text-amber-400">{stats.currencies.length} $'s</span>
                </div>
            </motion.div>
        </>
    );
};

// ============================================================================
// Red Flag Markers and List
// ============================================================================

const RedFlagMarker = ({
    top,
    height,
    label,
    type
}: {
    top: number,
    height: number,
    label: string,
    type: 'gap' | 'regression'
}) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute left-0 right-0 z-20 flex items-center group pointer-events-auto"
        style={{ top: top, height: Math.max(20, height) }}
    >
        {/* Line across the content */}
        <div className={`w-full h-px absolute top-1/2 transform -translate-y-1/2 border-t border-dashed ${type === 'gap' ? 'border-red-500/50 bg-red-500/30' : 'border-orange-500/50 bg-orange-500/30'}`} />

        {/* Badge */}
        <div className={`absolute left-4 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1 hover:scale-105 transition-transform cursor-help ${type === 'gap' ? 'bg-red-500' : 'bg-orange-500'}`}>
            <span>{type === 'gap' ? '⏱️' : '📉'}</span>
            <span>{label}</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-normal ml-1">
                {type === 'gap' ? 'Explained?' : 'Why lower?'}
            </span>
        </div>
    </motion.div>
);

const RedFlagOverlay = ({
    gaps,
    regressions,
    positions
}: {
    gaps: EmploymentGap[];
    regressions: TitleRegression[];
    positions: OverlayPositions;
}) => {
    if (gaps.length === 0 && regressions.length === 0) return null;

    // Filter items we can visualize
    const visibleGaps = gaps.filter(gap =>
        gap.afterIndex !== undefined &&
        gap.beforeIndex !== undefined &&
        positions.workItems[gap.afterIndex] &&
        positions.workItems[gap.beforeIndex]
    );

    const visibleRegressions = regressions.filter(reg =>
        reg.fromIndex !== undefined &&
        reg.toIndex !== undefined &&
        positions.workItems[reg.toIndex] && // Newer/Top
        positions.workItems[reg.fromIndex] // Older/Bottom
    );

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Gap Markers */}
            {visibleGaps.map((gap, idx) => {
                const topItem = positions.workItems[gap.afterIndex!];
                const bottomItem = positions.workItems[gap.beforeIndex!];
                const gapTop = topItem.top + topItem.height;
                const gapBottom = bottomItem.top;

                return (
                    <RedFlagMarker
                        key={`gap-${idx}`}
                        top={gapTop}
                        height={gapBottom - gapTop}
                        label={`${gap.durationMonths}mo Gap`}
                        type="gap"
                    />
                );
            })}

            {/* Regression Markers */}
            {visibleRegressions.map((reg, idx) => {
                const topItem = positions.workItems[reg.toIndex!]; // Newer job (visual top)
                const bottomItem = positions.workItems[reg.fromIndex!]; // Older job (visual bottom)
                const gapTop = topItem.top + topItem.height;
                const gapBottom = bottomItem.top;

                return (
                    <RedFlagMarker
                        key={`reg-${idx}`}
                        top={gapTop}
                        height={gapBottom - gapTop}
                        label={`Title Drop: -${reg.seniorityDrop} lvls`}
                        type="regression"
                    />
                );
            })}

            {/* Fallback Badge List */}
            {(visibleGaps.length < gaps.length || visibleRegressions.length < regressions.length) && (
                <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-20 pointer-events-auto">
                    {visibleGaps.length < gaps.length && (
                        <div className="bg-red-500/90 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm">
                            {gaps.length - visibleGaps.length} Hidden Gaps
                        </div>
                    )}
                    {visibleRegressions.length < regressions.length && (
                        <div className="bg-orange-500/90 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm">
                            {regressions.length - visibleRegressions.length} Title Issues
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Main Overlay Component
// ============================================================================

export default function RecruiterModeOverlay({
    cvData,
    features,
    containerRef,
}: RecruiterModeOverlayProps) {
    // Compute analysis data
    const gaps = useMemo(() =>
        features.redFlags ? detectEmploymentGaps(cvData?.work) : [],
        [cvData?.work, features.redFlags]
    );
    const regressions = useMemo(() =>
        features.redFlags ? detectTitleRegression(cvData?.work) : [],
        [cvData?.work, features.redFlags]
    );
    const impactStats = useMemo(() =>
        features.impactHighlighting ? extractImpactMetrics(cvData) : { numbers: [], percentages: [], currencies: [], totalCount: 0 },
        [cvData, features.impactHighlighting]
    );

    // Track DOM Elements positions
    const elementPositions = useElementTracking(containerRef, [cvData, features]);

    // CSS Class Injection for Impact Highlighting
    useEffect(() => {
        if (containerRef?.current && features.impactHighlighting) {
            containerRef.current.classList.add('recruiter-impact-active');
            return () => {
                containerRef.current?.classList.remove('recruiter-impact-active');
            };
        }
    }, [containerRef, features.impactHighlighting]);

    return (
        <AnimatePresence>
            <div className="absolute inset-0 pointer-events-none">
                {/* Heatmap Overlay (Context-Aware) */}
                {features.heatmap && <HeatmapOverlay positions={elementPositions} />}

                {/* Impact Highlighting */}
                {features.impactHighlighting && impactStats.totalCount > 0 && (
                    <ImpactHighlightOverlay stats={impactStats} />
                )}

                {/* Red Flag Badges (Context-Aware where possible) */}
                {features.redFlags && (
                    <RedFlagOverlay gaps={gaps} regressions={regressions} positions={elementPositions} />
                )}
            </div>
        </AnimatePresence>
    );
}
