'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Eye,
    Users,
    Bot,
    ZoomIn,
    ZoomOut,
    Highlighter,
} from 'lucide-react';

import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { useStudio } from '../StudioContext';
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';
import { PILLAR_COLORS } from '@/types/studio';

// ============================================================================
// Props
// ============================================================================

interface PreviewPaneProps {
    cvData: UnifiedCVDataStructure | null;
    userId: string;
}

// ============================================================================
// Component
// ============================================================================

export default function PreviewPane({ cvData, userId }: PreviewPaneProps) {
    const { state, dispatch, selectAnnotation, setPreviewView } = useStudio();
    const previewRef = useRef<HTMLDivElement>(null);

    // ============================================================================
    // Handlers
    // ============================================================================

    const handleZoomIn = () => {
        dispatch({ type: 'SET_PREVIEW_ZOOM', payload: Math.min(state.previewZoom + 10, 150) });
    };

    const handleZoomOut = () => {
        dispatch({ type: 'SET_PREVIEW_ZOOM', payload: Math.max(state.previewZoom - 10, 50) });
    };

    const toggleAnnotations = () => {
        dispatch({ type: 'TOGGLE_ANNOTATIONS' });
    };

    // Get filtered annotations based on active pillar
    const visibleAnnotations = state.activePillar
        ? state.annotations.filter(a => a.pillar === state.activePillar && a.status === 'open')
        : state.annotations.filter(a => a.status === 'open');

    // ============================================================================
    // Render
    // ============================================================================

    return (
        <div className="h-full flex flex-col bg-gray-100 dark:bg-[#0a0d07]">
            {/* Toolbar */}
            <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-white/10 px-3 py-2 flex items-center justify-between">
                {/* View Toggle */}
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-[#1a230f] rounded-lg p-0.5">
                    <button
                        onClick={() => setPreviewView('normal')}
                        className={`p-1.5 rounded-md transition-colors ${state.previewViewType === 'normal'
                                ? 'bg-white dark:bg-[#80FF00] text-gray-900 dark:text-black shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        title="Normal View"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setPreviewView('recruiter')}
                        className={`p-1.5 rounded-md transition-colors ${state.previewViewType === 'recruiter'
                                ? 'bg-white dark:bg-[#80FF00] text-gray-900 dark:text-black shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        title="Recruiter View"
                    >
                        <Users className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setPreviewView('robot')}
                        className={`p-1.5 rounded-md transition-colors ${state.previewViewType === 'robot'
                                ? 'bg-white dark:bg-[#80FF00] text-gray-900 dark:text-black shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        title="Robot View"
                    >
                        <Bot className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Annotations Toggle & Zoom */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={toggleAnnotations}
                        className={`p-1.5 rounded-lg transition-colors ${state.showAnnotations
                                ? 'bg-lime-500/20 dark:bg-[#80FF00]/20 text-lime-600 dark:text-[#80FF00]'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                        title={state.showAnnotations ? 'Hide Annotations' : 'Show Annotations'}
                    >
                        <Highlighter className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center space-x-1">
                        <button
                            onClick={handleZoomOut}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
                        >
                            <ZoomOut className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <span className="text-[10px] text-gray-600 dark:text-gray-400 min-w-[2.5rem] text-center">
                            {state.previewZoom}%
                        </span>
                        <button
                            onClick={handleZoomIn}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
                        >
                            <ZoomIn className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Content with Annotations */}
            <div className="flex-1 overflow-auto p-4" ref={previewRef}>
                <div
                    className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden relative"
                    style={{
                        width: `${(21 / 2.54) * 96 * 0.8}px`, // A4 width scaled
                        transform: `scale(${state.previewZoom / 100})`,
                        transformOrigin: 'top center',
                    }}
                >
                    {cvData ? (
                        <>
                            <CVPreviewContent
                                cvData={cvData}
                                theme="light"
                                showBadge={false}
                            />

                            {/* Annotation Underlines Overlay */}
                            {state.showAnnotations && visibleAnnotations.length > 0 && (
                                <div className="absolute inset-0 pointer-events-none">
                                    {/* This is a simplified overlay - in production, you'd map positions */}
                                    {visibleAnnotations.map((annotation) => (
                                        <motion.div
                                            key={annotation.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute pointer-events-auto cursor-pointer"
                                            style={{
                                                // Position would be calculated based on annotation.match.start/end
                                                // This is a placeholder - real implementation needs DOM position mapping
                                                borderBottom: `2px ${annotation.underlineStyle} ${annotation.underlineColor}`,
                                            }}
                                            onClick={() => selectAnnotation(annotation.id)}
                                            title={annotation.issue}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-[600px] flex items-center justify-center text-gray-400">
                            No CV data loaded
                        </div>
                    )}
                </div>
            </div>

            {/* Annotation Legend */}
            {state.showAnnotations && (
                <div className="bg-white dark:bg-[#141810] border-t border-gray-200 dark:border-white/10 px-3 py-2">
                    <div className="flex items-center justify-center space-x-4 text-[10px]">
                        {Object.entries(PILLAR_COLORS).map(([pillar, { color, style }]) => (
                            <div
                                key={pillar}
                                className="flex items-center space-x-1.5 cursor-pointer hover:opacity-80"
                                onClick={() => dispatch({ type: 'SET_ACTIVE_PILLAR', payload: state.activePillar === pillar ? null : pillar as any })}
                            >
                                <div
                                    className="w-4 h-0.5"
                                    style={{
                                        backgroundColor: color,
                                        borderStyle: style === 'wavy' ? 'solid' : style,
                                    }}
                                />
                                <span className={`capitalize ${state.activePillar === pillar ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {pillar.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
