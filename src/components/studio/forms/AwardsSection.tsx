'use client';

import React from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';

interface AwardsSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const AwardsSection: React.FC<AwardsSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const updateAward = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const duplicateAward = (index: number) => {
    const awardToDuplicate = safeData[index];
    if (awardToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(awardToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
  };

  return (
    <>
          {safeData.map((award, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
              <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{award.title || 'Award Title'}</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => duplicateAward(index)}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    title="Duplicate this award"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => onRemove(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Delete this award"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Award Title</label>
              <input
                type="text"
                  value={award.title || ''}
                onChange={(e) => updateAward(index, 'title', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Employee of the Year"
                />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Date</label>
              <input
                type="text"
                  value={award.date || ''}
                onChange={(e) => updateAward(index, 'date', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="2023"
                />
            </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Description</label>
              <WYSIWYGToolbar />
                </div>
            <WYSIWYGEditor
                  value={award.summary || ''}
              onChange={(value) => updateAward(index, 'summary', value)}
                  rows={3}
              placeholder="Describe the award and its significance..."
                />
              </div>
        </div>
      ))}
      
      <button
        onClick={onAdd}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Award
      </button>
    </>
  );
};

export default AwardsSection;
