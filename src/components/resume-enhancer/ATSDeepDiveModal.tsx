'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Target, 
  RefreshCw,
  AlertCircle, 
  CheckCircle,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { AnimatedScore } from '@/components/ui/AnimatedScore';
import { InfoTooltip } from '@/components/ui/tooltip';
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';
import { ATSDeepDiveProvider, useATSDeepDive } from '@/contexts/ATSDeepDiveContext';
// TODO: ATS Deep Dive components were deleted - need to reimplement or remove ATS Deep Dive feature
// import XRayCanvas from '@/components/studio/ats-deep-dive/XRayCanvas';
// import ScorecardPanel from '@/components/studio/ats-deep-dive/ScorecardPanel';
// import StrategistPanel from '@/components/studio/ats-deep-dive/StrategistPanel';
import { useAIStore } from '@/lib/stores/aiStore';
import { useATS } from '@/contexts/ATSContext';

interface ATSDeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface ATSResult {
  score: number;
  profileLevel?: {
    title: string;
    yearsExperience: number;
    description: string;
  };
  factorBreakdown?: {
    hardKeywords: { score: number; weight: number; matched: number; total: number };
    jobTitles: { score: number; weight: number; matched: boolean };
    experienceLength: { score: number; weight: number; years: number };
    formatting: { score: number; weight: number; issues: string[] };
    softSkills: { score: number; weight: number; matched: number; total: number };
  };
  knockOutFactors?: {
    fileFormat: { passed: boolean; issue?: string };
    sectionHeaders: { passed: boolean; issues: string[] };
    contactInfo: { passed: boolean; issues: string[] };
  };
  details?: {
    matchedKeywords: string[];
    missingKeywords: string[];
    experienceYears: number;
    educationLevel: string;
    formatIssues: string[];
  };
  suggestions?: string[];
  cached?: boolean;
}

