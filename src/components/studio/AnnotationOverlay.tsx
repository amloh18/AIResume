'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StudioAnnotation, ATSPillar } from '@/types/studio';
import { PILLAR_COLORS } from '@/types/studio';

// ============================================================================
// Props
// ============================================================================

interface AnnotationOverlayProps {
    annotations: StudioAnnotation[];
    activeAnnotationId: string | null;
    activePillar: ATSPillar | null;
    containerRef: React.RefObject<HTMLDivElement>;
    onAnnotationClick: (annotationId: string) => void;
    showAnnotations: boolean;
}

interface AnnotationPosition {
    id: string;
    left: number;
    top: number;
    width: number;
    height: number;
    color: string;
    style: string;
    pillar: ATSPillar;
    issue: string;
}

// ============================================================================
// Underline Style Generator
// ============================================================================

function getUnderlineStyle(style: string, color: string): React.CSSProperties {
    switch (style) {
        case 'wavy':
            return {
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='3' viewBox='0 0 8 3'%3E%3Cpath d='M0,2 Q2,0 4,2 T8,2' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='1.5'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat-x',
                backgroundPosition: 'bottom',
                paddingBottom: '3px',
            };
        case 'dashed':
            return {
                borderBottom: `2px dashed ${color}`,
            };
        case 'dotted':
            return {
                borderBottom: `2px dotted ${color}`,
            };
        case 'double':
            return {
                borderBottom: `3px double ${color}`,
            };
        default: // solid
            return {
                borderBottom: `2px solid ${color}`,
            };
    }
}

// ============================================================================
// Component
// ============================================================================

export default function AnnotationOverlay({
    annotations,
    activeAnnotationId,
    activePillar,
    containerRef,
    onAnnotationClick,
    showAnnotations,
}: AnnotationOverlayProps) {
    const [positions, setPositions] = useState<AnnotationPosition[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Filter annotations based on active pillar
    const visibleAnnotations = activePillar
        ? annotations.filter(a => a.pillar === activePillar && a.status === 'open')
        : annotations.filter(a => a.status === 'open');

    // Calculate positions based on field paths
    const calculatePositions = useCallback(() => {
        if (!containerRef.current || !showAnnotations) {
            setPositions([]);
            return;
        }

        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const newPositions: AnnotationPosition[] = [];

        visibleAnnotations.forEach((annotation) => {
            // Try to find elements with matching data attributes
            const selector = `[data-field-path="${annotation.fieldPath}"], [data-section="${annotation.sectionId}"]`;
            const elements = container.querySelectorAll(selector);

            if (elements.length > 0) {
                elements.forEach((element) => {
                    const rect = element.getBoundingClientRect();
                    const { color, style } = PILLAR_COLORS[annotation.pillar];

                    newPositions.push({
                        id: annotation.id,
                        left: rect.left - containerRect.left,
                        top: rect.bottom - containerRect.top - 2, // Position at bottom of element
                        width: rect.width,
                        height: 3,
                        color,
                        style,
                        pillar: annotation.pillar,
                        issue: annotation.issue,
                    });
                });
            } else {
                // Fallback: Calculate approximate position based on section
                // This is a simplified approach - in production, you'd need DOM mapping
                const sectionElement = container.querySelector(`[data-section="${annotation.sectionId}"]`);
                if (sectionElement) {
                    const rect = sectionElement.getBoundingClientRect();
                    const { color, style } = PILLAR_COLORS[annotation.pillar];

                    // Offset based on index within section
                    const sectionAnnotations = visibleAnnotations.filter(a => a.sectionId === annotation.sectionId);
                    const index = sectionAnnotations.findIndex(a => a.id === annotation.id);
                    const yOffset = index * 24;

                    newPositions.push({
                        id: annotation.id,
                        left: rect.left - containerRect.left + 10,
                        top: rect.top - containerRect.top + 30 + yOffset,
                        width: rect.width * 0.6,
                        height: 3,
                        color,
                        style,
                        pillar: annotation.pillar,
                        issue: annotation.issue,
                    });
                }
            }
        });

        setPositions(newPositions);
    }, [visibleAnnotations, containerRef, showAnnotations]);

    // Recalculate on changes
    useEffect(() => {
        calculatePositions();

        // Also recalculate on resize
        const handleResize = () => calculatePositions();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, [calculatePositions]);

    if (!showAnnotations || positions.length === 0) {
        return null;
    }

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <AnimatePresence>
                {positions.map((pos) => {
                    const isActive = activeAnnotationId === pos.id;
                    const isHovered = hoveredId === pos.id;

                    return (
                        <motion.div
                            key={pos.id}
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{
                                opacity: isActive || isHovered ? 1 : 0.7,
                                scaleX: 1,
                            }}
                            exit={{ opacity: 0, scaleX: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute pointer-events-auto cursor-pointer"
                            style={{
                                left: pos.left,
                                top: pos.top,
                                width: pos.width,
                                height: pos.height,
                                ...getUnderlineStyle(pos.style, pos.color),
                                transformOrigin: 'left',
                            }}
                            onClick={() => onAnnotationClick(pos.id)}
                            onMouseEnter={() => setHoveredId(pos.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            title={pos.issue}
                        >
                            {/* Expand hitbox for easier clicking */}
                            <div className="absolute inset-0 -top-4 -bottom-1" />

                            {/* Tooltip on hover */}
                            {(isHovered || isActive) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute left-0 top-full mt-1 z-50 max-w-xs"
                                >
                                    <div
                                        className="px-2 py-1 rounded-md text-[10px] text-white shadow-lg"
                                        style={{ backgroundColor: pos.color }}
                                    >
                                        <span className="font-medium capitalize">{pos.pillar.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <span className="opacity-80"> • </span>
                                        <span className="opacity-90 line-clamp-1">{pos.issue}</span>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
