'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';

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
    <>
      {safeData.map((work, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{work.position || 'Job Title'} at {work.name || 'Company'}</h4>
            <button
              onClick={() => removeWorkItem(index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Description</label>
              <WYSIWYGToolbar
                showAIButton={true}
                fieldType="experience"
                onAIGenerate={() => generateAIDescription(index, work)}
                isGenerating={generatingIndex === index}
              />
            </div>
            <WYSIWYGEditor
              value={work.summary || ''}
              onChange={(value) => updateWorkItem(index, 'summary', value)}
              rows={4}
              placeholder="Describe your key responsibilities and achievements..."
            />
          </div>
        </div>
      ))}
      
      <button
        onClick={addWorkItem}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Work Experience
      </button>
    </>
  );
};

export default WorkExperienceSection;