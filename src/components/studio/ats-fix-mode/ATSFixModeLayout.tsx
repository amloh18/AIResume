'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, GripVertical, ArrowLeft } from 'lucide-react';

import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { useStudio } from '../StudioContext';
import { DEFAULT_PANE_CONFIG } from '@/types/studio';

// Pane Components
import PreviewPane from './PreviewPane';
import ScorecardPane from './ScorecardPane';
import WorkbenchPane from './WorkbenchPane';

// ============================================================================
// Props
// ============================================================================

interface ATSFixModeLayoutProps {
    cvData: UnifiedCVDataStructure | null;
    userId: string;
    onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function ATSFixModeLayout({ cvData, userId, onClose }: ATSFixModeLayoutProps) {
    const { state, dispatch } = useStudio();

    // Pane widths (percentages)
    const [paneWidths, setPaneWidths] = useState({
        preview: DEFAULT_PANE_CONFIG.previewWidth,
        scorecard: DEFAULT_PANE_CONFIG.scorecardWidth,
        workbench: DEFAULT_PANE_CONFIG.workbenchWidth,
    });

    // Resize state
    const [isResizing, setIsResizing] = useState<'preview' | 'scorecard' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ============================================================================
    // Resize Handlers
    // ============================================================================

    const handleResizeStart = useCallback((pane: 'preview' | 'scorecard') => {
        setIsResizing(pane);
    }, []);

    const handleResizeMove = useCallback((e: React.MouseEvent) => {
        if (!isResizing || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const mouseX = e.clientX - containerRect.left;
        const mousePercent = (mouseX / containerWidth) * 100;

        const minWidth = (DEFAULT_PANE_CONFIG.minWidth / containerWidth) * 100;

        if (isResizing === 'preview') {
            // Resizing between preview and scorecard
            const newPreviewWidth = Math.max(minWidth, Math.min(mousePercent, 60));
            const remaining = 100 - newPreviewWidth;
            const scorecardRatio = paneWidths.scorecard / (paneWidths.scorecard + paneWidths.workbench);

            setPaneWidths({
                preview: newPreviewWidth,
                scorecard: remaining * scorecardRatio,
                workbench: remaining * (1 - scorecardRatio),
            });
        } else if (isResizing === 'scorecard') {
            // Resizing between scorecard and workbench
            const newScorecardEnd = mousePercent;
            const newWorkbenchWidth = 100 - newScorecardEnd;
            const newScorecardWidth = newScorecardEnd - paneWidths.preview;

            if (newScorecardWidth >= minWidth && newWorkbenchWidth >= minWidth) {
                setPaneWidths({
                    preview: paneWidths.preview,
                    scorecard: newScorecardWidth,
                    workbench: newWorkbenchWidth,
                });
            }
        }
    }, [isResizing, paneWidths]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(null);
    }, []);

    // ============================================================================
    // Render
    // ============================================================================

    return (
        <div
            ref={containerRef}
            className="h-full flex flex-col bg-gray-50 dark:bg-[#0a0d07]"
            onMouseMove={isResizing ? handleResizeMove : undefined}
            onMouseUp={handleResizeEnd}
            onMouseLeave={handleResizeEnd}
        >
            {/* Header Bar */}
            <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-white/10 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        title="Exit ATS Fix Mode"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">ATS Fix Mode</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {state.annotations.filter(a => a.status === 'open').length} suggestions remaining
                        </p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    title="Close"
                >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* 3-Column Layout */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* PANE 1: Preview */}
                <motion.div
                    className="h-full overflow-hidden border-r border-gray-200 dark:border-white/10"
                    style={{ width: `${paneWidths.preview}%` }}
                >
                    <PreviewPane cvData={cvData} userId={userId} />
                </motion.div>

                {/* Resize Handle 1 */}
                <div
                    className={`w-1 cursor-col-resize flex items-center justify-center hover:bg-lime-500/30 dark:hover:bg-[#80FF00]/30 transition-colors ${isResizing === 'preview' ? 'bg-lime-500/50 dark:bg-[#80FF00]/50' : ''
                        }`}
                    onMouseDown={() => handleResizeStart('preview')}
                >
                    <GripVertical className="w-3 h-3 text-gray-400" />
                </div>

                {/* PANE 2: Scorecard */}
                <motion.div
                    className="h-full overflow-hidden border-r border-gray-200 dark:border-white/10"
                    style={{ width: `${paneWidths.scorecard}%` }}
                >
                    <ScorecardPane />
                </motion.div>

                {/* Resize Handle 2 */}
                <div
                    className={`w-1 cursor-col-resize flex items-center justify-center hover:bg-lime-500/30 dark:hover:bg-[#80FF00]/30 transition-colors ${isResizing === 'scorecard' ? 'bg-lime-500/50 dark:bg-[#80FF00]/50' : ''
                        }`}
                    onMouseDown={() => handleResizeStart('scorecard')}
                >
                    <GripVertical className="w-3 h-3 text-gray-400" />
                </div>

                {/* PANE 3: Workbench */}
                <motion.div
                    className="h-full overflow-hidden"
                    style={{ width: `${paneWidths.workbench}%` }}
                >
                    <WorkbenchPane cvData={cvData} userId={userId} />
                </motion.div>
            </div>
        </div>
    );
}
