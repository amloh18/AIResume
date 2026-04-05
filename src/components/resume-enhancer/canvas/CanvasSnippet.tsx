'use client';

/**
 * CanvasSnippet -- wrapper around an individual snippet instance on the
 * canvas. Provides hover controls (Replace, Move Up/Down, Delete, drag
 * handle) and native HTML5 drag support.
 */

import React, { memo, useCallback, useRef } from 'react';
import { Shuffle, ChevronUp, ChevronDown, Trash2, GripVertical, Plus } from 'lucide-react';
import { SNIPPETS } from './snippets';
import type { ZoneSnippet, SnippetData, DesignVars, SnippetCategoryId } from './snippetTypes';

interface CanvasSnippetProps {
  snippet: ZoneSnippet;
  index: number;
  total: number;
  zoneId: string;
  data: SnippetData;
  designVars: DesignVars;
  isEditing: boolean;
  onFieldChange: (path: string, value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onReplace: () => void;
  onAddBelow: () => void;
  onDragStart: (e: React.DragEvent, zoneId: string, index: number) => void;
  onDragEnd: () => void;
  highlightedField?: string | null;
  fixAnnotations?: any[];
  onAnnotationClick?: (fixId: string) => void;
}

function CanvasSnippetInner({
  snippet,
  index,
  total,
  zoneId,
  data,
  designVars,
  isEditing,
  onFieldChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onReplace,
  onAddBelow,
  onDragStart,
  onDragEnd,
  highlightedField,
  fixAnnotations,
  onAnnotationClick,
}: CanvasSnippetProps) {
  const snippetDef = SNIPPETS[snippet.snippetId];
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ zoneId, index }));
      // Create ghost element
      if (dragRef.current) {
        const ghost = dragRef.current.cloneNode(true) as HTMLElement;
        ghost.style.opacity = '0.6';
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => document.body.removeChild(ghost), 0);
      }
      onDragStart(e, zoneId, index);
    },
    [zoneId, index, onDragStart],
  );

  if (!snippetDef) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 text-xs rounded border border-red-200 dark:border-red-800">
        Unknown snippet: {snippet.snippetId}
      </div>
    );
  }

  return (
    <div
      ref={dragRef}
      className="group relative canvas-snippet"
      data-snippet-id={snippet.snippetId}
      data-snippet-category={snippet.category}
    >
      {/* Hover control bar */}
      {isEditing && (
        <div className="absolute -top-3 right-0 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-[#1e1e1e] rounded-md shadow-md border border-gray-200 dark:border-gray-700 px-1 py-0.5 z-10">
          <button
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 cursor-grab"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            title="Drag to reorder"
          >
            <GripVertical size={12} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
            onClick={onReplace}
            title="Replace snippet"
          >
            <Shuffle size={12} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
          >
            <ChevronUp size={12} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Move down"
          >
            <ChevronDown size={12} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600"
            onClick={onAddBelow}
            title="Add section below"
          >
            <Plus size={12} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
            onClick={onDelete}
            title="Remove section"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Snippet content */}
      {snippetDef.render({
        data,
        designVars,
        isEditing,
        onFieldChange,
        highlightedField,
        fixAnnotations,
        onAnnotationClick,
      })}
    </div>
  );
}

const CanvasSnippet = memo(CanvasSnippetInner);
export default CanvasSnippet;
