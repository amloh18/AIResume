'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';

interface VolunteerSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const VolunteerSection: React.FC<VolunteerSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const addVolunteer = () => {
    const newVolunteer = {
      organization: '',
      position: '',
      startDate: '',
      endDate: '',
      summary: ''
    };
    onUpdate('volunteer', (prevVolunteer: Array<{ organization: string; position: string; url: string; startDate: string; endDate: string; summary: string; highlights: string[] }>) => {
      return [...(prevVolunteer || []), newVolunteer];
    });
  };

  const removeVolunteer = (index: number) => {
    onUpdate('volunteer', (prevVolunteer: Array<{ organization: string; position: string; url: string; startDate: string; endDate: string; summary: string; highlights: string[] }>) => {
      return (prevVolunteer || []).filter((_: any, i: number) => i !== index);
    });
  };

  const updateVolunteer = (index: number, field: string, value: any) => {
    onUpdate('volunteer', (prevVolunteer: Array<{ organization: string; position: string; url: string; startDate: string; endDate: string; summary: string; highlights: string[] }>) => {
      const newArray = [...(prevVolunteer || [])];
      if (!newArray[index]) {
        newArray[index] = { organization: '', position: '', url: '', startDate: '', endDate: '', summary: '', highlights: [] };
      }
      newArray[index] = { ...newArray[index], [field]: value };
      return newArray;
    });
  };

  return (
    <>
      {safeData.map((volunteer, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{volunteer.organization || 'Organization'}</h4>
            <button
              onClick={() => removeVolunteer(index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Organization</label>
              <input
                type="text"
                value={volunteer.organization || ''}
                onChange={(e) => updateVolunteer(index, 'organization', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Red Cross"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Position</label>
              <input
                type="text"
                value={volunteer.position || ''}
                onChange={(e) => updateVolunteer(index, 'position', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Volunteer Coordinator"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Start Date</label>
              <input
                type="text"
                value={volunteer.startDate || ''}
                onChange={(e) => updateVolunteer(index, 'startDate', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="January 2022"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">End Date</label>
              <input
                type="text"
                value={volunteer.endDate || ''}
                onChange={(e) => updateVolunteer(index, 'endDate', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="December 2022"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Description</label>
              <WYSIWYGToolbar />
            </div>
            <WYSIWYGEditor
              value={volunteer.summary || ''}
              onChange={(value) => updateVolunteer(index, 'summary', value)}
              rows={3}
              placeholder="Describe your volunteer work and impact..."
            />
          </div>
        </div>
      ))}
      
      <button
        onClick={addVolunteer}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Volunteer Experience
      </button>
    </>
  );
};

export default VolunteerSection;
