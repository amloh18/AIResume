'use client';


import React, { useRef, useEffect, useState } from 'react';
import { ImageIcon, Plus, RefreshCw, ChevronUp, ChevronDown, Trash2, PlusCircle, Wand2, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles, ChevronLeft, ChevronRight, Columns } from 'lucide-react';
import { SNIPPETS, TITLE_STYLES } from '../registry';
import { getNestedValue, escapeRegExp, formatCVDate } from '../helpers';
import { AnimatePresence } from 'framer-motion';
import { SNIPPET_CATEGORY_JSON_PATH } from '@/lib/utils/cv-snippet-data';

// CORE UI COMPONENTS
// ==========================================

export const CanvasContext = React.createContext<any>(null);

export const SnippetContext = React.createContext<{
  blockId: string;
  pageIdx: number;
  pageAssignments: Record<string, number>;
} | null>(null);

export const EditableField = ({ data: explicitData, path, multiline, onChange: explicitOnChange, setFocusedRef: explicitSetFocusedRef, readOnly, nowrap, breakAll, aiIssues: explicitAiIssues, activeIssueId: explicitActiveIssueId, onIssueClick: explicitOnIssueClick, isDate = false, dateFormat: explicitDateFormat, overrideValue, arrayIndex, className = '' }: any) => {
  const ctx = React.useContext(CanvasContext);
  
  const data = explicitData || (readOnly ? ctx?.cvData : ctx?.cvData);
  const onChange = explicitOnChange || ctx?.handleDataChange;
  const setFocusedRef = explicitSetFocusedRef || ctx?.setFocusedNode;
  const aiIssues = explicitAiIssues || ctx?.aiIssues || [];
  const activeIssueId = explicitActiveIssueId || ctx?.activeIssueId;
  const onIssueClick = explicitOnIssueClick || ctx?.onIssueClick;
  const dateFormat = explicitDateFormat || ctx?.design?.dateFormat || 'MMM YYYY';
  const moriChatMode = ctx?.moriChatMode || false;

  const contentRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const value = overrideValue !== undefined ? overrideValue : (getNestedValue(data, path) || '');

  const isEditable = !readOnly && !moriChatMode;

  useEffect(() => {
    if (contentRef.current) {
      let displayValue = typeof value === 'string' ? value : '';
      
      if (isDate) {
        displayValue = formatCVDate(value, dateFormat);
      }
      
      // Fix pasted white text issues by removing bad tags and inline styles, while preserving text alignments
      if (displayValue) {
        displayValue = displayValue.replace(/<\/?(?:span|div|font|label)[^>]*>/gi, '');
        displayValue = displayValue.replace(/style=(["'])(.*?)\1/gi, (match, quote, styleContent) => {
          const alignMatch = styleContent.match(/text-align\s*:\s*(left|center|right|justify)/i);
          return alignMatch ? `style="text-align: ${alignMatch[1].toLowerCase()};"` : '';
        });
      }

      const relevantIssues = aiIssues.filter((i: any) => i.path === path);
      if (isEditing) return; // Prevent cursor jumping/caret reset while actively editing
      if (relevantIssues.length > 0) {
        relevantIssues.forEach((issue: any) => {
          if (issue.targetText && typeof issue.targetText === 'string' && issue.targetText.trim() !== '') {
            const escaped = escapeRegExp(issue.targetText);
            if (escaped) {
              // Tag-safe replacement: match any HTML tag OR the word. If we match a tag, return it unchanged.
              const regex = new RegExp(`(<[^>]+>)|(${escaped})`, 'g');
              if (regex.test('')) return;

              const typeColors: Record<string, string> = {
                complex_word: 'rgba(168, 85, 247, 0.4)',
                weakening: 'rgba(59, 130, 246, 0.4)',
                passive_voice: 'rgba(34, 197, 94, 0.4)',
                lengthy_sentence: 'rgba(234, 179, 8, 0.4)',
                complex_sentence: 'rgba(239, 68, 68, 0.4)',
                spelling_variant: 'rgba(239, 68, 68, 0.4)'
              };
              const bg = typeColors[issue.type] || 'rgba(234, 179, 8, 0.35)';
              const highlightClass = issue.id === activeIssueId ? 'text-black shadow-sm' : 'border-b-2 border-white/30 cursor-pointer text-gray-900';
              const title = issue.suggestion ? `${issue.message || ''} Fix: ${issue.suggestion}` : (issue.message || 'Suggestion');
              
              const safeSuggestion = (issue.suggestion || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
              const safeTitle = title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
              
              displayValue = displayValue.replace(regex, (match, tag, word) => {
                if (tag) return tag; // Return HTML tag unchanged
                return `<mark class="${highlightClass} rounded-sm px-0.5 transition-all" style="background-color:${bg}" data-issue="${issue.id}" data-suggestion="${safeSuggestion}" title="${safeTitle}">${word}</mark>`;
              });
            }
          }
        });
      }
      contentRef.current.innerHTML = displayValue;
    }
  }, [value, isEditing, aiIssues, activeIssueId, path]);

  const handleInput = () => {
    if (!isEditable || !contentRef.current) return;
    
    // Use the DOM parser to robustly remove mark tags and avoid string parsing errors
    const temp = document.createElement('div');
    temp.innerHTML = contentRef.current.innerHTML;
    
    const marks = Array.from(temp.getElementsByTagName('mark'));
    for (const mark of marks) {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
      }
    }
    
    let cleanHtml = temp.innerHTML;
    // Fallback regex cleanup to ensure absolute safety
    cleanHtml = cleanHtml
      .replace(/<mark[^>]*>/gi, '')
      .replace(/<\/mark>/gi, '');
      
    if (arrayIndex !== undefined) {
      const fullStr = getNestedValue(data, path) || '';
      const arr = fullStr.split(',').map((s: string) => s.trim());
      arr[arrayIndex] = cleanHtml;
      onChange(path, arr.join(', '));
    } else {
      onChange(path, cleanHtml);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (!multiline && e.key === 'Enter') e.preventDefault(); };
  const handleFocus = () => {
    if (!isEditable) return;
    setIsEditing(true);
    if (setFocusedRef) setFocusedRef(contentRef.current);
    if (ctx?.setFocusedJsonPath && path) ctx.setFocusedJsonPath(path);
  };
  const handleBlur = () => {
    if (!isEditable) return;
    setIsEditing(false);
    if (setFocusedRef) {
      const blurredNode = contentRef.current;
      window.setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement | null;
        const activeEditable = activeElement?.closest?.('[contenteditable="true"]');
        if (!activeEditable || activeEditable === blurredNode) {
          setFocusedRef(null);
        }
      }, 120);
    }
  };
  const handleClick = (e: React.MouseEvent) => {
    if (moriChatMode) {
      e.preventDefault();
      e.stopPropagation();
      const text = contentRef.current?.innerText || '';
      window.dispatchEvent(new CustomEvent('mori-cv-selection', { 
        detail: { path, text } 
      }));
      return;
    }

    if ((e.target as HTMLElement).tagName === 'MARK' && onIssueClick) {
      const el = e.target as HTMLElement;
      const id = el.getAttribute('data-issue');
      if (!id) return;
      onIssueClick(id, el.getBoundingClientRect());
    }
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    // Ensure we don't paste line breaks if not multiline
    const cleanText = multiline ? text : text.replace(/[\r\n]+/g, ' ');
    document.execCommand('insertText', false, cleanText);
  };

  let wrapClass = 'whitespace-normal';
  if (nowrap) wrapClass = 'whitespace-nowrap'; // Force no wrap
  if (breakAll) wrapClass = 'break-all whitespace-normal';
  if (multiline) wrapClass = 'whitespace-pre-wrap';

  let emptyText = "Type here...";
  const lowerPath = path?.toLowerCase() || '';

  // Add specific class for header name and role to allow auto-sizing
  const isNameField = lowerPath === 'basics.name';
  const isRoleField = lowerPath === 'basics.title';
  const finalClassName = `${wrapClass} ${isNameField ? 'cv-header-name' : ''} ${isRoleField ? 'cv-header-role' : ''} ${className}`;

  // Specific placeholders for contact fields
  if (lowerPath.includes('email')) emptyText = "Email";
  else if (lowerPath.includes('phone')) emptyText = "Phone";
  else if (lowerPath.includes('location')) emptyText = "Location";
  else if (lowerPath.includes('website')) emptyText = "Website / Link";
  else if (lowerPath.includes('linkedin')) emptyText = "LinkedIn";
  else if (lowerPath.includes('.profiles.') && lowerPath.endsWith('.url')) {
    const profilePath = path.split('.').slice(0, -1).join('.');
    const network = String(getNestedValue(data, `${profilePath}.network`) || '').toLowerCase();
    if (network.includes('linkedin')) emptyText = "LinkedIn";
    else if (network.includes('github')) emptyText = "GitHub";
    else if (network.includes('twitter')) emptyText = "Twitter";
    else emptyText = "Profile link";
  }
  
  // General placeholders
  else if (lowerPath.includes('summary')) emptyText = "Summary/Objective";
  else if (lowerPath.includes('description')) emptyText = "Work summary or achievements";
  else if (lowerPath.includes('skills')) emptyText = "Skills list";
  else if (lowerPath.includes('position')) emptyText = "Job role/Designation";
  else if (lowerPath.includes('name') && lowerPath.includes('work')) emptyText = "Company/Employer Name";
  else if (lowerPath.includes('name') && lowerPath.includes('education')) emptyText = "University/Institution Name";
  else if (lowerPath.includes('name') && lowerPath.includes('projects')) emptyText = "Project Name";
  else if (lowerPath.includes('name') && lowerPath.includes('certificates')) emptyText = "Certificate Name";
  else if (lowerPath.includes('name')) emptyText = "Name";
  else if (lowerPath.includes('startdate')) emptyText = "Start Date";
  else if (lowerPath.includes('enddate')) emptyText = "End Date";
  else if (lowerPath.includes('date')) emptyText = "Date/Year";
  else if (lowerPath.includes('title') && lowerPath.includes('basics')) emptyText = "Professional Title";
  else if (lowerPath.includes('title')) emptyText = "Title";
  else if (lowerPath.includes('institution')) emptyText = "University/Institution Name";
  else if (lowerPath.includes('area')) emptyText = "Major/Field of Study";
  else if (lowerPath.includes('studytype')) emptyText = "Degree Type";
  else if (lowerPath.includes('organization')) emptyText = "Organization Name";
  else if (lowerPath.includes('awarder')) emptyText = "Awarding Organization";
  else if (lowerPath.includes('issuer')) emptyText = "Issuing Organization";
  else if (lowerPath.includes('publisher')) emptyText = "Publisher Name";

  const moriHoverClass = moriChatMode ? 'hover:bg-emerald-500/20 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.4)] cursor-pointer rounded-sm' : '';
  const editHoverClass = isEditable ? 'hover:bg-emerald-50/30 focus:bg-white/80 focus:outline focus:outline-2 focus:outline-emerald-400/60 border border-transparent hover:border-gray-200 focus:border-emerald-300 focus:text-gray-900 rounded-[3px]' : '';
  // Empty-field placeholder chrome only belongs in edit mode — readOnly previews
  // must not show "Type here..."/"END DATE" hints over real documents.
  const emptyPlaceholderClass = isEditable
    ? `empty:min-w-[60px] ${multiline ? 'empty:block' : 'empty:inline-block'} empty:border-dashed empty:border-gray-300 empty:after:content-[attr(data-empty-text)] empty:after:text-gray-400 empty:after:italic`
    : '';

  return (
      <span ref={contentRef} data-path={path} data-empty-text={emptyText} contentEditable={isEditable} suppressContentEditableWarning onPaste={handlePaste} onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} onBlur={handleBlur} onClick={handleClick} className={`outline-none transition-all duration-200 ${multiline ? 'block w-full' : 'inline'} ${finalClassName} ${moriHoverClass} ${editHoverClass} z-40 relative ${emptyPlaceholderClass}`} style={{ minHeight: '1.2em' }} />
    );
  };
  
  export const FloatingToolbar = ({ targetNode, onSuggestPoint }: any) => {
    const [pos, setPos] = useState({ top: -1000, left: 0 });
    const [canSuggest, setCanSuggest] = useState(false);
    const [canSuggestSkills, setCanSuggestSkills] = useState(false);
  
    useEffect(() => {
      const updatePos = () => {
        if (targetNode) {
          const rect = targetNode.getBoundingClientRect();
          setPos({ top: rect.top - 45, left: rect.left + rect.width / 2 });
          const isBulletContext = targetNode.tagName === 'LI' || targetNode.closest('li') || targetNode.closest('ul') || (targetNode.getAttribute('data-path') || '').includes('description');
          const isSkillContext = (targetNode.getAttribute('data-path') || '').toLowerCase().includes('skills');
          const isSummaryContext = (targetNode.getAttribute('data-path') || '').toLowerCase().includes('summary');
          setCanSuggest(!!isBulletContext || !!isSummaryContext);
          setCanSuggestSkills(!!isSkillContext);
        } else {
          setPos({ top: -1000, left: 0 });
          setCanSuggest(false);
          setCanSuggestSkills(false);
        }
      };

      updatePos();

      const scrollContainers = document.querySelectorAll('.overflow-auto');
      const handleScroll = () => updatePos();
      
      scrollContainers.forEach(c => c.addEventListener('scroll', handleScroll, { passive: true }));
      window.addEventListener('resize', handleScroll);
      
      return () => {
        scrollContainers.forEach(c => c.removeEventListener('scroll', handleScroll));
        window.removeEventListener('resize', handleScroll);
      };
    }, [targetNode]);
  
    const execCmd = (e: React.MouseEvent, cmd: string) => { e.preventDefault(); document.execCommand('styleWithCSS', false, 'true'); document.execCommand(cmd, false); };
  
  if (!targetNode) return null;
  return (
    <div
      className="fixed z-[200] bg-white backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-gray-200 rounded-2xl flex items-center px-2 py-1.5 gap-0 transform -translate-x-1/2 transition-all duration-200 text-gray-800"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {canSuggestSkills && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); onSuggestPoint('skills'); }}
            className="h-7 px-2.5 text-emerald-600 flex items-center gap-1 font-bold text-[10px] bg-emerald-50 hover:bg-emerald-100 transition-all duration-150 rounded-xl mr-1 border border-emerald-200/60"
            title="AI Skills suggestions"
          >
            <Wand2 size={11} className="animate-pulse" />
            Skills
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
        </>
      )}
      {canSuggest && !canSuggestSkills && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); onSuggestPoint(); }}
            className="h-7 px-2.5 text-emerald-600 flex items-center gap-1 font-bold text-[10px] bg-emerald-50 hover:bg-emerald-100 transition-all duration-150 rounded-xl mr-1 border border-emerald-200/60"
            title="Suggest contextual AI point"
          >
            <Wand2 size={11} className="animate-pulse" />
            AI
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
        </>
      )}
      {([
        { cmd: 'bold', Icon: Bold, title: 'Bold (Ctrl+B)' },
        { cmd: 'italic', Icon: Italic, title: 'Italic (Ctrl+I)' },
        { cmd: 'underline', Icon: Underline, title: 'Underline (Ctrl+U)' },
      ] as const).map(({ cmd, Icon, title }) => (
        <button
          key={cmd}
          onClick={(e) => execCmd(e, cmd)}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all duration-150 rounded-xl hover:bg-gray-100 hover:scale-110 active:scale-95"
          title={title}
        >
          <Icon size={14} />
        </button>
      ))}
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button
        onClick={(e) => execCmd(e, 'insertUnorderedList')}
        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all duration-150 rounded-xl hover:bg-gray-100 hover:scale-110 active:scale-95"
        title="Bullet List"
      >
        <List size={14} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      {([
        { cmd: 'justifyLeft', Icon: AlignLeft, title: 'Align Left' },
        { cmd: 'justifyCenter', Icon: AlignCenter, title: 'Center' },
        { cmd: 'justifyRight', Icon: AlignRight, title: 'Align Right' },
        { cmd: 'justifyFull', Icon: AlignJustify, title: 'Justify' },
      ] as const).map(({ cmd, Icon, title }) => (
        <button
          key={cmd}
          onClick={(e) => execCmd(e, cmd)}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all duration-150 rounded-xl hover:bg-gray-100 hover:scale-110 active:scale-95"
          title={title}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
};

let transparentDragImage: HTMLImageElement | null = null;

const getTransparentDragImage = () => {
  if (transparentDragImage) return transparentDragImage;
  const image = new Image();
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
  transparentDragImage = image;
  return image;
};

const buildSnippetPreviewMarkup = (source: HTMLElement) => {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print').forEach((node) => node.remove());
  clone.querySelectorAll('[contenteditable="true"]').forEach((node) => {
    node.removeAttribute('contenteditable');
  });
  clone.style.margin = '0';
  clone.style.transform = 'none';
  clone.style.opacity = '1';
  clone.style.pointerEvents = 'none';
  clone.style.width = `${source.offsetWidth}px`;
  clone.style.maxWidth = `${source.offsetWidth}px`;
  return clone.outerHTML;
};

export const CanvasSnippet = ({ readOnly = false, instance, index, zoneId, cvData, EditableWrapper, moveSnippet, removeSnippet, onReplace, onTogglePhoto, onAddListEntry, moveEntry, deleteEntry, dragState, isDark, activeTemplate, layoutZones, onOpenSkillsSuggestions, isDropAllowed, onMoveToZone, isLastSnippetInZone: isLastSnippetInZoneProp }: any) => {
  const ctx = React.useContext(CanvasContext);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  if (!instance || !instance.type) return null;
  const SnippetComponent = SNIPPETS[instance.type] || SNIPPETS['summary-clean']; // Fallback
  if (!SnippetComponent) return null; // Safe guard if fallback fails
  const isDropTarget = dragState?.overZoneId === zoneId && dragState?.overIndex === index;
  const isBeingDragged = dragState?.isDragging && dragState?.sourceZoneId === zoneId && dragState?.sourceIndex === index;
  const isHeader = SnippetComponent?.category === 'Header';
  const isSkillsSnippet = SnippetComponent?.category === 'Skills';
  const primaryTitleKey = (SnippetComponent?.category || '').toLowerCase();
  const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId.replace(/_page_\d+$/, ''));
  const showDropLine = !readOnly && isDropTarget && !(dragState.sourceZoneId === zoneId && (dragState.overIndex === dragState.sourceIndex || dragState.overIndex === dragState.sourceIndex + 1));
  // "Last snippet" must be page-local: the final snippet rendered on THIS page gets
  // no trailing section gap (the pagination model only budgets gaps *between* blocks).
  // The zoneId prop is page-suffixed (`left_page_0`) while layoutZones is keyed by
  // bare zone ids, so CanvasZone passes the page-local answer in directly.
  const bareZoneId = (zoneId || '').replace(/_page_\d+$/, '');
  const zoneBlockCount = Array.isArray(layoutZones?.[bareZoneId]) ? layoutZones[bareZoneId].length : 0;
  const isLastSnippetInZone = isLastSnippetInZoneProp ?? index === Math.max(0, zoneBlockCount - 1);

  useEffect(() => {
    if (!confirmingRemove) return undefined;
    const timer = window.setTimeout(() => setConfirmingRemove(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmingRemove]);

  const handleRemoveSnippet = () => {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    removeSnippet(zoneId, index);
    setConfirmingRemove(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isHeader || readOnly) return;
    const sourceElement = e.currentTarget as HTMLElement;
    const previewMarkup = buildSnippetPreviewMarkup(sourceElement);
    e.dataTransfer.setData('application/json', JSON.stringify({
      source: 'canvas',
      zoneId: bareZoneId,
      index: (layoutZones?.[bareZoneId] || []).findIndex((block: any) => block.id === instance.id),
      instance,
    }));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
    document.dispatchEvent(new CustomEvent('snippet-drag-start', {
      detail: {
        zoneId: bareZoneId,
        index: (layoutZones?.[bareZoneId] || []).findIndex((block: any) => block.id === instance.id),
        instance,
        pointer: { x: e.clientX, y: e.clientY },
        previewMarkup,
        width: sourceElement.offsetWidth,
        height: sourceElement.offsetHeight,
        label: SnippetComponent?.name || 'Section',
      }
    }));
  };
  const handleDragEnd = () => document.dispatchEvent(new CustomEvent('snippet-drag-end'));
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isHeader || readOnly) return;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw && isDropAllowed && !isDropAllowed(zoneId, JSON.parse(raw))) {
        return;
      }
    } catch {}
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIndex = e.clientY < midY ? index : index + 1;
        if (dragState.overZoneId !== zoneId || dragState.overIndex !== insertIndex) {
      document.dispatchEvent(new CustomEvent('snippet-drag-over', { detail: { zoneId, index: insertIndex } }));
    }
  };

  const match = zoneId.match(/_page_(\d+)$/);
  const pageIdx = match ? parseInt(match[1]) : 0;

  const Title = ({ titleKey, overrideClass }: any) => {
    const headerUnitId = `${instance.id}_header`;
    const assignedPage = ctx?.pageAssignments?.[headerUnitId] ?? ctx?.pageAssignments?.[instance.id] ?? 0;
    if (assignedPage !== pageIdx) {
      return null;
    }

    const isSidebar = isNarrow;
    const styleKey = isSidebar && activeTemplate?.sidebarTitleStyle ? activeTemplate.sidebarTitleStyle : activeTemplate?.titleStyle;
    const Renderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];

    if (overrideClass) {
      return <h3 className={overrideClass}><EditableWrapper path={`sectionTitles.${titleKey}`} nowrap /></h3>;
    }

    return <Renderer isDark={isDark} showIcons={ctx?.design?.showHeaderIcons ?? true} titleKey={titleKey}><EditableWrapper path={`sectionTitles.${titleKey}`} nowrap /></Renderer>;
  };

  const headerUnitId = `${instance.id}_header`;
  const assignedPage = ctx?.pageAssignments?.[headerUnitId] ?? ctx?.pageAssignments?.[instance.id] ?? 0;
  const isHeaderPage = assignedPage === pageIdx;

  const showInlineControls = !readOnly && !ctx?.moriChatMode && primaryTitleKey && isHeaderPage;
  const canAddListEntry = SnippetComponent && ['Experience', 'Education', 'Projects', 'Certifications', 'Awards', 'Publications', 'Volunteer', 'References', 'Languages', 'Interests', 'Skills'].includes(SnippetComponent.category);
  const controls = showInlineControls ? (
    <div className="absolute opacity-0 group-hover/inner:opacity-100 transition-all duration-200 flex items-center gap-0.5 z-[200] no-print top-[-24px] right-1 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-gray-200 rounded px-1 py-0.5">
      {/* Action icons group */}
      {isHeader && instance.type !== 'header-accent' && instance.type !== 'header-minimal' && (
        <button
          onClick={onTogglePhoto}
          className="w-7 h-7 flex items-center justify-center text-blue-500 hover:text-blue-600 transition-all duration-150 hover:scale-110 active:scale-95"
          title="Toggle Photo"
        >
          <ImageIcon size={13}/>
        </button>
      )}
      {canAddListEntry && (
        <button
          onClick={() => onAddListEntry(SnippetComponent.category)}
          className="w-7 h-7 flex items-center justify-center text-emerald-500 hover:text-emerald-600 transition-all duration-150 hover:scale-110 active:scale-95"
          title={`Add ${SnippetComponent.category} entry`}
        >
          <Plus size={13}/>
        </button>
      )}
      {isSkillsSnippet && (
        <button
          onClick={onOpenSkillsSuggestions}
          className="w-7 h-7 flex items-center justify-center text-emerald-500 hover:text-emerald-600 transition-all duration-150 hover:scale-110 active:scale-95"
          title="AI Skill Suggestions"
        >
          <Wand2 size={13}/>
        </button>
      )}
      {/* Mori AI: open mori chat with this section pre-selected */}
      {!isHeader && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const text = (e.currentTarget.closest('[data-block-id]') as HTMLElement)?.innerText || '';
            const path = SnippetComponent.category.toLowerCase();
            window.dispatchEvent(new CustomEvent('mori-cv-selection', {
              detail: { path, text: `(Section ${SnippetComponent.category}): ${text.substring(0, 100)}...` }
            }));
            window.dispatchEvent(new CustomEvent('open-mori-chat'));
          }}
          className="w-7 h-7 flex items-center justify-center text-emerald-500 hover:text-emerald-400 transition-all duration-150 hover:scale-110 active:scale-95"
          title="Ask Mori AI about this section"
        >
          <Sparkles size={13}/>
        </button>
      )}
      {isHeader && (
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-1 mr-1">
          <button
            onClick={() => ctx?.setDesign?.({ ...ctx.design, headerAlign: 'left' })}
            className={`w-7 h-7 flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 bg-transparent ${
              (ctx?.design?.headerAlign || 'left') === 'left' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Align text left"
          >
            <AlignLeft size={13} />
          </button>
          <button
            onClick={() => ctx?.setDesign?.({ ...ctx.design, headerAlign: 'center' })}
            className={`w-7 h-7 flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 bg-transparent ${
              ctx?.design?.headerAlign === 'center' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Center text"
          >
            <AlignCenter size={13} />
          </button>
          <button
            onClick={() => ctx?.setDesign?.({ ...ctx.design, headerAlign: 'right' })}
            className={`w-7 h-7 flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 bg-transparent ${
              ctx?.design?.headerAlign === 'right' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Align text right"
          >
            <AlignRight size={13} />
          </button>
        </div>
      )}
      <button
        onClick={() => onReplace(zoneId, index, instance.type)}
        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all duration-150 hover:scale-110 active:scale-95 bg-transparent"
        title="Change Style"
      >
        <RefreshCw size={13}/>
      </button>
      <button
        onClick={() => removeSnippet(zoneId, index)}
        className="w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-600 transition-all duration-150 hover:scale-110 active:scale-95 bg-transparent"
        title="Delete section"
      >
        <Trash2 size={13}/>
      </button>
      {!isHeader && (
        <>
          <div className="w-[1.5px] h-4 bg-gray-200 mx-1" />
          {/* Layout-aware directional arrow controls */}
          {(() => {
            const tplType: string = activeTemplate?.type || '1-col';
            // Determine the bare zoneId (without _page_N suffix)
            const bareZoneId = (zoneId || '').replace(/_page_\d+$/, '');

            // Determine sibling zones for cross-column movement
            const getSiblingZone = (dir: 'left' | 'right'): string | null => {
              // 2-col: left <-> right
              if (tplType === '2-col') {
                if (bareZoneId === 'left' && dir === 'right') return 'right';
                if (bareZoneId === 'right' && dir === 'left') return 'left';
              }
              // top-sidebar-right: main -> sidebar (right), sidebar -> main (left)
              if (tplType === 'top-sidebar-right') {
                if (bareZoneId === 'main' && dir === 'right') return 'sidebar';
                if (bareZoneId === 'sidebar' && dir === 'left') return 'main';
              }
              // top-sidebar-left: sidebar -> main (right), main -> sidebar (left)
              if (tplType === 'top-sidebar-left') {
                if (bareZoneId === 'sidebar' && dir === 'right') return 'main';
                if (bareZoneId === 'main' && dir === 'left') return 'sidebar';
              }
              // sidebar-left / sidebar-left-dark: sidebar -> main (right), main -> sidebar (left)
              if (tplType === 'sidebar-left' || tplType === 'sidebar-left-dark') {
                if (bareZoneId === 'sidebar' && dir === 'right') return 'main';
                if (bareZoneId === 'main' && dir === 'left') return 'sidebar';
              }
              // sidebar-right / sidebar-right-dark: main -> sidebar (right), sidebar -> main (left)
              if (tplType === 'sidebar-right' || tplType === 'sidebar-right-dark') {
                if (bareZoneId === 'main' && dir === 'right') return 'sidebar';
                if (bareZoneId === 'sidebar' && dir === 'left') return 'main';
              }
              // hybrid-split: left <-> right
              if (tplType === 'hybrid-split') {
                if (bareZoneId === 'left' && dir === 'right') return 'right';
                if (bareZoneId === 'right' && dir === 'left') return 'left';
              }
              return null;
            };

            const leftZone = getSiblingZone('left');
            const rightZone = getSiblingZone('right');
            const showLeft = !!leftZone;
            const showRight = !!rightZone;

            const btnCls = 'w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 active:scale-90 transition-all duration-150 cursor-pointer select-none';

            return (
              <div className="flex items-center gap-0">
                {showLeft && (
                  <button
                    onClick={() => onMoveToZone?.(index, leftZone)}
                    className={btnCls}
                    title={`Move to ${leftZone} zone`}
                  >
                    <ChevronLeft size={12} />
                  </button>
                )}
                <button
                  onClick={() => moveSnippet(zoneId, index, -1)}
                  className={btnCls}
                  title="Move up"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={() => moveSnippet(zoneId, index, 1)}
                  className={btnCls}
                  title="Move down"
                >
                  <ChevronDown size={12} />
                </button>
                {showRight && (
                  <button
                    onClick={() => onMoveToZone?.(index, rightZone)}
                    className={btnCls}
                    title={`Move to ${rightZone} zone`}
                  >
                    <ChevronRight size={12} />
                  </button>
                )}
                 {tplType === 'hybrid-split' && (
                  <>
                    <div className="w-[1px] h-3 bg-gray-200 mx-1" />
                    {bareZoneId === 'main' ? (
                      <button
                        onClick={() => onMoveToZone?.(index, 'left')}
                        className={`${btnCls} text-blue-500 hover:text-blue-600`}
                        title="Convert to 50:50 Columns"
                      >
                        <Columns size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onMoveToZone?.(index, 'main')}
                        className={`${btnCls} text-blue-500 hover:text-blue-600`}
                        title="Convert to Full Width"
                      >
                        <AlignJustify size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  ) : null;

  const handleMoriClick = (e: React.MouseEvent) => {
    if (!ctx?.moriChatMode) return;
    // We only want to trigger this if we didn't click on an inner element that already triggered it.
    // e.stopPropagation() handles that if inner elements also call it.
    e.stopPropagation();
    const text = (e.currentTarget as HTMLElement).innerText || '';
    const path = SnippetComponent.category.toLowerCase();
    window.dispatchEvent(new CustomEvent('mori-cv-selection', { 
      detail: { path, text: `(Section ${SnippetComponent.category}): ${text.substring(0, 100)}...` } 
    }));
  };

  const content = SnippetComponent.render({ data: cvData, Editable: EditableWrapper, zoneId: zoneId.replace(/_page_\d+$/, ''), isDark, Title, moveEntry, deleteEntry, showIcons: ctx?.design?.showContactIcons ?? true, design: ctx?.design, activeTemplate, layoutZones, readOnly });
  
  const moriHoverClass = ctx?.moriChatMode ? 'hover:bg-emerald-500/10 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.4)] cursor-pointer rounded-lg transition-all' : '';
  
  return (
    <SnippetContext.Provider value={{ blockId: instance.id, pageIdx, pageAssignments: ctx?.pageAssignments || {} }}>
      <div
        data-block-id={instance.id}
        className={`relative group/snippet cv-section-wrapper ${showDropLine ? 'mt-10' : 'mt-0'} ${moriHoverClass}`}
        data-json-section={SNIPPET_CATEGORY_JSON_PATH[SnippetComponent.category] || ''}
        style={isHeader ? {} : { marginBottom: isLastSnippetInZone ? 0 : 'var(--cv-section-gap, 16px)' }}
        onMouseDown={() => {
          const jsonPath = SNIPPET_CATEGORY_JSON_PATH[SnippetComponent.category];
          if (jsonPath) ctx?.setFocusedJsonPath?.(jsonPath);
        }}
        onClick={handleMoriClick}
      >
        {showDropLine && (
          <div className="absolute -top-8 left-0 w-full min-h-[30px] rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/95 shadow-[0_0_0_1px_rgba(16,185,129,0.1),0_10px_30px_rgba(16,185,129,0.12)] flex items-center justify-center pointer-events-none z-30 animate-pulse">
            <span className="px-3 py-1 rounded-full bg-white text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Drop Section Here</span>
          </div>
        )}
        <div className={`relative hover:z-[150] group/inner w-full`}>
          {controls}
          <div className={`${isNarrow ? '' : ''} pointer-events-auto snippet-content relative z-10 w-full min-w-0 ${!content && !readOnly ? 'min-h-[60px] flex flex-col justify-center' : ''}`}>
            {!readOnly && (
              <div className="absolute left-[-1px] right-[-1px] top-[-1px] bottom-[-1px] bg-emerald-50/10 opacity-0 group-hover/inner:opacity-100 pointer-events-none transition-all duration-200 z-[-1] border border-transparent group-hover/inner:border-emerald-400 group-hover/inner:border-dashed shadow-none group-hover/inner:shadow-sm rounded-md group-hover/inner:rounded-tr-none group-hover/inner:rounded-tl-none transition-shadow"></div>
            )}
            {content || (!readOnly && (
              <div className="text-center opacity-40 select-none cursor-pointer hover:opacity-80 transition-opacity p-4 border border-dashed border-gray-300 rounded-lg mt-2" onClick={() => onAddListEntry(SnippetComponent.category)}>
                <Title titleKey={SnippetComponent.category.toLowerCase()} />
                <div className="text-[11px] uppercase tracking-widest mt-3 font-bold text-gray-500 flex items-center justify-center gap-1"><PlusCircle size={14}/> Add {SnippetComponent.category}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SnippetContext.Provider>
  );
};

const InsertSnippetHandle = ({ onAddSnippet, zoneId, index, alwaysVisible = false }: any) => {
  return (
    <div className="group/insert relative w-full h-[6px] my-[-3px] flex items-center justify-center z-40 transition-all no-print">
      <div className="absolute inset-0 cursor-pointer" />
      <div className={`w-full h-[2px] bg-emerald-400 ${alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover/insert:opacity-100'} transition-opacity pointer-events-none absolute left-0 right-0`} />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddSnippet(zoneId, index);
        }}
        className={`${alwaysVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover/insert:opacity-100 group-hover/insert:scale-100'} transition-all flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-2.5 py-1 rounded-full text-[10px] shadow-md hover:shadow-lg font-sans absolute left-1/2 -translate-x-1/2 cursor-pointer pointer-events-auto`}
      >
        <Plus size={11} /> Add Section
      </button>
    </div>
  );
};

export const CanvasZone = ({ readOnly = false, zoneId, blocks, cvData, EditableWrapper, handleDrop, moveSnippet, removeSnippet, onReplace, onAddSnippet, onTogglePhoto, onAddListEntry, moveEntry, deleteEntry, dragState, activeTemplate, layoutZones, isDark = false, className = "", onOpenSkillsSuggestions, isDropAllowed, onMoveToZone }: any) => {
  const [isOverZone, setIsOverZone] = useState(false);
  const [dropIntent, setDropIntent] = useState<'valid' | 'invalid' | null>(null);
  const bareZoneId = (zoneId || '').replace(/_page_\d+$/, '');
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverZone(true);
    if (readOnly) return;
    let canDropHere = true;
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr && isDropAllowed) {
        canDropHere = isDropAllowed(zoneId, JSON.parse(dataStr));
      }
    } catch {
      canDropHere = true;
    }
    setDropIntent(canDropHere ? 'valid' : 'invalid');
    if (canDropHere && e.target === e.currentTarget) {
      document.dispatchEvent(new CustomEvent('snippet-drag-over', { detail: { zoneId, index: blocks.length } }));
    }
  };
  const onDragLeave = () => { setIsOverZone(false); setDropIntent(null); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverZone(false);
    if (readOnly) return;
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const dragData = JSON.parse(dataStr);
        if (!isDropAllowed || isDropAllowed(zoneId, dragData)) {
          handleDrop(zoneId, dragData, dragState?.overIndex);
        }
      }
    } catch {}
    setDropIntent(null);
    document.dispatchEvent(new CustomEvent('snippet-drag-end'));
  };
  const isAppendTarget = dragState?.overZoneId === zoneId && dragState?.overIndex === blocks.length;
  const showAppendLine = !readOnly && isAppendTarget && !(dragState.sourceZoneId === zoneId && (dragState.overIndex === dragState.sourceIndex || dragState.overIndex === dragState.sourceIndex + 1));
  
  // Highlight empty zones or all zones during drag for hybrid layouts
  const isDragging = dragState?.isDragging;
  const dragHighlightClass = isDragging && !readOnly ? 'min-h-[120px] border-2 border-dashed rounded-2xl bg-gray-50/40' : 'min-h-0';
  const dropStateClass = dropIntent === 'invalid'
    ? '!border-red-400 !bg-red-50/70 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]'
    : dropIntent === 'valid'
      ? '!border-emerald-400 !bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]'
      : isOverZone && !readOnly
        ? '!border-emerald-300 !bg-emerald-50/50'
        : isDragging && !readOnly
          ? 'border-gray-200/70'
          : 'border-transparent';

  return (
    <div data-zone-id={zoneId} className="relative group/zone flex flex-col h-full">
      <div className={`${dragHighlightClass} ${dropStateClass} transition-all duration-300 pb-0 ${className}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        
        <div className="flex flex-col gap-0">
          {!readOnly && blocks.length === 0 && (layoutZones?.[bareZoneId]?.length ?? 0) === 0 && (
            <InsertSnippetHandle onAddSnippet={onAddSnippet} zoneId={zoneId} index={0} alwaysVisible={true} />
          )}
          <AnimatePresence mode="popLayout">
            {blocks.map((instance: any, index: number) => (
              <React.Fragment key={instance?.id || `snippet-${index}`}>
                <CanvasSnippet
                  readOnly={readOnly}
                  instance={instance}
                  index={index}
                  zoneId={zoneId}
                  isLastSnippetInZone={index === blocks.length - 1}
                  cvData={cvData}
                  EditableWrapper={EditableWrapper}
                  moveSnippet={moveSnippet}
                  removeSnippet={removeSnippet}
                  onReplace={onReplace}
                  onTogglePhoto={onTogglePhoto}
                  onAddListEntry={onAddListEntry}
                  moveEntry={moveEntry}
                  deleteEntry={deleteEntry}
                  dragState={dragState}
                  activeTemplate={activeTemplate}
                  layoutZones={layoutZones}
                  isDark={isDark}
                  onOpenSkillsSuggestions={onOpenSkillsSuggestions}
                  isDropAllowed={isDropAllowed}
                  onMoveToZone={onMoveToZone}
                />
                {!readOnly && (
                  <InsertSnippetHandle
                    onAddSnippet={onAddSnippet}
                    zoneId={zoneId}
                    index={index + 1}
                    alwaysVisible={false}
                  />
                )}
              </React.Fragment>
            ))}
          </AnimatePresence>
        </div>
        {showAppendLine && <div className="w-full min-h-[34px] bg-emerald-50/95 border-2 border-dashed border-emerald-400 rounded-xl mt-4 pointer-events-none shadow-[0_10px_30px_rgba(16,185,129,0.12)] flex items-center justify-center"><span className="px-3 py-1 rounded-full bg-white text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Insert Here</span></div>}
      </div>
    </div>
  );
};

export const StaticLayoutRenderer = ({ template, cvData, ReadOnlyWrapper, design, snippetExtra, interactive }: any) => {
  // Priority: explicit design prop > saved canvas design in metadata > hardcoded defaults
  const savedDesign = cvData?.metadata?.canvasDesign || {};
  const defaultDesign = {
    font: 'Inter', fontSize: 12, spacing: 1.0, accentColor: '#22c55e',
    pageMargin: 40, showContactIcons: true, showHeaderIcons: true,
    sidebarBgColor: '#f8fafc', sectionGap: 16,
    ...savedDesign,  // overlay with user's saved design (fixes dashboard card thumbnails)
    ...design,       // overlay with explicit prop (fixes template-modal thumbnails)
  };
  const formatOption = defaultDesign.formatOption || 'hybrid';
  const formatClass = formatOption === 'bullets_only' ? 'cv-format-bullets-only' : (formatOption === 'paragraph_only' ? 'cv-format-paragraph-only' : 'cv-format-hybrid');
  const wrapperStyle = { '--cv-font': defaultDesign.font, '--cv-base-size': `${defaultDesign.fontSize}px`, '--cv-spacing': defaultDesign.spacing, '--cv-accent': defaultDesign.accentColor, '--cv-page-margin': `${defaultDesign.pageMargin}px`, '--cv-sidebar-bg': defaultDesign.sidebarBgColor, '--cv-section-gap': `${defaultDesign.sectionGap}px`, '--cv-item-gap': `${defaultDesign.itemGap || 12}px`, '--cv-column-gap': `${Math.max(8, (defaultDesign.sectionGap || 1) + 8)}px` } as React.CSSProperties;

  const renderZone = (zoneId: string, className: string, isDark = false) => {
    const snippets = template.zones[zoneId] || [];
    return (
      <div data-zone-id={zoneId} className={`flex flex-col ${className}`}>
        {snippets.map((type: string, index: number) => {
          const SnippetComponent = SNIPPETS[type] || SNIPPETS['summary-clean'];
          if (!SnippetComponent) return null;
          const isSidebar = ['sidebar', 'left', 'right'].includes(zoneId);
          const styleKey = isSidebar && template.sidebarTitleStyle ? template.sidebarTitleStyle : template.titleStyle;
          const TitleRenderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];
          const Title = ({ titleKey, overrideClass }: any) => overrideClass ? <h3 className={overrideClass}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap /></h3> : <TitleRenderer isDark={isDark} showIcons={defaultDesign.showHeaderIcons} titleKey={titleKey}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap /></TitleRenderer>;
          const isLastSnippet = index === snippets.length - 1;
          return (
            <div key={index} className="flex flex-col">
              <div className="cv-section-wrapper cv-page-breakable" style={{ marginBottom: isLastSnippet ? 0 : 'var(--cv-section-gap, 16px)', ...(interactive ? {} : { pointerEvents: 'none' }) }}><SnippetComponent.render data={cvData} Editable={ReadOnlyWrapper} zoneId={zoneId} isDark={isDark} Title={Title} moveEntry={() => {}} deleteEntry={() => {}} showIcons={defaultDesign.showContactIcons} design={defaultDesign} readOnly={true} /></div>
              {snippetExtra?.(type)}
            </div>
          );
        })}
      </div>
    );
  };
  const isColorDark = (hex: string) => {
    if (!hex || hex[0] !== '#') return false;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return (r * 299 + g * 587 + b * 114) / 1000 < 140;
    }
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
  };
  const isDarkSidebar = isColorDark(defaultDesign.sidebarBgColor || '#f8fafc');

  switch (template.type) {
    case '1-col':
      return (
        <div className={`w-full h-full cv-document ${formatClass}`} style={{ ...wrapperStyle, padding: 'var(--cv-page-margin)', backgroundColor: '#ffffff' }}>
          {renderZone('main', 'w-full min-w-0')}
        </div>
      );
    case '2-col':
      return (
        <div className={`w-full h-full flex flex-col cv-document ${formatClass}`} style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}>
          {(template.zones['header'] || []).length > 0 && (
            <div className="w-full min-w-0" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0, marginBottom: 'var(--cv-section-gap, 16px)' }}>
              {renderZone('header', 'w-full min-w-0')}
            </div>
          )}
          <div className="flex flex-1 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: 0 }}>
            <div className="flex-1 min-w-0">{renderZone('left', 'h-max')}</div>
            <div className="flex-1 min-w-0">{renderZone('right', 'h-max')}</div>
          </div>
        </div>
      );
    case 'sidebar-left':
    case 'sidebar-left-dark':
      return (
        <div className={`w-full h-full flex relative cv-document ${formatClass}`} style={{ ...wrapperStyle, padding: 'var(--cv-page-margin)', backgroundColor: '#ffffff' }}>
          <div className="absolute left-0 top-0 bottom-0 z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% + 0.36 * var(--cv-page-margin))' }}></div>
          <div className={`w-[32%] min-w-0 relative z-10 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingRight: '5mm' }}>
            {renderZone('sidebar', 'h-max', isDarkSidebar)}
          </div>
          <div className="w-[68%] min-w-0 relative z-10" style={{ paddingLeft: '5mm' }}>
            {renderZone('main', 'h-max')}
          </div>
        </div>
      );
    case 'sidebar-right':
      return (
        <div className={`w-full h-full flex relative cv-document ${formatClass}`} style={{ ...wrapperStyle, padding: 'var(--cv-page-margin)', backgroundColor: '#ffffff' }}>
          <div className="absolute right-0 top-0 bottom-0 z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% + 0.36 * var(--cv-page-margin))' }}></div>
          <div className="w-[68%] min-w-0 relative z-10" style={{ paddingRight: '5mm' }}>
            {renderZone('main', 'h-max')}
          </div>
          <div className={`w-[32%] min-w-0 relative z-10 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingLeft: '5mm' }}>
            {renderZone('sidebar', 'h-max', isDarkSidebar)}
          </div>
        </div>
      );
    case 'top-sidebar-right':
      return (
        <div className={`w-full h-full flex flex-col relative cv-document ${formatClass}`} style={{ ...wrapperStyle, minHeight: 'var(--cv-page-height)', backgroundColor: '#ffffff' }}>
          {(template.zones['header'] || []).length > 0 && (
            <div className="relative z-10" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>
              {renderZone('header', 'w-full min-w-0')}
            </div>
          )}
          <div className="flex flex-1 relative z-10 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: 'var(--cv-section-gap, 16px)' }}>
            <div className="w-[68%] min-w-0">{renderZone('main', 'h-max')}</div>
            <div className="absolute right-[var(--cv-page-margin)] top-[var(--cv-section-gap,16px)] bottom-0 rounded-lg z-[-1]" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% - 16px)' }}></div>
            <div className={`w-[32%] min-w-0 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingLeft: '5mm' }}>
              {renderZone('sidebar', 'h-max', isDarkSidebar)}
            </div>
          </div>
        </div>
      );
    case 'top-sidebar-left':
      return (
        <div className={`w-full h-full flex flex-col relative cv-document ${formatClass}`} style={{ ...wrapperStyle, minHeight: 'var(--cv-page-height)', backgroundColor: '#ffffff' }}>
          {(template.zones['header'] || []).length > 0 && (
            <div className="relative z-10" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>
              {renderZone('header', 'w-full min-w-0')}
            </div>
          )}
          <div className="flex flex-1 relative z-10 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: 'var(--cv-section-gap, 16px)' }}>
            <div className="absolute left-[var(--cv-page-margin)] top-[var(--cv-section-gap,16px)] bottom-0 rounded-lg z-[-1]" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% - 16px)' }}></div>
            <div className={`w-[32%] min-w-0 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingRight: '5mm' }}>
              {renderZone('sidebar', 'h-max', isDarkSidebar)}
            </div>
            <div className="w-[68%] min-w-0">{renderZone('main', 'h-max')}</div>
          </div>
        </div>
      );
    case 'hybrid-split':
      return (
        <div className={`w-full h-full flex flex-col cv-document ${formatClass}`} style={{ ...wrapperStyle, minHeight: 'var(--cv-page-height)', backgroundColor: '#ffffff' }}>
          {(template.zones['header'] || []).length > 0 && (
            <div style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>
              {renderZone('header', 'w-full min-w-0')}
            </div>
          )}
          {(template.zones['main'] || []).length > 0 && (
            <div style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingTop: (template.zones['header'] || []).length > 0 ? 'var(--cv-section-gap, 16px)' : 'var(--cv-page-margin)', paddingBottom: 0 }}>
              {renderZone('main', 'w-full min-w-0')}
            </div>
          )}
          <div className="flex flex-1 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: (template.zones['main'] || []).length > 0 || (template.zones['header'] || []).length > 0 ? 'var(--cv-section-gap, 16px)' : 'var(--cv-page-margin)' }}>
            <div className="flex-1 min-w-0">{renderZone('left', 'h-max')}</div>
            <div className="flex-1 min-w-0">{renderZone('right', 'h-max')}</div>
          </div>
        </div>
      );
    default: return <div>Layout not found</div>;
  }
};

// ==========================================
