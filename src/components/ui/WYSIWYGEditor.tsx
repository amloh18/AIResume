'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWYSIWYG } from './useWYSIWYG';
import { WYSIWYGToolbar } from './WYSIWYGToolbar';
import { GrammarCorrectionCard } from './GrammarCorrectionCard';
import { highlightGrammarIssues } from '@/lib/grammar/dom';
import { GrammarIssue } from '@/lib/grammar/engine';

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
  hasAnnotation?: boolean;
  reviewMode?: boolean;
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
    handleRedo,
    applyFormatting
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
        onStrikethrough={() => applyFormatting('strikeThrough')}
        onHeading={(level) => {
          const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
          if (editor) {
            editor.focus();
            requestAnimationFrame(() => {
              document.execCommand('formatBlock', false, `h${level}`);
            });
          }
        }}
        onAlign={(alignment) => {
          const cmd = alignment === 'left' ? 'justifyLeft' : alignment === 'center' ? 'justifyCenter' : alignment === 'right' ? 'justifyRight' : 'justifyFull';
          applyFormatting(cmd);
        }}
        onOrderedList={() => applyFormatting('insertOrderedList')}
        onBlockquote={() => {
          const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
          if (editor) {
            editor.focus();
            requestAnimationFrame(() => {
              document.execCommand('formatBlock', false, 'blockquote');
            });
          }
        }}
        onHorizontalRule={() => applyFormatting('insertHorizontalRule')}
        onFontSize={(size) => {
          const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
          if (editor) {
            editor.focus();
            requestAnimationFrame(() => {
              document.execCommand('fontSize', false, size);
            });
          }
        }}
        onTextColor={(color) => {
          const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
          if (editor) {
            editor.focus();
            requestAnimationFrame(() => {
              document.execCommand('foreColor', false, color);
            });
          }
        }}
        onLink={() => {
          const url = prompt('Enter URL:');
          if (url) {
            applyFormatting('createLink');
            // execCommand createLink needs special handling
            const editor = document.querySelector('[contenteditable="true"]:focus') as HTMLElement;
            if (editor) {
              editor.focus();
              requestAnimationFrame(() => {
                document.execCommand('createLink', false, url);
              });
            }
          }
        }}
        onUnlink={() => applyFormatting('unlink')}
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
  showToolbar = false,
  hasAnnotation = false,
  reviewMode = false
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

  const [activeIssue, setActiveIssue] = useState<GrammarIssue | null>(null);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  // Apply grammar highlights when reviewMode is true
  useEffect(() => {
    if (reviewMode && editorRef.current) {
      highlightGrammarIssues(editorRef.current); // The function fetches issues and applies them
      // We don't trigger handleContentChange here to avoid saving spans
    } else if (!reviewMode && editorRef.current) {
      // Remove highlights if annotation is toggled off
      const existingSpans = editorRef.current.querySelectorAll('span.grammar-highlight');
      existingSpans.forEach(span => {
        const fragment = document.createDocumentFragment();
        while (span.firstChild) {
          fragment.appendChild(span.firstChild);
        }
        span.parentNode?.replaceChild(fragment, span);
      });
      editorRef.current.normalize();
    }
  }, [reviewMode, value]); // run on value change as well so re-scans work if reviewMode is on

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('grammar-highlight') && target.dataset.issueData) {
      e.preventDefault();
      e.stopPropagation();
      const issueData = JSON.parse(target.dataset.issueData) as GrammarIssue;
      
      const wrapperRect = editorWrapperRef.current?.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      
      if (wrapperRect) {
        setCardPos({
          top: targetRect.bottom - wrapperRect.top + 5,
          left: Math.min(targetRect.left - wrapperRect.left, wrapperRect.width - 300) // keep within view
        });
        setActiveIssue(issueData);
      }
    } else {
      setActiveIssue(null);
    }
  };

  const handleApplySuggestion = (issue: GrammarIssue) => {
    if (!editorRef.current) return;
    
    // Find the span for this issue
    const spans = editorRef.current.querySelectorAll(`span.grammar-highlight[data-issue-id="${issue.id}"]`);
    if (spans.length > 0) {
      // Replace all spans belonging to this issue with the suggestion
      // We take the first span, insert a text node, and remove all spans
      const textNode = document.createTextNode(issue.suggestion || '');
      spans[0].parentNode?.insertBefore(textNode, spans[0]);
      
      spans.forEach(span => span.remove());
      
      handleContentChange();
    }
    
    setActiveIssue(null);
  };

  // Ensure value is set when component mounts or value changes
  // This is a backup to the hook's sync logic - handles cases where hook sync might miss
  React.useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    const frameId = requestAnimationFrame(() => {
      if (editorRef.current) {
        const currentContent = editorRef.current.innerHTML.trim();
        const stringValue = value ? String(value) : '';
        
        // Strip grammar spans from current content
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
        
        // Convert prop value to HTML for comparison
        const htmlValue = stringValue && stringValue.trim() 
          ? (/<[^>]+>/.test(stringValue) 
            ? stringValue 
            : stringValue.split(/\n\n+/).map(para => {
                const lines = para.split(/\n/).filter(l => l.trim());
                return lines.map(line => `<p>${line.trim()}</p>`).join('');
                }).join('') || stringValue.replace(/\n/g, '<br>'))
          : '';
        
        // Normalize both for comparison (remove extra whitespace)
        const normalizedCurrent = strippedCurrentContent.replace(/\s+/g, ' ').trim();
        const normalizedValue = htmlValue.replace(/\s+/g, ' ').trim();
        
        // Update if editor is empty but we have a value, OR if values don't match
        const isEmpty = !currentContent || currentContent === '<br>' || currentContent === '' || currentContent === '<p></p>';
        const valuesDontMatch = normalizedCurrent !== normalizedValue && htmlValue;
        
        if ((isEmpty && htmlValue) || valuesDontMatch) {
          editorRef.current.innerHTML = htmlValue || '';
        }
      }
    });
    
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  const minHeight = `${rows * 1.5}rem`;

  return (
    <div className={`relative ${className}`} ref={editorWrapperRef}>
      <div
        className={`relative border border-white/20 rounded-none transition-all ${
          hasAnnotation 
            ? 'bg-red-500/20 border-red-500/40' 
            : isFocused 
              ? 'border-[#80FF00] bg-white/15' 
              : 'bg-white/10'
        }`}
      >
        {/* Toolbar - Now conditionally opacity */}
        {showToolbar && (
          <div 
            className={`transition-all duration-300 overflow-hidden ${isFocused ? 'opacity-100 max-h-[100px] mb-2' : 'opacity-0 max-h-0 pointer-events-none'}`}
            onMouseDown={(e) => e.preventDefault()}
          >
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
              onStrikethrough={() => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  requestAnimationFrame(() => {
                    document.execCommand('strikeThrough', false);
                  });
                }
              }}
              onHeading={(level) => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  requestAnimationFrame(() => {
                    document.execCommand('formatBlock', false, `h${level}`);
                  });
                }
              }}
              onAlign={(alignment) => {
                const cmd = alignment === 'left' ? 'justifyLeft' : alignment === 'center' ? 'justifyCenter' : alignment === 'right' ? 'justifyRight' : 'justifyFull';
                if (editorRef.current) {
                  editorRef.current.focus();
                  requestAnimationFrame(() => {
                    document.execCommand(cmd, false);
                  });
                }
              }}
              onOrderedList={() => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  requestAnimationFrame(() => {
                    document.execCommand('insertOrderedList', false);
                  });
                }
              }}
              onBlockquote={() => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  requestAnimationFrame(() => {
                    document.execCommand('formatBlock', false, 'blockquote');
                  });
                }
              }}
              onHorizontalRule={() => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  requestAnimationFrame(() => {
                    document.execCommand('insertHorizontalRule', false);
                  });
                }
              }}
              onFontSize={(size) => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  requestAnimationFrame(() => {
                    document.execCommand('fontSize', false, size);
                  });
                }
              }}
              onTextColor={(color) => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  requestAnimationFrame(() => {
                    document.execCommand('foreColor', false, color);
                  });
                }
              }}
              onLink={() => {
                const url = prompt('Enter URL:');
                if (url) {
                  if (editorRef.current) {
                    editorRef.current.focus();
                    requestAnimationFrame(() => {
                      document.execCommand('createLink', false, url);
                    });
                  }
                }
              }}
              onUnlink={() => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  requestAnimationFrame(() => {
                    document.execCommand('unlink', false);
                  });
                }
              }}
              showAIButton={showAIButton}
              fieldType={fieldType}
              onAIGenerate={onAIGenerate}
              isGenerating={isGenerating}
              currentValue={value}
            />
          </div>
        )}

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
          onClick={handleEditorClick}
          onKeyUp={updateFormatState}
          onPaste={(e: React.ClipboardEvent<HTMLDivElement>) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            if (editorRef.current) {
              document.execCommand('insertText', false, text);
              handleContentChange();
            }
          }}
          className={`w-full px-4 py-3 text-white focus:outline-none custom-scrollbar editor-content ${className} resize-none overflow-y-auto`}
          style={{ minHeight: rows ? `${Math.max(rows * 1.5, 6)}rem` : '150px', maxHeight: `${rows * 2}rem` }}
          data-placeholder={placeholder}
          spellCheck="false"
          suppressContentEditableWarning
        />

        {/* Grammar Correction Card */}
        {activeIssue && (
          <GrammarCorrectionCard
            issue={activeIssue}
            onApply={handleApplySuggestion}
            onDismiss={() => setActiveIssue(null)}
            position={cardPos}
          />
        )}

        {/* Placeholder */}
        {(!value || value === '<br>' || value === '' || value === '<p></p>' || value === '<p><br></p>' || value === '<div><br></div>') && (
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
          color: white !important;
        }
        [contenteditable]:focus {
          outline: none;
        }
        [contenteditable] * {
          color: white !important;
        }
        [contenteditable] ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        [contenteditable] li {
          margin: 0.25rem 0;
          color: white !important;
        }
        /* Ensure bold shows actual bold text, not markdown */
        [contenteditable] strong,
        [contenteditable] b {
          font-weight: bold !important;
          color: white !important;
        }
        /* Ensure italic shows actual italic text, not markdown */
        [contenteditable] em,
        [contenteditable] i {
          font-style: italic !important;
          color: white !important;
        }
        /* Ensure underline shows actual underline */
        [contenteditable] u {
          text-decoration: underline !important;
          color: white !important;
        }
        /* Ensure formatting is visible and not stripped */
        [contenteditable] p {
          margin: 0.5rem 0;
          color: white !important;
        }
        /* Ensure all text content is visible */
        [contenteditable] {
          -webkit-text-fill-color: white !important;
          text-fill-color: white !important;
        }
      `}</style>
    </div>
  );
};

export default WYSIWYGEditor;
export { WYSIWYGToolbar };
