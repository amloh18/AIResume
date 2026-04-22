'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Quote, Minus,
  Type, Palette, Link2, Unlink, Sparkles, WandSparkles,
  ChevronDown, X
} from 'lucide-react';
import { fixFormattingToBullets } from '@/lib/utils/format-utils';

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
  onStrikethrough?: () => void;
  onHeading?: (level: 1 | 2 | 3) => void;
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  onOrderedList?: () => void;
  onBlockquote?: () => void;
  onHorizontalRule?: () => void;
  onFontSize?: (size: string) => void;
  onTextColor?: (color: string) => void;
  onLink?: () => void;
  onUnlink?: () => void;
  showAIButton?: boolean;
  fieldType?: 'summary' | 'experience' | 'other';
  onAIGenerate?: () => void;
  onAISuggestions?: () => void;
  isGenerating?: boolean;
  currentValue?: string;
}

const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];

const TEXT_COLORS = [
  { label: 'Default', value: '#000000' },
  { label: 'Gray', value: '#6B7280' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Yellow', value: '#EAB308' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Pink', value: '#EC4899' },
];

// Helper to execute execCommand with focus preservation
function execCommandOnEditor(command: string, value?: string) {
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
      document.execCommand(command, false, value || undefined);
    });
  }
}

// Font Size Dropdown
const FontSizeDropdown: React.FC<{
  onSelect: (size: string) => void;
}> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-0.5 p-1 hover:opacity-70 transition-opacity opacity-60"
        title="Font Size"
      >
        <Type size={16} className="text-[color:var(--text-secondary)]" />
        <ChevronDown size={10} className="text-[color:var(--text-secondary)]" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-xl z-50 py-1 min-w-[60px] max-h-[200px] overflow-y-auto">
          {FONT_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(size); setIsOpen(false); }}
              className="w-full px-3 py-1 text-left text-sm text-[color:var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              {size}px
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Text Color Picker
const TextColorPicker: React.FC<{
  onSelect: (color: string) => void;
}> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:opacity-70 transition-opacity opacity-60"
        title="Text Color"
      >
        <Palette size={16} className="text-[color:var(--text-secondary)]" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-xl z-50 p-2 min-w-[140px]">
          <div className="text-xs text-[color:var(--text-tertiary)] mb-2 font-medium">Text Color</div>
          <div className="grid grid-cols-3 gap-1">
            {TEXT_COLORS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onSelect(value); setIsOpen(false); }}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                title={label}
              >
                <div
                  className="w-5 h-5 rounded-full border border-[var(--border-primary)]"
                  style={{ backgroundColor: value }}
                />
                <span className="text-[9px] text-[color:var(--text-tertiary)]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
  onStrikethrough,
  onHeading,
  onAlign,
  onOrderedList,
  onBlockquote,
  onHorizontalRule,
  onFontSize,
  onTextColor,
  onLink,
  onUnlink,
  showAIButton = false,
  fieldType = 'other',
  onAIGenerate,
  onAISuggestions,
  isGenerating = false,
  currentValue = ''
}) => {
  const [currentFormatState, setCurrentFormatState] = React.useState(formatState);
  const isValueEmpty = !currentValue || currentValue === '<br>' || currentValue === '' || currentValue === '<p></p>' || currentValue === '<p><br></p>' || currentValue === '<div><br></div>';

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
      } catch (e) { }
    };

    document.addEventListener('selectionchange', updateState);
    const interval = setInterval(updateState, 100);

    return () => {
      document.removeEventListener('selectionchange', updateState);
      clearInterval(interval);
    };
  }, []);

  const handleBoldClick = onBold || (() => execCommandOnEditor('bold'));
  const handleItalicClick = onItalic || (() => execCommandOnEditor('italic'));
  const handleUnderlineClick = onUnderline || (() => execCommandOnEditor('underline'));
  const handleStrikethroughClick = onStrikethrough || (() => execCommandOnEditor('strikeThrough'));
  const handleAlignLeft = onAlign ? () => onAlign('left') : () => execCommandOnEditor('justifyLeft');
  const handleAlignCenter = onAlign ? () => onAlign('center') : () => execCommandOnEditor('justifyCenter');
  const handleAlignRight = onAlign ? () => onAlign('right') : () => execCommandOnEditor('justifyRight');
  const handleOrderedListClick = onOrderedList || (() => execCommandOnEditor('insertOrderedList'));
  const handleBlockquoteClick = onBlockquote || (() => execCommandOnEditor('formatBlock', 'blockquote'));
  const handleHorizontalRuleClick = onHorizontalRule || (() => execCommandOnEditor('insertHorizontalRule'));
  const handleFontSize = onFontSize || ((size: string) => execCommandOnEditor('fontSize', size));
  const handleTextColor = onTextColor || ((color: string) => execCommandOnEditor('foreColor', color));

  const handleHeadingClick = (level: 1 | 2 | 3) => {
    if (onHeading) {
      onHeading(level);
    } else {
      execCommandOnEditor('formatBlock', `h${level}`);
    }
  };

  const handleBulletListClick = onBulletList || (() => {
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
        const currentSelection = window.getSelection();
        if (currentSelection && currentSelection.rangeCount > 0) {
          const range = currentSelection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const listItem = container.nodeType === Node.TEXT_NODE
            ? container.parentElement?.closest('li')
            : (container as Element).closest('li');

          if (listItem && listItem.parentElement?.tagName === 'UL') {
            document.execCommand('insertUnorderedList', false, null);
          } else {
            const selectedText = range.toString();
            if (selectedText.trim()) {
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
              document.execCommand('insertUnorderedList', false, null);
            }
          }
        } else {
          document.execCommand('insertUnorderedList', false, null);
        }
      });
    }
  });

  const handleLinkClick = onLink || (() => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommandOnEditor('createLink', url);
    }
  });

  const handleUnlinkClick = onUnlink || (() => execCommandOnEditor('unlink'));

  return (
    <div 
      className="flex items-center gap-0.5 flex-wrap"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Undo / Redo */}
      <button
        type="button"
        onClick={onUndo || (() => execCommandOnEditor('undo'))}
        disabled={undoStack ? undoStack.length === 0 : false}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onClick={onRedo || (() => execCommandOnEditor('redo'))}
        disabled={redoStack ? redoStack.length === 0 : false}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 size={15} className="text-[color:var(--text-secondary)]" />
      </button>

      <div className="w-px h-5 bg-[var(--border-primary)] mx-1" />

      {/* Text Style: Bold, Italic, Underline, Strikethrough */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleBoldClick}
        className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors ${currentFormatState.bold ? 'bg-[var(--bg-tertiary)] opacity-100' : 'opacity-60'}`}
        title="Bold (Ctrl+B)"
      >
        <Bold size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleItalicClick}
        className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors ${currentFormatState.italic ? 'bg-[var(--bg-tertiary)] opacity-100' : 'opacity-60'}`}
        title="Italic (Ctrl+I)"
      >
        <Italic size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleUnderlineClick}
        className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors ${currentFormatState.underline ? 'bg-[var(--bg-tertiary)] opacity-100' : 'opacity-60'}`}
        title="Underline (Ctrl+U)"
      >
        <Underline size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleStrikethroughClick}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Strikethrough"
      >
        <Strikethrough size={15} className="text-[color:var(--text-secondary)]" />
      </button>

      <div className="w-px h-5 bg-[var(--border-primary)] mx-1" />

      {/* Headings */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleHeadingClick(1)}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Heading 1"
      >
        <Heading1 size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleHeadingClick(2)}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Heading 2"
      >
        <Heading2 size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleHeadingClick(3)}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Heading 3"
      >
        <Heading3 size={15} className="text-[color:var(--text-secondary)]" />
      </button>

      <div className="w-px h-5 bg-[var(--border-primary)] mx-1" />

      {/* Text Alignment */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleAlignLeft}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Align Left"
      >
        <AlignLeft size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleAlignCenter}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Align Center"
      >
        <AlignCenter size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleAlignRight}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Align Right"
      >
        <AlignRight size={15} className="text-[color:var(--text-secondary)]" />
      </button>

      <div className="w-px h-5 bg-[var(--border-primary)] mx-1" />

      {/* Lists */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleBulletListClick}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Bullet List"
      >
        <List size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleOrderedListClick}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Numbered List"
      >
        <ListOrdered size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleBlockquoteClick}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Blockquote"
      >
        <Quote size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleHorizontalRuleClick}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Horizontal Line"
      >
        <Minus size={15} className="text-[color:var(--text-secondary)]" />
      </button>

      <div className="w-px h-5 bg-[var(--border-primary)] mx-1" />

      {/* Font Size */}
      <FontSizeDropdown onSelect={handleFontSize} />

      {/* Text Color */}
      <TextColorPicker onSelect={handleTextColor} />

      {/* Link */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleLinkClick}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Insert Link"
      >
        <Link2 size={15} className="text-[color:var(--text-secondary)]" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleUnlinkClick}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Remove Link"
      >
        <Unlink size={15} className="text-[color:var(--text-secondary)]" />
      </button>

      <div className="w-px h-5 bg-[var(--border-primary)] mx-1" />

      {/* Fix Formatting */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
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
            const currentContent = editor.innerHTML;
            const fixedContent = fixFormattingToBullets(currentContent);
            editor.innerHTML = fixedContent;
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }}
        onMouseDown={(e) => e.preventDefault()}
        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors opacity-60"
        title="Fix Formatting - Clean up text into bullet points"
      >
        <WandSparkles size={15} className="text-[color:var(--text-secondary)]" />
      </button>

      {/* AI Button */}
      {showAIButton && (
        <button
          type="button"
          onClick={onAISuggestions || onAIGenerate}
          disabled={isGenerating}
          className={`p-1.5 rounded transition-all duration-300 ml-auto flex items-center gap-1.5 ${
            isGenerating ? 'opacity-50 cursor-not-allowed' : 
            isValueEmpty 
              ? 'bg-[#80FF00]/10 hover:bg-[#80FF00]/20 text-[#80FF00] animate-pulse transform hover:scale-105 shadow-[0_0_10px_rgba(128,255,0,0.2)] px-3' 
              : 'hover:bg-[var(--bg-tertiary)] opacity-60'
          }`}
          title="AI: Generate writing suggestions"
        >
          <Sparkles
            size={15}
            className={`${isValueEmpty ? 'text-[#80FF00]' : 'text-[color:var(--text-secondary)]'} ${isGenerating ? 'animate-pulse' : ''}`}
          />
          {isValueEmpty && <span className="text-xs font-semibold">Suggest</span>}
        </button>
      )}
    </div>
  );
};
