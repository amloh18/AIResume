'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '../AISuggestionsPanel';

interface VolunteerSectionProps {
  data?: any[];
  onUpdate: (data: any[]) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  jobData?: any;
  userId?: string;
}

const VolunteerSection: React.FC<VolunteerSectionProps> = ({
  data = [],
  onUpdate,
  onAdd,
  onRemove,
  jobData,
  userId
}) => {
  // Ensure we have proper data structure
  const safeData = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [suggestions, setSuggestions] = useState<{ [key: number]: Array<{ method: string; content: string }> }>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});

  // Safety wrapper for onAdd
  const handleAdd = useCallback(() => {
    try {
      if (onAdd && typeof onAdd === 'function') {
        onAdd();
      } else {
        console.warn('onAdd callback is not provided, using fallback');
        // Fallback: add a default volunteer entry directly
        const defaultVolunteer = {
          organization: '',
          position: '',
          url: '',
          startDate: '',
          endDate: '',
          summary: '',
          highlights: []
        };
        onUpdate([...safeData, defaultVolunteer]);
      }
    } catch (error) {
      console.error('Error in handleAdd:', error);
      // Fallback on error
      const defaultVolunteer = {
        organization: '',
        position: '',
        url: '',
        startDate: '',
        endDate: '',
        summary: '',
        highlights: []
      };
      onUpdate([...safeData, defaultVolunteer]);
    }
  }, [onAdd, onUpdate, safeData]);

  // Safety wrapper for onRemove
  const handleRemove = useCallback((index: number) => {
    try {
      if (onRemove && typeof onRemove === 'function') {
        onRemove(index);
      } else {
        // Fallback: remove directly via onUpdate
        const updatedData = safeData.filter((_, i) => i !== index);
        onUpdate(updatedData);
      }
    } catch (error) {
      console.error('Error in handleRemove:', error);
      // Fallback on error
      const updatedData = safeData.filter((_, i) => i !== index);
      onUpdate(updatedData);
    }
  }, [onRemove, onUpdate, safeData]);

  const updateVolunteer = useCallback((index: number, field: string, value: any) => {
    try {
      const updatedData = [...safeData];
      if (!updatedData[index]) {
        updatedData[index] = { organization: '', position: '', url: '', startDate: '', endDate: '', summary: '', highlights: [] };
      }
      updatedData[index] = { ...updatedData[index], [field]: value };
      onUpdate(updatedData);
    } catch (error) {
      console.error('Error in updateVolunteer:', error);
    }
  }, [safeData, onUpdate]);

  const duplicateVolunteer = useCallback((index: number) => {
    try {
      const volunteerToDuplicate = safeData[index];
      if (volunteerToDuplicate) {
        const duplicated = JSON.parse(JSON.stringify(volunteerToDuplicate));
        const updatedData = [...safeData];
        updatedData.splice(index + 1, 0, duplicated);
        onUpdate(updatedData);
      }
    } catch (error) {
      console.error('Error in duplicateVolunteer:', error);
    }
  }, [safeData, onUpdate]);

  const generateAISuggestions = useCallback(async (index: number, volunteerItem: any) => {
    if (!userId) return;
    
    setLoadingSuggestions(prev => ({ ...prev, [index]: true }));
    setShowSuggestions(prev => ({ ...prev, [index]: true }));
    
    try {
      const response = await fetch('/api/ai/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobData,
          sectionData: volunteerItem,
          sectionType: 'volunteer',
          currentText: volunteerItem.summary || '',
          cvData: {}
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const result = await response.json();
      setSuggestions(prev => ({ ...prev, [index]: result.suggestions }));
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      setShowSuggestions(prev => ({ ...prev, [index]: false }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }));
    }
  }, [userId, jobData]);

  const handleSelectSuggestion = useCallback((index: number, content: string) => {
    updateVolunteer(index, 'summary', content);
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
  }, [updateVolunteer]);

  return (
    <>
      {safeData.map((volunteer, index) => {
        // Safety check: ensure volunteer is an object
        if (!volunteer || typeof volunteer !== 'object') {
          return null;
        }
        
        return (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{volunteer.organization || 'Organization'}</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicateVolunteer(index)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Duplicate this volunteer experience"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => handleRemove(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete this volunteer experience"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Organization</label>
              <input
                type="text"
                value={volunteer.organization || ''}
                onChange={(e) => updateVolunteer(index, 'organization', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Red Cross"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Position</label>
              <input
                type="text"
                value={volunteer.position || ''}
                onChange={(e) => updateVolunteer(index, 'position', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Volunteer Coordinator"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
              <input
                type="text"
                value={volunteer.startDate || ''}
                onChange={(e) => updateVolunteer(index, 'startDate', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="January 2022"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
              <input
                type="text"
                value={volunteer.endDate || ''}
                onChange={(e) => updateVolunteer(index, 'endDate', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="December 2022"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Description</label>
              <WYSIWYGToolbar
                showAIButton={true}
                fieldType="other"
                onAISuggestions={() => generateAISuggestions(index, volunteer)}
                isGenerating={loadingSuggestions[index] || false}
              />
            </div>
            <AISuggestionsPanel
              isVisible={showSuggestions[index] || false}
              suggestions={suggestions[index] || []}
              isLoading={loadingSuggestions[index] || false}
              onSelect={(content) => handleSelectSuggestion(index, content)}
              onClose={() => setShowSuggestions(prev => ({ ...prev, [index]: false }))}
            />
            <WYSIWYGEditor
              value={volunteer.summary || ''}
              onChange={(value) => updateVolunteer(index, 'summary', value)}
              rows={3}
              placeholder="Describe your volunteer work and impact..."
            />
          </div>
        </div>
        );
      })}
      
      <button
        onClick={handleAdd}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Volunteer Experience
      </button>
    </>
  );
};

export default VolunteerSection;
