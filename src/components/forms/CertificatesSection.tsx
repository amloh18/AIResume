'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '@/components/ai/AISuggestionsPanel';

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
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [suggestions, setSuggestions] = useState<{ [key: number]: Array<{ method: string; content: string }> }>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});
  
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

  const generateAISuggestions = async (index: number, certificateItem: any) => {
    if (!userId) {
      console.error('❌ CertificatesSection - No userId provided for AI suggestions');
      return;
    }
    
    // Show panel immediately and set loading state using functional updates
    setShowSuggestions(prev => ({ ...prev, [index]: true }));
    setLoadingSuggestions(prev => ({ ...prev, [index]: true }));
    
    try {
      const response = await fetch('/api/ai/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobData,
          sectionData: certificateItem,
          sectionType: 'certificate',
          currentText: certificateItem.description || '',
          cvData: {}
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate suggestions: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ CertificatesSection - AI suggestions received:', result);
      
      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setSuggestions(prev => ({ ...prev, [index]: result.suggestions }));
      } else {
        console.error('❌ CertificatesSection - Invalid suggestions format:', result);
        setShowSuggestions(prev => ({ ...prev, [index]: false }));
      }
    } catch (error) {
      console.error('❌ CertificatesSection - Error generating AI suggestions:', error);
      setShowSuggestions(prev => ({ ...prev, [index]: false }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSelectSuggestion = (index: number, content: string) => {
    updateCertificate(index, 'description', content);
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
  };

  return (
    <>
      {safeData.map((certificate, index) => (
        <div key={index} className="bg-white/5 rounded-none p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-[color:var(--text-primary)]">{certificate.name || 'Certification Name'}</h4>
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

          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Certification Name</label>
              <input
                type="text"
                value={certificate.name || ''}
                onChange={(e) => updateCertificate(index, 'name', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="AWS Certified Solutions Architect"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Issuer</label>
              <input
                type="text"
                value={certificate.issuer || ''}
                onChange={(e) => updateCertificate(index, 'issuer', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="Amazon Web Services"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Date</label>
              <input
                type="month"
                value={certificate.date || ''}
                onChange={(e) => updateCertificate(index, 'date', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="YYYY-MM"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">URL</label>
              <input
                type="url"
                value={certificate.url || ''}
                onChange={(e) => updateCertificate(index, 'url', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                placeholder="https://aws.amazon.com/certification/"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white/80 text-sm font-medium">Description / Highlights</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-white/70 text-sm">
                  <input
                    type="checkbox"
                    checked={certificate.useRichText !== false}
                    onChange={(e) => updateCertificate(index, 'useRichText', e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-[#80FF00] focus:ring-[#80FF00]/50"
                  />
                  Use Rich Text
                </label>
                <WYSIWYGToolbar
                  showAIButton={true}
                  fieldType="other"
                  onAISuggestions={() => generateAISuggestions(index, certificate)}
                  isGenerating={loadingSuggestions[index] || false}
                />
              </div>
            </div>
            <AISuggestionsPanel
              isVisible={showSuggestions[index] || false}
              suggestions={suggestions[index] || []}
              isLoading={loadingSuggestions[index] || false}
              onSelect={(content) => handleSelectSuggestion(index, content)}
              onClose={() => setShowSuggestions({ ...showSuggestions, [index]: false })}
            />
            {certificate.useRichText !== false ? (
              <WYSIWYGEditor
                value={certificate.description || ''}
                onChange={(value) => updateCertificate(index, 'description', value)}
                rows={3}
                placeholder="Describe the certification, its relevance, or what you learned..."
              />
            ) : (
              <div className="space-y-3">
                {(certificate.highlights || []).map((highlight: string, hIndex: number) => (
                  <div key={hIndex} className="flex items-start gap-2">
                    <div className="mt-3 w-1.5 h-1.5 rounded-none bg-white/50 flex-shrink-0" />
                    <input
                      type="text"
                      value={highlight}
                      onChange={(e) => {
                        const newHighlights = [...(certificate.highlights || [])];
                        newHighlights[hIndex] = e.target.value;
                        updateCertificate(index, 'highlights', newHighlights);
                      }}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                      placeholder="Highlight or key detail..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newHighlights = [...(certificate.highlights || [])];
                        newHighlights.splice(hIndex, 1);
                        updateCertificate(index, 'highlights', newHighlights);
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
                    const newHighlights = [...(certificate.highlights || []), ''];
                    updateCertificate(index, 'highlights', newHighlights);
                  }}
                  className="flex items-center gap-2 text-sm text-[#80FF00] hover:text-[#70e600] transition-colors mt-2"
                >
                  <Plus size={14} />
                  Add Bullet Point
                </button>
              </div>
            )}
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
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#80FF00]/50 text-white/50 hover:text-[#80FF00] rounded-none transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add another Certification
      </button>
    </>
  );
};

export default CertificatesSection;