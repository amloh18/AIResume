'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface ReferencesSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
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

  const addReference = () => {
    const newReference = {
      name: '',
      reference: ''
    };
    onUpdate('references', (prevReferences: Array<{ name: string; reference: string }>) => {
      return [...(prevReferences || []), newReference];
    });
  };

  const removeReference = (index: number) => {
    onUpdate('references', (prevReferences: Array<{ name: string; reference: string }>) => {
      return (prevReferences || []).filter((_: any, i: number) => i !== index);
    });
  };

  const updateReference = (index: number, field: string, value: any) => {
    onUpdate('references', (prevReferences: Array<{ name: string; reference: string }>) => {
      const newArray = [...(prevReferences || [])];
      if (!newArray[index]) {
        newArray[index] = { name: '', reference: '' };
      }
      newArray[index] = { ...newArray[index], [field]: value };
      return newArray;
    });
  };

  return (
    <>
      {safeData.map((reference, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{reference.name || 'Reference Name'}</h4>
            <button
              onClick={() => removeReference(index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={reference.name || ''}
                onChange={(e) => updateReference(index, 'name', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Dr. John Smith"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Reference Details</label>
              <textarea
                value={reference.reference || ''}
                onChange={(e) => updateReference(index, 'reference', e.target.value)}
                placeholder="Include: Title, Company, Phone, Email, Relationship"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                rows={4}
              />
            </div>
          </div>
        </div>
      ))}
      
      <button
        onClick={addReference}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Reference
      </button>
    </>
  );
};

export default ReferencesSection;
