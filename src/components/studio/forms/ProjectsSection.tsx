'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, FolderOpen, Sparkles, RefreshCw } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

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
  const themeClasses = getThemeClasses;
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  
  // Debug logging to understand data structure
  console.log('🔍 ProjectsSection - data:', data);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

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
      onUpdate(`projects.${index}.description`, result.description);
    } catch (error) {
      console.error('Error generating AI description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <motion.button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#80FF00] text-black rounded-lg hover:bg-[#70e600] transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Project
        </motion.button>
      </div>

      <div className="space-y-6">
        {safeData.map((project, index) => (
          <div key={index} className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  value={project.name || ''}
                  onChange={(e) => onUpdate(`projects.${index}.name`, e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="E-commerce Platform"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Project URL</label>
                <input
                  type="url"
                  value={project.url || ''}
                  onChange={(e) => onUpdate(`projects.${index}.url`, e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="https://github.com/username/project"
                />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-white/80 text-sm font-medium">Project Description</label>
              </div>
              <ProfessionalTextField
                value={project.description || ''}
                onChange={(value) => onUpdate(`projects.${index}.description`, value)}
                placeholder="Describe the project, technologies used, your role, and key achievements. Use AI to generate content based on project name..."
                rows={4}
                fieldId={`project-${index}`}
                showFullToolbar={true}
                showAIGenerate={true}
                onAIGenerate={() => generateAIDescription(index, project)}
                isGenerating={generatingIndex === index}
              />
            </div>

            <div className="flex justify-end">
              <motion.button
                onClick={() => onRemove(index)}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </motion.button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectsSection;