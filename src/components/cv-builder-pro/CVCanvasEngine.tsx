'use client';


import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { GripVertical, Download, Plus, LayoutTemplate, Save, RefreshCw, Layers, Check, Search, Filter, Briefcase, PlusCircle, Trash2, ChevronUp, ChevronDown, ImageIcon, ArrowRight, Loader2, PlayCircle, Eye, MousePointer2, Wand2, Quote, FileText, Palette, FileJson, X, Sparkles } from 'lucide-react';
import { CANVAS_TEMPLATES, TEMPLATE_CATEGORIES, SNIPPETS, TITLE_STYLES } from './registry';
import { EditableField, CanvasSnippet, CanvasZone, StaticLayoutRenderer, FloatingToolbar, CanvasContext } from './components/CoreUI';
import { JSONSidebarViewer } from './components/JSONSidebarViewer';
import ListEntry from './components/ListEntry';
import { generateId, setNestedValue, getNestedValue } from './helpers';

const ReadOnlyWrapper = (props: any) => <EditableField {...props} readOnly={true} />;
const EditableWrapper = EditableField;

// PROPS AND REF INTERFACE
// ==========================================
export interface CVCanvasBuilderProps {
  cvData: any;
  onDataChange: (data: any) => void;
  theme?: 'dark' | 'light';
  template?: any;
  onTemplateChange?: (template: any) => void;
  readOnly?: boolean;
}

export interface CVCanvasBuilderRef {
  openTemplateSelector: () => void;
  openAddSection: () => void;
}

// ==========================================

