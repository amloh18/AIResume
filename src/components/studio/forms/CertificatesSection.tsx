'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Award, ExternalLink } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

interface CertificatesSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const CertificatesSection: React.FC<CertificatesSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  const themeClasses = getThemeClasses;
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const addCertificate = () => {
    const newCertificate = {
      name: '',
      date: '',
      issuer: '',
      url: ''
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
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-end">
        <motion.button
          onClick={addCertificate}
          className="flex items-center gap-2 px-3 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Certificate
        </motion.button>
      </div>

      {safeData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No certifications added yet</p>
          <p className="text-sm">Click "Add Certificate" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeData.map((certificate, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Certificate #{index + 1}
                </h4>
                <button
                  onClick={() => removeCertificate(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfessionalTextField
                  label="Certificate Name"
                  value={certificate.name || ''}
                  onChange={(value) => updateCertificate(index, 'name', value)}
                  placeholder="e.g., AWS Certified Solutions Architect"
                  showFullToolbar={false}
                  showFormattingHelp={false}
                  showStatistics={false}
                  showPreview={false}
                />

                <ProfessionalTextField
                  label="Date Issued"
                  value={certificate.date || ''}
                  onChange={(value) => updateCertificate(index, 'date', value)}
                  placeholder="MM/YYYY"
                  showFullToolbar={false}
                  showFormattingHelp={false}
                  showStatistics={false}
                  showPreview={false}
                />

                <ProfessionalTextField
                  label="Issuing Organization"
                  value={certificate.issuer || ''}
                  onChange={(value) => updateCertificate(index, 'issuer', value)}
                  placeholder="e.g., Amazon Web Services, Microsoft"
                  showFullToolbar={false}
                  showFormattingHelp={false}
                  showStatistics={false}
                  showPreview={false}
                />

                <ProfessionalTextField
                  label="Certificate URL (optional)"
                  value={certificate.url || ''}
                  onChange={(value) => updateCertificate(index, 'url', value)}
                  placeholder="https://credential-url.com"
                  showFullToolbar={false}
                  showFormattingHelp={false}
                  showStatistics={false}
                  showPreview={false}
                />
              </div>

              {certificate.url && (
                <div className="mt-3">
                  <a
                    href={certificate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-lime-600 hover:text-lime-700 hover:underline"
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