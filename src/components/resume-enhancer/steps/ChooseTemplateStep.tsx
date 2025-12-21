'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Crown, Star, ArrowRight } from 'lucide-react';
import { useAICareerReport } from '@/contexts/AICareerReportContext';
import { ITemplate } from '@/types/template';
import { HARDCODED_TEMPLATES, resolveTemplateThumbnails } from '@/lib/templates/hardcoded-templates';

interface ChooseTemplateStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function ChooseTemplateStep({ onNext, onBack }: ChooseTemplateStepProps) {
  const { state, dispatch } = useAICareerReport();
  const [templates, setTemplates] = useState<ITemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        // Resolve thumbnails at runtime to ensure S3 URLs are properly set
        const resolvedTemplates = resolveTemplateThumbnails(HARDCODED_TEMPLATES);
        setTemplates(resolvedTemplates);
        setLoading(false);
      } catch (err) {
        console.error('Error loading templates:', err);
        setTemplates(HARDCODED_TEMPLATES);
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleTemplateSelect = (template: ITemplate) => {
    dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: template });
  };

  const handleContinue = () => {
    if (state.selectedTemplate) {
      onNext();
    }
  };

  const getTierIcon = (tier: string) => {
    return tier === 'premium' ? (
      <Crown size={14} className="text-amber-500" />
    ) : (
      <Star size={14} className="text-green-500" />
    );
  };

  const getTierLabel = (tier: string) => {
    return tier === 'premium' ? 'Premium' : 'Free';
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-[#1A201A] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 border-4 border-[#80FF00] border-t-transparent rounded-full animate-spin mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <h2 className="text-2xl font-bold text-white mb-4">Loading Templates</h2>
          <p className="text-white/70">Please wait while we load available templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#1A201A]">
      <div className="max-w-7xl mx-auto p-4 tablet:p-6 desktop:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-[#80FF00] font-bold text-lg mb-2">Step 2 of 3</div>
          <div className="text-2xl tablet:text-3xl font-bold text-white mb-2">Choose Your Template</div>
          <div className="text-white/70 text-lg mb-6">Select a template for your Master CV</div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-4 tablet:gap-6 mb-8">
          {templates.map((template, index) => {
            const templateId = template.id || template._id;
            const selectedId = state.selectedTemplate?.id || state.selectedTemplate?._id;
            const isSelected = selectedId === templateId;

            return (
              <motion.div
                key={templateId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`relative bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all shadow-md ${
                  isSelected
                    ? 'border-[#80FF00] ring-2 ring-[#80FF00]/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="relative aspect-[0.707] overflow-hidden bg-white">
                  {template.thumbnail ? (
                    <img
                      src={template.thumbnail}
                      alt={`${template.name} preview`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const currentSrc = target.src;
                        
                        if (!currentSrc.includes('s3.') && !currentSrc.includes('amazonaws.com')) {
                          const filename = template.thumbnail?.split('/').pop() || '';
                          const s3BaseUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;
                          if (s3BaseUrl) {
                            target.src = `${s3BaseUrl}/${encodeURIComponent(filename)}`;
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 text-2xl font-bold">
                        {template.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Template Name Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 via-white/90 to-transparent p-3 backdrop-blur-sm">
                    <h4 className="text-black font-semibold text-sm">{template.name}</h4>
                    <p className="text-black/70 text-xs mt-0.5">{getTierLabel(template.tier)}</p>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-[#80FF00] text-black rounded-full p-1.5 shadow-lg z-10">
                      <Check size={16} />
                    </div>
                  )}

                  {/* Tier Badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black backdrop-blur-sm px-2 py-1 rounded-full z-10">
                    {getTierIcon(template.tier)}
                    <span className="text-white text-xs font-medium">{getTierLabel(template.tier)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!state.selectedTemplate}
            className="px-8 py-3 bg-[#80FF00] hover:bg-[#70e600] text-black rounded-lg font-bold text-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-3"
          >
            Continue to CV Builder
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

