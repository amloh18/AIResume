// @ts-nocheck
'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef, useMemo, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';
import { downloadCanvasAsPDF } from '@/lib/utils/downloadCanvas';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import DownloadModal from '@/components/ui/DownloadModal';
import {
  Sparkles,
  Component, Eye, Target, ZoomIn, ZoomOut, Plus, Shuffle, Palette, X,
  Check, Info
} from 'lucide-react';

// Import CV Builder form components

import RoleProfilerModal from '@/components/resume-enhancer/RoleProfilerModal';
import SurgeonReportModal from '@/components/resume-enhancer/SurgeonReportModal';
import FieldFixOverlay from '@/components/resume-enhancer/annotations/FieldFixOverlay';
import CVBuilderProAdapter from '@/components/cv-builder-pro/CVBuilderProAdapter';
import { validateCVPreview } from '@/lib/validation/cv-preview-validator';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { AnimatedScore } from '@/components/ui/AnimatedScore';
import { useATS } from '@/contexts/ATSContext';
import ATSUnlockCard from '@/components/resume-enhancer/ATSUnlockCard';
import SmartJDModal from '@/components/resume-enhancer/SmartJDModal';

// CV Surgeon service
import { CVSurgeonService, SurgicalFix } from '@/lib/services/cv-surgeon-service';
import { logResumeEnhancerEvent } from '@/lib/services/resumeEnhancerLogClient';
import { inferRoleContextFromCVData } from '@/lib/utils/resumeEnhancerRoleInference';
import { calculateOptimalColumnDistribution } from '@/services/sectionRebalancer';
import type { RecruiterFeatures } from '@/components/resume-enhancer/panels/RecruiterModePanel';
import type { ATSFeatures } from '@/components/resume-enhancer/panels/ATSModePanel';
import { getAnalysisModeWithValidation } from '@/lib/utils/analysis-mode';
import toast from 'react-hot-toast';
import FloatingFormEditor from '@/components/resume-enhancer/FloatingFormEditor';
import FloatingPulsePill, { type FloatingPulsePillHandle } from '@/components/resume-enhancer/FloatingPulsePill';
import ATSMeterPanel from '@/components/resume-enhancer/panels/ATSMeterPanel';
import MoriChatInterface from '@/components/resume-enhancer/panels/MoriChatInterface';
import { usePillEngine } from '@/hooks/usePillEngine';
import { AnimatePresence, motion } from 'framer-motion';
import { ITemplate } from '@/types/template';
import { gsap } from 'gsap';

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




interface Step3BuilderSurgeonProps {
  onComplete: () => void;
  onActiveSectionChange?: (sectionId: string) => void;
}

export interface Step3BuilderSurgeonRef {
  scrollToSection: (sectionId: string) => void;
  handleAddSection: () => void;
  addNewSection: (sectionId: string) => void;
  handleDeleteSectionFromSidebar: (sectionId: string) => void;
  handleSectionReorder: (sectionIds: string[]) => void;
  activeSection: string;
}



const Step3BuilderSurgeon = forwardRef<Step3BuilderSurgeonRef, Step3BuilderSurgeonProps>(
  ({ onComplete, onActiveSectionChange }, ref) => {
    const { state, dispatch, convertToJourney, loadCV, getAnalysisModeInfo, setTemplate, setAtsScoreCap, goToStep } = useResumeEnhancer();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [jdText, setJdText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showRoleProfiler, setShowRoleProfiler] = useState(false);

    const isImproveMode = searchParams.get('improve') === 'true' || searchParams.get('mode') === 'improve';
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
          // ── WYSIWYG PDF: capture the live .cv-document DOM element ──────────
          // This ensures the exported PDF is a pixel-perfect match of the canvas
          // preview. The server-side export uses the old TemplateRenderer and
          // does NOT know about CANVAS_TEMPLATES, SNIPPETS, or CSS variables.
          await downloadCanvasAsPDF(`${baseName}.pdf`, {
            paperSize: (state.paperSize as 'A4' | 'Letter') || 'A4',
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
    } = usePillEngine(
      state.cvData,
      state.cvType,
      state.keywordGapAnalysis,
      { quietMode: true },
      state.isAnalyzing  // suppress during surgeon scan to avoid score thrashing
    );

    // Auto-Save Effect: persists cvData AND freshly computed scores on every meaningful change.
    // Scores are computed by usePillEngine (debounced 3 s); this effect fires 2 s after
    // any of the tracked values change, giving ~5 s total latency to DB write.
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

      // Set new debounce timer
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          // Determine which score to store as the ATS score:
          // Journey CVs -> ATS keyword-match score; standalone/master -> CV quality score
          const scoreForATS = isJourneyCV ? pillAtsScore : pillMasterScore;

          const response = await fetch(`/api/cvs/${state.cvId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cvData: state.cvData,
              // Persist computed scores so Tracker cards, Canvas, and CVListView stay fresh
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
            console.log('CV Auto-saved successfully (with scores: master=%d, ats=%d)', pillMasterScore, scoreForATS);
          }
        } catch (err) {
          console.error('CV Auto-save failed:', err);
        }
      }, 2000); // 2-second debounce

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
      // Depend on cvData AND pill scores so an updated score triggers a re-save even
      // when the user has stopped typing.
    }, [state.cvData, state.cvId, pillMasterScore, pillAtsScore, pillScoreResult, pillIssues, isJourneyCV]);

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





    const handleRunAnalysis = async () => {
      if (!isRoleReady) {
        const inferred = inferRoleContextFromCVData(state.cvData);
        if (inferred.targetRole && inferred.seniorityLevel) {
          dispatch({
            type: 'SET_ROLE_CONTEXT',
            payload: { targetRole: inferred.targetRole, seniorityLevel: inferred.seniorityLevel }
          });
        } else {
          setShowRoleProfiler(true);
          return;
        }
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

        dispatch({ type: 'SET_SURGEON_ANALYSIS', payload: { score: result.score, fixes: result.fixes } });
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
              console.warn('Failed to update CV with journeyId, but job was created');
            }
          } catch (cvError) {
            console.error('Error updating CV:', cvError);
            // Don't fail the whole operation if CV update fails
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
      let newSectionData: any = null;
      let fieldName: string = sectionType;

      switch (sectionType) {
        case 'volunteer':
          newSectionData = [...(state.cvData.volunteer || []), {
            organization: 'Organization Name',
            position: 'Volunteer Role',
            url: '',
            startDate: 'Jan 2020',
            endDate: 'Present',
            summary: '',
            highlights: []
          }];
          fieldName = 'volunteer';
          break;
        case 'publications':
          newSectionData = [...(state.cvData.publications || []), {
            name: 'Publication Title',
            publisher: 'Publisher Name',
            releaseDate: '2024',
            url: '',
            summary: ''
          }];
          fieldName = 'publications';
          break;
        case 'languages':
          newSectionData = [...(state.cvData.languages || []), {
            language: 'Language',
            fluency: 'Native'
          }];
          fieldName = 'languages';
          break;
        case 'interests':
          newSectionData = [...(state.cvData.interests || []), {
            name: 'Interest Category',
            keywords: ['Hobby 1', 'Hobby 2']
          }];
          fieldName = 'interests';
          break;
        case 'references':
          newSectionData = [...(state.cvData.references || []), {
            name: 'Reference Name',
            reference: 'Available upon request'
          }];
          fieldName = 'references';
          break;
        case 'awards':
          newSectionData = [...(state.cvData.awards || []), {
            title: 'Award Title',
            date: '2024',
            awarder: 'Awarding Organization',
            summary: ''
          }];
          fieldName = 'awards';
          break;
        case 'certificates':
          newSectionData = [...(state.cvData.certificates || []), {
            name: 'Certificate Name',
            issuer: 'Issuing Organization',
            date: '2024',
            url: '',
            description: ''
          }];
          fieldName = 'certificates';
          break;
        case 'projects':
          newSectionData = [...(state.cvData.projects || []), {
            name: 'Project Name',
            startDate: 'Jan 2024',
            endDate: 'Present',
            description: 'Project description',
            highlights: [],
            keywords: [],
            url: ''
          }];
          fieldName = 'projects';
          break;
        case 'skills':
          newSectionData = [...(state.cvData.skills || []), {
            category: 'Skill Category',
            skills: ['Skill 1', 'Skill 2']
          }];
          fieldName = 'skills';
          break;
        case 'education':
          newSectionData = [...(state.cvData.education || []), {
            institution: 'Name of University',
            url: '',
            area: 'ENTER YOUR MAJOR',
            studyType: '',
            startDate: 'Jan 2005',
            endDate: 'Jan 2007',
            score: '',
            description: ''
          }];
          fieldName = 'education';
          break;
        case 'work_experience':
          newSectionData = [...(state.cvData.work || []), {
            name: 'Company Name',
            position: 'Job Title',
            url: '',
            startDate: 'Jan 2020',
            endDate: 'Present',
            summary: 'Enter your job responsibilities and achievements',
            highlights: []
          }];
          fieldName = 'work';
          break;
      }

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
        setTimeout(() => {
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



    if (!state.cvData) {
      return (
        <div className="flex flex-col h-[calc(100vh-64px)] items-center justify-center bg-gray-50 dark:bg-[var(--bg-primary)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#80FF00] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Initializing Builder...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[calc(100vh-64px)] min-h-0 relative overflow-hidden bg-gray-50 dark:bg-[var(--bg-primary)]">
        {/* Main Container */}
        <div className="flex-1 h-full flex overflow-hidden relative px-3 pb-3 pt-3 gap-3">
          {/* CV Canvas Builder — full drag-drop snippet-based builder with inline editing */}
          <div className="flex-1 min-h-0 relative flex flex-col rounded-xl overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30">
            <div ref={cvPreviewRef} className="flex-1 min-h-0 overflow-hidden">
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
              />
            </div>
          </div>
          
          {/* Right rail: onboarding setup checklist and AI analysis (always open) */}
          <div className="hidden lg:flex flex-col shrink-0 h-full relative z-10 gap-3 min-h-0 w-[387px]">
            {isImproveMode && (() => {
              const isPersonalInfoVerified = !!(state.cvData?.basics?.name?.trim() && state.cvData?.basics?.email?.trim());
              const isQualityScoreReviewed = !!(state.surgeonAnalysis || atsScore);

              const checklistItems = [
                {
                  id: 'personal',
                  title: 'Verify Personal Info',
                  description: 'Ensure your name and email are filled in basics.',
                  completed: isPersonalInfoVerified,
                },
                {
                  id: 'quality',
                  title: 'Review Quality Score',
                  description: 'Review the AI Analysis score for CV health.',
                  completed: isQualityScoreReviewed,
                },
                {
                  id: 'optimize',
                  title: 'Optimize Section Data',
                  description: 'Make at least one edit to any CV section.',
                  completed: isSectionEdited,
                },
                {
                  id: 'export',
                  title: 'Export PDF Copy',
                  description: 'Download the compiled PDF file of your resume.',
                  completed: isPdfExported,
                }
              ];

              const completedCount = checklistItems.filter(item => item.completed).length;
              const isChecklistComplete = completedCount === checklistItems.length;

              return (
                <div className="shrink-0 max-h-[46%] bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm select-none overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                      <Sparkles className="h-4 w-4 stroke-[2.5]" />
                      <h3 className="font-extrabold text-sm tracking-tight text-gray-900 dark:text-white">Onboarding Checklist</h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Finish these steps to set up your Master CV.
                    </p>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-400">Setup Progress</span>
                      <span className="text-teal-700 dark:text-teal-400">{completedCount} of 4 completed</span>
                    </div>
                    <div className="w-full bg-gray-150 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-teal-500 h-full transition-all duration-500 ease-out" 
                        style={{ width: `${(completedCount / 4) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Checklist List */}
                  <div className="space-y-2 pt-2">
                    {checklistItems.map(item => (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-lg border transition-all flex items-start gap-3 ${
                          item.completed 
                            ? 'bg-teal-50/40 border-teal-100 dark:bg-teal-950/20 dark:border-teal-900/30' 
                            : 'bg-slate-50/50 border-gray-150 dark:bg-gray-900/30 dark:border-gray-800/40'
                        }`}
                      >
                        <div className={`mt-0.5 rounded-full p-0.5 ${
                          item.completed 
                            ? 'bg-teal-500 text-white' 
                            : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                        }`}>
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className={`text-xs font-bold ${
                            item.completed 
                              ? 'text-gray-900 dark:text-white line-through decoration-teal-500/40' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {item.title}
                          </h4>
                          <p className="text-[10px] text-gray-500 leading-relaxed dark:text-gray-500">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleFinishOnboarding}
                      className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        isChecklistComplete 
                          ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-100 dark:shadow-none' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                      }`}
                    >
                      Finish Onboarding
                    </button>
                    {!isChecklistComplete && (
                      <p className="text-[9px] text-center text-gray-400 mt-2">
                        Finish all steps before heading to your dashboard.
                      </p>
                    )}
                  </div>
                  </div>
                </div>
              );
            })()}
            <div className="flex-1 min-h-0">
              <ATSMeterPanel />
            </div>
          </div>

          {/* Mori Chat Panel (open/close next to it) */}
          {state.moriChatMode && (
            <div className="hidden lg:flex flex-col shrink-0 h-full relative z-10 gap-3 min-h-0 w-[387px] bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30">
              {/* Mori Chat Header */}
              <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[var(--bg-secondary)] backdrop-blur-sm border-b border-gray-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">Mori Chat</h3>
                </div>
                <button
                  onClick={() => dispatch({ type: 'SET_MORI_CHAT_MODE', payload: false })}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-150 dark:hover:bg-white/5 transition-colors"
                  title="Close Mori Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Mori Chat Interface */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <MoriChatInterface />
              </div>
            </div>
          )}

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

        {/* Role Profiler Modal (used when editing existing CVs or when role context is missing) */}
        <RoleProfilerModal
          isOpen={showRoleProfiler}
          onClose={() => setShowRoleProfiler(false)}
          onComplete={(role, seniority) => {
            dispatch({
              type: 'SET_ROLE_CONTEXT',
              payload: { targetRole: role, seniorityLevel: seniority as any }
            });
            setShowRoleProfiler(false);
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

      </div >
    );
  });

Step3BuilderSurgeon.displayName = 'Step3BuilderSurgeon';

export default Step3BuilderSurgeon;
