// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef, useMemo, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';
import { downloadCanvasAsPDF, downloadCanvasAsSVG } from '@/lib/utils/downloadCanvas';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import DownloadModal from '@/components/ui/DownloadModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Briefcase, Eye, Plus, Shuffle, X } from 'lucide-react';

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
import { getAnalysisModeWithValidation } from '@/lib/utils/analysis-mode';
import toast from '@/lib/hot-toast';
import FloatingFormEditor from '@/components/resume-enhancer/FloatingFormEditor';
import ATSMeterPanel from '@/components/resume-enhancer/panels/ATSMeterPanel';
import MoriChatDock from '@/components/resume-enhancer/panels/MoriChatDock';
import MoriCoverLetterChat from '@/components/resume-enhancer/panels/MoriCoverLetterChat';
import MoriSelectionBar from '@/components/resume-enhancer/panels/MoriSelectionBar';
import UtilityPanelRail, { type UtilityPanelId } from '@/components/resume-enhancer/components/UtilityPanelRail';
import type { EditorDocument } from '@/components/resume-enhancer/components/DocumentTabs';
import CoverLetterCanvas, {
  type CoverLetterTemplateType,
} from '@/components/resume-enhancer/components/CoverLetterCanvas';
import LetterGuidePanel from '@/components/resume-enhancer/panels/LetterGuidePanel';
import CoverLetterHeaderStyles from '@/components/resume-enhancer/panels/CoverLetterHeaderStyles';
import CoverLetterDesignPanel, {
  COVER_LETTER_DESIGN_DEFAULTS,
} from '@/components/resume-enhancer/panels/CoverLetterDesignPanel';
import type { CoverLetterDesignProps } from '@/components/cover-letter-engine/CoverLetterLayoutEngine';
import { usePillEngine } from '@/hooks/usePillEngine';
import { AnimatePresence, motion } from 'framer-motion';
import { ITemplate } from '@/types/template';
import { gsap } from 'gsap';

type ViewMode = 'edit' | 'preview' | 'recruiter' | 'ats';

/**
 * Panels that do not apply to the cover letter. Module scope so the array keeps
 * a stable identity — `UtilityPanelRail` defaults to its own empty array and
 * compares by reference, so an inline literal here would churn every render.
 *
 * `json` is the only one: a letter has no editable JSON document behind it, so
 * the tile would open an empty panel.
 */
const COVER_LETTER_DISABLED_PANELS: UtilityPanelId[] = ['json'];

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
  /**
   * Which document the step-3 canvas is showing. Owned by the shell so the
   * header breadcrumb, the session link and this canvas cannot disagree.
   */
  activeDocument?: EditorDocument;
  onActiveDocumentChange?: (document: EditorDocument) => void;
  /**
   * Reports the state of the debounced content autosave so the parent header
   * indicator (Saving.../Saved/Failed) reflects reality. On success the exact
   * JSON that was persisted is passed so the parent can refresh its
   * unsaved-changes snapshot.
   */
  onSaveStatus?: (status: 'saving' | 'success' | 'error', savedCvDataJson?: string) => void;
}

export interface Step3CVRef {
  scrollToSection: (sectionId: string) => void;
  handleAddSection: () => void;
  addNewSection: (sectionId: string) => void;
  handleDeleteSectionFromSidebar: (sectionId: string) => void;
  handleSectionReorder: (sectionIds: string[]) => void;
  activeSection: string;
}

