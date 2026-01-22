'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InlineAddSectionButtonProps {
    /** Position in the section list (for insertion) */
    insertIndex?: number;
    /** Callback when add section is triggered */
    onAddSection?: (insertIndex: number) => void;
    /** Generic click handler */
    onClick?: () => void;
    /** Whether to show the button */
    visible?: boolean;
    /** Additional CSS class */
    className?: string;
    /** Label text (optional, shown on hover) */
    label?: string;
}

/**
 * InlineAddSectionButton - A blended add-section button for the CV preview
 * 
 * Appears between sections with subtle styling that becomes more visible on hover.
 * Hidden in print/PDF via CSS class.
 */
export const InlineAddSectionButton: React.FC<InlineAddSectionButtonProps> = ({
    insertIndex,
    onAddSection,
    onClick,
    visible = true,
    className = '',
    label = 'Add section',
}) => {
    const [isHovered, setIsHovered] = useState(false);

    if (!visible) {
        return null;
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) {
            onClick();
        } else if (onAddSection && insertIndex !== undefined) {
            onAddSection(insertIndex);
        }
    };

    return (
        <motion.button
            type="button"
            className={`inline-add-section-button cv-editor-only ${className}`}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: isHovered ? 1 : 0.3 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.2 }}
        >
            <Plus className="add-icon" size={16} />
            <AnimatePresence>
                {isHovered && (
                    <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        {label}
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
};

export default InlineAddSectionButton;
