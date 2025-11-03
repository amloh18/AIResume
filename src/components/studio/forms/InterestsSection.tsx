'use client';

import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

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
  const [newKeyword, setNewKeyword] = useState('');
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const addInterest = () => {
    const newInterest = {
      name: '',
      keywords: []
    };
    onUpdate('interests', (prevInterests: Array<{ name: string; keywords: string[] }>) => {
      return [...(prevInterests || []), newInterest];
    });
  };

  const removeInterest = (index: number) => {
    onUpdate('interests', (prevInterests: Array<{ name: string; keywords: string[] }>) => {
      return (prevInterests || []).filter((_: any, i: number) => i !== index);
    });
  };

  const updateInterest = (index: number, field: string, value: any) => {
    onUpdate('interests', (prevInterests: Array<{ name: string; keywords: string[] }>) => {
      const newArray = [...(prevInterests || [])];
      if (!newArray[index]) {
        newArray[index] = { name: '', keywords: [] };
      }
      newArray[index] = { ...newArray[index], [field]: value };
      return newArray;
    });
  };

  const addKeyword = (index: number) => {
    if (newKeyword.trim()) {
      onUpdate('interests', (prevInterests: Array<{ name: string; keywords: string[] }>) => {
        const newArray = [...(prevInterests || [])];
        if (!newArray[index]) {
          newArray[index] = { name: '', keywords: [] };
        }
        newArray[index] = {
          ...newArray[index],
          keywords: [...(newArray[index].keywords || []), newKeyword.trim()]
        };
        return newArray;
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number, keywordIndex: number) => {
    onUpdate('interests', (prevInterests: Array<{ name: string; keywords: string[] }>) => {
      const newArray = [...(prevInterests || [])];
      if (newArray[index] && Array.isArray(newArray[index].keywords)) {
        newArray[index] = {
          ...newArray[index],
          keywords: newArray[index].keywords.filter((_, i) => i !== keywordIndex)
        };
      }
      return newArray;
    });
  };

  return (
    <>
      {safeData.map((interest, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{interest.name || 'Interest Name'}</h4>
            <button
              onClick={() => removeInterest(index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Interest Name</label>
              <input
                type="text"
                value={interest.name || ''}
                onChange={(e) => updateInterest(index, 'name', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Photography, Rock Climbing, Cooking"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Keywords</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add a keyword..."
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword(index)}
                />
                <button
                  onClick={() => addKeyword(index)}
                  className="px-4 py-3 bg-[#80FF00] text-black rounded-lg hover:bg-[#70e600] transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {(interest.keywords || []).map((keyword: string, keywordIndex: number) => (
                  <span
                    key={keywordIndex}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#80FF00]/20 text-[#80FF00] rounded-full text-sm"
                  >
                    {keyword}
                    <button
                      onClick={() => removeKeyword(index, keywordIndex)}
                      className="text-[#80FF00] hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <button
        onClick={addInterest}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Interest
      </button>
    </>
  );
};

export default InterestsSection;
