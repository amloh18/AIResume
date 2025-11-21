'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  onToggleView?: () => void;
  onAddJob?: () => void;
  onToggleFilters?: () => void;
  onFocusSearch?: () => void;
  onCloseModal?: () => void;
  onSelectAll?: () => void;
  enabled?: boolean;
}

export const useJobsKeyboardShortcuts = ({
  onToggleView,
  onAddJob,
  onToggleFilters,
  onFocusSearch,
  onCloseModal,
  onSelectAll,
  enabled = true
}: KeyboardShortcuts) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // K - Toggle Kanban/List
      if (e.key === 'k' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onToggleView?.();
        return;
      }

      // N - Add new job
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onAddJob?.();
        return;
      }

      // F - Open filters
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onToggleFilters?.();
        return;
      }

      // Cmd/Ctrl + K - Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }

      // Escape - Close modals/filters
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseModal?.();
        return;
      }

      // Cmd/Ctrl + A - Select all visible jobs
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        onSelectAll?.();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onToggleView, onAddJob, onToggleFilters, onFocusSearch, onCloseModal, onSelectAll]);
};

