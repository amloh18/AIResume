'use client';


import React, { useRef, useEffect, useState } from 'react';
import { ImageIcon, Plus, RefreshCw, ChevronUp, ChevronDown, Trash2, GripVertical, PlusCircle, Wand2, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { SNIPPETS, TITLE_STYLES } from '../registry';
import { getNestedValue, escapeRegExp, formatCVDate } from '../helpers';
import { motion, AnimatePresence } from 'framer-motion';

// CORE UI COMPONENTS
// ==========================================

export const CanvasContext = React.createContext<any>(null);

export const EditableField = ({ data: explicitData, path, multiline, onChange: explicitOnChange, setFocusedRef: explicitSetFocusedRef, readOnly, nowrap, breakAll, aiIssues: explicitAiIssues, activeIssueId: explicitActiveIssueId, onIssueClick: explicitOnIssueClick, isDate = false, dateFormat: explicitDateFormat }: any) => {
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
  const value = getNestedValue(data, path) || '';

  const isEditable = !readOnly && !moriChatMode;

  useEffect(() => {
    if (contentRef.current) {
      let displayValue = typeof value === 'string' ? value : '';
      
      if (isDate) {
        displayValue = formatCVDate(value, dateFormat);
      }
      
      // Fix pasted white text issues by removing bad tags and inline styles
      if (displayValue) {
        displayValue = displayValue.replace(/<\/?(?:span|div|font|label)[^>]*>/gi, '');
        displayValue = displayValue.replace(/\s*style="[^"]*"/gi, '');
        displayValue = displayValue.replace(/\s*style='[^']*'/gi, '');
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
      
    onChange(path, cleanHtml);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (!multiline && e.key === 'Enter') e.preventDefault(); };
  const handleFocus = () => { if (!isEditable) return; setIsEditing(true); if (setFocusedRef) setFocusedRef(contentRef.current); };
  const handleBlur = () => { if (!isEditable) return; setIsEditing(false); if (setFocusedRef) setTimeout(() => setFocusedRef(null), 200); };
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
  if (nowrap) wrapClass = 'whitespace-nowrap';
  if (breakAll) wrapClass = 'break-all whitespace-normal';
  if (multiline) wrapClass = 'break-words whitespace-pre-wrap';

  let emptyText = "Type here...";
  const lowerPath = path?.toLowerCase() || '';
  
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
  const editHoverClass = isEditable ? 'hover:bg-emerald-50/30 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:shadow-md border-b border-transparent hover:border-gray-300 focus:border-emerald-400 focus:text-gray-900 dark:focus:text-white rounded-sm px-1.5 py-0.5 -mx-1.5 -my-0.5' : '';

  return (
      <span ref={contentRef} data-path={path} data-empty-text={emptyText} contentEditable={isEditable} suppressContentEditableWarning onPaste={handlePaste} onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} onBlur={handleBlur} onClick={handleClick} className={`outline-none transition-all duration-200 ${multiline ? 'block w-full' : 'inline-block max-w-full'} ${wrapClass} ${moriHoverClass} ${editHoverClass} z-40 relative empty:min-w-[60px] ${multiline ? 'empty:block' : 'empty:inline-block'} empty:border-dashed empty:border-gray-300 empty:after:content-[attr(data-empty-text)] empty:after:text-gray-400 empty:after:text-xs empty:after:italic`} style={{ minHeight: '1.2em' }} />
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
        className="fixed z-50 bg-transparent backdrop-blur-md shadow-xl border border-gray-200/40 dark:border-white/10 rounded-xl flex items-center p-1 gap-0.5 transform -translate-x-1/2 transition-all duration-300 animate-fade-in-up font-sans" 
        style={{ top: pos.top, left: pos.left }} 
        onMouseDown={(e) => e.preventDefault()}
      >
        {canSuggestSkills && (
          <>
            <button 
              onClick={(e) => { e.preventDefault(); onSuggestPoint('skills'); }} 
              className="h-7 px-2.5 bg-transparent hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold text-[11px] border border-emerald-500/20 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm rounded-lg" 
              title="Get AI skill suggestions"
            >
              <Wand2 size={12} className="animate-pulse" />
              AI Skills
            </button>
            <div className="w-px h-4 bg-gray-200/40 dark:bg-white/10 mx-1"></div>
          </>
        )}
        {canSuggest && !canSuggestSkills && (
          <>
            <button 
              onClick={(e) => { e.preventDefault(); onSuggestPoint(); }} 
              className="h-7 px-2.5 bg-transparent hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold text-[11px] border border-emerald-500/20 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm rounded-lg" 
              title="Suggest Contextual Point"
            >
              <Wand2 size={12} className="animate-pulse" />
              ✨ Suggest
            </button>
            <div className="w-px h-4 bg-gray-200/40 dark:bg-white/10 mx-1"></div>
          </>
        )}
        <button 
          onClick={(e) => execCmd(e, 'bold')} 
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:scale-125 active:scale-90 bg-transparent" 
          title="Bold"
        >
          <Bold size={13} />
        </button>
        <button 
          onClick={(e) => execCmd(e, 'italic')} 
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:scale-125 active:scale-90 bg-transparent" 
          title="Italic"
        >
          <Italic size={13} />
        </button>
        <button 
          onClick={(e) => execCmd(e, 'underline')} 
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:scale-125 active:scale-90 bg-transparent" 
          title="Underline"
        >
          <Underline size={13} />
        </button>
        <div className="w-px h-4 bg-gray-250 dark:bg-white/10 mx-1"></div>
        <button 
          onClick={(e) => execCmd(e, 'insertUnorderedList')} 
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:scale-125 active:scale-90 bg-transparent" 
          title="Bullet List"
        >
          <List size={13} />
        </button>
        <div className="w-px h-4 bg-gray-250 dark:bg-white/10 mx-1"></div>
        <button 
          onClick={(e) => execCmd(e, 'justifyLeft')} 
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:scale-125 active:scale-90 bg-transparent" 
          title="Align Left"
        >
          <AlignLeft size={13} />
        </button>
        <button 
          onClick={(e) => execCmd(e, 'justifyCenter')} 
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:scale-125 active:scale-90 bg-transparent" 
          title="Align Center"
        >
          <AlignCenter size={13} />
        </button>
        <button 
          onClick={(e) => execCmd(e, 'justifyRight')} 
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:scale-125 active:scale-90 bg-transparent" 
          title="Align Right"
        >
          <AlignRight size={13} />
        </button>
        <button 
          onClick={(e) => execCmd(e, 'justifyFull')} 
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:scale-125 active:scale-90 bg-transparent" 
          title="Justify"
        >
          <AlignJustify size={13} />
        </button>
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

export const CanvasSnippet = ({ readOnly = false, instance, index, zoneId, cvData, EditableWrapper, moveSnippet, removeSnippet, onReplace, onTogglePhoto, onAddListEntry, moveEntry, deleteEntry, dragState, isDark, activeTemplate, layoutZones, onOpenSkillsSuggestions, isDropAllowed }: any) => {
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
  const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
  const showDropLine = !readOnly && isDropTarget && !(dragState.sourceZoneId === zoneId && (dragState.overIndex === dragState.sourceIndex || dragState.overIndex === dragState.sourceIndex + 1));
  const zoneBlockCount = Array.isArray(layoutZones?.[zoneId]) ? layoutZones[zoneId].length : 0;
  const isLastSnippetInZone = index === Math.max(0, zoneBlockCount - 1);

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
    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'canvas', zoneId, index, instance }));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
    document.dispatchEvent(new CustomEvent('snippet-drag-start', {
      detail: {
        zoneId,
        index,
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

  const Title = ({ titleKey, overrideClass }: any) => {
    const isSidebar = ['sidebar', 'left', 'right'].includes(zoneId);
    const styleKey = isSidebar && activeTemplate?.sidebarTitleStyle ? activeTemplate.sidebarTitleStyle : activeTemplate?.titleStyle;
    const Renderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];

    if (overrideClass) {
      return <h3 className={overrideClass}><EditableWrapper path={`sectionTitles.${titleKey}`} nowrap /></h3>;
    }

    return <Renderer isDark={isDark} showIcons={ctx?.design?.showHeaderIcons ?? true} titleKey={titleKey}><EditableWrapper path={`sectionTitles.${titleKey}`} nowrap /></Renderer>;
  };

  const showInlineControls = !readOnly && !ctx?.moriChatMode && primaryTitleKey;
  const canAddListEntry = SnippetComponent && ['Experience', 'Education', 'Projects', 'Certifications', 'Awards', 'Publications', 'Volunteer', 'References'].includes(SnippetComponent.category);
  const controls = showInlineControls ? (
    <div className="absolute -top-4 right-0 opacity-0 group-hover/inner:opacity-100 transition-all duration-200 flex items-center bg-transparent backdrop-blur-md border border-gray-200/40 dark:border-white/10 shadow-lg rounded-xl p-1 gap-0.5 z-[50] no-print font-sans">
      {isHeader && (
        <button 
          onClick={onTogglePhoto} 
          className="flex items-center gap-1 h-7 px-2 text-blue-600 dark:text-blue-400 font-bold text-[11px] transition-all duration-200 rounded-lg hover:scale-110 active:scale-95 bg-transparent" 
          title="Toggle Photo"
        >
          <ImageIcon size={12}/> 
          {!isNarrow && 'Photo'}
        </button>
      )}
      {canAddListEntry && (
        <button 
          onClick={() => onAddListEntry(SnippetComponent.category)} 
          className={`flex items-center gap-1 h-7 px-2 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] transition-all duration-200 rounded-lg hover:scale-110 active:scale-95 bg-transparent ${isHeader ? 'border-l border-gray-200/30' : ''}`}
        >
          <Plus size={12}/> 
          {!isNarrow && 'Add'}
        </button>
      )}
      {isSkillsSnippet && (
        <button 
          onClick={onOpenSkillsSuggestions} 
          className="flex items-center gap-1 h-7 px-2 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border-l border-gray-200/30 transition-all duration-200 rounded-lg hover:scale-110 active:scale-95 bg-transparent" 
          title="Get AI skill suggestions"
        >
          <Wand2 size={12}/> 
          {!isNarrow && 'AI Skills'}
        </button>
      )}
      <button 
        onClick={() => onReplace(zoneId, index, instance.type)} 
        className="flex items-center gap-1 h-7 px-2 text-blue-600 dark:text-blue-400 font-bold text-[11px] border-l border-gray-200/30 transition-all duration-200 rounded-lg hover:scale-110 active:scale-95 bg-transparent"
      >
        <RefreshCw size={12}/> 
        {!isNarrow && 'Replace'}
      </button>
      {!isHeader && (
        <>
          <button 
            onClick={() => moveSnippet(zoneId, index, -1)} 
            className="w-7 h-7 flex items-center justify-center text-blue-600 dark:text-blue-400 border-l border-gray-200/30 transition-all duration-200 rounded-lg hover:scale-125 active:scale-90 bg-transparent" 
            title="Move Section Up"
          >
            <ChevronUp size={13}/>
          </button>
          <button 
            onClick={() => moveSnippet(zoneId, index, 1)} 
            className="w-7 h-7 flex items-center justify-center text-blue-600 dark:text-blue-400 border-l border-gray-200/30 transition-all duration-200 rounded-lg hover:scale-125 active:scale-90 bg-transparent" 
            title="Move Section Down"
          >
            <ChevronDown size={13}/>
          </button>
          <button 
            onClick={handleRemoveSnippet} 
            className={`w-7 h-7 flex items-center justify-center border-l border-gray-200/30 transition-all duration-200 rounded-lg hover:scale-125 active:scale-90 ${
              confirmingRemove 
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20' 
                : 'bg-transparent text-red-500'
            }`} 
            title={confirmingRemove ? 'Click again to delete section' : 'Delete Section'} 
            aria-label={confirmingRemove ? 'Confirm delete section' : 'Delete section'}
          >
            <Trash2 size={13}/>
          </button>
          <div 
            className="w-7 h-7 flex items-center justify-center cursor-grab text-blue-600 dark:text-blue-400 transition-all duration-200 rounded-lg hover:scale-125 border-l border-gray-200/30 bg-transparent" 
            title="Drag to reorder"
          >
            <GripVertical size={13}/>
          </div>
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

  const content = SnippetComponent.render({ data: cvData, Editable: EditableWrapper, zoneId, isDark, Title, moveEntry, deleteEntry, showIcons: ctx?.design?.showContactIcons ?? true, design: ctx?.design, activeTemplate, layoutZones, readOnly });
  
  const moriHoverClass = ctx?.moriChatMode ? 'hover:bg-emerald-500/10 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.4)] cursor-pointer rounded-lg transition-all' : '';
  
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: isBeingDragged ? 0 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -10 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 35, 
        opacity: { duration: 0.25 },
        y: { type: 'spring', stiffness: 350, damping: 30 }
      }}
      draggable={!isHeader && !readOnly && !ctx?.moriChatMode}
      onDragStart={handleDragStart as any}
      onDragEnd={handleDragEnd as any}
      onDragOver={handleDragOver as any}
      className={`relative group/snippet ${!isHeader && !readOnly && !ctx?.moriChatMode ? 'cursor-move' : ''} ${showDropLine ? 'mt-10' : 'mt-0'} ${moriHoverClass}`}
      style={isHeader ? {} : { marginBottom: isLastSnippetInZone ? 0 : 'var(--cv-section-gap, 16px)', visibility: isBeingDragged ? 'hidden' : 'visible' }}
      onClick={handleMoriClick}
    >
      {showDropLine && (
        <div className="absolute -top-8 left-0 w-full min-h-[30px] rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/95 shadow-[0_0_0_1px_rgba(16,185,129,0.1),0_10px_30px_rgba(16,185,129,0.12)] flex items-center justify-center pointer-events-none z-30 animate-pulse">
          <span className="px-3 py-1 rounded-full bg-white text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Drop Section Here</span>
        </div>
      )}
      <div className={`relative hover:z-30 group/inner w-full`}>
        {controls}
        <div className={`px-2 py-1 pointer-events-auto snippet-content relative z-10 w-full ${!content && !readOnly ? 'min-h-[60px] flex flex-col justify-center' : ''}`}>
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
    </motion.div>
  );
};

const InsertSnippetHandle = ({ onAddSnippet, zoneId, index }: any) => {
  return (
    <div className="group/insert relative w-full h-[6px] my-[-3px] flex items-center justify-center z-40 transition-all no-print">
      <div className="absolute inset-0 cursor-pointer" />
      <div className="w-full h-[2px] bg-emerald-400 opacity-0 group-hover/insert:opacity-100 transition-opacity pointer-events-none absolute left-0 right-0" />
      <button
        onClick={() => onAddSnippet(zoneId, index)}
        className="opacity-0 scale-90 group-hover/insert:opacity-100 group-hover/insert:scale-100 transition-all flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-2.5 py-1 rounded-full text-[10px] shadow-md hover:shadow-lg font-sans absolute left-1/2 -translate-x-1/2 cursor-pointer pointer-events-auto"
      >
        <Plus size={11} /> Add Section
      </button>
    </div>
  );
};

export const CanvasZone = ({ readOnly = false, zoneId, blocks, cvData, EditableWrapper, handleDrop, moveSnippet, removeSnippet, onReplace, onAddSnippet, onTogglePhoto, onAddListEntry, moveEntry, deleteEntry, dragState, activeTemplate, layoutZones, isDark = false, className = "", onOpenSkillsSuggestions, isDropAllowed }: any) => {
  const [isOverZone, setIsOverZone] = useState(false);
  const [dropIntent, setDropIntent] = useState<'valid' | 'invalid' | null>(null);
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
  const dragHighlightClass = isDragging && !readOnly ? 'min-h-[120px] border-2 border-dashed rounded-2xl bg-gray-50/40' : 'min-h-[100px]';
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
        {blocks.length === 0 && !readOnly && <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center text-sm text-gray-400 pointer-events-none border-2 border-dashed border-gray-200 rounded-2xl m-2 no-print"><span className="font-semibold text-gray-500">Empty Zone</span><span className="text-xs uppercase tracking-[0.22em]">{dropIntent === 'invalid' ? 'Not Allowed Here' : 'Drop A Section Here'}</span></div>}
        <div className="flex flex-col gap-0">
          <AnimatePresence mode="popLayout">
            {blocks.map((instance: any, index: number) => (
              <React.Fragment key={instance?.id || `snippet-${index}`}>
                {index > 0 && (
                  <InsertSnippetHandle
                    onAddSnippet={onAddSnippet}
                    zoneId={zoneId}
                    index={index}
                  />
                )}
                <CanvasSnippet
                  readOnly={readOnly}
                  instance={instance}
                  index={index}
                  zoneId={zoneId}
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
                />
              </React.Fragment>
            ))}
          </AnimatePresence>
        </div>
        {showAppendLine && <div className="w-full min-h-[34px] bg-emerald-50/95 border-2 border-dashed border-emerald-400 rounded-xl mt-4 pointer-events-none shadow-[0_10px_30px_rgba(16,185,129,0.12)] flex items-center justify-center"><span className="px-3 py-1 rounded-full bg-white text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Insert Here</span></div>}
      </div>
      {!readOnly && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover/zone:opacity-100 transition-opacity flex justify-center z-50 no-print pointer-events-none">
          <button onClick={() => onAddSnippet(zoneId)} className="pointer-events-auto flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-full text-[11px] shadow-md hover:shadow-lg transition-all transform hover:scale-105 font-sans"><PlusCircle size={14} /> Add Section</button>
        </div>
      )}
    </div>
  );
};

export const StaticLayoutRenderer = ({ template, cvData, ReadOnlyWrapper, design }: any) => {
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
  const wrapperStyle = { '--cv-font': defaultDesign.font, '--cv-base-size': `${defaultDesign.fontSize}px`, '--cv-spacing': defaultDesign.spacing, '--cv-accent': defaultDesign.accentColor, '--cv-page-margin': `${defaultDesign.pageMargin}px`, '--cv-sidebar-bg': defaultDesign.sidebarBgColor, '--cv-section-gap': `${defaultDesign.sectionGap}px` } as React.CSSProperties;

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
          return <div key={index} className="cv-page-breakable pointer-events-none" style={{ marginBottom: isLastSnippet ? 0 : 'var(--cv-section-gap, 16px)' }}><SnippetComponent.render data={cvData} Editable={ReadOnlyWrapper} zoneId={zoneId} isDark={isDark} Title={Title} moveEntry={() => {}} deleteEntry={() => {}} showIcons={defaultDesign.showContactIcons} design={defaultDesign} readOnly={true} /></div>;
        })}
      </div>
    );
  };
  switch (template.type) {
    case '1-col': return <div className={`w-full h-full cv-document ${formatClass}`} style={{ ...wrapperStyle, padding: '57px 76px', backgroundColor: '#ffffff' }}>{renderZone('main', 'w-full min-w-0')}</div>;
    case '2-col': return <div className={`w-full h-full flex flex-col cv-document ${formatClass}`} style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}>{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 items-start px-[76px] pb-[57px] pt-0 gap-8"><div className="flex-1 min-w-0">{renderZone('left', 'h-full')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-full')}</div></div></div>;
    case 'sidebar-left': return <div className={`w-full h-full flex cv-document ${formatClass}`} style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}><div className="w-[32%] min-w-0 border-r border-slate-200 pl-[76px] pr-[19px] py-[57px]" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}>{renderZone('sidebar', 'h-full', false)}</div><div className="w-[68%] min-w-0 pl-[19px] pr-[76px] py-[57px]">{renderZone('main', 'h-full')}</div></div>;
    case 'sidebar-left-dark': return <div className={`w-full h-full flex cv-document ${formatClass}`} style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}><div className="w-[32%] min-w-0 pl-[76px] pr-[19px] py-[57px]" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}>{renderZone('sidebar', 'h-full', true)}</div><div className="w-[68%] min-w-0 pl-[19px] pr-[76px] py-[57px]">{renderZone('main', 'h-full')}</div></div>;
    case 'sidebar-right': return <div className={`w-full h-full flex cv-document ${formatClass}`} style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}><div className="w-[68%] min-w-0 pl-[76px] pr-[19px] py-[57px]">{renderZone('main', 'h-full')}</div><div className="w-[32%] min-w-0 border-l border-slate-200 pl-[19px] pr-[76px] py-[57px]" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}>{renderZone('sidebar', 'h-full', false)}</div></div>;
    case 'top-sidebar-right': return <div className={`w-full h-full flex flex-col cv-document ${formatClass}`} style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}>{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 items-start px-[76px] pb-[57px] pt-0 gap-8"><div className="w-[68%] min-w-0">{renderZone('main', 'h-full')}</div><div className="w-[32%] min-w-0 border-l border-slate-200 pl-[19px] py-4 -my-4 rounded-lg" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}>{renderZone('sidebar', 'h-full', false)}</div></div></div>;
    case 'top-sidebar-left': return <div className={`w-full h-full flex flex-col cv-document ${formatClass}`} style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}>{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 items-start px-[76px] pb-[57px] pt-0 gap-8"><div className="w-[32%] min-w-0 border-r border-slate-200 pr-[19px] py-4 -my-4 rounded-lg" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}>{renderZone('sidebar', 'h-full', false)}</div><div className="w-[68%] min-w-0">{renderZone('main', 'h-full')}</div></div></div>;
    case 'hybrid-split': return <div className={`w-full h-full flex flex-col cv-document ${formatClass}`} style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}>{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="px-[76px] pt-0 pb-0">{renderZone('main', 'w-full min-w-0')}</div><div className="flex flex-1 items-start px-[76px] pb-[57px] pt-0 gap-8"><div className="flex-1 min-w-0">{renderZone('left', 'h-full')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-full')}</div></div></div>;
    default: return <div>Layout not found</div>;
  }
};

// ==========================================