const Step3CV = forwardRef<Step3CVRef, Step3CVProps>(
  ({ onComplete, onActiveSectionChange, onSaveStatus, activeDocument, onActiveDocumentChange }, ref) => {
    const { data: session } = useSession();
    const isGuestMode = !session;
    const { state, dispatch, convertToJourney, loadCV, getAnalysisModeInfo, setTemplate, setAtsScoreCap, goToStep } = useResumeEnhancer();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [jdText, setJdText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showRoleProfiler, setShowRoleProfiler] = useState(false);


    const [showJobParserDialog, setShowJobParserDialog] = useState(false);
    const [isSavingJobProfile, setIsSavingJobProfile] = useState(false);
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
    const canvasBuilderRef = useRef<any>(null);
    const lastSavedSectionTitlesRef = useRef<string>('');
    const hasLoadedUserSectionTitlesRef = useRef(false);

    // Auto-save refs
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedCvDataStrRef = useRef<string>('');
    const autoSaveAbortRef = useRef<AbortController | null>(null);
    const lastSavedAtRef = useRef<string | null>(null);

    // Floating Editor State
    const [activeEditorSectionId, setActiveEditorSectionId] = useState<string | null>(null);
    const [editorPosition, setEditorPosition] = useState<{ top: number; left: number; height: number; alignment: 'left' | 'right' } | null>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('edit'); // New View Mode State
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
          // preview. High-DPI 300 DPI SVG-backed rendering prevents pixelation on zoom.
          await downloadCanvasAsPDF(`${baseName}.pdf`, {
            paperSize: (state.paperSize as 'A4' | 'Letter') || 'A4',
          });
          toast.success('Downloaded successfully!');
        } else if (format === 'svg') {
          // ── Pure Vector SVG: 100% vector scalability with 0 pixelation on zoom ──
          await downloadCanvasAsSVG(`${baseName}.svg`, {
            paperSize: (state.paperSize as 'A4' | 'Letter') || 'A4',
          });
          toast.success('Downloaded Vector SVG successfully!');
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
    // Drives the in-editor pill/score display. Its numbers are computed by the
    // shared CentralScoreManager, so they match the server, but they are
    // display-only: they are never persisted by the auto-save below.
    // suppressAutoAnalysis=state.isAnalyzing prevents double-scoring during CV Surgeon scans.
    const isJourneyCV = state.cvType === 'journey' && (state.jobData || state.journeyId);
    const {
      issues: pillIssues,
      isAnalyzing: isPillAnalyzing,
    } = usePillEngine(
      state.cvData,
      state.cvType,
      state.keywordGapAnalysis,
      { quietMode: true },
      state.isAnalyzing  // suppress during surgeon scan to avoid score thrashing
    );

    // Auto-Save Effect: persists cvData on every meaningful content change.
    //
    // Scores are intentionally NOT part of this payload. The PUT endpoint
    // rejects client-supplied score fields, because a forgeable ATS number is
    // worse than a missing one. The persisted score is written exclusively by
    // POST /api/ats/calculate-score (see refreshATSScore below and the
    // analysis flow), which recomputes deterministically from the CV content.
    useEffect(() => {
      if (!state.cvData || !state.cvId) return;

      // The save key tracks CONTENT only — score changes no longer need a write.
      const currentCvDataStr = JSON.stringify(state.cvData);
      const currentSaveKey = currentCvDataStr;

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
        // Cancel any in-flight autosave request
        if (autoSaveAbortRef.current) {
          autoSaveAbortRef.current.abort();
        }
        const controller = new AbortController();
        autoSaveAbortRef.current = controller;

        onSaveStatus?.('saving');

        try {
          const response = await fetch(`/api/cvs/${state.cvId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              cvData: state.cvData,
              active_issues_json: pillIssues ?? [],
              updatedAt: lastSavedAtRef.current || undefined,
            })
          });

          if (response.ok) {
            const result = await response.json().catch(() => ({}));
            lastSavedCvDataStrRef.current = currentSaveKey;
            // Track the server updatedAt for conflict detection on next save
            if (result?.data?.updatedAt) {
              lastSavedAtRef.current = result.data.updatedAt;
            } else if (result?.updatedAt) {
              lastSavedAtRef.current = result.updatedAt;
            }
            console.log('CV Auto-saved successfully (content only)');
            onSaveStatus?.('success', currentSaveKey);
          } else if (response.status === 409) {
            // Conflict: server has a newer version. Discard local changes and reload.
            console.warn('CV Auto-save conflict — server has newer version');
            lastSavedCvDataStrRef.current = currentSaveKey;
            onSaveStatus?.('error');
            toast.error('This CV was updated elsewhere. Reload the page before editing further.', { id: 'cv-autosave-conflict' });
          } else {
            onSaveStatus?.('error');
            toast.error("Couldn't auto-save your changes. Press Save to retry.", { id: 'cv-autosave-error' });
          }
        } catch (err: any) {
          if (err?.name === 'AbortError') return; // Cancelled — a new save superseded this one
          console.error('CV Auto-save failed:', err);
          onSaveStatus?.('error');
          toast.error("Couldn't auto-save your changes. Press Save to retry.", { id: 'cv-autosave-error' });
        }
      }, debounceMs);

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }, [state.cvData, state.cvId, pillIssues, isPillAnalyzing, onSaveStatus]);

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

      const updatedSkills = [...currentSkills];
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

    // Which utility panel (tile) is open next to the canvas. The tile rail owns
    // opening/closing; these listeners just mirror the canvas-engine events so
    // the rail, the 60:40 column and the canvas all agree on the active panel.
    const [activeUtilityPanel, setActiveUtilityPanel] = React.useState<UtilityPanelId | null>(null);
    // Mori lives in the always-visible dock below the canvas instead of a tile.
    const [isMoriOpen, setIsMoriOpen] = React.useState(false);

    /* ── Cover letter, edited in this same step ───────────────────────────
       The letter shares the session (cvData + jobData + autosave) with the CV;
       only the document that fills the canvas frame changes. Profile (master)
       CVs stay CV-only, which is the existing product rule. */
    const isCoverLetterDoc = activeDocument === 'cover-letter';
    const coverLettersAvailable = state.cvType !== 'master';
    const hasCoverLetter = !!(state.autoGeneratedCoverLetter || state.coverLetterId);
    const hasJobDescription = !!(state.jobData?.description || state.jobData?.jobDescription);
    const [clTemplateType, setClTemplateType] = useState<CoverLetterTemplateType>('modern');
    // Defaults live with the panel that edits them, so the reset button and the
    // initial state can never disagree.
    const [clDesign, setClDesign] = useState<CoverLetterDesignProps>({ ...COVER_LETTER_DESIGN_DEFAULTS });
    const [clIsEditing, setClIsEditing] = useState(true);
    // One prompt per editing session, so switching tabs never nags.
    const [jdPromptDismissed, setJdPromptDismissed] = useState(false);

    // Seed the letter's header style from the CV template so the two documents
    // open in the same visual family (mirrors the old cover-letter step).
    React.useEffect(() => {
      const templateId = state.selectedTemplate?.id || (state.selectedTemplate as any)?._id || '';
      const lowerId = String(templateId).toLowerCase();
      if (lowerId.includes('classic') || lowerId.includes('traditional') || lowerId.includes('harvard')) {
        setClTemplateType('classic');
        setClDesign((prev) => ({ ...prev, fontFamily: 'font-serif' }));
      } else if (lowerId.includes('minimal') || lowerId.includes('simple')) {
        setClTemplateType('minimal');
        setClDesign((prev) => ({ ...prev, fontFamily: 'font-sans' }));
      }
    }, [state.selectedTemplate]);

    const closeUtilityPanel = React.useCallback(() => {
      setActiveUtilityPanel(null);
      window.dispatchEvent(new CustomEvent('close-utility-panel'));
    }, []);

    React.useEffect(() => {
      const handleSidebar = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail === 'design') {
          setActiveUtilityPanel('design');
        } else if (detail === 'data') {
          setActiveUtilityPanel('json');
        }
      };
      const handleTemplates = () => {
        setActiveUtilityPanel('layout');
      };
      const handleClose = () => {
        setActiveUtilityPanel(null);
      };
      const handleOpenAnalysis = () => {
        setActiveUtilityPanel('analysis');
      };
      window.addEventListener('set-builder-sidebar', handleSidebar);
      window.addEventListener('open-templates', handleTemplates);
      window.addEventListener('close-utility-panel', handleClose);
      window.addEventListener('open-analysis-panel', handleOpenAnalysis);
      return () => {
        window.removeEventListener('set-builder-sidebar', handleSidebar);
        window.removeEventListener('open-templates', handleTemplates);
        window.removeEventListener('close-utility-panel', handleClose);
        window.removeEventListener('open-analysis-panel', handleOpenAnalysis);
      };
    }, []);

    // Switching documents can strand a panel that does not exist on the new one
    // (JSON is CV-only). Close it rather than leaving the column showing a panel
    // whose tile is now greyed out and inert — there would be no way to dismiss it.
    React.useEffect(() => {
      if (!isCoverLetterDoc) return;
      setActiveUtilityPanel((prev) =>
        prev && COVER_LETTER_DISABLED_PANELS.includes(prev) ? null : prev
      );
    }, [isCoverLetterDoc]);

    // Desktop keeps the panel inline (canvas:panel = 60:40). Below md the panel
    // becomes an off-canvas drawer, exactly like the previous editor shell.
    const [isDesktopLayout, setIsDesktopLayout] = React.useState(true);
    React.useEffect(() => {
      const mq = window.matchMedia('(min-width: 768px)');
      const onChange = () => setIsDesktopLayout(mq.matches);
      onChange();
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }, []);

    // Panel width is derived from the measured row so the canvas keeps ~60% of
    // the usable width without relying on brittle CSS percentages. The row's
    // HEIGHT comes off the same observer — the canvas frame floors itself
    // against it (see canvasFrameFloor below).
    const rowRef = React.useRef<HTMLDivElement>(null);
    const [rowWidth, setRowWidth] = React.useState(0);
    const [rowHeight, setRowHeight] = React.useState(0);
    React.useEffect(() => {
      const el = rowRef.current;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect?.width || 0;
        setRowWidth(Math.round(width));
        setRowHeight(el.clientHeight);
      });
      observer.observe(el);
      setRowWidth(Math.round(el.getBoundingClientRect().width));
      setRowHeight(el.clientHeight);
      return () => observer.disconnect();
    }, []);
    const panelWidthPx = React.useMemo(() => {
      const RAIL_PX = 80; // tile rail (4.5rem 1:1 tiles + 1.5 padding) — see UtilityPanelRail
      // The document switch now lives INSIDE the rail as two more 1:1 tiles, so it
      // adds height to the rail but no width. It used to sit in this row as its own
      // strip on the canvas' left edge, which is why a width was reserved for it.
      const reserved = RAIL_PX + 12; // + 1 x 12px flex gap
      const usable = Math.max(320, rowWidth - reserved);
      return Math.max(340, Math.round(usable * 0.4));
    }, [rowWidth]);

    React.useEffect(() => {
      // Keep the context paperSize (single source for exports) in sync with the
      // canvas page-size toggle. The canvas owns design.pageSize; this mirrors it.
      const handlePaperSizeChange = (e: Event) => {
        const next = (e as CustomEvent).detail;
        if (next === 'A4' || next === 'Letter') {
          dispatch({ type: 'SET_PAPER_SIZE', payload: next });
        }
      };
      window.addEventListener('cv-paper-size-changed', handlePaperSizeChange);
      return () => window.removeEventListener('cv-paper-size-changed', handlePaperSizeChange);
    }, [dispatch]);

    // Opening the Mori dock also enables CV targeting mode (hover/click a field
    // to focus Mori on it), mirroring the old Mori panel contract.
    const handleMoriOpenChange = React.useCallback(
      (open: boolean) => {
        setIsMoriOpen(open);
        dispatch({ type: 'SET_MORI_CHAT_MODE', payload: open });
      },
      [dispatch]
    );

    React.useEffect(() => {
      // External triggers ("Improve this bullet", "Ask Mori", …) set moriChatMode
      // then dispatch open-mori-chat; make sure the dock reflects that state.
      if (state.moriChatMode) setIsMoriOpen(true);
    }, [state.moriChatMode]);

    React.useEffect(() => {
      const handleOpenMoriChat = () => handleMoriOpenChange(true);
      window.addEventListener('open-mori-chat', handleOpenMoriChat);
      return () => window.removeEventListener('open-mori-chat', handleOpenMoriChat);
    }, [handleMoriOpenChange]);

    const lastSelectedPathRef = React.useRef<string | null>(null);
    const pathClickCountRef = React.useRef<number>(0);

    React.useEffect(() => {
      const handleSelection = (e: CustomEvent) => {
        if (!state.moriChatMode) return;
        const { path } = e.detail;
        lastSelectedPathRef.current = path;
        pathClickCountRef.current = 1;
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
        toast.error("Couldn't analyze your CV. Try again.");
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
            toast.error(limitCheck.message || 'You have reached your Tailored Resume limit. Archive or delete an existing Tailored Resume to create a new one, or upgrade to Focused.', { duration: 9000 });
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
              toast.success('Job description updated successfully!');
            } else {
              throw new Error('Failed to update job description');
            }
          } catch (error) {
            console.error('Failed to update job:', error);
            toast.error('Failed to update job description. Please try again.');
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
        const jobId = jobResult.data?.jobApplication?._id;
        const journeyId = jobResult.data?.journey?._id;
        if (!jobId) throw new Error('Failed to create job application');

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
        toast.success(`Job tracking created! Now tracking: ${sanitizedRole} at ${sanitizedCompany}`);

        // If we provided a text override for Master CV, enable JD input show
        if (typeof arg === 'string') {
          setJdText(text);
          setShowJobParserDialog(true);
        }
      } catch (error) {
        console.error('Failed to convert to journey:', error);
        const message = sanitizeErrorMessage(error, 'Failed to create journey. Please try again.');
        toast.error(message);
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

      const sectionLabel = sectionId.replace(/_/g, ' ');
      if (!window.confirm(`Remove the "${sectionLabel}" section and everything in it? You can undo this with Cmd/Ctrl+Z.`)) {
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

    // The canvas frame's FLOOR.
    //
    // It used to hug its content, so at a low zoom the card shrank to little
    // more than the sheet and the workspace's grey — the canvas itself — was
    // left as a band under it, with the editor's own background showing below.
    // The frame now always fills the space the editor gives it, and the content
    // height can only ever be the LARGER of the two.
    //
    // Two reserves make the floor agree with the cap already on the frame:
    //  · the row's own `pt-1.5 pb-1` (10px), because the frame is a flex item
    //    and its `100%` is the row's CONTENT box;
    //  · on the narrow layout the tile rail stacks BELOW the frame instead of
    //    beside it, so its height comes out first — 6.5rem, the same figure the
    //    frame's `max-h-[calc(100%-6.5rem)]` cap reserves.
    const ROW_PADDING_Y_PX = 10;
    const RAIL_STACK_RESERVE_PX = 104; // 6.5rem
    const canvasFrameFloor = React.useMemo(() => {
      const available = Math.max(0, rowHeight - ROW_PADDING_Y_PX);
      return isDesktopLayout ? available : Math.max(0, available - RAIL_STACK_RESERVE_PX);
    }, [isDesktopLayout, rowHeight]);

    // The canvas frame hugs the canvas content (CVCanvasEngine reports its
    // natural height) instead of filling the column and leaving a tall empty
    // region under the page. `null` = not measured yet → fill, so there is no
    // zero-height flash on first paint.
    const [canvasFrameHeight, setCanvasFrameHeight] = useState<number | null>(null);
    const handleCanvasContentHeightChange = useCallback((height: number) => {
      setCanvasFrameHeight((prev) => (prev !== null && Math.abs(prev - height) < 1 ? prev : height));
    }, []);
    /** Content height, raised to the floor and left to the cap to bound above. */
    const resolvedFrameHeight = canvasFrameHeight === null
      ? null
      : Math.max(canvasFrameHeight, canvasFrameFloor);

    // The panel body is ALWAYS mounted: CVCanvasEngine portals the Design /
    // Template / JSON bodies into #builder-utility-panel-portal, so the target
    // node must exist before a tile is clicked (see docs/plan_fix_side_panels.md).
    // Only its width is animated, which is what keeps the 60:40 split smooth.
    const utilityPanelBody = isCoverLetterDoc && coverLettersAvailable ? (
      /* Cover letter panels. The CV panels are owned by CVCanvasEngine and reach
         this column through `#builder-utility-panel-portal`; while the letter is
         open that engine is not mounted, so the letter renders its own panels
         here instead — the tiles keep meaning "act on the open document".

         ⚠️ Each tile MUST be matched explicitly. This used to be a bare
         `layout ? … : …` ternary, so Design and JSON both fell through to the
         analysis panel and the user saw "analysis" behind the Design tile. */
      <div className="h-full w-full flex flex-col overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[#f3f2ee] dark:bg-[#1a1a1a] shadow-sm">
        {activeUtilityPanel === 'layout' ? (
          <CoverLetterHeaderStyles
            templateType={clTemplateType}
            onSelect={(type) => {
              setClTemplateType(type);
              setClDesign((prev) => ({ ...prev, fontFamily: type === 'classic' ? 'font-serif' : 'font-sans' }));
            }}
            onClose={closeUtilityPanel}
            cvData={state.cvData}
            jobData={state.jobData}
          />
        ) : activeUtilityPanel === 'design' ? (
          <CoverLetterDesignPanel design={clDesign} setDesign={setClDesign} onClose={closeUtilityPanel} />
        ) : (
          /* `analysis` — and `null`, so the panel is never blank while its width
             animates open. `json` cannot reach here: the tile is disabled for
             letters (see UtilityPanelRail). */
          <LetterGuidePanel
            matchScore={state.autoGeneratedCoverLetterMetadata?.match_quality ?? 82}
            templateType={clTemplateType}
            setTemplateType={setClTemplateType}
            design={clDesign}
            setDesign={setClDesign}
            isEditing={clIsEditing}
            setIsEditing={setClIsEditing}
            onComplete={onComplete}
            onUpdateTarget={() => setShowJobParserDialog(true)}
          />
        )}
      </div>
    ) : (
      <div className="h-full w-full flex flex-col overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[#f3f2ee] dark:bg-[#1a1a1a] shadow-sm">
        <div className={activeUtilityPanel === 'analysis' ? 'flex flex-1 min-h-0 flex-col overflow-hidden' : 'hidden'}>
          <div className="flex-1 min-h-0">
            <ATSMeterPanel isUtilityPanelOpen={!!activeUtilityPanel} onClose={closeUtilityPanel} />
          </div>
        </div>
        <div
          id="builder-utility-panel-portal"
          className={`flex-1 min-h-0 ${activeUtilityPanel === 'analysis' ? 'hidden' : 'flex'} flex-col overflow-hidden`}
        />
      </div>
    );

    return (
      <div className="h-full flex-1 min-h-0 relative overflow-hidden bg-[var(--bg-secondary)]">
        {/* Main Container */}
        <div className="h-full w-full flex flex-col overflow-hidden relative">
        {/* Row: canvas + utility panel + tile rail */}
        <div ref={rowRef} className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 px-3 pt-1.5 pb-1 overflow-hidden">
          {/* CV Canvas Builder — full drag-drop snippet-based builder with inline editing */}
          <div
            ref={cvPreviewRef}
            className={`min-w-0 min-h-0 relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[var(--bg-primary)] shadow-sm shadow-black/10 dark:shadow-black/30 ring-1 ring-black/[0.05] dark:ring-[var(--border-primary)] ${
              // Once measured, the frame takes its content height — floored at
              // the space the row actually has, never below it. On mobile the
              // row stacks vertically, so the cap has to leave room for the tile
              // rail below (100% would let the frame push the rail off-screen);
              // on desktop the rail sits beside the frame, so the width keeps
              // growing (`md:flex-1`) and `md:self-start` pins the height on the
              // cross axis.
              resolvedFrameHeight !== null
                ? 'flex-none max-h-[calc(100%-6.5rem)] md:flex-1 md:self-start md:max-h-full'
                : 'flex-1'
            }`}
            style={resolvedFrameHeight !== null ? { height: resolvedFrameHeight } : undefined}
          >
            {/* Standalone CVs start life without a job. Once the CV tab is in
                use, offer the missing job description — tailoring, scoring and
                the cover letter all key off it. Dismissible, never blocking.
                
                It is a corner CARD, not a top-centre band. As a band it covered
                the top of the document, and — because it is `z-50` and lives
                OUTSIDE `.cv-page` (which is `z-10` and creates a stacking
                context) — it also painted over the first section's divider strip
                no matter how high that strip's own z-index went.
                
                `bottom-[68px]` clears the canvas control strip, which is
                `absolute bottom-4 right-6` with an `h-9` row: 16 + 36 + 16. */}
            {!isCoverLetterDoc && state.cvType === 'standalone' && !hasJobDescription && !jdPromptDismissed && (
              <div
                data-jd-prompt
                className="absolute bottom-[68px] right-6 z-[50] w-[min(92%,350px)] flex items-start gap-3 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md p-3.5 shadow-2xl shadow-black/15 dark:shadow-black/50 no-print transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">Add a job description</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                    This CV is not linked to a job yet, so tailoring, ATS scoring and the cover letter have nothing to
                    target.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowJobParserDialog(true)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#013f2e] hover:bg-[#02523c] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition-all shadow-sm active:scale-95"
                    >
                      Add job description
                    </button>
                    <button
                      type="button"
                      onClick={() => setJdPromptDismissed(true)}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                      Not now
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setJdPromptDismissed(true)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors -mr-1 -mt-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-hidden">
              {isCoverLetterDoc && coverLettersAvailable ? (
                <CoverLetterCanvas
                  cvData={state.cvData}
                  jobData={state.jobData}
                  bodyContent={state.autoGeneratedCoverLetter || ''}
                  templateType={clTemplateType}
                  design={clDesign}
                  isEditing={clIsEditing}
                  onBodyChange={(content: string) =>
                    dispatch({ type: 'SET_AUTO_COVER_LETTER', payload: { draft: content } })
                  }
                  onCanvasContentHeightChange={handleCanvasContentHeightChange}
                  onOpenHeaderStyles={() => setActiveUtilityPanel('layout')}
                  onRequestJob={() => setShowJobParserDialog(true)}
                  onToggleMoriChat={() => handleMoriOpenChange(true)}
                  // The focus-mode rail edits the letter's design directly, so it
                  // writes through the same setter the sidebar panel uses.
                  onDesignChange={(patch) => setClDesign((prev) => ({ ...prev, ...patch }))}
                  undoStack={state.undoStack}
                  redoStack={state.redoStack}
                  onUndo={() => dispatch({ type: 'UNDO' })}
                  onRedo={() => dispatch({ type: 'REDO' })}
                />
              ) : !state.cvData ? (
                /* CV sheet skeleton — mimics the document that will render here */
                <div className="w-full h-full flex items-start justify-center overflow-y-auto p-6">
                  <div className="w-full max-w-[560px] aspect-[1/1.414] bg-white dark:bg-[var(--bg-primary)] rounded-xl border border-[var(--border-primary)] shadow-sm p-8 flex flex-col gap-6">
                    {/* Header Skeleton */}
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-3.5 w-1/4" />
                    </div>
                    {/* Details Skeletons */}
                    <div className="flex gap-4">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-px w-full" />
                    {/* Summary skeleton */}
                    <div className="space-y-2.5">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                    {/* Experience skeleton */}
                    <div className="space-y-4 pt-2">
                      <Skeleton className="h-4 w-1/4" />
                      <div className="space-y-2.5">
                        <div className="flex justify-between">
                          <Skeleton className="h-3.5 w-1/3" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <CVBuilderProAdapter
                  ref={canvasBuilderRef}
                  cvData={state.cvData}
                  template={state.selectedTemplate}
                  cvId={state.cvId}
                  jobId={state.jobData?.id || state.jobData?._id || null}
                  role={state.jobData?.jobTitle || state.jobData?.title || state.targetRole || null}
                  onDataChange={(updatedData: any) => {
                    dispatch({ type: 'SET_CV_DATA', payload: updatedData });
                  }}
                  onTemplateChange={(newTemplate: any) => {
                    setTemplate(newTemplate);
                    dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: newTemplate });
                  }}
                  theme={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                  moriChatMode={state.moriChatMode}
                  isGuestMode={isGuestMode}
                  spread={!activeUtilityPanel}
                  onCanvasContentHeightChange={handleCanvasContentHeightChange}
                />
              )}
            </div>
          </div>

          {/* Mobile backdrop for the drawer form of the panel */}
          <AnimatePresence>
            {!isDesktopLayout && activeUtilityPanel && (
              <motion.div
                key="utility-panel-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeUtilityPanel}
                className="fixed inset-0 z-[75] bg-black/40 backdrop-blur-xs"
              />
            )}
          </AnimatePresence>

          {/* Utility panel — desktop column (canvas:panel = 60:40) / mobile drawer.
              A SINGLE element renders both forms so the portal target inside keeps
              its DOM identity when the canvas engine portals design/template/json. */}
          <motion.div
            initial={false}
            animate={
              isDesktopLayout
                ? // Desktop only animates width — mixing a percentage `x` transform in
                  // the same target makes framer-motion (v12) keep the element pinned
                  // at its initial `width: 0`, so the 60:40 split never opens.
                  { width: activeUtilityPanel ? panelWidthPx : 0 }
                : { width: '95%', x: activeUtilityPanel ? '0%' : '100%' }
            }
            transition={{ type: 'spring', stiffness: 280, damping: 32, mass: 0.9 }}
            className={
              isDesktopLayout
                ? 'relative shrink-0 min-h-0 overflow-hidden'
                : 'fixed inset-y-0 right-0 z-[80]'
            }
          >
            <div
              className={isDesktopLayout ? 'absolute inset-y-0 right-0' : 'h-full w-full p-3'}
              style={isDesktopLayout ? { width: panelWidthPx } : undefined}
            >
              {utilityPanelBody}
            </div>
          </motion.div>

          {/* Tile rail — document switch (CV ⇄ Cover Letter) · Analysis · Design ·
              Template · JSON. The active panel tile becomes a close button, and
              tiles that do not apply to the open document grey out in place. */}
          <UtilityPanelRail
            activePanel={activeUtilityPanel}
            activeDocument={isCoverLetterDoc ? 'cover-letter' : 'cv'}
            onActiveDocumentChange={onActiveDocumentChange}
            documentSwitchEnabled={coverLettersAvailable}
            hasCoverLetter={hasCoverLetter}
            disabledPanels={isCoverLetterDoc ? COVER_LETTER_DISABLED_PANELS : undefined}
          />

        </div>

        {/* AI: suggestions for the section under the pointer, plus a floating
            conversation panel. The old always-on bar under the canvas is gone;
            the bar is now anchored to the thing being edited. */}
        <MoriSelectionBar
          document={isCoverLetterDoc ? 'cover-letter' : 'cv'}
          enabled={!isMoriOpen}
          onOpenChat={() => handleMoriOpenChange(true)}
        />

        {isCoverLetterDoc && coverLettersAvailable ? (
          isMoriOpen && (
            <div className="fixed z-[195] bottom-4 right-4 w-[min(92vw,420px)] h-[min(60vh,520px)] flex flex-col overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-white dark:bg-[var(--bg-secondary)] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] no-print">
              <MoriCoverLetterChat
                onBodyChange={(content: string) =>
                  dispatch({ type: 'SET_AUTO_COVER_LETTER', payload: { draft: content } })
                }
                onClose={() => handleMoriOpenChange(false)}
              />
            </div>
          )
        ) : (
          <MoriChatDock open={isMoriOpen} onOpenChange={handleMoriOpenChange} floating />
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



        {/* Smart JD Modal for standalone CVs */}
        <SmartJDModal
          isOpen={showJobParserDialog}
          onClose={() => setShowJobParserDialog(false)}
          isLoading={isSavingJobProfile}
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

            setIsSavingJobProfile(true);
            let submitFailed = false;

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
                submitFailed = true;
                console.error('Failed to save and track:', error);
                toast.error(error.message || 'Failed to save and track.');
              }
            }
            if (!submitFailed) {
              setShowJobParserDialog(false);
            }
            setIsSavingJobProfile(false);
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

Step3CV.displayName = 'Step3CV';

export default Step3CV;
