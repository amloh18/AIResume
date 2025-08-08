'use client';

import React, { useState } from 'react';
import { Skill } from '@/lib/stores/cvStore';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface SkillsFormProps {
  skills: Skill[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Skill>) => void;
}

const SkillsForm: React.FC<SkillsFormProps> = ({
  skills,
  onAdd,
  onRemove,
  onUpdate
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const addSkill = (id: string) => {
    const item = skills.find(skill => skill.id === id);
    if (item) {
      onUpdate(id, {
        skills: [...item.skills, '']
      });
    }
  };

  const updateSkill = (id: string, index: number, value: string) => {
    const item = skills.find(skill => skill.id === id);
    if (item) {
      const newSkills = [...item.skills];
      newSkills[index] = value;
      onUpdate(id, { skills: newSkills });
    }
  };

  const removeSkill = (id: string, index: number) => {
    const item = skills.find(skill => skill.id === id);
    if (item) {
      const newSkills = item.skills.filter((_, i) => i !== index);
      onUpdate(id, { skills: newSkills });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Skills</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Skill Category
        </button>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No skills added yet.</p>
          <p className="text-sm">Click "Add Skill Category" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {skills.map((skill, index) => (
            <div key={skill.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Skill Category #{index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpanded(skill.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedItems.has(skill.id) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(skill.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remove skill category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedItems.has(skill.id) && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={skill.category}
                      onChange={(e) => onUpdate(skill.id, { category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Programming Languages"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Skills
                      </label>
                      <button
                        onClick={() => addSkill(skill.id)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Skill
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {skill.skills.map((skillName, skillIndex) => (
                        <div key={skillIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={skillName}
                            onChange={(e) => updateSkill(skill.id, skillIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., JavaScript, React, Node.js"
                          />
                          <button
                            onClick={() => removeSkill(skill.id, skillIndex)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SkillsForm; 