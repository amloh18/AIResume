'use client';

import React from 'react';
import { Plus, Trash2, Copy, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LanguagesSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

// Sortable language item
function SortableLanguageItem({ language, index, onUpdate, onRemove, onDuplicate }: {
  language: any; index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `lang-${index}` });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' };

  return (
    <div ref={setNodeRef} style={style} className={`bg-white/5 rounded-none p-6 pl-10 border border-white/10 mb-6 relative ${isDragging ? 'shadow-2xl' : ''}`}>
      <button type="button" {...attributes} {...listeners} className="absolute top-4 left-2 p-1 cursor-grab active:cursor-grabbing text-white/40 hover:text-white/70 transition-colors touch-none" aria-label="Drag to reorder" title="Drag to reorder">
        <GripVertical size={16} />
      </button>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-[color:var(--text-primary)]">{language.language || 'Language'}</h4>
        <div className="flex items-center gap-2">
          <button onClick={() => onDuplicate(index)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Duplicate"><Copy size={16} /></button>
          <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-300 transition-colors" title="Delete"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Language Name</label>
          <input type="text" value={language.language || ''} onChange={(e) => onUpdate(index, 'language', e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors" placeholder="English" />
        </div>
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Fluency Level</label>
          <select value={language.fluency || ''} onChange={(e) => onUpdate(index, 'fluency', e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors">
            <option value="">Select fluency level</option>
            <option value="Native">Native</option>
            <option value="Fluent">Fluent</option>
            <option value="Advanced">Advanced</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Basic">Basic</option>
            <option value="Beginner">Beginner</option>
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-white/80 text-sm font-medium mb-2">Intensity ({language.level || 3}/5)</label>
        <input
          type="range"
          min={1}
          max={5}
          value={language.level || 3}
          onChange={(e) => onUpdate(index, 'level', Number(e.target.value))}
          className="w-full accent-[#80FF00]"
        />
      </div>
    </div>
  );
}

const LanguagesSection: React.FC<LanguagesSectionProps> = ({ data, onUpdate, onAdd, onRemove }) => {
  const safeData = Array.isArray(data) ? data : [];
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const updateLanguage = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    if (!updatedData[index]) updatedData[index] = { language: '', fluency: '', level: 3 };
    const next = { ...updatedData[index], [field]: value };
    if (field === 'fluency') {
      const map: Record<string, number> = { Native: 5, Fluent: 4, Advanced: 4, Intermediate: 3, Basic: 2, Beginner: 1 };
      next.level = map[value] || 3;
    }
    if (field === 'level') {
      const labels = ['', 'Beginner', 'Basic', 'Intermediate', 'Fluent', 'Native'];
      next.fluency = labels[Number(value)] || next.fluency;
    }
    updatedData[index] = next;
    onUpdate(updatedData);
  };

  const duplicateLanguage = (index: number) => {
    const langToDuplicate = safeData[index];
    if (langToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(langToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
  };

  const removeLanguage = (index: number) => {
    onUpdate(safeData.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = safeData.findIndex((_, i) => `lang-${i}` === active.id);
      const newIdx = safeData.findIndex((_, i) => `lang-${i}` === over.id);
      onUpdate(arrayMove(safeData, oldIdx, newIdx));
    }
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={safeData.map((_, i) => `lang-${i}`)} strategy={verticalListSortingStrategy}>
          {safeData.map((language, index) => (
            <SortableLanguageItem key={`lang-${index}`} language={language} index={index} onUpdate={updateLanguage} onRemove={removeLanguage} onDuplicate={duplicateLanguage} />
          ))}
        </SortableContext>
      </DndContext>
      <button onClick={() => onUpdate([...safeData, { language: '', fluency: '', level: 3 }])} className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/50 hover:text-[#80FF00] rounded-none transition-colors flex items-center justify-center gap-2">
        <Plus size={20} /> Add Language
      </button>
    </>
  );
};

export default LanguagesSection;