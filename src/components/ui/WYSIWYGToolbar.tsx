'use client';

import React from 'react';
import { Bold, Italic, Underline, List, Undo2, Redo2, Sparkles } from 'lucide-react';

interface WYSIWYGToolbarProps {
  formatState?: { bold: boolean; italic: boolean; underline: boolean };
  undoStack?: string[];
  redoStack?: string[];
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onBulletList?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  showAIButton?: boolean;
  fieldType?: 'summary' | 'experience' | 'other';
  onAIGenerate?: () => void;
  onAISuggestions?: () => void;
  isGenerating?: boolean;
}

export const WYSIWYGToolbar: React.FC<WYSIWYGToolbarProps> = ({
  formatState = { bold: false, italic: false, underline: false },
  undoStack = [],
  redoStack = [],
  onBold,
  onItalic,
  onUnderline,
  onBulletList,
  onUndo,
  onRedo,
  showAIButton = false,
  fieldType = 'other',
  onAIGenerate,
  onAISuggestions,
  isGenerating = false
}) => {
  const [currentFormatState, setCurrentFormatState] = React.useState(formatState);
  
  // Update format state from document when selection changes
  React.useEffect(() => {
    const updateState = () => {
      try {
        const active = document.querySelector('[contenteditable="true"]:focus');
        if (active) {
          setCurrentFormatState({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline')
          });
        }
      } catch (e) {}
    };
    
    document.addEventListener('selectionchange', updateState);
    const interval = setInterval(updateState, 100); // Poll for changes
    
    return () => {
      document.removeEventListener('selectionchange', updateState);
      clearInterval(interval);
    };
  }, []);
  
  // If handlers not provided, use document.execCommand on focused element
  const handleBoldClick = onBold || (() => {
    // Try to find the focused editor, or any editor if none is focused
    let editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
    if (!editor) {
      // If no editor is focused, find the closest one (might be in same component)
      const allEditors = document.querySelectorAll('[contenteditable="true"]');
      editor = Array.from(allEditors).find(el => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          return el.contains(range.commonAncestorContainer);
        }
        return false;
      }) as HTMLElement || (allEditors[0] as HTMLElement);
    }
    
    if (editor) {
      // Preserve selection before focusing
      const selection = window.getSelection();
      let savedRange: Range | null = null;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          savedRange = range.cloneRange();
        }
      }
      
      editor.focus();
      
      // Restore selection
      if (savedRange && selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } else if (!savedRange && selection) {
        // No valid selection, create one at end
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Apply formatting
      requestAnimationFrame(() => {
        document.execCommand('bold', false, null);
      });
    }
  });
  const handleItalicClick = onItalic || (() => {
    // Try to find the focused editor, or any editor if none is focused
    let editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
    if (!editor) {
      const allEditors = document.querySelectorAll('[contenteditable="true"]');
      editor = Array.from(allEditors).find(el => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          return el.contains(range.commonAncestorContainer);
        }
        return false;
      }) as HTMLElement || (allEditors[0] as HTMLElement);
    }
    
    if (editor) {
      const selection = window.getSelection();
      let savedRange: Range | null = null;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          savedRange = range.cloneRange();
        }
      }
      
      editor.focus();
      
      if (savedRange && selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } else if (!savedRange && selection) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      requestAnimationFrame(() => {
        document.execCommand('italic', false, null);
      });
    }
  });
  const handleUnderlineClick = onUnderline || (() => {
    // Try to find the focused editor, or any editor if none is focused
    let editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
    if (!editor) {
      const allEditors = document.querySelectorAll('[contenteditable="true"]');
      editor = Array.from(allEditors).find(el => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          return el.contains(range.commonAncestorContainer);
        }
        return false;
      }) as HTMLElement || (allEditors[0] as HTMLElement);
    }
    
    if (editor) {
      const selection = window.getSelection();
      let savedRange: Range | null = null;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          savedRange = range.cloneRange();
        }
      }
      
      editor.focus();
      
      if (savedRange && selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } else if (!savedRange && selection) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      requestAnimationFrame(() => {
        document.execCommand('underline', false, null);
      });
    }
  });
  const handleBulletListClick = onBulletList || (() => {
    // Try to find the focused editor, or any editor if none is focused
    let editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
    if (!editor) {
      const allEditors = document.querySelectorAll('[contenteditable="true"]');
      editor = Array.from(allEditors).find(el => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          return el.contains(range.commonAncestorContainer);
        }
        return false;
      }) as HTMLElement || (allEditors[0] as HTMLElement);
    }
    
    if (editor) {
      // Preserve selection before focusing
      const selection = window.getSelection();
      let savedRange: Range | null = null;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          savedRange = range.cloneRange();
        }
      }
      
      editor.focus();
      
      // Restore selection
      if (savedRange && selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } else if (!savedRange && selection) {
        // No valid selection, create one at end
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Apply bullet list formatting
      requestAnimationFrame(() => {
        // Check if we're in a list already
        const currentSelection = window.getSelection();
        if (currentSelection && currentSelection.rangeCount > 0) {
          const range = currentSelection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const listItem = container.nodeType === Node.TEXT_NODE 
            ? container.parentElement?.closest('li')
            : (container as Element).closest('li');
          
          if (listItem && listItem.parentElement?.tagName === 'UL') {
            // Remove bullet list
            document.execCommand('insertUnorderedList', false, null);
          } else {
            // Add bullet list - check if we have selected text
            const selectedText = range.toString();
            if (selectedText.trim()) {
              // Has selection: split by periods and create list
              const sentences = selectedText.split(/\.\s*/).filter(s => s.trim());
              if (sentences.length > 0) {
                range.deleteContents();
                const ul = document.createElement('ul');
                ul.style.listStyleType = 'disc';
                ul.style.paddingLeft = '1.5rem';
                ul.style.margin = '0.5rem 0';
                sentences.forEach(sentence => {
                  const trimmed = sentence.trim();
                  if (trimmed) {
                    const li = document.createElement('li');
                    li.textContent = trimmed;
                    li.style.margin = '0.25rem 0';
                    ul.appendChild(li);
                  }
                });
                range.insertNode(ul);
                const newRange = document.createRange();
                newRange.setStartAfter(ul);
                newRange.collapse(true);
                currentSelection.removeAllRanges();
                currentSelection.addRange(newRange);
              } else {
                document.execCommand('insertUnorderedList', false, null);
              }
            } else {
              // No selection: use default behavior
              document.execCommand('insertUnorderedList', false, null);
            }
          }
        } else {
          document.execCommand('insertUnorderedList', false, null);
        }
      });
    }
  });
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleBoldClick();
        }}
        className={`p-1 hover:opacity-70 transition-opacity ${
          currentFormatState.bold ? 'opacity-100' : 'opacity-60'
        }`}
        title="Bold"
      >
        <Bold size={16} className="text-white/80" />
      </button>
      
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleItalicClick();
        }}
        className={`p-1 hover:opacity-70 transition-opacity ${
          currentFormatState.italic ? 'opacity-100' : 'opacity-60'
        }`}
        title="Italic"
      >
        <Italic size={16} className="text-white/80" />
      </button>
      
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleUnderlineClick();
        }}
        className={`p-1 hover:opacity-70 transition-opacity ${
          currentFormatState.underline ? 'opacity-100' : 'opacity-60'
        }`}
        title="Underline"
      >
        <Underline size={16} className="text-white/80" />
      </button>
      
      <div className="w-px h-4 bg-white/20 mx-0.5" />
      
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleBulletListClick();
        }}
        onMouseDown={(e) => {
          // Prevent losing focus when clicking the button
          e.preventDefault();
        }}
        className="p-1 hover:opacity-70 transition-opacity opacity-60"
        title="Bullet List"
      >
        <List size={16} className="text-white/80" />
      </button>
      
      <div className="w-px h-4 bg-white/20 mx-0.5" />
      
      <button
        type="button"
        onClick={onUndo || (() => {
          const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
          if (editor) {
            editor.focus();
            document.execCommand('undo', false);
          }
        })}
        disabled={undoStack ? undoStack.length === 0 : false}
        className="p-1 hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed opacity-60"
        title="Undo"
      >
        <Undo2 size={16} className="text-white/80" />
      </button>
      
      <button
        type="button"
        onClick={onRedo || (() => {
          const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
          if (editor) {
            editor.focus();
            document.execCommand('redo', false);
          }
        })}
        disabled={redoStack ? redoStack.length === 0 : false}
        className="p-1 hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed opacity-60"
        title="Redo"
      >
        <Redo2 size={16} className="text-white/80" />
      </button>

      {showAIButton && (
        <>
          <div className="w-px h-4 bg-white/20 mx-0.5" />
          <button
            type="button"
            onClick={onAISuggestions || onAIGenerate}
            disabled={isGenerating}
            className={`p-1 hover:opacity-70 transition-opacity opacity-60 ${
              isGenerating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="AI: Generate 4 writing method suggestions"
          >
            <Sparkles 
              size={16} 
              className={`text-white/80 ${isGenerating ? 'animate-pulse' : ''}`} 
            />
          </button>
        </>
      )}
    </div>
  );
};

