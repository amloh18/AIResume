'use client';

import React, { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface SkillsFormProps {
  skills: Array<{
    name: string;
    level: string;
    keywords: string[];
  }>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
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

  const addKeyword = (skillId: string) => {
    const skill = skills.find(s => s.name === skillId);
    if (skill) {
      onUpdate(skillId, {
        keywords: [...skill.keywords, '']
      });
    }
  };

  const updateKeyword = (skillId: string, index: number, value: string) => {
    const skill = skills.find(s => s.name === skillId);
    if (skill) {
      const newKeywords = [...skill.keywords];
      newKeywords[index] = value;
      onUpdate(skillId, { keywords: newKeywords });
    }
  };

  const removeKeyword = (skillId: string, index: number) => {
    const skill = skills.find(s => s.name === skillId);
    if (skill) {
      const newKeywords = skill.keywords.filter((_, i) => i !== index);
      onUpdate(skillId, { keywords: newKeywords });
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
            <div key={skill.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Skill Category #{index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpanded(skill.name)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedItems.has(skill.name) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(skill.name)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remove skill category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedItems.has(skill.name) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => onUpdate(skill.name, { name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Programming Languages"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Level
                      </label>
                      <input
                        type="text"
                        value={skill.level}
                        onChange={(e) => onUpdate(skill.name, { level: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Advanced"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Skills
                      </label>
                      <button
                        type="button"
                        onClick={() => addKeyword(skill.name)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Skill
                      </button>
                    </div>
                    
                    {skill.keywords.map((keyword, keywordIndex) => (
                      <div key={keywordIndex} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={keyword}
                          onChange={(e) => updateKeyword(skill.name, keywordIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., JavaScript, React, Node.js"
                        />
                        <button
                          type="button"
                          onClick={() => removeKeyword(skill.name, keywordIndex)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
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