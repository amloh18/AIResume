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
  
  // Debug logging to understand data structure
  console.log('🔍 SkillsSection - data:', data);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <motion.button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#80FF00] text-black rounded-lg hover:bg-[#70e600] transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Skill Category
        </motion.button>
      </div>

      <div className="space-y-6">
        {safeData.map((skill, index) => (
          <div key={index} className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Skill Category</label>
                <input
                  type="text"
                  value={skill.category || skill.name || ''}
                  onChange={(e) => onUpdate(`skills.${index}.category`, e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="Programming Languages"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Skills</label>
                <input
                  type="text"
                  value={Array.isArray(skill.skills) ? skill.skills.join(', ') : (skill.keywords || []).join(', ')}
                  onChange={(e) => {
                    const skillsArray = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                    onUpdate(`skills.${index}.skills`, skillsArray);
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  placeholder="JavaScript, Python, Java, React"
                />
                <p className="text-white/50 text-xs mt-1">Separate multiple skills with commas</p>
              </div>
            </div>

            <div className="flex justify-end">
              <motion.button
                onClick={() => onRemove(index)}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-4 h-4" />
                Remove Category
              </motion.button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillsSection;