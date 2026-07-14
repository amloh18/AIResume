// @ts-nocheck
'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';
import { downloadCanvasAsPDF } from '@/lib/utils/downloadCanvas';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import DownloadModal from '@/components/ui/DownloadModal';
import {
  Sparkles,
  Component, Eye, Target, ZoomIn, ZoomOut, Plus, Shuffle, Palette, X,
  Check, Info, LayoutTemplate, FileJson
} from 'lucide-react';

// Import CV Builder form components

import RoleProfilerModal from '@/components/resume-enhancer/RoleProfilerModal';
import SurgeonReportModal from '@/components/resume-enhancer/SurgeonReportModal';
import FieldFixOverlay from '@/components/resume-enhancer/annotations/FieldFixOverlay';
import { validateCVPreview } from '@/lib/validation/cv-preview-validator';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { AnimatedScore } from '@/components/ui/AnimatedScore';
import { useATS } from '@/contexts/ATSContext';
import ATSUnlockCard from '@/components/resume-enhancer/ATSUnlockCard';
import SmartJDModal from '@/components/resume-enhancer/SmartJDModal';

// CV Surgeon service
import { CVSurgeonService, SurgicalFix } from '@/lib/services/cv-surgeon-service';
import { logResumeEnhancerEvent } from '@/lib/services/resumeEnhancerLogClient';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA, SECTION_TYPE_TO_FIELD_MAP, DEFAULT_SECTION_ITEM } from '@/types/unified-cv-schema';
import { inferRoleContextFromCVData } from '@/lib/utils/resumeEnhancerRoleInference';
import { calculateOptimalColumnDistribution } from '@/services/sectionRebalancer';
import type { RecruiterFeatures } from '@/components/resume-enhancer/panels/RecruiterModePanel';
import type { ATSFeatures } from '@/components/resume-enhancer/panels/ATSModePanel';
import { getAnalysisModeWithValidation } from '@/lib/utils/analysis-mode';
import toast from 'react-hot-toast';
import FloatingFormEditor from '@/components/resume-enhancer/FloatingFormEditor';
import { Skeleton } from '@/components/ui/SkeletonLoader';

const CVBuilderProAdapter = lazy(() =>
  import('@/components/cv-builder-pro/CVBuilderProAdapter').then(mod => ({ default: mod.default }))
);
import FloatingPulsePill, { type FloatingPulsePillHandle } from '@/components/resume-enhancer/FloatingPulsePill';
import ATSMeterPanel from '@/components/resume-enhancer/panels/ATSMeterPanel';
import MoriChatInterface from '@/components/resume-enhancer/panels/MoriChatInterface';
import UtilityPanelPill from '@/components/resume-enhancer/components/UtilityPanelPill';
import { usePillEngine } from '@/hooks/usePillEngine';
import { AnimatePresence, motion } from 'framer-motion';
import { ITemplate } from '@/types/template';
import { gsap } from 'gsap';
import EditorOnboarding from '@/components/resume-enhancer/components/EditorOnboarding';
import EditorChecklist, { type EditorChecklistProgress } from '@/components/resume-enhancer/components/EditorChecklist';
import { useEditorChecklist } from '@/lib/hooks/useEditorChecklist';
import EditorStepsNavOverlay from '@/components/resume-enhancer/components/EditorStepsNavOverlay';

type ViewMode = 'edit' | 'preview' | 'recruiter' | 'ats';

const DEFAULT_SECTION_TITLES: Record<string, string> = {
  summary: 'Professional Summary',
  experience: 'Professional Experience',
  education: 'Education',
  projects: 'Projects',
  certifications: 'Certifications',
  awards: 'Awards',
  publications: 'Publications',
  volunteer: 'Volunteer Experience',
  references: 'References',
  skills: 'Skills',
  languages: 'Languages',
  interests: 'Interests',
  contact: 'Contact'
};




interface Step3CVProps {
  onComplete: () => void;
  onActiveSectionChange?: (sectionId: string) => void;
}

export interface Step3CVRef {
  scrollToSection: (sectionId: string) => void;
  handleAddSection: () => void;
  addNewSection: (sectionId: string) => void;
  handleDeleteSectionFromSidebar: (sectionId: string) => void;
  handleSectionReorder: (sectionIds: string[]) => void;
  activeSection: string;
}

const InlineChecklist = ({ 
  dispatch, 
  goToStep, 
  setActiveUtilityPanel 
}: { 
  dispatch: any, 
  goToStep: any, 
  setActiveUtilityPanel: any 
}) => {
  const { progress: checklistProgress, markComplete, isComplete } = useEditorChecklist();

  const handleItemComplete = React.useCallback((id: 'layout' | 'design' | 'aiChat' | 'review') => {
    markComplete(id);
  }, [markComplete]);

  if (isComplete) return null;

  return (
    <EditorChecklist
      progress={checklistProgress}
      onOpenLayout={() => {
        dispatch({ type: 'SET_STEP', payload: 1 });
        window.dispatchEvent(new CustomEvent('open-templates'));
      }}
      onOpenDesign={() => setActiveUtilityPanel('design')}
      onOpenAiChat={() => setActiveUtilityPanel('mori')}
      onOpenReview={() => goToStep(5)}
      onItemComplete={handleItemComplete}
    />
  );
};

