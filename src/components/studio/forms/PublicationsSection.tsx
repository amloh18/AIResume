'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';

interface PublicationsSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const PublicationsSection: React.FC<PublicationsSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const addPublication = () => {
    const newPublication = {
      name: '',
      publisher: '',
      releaseDate: '',
      url: '',
      summary: ''
    };
    onUpdate('publications', (prevPublications) => {
      return [...(prevPublications || []), newPublication];
    });
  };

  const removePublication = (index: number) => {
    onUpdate('publications', (prevPublications) => {
      return (prevPublications || []).filter((_, i) => i !== index);
    });
  };

  const updatePublication = (index: number, field: string, value: any) => {
    onUpdate('publications', (prevPublications) => {
      const newArray = [...(prevPublications || [])];
      if (!newArray[index]) {
        newArray[index] = {};
      }
      newArray[index] = { ...newArray[index], [field]: value };
      return newArray;
    });
  };

  return (
    <>
      {safeData.map((publication, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{publication.name || 'Publication Title'}</h4>
            <button
              onClick={() => removePublication(index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={publication.name || ''}
                onChange={(e) => updatePublication(index, 'name', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Advanced Machine Learning Techniques"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Publisher</label>
              <input
                type="text"
                value={publication.publisher || ''}
                onChange={(e) => updatePublication(index, 'publisher', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="IEEE, ACM, Nature"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Release Date</label>
              <input
                type="text"
                value={publication.releaseDate || ''}
                onChange={(e) => updatePublication(index, 'releaseDate', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="2023"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">URL</label>
              <input
                type="url"
                value={publication.url || ''}
                onChange={(e) => updatePublication(index, 'url', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="https://publication-url.com"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Summary</label>
              <WYSIWYGToolbar />
            </div>
            <WYSIWYGEditor
              value={publication.summary || ''}
              onChange={(value) => updatePublication(index, 'summary', value)}
              rows={3}
              placeholder="Brief description of the publication and its significance..."
            />
          </div>
        </div>
      ))}
      
      <button
        onClick={addPublication}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Publication
      </button>
    </>
  );
};

export default PublicationsSection;
