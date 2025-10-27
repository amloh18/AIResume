'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Briefcase, Sparkles, RefreshCw } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

interface WorkExperienceSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  jobData?: any;
  userId?: string;
}

const WorkExperienceSection: React.FC<WorkExperienceSectionProps> = ({
  data,
  onUpdate,
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

  const updateWorkItem = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const addWorkItem = () => {
    const newWorkItem = {
      position: '',
      name: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: []
    };
    onUpdate([...safeData, newWorkItem]);
  };

  const removeWorkItem = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate(updatedData);
  };

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
      updateWorkItem(index, 'summary', result.description);
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
          onClick={addWorkItem}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#80FF00] text-black rounded-lg hover:bg-[#70e600] transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Experience
        </motion.button>
      </div>

      <div className="space-y-6">
        {safeData.map((work, index) => (
          <div key={index} className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Job Title</label>
                <input
                  type="text"
                  value={work.position || ''}
                  onChange={(e) => updateWorkItem(index, 'position', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="Senior Product Manager"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Company Name</label>
                <input
                  type="text"
                  value={work.name || ''}
                  onChange={(e) => updateWorkItem(index, 'name', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="Tech Corp"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
                <input
                  type="text"
                  value={work.startDate || ''}
                  onChange={(e) => updateWorkItem(index, 'startDate', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="Jan 2020"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
                <input
                  type="text"
                  value={work.endDate || ''}
                  onChange={(e) => updateWorkItem(index, 'endDate', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="Present"
                />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-white/80 text-sm font-medium">Job Description & Achievements</label>
              </div>
              <ProfessionalTextField
                value={work.summary || ''}
                onChange={(value) => updateWorkItem(index, 'summary', value)}
                placeholder="Describe your role, responsibilities, and key achievements. Use AI to generate content based on job title and company..."
                rows={4}
                fieldId={`work-experience-${index}`}
                showFullToolbar={true}
                showAIGenerate={true}
                onAIGenerate={() => generateAIDescription(index, work)}
                isGenerating={generatingIndex === index}
              />
            </div>

            <div className="flex justify-end">
              <motion.button
                onClick={() => removeWorkItem(index)}
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

      {/* Add Work Experience Button */}
      <div className="mt-6">
        <motion.button
          onClick={addWorkItem}
          className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Work Experience
        </motion.button>
      </div>
    </div>
  );
};

export default WorkExperienceSection;