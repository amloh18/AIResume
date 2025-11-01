'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';

interface ProjectsSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  jobData?: any;
  userId?: string;
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove,
  jobData,
  userId
}) => {
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  
  // Debug logging to understand data structure
  console.log('🔍 ProjectsSection - data:', data);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  // Update project item - update full array like WorkExperienceSection
  const updateProject = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate('projects', updatedData);
  };

  const generateAIDescription = async (index: number, projectItem: any) => {
    if (!userId) return;
    
    setGeneratingIndex(index);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobData,
          projectItem,
          type: 'project'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const result = await response.json();
      updateProject(index, 'description', result.description);
    } catch (error) {
      console.error('Error generating AI description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  return (
    <>
      {safeData.map((project, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{project.name || 'Project Name'}</h4>
            <button
              onClick={() => {
                const updatedData = safeData.filter((_, i) => i !== index);
                onUpdate('projects', updatedData);
              }}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Project Name</label>
              <input
                type="text"
                value={project.name || ''}
                onChange={(e) => updateProject(index, 'name', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="E-commerce Platform"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Project URL</label>
              <input
                type="url"
                value={project.url || ''}
                onChange={(e) => updateProject(index, 'url', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="https://github.com/username/project"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Description</label>
              <WYSIWYGToolbar />
            </div>
            <WYSIWYGEditor
              value={project.description || ''}
              onChange={(value) => updateProject(index, 'description', value)}
              rows={3}
              placeholder="Describe the project and your role..."
            />
          </div>
        </div>
      ))}
      
      <button
        onClick={onAdd}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Project
      </button>
    </>
  );
};

export default ProjectsSection;