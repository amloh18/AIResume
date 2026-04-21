'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, GripVertical, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { mergeSuggestedSkills, SkillCategorySuggestion } from '@/lib/utils/skills-suggestions';

interface SkillsSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  cvId?: string;
  cvData?: any;
  jobData?: any;
  role?: string;
}

// Sortable skill item component
function SortableSkillItem({ skill, index, onUpdate, onRemove, onDuplicate, skillInput, onSkillInputChange }: {
  skill: any; index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  skillInput: string;
  onSkillInputChange: (index: number, value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `skill-${index}` });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' };

  return (
    <div ref={setNodeRef} style={style} className={`bg-white/5 rounded-none p-6 pl-10 border border-white/10 mb-6 relative ${isDragging ? 'shadow-2xl' : ''}`}>
      <button type="button" {...attributes} {...listeners} className="absolute top-4 left-2 p-1 cursor-grab active:cursor-grabbing text-white/40 hover:text-white/70 transition-colors touch-none" aria-label="Drag to reorder" title="Drag to reorder">
        <GripVertical size={16} />
      </button>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-white">{skill.category || skill.name || 'Skill Category'}</h4>
        <div className="flex items-center gap-2">
          <button onClick={() => onDuplicate(index)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Duplicate"><Copy size={16} /></button>
          <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-300 transition-colors" title="Delete"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Category</label>
          <input type="text" value={skill.category || skill.name || ''} onChange={(e) => onUpdate(index, 'category', e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors" placeholder="Programming Languages" />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Skills</label>
          <input type="text" value={skillInput} onChange={(e) => onSkillInputChange(index, e.target.value)} onBlur={(e) => { const arr = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0); onUpdate(index, 'skills', arr); }} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors" placeholder="JavaScript, Python, Java, React" />
          <p className="text-white/50 text-xs mt-1">Separate multiple skills with commas</p>
        </div>
      </div>
    </div>
  );
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ data, onUpdate, onAdd, onRemove, cvId, cvData, jobData, role }) => {
  const safeData = Array.isArray(data) ? data : [];
  const [skillInputs, setSkillInputs] = useState<Record<number, string>>({});
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'skills' | 'analysis'>('skills');
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [suggestedCategories, setSuggestedCategories] = useState<Array<{ category: string; skills: string[] }>>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const keySep = '\u001f';
  const resolvedRole = useMemo(() => {
    return (
      (typeof role === 'string' && role.trim()) ||
      jobData?.title ||
      jobData?.jobTitle ||
      'General'
    );
  }, [role, jobData]);

  // Initialize skill inputs from data when data changes externally
  useEffect(() => {
    const inputs: Record<number, string> = {};
    safeData.forEach((skill, index) => {
      // Only initialize if we don't already have a value for this index
      // This prevents overwriting user input while they're typing
      if (skillInputs[index] === undefined) {
        if (Array.isArray(skill.skills)) {
          inputs[index] = skill.skills.join(', ');
        } else if (Array.isArray(skill.keywords)) {
          inputs[index] = skill.keywords.join(', ');
        } else {
          inputs[index] = '';
        }
      }
    });
    // Only update if we have new inputs to set
    if (Object.keys(inputs).length > 0) {
      setSkillInputs(prev => ({ ...prev, ...inputs }));
    }
  }, [safeData.length, safeData]); // Reinitialize when data structure changes

  const updateSkill = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    if (!updatedData[index]) updatedData[index] = { category: '', skills: [] };
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const duplicateSkill = (index: number) => {
    const skillToDuplicate = safeData[index];
    if (skillToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(skillToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
  };

  const removeSkill = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate(updatedData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = safeData.findIndex((_, i) => `skill-${i}` === active.id);
      const newIndex = safeData.findIndex((_, i) => `skill-${i}` === over.id);
      onUpdate(arrayMove(safeData, oldIndex, newIndex));
    }
  };

  const getSkillInput = (index: number, skill: any) => {
    if (skillInputs[index] !== undefined) return skillInputs[index];
    if (Array.isArray(skill.skills)) return skill.skills.join(', ');
    if (Array.isArray(skill.keywords)) return skill.keywords.join(', ');
    return '';
  };

  const getItemKey = (category: string, skill: string) => `${category}${keySep}${skill}`;

  const fetchSuggestions = async () => {
    if (!cvId) return;
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const jobId = jobData?.id || jobData?._id || jobData?.jobId;
      const res = await fetch('/api/ai/skills-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvId,
          jobId,
          role: resolvedRole
        })
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load suggestions');
      }
      const categories = Array.isArray(json?.data?.categories) ? json.data.categories : [];
      setSuggestedCategories(categories);
      setSelected({});
    } catch (e: any) {
      setSuggestedCategories([]);
      setSelected({});
      setSuggestionsError(e?.message || 'Failed to load suggestions');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    if (!cvData) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/ai/comprehensive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData,
          jobData: jobData
            ? jobData
            : { title: resolvedRole }
        })
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load analysis');
      }
      setAnalysisData(json?.data || json);
    } catch (e: any) {
      setAnalysisData(null);
      setAnalysisError(e?.message || 'Failed to load analysis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const openSuggestions = async () => {
    if (!cvId) return;
    setIsSuggestionsOpen(true);
    setActivePanel('skills');
    await Promise.all([fetchSuggestions(), fetchAnalysis()]);
  };

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const toggleSkill = (category: string, skill: string) => {
    const key = getItemKey(category, skill);
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategory = (category: string, skills: string[]) => {
    const keys = skills.map(s => getItemKey(category, s));
    const allSelected = keys.every(k => selected[k]);
    setSelected(prev => {
      const next = { ...prev };
      keys.forEach(k => {
        next[k] = !allSelected;
      });
      return next;
    });
  };

  const toggleAll = () => {
    const keys = suggestedCategories.flatMap(c => c.skills.map(s => getItemKey(c.category, s)));
    const allSelected = keys.length > 0 && keys.every(k => selected[k]);
    setSelected(prev => {
      const next = { ...prev };
      keys.forEach(k => {
        next[k] = !allSelected;
      });
      return next;
    });
  };

  const applySelected = () => {
    if (selectedCount === 0) return;
    const grouped = new Map<string, string[]>();
    for (const [key, isOn] of Object.entries(selected)) {
      if (!isOn) continue;
      const [category, skill] = key.split(keySep);
      if (!category || !skill) continue;
      const prev = grouped.get(category) || [];
      grouped.set(category, [...prev, skill]);
    }
    const selectedGroups: SkillCategorySuggestion[] = Array.from(grouped.entries()).map(([category, skills]) => ({
      category,
      skills
    }));
    const merged = mergeSuggestedSkills(safeData, selectedGroups);
    onUpdate(merged);
    setIsSuggestionsOpen(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-white/80 text-sm font-medium">Skills</div>
        <button
          type="button"
          onClick={openSuggestions}
          disabled={!cvId}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={16} />
          Suggest Skills
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={safeData.map((_, i) => `skill-${i}`)} strategy={verticalListSortingStrategy}>
          {safeData.map((skill, index) => (
            <SortableSkillItem
              key={`skill-${index}`}
              skill={skill}
              index={index}
              onUpdate={updateSkill}
              onRemove={removeSkill}
              onDuplicate={duplicateSkill}
              skillInput={getSkillInput(index, skill)}
              onSkillInputChange={(idx: number, val: string) => setSkillInputs(prev => ({ ...prev, [idx]: val }))}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button onClick={() => onUpdate([...safeData, { category: '', skills: [] }])} className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/50 hover:text-[#80FF00] rounded-none transition-colors flex items-center justify-center gap-2">
        <Plus size={20} /> Add Skill Category
      </button>

      {isSuggestionsOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsSuggestionsOpen(false)} />
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-none bg-[#0b100c] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">AI Suggestions</div>
                <div className="text-white/50 text-xs truncate">Role: {resolvedRole}</div>
              </div>
              <button type="button" onClick={() => setIsSuggestionsOpen(false)} className="p-2 rounded-none bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 px-6 py-3 border-b border-white/10">
              <button
                type="button"
                onClick={() => setActivePanel('skills')}
                className={`px-4 py-2 rounded-none text-sm font-medium transition-colors ${activePanel === 'skills' ? 'bg-[#80FF00] text-black' : 'bg-white/5 text-white/70 hover:text-white'}`}
              >
                Skills
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('analysis')}
                className={`px-4 py-2 rounded-none text-sm font-medium transition-colors ${activePanel === 'analysis' ? 'bg-[#80FF00] text-black' : 'bg-white/5 text-white/70 hover:text-white'}`}
              >
                Perfect Score
              </button>
              <div className="ml-auto flex items-center gap-2">
                {activePanel === 'skills' && (
                  <>
                    <button
                      type="button"
                      onClick={toggleAll}
                      disabled={suggestedCategories.length === 0}
                      className="px-4 py-2 rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={applySelected}
                      disabled={selectedCount === 0}
                      className="px-4 py-2 rounded-none bg-[#80FF00] hover:bg-[#70e600] text-black font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Selected {selectedCount > 0 ? `(${selectedCount})` : ''}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              {activePanel === 'skills' && (
                <>
                  {suggestionsLoading && (
                    <div className="flex items-center justify-center py-10 text-white/70">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading suggestions...
                    </div>
                  )}
                  {!suggestionsLoading && suggestionsError && (
                    <div className="p-4 rounded-none bg-red-500/10 border border-red-500/20 text-red-200">
                      {suggestionsError}
                    </div>
                  )}
                  {!suggestionsLoading && !suggestionsError && suggestedCategories.length === 0 && (
                    <div className="p-4 rounded-none bg-white/5 border border-white/10 text-white/70">
                      No suggestions available for this role.
                    </div>
                  )}
                  {!suggestionsLoading && !suggestionsError && suggestedCategories.length > 0 && (
                    <div className="space-y-5">
                      {suggestedCategories.map((cat) => {
                        const keys = cat.skills.map(s => getItemKey(cat.category, s));
                        const allOn = keys.length > 0 && keys.every(k => selected[k]);
                        return (
                          <div key={cat.category} className="rounded-none border border-white/10 bg-white/5 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                              <div className="text-white font-semibold">{cat.category}</div>
                              <button
                                type="button"
                                onClick={() => toggleCategory(cat.category, cat.skills)}
                                className="px-3 py-1.5 rounded-none bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-xs"
                              >
                                {allOn ? 'Unselect' : 'Select'} all
                              </button>
                            </div>
                            <div className="p-4 flex flex-wrap gap-2">
                              {cat.skills.map((skill) => {
                                const k = getItemKey(cat.category, skill);
                                const on = !!selected[k];
                                return (
                                  <button
                                    key={k}
                                    type="button"
                                    onClick={() => toggleSkill(cat.category, skill)}
                                    className={`px-3 py-2 rounded-none border text-sm transition-colors ${on ? 'bg-[#80FF00]/20 border-[#80FF00]/50 text-white' : 'bg-black/10 border-white/10 text-white/70 hover:text-white hover:border-white/20'}`}
                                  >
                                    {skill}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activePanel === 'analysis' && (
                <>
                  {analysisLoading && (
                    <div className="flex items-center justify-center py-10 text-white/70">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading analysis...
                    </div>
                  )}
                  {!analysisLoading && analysisError && (
                    <div className="p-4 rounded-none bg-red-500/10 border border-red-500/20 text-red-200">
                      {analysisError}
                    </div>
                  )}
                  {!analysisLoading && !analysisError && !analysisData && (
                    <div className="p-4 rounded-none bg-white/5 border border-white/10 text-white/70">
                      No analysis available.
                    </div>
                  )}
                  {!analysisLoading && !analysisError && analysisData && (
                    <div className="space-y-5">
                      <div className="rounded-none border border-white/10 bg-white/5 p-4">
                        <div className="text-white font-semibold mb-2">Experience Improvements</div>
                        <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                          {(analysisData?.QuantificationAssistant?.recommendations || []).slice(0, 6).map((s: string, i: number) => (
                            <li key={`q-${i}`}>{s}</li>
                          ))}
                          {(analysisData?.AchievementGenerator?.impactStatements || []).slice(0, 4).map((s: string, i: number) => (
                            <li key={`a-${i}`}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-none border border-white/10 bg-white/5 p-4">
                        <div className="text-white font-semibold mb-2">Gaps</div>
                        <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                          {(analysisData?.GapAnalyzer?.skillGaps || []).slice(0, 6).map((s: string, i: number) => (
                            <li key={`sg-${i}`}>{s}</li>
                          ))}
                          {(analysisData?.GapAnalyzer?.experienceGaps || []).slice(0, 4).map((s: string, i: number) => (
                            <li key={`eg-${i}`}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-none border border-white/10 bg-white/5 p-4">
                        <div className="text-white font-semibold mb-2">Grammar & Clarity</div>
                        <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                          {(analysisData?.ContentOptimizer?.improvements || []).slice(0, 6).map((s: string, i: number) => (
                            <li key={`ci-${i}`}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-none border border-white/10 bg-white/5 p-4">
                        <div className="text-white font-semibold mb-2">ATS & Keywords</div>
                        <div className="text-white/70 text-sm">
                          Score: {analysisData?.ATSScoreAndKeywords?.score ?? '—'} / 100
                        </div>
                        <div className="mt-2 text-white/60 text-sm">
                          Missing keywords: {(analysisData?.ATSScoreAndKeywords?.missingKeywords || []).slice(0, 12).join(', ') || '—'}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SkillsSection;
