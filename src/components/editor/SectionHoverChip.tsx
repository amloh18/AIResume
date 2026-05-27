'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Trash2, Plus, Palette, GalleryHorizontal } from 'lucide-react';
import type { Editor } from '@tiptap/core';

interface SectionInfo {
  id: string;
  type: string;
  label: string;
  rect: DOMRect;
  element: HTMLElement;
}

interface SectionHoverChipProps {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLElement | null>;
  onAddEntry: (sectionType: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onOpenSnippets?: (sectionType: string) => void;
  onOpenGallery?: () => void;
  snippetCategories?: string[];
}

const SECTION_LABELS: Record<string, string> = {
  'experience-block': 'Experience',
  'education-block': 'Education',
  'skills-block': 'Skills',
  'projects-block': 'Projects',
};

// Tolerance zone in pixels around section bounds for hover detection
const HOVER_TOLERANCE = 24;

export const SectionHoverChip: React.FC<SectionHoverChipProps> = ({
  editor,
  containerRef,
  onAddEntry,
  onDeleteSection,
  onOpenSnippets,
  onOpenGallery,
  snippetCategories = ['skills', 'dates', 'sectionTitle'],
}) => {
  const [hoveredSection, setHoveredSection] = useState<SectionInfo | null>(null);
  const [dragState, setDragState] = useState<{ dragging: boolean; sectionId: string | null }>({
    dragging: false,
    sectionId: null,
  });
  const chipRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inject hover/selected CSS styles
  useEffect(() => {
    const styleId = 'section-hover-chip-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .section-hover-overlay {
        background: rgba(0, 0, 0, 0.015) !important;
        transition: background 150ms ease, box-shadow 150ms ease !important;
      }
      .section-selected-overlay {
        border-left: 3px solid #84cc16 !important;
        background: rgba(132, 204, 22, 0.04) !important;
        transition: all 150ms ease !important;
      }
      .section-hover-overlay.section-selected-overlay {
        background: rgba(132, 204, 22, 0.07) !important;
      }
      .section-drop-indicator {
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: #84cc16;
        border-radius: 2px;
        z-index: 50;
        pointer-events: none;
        animation: drop-pulse 1.2s ease-in-out infinite;
      }
      @keyframes drop-pulse {
        0%, 100% { opacity: 0.6; box-shadow: 0 0 4px rgba(132, 204, 22, 0.3); }
        50% { opacity: 1; box-shadow: 0 0 8px rgba(132, 204, 22, 0.6); }
      }
      .section-dragging {
        opacity: 0.5 !important;
        transform: scale(0.98);
        transition: opacity 150ms ease, transform 150ms ease !important;
      }
      .section-hover-chip {
        user-select: none;
        -webkit-user-select: none;
      }
      .section-hover-chip button:active {
        transform: scale(0.92);
      }
      /* Always-visible drag handle on the left edge of sections */
      .section-drag-handle-zone {
        position: absolute;
        left: -28px;
        top: 0;
        bottom: 0;
        width: 28px;
        z-index: 90;
        cursor: grab;
        display: flex;
        align-items: flex-start;
        padding-top: 8px;
        justify-content: center;
        opacity: 0;
        transition: opacity 150ms ease;
        pointer-events: auto;
      }
      .section-drag-handle-zone:hover,
      .section-wrapper:hover .section-drag-handle-zone {
        opacity: 1;
      }
      .section-wrapper {
        position: relative;
      }
      /* Wider hover zone for drag handle */
      .section-drag-handle-hitbox {
        position: absolute;
        left: -40px;
        top: 0;
        bottom: 0;
        width: 52px;
        z-index: 89;
        cursor: grab;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, []);

  // Find all section elements in the editor
  const findSections = useCallback((): SectionInfo[] => {
    const container = containerRef.current;
    if (!container) return [];

    const sections: SectionInfo[] = [];
    const elements = container.querySelectorAll('[data-type]');

    elements.forEach((el) => {
      const dataType = el.getAttribute('data-type');
      if (!dataType || !SECTION_LABELS[dataType]) return;

      const sectionId = el.getAttribute('data-id') || '';
      const rect = (el as HTMLElement).getBoundingClientRect();

      sections.push({
        id: sectionId,
        type: dataType,
        label: SECTION_LABELS[dataType],
        rect,
        element: el as HTMLElement,
      });
    });

    return sections;
  }, [containerRef]);

  // Handle mouse movement to detect hover with tolerance zone
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let prevHovered: HTMLElement | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.dragging) return;

      const sections = findSections();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Find section under mouse with tolerance zone
      let found: SectionInfo | null = null;
      let closestDist = Infinity;

      for (const section of sections) {
        const { rect } = section;
        
        // Check if within expanded bounds (with tolerance)
        const inExpandedBounds =
          mouseX >= rect.left - HOVER_TOLERANCE &&
          mouseX <= rect.right + HOVER_TOLERANCE &&
          mouseY >= rect.top - HOVER_TOLERANCE &&
          mouseY <= rect.bottom + HOVER_TOLERANCE;

        // Check if within exact bounds
        const inExactBounds =
          mouseX >= rect.left &&
          mouseX <= rect.right &&
          mouseY >= rect.top &&
          mouseY <= rect.bottom;

        // Prioritize exact bounds, but keep section active in tolerance zone
        if (inExactBounds) {
          found = section;
          break;
        } else if (inExpandedBounds && !found) {
          // Calculate distance to section center for tie-breaking
          const centerX = (rect.left + rect.right) / 2;
          const centerY = (rect.top + rect.bottom) / 2;
          const dist = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2);
          if (dist < closestDist) {
            closestDist = dist;
            found = section;
          }
        }
      }

