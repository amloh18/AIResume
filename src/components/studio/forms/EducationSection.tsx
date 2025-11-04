'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';

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
    <>
      {safeData.map((education, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{education.studyType || 'Degree'} in {education.area || 'Field'} at {education.institution || 'University'}</h4>
            <button
              onClick={() => onRemove(index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Description</label>
              <WYSIWYGToolbar
                showAIButton={true}
                fieldType="other"
                onAIGenerate={() => generateAIDescription(index, education)}
                isGenerating={generatingIndex === index}
              />
            </div>
            <WYSIWYGEditor
              value={education.description || ''}
              onChange={(value) => onUpdate(`education.${index}.description`, value)}
              rows={3}
              placeholder="Describe your education, achievements, relevant coursework, or academic honors..."
            />
          </div>
        </div>
      ))}
      
      <button
        onClick={onAdd}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Education
      </button>
    </>
  );
};

export default EducationSection;