'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Move } from 'lucide-react';

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
 * Shows a centered overlay with drag icon on hover.
 * The entire section area is draggable.
 * All editor UI is hidden in print/PDF via CSS.
 */
export const DraggableSection: React.FC<DraggableSectionProps> = ({
    sectionId,
    sectionType,
    children,
    showEditorUI = true,
    canDelete = true,
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
        transform,
        transition,
        isDragging,
        isOver,
    } = useSortable({
        id: sectionId,
        disabled: isDragDisabled || !showEditorUI,
        data: {
            type: 'section',
            sectionType,
        },
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
    };

    const handleClick = (e: React.MouseEvent) => {
        // Don't trigger click if clicking on overlay controls
        const target = e.target as HTMLElement;
        if (
            target.closest('.cv-drag-overlay') ||
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

    const handleOverlayClick = (e: React.MouseEvent) => {
        // Let the overlay handle drag, but clicking the overlay itself opens editor
        const target = e.target as HTMLElement;
        if (target.closest('.cv-drag-icon-container')) {
            return; // Don't open editor when clicking drag icon
        }
        // Otherwise, clicking overlay opens the section editor
        onSectionClick?.(sectionId, e);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`cv-draggable-section ${className} ${isDragging ? 'is-dragging' : ''} ${isOver ? 'is-drop-target' : ''}`}
            data-draggable-section
            data-section-id={sectionId}
            data-section-type={sectionType}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Centered Drag Overlay - appears on hover, hidden in print/PDF */}
            {showEditorUI && (
                <div
                    className={`cv-drag-overlay cv-editor-only ${isHovered && !isDragging ? 'visible' : ''}`}
                    onClick={handleOverlayClick}
                >
                    {/* Centered Drag Icon Container */}
                    <div
                        className="cv-drag-icon-container"
                        {...attributes}
                        {...listeners}
                        title="Drag to reorder section"
                    >
                        <Move size={20} className="cv-drag-icon" />
                        <span className="cv-drag-label">Drag to reorder</span>
                    </div>

                    {/* Delete Button in Overlay */}
                    {canDelete && (
                        <button
                            className="cv-delete-btn"
                            onClick={handleDelete}
                            title="Remove section"
                            type="button"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            )}

            {/* Drop Zone Indicator - shows when dragging over this position */}
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
