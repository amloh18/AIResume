'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { translatePathWithArray, isExperiencePath } from '@/lib/utils/path-translation';
import {
  ZoomIn, ZoomOut, Maximize2, X,
  GripVertical, Plus, Trash2, Palette,
  ChevronUp, ChevronDown
} from 'lucide-react';

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1122;
const PAGE_MARGIN = 48;

interface CVCanvasEngineProps {
  cvData: UnifiedCVDataStructure;
  template: ITemplate | null;
  mode?: 'preview' | 'edit';
  pageFormat?: 'a4' | 'letter';
  showToolbar?: boolean;
  initialZoom?: number;
  className?: string;
  onCVDataChange?: (data: Partial<UnifiedCVDataStructure>) => void;
  onSectionClick?: (sectionId: string) => void;
  highlightedField?: string | null;
  fixAnnotations?: FixAnnotation[];
  onAnnotationClick?: (fixId: string) => void;
  toolbarRightSlot?: React.ReactNode;
}

interface DesignState {
  font: string;
  fontSize: number;
  spacing: number;
  pageMargin: number;
  accentColor: string;
}

const DEFAULT_DESIGN: DesignState = {
  font: 'Inter',
  fontSize: 11,
  spacing: 1.2,
  pageMargin: 48,
  accentColor: '#84cc16',
};

const TYPOGRAPHY = {
  name: 'font-bold leading-tight tracking-tight',
  role: 'font-semibold tracking-widest uppercase',
  sectionTitle: 'font-extrabold uppercase tracking-[0.15em]',
  itemTitle: 'font-bold',
  itemSubtitle: 'font-semibold italic',
  date: 'font-bold tracking-widest uppercase',
  body: 'text-[11px] leading-relaxed',
};

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  path: string;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  annotations?: FixAnnotation[];
  isDark?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  path,
  className = '',
  multiline = false,
  placeholder = 'Click to edit...',
  annotations = [],
  isDark = false,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fieldAnnotations = useMemo(() => {
    return annotations.filter(a => a.fieldPath === path && a.status === 'open');
  }, [annotations, path]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (ref.current) {
      const newValue = ref.current.innerHTML;
      if (newValue !== value && newValue !== '<br>') {
        onChange(newValue);
      }
    }
  }, [value, onChange]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  return (
    <span
      ref={ref}
      contentEditable={true}
      suppressContentEditableWarning={true}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`outline-none cursor-text min-h-[1em] rounded-sm px-0.5 transition-all hover:bg-lime-50/30 dark:hover:bg-lime-900/10 focus:bg-lime-50/50 dark:focus:bg-lime-900/20 focus:ring-1 focus:ring-lime-400/30 ${className}`}
      style={{ caretColor: '#84cc16' }}
      dangerouslySetInnerHTML={{ __html: value || '' }}
    />
  );
};

