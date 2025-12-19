/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, Filter, Lightbulb, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import CVPreviewContent from '@/components/studio/CVPreviewContent';
import ATSFactorsList from '@/components/resume-enhancer/ATSFactorsList';
import { computeATSFactorScores } from '@/lib/utils/resumeEnhancerFactors';
import type { FixAnnotation, FixCategory } from '@/components/resume-enhancer/annotations/fix-annotation';
import { CVSurgeonService } from '@/lib/services/cv-surgeon-service';
import { logResumeEnhancerEvent } from '@/lib/services/resumeEnhancerLogClient';
import type { SkillGapAnalysis, SkillCategory } from '@/lib/services/skillGapAnalysisService';
import { InfoTooltip, HelpTooltip } from '@/components/ui/tooltip';
import { AnimatedScore, AnimatedProgressBar } from '@/components/ui/AnimatedScore';

interface SurgeonReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewAndFix: () => void;
}

type StatusFilter = 'open' | 'applied' | 'dismissed' | 'all';

const CATEGORY_LABELS: Record<FixCategory, string> = {
  impact: 'Impact',
  keywords: 'Keywords',
  clarity: 'Clarity',
  formatting: 'Formatting',
  grammar: 'Grammar',
  structure: 'Structure',
  other: 'Other'
};

function countByCategory(fixes: FixAnnotation[]) {
  const counts: Record<string, number> = {};
  fixes.forEach((f) => {
    counts[f.category] = (counts[f.category] || 0) + 1;
  });
  return counts;
}

