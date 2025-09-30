'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, BookOpen, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

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
  const themeClasses = getThemeClasses;
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const generateAIDescription = async (index: number, publicationItem: any) => {
    setGeneratingIndex(index);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'publication',
          data: publicationItem,
          context: 'publication summary'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onUpdate(`publications.${index}.summary`, result.description);
      }
    } catch (error) {
      console.error('Error generating description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  const addPublication = () => {
    const newPublication = {
      name: '',
      publisher: '',
      releaseDate: '',
      url: '',
      summary: ''
    };
    onUpdate('publications', [...safeData, newPublication]);
  };

  const removePublication = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate('publications', updatedData);
  };

  const updatePublication = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate('publications', updatedData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-500" />
          Publications
        </h3>
        <motion.button
          onClick={addPublication}
          className="flex items-center gap-2 px-3 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Publication
        </motion.button>
      </div>

      {safeData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No publications added yet</p>
          <p className="text-sm">Click "Add Publication" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeData.map((publication, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Publication #{index + 1}
                </h4>
                <button
                  onClick={() => removePublication(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfessionalTextField
                  label="Publication Title"
                  value={publication.name || ''}
                  onChange={(value) => updatePublication(index, 'name', value)}
                  placeholder="e.g., Advanced Machine Learning Techniques"
                />

                <ProfessionalTextField
                  label="Publisher"
                  value={publication.publisher || ''}
                  onChange={(value) => updatePublication(index, 'publisher', value)}
                  placeholder="e.g., IEEE, ACM, Nature"
                />

                <ProfessionalTextField
                  label="Release Date"
                  value={publication.releaseDate || ''}
                  onChange={(value) => updatePublication(index, 'releaseDate', value)}
                  placeholder="MM/YYYY"
                />

                <ProfessionalTextField
                  label="URL (optional)"
                  value={publication.url || ''}
                  onChange={(value) => updatePublication(index, 'url', value)}
                  placeholder="https://publication-url.com"
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Summary
                  </label>
                  <button
                    onClick={() => generateAIDescription(index, publication)}
                    disabled={generatingIndex === index}
                    className="flex items-center gap-1 text-xs text-lime-600 hover:text-lime-700 hover:underline disabled:opacity-50"
                  >
                    {generatingIndex === index ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {generatingIndex === index ? 'Generating...' : 'AI Generate'}
                  </button>
                </div>
                <textarea
                  value={publication.summary || ''}
                  onChange={(e) => updatePublication(index, 'summary', e.target.value)}
                  placeholder="Brief description of the publication and its significance..."
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {publication.url && (
                <div className="mt-3">
                  <a
                    href={publication.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-lime-600 hover:text-lime-700 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Publication
                  </a>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicationsSection;
