'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Briefcase, Sparkles, RefreshCw } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

interface WorkExperienceSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  jobData?: any;
  userId?: string;
}

const WorkExperienceSection: React.FC<WorkExperienceSectionProps> = ({
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
  console.log('🔍 WorkExperienceSection - received data:', data);
  console.log('🔍 WorkExperienceSection - data type:', typeof data);
  console.log('🔍 WorkExperienceSection - is array:', Array.isArray(data));
  console.log('🔍 WorkExperienceSection - data length:', data?.length);
  console.log('🔍 WorkExperienceSection - first item:', data?.[0]);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];
  console.log('🔍 WorkExperienceSection - safeData length:', safeData.length);

  const generateAIDescription = async (index: number, workItem: any) => {
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
          workItem,
          type: 'work_experience'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const result = await response.json();
      onUpdate(`work.${index}.summary`, result.description);
    } catch (error) {
      console.error('Error generating AI description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-blue-600" />
          <h4 className={`font-medium ${themeClasses.text.primary}`}>
            Work Experience
          </h4>
        </div>
        <motion.button
          onClick={onAdd}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm ${themeClasses.button.primary} rounded-lg`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Experience
        </motion.button>
      </div>

      <div className="space-y-4">
        {safeData.map((work, index) => (
          <div key={index} className={`${themeClasses.card.base} border rounded-lg p-4`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={work.position || ''}
                onChange={(e) => onUpdate(`work.${index}.position`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
                placeholder="Job Title"
              />
              <input
                type="text"
                value={work.name || ''}
                onChange={(e) => onUpdate(`work.${index}.name`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
                placeholder="Company Name"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={work.startDate || ''}
                onChange={(e) => onUpdate(`work.${index}.startDate`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
                placeholder="Start Date"
              />
              <input
                type="text"
                value={work.endDate || ''}
                onChange={(e) => onUpdate(`work.${index}.endDate`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
                placeholder="End Date"
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                  Job Description & Achievements
                </label>
                <motion.button
                  onClick={() => generateAIDescription(index, work)}
                  disabled={generatingIndex === index || !work.position || !work.name}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {generatingIndex === index ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>{generatingIndex === index ? 'Generating...' : 'AI Generate'}</span>
                </motion.button>
              </div>
              <ProfessionalTextField
                value={work.summary || ''}
                onChange={(value) => onUpdate(`work.${index}.summary`, value)}
                placeholder="Describe your role, responsibilities, and key achievements. Use AI to generate content based on job title and company..."
                rows={4}
                fieldId={`work-experience-${index}`}
                showFullToolbar={true}
              />
            </div>

            <div className="flex justify-end">
              <motion.button
                onClick={() => onRemove(index)}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
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

export default WorkExperienceSection;