interface SectionToolbarProps {
  label: string;
  onAddEntry?: () => void;
  onDeleteSection?: () => void;
  canDelete?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const SectionToolbar: React.FC<SectionToolbarProps> = ({
  label,
  onAddEntry,
  onDeleteSection,
  canDelete,
  onMoveUp,
  onMoveDown,
}) => {
  return (
    <div className="flex items-center gap-0.5 absolute -left-2 top-0 z-30 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto -translate-x-full">
      {onMoveUp && (
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Move Up">
          <ChevronUp size={11} />
        </button>
      )}
      {onMoveDown && (
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Move Down">
          <ChevronDown size={11} />
        </button>
      )}
      <div className="w-px h-3.5 bg-gray-600 mx-0.5" />
      <span className="text-[10px] font-semibold text-lime-400 px-1 whitespace-nowrap">{label}</span>
      <div className="w-px h-3.5 bg-gray-600 mx-0.5" />
      {onAddEntry && (
        <button onClick={(e) => { e.stopPropagation(); onAddEntry(); }} className="p-1 rounded text-gray-400 hover:text-lime-400 hover:bg-lime-400/10 transition-colors" title={`Add ${label}`}>
          <Plus size={11} />
        </button>
      )}
      {canDelete && onDeleteSection && (
        <button onClick={(e) => { e.stopPropagation(); onDeleteSection(); }} className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Remove">
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
};

interface EntryToolbarProps {
  onDelete?: () => void;
  onAddBelow?: () => void;
  label?: string;
}

const EntryToolbar: React.FC<EntryToolbarProps> = ({ onDelete, onAddBelow, label }) => {
  return (
    <div className="flex items-center gap-0.5 absolute -right-2 top-0 z-20 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-md border border-gray-700 px-1.5 py-0.5 opacity-0 group-hover/item:opacity-100 transition-all duration-150 pointer-events-none group-hover/item:pointer-events-auto">
      {label && <span className="text-[8px] text-gray-500 px-1 max-w-[60px] truncate">{label}</span>}
      {onAddBelow && (
        <button onClick={(e) => { e.stopPropagation(); onAddBelow(); }} className="p-0.5 rounded text-gray-400 hover:text-lime-400 hover:bg-lime-400/10 transition-colors" title="Add below">
          <Plus size={10} />
        </button>
      )}
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Delete">
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
};

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];

export const CVCanvasEngine: React.FC<CVCanvasEngineProps> = ({
  cvData,
  template,
  mode = 'preview',
  pageFormat = 'a4',
  showToolbar = true,
  initialZoom = 1,
  className = '',
  onCVDataChange,
  onSectionClick,
  highlightedField,
  fixAnnotations = [],
  onAnnotationClick,
  toolbarRightSlot,
}) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [activePageFormat, setActivePageFormat] = useState<'a4' | 'letter'>(pageFormat);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [design, setDesign] = useState<DesignState>(DEFAULT_DESIGN);

  const pageWidth = activePageFormat === 'letter' ? 816 : A4_WIDTH_PX;
  const pageHeight = activePageFormat === 'letter' ? 1056 : A4_HEIGHT_PX;
  const primaryColor = template?.globalStyles?.primaryColor || design.accentColor;
  const fontFamily = template?.globalStyles?.fontFamily || design.font;
  const isEdit = mode === 'edit';

  const handleZoomIn = useCallback(() => {
    setZoom(prev => { const idx = ZOOM_LEVELS.indexOf(prev); return idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : prev; });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => { const idx = ZOOM_LEVELS.indexOf(prev); return idx > 0 ? ZOOM_LEVELS[idx - 1] : prev; });
  }, []);

  const updateField = useCallback((path: string, value: any) => {
    if (!onCVDataChange) return;
    
    const translatedPath = isExperiencePath(path) 
      ? translatePathWithArray(path, 'canvasToCvcircle')
      : path;
    
    const parts = translatedPath.split(/\.|\[/).filter(Boolean);
    const updated = JSON.parse(JSON.stringify(cvData));
    let obj: any = updated;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i].replace(']', '');
      obj = obj[part];
    }
    
    const lastPart = parts[parts.length - 1].replace(']', '');
    obj[lastPart] = value;
    
    onCVDataChange(updated);
  }, [cvData, onCVDataChange]);

  const addItem = useCallback((path: string, template: any) => {
    if (!onCVDataChange) return;
    
    const translatedPath = isExperiencePath(path)
      ? translatePathWithArray(path, 'canvasToCvcircle')
      : path;
    
    const parts = translatedPath.split(/\.|\[/).filter(Boolean);
    const updated = JSON.parse(JSON.stringify(cvData));
    let arr: any = updated;
    
    for (const p of parts) {
      arr = arr[p.replace(']', '')];
    }
    
    if (Array.isArray(arr)) {
      arr.push(template);
      onCVDataChange(updated);
    }
  }, [cvData, onCVDataChange]);

  const removeItem = useCallback((path: string, index: number) => {
    if (!onCVDataChange) return;
    
    const translatedPath = isExperiencePath(path)
      ? translatePathWithArray(path, 'canvasToCvcircle')
      : path;
    
    const parts = translatedPath.split(/\.|\[/).filter(Boolean);
    const updated = JSON.parse(JSON.stringify(cvData));
    let arr: any = updated;
    
    for (const p of parts.slice(0, -1)) {
      arr = arr[p.replace(']', '')];
    }
    
    const lastPart = parts[parts.length - 1];
    const idx = parseInt(lastPart.replace(']', ''), 10);
    
    if (Array.isArray(arr)) {
      arr.splice(idx, 1);
      onCVDataChange(updated);
    }
  }, [cvData, onCVDataChange]);

  const isHighlighted = useCallback((fieldPath: string) => {
    if (!highlightedField) return false;
    return highlightedField === fieldPath || 
           highlightedField.startsWith(fieldPath + '.') || 
           highlightedField.startsWith(fieldPath + '[');
  }, [highlightedField]);

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const highlight = target.closest('.cv-highlight') as HTMLElement | null;
    if (highlight && onAnnotationClick) {
      const fixId = highlight.getAttribute('data-fix-id');
      if (fixId) {
        e.preventDefault();
        e.stopPropagation();
        onAnnotationClick(fixId);
      }
    }
  }, [onAnnotationClick]);

  const basics = cvData.basics || {};
  const work = cvData.work || [];
  const education = cvData.education || [];
  const skills = cvData.skills || [];

  return (
    <div className={`cv-canvas-engine flex flex-col h-full ${className}`}>
      {showToolbar && (
        <div className="toolbar flex items-center justify-between px-4 py-1.5 flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">CV Canvas</span>
          </div>
          {toolbarRightSlot && (
            <div className="flex items-center flex-shrink-0">
              {toolbarRightSlot}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-hidden" onClick={handlePreviewClick}>
        <div className="flex-1 overflow-auto bg-[#525659] p-6 flex justify-center">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            <div 
              className="bg-white shadow-2xl relative" 
              style={{ 
                width: `${pageWidth}px`, 
                minHeight: `${pageHeight}px`, 
                fontFamily,
                fontSize: `${design.fontSize}px`,
                lineHeight: design.spacing,
              }}
            >
              <div style={{ padding: `${design.pageMargin}px` }}>
                <div className="text-gray-900" style={{ color: '#1f2937' }}>
                  {basics.name && (
                    <div 
                      data-section-id="basics"
                      className={`relative group overflow-visible rounded-md transition-all ${isEdit ? 'cursor-text' : ''} ${activeSection === 'basics' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${isHighlighted('basics') ? 'ring-2 ring-[#80FF00]/60 bg-[#80FF00]/5' : ''}`}
                      onClick={() => isEdit && onSectionClick && onSectionClick('basics')}
                    >
                      {isEdit && <SectionToolbar label="Personal Info" />}
                      <h1 className={`text-2xl font-bold ${TYPOGRAPHY.name}`}>
                        <EditableField 
                          value={basics.name} 
                          onChange={(v) => updateField('basics.name', v)}
                          path="basics.name"
                          className="text-gray-900"
                        />
                      </h1>
                      {basics.label && (
                        <p className={`text-sm text-gray-600 mt-0.5 ${TYPOGRAPHY.role}`} style={{ color: primaryColor }}>
                          <EditableField 
                            value={basics.label} 
                            onChange={(v) => updateField('basics.label', v)}
                            path="basics.label"
                          />
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-1 mt-2 text-[10px] text-gray-500">
                        {basics.email && <span><EditableField value={basics.email} onChange={(v) => updateField('basics.email', v)} path="basics.email" placeholder="email@example.com" /></span>}
                        {basics.phone && <><span className="text-gray-300">|</span><span><EditableField value={basics.phone} onChange={(v) => updateField('basics.phone', v)} path="basics.phone" placeholder="+1 234 567 890" /></span></>}
                        {basics.location?.city && <><span className="text-gray-300">|</span><span><EditableField value={basics.location.city} onChange={(v) => updateField('basics.location.city', v)} path="basics.location.city" placeholder="City, Country" /></span></>}
                        {basics.url && <><span className="text-gray-300">|</span><span><EditableField value={basics.url} onChange={(v) => updateField('basics.url', v)} path="basics.url" placeholder="website.com" className="text-lime-600" /></span></>}
                      </div>
                      {basics.summary && (
                        <div className="mt-3 text-gray-700 leading-relaxed">
                          <EditableField 
                            value={basics.summary} 
                            onChange={(v) => updateField('basics.summary', v)}
                            path="basics.summary"
                            multiline
                            className={TYPOGRAPHY.body}
                            placeholder="Professional summary..."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {work.length > 0 && (
                    <div 
                      data-section-id="work"
                      className={`mt-6 relative group overflow-visible rounded-md transition-all ${isEdit ? 'cursor-text' : ''} ${activeSection === 'work' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${isHighlighted('work') ? 'ring-2 ring-[#80FF00]/60 bg-[#80FF00]/5' : ''}`}
                      onClick={() => isEdit && onSectionClick && onSectionClick('work')}
                    >
                      {isEdit && (
                        <SectionToolbar 
                          label="Experience" 
                          onAddEntry={() => addItem('work[0]', { name: '', position: '', startDate: '', endDate: '', summary: '', highlights: [] })}
                        />
                      )}
                      <h2 
                        className={`text-sm font-bold uppercase tracking-wider border-b pb-1 mb-3 ${TYPOGRAPHY.sectionTitle}`}
                        style={{ color: primaryColor, borderColor: primaryColor + '40' }}
                      >
                        Experience
                      </h2>
                      <div className="space-y-4">
                        {work.map((job: any, idx: number) => (
                          <div key={idx} className="relative group/item pl-2">
                            {isEdit && (
                              <EntryToolbar
                                onDelete={() => removeItem(`work[${idx}]`, idx)}
                                onAddBelow={() => addItem(`work[${idx}]`, { name: '', position: '', startDate: '', endDate: '', summary: '', highlights: [] })}
                                label={job.position || 'Entry'}
                              />
                            )}
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">
                                  <EditableField 
                                    value={String(job.position || '')} 
                                    onChange={(v) => updateField(`work[${idx}].position`, v)}
                                    path={`work[${idx}].position`}
                                    placeholder="Position Title"
                                  />
                                </div>
                                <div className="text-gray-600">
                                  <EditableField 
                                    value={String(job.name || '')} 
                                    onChange={(v) => updateField(`work[${idx}].name`, v)}
                                    path={`work[${idx}].name`}
                                    placeholder="Company Name"
                                  />
                                </div>
                              </div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                                <EditableField 
                                  value={String(job.startDate || '')} 
                                  onChange={(v) => updateField(`work[${idx}].startDate`, v)}
                                  path={`work[${idx}].startDate`}
                                  placeholder="2020"
                                />
                                <span>–</span>
                                <EditableField 
                                  value={String(job.endDate || '')} 
                                  onChange={(v) => updateField(`work[${idx}].endDate`, v)}
                                  path={`work[${idx}].endDate`}
                                  placeholder="Present"
                                />
                              </div>
                            </div>
                            {job.summary && (
                              <p className="mt-1 text-gray-600">
                                <EditableField 
                                  value={String(job.summary)} 
                                  onChange={(v) => updateField(`work[${idx}].summary`, v)}
                                  path={`work[${idx}].summary`}
                                  multiline
                                  placeholder="Describe your role..."
                                />
                              </p>
                            )}
                            {job.highlights && job.highlights.length > 0 && (
                              <ul className="mt-1 text-gray-600 ml-5 list-disc">
                                {job.highlights.map((highlight: string, hIdx: number) => (
                                  <li key={hIdx}>
                                    <EditableField 
                                      value={highlight} 
                                      onChange={(v) => {
                                        const newHighlights = [...job.highlights];
                                        newHighlights[hIdx] = v;
                                        updateField(`work[${idx}].highlights`, newHighlights);
                                      }}
                                      path={`work[${idx}].highlights[${hIdx}]`}
                                    />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {education.length > 0 && (
                    <div 
                      data-section-id="education"
                      className={`mt-6 relative group overflow-visible rounded-md transition-all ${isEdit ? 'cursor-text' : ''} ${activeSection === 'education' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${isHighlighted('education') ? 'ring-2 ring-[#80FF00]/60 bg-[#80FF00]/5' : ''}`}
                      onClick={() => isEdit && onSectionClick && onSectionClick('education')}
                    >
                      {isEdit && (
                        <SectionToolbar 
                          label="Education" 
                          onAddEntry={() => addItem('education[0]', { institution: '', studyType: '', area: '', startDate: '', endDate: '' })}
                        />
                      )}
                      <h2 
                        className={`text-sm font-bold uppercase tracking-wider border-b pb-1 mb-3 ${TYPOGRAPHY.sectionTitle}`}
                        style={{ color: primaryColor, borderColor: primaryColor + '40' }}
                      >
                        Education
                      </h2>
                      <div className="space-y-3">
                        {education.map((edu: any, idx: number) => (
                          <div key={idx} className="relative group/item flex justify-between items-start pl-2">
                            {isEdit && (
                              <EntryToolbar
                                onDelete={() => removeItem(`education[${idx}]`, idx)}
                                onAddBelow={() => addItem(`education[${idx}]`, { institution: '', studyType: '', area: '', startDate: '', endDate: '' })}
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex gap-1 flex-wrap">
                                <span className="font-semibold text-gray-900">
                                  <EditableField 
                                    value={String(edu.studyType || '')} 
                                    onChange={(v) => updateField(`education[${idx}].studyType`, v)}
                                    path={`education[${idx}].studyType`}
                                    placeholder="Degree"
                                  />
                                </span>
                                {edu.area && <span className="text-gray-700">
                                  in <EditableField 
                                    value={String(edu.area)} 
                                    onChange={(v) => updateField(`education[${idx}].area`, v)}
                                    path={`education[${idx}].area`}
                                    placeholder="Field"
                                  />
                                </span>}
                              </div>
                              <div className="text-gray-600">
                                <EditableField 
                                  value={String(edu.institution || '')} 
                                  onChange={(v) => updateField(`education[${idx}].institution`, v)}
                                  path={`education[${idx}].institution`}
                                  placeholder="Institution Name"
                                />
                              </div>
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                              <EditableField 
                                value={String(edu.startDate || '')} 
                                onChange={(v) => updateField(`education[${idx}].startDate`, v)}
                                path={`education[${idx}].startDate`}
                                placeholder="2016"
                              />
                              <span>–</span>
                              <EditableField 
                                value={String(edu.endDate || '')} 
                                onChange={(v) => updateField(`education[${idx}].endDate`, v)}
                                path={`education[${idx}].endDate`}
                                placeholder="2020"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {skills.length > 0 && (
                    <div 
                      data-section-id="skills"
                      className={`mt-6 relative group overflow-visible rounded-md transition-all ${isEdit ? 'cursor-text' : ''} ${activeSection === 'skills' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${isHighlighted('skills') ? 'ring-2 ring-[#80FF00]/60 bg-[#80FF00]/5' : ''}`}
                      onClick={() => isEdit && onSectionClick && onSectionClick('skills')}
                    >
                      {isEdit && (
                        <SectionToolbar 
                          label="Skills" 
                          onAddEntry={() => addItem('skills[0]', { category: '', skills: [] })}
                        />
                      )}
                      <h2 
                        className={`text-sm font-bold uppercase tracking-wider border-b pb-1 mb-3 ${TYPOGRAPHY.sectionTitle}`}
                        style={{ color: primaryColor, borderColor: primaryColor + '40' }}
                      >
                        Skills
                      </h2>
                      <div className="space-y-2">
                        {skills.map((sg: any, idx: number) => (
                          <div key={idx} className="relative group/item pl-2">
                            {isEdit && (
                              <EntryToolbar
                                onDelete={() => removeItem(`skills[${idx}]`, idx)}
                                onAddBelow={() => addItem(`skills[${idx}]`, { category: '', skills: [] })}
                              />
                            )}
                            <span className="font-semibold text-gray-700">
                              <EditableField 
                                value={String(sg.category || '')} 
                                onChange={(v) => updateField(`skills[${idx}].category`, v)}
                                path={`skills[${idx}].category`}
                                placeholder="Category"
                              />
                            </span>
                            <span className="text-gray-600">
                              : <EditableField 
                                value={String((sg.skills || []).join(', '))} 
                                onChange={(v) => updateField(`skills[${idx}].skills`, v.split(',').map((s: string) => s.trim()).filter(Boolean))}
                                path={`skills[${idx}].skills`}
                                placeholder="Skill 1, Skill 2"
                              />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute bottom-3 right-4 text-[10px] text-gray-300">1</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-1 border-t border-gray-200/50 dark:border-gray-700/50 text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-1.5 font-medium min-w-[120px]">
          <button 
            onClick={() => setActivePageFormat(prev => prev === 'a4' ? 'letter' : 'a4')}
            className="hover:text-lime-500 transition-colors uppercase cursor-pointer"
          >
            {activePageFormat.toUpperCase()}
          </button>
          <span>• {pageWidth}x{pageHeight}px</span>
        </div>

        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 shadow-sm scale-90 origin-center">
          <button onClick={handleZoomOut} disabled={zoom <= ZOOM_LEVELS[0]} className="p-1 rounded-full hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 transition-all"><ZoomOut size={13} /></button>
          <span className="text-[10px] min-w-[35px] text-center font-bold px-1">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]} className="p-1 rounded-full hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 transition-all"><ZoomIn size={13} /></button>
          <button onClick={() => setZoom(1)} className="p-1 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-all"><Maximize2 size={13} /></button>
        </div>

        <div className="min-w-[120px] flex justify-end">
          <span className="opacity-50">Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};

export default CVCanvasEngine;