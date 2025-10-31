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
    const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('bold', false);
    }
  });
  const handleItalicClick = onItalic || (() => {
    const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('italic', false);
    }
  });
  const handleUnderlineClick = onUnderline || (() => {
    const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('underline', false);
    }
  });
  const handleBulletListClick = onBulletList || (() => {
    const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('insertUnorderedList', false);
    }
  });
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleBoldClick}
        className={`p-1 hover:opacity-70 transition-opacity ${
          currentFormatState.bold ? 'opacity-100' : 'opacity-60'
        }`}
        title="Bold"
      >
        <Bold size={16} className="text-white/80" />
      </button>
      
      <button
        type="button"
        onClick={handleItalicClick}
        className={`p-1 hover:opacity-70 transition-opacity ${
          currentFormatState.italic ? 'opacity-100' : 'opacity-60'
        }`}
        title="Italic"
      >
        <Italic size={16} className="text-white/80" />
      </button>
      
      <button
        type="button"
        onClick={handleUnderlineClick}
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
        onClick={handleBulletListClick}
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

      {showAIButton && (fieldType === 'summary' || fieldType === 'experience') && (
        <>
          <div className="w-px h-4 bg-white/20 mx-0.5" />
          <button
            type="button"
            onClick={onAIGenerate}
            disabled={isGenerating}
            className={`p-1 hover:opacity-70 transition-opacity opacity-60 ${
              isGenerating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={fieldType === 'experience' ? 'AI: Convert to STAR method bullet points' : 'AI: Fix and improve sentences'}
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

