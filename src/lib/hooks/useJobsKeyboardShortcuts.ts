'use client';

import { useEffect, useCallback, useRef } from 'react';

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
  const handlersRef = useRef({
    onToggleView,
    onAddJob,
    onToggleFilters,
    onFocusSearch,
    onCloseModal,
    onSelectAll
  });

  useEffect(() => {
    handlersRef.current = {
      onToggleView,
      onAddJob,
      onToggleFilters,
      onFocusSearch,
      onCloseModal,
      onSelectAll
    };
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const { onToggleView, onAddJob, onToggleFilters, onFocusSearch, onCloseModal, onSelectAll } = handlersRef.current;

      if (e.key === 'k' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onToggleView?.();
        return;
      }

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onAddJob?.();
        return;
      }

      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onToggleFilters?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseModal?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        onSelectAll?.();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
};

