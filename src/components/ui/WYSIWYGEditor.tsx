'use client';

import React from 'react';
import { useWYSIWYG } from './useWYSIWYG';
import { WYSIWYGToolbar } from './WYSIWYGToolbar';

interface WYSIWYGEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  showAIButton?: boolean;
  onAIGenerate?: () => void;
  isGenerating?: boolean;
  fieldType?: 'summary' | 'experience' | 'other';
  showToolbar?: boolean;
}

// Hook to get toolbar props for external rendering
export function useWYSIWYGToolbarProps(value: string, onChange: (value: string) => void, showAIButton?: boolean, fieldType?: 'summary' | 'experience' | 'other', onAIGenerate?: () => void, isGenerating?: boolean) {
  const {
    formatState,
    undoStack,
    redoStack,
    handleBold,
    handleItalic,
    handleUnderline,
    handleBulletList,
    handleUndo,
    handleRedo
  } = useWYSIWYG(value, onChange);

  return {
    toolbar: (
      <WYSIWYGToolbar
        formatState={formatState}
        undoStack={undoStack}
        redoStack={redoStack}
        onBold={handleBold}
        onItalic={handleItalic}
        onUnderline={handleUnderline}
        onBulletList={handleBulletList}
        onUndo={handleUndo}
        onRedo={handleRedo}
        showAIButton={showAIButton}
        fieldType={fieldType}
        onAIGenerate={onAIGenerate}
        isGenerating={isGenerating}
      />
    )
  };
}

const WYSIWYGEditor: React.FC<WYSIWYGEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  rows = 4,
  className = '',
  showAIButton = false,
  onAIGenerate,
  isGenerating = false,
  fieldType = 'other',
  showToolbar = false
}) => {
  // Use the WYSIWYG hook directly - hooks must be called unconditionally
  const {
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
  } = useWYSIWYG(value, onChange);

  // Ensure value is set when component mounts or value changes
  // This is a backup to the hook's sync logic
  React.useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    const frameId = requestAnimationFrame(() => {
      if (editorRef.current) {
        const currentContent = editorRef.current.innerHTML.trim();
        const stringValue = value ? String(value) : '';
        
        // If we have a value but the editor is empty or doesn't match, set it
        if (stringValue && stringValue.trim() && (!currentContent || currentContent === '<br>' || currentContent === '' || currentContent === '<p></p>')) {
          // Convert plain text to HTML if needed
          const htmlValue = /<[^>]+>/.test(stringValue) 
            ? stringValue 
            : stringValue.split(/\n\n+/).map(para => {
                const lines = para.split(/\n/).filter(l => l.trim());
                return lines.map(line => `<p>${line.trim()}</p>`).join('');
              }).join('') || stringValue.replace(/\n/g, '<br>');
          editorRef.current.innerHTML = htmlValue || '';
        }
      }
    });
    
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  const minHeight = `${rows * 1.5}rem`;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative border border-white/20 rounded-lg bg-white/10 transition-all ${
          isFocused ? 'border-[#80FF00] bg-white/15' : ''
        }`}
      >

        {/* Editable Content Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onFocus={() => {
            setIsFocused(true);
            updateFormatState();
          }}
          onBlur={() => setIsFocused(false)}
          onMouseUp={updateFormatState}
          onKeyUp={updateFormatState}
          onPaste={(e: React.ClipboardEvent<HTMLDivElement>) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            if (editorRef.current) {
              document.execCommand('insertText', false, text);
              handleContentChange();
            }
          }}
          className="w-full px-4 py-3 text-white placeholder-white/50 focus:outline-none resize-none overflow-y-auto"
          style={{ minHeight, maxHeight: `${rows * 2}rem` }}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />

        {/* Placeholder */}
        {(!value || value === '<br>' || value === '') && (
          <div 
            className="absolute top-3 left-4 text-white/50 pointer-events-none"
            style={{ top: '0.75rem', left: '1rem' }}
          >
            {placeholder}
          </div>
        )}
      </div>

      {/* Styles for contenteditable */}
      <style jsx>{`
        [contenteditable] {
          outline: none;
        }
        [contenteditable]:focus {
          outline: none;
        }
        [contenteditable] ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        [contenteditable] li {
          margin: 0.25rem 0;
        }
        /* Ensure bold shows actual bold text, not markdown */
        [contenteditable] strong,
        [contenteditable] b {
          font-weight: bold !important;
        }
        /* Ensure italic shows actual italic text, not markdown */
        [contenteditable] em,
        [contenteditable] i {
          font-style: italic !important;
        }
        /* Ensure underline shows actual underline */
        [contenteditable] u {
          text-decoration: underline !important;
        }
        /* Ensure formatting is visible and not stripped */
        [contenteditable] p {
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
};

export default WYSIWYGEditor;
export { WYSIWYGToolbar };
