'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Crown, Star, Loader2, ArrowRight, AlertTriangle, Shield, Sparkles } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { ITemplate } from '@/types/template';
import { HARDCODED_TEMPLATES, resolveTemplateThumbnails } from '@/lib/templates/hardcoded-templates';

interface Step2TemplateProps {
  onComplete: () => void;
}

/**
 * Template ATS scoring based on layout type
 * One-column templates have best ATS compatibility
 * Creative/graphic templates have reduced ATS score ceiling
 */
const TEMPLATE_ATS_SCORES: Record<string, number> = {
  'one-column': 100,
  'two-column': 85,
  'three-column': 75,
  'creative': 70,
  'graphic': 60,
  'custom': 80
};

/**
 * Get ATS score cap for a template based on its layout type
 */
function getTemplateATSScoreCap(template: ITemplate): number {
  const layoutType = template.layoutType || 'one-column';
  return TEMPLATE_ATS_SCORES[layoutType] ?? 100;
}

/**
 * Get ATS friendliness level for display
 */
function getATSFriendliness(scoreCap: number): { label: string; color: string; bgColor: string } {
  if (scoreCap >= 95) {
    return { label: 'ATS Excellent', color: 'text-green-500', bgColor: 'bg-green-500/10' };
  } else if (scoreCap >= 80) {
    return { label: 'ATS Good', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
  } else if (scoreCap >= 70) {
    return { label: 'ATS Limited', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
  } else {
    return { label: 'ATS Poor', color: 'text-red-500', bgColor: 'bg-red-500/10' };
  }
}

export default function Step2Template({ onComplete }: Step2TemplateProps) {
  const { state, setTemplate, setAtsScoreCap, dispatch } = useResumeEnhancer();
  const [templates, setTemplates] = useState<ITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showATSWarning, setShowATSWarning] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<ITemplate | null>(null);
  
  // Is this a Journey CV that needs ATS optimization?
  const isJourneyCV = state.cvType === 'journey';

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
    const scoreCap = getTemplateATSScoreCap(template);
    
    // For Journey CVs, warn if template has low ATS score
    if (isJourneyCV && scoreCap < 80) {
      setPendingTemplate(template);
      setShowATSWarning(true);
      return;
    }
    
    // Set template and ATS score cap
    setTemplate(template);
    setAtsScoreCap(scoreCap);
    dispatch({ type: 'SET_ATS_SCORE_CAP', payload: scoreCap });
    
    // Auto-proceed to next step after selection
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  /**
   * Confirm selection of a template with low ATS score
   */
  const confirmLowATSTemplate = () => {
    if (pendingTemplate) {
      const scoreCap = getTemplateATSScoreCap(pendingTemplate);
      setTemplate(pendingTemplate);
      setAtsScoreCap(scoreCap);
      dispatch({ type: 'SET_ATS_SCORE_CAP', payload: scoreCap });
      setShowATSWarning(false);
      setPendingTemplate(null);
      
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  };

  /**
   * Cancel low ATS template selection
   */
  const cancelLowATSTemplate = () => {
    setShowATSWarning(false);
    setPendingTemplate(null);
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
      <div className="w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-4">Loading Templates</h2>
          <p className="text-[color:var(--text-secondary)]">Please wait while we load available templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-48px)] min-h-0 overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-[color:var(--text-primary)] mb-4">
          Choose Your Template
        </h2>
        <p className="text-lg text-[color:var(--text-secondary)]">
          Select a professional template that best suits your style
        </p>
        
        {/* Journey CV ATS recommendation */}
        {isJourneyCV && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full"
          >
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-500">
              For job applications, choose templates marked "ATS Excellent" for best results
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Templates Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-4 tablet:gap-6 mb-8"
      >
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
              className={`relative bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all shadow-md hover:shadow-lg ${
                isSelected
                  ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/50'
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
                  <div className="absolute top-2 right-2 bg-[var(--accent-primary)] text-black rounded-full p-1.5 shadow-lg z-10">
                    <Check size={16} />
                  </div>
                )}

                {/* Tier Badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-full z-10">
                  {getTierIcon(template.tier)}
                  <span className="text-white text-xs font-medium">{getTierLabel(template.tier)}</span>
                </div>

                {/* ATS Score Badge - Show for Journey CVs */}
                {isJourneyCV && (
                  <div className={`absolute top-10 left-2 flex items-center gap-1 backdrop-blur-sm px-2 py-1 rounded-full z-10 ${getATSFriendliness(getTemplateATSScoreCap(template)).bgColor}`}>
                    <Shield size={12} className={getATSFriendliness(getTemplateATSScoreCap(template)).color} />
                    <span className={`text-xs font-medium ${getATSFriendliness(getTemplateATSScoreCap(template)).color}`}>
                      {getATSFriendliness(getTemplateATSScoreCap(template)).label}
                    </span>
                  </div>
                )}

                {/* Low ATS Warning Indicator */}
                {isJourneyCV && getTemplateATSScoreCap(template) < 80 && (
                  <div className="absolute bottom-16 right-2 z-10">
                    <div className="bg-yellow-500/90 text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} />
                      <span>Max {getTemplateATSScoreCap(template)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ATS Warning Modal for Journey CVs */}
      <AnimatePresence>
        {showATSWarning && pendingTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={cancelLowATSTemplate}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                </div>
                <h3 className="text-xl font-semibold text-[color:var(--text-primary)]">
                  Limited ATS Compatibility
                </h3>
              </div>
              
              <p className="text-[color:var(--text-secondary)] mb-4">
                <strong>{pendingTemplate.name}</strong> is a creative template with limited ATS parsing support.
              </p>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[color:var(--text-secondary)]">Maximum ATS Score:</span>
                  <span className="text-lg font-bold text-yellow-500">
                    {getTemplateATSScoreCap(pendingTemplate)}%
                  </span>
                </div>
                <p className="text-xs text-[color:var(--text-tertiary)]">
                  Your CV's ATS optimization score will be capped at this level regardless of content quality.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelLowATSTemplate}
                  className="flex-1 px-4 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded-xl font-medium transition-colors"
                >
                  Choose Another
                </button>
                <button
                  onClick={confirmLowATSTemplate}
                  className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl font-medium transition-colors"
                >
                  Use Anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue Button - Show if template is selected */}
      {state.selectedTemplate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mt-8"
        >
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-3"
          >
            Continue with {state.selectedTemplate.name}
            <ArrowRight size={20} />
          </button>
        </motion.div>
      )}
      </div>
    </div>
  );
}

