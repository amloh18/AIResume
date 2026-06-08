'use client';


import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import { GripVertical, Download, Plus, LayoutTemplate, Save, RefreshCw, Layers, Check, Search, Filter, Briefcase, PlusCircle, Trash2, ChevronUp, ChevronDown, ImageIcon, ArrowRight, Loader2, PlayCircle, Eye, MousePointer2, Wand2, Quote, FileText, Palette, FileJson, X, Sparkles, Copy, CopyCheck, AlertCircle } from 'lucide-react';
import { CANVAS_TEMPLATES, TEMPLATE_CATEGORIES, SNIPPETS, TITLE_STYLES, SNIPPET_FAMILIES, ATS_SNIPPETS } from './registry';
import { EditableField, CanvasSnippet, CanvasZone, StaticLayoutRenderer, FloatingToolbar, CanvasContext } from './components/CoreUI';
import { JSONSidebarViewer } from './components/JSONSidebarViewer';
import ListEntry from './components/ListEntry';
import { generateId, setNestedValue, getNestedValue, escapeRegExp } from './helpers';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { analyzeText } from '@/lib/grammar/engine';
import { computeCanvasLayoutMetrics } from './layout-utils';
import { DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';

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
  cvId?: string | null;
  jobId?: string | null;
  role?: string | null;
  moriChatMode?: boolean;
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
  const [activeTab, setActiveTab] = useState<'improvement' | 'original'>('improvement');
  const [copied, setCopied] = useState(false);
  const { openPaymentModal } = usePaymentModal();

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
        if (top + 400 > window.innerHeight - 20) {
          top = window.innerHeight - 420;
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

  const handleCopy = () => {
    if (!pointSuggestion?.text) return;
    navigator.clipboard.writeText(pointSuggestion.text.replace(/<\/?[^>]+(>|$)/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!pointSuggestion) return null;

  return (
    <div className={`fixed z-[110] border border-emerald-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl p-0 w-[440px] bg-[#0f0f0f] transition-all duration-75 overflow-hidden font-sans`} style={{ top: pos.top, left: pos.left }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-500/20 rounded-lg">
            <Wand2 size={18} className={pointSuggestion.loading ? 'animate-spin' : 'text-emerald-400'} />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-white uppercase tracking-wider">ThinkHard AI</h4>
            <p className="text-[10px] text-emerald-400/70 font-medium uppercase tracking-widest">{pointSuggestion.loading ? 'Processing...' : 'Contextual Suggestion'}</p>
          </div>
        </div>
        <button onClick={() => setPointSuggestion(null)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"><X size={18}/></button>
      </div>

      {/* Tabs */}
      {!pointSuggestion.loading && !pointSuggestion.error && (
        <div className="flex px-5 pt-4 gap-4 border-b border-white/5">
          <button 
            onClick={() => setActiveTab('improvement')}
            className={`pb-3 text-xs font-bold tracking-wide transition-all relative ${activeTab === 'improvement' ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            IMPROVEMENT
            {activeTab === 'improvement' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('original')}
            className={`pb-3 text-xs font-bold tracking-wide transition-all relative ${activeTab === 'original' ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            ORIGINAL
            {activeTab === 'original' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />}
          </button>
        </div>
      )}
      
      {/* Content Area */}
      <div className="p-5 min-h-[120px]">
        {pointSuggestion.loading ? (
          <div className="space-y-3 py-2">
            <div className="h-3.5 bg-white/5 rounded-full animate-pulse w-full"></div>
            <div className="h-3.5 bg-white/5 rounded-full animate-pulse w-[90%]"></div>
            <div className="h-3.5 bg-white/5 rounded-full animate-pulse w-[75%]"></div>
            <div className="h-3.5 bg-white/5 rounded-full animate-pulse w-[40%]"></div>
          </div>
        ) : pointSuggestion.error === 'usage_limit_reached' ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
            <AlertCircle className="text-red-400 shrink-0" size={20} />
            <div className="text-sm text-red-100 leading-relaxed">
              <span className="font-bold block mb-1">Limit Reached</span>
              Upgrade to Pro for unlimited AI-powered contextual suggestions and career coaching.
              <button
                type="button"
                onClick={() =>
                  openPaymentModal({
                    preselectedPlanKey: 'pro_monthly',
                    triggerContext: 'ai-contextual-suggestion-limit',
                    returnUrl: window.location.href
                  })
                }
                className="block mt-2 font-bold text-red-400 hover:text-red-300 underline underline-offset-4"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        ) : pointSuggestion.error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle size={16} /> {pointSuggestion.error}
          </div>
        ) : (
          <div className="relative group">
            <div className={`text-[14px] leading-relaxed transition-all duration-300 ${activeTab === 'original' ? 'text-gray-400 italic' : 'text-gray-100'}`}>
              {activeTab === 'improvement' ? pointSuggestion.text : pointSuggestion.originalText}
            </div>
            {activeTab === 'improvement' && (
              <button 
                onClick={handleCopy}
                className="absolute -right-2 -top-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                title="Copy to clipboard"
              >
                {copied ? <CopyCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Quick Actions & Footer */}
      {!pointSuggestion.loading && !pointSuggestion.error && (
        <div className="px-5 pb-5 space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Targeted Refinement</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleFetchSuggestion('star')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition-all border border-blue-500/20"><Sparkles size={12}/> STAR Method</button>
              <button onClick={() => handleFetchSuggestion('quantify')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold transition-all border border-purple-500/20"># Quantify</button>
              <button onClick={() => handleFetchSuggestion('concise')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs font-bold transition-all border border-orange-500/20">✂️ Concise</button>
              <button onClick={() => handleFetchSuggestion('action_verbs')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold transition-all border border-emerald-500/20">🚀 Power Verbs</button>
              
              <div className="relative inline-block">
                <select 
                  onChange={(e) => handleFetchSuggestion('tone', e.target.value)} 
                  className="bg-white/5 hover:bg-white/10 text-xs text-gray-300 border border-white/10 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500/50 appearance-none cursor-pointer pr-7 font-bold transition-all"
                >
                  <option value="">🎭 Tone...</option>
                  <option value="Professional">Professional</option>
                  <option value="Confident">Confident</option>
                  <option value="Creative">Creative</option>
                  <option value="Action-oriented">Action-oriented</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button onClick={() => setPointSuggestion(null)} className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all">Cancel</button>
            <button 
              onClick={() => { 
                const currentHtml = getNestedValue(cvData, pointSuggestion.path) || ''; 
                let newHtml = currentHtml; 
                if (newHtml.includes('</ul>')) { 
                  newHtml = newHtml.replace('</ul>', `<li>${pointSuggestion.text}</li></ul>`); 
                } else { 
                  newHtml += `<ul><li>${pointSuggestion.text}</li></ul>`; 
                } 
                handleDataChange(pointSuggestion.path, newHtml); 
                setPointSuggestion(null); 
              }} 
              className="flex-[1.5] px-4 py-2.5 text-sm font-bold rounded-xl shadow-[0_4px_20px_rgba(126,231,135,0.2)] bg-emerald-400 text-[#0a0a0a] hover:bg-emerald-300 active:scale-[0.98] transition-all"
            >
              Accept & Add Bullet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const normalizeSkillValue = (skill: string) => skill.trim().replace(/\s+/g, ' ').toLowerCase();

const coerceSkillGroups = (value: any) => {
  if (Array.isArray(value)) {
    return value
      .map((group: any, index: number) => {
        if (typeof group === 'string') {
          return { id: `skills-${index}`, category: `Skills ${index + 1}`, skills: group.split(',').map((item) => item.trim()).filter(Boolean) };
        }

        const rawSkills = Array.isArray(group?.skills)
          ? group.skills
          : typeof group?.skillsText === 'string'
            ? group.skillsText.split(/[,\n]/)
            : [];

        return {
          ...group,
          id: group?.id || `skills-${index}`,
          category: group?.category || group?.name || `Skills ${index + 1}`,
          skills: rawSkills.map((item: string) => item.trim()).filter(Boolean),
        };
      })
      .filter((group) => group.category || group.skills.length > 0);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).map(([category, skills], index) => ({
      id: `skills-${index}`,
      category,
      skills: String(skills || '').split(/[,\n]/).map((item) => item.trim()).filter(Boolean),
    })).filter((group) => group.skills.length > 0);
  }

  if (typeof value === 'string' && value.trim()) {
    return [{ id: 'skills-0', category: 'Core Skills', skills: value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean) }];
  }

  return [];
};

const mergeSkillSuggestionsIntoCV = (sourceCvData: any, categories: Array<{ category: string; skills: string[] }>) => {
  const mergedGroups = coerceSkillGroups(sourceCvData?.skills);
  const existingByCategory = new Map(
    mergedGroups.map((group: any) => [group.category.trim().toLowerCase(), group])
  );

  categories.forEach((category, index) => {
    const normalizedCategory = category.category.trim().toLowerCase();
    const incomingSkills = category.skills.map((skill) => skill.trim()).filter(Boolean);
    if (incomingSkills.length === 0) return;

    const existingGroup = existingByCategory.get(normalizedCategory);
    if (existingGroup) {
      const seen = new Set(existingGroup.skills.map((skill: string) => normalizeSkillValue(skill)));
      incomingSkills.forEach((skill) => {
        if (!seen.has(normalizeSkillValue(skill))) {
          existingGroup.skills.push(skill);
          seen.add(normalizeSkillValue(skill));
        }
      });
      return;
    }

    const nextGroup = {
      id: `skills-suggested-${Date.now()}-${index}`,
      category: category.category,
      skills: incomingSkills,
    };
    mergedGroups.push(nextGroup);
    existingByCategory.set(normalizedCategory, nextGroup);
  });

  return {
    ...sourceCvData,
    skills: mergedGroups.map((group: any) => ({
      ...(group.id ? { id: group.id } : {}),
      category: group.category,
      skills: group.skills,
      skillsText: group.skills.join(', '),
    })),
  };
};

const CVCanvasEngine = forwardRef<CVCanvasBuilderRef, CVCanvasBuilderProps>(({ cvData, onDataChange, theme = 'dark', template, onTemplateChange, readOnly = false, cvId, jobId, role, moriChatMode = false }, ref) => {
  const [activeTemplate, setActiveTemplate] = useState(cvData?.metadata?.canvasTemplate || template || CANVAS_TEMPLATES[0]);
  const [focusedNode, setFocusedNode] = useState<HTMLElement | null>(null);
  const [zones, setZones] = useState<Record<string, any[]>>(cvData?.metadata?.canvasZones || {});
  const [templateAnimKey, setTemplateAnimKey] = useState(0);
  const [design, setDesign] = useState(cvData?.metadata?.canvasDesign || { font: 'Inter', fontSize: 12, spacing: 1.0, accentColor: '#22c55e', pageMargin: 40, showContactIcons: true, showHeaderIcons: true, headerLinks: {} as Record<string, boolean>, sidebarBgColor: '#f8fafc', sectionGap: 16, pageSize: 'A4' as 'A4' | 'Letter', dateFormat: 'MMM YYYY' });
  const [activeSidebar, setActiveSidebar] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [replacingSnippet, setReplacingSnippet] = useState<any>(null);
  const [dragState, setDragState] = useState<any>({ isDragging: false, sourceZoneId: null, sourceIndex: null, overZoneId: null, overIndex: null });
  const [dragPreview, setDragPreview] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [totalPagesCount, setTotalPagesCount] = useState(1);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 1080 : window.innerHeight,
    devicePixelRatio: typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
  }));

  useEffect(() => {
    if (template && template.id !== activeTemplate.id && !cvData?.metadata?.canvasTemplate) {
      loadTemplate(template);
    }
  }, [template]);

  useEffect(() => {
    // Only trigger save if not readOnly
    if (readOnly) return;

    // Use a small timeout to prevent too many updates, but keep data synced
    const timer = setTimeout(() => {
      const updatedMetadata = {
        ...cvData?.metadata,
        canvasDesign: design,
        canvasTemplate: activeTemplate,
        canvasZones: zones
      };

      if (
        JSON.stringify(cvData?.metadata?.canvasDesign) !== JSON.stringify(design) ||
        JSON.stringify(cvData?.metadata?.canvasTemplate?.id) !== JSON.stringify(activeTemplate.id) ||
        JSON.stringify(cvData?.metadata?.canvasZones) !== JSON.stringify(zones)
      ) {
        onDataChange({ ...cvData, metadata: updatedMetadata });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [design, activeTemplate, zones, readOnly]);
  const [aiIssues, setAiIssues] = useState<any[]>([]);
  const [grammarIssues, setGrammarIssues] = useState<any[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [cvScore, setCvScore] = useState(100);
  const [pointSuggestion, setPointSuggestion] = useState<{ path: string, text: string, node?: HTMLElement, loading?: boolean, originalText?: string, error?: string } | null>(null);
  const [skillsSuggestionState, setSkillsSuggestionState] = useState<{
    open: boolean;
    loading: boolean;
    applying: boolean;
    error: string | null;
    categories: Array<{ category: string; skills: string[] }>;
    meta: { role?: string } | null;
  }>({
    open: false,
    loading: false,
    applying: false,
    error: null,
    categories: [],
    meta: null,
  });

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

  // Copy the JSON template (DEFAULT_UNIFIED_CV_DATA) to the user's clipboard
  const handleCopyJsonTemplate = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(DEFAULT_UNIFIED_CV_DATA, null, 2));
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(DEFAULT_UNIFIED_CV_DATA, null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };
  const layoutMetrics = useMemo(() => computeCanvasLayoutMetrics({
    pageSize: design.pageSize,
    pageMargin: design.pageMargin,
    sectionGap: design.sectionGap,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    devicePixelRatio: viewport.devicePixelRatio,
  }), [design.pageMargin, design.pageSize, design.sectionGap, viewport.devicePixelRatio, viewport.height, viewport.width]);

  const canvasStyleVars = useMemo(() => ({
    width: 'var(--cv-page-width)',
    '--cv-font': design.font,
    '--cv-base-size': `${design.fontSize}px`,
    '--cv-spacing': design.spacing,
    '--cv-accent': design.accentColor,
    '--cv-page-margin': `${layoutMetrics.pageMarginPx}px`,
    '--cv-page-gap': `${layoutMetrics.pageGapPx}px`,
    '--cv-page-width': layoutMetrics.pageWidthCss,
    '--cv-page-height': layoutMetrics.pageHeightCss,
    '--cv-sidebar-bg': design.sidebarBgColor,
    '--cv-section-gap': `${layoutMetrics.sectionGapPx}px`,
    '--cv-column-gap': `${Math.max(24, layoutMetrics.sectionGapPx + 12)}px`,
    '--cv-workspace-bg': isDarkUI ? '#1a1a1a' : '#f3f2ee',
  } as React.CSSProperties), [design.accentColor, design.font, design.fontSize, design.sidebarBgColor, design.spacing, isDarkUI, layoutMetrics.pageGapPx, layoutMetrics.pageHeightCss, layoutMetrics.pageMarginPx, layoutMetrics.pageWidthCss, layoutMetrics.sectionGapPx]);

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!cvData?.metadata?.canvasTemplate) {
      loadTemplate(template || CANVAS_TEMPLATES[0]);
    }
    const handleDragStart = (e: any) => {
      setDragState((prev: any) => ({ ...prev, isDragging: true, sourceZoneId: e.detail.zoneId, sourceIndex: e.detail.index }));
      setDragPreview({
        markup: e.detail.previewMarkup,
        width: Math.min(e.detail.width || 360, 520),
        height: e.detail.height || 0,
        label: e.detail.label || 'Section',
        x: e.detail.pointer?.x || 0,
        y: e.detail.pointer?.y || 0,
      });
    };
    const handleDragOver = (e: any) => setDragState((prev: any) => ({ ...prev, overZoneId: e.detail.zoneId, overIndex: e.detail.index }));
    const handleDragEnd = () => {
      setDragState({ isDragging: false, sourceZoneId: null, sourceIndex: null, overZoneId: null, overIndex: null });
      setDragPreview(null);
    };
    const handleWindowDragOver = (event: DragEvent) => {
      setDragPreview((prev: any) => prev ? { ...prev, x: event.clientX, y: event.clientY } : prev);
    };
    document.addEventListener('snippet-drag-start', handleDragStart);
    document.addEventListener('snippet-drag-over', handleDragOver);
    document.addEventListener('snippet-drag-end', handleDragEnd);
    window.addEventListener('dragover', handleWindowDragOver);
    return () => {
      document.removeEventListener('snippet-drag-start', handleDragStart);
      document.removeEventListener('snippet-drag-over', handleDragOver);
      document.removeEventListener('snippet-drag-end', handleDragEnd);
      window.removeEventListener('dragover', handleWindowDragOver);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination Engine
  useEffect(() => {
    const container = document.querySelector('.cv-document-wrapper');
    if (!container) return;

    let debounceTimer: ReturnType<typeof setTimeout>;
    const MAX_REASONABLE_PAGES = 50;
    const MIN_SCALE = 0.25;

    const paginate = () => {
      const doc = container.querySelector('.cv-document') as HTMLElement;
      if (!doc) return;

      const PAGE_HEIGHT = layoutMetrics.pageHeightPx;
      const PAGE_GAP = layoutMetrics.pageGapPx;
      const EFFECTIVE_HEIGHT = layoutMetrics.slotHeightPx;
      const PAGE_TOP_PADDING = layoutMetrics.pageTopPaddingPx;
      const PAGE_BOTTOM_PADDING = layoutMetrics.pageBottomPaddingPx;
      // Minimum content height to be worth pushing (avoid pushing tiny orphans)
      const MIN_PUSH_HEIGHT = 20;

      // Collect only item- and top-level keep-with-next targets.
      const rawBreakables = Array.from(
        doc.querySelectorAll('.cv-page-breakable, .cv-keep-with-next')
      ) as HTMLElement[];

      const allBreakables = rawBreakables.filter((item) => {
        if (!item.isConnected) return false;
        if (
          item.classList.contains('cv-keep-with-next') &&
          item.parentElement?.closest('.cv-page-breakable')
        ) {
          return false;
        }
        return true;
      });

      const measureElement = (element: HTMLElement, docRect: DOMRect, scale: number) => {
        const itemRect = element.getBoundingClientRect();
        const top = (itemRect.top - docRect.top) / scale;
        const height = itemRect.height / scale;
        const bottom = top + height;
        return { top, height, bottom };
      };

      // --- PASS 1: Reset all injected margins so we measure natural positions ---
      allBreakables.forEach(item => { item.style.marginTop = ''; });
      doc.style.height = '';

      // --- PASS 2: measure + apply in a single rAF after DOM has settled ---
      requestAnimationFrame(() => {
        const docRect = doc.getBoundingClientRect();
        // Scale factor when canvas is zoomed
        const scale = docRect.width > 0 && doc.offsetWidth > 0 ? docRect.width / doc.offsetWidth : 1;

        if (!Number.isFinite(scale) || scale < MIN_SCALE || !Number.isFinite(EFFECTIVE_HEIGHT) || EFFECTIVE_HEIGHT <= 0) {
          console.warn('CVCanvasEngine pagination skipped due to invalid layout metrics', {
            scale,
            effectiveHeight: EFFECTIVE_HEIGHT,
          });
          return;
        }

        const printableHeight = PAGE_HEIGHT - PAGE_TOP_PADDING - PAGE_BOTTOM_PADDING;
        const MAX_PAGINATION_PASSES = 5;

        for (let pass = 0; pass < MAX_PAGINATION_PASSES; pass += 1) {
          let didChange = false;
          const pushedElements = new Set<HTMLElement>();

          allBreakables.forEach((item, index) => {
            // If an ancestor was already pushed, we don't need to push this item individually
            // because it has already been carried over to the next page by the parent.
            let parent = item.parentElement;
            let isAncestorPushed = false;
            while (parent && parent !== doc) {
              if (pushedElements.has(parent)) {
                isAncestorPushed = true;
                break;
              }
              parent = parent.parentElement;
            }

            if (isAncestorPushed) return;

            const { top, height, bottom } = measureElement(item, docRect, scale);
            if (![top, height, bottom].every(Number.isFinite)) return;

            const pageIndex = Math.max(0, Math.floor(top / EFFECTIVE_HEIGHT));
            const pageContentTop = pageIndex * EFFECTIVE_HEIGHT + PAGE_TOP_PADDING;
            const pageContentBottom = pageIndex * EFFECTIVE_HEIGHT + PAGE_HEIGHT - PAGE_BOTTOM_PADDING;
            const nextPageContentTop = (pageIndex + 1) * EFFECTIVE_HEIGHT + PAGE_TOP_PADDING;

            let requiredPush = 0;

            // If an entry starts inside the reserved top margin band for a page,
            // move it down so the new page starts cleanly.
            if (pageIndex > 0 && top < pageContentTop) {
              requiredPush = Math.max(requiredPush, pageContentTop - top);
            }

            // If an entry crosses the printable bottom area and can fit on the next page,
            // move the whole block instead of letting it disappear into the visual gap.
            if (
              bottom > pageContentBottom &&
              height < printableHeight &&
              height > MIN_PUSH_HEIGHT
            ) {
              requiredPush = Math.max(requiredPush, nextPageContentTop - top);
            } else if (item.classList.contains('cv-keep-with-next')) {
              // Keep section headers with the first block that follows them.
              const nextItem = allBreakables[index + 1];
              if (nextItem && !pushedElements.has(nextItem)) {
                const { height: nextHeight, bottom: nextBottom } = measureElement(nextItem, docRect, scale);
                if (
                  nextBottom > pageContentBottom &&
                  nextHeight < printableHeight &&
                  nextHeight > MIN_PUSH_HEIGHT
                ) {
                  requiredPush = Math.max(requiredPush, nextPageContentTop - top);
                }
              }
            }

            const normalizedPush = Math.min(requiredPush, EFFECTIVE_HEIGHT);
            if (Number.isFinite(normalizedPush) && normalizedPush > 0) {
              const nextMarginTop = `${normalizedPush}px`;
              if (item.style.marginTop !== nextMarginTop) {
                item.style.marginTop = nextMarginTop;
                didChange = true;
              }
              pushedElements.add(item);
            }
          });

          if (!didChange) {
            break;
          }
        }

        let maxBottom = 0;
        allBreakables.forEach((item) => {
          const currentBottom = (item.getBoundingClientRect().bottom - docRect.top) / scale;
          if (Number.isFinite(currentBottom) && currentBottom > maxBottom) {
            maxBottom = currentBottom;
          }
        });

        // Calculate total pages needed
        const naturalScrollHeight = doc.scrollHeight / scale;
        const measuredBottom = Math.max(maxBottom, naturalScrollHeight);
        if (!Number.isFinite(measuredBottom) || measuredBottom <= 0) {
          console.warn('CVCanvasEngine pagination aborted due to invalid measured bottom', { measuredBottom });
          return;
        }

        const totalPages = Math.min(
          MAX_REASONABLE_PAGES,
          Math.max(1, Math.ceil(measuredBottom / EFFECTIVE_HEIGHT))
        );

        if (totalPages === MAX_REASONABLE_PAGES && measuredBottom / EFFECTIVE_HEIGHT > MAX_REASONABLE_PAGES) {
          console.warn('CVCanvasEngine pagination capped suspicious page count', {
            measuredBottom,
            effectiveHeight: EFFECTIVE_HEIGHT,
          });
        }

        setTotalPagesCount(prev => prev !== totalPages ? totalPages : prev);

        const newHeight = `${(totalPages * PAGE_HEIGHT) + Math.max(0, totalPages - 1) * PAGE_GAP}px`;
        if (doc.style.height !== newHeight) {
          doc.style.height = newHeight;
        }
      });
    };

    // Initial run with a short delay to let React finish painting
    const initTimer = setTimeout(paginate, 120);

    // Re-run on any size change (content grows/shrinks)
    const ro = new ResizeObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(paginate, 60);
    });

    const docElement = container.querySelector('.cv-document');
    if (docElement) ro.observe(docElement);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(debounceTimer);
      ro.disconnect();
    };
  }, [cvData, templateAnimKey, activeTemplate, layoutMetrics.pageBottomPaddingPx, layoutMetrics.pageGapPx, layoutMetrics.pageHeightPx, layoutMetrics.pageTopPaddingPx, layoutMetrics.slotHeightPx]);

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

  const getFocusedPath = useCallback(() => {
    if (!focusedNode) return null;
    let path = focusedNode.getAttribute('data-path');
    if (!path) {
      const parentWithPath = focusedNode.closest('[data-path]');
      if (parentWithPath) path = parentWithPath.getAttribute('data-path');
    }
    return path || null;
  }, [focusedNode]);

  const openSkillsSuggestions = useCallback(async () => {
    setSkillsSuggestionState({
      open: true,
      loading: true,
      applying: false,
      error: null,
      categories: [],
      meta: null,
    });

    try {
      const response = await fetch('/api/ai/skills-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvId,
          cvData,
          jobId,
          role,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to load skill suggestions');
      }

      setSkillsSuggestionState({
        open: true,
        loading: false,
        applying: false,
        error: null,
        categories: Array.isArray(result?.data?.categories) ? result.data.categories : [],
        meta: result?.data?.meta || null,
      });
    } catch (error: any) {
      setSkillsSuggestionState({
        open: true,
        loading: false,
        applying: false,
        error: error?.message || 'Failed to load skill suggestions',
        categories: [],
        meta: null,
      });
    }
  }, [cvData, cvId, jobId, role]);

  const applySkillSuggestions = useCallback((categories: Array<{ category: string; skills: string[] }>) => {
    if (!categories.length) return;
    setSkillsSuggestionState((prev) => ({ ...prev, applying: true }));
    const updatedCv = mergeSkillSuggestionsIntoCV(cvData, categories);
    onDataChange(updatedCv);
    setSkillsSuggestionState({
      open: false,
      loading: false,
      applying: false,
      error: null,
      categories: [],
      meta: null,
    });
  }, [cvData, onDataChange]);

  const handleSuggestPoint = (mode?: 'skills') => {
    if (mode === 'skills') {
      void openSkillsSuggestions();
      return;
    }

    const path = getFocusedPath();
    if (!path || (!path.includes('description') && !path.includes('summary'))) return;
    const originalText = focusedNode?.innerText || '';
    setPointSuggestion({ path, text: originalText, originalText, node: focusedNode as HTMLElement, loading: false });
  };

  useEffect(() => {
    if (!focusedNode) return;
    const path = getFocusedPath();
    if (!path) return;

    const timer = setTimeout(() => {
      const rawValue = getNestedValue(cvData, path) || '';
      const temp = document.createElement('div');
      temp.innerHTML = typeof rawValue === 'string' ? rawValue : String(rawValue || '');
      const text = temp.textContent || '';
      if (!text.trim()) {
        setGrammarIssues([]);
        return;
      }
      const issues = analyzeText(text, { locale: 'us' }).map((issue: any) => ({
        id: `grammar:${path}:${issue.startIndex}:${issue.endIndex}:${issue.type}`,
        category: 'grammar',
        type: issue.type,
        path,
        targetText: issue.text,
        suggestion: issue.suggestion,
        message: issue.message
      }));
      setGrammarIssues(issues);
    }, 600);

    return () => clearTimeout(timer);
  }, [cvData, focusedNode, getFocusedPath]);

  const handleFetchSuggestion = async (type: 'star' | 'tone' | 'quantify' | 'concise' | 'action_verbs', tone?: string) => {
    if (!pointSuggestion) return;
    setPointSuggestion(prev => prev ? { ...prev, loading: true, error: undefined } : null);
    try {
      const isSummary = pointSuggestion.path.includes('summary');
      const response = await fetch('/api/ai/fix-and-improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: pointSuggestion.originalText, 
          type: isSummary ? 'summary' : 'experience', 
          promptType: type,
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

  const isSnippetDropAllowed = useCallback((targetZoneId: string, dragData: any) => {
    if (!dragData?.instance?.type) return false;
    const snippetCategory = SNIPPETS[dragData.instance.type]?.category;
    const isSidebarZone = ['sidebar', 'left', 'right'].includes(targetZoneId);

    if (snippetCategory === 'Header') {
      return targetZoneId === 'header';
    }

    if (targetZoneId === 'header') {
      return false;
    }

    if (snippetCategory === 'Sidebar') {
      return isSidebarZone;
    }

    return true;
  }, []);

  const handleZoneDrop = (targetZoneId: string, dragData: any, targetIndex: number) => {
    setZones(prev => {
      if (!isSnippetDropAllowed(targetZoneId, dragData)) {
        return prev;
      }
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
      <CanvasZone readOnly={readOnly} zoneId={zoneId} blocks={safeZones[zoneId] || []} cvData={cvData} EditableWrapper={readOnly ? ReadOnlyWrapper : EditableWrapper} handleDrop={handleZoneDrop} moveSnippet={moveSnippet} removeSnippet={removeSnippet} onReplace={handleReplaceClick} onAddSnippet={handleAddClick} onTogglePhoto={handleTogglePhoto} onAddListEntry={handleAddListEntry} moveEntry={moveEntry} deleteEntry={deleteEntry} dragState={dragState} activeTemplate={activeTemplate} layoutZones={safeZones} className={className} isDark={isDark} onOpenSkillsSuggestions={() => void openSkillsSuggestions()} isDropAllowed={isSnippetDropAllowed} />
    );

    switch (layoutType) {
      case '1-col': return <div className="w-full shadow-2xl mx-auto flex flex-col cv-document" style={{ width: 'var(--cv-page-width)', minHeight: 'var(--cv-page-height)', backgroundColor: 'transparent' }}><div className="h-max" style={{ padding: 'var(--cv-page-margin)' }}>{renderZone('main', 'w-full min-w-0')}</div></div>;
      case '2-col': return <div className="w-full shadow-2xl mx-auto flex flex-col cv-document" style={{ width: 'var(--cv-page-width)', minHeight: 'var(--cv-page-height)', backgroundColor: 'transparent' }}>{safeZones['header'] && <div style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex h-max items-start" style={{ gap: 'var(--cv-column-gap)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: safeZones['header'] ? 'var(--cv-section-gap, 16px)' : 'var(--cv-page-margin)' }}><div className="flex-1 min-w-0">{renderZone('left', 'h-max')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-max')}</div></div></div>;
      case 'sidebar-left': return <div className="w-full shadow-2xl mx-auto flex cv-document relative" style={{ width: 'var(--cv-page-width)', minHeight: 'var(--cv-page-height)', backgroundColor: 'transparent' }}><div className="absolute left-0 top-0 bottom-0 w-[32%] z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}></div><div className="w-[32%] min-w-0 border-r border-slate-200 relative z-10" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: '5mm', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('sidebar', 'h-max', false)}</div><div className="w-[68%] min-w-0 relative z-10" style={{ paddingLeft: '5mm', paddingRight: 'var(--cv-page-margin)', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('main', 'h-max')}</div></div>;
      case 'sidebar-left-dark': return <div className="w-full shadow-2xl mx-auto flex cv-document relative" style={{ width: 'var(--cv-page-width)', minHeight: 'var(--cv-page-height)', backgroundColor: 'transparent' }}><div className="absolute left-0 top-0 bottom-0 w-[32%] z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}></div><div className="w-[32%] min-w-0 relative z-10" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: '5mm', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('sidebar', 'h-max', true)}</div><div className="w-[68%] min-w-0 relative z-10" style={{ paddingLeft: '5mm', paddingRight: 'var(--cv-page-margin)', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('main', 'h-max')}</div></div>;
      case 'sidebar-right': return <div className="w-full shadow-2xl mx-auto flex cv-document relative" style={{ width: 'var(--cv-page-width)', minHeight: 'var(--cv-page-height)', backgroundColor: 'transparent' }}><div className="w-[68%] min-w-0 relative z-10" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: '5mm', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('main', 'h-max')}</div><div className="absolute right-0 top-0 bottom-0 w-[32%] z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}></div><div className="w-[32%] min-w-0 border-l border-slate-200 relative z-10" style={{ paddingLeft: '5mm', paddingRight: 'var(--cv-page-margin)', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>{renderZone('sidebar', 'h-max', false)}</div></div>;
      case 'top-sidebar-left': return <div className="w-full shadow-2xl mx-auto flex flex-col cv-document relative" style={{ width: 'var(--cv-page-width)', minHeight: 'var(--cv-page-height)', backgroundColor: 'transparent' }}>{safeZones['header'] && <div className="relative z-10" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex h-max relative z-10 items-start" style={{ gap: 'var(--cv-column-gap)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: 'var(--cv-section-gap, 16px)' }}><div className="absolute left-[var(--cv-page-margin)] top-[var(--cv-section-gap,16px)] bottom-[var(--cv-page-margin)] w-[calc(32%-1rem)] rounded-lg z-[-1]" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}></div><div className="w-[32%] min-w-0 border-r border-slate-200" style={{ paddingRight: '5mm' }}>{renderZone('sidebar', 'h-max', false)}</div><div className="w-[68%] min-w-0">{renderZone('main', 'h-max')}</div></div></div>;
      case 'top-sidebar-right': return <div className="w-full shadow-2xl mx-auto flex flex-col cv-document relative" style={{ width: 'var(--cv-page-width)', minHeight: 'var(--cv-page-height)', backgroundColor: 'transparent' }}>{safeZones['header'] && <div className="relative z-10" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex h-max relative z-10 items-start" style={{ gap: 'var(--cv-column-gap)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: 'var(--cv-section-gap, 16px)' }}><div className="w-[68%] min-w-0">{renderZone('main', 'h-max')}</div><div className="absolute right-[var(--cv-page-margin)] top-[var(--cv-section-gap,16px)] bottom-[var(--cv-page-margin)] w-[calc(32%-1rem)] rounded-lg z-[-1]" style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}></div><div className="w-[32%] min-w-0 border-l border-slate-200" style={{ paddingLeft: '5mm' }}>{renderZone('sidebar', 'h-max', false)}</div></div></div>;
      case 'hybrid-split': return <div className="w-full shadow-2xl mx-auto flex flex-col cv-document" style={{ width: 'var(--cv-page-width)', minHeight: 'var(--cv-page-height)', backgroundColor: 'transparent' }}>{safeZones['header'] && <div style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>{renderZone('header', 'w-full min-w-0')}</div>}<div style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingTop: 'var(--cv-section-gap, 16px)', paddingBottom: 0 }}>{renderZone('main', 'w-full min-w-0')}</div><div className="flex h-max items-start" style={{ gap: 'var(--cv-column-gap)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: 0 }}><div className="flex-1 min-w-0">{renderZone('left', 'h-max')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-max')}</div></div></div>;
      default: return <div>Layout not found</div>;
    }
  };

  return (
    <CanvasContext.Provider
      value={{
        cvData,
        design,
        handleDataChange,
        setFocusedNode,
        aiIssues: [...aiIssues, ...grammarIssues],
        activeIssueId,
        moriChatMode,
        onIssueClick: (id: string) => {
          const all = [...aiIssues, ...grammarIssues];
          const issue = all.find((i: any) => i.id === id);
          if (issue?.category === 'grammar' && issue.suggestion) {
            const currentValue = getNestedValue(cvData, issue.path);
            const fixedValue =
              typeof currentValue === 'string'
                ? currentValue.replace(new RegExp(escapeRegExp(issue.targetText), 'g'), issue.suggestion)
                : currentValue;
            handleDataChange(issue.path, fixedValue);
            setGrammarIssues(prev => prev.filter((i: any) => i.id !== issue.id));
            if (activeIssueId === issue.id) setActiveIssueId(null);
            return;
          }
          setActiveIssueId(id);
          setActiveSidebar('ai');
        }
      }}
    >
      <div className={`h-full w-full flex font-sans overflow-hidden transition-colors duration-300 ${readOnly ? '' : bgApp}`}>
        {!readOnly && <FloatingToolbar targetNode={focusedNode} onSuggestPoint={handleSuggestPoint} />}

      {!readOnly && (
        <div className={`w-16 border-r flex flex-col items-center py-4 gap-4 z-30 shrink-0 transition-colors ${bgNav}`}>
          <div className={`p-2 rounded-xl mb-2 ${brandGreenBg} shadow-lg`} title="CVCIRCLE Builder"><FileText size={20} /></div>
          <button onClick={() => setActiveSidebar(activeSidebar === 'design' ? null : 'design')} className={`p-3 rounded-2xl transition-all ${activeSidebar === 'design' ? 'bg-emerald-500/20 ' + brandGreen : (isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100')}`} title="Design & Layout"><Palette size={20}/></button>
          <button onClick={() => setIsTemplateModalOpen(true)} className={`p-3 rounded-2xl transition-all ${isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100'}`} title="Templates"><LayoutTemplate size={20}/></button>
          <button onClick={() => setActiveSidebar(activeSidebar === 'data' ? null : 'data')} className={`p-3 rounded-2xl transition-all ${activeSidebar === 'data' ? 'bg-emerald-500/20 ' + brandGreen : (isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100')}`} title="Raw Data JSON"><FileJson size={20}/></button>
          <div className="flex-1"></div>
          <button 
            onClick={() => {
              const event = new CustomEvent('open-download-modal');
              window.dispatchEvent(event);
            }} 
            className={`p-3 rounded-2xl transition-all shadow-xl ${brandGreenBg} hover:scale-110`} 
            title="Download PDF"
          >
            <Download size={20}/>
          </button>
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
              <div><label className={`text-xs font-bold uppercase tracking-widest mb-2 flex justify-between ${textMuted}`}><span>Section Gap</span><span className={brandGreen}>{design.sectionGap}px</span></label><input type="range" min="0" max="60" step="1" value={design.sectionGap} onChange={(e) => setDesign({...design, sectionGap: parseInt(e.target.value)})} className="w-full accent-emerald-500" /></div>
              <div className="mt-4"><label className={`flex items-center justify-between cursor-pointer`}><span className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>Header Icons</span><div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${design.showHeaderIcons ? brandGreenBg : (isDarkUI ? 'bg-[#333]' : 'bg-gray-300')}`} onClick={() => setDesign({...design, showHeaderIcons: !design.showHeaderIcons})}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${design.showHeaderIcons ? 'translate-x-6' : 'translate-x-1'}`} /></div></label></div>
              <div className="mt-4"><label className={`flex items-center justify-between cursor-pointer`}><span className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>Contact Icons</span><div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${design.showContactIcons ? brandGreenBg : (isDarkUI ? 'bg-[#333]' : 'bg-gray-300')}`} onClick={() => setDesign({...design, showContactIcons: !design.showContactIcons})}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${design.showContactIcons ? 'translate-x-6' : 'translate-x-1'}`} /></div></label></div>
              
              <div className="mt-6 border-t pt-5 border-gray-200 dark:border-[#333]">
                <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ${textMuted}`}>Date Format</label>
                <select value={design.dateFormat || 'MMM YYYY'} onChange={(e) => setDesign({...design, dateFormat: e.target.value})} className={`w-full p-2.5 rounded-lg border text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${isDarkUI ? 'bg-[#1e1e1e] border-gray-700 text-gray-200 hover:border-gray-600' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300 shadow-sm'}`}>
                  <option value="MMM YYYY">Short Text (Jan 2024)</option>
                  <option value="MMMM YYYY">Long Text (January 2024)</option>
                  <option value="MM/YYYY">US Numeric (01/2024)</option>
                  <option value="YYYY-MM">ISO Numeric (2024-01)</option>
                  <option value="YYYY">Year Only (2024)</option>
                </select>
              </div>

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
          <div className={`w-[600px] border-r flex flex-col shadow-2xl z-20 shrink-0 ${bgPanel}`}>
            <div className={`p-5 border-b flex items-center justify-between ${bgNav}`}>
              <h3 className={`font-bold flex items-center gap-2 ${textPrimary}`}>
                <FileJson size={18} className={brandGreen} /> Raw JSON
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJsonTemplate}
                  title="Copy JSON Template"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${brandGreenBg} hover:opacity-90`}
                >
                  <Copy size={13} />
                  Copy JSON Template
                </button>
                <button onClick={() => setActiveSidebar(null)} className={textMuted}><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <JSONSidebarViewer data={cvData} focusedPath={focusedNode ? focusedNode.getAttribute('data-path') : null} onChange={(newData) => onDataChange(newData)} rainbowHighlight={true} />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col relative min-w-0">
          <div
            className={readOnly ? 'w-full' : `flex-1 overflow-auto relative flex justify-center custom-scrollbar transition-colors ${bgWorkspace}`}
            style={readOnly ? undefined : {
              paddingTop: layoutMetrics.workspacePaddingY,
              paddingBottom: layoutMetrics.workspacePaddingY,
              paddingLeft: layoutMetrics.workspacePaddingX,
              paddingRight: layoutMetrics.workspacePaddingX,
            }}
          >
          {readOnly ? (
            <div className="cv-document-wrapper relative text-gray-900" style={canvasStyleVars}>
              <div className="cv-page-visualizer"></div>
              {renderCanvasLayout()}
            </div>
          ) : (
            <div key={templateAnimKey} className="transform origin-top transition-transform h-max pb-20 text-gray-900" style={{ transform: `scale(${zoom / 100})` }}>
              <div className="cv-document-wrapper relative" style={canvasStyleVars}>
                <div className="cv-page-visualizer"></div>
                {renderCanvasLayout()}
              </div>
            </div>
          )}
          </div>

          {!readOnly && (
            <div className="absolute bottom-6 right-6 z-[40] flex items-center gap-2 pointer-events-none">
              {/* Page Count and Size Info */}
              <div className={`px-3 py-1.5 rounded-xl border shadow-xl backdrop-blur-md flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider ${bgNav} ${textPrimary} opacity-90 hover:opacity-100 transition-opacity pointer-events-auto`}>
                <div className="flex items-center gap-1.5 border-r pr-3 border-gray-500/20">
                  <FileText size={12} className={brandGreen} />
                  <span>{totalPagesCount} {totalPagesCount === 1 ? 'Page' : 'Pages'}</span>
                </div>
                <button 
                  onClick={() => setDesign({ ...design, pageSize: design.pageSize === 'A4' ? 'Letter' : 'A4' })}
                  className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md transition-all hover:bg-emerald-500/10 ${brandGreen}`}
                >
                  <LayoutTemplate size={10} />
                  {design.pageSize}
                </button>
              </div>

              {/* Zoom Controls */}
              <div className={`px-2 py-1.5 rounded-xl border shadow-xl backdrop-blur-md flex items-center gap-2 ${bgNav} ${textPrimary} opacity-90 hover:opacity-100 transition-opacity pointer-events-auto`}>
                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className={`p-1.5 rounded-lg hover:bg-emerald-500/20 transition-all ${zoom <= 50 ? 'opacity-30 cursor-not-allowed' : textMuted}`}
                  >
                    <Search size={14} className="rotate-90" />
                  </button>
                  <input 
                    type="range" 
                    min="50" 
                    max="200" 
                    step="5"
                    value={zoom} 
                    onChange={(e) => setZoom(parseInt(e.target.value))}
                    className="w-20 accent-emerald-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <button 
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className={`p-1.5 rounded-lg hover:bg-emerald-500/20 transition-all ${zoom >= 200 ? 'opacity-30 cursor-not-allowed' : textMuted}`}
                  >
                    <Search size={14} />
                  </button>
                </div>
                
                <button 
                  onClick={() => setZoom(100)}
                  className={`min-w-[42px] px-1.5 py-1 text-[9px] font-black rounded-md transition-all border ${zoom === 100 ? 'bg-emerald-500/20 border-emerald-500/50 ' + brandGreen : 'bg-transparent border-gray-500/20 hover:border-emerald-500/50 ' + textMuted}`}
                >
                  {zoom}%
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {!readOnly && <FloatingAICard pointSuggestion={pointSuggestion} setPointSuggestion={setPointSuggestion} handleFetchSuggestion={handleFetchSuggestion} cvData={cvData} handleDataChange={handleDataChange} />}
      {!readOnly && dragPreview?.markup && (
        <div
          className="fixed z-[130] pointer-events-none"
          style={{
            left: dragPreview.x + 20,
            top: dragPreview.y + 20,
            width: dragPreview.width,
            maxWidth: 'min(520px, calc(100vw - 48px))',
            opacity: 0.82,
            transform: 'translate3d(0,0,0)',
          }}
        >
          <div className="rounded-2xl border border-emerald-300/70 bg-white/96 shadow-[0_24px_64px_rgba(15,23,42,0.26)] backdrop-blur-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-emerald-100 bg-emerald-50/95 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-700">
              {dragPreview.label}
            </div>
            <div className="pointer-events-none [&_.no-print]:hidden" dangerouslySetInnerHTML={{ __html: dragPreview.markup }} />
          </div>
        </div>
      )}
      {!readOnly && skillsSuggestionState.open && (
        <div className="fixed inset-0 z-[125] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden ${bgPanel}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${bgNav}`}>
              <div>
                <h3 className={`text-lg font-bold ${textPrimary}`}>AI Skill Suggestions</h3>
                <p className={`text-sm ${textMuted}`}>Personalized recommendations for {skillsSuggestionState.meta?.role || role || 'your target role'}.</p>
              </div>
              <button
                type="button"
                onClick={() => setSkillsSuggestionState({ open: false, loading: false, applying: false, error: null, categories: [], meta: null })}
                className={`p-2 rounded-full ${btnSecondary}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className={`p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar ${isDarkUI ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3`}>
                <div className={`rounded-xl border p-4 ${isDarkUI ? 'border-[#2a2a2a] bg-[#111111]' : 'border-gray-200 bg-white'}`}>
                  <div className={`text-[11px] uppercase tracking-[0.22em] ${textMuted}`}>Potential Adds</div>
                  <div className={`mt-2 text-2xl font-black ${textPrimary}`}>{skillsSuggestionState.categories.reduce((total, category) => total + category.skills.length, 0)}</div>
                </div>
                <div className={`rounded-xl border p-4 ${isDarkUI ? 'border-[#2a2a2a] bg-[#111111]' : 'border-gray-200 bg-white'}`}>
                  <div className={`text-[11px] uppercase tracking-[0.22em] ${textMuted}`}>Skill Groups</div>
                  <div className={`mt-2 text-2xl font-black ${textPrimary}`}>{skillsSuggestionState.categories.length}</div>
                </div>
                <div className={`rounded-xl border p-4 ${isDarkUI ? 'border-[#2a2a2a] bg-[#111111]' : 'border-gray-200 bg-white'}`}>
                  <div className={`text-[11px] uppercase tracking-[0.22em] ${textMuted}`}>Impact Preview</div>
                  <div className={`mt-2 text-sm font-semibold ${textPrimary}`}>Adds targeted keywords with one click.</div>
                </div>
              </div>

              {skillsSuggestionState.loading && (
                <div className={`rounded-2xl border p-6 ${isDarkUI ? 'border-[#2a2a2a] bg-[#111111]' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center gap-3 text-emerald-500 font-semibold">
                    <Loader2 size={18} className="animate-spin" />
                    Generating personalized skill suggestions...
                  </div>
                </div>
              )}

              {skillsSuggestionState.error && !skillsSuggestionState.loading && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {skillsSuggestionState.error}
                </div>
              )}

              {!skillsSuggestionState.loading && !skillsSuggestionState.error && skillsSuggestionState.categories.length > 0 && (
                <div className="space-y-4">
                  {skillsSuggestionState.categories.map((category, index) => (
                    <div key={`${category.category}-${index}`} className={`rounded-2xl border p-4 ${isDarkUI ? 'border-[#2a2a2a] bg-[#111111]' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className={`text-base font-bold ${textPrimary}`}>{category.category}</div>
                          <div className={`mt-1 text-sm ${textMuted}`}>Preview impact: +{category.skills.length} relevant skills</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => applySkillSuggestions([category])}
                          className={`px-4 py-2 rounded-xl font-semibold transition-all ${brandGreenBg}`}
                        >
                          Add Group
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {category.skills.map((skill) => (
                          <span key={`${category.category}-${skill}`} className={`px-3 py-1.5 rounded-full text-sm font-medium border ${isDarkUI ? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={`px-5 py-4 border-t flex items-center justify-between ${bgNav}`}>
              <p className={`text-sm ${textMuted}`}>Review the recommendation preview, then add a category or apply everything at once.</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSkillsSuggestionState({ open: false, loading: false, applying: false, error: null, categories: [], meta: null })}
                  className={`px-4 py-2 rounded-xl ${btnSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={skillsSuggestionState.loading || skillsSuggestionState.categories.length === 0 || skillsSuggestionState.applying}
                  onClick={() => applySkillSuggestions(skillsSuggestionState.categories)}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${brandGreenBg}`}
                >
                  {skillsSuggestionState.applying ? 'Applying...' : 'Add All Suggestions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  return (<div key={cat.id}><div className={`py-3 mb-5 flex items-center gap-3 border-b ${isDarkUI ? 'border-[#222] text-white' : 'border-gray-200 text-gray-900'}`}><span className="text-emerald-500">{cat.icon}</span><h2 className="text-lg font-bold">{cat.name}</h2><span className={`text-xs ${textMuted}`}>- {cat.desc}</span></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{catTemplates.map(tpl => {
                      const isActive = activeTemplate.id === tpl.id;
                      return (<div key={tpl.id} onClick={() => loadTemplate(tpl)} className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-2xl ${bgPanel} ${isActive ? 'border-emerald-500 ring-4 ring-emerald-500/20' : (isDarkUI ? 'border-[#333]' : 'border-gray-200')}`}>
                        <div className={`p-2.5 border-b flex justify-between items-center z-10 shrink-0 ${bgNav}`}><div className={`font-bold text-xs ${textPrimary}`}>{tpl.name}</div>{isActive && <span className="bg-emerald-500/20 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded font-bold">ACTIVE</span>}</div>
                        <div className={`relative w-full flex justify-center items-center p-4 flex-1 overflow-hidden pointer-events-none ${isDarkUI ? 'bg-[#141414]' : 'bg-gray-50'}`}><div className="relative w-[180px] h-[255px] bg-white shadow-md overflow-hidden rounded-sm ring-1 ring-gray-300"><div className="absolute top-0 left-0 w-[794px] h-[1123px] origin-top-left text-gray-900" style={{ transform: 'scale(0.2265)' }}><StaticLayoutRenderer template={tpl} cvData={cvData} ReadOnlyWrapper={ReadOnlyWrapper} design={design} /></div></div></div>
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

        // Calculate Recommended Family
        const getRecommendedFamily = () => {
          const allTypes = Object.values(zones).flat().map((z: any) => z.type);
          const familyCounts: Record<string, number> = {};
          
          allTypes.forEach(type => {
            const suffix = type.split('-').slice(1).join('-'); // e.g. 'timeline', 'split', 'standard'
            for (const [family, keywords] of Object.entries(SNIPPET_FAMILIES)) {
              if (keywords.some(k => type.includes(k) || suffix === k.replace('-', ''))) {
                familyCounts[family] = (familyCounts[family] || 0) + 1;
              }
            }
          });
          
          let dominantFamily = null;
          let maxCount = 0;
          for (const [family, count] of Object.entries(familyCounts)) {
            if (count > maxCount && count >= 2) { // Need at least 2 to establish a pattern
              maxCount = count;
              dominantFamily = family;
            }
          }
          return dominantFamily;
        };
        const recommendedFamily = getRecommendedFamily();

        // Filter and Sort Snippets
        const filteredSnippets = Object.values(SNIPPETS).filter(s => 
          replacingSnippet.isAdd 
            ? (!currentCategories.includes(s.category) && (!replacingSnippet.filterCategory || s.category === replacingSnippet.filterCategory)) 
            : s.category === replacingSnippet.category
        ).filter(Boolean);

        // Sort: Recommended first -> Current -> Others
        const sortedSnippets = [...filteredSnippets].sort((a, b) => {
          const isACurrent = a.id === replacingSnippet.currentType;
          const isBCurrent = b.id === replacingSnippet.currentType;
          if (isACurrent) return -1;
          if (isBCurrent) return 1;
          
          if (recommendedFamily) {
            const isARecommended = SNIPPET_FAMILIES[recommendedFamily].some(k => a.id.includes(k));
            const isBRecommended = SNIPPET_FAMILIES[recommendedFamily].some(k => b.id.includes(k));
            if (isARecommended && !isBRecommended) return -1;
            if (!isARecommended && isBRecommended) return 1;
          }
          return 0;
        });

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className={`rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border ${isDarkUI ? 'bg-[#141414] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
              <div className={`p-4 border-b flex justify-between items-center ${isDarkUI ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                <h3 className={`font-bold text-base flex items-center gap-2 ${textPrimary}`}>{replacingSnippet.isAdd ? <PlusCircle size={18} className="text-emerald-500"/> : <RefreshCw size={18} className="text-blue-500"/>}{replacingSnippet.isAdd ? 'Add Snippet' : `Replace ${replacingSnippet.category}`}</h3>
                <button onClick={() => setReplacingSnippet(null)} className={`p-1.5 rounded-full ${isDarkUI ? 'bg-[#222] text-gray-300 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-colors`}><X size={18}/></button>
              </div>
              {replacingSnippet.isAdd && (
                <div className={`px-5 pt-4 pb-2 flex flex-wrap gap-2 border-b ${isDarkUI ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
                  {['All', 'Header', 'Summary', 'Experience', 'Education', 'Projects', 'Certifications', 'Awards', 'Skills', 'Languages', 'Interests', 'Publications', 'Volunteer', 'References', 'Sidebar']
                    .filter(cat => cat === 'All' || !currentCategories.includes(cat))
                    .map(cat => (
                    <button key={cat} onClick={() => setReplacingSnippet({...replacingSnippet, filterCategory: cat === 'All' ? null : cat})} className={`px-3 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider border ${replacingSnippet.filterCategory === cat || (!replacingSnippet.filterCategory && cat === 'All') ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : (isDarkUI ? 'bg-[#222] text-gray-400 border-[#333]' : 'bg-white text-gray-600 border-gray-200')}`}>{cat}</button>
                  ))}
                  {(!replacingSnippet.filterCategory || replacingSnippet.filterCategory === 'Skills') && (
                    <button
                      type="button"
                      onClick={() => void openSkillsSuggestions()}
                      className="ml-auto px-3 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider border border-emerald-400/50 bg-emerald-500/10 text-emerald-500 flex items-center gap-1.5"
                    >
                      <Sparkles size={12} />
                      AI Skill Recommendations
                    </button>
                  )}
                </div>
              )}
              <div className={`p-5 overflow-y-auto flex-1 custom-scrollbar ${isDarkUI ? 'bg-[#0a0a0a]' : 'bg-gray-100'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sortedSnippets.map(snippet => {
                    const targetZoneId = replacingSnippet.zoneId;
                    const isTargetDark = activeTemplate.type.includes('dark') && targetZoneId === 'sidebar';
                    const isSidebar = ['sidebar', 'left', 'right'].includes(targetZoneId);
                    const styleKey = isSidebar && activeTemplate.sidebarTitleStyle ? activeTemplate.sidebarTitleStyle : activeTemplate.titleStyle;
                    const TitleRenderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];
                    
                    const isCurrent = snippet.id === replacingSnippet.currentType;
                    const isRecommended = recommendedFamily && SNIPPET_FAMILIES[recommendedFamily].some(k => snippet.id.includes(k));
                    const isATS = ATS_SNIPPETS.includes(snippet.id);
                    
                    // Dynamic scaling based on category to prevent tiny previews
                    const isHeader = snippet.category === 'Header';
                    const isCompact = ['Languages', 'Interests', 'Skills', 'Awards'].includes(snippet.category);
                    const scale = isHeader ? 0.6 : 0.65;
                    const wrapperWidth = isSidebar ? '200%' : (isHeader ? '166%' : '153%');
                    const height = isHeader ? '160px' : (isCompact ? '180px' : '240px');

                    return (
                      <div key={snippet.id} onClick={() => executeReplaceOrAdd(snippet.id)} className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-xl ${isDarkUI ? 'bg-[#111]' : 'bg-white'} ${isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/20' : (isRecommended && !isCurrent ? 'border-amber-400 ring-2 ring-amber-400/20' : (isDarkUI ? 'border-[#333] hover:border-gray-500' : 'border-gray-200 hover:border-gray-400'))}`}>
                        <div className={`p-4 flex flex-col gap-2 z-10 ${isDarkUI ? 'bg-[#111]' : 'bg-white'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className={`font-bold text-[15px] ${textPrimary}`}>{snippet.name}</div>
                              <div className={`text-[10px] mt-1 font-semibold uppercase tracking-wider ${textMuted}`}>{snippet.category}</div>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              {isCurrent && <span className="bg-emerald-500/20 text-emerald-500 text-[9px] px-2 py-1 rounded font-bold tracking-widest uppercase">CURRENT</span>}
                              {isRecommended && !isCurrent && <span className="bg-amber-400/20 text-amber-600 text-[9px] px-2 py-1 rounded font-bold tracking-widest uppercase flex items-center gap-1"><Sparkles size={10}/> FOR YOUR STYLE</span>}
                              {isATS && <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] px-2 py-1 rounded font-bold tracking-widest uppercase flex items-center gap-1"><Check size={10}/> ATS READY</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative w-full overflow-hidden border-t border-gray-800" style={{ height, backgroundColor: isTargetDark ? design.sidebarBgColor : '#f9f9f9', '--cv-font': design.font, '--cv-base-size': `${design.fontSize}px`, '--cv-spacing': design.spacing, '--cv-accent': design.accentColor, '--cv-sidebar-bg': design.sidebarBgColor, '--cv-section-gap': `${design.sectionGap}px` } as React.CSSProperties}>
                          <div className={`absolute top-0 left-0 origin-top-left pointer-events-none px-6 py-6 opacity-95 group-hover:opacity-100 transition-opacity cv-document ${isTargetDark ? 'text-gray-200' : 'text-gray-900'}`} style={{ width: wrapperWidth, transform: `scale(${scale})` }}>
                            <snippet.render data={previewData} Editable={ReadOnlyWrapper} zoneId={targetZoneId} isDark={isTargetDark} design={design} showIcons={true} layoutZones={zones} Title={({ titleKey }: any) => <TitleRenderer isDark={isTargetDark}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap /></TitleRenderer>} moveEntry={() => {}} deleteEntry={() => {}} />
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
        :root { 
          --cv-font: ${design.font}; 
          --cv-base-size: ${design.fontSize}px; 
          --cv-spacing: ${design.spacing}; 
          --cv-accent: ${design.accentColor}; 
          --cv-page-margin: ${layoutMetrics.pageMarginPx}px; 
          --cv-page-gap: ${layoutMetrics.pageGapPx}px;
          --cv-page-width: ${layoutMetrics.pageWidthCss};
          --cv-page-height: ${layoutMetrics.pageHeightCss};
          --cv-section-gap: ${layoutMetrics.sectionGapPx}px;
          --cv-column-gap: ${Math.max(24, layoutMetrics.sectionGapPx + 12)}px;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkUI ? '#444' : '#ccc'}; border-radius: 4px; }
        .cv-document { 
          font-family: var(--cv-font), sans-serif; color: #111827; font-size: var(--cv-base-size); position: relative; z-index: 10; 
          min-height: var(--cv-page-height);
          mask-image: linear-gradient(to bottom, 
            black 0, 
            black var(--cv-page-height), 
            transparent var(--cv-page-height), 
            transparent calc(var(--cv-page-height) + var(--cv-page-gap))
          );
          mask-size: 100% calc(var(--cv-page-height) + var(--cv-page-gap));
          mask-repeat: repeat-y;
          -webkit-mask-image: linear-gradient(to bottom, 
            black 0, 
            black var(--cv-page-height), 
            transparent var(--cv-page-height), 
            transparent calc(var(--cv-page-height) + var(--cv-page-gap))
          );
          -webkit-mask-size: 100% calc(var(--cv-page-height) + var(--cv-page-gap));
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
        .cv-page-visualizer { position: absolute; inset: 0; pointer-events: none; z-index: -1; background-size: 100% calc(var(--cv-page-height) + var(--cv-page-gap)); background-image: linear-gradient(to bottom, #ffffff 0, #ffffff var(--cv-page-height), transparent var(--cv-page-height), transparent calc(var(--cv-page-height) + var(--cv-page-gap))); filter: drop-shadow(0 15px 25px rgba(0,0,0,0.15)); }
        
        .cv-page-breakable { page-break-inside: auto; break-inside: auto; }
        
        @media print {
          @page { margin: 0; size: ${design.pageSize.toLowerCase()}; }
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
