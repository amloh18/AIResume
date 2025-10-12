'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Globe } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

interface LanguagesSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const LanguagesSection: React.FC<LanguagesSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  const themeClasses = getThemeClasses;
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const addLanguage = () => {
    const newLanguage = {
      language: '',
      fluency: ''
    };
    onUpdate('languages', [...safeData, newLanguage]);
  };

  const removeLanguage = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate('languages', updatedData);
  };

  const updateLanguage = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate('languages', updatedData);
  };

  const fluencyLevels = [
    'Basic',
    'Intermediate', 
    'Advanced',
    'Native'
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-end">
        <motion.button
          onClick={addLanguage}
          className="flex items-center gap-2 px-3 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Language
        </motion.button>
      </div>

      {safeData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No languages added yet</p>
          <p className="text-sm">Click "Add Language" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeData.map((language, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Language #{index + 1}
                </h4>
                <button
                  onClick={() => removeLanguage(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfessionalTextField
                  label="Language"
                  value={language.language || ''}
                  onChange={(value) => updateLanguage(index, 'language', value)}
                  placeholder="e.g., Spanish, French, Mandarin"
                  showFullToolbar={false}
                  showFormattingHelp={false}
                  showStatistics={false}
                  showPreview={false}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Proficiency Level
                  </label>
                  <select
                    value={language.fluency || ''}
                    onChange={(e) => updateLanguage(index, 'fluency', e.target.value)}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  >
                    <option value="">Select proficiency level</option>
                    {fluencyLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguagesSection;