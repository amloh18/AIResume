'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '../AISuggestionsPanel';
import InlineSuggestion from '@/components/resume-enhancer/annotations/InlineSuggestion';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';

interface WorkExperienceSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  jobData?: any;
  userId?: string;
  annotations?: FixAnnotation[];
  onApplyAnnotation?: (fix: FixAnnotation) => void;
  onDismissAnnotation?: (fixId: string) => void;
}

const WorkExperienceSection: React.FC<WorkExperienceSectionProps> = ({
  data,
  onUpdate,
  jobData,
  userId,
  annotations = [],
  onApplyAnnotation,
  onDismissAnnotation
}) => {
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [suggestions, setSuggestions] = useState<{ [key: number]: Array<{ method: string; content: string }> }>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});
  
  // Debug logging to understand data structure
  console.log('🔍 WorkExperienceSection - received data:', data);
  console.log('🔍 WorkExperienceSection - data type:', typeof data);
  console.log('🔍 WorkExperienceSection - is array:', Array.isArray(data));
  console.log('🔍 WorkExperienceSection - data length:', data?.length);
  console.log('🔍 WorkExperienceSection - first item:', data?.[0]);
  if (data && Array.isArray(data) && data.length > 0) {
    data.forEach((work, idx) => {
      console.log(`🔍 WorkExperienceSection - work[${idx}].summary:`, work?.summary);
      console.log(`🔍 WorkExperienceSection - work[${idx}].summary type:`, typeof work?.summary);
      console.log(`🔍 WorkExperienceSection - work[${idx}].summary length:`, work?.summary?.length);
    });
  }
  
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

  const duplicateWorkItem = (index: number) => {
    const workToDuplicate = safeData[index];
    if (workToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(workToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
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

  const generateAISuggestions = async (index: number, workItem: any) => {
    if (!userId) {
      console.error('❌ WorkExperienceSection - No userId provided for AI suggestions');
      return;
    }
    
    // Show panel immediately and set loading state using functional updates
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
          sectionData: workItem,
          sectionType: 'work_experience',
          currentText: workItem.summary || '',
          cvData: {} // Can be passed from parent if needed
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate suggestions: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ WorkExperienceSection - AI suggestions received:', result);
      
      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setSuggestions(prev => ({ ...prev, [index]: result.suggestions }));
      } else {
        console.error('❌ WorkExperienceSection - Invalid suggestions format:', result);
        setShowSuggestions(prev => ({ ...prev, [index]: false }));
      }
    } catch (error) {
      console.error('❌ WorkExperienceSection - Error generating AI suggestions:', error);
      setShowSuggestions(prev => ({ ...prev, [index]: false }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSelectSuggestion = (index: number, content: string) => {
    updateWorkItem(index, 'summary', content);
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
  };


  return (
    <>
      {safeData.map((work, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{work.position || 'Job Title'} at {work.name || 'Company'}</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicateWorkItem(index)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Duplicate this work experience"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => removeWorkItem(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete this work experience"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
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

          {/* Work Summary - Same pattern as PersonalInfoForm summary */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Work Summary</label>
              <WYSIWYGToolbar
                showAIButton={true}
                fieldType="experience"
                onAISuggestions={() => generateAISuggestions(index, work)}
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
              key={`work-summary-${index}`}
              value={work?.summary || ''}
              onChange={(value) => updateWorkItem(index, 'summary', value)}
              rows={4}
              placeholder="Describe your key responsibilities and achievements..."
              hasAnnotation={annotations.some((ann) => ann.fieldPath === `work[${index}].summary` && ann.status === 'open')}
            />
            {/* Display inline suggestions for this specific field below the editor */}
            {annotations
              .filter((ann) => ann.fieldPath === `work[${index}].summary` && ann.status === 'open')
              .map((fix) => (
                <InlineSuggestion
                  key={fix.id}
                  fix={fix}
                  onApply={onApplyAnnotation || (() => {})}
                  onDismiss={onDismissAnnotation || (() => {})}
                />
              ))}
          </div>
        </div>
      ))}
      
      <button
        onClick={addWorkItem}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/50 hover:text-[#80FF00] rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Work Experience
      </button>
    </>
  );
};

export default WorkExperienceSection;