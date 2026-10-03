'use client';

import React from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';

interface ReferencesSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const ReferencesSection: React.FC<ReferencesSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const updateReference = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    if (!updatedData[index]) {
      updatedData[index] = { name: '', reference: '' };
    }
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const duplicateReference = (index: number) => {
    const referenceToDuplicate = safeData[index];
    if (referenceToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(referenceToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
  };

  return (
    <>
      {safeData.map((reference, index) => (
        <div key={index} className="bg-white/5 rounded-none p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{reference.name || 'Reference Name'}</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicateReference(index)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Duplicate this reference"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => {
                  const updatedData = safeData.filter((_, i) => i !== index);
                  onUpdate(updatedData);
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete this reference"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={reference.name || ''}
                onChange={(e) => updateReference(index, 'name', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
                placeholder="Dr. John Smith"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Reference Details</label>
              <textarea
                value={reference.reference || ''}
                onChange={(e) => updateReference(index, 'reference', e.target.value)}
                placeholder="Include: Title, Company, Phone, Email, Relationship"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
                rows={4}
              />
            </div>
          </div>
        </div>
      ))}
      
      <button
        onClick={() => {
          const newReference = { name: '', reference: '' };
          onUpdate([...safeData, newReference]);
        }}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#013f2e]/50 text-white/60 hover:text-[#013f2e] rounded-none transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Reference
      </button>
    </>
  );
};

export default ReferencesSection;
