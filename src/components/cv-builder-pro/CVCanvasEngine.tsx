'use client';


import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, Download, Plus, LayoutTemplate, Save, RefreshCw, Layers, Check, Search, Filter, Briefcase, PlusCircle, Trash2, ChevronUp, ChevronDown, ImageIcon, ArrowRight, Loader2, PlayCircle, Eye, MousePointer2, Wand2, Quote, FileText, Palette, FileJson, X, Sparkles, Copy, CopyCheck, AlertCircle, Undo, Redo } from 'lucide-react';
import { CANVAS_TEMPLATES, TEMPLATE_CATEGORIES, SNIPPETS, TITLE_STYLES, SNIPPET_FAMILIES, ATS_SNIPPETS } from './registry';
import { EditableField, CanvasSnippet, CanvasZone, StaticLayoutRenderer, FloatingToolbar, CanvasContext } from './components/CoreUI';
import { JSONSidebarViewer } from './components/JSONSidebarViewer';
import ListEntry from './components/ListEntry';
import { generateId, setNestedValue, getNestedValue, escapeRegExp } from './helpers';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { analyzeText } from '@/lib/grammar/engine';
import { computeCanvasLayoutMetrics } from './layout-utils';
import { DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import { useUserData } from '@/lib/hooks/useUserData';
import { useCanvasFit } from '@/hooks/useCanvasFit';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import UtilityPanelPill from '@/components/resume-enhancer/components/UtilityPanelPill';
const ReadOnlyWrapper = (props: any) => <EditableField {...props} readOnly={true} />;
const EditableWrapper = EditableField;

const LIST_SNIPPET_CATEGORIES = ['Experience', 'Education', 'Projects', 'Certifications', 'Awards', 'Publications', 'Volunteer', 'References'];

const getCollectionNameForCategory = (category?: string) => {
  const key = (category || '').toLowerCase();
  const collectionMap: Record<string, string> = {
    experience: 'experience',
    education: 'education',
    projects: 'projects',
    certifications: 'certifications',
    awards: 'awards',
    publications: 'publications',
    volunteer: 'volunteer',
    references: 'references',
  };

  return collectionMap[key] || key;
};

const createDefaultListEntry = (category?: string) => {
  const key = getCollectionNameForCategory(category);
  if (key === 'experience') return { id: generateId(), company: 'New Company', role: 'Job Title', date: 'Date', description: '<ul><li>Describe your responsibilities and achievements here.</li></ul>' };
  if (key === 'education') return { id: generateId(), institution: 'Institution Name', degree: 'Degree', date: 'Date', description: 'Additional details.' };
  if (key === 'projects') return { id: generateId(), name: 'Project Name', role: 'Role', date: 'Date', description: '<ul><li>Project details.</li></ul>' };
  if (key === 'certifications') return { id: generateId(), name: 'Certification Name', issuer: 'Issuer', date: 'Date' };
  if (key === 'awards') return { id: generateId(), name: 'Award Name', issuer: 'Issuer', date: 'Date' };
  if (key === 'publications') return { id: generateId(), title: 'Publication Title', publisher: 'Publisher', date: 'Date', description: 'Brief summary.' };
  if (key === 'volunteer') return { id: generateId(), organization: 'Org Name', role: 'Role', date: 'Date', description: '<ul><li>Duties here.</li></ul>' };
  if (key === 'references') return { id: generateId(), name: 'Ref Name', role: 'Role', contact: 'Contact Info' };
  return null;
};

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
  isGuestMode?: boolean;
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
            className={`pb-3 text-small font-bold tracking-wide transition-all relative ${activeTab === 'improvement' ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            IMPROVEMENT
            {activeTab === 'improvement' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('original')}
            className={`pb-3 text-small font-bold tracking-wide transition-all relative ${activeTab === 'original' ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
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
            <div className="text-small text-red-100 leading-relaxed">
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
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-small text-red-400 flex items-center gap-2">
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
              <button onClick={() => handleFetchSuggestion('star')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-small font-bold transition-all border border-blue-500/20"><Sparkles size={12}/> STAR Method</button>
              <button onClick={() => handleFetchSuggestion('quantify')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-small font-bold transition-all border border-purple-500/20"># Quantify</button>
              <button onClick={() => handleFetchSuggestion('concise')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-small font-bold transition-all border border-orange-500/20">✂️ Concise</button>
              <button onClick={() => handleFetchSuggestion('action_verbs')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-small font-bold transition-all border border-emerald-500/20">🚀 Power Verbs</button>
              
              <div className="relative inline-block">
                <select 
                  onChange={(e) => handleFetchSuggestion('tone', e.target.value)} 
                  className="bg-white/5 hover:bg-white/10 text-small text-gray-300 border border-white/10 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500/50 appearance-none cursor-pointer pr-7 font-bold transition-all"
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
            <button onClick={() => setPointSuggestion(null)} className="flex-1 px-4 py-2.5 text-small font-bold rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all">Cancel</button>
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
              className="flex-[1.5] px-4 py-2.5 text-small font-bold rounded-xl shadow-[0_4px_20px_rgba(126,231,135,0.2)] bg-emerald-400 text-[#0a0a0a] hover:bg-emerald-300 active:scale-[0.98] transition-all"
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

const templateLayoutFlows: Record<string, { global: string[]; columns: string[][] }> = {
  '1-col': { global: ['main'], columns: [] },
  '2-col': { global: ['header'], columns: [['left'], ['right']] },
  'sidebar-left': { global: [], columns: [['sidebar'], ['main']] },
  'sidebar-left-dark': { global: [], columns: [['sidebar'], ['main']] },
  'sidebar-right': { global: [], columns: [['main'], ['sidebar']] },
  'top-sidebar-left': { global: ['header'], columns: [['sidebar'], ['main']] },
  'top-sidebar-right': { global: ['header'], columns: [['main'], ['sidebar']] },
  'hybrid-split': { global: ['header', 'main'], columns: [['left'], ['right']] },
};

const CVCanvasEngine = forwardRef<CVCanvasBuilderRef, CVCanvasBuilderProps>(({ cvData, onDataChange, theme = 'dark', template, onTemplateChange, readOnly = false, cvId, jobId, role, moriChatMode = false, isGuestMode = false }, ref) => {
  const isInternalLayoutChange = React.useRef(false);
  const { userData } = useUserData();

  const [activeTemplate, setActiveTemplate] = useState(cvData?.metadata?.canvasTemplate || template || CANVAS_TEMPLATES[0]);
  const [focusedNode, setFocusedNode] = useState<HTMLElement | null>(null);
  const [zones, setZones] = useState<Record<string, any[]>>(() => {
    const raw: Record<string, any[]> = cvData?.metadata?.canvasZones || {};
    // Deduplicate blocks within each zone to prevent React duplicate-key warnings
    const deduped: Record<string, any[]> = {};
    Object.keys(raw).forEach(zoneId => {
      const seen = new Set<string>();
      deduped[zoneId] = (raw[zoneId] || []).filter((block: any) => {
        if (!block?.id || seen.has(block.id)) return false;
        seen.add(block.id);
        return true;
      });
    });
    return deduped;
  });
  const [templateAnimKey, setTemplateAnimKey] = useState(0);
  const [design, setDesign] = useState(cvData?.metadata?.canvasDesign || { 
    font: 'Inter', 
    fontSize: 12, 
    spacing: 1.0, 
    accentColor: '#22c55e', 
    pageMargin: 40, 
    showContactIcons: true, 
    showHeaderIcons: true, 
    headerLinks: {} as Record<string, boolean>, 
    sidebarBgColor: '#f8fafc', 
    sectionGap: 16, 
    itemGap: 12, // Gap between items/child containers
    pageSize: 'A4' as 'A4' | 'Letter', 
    dateFormat: 'MMM YYYY',
    splitContactInSidebar: false
  });
  const [activeSidebar, setActiveSidebar] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [replacingSnippet, setReplacingSnippet] = useState<any>(null);
  const [dragState, setDragState] = useState<any>({ isDragging: false, sourceZoneId: null, sourceIndex: null, overZoneId: null, overIndex: null });
  const [dragPreview, setDragPreview] = useState<any>(null);
  const dragDroppedRef = React.useRef(false); // track if a valid drop occurred
  const dragPreviewRef = React.useRef<any>(null); // stable ref to dragPreview for closure access
  const [scanning, setScanning] = useState(false);
  const { state: enhancerState, dispatch: enhancerDispatch } = useResumeEnhancer();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          enhancerDispatch({ type: 'REDO' });
        } else {
          enhancerDispatch({ type: 'UNDO' });
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        enhancerDispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enhancerDispatch]);

  // Keep dragPreviewRef in sync with dragPreview state for closure access
  useEffect(() => {
    dragPreviewRef.current = dragPreview;
  }, [dragPreview]);

  // Use the new smart auto-scaling hook
  const { containerRef: workspaceRef, zoom, setZoom, isAutoFit, triggerAutoFit } = useCanvasFit({
    documentPixelWidth: 794, // Standard A4 width in pixels
    paddingPx: 64, // 32px padding per side
    maxScale: 2.0,
    minScale: 0.5
  });

  // Handle Ctrl/Cmd + Wheel to zoom the canvas area specifically, not the window
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    let accumulatedDelta = 0;

    const handleWheel = (e: WheelEvent) => {
      // If Ctrl or Cmd is held during wheel scroll, it's a zoom gesture/shortcut
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Accumulate delta for a threshold-based jump
        accumulatedDelta += -e.deltaY;
        
        // Use a threshold to determine when to jump by 10 points
        // 50 is a good middle ground for both mouse wheels and trackpads
        if (Math.abs(accumulatedDelta) >= 50) {
          const direction = Math.sign(accumulatedDelta);
          setZoom((prev: number) => {
            // Jump by exactly 10 points
            const next = prev + (direction * 10);
            // Snap to nearest 10 for clean integer values
            const snapped = Math.round(next / 10) * 10;
            return Math.min(200, Math.max(50, snapped));
          });
          // Reset accumulator after a jump
          accumulatedDelta = 0;
        }
      }
    };

    // Use { passive: false } to allow e.preventDefault()
    workspace.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      workspace.removeEventListener('wheel', handleWheel);
    };
  }, [setZoom]);

  const [totalPagesCount, setTotalPagesCount] = useState(1);
  const [pageAssignments, setPageAssignments] = useState<Record<string, number>>({});
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 1080 : window.innerHeight,
    devicePixelRatio: typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
  }));

  // Sync local state with cvData prop changes (external updates like "Fix Now" or "Mori Chat")
  useEffect(() => {
    if (!cvData) return;

    // 1. Sync zones if metadata changed externally
    if (cvData.metadata?.canvasZones) {
      const raw = cvData.metadata.canvasZones;
      const currentZonesStr = JSON.stringify(zones);
      const nextZonesStr = JSON.stringify(raw);
      
      if (currentZonesStr !== nextZonesStr) {
        const deduped: Record<string, any[]> = {};
        Object.keys(raw).forEach(zoneId => {
          const seen = new Set<string>();
          deduped[zoneId] = (raw[zoneId] || []).filter((block: any) => {
            if (!block?.id || seen.has(block.id)) return false;
            seen.add(block.id);
            return true;
          });
        });
        setZones(deduped);
      }
    }

    // 2. Sync design if metadata changed externally
    if (cvData.metadata?.canvasDesign) {
      const currentDesignStr = JSON.stringify(design);
      const nextDesignStr = JSON.stringify(cvData.metadata.canvasDesign);
      if (currentDesignStr !== nextDesignStr) {
        setDesign(cvData.metadata.canvasDesign);
      }
    }

    // 3. Sync active template if metadata changed externally
    if (cvData.metadata?.canvasTemplate && cvData.metadata.canvasTemplate.id !== activeTemplate.id) {
      setActiveTemplate(cvData.metadata.canvasTemplate);
    }
  }, [cvData.metadata]);

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

  useEffect(() => {
    if (readOnly) return;
    const handleSetSidebar = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setActiveSidebar(active => active === detail ? null : detail);
      setIsTemplateModalOpen(false);
    };
    const handleOpenTemplates = () => {
      setIsTemplateModalOpen(true);
      setActiveSidebar(null);
    };
    const handleCloseUtility = () => {
      setActiveSidebar(null);
      setIsTemplateModalOpen(false);
    };
    const handleOpenMori = () => {
      setActiveSidebar(null);
      setIsTemplateModalOpen(false);
    };
    const handleZoomIn = () => setZoom((z: number) => Math.min(200, z + 10));
    const handleZoomOut = () => setZoom((z: number) => Math.max(50, z - 10));
    const handleTogglePageSize = () => {
      setDesign((d: any) => ({ ...d, pageSize: d.pageSize === 'A4' ? 'Letter' : 'A4' }));
    };

    window.addEventListener('set-builder-sidebar', handleSetSidebar);
    window.addEventListener('open-templates', handleOpenTemplates);
    window.addEventListener('close-utility-panel', handleCloseUtility);
    window.addEventListener('open-mori-chat', handleOpenMori);
    window.addEventListener('canvas-zoom-in', handleZoomIn);
    window.addEventListener('canvas-zoom-out', handleZoomOut);
    window.addEventListener('canvas-toggle-page-size', handleTogglePageSize);
    return () => {
      window.removeEventListener('set-builder-sidebar', handleSetSidebar);
      window.removeEventListener('open-templates', handleOpenTemplates);
      window.removeEventListener('close-utility-panel', handleCloseUtility);
      window.removeEventListener('open-mori-chat', handleOpenMori);
      window.removeEventListener('canvas-zoom-in', handleZoomIn);
      window.removeEventListener('canvas-zoom-out', handleZoomOut);
      window.removeEventListener('canvas-toggle-page-size', handleTogglePageSize);
    };
  }, [readOnly]);

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
      dragDroppedRef.current = false;
      setDragState((prev: any) => ({ ...prev, isDragging: true, sourceZoneId: e.detail.zoneId, sourceIndex: e.detail.index }));
      setDragPreview({
        markup: e.detail.previewMarkup,
        width: Math.min(e.detail.width || 360, 520),
        height: e.detail.height || 0,
        label: e.detail.label || 'Section',
        x: e.detail.pointer?.x || 0,
        y: e.detail.pointer?.y || 0,
        sourceZoneId: e.detail.zoneId,
        sourceIndex: e.detail.index,
        sourceInstance: e.detail.instance,
      });
    };
    const handleDragOver = (e: any) => setDragState((prev: any) => ({ ...prev, overZoneId: e.detail.zoneId, overIndex: e.detail.index }));
    const handleDragEnd = () => {
      // If no valid drop happened, restore to original position (abandon)
      if (!dragDroppedRef.current && dragPreviewRef.current) {
        const { sourceZoneId, sourceIndex, sourceInstance } = dragPreviewRef.current;
        if (sourceZoneId && sourceIndex !== null && sourceInstance) {
          setZones(prev => {
            const newZones = { ...prev };
            const list = [...(newZones[sourceZoneId] || [])];
            // Only restore if the item is missing (was removed during drag display)
            const exists = list.some(b => b.id === sourceInstance.id);
            if (!exists) {
              list.splice(sourceIndex, 0, sourceInstance);
              newZones[sourceZoneId] = list;
            }
            return newZones;
          });
        }
      }
      setDragState({ isDragging: false, sourceZoneId: null, sourceIndex: null, overZoneId: null, overIndex: null });
      setDragPreview(null);
      dragDroppedRef.current = false;
    };
    const handleWindowDragOver = (event: DragEvent) => {
      setDragPreview((prev: any) => prev ? { ...prev, x: event.clientX, y: event.clientY } : prev);
    };
    // Touch drag support
    const handleTouchDragOver = (event: TouchEvent) => {
      if (!dragPreviewRef.current) return;
      const touch = event.touches[0];
      setDragPreview((prev: any) => prev ? { ...prev, x: touch.clientX, y: touch.clientY } : prev);
      // Find which canvas zone is under finger
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el) {
        const zoneEl = el.closest('[data-zone-id]') as HTMLElement | null;
        if (zoneEl) {
          const zoneId = zoneEl.getAttribute('data-zone-id');
          const blocks = zoneEl.querySelectorAll('[data-block-id]');
          let overIndex = blocks.length;
          blocks.forEach((block, i) => {
            const rect = block.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (touch.clientY < mid && overIndex === blocks.length) overIndex = i;
          });
          if (zoneId) document.dispatchEvent(new CustomEvent('snippet-drag-over', { detail: { zoneId, index: overIndex } }));
        }
      }
    };
    const handleTouchDragEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el) {
        const zoneEl = el.closest('[data-zone-id]') as HTMLElement | null;
        if (zoneEl && dragPreviewRef.current) {
          const zoneId = zoneEl.getAttribute('data-zone-id')!;
          const { sourceZoneId, sourceIndex, sourceInstance } = dragPreviewRef.current;
          if (sourceZoneId && sourceInstance) {
            dragDroppedRef.current = true;
            document.dispatchEvent(new CustomEvent('snippet-touch-drop', {
              detail: { zoneId, sourceZoneId, sourceIndex, sourceInstance }
            }));
          }
        }
      }
      document.dispatchEvent(new CustomEvent('snippet-drag-end'));
    };
    const handleTouchDrop = (e: any) => {
      const { zoneId: targetZoneId, sourceZoneId, sourceIndex, sourceInstance } = e.detail;
      const dropIdx = dragState?.overIndex ?? undefined;
      handleZoneDrop(targetZoneId, { source: 'canvas', zoneId: sourceZoneId, index: sourceIndex, instance: sourceInstance }, dropIdx ?? 9999);
    };
    document.addEventListener('snippet-drag-start', handleDragStart);
    document.addEventListener('snippet-drag-over', handleDragOver);
    document.addEventListener('snippet-drag-end', handleDragEnd);
    document.addEventListener('snippet-touch-drop', handleTouchDrop);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('touchmove', handleTouchDragOver, { passive: true });
    window.addEventListener('touchend', handleTouchDragEnd, { passive: true });
    return () => {
      document.removeEventListener('snippet-drag-start', handleDragStart);
      document.removeEventListener('snippet-drag-over', handleDragOver);
      document.removeEventListener('snippet-drag-end', handleDragEnd);
      document.removeEventListener('snippet-touch-drop', handleTouchDrop);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('touchmove', handleTouchDragOver);
      window.removeEventListener('touchend', handleTouchDragEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const portalTarget = typeof document !== 'undefined' && document.getElementById('builder-utility-panel-portal');
    if (!portalTarget) {
      setIsTemplateModalOpen(false);
    }
    setTemplateAnimKey(prev => prev + 1);
    if (onTemplateChange) onTemplateChange(template);
  };

  const handleDataChange = (path: string, value: any) => {
    const updated = setNestedValue(cvData, path, value);
    onDataChange(updated);
  };

  // Dynamically sync user avatar from settings if basics.avatar is empty
  useEffect(() => {
    if (!readOnly && userData?.avatar && !cvData?.basics?.avatar) {
      let updated = setNestedValue(cvData, 'basics.avatar', userData.avatar);
      updated = setNestedValue(updated, 'basics.showAvatar', true);
      onDataChange(updated);
    }
  }, [userData?.avatar, cvData?.basics?.avatar, onDataChange, readOnly, cvData]);

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
    
    // Ensure legacy floating card is closed
    setPointSuggestion(null);

    const sectionName = path.includes('summary') ? 'Summary' : 'Experience/Project Description';
    
    // Cache section details and open Mori Assistant
    localStorage.setItem('mori_cv_context', JSON.stringify({
      path,
      text: originalText,
      sectionName
    }));
    localStorage.setItem('mori_assistant_active', 'true');
    window.dispatchEvent(new CustomEvent('mori-assistant-toggle', { 
      detail: {
        active: true,
        cvContext: { path, text: originalText, sectionName }
      }
    }));
    window.dispatchEvent(new CustomEvent('mori-cv-selection', {
      detail: { path, text: `(${sectionName}): ${originalText}` }
    }));
    window.dispatchEvent(new CustomEvent('open-mori-chat'));
  };

  useEffect(() => {
    const handleApply = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { path, text } = customEvent.detail || {};
      if (path && text) {
        handleDataChange(path, text);
        setPointSuggestion(null);
      }
    };
    window.addEventListener('mori-apply-suggestion', handleApply);
    return () => window.removeEventListener('mori-apply-suggestion', handleApply);
  }, [handleDataChange]);

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
    dragDroppedRef.current = true; // mark as a successful drop
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
        
        const sourceList = [...newZones[sourceZoneId]];
        sourceList.splice(sourceIndex, 1);
        newZones[sourceZoneId] = sourceList;
        
        let finalInsertIndex = insertIndex;
        if (sourceZoneId === targetZoneId && sourceIndex < insertIndex) finalInsertIndex -= 1;
        
        const targetList = sourceZoneId === targetZoneId ? sourceList : [...(newZones[targetZoneId] || [])];
        targetList.splice(finalInsertIndex, 0, instance);
        newZones[targetZoneId] = targetList;
      }
      return newZones;
    });
  };

  const moveSnippet = (zoneId: string, index: number, dir: number) => { 
    setZones(prev => { 
      const newZones = { ...prev }; 
      const list = [...(newZones[zoneId] || [])]; 
      if (list.length === 0 || index + dir < 0 || index + dir >= list.length) return prev; 
      const item = list[index]; 
      list.splice(index, 1); 
      list.splice(index + dir, 0, item); 
      newZones[zoneId] = list; 
      return newZones; 
    }); 
  };
  
  const removeSnippet = (zoneId: string, index: number) => { 
    setZones(prev => { 
      const newZones = { ...prev }; 
      if (newZones[zoneId]) {
        const list = [...newZones[zoneId]];
        list.splice(index, 1);
        newZones[zoneId] = list;
      }
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
  const handleAddClick = (zoneId: string, insertIndex?: number) => setReplacingSnippet({ zoneId, isAdd: true, insertIndex });

  const handleAddListEntry = (type: string) => {
    const l = getCollectionNameForCategory(type);
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
    const snippetDef = SNIPPETS[newType];
    setZones(prev => {
      const newZones = { ...prev };
      if (!newZones[replacingSnippet.zoneId]) {
        newZones[replacingSnippet.zoneId] = [];
      }
      if (replacingSnippet.isAdd) {
        if (typeof replacingSnippet.insertIndex === 'number') {
          newZones[replacingSnippet.zoneId].splice(replacingSnippet.insertIndex, 0, { id: generateId(), type: newType });
        } else {
          newZones[replacingSnippet.zoneId].push({ id: generateId(), type: newType });
        }
      }
      else {
        newZones[replacingSnippet.zoneId][replacingSnippet.index] = { id: generateId(), type: newType };
      }
      return newZones;
    });

    if (snippetDef && LIST_SNIPPET_CATEGORIES.includes(snippetDef.category)) {
      const collectionName = getCollectionNameForCategory(snippetDef.category);
      const collection = cvData?.[collectionName];
      if (!Array.isArray(collection) || collection.length === 0) {
        const defaultEntry = createDefaultListEntry(snippetDef.category);
        if (defaultEntry) {
          onDataChange({
            ...cvData,
            [collectionName]: [...(Array.isArray(collection) ? collection : []), defaultEntry],
          });
        }
      }
    }

    setReplacingSnippet(null);
  };

  const photoInputRef = React.useRef<HTMLInputElement>(null);

  // Listen for avatar upload requests dispatched from AvatarEditable overlay
  React.useEffect(() => {
    const handler = () => photoInputRef.current?.click();
    window.addEventListener('cv-avatar-upload-request', handler);
    return () => window.removeEventListener('cv-avatar-upload-request', handler);
  }, []);

  const pageAssignmentsRef = React.useRef(pageAssignments);
  pageAssignmentsRef.current = pageAssignments;
  const recentAssignmentsRef = React.useRef<string[]>([]);
  const zoomRef = React.useRef(zoom);
  zoomRef.current = zoom;

  // Dynamically calculate page partitioning assignments based on DOM snippet heights
  React.useEffect(() => {
    const docElement = document.querySelector('.cv-document');
    if (!docElement) return undefined;

    const measureAndPaginate = () => {
      const scale = zoomRef.current / 100;
      const isA4 = design.pageSize === 'A4';
      const H = isA4 ? 1122.5 : 1056;
      const M = layoutMetrics.pageMarginPx || 40;
      const usableHeight = H - 2 * M;

      // 1. Measure all rendered snippet/unit heights from the DOM
      const unitHeights: Record<string, number> = {};
      docElement.querySelectorAll('[data-block-id]').forEach(blockEl => {
        const blockId = blockEl.getAttribute('data-block-id');
        if (!blockId) return;

        const parentHeight = blockEl.getBoundingClientRect().height / scale;

        // Find all list entry children inside this block
        const entryElements = Array.from(blockEl.querySelectorAll('.cv-item.cv-page-breakable')) as HTMLElement[];

        if (entryElements.length > 0) {
          let sumEntriesHeight = 0;
          let sumEntryGaps = 0;
          entryElements.forEach((entryEl, idx) => {
            const entryId = entryEl.getAttribute('data-entry-id');
            if (entryId) {
              const h = entryEl.getBoundingClientRect().height / scale;
              const unitId = `${blockId}_entry_${entryId}`;
              unitHeights[unitId] = h;
              sumEntriesHeight += h;
              
              if (idx > 0) {
                const prevEl = entryElements[idx - 1];
                const gap = (entryEl.getBoundingClientRect().top - prevEl.getBoundingClientRect().bottom) / scale;
                sumEntryGaps += Math.max(0, gap);
              }
            }
          });

          // Accurately measure header height as distance from block top to first entry top
          const blockTop = blockEl.getBoundingClientRect().top;
          const firstEntryTop = entryElements[0].getBoundingClientRect().top;
          const headerUnitId = `${blockId}_header`;
          unitHeights[headerUnitId] = Math.max(0, (firstEntryTop - blockTop) / scale);
          
          // Store average entry gap for this block
          unitHeights[`${blockId}_entryGap`] = entryElements.length > 1 ? (sumEntryGaps / (entryElements.length - 1)) : 16;
        } else {
          // Non-list block
          unitHeights[blockId] = parentHeight;
        }
      });

      // 2. Compute page assignments with coordinated global & column pagination flow
      const newAssignments: Record<string, number> = {};
      const safeZones = zones || {};
      let maxPageNum = 0;
      const sectionGap = layoutMetrics.sectionGapPx || 0;

      // Classify zones based on template flow
      const layoutType = activeTemplate?.type || '1-col';
      const flow = templateLayoutFlows[layoutType] || { global: [], columns: [] };
      const globalZones = flow.global || [];
      const globalSet = new Set(globalZones);
      const columnZones = Object.keys(safeZones).filter(zoneId => !globalSet.has(zoneId));

      // 2a. First, paginate global stacked zones sequentially
      const globalHeightOnPage: Record<number, number> = {};
      let currentGlobalPage = 0;
      let currentGlobalHeight = 0;

      globalZones.forEach(zoneId => {
        const blocks = safeZones[zoneId] || [];
        blocks.forEach(block => {
          const gapBefore = () => (currentGlobalHeight > 0 ? sectionGap : 0);
          const snippetDef = SNIPPETS[block.type];
          const isList = snippetDef && LIST_SNIPPET_CATEGORIES.includes(snippetDef.category);

          if (isList) {
            const collectionName = getCollectionNameForCategory(snippetDef.category);
            const entries = cvData[collectionName] || [];

            const headerUnitId = `${block.id}_header`;
            const headerH = unitHeights[headerUnitId] || 40;
            const firstEntry = entries[0];
            const firstEntryH = firstEntry ? (unitHeights[`${block.id}_entry_${firstEntry.id}`] || 80) : 0;
            const entryGap = unitHeights[`${block.id}_entryGap`] || 16;

            if (currentGlobalHeight + gapBefore() + headerH + firstEntryH > usableHeight && currentGlobalHeight > 0) {
              globalHeightOnPage[currentGlobalPage] = currentGlobalHeight;
              currentGlobalPage++;
              currentGlobalHeight = 0;
            }
            newAssignments[headerUnitId] = currentGlobalPage;
            currentGlobalHeight += gapBefore() + headerH;
            if (currentGlobalPage > maxPageNum) maxPageNum = currentGlobalPage;

            entries.forEach((entry: any, entryIdx: number) => {
              const entryUnitId = `${block.id}_entry_${entry.id}`;
              const entryH = unitHeights[entryUnitId] || 80;

              if (entryIdx > 0) {
                if (currentGlobalHeight + entryGap + entryH > usableHeight && currentGlobalHeight > 0) {
                  globalHeightOnPage[currentGlobalPage] = currentGlobalHeight;
                  currentGlobalPage++;
                  currentGlobalHeight = 0;
                }
              }
              newAssignments[entryUnitId] = currentGlobalPage;
              currentGlobalHeight += (entryIdx > 0 ? entryGap : 0) + entryH;
              if (currentGlobalPage > maxPageNum) maxPageNum = currentGlobalPage;
            });
          } else {
            const h = unitHeights[block.id] || 80;
            if (currentGlobalHeight + gapBefore() + h > usableHeight && currentGlobalHeight > 0) {
              globalHeightOnPage[currentGlobalPage] = currentGlobalHeight;
              currentGlobalPage++;
              currentGlobalHeight = 0;
            }
            newAssignments[block.id] = currentGlobalPage;
            currentGlobalHeight += gapBefore() + h;
            if (currentGlobalPage > maxPageNum) maxPageNum = currentGlobalPage;
          }
        });
      });
      if (currentGlobalHeight > 0) {
        globalHeightOnPage[currentGlobalPage] = currentGlobalHeight;
      }

      // 2b. Next, paginate column zones independently, scaling maximum heights per page
      columnZones.forEach(zoneId => {
        const blocks = safeZones[zoneId] || [];
        let currentPage = 0;
        let currentHeight = 0;

        blocks.forEach(block => {
          const gapBefore = () => (currentHeight > 0 ? sectionGap : 0);
          const getUsableHeightForPage = (pageIdx: number) => {
            const consumedGlobal = globalHeightOnPage[pageIdx] || 0;
            const overhead = consumedGlobal > 0 ? consumedGlobal + sectionGap : 0;
            return Math.max(100, usableHeight - overhead);
          };

          const snippetDef = SNIPPETS[block.type];
          const isList = snippetDef && LIST_SNIPPET_CATEGORIES.includes(snippetDef.category);

          if (isList) {
            const collectionName = getCollectionNameForCategory(snippetDef.category);
            const entries = cvData[collectionName] || [];

            const headerUnitId = `${block.id}_header`;
            const headerH = unitHeights[headerUnitId] || 40;
            const firstEntry = entries[0];
            const firstEntryH = firstEntry ? (unitHeights[`${block.id}_entry_${firstEntry.id}`] || 80) : 0;
            const entryGap = unitHeights[`${block.id}_entryGap`] || 16;

            let neededH = gapBefore() + headerH + firstEntryH;
            let pUsable = getUsableHeightForPage(currentPage);

            if (currentHeight + neededH > pUsable && currentHeight > 0) {
              currentPage++;
              currentHeight = 0;
              pUsable = getUsableHeightForPage(currentPage);
            }
            newAssignments[headerUnitId] = currentPage;
            currentHeight += gapBefore() + headerH;
            if (currentPage > maxPageNum) maxPageNum = currentPage;

            entries.forEach((entry: any, entryIdx: number) => {
              const entryUnitId = `${block.id}_entry_${entry.id}`;
              const entryH = unitHeights[entryUnitId] || 80;

              if (entryIdx > 0) {
                let pUsableInner = getUsableHeightForPage(currentPage);
                if (currentHeight + entryGap + entryH > pUsableInner && currentHeight > 0) {
                  currentPage++;
                  currentHeight = 0;
                }
              }
              newAssignments[entryUnitId] = currentPage;
              currentHeight += (entryIdx > 0 ? entryGap : 0) + entryH;
              if (currentPage > maxPageNum) maxPageNum = currentPage;
            });
          } else {
            const h = unitHeights[block.id] || 80;
            let pUsable = getUsableHeightForPage(currentPage);
            if (currentHeight + gapBefore() + h > pUsable && currentHeight > 0) {
              currentPage++;
              currentHeight = 0;
              pUsable = getUsableHeightForPage(currentPage);
            }
            newAssignments[block.id] = currentPage;
            currentHeight += gapBefore() + h;
            if (currentPage > maxPageNum) maxPageNum = currentPage;
          }
        });
      });

      // 3. Set total pages count state only if changed
      const nextTotalPages = maxPageNum + 1;
      setTotalPagesCount(prev => prev !== nextTotalPages ? nextTotalPages : prev);

      // Cycle oscillation detection
      const assignmentsStr = JSON.stringify(newAssignments);
      if (recentAssignmentsRef.current.includes(assignmentsStr)) {
        return; // Abort cycle
      }

      // 4. Update page assignments state only if changed to avoid loop
      const oldAssignments = pageAssignmentsRef.current;
      const isChanged = Object.keys(newAssignments).some(id => newAssignments[id] !== oldAssignments[id]) ||
                        Object.keys(oldAssignments).some(id => newAssignments[id] !== oldAssignments[id]);
      if (isChanged) {
        recentAssignmentsRef.current.push(assignmentsStr);
        if (recentAssignmentsRef.current.length > 5) {
          recentAssignmentsRef.current.shift();
        }
        setPageAssignments(newAssignments);
      }
    };

    // Run adjust layout loop on requestAnimationFrame
    let rafId: number;
    const runMeasure = () => {
      measureAndPaginate();
    };

    // Initial measurement
    rafId = requestAnimationFrame(runMeasure);

    // Watch for mutations (user typing or editing content)
    let debounceTimer: any;
    
    // Ensure fonts are loaded
    if (typeof document !== 'undefined' && (document as any).fonts) {
      (document as any).fonts.ready.then(() => {
        measureAndPaginate();
      });
    }

    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        measureAndPaginate();
      }, 30);
    });
    observer.observe(docElement, { childList: true, subtree: true, characterData: true });

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [cvData.metadata, zones, design.pageSize, activeTemplate.id, layoutMetrics.pageMarginPx, layoutMetrics.sectionGapPx]);

  const handleTogglePhoto = () => {
    if (!cvData.basics?.showAvatar) {
      handleDataChange('basics.showAvatar', true);
      if (!cvData.basics?.avatar) {
        setTimeout(() => photoInputRef.current?.click(), 50);
      }
    } else {
      handleDataChange('basics.showAvatar', false);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if the file size is larger than 1MB (1,048,576 bytes)
    if (file.size > 1024 * 1024) {
      alert('Please upload an image smaller than 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;

      // Load image to crop it to 1:1 square ratio dynamically
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Force 1:1 square aspect ratio at 400x400 pixels
        const targetSize = 400;
        canvas.width = targetSize;
        canvas.height = targetSize;

        // Calculate center crop boundaries
        const sourceSize = Math.min(img.width, img.height);
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        // Draw cropped and scaled image onto the canvas
        ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, targetSize, targetSize);

        // Convert back to base64 Data URL (JPEG format for optimal compression)
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        handleDataChange('basics.avatar', croppedDataUrl);
        handleDataChange('basics.showAvatar', true);

        // Update settings database in real-time
        fetch('/api/user', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ avatar: croppedDataUrl }),
        }).then((res) => {
          if (res.ok) {
            // Dispatch event to sync with other hooks
            window.dispatchEvent(new CustomEvent('userProfileUpdated', {
              detail: { user: { avatar: croppedDataUrl } }
            }));
          }
        }).catch((err) => {
          console.error('Error updating user avatar in settings:', err);
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const renderCanvasLayout = () => {
    const layoutType = activeTemplate.type;
    const safeZones = zones || {};

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
    const isDarkSidebar = isColorDark(design.sidebarBgColor || '#f8fafc');

    const getPageBlocks = (zoneId: string, pageIdx: number) => {
      const blocks = safeZones[zoneId] || [];
      return blocks.filter(block => {
        const snippetDef = SNIPPETS[block.type];
        const isList = snippetDef && LIST_SNIPPET_CATEGORIES.includes(snippetDef.category);

        if (isList) {
          const headerUnitId = `${block.id}_header`;
          if ((pageAssignments[headerUnitId] ?? 0) === pageIdx) {
            return true;
          }
          const collectionName = getCollectionNameForCategory(snippetDef.category);
          const entries = cvData[collectionName] || [];
          return entries.some((entry: any) => {
            const entryUnitId = `${block.id}_entry_${entry.id}`;
            return (pageAssignments[entryUnitId] ?? 0) === pageIdx;
          });
        } else {
          const assignedPage = pageAssignments[block.id] ?? 0;
          return assignedPage === pageIdx;
        }
      });
    };

    const renderPageZone = (zoneId: string, pageIdx: number, className: string, isDark = false) => {
      const pageBlocks = getPageBlocks(zoneId, pageIdx);
      
      const getGlobalIndex = (pageSpecificIdx: number) => {
        const globalBlocks = safeZones[zoneId] || [];
        if (pageSpecificIdx >= 0 && pageSpecificIdx < pageBlocks.length) {
          const targetBlock = pageBlocks[pageSpecificIdx];
          return globalBlocks.findIndex(b => b.id === targetBlock.id);
        }
        return -1;
      };

      const getGlobalInsertIndex = (pageSpecificInsertIdx?: number) => {
        const globalBlocks = safeZones[zoneId] || [];
        if (typeof pageSpecificInsertIdx === 'number' && pageSpecificInsertIdx < pageBlocks.length) {
          const targetBlock = pageBlocks[pageSpecificInsertIdx];
          const targetIndex = globalBlocks.findIndex(b => b.id === targetBlock.id);
          return targetIndex === -1 ? globalBlocks.length : targetIndex;
        }

        if (pageBlocks.length > 0) {
          const lastBlock = pageBlocks[pageBlocks.length - 1];
          const lastIndex = globalBlocks.findIndex(b => b.id === lastBlock.id);
          return lastIndex === -1 ? globalBlocks.length : lastIndex + 1;
        }

        return globalBlocks.length;
      };

      return (
        <CanvasZone
          readOnly={readOnly}
          zoneId={`${zoneId}_page_${pageIdx}`}
          blocks={pageBlocks}
          cvData={cvData}
          EditableWrapper={readOnly ? ReadOnlyWrapper : EditableWrapper}
          handleDrop={(targetZoneId: string, dragData: any, dropIdx: number) => {
            const globalBlocks = safeZones[zoneId] || [];
            
            let insertIndex = 0;
            if (dropIdx !== undefined && dropIdx < pageBlocks.length) {
              const targetBlock = pageBlocks[dropIdx];
              insertIndex = globalBlocks.findIndex(b => b.id === targetBlock.id);
            } else {
              if (pageBlocks.length > 0) {
                const lastBlock = pageBlocks[pageBlocks.length - 1];
                insertIndex = globalBlocks.findIndex(b => b.id === lastBlock.id) + 1;
              } else {
                insertIndex = globalBlocks.length;
              }
            }
            handleZoneDrop(zoneId, dragData, insertIndex);
          }}
          moveSnippet={(targetZoneId: string, pageSpecificIdx: number, dir: number) => {
            const gIdx = getGlobalIndex(pageSpecificIdx);
            if (gIdx !== -1) {
              moveSnippet(zoneId, gIdx, dir);
            }
          }}
          removeSnippet={(targetZoneId: string, pageSpecificIdx: number) => {
            const gIdx = getGlobalIndex(pageSpecificIdx);
            if (gIdx !== -1) {
              removeSnippet(zoneId, gIdx);
            }
          }}
          onReplace={(targetZoneId: string, pageSpecificIdx: number, type: string) => {
            const gIdx = getGlobalIndex(pageSpecificIdx);
            if (gIdx !== -1) {
              handleReplaceClick(zoneId, gIdx, type);
            }
          }}
          onAddSnippet={(targetZoneId: string, pageSpecificInsertIdx?: number) => {
            handleAddClick(zoneId, getGlobalInsertIndex(pageSpecificInsertIdx));
          }}
          onTogglePhoto={handleTogglePhoto}
          onAddListEntry={handleAddListEntry}
          moveEntry={moveEntry}
          deleteEntry={deleteEntry}
          dragState={dragState}
          activeTemplate={activeTemplate}
          layoutZones={safeZones}
          className={className}
          isDark={isDark}
          onOpenSkillsSuggestions={() => void openSkillsSuggestions()}
          isDropAllowed={isSnippetDropAllowed}
          onMoveToZone={(pageSpecificIdx: number, targetZoneId: string) => {
            const gIdx = getGlobalIndex(pageSpecificIdx);
            if (gIdx === -1) return;
            const instance = (safeZones[zoneId] || [])[gIdx];
            if (!instance) return;
            handleZoneDrop(targetZoneId, { source: 'canvas', zoneId, index: gIdx, instance }, 9999);
          }}
        />
      );
    };

    const formatOption = design.formatOption || 'hybrid';
    const formatClass = formatOption === 'bullets_only' ? 'cv-format-bullets-only' : (formatOption === 'paragraph_only' ? 'cv-format-paragraph-only' : 'cv-format-hybrid');

    const maxPage = Object.values(pageAssignments).reduce((max, p) => Math.max(max, p), 0);
    const totalPages = maxPage + 1;
    const pages = Array.from({ length: totalPages }, (_, i) => i);

    return (
      <div id="cv-document-root" className={`flex flex-col items-center gap-[var(--cv-page-gap)] cv-document ${formatClass}`} style={{ width: 'var(--cv-page-width)' }}>
        {pages.map(pageIdx => {
          const renderLayout = () => {
            switch (layoutType) {
              case '1-col': 
                return (
                  <div className="h-full w-full" style={{ padding: 'var(--cv-page-margin)' }}>
                    {renderPageZone('main', pageIdx, 'w-full min-w-0')}
                  </div>
                );
              case '2-col': 
                return (
                  <div className="h-full w-full flex flex-col" style={{ padding: 'var(--cv-page-margin)' }}>
                    {pageIdx === 0 && safeZones['header'] && (
                      <div className="mb-4">{renderPageZone('header', pageIdx, 'w-full min-w-0')}</div>
                    )}
                    <div className="flex flex-1 items-start gap-[var(--cv-column-gap)]">
                      <div className="flex-1 min-w-0">{renderPageZone('left', pageIdx, 'h-max')}</div>
                      <div className="flex-1 min-w-0">{renderPageZone('right', pageIdx, 'h-max')}</div>
                    </div>
                  </div>
                );
              case 'sidebar-left': 
                return (
                  <div className="h-full w-full flex relative" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>
                    <div className="absolute left-0 top-0 bottom-0 z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% + 0.36 * var(--cv-page-margin))' }}></div>
                    <div className={`w-[32%] min-w-0 relative z-10 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingRight: '5mm' }}>
                      {renderPageZone('sidebar', pageIdx, 'h-max', isDarkSidebar)}
                    </div>
                    <div className="w-[68%] min-w-0 relative z-10" style={{ paddingLeft: '5mm' }}>
                      {renderPageZone('main', pageIdx, 'h-max')}
                    </div>
                  </div>
                );
              case 'sidebar-left-dark': 
                return (
                  <div className="h-full w-full flex relative" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>
                    <div className="absolute left-0 top-0 bottom-0 z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% + 0.36 * var(--cv-page-margin))' }}></div>
                    <div className={`w-[32%] min-w-0 relative z-10 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingRight: '5mm' }}>
                      {renderPageZone('sidebar', pageIdx, 'h-max', isDarkSidebar)}
                    </div>
                    <div className="w-[68%] min-w-0 relative z-10" style={{ paddingLeft: '5mm' }}>
                      {renderPageZone('main', pageIdx, 'h-max')}
                    </div>
                  </div>
                );
              case 'sidebar-right': 
                return (
                  <div className="h-full w-full flex relative" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingTop: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)' }}>
                    <div className="absolute right-0 top-0 bottom-0 z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% + 0.36 * var(--cv-page-margin))' }}></div>
                    <div className="w-[68%] min-w-0 relative z-10" style={{ paddingRight: '5mm' }}>
                      {renderPageZone('main', pageIdx, 'h-max')}
                    </div>
                    <div className={`w-[32%] min-w-0 relative z-10 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingLeft: '5mm' }}>
                      {renderPageZone('sidebar', pageIdx, 'h-max', isDarkSidebar)}
                    </div>
                  </div>
                );
              case 'top-sidebar-left': 
                return (
                  <div className="h-full w-full flex flex-col relative" style={{ minHeight: 'var(--cv-page-height)' }}>
                    {pageIdx === 0 && safeZones['header'] && (
                      <div className="relative z-10" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>
                        {renderPageZone('header', pageIdx, 'w-full min-w-0')}
                      </div>
                    )}
                    <div className="flex flex-1 relative z-10 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: pageIdx === 0 && safeZones['header'] ? 'var(--cv-section-gap, 16px)' : 'var(--cv-page-margin)' }}>
                      <div className="absolute left-[var(--cv-page-margin)] top-[var(--cv-section-gap,16px)] bottom-0 rounded-lg z-[-1]" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% - 16px)' }}></div>
                      <div className={`w-[32%] min-w-0 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingRight: '5mm' }}>
                        {renderPageZone('sidebar', pageIdx, 'h-max', isDarkSidebar)}
                      </div>
                      <div className="w-[68%] min-w-0">
                        {renderPageZone('main', pageIdx, 'h-max')}
                      </div>
                    </div>
                  </div>
                );
              case 'top-sidebar-right': 
                return (
                  <div className="h-full w-full flex flex-col relative" style={{ minHeight: 'var(--cv-page-height)' }}>
                    {pageIdx === 0 && safeZones['header'] && (
                      <div className="relative z-10" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>
                        {renderPageZone('header', pageIdx, 'w-full min-w-0')}
                      </div>
                    )}
                    <div className="flex flex-1 relative z-10 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: pageIdx === 0 && safeZones['header'] ? 'var(--cv-section-gap, 16px)' : 'var(--cv-page-margin)' }}>
                      <div className="w-[68%] min-w-0">
                        {renderPageZone('main', pageIdx, 'h-max')}
                      </div>
                      <div className="absolute right-[var(--cv-page-margin)] top-[var(--cv-section-gap,16px)] bottom-0 rounded-lg z-[-1]" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% - 16px)' }}></div>
                      <div className={`w-[32%] min-w-0 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingLeft: '5mm' }}>
                        {renderPageZone('sidebar', pageIdx, 'h-max', isDarkSidebar)}
                      </div>
                    </div>
                  </div>
                );
              case 'hybrid-split': 
                return (
                  <div className="h-full w-full flex flex-col" style={{ minHeight: 'var(--cv-page-height)' }}>
                    {pageIdx === 0 && safeZones['header'] && (
                      <div style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>
                        {renderPageZone('header', pageIdx, 'w-full min-w-0')}
                      </div>
                    )}
                    <div style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingTop: pageIdx === 0 && safeZones['header'] ? 'var(--cv-section-gap, 16px)' : 'var(--cv-page-margin)', paddingBottom: 0 }}>
                      {renderPageZone('main', pageIdx, 'w-full min-w-0')}
                    </div>
                    <div className="flex flex-1 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: 'var(--cv-section-gap, 16px)' }}>
                      <div className="flex-1 min-w-0">{renderPageZone('left', pageIdx, 'h-max')}</div>
                      <div className="flex-1 min-w-0">{renderPageZone('right', pageIdx, 'h-max')}</div>
                    </div>
                  </div>
                );
              default: return <div>Layout not found</div>;
            }
          };

          return (
            <div 
              key={pageIdx} 
              className="cv-page shadow-2xl relative bg-white overflow-hidden flex flex-col" 
              style={{ 
                width: 'var(--cv-page-width)', 
                height: 'var(--cv-page-height)', 
                minHeight: 'var(--cv-page-height)',
                boxSizing: 'border-box'
              }}
            >
              {renderLayout()}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <CanvasContext.Provider
      value={{
        cvData,
        design,
        setDesign,
        handleDataChange,
        setFocusedNode,
        pageAssignments,
        aiIssues: [...aiIssues, ...grammarIssues],
        activeIssueId,
        moriChatMode,
        onIssueClick: (id: string) => {
          const all = [...aiIssues, ...grammarIssues];
          const issue = all.find((i: any) => i.id === id);
          if (issue?.category === 'grammar' && issue.suggestion && issue.targetText && typeof issue.targetText === 'string' && issue.targetText.trim() !== '') {
            const escaped = escapeRegExp(issue.targetText);
            if (escaped) {
              const regex = new RegExp(escaped, 'g');
              if (!regex.test('')) {
                const currentValue = getNestedValue(cvData, issue.path);
                const fixedValue =
                  typeof currentValue === 'string'
                    ? currentValue.replace(regex, issue.suggestion)
                    : currentValue;
                handleDataChange(issue.path, fixedValue);
                setGrammarIssues(prev => prev.filter((i: any) => i.id !== issue.id));
                if (activeIssueId === issue.id) setActiveIssueId(null);
                return;
              }
            }
          }
          setActiveIssueId(id);
          setActiveSidebar('ai');
        }
      }}
    >
      <div className={`h-full w-full flex font-sans overflow-hidden transition-colors duration-300 ${readOnly ? '' : bgApp}`}>
        {/* Hidden file input for avatar upload */}
        {!readOnly && (
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoFileChange}
          />
        )}
        {!readOnly && <FloatingToolbar targetNode={focusedNode} onSuggestPoint={handleSuggestPoint} />}

        <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col relative min-w-0">
          <div
            ref={workspaceRef}
            className={readOnly ? 'w-full @container' : `flex-1 overflow-auto relative flex justify-center custom-scrollbar transition-colors @container ${bgWorkspace}`}
            style={readOnly ? undefined : {
              paddingTop: layoutMetrics.workspacePaddingY,
              paddingBottom: layoutMetrics.workspacePaddingY,
              paddingLeft: layoutMetrics.workspacePaddingX,
              paddingRight: layoutMetrics.workspacePaddingX,
            }}
          >
          {readOnly ? (
            <div className="cv-document-wrapper relative text-gray-900" style={canvasStyleVars}>
              {renderCanvasLayout()}
            </div>
          ) : (
            <div key={templateAnimKey} className="transform origin-top transition-transform h-max pb-4 text-gray-900" style={{ transform: `scale(${zoom / 100})` }}>
              <div className="cv-document-wrapper relative" style={canvasStyleVars}>
                {renderCanvasLayout()}
              </div>
            </div>
          )}
          </div>

          {!readOnly && (
            <div className="absolute bottom-6 right-6 z-[40] hidden md:flex items-center gap-2 pointer-events-none">
              {/* Page Count and Size Info */}
              <div className={`px-3 h-9 rounded-xl border shadow-xl backdrop-blur-md flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider ${bgNav} ${textPrimary} opacity-90 hover:opacity-100 transition-opacity pointer-events-auto`}>
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
              <div className={`px-2 h-9 rounded-xl border shadow-xl backdrop-blur-md flex items-center gap-2 ${bgNav} ${textPrimary} opacity-90 hover:opacity-100 transition-opacity pointer-events-auto`}>
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
                  className={`min-w-[42px] px-1.5 py-1 text-[9px] font-black rounded-md transition-all border ${zoom === 100 && !isAutoFit ? 'bg-emerald-500/20 border-emerald-500/50 ' + brandGreen : 'bg-transparent border-gray-500/20 hover:border-emerald-500/50 ' + textMuted}`}
                >
                  {zoom}%
                </button>
                <button 
                  onClick={triggerAutoFit}
                  className={`min-w-[42px] px-1.5 py-1 text-[9px] font-black rounded-md transition-all border ${isAutoFit ? 'bg-emerald-500/20 border-emerald-500/50 ' + brandGreen : 'bg-transparent border-gray-500/20 hover:border-emerald-500/50 ' + textMuted}`}
                >
                  FIT
                </button>
              </div>

              {/* Undo / Redo History Controls */}
              <div className={`px-2 h-9 rounded-xl border shadow-xl backdrop-blur-md flex items-center gap-1.5 ${bgNav} ${textPrimary} opacity-90 hover:opacity-100 transition-opacity pointer-events-auto`}>
                <button
                  onClick={() => enhancerDispatch({ type: 'UNDO' })}
                  disabled={enhancerState.undoStack.length === 0}
                  className={`p-1.5 transition-all flex items-center justify-center hover:scale-105 active:scale-95 rounded-lg ${
                    enhancerState.undoStack.length === 0 
                      ? 'opacity-30 cursor-not-allowed text-gray-500' 
                      : 'hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-400'
                  }`}
                  title="Undo (Cmd+Z / Ctrl+Z)"
                >
                  <Undo size={14} />
                </button>
                <button
                  onClick={() => enhancerDispatch({ type: 'REDO' })}
                  disabled={enhancerState.redoStack.length === 0}
                  className={`p-1.5 transition-all flex items-center justify-center hover:scale-105 active:scale-95 rounded-lg ${
                    enhancerState.redoStack.length === 0 
                      ? 'opacity-30 cursor-not-allowed text-gray-500' 
                      : 'hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-400'
                  }`}
                  title="Redo (Cmd+Shift+Z / Ctrl+Shift+Z)"
                >
                  <Redo size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {!readOnly && activeSidebar === 'design' && (() => {
          const portalTarget = document.getElementById('builder-utility-panel-portal');
          if (!portalTarget) return null;
          const panelContent = (
            <div className="flex-grow flex flex-col h-full overflow-hidden">
              <div className={`p-5 border-b flex items-center justify-between shrink-0 ${bgNav}`}>
                <h3 className={`font-bold flex items-center gap-2 ${textPrimary}`}><Palette size={18} className={brandGreen}/> Global Design</h3>
                <div className="flex items-center gap-2">
                  <UtilityPanelPill activePanel="design" />
                  <button onClick={() => {
                    setActiveSidebar(null);
                    window.dispatchEvent(new CustomEvent('close-utility-panel'));
                  }} className={textMuted}><X size={18}/></button>
                </div>
              </div>
              <div className="p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar flex-1">
                <div><label className={`text-small font-bold uppercase tracking-widest mb-2 block ${textMuted}`}>Typography</label><div className="grid grid-cols-2 gap-2">{['Inter', 'Merriweather', 'Roboto Mono', 'Playfair Display'].map(f => (<button key={f} onClick={() => setDesign({...design, font: f})} className={`py-2 px-1 text-small rounded border transition-colors ${design.font === f ? 'bg-emerald-500/20 border-emerald-500 ' + brandGreen : (isDarkUI ? 'bg-[#222] border-[#333] text-gray-300' : 'bg-white border-gray-200 text-gray-700')}`} style={{ fontFamily: f }}>{f.split(' ')[0]}</button>))}</div></div>
                <div><label className={`text-small font-bold uppercase tracking-widest mb-2 flex justify-between ${textMuted}`}><span>Font Size</span><span className={brandGreen}>{design.fontSize}px</span></label><input type="range" min="10" max="16" step="0.5" value={design.fontSize} onChange={(e) => setDesign({...design, fontSize: parseFloat(e.target.value)})} className="w-full accent-emerald-500" /></div>
                <div><label className={`text-small font-bold uppercase tracking-widest mb-2 flex justify-between ${textMuted}`}><span>Line Spacing</span><span className={brandGreen}>{design.spacing.toFixed(1)}x</span></label><input type="range" min="0.5" max="2" step="0.1" value={design.spacing} onChange={(e) => setDesign({...design, spacing: parseFloat(e.target.value)})} className="w-full accent-emerald-500" /></div>
                <div><label className={`text-small font-bold uppercase tracking-widest mb-2 flex justify-between ${textMuted}`}><span>Page Margin</span><span className={brandGreen}>{design.pageMargin}px</span></label><input type="range" min="0" max="80" step="1" value={design.pageMargin} onChange={(e) => setDesign({...design, pageMargin: parseInt(e.target.value)})} className="w-full accent-emerald-500" /></div>
                <div><label className={`text-small font-bold uppercase tracking-widest mb-2 block ${textMuted}`}>Accent Color</label><div className="flex gap-3 flex-wrap">{['#7EE787', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#1f2937', '#000000', '#ffffff'].map(c => (<button key={c} onClick={() => setDesign({...design, accentColor: c})} className={`w-7 h-7 rounded-full border-2 transition-transform ${design.accentColor === c ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />))}</div></div>
                <div><label className={`text-small font-bold uppercase tracking-widest mb-2 block ${textMuted}`}>Sidebar Background</label><div className="flex gap-3 flex-wrap">{['#ffffff', '#f8fafc', '#f3f4f6', '#fafaf9', '#f0fdf4', '#f0f9ff', '#fff1f2', '#1e293b', '#0f172a', '#111827', '#1a0f0f', '#0d233a', '#0c2511', '#2a1428'].map(c => (<button key={c} onClick={() => setDesign({...design, sidebarBgColor: c})} className={`w-7 h-7 rounded-full border-2 transition-transform ${design.sidebarBgColor === c ? 'border-emerald-500 scale-125 shadow-lg' : 'border-gray-300 dark:border-gray-600 hover:scale-110'}`} style={{ backgroundColor: c }} />))}</div></div>
                <div><label className={`text-small font-bold uppercase tracking-widest mb-2 flex justify-between ${textMuted}`}><span>Section Gap</span><span className={brandGreen}>{design.sectionGap}px</span></label><input type="range" min="0" max="60" step="1" value={design.sectionGap} onChange={(e) => setDesign({...design, sectionGap: parseInt(e.target.value)})} className="w-full accent-emerald-500" /></div>
                <div className="mt-4"><label className={`flex items-center justify-between cursor-pointer`}><span className={`text-small font-bold uppercase tracking-widest ${textMuted}`}>Header Icons</span><div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${design.showHeaderIcons ? brandGreenBg : (isDarkUI ? 'bg-[#333]' : 'bg-gray-300')}`} onClick={() => setDesign({...design, showHeaderIcons: !design.showHeaderIcons})}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${design.showHeaderIcons ? 'translate-x-6' : 'translate-x-1'}`} /></div></label></div>
                <div className="mt-4"><label className={`flex items-center justify-between cursor-pointer`}><span className={`text-small font-bold uppercase tracking-widest ${textMuted}`}>Contact Icons</span><div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${design.showContactIcons ? brandGreenBg : (isDarkUI ? 'bg-[#333]' : 'bg-gray-300')}`} onClick={() => setDesign({...design, showContactIcons: !design.showContactIcons})}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${design.showContactIcons ? 'translate-x-6' : 'translate-x-1'}`} /></div></label></div>
                {['sidebar-left', 'sidebar-left-dark', 'sidebar-right', 'top-sidebar-left', 'top-sidebar-right'].includes(activeTemplate.type) && (
                  <div className="mt-4 border-t border-gray-200 dark:border-white/10 pt-4">
                    <label className={`flex items-center justify-between cursor-pointer`}>
                      <span className={`text-small font-bold uppercase tracking-widest ${textMuted}`}>Split Contact in Sidebar</span>
                      <div 
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${design.splitContactInSidebar ? brandGreenBg : (isDarkUI ? 'bg-[#333]' : 'bg-gray-300')}`} 
                        onClick={() => setDesign({...design, splitContactInSidebar: !design.splitContactInSidebar})}
                      >
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${design.splitContactInSidebar ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </label>
                    <p className="text-[10px] text-gray-500 mt-1 italic">Controls if contact info is separated from header in vertical layouts.</p>
                  </div>
                )}
                
                <div className="mt-6 border-t pt-5 border-gray-200 dark:border-[#333]">
                  <label className={`text-small font-bold uppercase tracking-widest mb-2.5 block ${textMuted}`}>Description Layout</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'hybrid', label: 'Hybrid' },
                      { id: 'paragraph_only', label: 'Paragraph' },
                      { id: 'bullets_only', label: 'Bullets' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setDesign({ ...design, formatOption: opt.id })}
                        className={`py-2 px-1 text-small font-bold rounded border transition-colors ${
                          (design.formatOption || 'hybrid') === opt.id
                            ? 'bg-emerald-500/20 border-emerald-500 ' + brandGreen
                            : (isDarkUI ? 'bg-[#222] border-[#333] text-gray-300 hover:bg-[#2e2e2e]' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50')
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t pt-5 border-gray-200 dark:border-[#333]">
                  <label className={`text-small font-bold uppercase tracking-widest mb-3 block ${textMuted}`}>Date Format</label>
                  <select value={design.dateFormat || 'MMM YYYY'} onChange={(e) => setDesign({...design, dateFormat: e.target.value})} className={`w-full p-2.5 rounded-lg border text-small appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${isDarkUI ? 'bg-[#1e1e1e] border-gray-700 text-gray-200 hover:border-gray-600' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300 shadow-sm'}`}>
                    <option value="MMM YYYY">Short Text (Jan 2024)</option>
                    <option value="MMMM YYYY">Long Text (January 2024)</option>
                    <option value="MM/YYYY">US Numeric (01/2024)</option>
                    <option value="YYYY-MM">ISO Numeric (2024-01)</option>
                    <option value="YYYY">Year Only (2024)</option>
                  </select>
                </div>

                <div className="mt-6 border-t pt-5 border-gray-200 dark:border-[#333]">
                  <label className={`text-small font-bold uppercase tracking-widest mb-3 block ${textMuted}`}>Header Links</label>
                  <div className="flex flex-col gap-3">
                    {['location', 'phone', 'email', 'linkedin', 'website', ...(cvData?.basics?.profiles?.map((p: any) => p.network?.toLowerCase()) || [])]
                      .filter((v, i, a) => a.indexOf(v) === i && v)
                      .map(linkType => (
                      <label key={linkType} className="flex items-center justify-between cursor-pointer group">
                        <span className={`text-small capitalize font-medium transition-colors ${design.headerLinks?.[linkType] !== false ? textPrimary : textMuted}`}>{linkType}</span>
                        <div className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${design.headerLinks?.[linkType] !== false ? brandGreenBg : (isDarkUI ? 'bg-[#333]' : 'bg-gray-300')}`} onClick={() => setDesign({...design, headerLinks: {...(design.headerLinks || {}), [linkType]: design.headerLinks?.[linkType] === false}})}>
                          <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${design.headerLinks?.[linkType] !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
          return createPortal(panelContent, portalTarget);
        })()}

        {!readOnly && activeSidebar === 'data' && (() => {
          const portalTarget = document.getElementById('builder-utility-panel-portal');
          if (!portalTarget) return null;
          const panelContent = (
            <div className="flex-grow flex flex-col h-full overflow-hidden">
              <div className={`p-5 border-b flex items-center justify-between shrink-0 ${bgNav}`}>
                <h3 className={`font-bold flex items-center gap-2 ${textPrimary}`}>
                  <FileJson size={18} className={brandGreen} /> Raw JSON
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJsonTemplate}
                    title="Copy JSON Template"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-small font-semibold transition-all ${brandGreenBg} hover:opacity-90`}
                  >
                    <Copy size={13} />
                    Copy JSON Template
                  </button>
                  <UtilityPanelPill activePanel="json" />
                  <button onClick={() => {
                    setActiveSidebar(null);
                    window.dispatchEvent(new CustomEvent('close-utility-panel'));
                  }} className={textMuted}><X size={18} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden relative flex flex-col">
                <JSONSidebarViewer data={cvData} focusedPath={focusedNode ? focusedNode.getAttribute('data-path') : null} onChange={(newData) => onDataChange(newData)} rainbowHighlight={true} />
              </div>
            </div>
          );
          return createPortal(panelContent, portalTarget);
        })()}
      </div>

      {/* Drag preview thumbnail — 16:9 floating card that follows cursor/touch */}
      {!readOnly && dragPreview?.markup && (() => {
        const THUMB_W = 280;
        const THUMB_H = Math.round(THUMB_W * (9 / 16)); // 16:9 aspect ratio = 157.5px
        return (
          <div
            className="fixed z-[9999] pointer-events-none select-none"
            style={{
              left: dragPreview.x - THUMB_W / 2,
              top: dragPreview.y - THUMB_H / 2 - 20,
              width: THUMB_W,
              height: THUMB_H,
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
              transform: 'rotate(-1.5deg) scale(1.04)',
              transition: 'transform 0.1s ease',
            }}
          >
            {/* Label badge */}
            <div
              className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md whitespace-nowrap z-10"
            >
              ✦ {dragPreview.label}
            </div>
            {/* 16:9 card */}
            <div className="w-full h-full rounded-xl border-2 border-emerald-400/80 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden relative">
              {/* Scaled content — scale from actual width to thumbnail width */}
              <div
                className="absolute top-0 left-0 origin-top-left pointer-events-none [&_.no-print]:hidden"
                style={{
                  width: dragPreview.width || 500,
                  transform: `scale(${THUMB_W / (dragPreview.width || 500)})`,
                }}
                dangerouslySetInnerHTML={{ __html: dragPreview.markup }}
              />
              {/* Frosted overlay to soften content edges */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/60 pointer-events-none" />
            </div>
          </div>
        );
      })()}
      {!readOnly && skillsSuggestionState.open && (
        <div className="fixed inset-0 z-[125] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden ${bgPanel}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${bgNav}`}>
              <div>
                <h3 className={`text-h3 font-bold ${textPrimary}`}>AI Skill Suggestions</h3>
                <p className={`text-small ${textMuted}`}>Personalized recommendations for {skillsSuggestionState.meta?.role || role || 'your target role'}.</p>
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
                  <div className={`mt-2 text-h2 font-black ${textPrimary}`}>{skillsSuggestionState.categories.reduce((total, category) => total + category.skills.length, 0)}</div>
                </div>
                <div className={`rounded-xl border p-4 ${isDarkUI ? 'border-[#2a2a2a] bg-[#111111]' : 'border-gray-200 bg-white'}`}>
                  <div className={`text-[11px] uppercase tracking-[0.22em] ${textMuted}`}>Skill Groups</div>
                  <div className={`mt-2 text-h2 font-black ${textPrimary}`}>{skillsSuggestionState.categories.length}</div>
                </div>
                <div className={`rounded-xl border p-4 ${isDarkUI ? 'border-[#2a2a2a] bg-[#111111]' : 'border-gray-200 bg-white'}`}>
                  <div className={`text-[11px] uppercase tracking-[0.22em] ${textMuted}`}>Impact Preview</div>
                  <div className={`mt-2 text-small font-semibold ${textPrimary}`}>Adds targeted keywords with one click.</div>
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
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-small text-red-700">
                  {skillsSuggestionState.error}
                </div>
              )}

              {!skillsSuggestionState.loading && !skillsSuggestionState.error && skillsSuggestionState.categories.length > 0 && (
                <div className="space-y-4">
                  {skillsSuggestionState.categories.map((category, index) => (
                    <div key={`${category.category}-${index}`} className={`rounded-2xl border p-4 ${isDarkUI ? 'border-[#2a2a2a] bg-[#111111]' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className={`text-body font-bold ${textPrimary}`}>{category.category}</div>
                          <div className={`mt-1 text-small ${textMuted}`}>Preview impact: +{category.skills.length} relevant skills</div>
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
                          <span key={`${category.category}-${skill}`} className={`px-3 py-1.5 rounded-full text-small font-medium border ${isDarkUI ? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
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
              <p className={`text-small ${textMuted}`}>Review the recommendation preview, then add a category or apply everything at once.</p>
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

      {/* TEMPLATE PANEL (rendered as portal if target exists, otherwise fall back to modal) */}
      {isTemplateModalOpen && (() => {
        const portalTarget = document.getElementById('builder-utility-panel-portal');
        if (!portalTarget) return null;
        const content = (
          <div className="flex-grow flex flex-col h-full overflow-hidden">
            <div className={`p-5 border-b flex justify-between items-center shrink-0 ${bgNav}`}>
              <div className="flex items-center gap-3">
                <LayoutTemplate size={18} className="text-emerald-500"/>
                <div>
                  <h3 className={`font-black text-xs uppercase tracking-wider ${textPrimary}`}>Template Library</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UtilityPanelPill activePanel="layout" />
                <button onClick={() => {
                  setIsTemplateModalOpen(false);
                  window.dispatchEvent(new CustomEvent('close-utility-panel'));
                }} className={`p-1.5 rounded-full ${btnSecondary}`}>
                  <X size={16}/>
                </button>
              </div>
            </div>
            <div className={`p-4 overflow-y-auto flex-1 custom-scrollbar ${isDarkUI ? 'bg-[#0a0a0a]' : 'bg-gray-100'}`}>
              <div className="space-y-6">
                {TEMPLATE_CATEGORIES.map(cat => {
                  const catTemplates = CANVAS_TEMPLATES.filter(tpl => cat.types.includes(tpl.type));
                  if (catTemplates.length === 0) return null;
                  return (
                    <div key={cat.id} className="space-y-3">
                      <div className={`py-1.5 flex items-center gap-2 border-b ${isDarkUI ? 'border-[#222] text-white' : 'border-gray-200 text-gray-900'}`}>
                        <span className="text-emerald-500">{cat.icon}</span>
                        <h2 className={`${cat.id === 'hybrid' ? 'text-[9px]' : 'text-xs'} font-bold uppercase tracking-wider`}>{cat.name}</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {catTemplates.map(tpl => {
                          const isActive = activeTemplate.id === tpl.id;
                          return (
                            <div key={tpl.id} onClick={() => loadTemplate(tpl)} className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col hover:shadow-lg ${bgPanel} ${isActive ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-transparent'}`}>
                              <div className={`p-2 flex justify-between items-center z-10 shrink-0 ${bgNav}`}>
                                <div className={`font-bold text-xs ${textPrimary}`}>{tpl.name}</div>
                                {isActive && <span className="bg-emerald-500/20 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded font-bold">ACTIVE</span>}
                              </div>
                              <div className={`relative w-full flex justify-center items-center p-0 overflow-hidden pointer-events-none ${isDarkUI ? 'bg-[#141414]' : 'bg-gray-50'}`}>
                                <div className="relative w-[177px] h-[250px] bg-white shadow-md overflow-hidden rounded-sm">
                                  <div className="absolute top-0 left-0 w-[794px] h-[1123px] origin-top-left text-gray-900" style={{ transform: 'scale(0.2229)' }}>
                                    <StaticLayoutRenderer template={tpl} cvData={cvData} ReadOnlyWrapper={ReadOnlyWrapper} design={design} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

        return createPortal(content, portalTarget);
      })()}

      {/* REPLACE / ADD SNIPPET MODAL */}
      {replacingSnippet && (() => {
        const getPreviewData = (realData: any) => {
          return {
            ...realData,
            basics: {
              name: 'Your Name',
              title: 'Job Title',
              summary: 'Professional summary...',
              ...realData?.basics,
            },
            experience: realData?.experience || [],
            education: realData?.education || [],
            projects: realData?.projects || [],
            skills: realData?.skills || {},
            certifications: realData?.certifications || [],
            awards: realData?.awards || [],
            publications: realData?.publications || [],
            volunteer: realData?.volunteer || [],
            references: realData?.references || [],
            languages: realData?.languages || '',
            interests: realData?.interests || '',
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
          <>
            {/* Backdrop Overlay */}
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[110] transition-opacity duration-300"
              onClick={() => setReplacingSnippet(null)}
            />
            {/* Right Side Panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-[420px] shadow-2xl z-[120] flex flex-col border-l transition-all duration-300 ease-in-out ${isDarkUI ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
              <div className={`p-4 border-b flex justify-between items-center ${isDarkUI ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                <h3 className={`font-bold text-body flex items-center gap-2 ${textPrimary}`}>{replacingSnippet.isAdd ? <PlusCircle size={18} className="text-emerald-500"/> : <RefreshCw size={18} className="text-blue-500"/>}{replacingSnippet.isAdd ? 'Add Snippet' : `Replace ${replacingSnippet.category}`}</h3>
                <button onClick={() => setReplacingSnippet(null)} className={`p-1.5 rounded-full ${isDarkUI ? 'bg-[#222] text-gray-300 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-colors`}><X size={18}/></button>
              </div>
              {replacingSnippet.isAdd && (
                <div className={`px-4 py-3 flex flex-wrap gap-1.5 border-b ${isDarkUI ? 'border-[#2a2a2a]' : 'border-gray-200'} bg-[#f9f9f9] dark:bg-[#0d0d0d]`}>
                  {['All', 'Header', 'Summary', 'Experience', 'Education', 'Projects', 'Certifications', 'Awards', 'Skills', 'Languages', 'Interests', 'Publications', 'Volunteer', 'References', 'Sidebar']
                    .filter(cat => cat === 'All' || !currentCategories.includes(cat))
                    .map(cat => (
                    <button key={cat} onClick={() => setReplacingSnippet({...replacingSnippet, filterCategory: cat === 'All' ? null : cat})} className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider border transition-all ${replacingSnippet.filterCategory === cat || (!replacingSnippet.filterCategory && cat === 'All') ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : (isDarkUI ? 'bg-[#1e1e1e] text-gray-400 border-[#2a2a2a] hover:bg-[#252525]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}`}>{cat}</button>
                  ))}
                  {(!replacingSnippet.filterCategory || replacingSnippet.filterCategory === 'Skills') && (
                    <button
                      type="button"
                      onClick={() => void openSkillsSuggestions()}
                      className="w-full mt-2 justify-center px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider border border-emerald-400/50 bg-emerald-500/10 text-emerald-500 flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all"
                    >
                      <Sparkles size={12} />
                      AI Skill Recommendations
                    </button>
                  )}
                </div>
              )}
              <div className={`p-4 overflow-y-auto flex-1 custom-scrollbar space-y-4 ${isDarkUI ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
                {sortedSnippets.map(snippet => {
                  const targetZoneId = replacingSnippet.zoneId;
                  const isTargetDark = false; // Always light theme for snippet previews
                  const isSidebar = ['sidebar', 'left', 'right'].includes(targetZoneId);
                  const styleKey = isSidebar && activeTemplate.sidebarTitleStyle ? activeTemplate.sidebarTitleStyle : activeTemplate.titleStyle;
                  const TitleRenderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];
                  
                  const isCurrent = snippet.id === replacingSnippet.currentType;
                  const isRecommended = recommendedFamily && SNIPPET_FAMILIES[recommendedFamily].some(k => snippet.id.includes(k));
                  const isATS = ATS_SNIPPETS.includes(snippet.id);
                  
                  const isHeader = snippet.category === 'Header';
                  const scale = isHeader ? 0.5 : 0.4;
                  const wrapperWidth = isSidebar ? '250%' : (isHeader ? '200%' : '250%');

                  return (
                    <div key={snippet.id} onClick={() => executeReplaceOrAdd(snippet.id)} className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col hover:shadow-lg ${isDarkUI ? 'bg-[#111]' : 'bg-white'} ${isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/20' : (isRecommended && !isCurrent ? 'border-amber-400 ring-2 ring-amber-400/20' : (isDarkUI ? 'border-[#222] hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'))}`}>
                      <div className={`p-3 flex flex-col gap-1.5 z-10 ${isDarkUI ? 'bg-[#111]' : 'bg-white'} border-b ${isDarkUI ? 'border-[#222]' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className={`font-bold text-sm ${textPrimary}`}>{snippet.name}</div>
                            <div className={`text-[9px] mt-0.5 font-semibold uppercase tracking-wider ${textMuted}`}>{snippet.category}</div>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {isCurrent && <span className="bg-emerald-500/20 text-emerald-500 text-[8px] px-1.5 py-0.5 rounded font-bold tracking-widest uppercase">CURRENT</span>}
                            {isRecommended && !isCurrent && <span className="bg-amber-400/20 text-amber-600 text-[8px] px-1.5 py-0.5 rounded font-bold tracking-widest uppercase flex items-center gap-0.5"><Sparkles size={8}/> RECOMMEND</span>}
                            {isATS && <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[8px] px-1.5 py-0.5 rounded font-bold tracking-widest uppercase flex items-center gap-0.5"><Check size={8}/> ATS</span>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#f9f9f9]" style={{ '--cv-font': design.font, '--cv-base-size': `${design.fontSize}px`, '--cv-spacing': design.spacing, '--cv-accent': design.accentColor, '--cv-sidebar-bg': '#ffffff', '--cv-section-gap': `${design.sectionGap}px` } as React.CSSProperties}>
                        <div className="absolute top-0 left-0 origin-top-left pointer-events-none p-4 opacity-95 group-hover:opacity-100 transition-opacity cv-document text-gray-900" style={{ width: wrapperWidth, transform: `scale(${scale})` }}>
                          <snippet.render data={previewData} Editable={ReadOnlyWrapper} zoneId={targetZoneId} isDark={isTargetDark} design={design} showIcons={true} layoutZones={zones} Title={({ titleKey }: any) => <TitleRenderer isDark={isTargetDark}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap /></TitleRenderer>} moveEntry={() => {}} deleteEntry={() => {}} readOnly={true} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
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
          overflow-wrap: break-word;
          word-wrap: break-word;
          white-space: normal;
        }
        .cv-document * {
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
          word-break: normal;
          hyphens: none;
        }
        /* Specific handle for name in header - allow shrinking */
        .cv-header-name, .cv-header-role {
          display: inline-block;
          max-width: 100%;
          overflow: visible !important;
          text-overflow: clip;
          white-space: nowrap !important;
          word-break: normal;
          overflow-wrap: normal;
        }
        .cv-page {
          font-family: var(--cv-font), sans-serif; color: #111827; font-size: var(--cv-base-size); position: relative; z-index: 10; 
          background: #ffffff;
          box-sizing: border-box;
          overflow: hidden;
        }
        .cv-document .text-gray-900 { color: #111827; }
        .cv-document .text-gray-800 { color: #1f2937; }
        .cv-document .text-gray-700 { color: #374151; }
        .cv-document .text-gray-600 { color: #4b5563; }
        .cv-document .text-gray-500 { color: #6b7280; }
        .cv-document .text-gray-400 { color: #9ca3af; }
        .cv-document .text-gray-300 { color: #d1d5db; }
        .cv-document .text-gray-200 { color: #e5e7eb; }
        .cv-document .text-gray-100 { color: #f3f4f6; }
        .cv-document .text-white { color: #ffffff; }
        
        /* Dark Sidebar Override Rules */
        .cv-document .cv-dark-sidebar,
        .cv-document .cv-dark-sidebar h1,
        .cv-document .cv-dark-sidebar h2,
        .cv-document .cv-dark-sidebar h3,
        .cv-document .cv-dark-sidebar h4,
        .cv-document .cv-dark-sidebar h5,
        .cv-document .cv-dark-sidebar h6,
        .cv-document .cv-dark-sidebar span,
        .cv-document .cv-dark-sidebar div,
        .cv-document .cv-dark-sidebar p,
        .cv-document .cv-dark-sidebar li {
          color: rgba(255, 255, 255, 0.95) !important;
        }
        .cv-document .cv-dark-sidebar .cv-accent-text {
          color: var(--cv-accent) !important;
        }
        .cv-document .cv-dark-sidebar .text-gray-400,
        .cv-document .cv-dark-sidebar .text-gray-500,
        .cv-document .cv-dark-sidebar .text-slate-400,
        .cv-document .cv-dark-sidebar .cv-subtitle,
        .cv-document .cv-dark-sidebar .cv-date {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        .cv-document .cv-dark-sidebar .border-slate-600,
        .cv-document .cv-dark-sidebar .border-gray-200,
        .cv-document .cv-dark-sidebar .border-gray-300 {
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
        
        /* Container queries for responsive typography */
        .cv-document, .cv-document > div, .cv-document > div > div {
          container-type: inline-size;
        }
        
        .cv-name { font-size: min(calc(var(--cv-base-size) * 2.5), 8cqw); line-height: 1.1; }
        .cv-name-narrow { font-size: min(calc(var(--cv-base-size) * 2.0), 8cqw); line-height: 1.1; }
        .cv-role { font-size: min(calc(var(--cv-base-size) * 1.15), 5.5cqw); }
        .cv-heading { font-size: calc(var(--cv-base-size) * 1.1); }
        .cv-title { font-size: calc(var(--cv-base-size) * 1.05); }
        .cv-subtitle { font-size: calc(var(--cv-base-size) * 0.95); }
        .cv-date { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-contact { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-contact-horizontal {
          flex-wrap: nowrap !important;
          overflow: hidden;
          font-size: min(calc(var(--cv-base-size) * 0.85), 2cqw) !important;
        }
        .cv-body { font-size: inherit; line-height: calc(1.6 * var(--cv-spacing)); }
        .cv-document p, .cv-document ul, .cv-document li { font-size: inherit !important; line-height: inherit !important; margin: 0; padding: 0; }
        .cv-document ul { list-style-type: disc !important; padding-left: 1.25rem !important; }
        .cv-document li { display: list-item !important; }
        .cv-document svg, .cv-document .lucide { vertical-align: middle !important; display: inline-block !important; }
        .cv-document .cv-contact span, .cv-document .cv-contact svg { display: inline-flex !important; align-items: center !important; }
        .cv-document .cv-contact svg { margin-top: -0.1em !important; }
        .cv-prose p { margin-bottom: calc(0.3em * var(--cv-spacing)) !important; }
        .cv-prose ul { list-style-type: disc !important; padding-left: 1.25rem !important; margin-top: calc(0.25em * var(--cv-spacing)) !important; margin-bottom: calc(0.25em * var(--cv-spacing)) !important; }
        .cv-prose li { display: list-item !important; margin-bottom: calc(0.15em * var(--cv-spacing)) !important; }
        [contenteditable]:empty:before { content: attr(placeholder); color: #9ca3af; pointer-events: none; display: block; }
        .cv-accent-text { color: var(--cv-accent) !important; }
        .cv-accent-bg { background-color: var(--cv-accent) !important; }
        .cv-accent-border { border-color: var(--cv-accent) !important; }
        .cv-document .cv-gap-sm { gap: calc(8px * var(--cv-spacing)) !important; }
        .cv-document .cv-gap-md { gap: calc(12px * var(--cv-spacing)) !important; }
        .cv-document .cv-gap-lg { gap: calc(16px * var(--cv-spacing)) !important; }
        
        /* Layout formats */
        .cv-format-bullets-only .cv-prose p {
          display: none !important;
          margin-bottom: 0 !important;
        }
        .cv-format-paragraph-only .cv-prose ul {
          display: none !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }
        .cv-document p:empty,
        .cv-document p:has(> br:only-child),
        .cv-document ul:empty {
          display: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .cv-page-visualizer { position: absolute; inset: 0; pointer-events: none; z-index: 1; background-size: 100% calc(var(--cv-page-height) + var(--cv-page-gap)); background-image: linear-gradient(to bottom, #ffffff 0, #ffffff var(--cv-page-height), transparent var(--cv-page-height), transparent calc(var(--cv-page-height) + var(--cv-page-gap))); filter: drop-shadow(0 15px 25px rgba(0,0,0,0.15)); }
        .cv-page-visualizer::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-size: 100% calc(var(--cv-page-height) + var(--cv-page-gap));
          background-image: linear-gradient(to bottom, transparent var(--cv-page-height), rgba(239, 68, 68, 0.4) var(--cv-page-height), rgba(239, 68, 68, 0.4) calc(var(--cv-page-height) + 2px), transparent calc(var(--cv-page-height) + 2px));
        }
        
        .cv-page-breakable { page-break-inside: auto; break-inside: auto; }
        
        @media print {
          @page { margin: 0; size: ${design.pageSize.toLowerCase()}; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          .cv-document-wrapper { transform: none !important; padding: 0 !important; box-shadow: none !important; margin: 0 !important; overflow: visible !important; }
          .cv-document { width: 100% !important; min-height: auto !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; display: block !important; height: auto !important; mask-image: none !important; -webkit-mask-image: none !important; }
          .cv-page-breakable { margin-top: 0 !important; }
          .cv-section-wrapper { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
          .cv-section { break-inside: auto !important; page-break-inside: auto !important; display: block !important; width: 100% !important; }
          .cv-item { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; width: 100% !important; }
          .cv-keep-with-next { break-inside: avoid !important; page-break-inside: avoid !important; break-after: avoid !important; display: block !important; width: 100% !important; }
          .cv-item-avoid { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; }
          .cv-page-visualizer { display: none !important; }
        }
        @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in-up { animation: fadeInUp 0.2s ease-out forwards; }
        @keyframes snippetEntrance { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .snippet-anim { 
          animation: snippetEntrance 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cv-page {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cv-section, .cv-item {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}} />
      </div>
    </CanvasContext.Provider>
  );
});

CVCanvasEngine.displayName = 'CVCanvasEngine';

export default CVCanvasEngine;
