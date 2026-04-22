'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { EmptyStateSkeleton } from '@/components/ui/EmptyStateSkeleton';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '@/components/ai/AISuggestionsPanel';

interface PublicationsSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  jobData?: any;
  userId?: string;
}

const PublicationsSection: React.FC<PublicationsSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove,
  jobData,
  userId
}) => {
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [suggestions, setSuggestions] = useState<{ [key: number]: Array<{ method: string; content: string }> }>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});

  const updatePublication = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    if (!updatedData[index]) {
      updatedData[index] = { name: '', publisher: '', releaseDate: '', url: '', summary: '' };
    }
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const duplicatePublication = (index: number) => {
    const publicationToDuplicate = safeData[index];
    if (publicationToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(publicationToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
  };

  const generateAISuggestions = async (index: number, publicationItem: any) => {
    if (!userId) return;
    
    setLoadingSuggestions({ ...loadingSuggestions, [index]: true });
    setShowSuggestions({ ...showSuggestions, [index]: true });
    
    try {
      const response = await fetch('/api/ai/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobData,
          sectionData: publicationItem,
          sectionType: 'publication',
          currentText: publicationItem.summary || '',
          cvData: {}
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const result = await response.json();
      setSuggestions({ ...suggestions, [index]: result.suggestions });
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      setShowSuggestions({ ...showSuggestions, [index]: false });
    } finally {
      setLoadingSuggestions({ ...loadingSuggestions, [index]: false });
    }
  };

  const handleSelectSuggestion = (index: number, content: string) => {
    updatePublication(index, 'summary', content);
    setShowSuggestions({ ...showSuggestions, [index]: false });
  };

  return (
    <>
      {safeData.length === 0 ? (
          <EmptyStateSkeleton onAdd={() => {
            onUpdate([...safeData, { name: '', publisher: '', releaseDate: '', url: '', summary: '' }]);
          }} itemName="Publication" />
        ) : safeData.map((publication, index) => (
        <div key={index} className="bg-white/5 rounded-none p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{publication.name || 'Publication Title'}</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicatePublication(index)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Duplicate this publication"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => {
                  const updatedData = safeData.filter((_, i) => i !== index);
                  onUpdate(updatedData);
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete this publication"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={publication.name || ''}
                onChange={(e) => updatePublication(index, 'name', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Advanced Machine Learning Techniques"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Publisher</label>
              <input
                type="text"
                value={publication.publisher || ''}
                onChange={(e) => updatePublication(index, 'publisher', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="IEEE, ACM, Nature"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Release Date</label>
              <input
                type="month"
                value={publication.releaseDate || ''}
                onChange={(e) => updatePublication(index, 'releaseDate', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="YYYY-MM"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">URL</label>
              <input
                type="url"
                value={publication.url || ''}
                onChange={(e) => updatePublication(index, 'url', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="https://publication-url.com"
              />
            </div>
        </div>

        <div className="mt-4 flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Summary / Highlights</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-white/70 text-sm">
                  <input
                    type="checkbox"
                    checked={publication.useRichText !== false}
                    onChange={(e) => updatePublication(index, 'useRichText', e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-[#80FF00] focus:ring-[#80FF00]/50"
                  />
                  Use Rich Text
                </label>
              </div>
            </div>
            
            {publication.useRichText !== false ? (
              <WYSIWYGEditor
                value={publication.summary || ''}
                onChange={(value) => updatePublication(index, 'summary', value)}
                rows={3}
                placeholder="Brief description of the publication and its significance..."
                showToolbar={true}
                showAIButton={true}
                fieldType="other"
                onAIGenerate={() => generateAISuggestions(index, publication)}
                isGenerating={loadingSuggestions[index] || false}
              />
            ) : (
              <div className="space-y-3">
                {(publication.highlights || []).map((highlight: string, hIndex: number) => (
                  <div key={hIndex} className="flex items-start gap-2">
                    <div className="mt-3 w-1.5 h-1.5 rounded-none bg-white/50 flex-shrink-0" />
                    <input
                      type="text"
                      value={highlight}
                      onChange={(e) => {
                        const newHighlights = [...(publication.highlights || [])];
                        newHighlights[hIndex] = e.target.value;
                        updatePublication(index, 'highlights', newHighlights);
                      }}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Highlight or key detail..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newHighlights = [...(publication.highlights || [])];
                        newHighlights.splice(hIndex, 1);
                        updatePublication(index, 'highlights', newHighlights);
                      }}
                      className="p-2 text-white/40 hover:text-red-400 transition-colors mt-0.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newHighlights = [...(publication.highlights || []), ''];
                    updatePublication(index, 'highlights', newHighlights);
                  }}
                  className="flex items-center gap-2 text-sm text-[#80FF00] hover:text-[#70e600] transition-colors mt-2"
                >
                  <Plus size={14} />
                  Add Bullet Point
                </button>
              </div>
            )}
          </div>

          {showSuggestions[index] && (
            <div className="w-80 flex-shrink-0">
              <AISuggestionsPanel
                isVisible={showSuggestions[index] || false}
                suggestions={suggestions[index] || []}
                isLoading={loadingSuggestions[index] || false}
                onSelect={(content) => handleSelectSuggestion(index, content)}
                onClose={() => setShowSuggestions({ ...showSuggestions, [index]: false })}
              />
            </div>
          )}
        </div>
      </div>
      ))}
      
      {safeData.length > 0 && (
        <button
          onClick={() => {
            const newPublication = { name: '', publisher: '', releaseDate: '', url: '', summary: '' };
            onUpdate([...safeData, newPublication]);
          }}
          className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-none transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Add another Publication
        </button>
      )}
    </>
  );
};

export default PublicationsSection;
