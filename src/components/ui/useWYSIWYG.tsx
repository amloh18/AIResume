'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export function useWYSIWYG(value: string, onChange: (value: string) => void) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false });
  const isInternalUpdateRef = useRef(false);

  // Sync external value changes to editor
  useEffect(() => {
    if (editorRef.current && !isInternalUpdateRef.current) {
      const currentContent = editorRef.current.innerHTML.trim();
      const newValue = value || '';
      
      if (currentContent !== newValue && newValue !== '<br>') {
        editorRef.current.innerHTML = newValue || '';
      }
    }
    isInternalUpdateRef.current = false;
  }, [value]);

  // Update format state when selection changes
  const updateFormatState = useCallback(() => {
    if (!editorRef.current || !isFocused) return;
    
    try {
      setFormatState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline')
      });
    } catch (e) {
      // Ignore errors
    }
  }, [isFocused]);

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return;
    
    const content = editorRef.current.innerHTML;
    if (content !== value) {
      isInternalUpdateRef.current = true;
      setUndoStack(prev => {
        const newStack = [...prev, value];
        return newStack.slice(-20);
      });
      setRedoStack([]);
      onChange(content);
    }
    updateFormatState();
  }, [value, onChange, updateFormatState]);

  // Formatting functions
  const applyFormatting = useCallback((command: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    document.execCommand(command, false);
    
    setTimeout(() => {
      updateFormatState();
      handleContentChange();
    }, 10);
  }, [updateFormatState, handleContentChange]);

  const handleBold = useCallback(() => applyFormatting('bold'), [applyFormatting]);
  const handleItalic = useCallback(() => applyFormatting('italic'), [applyFormatting]);
  const handleUnderline = useCallback(() => applyFormatting('underline'), [applyFormatting]);
  const handleBulletList = useCallback(() => applyFormatting('insertUnorderedList'), [applyFormatting]);

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0 && editorRef.current) {
      const previousValue = undoStack[undoStack.length - 1];
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [value, ...prev]);
      isInternalUpdateRef.current = true;
      editorRef.current.innerHTML = previousValue || '';
      onChange(previousValue || '');
    }
  }, [undoStack, value, onChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0 && editorRef.current) {
      const nextValue = redoStack[0];
      setRedoStack(prev => prev.slice(1));
      setUndoStack(prev => [...prev, value]);
      isInternalUpdateRef.current = true;
      editorRef.current.innerHTML = nextValue || '';
      onChange(nextValue || '');
    }
  }, [redoStack, value, onChange]);

  return {
    editorRef,
    isFocused,
    setIsFocused,
    formatState,
    updateFormatState,
    handleContentChange,
    handleBold,
    handleItalic,
    handleUnderline,
    handleBulletList,
    handleUndo,
    handleRedo,
    undoStack,
    redoStack
  };
}

