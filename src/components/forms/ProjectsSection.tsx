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

interface ProjectsSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  jobData?: any;
  userId?: string;
}

// Sortable project item component
function SortableProjectItem({
  project,
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
}: {
  project: any;
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onGenerateSuggestions: (index: number, item: any) => void;
  showSuggestions: boolean;
  suggestions: Array<{ method: string; content: string }>;
  loadingSuggestions: boolean;
  onSelectSuggestion: (index: number, content: string) => void;
  onCloseSuggestions: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `project-${index}` });

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
      className={`bg-white/5 rounded-xl p-6 pl-10 border border-white/10 mb-6 relative ${isDragging ? 'shadow-2xl' : ''}`}
    >
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
        <h4 className="text-lg font-semibold text-[color:var(--text-primary)]">{project.name || 'Project Name'}</h4>
        <div className="flex items-center gap-2">
          <button onClick={() => onDuplicate(index)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Duplicate">
            <Copy size={16} />
          </button>
          <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-300 transition-colors" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Project Name</label>
          <input type="text" value={project.name || ''} onChange={(e) => onUpdate(index, 'name', e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors" placeholder="E-commerce Platform" />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Project URL</label>
          <input type="url" value={project.url || ''} onChange={(e) => onUpdate(index, 'url', e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors" placeholder="https://github.com/username/project" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-white/80 text-sm font-medium">Description</label>
          <WYSIWYGToolbar showAIButton={true} fieldType="other" onAISuggestions={() => onGenerateSuggestions(index, project)} isGenerating={loadingSuggestions} />
        </div>
        <AISuggestionsPanel isVisible={showSuggestions} suggestions={suggestions} isLoading={loadingSuggestions} onSelect={(content) => onSelectSuggestion(index, content)} onClose={() => onCloseSuggestions(index)} />
        <WYSIWYGEditor value={project.description || ''} onChange={(value) => onUpdate(index, 'description', value)} rows={3} placeholder="Describe the project and your role..." />
      </div>
    </div>
  );
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove,
  jobData,
  userId
}) => {
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [suggestions, setSuggestions] = useState<{ [key: number]: Array<{ method: string; content: string }> }>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Debug logging to understand data structure
  console.log('🔍 ProjectsSection - data:', data);

  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  // Update project item - use direct array updates
  const updateProject = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    if (!updatedData[index]) {
      updatedData[index] = { name: '', startDate: '', endDate: '', description: '', highlights: [], keywords: [], url: '' };
    }
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const duplicateProject = (index: number) => {
    const projectToDuplicate = safeData[index];
    if (projectToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(projectToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
  };

  const generateAIDescription = async (index: number, projectItem: any) => {
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
          projectItem,
          type: 'project'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const result = await response.json();
      updateProject(index, 'description', result.description);
    } catch (error) {
      console.error('Error generating AI description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  const generateAISuggestions = async (index: number, projectItem: any) => {
    if (!userId) {
      console.error('❌ ProjectsSection - No userId provided for AI suggestions');
      return;
    }

    // Show panel immediately and set loading state
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
          sectionData: projectItem,
          sectionType: 'project',
          currentText: projectItem.description || '',
          cvData: {}
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate suggestions: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ ProjectsSection - AI suggestions received:', result);

      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setSuggestions(prev => ({ ...prev, [index]: result.suggestions }));
      } else {
        console.error('❌ ProjectsSection - Invalid suggestions format:', result);
        setShowSuggestions(prev => ({ ...prev, [index]: false }));
      }
    } catch (error) {
      console.error('❌ ProjectsSection - Error generating AI suggestions:', error);
      setShowSuggestions(prev => ({ ...prev, [index]: false }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSelectSuggestion = (index: number, content: string) => {
    updateProject(index, 'description', content);
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
  };

  const removeProject = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate(updatedData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = safeData.findIndex((_, i) => `project-${i}` === active.id);
      const newIndex = safeData.findIndex((_, i) => `project-${i}` === over.id);
      const newData = arrayMove(safeData, oldIndex, newIndex);
      onUpdate(newData);
    }
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={safeData.map((_, index) => `project-${index}`)} strategy={verticalListSortingStrategy}>
          {safeData.map((project, index) => (
            <SortableProjectItem
              key={`project-${index}`}
              project={project}
              index={index}
              onUpdate={updateProject}
              onRemove={removeProject}
              onDuplicate={duplicateProject}
              onGenerateSuggestions={generateAISuggestions}
              showSuggestions={showSuggestions[index] || false}
              suggestions={suggestions[index] || []}
              loadingSuggestions={loadingSuggestions[index] || false}
              onSelectSuggestion={handleSelectSuggestion}
              onCloseSuggestions={(idx) => setShowSuggestions({ ...showSuggestions, [idx]: false })}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={() => {
          const newProject = { name: '', description: '', startDate: '', endDate: '', keywords: [], url: '' };
          onUpdate([...safeData, newProject]);
        }}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/50 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Project
      </button>
    </>
  );
};

export default ProjectsSection;