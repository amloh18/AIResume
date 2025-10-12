'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Heart, X } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

interface InterestsSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const InterestsSection: React.FC<InterestsSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  const themeClasses = getThemeClasses;
  const [newKeyword, setNewKeyword] = useState('');
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const addInterest = () => {
    const newInterest = {
      name: '',
      keywords: []
    };
    onUpdate('interests', [...safeData, newInterest]);
  };

  const removeInterest = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate('interests', updatedData);
  };

  const updateInterest = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate('interests', updatedData);
  };

  const addKeyword = (index: number) => {
    if (newKeyword.trim()) {
      const updatedData = [...safeData];
      updatedData[index].keywords = [...(updatedData[index].keywords || []), newKeyword.trim()];
      onUpdate('interests', updatedData);
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number, keywordIndex: number) => {
    const updatedData = [...safeData];
    updatedData[index].keywords = updatedData[index].keywords.filter((_, i) => i !== keywordIndex);
    onUpdate('interests', updatedData);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-end">
        <motion.button
          onClick={addInterest}
          className="flex items-center gap-2 px-3 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Interest
        </motion.button>
      </div>

      {safeData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No interests added yet</p>
          <p className="text-sm">Click "Add Interest" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeData.map((interest, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Interest #{index + 1}
                </h4>
                <button
                  onClick={() => removeInterest(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <ProfessionalTextField
                  label="Interest Name"
                  value={interest.name || ''}
                  onChange={(value) => updateInterest(index, 'name', value)}
                  placeholder="e.g., Photography, Rock Climbing, Cooking"
                  showFormattingHelp={false}
                  showStatistics={false}
                  showPreview={false}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Keywords & Skills
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Add a keyword..."
                      className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && addKeyword(index)}
                    />
                    <button
                      onClick={() => addKeyword(index)}
                      className="px-3 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {(interest.keywords || []).map((keyword: string, keywordIndex: number) => (
                      <span
                        key={keywordIndex}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-lime-100 dark:bg-lime-900/20 text-lime-800 dark:text-lime-200 rounded-full text-sm"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword(index, keywordIndex)}
                          className="text-lime-600 hover:text-lime-800 dark:text-lime-300 dark:hover:text-lime-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterestsSection;
