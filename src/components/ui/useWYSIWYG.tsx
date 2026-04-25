'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export function useWYSIWYG(value: string, onChange: (value: string) => void) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false });
  const isInternalUpdateRef = useRef(false);
  const lastSyncedValueRef = useRef<string>('');
  const hasInitializedRef = useRef(false);

  // Helper function to convert plain text to HTML
  const convertPlainTextToHTML = (text: string): string => {
    if (!text || !text.trim()) return '';
    
    // If it already has HTML tags, return as is
    if (/<[^>]+>/.test(text)) {
      return text;
    }
    
    // Convert plain text to HTML paragraphs, preserving line breaks
    const paragraphs = text
      .split(/\n\n+/) // Split by double newlines for paragraphs
      .map(para => para.trim())
      .filter(para => para);
    
    if (paragraphs.length > 0) {
      return paragraphs
        .map(para => {
          // Split by single newlines for line breaks within paragraphs
          const lines = para.split(/\n/).filter(line => line.trim());
          return lines.map(line => `<p>${line.trim()}</p>`).join('');
        })
        .join('');
    }
    
    // If no paragraphs, just convert newlines to <br>
    return text.replace(/\n/g, '<br>');
  };

  // Sync external value changes to editor (including initialization)
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    const frameId = requestAnimationFrame(() => {
    if (editorRef.current && !isInternalUpdateRef.current) {
      const currentContent = editorRef.current.innerHTML.trim();
      let newValue = value || '';
        
        // Debug logging
        console.log('🔍 useWYSIWYG - Sync effect triggered');
        console.log('🔍 useWYSIWYG - newValue:', newValue);
        console.log('🔍 useWYSIWYG - currentContent:', currentContent);
        console.log('🔍 useWYSIWYG - lastSyncedValueRef:', lastSyncedValueRef.current);
        console.log('🔍 useWYSIWYG - hasInitializedRef:', hasInitializedRef.current);
      
      // Ensure newValue is a string
      if (typeof newValue !== 'string') {
        newValue = String(newValue);
      }
      
        // Convert prop value to normalized HTML for consistent comparison
        const normalizedPropHTML = convertPlainTextToHTML(newValue);
        const normalizedPropValue = (!normalizedPropHTML || normalizedPropHTML === '<br>' || normalizedPropHTML.trim() === '' || normalizedPropHTML === '<p></p>') ? '' : normalizedPropHTML.trim();
        
        console.log('🔍 useWYSIWYG - normalizedPropHTML:', normalizedPropHTML);
        console.log('🔍 useWYSIWYG - normalizedPropValue:', normalizedPropValue);
        
        // Convert lastSyncedValueRef to normalized HTML for comparison
        // This ensures we're always comparing HTML to HTML, not plain text to HTML
        const normalizedLastSynced = lastSyncedValueRef.current 
          ? convertPlainTextToHTML(lastSyncedValueRef.current).trim() 
          : '';
        
        console.log('🔍 useWYSIWYG - normalizedLastSynced:', normalizedLastSynced);
        
        // Check if we need to update by comparing normalized HTML values
        const needsUpdate = normalizedLastSynced !== normalizedPropValue;
      
      // Also update if editor is empty but we have a value
      const isEmptyButHasValue = (!currentContent || currentContent === '<br>' || currentContent === '' || currentContent === '<p></p>') && newValue && newValue.trim();
      
      // Force update on first initialization if we have a value
      // Also reset initialization if we went from empty to having a value
      const wasEmpty = !lastSyncedValueRef.current || !lastSyncedValueRef.current.trim();
      const nowHasValue = newValue && newValue.trim();
      const isFirstInit = !hasInitializedRef.current && nowHasValue;
      const valueJustAppeared = wasEmpty && nowHasValue;
      
      console.log('🔍 useWYSIWYG - needsUpdate:', needsUpdate);
      console.log('🔍 useWYSIWYG - isEmptyButHasValue:', isEmptyButHasValue);
      console.log('🔍 useWYSIWYG - isFirstInit:', isFirstInit);
      console.log('🔍 useWYSIWYG - valueJustAppeared:', valueJustAppeared);
      
      if (needsUpdate || isEmptyButHasValue || isFirstInit || valueJustAppeared) {
        // Normalize current content for comparison (remove extra whitespace and spans)
        const strippedCurrentContent = currentContent 
          ? (() => {
              const temp = document.createElement('div');
              temp.innerHTML = currentContent;
              const spans = temp.querySelectorAll('span.grammar-highlight');
              spans.forEach(span => {
                const fragment = document.createDocumentFragment();
                while (span.firstChild) {
                  fragment.appendChild(span.firstChild);
                }
                span.parentNode?.replaceChild(fragment, span);
              });
              return temp.innerHTML;
            })()
          : '';
        const normalizedCurrentContent = strippedCurrentContent.replace(/\s+/g, ' ').trim();
        const normalizedPropForCompare = normalizedPropValue.replace(/\s+/g, ' ').trim();
        
        console.log('🔍 useWYSIWYG - normalizedCurrentContent:', normalizedCurrentContent);
        console.log('🔍 useWYSIWYG - normalizedPropForCompare:', normalizedPropForCompare);
        
        // Always update if normalized values don't match (handles whitespace differences)
        // Or if this is the first initialization or value just appeared
        if (isFirstInit || valueJustAppeared || normalizedCurrentContent !== normalizedPropForCompare) {
          console.log('✅ useWYSIWYG - UPDATING editor innerHTML with:', normalizedPropValue);
          editorRef.current.innerHTML = normalizedPropValue || '';
          // Store the original prop value for future comparisons
          lastSyncedValueRef.current = newValue;
          hasInitializedRef.current = true;
          console.log('✅ useWYSIWYG - Updated editor, new innerHTML:', editorRef.current.innerHTML);
          console.log('✅ useWYSIWYG - Editor textContent:', editorRef.current.textContent);
          console.log('✅ useWYSIWYG - Editor innerText:', editorRef.current.innerText);
          console.log('✅ useWYSIWYG - Editor computed style color:', window.getComputedStyle(editorRef.current).color);
        } else if (needsUpdate) {
          // Content matches but ref doesn't - update ref to prevent false positives
          console.log('🔍 useWYSIWYG - Content matches, updating ref only');
          lastSyncedValueRef.current = newValue;
        }
      } else {
        console.log('⏭️ useWYSIWYG - Skipping update (no changes needed)');
      }
    } else if (!editorRef.current) {
      console.warn('⚠️ useWYSIWYG - editorRef.current is null, cannot sync');
    } else if (isInternalUpdateRef.current) {
      console.log('⏭️ useWYSIWYG - Skipping (internal update in progress)');
    }
    isInternalUpdateRef.current = false;
    });
    
    return () => cancelAnimationFrame(frameId);
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

  // Helper to strip grammar spans before saving
  const stripGrammarSpans = (html: string): string => {
    if (!html) return '';
    // Create a temporary div to parse and manipulate the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Find all grammar highlight spans
    const spans = temp.querySelectorAll('span.grammar-highlight');
    spans.forEach(span => {
      // Replace the span with its contents
      const fragment = document.createDocumentFragment();
      while (span.firstChild) {
        fragment.appendChild(span.firstChild);
      }
      span.parentNode?.replaceChild(fragment, span);
    });
    
    return temp.innerHTML;
  };

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return;
    
    const content = editorRef.current.innerHTML;
    const cleanContent = stripGrammarSpans(content);
    
    // Normalize the content for comparison
    const normalizedContent = cleanContent.trim();
    const normalizedLastSynced = lastSyncedValueRef.current 
      ? convertPlainTextToHTML(lastSyncedValueRef.current).trim() 
      : '';
    
    // Compare normalized HTML values to detect actual changes
    if (normalizedContent !== normalizedLastSynced && !isInternalUpdateRef.current) {
      isInternalUpdateRef.current = true;
      setUndoStack(prev => {
        const newStack = [...prev, lastSyncedValueRef.current];
        return newStack.slice(-20);
      });
      setRedoStack([]);
      lastSyncedValueRef.current = cleanContent;
      onChange(cleanContent);
    }
    updateFormatState();
  }, [onChange, updateFormatState]);

  // Formatting functions
  const applyFormatting = useCallback((command: string) => {
    if (!editorRef.current) return;
    
    // Store the current selection before we lose focus
    const selection = window.getSelection();
    let savedRange: Range | null = null;
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // Only save range if it's within our editor
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRange = range.cloneRange();
      }
    }
    
    // Focus the editor first
    editorRef.current.focus();
    
    // Restore selection if we saved one
    if (savedRange && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } catch (e) {
        // If range is invalid, create new range at end
        const newRange = document.createRange();
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else if (!savedRange) {
      // No selection, create range at cursor or end
      const newRange = document.createRange();
      if (editorRef.current.childNodes.length > 0) {
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(false);
      } else {
        newRange.setStart(editorRef.current, 0);
        newRange.collapse(true);
      }
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
    // Small delay to ensure focus and selection are set
    requestAnimationFrame(() => {
      // Use document.execCommand for bold, italic, underline
      // This creates actual HTML tags (<strong>, <em>, <u>) not markdown
      const success = document.execCommand(command, false, null);
      
      if (!success) {
        console.warn(`execCommand ${command} failed`);
      }
      
      // Update state after formatting
      setTimeout(() => {
        updateFormatState();
        handleContentChange();
      }, 10);
    });
  }, [updateFormatState, handleContentChange]);

  // Custom bullet point handler that splits by periods
  const handleBulletPointToggle = useCallback(() => {
    if (!editorRef.current) return;
    
    // Focus the editor first
    editorRef.current.focus();
    
    // Use requestAnimationFrame to ensure focus is set
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection) {
        // Fallback to default behavior
        document.execCommand('insertUnorderedList', false, null);
        setTimeout(() => {
          updateFormatState();
          handleContentChange();
        }, 10);
        return;
      }
      
      // Get or create range
      let range: Range;
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at cursor position
        range = document.createRange();
        if (editorRef.current.childNodes.length > 0) {
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
        } else {
          range.setStart(editorRef.current, 0);
          range.collapse(true);
        }
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Ensure range is within our editor
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      const container = range.commonAncestorContainer;
      
      // Check if we're already in a bullet list (toggle off)
      const listItem = container.nodeType === Node.TEXT_NODE 
        ? container.parentElement?.closest('li')
        : (container as Element).closest('li');
      
      if (listItem && listItem.parentElement?.tagName === 'UL') {
        // Remove bullet points: convert list items back to paragraph with periods
        const list = listItem.parentElement;
        const allItems = Array.from(list.querySelectorAll('li'));
        const textContent = allItems.map(li => {
          const text = li.textContent?.trim() || '';
          return text;
        }).join('. ');
        
        // Create a paragraph with the joined text
        const p = document.createElement('p');
        p.textContent = textContent + (textContent ? '.' : '');
        p.style.margin = '0.5rem 0';
        
        // Replace the list with the paragraph
        if (list.parentNode) {
          list.parentNode.replaceChild(p, list);
          
          // Restore selection at the end of the paragraph
          const newRange = document.createRange();
          newRange.selectNodeContents(p);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else {
        // Add bullet points: split selected text by periods and create list
        // Get the selected content as HTML to preserve formatting
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(range.cloneContents());
        const selectedHTML = tempDiv.innerHTML;
        const selectedText = range.toString();
        
        if (!selectedText.trim()) {
          // No selection: use default behavior
          document.execCommand('insertUnorderedList', false, null);
          setTimeout(() => {
            updateFormatState();
            handleContentChange();
          }, 10);
          return;
        }
        
        // Split by periods and filter empty strings
        // Use a regex that matches periods followed by whitespace or end of string
        const sentences = selectedText.split(/\.\s*/).filter(s => s.trim());
        
        if (sentences.length === 0) {
          // No sentences found: use default behavior
          document.execCommand('insertUnorderedList', false, null);
          setTimeout(() => {
            updateFormatState();
            handleContentChange();
          }, 10);
          return;
        }
        
        // If we have HTML content, try to preserve it by splitting the HTML
        // Otherwise, use plain text
        const hasHTML = /<[^>]+>/g.test(selectedHTML);
        
        // Delete selected content
        range.deleteContents();
        
        // Create unordered list
        const ul = document.createElement('ul');
        ul.style.listStyleType = 'disc';
        ul.style.paddingLeft = '1.5rem';
        ul.style.margin = '0.5rem 0';
        
        if (hasHTML && selectedHTML) {
          // Try to split HTML content by periods while preserving formatting
          // This is a simplified approach - split the HTML by periods
          const htmlParts = selectedHTML.split(/\.\s*/);
          htmlParts.forEach((htmlPart, index) => {
            const trimmed = htmlPart.trim();
            if (trimmed) {
              const li = document.createElement('li');
              // Preserve HTML formatting
              li.innerHTML = trimmed + (index < htmlParts.length - 1 ? '.' : '');
              li.style.margin = '0.25rem 0';
              ul.appendChild(li);
            }
          });
        } else {
          // Plain text - split by periods
          sentences.forEach(sentence => {
            const trimmed = sentence.trim();
            if (trimmed) {
              const li = document.createElement('li');
              li.textContent = trimmed;
              li.style.margin = '0.25rem 0';
              ul.appendChild(li);
            }
          });
        }
        
        // Insert the list
        range.insertNode(ul);
        
        // Move cursor after the list
        const newRange = document.createRange();
        newRange.setStartAfter(ul);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      
      setTimeout(() => {
        updateFormatState();
        handleContentChange();
      }, 10);
    });
  }, [updateFormatState, handleContentChange]);

  const handleBold = useCallback(() => applyFormatting('bold'), [applyFormatting]);
  const handleItalic = useCallback(() => applyFormatting('italic'), [applyFormatting]);
  const handleUnderline = useCallback(() => applyFormatting('underline'), [applyFormatting]);
  const handleBulletList = useCallback(() => handleBulletPointToggle(), [handleBulletPointToggle]);

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
    redoStack,
    applyFormatting,
  };
}

