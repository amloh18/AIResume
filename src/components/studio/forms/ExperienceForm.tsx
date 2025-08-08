'use client';

import React, { useState } from 'react';
import { Experience } from '@/lib/stores/cvStore';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface ExperienceFormProps {
  experience: Experience[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Experience>) => void;
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
    const item = experience.find(exp => exp.id === id);
    if (item) {
      onUpdate(id, {
        achievements: [...item.achievements, '']
      });
    }
  };

  const updateAchievement = (id: string, index: number, value: string) => {
    const item = experience.find(exp => exp.id === id);
    if (item) {
      const newAchievements = [...item.achievements];
      newAchievements[index] = value;
      onUpdate(id, { achievements: newAchievements });
    }
  };

  const removeAchievement = (id: string, index: number) => {
    const item = experience.find(exp => exp.id === id);
    if (item) {
      const newAchievements = item.achievements.filter((_, i) => i !== index);
      onUpdate(id, { achievements: newAchievements });
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
            <div key={exp.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Experience #{index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpanded(exp.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedItems.has(exp.id) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(exp.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remove experience"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedItems.has(exp.id) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        value={exp.jobTitle}
                        onChange={(e) => onUpdate(exp.id, { jobTitle: e.target.value })}
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
                        value={exp.company}
                        onChange={(e) => onUpdate(exp.id, { company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tech Corp"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={exp.location}
                      onChange={(e) => onUpdate(exp.id, { location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="San Francisco, CA"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) => onUpdate(exp.id, { startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="month"
                          value={exp.endDate}
                          onChange={(e) => onUpdate(exp.id, { endDate: e.target.value })}
                          disabled={exp.current}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={exp.current}
                            onChange={(e) => onUpdate(exp.id, { current: e.target.checked })}
                            className="rounded"
                          />
                          Current
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={exp.description}
                      onChange={(e) => onUpdate(exp.id, { description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe your role and responsibilities..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Achievements
                      </label>
                      <button
                        onClick={() => addAchievement(exp.id)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Achievement
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {exp.achievements.map((achievement, achievementIndex) => (
                        <div key={achievementIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={achievement}
                            onChange={(e) => updateAchievement(exp.id, achievementIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe an achievement..."
                          />
                          <button
                            onClick={() => removeAchievement(exp.id, achievementIndex)}
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

export default ExperienceForm; 