      // Update hover classes
      if (prevHovered && prevHovered !== found?.element) {
        prevHovered.classList.remove('section-hover-overlay');
      }
      if (found?.element) {
        found.element.classList.add('section-hover-overlay');
        prevHovered = found.element;
      } else {
        prevHovered = null;
      }

      setHoveredSection(found);
    };

    const handleMouseLeave = () => {
      if (prevHovered) {
        prevHovered.classList.remove('section-hover-overlay');
        prevHovered = null;
      }
      setHoveredSection(null);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (prevHovered) {
        prevHovered.classList.remove('section-hover-overlay');
      }
    };
  }, [containerRef, findSections, dragState.dragging]);

  // Ensure section elements have the wrapper class for persistent drag handles
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const addWrapperClass = () => {
      const elements = container.querySelectorAll('[data-type]');
      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const dataType = htmlEl.getAttribute('data-type');
        if (dataType && SECTION_LABELS[dataType] && !htmlEl.classList.contains('section-wrapper')) {
          htmlEl.classList.add('section-wrapper');
          htmlEl.style.position = 'relative';
        }
      });
    };

    addWrapperClass();

    // Re-run when DOM changes
    const observer = new MutationObserver(addWrapperClass);
    observer.observe(container, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [containerRef]);

  // Track selection changes for selected overlay
  useEffect(() => {
    if (!editor) return;

    let prevSelected: HTMLElement | null = null;

    const updateSelectedSection = () => {
      const container = containerRef.current;
      if (!container) return;

      // Remove previous
      if (prevSelected) {
        prevSelected.classList.remove('section-selected-overlay');
        prevSelected = null;
      }

      // Find the section containing the current selection
      const { state } = editor;
      const { $from } = state.selection;

      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        const dataType = node.attrs['data-type'];
        if (dataType && SECTION_LABELS[dataType]) {
          const sectionId = node.attrs['data-id'];
          const el = container.querySelector(`[data-type="${dataType}"][data-id="${sectionId}"]`) as HTMLElement;
          if (el) {
            el.classList.add('section-selected-overlay');
            prevSelected = el;
          }
          break;
        }
      }
    };

    editor.on('selectionUpdate', updateSelectedSection);
    updateSelectedSection();

    return () => {
      editor.off('selectionUpdate', updateSelectedSection);
      if (prevSelected) {
        prevSelected.classList.remove('section-selected-overlay');
      }
    };
  }, [editor, containerRef]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, sectionId: string) => {
    if (!editor) return;

    // Find the section position in the editor
    let sectionPos = -1;
    let sectionType = '';

    const sections = findSections();
    const section = sections.find(s => s.id === sectionId);
    
    if (section) {
      try {
        sectionPos = editor.view.posAtDOM(section.element, 0);
        sectionType = section.type;
        
        // Adjust position to the start of the node if needed
        const $pos = editor.state.doc.resolve(sectionPos);
        sectionPos = $pos.before();
      } catch (err) {
        console.error('Failed to get section position:', err);
      }
    }

    if (sectionPos >= 0) {
      editor.commands.setDraggingState(sectionPos, sectionType);
    }

    setDragState({ dragging: true, sectionId });
    e.dataTransfer.setData('text/plain', sectionId);
    e.dataTransfer.effectAllowed = 'move';

    // Mark the dragged section
    const container = containerRef.current;
    if (container) {
      const el = container.querySelector(`[data-id="${sectionId}"]`) as HTMLElement;
      if (el) el.classList.add('section-dragging');
    }
  }, [containerRef, editor, findSections]);

  const handleDragEnd = useCallback(() => {
    if (editor) {
      editor.commands.resetDraggingState();
    }

    const container = containerRef.current;
    if (container && dragState.sectionId) {
      const el = container.querySelector(`[data-id="${dragState.sectionId}"]`) as HTMLElement;
      if (el) el.classList.remove('section-dragging');
    }
    // Remove all drop indicators
    container?.querySelectorAll('.section-drop-indicator').forEach((el) => el.remove());
    setDragState({ dragging: false, sectionId: null });
  }, [containerRef, editor, dragState.sectionId]);

  // Calculate chip position - position above the section with some offset
  const chipPosition = hoveredSection
    ? {
        top: hoveredSection.rect.top - (containerRef.current?.getBoundingClientRect().top || 0) - 36,
        left: hoveredSection.rect.left - (containerRef.current?.getBoundingClientRect().left || 0),
      }
    : null;

  const hasSnippets = hoveredSection && snippetCategories.length > 0;

  return (
    <>
      {/* Floating hover chip */}
      <AnimatePresence>
        {hoveredSection && chipPosition && (
          <motion.div
            ref={chipRef}
            className="section-hover-chip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: chipPosition.top,
              left: chipPosition.left,
              zIndex: 100,
              pointerEvents: 'auto',
            }}
          >
            <div className="flex items-center gap-0.5 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-lg px-1.5 py-1 text-xs">
              {/* Drag handle */}
              <button
                draggable
                data-drag-handle
                onDragStart={(e) => handleDragStart(e, hoveredSection.id)}
                onDragEnd={handleDragEnd}
                className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical size={14} />
              </button>

              {/* Section name */}
              <span className="px-1.5 text-gray-300 font-medium select-none">
                {hoveredSection.label}
              </span>

              <div className="w-px h-4 bg-gray-600 mx-0.5" />

              {/* Add entry */}
              <button
                onClick={() => onAddEntry(hoveredSection.type)}
                className="p-1 rounded hover:bg-lime-600/30 text-gray-400 hover:text-lime-400 transition-colors"
                title={`Add new ${hoveredSection.label.toLowerCase()} entry`}
              >
                <Plus size={14} />
              </button>

              {/* Snippets */}
              {hasSnippets && onOpenSnippets && (
                <button
                  onClick={() => onOpenSnippets(hoveredSection.type)}
                  className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  title="Change section design"
                >
                  <Palette size={14} />
                </button>
              )}

              {/* Gallery */}
              {onOpenGallery && (
                <button
                  onClick={onOpenGallery}
                  className="p-1 rounded hover:bg-emerald-600/30 text-gray-400 hover:text-emerald-400 transition-colors"
                  title="Browse snippet gallery"
                >
                  <GalleryHorizontal size={14} />
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => onDeleteSection(hoveredSection.id)}
                className="p-1 rounded hover:bg-red-600/30 text-gray-400 hover:text-red-400 transition-colors"
                title={`Delete ${hoveredSection.label.toLowerCase()}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop indicator for drag-and-drop */}
      {dragState.dragging && (
        <DropIndicator
          containerRef={containerRef}
          draggedId={dragState.sectionId}
          findSections={findSections}
        />
      )}
    </>
  );
};

// Drop indicator component that shows animated line during drag
interface DropIndicatorProps {
  containerRef: React.RefObject<HTMLElement | null>;
  draggedId: string | null;
  findSections: () => SectionInfo[];
}

const DropIndicator: React.FC<DropIndicatorProps> = ({
  containerRef,
  draggedId,
  findSections,
}) => {
  const [indicatorPos, setIndicatorPos] = useState<{ top: number; visible: boolean }>({
    top: 0,
    visible: false,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

      const sections = findSections();
      const mouseY = e.clientY;

      // Find the closest section boundary
      let closestTop = 0;
      let closestDist = Infinity;
      let showIndicator = false;

      for (const section of sections) {
        if (section.id === draggedId) continue;

        const distToTop = Math.abs(mouseY - section.rect.top);
        const distToBottom = Math.abs(mouseY - section.rect.bottom);

        if (distToTop < closestDist && distToTop < 40) {
          closestDist = distToTop;
          closestTop = section.rect.top - (container.getBoundingClientRect().top || 0) - 2;
          showIndicator = true;
        }
        if (distToBottom < closestDist && distToBottom < 40) {
          closestDist = distToBottom;
          closestTop = section.rect.bottom - (container.getBoundingClientRect().top || 0) - 1;
          showIndicator = true;
        }
      }

      setIndicatorPos({ top: closestTop, visible: showIndicator });
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIndicatorPos((prev) => ({ ...prev, visible: false }));
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, [containerRef, draggedId, findSections]);

  if (!indicatorPos.visible) return null;

  return (
    <div
      className="section-drop-indicator"
      style={{ top: indicatorPos.top }}
    />
  );
};

export default SectionHoverChip;