// MAIN CANVAS BUILDER COMPONENT
// ==========================================
const FloatingAICard = ({ pointSuggestion, setPointSuggestion, handleFetchSuggestion, cvData, handleDataChange }: any) => {
  const [pos, setPos] = useState({ top: -1000, left: 0 });

  useEffect(() => {
    const updatePos = () => {
      if (pointSuggestion?.node) {
        const nodeRect = pointSuggestion.node.getBoundingClientRect();
        const wrapper = document.querySelector('.cv-document-wrapper');
        const wrapperRect = wrapper?.getBoundingClientRect();
        
        let top = nodeRect.top;
        let left = wrapperRect ? wrapperRect.right + 20 : nodeRect.right + 20;
        
        if (left + 420 > window.innerWidth - 20) {
          left = window.innerWidth - 440;
        }
        if (top + 300 > window.innerHeight - 20) {
          top = window.innerHeight - 320;
        }
        
        setPos({ top, left });
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
  }, [pointSuggestion?.node]);

  if (!pointSuggestion) return null;

  return (
    <div className={`fixed z-[110] border border-emerald-500/30 shadow-2xl rounded-xl p-5 w-[420px] bg-[#111111] transition-all duration-75`} style={{ top: pos.top, left: pos.left }}>
      <div className="flex items-center justify-between mb-4 text-[#7EE787]">
        <div className="flex items-center gap-2">
          <Wand2 size={16} className={pointSuggestion.loading ? 'animate-pulse' : ''} />
          <span className="text-[11px] font-bold uppercase tracking-widest">{pointSuggestion.loading ? 'AI is thinking...' : 'AI Contextual Suggestion'}</span>
        </div>
        <button onClick={() => setPointSuggestion(null)} className="text-gray-400 hover:text-white transition-colors"><X size={16}/></button>
      </div>
      
      <div className="mb-6 relative min-h-[60px]">
        {pointSuggestion.loading ? (
          <div className="flex flex-col gap-2">
            <div className="h-3 bg-gray-800 rounded animate-pulse w-full"></div>
            <div className="h-3 bg-gray-800 rounded animate-pulse w-[80%]"></div>
            <div className="h-3 bg-gray-800 rounded animate-pulse w-[60%]"></div>
          </div>
        ) : pointSuggestion.error === 'usage_limit_reached' ? (
          <div className="text-sm text-red-400">
            You have reached your AI usage limit for the current plan. <a href="/pricing" className="underline font-bold text-red-300">Upgrade Plan</a> to continue using Thinkhard AI features.
          </div>
        ) : pointSuggestion.error ? (
          <div className="text-sm text-red-400">{pointSuggestion.error}</div>
        ) : (
          <p className="text-sm leading-relaxed text-gray-100">{pointSuggestion.text}</p>
        )}
      </div>
      
      {!pointSuggestion.loading && !pointSuggestion.error && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center pb-3 border-b border-[#333]">
            <button onClick={() => handleFetchSuggestion('star')} className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"><Sparkles size={12}/> STAR Method</button>
            <select onChange={(e) => handleFetchSuggestion('tone', e.target.value)} className="bg-[#222] text-xs text-gray-300 border border-[#444] rounded px-2 py-1 outline-none focus:border-emerald-500">
              <option value="">Change Tone...</option>
              <option value="Professional">Professional</option>
              <option value="Confident">Confident</option>
              <option value="Creative">Creative</option>
              <option value="Action-oriented">Action-oriented</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-1">
            <button onClick={() => setPointSuggestion(null)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#222] text-gray-300 hover:bg-[#333] hover:text-white transition-colors">Cancel</button>
            <button onClick={() => { const currentHtml = getNestedValue(cvData, pointSuggestion.path) || ''; let newHtml = currentHtml; if (newHtml.includes('</ul>')) { newHtml = newHtml.replace('</ul>', `<li>${pointSuggestion.text}</li></ul>`); } else { newHtml += `<ul><li>${pointSuggestion.text}</li></ul>`; } handleDataChange(pointSuggestion.path, newHtml); setPointSuggestion(null); }} className="px-4 py-2 text-sm font-semibold rounded-lg shadow-lg bg-[#7EE787] text-black hover:bg-[#68d171] transition-colors">Accept & Add Bullet</button>
          </div>
        </div>
      )}
    </div>
  );
};

const CVCanvasEngine = forwardRef<CVCanvasBuilderRef, CVCanvasBuilderProps>(({ cvData, onDataChange, theme = 'dark', template, onTemplateChange, readOnly = false }, ref) => {
  const [activeTemplate, setActiveTemplate] = useState(template || CANVAS_TEMPLATES[0]);
  const [focusedNode, setFocusedNode] = useState<HTMLElement | null>(null);
  const [zones, setZones] = useState<Record<string, any[]>>({});
  const [templateAnimKey, setTemplateAnimKey] = useState(0);
  const [design, setDesign] = useState({ font: 'Inter', fontSize: 12, spacing: 1.0, accentColor: '#22c55e', pageMargin: 40, showIcons: true, headerLinks: {} as Record<string, boolean>, sidebarBgColor: '#f8fafc', sectionGap: '1.5rem' });
  const [activeSidebar, setActiveSidebar] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [replacingSnippet, setReplacingSnippet] = useState<any>(null);
  const [dragState, setDragState] = useState<any>({ isDragging: false, sourceZoneId: null, sourceIndex: null, overZoneId: null, overIndex: null });
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (template && template.id !== activeTemplate.id) {
      loadTemplate(template);
    }
  }, [template]);
  const [aiIssues, setAiIssues] = useState<any[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [cvScore, setCvScore] = useState(100);
  const [pointSuggestion, setPointSuggestion] = useState<{ path: string, text: string, node?: HTMLElement, loading?: boolean, originalText?: string, error?: string } | null>(null);

  const isDarkUI = theme === 'dark';
  const bgApp = isDarkUI ? 'bg-[#0a0a0a]' : 'bg-gray-100';
  const bgNav = isDarkUI ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm';
  const bgPanel = isDarkUI ? 'bg-[#141414] border-[#2a2a2a]' : 'bg-white border-gray-200';
  const bgWorkspace = isDarkUI ? 'bg-[#1a1a1a]' : 'bg-[#f3f2ee]';
  const textPrimary = isDarkUI ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkUI ? 'text-gray-400' : 'text-gray-500';
  const brandGreen = isDarkUI ? 'text-[#7EE787]' : 'text-emerald-600';
  const brandGreenBg = isDarkUI ? 'bg-[#7EE787] text-black' : 'bg-emerald-600 text-white';
  const btnSecondary = isDarkUI ? 'bg-[#222] text-gray-300 hover:bg-[#333] border-[#333]' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200';

  useEffect(() => {
    loadTemplate(template || CANVAS_TEMPLATES[0]);
    const handleDragStart = (e: any) => setDragState((prev: any) => ({ ...prev, isDragging: true, sourceZoneId: e.detail.zoneId, sourceIndex: e.detail.index }));
    const handleDragOver = (e: any) => setDragState((prev: any) => ({ ...prev, overZoneId: e.detail.zoneId, overIndex: e.detail.index }));
    const handleDragEnd = () => setDragState({ isDragging: false, sourceZoneId: null, sourceIndex: null, overZoneId: null, overIndex: null });
    document.addEventListener('snippet-drag-start', handleDragStart);
    document.addEventListener('snippet-drag-over', handleDragOver);
    document.addEventListener('snippet-drag-end', handleDragEnd);
    return () => { document.removeEventListener('snippet-drag-start', handleDragStart); document.removeEventListener('snippet-drag-over', handleDragOver); document.removeEventListener('snippet-drag-end', handleDragEnd); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination Engine
  useEffect(() => {
    const container = document.querySelector('.cv-document-wrapper');
    if (!container) return;

    const paginate = () => {
      const doc = container.querySelector('.cv-document') as HTMLElement;
      if (!doc) return;
      
      const A4_HEIGHT = 1122.5; // 297mm at 96 DPI
      const PAGE_GAP = 40; // Visual gap between pages in px
      const EFFECTIVE_HEIGHT = A4_HEIGHT + PAGE_GAP; 
      const PAGE_MARGIN = design.pageMargin || 40; // Use actual design margin
      
      const items = Array.from(doc.querySelectorAll('.cv-page-breakable'));
      
      // Reset margins and height first
      items.forEach((item: any) => {
        item.style.marginTop = '';
      });
      doc.style.height = 'auto';
      doc.style.minHeight = '297mm';

        // Small delay to allow DOM to recalculate after reset
      requestAnimationFrame(() => {
        let maxBottom = 0;
        const docRect = doc.getBoundingClientRect();
        // Calculate true scale to avoid pushing bugs from CSS transforms
        const scale = docRect.width / doc.offsetWidth;

        items.forEach((item: any) => {
          const itemRect = item.getBoundingClientRect();
          const top = (itemRect.top - docRect.top) / scale;
          const height = itemRect.height / scale;
          const bottom = top + height;
          
          const cycleStart = Math.floor(top / EFFECTIVE_HEIGHT);
          const visibleEnd = (cycleStart * EFFECTIVE_HEIGHT) + A4_HEIGHT - PAGE_MARGIN;
          const nextCycleStart = ((cycleStart + 1) * EFFECTIVE_HEIGHT) + PAGE_MARGIN;
          
          // If it crosses the bottom margin boundary and fits on a single page, push it
          if (bottom > visibleEnd && height < (A4_HEIGHT - PAGE_MARGIN * 2)) {
            const pushAmount = nextCycleStart - top;
            item.style.marginTop = `${pushAmount}px`;
          }
        });

        // Calculate total pages and force container height
        requestAnimationFrame(() => {
          const newDocRect = doc.getBoundingClientRect();
          items.forEach((item: any) => {
            const itemBottom = (item.getBoundingClientRect().bottom - newDocRect.top) / scale;
            if (itemBottom > maxBottom) maxBottom = itemBottom;
          });
          const totalPages = Math.max(1, Math.ceil(maxBottom / EFFECTIVE_HEIGHT));
          doc.style.height = `${totalPages * EFFECTIVE_HEIGHT}px`;
        });
      });
    };

    // Run pagination
    const timer = setTimeout(paginate, 100);
    
    // Also run on resize
    const ro = new ResizeObserver(() => {
      // Debounce the observer
      clearTimeout(timer);
      setTimeout(paginate, 50);
    });
    ro.observe(container);
    
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [cvData, templateAnimKey, design, activeTemplate]);

  useImperativeHandle(ref, () => ({
    openTemplateSelector: () => setIsTemplateModalOpen(true),
    openAddSection: () => setReplacingSnippet({ zoneId: Object.keys(zones)[0] || 'main', isAdd: true }),
  }));

  const loadTemplate = (template: any) => {
    if (!template) return;
    setActiveTemplate(template);
    const initialZones: Record<string, any[]> = {};
    if (template?.zones) {
      Object.keys(template.zones).forEach((zoneId: string) => {
        initialZones[zoneId] = template.zones[zoneId].map((type: string) => ({ id: generateId(), type }));
      });
    }
    setZones(initialZones);
    setIsTemplateModalOpen(false);
    setTemplateAnimKey(prev => prev + 1);
    if (onTemplateChange) onTemplateChange(template);
  };

  const handleDataChange = (path: string, value: any) => {
    const updated = setNestedValue(cvData, path, value);
    onDataChange(updated);
  };

  const handleSuggestPoint = () => {
    if (!focusedNode) return;
    let path = focusedNode.getAttribute('data-path');
    if (!path) { const parentWithPath = focusedNode.closest('[data-path]'); if (parentWithPath) path = parentWithPath.getAttribute('data-path'); }
    if (!path || !path.includes('description')) return;
    const originalText = focusedNode.innerText;
    setPointSuggestion({ path, text: originalText, originalText, node: focusedNode as HTMLElement, loading: false });
  };

  const handleApplySuggestion = (text: string) => {
    if (!pointSuggestion) return;
    handleDataChange(pointSuggestion.path, text);
    setPointSuggestion(null);
  };

  const handleFetchSuggestion = async (type: 'star' | 'tone', tone?: string) => {
    if (!pointSuggestion) return;
    setPointSuggestion(prev => prev ? { ...prev, loading: true, error: undefined } : null);
    try {
      const response = await fetch('/api/ai/fix-and-improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: pointSuggestion.originalText, 
          type: 'experience', 
          promptType: type === 'star' ? 'star' : 'tone',
          tone: tone 
        })
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 402) {
          setPointSuggestion(prev => prev ? { ...prev, loading: false, error: 'usage_limit_reached' } : null);
        } else {
          throw new Error(result.error || 'Failed to fetch suggestion');
        }
      } else {
        setPointSuggestion(prev => prev ? { ...prev, loading: false, text: result.content || result.improvedContent || result.text || 'No suggestion returned.' } : null);
      }
    } catch (error: any) {
      console.error(error);
      setPointSuggestion(prev => prev ? { ...prev, loading: false, error: error.message } : null);
    }
  };

  const runAIScan = () => {
    setScanning(true);
    setTimeout(() => {
      setAiIssues([
        { id: 'ai1', type: 'Impact', path: 'experience.0.description', targetText: 'enhancing front-end data presentation capabilities', suggestion: 'Weak impact statement. Highlight specific performance improvements or business value created by this pipeline.', points: 15 },
        { id: 'ai2', type: 'Formatting', path: 'skills.languages', targetText: 'HTML/CSS', suggestion: 'Group HTML/CSS under Frontend tools rather than core analytical languages to better match Data Analyst roles.', points: 5 }
      ]);
      setCvScore(80); setScanning(false);
    }, 1500);
  };

  const applyAIFix = (issue: any) => {
    const currentValue = getNestedValue(cvData, issue.path);
    let fixedValue = currentValue;
    if (issue.id === 'ai1') fixedValue = currentValue.replace(issue.targetText, 'enhancing front-end data presentation capabilities and reducing load times by 40%');
    if (issue.id === 'ai2') fixedValue = currentValue.replace(issue.targetText, '');
    handleDataChange(issue.path, fixedValue); setAiIssues(prev => prev.filter((i: any) => i.id !== issue.id)); setCvScore(prev => prev + issue.points); if (activeIssueId === issue.id) setActiveIssueId(null);
  };

  const handleZoneDrop = (targetZoneId: string, dragData: any, targetIndex: number) => {
    setZones(prev => {
      const newZones = { ...prev }; if (!newZones[targetZoneId]) newZones[targetZoneId] = [];
      const insertIndex = targetIndex !== undefined && targetIndex !== null ? targetIndex : newZones[targetZoneId].length;
      if (dragData.source === 'canvas') {
        const { zoneId: sourceZoneId, index: sourceIndex, instance } = dragData;
        
        // Safety check to ensure the source zone exists and has the index
        if (!newZones[sourceZoneId] || !newZones[sourceZoneId][sourceIndex]) return prev;
        
        newZones[sourceZoneId].splice(sourceIndex, 1);
        let finalInsertIndex = insertIndex;
        if (sourceZoneId === targetZoneId && sourceIndex < insertIndex) finalInsertIndex -= 1;
        newZones[targetZoneId].splice(finalInsertIndex, 0, instance);
      }
      return newZones;
    });
  };

  const moveSnippet = (zoneId: string, index: number, dir: number) => { 
    setZones(prev => { 
      const newZones = { ...prev }; 
      const list = newZones[zoneId]; 
      if (!list || index + dir < 0 || index + dir >= list.length) return prev; 
      const item = list[index]; 
      list.splice(index, 1); 
      list.splice(index + dir, 0, item); 
      return newZones; 
    }); 
  };
  
  const removeSnippet = (zoneId: string, index: number) => { 
    setZones(prev => { 
      const newZones = { ...prev }; 
      if (newZones[zoneId]) newZones[zoneId].splice(index, 1); 
      return newZones; 
    }); 
  };

  const moveEntry = (collection: string, index: number, dir: number) => {
    const arr = [...(cvData[collection] || [])];
    if (index + dir < 0 || index + dir >= arr.length) return;
    const item = arr[index]; arr.splice(index, 1); arr.splice(index + dir, 0, item);
    onDataChange({ ...cvData, [collection]: arr });
  };

  const deleteEntry = (collection: string, index: number) => {
    const arr = [...(cvData[collection] || [])]; arr.splice(index, 1);
    onDataChange({ ...cvData, [collection]: arr });
  };

  const handleReplaceClick = (zoneId: string, index: number, currentType: string) => { const category = SNIPPETS[currentType]?.category; setReplacingSnippet({ zoneId, index, currentType, category, isAdd: false }); };
  const handleAddClick = (zoneId: string) => setReplacingSnippet({ zoneId, isAdd: true });

  const handleAddListEntry = (type: string) => {
    const l = type.toLowerCase();
    const updated = { ...cvData };
    if (l === 'experience') updated.experience = [...(updated.experience || []), { id: generateId(), company: 'New Company', role: 'Job Title', date: 'Date', description: '<ul><li>Describe your responsibilities and achievements here.</li></ul>' }];
    else if (l === 'education') updated.education = [...(updated.education || []), { id: generateId(), institution: 'Institution Name', degree: 'Degree', date: 'Date', description: 'Additional details.' }];
    else if (l === 'projects') updated.projects = [...(updated.projects || []), { id: generateId(), name: 'Project Name', role: 'Role', date: 'Date', description: '<ul><li>Project details.</li></ul>' }];
    else if (l === 'certifications') updated.certifications = [...(updated.certifications || []), { id: generateId(), name: 'Certification Name', issuer: 'Issuer', date: 'Date' }];
    else if (l === 'awards') updated.awards = [...(updated.awards || []), { id: generateId(), name: 'Award Name', issuer: 'Issuer', date: 'Date' }];
    else if (l === 'publications') updated.publications = [...(updated.publications || []), { id: generateId(), title: 'Publication Title', publisher: 'Publisher', date: 'Date', description: 'Brief summary.' }];
    else if (l === 'volunteer') updated.volunteer = [...(updated.volunteer || []), { id: generateId(), organization: 'Org Name', role: 'Role', date: 'Date', description: '<ul><li>Duties here.</li></ul>' }];
    else if (l === 'references') updated.references = [...(updated.references || []), { id: generateId(), name: 'Ref Name', role: 'Role', contact: 'Contact Info' }];
    onDataChange(updated);
  };

  const executeReplaceOrAdd = (newType: string) => {
    if (!replacingSnippet) return;
    setZones(prev => {
      const newZones = { ...prev };
      if (replacingSnippet.isAdd) newZones[replacingSnippet.zoneId].push({ id: generateId(), type: newType });
      else newZones[replacingSnippet.zoneId][replacingSnippet.index] = { id: generateId(), type: newType };
      return newZones;
    });
    setReplacingSnippet(null);
  };

  const handleTogglePhoto = () => handleDataChange('basics.showAvatar', !cvData.basics?.showAvatar);

  const renderCanvasLayout = () => {
    const layoutType = activeTemplate.type;
    const safeZones = zones || {};
    const renderZone = (zoneId: string, className: string, isDark = false) => (
      <CanvasZone readOnly={readOnly} zoneId={zoneId} blocks={safeZones[zoneId] || []} cvData={cvData} EditableWrapper={readOnly ? ReadOnlyWrapper : EditableWrapper} handleDrop={handleZoneDrop} moveSnippet={moveSnippet} removeSnippet={removeSnippet} onReplace={handleReplaceClick} onAddSnippet={handleAddClick} onTogglePhoto={handleTogglePhoto} onAddListEntry={handleAddListEntry} moveEntry={moveEntry} deleteEntry={deleteEntry} dragState={dragState} activeTemplate={activeTemplate} layoutZones={safeZones} className={className} isDark={isDark} />
    );

    switch (layoutType) {
      case '1-col': return <div className="w-full shadow-2xl mx-auto flex flex-col cv-document" style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'transparent' }}><div className="flex-1" style={{ padding: 'var(--cv-page-margin)' }}>{renderZone('main', 'w-full min-w-0')}</div></div>;
      case '2-col': return <div className="w-full shadow-2xl mx-auto flex flex-col cv-document" style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'transparent' }}>{safeZones['header'] && <div style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 gap-8" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: '6mm' }}><div className="flex-1 min-w-0">{renderZone('left', 'h-full')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-full')}</div></div></div>;
      case 'sidebar-left': return <div className="w-full shadow-2xl mx-auto flex cv-document relative" style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'transparent' }}><div className="absolute left-0 top-0 bottom-0 w-[32%] z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}></div><div className="w-[32%] min-w-0 border-r border-slate-200 relative z-10" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: '5mm', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('sidebar', 'h-full', false)}</div><div className="w-[68%] min-w-0 relative z-10" style={{ paddingLeft: '5mm', paddingRight: 'var(--cv-page-margin)', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('main', 'h-full')}</div></div>;
      case 'sidebar-left-dark': return <div className="w-full shadow-2xl mx-auto flex cv-document relative" style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'transparent' }}><div className="absolute left-0 top-0 bottom-0 w-[32%] z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}></div><div className="w-[32%] min-w-0 relative z-10" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: '5mm', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('sidebar', 'h-full', true)}</div><div className="w-[68%] min-w-0 relative z-10" style={{ paddingLeft: '5mm', paddingRight: 'var(--cv-page-margin)', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('main', 'h-full')}</div></div>;
      case 'sidebar-right': return <div className="w-full shadow-2xl mx-auto flex cv-document relative" style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'transparent' }}><div className="w-[68%] min-w-0 relative z-10" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: '5mm', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('main', 'h-full')}</div><div className="absolute right-0 top-0 bottom-0 w-[32%] z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}></div><div className="w-[32%] min-w-0 border-l border-slate-200 relative z-10" style={{ paddingLeft: '5mm', paddingRight: 'var(--cv-page-margin)', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('sidebar', 'h-full', false)}</div></div>;
      case 'top-sidebar-left': return <div className="w-full shadow-2xl mx-auto flex flex-col cv-document relative" style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'transparent' }}>{safeZones['header'] && <div className="relative z-10" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 gap-8 relative z-10" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: '6mm' }}><div className="absolute left-[var(--cv-page-margin)] top-[6mm] bottom-[var(--cv-page-margin)] w-[calc(32%-1rem)] rounded-lg z-[-1]" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}></div><div className="w-[32%] min-w-0 border-r border-slate-200" style={{ paddingRight: '5mm' }}>{renderZone('sidebar', 'h-full', false)}</div><div className="w-[68%] min-w-0">{renderZone('main', 'h-full')}</div></div></div>;
      case 'top-sidebar-right': return <div className="w-full shadow-2xl mx-auto flex flex-col cv-document relative" style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'transparent' }}>{safeZones['header'] && <div className="relative z-10" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 gap-8 relative z-10" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: '6mm' }}><div className="w-[68%] min-w-0">{renderZone('main', 'h-full')}</div><div className="absolute right-[var(--cv-page-margin)] top-[6mm] bottom-[var(--cv-page-margin)] w-[calc(32%-1rem)] rounded-lg z-[-1]" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}></div><div className="w-[32%] min-w-0 border-l border-slate-200" style={{ paddingLeft: '5mm' }}>{renderZone('sidebar', 'h-full', false)}</div></div></div>;
      case 'hybrid-split': return <div className="w-full shadow-2xl mx-auto flex flex-col cv-document" style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'transparent' }}>{safeZones['header'] && <div style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>{renderZone('header', 'w-full min-w-0')}</div>}<div style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingTop: '6mm', paddingBottom: 0 }}>{renderZone('main', 'w-full min-w-0')}</div><div className="flex flex-1 gap-8" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: '2mm' }}><div className="flex-1 min-w-0">{renderZone('left', 'h-full')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-full')}</div></div></div>;
      default: return <div>Layout not found</div>;
    }
  };

  return (
    <CanvasContext.Provider value={{ cvData, design, handleDataChange, setFocusedNode, aiIssues, activeIssueId, onIssueClick: (id: string) => { setActiveIssueId(id); setActiveSidebar('ai'); } }}>
      <div className={`h-full w-full flex font-sans overflow-hidden transition-colors duration-300 ${readOnly ? '' : bgApp}`}>
        {!readOnly && <FloatingToolbar targetNode={focusedNode} onSuggestPoint={handleSuggestPoint} />}

      {!readOnly && (
        <div className={`w-16 border-r flex flex-col items-center py-4 gap-4 z-30 shrink-0 transition-colors ${bgNav}`}>
          <div className={`p-2 rounded-xl mb-2 ${brandGreenBg} shadow-lg`} title="CVCIRCLE Builder"><FileText size={20} /></div>
          <button onClick={() => setActiveSidebar(activeSidebar === 'design' ? null : 'design')} className={`p-3 rounded-2xl transition-all ${activeSidebar === 'design' ? 'bg-emerald-500/20 ' + brandGreen : (isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100')}`} title="Design & Layout"><Palette size={20}/></button>
          <button onClick={() => setIsTemplateModalOpen(true)} className={`p-3 rounded-2xl transition-all ${isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100'}`} title="Templates"><LayoutTemplate size={20}/></button>
          <button onClick={() => setActiveSidebar(activeSidebar === 'data' ? null : 'data')} className={`p-3 rounded-2xl transition-all ${activeSidebar === 'data' ? 'bg-emerald-500/20 ' + brandGreen : (isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100')}`} title="Raw Data JSON"><FileJson size={20}/></button>
          <button onClick={() => { setActiveSidebar(activeSidebar === 'ai' ? null : 'ai'); if (activeSidebar !== 'ai') runAIScan(); }} className={`p-3 rounded-2xl transition-all ${activeSidebar === 'ai' ? 'bg-emerald-500/20 ' + brandGreen : (isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100')}`} title="AI Review"><Wand2 size={20}/></button>
          <div className="flex-1"></div>
          <button onClick={() => window.print()} className={`p-3 rounded-2xl transition-all shadow-xl ${brandGreenBg} hover:scale-110`} title="Save to PDF"><Download size={20}/></button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {!readOnly && activeSidebar === 'design' && (
          <div className={`w-[320px] border-r flex flex-col shadow-2xl z-20 shrink-0 ${bgPanel}`}>
            <div className={`p-5 border-b flex items-center justify-between ${bgNav}`}>
              <h3 className={`font-bold flex items-center gap-2 ${textPrimary}`}><Palette size={18} className={brandGreen}/> Global Design</h3>
              <button onClick={() => setActiveSidebar(null)} className={textMuted}><X size={18}/></button>
            </div>
            <div className="p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              <div><label className={`text-xs font-bold uppercase tracking-widest mb-2 block ${textMuted}`}>Typography</label><div className="grid grid-cols-2 gap-2">{['Inter', 'Merriweather', 'Roboto Mono', 'Playfair Display'].map(f => (<button key={f} onClick={() => setDesign({...design, font: f})} className={`py-2 px-1 text-xs rounded border transition-colors ${design.font === f ? 'bg-emerald-500/20 border-emerald-500 ' + brandGreen : (isDarkUI ? 'bg-[#222] border-[#333] text-gray-300' : 'bg-white border-gray-200 text-gray-700')}`} style={{ fontFamily: f }}>{f.split(' ')[0]}</button>))}</div></div>
              <div><label className={`text-xs font-bold uppercase tracking-widest mb-2 flex justify-between ${textMuted}`}><span>Font Size</span><span className={brandGreen}>{design.fontSize}px</span></label><input type="range" min="10" max="16" step="0.5" value={design.fontSize} onChange={(e) => setDesign({...design, fontSize: parseFloat(e.target.value)})} className="w-full accent-emerald-500" /></div>
              <div><label className={`text-xs font-bold uppercase tracking-widest mb-2 flex justify-between ${textMuted}`}><span>Line Spacing</span><span className={brandGreen}>{design.spacing.toFixed(1)}x</span></label><input type="range" min="0.5" max="2" step="0.1" value={design.spacing} onChange={(e) => setDesign({...design, spacing: parseFloat(e.target.value)})} className="w-full accent-emerald-500" /></div>
              <div><label className={`text-xs font-bold uppercase tracking-widest mb-2 flex justify-between ${textMuted}`}><span>Page Margin</span><span className={brandGreen}>{design.pageMargin}px</span></label><input type="range" min="0" max="80" step="1" value={design.pageMargin} onChange={(e) => setDesign({...design, pageMargin: parseInt(e.target.value)})} className="w-full accent-emerald-500" /></div>
              <div><label className={`text-xs font-bold uppercase tracking-widest mb-2 block ${textMuted}`}>Accent Color</label><div className="flex gap-3 flex-wrap">{['#7EE787', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#1f2937', '#000000', '#ffffff'].map(c => (<button key={c} onClick={() => setDesign({...design, accentColor: c})} className={`w-7 h-7 rounded-full border-2 transition-transform ${design.accentColor === c ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />))}</div></div>
              <div><label className={`text-xs font-bold uppercase tracking-widest mb-2 block ${textMuted}`}>Sidebar Background</label><div className="flex gap-3 flex-wrap">{['#ffffff', '#f8fafc', '#f3f4f6', '#1e293b', '#0f172a', '#172554'].map(c => (<button key={c} onClick={() => setDesign({...design, sidebarBgColor: c})} className={`w-7 h-7 rounded-full border-2 transition-transform ${design.sidebarBgColor === c ? 'border-emerald-500 scale-125 shadow-lg' : 'border-gray-300 dark:border-gray-600 hover:scale-110'}`} style={{ backgroundColor: c }} />))}</div></div>
              <div><label className={`text-xs font-bold uppercase tracking-widest mb-2 flex justify-between ${textMuted}`}><span>Section Gap</span><span className={brandGreen}>{design.sectionGap}</span></label><div className="flex gap-2">{[{label: 'Small', value: '1rem'}, {label: 'Medium', value: '1.5rem'}, {label: 'Large', value: '2rem'}].map(g => (<button key={g.value} onClick={() => setDesign({...design, sectionGap: g.value})} className={`flex-1 py-1.5 text-xs rounded border transition-colors ${design.sectionGap === g.value ? 'bg-emerald-500/20 border-emerald-500 ' + brandGreen : (isDarkUI ? 'bg-[#222] border-[#333] text-gray-300' : 'bg-white border-gray-200 text-gray-700')}`}>{g.label}</button>))}</div></div>
              <div className="mt-4"><label className={`flex items-center justify-between cursor-pointer`}><span className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>Show Icons</span><div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${design.showIcons ? brandGreenBg : (isDarkUI ? 'bg-[#333]' : 'bg-gray-300')}`} onClick={() => setDesign({...design, showIcons: !design.showIcons})}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${design.showIcons ? 'translate-x-6' : 'translate-x-1'}`} /></div></label></div>
              
              <div className="mt-6 border-t pt-5 border-gray-200 dark:border-[#333]">
                <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ${textMuted}`}>Header Links</label>
                <div className="flex flex-col gap-3">
                  {['location', 'phone', 'email', 'linkedin', 'website', ...(cvData?.basics?.profiles?.map((p: any) => p.network?.toLowerCase()) || [])]
                    .filter((v, i, a) => a.indexOf(v) === i && v)
                    .map(linkType => (
                    <label key={linkType} className="flex items-center justify-between cursor-pointer group">
                      <span className={`text-xs capitalize font-medium transition-colors ${design.headerLinks?.[linkType] !== false ? textPrimary : textMuted}`}>{linkType}</span>
                      <div className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${design.headerLinks?.[linkType] !== false ? brandGreenBg : (isDarkUI ? 'bg-[#333]' : 'bg-gray-300')}`} onClick={() => setDesign({...design, headerLinks: {...(design.headerLinks || {}), [linkType]: design.headerLinks?.[linkType] === false}})}>
                        <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${design.headerLinks?.[linkType] !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!readOnly && activeSidebar === 'data' && (
          <div className={`w-[400px] border-r flex flex-col shadow-2xl z-20 shrink-0 ${bgPanel}`}>
            <div className={`p-5 border-b flex items-center justify-between ${bgNav}`}><h3 className={`font-bold flex items-center gap-2 ${textPrimary}`}><FileJson size={18} className={brandGreen}/> Raw JSON</h3><button onClick={() => setActiveSidebar(null)} className={textMuted}><X size={18}/></button></div>
            <div className="flex-1 overflow-hidden relative">
              <JSONSidebarViewer data={cvData} focusedPath={focusedNode ? focusedNode.getAttribute('data-path') : null} />
            </div>
          </div>
        )}

        {!readOnly && activeSidebar === 'ai' && (
          <div className={`w-[360px] border-r flex flex-col shadow-2xl z-20 shrink-0 ${bgPanel}`}>
            <div className={`p-5 border-b flex items-center justify-between ${bgNav}`}>
              <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${cvScore >= 80 ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-yellow-500/20 border-yellow-500 text-yellow-500'}`}>{cvScore}</div><div><span className={`font-bold text-sm uppercase ${textPrimary}`}>AI Review</span><div className={`text-xs ${textMuted}`}>{aiIssues.length} issues</div></div></div>
              <button onClick={() => setActiveSidebar(null)} className={textMuted}><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
              {scanning && <div className="text-center py-12 text-emerald-500 animate-pulse"><Wand2 size={40} className="mx-auto mb-3 opacity-80" /><span className="text-xs font-bold uppercase tracking-widest">Analyzing...</span></div>}
              {!scanning && aiIssues.length === 0 && <div className={`text-center py-12 ${textMuted}`}><div className="text-5xl mb-3">&#10024;</div><p className="text-sm font-medium">No issues found.</p></div>}
              {!scanning && aiIssues.map((issue: any) => (
                <div key={issue.id} onMouseEnter={() => setActiveIssueId(issue.id)} onMouseLeave={() => setActiveIssueId(null)} className={`border rounded-xl p-4 transition-all ${activeIssueId === issue.id ? 'border-emerald-500' : (isDarkUI ? 'border-[#333] bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50')}`}>
                  <div className="flex items-start gap-2 mb-2"><span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${issue.type === 'Impact' ? 'bg-yellow-500/20 text-yellow-600' : 'bg-red-500/20 text-red-500'}`}>{issue.type}</span></div>
                  <p className={`text-sm mb-4 leading-relaxed ${textPrimary}`}>{issue.suggestion}</p>
                  <button onClick={() => applyAIFix(issue)} className={`w-full py-2 rounded-lg text-xs font-bold ${brandGreenBg}`}>APPLY FIX</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={readOnly ? 'w-full' : `flex-1 overflow-auto relative py-8 flex justify-center custom-scrollbar transition-colors ${bgWorkspace}`}>
          {readOnly ? (
            <div className="cv-document-wrapper text-gray-900" style={{ width: '210mm', '--cv-font': design.font, '--cv-base-size': `${design.fontSize}px`, '--cv-spacing': design.spacing, '--cv-accent': design.accentColor, '--cv-page-margin': `${design.pageMargin}px`, '--cv-sidebar-bg': design.sidebarBgColor, '--cv-section-gap': design.sectionGap, '--cv-workspace-bg': isDarkUI ? '#1a1a1a' : '#f3f2ee' } as React.CSSProperties}>
              {renderCanvasLayout()}
            </div>
          ) : (
            <div key={templateAnimKey} className="transform origin-top transition-transform scale-[0.85] lg:scale-100 xl:scale-105 h-max pb-20 text-gray-900">
              <div className="cv-document-wrapper relative" style={{ width: '210mm', '--cv-font': design.font, '--cv-base-size': `${design.fontSize}px`, '--cv-spacing': design.spacing, '--cv-accent': design.accentColor, '--cv-page-margin': `${design.pageMargin}px`, '--cv-sidebar-bg': design.sidebarBgColor, '--cv-section-gap': design.sectionGap, '--cv-workspace-bg': isDarkUI ? '#1a1a1a' : '#f3f2ee' } as React.CSSProperties}>
                <div className="cv-page-visualizer"></div>
                {renderCanvasLayout()}
              </div>
            </div>
          )}
        </div>
      </div>

      {!readOnly && <FloatingAICard pointSuggestion={pointSuggestion} setPointSuggestion={setPointSuggestion} handleFetchSuggestion={handleFetchSuggestion} cvData={cvData} handleDataChange={handleDataChange} />}

      {/* TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className={`rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col h-[90vh] border ${bgPanel}`}>
            <div className={`p-5 border-b flex justify-between items-center shrink-0 ${bgNav}`}>
              <div className="flex items-center gap-3"><LayoutTemplate size={24} className="text-emerald-500"/><div><h3 className={`font-black text-xl ${textPrimary}`}>Template Library</h3><p className={`text-xs ${textMuted}`}>Select a layout. All sections can be customized.</p></div></div>
              <button onClick={() => setIsTemplateModalOpen(false)} className={`p-2 rounded-full ${btnSecondary}`}><X size={20}/></button>
            </div>
            <div className={`p-6 overflow-y-auto flex-1 custom-scrollbar ${isDarkUI ? 'bg-[#0a0a0a]' : 'bg-gray-100'}`}>
              <div className="max-w-6xl mx-auto space-y-10">
                {TEMPLATE_CATEGORIES.map(cat => {
                  const catTemplates = CANVAS_TEMPLATES.filter(tpl => cat.types.includes(tpl.type));
                  if (catTemplates.length === 0) return null;
                  return (<div key={cat.id}><div className={`sticky top-0 z-10 backdrop-blur-md py-3 mb-5 flex items-center gap-3 border-b ${isDarkUI ? 'border-[#222] bg-[#0a0a0a]/80 text-white' : 'border-gray-200 bg-gray-100/80 text-gray-900'}`}><span className="text-emerald-500">{cat.icon}</span><h2 className="text-lg font-bold">{cat.name}</h2><span className={`text-xs ${textMuted}`}>- {cat.desc}</span></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{catTemplates.map(tpl => {
                      const isActive = activeTemplate.id === tpl.id;
                      return (<div key={tpl.id} onClick={() => loadTemplate(tpl)} className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-2xl ${bgPanel} ${isActive ? 'border-emerald-500 ring-4 ring-emerald-500/20' : (isDarkUI ? 'border-[#333]' : 'border-gray-200')}`}>
                        <div className={`p-2.5 border-b flex justify-between items-center z-10 shrink-0 ${bgNav}`}><div className={`font-bold text-xs ${textPrimary}`}>{tpl.name}</div>{isActive && <span className="bg-emerald-500/20 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded font-bold">ACTIVE</span>}</div>
                        <div className={`relative w-full flex justify-center items-center p-4 flex-1 overflow-hidden pointer-events-none ${isDarkUI ? 'bg-[#141414]' : 'bg-gray-50'}`}><div className="relative w-[180px] h-[255px] bg-white shadow-md overflow-hidden rounded-sm ring-1 ring-gray-300"><div className="absolute top-0 left-0 w-[794px] h-[1123px] origin-top-left text-gray-900" style={{ transform: 'scale(0.2265)' }}><StaticLayoutRenderer template={tpl} cvData={cvData} ReadOnlyWrapper={ReadOnlyWrapper} /></div></div></div>
                      </div>);
                    })}</div>
                  </div>);
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPLACE / ADD SNIPPET MODAL */}
      {replacingSnippet && (() => {
        const MOCK_CV_DATA = {
          basics: { name: 'John Doe', title: 'Senior Software Engineer', email: 'john.doe@example.com', phone: '+1 234 567 890', location: 'New York, USA', summary: 'A passionate software engineer with 10+ years of experience in building scalable web applications and leading cross-functional teams.' },
          experience: [{ id: 'mock-1', role: 'Lead Developer', company: 'Tech Solutions Inc.', date: '2018 - Present', description: '<ul><li>Architected and developed a microservices-based platform serving 1M+ users.</li><li>Mentored junior engineers and improved sprint velocity by 25%.</li></ul>' }],
          education: [{ id: 'mock-2', degree: 'BSc Computer Science', institution: 'University of Technology', date: '2014 - 2018', description: 'Graduated with First Class Honors. President of the Coding Club.' }],
          projects: [{ id: 'mock-3', name: 'Open Source E-commerce', role: 'Creator & Maintainer', date: '2021', description: 'Built an open-source e-commerce platform with React and Node.js. 5k+ GitHub stars.' }],
          skills: { languages: 'JavaScript, TypeScript, Python, Go, Rust', frameworks: 'React, Node.js, Next.js, Express, Django', tools: 'Git, Docker, Kubernetes, AWS, GCP' },
          certifications: [{ id: 'mock-4', name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', date: '2022' }],
          awards: [{ id: 'mock-5', name: 'Developer of the Year', issuer: 'Tech Solutions Inc.', date: '2021' }],
          publications: [{ id: 'mock-6', title: 'Microservices Patterns', publisher: 'TechPress', date: '2020', description: 'A comprehensive guide to building scalable microservices.' }],
          volunteer: [{ id: 'mock-7', role: 'Mentor', organization: 'Code for Good', date: '2019 - Present', description: 'Mentoring underrepresented youth in tech.' }],
          references: [{ id: 'mock-8', name: 'Jane Smith', role: 'CTO at Tech Solutions', contact: 'jane.smith@example.com' }],
          languages: 'English (Native), Spanish (Fluent), French (Intermediate)',
          interests: 'Open Source, Photography, Hiking, Reading'
        };

        const getPreviewData = (realData: any) => {
          const isArrayEmpty = (arr: any) => !Array.isArray(arr) || arr.length === 0;
          return {
            ...realData,
            basics: {
              ...MOCK_CV_DATA.basics,
              ...realData?.basics,
              name: realData?.basics?.name || MOCK_CV_DATA.basics.name,
              title: realData?.basics?.title || MOCK_CV_DATA.basics.title,
              summary: realData?.basics?.summary || MOCK_CV_DATA.basics.summary,
            },
            experience: isArrayEmpty(realData?.experience) ? MOCK_CV_DATA.experience : realData.experience,
            education: isArrayEmpty(realData?.education) ? MOCK_CV_DATA.education : realData.education,
            projects: isArrayEmpty(realData?.projects) ? MOCK_CV_DATA.projects : realData.projects,
            skills: {
              ...MOCK_CV_DATA.skills,
              ...realData?.skills,
              languages: realData?.skills?.languages || MOCK_CV_DATA.skills.languages,
            },
            certifications: isArrayEmpty(realData?.certifications) ? MOCK_CV_DATA.certifications : realData.certifications,
            awards: isArrayEmpty(realData?.awards) ? MOCK_CV_DATA.awards : realData.awards,
            publications: isArrayEmpty(realData?.publications) ? MOCK_CV_DATA.publications : realData.publications,
            volunteer: isArrayEmpty(realData?.volunteer) ? MOCK_CV_DATA.volunteer : realData.volunteer,
            references: isArrayEmpty(realData?.references) ? MOCK_CV_DATA.references : realData.references,
            languages: realData?.languages || MOCK_CV_DATA.languages,
            interests: realData?.interests || MOCK_CV_DATA.interests,
          };
        };

        const previewData = getPreviewData(cvData);
        const currentCategories = Object.values(zones).flat().map((z: any) => SNIPPETS[z.type]?.category).filter(Boolean);

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className={`rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border ${isDarkUI ? 'bg-[#141414] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
              <div className={`p-4 border-b flex justify-between items-center ${isDarkUI ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                <h3 className={`font-bold text-base flex items-center gap-2 ${textPrimary}`}>{replacingSnippet.isAdd ? <PlusCircle size={18} className="text-emerald-500"/> : <RefreshCw size={18} className="text-blue-500"/>}{replacingSnippet.isAdd ? 'Add Snippet' : `Replace ${replacingSnippet.category}`}</h3>
                <button onClick={() => setReplacingSnippet(null)} className={`p-1.5 rounded-full ${isDarkUI ? 'bg-[#222] text-gray-300 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-colors`}><X size={18}/></button>
              </div>
              {replacingSnippet.isAdd && (
                <div className={`px-5 pt-4 pb-2 flex flex-wrap gap-2 border-b ${isDarkUI ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
                  {['All', 'Header', 'Summary', 'Experience', 'Education', 'Projects', 'Certifications', 'Awards', 'Skills', 'Languages', 'Interests', 'Publications', 'Volunteer', 'References', 'Sidebar'].map(cat => (
                    <button key={cat} onClick={() => setReplacingSnippet({...replacingSnippet, filterCategory: cat === 'All' ? null : cat})} className={`px-3 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider border ${replacingSnippet.filterCategory === cat || (!replacingSnippet.filterCategory && cat === 'All') ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : (isDarkUI ? 'bg-[#222] text-gray-400 border-[#333]' : 'bg-white text-gray-600 border-gray-200')}`}>{cat}</button>
                  ))}
                </div>
              )}
              <div className={`p-5 overflow-y-auto flex-1 custom-scrollbar ${isDarkUI ? 'bg-[#0a0a0a]' : 'bg-gray-100'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.values(SNIPPETS).filter(s => replacingSnippet.isAdd ? (!currentCategories.includes(s.category) && (!replacingSnippet.filterCategory || s.category === replacingSnippet.filterCategory)) : s.category === replacingSnippet.category).map(snippet => {
                    if (!snippet) return null;
                    const targetZoneId = replacingSnippet.zoneId;
                    const isTargetDark = activeTemplate.type.includes('dark') && targetZoneId === 'sidebar';
                    const isSidebar = ['sidebar', 'left', 'right'].includes(targetZoneId);
                    const styleKey = isSidebar && activeTemplate.sidebarTitleStyle ? activeTemplate.sidebarTitleStyle : activeTemplate.titleStyle;
                    const TitleRenderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];
                    const isCurrent = snippet.id === replacingSnippet.currentType;
                    return (
                      <div key={snippet.id} onClick={() => executeReplaceOrAdd(snippet.id)} className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-xl ${isDarkUI ? 'bg-[#111]' : 'bg-white'} ${isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/20' : (isDarkUI ? 'border-[#333] hover:border-gray-500' : 'border-gray-200 hover:border-gray-400')}`}>
                        <div className={`p-4 flex justify-between items-center z-10 ${isDarkUI ? 'bg-[#111]' : 'bg-white'}`}><div><div className={`font-bold text-[15px] ${textPrimary}`}>{snippet.name}</div><div className={`text-[10px] mt-1 font-semibold uppercase tracking-wider ${textMuted}`}>{snippet.category}</div></div>{isCurrent && <span className="bg-emerald-500/20 text-emerald-500 text-[10px] px-2 py-1 rounded font-bold tracking-widest uppercase">CURRENT</span>}</div>
                        
                        {/* Live Thumbnail Preview logic from snippet render inside modal */}
                        <div className="relative w-full overflow-hidden border-t border-gray-800" style={{ height: '220px', backgroundColor: '#f9f9f9', '--cv-font': design.font, '--cv-base-size': `${design.fontSize}px`, '--cv-spacing': design.spacing, '--cv-accent': design.accentColor, '--cv-sidebar-bg': design.sidebarBgColor, '--cv-section-gap': design.sectionGap } as React.CSSProperties}>
                          <div className="absolute top-0 left-0 w-[200%] h-[200%] origin-top-left pointer-events-none px-8 py-6 opacity-95 group-hover:opacity-100 transition-opacity cv-document text-gray-900" style={{ transform: 'scale(0.5)' }}>
                            <snippet.render data={previewData} Editable={ReadOnlyWrapper} zoneId={targetZoneId} isDark={isTargetDark} Title={({ titleKey }: any) => <TitleRenderer isDark={isTargetDark}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap /></TitleRenderer>} moveEntry={() => {}} deleteEntry={() => {}} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Global CSS Variables */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Roboto+Mono:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        :root { --cv-font: ${design.font}; --cv-base-size: ${design.fontSize}px; --cv-spacing: ${design.spacing}; --cv-accent: ${design.accentColor}; --cv-page-margin: ${design.pageMargin}px; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkUI ? '#444' : '#ccc'}; border-radius: 4px; }
        .cv-document { 
          font-family: var(--cv-font), sans-serif; color: #111827; font-size: var(--cv-base-size); position: relative; z-index: 10; 
          mask-image: linear-gradient(to bottom, 
            transparent 0, 
            transparent var(--cv-page-margin), 
            black var(--cv-page-margin), 
            black calc(297mm - var(--cv-page-margin)), 
            transparent calc(297mm - var(--cv-page-margin)), 
            transparent calc(297mm + 40px)
          );
          mask-size: 100% calc(297mm + 40px);
          mask-repeat: repeat-y;
          -webkit-mask-image: linear-gradient(to bottom, 
            transparent 0, 
            transparent var(--cv-page-margin), 
            black var(--cv-page-margin), 
            black calc(297mm - var(--cv-page-margin)), 
            transparent calc(297mm - var(--cv-page-margin)), 
            transparent calc(297mm + 40px)
          );
          -webkit-mask-size: 100% calc(297mm + 40px);
          -webkit-mask-repeat: repeat-y;
        }
        .cv-document .text-gray-900 { color: #111827 !important; }
        .cv-document .text-gray-800 { color: #1f2937 !important; }
        .cv-document .text-gray-700 { color: #374151 !important; }
        .cv-document .text-gray-600 { color: #4b5563 !important; }
        .cv-document .text-gray-500 { color: #6b7280 !important; }
        .cv-document .text-gray-400 { color: #9ca3af !important; }
        .cv-document .text-gray-300 { color: #d1d5db !important; }
        .cv-document .text-gray-200 { color: #e5e7eb !important; }
        .cv-document .text-gray-100 { color: #f3f4f6 !important; }
        .cv-document .text-white { color: #ffffff !important; }
        .cv-name { font-size: calc(var(--cv-base-size) * 2.5); line-height: 1.1; }
        .cv-name-narrow { font-size: calc(var(--cv-base-size) * 2.0); line-height: 1.1; }
        .cv-role { font-size: calc(var(--cv-base-size) * 1.15); }
        .cv-heading { font-size: calc(var(--cv-base-size) * 1.1); }
        .cv-title { font-size: calc(var(--cv-base-size) * 1.05); }
        .cv-subtitle { font-size: calc(var(--cv-base-size) * 0.95); }
        .cv-date { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-contact { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-body { font-size: inherit; line-height: calc(1.6 * var(--cv-spacing)); }
        .cv-document p, .cv-document ul, .cv-document li { font-size: inherit !important; line-height: inherit !important; margin: 0; padding: 0; }
        .cv-prose p { margin-bottom: calc(0.3em * var(--cv-spacing)) !important; }
        .cv-prose ul { list-style-type: disc; padding-left: 1.2em; margin-top: calc(0.25em * var(--cv-spacing)) !important; margin-bottom: calc(0.25em * var(--cv-spacing)) !important; }
        .cv-prose li { margin-bottom: calc(0.15em * var(--cv-spacing)) !important; }
        [contenteditable]:empty:before { content: attr(placeholder); color: #9ca3af; pointer-events: none; display: block; }
        .cv-accent-text { color: var(--cv-accent) !important; }
        .cv-accent-bg { background-color: var(--cv-accent) !important; }
        .cv-accent-border { border-color: var(--cv-accent) !important; }
        .cv-document .cv-gap-sm { gap: calc(0.5rem * var(--cv-spacing)) !important; }
        .cv-document .cv-gap-md { gap: calc(0.75rem * var(--cv-spacing)) !important; }
        .cv-document .cv-gap-lg { gap: calc(1rem * var(--cv-spacing)) !important; }
        .cv-page-visualizer { position: absolute; inset: 0; pointer-events: none; z-index: -1; background-size: 100% calc(297mm + 40px); background-image: linear-gradient(to bottom, #ffffff 0, #ffffff 297mm, transparent 297mm, transparent calc(297mm + 40px)); filter: drop-shadow(0 15px 25px rgba(0,0,0,0.15)); }
        @media print {
          @page { margin: var(--cv-page-margin); size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          .cv-document-wrapper { transform: none !important; padding: 0 !important; box-shadow: none !important; margin: 0 !important; overflow: visible !important; }
          .cv-document { width: 100% !important; min-height: auto !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; display: block !important; height: auto !important; mask-image: none !important; -webkit-mask-image: none !important; }
          .cv-page-breakable { margin-top: 0 !important; }
          .cv-section { break-inside: auto !important; page-break-inside: auto !important; display: block !important; width: 100% !important; }
          .cv-item { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
          .cv-keep-with-next { break-inside: avoid !important; page-break-inside: avoid !important; break-after: avoid !important; display: block !important; width: 100% !important; }
          .cv-item-avoid { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; }
          .cv-page-visualizer { display: none !important; }
        }
        @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in-up { animation: fadeInUp 0.2s ease-out forwards; }
        @keyframes snippetEntrance { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .snippet-anim { animation: snippetEntrance 0.4s ease-out forwards; }
      `}} />
      </div>
    </CanvasContext.Provider>
  );
});

CVCanvasEngine.displayName = 'CVCanvasEngine';

export default CVCanvasEngine;
