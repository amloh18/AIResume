'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

interface DraggableSectionProps {
    /** Unique section ID from cvData.structure.sections */
    sectionId: string;
    /** Section type (e.g., 'work_experience', 'skills') */
    sectionType: string;
    /** Child content to render inside the draggable wrapper */
    children: React.ReactNode;
    /** Whether to show editor UI (drag handles, delete button) */
    showEditorUI?: boolean;
    /** Whether this section can be deleted */
    canDelete?: boolean;
    /** Whether this section is locked (header sections - cannot be dragged or deleted) */
    isLocked?: boolean;
    /** Callback when delete button is clicked */
    onDelete?: (sectionId: string) => void;
    /** Callback when section is clicked (for opening editor) */
    onSectionClick?: (sectionId: string, e: React.MouseEvent) => void;
    /** Additional CSS class name */
    className?: string;
    /** Whether the section is currently being dragged */
    isDragDisabled?: boolean;
}

/**
 * DraggableSection - A wrapper that makes CV sections draggable
 *
 * Uses @dnd-kit/sortable for drag-and-drop functionality.
 * IMPORTANT: drag is ONLY activated when the user grabs the dedicated GripVertical
 * handle in the section toolbar — clicking anywhere else on the section does NOT
 * initiate a drag. This is achieved by:
 *   1. Passing `activationConstraint: undefined` to useSortable (no auto-activation).
 *   2. Spreading `{...listeners}` exclusively onto the drag-handle `<button>`.
 *   3. Keeping `{...attributes}` on the wrapper for a11y (aria-roledescription etc.)
 *      but NOT the pointer listeners that trigger dragging.
 *
 * All editor UI is hidden in print/PDF via CSS.
 */
export const DraggableSection: React.FC<DraggableSectionProps> = ({
    sectionId,
    sectionType,
    children,
    showEditorUI = true,
    canDelete = true,
    isLocked = false,
    onDelete,
    onSectionClick,
    className = '',
    isDragDisabled = false,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
        isOver,
    } = useSortable({
        id: sectionId,
        disabled: isDragDisabled || !showEditorUI || isLocked,
        data: {
            type: 'section',
            sectionType,
        },
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative' as const,
    };

    const handleClick = (e: React.MouseEvent) => {
        // Don't trigger click if clicking on section toolbar buttons
        const target = e.target as HTMLElement;
        if (
            target.closest('.cv-section-toolbar') ||
            target.closest('.section-hover-controls')
        ) {
            return;
        }
        onSectionClick?.(sectionId, e);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onDelete?.(sectionId);
    };

    const canDrag = showEditorUI && !isLocked && !isDragDisabled;

    return (
        <div
            ref={setNodeRef}
            style={style}
            // Only a11y attributes go on the wrapper — NO pointer listeners here
            {...attributes}
            className={`cv-draggable-section ${className} ${isDragging ? 'is-dragging' : ''} ${isOver ? 'is-drop-target' : ''}`}
            data-draggable-section
            data-section-id={sectionId}
            data-section-type={sectionType}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* ── Section toolbar — only visible on hover, hidden in print ── */}
            {showEditorUI && !isLocked && (
                <div
                    className={`cv-section-toolbar cv-editor-only absolute top-1 right-1 flex items-center gap-0.5 z-50 transition-opacity duration-150 ${
                        isHovered && !isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    {/* ── Drag handle — the ONLY element with dnd-kit listeners ── */}
                    {canDrag && (
                        <button
                            ref={setActivatorNodeRef}
                            // Spread listeners ONLY here — this is the sole drag trigger
                            {...listeners}
                            type="button"
                            title="Drag to reorder section"
                            className="cv-drag-handle flex items-center gap-1 px-1.5 py-1 rounded-md bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-white/10 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 shadow-sm cursor-grab active:cursor-grabbing touch-none select-none transition-all duration-250 hover:scale-110"
                            style={{ backdropFilter: 'blur(4px)' }}
                        >
                            <GripVertical size={13} />
                            <span className="text-[10px] font-semibold tracking-wide leading-none hidden sm:inline">
                                Drag
                            </span>
                        </button>
                    )}

                    {/* ── Delete button ── */}
                    {canDelete && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            title="Remove section"
                            className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border border-transparent text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500/40 shadow-sm transition-all duration-250 hover:scale-110"
                            style={{ backdropFilter: 'blur(4px)' }}
                        >
                            <Trash2 size={11} />
                        </button>
                    )}
                </div>
            )}

            {/* Drop zone indicator */}
            {isOver && !isDragging && (
                <div className="cv-drop-zone-indicator cv-editor-only" />
            )}

            {/* Section Content */}
            <div className="cv-section-content">
                {children}
            </div>
        </div>
    );
};

export default DraggableSection;
