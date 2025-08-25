'use client';

import React, { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface ProjectsFormProps {
  projects: Array<{
    name: string;
    startDate: string;
    endDate: string;
    description: string;
    highlights: string[];
    url: string;
  }>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
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

  const addHighlight = (projectId: string) => {
    const project = projects.find(p => p.name === projectId);
    if (project) {
      onUpdate(projectId, {
        highlights: [...project.highlights, '']
      });
    }
  };

  const updateHighlight = (projectId: string, index: number, value: string) => {
    const project = projects.find(p => p.name === projectId);
    if (project) {
      const newHighlights = [...project.highlights];
      newHighlights[index] = value;
      onUpdate(projectId, { highlights: newHighlights });
    }
  };

  const removeHighlight = (projectId: string, index: number) => {
    const project = projects.find(p => p.name === projectId);
    if (project) {
      const newHighlights = project.highlights.filter((_, i) => i !== index);
      onUpdate(projectId, { highlights: newHighlights });
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
          {projects.map((project, index) => (
            <div key={project.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Project #{index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpanded(project.name)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedItems.has(project.name) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(project.name)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remove project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedItems.has(project.name) && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => onUpdate(project.name, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="E-commerce Platform"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="text"
                        value={project.startDate}
                        onChange={(e) => onUpdate(project.name, { startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Jan 2023"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="text"
                        value={project.endDate}
                        onChange={(e) => onUpdate(project.name, { endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Mar 2023"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project URL
                    </label>
                    <input
                      type="url"
                      value={project.url}
                      onChange={(e) => onUpdate(project.name, { url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://github.com/username/project"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={project.description}
                      onChange={(e) => onUpdate(project.name, { description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the project, technologies used, and your role..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Key Features/Achievements
                      </label>
                      <button
                        type="button"
                        onClick={() => addHighlight(project.name)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Feature
                      </button>
                    </div>
                    
                    {project.highlights.map((highlight, highlightIndex) => (
                      <div key={highlightIndex} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={highlight}
                          onChange={(e) => updateHighlight(project.name, highlightIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe a key feature or achievement..."
                        />
                        <button
                          type="button"
                          onClick={() => removeHighlight(project.name, highlightIndex)}
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

export default ProjectsForm; 