'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';

interface CertificatesSectionProps {
  data: any[];
  onUpdate: (data: any[]) => void;
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
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const updateCertificate = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    if (!updatedData[index]) {
      updatedData[index] = { name: '', date: '', issuer: '', url: '', description: '' };
    }
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate(updatedData);
  };

  const duplicateCertificate = (index: number) => {
    const certificateToDuplicate = safeData[index];
    if (certificateToDuplicate) {
      const duplicated = JSON.parse(JSON.stringify(certificateToDuplicate));
      const updatedData = [...safeData];
      updatedData.splice(index + 1, 0, duplicated);
      onUpdate(updatedData);
    }
  };

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
      updateCertificate(index, 'description', result.description);
    } catch (error) {
      console.error('Error generating AI description:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  return (
    <>
      {safeData.map((certificate, index) => (
        <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">{certificate.name || 'Certification Name'}</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicateCertificate(index)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Duplicate this certificate"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => {
                  const updatedData = safeData.filter((_, i) => i !== index);
                  onUpdate(updatedData);
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete this certificate"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Certification Name</label>
              <input
                type="text"
                value={certificate.name || ''}
                onChange={(e) => updateCertificate(index, 'name', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="AWS Certified Solutions Architect"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Issuer</label>
              <input
                type="text"
                value={certificate.issuer || ''}
                onChange={(e) => updateCertificate(index, 'issuer', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Amazon Web Services"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Date</label>
              <input
                type="text"
                value={certificate.date || ''}
                onChange={(e) => updateCertificate(index, 'date', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="2023"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">URL</label>
              <input
                type="url"
                value={certificate.url || ''}
                onChange={(e) => updateCertificate(index, 'url', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="https://aws.amazon.com/certification/"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Description</label>
              <WYSIWYGToolbar />
            </div>
            <WYSIWYGEditor
              value={certificate.description || ''}
              onChange={(value) => updateCertificate(index, 'description', value)}
              rows={3}
              placeholder="Describe the certification, its relevance, or what you learned..."
            />
          </div>
        </div>
      ))}
      
      <button
        onClick={() => {
          const newCertificate = {
            name: '',
            date: '',
            issuer: '',
            url: '',
            description: ''
          };
          onUpdate([...safeData, newCertificate]);
        }}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/60 hover:text-[#80FF00] rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Certification
      </button>
    </>
  );
};

export default CertificatesSection;