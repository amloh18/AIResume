'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { X, Download, Loader2, FileText } from 'lucide-react';
// TODO: CVPreview was deleted - need to replace with CVPreviewContent or create new preview component
// import CVPreview from '@/components/studio/CVPreview';
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';
import { usePillEngine } from '@/hooks/usePillEngine';
import { SuggestionHoverCard } from './overlays/SuggestionHoverCard';
import { Issue } from '@/lib/pill-engine/types';

export default function PreviewOverlay() {
    const { state, dispatch } = useResumeEnhancer();
    const [isExporting, setIsExporting] = useState(false);

    // Command Center Engine
    const { issues } = usePillEngine(state.cvData, state.targetRole, state.seniorityLevel);

    // Hover State
    const [hoveredIssue, setHoveredIssue] = useState<Issue | null>(null);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

    // Handle mouse move to find targeted elements
    const handleMouseMove = (e: React.MouseEvent) => {
        // Optimization: Only run every few frames or check target directly
        const target = e.target as HTMLElement;
        const sectionId = target.getAttribute('data-section-id') || target.closest('[data-section-id]')?.getAttribute('data-section-id');

        if (sectionId) {
            // Find issue related to this section
            // We match broadly on sectionId (e.g. "work-123" vs issue.sectionId "123")
            const relevantIssue = issues.find(i =>
                i.sectionId && (sectionId === i.sectionId || sectionId.includes(i.sectionId))
            );

            if (relevantIssue) {
                setHoveredIssue(relevantIssue);
                // Position card near cursor but slightly offset
                setHoverPos({ x: e.clientX + 20, y: e.clientY + 20 });
                return;
            }
        }

        // Use timeout to prevent flickering when moving between child elements
        // For simple V1, just clear if not found immediately
        setHoveredIssue(null);
    };

    const handleIssueFix = () => {
        if (hoveredIssue) {
            // Dispatch a focus action or just close preview to let user edit?
            // Since this is "Preview Overlay", maybe we just close it and scroll.
            handleClose();
            // Then trigger scroll (requires logic in parent or Context)
            // For now, simple console log or TODO
            console.log('Fixing', hoveredIssue);
        }
    };

    const handleClose = () => {
        dispatch({ type: 'SET_SHOW_PREVIEW_OVERLAY', payload: false });
    };

    const handleExportPDF = async () => {
        setIsExporting(true);

        try {
            // TODO: Implement PDF export functionality
            // This would typically call an API endpoint to generate PDF
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate export

            // Placeholder: In real implementation, trigger download
            console.log('PDF Export triggered');
        } catch (error) {
            console.error('PDF export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-[var(--bg-secondary)] z-10 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] shadow-sm shadow-black/10 dark:shadow-black/30">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[color:var(--accent-primary)]" />
                    <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Preview</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-black rounded-lg font-medium text-sm hover:bg-[var(--accent-hover)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Export PDF
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-[color:var(--text-secondary)] hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto bg-[var(--bg-secondary)] p-6">
                <div className="max-w-4xl mx-auto">
                    {state.selectedTemplate ? (
                        <div className="bg-white rounded-lg shadow-2xl border border-black/10 dark:border-white/10">
                            <CVPreviewContent
                                cvData={state.cvData}
                                templateName={state.selectedTemplate?.name}
                                jobData={state.jobData}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-[color:var(--text-tertiary)]">
                            <FileText className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">No Template Selected</p>
                            <p className="text-sm">Please select a template to preview your CV</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Hover Overlay Card */}
            {hoveredIssue && (
                <SuggestionHoverCard
                    issue={hoveredIssue}
                    onFix={handleIssueFix}
                    style={{ top: hoverPos.y, left: hoverPos.x }}
                />
            )}

            {/* Capture mouse moves over the preview area */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                {...{ onMouseMoveCapture: handleMouseMove } as any}
                style={{ pointerEvents: 'auto' }} // Allow mouse events
            />

            {/* Footer Info */}
            <div className="p-4 bg-[var(--bg-tertiary)] shadow-[0_-1px_0_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_0_rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between text-xs text-[color:var(--text-tertiary)]">
                    <p>Live preview updates automatically as you edit</p>
                    <p className="text-[color:var(--accent-primary)]">Press ESC to close</p>
                </div>
            </div>
        </motion.div>
    );
}
