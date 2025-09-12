'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Globe } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';

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
  
  // Debug logging to understand data structure
  console.log('🔍 LanguagesSection - data:', data);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-600" />
          <h4 className={`font-medium ${themeClasses.text.primary}`}>
            Languages
          </h4>
        </div>
        <motion.button
          onClick={onAdd}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm ${themeClasses.button.primary} rounded-lg`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Language
        </motion.button>
      </div>

      <div className="space-y-4">
        {safeData.map((language, index) => (
          <div key={index} className={`${themeClasses.card.base} border rounded-lg p-4`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={language.language || ''}
                onChange={(e) => onUpdate(`languages.${index}.language`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
                placeholder="Language"
              />
              <select
                value={language.fluency || ''}
                onChange={(e) => onUpdate(`languages.${index}.fluency`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
              >
                <option value="">Select Fluency</option>
                <option value="Native">Native</option>
                <option value="Fluent">Fluent</option>
                <option value="Conversational">Conversational</option>
                <option value="Basic">Basic</option>
              </select>
            </div>

            <div className="flex justify-end">
              <motion.button
                onClick={() => onRemove(index)}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </motion.button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LanguagesSection;