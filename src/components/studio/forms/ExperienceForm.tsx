'use client';

import React, { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface ExperienceFormProps {
  experience: Array<{
    name: string;
    position: string;
    url: string;
    startDate: string;
    endDate: string;
    summary: string;
    highlights: string[];
  }>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
}

const ExperienceForm: React.FC<ExperienceFormProps> = ({
  experience,
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

  const addAchievement = (id: string) => {
    const item = experience.find(exp => exp.name === id);
    if (item) {
      onUpdate(id, {
        highlights: [...item.highlights, '']
      });
    }
  };

  const updateAchievement = (id: string, index: number, value: string) => {
    const item = experience.find(exp => exp.name === id);
    if (item) {
      const newHighlights = [...item.highlights];
      newHighlights[index] = value;
      onUpdate(id, { highlights: newHighlights });
    }
  };

  const removeAchievement = (id: string, index: number) => {
    const item = experience.find(exp => exp.name === id);
    if (item) {
      const newHighlights = item.highlights.filter((_, i) => i !== index);
      onUpdate(id, { highlights: newHighlights });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Work Experience</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Experience
        </button>
      </div>

      {experience.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No work experience added yet.</p>
          <p className="text-sm">Click "Add Experience" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {experience.map((exp, index) => (
            <div key={exp.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Experience #{index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpanded(exp.name)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedItems.has(exp.name) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(exp.name)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remove experience"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      value={exp.position}
                      onChange={(e) => onUpdate(exp.name, { position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company *
                    </label>
                    <input
                      type="text"
                      value={exp.name}
                      onChange={(e) => onUpdate(exp.name, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Google"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="text"
                      value={exp.startDate}
                      onChange={(e) => onUpdate(exp.name, { startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jan 2020"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="text"
                      value={exp.endDate}
                      onChange={(e) => onUpdate(exp.name, { endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Present"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company URL
                  </label>
                  <input
                    type="url"
                    value={exp.url}
                    onChange={(e) => onUpdate(exp.name, { url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://company.com"
                  />
                </div>

                {expandedItems.has(exp.name) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Description
                      </label>
                      <textarea
                        value={exp.summary}
                        onChange={(e) => onUpdate(exp.name, { summary: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe your role and responsibilities..."
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Key Achievements
                        </label>
                        <button
                          type="button"
                          onClick={() => addAchievement(exp.name)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          + Add Achievement
                        </button>
                      </div>
                      
                      {exp.highlights.map((achievement, achievementIndex) => (
                        <div key={achievementIndex} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={achievement}
                            onChange={(e) => updateAchievement(exp.name, achievementIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe a key achievement..."
                          />
                          <button
                            type="button"
                            onClick={() => removeAchievement(exp.name, achievementIndex)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExperienceForm; 