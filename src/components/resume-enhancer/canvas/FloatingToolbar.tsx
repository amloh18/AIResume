'use client';

/**
 * FloatingToolbar -- rich-text formatting toolbar that appears when text is
 * selected inside the canvas editor.
 *
 * Supports Bold, Italic, Underline, Lists, and Alignment via
 * document.execCommand (still widely supported in contentEditable context).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
} from 'lucide-react';

interface FloatingToolbarProps {
  /** When true the toolbar is visible */
  visible: boolean;
  /** Viewport-relative position */
  position: { top: number; left: number };
  /** Called when the AI Suggest button is clicked */
  onAISuggest?: () => void;
}

function execCmd(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export default function FloatingToolbar({ visible, position, onAISuggest }: FloatingToolbarProps) {
  if (!visible) return null;

  const btnClass =
    'p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors';
  const iconSize = 14;

  return (
    <div
      className="fixed z-[9999] flex items-center gap-0.5 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 px-1 py-0.5 select-none"
      style={{ top: position.top - 44, left: position.left }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      <button className={btnClass} onClick={() => execCmd('bold')} title="Bold">
        <Bold size={iconSize} />
      </button>
      <button className={btnClass} onClick={() => execCmd('italic')} title="Italic">
        <Italic size={iconSize} />
      </button>
      <button className={btnClass} onClick={() => execCmd('underline')} title="Underline">
        <Underline size={iconSize} />
      </button>

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />

      <button className={btnClass} onClick={() => execCmd('insertUnorderedList')} title="Bullet List">
        <List size={iconSize} />
      </button>
      <button className={btnClass} onClick={() => execCmd('insertOrderedList')} title="Numbered List">
        <ListOrdered size={iconSize} />
      </button>

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />

      <button className={btnClass} onClick={() => execCmd('justifyLeft')} title="Align Left">
        <AlignLeft size={iconSize} />
      </button>
      <button className={btnClass} onClick={() => execCmd('justifyCenter')} title="Align Center">
        <AlignCenter size={iconSize} />
      </button>
      <button className={btnClass} onClick={() => execCmd('justifyRight')} title="Align Right">
        <AlignRight size={iconSize} />
      </button>

      {onAISuggest && (
        <>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />
          <button
            className={`${btnClass} text-[var(--cv-accent)]`}
            onClick={onAISuggest}
            title="AI Suggest"
          >
            <Sparkles size={iconSize} />
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook: useFloatingToolbar
// ---------------------------------------------------------------------------

export function useFloatingToolbar() {
  const [toolbarState, setToolbarState] = useState<{
    visible: boolean;
    position: { top: number; left: number };
  }>({ visible: false, position: { top: 0, left: 0 } });

  const checkSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setToolbarState((s) => (s.visible ? { ...s, visible: false } : s));
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) {
      setToolbarState((s) => (s.visible ? { ...s, visible: false } : s));
      return;
    }

    setToolbarState({
      visible: true,
      position: {
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2 - 120,
      },
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', checkSelection);
    return () => document.removeEventListener('selectionchange', checkSelection);
  }, [checkSelection]);

  return toolbarState;
}
