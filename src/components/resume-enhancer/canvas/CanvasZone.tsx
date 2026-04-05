'use client';

/**
 * CanvasZone -- drop zone container that holds a list of CanvasSnippets.
 * Renders drop indicators during drag-and-drop and an "Add Section"
 * button at the bottom.
 */

import React, { useCallback, useState, memo } from 'react';
import { Plus } from 'lucide-react';
import CanvasSnippet from './CanvasSnippet';
import type { Zone, SnippetData, DesignVars, DragState } from './snippetTypes';

interface CanvasZoneProps {
  zone: Zone;
  data: SnippetData;
  designVars: DesignVars;
  isEditing: boolean;
  dragState: DragState;
  onFieldChange: (path: string, value: string) => void;
  onSnippetMoveUp: (zoneId: string, index: number) => void;
  onSnippetMoveDown: (zoneId: string, index: number) => void;
  onSnippetDelete: (zoneId: string, index: number) => void;
  onSnippetReplace: (zoneId: string, index: number) => void;
  onSnippetAddBelow: (zoneId: string, index: number) => void;
  onAddSection: (zoneId: string) => void;
  onDragStart: (e: React.DragEvent, zoneId: string, index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, zoneId: string, index: number) => void;
  onDrop: (e: React.DragEvent, zoneId: string, index: number) => void;
  highlightedField?: string | null;
  fixAnnotations?: any[];
  onAnnotationClick?: (fixId: string) => void;
  className?: string;
}

function CanvasZoneInner({
  zone,
  data,
  designVars,
  isEditing,
  dragState,
  onFieldChange,
  onSnippetMoveUp,
  onSnippetMoveDown,
  onSnippetDelete,
  onSnippetReplace,
  onSnippetAddBelow,
  onAddSection,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  highlightedField,
  fixAnnotations,
  onAnnotationClick,
  className = '',
}: CanvasZoneProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIndex(index);
      onDragOver(e, zone.id, index);
    },
    [zone.id, onDragOver],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      onDrop(e, zone.id, index);
    },
    [zone.id, onDrop],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  return (
    <div className={`canvas-zone flex flex-col gap-0 ${className}`} data-zone-id={zone.id}>
      {zone.snippets.map((snippet, i) => (
        <React.Fragment key={snippet.instanceId}>
          {/* Drop indicator above */}
          {dragState.isDragging && (
            <div
              className={`h-1 rounded transition-all ${
                dragOverIndex === i ? 'bg-[var(--cv-accent)] scale-y-150' : 'bg-transparent'
              }`}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragLeave={handleDragLeave}
            />
          )}
          <CanvasSnippet
            snippet={snippet}
            index={i}
            total={zone.snippets.length}
            zoneId={zone.id}
            data={data}
            designVars={designVars}
            isEditing={isEditing}
            onFieldChange={onFieldChange}
            onMoveUp={() => onSnippetMoveUp(zone.id, i)}
            onMoveDown={() => onSnippetMoveDown(zone.id, i)}
            onDelete={() => onSnippetDelete(zone.id, i)}
            onReplace={() => onSnippetReplace(zone.id, i)}
            onAddBelow={() => onSnippetAddBelow(zone.id, i)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            highlightedField={highlightedField}
            fixAnnotations={fixAnnotations}
            onAnnotationClick={onAnnotationClick}
          />
        </React.Fragment>
      ))}

      {/* Final drop target */}
      {dragState.isDragging && (
        <div
          className={`h-1 rounded transition-all ${
            dragOverIndex === zone.snippets.length ? 'bg-[var(--cv-accent)] scale-y-150' : 'bg-transparent'
          }`}
          onDragOver={(e) => handleDragOver(e, zone.snippets.length)}
          onDrop={(e) => handleDrop(e, zone.snippets.length)}
          onDragLeave={handleDragLeave}
        />
      )}

      {/* Add Section button */}
      {isEditing && (
        <button
          className="mt-2 flex items-center justify-center gap-1 py-1.5 text-[10px] text-gray-400 hover:text-[var(--cv-accent)] hover:bg-[var(--cv-accent)]/5 rounded border border-dashed border-gray-300 dark:border-gray-600 hover:border-[var(--cv-accent)] transition-colors"
          onClick={() => onAddSection(zone.id)}
        >
          <Plus size={12} />
          Add Section
        </button>
      )}
    </div>
  );
}

const CanvasZone = memo(CanvasZoneInner);
export default CanvasZone;