// Inner component that uses the context
function ATSDeepDiveContent({ isOpen, onClose, userId }: ATSDeepDiveModalProps) {
  const { state } = useResumeEnhancer();
  const { state: deepDiveState, activateDeepDive, deactivateDeepDive, toggleLayer } = useATSDeepDive();
  const { setATSScore } = useAIStore();
  const { 
    atsScore, 
    atsAnalysis, 
    isATSLoading, 
    atsError, 
    updateATSScore, 
    refreshATSScore 
  } = useATS();
  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const isAnalyzingRef = useRef(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const cvPreviewWrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const jobId = state.jobData?.id || state.jobData?._id || null;
  const cvId = state.cvId;
  const journeyId = state.journeyId;
  const scoreLabel = state.cvType === 'journey' ? 'ATS score' : 'CV score';

  // Activate deep dive when modal opens
  useEffect(() => {
    if (isOpen) {
      activateDeepDive();
    } else {
      deactivateDeepDive();
    }
  }, [isOpen, activateDeepDive, deactivateDeepDive]);

  // Calculate years of experience from CV data
  const calculateYearsOfExperience = useCallback((): number => {
    if (!state.cvData?.work || !Array.isArray(state.cvData.work)) return 0;
    
    let totalMonths = 0;
    state.cvData.work.forEach((exp: any) => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate && exp.endDate.toLowerCase() !== 'present'
          ? new Date(exp.endDate)
          : new Date();
        
        if (!isNaN(start.getTime())) {
          const months = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
          totalMonths += Math.max(0, months);
        }
      }
    });
    
    return Math.round(totalMonths / 12 * 10) / 10;
  }, [state.cvData]);

  // Run ATS Analysis
  const runATSAnalysis = useCallback(async () => {
    if (!jobId || !state.cvData || !cvId) {
      setApiError('Job description and CV are required for ATS analysis');
      return;
    }

    if (isAnalyzingRef.current || isATSLoading) {
      return;
    }
    isAnalyzingRef.current = true;
    setIsLoading(true);
    setApiError(null);
    
    try {
      const response = await fetch('/api/ats/calculate-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvId,
          jobId: jobId,
          userId: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const apiResult = await response.json();
      
      if (!apiResult.success || !apiResult.data) {
        throw new Error(apiResult.error || 'Failed to calculate ATS score');
      }

      const data = apiResult.data;
      const analysis = data.analysis || data;
      
      const yearsExp = analysis.factorBreakdown?.experienceLength?.years || calculateYearsOfExperience();
      
      let profileLevel = {
        title: 'Entry Level',
        yearsExperience: yearsExp,
        description: 'Early career professional'
      };
      
      if (yearsExp >= 7) {
        profileLevel = {
          title: 'Senior Professional',
          yearsExperience: yearsExp,
          description: 'Experienced professional with extensive background'
        };
      } else if (yearsExp >= 3) {
        profileLevel = {
          title: 'Mid-Level Professional',
          yearsExperience: yearsExp,
          description: 'Experienced professional with solid track record'
        };
      }
      
      const result: ATSResult = {
        score: analysis.score || data.score || 0,
        profileLevel,
        factorBreakdown: analysis.factorBreakdown || data.factorBreakdown,
        knockOutFactors: analysis.knockOutFactors || data.knockOutFactors,
        details: {
          matchedKeywords: analysis.strengths || [],
          missingKeywords: analysis.missingKeywords || [],
          experienceYears: yearsExp,
          educationLevel: 'Not specified',
          formatIssues: analysis.factorBreakdown?.formatting?.issues || []
        },
        suggestions: analysis.suggestions || [],
        cached: data.cached === true
      };

      setAtsResult(result);

      // Update ATS Context - this syncs with database and notifies other components
      const atsAnalysisData = {
        score: result.score,
        missingKeywords: result.details?.missingKeywords || [],
        strengths: result.details?.matchedKeywords || [],
        suggestions: result.suggestions || [],
        factorBreakdown: result.factorBreakdown,
        knockOutFactors: result.knockOutFactors,
        updatedAt: new Date().toISOString(),
      };
      
      await updateATSScore(
        result.score,
        atsAnalysisData,
        cvId!,
        journeyId,
        jobId || undefined
      );

      // Update AI Store so ScorecardPanel can access the data
      setATSScore(
        result.score,
        {
          score: result.score,
          missingKeywords: result.details?.missingKeywords || [],
          weakKeywords: [],
          strengths: result.details?.matchedKeywords || [],
          suggestions: result.suggestions || [],
          updatedAt: new Date().toISOString(),
          // Include factorBreakdown for ScorecardPanel
          factorBreakdown: result.factorBreakdown as any
        } as any,
        false // Not baseline - this is job-specific
      );
    } catch (error) {
      console.error('❌ ATS Deep Dive - Error running ATS analysis:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to calculate ATS score. Please try again.');
    } finally {
      isAnalyzingRef.current = false;
      setIsLoading(false);
    }
  }, [jobId, state.cvData, cvId, userId, calculateYearsOfExperience, updateATSScore, journeyId]);

  // Auto-run analysis when modal opens and has required data
  useEffect(() => {
    if (isOpen && jobId && state.cvData && cvId && !atsResult && !isAnalyzingRef.current) {
      runATSAnalysis();
    }
  }, [isOpen, jobId, state.cvData, cvId, atsResult]);

  // Sync with context data when available
  useEffect(() => {
    if (atsAnalysis && atsScore !== null && !atsResult) {
      const yearsExp = atsAnalysis.factorBreakdown?.experienceLength?.years || calculateYearsOfExperience();
      
      let profileLevel = {
        title: 'Entry Level',
        yearsExperience: yearsExp,
        description: 'Early career professional'
      };
      
      if (yearsExp >= 7) {
        profileLevel = {
          title: 'Senior Professional',
          yearsExperience: yearsExp,
          description: 'Experienced professional with extensive background'
        };
      } else if (yearsExp >= 3) {
        profileLevel = {
          title: 'Mid-Level Professional',
          yearsExperience: yearsExp,
          description: 'Experienced professional with solid track record'
        };
      }
      
      setAtsResult({
        score: atsScore,
        profileLevel,
        factorBreakdown: atsAnalysis.factorBreakdown,
        knockOutFactors: atsAnalysis.knockOutFactors,
        details: {
          matchedKeywords: atsAnalysis.strengths || [],
          missingKeywords: atsAnalysis.missingKeywords || [],
          experienceYears: yearsExp,
          educationLevel: 'Not specified',
          formatIssues: atsAnalysis.factorBreakdown?.formatting?.issues || []
        },
        suggestions: atsAnalysis.suggestions || [],
        cached: false
      });
    }
  }, [atsAnalysis, atsScore, calculateYearsOfExperience]);

  // Calculate scale to fit CV preview in container
  useEffect(() => {
    if (!isOpen || !previewContainerRef.current) return;

    const calculateScale = () => {
      const container = previewContainerRef.current;
      if (!container) return;

      // Get the scrollable container (parent of previewContainerRef)
      const scrollContainer = container.parentElement;
      if (!scrollContainer) return;

      const containerWidth = scrollContainer.clientWidth;
      const A4_WIDTH = 794; // A4 width in pixels at 96 DPI
      const padding = 48; // 24px padding on each side (p-6 = 24px)

      const availableWidth = containerWidth - padding;
      
      // If container is wider than A4, no scaling needed
      if (availableWidth >= A4_WIDTH) {
        setScale(1);
        return;
      }

      // Calculate scale to fit
      const calculatedScale = availableWidth / A4_WIDTH;

      // Clamp scale between 0.5 and 1.0 to ensure it fits
      const clampedScale = Math.max(0.5, Math.min(1.0, calculatedScale));
      setScale(clampedScale);
    };

    // Initial calculation with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(calculateScale, 100);
    calculateScale();

    const resizeObserver = new ResizeObserver(() => {
      calculateScale();
    });

    if (previewContainerRef.current?.parentElement) {
      resizeObserver.observe(previewContainerRef.current.parentElement);
    }

    window.addEventListener('resize', calculateScale);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateScale);
    };
  }, [isOpen, state.cvData]);

  // Lock background scroll
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 lg:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          className="w-full h-full max-w-[1800px] max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-3rem)] bg-[#141810] rounded-2xl overflow-hidden shadow-2xl shadow-black/60 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - HUD Overlay */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1a230f]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-r from-[#80FF00] to-[#60CC00] rounded-full flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-black" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">CVCircle ATS Deep Dive Analysis</div>
                <div className="text-xs text-white/60 truncate">
                  {state.jobData?.title || 'Position Analysis'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(atsResult || (atsScore !== null)) && (
                <div className="hidden lg:flex items-center gap-3">
                  <div className="text-xs text-white/60">
                    <div className="uppercase tracking-wide">{scoreLabel}</div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <AnimatedScore value={atsResult?.score || atsScore || 0} suffix="/100" size="md" showChange={true} />
                    </div>
                  </div>
                </div>
              )}

              {/* Layer Toggle Controls */}
              <div className="flex items-center gap-2 bg-[#1a230f]/90 backdrop-blur-sm border border-white/10 rounded-lg p-1.5">
                <InfoTooltip content="Toggle Timeline Gutter Layer">
                  <button
                    onClick={() => toggleLayer('timeline')}
                    className={`p-1.5 rounded transition-colors ${
                      deepDiveState.activeLayers.has('timeline')
                        ? 'bg-[#80FF00]/20 text-[#80FF00]'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </InfoTooltip>
                <InfoTooltip content="Toggle Reading Path Layer">
                  <button
                    onClick={() => toggleLayer('reading-path')}
                    className={`p-1.5 rounded transition-colors ${
                      deepDiveState.activeLayers.has('reading-path')
                        ? 'bg-[#80FF00]/20 text-[#80FF00]'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </InfoTooltip>
                <InfoTooltip content="Toggle Keyword Heatmap Layer">
                  <button
                    onClick={() => toggleLayer('heatmap')}
                    className={`p-1.5 rounded transition-colors ${
                      deepDiveState.activeLayers.has('heatmap')
                        ? 'bg-[#80FF00]/20 text-[#80FF00]'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                  </button>
                </InfoTooltip>
              </div>
              
              <InfoTooltip content="Refresh ATS Analysis">
                <button
                  onClick={runATSAnalysis}
                  disabled={isLoading || isATSLoading}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 text-white/70 ${(isLoading || isATSLoading) ? 'animate-spin' : ''}`} />
                </button>
              </InfoTooltip>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
          </div>

          {/* 3-Panel Architecture */}
          <div className="flex-1 min-h-0 overflow-hidden flex">
            {/* Panel A: Controls (Left Rail) - ScorecardPanel */}
            <div className="w-80 flex-shrink-0 border-r border-white/10 overflow-hidden bg-[#1a230f]">
              {(apiError || atsError) && (
                <div className="p-4 bg-red-900/20 border-b border-red-800/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <h3 className="text-xs font-semibold text-red-400">Analysis Failed</h3>
                  </div>
                  <p className="text-red-300 text-xs mb-2">{apiError || atsError}</p>
                  <button
                    onClick={runATSAnalysis}
                    className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}
              <ScorecardPanel />
            </div>

            {/* Panel B: X-Ray Canvas (Center Stage) */}
            <div className="flex-1 min-h-0 overflow-hidden relative bg-[#1a230f]">
              {/* Force all CV preview text to be black */}
              <style dangerouslySetInnerHTML={{ __html: `
                .ats-deep-dive-cv-preview * {
                  color: #111827 !important;
                }
                .ats-deep-dive-cv-preview .cv-page,
                .ats-deep-dive-cv-preview .cv-page * {
                  color: #111827 !important;
                }
                .ats-deep-dive-cv-preview h1,
                .ats-deep-dive-cv-preview h2,
                .ats-deep-dive-cv-preview h3,
                .ats-deep-dive-cv-preview h4,
                .ats-deep-dive-cv-preview h5,
                .ats-deep-dive-cv-preview h6,
                .ats-deep-dive-cv-preview p,
                .ats-deep-dive-cv-preview span,
                .ats-deep-dive-cv-preview div,
                .ats-deep-dive-cv-preview li,
                .ats-deep-dive-cv-preview td {
                  color: #111827 !important;
                }
              ` }} />
              <div className="absolute inset-0 overflow-y-auto px-6 pb-6 pt-0 flex justify-center">
                <div 
                  className="relative ats-deep-dive-cv-preview" 
                  ref={previewContainerRef}
                >
                  {/* CV Preview with Overlays */}
                  {state.cvData ? (
                    <div
                      ref={cvPreviewWrapperRef}
                      className="relative"
                      style={{
                        width: '794px',
                        maxWidth: '100%',
                        transform: scale < 1 ? `scale(${scale})` : 'none',
                        transformOrigin: 'center top',
                        margin: '0 auto'
                      }}
                    >
                      <CVPreviewContent
                        cvData={state.cvData}
                        selectedTemplate={state.selectedTemplate || undefined}
                        overlaysEnabled={false}
                        annotations={[]}
                        renderMode="continuous"
                        ignoreStructureVisibility={true}
                        showBadge={false}
                        showTimelineGutter={deepDiveState.activeLayers.has('timeline')}
                        timelineParserType={deepDiveState.selectedParser}
                        timelineShowCriticalOnly={deepDiveState.showCriticalOnly}
                        showKeywordHeatmap={deepDiveState.activeLayers.has('heatmap')}
                        keywordParserType={deepDiveState.selectedParser}
                        keywordShowCriticalOnly={deepDiveState.showCriticalOnly}
                        jobData={state.jobData}
                      />
                      
                      {/* SVG Overlay System - X-Ray Canvas */}
                      <XRayCanvas
                        cvData={state.cvData}
                        jobData={state.jobData}
                        previewContainerRef={previewContainerRef}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400 text-sm">No CV data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel C: Strategist (Right Panel) */}
            <div className="w-96 flex-shrink-0 border-l border-white/10 overflow-hidden bg-[#1a230f]">
              <StrategistPanel
                cvData={state.cvData}
                jobData={state.jobData}
                onAddKeyword={(keyword) => {
                  // Handle keyword addition - could trigger CV update
                  console.log('Add keyword:', keyword);
                }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main component with provider
export default function ATSDeepDiveModal(props: ATSDeepDiveModalProps) {
  return (
    <ATSDeepDiveProvider>
      <ATSDeepDiveContent {...props} />
    </ATSDeepDiveProvider>
  );
}
