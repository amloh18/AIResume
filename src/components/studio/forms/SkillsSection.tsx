'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface SkillsSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  // Debug logging to understand data structure
  console.log('🔍 SkillsSection - data:', data);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  // Update skill item - use functional updates to avoid stale state
  const updateSkill = (index: number, field: string, value: any) => {
    onUpdate('skills', (prevSkills) => {
      const newArray = [...(prevSkills || [])];
      if (!newArray[index]) {
        newArray[index] = {};
      }
      newArray[index] = { ...newArray[index], [field]: value };
      return newArray;
    });
  };

  return (
    <>
      {safeData.map((skill, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{skill.category || skill.name || 'Skill Category'}</h4>
            <button
              onClick={() => {
                onUpdate('skills', (prevSkills) => {
                  return (prevSkills || []).filter((_, i) => i !== index);
                });
              }}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Category</label>
              <input
                type="text"
                value={skill.category || skill.name || ''}
                onChange={(e) => updateSkill(index, 'category', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Programming Languages"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Skills</label>
              <input
                type="text"
                value={Array.isArray(skill.skills) ? skill.skills.join(', ') : (skill.keywords || []).join(', ')}
                onChange={(e) => {
                  const skillsArray = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                  updateSkill(index, 'skills', skillsArray);
                }}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="JavaScript, Python, Java, React"
              />
              <p className="text-white/50 text-xs mt-1">Separate multiple skills with commas</p>
            </div>
          </div>
        </div>
      ))}
      
      <button
        onClick={onAdd}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Skill Category
      </button>
    </>
  );
};

export default SkillsSection;