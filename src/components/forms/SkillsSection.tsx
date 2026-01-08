'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SkillsSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
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
    <div ref={setNodeRef} style={style} className={`bg-white/5 rounded-xl p-6 pl-10 border border-white/10 mb-6 relative ${isDragging ? 'shadow-2xl' : ''}`}>
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
          <input type="text" value={skill.category || skill.name || ''} onChange={(e) => onUpdate(index, 'category', e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors" placeholder="Programming Languages" />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Skills</label>
          <input type="text" value={skillInput} onChange={(e) => onSkillInputChange(index, e.target.value)} onBlur={(e) => { const arr = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0); onUpdate(index, 'skills', arr); }} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors" placeholder="JavaScript, Python, Java, React" />
          <p className="text-white/50 text-xs mt-1">Separate multiple skills with commas</p>
        </div>
      </div>
    </div>
  );
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ data, onUpdate, onAdd, onRemove }) => {
  const safeData = Array.isArray(data) ? data : [];
  const [skillInputs, setSkillInputs] = useState<Record<number, string>>({});

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

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

  return (
    <>
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
      <button onClick={() => onUpdate([...safeData, { category: '', skills: [] }])} className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/50 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2">
        <Plus size={20} /> Add Skill Category
      </button>
    </>
  );
};

export default SkillsSection;