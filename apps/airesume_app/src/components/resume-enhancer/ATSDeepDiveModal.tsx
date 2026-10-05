// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
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
import CVOverlayDocument from '@/components/cv-builder-pro/CVOverlayDocument';
import { ATSDeepDiveProvider, useATSDeepDive } from '@/contexts/ATSDeepDiveContext';
// TODO: ATS Deep Dive components were deleted - using inline placeholders
// import XRayCanvas from '@/components/studio/ats-deep-dive/XRayCanvas';
// import ScorecardPanel from '@/components/studio/ats-deep-dive/ScorecardPanel';
// import StrategistPanel from '@/components/studio/ats-deep-dive/StrategistPanel';
import { useAIStore } from '@/lib/stores/aiStore';
import { useATS } from '@/contexts/ATSContext';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { useUserData } from '@/lib/hooks/useUserData';

// ScorecardPanel - Shows ATS score breakdown and knockout factors
const ScorecardPanel = ({ atsResult, isLoading }: { atsResult: any; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#013f2e] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-400">Analyzing...</p>
        </div>
      </div>
    );
  }

  if (!atsResult) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <p className="text-sm text-gray-400">No analysis data</p>
      </div>
    );
  }

  const { score, factorBreakdown, knockOutFactors, profileLevel } = atsResult;

  const getScoreColor = (value: number, max: number = 100) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return 'text-green-400 bg-green-400';
    if (percentage >= 60) return 'text-yellow-400 bg-yellow-400';
    return 'text-red-400 bg-red-400';
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Overall Score */}
      <div className="text-center pb-4 border-b border-white/10">
        <div className={`text-4xl font-bold ${getScoreColor(score).split(' ')[0]}`}>{score}</div>
        <div className="text-xs text-gray-400 mt-1">ATS Score</div>
        {profileLevel && (
          <div className="mt-2">
            <span className="px-2 py-1 bg-[#013f2e]/20 text-[#013f2e] rounded text-xs font-medium">
              {profileLevel.title}
            </span>
            <p className="text-[10px] text-gray-500 mt-1">{profileLevel.yearsExperience} years experience</p>
          </div>
        )}
      </div>

      {/* Factor Breakdown */}
      {factorBreakdown && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-300 uppercase">Score Factors</h3>

          {/* Hard Keywords */}
          {factorBreakdown.hardKeywords && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Hard Keywords</span>
                <span className={getScoreColor(factorBreakdown.hardKeywords.score, factorBreakdown.hardKeywords.weight).split(' ')[0]}>
                  {factorBreakdown.hardKeywords.matched}/{factorBreakdown.hardKeywords.total}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreColor(factorBreakdown.hardKeywords.score, factorBreakdown.hardKeywords.weight).split(' ')[1]}`}
                  style={{ width: `${(factorBreakdown.hardKeywords.score / factorBreakdown.hardKeywords.weight) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Experience Length */}
          {factorBreakdown.experienceLength && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Experience</span>
                <span className="text-gray-300">{factorBreakdown.experienceLength.years} years</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreColor(factorBreakdown.experienceLength.score, factorBreakdown.experienceLength.weight).split(' ')[1]}`}
                  style={{ width: `${(factorBreakdown.experienceLength.score / factorBreakdown.experienceLength.weight) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Soft Skills */}
          {factorBreakdown.softSkills && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Soft Skills</span>
                <span className={getScoreColor(factorBreakdown.softSkills.score, factorBreakdown.softSkills.weight).split(' ')[0]}>
                  {factorBreakdown.softSkills.matched}/{factorBreakdown.softSkills.total}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreColor(factorBreakdown.softSkills.score, factorBreakdown.softSkills.weight).split(' ')[1]}`}
                  style={{ width: `${(factorBreakdown.softSkills.score / factorBreakdown.softSkills.weight) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Formatting */}
          {factorBreakdown.formatting && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Formatting</span>
                <span className={getScoreColor(factorBreakdown.formatting.score, factorBreakdown.formatting.weight).split(' ')[0]}>
                  {factorBreakdown.formatting.score}/{factorBreakdown.formatting.weight}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreColor(factorBreakdown.formatting.score, factorBreakdown.formatting.weight).split(' ')[1]}`}
                  style={{ width: `${(factorBreakdown.formatting.score / factorBreakdown.formatting.weight) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Knockout Factors */}
      {knockOutFactors && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <h3 className="text-xs font-semibold text-gray-300 uppercase">Knockout Checks</h3>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className={`w-3.5 h-3.5 ${knockOutFactors.fileFormat?.passed ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-gray-400">File Format</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className={`w-3.5 h-3.5 ${knockOutFactors.sectionHeaders?.passed ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-gray-400">Section Headers</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className={`w-3.5 h-3.5 ${knockOutFactors.contactInfo?.passed ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-gray-400">Contact Info</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const XRayCanvas = ({ cvData, jobData, previewContainerRef }: any) => null;

// StrategistPanel - Shows missing keywords and suggestions
const StrategistPanel = ({ atsResult, cvData, jobData, onAddKeyword }: { atsResult: any; cvData: any; jobData: any; onAddKeyword: (keyword: string) => void }) => {
  if (!atsResult) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <p className="text-sm text-gray-400">Run analysis to see suggestions</p>
      </div>
    );
  }

  const { details, suggestions } = atsResult;
  const missingKeywords = details?.missingKeywords || [];
  const matchedKeywords = details?.matchedKeywords || [];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Missing Keywords */}
      {missingKeywords.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-red-400 uppercase flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Missing Keywords ({missingKeywords.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {missingKeywords.slice(0, 15).map((keyword: string, idx: number) => (
              <button
                key={idx}
                onClick={() => onAddKeyword(keyword)}
                className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 transition-colors"
                title={`Add "${keyword}" to CV`}
              >
                {keyword}
              </button>
            ))}
            {missingKeywords.length > 15 && (
              <span className="px-2 py-1 text-gray-500 text-[10px]">+{missingKeywords.length - 15} more</span>
            )}
          </div>
        </div>
      )}

      {/* Matched Keywords */}
      {matchedKeywords.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-green-400 uppercase flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Matched Keywords ({matchedKeywords.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {matchedKeywords.slice(0, 10).map((keyword: string, idx: number) => (
              <span
                key={idx}
                className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[10px]"
              >
                {keyword}
              </span>
            ))}
            {matchedKeywords.length > 10 && (
              <span className="px-2 py-1 text-gray-500 text-[10px]">+{matchedKeywords.length - 10} more</span>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <h3 className="text-xs font-semibold text-[#013f2e] uppercase flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Suggestions
          </h3>
          <div className="space-y-2">
            {suggestions.slice(0, 5).map((suggestion: string, idx: number) => (
              <div
                key={idx}
                className="p-2 bg-[#013f2e]/10 border border-[#013f2e]/20 rounded-lg text-xs text-gray-300"
              >
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job Info */}
      {jobData && (
        <div className="pt-2 border-t border-white/10">
          <h3 className="text-xs font-semibold text-gray-300 uppercase mb-2">Target Job</h3>
          <div className="text-xs text-gray-400">
            <p className="font-medium text-gray-300">{jobData.jobTitle || jobData.title}</p>
            <p>{jobData.company}</p>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const { openPaymentModal } = usePaymentModal();
  const { userData } = useUserData();
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

    if (userData?.currentPlanKey === 'free' || !userData?.subscription || userData.subscription.status !== 'active') {
      openPaymentModal({ preselectedPlanKey: 'focused_monthly', triggerContext: 'ats-score' });
      return;
    }

    if (isAnalyzingRef.current || isATSLoading) {
      return;
    }
    
    isAnalyzingRef.current = true;
    setIsLoading(true);
    setApiError(null);

    try {
      await refreshATSScore(cvId, jobId, userId);
    } catch (error) {
      console.error('❌ ATS Deep Dive - Error running ATS analysis:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to calculate ATS score. Please try again.');
    } finally {
      isAnalyzingRef.current = false;
      setIsLoading(false);
    }
  }, [jobId, state.cvData, cvId, userId, refreshATSScore, userData, openPaymentModal, isATSLoading]);

  // Auto-run analysis when modal opens and has required data
  useEffect(() => {
    if (isOpen && jobId && state.cvData && cvId && !atsResult && !isAnalyzingRef.current) {
      runATSAnalysis();
    }
  }, [isOpen, jobId, state.cvData, cvId, atsResult]);

  // Sync with context data when available
  useEffect(() => {
    if (atsAnalysis && atsScore !== null) {
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
      
      // Update AI Store so ScorecardPanel can access the data
      setATSScore(
        atsScore,
        {
          score: atsScore,
          missingKeywords: atsAnalysis.missingKeywords || [],
          weakKeywords: [],
          strengths: atsAnalysis.strengths || [],
          suggestions: atsAnalysis.suggestions || [],
          updatedAt: atsAnalysis.updatedAt || new Date().toISOString(),
          factorBreakdown: atsAnalysis.factorBreakdown as any
        } as any,
        false
      );
    }
  }, [atsAnalysis, atsScore, calculateYearsOfExperience, setATSScore]);

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
        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 lg:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          className="w-full h-full max-w-[1800px] max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-3rem)] bg-white dark:bg-[#141810] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/60 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - HUD Overlay */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a230f]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-r from-[#013f2e] to-[#60CC00] rounded-full flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-black" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">AIResume ATS Deep Dive Analysis</div>
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
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1a230f]/90 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-lg p-1.5">
                <InfoTooltip content="Toggle Timeline Gutter Layer">
                  <button
                    onClick={() => toggleLayer('timeline')}
                    className={`p-1.5 rounded transition-colors ${deepDiveState.activeLayers.has('timeline')
                      ? 'bg-[#013f2e]/20 text-[#013f2e]'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </InfoTooltip>
                <InfoTooltip content="Toggle Reading Path Layer">
                  <button
                    onClick={() => toggleLayer('reading-path')}
                    className={`p-1.5 rounded transition-colors ${deepDiveState.activeLayers.has('reading-path')
                      ? 'bg-[#013f2e]/20 text-[#013f2e]'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </InfoTooltip>
                <InfoTooltip content="Toggle Keyword Heatmap Layer">
                  <button
                    onClick={() => toggleLayer('heatmap')}
                    className={`p-1.5 rounded transition-colors ${deepDiveState.activeLayers.has('heatmap')
                      ? 'bg-[#013f2e]/20 text-[#013f2e]'
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
            <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-white/10 overflow-hidden bg-gray-50 dark:bg-[#1a230f]">
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
              <ScorecardPanel atsResult={atsResult} isLoading={isLoading || isATSLoading} />
            </div>

            {/* Panel B: X-Ray Canvas (Center Stage) */}
            <div className="flex-1 min-h-0 overflow-hidden relative bg-gray-50 dark:bg-[#1a230f]">
              {/* Force all CV preview text to be black */}
              <style dangerouslySetInnerHTML={{
                __html: `
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
                      <CVOverlayDocument
                        cvData={state.cvData}
                        renderMode="continuous"
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
            <div className="w-96 flex-shrink-0 border-l border-gray-200 dark:border-white/10 overflow-hidden bg-gray-50 dark:bg-[#1a230f]">
              <StrategistPanel
                atsResult={atsResult}
                cvData={state.cvData}
                jobData={state.jobData}
                onAddKeyword={(keyword: string) => {
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