export default function SurgeonReportModal({ isOpen, onClose, onReviewAndFix }: SurgeonReportModalProps) {
  const { state, dispatch } = useResumeEnhancer();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [categoryFilter, setCategoryFilter] = useState<FixCategory | 'all'>('all');
  const [skillGapAnalysis, setSkillGapAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [isLoadingSkillGap, setIsLoadingSkillGap] = useState(false);
  const [expandedSkillCategories, setExpandedSkillCategories] = useState<Set<string>>(new Set());
  const [isATSKeywordsExpanded, setIsATSKeywordsExpanded] = useState(true);

  const score = state.surgeonAnalysis?.score ?? 0;
  const jdText =
    (typeof state.jobData?.description === 'string' && state.jobData.description) ||
    (typeof state.jobData?.jobDescription === 'string' && state.jobData.jobDescription) ||
    (typeof state.jobData?.jd === 'string' && state.jobData.jd) ||
    '';
  const isJDReferenced = jdText.trim().length > 0;
  const scoreLabel = isJDReferenced ? 'ATS score' : 'CV score';
  const openFixes = state.fixAnnotations.filter((f) => f.status === 'open');
  
  // Extract ATS keywords from skill gap analysis for the keywords table
  const atsKeywords = useMemo(() => {
    if (!skillGapAnalysis?.categories) return [];
    
    const keywords: { keyword: string; inResume: boolean; inJobAd: number }[] = [];
    
    skillGapAnalysis.categories.forEach((category) => {
      category.skills.forEach((skill) => {
        keywords.push({
          keyword: skill.name,
          inResume: skill.status === 'mastered' || skill.status === 'transferable',
          inJobAd: 1 // Assuming each skill appears once in JD
        });
      });
    });
    
    return keywords;
  }, [skillGapAnalysis]);

  // Fetch skill gap analysis when modal opens and job data is available
  useEffect(() => {
    if (!isOpen || !isJDReferenced || !state.cvData) return;

    const fetchSkillGapAnalysis = async () => {
      setIsLoadingSkillGap(true);
      try {
        const response = await fetch('/api/ai/skill-gap-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvData: state.cvData,
            jobData: state.jobData
          })
        });

        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = 'Failed to fetch skill gap analysis';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If response is not JSON, use status text
            errorMessage = `Failed to fetch skill gap analysis (${response.status} ${response.statusText})`;
          }
          console.warn(errorMessage);
          // Don't throw - just log and continue without skill gap analysis
          return;
        }

        const result = await response.json();
        if (result.success && result.analysis) {
          setSkillGapAnalysis(result.analysis);
          // Expand all categories by default
          if (result.analysis.categories) {
            setExpandedSkillCategories(new Set(result.analysis.categories.map((cat: SkillCategory) => cat.name)));
          }
        } else {
          console.warn('Skill gap analysis response was not successful:', result);
        }
      } catch (error) {
        // Handle network errors and other exceptions gracefully
        if (error instanceof Error) {
          console.warn('Error fetching skill gap analysis:', error.message);
        } else {
          console.warn('Error fetching skill gap analysis:', error);
        }
        // Don't set error state - just continue without skill gap analysis
      } finally {
        setIsLoadingSkillGap(false);
      }
    };

    fetchSkillGapAnalysis();
  }, [isOpen, isJDReferenced, state.cvData, state.jobData]);

  const toggleSkillCategory = (categoryName: string) => {
    setExpandedSkillCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const getSkillStatusIcon = (status: string) => {
    switch (status) {
      case 'mastered':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case 'transferable':
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
      case 'critical-gap':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return null;
    }
  };

  const getSkillStatusLabel = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'Mastered';
      case 'transferable':
        return 'Transferable';
      case 'critical-gap':
        return 'Critical Gap';
      default:
        return status;
    }
  };

  const categoryCounts = useMemo(() => countByCategory(openFixes), [openFixes]);

  const filteredFixes = useMemo(() => {
    return state.fixAnnotations.filter((f) => {
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
      return true;
    });
  }, [state.fixAnnotations, statusFilter, categoryFilter]);

  const selectedFix = useMemo(
    () => state.activeFixId ? state.fixAnnotations.find((f) => f.id === state.activeFixId) : undefined,
    [state.activeFixId, state.fixAnnotations]
  );

  const navigableFixes = useMemo(() => filteredFixes, [filteredFixes]);
  const activeIndex = useMemo(() => {
    if (!state.activeFixId) return -1;
    return navigableFixes.findIndex((f) => f.id === state.activeFixId);
  }, [state.activeFixId, navigableFixes]);

  useEffect(() => {
    if (!isOpen) return;
    // Ensure something is selected so overlays show immediately.
    if (!state.activeFixId) {
      const first = navigableFixes.find((f) => f.status === 'open') || navigableFixes[0];
      if (first) dispatch({ type: 'SET_ACTIVE_FIX', payload: first.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Lock background scroll while the modal is open (prevents scroll chaining to the page behind)
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = (document.body.style as any).overscrollBehaviorY;
    document.body.style.overflow = 'hidden';
    (document.body.style as any).overscrollBehaviorY = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      (document.body.style as any).overscrollBehaviorY = prevOverscroll;
    };
  }, [isOpen]);

  const handleSelectFix = (fixId: string) => {
    dispatch({ type: 'SET_ACTIVE_FIX', payload: fixId });
    logResumeEnhancerEvent({
      action: 'resume_enhancer_fix_selected',
      resourceType: 'cv',
      resourceId: state.cvId,
      metadata: { fixId }
    });
  };

  const handleReviewAndFix = () => {
    dispatch({ type: 'SET_REVIEW_MODE', payload: true });
    // If nothing selected, select the first open fix
    const firstOpen = state.fixAnnotations.find((f) => f.status === 'open');
    if (!state.activeFixId && firstOpen) {
      dispatch({ type: 'SET_ACTIVE_FIX', payload: firstOpen.id });
    }
    onReviewAndFix();
    logResumeEnhancerEvent({
      action: 'resume_enhancer_review_and_fix_clicked',
      resourceType: 'cv',
      resourceId: state.cvId,
      metadata: { from: 'report_modal' }
    });
  };

  const handleApplyFix = (fix: FixAnnotation) => {
    const { updatedCV } = CVSurgeonService.applyFixAnnotation(state.cvData, fix);
    dispatch({ type: 'SET_CV_DATA', payload: updatedCV });
    dispatch({ type: 'MARK_FIX_APPLIED', payload: fix.id });
    logResumeEnhancerEvent({
      action: 'resume_enhancer_fix_applied',
      resourceType: 'cv',
      resourceId: state.cvId,
      metadata: { fixId: fix.id, fieldPath: fix.fieldPath, category: fix.category, impactScoreDelta: fix.impactScoreDelta }
    });

    // Select next open fix (best-effort)
    const next = state.fixAnnotations.find((f) => f.status === 'open' && f.id !== fix.id);
    dispatch({ type: 'SET_ACTIVE_FIX', payload: next?.id });
  };

  const handleDismissFix = (fixId: string) => {
    dispatch({ type: 'MARK_FIX_DISMISSED', payload: fixId });
    logResumeEnhancerEvent({
      action: 'resume_enhancer_fix_dismissed',
      resourceType: 'cv',
      resourceId: state.cvId,
      metadata: { fixId }
    });
    const next = state.fixAnnotations.find((f) => f.status === 'open' && f.id !== fixId);
    dispatch({ type: 'SET_ACTIVE_FIX', payload: next?.id });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 lg:p-6">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          className="w-full h-full max-w-[1600px] max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-3rem)] bg-white dark:bg-[#141810] rounded-2xl overflow-hidden shadow-2xl shadow-black/30 dark:shadow-black/60 flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#80FF00]" />
              <InfoTooltip content="Comprehensive AI analysis of your CV with actionable suggestions to improve your job application success rate.">
                <div className="text-gray-900 dark:text-white font-semibold cursor-help">CVCircle Optimisation Report</div>
              </InfoTooltip>
              <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                {openFixes.length} open suggestions
              </div>
            </div>

            <div className="flex items-center gap-2">
              <InfoTooltip content="Close this report and review suggestions directly on your CV with highlighted fixes.">
                <button
                  onClick={handleReviewAndFix}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#80FF00] hover:bg-[#70e600] text-black transition-colors"
                >
                  Review & Fix
                </button>
              </InfoTooltip>

              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a2015] transition-colors"
                aria-label="Close report"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 flex">
            {/* Left rail */}
            <aside className="hidden lg:flex flex-1 flex-col bg-white dark:bg-[#141810] overflow-hidden border-r border-gray-200 dark:border-white/10">
              <div className="p-4 space-y-4 min-w-0">
                <div className="bg-gray-50 dark:bg-[#1a2015] rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>{scoreLabel}</span>
                    <HelpTooltip content={isJDReferenced ? "ATS Score measures how well your CV matches the job requirements. Aim for 70+ for better chances." : "CV Score measures the overall quality and completeness of your resume. Aim for 70+ for a strong CV."} />
                  </div>
                  <div className="flex items-end justify-between">
                    <AnimatedScore 
                      value={score} 
                      suffix="/100"
                      size="lg"
                      showChange={true}
                    />
                  </div>
                  <div className="mt-3">
                    <AnimatedProgressBar
                      value={score}
                      height={12}
                      showLabel={true}
                      colorStops={[
                        { threshold: 0, color: '#ef4444' },
                        { threshold: 50, color: '#f59e0b' },
                        { threshold: 70, color: '#80FF00' }
                      ]}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-[#1a2015] rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5" />
                    Filters
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStatusFilter('open')}
                        className={`px-2 py-1 rounded-lg text-[11px] ${
                          statusFilter === 'open'
                            ? 'bg-[#80FF00] text-black'
                            : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        Open
                      </button>
                      <button
                        onClick={() => setStatusFilter('applied')}
                        className={`px-2 py-1 rounded-lg text-[11px] ${
                          statusFilter === 'applied'
                            ? 'bg-[#80FF00] text-black'
                            : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        Applied
                      </button>
                      <button
                        onClick={() => setStatusFilter('dismissed')}
                        className={`px-2 py-1 rounded-lg text-[11px] ${
                          statusFilter === 'dismissed'
                            ? 'bg-[#80FF00] text-black'
                            : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        Dismissed
                      </button>
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-2 py-1 rounded-lg text-[11px] ${
                          statusFilter === 'all'
                            ? 'bg-[#80FF00] text-black'
                            : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        All
                      </button>
                    </div>

                    <div className="pt-2">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">ATS factors</div>
                      <div className="bg-white dark:bg-[#141810] rounded-xl p-3 border border-gray-200 dark:border-white/10">
                        <ATSFactorsList
                          factors={computeATSFactorScores({
                            cvData: state.cvData,
                            fixes: state.fixAnnotations || [],
                            overallScore: state.surgeonAnalysis?.score
                          })}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">Issue types</div>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => setCategoryFilter('all')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs ${
                            categoryFilter === 'all'
                              ? 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white'
                              : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <span>All issues</span>
                          <span className="text-gray-500 dark:text-gray-400">{openFixes.length}</span>
                        </button>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                          const k = key as FixCategory;
                          const count = categoryCounts[k] || 0;
                          if (count === 0) return null;
                          return (
                            <button
                              key={k}
                              onClick={() => setCategoryFilter(k)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs ${
                                categoryFilter === k
                                  ? 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white'
                                  : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                              }`}
                            >
                              <span>{label}</span>
                              <span className="text-gray-500 dark:text-gray-400">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedFix && (
                  <div className="bg-gray-50 dark:bg-[#1a2015] rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Selected issue</div>
                    <div className="text-sm text-gray-900 dark:text-white font-semibold mb-1 break-words">{selectedFix.issue}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Field: <span className="text-gray-600 dark:text-gray-300 break-words">{selectedFix.fieldPath}</span>
                    </div>
                  </div>
                )}

                {/* Skill Gap Analysis Section */}
                {isJDReferenced && (
                  <div className="bg-gray-50 dark:bg-[#1a2015] rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-[#80FF00]" />
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">Skill Gap Analysis</div>
                    </div>

                    {isLoadingSkillGap ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-[#80FF00]" />
                      </div>
                    ) : skillGapAnalysis ? (
                      <div className="space-y-3">
                        {/* Overall Match Score */}
                        <div className="bg-white dark:bg-[#141810] rounded-lg p-2 border border-gray-200 dark:border-white/10">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">Match Score</span>
                            <span className="text-xs font-semibold text-[#80FF00]">{skillGapAnalysis.overallMatchScore}/100</span>
                          </div>
                          <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-[#80FF00] transition-all"
                              style={{ width: `${skillGapAnalysis.overallMatchScore}%` }}
                            />
                          </div>
                        </div>

                        {/* Categories */}
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {skillGapAnalysis.categories.map((category: SkillCategory, idx: number) => {
                            const isExpanded = expandedSkillCategories.has(category.name);
                            const criticalGaps = category.skills.filter((s) => s.status === 'critical-gap' && s.priority === 'critical');
                            const hasCriticalGaps = criticalGaps.length > 0;

                            return (
                              <div key={idx} className="bg-white dark:bg-[#141810] rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                <button
                                  onClick={() => toggleSkillCategory(category.name)}
                                  className="w-full flex items-center justify-between px-2 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-[10px] font-semibold text-gray-900 dark:text-white truncate">
                                      {category.name}
                                    </span>
                                    {hasCriticalGaps && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">
                                        {criticalGaps.length}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                      {category.matchedSkills}/{category.requiredSkills}
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3 text-gray-400" />
                                    )}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="px-2 pb-2 space-y-1.5 border-t border-gray-200 dark:border-white/10 pt-2 max-h-[300px] overflow-y-auto">
                                    {/* Show ALL skills when expanded */}
                                    {category.skills.map((skill, skillIdx) => (
                                      <div
                                        key={skillIdx}
                                        className="flex items-start gap-2 p-1.5 rounded bg-gray-50 dark:bg-[#1a2015]"
                                      >
                                        {getSkillStatusIcon(skill.status)}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[10px] font-medium text-gray-900 dark:text-white truncate">
                                              {skill.name}
                                            </span>
                                            {skill.priority === 'critical' && (
                                              <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold">
                                                Critical
                                              </span>
                                            )}
                                            {skill.priority === 'high' && (
                                              <span className="text-[8px] px-1 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold">
                                                High
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[9px] text-gray-500 dark:text-gray-400">
                                            {getSkillStatusLabel(skill.status)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center py-2">
                        No skill gap analysis available
                      </div>
                    )}
                  </div>
                )}

                {/* ATS Keywords Table - shown when JD is linked and keywords available */}
                {isJDReferenced && atsKeywords.length > 0 && (
                  <div className="bg-gray-50 dark:bg-[#1a2015] rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <button 
                      onClick={() => setIsATSKeywordsExpanded(!isATSKeywordsExpanded)}
                      className="w-full flex items-center justify-between mb-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white uppercase">ATS Keywords</div>
                      </div>
                      {isATSKeywordsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {isATSKeywordsExpanded && (
                      <div className="space-y-2">
                        {/* Table Header */}
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 pb-1 border-b border-gray-200 dark:border-white/10">
                          <span>Keyword</span>
                          <span className="text-center">In Resume</span>
                          <span className="text-center">In Job Ad</span>
                        </div>

                        {/* Table Rows - Show all keywords */}
                        <div className="max-h-[200px] overflow-y-auto space-y-1">
                          {atsKeywords.map((kw, idx) => (
                            <div key={idx} className="grid grid-cols-3 gap-2 items-center py-1.5 px-1 rounded hover:bg-white/5 transition-colors">
                              <span className="text-[10px] text-gray-900 dark:text-white truncate">{kw.keyword}</span>
                              <div className="flex justify-center">
                                {kw.inResume ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                                )}
                              </div>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center">{kw.inJobAd}</span>
                            </div>
                          ))}
                        </div>

                        {/* Summary */}
                        <div className="pt-2 border-t border-gray-200 dark:border-white/10">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-gray-500 dark:text-gray-400">Keywords matched</span>
                            <span className="font-semibold text-[#80FF00]">
                              {atsKeywords.filter(k => k.inResume).length}/{atsKeywords.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>

            {/* Main area */}
            <div className="flex-1 min-h-0 flex">
              {/* Preview (full width, issues are shown directly in the rendered CV) */}
              <div className="flex-1 min-h-0 bg-gray-50 dark:bg-[#141810] overflow-hidden relative">
                <div className="h-full overflow-auto overscroll-contain p-6">
                  <div className="mx-auto w-full max-w-3xl">
                    <CVPreviewContent
                      cvData={state.cvData}
                      theme="light"
                      showBadge={false}
                      templateName=""
                      customCSS={`
                        .cv-preview-container {
                          max-width: 100%;
                          padding: 2rem;
                          background: white;
                          border-radius: 0.5rem;
                          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                        }
                        mark {
                          background: #fef3c7 !important;
                          padding: 0.125rem 0.25rem;
                          border-radius: 0.25rem;
                          border-bottom: 2px solid #f59e0b;
                          cursor: pointer;
                          transition: all 0.2s;
                        }
                        mark:hover {
                          background: #fde68a !important;
                        }
                      `}
                      overlaysEnabled={true}
                      annotations={state.fixAnnotations}
                      activeFixId={state.activeFixId}
                      onSelectFix={handleSelectFix}
                      onApplyFix={handleApplyFix}
                      onDismissFix={handleDismissFix}
                      ignoreStructureVisibility={true}
                      renderMode="continuous"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


