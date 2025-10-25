'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Heart, Sparkles, RefreshCw } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

interface VolunteerSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const VolunteerSection: React.FC<VolunteerSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  const themeClasses = getThemeClasses;
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const generateAIDescription = async (index: number, volunteerItem: any) => {
    setGeneratingIndex(index);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'volunteer',
          data: volunteerItem,
          context: 'volunteer experience'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onUpdate(`volunteer.${index}.summary`, result.description);
      }
    } catch (error) {
      console.error('Error generating description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  const addVolunteer = () => {
    const newVolunteer = {
      organization: '',
      position: '',
      url: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: []
    };
    onUpdate('volunteer', [...safeData, newVolunteer]);
  };

  const removeVolunteer = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate('volunteer', updatedData);
  };

  const updateVolunteer = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate('volunteer', updatedData);
  };

  const addHighlight = (index: number) => {
    const updatedData = [...safeData];
    updatedData[index].highlights = [...(updatedData[index].highlights || []), ''];
    onUpdate('volunteer', updatedData);
  };

  const updateHighlight = (index: number, highlightIndex: number, value: string) => {
    const updatedData = [...safeData];
    updatedData[index].highlights[highlightIndex] = value;
    onUpdate('volunteer', updatedData);
  };

  const removeHighlight = (index: number, highlightIndex: number) => {
    const updatedData = [...safeData];
    updatedData[index].highlights = updatedData[index].highlights.filter((_, i) => i !== highlightIndex);
    onUpdate('volunteer', updatedData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Volunteer Experience
        </h3>
        <motion.button
          onClick={addVolunteer}
          className="flex items-center gap-2 px-3 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Volunteer
        </motion.button>
      </div>

      {safeData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No volunteer experience added yet</p>
          <p className="text-sm">Click "Add Volunteer" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeData.map((volunteer, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Volunteer Experience #{index + 1}
                </h4>
                <button
                  onClick={() => removeVolunteer(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfessionalTextField
                  label="Organization"
                  value={volunteer.organization || ''}
                  onChange={(value) => updateVolunteer(index, 'organization', value)}
                  placeholder="e.g., Red Cross, Local Food Bank"
                />

                <ProfessionalTextField
                  label="Position"
                  value={volunteer.position || ''}
                  onChange={(value) => updateVolunteer(index, 'position', value)}
                  placeholder="e.g., Volunteer Coordinator, Event Organizer"
                />

                <ProfessionalTextField
                  label="Website (optional)"
                  value={volunteer.url || ''}
                  onChange={(value) => updateVolunteer(index, 'url', value)}
                  placeholder="https://organization.com"
                />

                <div className="grid grid-cols-2 gap-2">
                  <ProfessionalTextField
                    label="Start Date"
                    value={volunteer.startDate || ''}
                    onChange={(value) => updateVolunteer(index, 'startDate', value)}
                    placeholder="MM/YYYY"
                  />

                  <ProfessionalTextField
                    label="End Date"
                    value={volunteer.endDate || ''}
                    onChange={(value) => updateVolunteer(index, 'endDate', value)}
                    placeholder="MM/YYYY or Present"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <button
                    onClick={() => generateAIDescription(index, volunteer)}
                    disabled={generatingIndex === index}
                    className="flex items-center gap-1 text-xs text-lime-600 hover:text-lime-700 hover:underline disabled:opacity-50"
                  >
                    {generatingIndex === index ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {generatingIndex === index ? 'Generating...' : 'AI Generate'}
                  </button>
                </div>
                <textarea
                  value={volunteer.summary || ''}
                  onChange={(e) => updateVolunteer(index, 'summary', e.target.value)}
                  placeholder="Describe your volunteer work and impact..."
                  className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#313a28] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Key Achievements
                  </label>
                  <button
                    onClick={() => addHighlight(index)}
                    className="flex items-center gap-1 text-xs text-lime-600 hover:text-lime-700 hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    Add Achievement
                  </button>
                </div>
                <div className="space-y-2">
                  {(volunteer.highlights || []).map((highlight: string, highlightIndex: number) => (
                    <div key={highlightIndex} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={highlight}
                        onChange={(e) => updateHighlight(index, highlightIndex, e.target.value)}
                        placeholder="e.g., Organized fundraising event that raised $10,000"
                        className="flex-1 p-2 border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#313a28] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => removeHighlight(index, highlightIndex)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerSection;
