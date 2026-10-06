'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Copy, GripVertical } from 'lucide-react';
import { EmptyStateSkeleton } from '@/components/ui/EmptyStateSkeleton';
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
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import toast from '@/lib/hot-toast';

interface EducationSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  jobData?: any;
  userId?: string;
  annotations?: FixAnnotation[];
  onApplyAnnotation?: (fix: FixAnnotation) => void;
  onDismissAnnotation?: (fixId: string) => void;
  reviewMode?: boolean;
}

// Sortable education item component
function SortableEducationItem({
  education,
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
  education: any;
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onGenerateSuggestions: (index: number, educationItem: any) => void;
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
  } = useSortable({ id: `education-${index}` });

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
        <h4 className="text-lg font-semibold text-white">{education.studyType || 'Degree'} in {education.area || 'Field'} at {education.institution || 'University'}</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDuplicate(index)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
            title="Duplicate this education"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="Delete this education"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Institution</label>
          <input
            type="text"
            value={education.institution || ''}
            onChange={(e) => onUpdate(index, 'institution', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
            placeholder="University of California"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Field of Study</label>
          <input
            type="text"
            value={education.area || ''}
            onChange={(e) => onUpdate(index, 'area', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
            placeholder="Computer Science"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-4 mt-4">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Degree Type</label>
          <input
            type="text"
            value={education.studyType || ''}
            onChange={(e) => onUpdate(index, 'studyType', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
            placeholder="Bachelor's Degree"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
          <input
            type="month"
            value={education.startDate || ''}
            onChange={(e) => onUpdate(index, 'startDate', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
            placeholder="YYYY-MM"
          />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
          <input
            type="month"
            value={education.endDate || ''}
            onChange={(e) => onUpdate(index, 'endDate', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
            placeholder="YYYY-MM"
          />
        </div>
      </div>

      {/* Description Field */}
      <div className="mt-4 flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-white/80 text-sm font-medium">Description</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-white/70 text-sm" title="Show description as bullet points in the final resume">
                <input
                  type="checkbox"
                  checked={!!education.showBullets}
                  onChange={(e) => onUpdate(index, 'showBullets', e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-[#013f2e] focus:ring-[#013f2e]/50"
                />
                Show as bullet points
              </label>
            </div>
          </div>
          <WYSIWYGEditor
            value={education.description || ''}
            onChange={(value) => onUpdate(index, 'description', value)}
            rows={3}
            placeholder="Describe your education, achievements, relevant coursework, or academic honors..."
            hasAnnotation={reviewMode && annotations.some((ann) => ann.fieldPath === `education[${index}].description` && ann.status === 'open')}
            reviewMode={reviewMode}
            showToolbar={true}
            showAIButton={true}
            fieldType="other"
            onAIGenerate={() => onGenerateSuggestions(index, education)}
            isGenerating={loadingSuggestions}
          />
        </div>
        {showSuggestions && (
          <div className="w-80 flex-shrink-0">
            <AISuggestionsPanel
              isVisible={showSuggestions}
              suggestions={suggestions}
              isLoading={loadingSuggestions}
              onSelect={(content) => onSelectSuggestion(index, content)}
              onClose={() => onCloseSuggestions(index)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const EducationSection: React.FC<EducationSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove,
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
  console.log('🔍 EducationSection - data:', data);

  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const updateEducationItem = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const duplicateEducation = (index: number) => {
    const educationToDuplicate = safeData[index];
    if (educationToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(educationToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
  };

  const generateAIDescription = async (index: number, educationItem: any) => {
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
          educationItem,
          type: 'education'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const result = await response.json();
      updateEducationItem(index, 'description', result.description);
    } catch (error) {
      console.error('Error generating AI description:', error);
      toast.error("Couldn't generate an AI description. Try again.");
    } finally {
      setGeneratingIndex(null);
    }
  };

  const generateAISuggestions = async (index: number, educationItem: any) => {
    if (!userId) {
      console.error('❌ EducationSection - No userId provided for AI suggestions');
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
          sectionData: educationItem,
          sectionType: 'education',
          currentText: educationItem.description || '',
          cvData: {}
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate suggestions: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ EducationSection - AI suggestions received:', result);

      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setSuggestions(prev => ({ ...prev, [index]: result.suggestions }));
      } else {
        console.error('❌ EducationSection - Invalid suggestions format:', result);
        setShowSuggestions(prev => ({ ...prev, [index]: false }));
      }
    } catch (error) {
      console.error('❌ EducationSection - Error generating AI suggestions:', error);
      setShowSuggestions(prev => ({ ...prev, [index]: false }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSelectSuggestion = (index: number, content: string) => {
    updateEducationItem(index, 'description', content);
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
  };

  const removeEducation = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate(updatedData);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = safeData.findIndex((_, i) => `education-${i}` === active.id);
      const newIndex = safeData.findIndex((_, i) => `education-${i}` === over.id);

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
          items={safeData.map((_, index) => `education-${index}`)}
          strategy={verticalListSortingStrategy}
        >
          {safeData.length === 0 ? (
          <EmptyStateSkeleton onAdd={() => {
          const newEducation = {
            institution: '',
            area: '',
            studyType: '',
            startDate: '',
            endDate: '',
            score: '',
            description: ''
          };
          onUpdate([...safeData, newEducation]);
        }} itemName="Education" />
        ) : safeData.map((education, index) => (
            <SortableEducationItem
              key={`education-${index}`}
              education={education}
              index={index}
              onUpdate={updateEducationItem}
              onRemove={removeEducation}
              onDuplicate={duplicateEducation}
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
      {safeData.length > 0 && (
      <button
        onClick={() => {
          const newEducation = {
            institution: '',
            area: '',
            studyType: '',
            startDate: '',
            endDate: '',
            score: '',
            description: ''
          };
          onUpdate([...safeData, newEducation]);
        }}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#013f2e]/50 text-white/50 hover:text-[#013f2e] rounded-none transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Education
      </button>
      )}
    </>
  );
};

export default EducationSection;