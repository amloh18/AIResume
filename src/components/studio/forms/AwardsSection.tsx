'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Trophy, Sparkles, RefreshCw } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

interface AwardsSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const AwardsSection: React.FC<AwardsSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  const themeClasses = getThemeClasses;
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const generateAIDescription = async (index: number, awardItem: any) => {
    setGeneratingIndex(index);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'award',
          data: awardItem,
          context: 'award recognition'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onUpdate(`awards.${index}.summary`, result.description);
      }
    } catch (error) {
      console.error('Error generating description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  const addAward = () => {
    const newAward = {
      title: '',
      date: '',
      awarder: '',
      summary: ''
    };
    onUpdate('awards', [...safeData, newAward]);
  };

  const removeAward = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate('awards', updatedData);
  };

  const updateAward = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate('awards', updatedData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Awards & Recognition
        </h3>
        <motion.button
          onClick={addAward}
          className="flex items-center gap-2 px-3 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Award
        </motion.button>
      </div>

      {safeData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No awards or recognition added yet</p>
          <p className="text-sm">Click "Add Award" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeData.map((award, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1a230f] border border-gray-200 dark:border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Award #{index + 1}
                </h4>
                <button
                  onClick={() => removeAward(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfessionalTextField
                  label="Award Title"
                  value={award.title || ''}
                  onChange={(value) => updateAward(index, 'title', value)}
                  placeholder="e.g., Employee of the Year, Best Innovation Award"
                />

                <ProfessionalTextField
                  label="Date Received"
                  value={award.date || ''}
                  onChange={(value) => updateAward(index, 'date', value)}
                  placeholder="MM/YYYY"
                />

                <ProfessionalTextField
                  label="Awarding Organization"
                  value={award.awarder || ''}
                  onChange={(value) => updateAward(index, 'awarder', value)}
                  placeholder="e.g., Company Name, Professional Association"
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <button
                    onClick={() => generateAIDescription(index, award)}
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
                  value={award.summary || ''}
                  onChange={(e) => updateAward(index, 'summary', e.target.value)}
                  placeholder="Describe the award, criteria, and significance..."
                  className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#313a28] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AwardsSection;
