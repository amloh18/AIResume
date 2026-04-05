'use client';

/**
 * ListEntry -- reusable wrapper for list items (experience entries,
 * education entries, etc.) with move up/down and delete controls.
 */

import React, { memo } from 'react';
import { ChevronUp, ChevronDown, Trash2, GripVertical } from 'lucide-react';

interface ListEntryProps {
  children: React.ReactNode;
  index: number;
  total: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  isEditing?: boolean;
}

function ListEntryInner({
  children,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  isEditing = true,
}: ListEntryProps) {
  return (
    <div className="group relative">
      {children}

      {/* Hover controls */}
      {isEditing && (
        <div className="absolute -left-6 top-0 flex-col gap-0.5 hidden group-hover:flex">
          <button
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
          >
            <ChevronUp size={12} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Move down"
          >
            <ChevronDown size={12} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

const ListEntry = memo(ListEntryInner);
export default ListEntry;
