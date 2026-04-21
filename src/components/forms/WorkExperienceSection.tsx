'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Copy, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '@/components/ai/AISuggestionsPanel';
import InlineSuggestion from '@/components/resume-enhancer/annotations/InlineSuggestion';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';

interface WorkExperienceSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  jobData?: any;
  userId?: string;
  annotations?: FixAnnotation[];
  onApplyAnnotation?: (fix: FixAnnotation) => void;
  onDismissAnnotation?: (fixId: string) => void;
  reviewMode?: boolean;
}

// Sortable work item component
function SortableWorkItem({
  work,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
  onGenerateSuggestions,
  showSuggestions,
  suggestions,
  loadingSuggestions,
  onSelectSuggestion,
  onCloseSuggestions,
  annotations,
  onApplyAnnotation,
  onDismissAnnotation,
  reviewMode,
}: {
  work: any;
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onGenerateSuggestions: (index: number, workItem: any) => void;
  showSuggestions: boolean;
  suggestions: Array<{ method: string; content: string }>;
  loadingSuggestions: boolean;
  onSelectSuggestion: (index: number, content: string) => void;
  onCloseSuggestions: (index: number) => void;
  annotations: FixAnnotation[];
  onApplyAnnotation?: (fix: FixAnnotation) => void;
  onDismissAnnotation?: (fixId: string) => void;
  reviewMode: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `work-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white/5 rounded-none p-6 pl-10 border border-white/10 mb-6 relative ${isDragging ? 'shadow-2xl' : ''}`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-4 left-2 p-1 cursor-grab active:cursor-grabbing text-white/40 hover:text-white/70 transition-colors touch-none"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>

      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-white">{work.position || 'Job Title'} at {work.name || 'Company'}</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDuplicate(index)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
            title="Duplicate this work experience"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="Delete this work experience"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Job Title</label>
          <input
            type="text"
            value={work.position || ''}
            onChange={(e) => onUpdate(index, 'position', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
            placeholder="Senior Product Manager"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Company Name</label>
          <input
            type="text"
            value={work.name || ''}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
            placeholder="Tech Corp"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
          <input
            type="month"
            value={work.startDate || ''}
            onChange={(e) => onUpdate(index, 'startDate', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
            placeholder="YYYY-MM"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
          <input
            type="month"
            value={work.endDate || ''}
            onChange={(e) => onUpdate(index, 'endDate', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
            placeholder="YYYY-MM"
          />
        </div>
      </div>

      {/* Work Summary */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-white/80 text-sm font-medium">Work Summary</label>
          <WYSIWYGToolbar
            showAIButton={true}
            fieldType="experience"
            onAISuggestions={() => onGenerateSuggestions(index, work)}
            isGenerating={loadingSuggestions}
          />
        </div>
        <AISuggestionsPanel
          isVisible={showSuggestions}
          suggestions={suggestions}
          isLoading={loadingSuggestions}
          onSelect={(content) => onSelectSuggestion(index, content)}
          onClose={() => onCloseSuggestions(index)}
        />
        <WYSIWYGEditor
          key={`work-summary-${index}`}
          value={work?.summary || ''}
          onChange={(value) => onUpdate(index, 'summary', value)}
          rows={4}
          placeholder="Describe your key responsibilities and achievements..."
          hasAnnotation={reviewMode && annotations.some((ann) => ann.fieldPath === `work[${index}].summary` && ann.status === 'open')}
        />
        {/* Inline suggestions */}
        {reviewMode && annotations
          .filter((ann) => ann.fieldPath === `work[${index}].summary` && ann.status === 'open')
          .map((fix) => (
            <InlineSuggestion
              key={fix.id}
              fix={fix}
              onApply={onApplyAnnotation || (() => { })}
              onDismiss={onDismissAnnotation || (() => { })}
            />
          ))}
      </div>
    </div>
  );
}

const WorkExperienceSection: React.FC<WorkExperienceSectionProps> = ({
  data,
  onUpdate,
  jobData,
  userId,
  annotations = [],
  onApplyAnnotation,
  onDismissAnnotation,
  reviewMode = false
}) => {
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [suggestions, setSuggestions] = useState<{ [key: number]: Array<{ method: string; content: string }> }>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Debug logging to understand data structure
  console.log('🔍 WorkExperienceSection - received data:', data);
  console.log('🔍 WorkExperienceSection - data type:', typeof data);
  console.log('🔍 WorkExperienceSection - is array:', Array.isArray(data));
  console.log('🔍 WorkExperienceSection - data length:', data?.length);
  console.log('🔍 WorkExperienceSection - first item:', data?.[0]);
  if (data && Array.isArray(data) && data.length > 0) {
    data.forEach((work, idx) => {
      console.log(`🔍 WorkExperienceSection - work[${idx}].summary:`, work?.summary);
      console.log(`🔍 WorkExperienceSection - work[${idx}].summary type:`, typeof work?.summary);
      console.log(`🔍 WorkExperienceSection - work[${idx}].summary length:`, work?.summary?.length);
    });
  }

  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];
  console.log('🔍 WorkExperienceSection - safeData length:', safeData.length);

  const updateWorkItem = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const addWorkItem = () => {
    const newWorkItem = {
      position: '',
      name: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: [] // Deprecated, kept empty for schema compatibility
    };
    onUpdate([...safeData, newWorkItem]);
  };

  const removeWorkItem = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate(updatedData);
  };

  const duplicateWorkItem = (index: number) => {
    const workToDuplicate = safeData[index];
    if (workToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(workToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
  };

  const generateAIDescription = async (index: number, workItem: any) => {
    if (!userId) return;

    setGeneratingIndex(index);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobData,
          workItem,
          type: 'work_experience'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const result = await response.json();
      updateWorkItem(index, 'summary', result.description);
    } catch (error) {
      console.error('Error generating AI description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  const generateAISuggestions = async (index: number, workItem: any) => {
    if (!userId) {
      console.error('❌ WorkExperienceSection - No userId provided for AI suggestions');
      return;
    }

    // Show panel immediately and set loading state using functional updates
    setShowSuggestions(prev => ({ ...prev, [index]: true }));
    setLoadingSuggestions(prev => ({ ...prev, [index]: true }));

    try {
      const response = await fetch('/api/ai/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobData,
          sectionData: workItem,
          sectionType: 'work_experience',
          currentText: workItem.summary || '',
          cvData: {} // Can be passed from parent if needed
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate suggestions: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ WorkExperienceSection - AI suggestions received:', result);

      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setSuggestions(prev => ({ ...prev, [index]: result.suggestions }));
      } else {
        console.error('❌ WorkExperienceSection - Invalid suggestions format:', result);
        setShowSuggestions(prev => ({ ...prev, [index]: false }));
      }
    } catch (error) {
      console.error('❌ WorkExperienceSection - Error generating AI suggestions:', error);
      setShowSuggestions(prev => ({ ...prev, [index]: false }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSelectSuggestion = (index: number, content: string) => {
    updateWorkItem(index, 'summary', content);
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
  };


  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = safeData.findIndex((_, i) => `work-${i}` === active.id);
      const newIndex = safeData.findIndex((_, i) => `work-${i}` === over.id);

      const newData = arrayMove(safeData, oldIndex, newIndex);
      onUpdate(newData);
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={safeData.map((_, index) => `work-${index}`)}
          strategy={verticalListSortingStrategy}
        >
          {safeData.map((work, index) => (
            <SortableWorkItem
              key={`work-${index}`}
              work={work}
              index={index}
              onUpdate={updateWorkItem}
              onRemove={removeWorkItem}
              onDuplicate={duplicateWorkItem}
              onGenerateSuggestions={generateAISuggestions}
              showSuggestions={showSuggestions[index] || false}
              suggestions={suggestions[index] || []}
              loadingSuggestions={loadingSuggestions[index] || false}
              onSelectSuggestion={handleSelectSuggestion}
              onCloseSuggestions={(idx) => setShowSuggestions({ ...showSuggestions, [idx]: false })}
              annotations={annotations}
              onApplyAnnotation={onApplyAnnotation}
              onDismissAnnotation={onDismissAnnotation}
              reviewMode={reviewMode}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={addWorkItem}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/50 hover:text-[#80FF00] rounded-none transition-all flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Work Experience
      </button>
    </>
  );
};

export default WorkExperienceSection;