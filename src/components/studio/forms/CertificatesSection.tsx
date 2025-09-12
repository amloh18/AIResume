'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Award, Sparkles, RefreshCw } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';

interface CertificatesSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  jobData?: any;
  userId?: string;
}

const CertificatesSection: React.FC<CertificatesSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove,
  jobData,
  userId
}) => {
  const themeClasses = getThemeClasses;
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  
  // Debug logging to understand data structure
  console.log('🔍 CertificatesSection - data:', data);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const generateAIDescription = async (index: number, certificateItem: any) => {
    if (!userId) return;
    
    setGeneratingIndex(index);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobData,
          certificateItem,
          type: 'certificate'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const result = await response.json();
      onUpdate(`certificates.${index}.description`, result.description);
    } catch (error) {
      console.error('Error generating AI description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-600" />
          <h4 className={`font-medium ${themeClasses.text.primary}`}>
            Certificates
          </h4>
        </div>
        <motion.button
          onClick={onAdd}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm ${themeClasses.button.primary} rounded-lg`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Certificate
        </motion.button>
      </div>

      <div className="space-y-4">
        {safeData.map((certificate, index) => (
          <div key={index} className={`${themeClasses.card.base} border rounded-lg p-4`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={certificate.name || ''}
                onChange={(e) => onUpdate(`certificates.${index}.name`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
                placeholder="Certificate Name"
              />
              <input
                type="text"
                value={certificate.issuer || ''}
                onChange={(e) => onUpdate(`certificates.${index}.issuer`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
                placeholder="Issuing Organization"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={certificate.date || ''}
                onChange={(e) => onUpdate(`certificates.${index}.date`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
                placeholder="Issue Date"
              />
              <input
                type="url"
                value={certificate.url || ''}
                onChange={(e) => onUpdate(`certificates.${index}.url`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
                placeholder="Certificate URL"
              />
            </div>

            {/* Description Field */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                  Certificate Description
                </label>
                <motion.button
                  onClick={() => generateAIDescription(index, certificate)}
                  disabled={generatingIndex === index || !certificate.name || !certificate.issuer}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {generatingIndex === index ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>{generatingIndex === index ? 'Generating...' : 'AI Generate'}</span>
                </motion.button>
              </div>
              <textarea
                value={certificate.description || ''}
                onChange={(e) => onUpdate(`certificates.${index}.description`, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} resize-none`}
                placeholder="Describe what you learned, skills gained, or how this certificate is relevant. Use AI to generate content based on certificate name and issuer..."
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <motion.button
                onClick={() => onRemove(index)}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </motion.button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CertificatesSection;