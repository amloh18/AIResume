'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { EmptyStateSkeleton } from '@/components/ui/EmptyStateSkeleton';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '@/components/ai/AISuggestionsPanel';

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
          summary: ''
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
        summary: ''
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
        updatedData[index] = { organization: '', position: '', url: '', startDate: '', endDate: '', summary: '' };
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
      {safeData.length === 0 ? (
          <EmptyStateSkeleton onAdd={() => {
            onUpdate([...safeData, { organization: '', position: '', startDate: '', endDate: '', summary: '', highlights: [] }]);
          }} itemName="Volunteer Experience" />
        ) : safeData.map((volunteer, index) => {
        // Safety check: ensure volunteer is an object
        if (!volunteer || typeof volunteer !== 'object') {
          return null;
        }

        return (
          <div key={index} className="bg-white/5 rounded-none p-6 border border-white/10 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-[color:var(--text-primary)]">{volunteer.organization || 'Organization'}</h4>
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
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
                  placeholder="Red Cross"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Position</label>
                <input
                  type="text"
                  value={volunteer.position || ''}
                  onChange={(e) => updateVolunteer(index, 'position', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
                  placeholder="Volunteer Coordinator"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
                <input
                  type="month"
                  value={volunteer.startDate || ''}
                  onChange={(e) => updateVolunteer(index, 'startDate', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
                  placeholder="YYYY-MM"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
                <input
                  type="month"
                  value={volunteer.endDate || ''}
                  onChange={(e) => updateVolunteer(index, 'endDate', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
                  placeholder="YYYY-MM"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-6 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white/80 text-sm font-medium">Summary / Achievements</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-white/70 text-sm">
                      <input
                        type="checkbox"
                        checked={volunteer.useRichText !== false}
                        onChange={(e) => updateVolunteer(index, 'useRichText', e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-[#013f2e] focus:ring-[#013f2e]/50"
                      />
                      Use Rich Text
                    </label>
                  </div>
                </div>
                
                {volunteer.useRichText !== false ? (
                  <WYSIWYGEditor
                    value={volunteer.summary || ''}
                    onChange={(value) => updateVolunteer(index, 'summary', value)}
                    rows={3}
                    placeholder="Describe your volunteer work and impact..."
                    showToolbar={true}
                    showAIButton={true}
                    fieldType="other"
                    onAIGenerate={() => generateAISuggestions(index, volunteer)}
                    isGenerating={loadingSuggestions[index] || false}
                  />
                ) : (
                  <div className="space-y-3">
                    {(volunteer.highlights || []).map((highlight: string, hIndex: number) => (
                      <div key={hIndex} className="flex items-start gap-2">
                        <div className="mt-3 w-1.5 h-1.5 rounded-none bg-white/50 flex-shrink-0" />
                        <input
                          type="text"
                          value={highlight}
                          onChange={(e) => {
                            const newHighlights = [...(volunteer.highlights || [])];
                            newHighlights[hIndex] = e.target.value;
                            updateVolunteer(index, 'highlights', newHighlights);
                          }}
                          className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
                          placeholder="Achievement or key detail..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newHighlights = [...(volunteer.highlights || [])];
                            newHighlights.splice(hIndex, 1);
                            updateVolunteer(index, 'highlights', newHighlights);
                          }}
                          className="p-2 text-white/40 hover:text-red-400 transition-colors mt-0.5"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newHighlights = [...(volunteer.highlights || []), ''];
                        updateVolunteer(index, 'highlights', newHighlights);
                      }}
                      className="flex items-center gap-2 text-sm text-[#013f2e] hover:text-[#02523c] transition-colors mt-2"
                    >
                      <Plus size={14} />
                      Add Bullet Point
                    </button>
                  </div>
                )}
              </div>

              {showSuggestions[index] && (
                <div className="w-80 flex-shrink-0">
                  <AISuggestionsPanel
                    isVisible={showSuggestions[index] || false}
                    suggestions={suggestions[index] || []}
                    isLoading={loadingSuggestions[index] || false}
                    onSelect={(content) => handleSelectSuggestion(index, content)}
                    onClose={() => setShowSuggestions(prev => ({ ...prev, [index]: false }))}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {safeData.length > 0 && (
        <button
          onClick={handleAdd}
          className="w-full py-4 border-2 border-dashed border-[var(--border-primary)] hover:border-[#013f2e]/50 text-[color:var(--text-tertiary)] hover:text-[#013f2e] rounded-none transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Add another Volunteer Experience
        </button>
      )}
    </>
  );
};

export default VolunteerSection;
