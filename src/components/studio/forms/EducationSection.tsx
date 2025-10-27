'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, GraduationCap, Sparkles, RefreshCw } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

interface EducationSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  jobData?: any;
  userId?: string;
}

const EducationSection: React.FC<EducationSectionProps> = ({
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
  console.log('🔍 EducationSection - data:', data);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const generateAIDescription = async (index: number, educationItem: any) => {
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
          educationItem,
          type: 'education'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const result = await response.json();
      onUpdate(`education.${index}.description`, result.description);
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
          Add Education
        </motion.button>
      </div>

      <div className="space-y-6">
        {safeData.map((education, index) => (
          <div key={index} className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Institution</label>
                <input
                  type="text"
                  value={education.institution || ''}
                  onChange={(e) => onUpdate(`education.${index}.institution`, e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="University of California"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Field of Study</label>
                <input
                  type="text"
                  value={education.area || ''}
                  onChange={(e) => onUpdate(`education.${index}.area`, e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="Computer Science"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Degree Type</label>
                <input
                  type="text"
                  value={education.studyType || ''}
                  onChange={(e) => onUpdate(`education.${index}.studyType`, e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="Bachelor's Degree"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
                <input
                  type="text"
                  value={education.startDate || ''}
                  onChange={(e) => onUpdate(`education.${index}.startDate`, e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="Sep 2016"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
                <input
                  type="text"
                  value={education.endDate || ''}
                  onChange={(e) => onUpdate(`education.${index}.endDate`, e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="May 2020"
                />
              </div>
            </div>

            {/* Description Field */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-white/80 text-sm font-medium">Education Description</label>
              </div>
              <ProfessionalTextField
                value={education.description || ''}
                onChange={(value) => onUpdate(`education.${index}.description`, value)}
                placeholder="Describe your education, achievements, relevant coursework, or projects. Use AI to generate content based on your degree and institution..."
                rows={4}
                fieldId={`education-${index}`}
                showFullToolbar={true}
                showAIGenerate={true}
                onAIGenerate={() => generateAIDescription(index, education)}
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

export default EducationSection;