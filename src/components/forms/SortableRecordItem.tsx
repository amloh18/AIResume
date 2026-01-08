'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableRecordItemProps {
    id: string;
    children: React.ReactNode;
    className?: string;
}

/**
 * A reusable wrapper component that makes a record item sortable via drag-and-drop.
 * Provides a drag handle and visual feedback during dragging.
 */
export function SortableRecordItem({ id, children, className = '' }: SortableRecordItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative ${isDragging ? 'shadow-2xl' : ''} ${className}`}
        >
            {children}
            {/* Drag handle - positioned in the top-left corner */}
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="absolute top-4 left-2 p-1 cursor-grab active:cursor-grabbing text-white/40 hover:text-white/70 transition-colors touch-none"
                aria-label="Drag to reorder"
                title="Drag to reorder"
            >
                <GripVertical size={16} />
            </button>
        </div>
    );
}

/**
 * Header component for a sortable record that includes a drag handle.
 * Use this when you want the drag handle inline with the header content.
 */
interface SortableRecordHeaderProps {
    id: string;
    title: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

export function SortableRecordHeader({ id, title, actions, className = '' }: SortableRecordHeaderProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between ${className}`}
        >
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className={`p-1 cursor-grab active:cursor-grabbing transition-colors touch-none ${isDragging ? 'text-[#80FF00]' : 'text-white/40 hover:text-white/70'
                        }`}
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                >
                    <GripVertical size={16} />
                </button>
                {title}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}

export default SortableRecordItem;
