'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '../AISuggestionsPanel';

interface ProjectsSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
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
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [suggestions, setSuggestions] = useState<{ [key: number]: Array<{ method: string; content: string }> }>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});
  
  // Debug logging to understand data structure
  console.log('🔍 ProjectsSection - data:', data);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  // Update project item - use direct array updates
  const updateProject = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    if (!updatedData[index]) {
      updatedData[index] = { name: '', startDate: '', endDate: '', description: '', highlights: [], keywords: [], url: '' };
    }
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const duplicateProject = (index: number) => {
    const projectToDuplicate = safeData[index];
    if (projectToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(projectToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
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

  const generateAISuggestions = async (index: number, projectItem: any) => {
    if (!userId) {
      console.error('❌ ProjectsSection - No userId provided for AI suggestions');
      return;
    }
    
    // Show panel immediately and set loading state
    setShowSuggestions(prev => ({ ...prev, [index]: true }));
    setLoadingSuggestions(prev => ({ ...prev, [index]: true }));
    
    try {
      const response = await fetch('/api/ai/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobData,
          sectionData: projectItem,
          sectionType: 'project',
          currentText: projectItem.description || '',
          cvData: {}
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate suggestions: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ ProjectsSection - AI suggestions received:', result);
      
      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setSuggestions(prev => ({ ...prev, [index]: result.suggestions }));
      } else {
        console.error('❌ ProjectsSection - Invalid suggestions format:', result);
        setShowSuggestions(prev => ({ ...prev, [index]: false }));
      }
    } catch (error) {
      console.error('❌ ProjectsSection - Error generating AI suggestions:', error);
      setShowSuggestions(prev => ({ ...prev, [index]: false }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSelectSuggestion = (index: number, content: string) => {
    updateProject(index, 'description', content);
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
  };

  return (
    <>
      {safeData.map((project, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{project.name || 'Project Name'}</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicateProject(index)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Duplicate this project"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => {
                  const updatedData = safeData.filter((_, i) => i !== index);
                  onUpdate(updatedData);
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete this project"
              >
                <Trash2 size={16} />
              </button>
            </div>
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
              <WYSIWYGToolbar
                showAIButton={true}
                fieldType="other"
                onAISuggestions={() => generateAISuggestions(index, project)}
                isGenerating={loadingSuggestions[index] || false}
              />
            </div>
            <AISuggestionsPanel
              isVisible={showSuggestions[index] || false}
              suggestions={suggestions[index] || []}
              isLoading={loadingSuggestions[index] || false}
              onSelect={(content) => handleSelectSuggestion(index, content)}
              onClose={() => setShowSuggestions({ ...showSuggestions, [index]: false })}
            />
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
        onClick={() => {
          const newProject = { name: '', description: '', startDate: '', endDate: '', keywords: [], url: '' };
          // highlights is optional - only include if user adds highlights
          onUpdate([...safeData, newProject]);
        }}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Project
      </button>
    </>
  );
};

export default ProjectsSection;