'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

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
    <>
      {safeData.map((language, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{language.language || 'Language'}</h4>
            <button
              onClick={() => removeLanguage(index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Language Name</label>
              <input
                type="text"
                value={language.language || ''}
                onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="English"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Fluency Level</label>
              <select
                value={language.fluency || ''}
                onChange={(e) => updateLanguage(index, 'fluency', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
              >
                <option value="">Select fluency level</option>
                <option value="Native">Native</option>
                <option value="Fluent">Fluent</option>
                <option value="Advanced">Advanced</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Basic">Basic</option>
              </select>
            </div>
          </div>
        </div>
      ))}
      
      <button
        onClick={addLanguage}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Language
      </button>
    </>
  );
};

export default LanguagesSection;