const Step3CV = forwardRef<Step3CVRef, Step3CVProps>(
  ({ onComplete, onActiveSectionChange }, ref) => {
    const { data: session } = useSession();
    const isGuestMode = !session;
    const { state, dispatch, convertToJourney, loadCV, getAnalysisModeInfo, setTemplate, setAtsScoreCap, goToStep } = useResumeEnhancer();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [jdText, setJdText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showRoleProfiler, setShowRoleProfiler] = useState(false);

     const isImproveMode = searchParams.get('improve') === 'true' || searchParams.get('mode') === 'improve';
    const showChecklist = state.cvType === 'master' && (searchParams.get('mode') || 'create') === 'create';
    const [isSectionEdited, setIsSectionEdited] = useState(false);
    const [isPdfExported, setIsPdfExported] = useState(false);

    // Improve mode now keeps analysis in the right rail instead of opening the
    // modal automatically. Users can still run analysis from the rail.

    const handleFinishOnboarding = async () => {
      try {
        const res = await fetch('/api/user/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            onboarding: {
              activation_status: 'completed'
            }
          })
        });
        if (res.ok) {
          toast.success('Onboarding completed! Welcome to your dashboard.');
          router.push('/dashboard');
        } else {
          toast.error('Failed to update onboarding status.');
        }
      } catch (err) {
        console.error(err);
        toast.error('An error occurred. Moving to dashboard.');
        router.push('/dashboard');
      }
    };
    const [showJobParserDialog, setShowJobParserDialog] = useState(false);
    const [isATSUnlockDismissed, setIsATSUnlockDismissed] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [showDownloadModal, setShowDownloadModal] = useState(false);

    // Listen for download modal event from Canvas
    useEffect(() => {
      const handleDownloadEvent = () => setShowDownloadModal(true);
      window.addEventListener('open-download-modal', handleDownloadEvent);
      return () => window.removeEventListener('open-download-modal', handleDownloadEvent);
    }, []);

    const cvPreviewRef = useRef<HTMLDivElement>(null);
    const sidePanelRef = useRef<HTMLDivElement>(null);
    const pillRef = useRef<FloatingPulsePillHandle>(null);
    const canvasBuilderRef = useRef<any>(null);
    const lastSavedSectionTitlesRef = useRef<string>('');
    const hasLoadedUserSectionTitlesRef = useRef(false);

    // Auto-save refs
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedCvDataStrRef = useRef<string>('');

    // Floating Editor State
    const floatingEditorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [activeEditorSectionId, setActiveEditorSectionId] = useState<string | null>(null);
    const [editorPosition, setEditorPosition] = useState<{ top: number; left: number; height: number; alignment: 'left' | 'right' } | null>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('edit'); // New View Mode State
    const [pageFormat, setPageFormat] = useState<'a4' | 'letter'>('a4');
    const [highlightedField, setHighlightedField] = useState<string | null>(null);

    // CV Layout Validation — runs whenever cvData changes
    const validationResult = useMemo(() => {
      if (!state.cvData) return null;
      return validateCVPreview(state.cvData);
    }, [state.cvData]);

    const { openPaymentModal } = usePaymentModal();
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async (format: 'pdf' | 'docx' = 'pdf') => {
      setIsDownloading(true);
      try {
        const baseName = state.cvTitle || 'CV';

        if (format === 'pdf') {
          await downloadCanvasAsPDF({
            paperSize: (state.paperSize as 'A4' | 'Letter') || 'A4',
            filename: `${baseName}.pdf`,
            cvData: state.cvData,
            template: state.selectedTemplate,
          });
          toast.success('Downloaded successfully!');
          setIsPdfExported(true);
        } else if (format === 'docx') {
          // DOCX: use the server export API which generates a content-faithful
          // Word document from cvData (all sections present, visual styling differs).
          const response = await fetch('/api/cv/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cvData: state.cvData,
              template: state.selectedTemplate,
              format: 'docx',
              userId: '',          // validated server-side by session
              cvId: state.cvId,
              paperSize: state.paperSize || 'A4',
              filename: baseName,
            }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Export failed (${response.status})`);
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${baseName}.docx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          toast.success('Downloaded successfully!');
        }
      } catch (err: any) {
        console.error('Download error:', err);
        if (err.message?.includes('Payment Required') || err.status === 402) {
          openPaymentModal({ triggerContext: 'cv-download-limit', returnUrl: window.location.href });
        } else {
          toast.error(err.message ? `Download failed: ${err.message}` : 'Failed to download CV');
        }
      } finally {
        setIsDownloading(false);
      }
    };

    // ── Live score engine ──
    // usePillEngine must be declared before the auto-save useEffect so its return values
    // (pillMasterScore, pillAtsScore, etc.) are in scope for the dependency array.
    // suppressAutoAnalysis=state.isAnalyzing prevents double-scoring during CV Surgeon scans.
    const isJourneyCV = state.cvType === 'journey' && (state.jobData || state.journeyId);
    const {
      scoreResult: pillScoreResult,
      masterScore: pillMasterScore,
      atsScore: pillAtsScore,
      issues: pillIssues,
      isAnalyzing: isPillAnalyzing,
    } = usePillEngine(
      state.cvData,
      state.cvType,
      state.keywordGapAnalysis,
      { quietMode: true },
      state.isAnalyzing  // suppress during surgeon scan to avoid score thrashing
    );

    // Auto-Save Effect: persists cvData AND freshly computed scores on every meaningful change.
    // We batch content and score updates into a single debounced cycle to prevent thrashing.
    useEffect(() => {
      if (!state.cvData || !state.cvId) return;

      // Build a composite key that captures both content and score changes
      const currentCvDataStr = JSON.stringify(state.cvData);
      const currentSaveKey = `${currentCvDataStr}|${pillMasterScore}|${pillAtsScore}`;

      // Initialize on first load to prevent an immediate save
      if (!lastSavedCvDataStrRef.current) {
        lastSavedCvDataStrRef.current = currentSaveKey;
        return;
      }

      // If nothing changed, skip
      if (currentSaveKey === lastSavedCvDataStrRef.current) {
        return;
      }

      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // If we are currently analyzing, we might want to wait a bit longer for scores to stabilize
      const debounceMs = isPillAnalyzing ? 4000 : 2000;

      // Set new debounce timer
      autoSaveTimerRef.current = setTimeout(async () => {
        // Double-check if still analyzing; if so, we might be saving slightly stale scores, 
        // but the next score change will trigger another (batched) save anyway.
        try {
          const scoreForATS = isJourneyCV ? pillAtsScore : pillMasterScore;

          const response = await fetch(`/api/cvs/${state.cvId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cvData: state.cvData,
              cv_score_master: pillMasterScore,
              cv_score_ats: scoreForATS,
              score_breakdown: {
                structural: pillScoreResult?.cvScore?.completeness ?? 0,
                industry:   pillScoreResult?.cvScore?.impactVerbs  ?? 0,
                semantic:   pillScoreResult?.atsScore?.keywordMatch ?? 0,
              },
              active_issues_json: pillIssues ?? [],
            })
          });

          if (response.ok) {
            lastSavedCvDataStrRef.current = currentSaveKey;
            console.log('CV Auto-saved successfully (batched: master=%d, ats=%d)', pillMasterScore, scoreForATS);
          }
        } catch (err) {
          console.error('CV Auto-save failed:', err);
        }
      }, debounceMs);

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }, [state.cvData, state.cvId, pillMasterScore, pillAtsScore, pillScoreResult, pillIssues, isJourneyCV, isPillAnalyzing]);

    useEffect(() => {
      if (hasLoadedUserSectionTitlesRef.current) return;
      if (!state.cvData) return;

      hasLoadedUserSectionTitlesRef.current = true;
      (async () => {
        try {
          const response = await fetch('/api/user/settings');
          if (!response.ok) return;
          const result = await response.json().catch(() => ({}));
          const titles = result?.data?.settings?.preferences?.cv?.sectionTitles;
          if (!titles || typeof titles !== 'object') return;

          const current = (state.cvData as any).sectionTitles;
          const hasCurrent = current && typeof current === 'object' && Object.keys(current).length > 0;
          if (hasCurrent) return;

          const merged = { ...DEFAULT_SECTION_TITLES, ...titles };
          lastSavedSectionTitlesRef.current = JSON.stringify(merged);
          dispatch({ type: 'SET_CV_DATA', payload: { ...(state.cvData as any), sectionTitles: merged } });
        } catch {}
      })();
    }, [dispatch, state.cvData, hasLoadedUserSectionTitlesRef, lastSavedSectionTitlesRef]);

    useEffect(() => {
      const sectionTitles = (state.cvData as any)?.sectionTitles;
      if (!sectionTitles || typeof sectionTitles !== 'object') return;

      const merged = { ...DEFAULT_SECTION_TITLES, ...sectionTitles };
      const next = JSON.stringify(merged);
      if (next === lastSavedSectionTitlesRef.current) return;

      const t = setTimeout(async () => {
        try {
          const resp = await fetch('/api/user/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: { preferences: { cv: { sectionTitles: merged } } } })
          });
          if (resp.ok) {
            lastSavedSectionTitlesRef.current = next;
          }
        } catch {}
      }, 800);

      return () => clearTimeout(t);
    }, [state.cvData, dispatch, lastSavedSectionTitlesRef]);

    const handleViewModeChange = (mode: ViewMode) => {
      setViewMode(mode);
    };

    // Listen for openSectionEditor event from SmartContextCard Fix Now button
    useEffect(() => {
      const handleOpenSectionEditor = (event: CustomEvent<{ sectionId: string; issueId?: string; suggestedFixId?: string }>) => {
        const { sectionId } = event.detail;
        if (sectionId) {
          // Find a section element to get position for the editor
          const sectionElement = document.querySelector(`[data-section-id="${sectionId}"]`);
          if (sectionElement) {
            const rect = sectionElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const editorWidth = 480;
            const gap = 24;

            let left = rect.right + gap;
            let alignment: 'left' | 'right' = 'left';

            if (left + editorWidth > viewportWidth - 20) {
              left = rect.left - editorWidth - gap;
              alignment = 'right';
            }

            setEditorPosition({
              top: Math.max(88, rect.top),
              left: left,
              height: rect.height,
              alignment
            });
          } else {
            // Fallback: position editor in center-right of viewport
            setEditorPosition({
              top: 120,
              left: window.innerWidth - 520,
              height: 400,
              alignment: 'left'
            });
          }
          setActiveEditorSectionId(sectionId);
        }
      };

      window.addEventListener('openSectionEditor', handleOpenSectionEditor as EventListener);
      return () => {
        window.removeEventListener('openSectionEditor', handleOpenSectionEditor as EventListener);
      };
    }, []);

    const handleAddKeyword = (keyword: string) => {
      // Add keyword to skills section
      const currentSkills = state.cvData?.skills || [];
      // Check for existing "Keywords" or "General" category
      const generalSkillsIndex = currentSkills.findIndex(
        (cat: any) => cat.category?.toLowerCase() === 'general' || cat.category?.toLowerCase() === 'keywords'
      );

      let updatedSkills = [...currentSkills];
      if (generalSkillsIndex >= 0) {
        const targetCat = updatedSkills[generalSkillsIndex];
        const existingSkillsList = Array.isArray(targetCat.skills) ? targetCat.skills : [];

        if (!existingSkillsList.includes(keyword)) {
          updatedSkills[generalSkillsIndex] = {
            ...targetCat,
            skills: [...existingSkillsList, keyword],
          };
        }
      } else {
        updatedSkills.push({ category: 'Keywords', skills: [keyword] });
      }

      const updatedCV = { ...state.cvData, skills: updatedSkills };
      dispatch({ type: 'SET_CV_DATA', payload: updatedCV });
      toast.success(`Added "${keyword}" to skills`);
    };

    const handleSectionClick = (sectionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const editorWidth = 480; // Approximate width of editor
      const gap = 24;
      const sidebarWidth = 0; // Sidebar removed

      // Default to right side
      let left = rect.right + gap;
      let alignment: 'left' | 'right' = 'left'; // "left" alignment means content originates/aligns to left

      // Check if right side has space
      if (left + editorWidth > viewportWidth - 20) {
        // Not enough space on right, try left
        left = rect.left - editorWidth - gap;
        alignment = 'right';

        // If also not enough space on left (mobile/tablet), center it or cap it?
        // For now, if no space on left, we might fall back to centered overlay style (handled by Editor if position is null?)
        // Or specific mobile logic. 
      }

      // Ensure it doesn't clip top/bottom - adding max-height constraint logic if needed by component, 
      // but primarily we pass top/left. The component should handle scrolling if max-h is set.
      // We will adjust 'top' if it's too low? No, usually side-by-side relies on aligning tops.
      // Let's passed a restricted height if implicit.

      // For now, standard side-by-side logic:
      setEditorPosition({
        top: Math.max(88, rect.top), // Ensure not above header
        left: left,
        height: rect.height,
        alignment
      });
      setActiveEditorSectionId(sectionId);
    };

    // ATS Context for scores
    const { atsScore, atsAnalysis, isATSLoading, refreshATSScore, updateATSScore } = useATS();

    const isRoleReady = isJourneyCV || Boolean(state.targetRole && state.seniorityLevel);

    // Get current analysis mode information
    const analysisModeInfo = React.useMemo(() => {
      return getAnalysisModeWithValidation(
        state.cvType,
        state.targetRole,
        state.seniorityLevel,
        jdText,
        state.jobData
      );
    }, [state.cvType, state.targetRole, state.seniorityLevel, jdText, state.jobData]);

    const activeAnnotation: FixAnnotation | undefined = state.activeFixId
      ? state.fixAnnotations.find((f) => f.id === state.activeFixId && f.status === 'open')
      : undefined;



    const applyAnnotation = (fix: FixAnnotation) => {
      const { updatedCV } = CVSurgeonService.applyFixAnnotation(state.cvData, fix);
      dispatch({ type: 'SET_CV_DATA', payload: updatedCV });
      dispatch({ type: 'MARK_FIX_APPLIED', payload: fix.id });
      logResumeEnhancerEvent({
        action: 'resume_enhancer_fix_applied',
        resourceType: 'cv',
        resourceId: state.cvId,
        metadata: { fixId: fix.id, fieldPath: fix.fieldPath, category: fix.category, impactScoreDelta: fix.impactScoreDelta }
      });
      const next = state.fixAnnotations.find((f) => f.status === 'open' && f.id !== fix.id);
      dispatch({ type: 'SET_ACTIVE_FIX', payload: next?.id });
    };

    const dismissAnnotation = (fixId: string) => {
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



    // Sync JD text with job data when it exists
    useEffect(() => {
      if (state.jobData) {
        const jobDescription =
          state.jobData.jobDescription ||
          state.jobData.description ||
          state.jobData.jd ||
          '';

        // Update jdText if jobData has a description and it's different from current jdText
        if (jobDescription && jobDescription !== jdText) {
          setJdText(jobDescription);
        }
      }
    }, [state.jobData, jdText]);

    // Update linked job description when JD text changes (debounced)
    useEffect(() => {
      // Only update if CV is linked to a journey and has a job
      if (!state.journeyId || !state.jobData?.id || !jdText.trim()) return;

      // Don't update on initial load - only when user edits
      const isInitialLoad = jdText === (state.jobData.jobDescription || state.jobData.description || '');
      if (isInitialLoad) return;

      // Debounce the update
      const timeoutId = setTimeout(async () => {
        try {
          const jobId = state.jobData.id || state.jobData._id;
          if (!jobId) return;

          const response = await fetch(`/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobDescription: jdText
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to update job description:', errorData.error || 'Unknown error');
            return;
          }

          // Update local job data
          dispatch({
            type: 'SET_JOB_DATA',
            payload: {
              ...state.jobData,
              jobDescription: jdText,
              description: jdText
            }
          });

          console.log('✅ Job description updated successfully');
        } catch (error) {
          console.error('Error updating job description:', error);
        }
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    }, [jdText, state.journeyId, state.jobData]);

    // Journey Validation Effect - Ensure job data integrity
    React.useEffect(() => {
      const hasLinkedTrackerJob = Boolean(state.jobData?.id || state.jobData?._id || state.journeyId);

      // Do not auto-open the profiler when this builder is already attached to a tracker job.
      // Users can still open and update the job manually from the editor.
      if (hasLinkedTrackerJob) {
        return;
      }

      // If we have a journey CV stub without usable JD context, prompt user to add it.
      if (state.cvType === 'journey' && state.jobData && !jdText && !state.jobData.jobDescription) {
        setShowJobParserDialog(true);
      }
    }, [state.cvType, state.journeyId, state.jobData, jdText]);

    const [activeUtilityPanel, setActiveUtilityPanel] = React.useState<'mori' | 'design' | 'json' | 'layout' | 'analysis' | null>(null);
    const isControlPanelOpen = activeUtilityPanel && activeUtilityPanel !== 'analysis';

    React.useEffect(() => {
      const handleSidebar = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail === 'design') {
          const next = setActiveUtilityPanel(curr => curr === 'design' ? null : 'design');
          window.dispatchEvent(new CustomEvent('checklist:design-completed'));
        } else if (detail === 'data') {
          setActiveUtilityPanel(curr => curr === 'json' ? null : 'json');
        }
      };
      const handleTemplates = () => {
        setActiveUtilityPanel(curr => curr === 'layout' ? null : 'layout');
      };
      const handleClose = () => {
        setActiveUtilityPanel(null);
      };
      window.addEventListener('set-builder-sidebar', handleSidebar);
      window.addEventListener('open-templates', handleTemplates);
      window.addEventListener('close-utility-panel', handleClose);
      return () => {
        window.removeEventListener('set-builder-sidebar', handleSidebar);
        window.removeEventListener('open-templates', handleTemplates);
        window.removeEventListener('close-utility-panel', handleClose);
      };
    }, []);

    React.useEffect(() => {
      if (state.moriChatMode) {
        setActiveUtilityPanel('mori');
      } else if (activeUtilityPanel === 'mori') {
        setActiveUtilityPanel(null);
      }
    }, [state.moriChatMode]);

    React.useEffect(() => {
      if (activeUtilityPanel === 'mori') {
        if (!state.moriChatMode) dispatch({ type: 'SET_MORI_CHAT_MODE', payload: true });
      } else {
        if (state.moriChatMode) dispatch({ type: 'SET_MORI_CHAT_MODE', payload: false });
      }
    }, [activeUtilityPanel, dispatch]);

    React.useEffect(() => {
      const handleOpenMoriChat = () => {
        dispatch({ type: 'SET_MORI_CHAT_MODE', payload: true });
        setActiveUtilityPanel('mori');
      };
      window.addEventListener('open-mori-chat', handleOpenMoriChat);
      return () => window.removeEventListener('open-mori-chat', handleOpenMoriChat);
    }, [dispatch]);

    const lastSelectedPathRef = React.useRef<string | null>(null);
    const pathClickCountRef = React.useRef<number>(0);

    React.useEffect(() => {
      const handleSelection = (e: CustomEvent) => {
        if (!state.moriChatMode) return;
        const { path } = e.detail;
        if (lastSelectedPathRef.current === path) {
          pathClickCountRef.current += 1;
          if (pathClickCountRef.current >= 3) {
            dispatch({ type: 'SET_MORI_CHAT_MODE', payload: false });
            toast.success("Resuming direct editing mode", {
              icon: '✍️',
              duration: 3500
            });
            lastSelectedPathRef.current = null;
            pathClickCountRef.current = 0;
          }
        } else {
          lastSelectedPathRef.current = path;
          pathClickCountRef.current = 1;
        }
      };

      window.addEventListener('mori-cv-selection', handleSelection as EventListener);
      return () => {
        window.removeEventListener('mori-cv-selection', handleSelection as EventListener);
      };
    }, [state.moriChatMode, dispatch]);





    const handleRunAnalysis = async () => {
      if (!isRoleReady) {
        toast.error("Please configure your target position in the Analysis rail first.");
        return;
      }

      setIsAnalyzing(true);
      dispatch({ type: 'SET_ANALYZING', payload: true });

      try {
        // For journey CVs, use job title and default seniority; for others use targetRole/seniorityLevel
        // For journey CVs, use job title and default seniority; for others use targetRole/seniorityLevel
        const roleForAnalysis = isJourneyCV ? (state.jobData?.jobTitle || state.jobData?.title || '') : state.targetRole;
        const seniorityForAnalysis = isJourneyCV ? 'professional' : state.seniorityLevel;

        // Validation - prevent 400 errors
        if (!roleForAnalysis) {
          if (isJourneyCV) {
            toast.error("Please add a job title to proceed with analysis");
            setShowJobParserDialog(true);
            setIsAnalyzing(false);
            dispatch({ type: 'SET_ANALYZING', payload: false });
            return;
          }
          // Fallback to role inferencer for non-journey is handled above by !isRoleReady check
        }

        // Use cache-aware analysis to avoid unnecessary AI token usage
        // Pass cvType to ensure master CVs get grammar/format fixes
        const result = await CVSurgeonService.analyzeCVWithCache(
          state.cvData,
          roleForAnalysis,
          seniorityForAnalysis,
          state.cvId,
          undefined, // userId will be passed from context if available
          state.jobData || (jdText ? { description: jdText } : undefined),
          undefined, // suppressedFixHashes
          state.cvType // Pass cvType for mode-specific analysis
        );

        dispatch({ type: 'SET_SURGEON_ANALYSIS', payload: { score: result.score, fixes: result.fixes, scoreReport: result.scoreReport } });
        dispatch({ type: 'SET_FIX_ANNOTATIONS', payload: result.annotations });

        // Store keyword gap analysis result for ATS scoring (journey CVs)
        if ((result as any).keywordGapAnalysis) {
          dispatch({ type: 'SET_KEYWORD_GAP_ANALYSIS', payload: (result as any).keywordGapAnalysis });
        }

        // Update ATS context with analysis results for ScorecardPanel to display
        if (state.cvId) {
          const keywordAnalysis = (result as any).keywordGapAnalysis;
          const atsScore = (result as any).atsScore || result.score;
          updateATSScore(
            atsScore,
            {
              score: atsScore,
              missingKeywords: keywordAnalysis?.gaps?.map((g: any) => g.keyword) || [],
              matchedKeywords: keywordAnalysis?.matchedKeywords || [],
              strengths: [],
              suggestions: [],
              audit_report: result.audit_report,
            },
            state.cvId,
            state.journeyId || undefined,
            state.jobData?.id
          );
        }

        logResumeEnhancerEvent({
          action: 'resume_enhancer_analysis_completed',
          resourceType: 'cv',
          resourceId: state.cvId,
          metadata: { score: result.score, fixesCount: result.fixes.length, cvType: state.cvType, cached: result.cached }
        });

        if (result.cached) {
          console.log('✅ Loaded cached analysis - no AI tokens used');
        }
      } catch (error) {
        console.error('CV Surgeon analysis failed:', error);
        alert('Failed to analyze CV. Please try again.');
      } finally {
        setIsAnalyzing(false);
        dispatch({ type: 'SET_ANALYZING', payload: false });

        // Trigger detailed ATS analysis if we have a CV ID
        // This ensures the ScorecardPanel has data (factor breakdown, etc.)
        if (state.cvId) {
          refreshATSScore(state.cvId, state.jobData?.id).catch((err: any) =>
            console.error('Failed to refresh ATS score:', err)
          );
        }
      }
    };



    const handleConvertToJourney = async (arg?: string | React.MouseEvent) => {
      const text = typeof arg === 'string' ? arg : jdText;
      if (!text.trim()) return;

      // EDGE CASE 1: Check Journey CV limit before conversion
      try {
        const limitCheckResponse = await fetch('/api/cvs/journey-limit-check');
        if (limitCheckResponse.ok) {
          const limitCheck = await limitCheckResponse.json();
          if (!limitCheck.allowed) {
            // Show limit modal or paywall
            alert(limitCheck.message || 'You have reached your Journey CV limit. Archive or delete an existing Journey CV to create a new one, or upgrade to Pro.');
            return;
          }
        }
      } catch (limitError) {
        console.error('Failed to check Journey CV limit:', limitError);
        // Continue anyway - API will enforce the limit
      }

      // Edge case: CV already linked to a job
      if (state.cvType === 'journey' && state.journeyId) {
        const confirmUpdate = confirm('This CV is already linked to a job. Do you want to update the existing job description instead?');
        if (confirmUpdate && state.jobData?.id) {
          // Update existing job description
          try {
            const jobId = state.jobData.id || state.jobData._id;
            const response = await fetch(`/api/jobs/${jobId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobDescription: text
              })
            });

            if (response.ok) {
              dispatch({
                type: 'SET_JOB_DATA',
                payload: {
                  ...state.jobData,
                  jobDescription: text,
                  description: text
                }
              });
              alert('Job description updated successfully!');
            } else {
              throw new Error('Failed to update job description');
            }
          } catch (error) {
            console.error('Failed to update job:', error);
            alert('Failed to update job description. Please try again.');
          }
        }
        return;
      }

      // Edge case: Master CV - don't create job tracking
      // ALLOW conversion for Master CV as per new requirements
      // We will create a new Journey CV from this Master CV

      try {
        // Try to extract company name from JD
        let companyName = 'Unknown Company';

        // Common patterns: "at Company Name", "Company Name is", "Company Name seeks", etc.
        const companyPatterns = [
          /(?:at|with|from)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+is|\s+seeks|\s+looking|\s+seeking|\.|$)/i,
          /^([A-Z][A-Za-z0-9\s&]+?)\s+(?:is|seeks|looking|seeking)/i,
          /company[:\s]+([A-Z][A-Za-z0-9\s&]+?)(?:\s|$)/i
        ];

        for (const pattern of companyPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            companyName = match[1].trim();
            // Limit company name length
            if (companyName.length > 100) {
              companyName = companyName.substring(0, 100);
            }
            break;
          }
        }

        // Create job application from JD
        const jobResponse = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: state.targetRole || 'Software Engineer', // Fallback if no role
            company: companyName,
            jobDescription: text,
            status: 'created'
          })
        });

        if (!jobResponse.ok) {
          const errorData = await jobResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to create job');
        }

        const jobResult = await jobResponse.json();
        const jobId = jobResult.data.jobApplication._id;
        const journeyId = jobResult.data.journey._id;

        // If Master CV, we might want to CLONE it instead of converting?
        // But for now, assuming conversion in place is okay or API handles it.
        // Actually, requirement says "Convert to Journey" or "Create New".
        // If we "Convert", we change type.

        // Update CV with journeyId and cvType if CV exists
        if (state.cvId) {
          try {
            const cvUpdateResponse = await fetch(`/api/cvs/${state.cvId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                journeyId: journeyId,
                cvType: 'journey'
              })
            });

            if (!cvUpdateResponse.ok) {
              const errorData = await cvUpdateResponse.json().catch(() => ({}));
              throw new Error(errorData.error || 'Failed to update CV with journeyId');
            }
          } catch (cvError) {
            console.error('Error updating CV:', cvError);
            throw cvError; // Fail the operation if CV update fails
          }
        }

        // Update context to journey type
        convertToJourney(journeyId, {
          description: text,
          title: state.targetRole,
          jobTitle: state.targetRole,
          company: companyName,
          id: jobId,
          _id: jobId
        });

        // Keep the URL in sync so refresh/share preserves journey context
        try {
          const params = new URLSearchParams(searchParams.toString());
          params.set('mode', 'journey');
          if (state.cvId) params.set('cvId', state.cvId);
          params.set('journeyId', journeyId);
          router.replace(`${pathname}?${params.toString()}`);
        } catch (urlError) {
          console.warn('Failed to update URL with journey details (non-critical):', urlError);
        }

        // Show success message - sanitize user input to prevent XSS
        const sanitizedRole = sanitizeErrorMessage(state.targetRole || 'position');
        const sanitizedCompany = sanitizeErrorMessage(companyName || 'company');
        alert(`Job tracking created! Now tracking: ${sanitizedRole} at ${sanitizedCompany}`);

        // If we provided a text override for Master CV, enable JD input show
        if (typeof arg === 'string') {
          setJdText(text);
          setShowJobParserDialog(true);
        }
      } catch (error) {
        console.error('Failed to convert to journey:', error);
        const message = sanitizeErrorMessage(error, 'Failed to create journey. Please try again.');
        alert(message);
      }
    };












    // Add new section function - initializes section data and updates structure
    const addNewSection = (sectionType: string) => {
      console.log('Adding new section:', sectionType);

      // Initialize CV data for the new section
      const fieldName = SECTION_TYPE_TO_FIELD_MAP[sectionType];
      if (!fieldName) {
        console.warn('Unknown section type:', sectionType);
        return;
      }
      
      const defaultItem = DEFAULT_SECTION_ITEM[fieldName];
      const existingData = state.cvData[fieldName as keyof UnifiedCVDataStructure] as any[];
      const newSectionData = [...(existingData || []), { ...defaultItem }];

      // Update both CV data and structure
      if (newSectionData !== null && fieldName) {
        // Prepare structure update
        let updatedStructure = state.cvData.structure || { sections: [] };

        // Ensure structure has sections array
        if (!updatedStructure.sections) {
          updatedStructure = { ...updatedStructure, sections: [] };
        }

        // Clone sections array to avoid mutations
        const sections = [...updatedStructure.sections];
        const sectionIndex = sections.findIndex(s => s.type === sectionType);

        if (sectionIndex >= 0) {
          // Section exists in structure - mark as visible
          sections[sectionIndex] = {
            ...sections[sectionIndex],
            visible: true
          };
        } else {
          // Section doesn't exist in structure - add it
          const sectionId = `section-${sectionType}-${Date.now()}`;
          sections.push({
            id: sectionId,
            type: sectionType,
            visible: true
          });
        }

        // Dispatch update to CV data - this updates the structure and data together
        dispatch({
          type: 'SET_CV_DATA',
          payload: {
            ...state.cvData,
            [fieldName]: newSectionData,
            structure: { ...updatedStructure, sections }
          }
        });

        // Show success toast
        toast.success(`Added ${sectionType.replace(/_/g, ' ')} section`);

        // Auto-open the floating editor for the new section
        // Use setTimeout to ensure the DOM has updated and the section is rendered
        if (floatingEditorTimeoutRef.current) clearTimeout(floatingEditorTimeoutRef.current);
        floatingEditorTimeoutRef.current = setTimeout(() => {
          const sectionElement = document.querySelector(`[data-section-id="${sectionType}"]`);
          if (sectionElement) {
            const rect = sectionElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const editorWidth = 480;
            const gap = 24;

            // Calculate position
            let left = rect.right + gap;
            let alignment: 'left' | 'right' = 'left';

            if (left + editorWidth > viewportWidth - 20) {
              left = rect.left - editorWidth - gap;
              alignment = 'right';
            }

            setEditorPosition({
              top: Math.max(88, rect.top),
              left: left,
              height: rect.height,
              alignment
            });
            setActiveEditorSectionId(sectionType);

            // Scroll the section into view
            sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    };

    // Auto-arrange sections for two-column layouts
    const handleAutoArrangeSections = () => {
      if (!state.cvData.structure?.sections) {
        toast.error('No sections to arrange');
        return;
      }

      const currentSections = state.cvData.structure.sections;
      const rebalancedSections = calculateOptimalColumnDistribution(
        currentSections,
        state.cvData,
        state.selectedTemplate?.name || ''
      );

      dispatch({
        type: 'SET_CV_DATA',
        payload: {
          ...state.cvData,
          structure: {
            ...state.cvData.structure,
            sections: rebalancedSections,
          },
        },
      });

      toast.success('Sections arranged for optimal balance');
    };

    // Delete section function - clears section data and marks as hidden in structure
    const handleDeleteSectionFromSidebar = (sectionId: string) => {
      console.log('Deleting section:', sectionId);

      // Prevent deletion of header sections (personal, contact, etc.)
      const headerSectionTypes = ['personal', 'personal_header', 'contact', 'summary'];
      if (headerSectionTypes.includes(sectionId)) {
        toast.error('Cannot delete header section. This section is required for all CVs.');
        return;
      }

      // Map section IDs to their data field names
      const sectionToFieldMap: Record<string, string> = {
        volunteer: 'volunteer',
        publications: 'publications',
        languages: 'languages',
        interests: 'interests',
        references: 'references',
        awards: 'awards',
        certificates: 'certificates',
        projects: 'projects',
      };

      // Get the field name for this section
      const fieldName = sectionToFieldMap[sectionId];

      // Build update payload - clear the data array for this section
      const updatePayload: any = { ...state.cvData };

      if (fieldName && updatePayload[fieldName]) {
        // Clear the data array so template stops rendering
        updatePayload[fieldName] = [];
      }

      // Also update the structure if it exists
      if (state.cvData.structure?.sections) {
        const sections = [...state.cvData.structure.sections];
        const sectionIndex = sections.findIndex(s => s.id === sectionId || s.type === sectionId);

        if (sectionIndex >= 0) {
          sections[sectionIndex] = {
            ...sections[sectionIndex],
            visible: false
          };
          updatePayload.structure = { ...state.cvData.structure, sections };
        }
      }

      // Dispatch update
      dispatch({
        type: 'SET_CV_DATA',
        payload: updatePayload
      });

      toast.success(`Removed ${sectionId.replace(/_/g, ' ')} section`);
    };

    // Reorder sections function - reorders sections in structure (for sidebar, accepts string IDs)
    const handleSectionReorder = (sectionIds: string[]) => {
      console.log('Reordering sections:', sectionIds);

      if (!state.cvData.structure?.sections) {
        console.warn('No structure found in CV data');
        return;
      }

      // Create a map of current sections for quick lookup
      const sectionMap = new Map(
        state.cvData.structure.sections.map(s => [s.id, s])
      );

      // Also map by type as fallback
      state.cvData.structure.sections.forEach(s => {
        if (!sectionMap.has(s.type)) {
          sectionMap.set(s.type, s);
        }
      });

      // Reorder sections based on new order
      const reorderedSections = sectionIds
        .map(id => sectionMap.get(id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined);

      // Add any sections that weren't in the reorder list (might be hidden)
      const remainingSections = state.cvData.structure.sections.filter(
        s => !sectionIds.includes(s.id) && !sectionIds.includes(s.type)
      );

      const newSections = [...reorderedSections, ...remainingSections];

      // Update structure
      dispatch({
        type: 'SET_CV_DATA',
        payload: {
          ...state.cvData,
          structure: { ...state.cvData.structure, sections: newSections }
        }
      });

      toast.success('Sections reordered');
    };


    // Expose functions to parent via ref
    useImperativeHandle(ref, () => ({
      scrollToSection: (sectionId: string) => { console.log('scrollToSection not implemented in optimisation view', sectionId); },
      handleAddSection: () => { console.log('handleAddSection deprecated - use addNewSection instead'); },
      addNewSection,
      handleDeleteSectionFromSidebar,
      handleSectionReorder,
      activeSection: 'personal'
    }));



    return (
      <div className="h-macro min-h-0 relative overflow-hidden bg-gray-50 dark:bg-[#0a0a0a]">
        {/* Main Container */}
        <div className="h-full w-full flex overflow-hidden relative p-3 gap-3">
          {/* CV Canvas Builder — full drag-drop snippet-based builder with inline editing */}
          <div 
            className="flex-1 min-h-0 relative flex flex-col rounded-xl overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30"
            style={{ order: isControlPanelOpen ? 2 : 1 }}
          >
            <div ref={cvPreviewRef} className="flex-1 min-h-0 overflow-hidden">
              {!state.cvData ? (
                <div className="w-full h-full bg-white dark:bg-[#141810] p-8 flex flex-col gap-6 animate-pulse rounded-xl border border-gray-200 dark:border-white/[0.04]">
                  {/* Header Skeleton */}
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-250 dark:bg-white/10 rounded w-1/3 animate-pulse" />
                    <div className="h-3.5 bg-gray-200 dark:bg-white/5 rounded w-1/4 animate-pulse" />
                  </div>
                  {/* Details Skeletons */}
                  <div className="flex gap-4">
                    <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-20 animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-20 animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-20 animate-pulse" />
                  </div>
                  <hr className="border-gray-250 dark:border-white/5" />
                  {/* Summary skeleton */}
                  <div className="space-y-2.5">
                    <div className="h-4 bg-gray-250 dark:bg-white/10 rounded w-1/4 animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-full animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-5/6 animate-pulse" />
                  </div>
                  {/* Experience skeleton */}
                  <div className="space-y-4 pt-4">
                    <div className="h-4 bg-gray-250 dark:bg-white/10 rounded w-1/4 animate-pulse" />
                    <div className="space-y-2.5">
                      <div className="flex justify-between">
                        <div className="h-3.5 bg-gray-250 dark:bg-white/10 rounded w-1/3 animate-pulse" />
                        <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-16 animate-pulse" />
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-full animate-pulse" />
                      <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-full animate-pulse" />
                    </div>
                  </div>
                </div>
                ) : (
                  <Suspense fallback={<Skeleton className="min-h-[320px] md:min-h-[600px] w-full rounded-2xl" />}>
                    <CVBuilderProAdapter
                      ref={canvasBuilderRef}
                      cvData={state.cvData}
                      template={state.selectedTemplate}
                      cvId={state.cvId}
                      jobId={state.jobData?.id || state.jobData?._id || null}
                      role={state.jobData?.jobTitle || state.jobData?.title || state.targetRole || null}
                      onDataChange={(updatedData: any) => {
                        dispatch({ type: 'SET_CV_DATA', payload: updatedData });
                        setIsSectionEdited(true);
                      }}
                      onTemplateChange={(newTemplate: any) => {
                        setTemplate(newTemplate);
                        dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: newTemplate });
                      }}
                      theme={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                      moriChatMode={state.moriChatMode}
                      isGuestMode={isGuestMode}
                    />
                  </Suspense>
                )}
            </div>
          </div>
          
          {/* Right rail: onboarding setup checklist and AI analysis */}
          <div 
            className={`
              fixed inset-y-0 right-0 z-50 w-full bg-white dark:bg-[#0a0a0a] flex flex-col h-full gap-3 min-h-0 shadow-2xl transition-all duration-300
              lg:static lg:w-[426px] lg:shadow-none lg:border lg:border-white/20 lg:dark:border-white/10 lg:rounded-xl lg:flex lg:z-10 lg:p-0 lg:overflow-hidden lg:bg-transparent lg:panel-glass lg:shrink-0 overflow-hidden
              ${activeUtilityPanel === 'analysis' ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}
            style={{ order: isControlPanelOpen ? 1 : 2 }}
          >
            {showChecklist && (
              <InlineChecklist 
                dispatch={dispatch} 
                goToStep={goToStep} 
                setActiveUtilityPanel={setActiveUtilityPanel} 
              />
            )}
            <div className="flex-1 min-h-0">
              <ATSMeterPanel isUtilityPanelOpen={!!activeUtilityPanel} onClose={() => setActiveUtilityPanel(null)} />
            </div>
            {!isControlPanelOpen && <EditorStepsNavOverlay />}
          </div>

          {/* Unified Utility Panel (Mori Chat, Design, JSON, Layout) */}
          <div 
            className={`
              fixed inset-y-0 right-0 z-50 w-full bg-white dark:bg-[var(--bg-secondary)] flex flex-col h-full gap-3 min-h-0 shadow-2xl transition-all duration-300
              ${isControlPanelOpen 
                ? 'translate-x-0 flex lg:static lg:w-[426px] lg:shadow-sm lg:border lg:border-gray-200 lg:dark:border-white/[0.06] lg:rounded-xl lg:z-10 lg:overflow-hidden lg:shrink-0' 
                : 'translate-x-full hidden lg:hidden w-0'}
            `}
            style={{ order: 3 }}
          >
            {/* Mori Chat — always in DOM, visibility toggled via CSS to keep portal target stable */}
            <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${activeUtilityPanel === 'mori' ? '' : 'hidden'}`}>
              {/* Mori Chat Header */}
              <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[var(--bg-secondary)] backdrop-blur-sm border-b border-gray-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">Mori Chat</h3>
                </div>
                <div className="flex items-center gap-2">
                  <UtilityPanelPill activePanel="mori" />
                  <button
                    onClick={() => dispatch({ type: 'SET_MORI_CHAT_MODE', payload: false })}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-150 dark:hover:bg-white/5 transition-colors"
                    title="Close Mori Chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Mori Chat Interface */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <MoriChatInterface />
              </div>
            </div>

            {/* Portal target — always mounted so CVCanvasEngine's React portals never lose their target */}
            <div
              id="builder-utility-panel-portal"
              className={`flex-grow flex flex-col h-full overflow-hidden ${activeUtilityPanel === 'mori' ? 'hidden' : ''}`}
            />
            {isControlPanelOpen && <EditorStepsNavOverlay />}
          </div>

          {/* Mobile unified bottom navigation pill */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] md:hidden flex items-center gap-2 bg-white/90 dark:bg-[#141810]/90 backdrop-blur-md border border-lime-200 dark:border-lime-900/30 rounded-2xl p-1.5 shadow-2xl">
            {/* Zoom & Page Size controls (hidden if a panel is open) */}
            {!activeUtilityPanel && (
              <>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('canvas-toggle-page-size'))}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-150 dark:hover:bg-white/5 transition-all border-none bg-transparent"
                  title="Toggle Page Size"
                >
                  <LayoutTemplate size={16} />
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-white/10 mx-1" />
              </>
            )}

            {/* Panel Buttons */}
            <div className="flex items-center gap-1">
              {/* Analysis Panel */}
              <button
                onClick={() => setActiveUtilityPanel(curr => curr === 'analysis' ? null : 'analysis')}
                className={`p-2 rounded-xl transition-all border-none bg-transparent ${
                  activeUtilityPanel === 'analysis'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
                title="Analysis"
              >
                <Target size={16} />
              </button>

              {/* Mori Chat */}
              <button
                onClick={() => setActiveUtilityPanel(curr => curr === 'mori' ? null : 'mori')}
                className={`p-2 rounded-xl transition-all border-none bg-transparent ${
                  activeUtilityPanel === 'mori'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
                title="Mori Chat"
              >
                <Sparkles size={16} />
              </button>

              {/* Design */}
              <button
                onClick={() => {
                  if (activeUtilityPanel === 'design') {
                    window.dispatchEvent(new CustomEvent('close-utility-panel'));
                  } else {
                    window.dispatchEvent(new CustomEvent('set-builder-sidebar', { detail: 'design' }));
                  }
                }}
                className={`p-2 rounded-xl transition-all border-none bg-transparent ${
                  activeUtilityPanel === 'design'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
                title="Design"
              >
                <Palette size={16} />
              </button>

              {/* Layout */}
              <button
                onClick={() => {
                  if (activeUtilityPanel === 'layout') {
                    window.dispatchEvent(new CustomEvent('close-utility-panel'));
                  } else {
                    window.dispatchEvent(new CustomEvent('open-templates'));
                  }
                }}
                className={`p-2 rounded-xl transition-all border-none bg-transparent ${
                  activeUtilityPanel === 'layout'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
                title="Layout"
              >
                <Component size={16} />
              </button>

              {/* Raw JSON */}
              <button
                onClick={() => {
                  if (activeUtilityPanel === 'json') {
                    window.dispatchEvent(new CustomEvent('close-utility-panel'));
                  } else {
                    window.dispatchEvent(new CustomEvent('set-builder-sidebar', { detail: 'data' }));
                  }
                }}
                className={`p-2 rounded-xl transition-all border-none bg-transparent ${
                  activeUtilityPanel === 'json'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
                title="Raw JSON"
              >
                <FileJson size={16} />
              </button>
            </div>
          </div>

        </div >
        {/* AI Analysis Chatbot Card - Bottom Right - Only in builder mode */}


        {/* Floating Form Editor */}
        {
          activeEditorSectionId && editorPosition && (
            <FloatingFormEditor
              sectionId={activeEditorSectionId!}
              onClose={() => {
                setActiveEditorSectionId(null);
                setEditorPosition(null);
              }}
              position={editorPosition!}
              alignment={editorPosition!.alignment}
              annotations={state.fixAnnotations}
              onApplyAnnotation={applyAnnotation}
              onDismissAnnotation={dismissAnnotation}
            />
          )
        }

        {/* Report modal */}
        <SurgeonReportModal
          isOpen={state.reportOpen}
          onClose={() => dispatch({ type: 'SET_REPORT_OPEN', payload: false })}
          onReviewAndFix={() => {
            dispatch({ type: 'SET_REPORT_OPEN', payload: false });
          }}
        />



        {/* Smart JD Modal for standalone CVs */}
        <SmartJDModal
          isOpen={showJobParserDialog}
          onClose={() => setShowJobParserDialog(false)}
          initialData={{
            title: state.targetRole || '',
            experienceLevel: state.seniorityLevel || '',
          }}
          onSubmit={async (data) => {
            const jobDescription = data.jobDescription;
            if (!jobDescription) {
              toast.error('Missing job description.');
              return;
            }
            
            setJdText(jobDescription);
            dispatch({
              type: 'SET_JOB_DATA',
              payload: {
                ...state.jobData,
                jobTitle: data.title || state.targetRole,
                title: data.title || state.targetRole,
                company: 'Unknown Company',
                description: jobDescription,
                jobDescription: jobDescription,
              }
            });
            setShowJobParserDialog(false);

            if (state.cvType === 'standalone') {
              try {
                let effectiveCvId = state.cvId;
                if (!effectiveCvId) {
                  const payload = {
                    title: state.cvTitle || 'My CV',
                    cvData: state.cvData,
                    templateId: state.selectedTemplate?.id || (state.selectedTemplate as any)?._id,
                    cvType: state.cvType || 'standalone',
                    status: 'draft',
                    metadata: { isMaster: state.cvType === 'master', completionPercentage: 100, createdVia: 'resume-enhancer' }
                  };

                  const cvResponse = await fetch('/api/cvs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });

                  const cvResult = await cvResponse.json().catch(() => ({}));
                  if (!cvResponse.ok) throw new Error(cvResult?.error || 'Failed to save CV');

                  effectiveCvId = cvResult?.data?.cv?.id || cvResult?.data?.cv?._id || cvResult?.cv?.id || cvResult?.cv?._id || cvResult?.id || null;
                  if (effectiveCvId) dispatch({ type: 'SET_CV_ID', payload: effectiveCvId });
                  else throw new Error('CV saved but no ID returned');
                }

                const jobResponse = await fetch('/api/jobs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jobTitle: data.title || state.targetRole,
                    company: 'Unknown Company',
                    jobDescription: jobDescription,
                    status: 'created',
                    cvId: effectiveCvId || undefined
                  })
                });

                if (!jobResponse.ok) throw new Error('Failed to save job');

                const jobResult = await jobResponse.json();
                const jobId = jobResult.data?.jobApplication?._id || jobResult.data?.id;
                const journeyId = jobResult.data?.journey?._id;

                if (!jobId || !journeyId) throw new Error('Job or Journey creation failed');

                convertToJourney(journeyId, {
                  description: jobDescription,
                  title: data.title || state.targetRole,
                  jobTitle: data.title || state.targetRole,
                  company: 'Unknown Company',
                  id: jobId,
                  _id: jobId
                });

                toast.success('Job saved and tracking started!');
                
                const cvResponse = await fetch(`/api/cvs/${state.cvId || effectiveCvId}`);
                if (cvResponse.ok) {
                  const cvResult = await cvResponse.json();
                  const updatedCV = cvResult.data.cv;
                  loadCV({
                    cvId: updatedCV.id, cvType: 'journey', cvTitle: updatedCV.title, cvData: updatedCV.cvData,
                    template: updatedCV.template, journeyId: updatedCV.journeyId, jobData: updatedCV.jobData
                  });
                }
              } catch (error: any) {
                console.error('Failed to save and track:', error);
                toast.error(error.message || 'Failed to save and track.');
              }
            }
          }}
        />

        {showDownloadModal && (
          <DownloadModal
            isOpen={showDownloadModal}
            onClose={() => setShowDownloadModal(false)}
            onDownload={async (documentType: any, format: any) => {
              if (documentType === 'cv') {
                await handleDownload(format);
              }
              setShowDownloadModal(false);
            }}
            onPaywallRequired={() => {
              openPaymentModal({ triggerContext: 'cv-download-limit', returnUrl: window.location.href });
              setShowDownloadModal(false);
            }}
            hasCV={!!state.cvData}
            isDownloading={isDownloading}
            cvId={state.cvId}
          />
        )}

        <EditorOnboarding step={3} />
      </div >
    );
  });

Step3CV.displayName = 'Step3CV';

export default Step3CV;
