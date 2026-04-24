'use client';


import React, { useRef, useEffect, useState } from 'react';
import { ImageIcon, Plus, RefreshCw, ChevronUp, ChevronDown, Trash2, GripVertical, PlusCircle, Wand2, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { SNIPPETS, TITLE_STYLES } from '../registry';
import { getNestedValue, escapeRegExp } from '../helpers';

// CORE UI COMPONENTS
// ==========================================

export const CanvasContext = React.createContext<any>(null);

export const EditableField = ({ data: explicitData, path, multiline, onChange: explicitOnChange, setFocusedRef: explicitSetFocusedRef, readOnly, nowrap, breakAll, aiIssues: explicitAiIssues, activeIssueId: explicitActiveIssueId, onIssueClick: explicitOnIssueClick }: any) => {
  const ctx = React.useContext(CanvasContext);
  
  const data = explicitData || (readOnly ? ctx?.cvData : ctx?.cvData);
  const onChange = explicitOnChange || ctx?.handleDataChange;
  const setFocusedRef = explicitSetFocusedRef || ctx?.setFocusedNode;
  const aiIssues = explicitAiIssues || ctx?.aiIssues || [];
  const activeIssueId = explicitActiveIssueId || ctx?.activeIssueId;
  const onIssueClick = explicitOnIssueClick || ctx?.onIssueClick;

  const contentRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const value = getNestedValue(data, path) || '';

  useEffect(() => {
    if (!isEditing && contentRef.current) {
      let displayValue = typeof value === 'string' ? value : '';
      
      // Fix pasted white text issues by removing bad tags and inline styles
      if (displayValue) {
        displayValue = displayValue.replace(/<\/?(?:span|div|font|label)[^>]*>/gi, '');
        displayValue = displayValue.replace(/\s*style="[^"]*"/gi, '');
        displayValue = displayValue.replace(/\s*style='[^']*'/gi, '');
      }

      const relevantIssues = aiIssues.filter((i: any) => i.path === path);
      if (relevantIssues.length > 0) {
        relevantIssues.forEach((issue: any) => {
          if (issue.targetText) {
            const regex = new RegExp(`(${escapeRegExp(issue.targetText)})`, 'g');
            const highlightClass = issue.id === activeIssueId ? 'bg-yellow-300 text-black shadow-sm' : 'bg-yellow-100/70 border-b-2 border-yellow-400 cursor-pointer text-gray-900';
            displayValue = displayValue.replace(regex, `<mark class="${highlightClass} rounded-sm px-0.5 transition-all" data-issue="${issue.id}">$1</mark>`);
          }
        });
      }
      contentRef.current.innerHTML = displayValue;
    }
  }, [value, isEditing, aiIssues, activeIssueId, path]);

  const handleInput = () => !readOnly && contentRef.current && onChange(path, contentRef.current.innerHTML);
  const handleKeyDown = (e: React.KeyboardEvent) => { if (!multiline && e.key === 'Enter') e.preventDefault(); };
  const handleFocus = () => { if (readOnly) return; setIsEditing(true); if (setFocusedRef) setFocusedRef(contentRef.current); };
  const handleBlur = () => { if (readOnly) return; setIsEditing(false); if (setFocusedRef) setTimeout(() => setFocusedRef(null), 200); };
  const handleClick = (e: React.MouseEvent) => { if ((e.target as HTMLElement).tagName === 'MARK' && onIssueClick) onIssueClick((e.target as HTMLElement).getAttribute('data-issue')); };
  const handlePaste = (e: React.ClipboardEvent) => {
    if (readOnly) return;
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

  let emptyText = "Click to type...";
  const lowerPath = path?.toLowerCase() || '';
  if (lowerPath.includes('summary')) emptyText = "Click to type summary...";
  else if (lowerPath.includes('description')) emptyText = "Click to type work summary...";
  else if (lowerPath.includes('skills')) emptyText = "Click to type skills...";
  else if (lowerPath.includes('position')) emptyText = "Click to type role...";
  else if (lowerPath.includes('name')) emptyText = "Click to type name...";
  else if (lowerPath.includes('date')) emptyText = "Click to type date...";

  return (
      <span ref={contentRef} data-path={path} data-empty-text={emptyText} contentEditable={!readOnly} suppressContentEditableWarning onPaste={handlePaste} onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} onBlur={handleBlur} onClick={handleClick} className={`outline-none transition-all duration-200 inline-block max-w-full ${wrapClass} ${!readOnly ? 'hover:bg-emerald-50/30 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:shadow-md border-b border-transparent hover:border-gray-300 focus:border-emerald-400 focus:text-gray-900 dark:focus:text-white rounded-sm px-1.5 py-0.5 -mx-1.5 -my-0.5 z-40 relative empty:min-w-[60px] empty:inline-block empty:border-dashed empty:border-gray-300 empty:after:content-[attr(data-empty-text)] empty:after:text-gray-400 empty:after:text-xs empty:after:italic' : ''}`} style={{ minHeight: '1.2em' }} />
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
          setCanSuggest(!!isBulletContext);
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
      <div className="fixed z-50 bg-white shadow-2xl border border-gray-200 rounded-lg flex items-center p-1.5 gap-1 transform -translate-x-1/2 transition-all duration-200 animate-fade-in-up font-sans" style={{ top: pos.top, left: pos.left }} onMouseDown={(e) => e.preventDefault()}>
        {canSuggestSkills && (<><button onClick={(e) => { e.preventDefault(); onSuggestPoint(); }} className="py-1.5 px-2 hover:bg-emerald-50 rounded text-emerald-600 flex items-center gap-1.5 font-bold text-xs border border-emerald-200 transition-colors" title="Suggest Skills"><Wand2 size={14}/> ✨ Suggest Skills</button><div className="w-px h-5 bg-gray-200 mx-1"></div></>)}
        {canSuggest && !canSuggestSkills && (<><button onClick={(e) => { e.preventDefault(); onSuggestPoint(); }} className="py-1.5 px-2 hover:bg-emerald-50 rounded text-emerald-600 flex items-center gap-1.5 font-bold text-xs border border-emerald-200 transition-colors" title="Suggest Contextual Point"><Wand2 size={14}/> ✨ Suggest</button><div className="w-px h-5 bg-gray-200 mx-1"></div></>)}
      <button onClick={(e) => execCmd(e, 'bold')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors" title="Bold"><Bold size={16}/></button>
      <button onClick={(e) => execCmd(e, 'italic')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors" title="Italic"><Italic size={16}/></button>
      <button onClick={(e) => execCmd(e, 'underline')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors" title="Underline"><Underline size={16}/></button>
      <div className="w-px h-5 bg-gray-200 mx-1"></div>
      <button onClick={(e) => execCmd(e, 'insertUnorderedList')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors" title="Bullet List"><List size={16}/></button>
      <div className="w-px h-5 bg-gray-200 mx-1"></div>
      <button onClick={(e) => execCmd(e, 'justifyLeft')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors" title="Align Left"><AlignLeft size={16}/></button>
      <button onClick={(e) => execCmd(e, 'justifyCenter')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors" title="Align Center"><AlignCenter size={16}/></button>
      <button onClick={(e) => execCmd(e, 'justifyRight')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors" title="Align Right"><AlignRight size={16}/></button>
      <button onClick={(e) => execCmd(e, 'justifyFull')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors" title="Justify"><AlignJustify size={16}/></button>
    </div>
  );
};

export const CanvasSnippet = ({ readOnly = false, instance, index, zoneId, cvData, EditableWrapper, moveSnippet, removeSnippet, onReplace, onTogglePhoto, onAddListEntry, moveEntry, deleteEntry, dragState, isDark, activeTemplate, layoutZones }: any) => {
  const ctx = React.useContext(CanvasContext);
  if (!instance || !instance.type) return null;
  const SnippetComponent = SNIPPETS[instance.type] || SNIPPETS['summary-clean']; // Fallback
  if (!SnippetComponent) return null; // Safe guard if fallback fails
  const isDropTarget = dragState?.overZoneId === zoneId && dragState?.overIndex === index;
  const isBeingDragged = dragState?.isDragging && dragState?.sourceZoneId === zoneId && dragState?.sourceIndex === index;
  const isHeader = SnippetComponent?.category === 'Header';
  const primaryTitleKey = (SnippetComponent?.category || '').toLowerCase();
  const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
  const showDropLine = !readOnly && isDropTarget && !(dragState.sourceZoneId === zoneId && (dragState.overIndex === dragState.sourceIndex || dragState.overIndex === dragState.sourceIndex + 1));

  const handleDragStart = (e: React.DragEvent) => {
    if (isHeader || readOnly) return;
    const ghost = (e.currentTarget as HTMLElement).cloneNode(true) as HTMLElement;
    ghost.style.backgroundColor = isDark ? '#1f2937' : '#ffffff';
    ghost.style.color = isDark ? 'white' : 'black';
    ghost.style.padding = '20px';
    ghost.style.borderRadius = '12px';
    ghost.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.5)';
    ghost.style.width = `${(e.currentTarget as HTMLElement).offsetWidth}px`;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 20, 20);
    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'canvas', zoneId, index, instance }));
    setTimeout(() => { document.body.removeChild(ghost); document.dispatchEvent(new CustomEvent('snippet-drag-start', { detail: { zoneId, index } })); }, 10);
  };
  const handleDragEnd = () => document.dispatchEvent(new CustomEvent('snippet-drag-end'));
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isHeader || readOnly) return;
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
    const showInlineControls = !readOnly && titleKey === primaryTitleKey;
    const canAddListEntry = SnippetComponent && ['Experience', 'Education', 'Projects', 'Certifications', 'Awards', 'Publications', 'Volunteer', 'References'].includes(SnippetComponent.category);

    const controls = showInlineControls ? (
      <div className="absolute -top-8 -right-2 opacity-0 group-hover/inner:opacity-100 transition-opacity flex items-center bg-white border border-gray-200 shadow-sm rounded-md overflow-hidden z-[25] no-print font-sans">
        {isHeader && <button onClick={onTogglePhoto} className="flex items-center gap-1.5 px-2 md:px-3 py-2 hover:bg-[#eff6ff] text-[#3b82f6] font-medium text-[12px] md:text-[13px] transition-colors bg-white" title="Toggle Photo"><ImageIcon size={14}/> {!isNarrow && 'Photo'}</button>}
        {canAddListEntry && <button onClick={() => onAddListEntry(SnippetComponent.category)} className="flex items-center gap-1.5 px-2 md:px-3 py-2 hover:bg-[#f0fdf4] text-emerald-600 font-medium text-[12px] md:text-[13px] border-l border-[#3b82f6]/20 transition-colors bg-white"><Plus size={14}/> {!isNarrow && 'Add'}</button>}
        <button onClick={() => onReplace(zoneId, index, instance.type)} className="flex items-center gap-1.5 px-2 md:px-3 py-2 hover:bg-[#eff6ff] text-[#3b82f6] font-medium text-[12px] md:text-[13px] border-l border-[#3b82f6]/20 transition-colors bg-white"><RefreshCw size={14}/> {!isNarrow && 'Replace'}</button>
        {!isHeader && (
          <>
            <button onClick={() => moveSnippet(zoneId, index, -1)} className="px-1.5 md:px-2.5 py-1 hover:bg-[#eff6ff] text-[#3b82f6] border-l border-[#3b82f6]/20 transition-colors h-full bg-white" title="Move Section Up"><ChevronUp size={16}/></button>
            <button onClick={() => moveSnippet(zoneId, index, 1)} className="px-1.5 md:px-2.5 py-1 hover:bg-[#eff6ff] text-[#3b82f6] border-l border-[#3b82f6]/20 transition-colors h-full bg-white" title="Move Section Down"><ChevronDown size={16}/></button>
            <button onClick={() => removeSnippet(zoneId, index)} className="px-1.5 md:px-2.5 py-1 hover:bg-red-50 text-red-500 border-l border-[#3b82f6]/20 transition-colors h-full bg-white" title="Delete Section"><Trash2 size={16}/></button>
            <div className="px-1.5 md:px-2.5 py-1 cursor-grab text-[#3b82f6] hover:bg-[#eff6ff] transition-colors h-full flex items-center bg-white border-l border-[#3b82f6]/20" title="Drag to reorder"><GripVertical size={16}/></div>
          </>
        )}
      </div>
    ) : null;

    if (overrideClass) {
      return (
        <div className="relative">
          <h3 className={overrideClass}><EditableWrapper path={`sectionTitles.${titleKey}`} nowrap /></h3>
          {controls}
        </div>
      );
    }

    return (
      <div className="relative">
        <Renderer isDark={isDark} showIcons={ctx?.design?.showIcons ?? true} titleKey={titleKey}><EditableWrapper path={`sectionTitles.${titleKey}`} nowrap /></Renderer>
        {controls}
      </div>
    );
  };

  const content = SnippetComponent.render({ data: cvData, Editable: EditableWrapper, zoneId, isDark, Title, moveEntry, deleteEntry, showIcons: ctx?.design?.showIcons ?? true, design: ctx?.design, activeTemplate, layoutZones });
  return (
    <div draggable={!isHeader && !readOnly} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} className={`cv-page-breakable relative group/snippet transition-all duration-300 ease-in-out ${!isHeader && !readOnly ? 'cursor-move' : ''} snippet-anim ${isBeingDragged ? 'opacity-30 scale-95' : 'opacity-100 scale-100'} ${showDropLine ? 'mt-8' : 'mt-0'}`}>
      {showDropLine && <div className="absolute -top-6 left-0 w-full h-4 bg-emerald-50 border-2 border-dashed border-emerald-400 rounded flex items-center justify-center pointer-events-none z-30"></div>}
        <div className={`relative ${!isHeader && !readOnly ? 'mt-4' : ''} hover:z-30 group/inner`}>
        <div className={`p-2 pointer-events-auto snippet-content relative pb-2 z-10 ${!content && !readOnly ? 'min-h-[60px] flex flex-col justify-center' : ''}`}>
            {!readOnly && <div className="absolute left-[-1px] right-[-1px] top-[-1px] bottom-[-1px] bg-emerald-50/10 opacity-0 group-hover/inner:opacity-100 pointer-events-none transition-all duration-200 z-[-1] border border-transparent group-hover/inner:border-emerald-400 group-hover/inner:border-dashed shadow-none group-hover/inner:shadow-sm rounded-md group-hover/inner:rounded-tr-none group-hover/inner:rounded-tl-none transition-shadow"></div>}
          {content || (!readOnly && (
            <div className="text-center opacity-40 select-none cursor-pointer hover:opacity-80 transition-opacity p-4 border border-dashed border-gray-300 rounded-lg mt-2" onClick={() => onAddListEntry(SnippetComponent.category)}>
              <Title titleKey={SnippetComponent.category.toLowerCase()} />
              <div className="text-[11px] uppercase tracking-widest mt-3 font-bold text-gray-500 flex items-center justify-center gap-1"><PlusCircle size={14}/> Add {SnippetComponent.category}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Remove the redundant appendLine since we have the button now */}
    </div>
  );
};

export const CanvasZone = ({ readOnly = false, zoneId, blocks, cvData, EditableWrapper, handleDrop, moveSnippet, removeSnippet, onReplace, onAddSnippet, onTogglePhoto, onAddListEntry, moveEntry, deleteEntry, dragState, activeTemplate, layoutZones, isDark = false, className = "" }: any) => {
  const [isOverZone, setIsOverZone] = useState(false);
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsOverZone(true); if (e.target === e.currentTarget && !readOnly) document.dispatchEvent(new CustomEvent('snippet-drag-over', { detail: { zoneId, index: blocks.length } })); };
  const onDragLeave = () => setIsOverZone(false);
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setIsOverZone(false); if (readOnly) return; try { const dataStr = e.dataTransfer.getData('application/json'); if (dataStr) handleDrop(zoneId, JSON.parse(dataStr), dragState?.overIndex); } catch {} document.dispatchEvent(new CustomEvent('snippet-drag-end')); };
  const isAppendTarget = dragState?.overZoneId === zoneId && dragState?.overIndex === blocks.length;
  const showAppendLine = !readOnly && isAppendTarget && !(dragState.sourceZoneId === zoneId && (dragState.overIndex === dragState.sourceIndex || dragState.overIndex === dragState.sourceIndex + 1));

  return (
    <div className="relative group/zone h-full flex flex-col">
      <div className={`flex-1 min-h-[150px] transition-colors pb-10 ${isOverZone && !readOnly ? 'bg-gray-50/50' : ''} ${className}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        {blocks.length === 0 && !readOnly && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 italic pointer-events-none border-2 border-dashed border-gray-200 rounded-lg m-2 no-print">Empty Zone</div>}
        <div className="flex flex-col gap-1">
          {blocks.map((instance: any, index: number) => <CanvasSnippet readOnly={readOnly} key={instance?.id || `snippet-${index}`} instance={instance} index={index} zoneId={zoneId} cvData={cvData} EditableWrapper={EditableWrapper} moveSnippet={moveSnippet} removeSnippet={removeSnippet} onReplace={onReplace} onTogglePhoto={onTogglePhoto} onAddListEntry={onAddListEntry} moveEntry={moveEntry} deleteEntry={deleteEntry} dragState={dragState} activeTemplate={activeTemplate} layoutZones={layoutZones} isDark={isDark} />)}
        </div>
        {showAppendLine && <div className="w-full h-4 bg-emerald-50 border-2 border-dashed border-emerald-400 rounded mt-4 pointer-events-none"></div>}
      </div>
      {!readOnly && (
        <div className="opacity-0 group-hover/zone:opacity-100 transition-opacity flex justify-center py-4 relative z-10 -mt-8 no-print">
          <button onClick={() => onAddSnippet(zoneId)} className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm text-gray-700 hover:text-black font-bold px-5 py-2.5 rounded-full text-[13px] transition-all transform hover:shadow-md font-sans"><PlusCircle size={16} className="text-gray-500" /> Add Section</button>
        </div>
      )}
    </div>
  );
};

export const StaticLayoutRenderer = ({ template, cvData, ReadOnlyWrapper, design }: any) => {
  const defaultDesign = { font: 'Inter', fontSize: 12, spacing: 1.0, accentColor: '#22c55e', pageMargin: 40, showIcons: true, sidebarBgColor: '#f8fafc', sectionGap: '1.5rem', ...design };
  const wrapperStyle = { '--cv-font': defaultDesign.font, '--cv-base-size': `${defaultDesign.fontSize}px`, '--cv-spacing': defaultDesign.spacing, '--cv-accent': defaultDesign.accentColor, '--cv-page-margin': `${defaultDesign.pageMargin}px`, '--cv-sidebar-bg': defaultDesign.sidebarBgColor, '--cv-section-gap': defaultDesign.sectionGap } as React.CSSProperties;

  const renderZone = (zoneId: string, className: string, isDark = false) => {
    const snippets = template.zones[zoneId] || [];
    return (
      <div className={className}>
        {snippets.map((type: string, index: number) => {
          const SnippetComponent = SNIPPETS[type] || SNIPPETS['summary-clean'];
          if (!SnippetComponent) return null;
          const isSidebar = ['sidebar', 'left', 'right'].includes(zoneId);
          const styleKey = isSidebar && template.sidebarTitleStyle ? template.sidebarTitleStyle : template.titleStyle;
          const TitleRenderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];
          const Title = ({ titleKey, overrideClass }: any) => overrideClass ? <h3 className={overrideClass}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap /></h3> : <TitleRenderer isDark={isDark} showIcons={defaultDesign.showIcons} titleKey={titleKey}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap /></TitleRenderer>;
          return <div key={index} className="cv-page-breakable pointer-events-none mb-[var(--cv-section-gap,1.5rem)]"><SnippetComponent.render data={cvData} Editable={ReadOnlyWrapper} zoneId={zoneId} isDark={isDark} Title={Title} moveEntry={() => {}} deleteEntry={() => {}} showIcons={defaultDesign.showIcons} /></div>;
        })}
      </div>
    );
  };
  switch (template.type) {
    case '1-col': return <div className="w-full h-full cv-document" style={{ ...wrapperStyle, padding: '57px 76px', backgroundColor: '#ffffff' }}>{renderZone('main', 'w-full min-w-0')}</div>;
    case '2-col': return <div className="w-full h-full flex flex-col cv-document" style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}>{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 px-[76px] pb-[57px] pt-4 gap-8"><div className="flex-1 min-w-0">{renderZone('left', 'h-full')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-full')}</div></div></div>;
    case 'sidebar-left': return <div className="w-full h-full flex cv-document" style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}><div className="w-[32%] min-w-0 border-r border-slate-200 pl-[76px] pr-[19px] py-[57px]" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}>{renderZone('sidebar', 'h-full', false)}</div><div className="w-[68%] min-w-0 pl-[19px] pr-[76px] py-[57px]">{renderZone('main', 'h-full')}</div></div>;
    case 'sidebar-left-dark': return <div className="w-full h-full flex cv-document" style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}><div className="w-[32%] min-w-0 pl-[76px] pr-[19px] py-[57px]" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}>{renderZone('sidebar', 'h-full', true)}</div><div className="w-[68%] min-w-0 pl-[19px] pr-[76px] py-[57px]">{renderZone('main', 'h-full')}</div></div>;
    case 'sidebar-right': return <div className="w-full h-full flex cv-document" style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}><div className="w-[68%] min-w-0 pl-[76px] pr-[19px] py-[57px]">{renderZone('main', 'h-full')}</div><div className="w-[32%] min-w-0 border-l border-slate-200 pl-[19px] pr-[76px] py-[57px]" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}>{renderZone('sidebar', 'h-full', false)}</div></div>;
    case 'top-sidebar-right': return <div className="w-full h-full flex flex-col cv-document" style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}>{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 px-[76px] pb-[57px] pt-4 gap-8"><div className="w-[68%] min-w-0">{renderZone('main', 'h-full')}</div><div className="w-[32%] min-w-0 border-l border-slate-200 pl-[19px] py-4 -my-4 rounded-lg" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}>{renderZone('sidebar', 'h-full', false)}</div></div></div>;
    case 'top-sidebar-left': return <div className="w-full h-full flex flex-col cv-document" style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}>{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 px-[76px] pb-[57px] pt-4 gap-8"><div className="w-[32%] min-w-0 border-r border-slate-200 pr-[19px] py-4 -my-4 rounded-lg" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}>{renderZone('sidebar', 'h-full', false)}</div><div className="w-[68%] min-w-0">{renderZone('main', 'h-full')}</div></div></div>;
    case 'hybrid-split': return <div className="w-full h-full flex flex-col cv-document" style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}>{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="px-[76px] pt-4 pb-0">{renderZone('main', 'w-full min-w-0')}</div><div className="flex flex-1 px-[76px] pb-[57px] pt-[8px] gap-8"><div className="flex-1 min-w-0">{renderZone('left', 'h-full')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-full')}</div></div></div>;
    default: return <div>Layout not found</div>;
  }
};

// ==========================================
