'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Code } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';

interface SkillsSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  const themeClasses = getThemeClasses;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-green-600" />
          <h4 className={`font-medium ${themeClasses.text.primary}`}>
            Skills
          </h4>
        </div>
        <motion.button
          onClick={onAdd}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm ${themeClasses.button.primary} rounded-lg`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </motion.button>
      </div>

      <div className="space-y-4">
        {data.map((skill, index) => (
          <div key={index} className={`${themeClasses.card.base} border rounded-lg p-4`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={skill.name || ''}
                onChange={(e) => onUpdate(`skills.${index}.name`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
                placeholder="Skill Name"
              />
              <select
                value={skill.level || ''}
                onChange={(e) => onUpdate(`skills.${index}.level`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
              >
                <option value="">Select Level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
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

export default SkillsSection;