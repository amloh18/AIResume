'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '../AISuggestionsPanel';

interface EducationSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
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
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [suggestions, setSuggestions] = useState<{ [key: number]: Array<{ method: string; content: string }> }>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});
  
  // Debug logging to understand data structure
  console.log('🔍 EducationSection - data:', data);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const updateEducationItem = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const duplicateEducation = (index: number) => {
    const educationToDuplicate = safeData[index];
    if (educationToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(educationToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
  };

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
      updateEducationItem(index, 'description', result.description);
    } catch (error) {
      console.error('Error generating AI description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  const generateAISuggestions = async (index: number, educationItem: any) => {
    if (!userId) {
      console.error('❌ EducationSection - No userId provided for AI suggestions');
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
          sectionData: educationItem,
          sectionType: 'education',
          currentText: educationItem.description || '',
          cvData: {}
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate suggestions: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ EducationSection - AI suggestions received:', result);
      
      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setSuggestions(prev => ({ ...prev, [index]: result.suggestions }));
      } else {
        console.error('❌ EducationSection - Invalid suggestions format:', result);
        setShowSuggestions(prev => ({ ...prev, [index]: false }));
      }
    } catch (error) {
      console.error('❌ EducationSection - Error generating AI suggestions:', error);
      setShowSuggestions(prev => ({ ...prev, [index]: false }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSelectSuggestion = (index: number, content: string) => {
    updateEducationItem(index, 'description', content);
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
  };

  return (
    <>
      {safeData.map((education, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{education.studyType || 'Degree'} in {education.area || 'Field'} at {education.institution || 'University'}</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicateEducation(index)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Duplicate this education"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => {
                  const updatedData = safeData.filter((_, i) => i !== index);
                  onUpdate(updatedData);
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete this education"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Institution</label>
              <input
                type="text"
                value={education.institution || ''}
                onChange={(e) => updateEducationItem(index, 'institution', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="University of California"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Field of Study</label>
              <input
                type="text"
                value={education.area || ''}
                onChange={(e) => updateEducationItem(index, 'area', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Computer Science"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 tablet:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Degree Type</label>
              <input
                type="text"
                value={education.studyType || ''}
                onChange={(e) => updateEducationItem(index, 'studyType', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Bachelor's Degree"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
              <input
                type="text"
                value={education.startDate || ''}
                onChange={(e) => updateEducationItem(index, 'startDate', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Sep 2016"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
              <input
                type="text"
                value={education.endDate || ''}
                onChange={(e) => updateEducationItem(index, 'endDate', e.target.value)}
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
                onAISuggestions={() => generateAISuggestions(index, education)}
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
              value={education.description || ''}
              onChange={(value) => updateEducationItem(index, 'description', value)}
              rows={3}
              placeholder="Describe your education, achievements, relevant coursework, or academic honors..."
            />
          </div>
        </div>
      ))}
      
      <button
        onClick={() => {
          const newEducation = {
            institution: '',
            area: '',
            studyType: '',
            startDate: '',
            endDate: '',
            score: '',
            description: ''
            // courses is optional - only include if user adds courses
          };
          onUpdate([...safeData, newEducation]);
        }}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Education
      </button>
    </>
  );
};

export default EducationSection;