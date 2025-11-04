'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';

interface SkillsSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
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
  
  // Local state to track input strings for each skill (allows typing commas freely)
  const [skillInputs, setSkillInputs] = useState<Record<number, string>>({});
  
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
    if (!updatedData[index]) {
      updatedData[index] = { category: '', skills: [] };
    }
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

  return (
    <>
      {safeData.map((skill, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{skill.category || skill.name || 'Skill Category'}</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicateSkill(index)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Duplicate this skill"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => {
                  const updatedData = safeData.filter((_, i) => i !== index);
                  onUpdate(updatedData);
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete this skill"
              >
                <Trash2 size={16} />
              </button>
            </div>
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
                value={skillInputs[index] !== undefined ? skillInputs[index] : (Array.isArray(skill.skills) ? skill.skills.join(', ') : (skill.keywords || []).join(', ') || '')}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Update local state to allow typing commas freely
                  setSkillInputs(prev => ({ ...prev, [index]: inputValue }));
                }}
                onBlur={(e) => {
                  // On blur, convert the string to array and save
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
        onClick={() => {
          const newSkill = { category: '', skills: [] };
          onUpdate([...safeData, newSkill]);
        }}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Skill Category
      </button>
    </>
  );
};

export default SkillsSection;