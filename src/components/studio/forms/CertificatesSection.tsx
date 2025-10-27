'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Award, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

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

  const addCertificate = () => {
    const newCertificate = {
      name: '',
      date: '',
      issuer: '',
      url: '',
      description: ''
    };
    onUpdate('certificates', [...safeData, newCertificate]);
  };

  const removeCertificate = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate('certificates', updatedData);
  };

  const updateCertificate = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate('certificates', updatedData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <motion.button
          onClick={addCertificate}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#80FF00] text-black rounded-lg hover:bg-[#70e600] transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Certificate
        </motion.button>
      </div>

      {safeData.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          <Award className="w-12 h-12 mx-auto mb-4 text-white/40" />
          <p>No certifications added yet</p>
          <p className="text-sm">Click "Add Certificate" to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {safeData.map((certificate, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-2xl border border-white/10 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-medium text-white">
                  Certificate #{index + 1}
                </h4>
                <button
                  onClick={() => removeCertificate(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Certificate Name</label>
                  <input
                    type="text"
                    value={certificate.name || ''}
                    onChange={(e) => updateCertificate(index, 'name', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                    placeholder="e.g., AWS Certified Solutions Architect"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Date Issued</label>
                  <input
                    type="text"
                    value={certificate.date || ''}
                    onChange={(e) => updateCertificate(index, 'date', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                    placeholder="MM/YYYY"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Issuing Organization</label>
                  <input
                    type="text"
                    value={certificate.issuer || ''}
                    onChange={(e) => updateCertificate(index, 'issuer', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                    placeholder="e.g., Amazon Web Services, Microsoft"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Certificate URL (optional)</label>
                  <input
                    type="url"
                    value={certificate.url || ''}
                    onChange={(e) => updateCertificate(index, 'url', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                    placeholder="https://credential-url.com"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white/80 text-sm font-medium">Certificate Description</label>
                </div>
                <ProfessionalTextField
                  value={certificate.description || ''}
                  onChange={(value) => updateCertificate(index, 'description', value)}
                  placeholder="Brief description of the certification and its relevance..."
                  rows={3}
                  fieldId={`certificate-${index}`}
                  showFullToolbar={true}
                  showAIGenerate={true}
                  onAIGenerate={() => generateAIDescription(index, certificate)}
                  isGenerating={generatingIndex === index}
                />
              </div>

              {certificate.url && (
                <div className="mt-4">
                  <a
                    href={certificate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-[#80FF00] hover:text-[#70e600] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Certificate
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

export default CertificatesSection;