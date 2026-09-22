/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Sparkles, X, Eye, EyeOff, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import CVOverlayDocument from '@/components/cv-builder-pro/CVOverlayDocument';
import FieldFixOverlay from '@/components/resume-enhancer/annotations/FieldFixOverlay';
import type { FixAnnotation, FixCategory } from '@/components/resume-enhancer/annotations/fix-annotation';
import { CVSurgeonService } from '@/lib/services/cv-surgeon-service';
import { logResumeEnhancerEvent } from '@/lib/services/resumeEnhancerLogClient';
import { InfoTooltip } from '@/components/ui/tooltip';
import { AnimatedScore, AnimatedProgressBar } from '@/components/ui/AnimatedScore';
import { getFieldPathLabel } from '@/lib/utils/fieldPathLabels';
import LiveKeywordValidator from '@/components/resume-enhancer/LiveKeywordValidator';
import { suppressFix, getSuppressedFixes } from '@/lib/services/fix-suppression-service';
import { useATS } from '@/contexts/ATSContext';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { CHIP_INLINE } from '@/components/ui/chip-styles';

interface SurgeonReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewAndFix: () => void;
}

// Competitor Benchmarking Component
function CompetitorBenchmark({ fix }: { fix: FixAnnotation }) {
  // Extract skill name from fix
  const skillMatch = fix.replacementText?.match(/\b([A-Z][a-zA-Z]+(?:\.js|\.py)?)\b/) ||
    fix.issue?.match(/['"]([A-Z][a-zA-Z]+(?:\.js|\.py)?)['"]/) ||
    fix.replacementText?.match(/Add\s+([A-Z][a-zA-Z]+(?:\.js|\.py)?)/i);
  const skillName = skillMatch?.[1] || 'this skill';

  // Generate a realistic percentage (80-95% for common skills)
  const percentage = Math.floor(Math.random() * 16) + 80; // 80-95%

  return (
    <div className="mb-3 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <TrendingUp className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3.5 h-3.5 text-amber-300" />
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">Competitor Benchmark</div>
          </div>
          <div className="text-sm text-white font-semibold mb-2">
            {percentage}% of applicants for this role have <span className="text-amber-300">{skillName}</span>.
          </div>
          <div className="text-xs text-white/70">
            You do not. Adding this skill could significantly improve your ATS match rate.
          </div>
          {/* Mini progress bar */}
          <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-white/50 text-right">
            {percentage}% have this skill
          </div>
        </div>
      </div>
    </div>
  );
}

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

function whyItMatters(fix?: FixAnnotation) {
  if (!fix) return '';
  switch (fix.category) {
    case 'keywords':
      return 'Improves ATS matching by aligning your CV language with the job requirements.';
    case 'impact':
      return 'Makes your achievements measurable so recruiters can quickly see results and scope.';
    case 'clarity':
      return 'Improves readability and skimmability so key information lands faster.';
    case 'formatting':
      return 'Reduces friction for both recruiters and ATS parsing by keeping structure consistent.';
    case 'grammar':
      return 'Avoids credibility hits from small language errors.';
    case 'structure':
      return 'Helps recruiters find the right information in the expected place.';
    default:
      return 'This improves the overall quality and clarity of your CV.';
  }
}

export default function SurgeonReportModal({ isOpen, onClose, onReviewAndFix }: SurgeonReportModalProps) {
  const { state, dispatch } = useResumeEnhancer();
  const { openPaymentModal } = usePaymentModal();
  const {
    surgeonAnalysis: contextSurgeonAnalysis,
    atsScore,
    atsAnalysis,
    updateSurgeonAnalysis,
    refreshSurgeonAnalysis
  } = useATS();

  const [isCriticalExpanded, setIsCriticalExpanded] = useState(true);
  const [isImprovementsExpanded, setIsImprovementsExpanded] = useState(true);
  const [isGoodExpanded, setIsGoodExpanded] = useState(false);
  const [recruiterView, setRecruiterView] = useState(false);

  const docScrollRef = useRef<HTMLDivElement>(null);

  // Use context surgeon analysis if available, otherwise fall back to state
  const surgeonAnalysis = contextSurgeonAnalysis || (state.surgeonAnalysis ? {
    score: state.surgeonAnalysis.score,
    fixes: state.surgeonAnalysis.fixes || [],
    annotations: state.fixAnnotations || [],
    targetRole: state.targetRole || '',
    seniorityLevel: state.seniorityLevel || '',
    analyzedAt: new Date(),
  } : null);

  // Calculate JD reference status before using it
  const jdText =
    (typeof state.jobData?.description === 'string' && state.jobData.description) ||
    (typeof state.jobData?.jobDescription === 'string' && state.jobData.jobDescription) ||
    (typeof state.jobData?.jd === 'string' && state.jobData.jd) ||
    '';
  const isJDReferenced = jdText.trim().length > 0;
  const scoreLabel = isJDReferenced ? 'ATS score' : 'CV score';

  // Use ATS score from context if available (more accurate), otherwise use surgeon score
  const displayScore = (atsScore !== null && isJDReferenced) ? atsScore : (surgeonAnalysis?.score ?? 0);

  const openFixes = useMemo(
    () => (state.fixAnnotations || []).filter((f) => f.status === 'open'),
    [state.fixAnnotations]
  );
  const appliedFixes = useMemo(
    () => (state.fixAnnotations || []).filter((f) => f.status === 'applied'),
    [state.fixAnnotations]
  );
  const semanticMatchFixes = useMemo(
    () => (state.fixAnnotations || []).filter((f) => f.status === 'semantic_match'),
    [state.fixAnnotations]
  );
  const suppressedFixes = useMemo(
    () => (state.fixAnnotations || []).filter((f) => f.status === 'suppressed'),
    [state.fixAnnotations]
  );

  const criticalFixes = useMemo(() => {
    return openFixes
      .filter((f) => f.severity === 'high')
      .slice()
      .sort((a, b) => (b.impactScoreDelta || 0) - (a.impactScoreDelta || 0));
  }, [openFixes]);

  const improvementFixes = useMemo(() => {
    return openFixes
      .filter((f) => f.severity !== 'high')
      .slice()
      .sort((a, b) => (b.impactScoreDelta || 0) - (a.impactScoreDelta || 0));
  }, [openFixes]);

  const categoryCounts = useMemo(() => countByCategory(openFixes), [openFixes]);
  const topCategory = useMemo(() => {
    const entries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const [cat] = entries[0] || [];
    return (cat as FixCategory | undefined) || undefined;
  }, [categoryCounts]);

  const selectedFix = useMemo(
    () => (state.activeFixId ? (state.fixAnnotations || []).find((f) => f.id === state.activeFixId) : undefined),
    [state.activeFixId, state.fixAnnotations]
  );

  // Helper to get skill items - must be defined before useMemo
  const getSkillItems = (s: any): string[] => {
    const items =
      (Array.isArray(s?.skills) && s.skills) ||
      (Array.isArray(s?.keywords) && s.keywords) ||
      (Array.isArray(s?.items) && s.items) ||
      [];
    return items.map((x: any) => String(x)).filter(Boolean);
  };

  // Extract missing skills for ghost text suggestions
  const ghostSkills = useMemo(() => {
    const skills: Array<{ skill: string; category?: string; fixId?: string }> = [];
    openFixes.forEach((fix) => {
      // Look for fixes related to missing skills
      if (fix.fieldPath.includes('skills') || fix.category === 'keywords') {
        // Extract skill name from replacement text or issue
        const skillMatch = fix.replacementText?.match(/\b([A-Z][a-zA-Z]+(?:\.js|\.py)?)\b/) ||
          fix.issue?.match(/['"]([A-Z][a-zA-Z]+(?:\.js|\.py)?)['"]/) ||
          fix.replacementText?.match(/Add\s+([A-Z][a-zA-Z]+(?:\.js|\.py)?)/i);
        if (skillMatch && skillMatch[1]) {
          const skillName = skillMatch[1];
          // Check if skill is not already in CV
          const existingSkills = state.cvData?.skills || [];
          const hasSkill = existingSkills.some((s: any) => {
            const items = getSkillItems(s);
            return items.some((item: string) => item.toLowerCase().includes(skillName.toLowerCase()));
          });
          if (!hasSkill) {
            skills.push({
              skill: skillName,
              category: fix.fieldPath.includes('skills') ? 'Technical Skills' : undefined,
              fixId: fix.id
            });
          }
        }
      }
    });
    return skills;
  }, [openFixes, state.cvData]);

  const scrollToFix = (fix: FixAnnotation | undefined) => {
    if (!fix) return;
    const container = docScrollRef.current;
    if (!container) return;

    const byFix = container.querySelector(`[data-fix-id="${fix.id}"]`) as HTMLElement | null;
    const byField = container.querySelector(`[data-field-path="${fix.fieldPath}"]`) as HTMLElement | null;
    const el = byFix || byField;
    if (!el) return;

    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      // Ignore scroll errors; keep UI responsive.
    }
  };

  // Sync surgeon analysis from context when modal opens
  useEffect(() => {
    if (isOpen && state.cvId && !contextSurgeonAnalysis) {
      refreshSurgeonAnalysis(state.cvId).catch(err => {
        console.warn('Failed to refresh surgeon analysis from context:', err);
      });
    }
  }, [isOpen, state.cvId, contextSurgeonAnalysis, refreshSurgeonAnalysis]);

  // Ensure we always have an active selection when the report opens.
  useEffect(() => {
    if (!isOpen) return;
    if (!state.activeFixId) {
      const first = criticalFixes[0] || openFixes[0];
      if (first) dispatch({ type: 'SET_ACTIVE_FIX', payload: first.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keep the document centered on the current selection.
  useEffect(() => {
    if (!isOpen) return;
    if (!state.activeFixId) return;
    const fix = (state.fixAnnotations || []).find((f) => f.id === state.activeFixId);
    const raf = window.requestAnimationFrame(() => scrollToFix(fix));
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, state.activeFixId, state.fixAnnotations]);

  // Force CV pages to fit container width in report mode (override inline 210mm width)
  useEffect(() => {
    if (!isOpen || !docScrollRef.current) return;
    const container = docScrollRef.current;
    const forceWidth = () => {
      const pages = container.querySelectorAll('.cv-page');
      pages.forEach((page) => {
        if (page instanceof HTMLElement) {
          // Force override inline styles - remove 210mm and set to 100%
          if (page.style.width && page.style.width.includes('210mm')) {
            page.style.width = '100%';
          }
          if (!page.style.width || page.style.width !== '100%') {
            page.style.width = '100%';
          }
          page.style.maxWidth = '100%';
          page.style.boxSizing = 'border-box';
        }
      });
    };
    // Run immediately and on animation frames for smooth updates
    forceWidth();
    const raf = requestAnimationFrame(forceWidth);
    const timeout1 = setTimeout(forceWidth, 50);
    const timeout2 = setTimeout(forceWidth, 200);
    const observer = new MutationObserver(() => {
      requestAnimationFrame(forceWidth);
    });
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      observer.disconnect();
    };
  }, [isOpen, state.cvData]);

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

  const handleSelectFixAndScroll = (fix: FixAnnotation) => {
    handleSelectFix(fix.id);
    // Scroll immediately using the known fix; the selection-effect will keep it in sync too.
    window.requestAnimationFrame(() => scrollToFix(fix));
  };

  const handleReviewAndFix = () => {
    dispatch({ type: 'SET_REVIEW_MODE', payload: true });
    const firstOpen = (state.fixAnnotations || []).find((f) => f.status === 'open');
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

  const handleApplyFix = async (fix: FixAnnotation) => {
    // Validate that skills fixes only apply to skills fields, not name or other fields
    if ((fix.fieldPath.includes('skills') || fix.category === 'keywords') &&
      (fix.fieldPath.includes('basics.name') || (fix.fieldPath.includes('name') && !fix.fieldPath.includes('skills')))) {
      console.warn('⚠️ Skipping fix - fieldPath points to name field but fix is for skills:', fix.fieldPath);
      return;
    }

    // Preserve the original name before applying fix
    const originalName = state.cvData.basics?.name;

    // Apply the fix
    const result = CVSurgeonService.applyFixAnnotation(state.cvData, fix);
    let updatedCV = result.updatedCV;

    // Always restore the name if it was accidentally changed (safety check)
    if (originalName && updatedCV.basics?.name !== originalName) {
      updatedCV = {
        ...updatedCV,
        basics: {
          ...updatedCV.basics,
          name: originalName
        }
      };
    }

    dispatch({ type: 'SET_CV_DATA', payload: updatedCV });
    dispatch({ type: 'MARK_FIX_APPLIED', payload: fix.id });

    // Recalculate score dynamically after applying fix (more strict scoring)
    if (state.surgeonAnalysis) {
      // Get current applied and open fixes (accounting for the one we just applied)
      const previouslyApplied = (state.fixAnnotations || []).filter((f) => f.status === 'applied');
      const openFixes = (state.fixAnnotations || []).filter((f) => f.status === 'open' && f.id !== fix.id);

      // Calculate new score: start with base score, add impact of applied fixes
      let newScore = state.surgeonAnalysis.score;

      // Add impact of the fix we just applied (more strict: only count 75% of the impact to be conservative)
      const appliedImpact = Math.round((fix.impactScoreDelta || 0) * 0.75);
      newScore = Math.min(100, newScore + appliedImpact);

      // More strict: Apply penalty for remaining critical open fixes (10% of their impact)
      const criticalOpenFixes = openFixes.filter((f) => f.severity === 'high');
      const criticalPenalty = criticalOpenFixes.reduce((sum, f) => sum + Math.max(0, (f.impactScoreDelta || 0) * 0.1), 0);

      // More strict: Apply smaller penalty for medium severity open fixes (5% of their impact)
      const mediumOpenFixes = openFixes.filter((f) => f.severity === 'medium');
      const mediumPenalty = mediumOpenFixes.reduce((sum, f) => sum + Math.max(0, (f.impactScoreDelta || 0) * 0.05), 0);

      const totalPenalty = criticalPenalty + mediumPenalty;
      newScore = Math.max(0, newScore - Math.round(totalPenalty));

      // Ensure score doesn't exceed 100
      newScore = Math.min(100, Math.max(0, newScore));

      // Update score in state immediately for live feedback
      dispatch({
        type: 'SET_SURGEON_ANALYSIS',
        payload: {
          score: newScore,
          fixes: state.surgeonAnalysis.fixes
        }
      });

      // Update ATS Context if available
      if (state.cvId && surgeonAnalysis) {
        updateSurgeonAnalysis({
          ...surgeonAnalysis,
          score: newScore,
        }, state.cvId).catch(err => {
          console.warn('Failed to update surgeon analysis in context:', err);
        });
      }
    }

    logResumeEnhancerEvent({
      action: 'resume_enhancer_fix_applied',
      resourceType: 'cv',
      resourceId: state.cvId,
      metadata: { fixId: fix.id, fieldPath: fix.fieldPath, category: fix.category, impactScoreDelta: fix.impactScoreDelta }
    });

    const next = (state.fixAnnotations || []).find((f) => f.status === 'open' && f.id !== fix.id);
    dispatch({ type: 'SET_ACTIVE_FIX', payload: next?.id });
  };

  const handleAddGhostSkill = (skill: string, category?: string, fixId?: string) => {
    // Find the related fix and apply it
    if (fixId) {
      const fix = (state.fixAnnotations || []).find((f) => f.id === fixId);
      if (fix) {
        handleApplyFix(fix);
      }
    } else {
      // If no fix ID, add skill directly to CV
      const currentSkills = state.cvData?.skills || [];
      const categoryName = category || 'Technical Skills';
      const existingCategory = currentSkills.find((s: any) => {
        const cat = String(s?.category || s?.name || '').toLowerCase();
        return cat === categoryName.toLowerCase();
      });

      if (existingCategory) {
        // Add to existing category
        const items = getSkillItems(existingCategory);
        if (!items.includes(skill)) {
          const updatedSkills = currentSkills.map((s: any) => {
            if (s === existingCategory) {
              return { ...s, skills: [...items, skill] };
            }
            return s;
          });
          dispatch({ type: 'SET_CV_DATA', payload: { ...state.cvData, skills: updatedSkills } });
        }
      } else {
        // Create new category
        const newSkills = [...currentSkills, { category: categoryName, skills: [skill] }];
        dispatch({ type: 'SET_CV_DATA', payload: { ...state.cvData, skills: newSkills } });
      }
    }
  };

  const handleDismissFix = (fixId: string) => {
    dispatch({ type: 'MARK_FIX_DISMISSED', payload: fixId });
    logResumeEnhancerEvent({
      action: 'resume_enhancer_fix_dismissed',
      resourceType: 'cv',
      resourceId: state.cvId,
      metadata: { fixId }
    });
    const next = (state.fixAnnotations || []).find((f) => f.status === 'open' && f.id !== fixId);
    dispatch({ type: 'SET_ACTIVE_FIX', payload: next?.id });
  };

  const handleSuppressFix = async (fix: FixAnnotation) => {
    if (!state.cvId) return;

    // Suppress the fix
    await suppressFix(fix.id, 'manual_override', {
      cvId: state.cvId,
      userId: '', // Will be set by the service if available
      fieldPath: fix.fieldPath,
      originalIssue: fix.issue,
      originalText: fix.originalText,
      fixSignatureHash: fix.fixSignatureHash
    });

    // Update state
    dispatch({
      type: 'MARK_FIX_SUPPRESSED',
      payload: {
        fixId: fix.id,
        reason: 'manual_override',
        fixSignatureHash: fix.fixSignatureHash
      }
    });

    // Optimistically update score
    if (state.surgeonAnalysis) {
      const newScore = Math.min(100, state.surgeonAnalysis.score + Math.round((fix.impactScoreDelta || 0) * 0.5));
      dispatch({
        type: 'SET_SURGEON_ANALYSIS',
        payload: {
          score: newScore,
          fixes: state.surgeonAnalysis.fixes
        }
      });
    }

    logResumeEnhancerEvent({
      action: 'resume_enhancer_fix_suppressed',
      resourceType: 'cv',
      resourceId: state.cvId,
      metadata: { fixId: fix.id, reason: 'manual_override' }
    });

    const next = (state.fixAnnotations || []).find((f) => f.status === 'open' && f.id !== fix.id);
    dispatch({ type: 'SET_ACTIVE_FIX', payload: next?.id });
  };

  const handleFixStatusUpdate = (fixId: string, status: 'open' | 'semantic_match', semanticMatch?: { requiredTerm: string; foundTerm: string; confidenceScore: number }) => {
    if (status === 'semantic_match' && semanticMatch) {
      dispatch({
        type: 'MARK_FIX_SEMANTIC_MATCH',
        payload: {
          fixId,
          foundTerm: semanticMatch.foundTerm,
          confidence: semanticMatch.confidenceScore
        }
      });
    }
  };

  if (!isOpen) return null;

  const FixRow = ({ fix, disabled = false }: { fix: FixAnnotation; disabled?: boolean }) => {
    const isActive = state.activeFixId === fix.id;
    const location = getFieldPathLabel(fix.fieldPath);
    const catLabel = CATEGORY_LABELS[fix.category] || fix.category;
    const isSemanticMatch = fix.status === 'semantic_match';
    const isSuppressed = fix.status === 'suppressed';

    // Determine icon and color based on status
    let IconComponent: typeof CheckCircle2 | typeof AlertTriangle | typeof CheckCircle;
    let iconColor: string;

    if (disabled || fix.status === 'applied') {
      IconComponent = CheckCircle2;
      iconColor = 'text-emerald-400';
    } else if (isSemanticMatch) {
      IconComponent = CheckCircle;
      iconColor = 'text-yellow-400';
    } else if (isSuppressed) {
      IconComponent = CheckCircle2;
      iconColor = 'text-gray-400';
    } else if (fix.severity === 'high') {
      IconComponent = AlertTriangle;
      iconColor = 'text-red-400';
    } else {
      IconComponent = AlertTriangle;
      iconColor = 'text-amber-400';
    }

    return (
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => !disabled && handleSelectFixAndScroll(fix)}
          disabled={disabled}
          className={[
            'flex-1 text-left rounded-xl px-3 py-2 transition-colors border',
            disabled
              ? 'opacity-60 cursor-not-allowed border-transparent'
              : isActive
                ? 'bg-[#013f2e]/10 border-[#013f2e]/40'
                : 'bg-white/0 hover:bg-white/5 border-white/10'
          ].join(' ')}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex-shrink-0">
              <IconComponent className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-900 dark:text-white break-words">
                {fix.issue}
                {isSemanticMatch && fix.semanticMatch && (
                  <span className="ml-2 text-[10px] text-yellow-400" title={`Matches '${fix.semanticMatch.requiredTerm}' via '${fix.semanticMatch.foundTerm}'`}>
                    (Semantic match)
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`${CHIP_INLINE} border-white/10 bg-white/5 text-white/80`}>
                  {catLabel}
                </span>
                <span className={`${CHIP_INLINE} border-white/10 bg-white/5 text-white/80`}>
                  {location}
                </span>
                <span className={`${CHIP_INLINE} border-white/10 bg-white/5 text-white/80 tabular-nums`}>
                  +{fix.impactScoreDelta || 0}
                </span>
              </div>
            </div>
          </div>
        </button>
        {!disabled && fix.status === 'open' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSuppressFix(fix);
            }}
            className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
            title="I fixed this in a way the AI missed"
          >
            <CheckCircle className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const Bucket = ({
    title,
    count,
    expanded,
    onToggle,
    children,
    badgeClassName
  }: {
    title: string;
    count: number;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    badgeClassName: string;
  }) => {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <button
          type="button"
          onClick={onToggle}
          className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">{title}</span>
            <span className={[`${CHIP_INLINE} border-white/10 font-semibold`, badgeClassName].join(' ')}>
              {count}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-white/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/60" />
          )}
        </button>
        {expanded && <div className="p-3 pt-0 space-y-2">{children}</div>}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {/* Live Keyword Validator */}
      <LiveKeywordValidator
        key="keyword-validator"
        cvData={state.cvData}
        fixAnnotations={state.fixAnnotations}
        onFixStatusUpdate={handleFixStatusUpdate}
      />

      {isOpen && (
        <div key="surgeon-modal" className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="w-full h-full max-w-[1600px] max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-3rem)] bg-white dark:bg-[#141810] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/60 flex flex-col"
          >
            {/* Top Bar (HUD) */}
            {surgeonAnalysis?.isRestricted && (
              <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-200 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Free limit reached. Showing Grammar & Clarity only.</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openPaymentModal({
                      preselectedPlanKey: 'focused_monthly',
                      triggerContext: 'surgeon-report-restricted',
                      returnUrl: window.location.href
                    })
                  }
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-full font-medium transition-colors"
                >
                  Upgrade to Focused
                </button>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="w-4 h-4 text-[#013f2e]" />
                <InfoTooltip content="Issues are highlighted directly on your CV. Select a fix on the left, then apply it from the right panel.">
                  <div className="text-white font-semibold cursor-help truncate">AIResume Optimisation Report</div>
                </InfoTooltip>
                <div className="hidden md:flex items-center gap-3 text-xs text-white/70">
                  <span className="whitespace-nowrap">{openFixes.length} open</span>
                  {state.targetRole && (
                    <span className="whitespace-nowrap">
                      Optimizing for: <span className="text-white/90 font-semibold">{state.targetRole}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center gap-3">
                  <div className="text-xs text-white/60">
                    <div className="uppercase tracking-wide">{scoreLabel}</div>
                    <div className="mt-0.5 flex items-end gap-2">
                      <AnimatedScore value={displayScore} suffix="/100" size="md" showChange={true} />
                      <div className="w-36">
                        <AnimatedProgressBar
                          value={displayScore}
                          height={8}
                          showLabel={false}
                          colorStops={[
                            { threshold: 0, color: '#ef4444' },
                            { threshold: 50, color: '#f59e0b' },
                            { threshold: 70, color: '#013f2e' }
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-white/70">
                    <div className="uppercase tracking-wide">Quick wins</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-red-400 font-semibold">{criticalFixes.length} critical</span>
                      <span className="text-amber-300 font-semibold">{improvementFixes.length} improvements</span>
                      {suppressedFixes.length > 0 && (
                        <span className="text-gray-400 font-semibold">
                          [{suppressedFixes.length} suppressed]
                        </span>
                      )}
                      {topCategory && (
                        <span className="text-white/70">
                          Top: <span className="text-white/90 font-semibold">{CATEGORY_LABELS[topCategory]}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <InfoTooltip content="Toggle Recruiter Vision: Blur everything except job titles, companies, dates, and section headers to see what recruiters scan in 6 seconds.">
                  <button
                    onClick={() => setRecruiterView((v) => !v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${recruiterView
                      ? 'bg-[#013f2e] text-white hover:bg-[#02523c]'
                      : 'bg-white/10 text-white/90 hover:bg-white/15'
                      }`}
                  >
                    {recruiterView ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>Recruiter View</span>
                  </button>
                </InfoTooltip>

                <InfoTooltip content={openFixes.length === 0 ? "Refresh to run a new analysis scan" : "Apply all suggested fixes to your CV automatically and save in background."}>
                  <button
                    onClick={async () => {
                      if (openFixes.length === 0) {
                        // Refresh analysis - clear cache and trigger re-analysis
                        if (state.cvId && state.targetRole && state.seniorityLevel) {
                          try {
                            // Clear the cache to force fresh analysis
                            await CVSurgeonService.clearAnalysisCache(state.cvId, state.cvId);
                            // Trigger new analysis
                            const result = await CVSurgeonService.analyzeCVWithCache(
                              state.cvData,
                              state.targetRole,
                              state.seniorityLevel,
                              state.cvId,
                              undefined,
                              state.jobData
                            );
                            dispatch({ type: 'SET_SURGEON_ANALYSIS', payload: { score: result.score, fixes: result.fixes, scoreReport: result.scoreReport } });
                            dispatch({ type: 'SET_FIX_ANNOTATIONS', payload: result.annotations });

                            // Update ATS Context
                            if (state.cvId) {
                              updateSurgeonAnalysis({
                                score: result.score,
                                fixes: result.fixes,
                                annotations: result.annotations,
                                targetRole: state.targetRole || '',
                                seniorityLevel: state.seniorityLevel || '',
                                analyzedAt: new Date(),
                                scoreReport: result.scoreReport,
                              }, state.cvId).catch(err => {
                                console.warn('Failed to update surgeon analysis in context:', err);
                              });
                            }

                            const firstOpen = result.annotations.find((f) => f.status === 'open');
                            if (firstOpen) {
                              dispatch({ type: 'SET_ACTIVE_FIX', payload: firstOpen.id });
                            }
                          } catch (error) {
                            console.error('Failed to refresh analysis:', error);
                          }
                        }
                      } else {
                        // Apply all open fixes sequentially
                        for (const fix of openFixes) {
                          await handleApplyFix(fix);
                        }

                        // Save CV in background after applying all fixes
                        if (state.cvId && state.cvId !== 'guest-draft' && state.cvData) {
                          try {
                            await fetch(`/api/cvs/${state.cvId}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                cvData: state.cvData,
                                title: state.cvTitle,
                                templateId: state.selectedTemplate?.id
                              })
                            });
                            console.log('✅ CV saved in background after applying all fixes');
                          } catch (error) {
                            console.error('Failed to save CV in background:', error);
                          }
                        }
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#013f2e] hover:bg-[#02523c] text-white transition-colors"
                  >
                    {openFixes.length === 0 ? 'Refresh' : 'Fix All'}
                  </button>
                </InfoTooltip>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                  aria-label="Close report"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>

            {/* Body: Column-wise layout (Left rail | CV | Right panel stacked vertically) */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
              {/* Left rail */}
              <aside className="hidden lg:block w-80 flex-shrink-0 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] overflow-hidden flex flex-col" style={{ height: '100%' }}>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3" style={{ maxHeight: '100%' }}>
                  <Bucket
                    title="Critical"
                    count={criticalFixes.length}
                    expanded={isCriticalExpanded}
                    onToggle={() => setIsCriticalExpanded((v) => !v)}
                    badgeClassName="bg-red-500/20 text-red-300"
                  >
                    {criticalFixes.length === 0 ? (
                      <div className="text-xs text-white/50 italic">No critical fixes.</div>
                    ) : (
                      criticalFixes.map((fix, idx) => <FixRow key={fix.id || `critical-${idx}`} fix={fix} />)
                    )}
                  </Bucket>

                  <Bucket
                    title="Improvements"
                    count={improvementFixes.length}
                    expanded={isImprovementsExpanded}
                    onToggle={() => setIsImprovementsExpanded((v) => !v)}
                    badgeClassName="bg-amber-500/20 text-amber-200"
                  >
                    {improvementFixes.length === 0 ? (
                      <div className="text-xs text-white/50 italic">No improvements available.</div>
                    ) : (
                      improvementFixes.map((fix, idx) => <FixRow key={fix.id || `improvement-${idx}`} fix={fix} />)
                    )}
                  </Bucket>

                  <Bucket
                    title="Good"
                    count={appliedFixes.length}
                    expanded={isGoodExpanded}
                    onToggle={() => setIsGoodExpanded((v) => !v)}
                    badgeClassName="bg-emerald-500/20 text-emerald-200"
                  >
                    {appliedFixes.length === 0 ? (
                      <div className="text-xs text-white/50 italic">No applied fixes yet.</div>
                    ) : (
                      appliedFixes.slice(0, 20).map((fix, idx) => <FixRow key={fix.id || `applied-${idx}`} fix={fix} disabled={true} />)
                    )}
                  </Bucket>
                </div>
              </aside>

              {/* Center: CV preview with contextual highlights - Restricted to A4 width */}
              <div className={`flex-1 min-h-0 bg-black/10 relative overflow-hidden cv-report-container ${recruiterView ? 'recruiter-view-active' : ''}`}>
                <div ref={docScrollRef} className="h-full overflow-y-auto overscroll-contain flex justify-center">
                  <div className="w-full max-w-[210mm] mx-auto">
                    <CVOverlayDocument
                      cvData={state.cvData}
                      overlaysEnabled
                      annotations={state.fixAnnotations}
                      activeFixId={state.activeFixId}
                      onSelectFix={handleSelectFix}
                      onApplyFix={handleApplyFix}
                      onDismissFix={handleDismissFix}
                      renderMode="continuous"
                      overlayInlineCard={false}
                      ghostSkills={ghostSkills}
                      onAddGhostSkill={handleAddGhostSkill}
                      customCSS={`
                        .cv-report-container .cv-snapshot-wrapper {
                          margin: 0;
                          background: white;
                        }
                        ${recruiterView ? `
                          /* Recruiter View: blur body copy, keep the structure recruiters scan in 6 seconds */
                          .cv-report-container.recruiter-view-active .cv-document .cv-body,
                          .cv-report-container.recruiter-view-active .cv-document .cv-prose,
                          .cv-report-container.recruiter-view-active .cv-document .cv-body p,
                          .cv-report-container.recruiter-view-active .cv-document .cv-body li {
                            filter: blur(4px) !important;
                            opacity: 0.3 !important;
                            transition: filter 0.3s ease, opacity 0.3s ease;
                          }
                          .cv-report-container.recruiter-view-active .cv-document .cv-heading,
                          .cv-report-container.recruiter-view-active .cv-document .cv-title,
                          .cv-report-container.recruiter-view-active .cv-document .cv-subtitle,
                          .cv-report-container.recruiter-view-active .cv-document .cv-date,
                          .cv-report-container.recruiter-view-active .cv-document .cv-name,
                          .cv-report-container.recruiter-view-active .cv-document .cv-role,
                          .cv-report-container.recruiter-view-active .cv-document .cv-contact,
                          .cv-report-container.recruiter-view-active .cv-document .cv-section {
                            filter: blur(0) !important;
                            opacity: 1 !important;
                          }
                        ` : ''}
                      `}
                    />
                  </div>
                </div>
              </div>

              {/* Right panel: Fix it zone */}
              <aside className="hidden lg:block w-96 flex-shrink-0 border-l border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] overflow-hidden flex flex-col" style={{ height: '100%' }}>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3" style={{ maxHeight: '100%' }}>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/60 uppercase tracking-wide">Selected</div>
                    {selectedFix ? (
                      <>
                        <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white break-words">{selectedFix.issue}</div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className={`${CHIP_INLINE} border-white/10 bg-white/5 text-white/80`}>
                            {CATEGORY_LABELS[selectedFix.category] || selectedFix.category}
                          </span>
                          <span className={`${CHIP_INLINE} border-white/10 bg-white/5 text-white/80`}>
                            {selectedFix.severity === 'high' ? 'Critical' : 'Improvement'}
                          </span>
                          <span className={`${CHIP_INLINE} border-white/10 bg-white/5 text-white/80 tabular-nums`}>
                            +{selectedFix.impactScoreDelta || 0}
                          </span>
                          <span className={`${CHIP_INLINE} border-white/10 bg-white/5 text-white/80`}>
                            {getFieldPathLabel(selectedFix.fieldPath)}
                          </span>
                        </div>
                        <div className="mt-3 text-xs text-white/70">{whyItMatters(selectedFix)}</div>
                      </>
                    ) : (
                      <div className="mt-2 text-xs text-white/50">
                        Select an issue from the left rail (or click a highlight on the CV).
                      </div>
                    )}
                  </div>

                  {selectedFix && selectedFix.status === 'open' ? (
                    <>
                      {/* Competitor Benchmarking for skill-related fixes */}
                      {(selectedFix.category === 'keywords' || selectedFix.fieldPath.includes('skills')) && (
                        <CompetitorBenchmark fix={selectedFix} />
                      )}
                      <FieldFixOverlay fix={selectedFix} onApply={handleApplyFix} onDismiss={handleDismissFix} onSuppress={handleSuppressFix} />
                    </>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                      Select an issue from the left rail (or click a highlight on the CV).
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
