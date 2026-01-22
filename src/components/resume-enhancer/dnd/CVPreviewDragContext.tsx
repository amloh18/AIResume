'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    UniqueIdentifier,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import type { CVSectionStructure } from '@/types/unified-cv-schema';

interface CVPreviewDragContextProps {
    /** Current sections from cvData.structure.sections */
    sections: CVSectionStructure[];
    /** Callback when sections are reordered */
    onSectionsReorder: (newSections: CVSectionStructure[]) => void;
    /** Template layout type */
    layoutType?: 'one-column' | 'two-column';
    /** Whether drag is enabled */
    enabled?: boolean;
    /** Children to render */
    children: React.ReactNode;
    /** Render function for drag overlay content */
    renderDragOverlay?: (sectionId: string, sectionType: string) => React.ReactNode;
}

/**
 * CVPreviewDragContext - Context provider for CV section drag-and-drop
 * 
 * Wraps the CV preview with DndContext and SortableContext(s).
 * For single-column: one vertical sortable context
 * For two-column: TODO - two separate sortable contexts for sidebar and main content
 */
export const CVPreviewDragContext: React.FC<CVPreviewDragContextProps> = ({
    sections,
    onSectionsReorder,
    layoutType = 'one-column',
    enabled = true,
    children,
    renderDragOverlay,
}) => {
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [activeSectionType, setActiveSectionType] = useState<string | null>(null);

    // Memoize section IDs for SortableContext
    const sectionIds = useMemo(
        () => sections.filter(s => s.visible !== false).map(s => s.id),
        [sections]
    );

    // Configure sensors with activation constraints
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id);

        // Get section type from data
        const sectionData = active.data?.current;
        if (sectionData?.sectionType) {
            setActiveSectionType(sectionData.sectionType);
        }
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);
        setActiveSectionType(null);

        if (!over || active.id === over.id) {
            return;
        }

        // Find indices
        const oldIndex = sections.findIndex(s => s.id === active.id);
        const newIndex = sections.findIndex(s => s.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        // Reorder sections
        const newSections = arrayMove(sections, oldIndex, newIndex);
        onSectionsReorder(newSections);
    }, [sections, onSectionsReorder]);

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setActiveSectionType(null);
    }, []);

    // Get active section for overlay
    const activeSection = useMemo(() => {
        if (!activeId) return null;
        return sections.find(s => s.id === activeId) || null;
    }, [activeId, sections]);

    // If drag is disabled, just render children
    if (!enabled) {
        return <>{children}</>;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext
                items={sectionIds}
                strategy={verticalListSortingStrategy}
            >
                {children}
            </SortableContext>

            {/* Drag Overlay - shows ghost element while dragging */}
            <DragOverlay>
                {activeId && activeSection && renderDragOverlay ? (
                    <div className="cv-section-drag-overlay cv-editor-only">
                        {renderDragOverlay(activeSection.id, activeSection.type)}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

/**
 * Hook to get section IDs for a specific column in two-column layouts
 * 
 * @param sections - All sections
 * @param column - Which column to get ('sidebar' | 'main')
 * @returns Array of section IDs in that column
 */
export function useSectionsByColumn(
    sections: CVSectionStructure[],
    column: 'sidebar' | 'main'
): string[] {
    return useMemo(() => {
        return sections
            .filter(s => s.visible !== false)
            .filter(s => {
                // If section has explicit column assignment, use it
                if ((s as any).column) {
                    return (s as any).column === column;
                }
                // Default column mappings for two-column templates
                const sidebarSections = ['personal_header', 'skills', 'languages', 'certificates'];
                const isSidebarSection = sidebarSections.includes(s.type);
                return column === 'sidebar' ? isSidebarSection : !isSidebarSection;
            })
            .map(s => s.id);
    }, [sections, column]);
}

export default CVPreviewDragContext;
