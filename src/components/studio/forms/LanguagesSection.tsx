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
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <motion.button
          onClick={addLanguage}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#80FF00] text-black rounded-lg hover:bg-[#70e600] transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Language
        </motion.button>
      </div>

      {safeData.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          <Globe className="w-12 h-12 mx-auto mb-4 text-white/40" />
          <p>No languages added yet</p>
          <p className="text-sm">Click "Add Language" to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {safeData.map((language, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-2xl border border-white/10 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-medium text-white">
                  Language #{index + 1}
                </h4>
                <button
                  onClick={() => removeLanguage(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Language</label>
                  <input
                    type="text"
                    value={language.language || ''}
                    onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                    placeholder="e.g., Spanish, French, Mandarin"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Proficiency Level</label>
                  <select
                    value={language.fluency || ''}
                    onChange={(e) => updateLanguage(index, 'fluency', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  >
                    <option value="" className="bg-gray-800 text-white">Select proficiency level</option>
                    {fluencyLevels.map((level) => (
                      <option key={level} value={level} className="bg-gray-800 text-white">
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