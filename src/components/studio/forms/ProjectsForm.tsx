'use client';

import React, { useState } from 'react';
import { Project } from '@/lib/stores/cvStore';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface ProjectsFormProps {
  projects: Project[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Project>) => void;
}

const ProjectsForm: React.FC<ProjectsFormProps> = ({
  projects,
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

  const addTechnology = (id: string) => {
    const item = projects.find(proj => proj.id === id);
    if (item) {
      onUpdate(id, {
        technologies: [...item.technologies, '']
      });
    }
  };

  const updateTechnology = (id: string, index: number, value: string) => {
    const item = projects.find(proj => proj.id === id);
    if (item) {
      const newTechnologies = [...item.technologies];
      newTechnologies[index] = value;
      onUpdate(id, { technologies: newTechnologies });
    }
  };

  const removeTechnology = (id: string, index: number) => {
    const item = projects.find(proj => proj.id === id);
    if (item) {
      const newTechnologies = item.technologies.filter((_, i) => i !== index);
      onUpdate(id, { technologies: newTechnologies });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No projects added yet.</p>
          <p className="text-sm">Click "Add Project" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((proj, index) => (
            <div key={proj.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Project #{index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpanded(proj.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedItems.has(proj.id) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(proj.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remove project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedItems.has(proj.id) && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      value={proj.title}
                      onChange={(e) => onUpdate(proj.id, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="E-commerce Platform"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={proj.description}
                      onChange={(e) => onUpdate(proj.id, { description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the project, your role, and key features..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Technologies
                      </label>
                      <button
                        onClick={() => addTechnology(proj.id)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Technology
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {proj.technologies.map((tech, techIndex) => (
                        <div key={techIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tech}
                            onChange={(e) => updateTechnology(proj.id, techIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., React, Node.js, MongoDB"
                          />
                          <button
                            onClick={() => removeTechnology(proj.id, techIndex)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project URL
                      </label>
                      <input
                        type="url"
                        value={proj.url}
                        onChange={(e) => onUpdate(proj.id, { url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://project-demo.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GitHub Repository
                      </label>
                      <input
                        type="url"
                        value={proj.github}
                        onChange={(e) => onUpdate(proj.id, { github: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://github.com/username/project"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="month"
                        value={proj.startDate}
                        onChange={(e) => onUpdate(proj.id, { startDate: e.target.value })}
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
                          value={proj.endDate}
                          onChange={(e) => onUpdate(proj.id, { endDate: e.target.value })}
                          disabled={proj.current}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={proj.current}
                            onChange={(e) => onUpdate(proj.id, { current: e.target.checked })}
                            className="rounded"
                          />
                          Ongoing
                        </label>
                      </div>
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

export default ProjectsForm; 