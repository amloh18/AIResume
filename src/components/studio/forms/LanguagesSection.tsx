'use client';

import React from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';

interface LanguagesSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
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

  const updateLanguage = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    if (!updatedData[index]) {
      updatedData[index] = { language: '', fluency: '' };
    }
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const duplicateLanguage = (index: number) => {
    const languageToDuplicate = safeData[index];
    if (languageToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(languageToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicateLanguage(index)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Duplicate this language"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => {
                  const updatedData = safeData.filter((_, i) => i !== index);
                  onUpdate(updatedData);
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete this language"
              >
                <Trash2 size={16} />
              </button>
            </div>
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
        onClick={() => {
          const newLanguage = {
            language: '',
            fluency: ''
          };
          onUpdate([...safeData, newLanguage]);
        }}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Language
      </button>
    </>
  );
};

export default LanguagesSection;