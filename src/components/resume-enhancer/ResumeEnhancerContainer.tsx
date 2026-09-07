// @ts-nocheck
'use client';
import toast from 'react-hot-toast';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Image from 'next/image';
import Logo from '@/components/ui/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { X, Save, Eye, Loader2, Sparkles, User, Settings, LogOut, Sun, Moon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Minimize2, Maximize2, Home, Plus, Palette, FileText, PenTool, Edit2, Check, ClipboardList } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { Skeleton } from '@/components/ui/Skeleton';
import StepIndicator from './StepIndicator';
import Step1Dashboard from './steps/Step1Dashboard';
import Step2Template from './steps/Step2Template';
import Step3CV from './steps/Step3CV';
import Step4CoverLetter from './steps/Step4CoverLetter';
import Step5Review from './steps/Step5Review';


import ErrorBoundary from './ErrorBoundary';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import ThemeToggle from '@/components/ui/ThemeToggle';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';
import OptimizedNavigation from '@/components/dashboard/OptimizedNavigation';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useUserData, getUserDisplayName, getUserAvatar } from '@/lib/hooks/useUserData';
import { useSession } from 'next-auth/react';
import SidebarMembershipCard from '@/components/resume-enhancer/SidebarMembershipCard';
import { CVSurgeonService } from '@/lib/services/cv-surgeon-service';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';

import { logResumeEnhancerEvent } from '@/lib/services/resumeEnhancerLogClient';
import { inferRoleContextFromCVData, inferSeniorityFromYears } from '@/lib/utils/resumeEnhancerRoleInference';
import { mapExperienceLevelToSeniority, isDeepEqual, extractCvIdFromResponse } from '@/lib/resume-metrics';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { comprehensiveSignOut } from '@/lib/utils/signout';

import { getVisibleCVSections } from '@/lib/selectors/cv-section-selectors';
import { migrateLegacyCV } from '@/lib/migrations/cv-structure-migration';
import { getSectionIcon } from '@/lib/utils/cv-section-selectors';
import type { Step3CVRef } from '@/components/resume-enhancer/steps/Step3CV';
import { InfoTooltip, HelpTooltip } from '@/components/ui/tooltip';
import { SaveIndicator } from '@/components/ui/AnimatedCheckmark';
import { AnimatedScore, AnimatedProgressBar } from '@/components/ui/AnimatedScore';
import JobCard from './JobCard';
import JobRoleCard from './JobRoleCard';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import JobParserSidebar from '@/components/dashboard/jobs/JobParserSidebar';
import AuthPromptModal from './AuthPromptModal';
import { CVJourney } from '@/types/cv';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import type { SkillGapAnalysis } from '@/lib/services/skillGapAnalysisService';
import { CheckCircle2, XCircle } from 'lucide-react';
import ATSDeepDiveModal from './ATSDeepDiveModal';
import { useATS } from '@/contexts/ATSContext';
import guestCVService from '@/lib/services/guestCVService';
import { useUpgradePopupTrigger } from '@/lib/hooks/useUpgradePopupTrigger';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import UpgradeCard from '@/components/dashboard/UpgradeCard';
import { generateCVTitle } from '@/lib/utils/cv-title-generator';
import ModeValidationBanner from '@/components/resume-enhancer/components/ModeValidationBanner';
import ModeTransitionDialog from '@/components/resume-enhancer/components/ModeTransitionDialog';
import { getAnalysisModeWithValidation, hasAnalysisContextChanged, type AnalysisMode } from '@/lib/utils/analysis-mode';
import { invalidateStep1Cache } from './steps/Step1Dashboard';
import {
  queueCvThumbnailSnapshotUpload,
  saveCvThumbnailSnapshot,
} from '@/lib/utils/cv-thumbnail-snapshot';
import { extractBodyFromContent } from '@/lib/utils/coverLetterUtils';
import ZoomGuard from '@/components/editor/ZoomGuard';
import OnScreenKeyboard from '@/components/editor/OnScreenKeyboard';

interface ResumeEnhancerContainerProps {
  userId: string;
  mode?: 'create' | 'edit' | 'edit-master' | 'journey' | 'edit-cover-letter' | 'create-cover-letter';
  cvId?: string;
  clId?: string;
  journeyId?: string;
  isGuestMode?: boolean;
  restoreDraft?: boolean;
}

export default function ResumeEnhancerContainer({
  userId,
  mode = 'create',
  cvId,
  clId,
  journeyId,
  isGuestMode = false,
  restoreDraft = false
}: ResumeEnhancerContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { state, dispatch, goToStep, loadCV, setRoleContext, resetState, setJobSidebarOpen, setTemplateOverlayOpen } = useResumeEnhancer();
  const { isOpen: isMobileMenuOpen, toggleSidebar, isDesktopExpanded } = useMobileSidebar();
  const requestedStep = useMemo(() => {
    const rawStep = searchParams.get('step');
    const parsed = Number(rawStep);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5
      ? (parsed as 1 | 2 | 3 | 4 | 5)
      : null;
  }, [searchParams]);

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepOneDocumentTab, setStepOneDocumentTab] = useState<'cvs' | 'cover-letters'>(
    searchParams.get('tab') === 'cover-letters' ? 'cover-letters' : 'cvs'
  );
  const [isTemplateOverlayActive, setIsTemplateOverlayActive] = useState(requestedStep === 2);
  const showTemplateOverlay = state.isTemplateOverlayOpen || isTemplateOverlayActive;
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [isMobileStepsOpen, setIsMobileStepsOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  // Track small-screen viewports for mobile-only editor affordances
  // (on-screen keyboard). Kept in state so SSR renders consistent markup.
  useEffect(() => {
    const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Map internal steps (1-5) to display steps (1-5) for the step indicator
  const displayStep = state.currentStep;
  const displayCompletedSteps = completedSteps;

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error' | 'offline'>('idle');
  const [hasOfflineBackup, setHasOfflineBackup] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSidebarAnalyzing, setIsSidebarAnalyzing] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const { userData, refetch } = useUserData();
  const { openPaymentModal } = usePaymentModal();
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuExpanded, setIsUserMenuExpanded] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const step3Ref = useRef<Step3CVRef>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const templateOverlayRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<{ mode: string; cvId?: string } | null>(null);
  // Track initial CV data to detect unsaved changes
  const initialCVDataRef = useRef<UnifiedCVDataStructure | null>(null);
  const initialCVTitleRef = useRef<string>('');
  const initialTemplateRef = useRef<ITemplate | null>(null);
  // Track if role was explicitly set by user (via modal or sidebar)
  const roleExplicitlySetRef = useRef<boolean>(false);
  // Track if we just saved to prevent re-initialization from resetting state
  const justSavedRef = useRef<boolean>(false);
  // Track if we are navigating back to clean editor page (home button)
  const isNavigatingHomeRef = useRef<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [isScoreAnalysisCompact, setIsScoreAnalysisCompact] = useState(false);
  const showJobSidebar = state.isJobSidebarOpen;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [journeysForJob, setJourneysForJob] = useState<CVJourney[]>([]);
  const { shouldShow: shouldShowUpgradePopup, show: showUpgradePopup, dismiss: dismissUpgradePopup } = useUpgradePopupTrigger();
  const [showUpgradePopupState, setShowUpgradePopupState] = useState(false);
  const [showJobParserDialog, setShowJobParserDialog] = useState(false);
  const [pendingRoleData, setPendingRoleData] = useState<{ targetRole: string; seniorityLevel: string } | null>(null);
  const [skillGapAnalysis, setSkillGapAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [isLoadingSkillGap, setIsLoadingSkillGap] = useState(false);
  const [showATSDeepDive, setShowATSDeepDive] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [hasShownAuthPrompt, setHasShownAuthPrompt] = useState(false);
  const [isTransferringDraft, setIsTransferringDraft] = useState(false);
  const [showSaveWarningModal, setShowSaveWarningModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ type: 'step' | 'path', target: number | string } | null>(null);

  // Use ATS Context for shared ATS data
  const {
    atsScore,
    atsAnalysis,
    isATSLoading,
    refreshATSScore,
    refreshAll
  } = useATS();

  // Calculate JD reference status
  const jdText =
    (typeof state.jobData?.description === 'string' && state.jobData.description) ||
    (typeof state.jobData?.jobDescription === 'string' && state.jobData.jobDescription) ||
    (typeof state.jobData?.jd === 'string' && state.jobData.jd) ||
    '';
  const isJDReferenced = jdText.trim().length > 0;

  // Use ATS score from context if available (more accurate for journey CVs), otherwise fall back to surgeon score
  const analysisScore = useMemo(() => {
    if (state.scoreReport?.overall_score !== undefined) {
      return Math.max(0, Math.min(100, state.scoreReport.overall_score));
    }
    // Compute isJDReferenced inside useMemo to avoid initialization order issues
    const hasJD = jdText.trim().length > 0;
    if (atsScore !== null && hasJD) {
      return Math.max(0, Math.min(100, atsScore));
    }
    return Math.max(0, Math.min(100, state.surgeonAnalysis?.score ?? 0));
  }, [state.scoreReport?.overall_score, atsScore, jdText, state.surgeonAnalysis?.score]);

  // Calculate score breakdown using CentralScoreManager - same as Step5Review
  const scoreResult = useMemo(() => {
    return CentralScoreManager.getInstance().getScoreSync(
      state.cvData,
      state.keywordGapAnalysis || undefined,
      state.atsScoreCap
    );
  }, [state.cvData, state.keywordGapAnalysis, state.atsScoreCap]);
  // Check if this is a master CV - check mode, state, or sessionStorage flag
  const isFromOnboarding = useMemo(() => {
    if (typeof window !== 'undefined') {
      const fromOnboardingSession = sessionStorage.getItem('fromOnboarding') === 'true';
      const fromOnboardingQuery = searchParams.get('fromOnboarding') === 'true';
      return fromOnboardingSession || fromOnboardingQuery;
    }
    return false;
  }, [searchParams]);

  const isMasterCV = useMemo(() => {
    if (mode === 'edit-master' || state.cvType === 'master') {
      return true;
    }
    // Check if user came from onboarding/master CV creation flow
    if (typeof window !== 'undefined' && mode === 'create') {
      const fromOnboarding = sessionStorage.getItem('fromOnboarding') === 'true';
      const isMasterIntent = searchParams.get('master') === 'true';
      return fromOnboarding || isMasterIntent;
    }
    return false;
  }, [mode, state.cvType, searchParams]);
  const isJourneyCV = state.cvType === 'journey';
  const isStandaloneCV = state.cvType === 'standalone';
  const scoreLabel = isMasterCV ? 'CV score' : (isJourneyCV ? 'ATS score' : 'CV score');
  const openIssuesCount = (state.fixAnnotations || []).filter((f) => f.status === 'open').length;

  const coverLetterBlockedMessage = 'Cover letter editing is unavailable for Profile. Use a tailored application or standalone CV to write a job-specific cover letter.';

  const goToStepSafely = useCallback((step: 1 | 2 | 3 | 4 | 5, options?: { silent?: boolean }) => {
    // Phase 1: Master CV Guard
    if (step === 4 && isMasterCV) {
      if (!options?.silent) {
        toast.error(coverLetterBlockedMessage);
      }
      // If we are currently on step 4 or moving to it, bounce back to 3
      goToStep(3);
      return false;
    }

    // Phase 2: Bootstrap Safeguard for Step 2 (Templates)
    // Ensure we have minimal data before showing templates, unless starting fresh from scratch (fresherMode)
    if (step === 2 || (step === 1 && state.isTemplateOverlayOpen)) {
      const hasData = state.cvData?.basics?.name || state.cvData?.basics?.email || (state.cvData?.work && state.cvData.work.length > 0) || state.fresherMode;
      if (!hasData) {
        if (!options?.silent) {
          toast.error("Please upload your resume or select 'Start Fresh' before selecting a visual theme.");
        }
        goToStep(1);
        setTemplateOverlayOpen(false);
        return false;
      }
    }

    goToStep(step);
    return true;
  }, [coverLetterBlockedMessage, goToStep, isMasterCV, state.cvData, state.isTemplateOverlayOpen, setTemplateOverlayOpen, state.fresherMode]);

  useEffect(() => {
    if (state.isJobSidebarOpen) {
      if (state.jobData && (state.jobData.id || state.jobData._id)) {
        setSelectedJob(state.jobData);
      } else {
        setShowJobParserDialog(true);
      }
    } else {
      setShowJobParserDialog(false);
    }
  }, [state.isJobSidebarOpen, state.jobData]);

  useEffect(() => {
    const handleOpenJobSidebar = () => {
      const currentJob = state.jobData;
      if (currentJob && (currentJob.id || currentJob._id)) {
        setSelectedJob(currentJob);
        setJobSidebarOpen(true);
      } else {
        setShowJobParserDialog(true);
      }
    };
    const handleShowTemplateOverlay = () => setTemplateOverlayOpen(true);
    const handleOpenCoverLetter = () => {
      goToStepSafely(4);
    };
    const handleOpenAtsScanner = () => {
      goToStepSafely(3, { silent: true });
      // Wait for step 3 to mount then open sidebar
      setTimeout(() => {
        const currentJob = state.jobData;
        if (currentJob && (currentJob.id || currentJob._id)) {
          setSelectedJob(currentJob);
          setJobSidebarOpen(true);
        } else {
          setShowJobParserDialog(true);
        }
      }, 100);
    };

    window.addEventListener('open-job-sidebar', handleOpenJobSidebar);
    window.addEventListener('show-template-overlay', handleShowTemplateOverlay);
    window.addEventListener('open-cover-letter', handleOpenCoverLetter);
    window.addEventListener('open-ats-scanner', handleOpenAtsScanner);

    return () => {
      window.removeEventListener('open-job-sidebar', handleOpenJobSidebar);
      window.removeEventListener('show-template-overlay', handleShowTemplateOverlay);
      window.removeEventListener('open-cover-letter', handleOpenCoverLetter);
      window.removeEventListener('open-ats-scanner', handleOpenAtsScanner);
    };
  }, [goToStepSafely, state.jobData, setJobSidebarOpen, setTemplateOverlayOpen]);

  useEffect(() => {
    if (isMasterCV && state.currentStep === 4) {
      goToStepSafely(3, { silent: true });
    }
  }, [goToStepSafely, isMasterCV, state.currentStep]);

  // Listen for deletions of the active job/journey and route back to step 1
  useEffect(() => {
    const handleJobDeleted = (e: Event) => {
      const deletedJobId = (e as CustomEvent).detail?.jobId;
      const currentJobId = state.jobData?.id || state.jobData?._id;
      if (deletedJobId && currentJobId && deletedJobId === currentJobId) {
        toast.error('The active job was deleted. Returning to Step 1.');
        setTemplateOverlayOpen(false);
        resetState();
        if (typeof window !== 'undefined') {
          window.location.href = '/editor';
        }
      }
    };

    const handleJourneyDeleted = (e: Event) => {
      const deletedJourneyId = (e as CustomEvent).detail?.journeyId;
      const currentJourneyId = state.journeyId;
      if (deletedJourneyId && currentJourneyId && deletedJourneyId === currentJourneyId) {
        toast.error('The CV journey was deleted. Returning to Step 1.');
        setTemplateOverlayOpen(false);
        resetState();
        if (typeof window !== 'undefined') {
          window.location.href = '/editor';
        }
      }
    };

    window.addEventListener('jobDeleted', handleJobDeleted);
    window.addEventListener('journeyDeleted', handleJourneyDeleted);

    return () => {
      window.removeEventListener('jobDeleted', handleJobDeleted);
      window.removeEventListener('journeyDeleted', handleJourneyDeleted);
    };
  }, [state.jobData, state.journeyId, resetState, setTemplateOverlayOpen]);

  // Extract ATS keywords from ATS context or skill gap analysis
  const atsKeywords = useMemo(() => {
    // First try to use keywords from ATS analysis context
    if (atsAnalysis?.missingKeywords && atsAnalysis?.strengths) {
      const missing = atsAnalysis.missingKeywords.map(kw => ({
        keyword: kw,
        inResume: false,
        inJobAd: 1
      }));
      const matched = atsAnalysis.strengths.map(kw => ({
        keyword: kw,
        inResume: true,
        inJobAd: 1
      }));
      return [...matched, ...missing];
    }

    // Fall back to skill gap analysis
    if (!skillGapAnalysis?.categories) return [];

    const keywords: { keyword: string; inResume: boolean; inJobAd: number }[] = [];

    skillGapAnalysis.categories.forEach((category) => {
      category.skills.forEach((skill) => {
        keywords.push({
          keyword: skill.name,
          inResume: skill.status === 'mastered' || skill.status === 'transferable',
          inJobAd: 1 // Each skill appears in job ad
        });
      });
    });

    return keywords;
  }, [atsAnalysis, skillGapAnalysis]);

  // Refresh ATS data when CV or job changes (skip for guest users)
  useEffect(() => {
    if (state.cvId && state.currentStep === 3 && userId !== 'guest') {
      const jobId = state.jobData?.id || state.jobData?._id;
      if (jobId && isJDReferenced) {
        refreshATSScore(state.cvId, jobId, userId).catch(err => {
          console.warn('Failed to refresh ATS score:', err);
        });
      }
    }
  }, [state.cvId, state.jobData?.id, state.jobData?._id, state.currentStep, isJDReferenced, refreshATSScore, userId]);

  // Calculate keyword match statistics
  const keywordStats = useMemo(() => {
    const total = atsKeywords.length;
    const matched = atsKeywords.filter(kw => kw.inResume).length;
    const missing = total - matched;
    const matchPercentage = total > 0 ? Math.round((matched / total) * 100) : 0;
    const allMatched = total > 0 && missing === 0;
    const hasKeywords = total > 0;

    return { total, matched, missing, matchPercentage, allMatched, hasKeywords };
  }, [atsKeywords]);

  // Check if fixes have been applied (keywords that were missing are now present)
  const fixesApplied = useMemo(() => {
    const keywordFixes = (state.fixAnnotations || []).filter(
      f => f.category === 'keywords' && (f.status === 'applied' || f.status === 'semantic_match')
    );
    return keywordFixes.length > 0;
  }, [state.fixAnnotations]);

  // Track if we've attempted to fetch skill gap analysis to prevent loops
  const skillGapFetchAttemptedRef = useRef<string | null>(null);
  const skillGapErrorRef = useRef<string | null>(null); // Track which job had the error
  const skillGapFetchingRef = useRef<boolean>(false); // Track if currently fetching

  // Memoize job ID to prevent unnecessary re-renders
  const jobId = useMemo(() => {
    return state.jobData?.id || state.jobData?._id || null;
  }, [state.jobData?.id, state.jobData?._id]);

  // Memoize CV data check
  const hasCVData = useMemo(() => {
    return state.cvData && Object.keys(state.cvData).length > 0;
  }, [state.cvData]);

  // Stable fetch function using useCallback
  const fetchSkillGapAnalysis = useCallback(async () => {
    if (!jobId || !userId || userId === 'guest') return;
    if (isLoadingSkillGap || skillGapFetchingRef.current) return;

    // Reset error ref if job changed
    if (skillGapErrorRef.current && skillGapErrorRef.current !== jobId) {
      skillGapErrorRef.current = null;
      skillGapFetchAttemptedRef.current = null;
    }

    // Prevent re-fetching if we've already attempted for this job or if there was an error for this job
    const fetchKey = `${jobId}-${userId}`;
    if (skillGapFetchAttemptedRef.current === fetchKey || skillGapErrorRef.current === jobId) {
      return;
    }

    // Mark as fetching to prevent concurrent requests
    skillGapFetchingRef.current = true;
    setIsLoadingSkillGap(true);
    skillGapFetchAttemptedRef.current = fetchKey;

    try {
      const response = await authenticatedFetchWithUserId(
        `/api/jobs/${jobId}/skill-gap-analysis`,
        userId
      );

      if (!response.ok) {
        // Don't retry on 429 (quota exceeded) or 500 errors for this job
        if (response.status === 429 || response.status === 500) {
          skillGapErrorRef.current = jobId;
          console.warn('Skill gap analysis unavailable (API quota exceeded or error)');
          return;
        }
        console.warn('Failed to fetch skill gap analysis:', response.status);
        return;
      }

      const result = await response.json();
      if (result.success && result.analysis) {
        setSkillGapAnalysis(result.analysis);
        skillGapErrorRef.current = null; // Reset error flag on success
      } else if (result.quotaExceeded) {
        // Handle quota exceeded from response body
        skillGapErrorRef.current = jobId;
        console.warn('Skill gap analysis unavailable (API quota exceeded)');
      }
    } catch (error) {
      console.error('Error fetching skill gap analysis:', error);
      skillGapErrorRef.current = jobId; // Set error flag to prevent retries for this job
    } finally {
      setIsLoadingSkillGap(false);
      skillGapFetchingRef.current = false;
    }
  }, [jobId, userId, isLoadingSkillGap]);

  // Fetch skill gap analysis when job data is available
  useEffect(() => {
    // Early return checks - prevent any execution if conditions aren't met
    if (!state.jobData || !hasCVData || state.currentStep !== 3) return;
    if (!jobId) return;
    if (skillGapErrorRef.current === jobId) return;
    if (skillGapFetchAttemptedRef.current === `${jobId}-${userId}`) return;
    if (isLoadingSkillGap || skillGapFetchingRef.current) return;

    fetchSkillGapAnalysis();
  }, [jobId, hasCVData, state.currentStep, userId, isLoadingSkillGap, fetchSkillGapAnalysis]);

  // Compute cvSections for sidebar (only used when step === 3)
  const cvDataWithStructure = useMemo(() => {
    if (!state.cvData || state.currentStep !== 3) return null;
    if (!state.cvData.structure?.sections || state.cvData.structure.sections.length === 0) {
      return migrateLegacyCV(state.cvData);
    }
    return state.cvData;
  }, [state.cvData, state.currentStep]);

  const visibleSections = useMemo(() => {
    if (!cvDataWithStructure) return [];
    return getVisibleCVSections(cvDataWithStructure, 'cv');
  }, [cvDataWithStructure]);

  const cvSections = useMemo(() => {
    if (state.currentStep !== 3) return [];

    const mappedSections = visibleSections.map(section => {
      const sectionIdMap: Record<string, string> = {
        'personal_header': 'personal',
        'work_experience': 'work',
        'education': 'education',
        'skills': 'skills',
        'projects': 'projects',
        'certificates': 'certificates',
        'languages': 'languages',
        'volunteer': 'volunteer',
        'awards': 'awards',
        'publications': 'publications',
        'interests': 'interests',
        'references': 'references'
      };

      const sidebarId = sectionIdMap[section.type] || section.type;
      const IconComponent = getSectionIcon(section.type);

      return {
        id: sidebarId,
        type: section.type,
        title: section.label,
        icon: IconComponent,
        visible: true
      };
    });

    // Ensure personal info is always present and first
    const hasPersonalInfo = mappedSections.some(s => s.id === 'personal' || s.type === 'personal_header');
    if (!hasPersonalInfo) {
      const PersonalIcon = getSectionIcon('personal_header');
      mappedSections.unshift({
        id: 'personal',
        type: 'personal_header',
        title: 'Personal Information',
        icon: PersonalIcon,
        visible: true
      });
    } else {
      const personalIndex = mappedSections.findIndex(s => s.id === 'personal' || s.type === 'personal_header');
      if (personalIndex > 0) {
        const personalSection = mappedSections[personalIndex];
        mappedSections.splice(personalIndex, 1);
        mappedSections.unshift(personalSection);
      }
    }

    return mappedSections;
  }, [visibleSections, state.currentStep]);

  // Handle hover to open user menu
  const handleUserMenuMouseEnter = () => {
    // Clear any pending close timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsUserMenuExpanded(true);
  };

  const handleUserMenuMouseLeave = () => {
    // Add a small delay before closing to allow moving mouse to menu
    hoverTimeoutRef.current = setTimeout(() => {
      setIsUserMenuExpanded(false);
    }, 200);
  };

  const handleMenuContentMouseEnter = () => {
    // Clear timeout when mouse enters menu content
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleMenuContentMouseLeave = () => {
    // Close menu when mouse leaves menu content
    setIsUserMenuExpanded(false);
  };

  const queueCurrentThumbnailSnapshot = useCallback((targetCvId?: string | null) => {
    const snapshotCvId = targetCvId || state.cvId || cvId || null;
    const currentTemplate = state.selectedTemplate || state.cvData?.metadata?.canvasTemplate;
    if (isGuestMode || !snapshotCvId || !state.cvData || !currentTemplate) {
      return;
    }

    queueCvThumbnailSnapshotUpload({
      cvId: snapshotCvId,
      cvData: state.cvData,
      template: currentTemplate,
      forceRegenerate: true,
    });
  }, [cvId, isGuestMode, state.cvData, state.cvId, state.selectedTemplate]);

  const openEditorDashboard = useCallback(() => {
    queueCurrentThumbnailSnapshot();
    resetState();
    goToStep(1);

    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete('cvId');
    currentParams.delete('journeyId');
    currentParams.delete('clId');
    currentParams.delete('coverLetterId');
    currentParams.delete('mode');
    currentParams.set('step', '1');
    router.replace(`${pathname}?${currentParams.toString()}`);
  }, [goToStep, pathname, queueCurrentThumbnailSnapshot, resetState, router, searchParams]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const confirmNavigation = async (saveBeforeLeaving: boolean) => {
    if (saveBeforeLeaving) {
      await handleSmartSave();
    } else {
      queueCurrentThumbnailSnapshot();
    }
    
    if (pendingNavigation) {
      if (pendingNavigation.type === 'step') {
        goToStepSafely(pendingNavigation.target as 1 | 2 | 3 | 4 | 5);
      } else {
        router.push(pendingNavigation.target as string);
      }
    }
    
    setShowSaveWarningModal(false);
    setPendingNavigation(null);
  };

  const cancelNavigation = () => {
    setShowSaveWarningModal(false);
    setPendingNavigation(null);
  };

  // Handle sign out
  const handleSignOut = async () => {
    await comprehensiveSignOut();
  };

  // Handle settings navigation
  const handleSettingsClick = () => {
    setIsUserMenuExpanded(false);
    router.push('/dashboard/settings');
  };

  // Handle profile navigation
  const handleProfileClick = () => {
    setIsUserMenuExpanded(false);
    router.push('/dashboard/settings?tab=account');
  };

  const calculateTotalWorkYears = (work: any[]): number => {
    try {
      const now = new Date();
      let totalMonths = 0;

      (work || []).forEach((exp: any) => {
        if (!exp?.startDate) return;
        const startDate = new Date(exp.startDate);
        const endDate =
          exp.endDate && exp.endDate !== 'Present'
            ? new Date(exp.endDate)
            : now;

        const months =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());
        totalMonths += months;
      });

      return totalMonths / 12;
    } catch {
      return 0;
    }
  };

  // Sync cvId prop to state if available and state doesn't have it
  useEffect(() => {
    if (cvId && !state.cvId) {
      dispatch({ type: 'SET_CV_ID', payload: cvId });
    }
  }, [cvId, state.cvId]);

  const hasRestoredDraftRef = useRef(false);

  // Load draft on mount if restoreDraft is true (for both Guest and Authenticated users)
  useEffect(() => {
    if (restoreDraft && !hasRestoredDraftRef.current) {
      hasRestoredDraftRef.current = true;
      const loadDraft = async () => {
        try {
          let result;
          if (isGuestMode) {
            result = await guestCVService.loadGuestDraft();
          } else {
            const response = await fetch('/api/cv-draft/load');
            if (response.ok) {
              result = await response.json();
            }
          }

          if (result && result.success && result.data) {
            const draft = result.data;

            // Restore CV data
            if (draft.cvData) {
              dispatch({ type: 'SET_CV_DATA', payload: draft.cvData });
            }

            // Determine target step: URL requestedStep takes priority over draft step for onboarding flow
            const targetStep = requestedStep || draft.currentStep;

            // Restore step (step 2 was template overlay, go to step 1 and show overlay)
            if (targetStep) {
              if (targetStep === 2) {
                goToStepSafely(1, { silent: true });
                setTemplateOverlayOpen(true);
              } else {
                goToStepSafely(targetStep as 1 | 2 | 3 | 4);
              }
            }

            // Restore completed steps
            if (draft.completedSteps) {
              setCompletedSteps(draft.completedSteps);
            }

            // Restore role context
            if (draft.targetRole && draft.seniorityLevel) {
              setRoleContext(draft.targetRole, draft.seniorityLevel);
            }

            // Restore template
            if (draft.template) {
              dispatch({ type: 'SET_TEMPLATE', payload: draft.template });
            }

            // Restore title
            if (draft.cvTitle) {
              dispatch({ type: 'SET_CV_TITLE', payload: draft.cvTitle });
            }

            // Restore active section
            if (draft.activeSection) {
              setActiveSection(draft.activeSection);
            }

            // Restore AI analysis report
            if (draft.aiAnalysis) {
              dispatch({
                type: 'SET_SURGEON_ANALYSIS',
                payload: {
                  score: draft.aiAnalysis.score || 0,
                  fixes: [],
                  scoreReport: draft.aiAnalysis.scoreReport || null
                }
              });
            }

            console.log(`✅ ${isGuestMode ? 'Guest' : 'Authenticated'} draft restored successfully (step: ${targetStep})`);
          }
        } catch (error) {
          console.error(`Failed to load ${isGuestMode ? 'guest' : 'authenticated'} draft:`, error);
        }
      };
      loadDraft();
    }
  }, [requestedStep, goToStepSafely, isGuestMode, restoreDraft, dispatch, setRoleContext]);


  // Guest mode: Auto-save draft
  useEffect(() => {
    if (isGuestMode && state.cvData) {
      const aiAnalysisObj = state.surgeonAnalysis ? {
        score: state.surgeonAnalysis.score,
        scoreReport: state.scoreReport
      } : undefined;

      // Start auto-save
      guestCVService.startAutoSave(() => ({
        cvData: state.cvData,
        currentStep: state.currentStep,
        completedSteps: completedSteps,
        activeSection: activeSection,
        targetRole: state.targetRole,
        seniorityLevel: state.seniorityLevel,
        templateId: state.selectedTemplate?.id || state.selectedTemplate?._id,
        template: state.selectedTemplate,
        cvTitle: state.cvTitle,
        aiAnalysis: aiAnalysisObj
      }));

      // Save on step completion
      const saveDraft = async () => {
        try {
          await guestCVService.saveGuestDraft({
            cvData: state.cvData,
            currentStep: state.currentStep,
            completedSteps: completedSteps,
            activeSection: activeSection,
            targetRole: state.targetRole,
            seniorityLevel: state.seniorityLevel,
            templateId: state.selectedTemplate?.id || state.selectedTemplate?._id,
            template: state.selectedTemplate,
            cvTitle: state.cvTitle,
            aiAnalysis: aiAnalysisObj
          });
        } catch (error) {
          console.error('Failed to auto-save draft:', error);
        }
      };

      // Save immediately on step change
      saveDraft();

      return () => {
        guestCVService.stopAutoSave();
      };
    }
  }, [isGuestMode, state.cvData, state.currentStep, completedSteps, activeSection, state.targetRole, state.seniorityLevel, state.selectedTemplate, state.cvTitle, state.surgeonAnalysis, state.scoreReport]);

  // Track transfer attempts to prevent loops
  const transferAttemptedRef = useRef<boolean>(false);

  // Guest mode: Check for authentication after signup/signin
  useEffect(() => {
    // Only attempt transfer if user is authenticated and we haven't tried yet
    if (sessionStatus === 'authenticated' && session?.user?.id && !transferAttemptedRef.current) {
      const transferDraft = async () => {
        // Mark as attempted immediately to prevent concurrent or repeat calls
        transferAttemptedRef.current = true;

        if (isTransferringDraft) {
          return;
        }

        // Add a small delay to ensure session is fully established
        await new Promise(resolve => setTimeout(resolve, 500));

        setIsTransferringDraft(true);
        try {
          const sessionId = guestCVService.getSessionId();
          if (!sessionId) {
            setIsTransferringDraft(false);
            return;
          }

          // CRITICAL FIX: Check if we actually have a draft to transfer before calling API
          // This prevents infinite loops of 404s when user logs in with a fresh guest session
          const hasDraft = await guestCVService.hasDraft(sessionId);
          if (!hasDraft) {
            setIsTransferringDraft(false);
            return;
          }

          const result = await guestCVService.transferDraftToUser(sessionId, session.user.id);

          if (result.success && result.cvId) {
            // Reload page to switch to authenticated mode
            window.location.href = `/editor?cvId=${result.cvId}&mode=edit&step=${result.step || 3}`;
          } else {
            // Check for specific error indicating draft not found or already transferred
            if (result.error?.includes('Draft not found') || result.error?.includes('already transferred')) {
              console.warn('Draft transfer skipped:', result.error);
            } else {
              const errorMsg = result.error || 'Unknown error occurred';
              // Only alert on standard errors, not expected "not found" flows
              alert(`Failed to transfer your draft: ${errorMsg}. Please try refreshing the page or contact support.`);
            }
            setIsTransferringDraft(false);
          }
        } catch (error: any) {
          console.error('❌ Error transferring draft:', error);
          const errorMsg = error?.message || 'Network error';
          alert(`Error transferring your draft: ${errorMsg}. Please try refreshing the page.`);
          setIsTransferringDraft(false);
        }
      };

      transferDraft();
    }
  }, [isGuestMode, sessionStatus, session?.user?.id]); // Removed isTransferringDraft from deps to prevent loop

  // Helper function to show auth prompt for guest users
  const checkAndShowAuthPrompt = (action: 'save' | 'fix-cv', force = false) => {
    if (isGuestMode && (force || !hasShownAuthPrompt)) {
      setShowAuthPrompt(true);
      setHasShownAuthPrompt(true);
      return true; // Indicates auth prompt was shown
    }
    return false; // No auth prompt needed
  };

  // Auto-update role from CV professional title when it changes (unless explicitly set by user)
  useEffect(() => {
    // Only auto-update in create mode and if role wasn't explicitly set
    if (mode !== 'create' || roleExplicitlySetRef.current) {
      return;
    }

    // Only update if we have a professional title and no current role, or if professional title changed
    const professionalTitle = state.cvData?.basics?.label;
    if (!professionalTitle || !professionalTitle.trim()) {
      return;
    }

    // If we already have a role that matches the professional title, don't update
    if (state.targetRole && state.targetRole.trim() === professionalTitle.trim()) {
      return;
    }

    // Infer role from professional title
    const inferred = inferRoleContextFromCVData(state.cvData);
    if (inferred.targetRole && inferred.targetRole.trim() === professionalTitle.trim()) {
      // Only update if we don't have a role, or if the professional title is different from current role
      if (!state.targetRole || state.targetRole.trim() !== professionalTitle.trim()) {
        setRoleContext(inferred.targetRole, inferred.seniorityLevel || state.seniorityLevel || 'professional');
      }
    }
  }, [state.cvData?.basics?.label, mode, state.targetRole, state.seniorityLevel]);

  // Auto-update CV title when CV type or job data changes
  useEffect(() => {
    // Only auto-update if we have CV data
    if (!state.cvData || !state.cvData.basics) return;

    // Generate new title based on current state
    const newTitle = generateCVTitle(
      state.cvType || 'standalone',
      state.cvData,
      state.jobData
    );

    // Update title if it's different from current
    if (state.cvTitle !== newTitle) {
      dispatch({ type: 'SET_CV_TITLE', payload: newTitle });
    }
  }, [state.cvType, state.jobData?.company, state.jobData?.jobTitle, state.cvData?.basics?.name, state.cvData?.basics?.label]);

  // Mode Monitoring Effect - Track analysis mode changes and invalidate cached scores
  useEffect(() => {
    // Skip if context not fully loaded
    if (!state.cvType) return;

    // Get current mode info with validation
    const modeInfo = getAnalysisModeWithValidation(
      state.cvType,
      state.targetRole,
      state.seniorityLevel,
      jdText,
      state.jobData
    );

    // Detect if mode or context changed significantly
    const currentMode = state.analysisModeInfo?.mode;
    const modeChanged = state.lastAnalysisContext?.mode !== modeInfo.mode;
    const roleHashChanged = state.lastAnalysisContext?.roleHash !== modeInfo.roleHash;
    const jdHashChanged = state.lastAnalysisContext?.jdHash !== modeInfo.jdHash;

    // Only trigger if we have a previous context to compare against (skip initial load)
    if (state.lastAnalysisContext && (modeChanged || roleHashChanged || jdHashChanged)) {
      // Context changed - invalidate cached scores

      // Invalidate cached analysis
      dispatch({ type: 'INVALIDATE_ANALYSIS' });

      // Check if we need to show a transition dialog
      if (modeChanged && currentMode && currentMode !== 'insufficient-data') {
        const isAddingJD = currentMode === 'role-based' && modeInfo.mode !== 'role-based';
        const isRemovingJD = currentMode !== 'role-based' && modeInfo.mode === 'role-based';

        let transitionType = 'generic';
        if (isAddingJD) transitionType = 'add-jd';
        else if (isRemovingJD) transitionType = 'remove-jd';

        // Don't show dialog for minor changes or initial setup
        if (state.currentStep === 3) {
          const hideDialog = sessionStorage.getItem(`hide_transition_${transitionType}`);
          if (!hideDialog) {
            dispatch({
              type: 'SET_MODE_TRANSITION_DATA',
              payload: {
                fromMode: currentMode,
                toMode: modeInfo.mode,
                transitionType
              }
            });
          }
        }
      }
    }

    // Always update mode info and context
    if (!state.analysisModeInfo ||
      state.analysisModeInfo.mode !== modeInfo.mode ||
      state.analysisModeInfo.warnings.length !== modeInfo.warnings.length) {
      dispatch({ type: 'SET_ANALYSIS_MODE_INFO', payload: modeInfo });

      // Update last analysis context
      dispatch({
        type: 'UPDATE_LAST_ANALYSIS_CONTEXT',
        payload: {
          mode: modeInfo.mode,
          roleHash: modeInfo.roleHash,
          jdHash: modeInfo.jdHash
        }
      });

      // Show transition warnings if any
      if (modeInfo.warnings.length > 0) {
        dispatch({ type: 'SET_MODE_WARNINGS', payload: modeInfo.warnings });
      } else {
        dispatch({ type: 'CLEAR_MODE_WARNINGS' });
      }
    }
  }, [state.cvType, state.targetRole, state.seniorityLevel, jdText, state.jobData, dispatch]);

  // Intercept browser back button for graceful internal navigation
  const currentStepRef = useRef(state.currentStep);
  currentStepRef.current = state.currentStep;

  const openEditorDashboardRef = useRef(openEditorDashboard);
  openEditorDashboardRef.current = openEditorDashboard;

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (currentStepRef.current > 1) {
        // Prevent default back behavior
        e.preventDefault();
        // Force the URL back to what it was to keep them on the page
        window.history.pushState(null, '', window.location.href);
        // Navigate internally
        openEditorDashboardRef.current();
      }
    };

    // Only push state once on mount to establish the history entry for capturing back button
    window.history.replaceState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Synchronize state.currentStep to URL query parameters
  useEffect(() => {
    if (isNavigatingHomeRef.current) return;
    if (typeof window !== 'undefined' && state.currentStep) {
      const currentSearchParams = new URLSearchParams(window.location.search);
      const existingStep = currentSearchParams.get('step');
      
      if (state.currentStep > 1) {
        if (existingStep !== String(state.currentStep)) {
          currentSearchParams.set('step', String(state.currentStep));
          router.replace(`${pathname}?${currentSearchParams.toString()}`);
          console.log('🔄 Synced current step to URL query parameter:', state.currentStep);
        }
      } else if (existingStep) {
        // If we transitioned back to step 1, clear the step query parameter
        currentSearchParams.delete('step');
        router.replace(`${pathname}?${currentSearchParams.toString()}`);
      }
    }
  }, [state.currentStep, pathname, router]);

  // Initialize based on mode
  useEffect(() => {
    if (isNavigatingHomeRef.current) {
      if (mode === 'create' && !cvId) {
        isNavigatingHomeRef.current = false;
      } else {
        return;
      }
    }

    // CRITICAL FIX: Skip re-initialization if we just saved and got a new cvId
    // This prevents losing parsed data and surgeon analysis when saving in create mode
    if (justSavedRef.current) {
      console.log('⏭️ Skipping re-initialization - we just saved and got a new cvId');
      justSavedRef.current = false; // Reset flag
      // Update initializedRef to prevent future re-initialization with same params
      initializedRef.current = { mode, cvId };
      return;
    }

    // Prevent re-initialization if already initialized with same params
    const initKey = `${mode}-${cvId || 'no-cv'}`;
    if (initializedRef.current &&
      initializedRef.current.mode === mode &&
      initializedRef.current.cvId === cvId) {
      return;
    }

    const initializeEnhancer = async () => {
      if (requestedStep === 1 && !restoreDraft) {
        resetState();
        goToStepSafely(1, { silent: true });
        initializedRef.current = { mode: 'create', cvId: undefined };
        setIsLoading(false);
        return;
      }

      if (mode === 'create-cover-letter') {
        // Cover letter creation — no CV loading needed, go straight to step 4.
        dispatch({ type: 'SET_MODE', payload: 'create' });
        dispatch({ type: 'SET_CV_TYPE', payload: 'standalone' });
        goToStepSafely(4, { silent: true });
        setCompletedSteps([1, 2, 3]);
        initializedRef.current = { mode, cvId };
        return;
      }

      if (mode === 'edit' || mode === 'edit-master' || mode === 'edit-cover-letter') {
        let actualCvId = cvId || searchParams.get('cvId');
        let effectiveJourneyId = journeyId || searchParams.get('journeyId');
        const effectiveJobId = searchParams.get('jobId') || searchParams.get('job');
        const effectiveClId = clId || searchParams.get('clId') || searchParams.get('coverLetterId');
        let coverLetterData: any = null;
        
        setIsLoading(true);
        try {
          // Fallback 1: Resolve from jobId if present
          if (!actualCvId && effectiveJobId) {
            try {
              const [journeyRes, jobRes] = await Promise.all([
                fetch(`/api/application-journey?jobId=${effectiveJobId}`),
                fetch(`/api/jobs/${effectiveJobId}`)
              ]);
              if (journeyRes.ok) {
                const jData = await journeyRes.json();
                const foundJourney = jData.data?.journeys?.[0] || jData.data?.journey;
                if (foundJourney?.cvId) {
                  actualCvId = foundJourney.cvId;
                  effectiveJourneyId = foundJourney.id || foundJourney._id;
                }
              }
              if (!actualCvId && jobRes.ok) {
                const jobData = await jobRes.json();
                const job = jobData.data?.job || jobData.job;
                if (job?.linkedCvId || job?.cvId) {
                  actualCvId = job.linkedCvId || job.cvId;
                }
              }
            } catch (err) {
              console.warn('Failed to resolve cvId from jobId:', err);
            }
          }

          // Fallback 2: Resolve from journeyId query parameter
          if (!actualCvId && effectiveJourneyId) {
            try {
              const journeyResponse = await fetch(`/api/application-journey?journeyId=${effectiveJourneyId}`);
              if (journeyResponse.ok) {
                const journeyResult = await journeyResponse.json();
                const j = journeyResult.data?.journey || journeyResult.data?.journeys?.[0];
                if (j?.cvId) {
                  actualCvId = j.cvId;
                }
              }
            } catch (err) {
              console.warn('Failed to pre-resolve cvId from journey param:', err);
            }
          }

          // Fallback 3: Resolve from cover letter if edit-cover-letter
          if (effectiveClId) {
            try {
              const clResponse = await fetch(`/api/cover-letters/${effectiveClId}?userId=${userId === 'guest' ? '' : userId}`);
              if (clResponse.ok) {
                const clResult = await clResponse.json();
                if (clResult.success && clResult.coverLetter) {
                  coverLetterData = clResult.coverLetter;
                  actualCvId = coverLetterData.cvId || actualCvId;
                  effectiveJourneyId = coverLetterData.journeyId || effectiveJourneyId;

                  if (!actualCvId && effectiveJourneyId) {
                    try {
                      const journeyResponse = await fetch(`/api/application-journey?journeyId=${effectiveJourneyId}`);
                      if (journeyResponse.ok) {
                        const journeyResult = await journeyResponse.json();
                        const j = journeyResult.data?.journey || journeyResult.data?.journeys?.[0];
                        if (j?.cvId) {
                          actualCvId = j.cvId;
                        }
                      }
                    } catch (err) {
                      console.warn('Failed to fetch cvId from journey:', err);
                    }
                  }
                }
              }
            } catch (clErr) {
              console.warn('Failed to fetch cover letter:', clErr);
            }
          }

          // Fallback 4: Resolve Master CV if edit-master
          if (!actualCvId && mode === 'edit-master') {
            try {
              const masterResponse = await fetch('/api/cvs/master');
              if (masterResponse.ok) {
                const masterResult = await masterResponse.json();
                const masterCv = masterResult.data?.cv || masterResult.cv;
                if (masterCv?.id || masterCv?._id) {
                  actualCvId = masterCv.id || masterCv._id;
                }
              }
            } catch (mErr) {
              console.warn('Failed to fetch master CV:', mErr);
            }
          }

          // Fallback 5: Resolve user's most recent CV if in generic edit mode
          if (!actualCvId && mode === 'edit' && userId !== 'guest') {
            try {
              const cvsResponse = await fetch('/api/cvs?limit=1');
              if (cvsResponse.ok) {
                const cvsResult = await cvsResponse.json();
                const firstCv = cvsResult.data?.cvs?.[0] || cvsResult.cvs?.[0];
                if (firstCv?.id || firstCv?._id) {
                  actualCvId = firstCv.id || firstCv._id;
                }
              }
            } catch (cErr) {
              console.warn('Failed to fetch fallback CV:', cErr);
            }
          }
          
          // If this is a standalone cover letter (no cvId), load it directly into step 4
          if (!actualCvId && coverLetterData) {
            dispatch({
              type: 'SET_AUTO_COVER_LETTER',
              skipHistory: true,
              payload: { draft: coverLetterData.body || extractBodyFromContent(coverLetterData.content || ''), coverLetterId: coverLetterData.id || coverLetterData._id || effectiveClId }
            });
            dispatch({ type: 'SET_CV_TYPE', payload: 'standalone' });
            goToStepSafely(4, { silent: true });
            setCompletedSteps([1, 2, 3]);
            initializedRef.current = { mode, cvId: undefined };
            setIsLoading(false);
            return;
          }

          // If STILL no cvId found, gracefully fallback to create mode (Step 1)
          if (!actualCvId) {
            console.log('ℹ️ No CV ID found for editing. Gracefully starting in create mode.');
            dispatch({ type: 'SET_MODE', payload: 'create' });
            goToStepSafely(1, { silent: true });
            initializedRef.current = { mode: 'create', cvId: undefined };
            setIsLoading(false);
            return;
          }

          const response = await fetch(`/api/cvs/${actualCvId}`);
          if (!response.ok) throw new Error('Failed to load CV');

          const result = await response.json();
          const cv = result.data.cv;

          // Ensure CV has correct journeyId linked if we resolved it from the cover letter or URL params
          if (cv && !cv.journeyId && effectiveJourneyId) {
            cv.journeyId = effectiveJourneyId;
            console.log('✅ Bound effectiveJourneyId to cv.journeyId:', effectiveJourneyId);
          }

          // Fetch associated cover letter if we don't have it yet (e.g. loading CV directly in edit mode)
          if (!coverLetterData && actualCvId && userId !== 'guest' && !isMasterCV && !isFromOnboarding) {
             try {
                const clListResponse = await fetch(`/api/cover-letters?userId=${userId}&cvId=${actualCvId}`);
                if (clListResponse.ok) {
                    const clListResult = await clListResponse.json();
                    const matchingCl = clListResult.data?.coverLetters?.[0];
                    if (matchingCl) {
                        coverLetterData = matchingCl;
                    }
                }

                // Fallback: If not found by cvId, but CV has a journeyId or we have a journeyId in URL params, check by journeyId
                const effectiveJourneyId = cv.journeyId || cv.metadata?.journeyId || journeyId;
                if (!coverLetterData && effectiveJourneyId) {
                    console.log('🔍 edit: Associated cover letter not found by cvId, searching by journeyId:', effectiveJourneyId);
                    const clJourneyResponse = await fetch(`/api/cover-letters?userId=${userId}&journeyId=${effectiveJourneyId}`);
                    if (clJourneyResponse.ok) {
                        const clJourneyResult = await clJourneyResponse.json();
                        const matchingCl = clJourneyResult.data?.coverLetters?.[0];
                        if (matchingCl) {
                            coverLetterData = matchingCl;
                            console.log('✅ Found cover letter via journeyId:', coverLetterData._id || coverLetterData.id);
                        }
                    }
                }
             } catch (clFetchErr) {
                 console.warn('Failed to pre-fetch cover letter for CV:', clFetchErr);
             }
          }

          // Resolve CV type: 
          // 1. If mode is 'journey', force journey type
          // 2. Otherwise, prioritize cvType field, then infer from metadata/journeyId
          let resolvedCvType: 'master' | 'journey' | 'standalone' =
            cv.cvType || (cv.metadata?.isMaster ? 'master' : cv.journeyId ? 'journey' : 'standalone');

          // For journey CVs: ensure we have jobData to show journey-based interface
          if ((resolvedCvType === 'journey' || cv.journeyId || journeyId || effectiveJourneyId) && !isMasterCV && !isFromOnboarding) {
            // Journey CV detected
            const finalJourneyId = cv.journeyId || journeyId || effectiveJourneyId;

            // If jobData is missing but journeyId exists, try to fetch it
            if (!cv.jobData && finalJourneyId) {
              console.warn('⚠️ Journey CV missing jobData, attempting to fetch from journey...');
              try {
                const journeyResponse = await fetch(`/api/application-journey?journeyId=${finalJourneyId}`);
                if (journeyResponse.ok) {
                  const journeyResult = await journeyResponse.json();
                  if (journeyResult.success && journeyResult.data?.journey?.jobId) {
                    const jobResponse = await fetch(`/api/jobs/${journeyResult.data.journey.jobId}`);
                    if (jobResponse.ok) {
                      const jobResult = await jobResponse.json();
                      if (jobResult.success && jobResult.data?.job) {
                        cv.jobData = jobResult.data.job;
                        console.log('✅ Successfully loaded jobData for journey CV');
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Failed to fetch jobData for journey CV:', error);
              }
            }

            // If still no jobData, log warning but continue (journey interface may be limited)
            if (!cv.jobData) {
              console.warn('⚠️ Journey CV loaded without jobData - journey interface may be limited');
            }
          }

          // Edge case: Master CV with JD - don't treat as journey
          const loadedReport = cv.metadata?.surgeonAnalysis?.scoreReport || cv.scoreReport || null;
          if (resolvedCvType === 'master' && cv.jobData) {
            // Don't set jobData for master CVs
            loadCV({
              cvId: cv.id,
              cvType: 'master',
              cvTitle: cv.title,
              cvData: cv.cvData,
              template: cv.template,
              journeyId: undefined,
              jobData: undefined,
              scoreReport: loadedReport
            });

            // Store initial data for unsaved changes detection
            initialCVDataRef.current = JSON.parse(JSON.stringify(cv.cvData));
            initialCVTitleRef.current = cv.title;
            initialTemplateRef.current = cv.template || null;
          } else {
            // Always load CV with resolved type and jobData (for journey CVs)
            const finalCvType = (resolvedCvType === 'standalone' && (cv.journeyId || journeyId)) ? 'journey' : resolvedCvType;
            loadCV({
              cvId: cv.id,
              cvType: finalCvType,
              cvTitle: cv.title,
              cvData: cv.cvData,
              template: cv.template,
              journeyId: cv.journeyId || journeyId,
              jobData: cv.jobData,
              coverLetterId: coverLetterData ? (coverLetterData.id || coverLetterData._id) : undefined,
              scoreReport: loadedReport
            });

            // Store initial data for unsaved changes detection
            initialCVDataRef.current = JSON.parse(JSON.stringify(cv.cvData));
            initialCVTitleRef.current = cv.title;
            initialTemplateRef.current = cv.template || null;
          }

          if (coverLetterData) {
            dispatch({
              type: 'SET_AUTO_COVER_LETTER',
              skipHistory: true,
              payload: { draft: coverLetterData.body || extractBodyFromContent(coverLetterData.content || ''), coverLetterId: coverLetterData.id || coverLetterData._id || clId }
            });
          }

          // Master and Standalone CVs are role-based: auto-derive role + seniority so Step 3 analysis is ready.
          if (resolvedCvType === 'master' || resolvedCvType === 'standalone') {
            const inferredRole =
              cv.cvData?.basics?.label ||
              cv.cvData?.work?.[0]?.position ||
              '';

            const inferredSeniority =
              mapExperienceLevelToSeniority(cv?.metadata?.aiAnalysis?.experienceLevel?.level) ||
              inferSeniorityFromYears(calculateTotalWorkYears(cv.cvData?.work || [])) ||
              '';

            if (inferredRole || inferredSeniority) {
              setRoleContext(inferredRole, inferredSeniority);
            }
          }

          // Journey CVs use job description for analysis - no need to set targetRole/seniorityLevel
          // They will use jobData.jobDescription for ATS and other analysis

          dispatch({ type: 'SET_MODE', payload: 'edit' });
          
          if (mode === 'edit-cover-letter') {
            const allowedCoverLetterStep = !isMasterCV && resolvedCvType !== 'master';
            goToStepSafely(requestedStep || (allowedCoverLetterStep ? 4 : 3), { silent: false });
            setCompletedSteps(allowedCoverLetterStep ? [1, 2, 3] : [1, 2]);
          } else {
            // Skip to requested step or default to Step 3 for editing
            const targetStep = requestedStep || 3;
            
            if (targetStep === 2) {
              // Step 2 is the template overlay, which needs Step 1 as background
              goToStepSafely(1, { silent: true });
              setTemplateOverlayOpen(true);
            } else {
              goToStepSafely(targetStep, { silent: true });
            }
            
            // Set completed steps based on target step
            const completed = [];
            for (let i = 1; i < targetStep; i++) completed.push(i);
            setCompletedSteps(completed);
          }

          // Update URL to include mode parameter
          // For master CVs, use 'edit-master' mode in URL
          const urlMode = mode === 'edit-cover-letter' && resolvedCvType !== 'master'
            ? 'edit-cover-letter'
            : (resolvedCvType === 'master' ? 'edit-master' : 'edit');
          const currentParams = new URLSearchParams(window.location.search);
          if (currentParams.get('mode') !== urlMode || currentParams.get('cvId') !== actualCvId) {
            currentParams.set('mode', urlMode);
            currentParams.set('cvId', actualCvId);
            const newUrl = `${pathname}?${currentParams.toString()}`;
            router.replace(newUrl);
          }

          // Mark as initialized
          initializedRef.current = { mode, cvId };
        } catch (error) {
          console.error('Failed to load CV:', error);
          toast.error('Failed to load CV. Redirecting to Editor.');
          router.push('/editor');
        } finally {
          setIsLoading(false);
        }
      } else if (mode === 'journey') {
        // Journey mode: can be edit (with cvId) or create (without cvId)
        if (cvId) {
          // Edit existing journey CV
          setIsLoading(true);
          try {
            const response = await fetch(`/api/cvs/${cvId}`);
            if (!response.ok) throw new Error('Failed to load CV');

            const result = await response.json();
            const cv = result.data.cv;

            // Ensure CV has correct journeyId linked if we resolved it from the cover letter
            const effectiveJourneyId = cv.journeyId || cv.metadata?.journeyId || journeyId;
            if (cv && !cv.journeyId && effectiveJourneyId) {
              cv.journeyId = effectiveJourneyId;
              console.log('✅ Bound effectiveJourneyId to cv.journeyId:', effectiveJourneyId);
            }

            // Force journey type for journey mode
            const resolvedCvType: 'journey' = 'journey';

            // Ensure we have jobData
            if (!cv.jobData && cv.journeyId) {
              console.warn('⚠️ Journey CV missing jobData, attempting to fetch from journey...');
              try {
                const journeyResponse = await fetch(`/api/application-journey?journeyId=${cv.journeyId}`);
                if (journeyResponse.ok) {
                  const journeyResult = await journeyResponse.json();
                  if (journeyResult.success && journeyResult.data?.journey?.jobId) {
                    const jobResponse = await fetch(`/api/jobs/${journeyResult.data.journey.jobId}`);
                    if (jobResponse.ok) {
                      const jobResult = await jobResponse.json();
                      if (jobResult.success && jobResult.data?.job) {
                        cv.jobData = jobResult.data.job;
                        console.log('✅ Successfully loaded jobData for journey CV');
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Failed to fetch jobData for journey CV:', error);
              }
            }

            const loadedReport = cv.metadata?.surgeonAnalysis?.scoreReport || cv.scoreReport || null;
            loadCV({
              cvId: cv.id,
              cvType: resolvedCvType,
              cvTitle: cv.title,
              cvData: cv.cvData,
              template: cv.template,
              journeyId: cv.journeyId || journeyId,
              jobData: cv.jobData,
              scoreReport: loadedReport
            });

            initialCVDataRef.current = JSON.parse(JSON.stringify(cv.cvData));
            initialCVTitleRef.current = cv.title;
            initialTemplateRef.current = cv.template || null;

            dispatch({ type: 'SET_MODE', payload: 'edit' });
            
            // Respect requested step or default to builder (3)
            const targetStep = requestedStep || 3;
            if (targetStep === 2) {
              goToStepSafely(1, { silent: true });
              setTemplateOverlayOpen(true);
            } else {
              goToStepSafely(targetStep as any, { silent: true });
            }
            
            setCompletedSteps([1, 2]);

            initializedRef.current = { mode, cvId };
          } catch (error) {
            console.error('Failed to load CV:', error);
            toast.error('Failed to load CV. Redirecting to Editor.');
            router.push('/editor');
          } finally {
            setIsLoading(false);
          }
        } else if (journeyId) {
          // Create new journey CV
          dispatch({ type: 'SET_MODE', payload: 'create' });
          dispatch({ type: 'SET_JOURNEY_ID', payload: journeyId });
          dispatch({ type: 'SET_CV_TYPE', payload: 'journey' });

          // Fetch job data from journey
          (async () => {
            try {
              console.log('🎯 Resume Enhancer - Loading job data from journey:', journeyId);
              const journeyResponse = await fetch(`/api/application-journey/${journeyId}`);
              if (journeyResponse.ok) {
                const journeyResult = await journeyResponse.json();
                if (journeyResult.success && journeyResult.data) {
                  const { journey, jobData } = journeyResult.data;

                  if (jobData) {
                    dispatch({ type: 'SET_JOB_DATA', payload: jobData });
                    console.log('✅ Resume Enhancer - Job data loaded from journey:', jobData);
                  } else if (journey?.jobId) {
                    try {
                      const jobResponse = await fetch(`/api/jobs/${journey.jobId}`);
                      if (jobResponse.ok) {
                        const jobResult = await jobResponse.json();
                        if (jobResult.success && jobResult.data?.job) {
                          const fetchedJobData = jobResult.data.job;
                          dispatch({ type: 'SET_JOB_DATA', payload: fetchedJobData });
                          console.log('✅ Resume Enhancer - Job data loaded from job API');
                        }
                      }
                    } catch (jobError) {
                      console.error('Failed to fetch job data:', jobError);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Failed to load journey/job data:', error);
            }
          })();

          goToStep(1);
          initializedRef.current = { mode, cvId };
        } else {
          console.error('Journey mode requires either cvId or journeyId');
          router.push('/dashboard/jobs?tab=applications');
        }
      } else {
        // Create mode (default)
        dispatch({ type: 'SET_MODE', payload: 'create' });

        // If journeyId is provided, set cvType to 'journey' and load job data
        if (journeyId) {
          dispatch({ type: 'SET_JOURNEY_ID', payload: journeyId });
          dispatch({ type: 'SET_CV_TYPE', payload: 'journey' });

          // Fetch job data from journey
          (async () => {
            try {
              console.log('🎯 Resume Enhancer - Loading job data from journey:', journeyId);
              const journeyResponse = await fetch(`/api/application-journey/${journeyId}`);

              if (journeyResponse.ok) {
                const journeyResult = await journeyResponse.json();
                if (journeyResult.success && journeyResult.data) {
                  const { journey, jobData } = journeyResult.data;

                  // CRITICAL: Check if journey deeply has a CV already
                  // If so, switch to edit mode and load that CV instead of creating new one
                  if (journey?.cvId) {
                    console.log('✅ Journey already has CV:', journey.cvId, '- Switching to EDIT mode');

                    // Fetch the CV details
                    const cvResponse = await fetch(`/api/cvs/${journey.cvId}`);
                    if (cvResponse.ok) {
                      const cvResult = await cvResponse.json();
                      let loadedCV = cvResult.data?.cv || cvResult.cv;

                      if (loadedCV) {
                        // Switch to EDIT mode
                        dispatch({ type: 'SET_MODE', payload: 'edit' });
                        dispatch({ type: 'SET_CV_ID', payload: loadedCV.id || loadedCV._id });

                        // Load CV data
                        const resolvedCvType = loadedCV.isMaster ? 'master' : (loadedCV.journeyId ? 'journey' : 'standalone');

                        loadCV({
                          cvId: loadedCV.id || loadedCV._id,
                          cvType: resolvedCvType,
                          cvTitle: loadedCV.title,
                          cvData: loadedCV.cvData,
                          template: loadedCV.template,
                          journeyId: journeyId,
                          jobData: jobData || loadedCV.jobData // Prefer fresh jobData from journey
                        });

                        // Set refs to prevent re-initialization
                        initialCVDataRef.current = JSON.parse(JSON.stringify(loadedCV.cvData));
                        initialCVTitleRef.current = loadedCV.title;
                        initialTemplateRef.current = loadedCV.template || null;

                        // Mark as initialized with the REAL CV ID
                        initializedRef.current = { mode: 'edit', cvId: loadedCV.id || loadedCV._id };

                        // Skip directly to Step 3
                        goToStep(3);
                        setCompletedSteps([1, 2]);

                        // Exit early - don't proceed with creation flow
                        return;
                      }
                    }
                  }

                  // If no CV exists, continue with creation flow
                  // Set job data if available
                  if (jobData) {
                    dispatch({ type: 'SET_JOB_DATA', payload: jobData });
                    console.log('✅ Resume Enhancer - Job data loaded from journey:', jobData);
                  } else if (journey?.jobId) {
                    // Fallback: fetch job data separately if not included in response
                    try {
                      const jobResponse = await fetch(`/api/jobs/${journey.jobId}`);
                      if (jobResponse.ok) {
                        const jobResult = await jobResponse.json();
                        if (jobResult.success && jobResult.data?.job) {
                          const fetchedJobData = jobResult.data.job;
                          dispatch({ type: 'SET_JOB_DATA', payload: fetchedJobData });
                          console.log('✅ Resume Enhancer - Job data loaded from job API');
                        }
                      }
                    } catch (jobError) {
                      console.error('Failed to fetch job data:', jobError);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Failed to load journey/job data:', error);
            }
          })();
        } else {
          // Check if creating master CV from onboarding
          if (typeof window !== 'undefined') {
            const fromOnboarding = sessionStorage.getItem('fromOnboarding') === 'true';
            const isMasterIntent = searchParams.get('master') === 'true';
            if (fromOnboarding || isMasterIntent) {
              dispatch({ type: 'SET_CV_TYPE', payload: 'master' });
            } else {
              // Default to standalone for create mode
              dispatch({ type: 'SET_CV_TYPE', payload: 'standalone' });
            }
          } else {
            // Default to standalone for create mode
            dispatch({ type: 'SET_CV_TYPE', payload: 'standalone' });
          }

          // fresher=true in URL means the user chose "Start Blank" — activate fresher mode
          // so the goToStepSafely(2) data guard (checks state.fresherMode) passes correctly
          if (searchParams.get('fresher') === 'true') {
            dispatch({ type: 'SET_FRESHER_MODE', payload: true });
          }
        }


        // Only go to requested step (or default to 1) if we are starting fresh (create mode, no ID) and not restoring draft
        if ((mode === 'create' || mode === 'create-cover-letter') && !cvId && !journeyId && !restoreDraft) {
          const targetStep = requestedStep || 1;
          if (targetStep === 2) {
            goToStepSafely(1, { silent: true });
            setTemplateOverlayOpen(true);
          } else {
            goToStepSafely(targetStep, { silent: true });
          }
        }

        // Mark as initialized
        initializedRef.current = { mode, cvId };
      }
    };

    initializeEnhancer();
  }, [mode, cvId, journeyId, restoreDraft, requestedStep, resetState, goToStepSafely]);

  const handleStep1Complete = (cvData: UnifiedCVDataStructure) => {
    dispatch({ type: 'SET_CV_DATA', payload: cvData });
    setCompletedSteps([...completedSteps, 1]);

    // Generate automatic title based on CV type
    const cvType = state.cvType || (isGuestMode ? 'master' : 'standalone');
    const autoTitle = generateCVTitle(cvType, cvData, state.jobData);
    dispatch({ type: 'SET_CV_TITLE', payload: autoTitle });
    console.log('✅ Auto-generated CV title:', autoTitle, 'for cvType:', cvType);

    // For create mode, set initial data when first data is entered
    if (mode === 'create') {
      initialCVDataRef.current = JSON.parse(JSON.stringify(cvData));
      initialCVTitleRef.current = autoTitle;
    }

    // Auto-extract role from CV data for master and standalone CVs in edit mode
    // In create mode, show role selector modal
    if (mode === 'edit' || mode === 'edit-master') {
      // Auto-extract role from CV data
      const inferredRole =
        cvData?.basics?.label ||
        cvData?.work?.[0]?.position ||
        '';

      const inferredSeniority =
        mapExperienceLevelToSeniority((state.cvData as any)?.metadata?.aiAnalysis?.experienceLevel?.level) ||
        inferSeniorityFromYears(calculateTotalWorkYears(cvData?.work || [])) ||
        '';

      if (inferredRole || inferredSeniority) {
        setRoleContext(inferredRole, inferredSeniority);
      }

      // Proceed directly to builder (skip template overlay for existing CVs)
      goToStep(3);
      return;
    }

    // For create mode: Try to auto-infer role from CV data
    // If role can be inferred, set it automatically and skip modal
    // Only show modal if role cannot be inferred
    if (mode === 'create') {
      // Try to infer role from CV data (professional title or latest position)
      const inferred = inferRoleContextFromCVData(cvData);

      if (inferred.targetRole && inferred.seniorityLevel) {
        // Role can be inferred - set it automatically and skip modal
        setRoleContext(inferred.targetRole, inferred.seniorityLevel);

        // Guest mode: Save draft with inferred role
        if (isGuestMode) {
          guestCVService.saveGuestDraft({
            cvData: cvData,
            currentStep: 2,
            completedSteps: [...completedSteps, 1],
            targetRole: inferred.targetRole,
            seniorityLevel: inferred.seniorityLevel,
            templateId: state.selectedTemplate?.id || state.selectedTemplate?._id,
            template: state.selectedTemplate,
            cvTitle: state.cvTitle
          }).catch(err => console.error('Failed to save draft:', err));
        }

        // Proceed directly to template overlay (skip role modal) for new CVs
        setTemplateOverlayOpen(true);
        return;
      }
    }

    // Guest mode: Save draft (when role cannot be inferred)
    if (isGuestMode) {
      guestCVService.saveGuestDraft({
        cvData: cvData,
        currentStep: 2,
        completedSteps: [...completedSteps, 1],
        targetRole: state.targetRole,
        seniorityLevel: state.seniorityLevel,
        templateId: state.selectedTemplate?.id || state.selectedTemplate?._id,
        template: state.selectedTemplate,
        cvTitle: state.cvTitle
      }).catch(err => console.error('Failed to save draft:', err));
    }

    // Show role selector modal only if role cannot be inferred from CV data
    setShowRoleModal(true);
  };

  const handleRoleModalSubmit = async (data: {
    targetRole: string;
    seniorityLevel: string;
    jobDescription?: string;
    hasJD: boolean;
  }) => {
    setShowRoleModal(false);

    // Mark role as explicitly set by user
    roleExplicitlySetRef.current = true;

    // Set role context
    setRoleContext(data.targetRole, data.seniorityLevel);

    // CRITICAL FIX: Preserve existing CV type when editing
    // Only modify cvType when creating a new CV
    const isEditingExistingCV = mode === 'edit' || mode === 'edit-master' || state.cvId;

    if (isEditingExistingCV) {
      // In edit mode, preserve the existing CV type
      // Don't allow changing master CVs to standalone/journey via role modal
      // No cvType change - just update role context
      // Proceed directly to step 3, bypassing step 2 template selector
      goToStep(3);
    } else {
      // Create mode logic (existing behavior)
      // Guest mode: First CV = Master CV (no JD allowed)
      if (isGuestMode) {
        // Guest users creating first CV - it will be master CV
        dispatch({ type: 'SET_CV_TYPE', payload: 'master' });
      } else if (data.hasJD && data.jobDescription) {
        // If JD provided, create journey (only for authenticated users)
        try {
          // Create job application
          const jobResponse = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobTitle: data.targetRole,
              company: 'Unknown Company',
              jobDescription: data.jobDescription,
              status: 'created'
            })
          });

          if (!jobResponse.ok) throw new Error('Failed to create job');

          const jobResult = await jobResponse.json();
          const newJourneyId = jobResult.data.journey._id;

          dispatch({ type: 'SET_JOURNEY_ID', payload: newJourneyId });
          dispatch({ type: 'SET_CV_TYPE', payload: 'journey' });
          dispatch({ type: 'SET_JOB_DATA', payload: { description: data.jobDescription, title: data.targetRole } });
        } catch (error) {
          console.error('Failed to create journey:', error);
          // Continue as standalone
          dispatch({ type: 'SET_CV_TYPE', payload: 'standalone' });
        }
      } else {
        // Set as standalone (for authenticated users without JD)
        // For guest mode, this is handled above
        if (!isGuestMode) {
          dispatch({ type: 'SET_CV_TYPE', payload: 'standalone' });
        }
      }

      // Guest mode: Save draft after role selection
      if (isGuestMode) {
        guestCVService.saveGuestDraft({
          cvData: state.cvData,
          currentStep: 2,
          completedSteps: completedSteps,
          targetRole: data.targetRole,
          seniorityLevel: data.seniorityLevel,
          templateId: state.selectedTemplate?.id || state.selectedTemplate?._id,
          template: state.selectedTemplate,
          cvTitle: state.cvTitle
        }).catch(err => console.error('Failed to save draft:', err));
      }

      // Show template overlay for new CV (only in create mode)
      setTemplateOverlayOpen(true);
    }
  };

  const handleOpenJobParser = (roleData?: { targetRole: string; seniorityLevel: string }) => {
    // Store role data from modal or state
    if (roleData) {
      setPendingRoleData(roleData);
      // Also set role context immediately
      setRoleContext(roleData.targetRole, roleData.seniorityLevel);
    } else if (state.targetRole && state.seniorityLevel) {
      setPendingRoleData({
        targetRole: state.targetRole,
        seniorityLevel: state.seniorityLevel
      });
    }
    setShowRoleModal(false);
    setShowJobParserDialog(true);
  };

  const handleJobParserComplete = async (parsedData: any) => {
    // Get role data from pending state or use parsed data
    const roleData = pendingRoleData || {
      targetRole: parsedData.jobTitle || state.targetRole || '',
      seniorityLevel: state.seniorityLevel || ''
    };

    // For standalone CVs, automatically convert to journey when JD is added
    if (state.cvType === 'standalone') {
      const jobDescription = parsedData.jobDescription || parsedData.jobDescriptionRaw || parsedData.description || '';

      if (jobDescription && jobDescription.trim().length > 100) {
        try {
          // WORKAROUND: Ensure CV is saved first if cvId is missing
          // This handles the case where CV was parsed but not saved yet
          let effectiveCvId: string | null = null;
          try {
            effectiveCvId = await ensureCVSaved();
            if (!effectiveCvId) {
              throw new Error('Failed to save CV - no ID returned');
            }
          } catch (saveError: any) {
            console.error('Failed to save CV before creating job:', saveError);
            alert(`Failed to save CV: ${saveError.message || 'Unknown error'}. Please try again.`);
            return;
          }

          // EDGE CASE 10: Set timeout for request (30 seconds)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            // Create job application from parsed data with cvId
            const jobResponse = await fetch('/api/jobs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobTitle: parsedData.jobTitle || state.targetRole || 'Software Engineer',
                company: parsedData.company || 'Unknown Company',
                jobDescription: jobDescription,
                location: parsedData.location,
                jobUrl: parsedData.jobUrl,
                status: 'created',
                cvId: effectiveCvId // Pass effectiveCvId to link CV before document creation
              }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (jobResponse.ok) {
              const jobResult = await jobResponse.json();
              const jobId = jobResult.data.jobApplication?._id || jobResult.data.id;
              const journeyId = jobResult.data.journey?._id;

              // EDGE CASE 6: Only update context after successful job creation
              if (journeyId) {
                // Reload CV with journey context dynamically (without navigating away)
                try {
                  // Fetch the updated CV with journey data
                  const cvResponse = await fetch(`/api/cvs/${effectiveCvId}`);
                  if (cvResponse.ok) {
                    const cvResult = await cvResponse.json();
                    const updatedCV = cvResult.data.cv;

                    // Reload CV with journey context using loadCV
                    loadCV({
                      cvId: updatedCV.id,
                      cvType: 'journey',
                      cvTitle: updatedCV.title,
                      cvData: updatedCV.cvData,
                      template: updatedCV.template,
                      journeyId: journeyId,
                      jobData: updatedCV.jobData || {
                        id: jobId,
                        _id: jobId,
                        jobTitle: parsedData.jobTitle || state.targetRole,
                        title: parsedData.jobTitle || state.targetRole,
                        company: parsedData.company || 'Unknown Company',
                        description: jobDescription,
                        jobDescription: jobDescription,
                        location: parsedData.location
                      }
                    });

                    // Update initial data refs
                    initialCVDataRef.current = JSON.parse(JSON.stringify(updatedCV.cvData));
                    initialCVTitleRef.current = updatedCV.title;
                    initialTemplateRef.current = updatedCV.template || null;

                    // Journey CVs use job description for analysis - no need to set targetRole/seniorityLevel

                    // Update URL params to reflect journey mode
                    const currentSearchParams = new URLSearchParams(searchParams.toString());
                    currentSearchParams.set('mode', 'journey');
                    currentSearchParams.set('cvId', updatedCV.id);
                    currentSearchParams.set('journeyId', journeyId);
                    router.replace(`${pathname}?${currentSearchParams.toString()}`);

                    console.log('✅ CV reloaded with journey context dynamically');
                  } else {
                    // Fallback: update state manually if fetch fails
                    dispatch({ type: 'SET_JOURNEY_ID', payload: journeyId });
                    dispatch({ type: 'SET_CV_TYPE', payload: 'journey' });
                    dispatch({
                      type: 'SET_JOB_DATA',
                      payload: {
                        id: jobId,
                        _id: jobId,
                        jobTitle: parsedData.jobTitle || state.targetRole,
                        title: parsedData.jobTitle || state.targetRole,
                        company: parsedData.company || 'Unknown Company',
                        description: jobDescription,
                        jobDescription: jobDescription,
                        location: parsedData.location
                      }
                    });
                  }
                } catch (reloadError) {
                  console.error('Failed to reload CV with journey context:', reloadError);
                  // Fallback: update state manually
                  dispatch({ type: 'SET_JOURNEY_ID', payload: journeyId });
                  dispatch({ type: 'SET_CV_TYPE', payload: 'journey' });
                  dispatch({
                    type: 'SET_JOB_DATA',
                    payload: {
                      id: jobId,
                      _id: jobId,
                      jobTitle: parsedData.jobTitle || state.targetRole,
                      title: parsedData.jobTitle || state.targetRole,
                      company: parsedData.company || 'Unknown Company',
                      description: jobDescription,
                      jobDescription: jobDescription,
                      location: parsedData.location
                    }
                  });
                }
              } else {
                // Journey creation failed, keep CV standalone
                console.warn('Journey creation failed, keeping CV standalone');
                dispatch({
                  type: 'SET_JOB_DATA',
                  payload: {
                    ...state.jobData,
                    jobTitle: parsedData.jobTitle || state.targetRole,
                    title: parsedData.jobTitle || state.targetRole,
                    company: parsedData.company || 'Unknown Company',
                    description: jobDescription,
                    jobDescription: jobDescription,
                    location: parsedData.location
                  }
                });
              }
            } else {
              // EDGE CASE 3 & 9: Handle job creation failure
              const errorData = await jobResponse.json().catch(() => ({}));
              const errorMessage = errorData.error || errorData.message || 'Failed to create job';

              // EDGE CASE 9: Check for tier/plan errors
              if (errorMessage.includes('credit') || errorMessage.includes('limit')) {
                alert('This feature requires a Pro membership. Please upgrade your plan to continue.');
              } else {
                alert(`Failed to create job: ${errorMessage}`);
              }

              // Keep CV as standalone if job creation fails
              dispatch({
                type: 'SET_JOB_DATA',
                payload: {
                  ...state.jobData,
                  jobTitle: parsedData.jobTitle || state.targetRole,
                  title: parsedData.jobTitle || state.targetRole,
                  company: parsedData.company || 'Unknown Company',
                  description: jobDescription,
                  jobDescription: jobDescription,
                  location: parsedData.location
                }
              });
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);

            // EDGE CASE 10: Handle network timeout
            if (fetchError.name === 'AbortError') {
              alert('Request timed out. Please check your connection and try again.');
            } else {
              throw fetchError;
            }
          }
        } catch (error) {
          // EDGE CASE 3: Job creation failure - keep CV standalone
          console.error('Failed to convert standalone to journey:', error);
          alert(`Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`);

          // Fallback: just update jobData, keep CV standalone
          dispatch({
            type: 'SET_JOB_DATA',
            payload: {
              ...state.jobData,
              jobTitle: parsedData.jobTitle || state.targetRole,
              title: parsedData.jobTitle || state.targetRole,
              company: parsedData.company || 'Unknown Company',
              description: jobDescription,
              jobDescription: jobDescription,
              location: parsedData.location
            }
          });
        }
      } else {
        // If JD is too short, just update jobData without converting
        dispatch({
          type: 'SET_JOB_DATA',
          payload: {
            ...state.jobData,
            jobTitle: parsedData.jobTitle || state.targetRole,
            title: parsedData.jobTitle || state.targetRole,
            company: parsedData.company || 'Unknown Company',
            description: jobDescription,
            jobDescription: jobDescription,
            location: parsedData.location
          }
        });
      }

      setShowJobParserDialog(false);
      setPendingRoleData(null);
      return;
    }

    // For non-standalone CVs, create a journey (existing logic)
    if (!roleData.targetRole || !roleData.seniorityLevel) {
      // If we don't have role data, show role modal again
      setShowRoleModal(true);
      setShowJobParserDialog(false);
      return;
    }

    // Set role context
    setRoleContext(roleData.targetRole, roleData.seniorityLevel);

    try {
      // EDGE CASE 10: Set timeout for request (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        // Create job application from parsed data
        // Pass cvId if CV exists (for new CVs being created)
        const jobResponse = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: parsedData.jobTitle || roleData.targetRole,
            company: parsedData.company || 'Unknown Company',
            jobDescription: parsedData.jobDescription || parsedData.description || '',
            location: parsedData.location,
            jobUrl: parsedData.jobUrl,
            status: 'created',
            cvId: state.cvId || undefined // Pass cvId if available
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!jobResponse.ok) {
          const errorData = await jobResponse.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || 'Failed to create job';

          // EDGE CASE 9: Check for tier/plan errors
          if (errorMessage.includes('credit') || errorMessage.includes('limit')) {
            throw new Error('This feature requires a Pro membership. Please upgrade your plan to continue.');
          }
          throw new Error(errorMessage);
        }

        const jobResult = await jobResponse.json();
        const newJourneyId = jobResult.data.journey?._id;
        const jobId = jobResult.data.jobApplication?._id || jobResult.data.id;

        // EDGE CASE 6: Only update context after successful journey creation
        if (newJourneyId) {
          dispatch({ type: 'SET_JOURNEY_ID', payload: newJourneyId });
          dispatch({ type: 'SET_CV_TYPE', payload: 'journey' });
          dispatch({
            type: 'SET_JOB_DATA',
            payload: {
              id: jobId,
              _id: jobId,
              jobTitle: parsedData.jobTitle || roleData.targetRole,
              title: parsedData.jobTitle || roleData.targetRole,
              company: parsedData.company || 'Unknown Company',
              description: parsedData.jobDescription || parsedData.description || '',
              jobDescription: parsedData.jobDescription || parsedData.description || '',
              location: parsedData.location,
              status: 'created'
            }
          });

          // Show template overlay for new CV
          setTemplateOverlayOpen(true);
        } else {
          // Journey creation failed
          throw new Error('Journey creation failed');
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // EDGE CASE 10: Handle network timeout
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw fetchError;
      }
    } catch (error) {
      // EDGE CASE 3 & 6: Job/journey creation failure
      console.error('Failed to create journey from parsed job:', error);
      alert(error instanceof Error ? error.message : 'Failed to create job. Please try again.');
      // Continue as standalone
      dispatch({ type: 'SET_CV_TYPE', payload: 'standalone' });
      setTemplateOverlayOpen(true);
    } finally {
      setShowJobParserDialog(false);
      setPendingRoleData(null);
    }
  };

  const handleStep2Complete = () => {
    setIsTemplateOverlayActive(false);
    setTemplateOverlayOpen(false);

    // Guest mode: Save draft after template selection
    if (isGuestMode) {
      guestCVService.saveGuestDraft({
        cvData: state.cvData,
        currentStep: 3,
        completedSteps: [...completedSteps, 2],
        targetRole: state.targetRole,
        seniorityLevel: state.seniorityLevel,
        templateId: state.selectedTemplate?.id || state.selectedTemplate?._id,
        template: state.selectedTemplate,
        cvTitle: state.cvTitle
      }).catch(err => console.error('Failed to save draft:', err));
    }
    setCompletedSteps([...completedSteps, 2]);

    // For create mode, update initial template when Step 2 completes
    if (mode === 'create' && state.selectedTemplate && !initialTemplateRef.current) {
      initialTemplateRef.current = state.selectedTemplate;
    }

    goToStep(3);
  };



  const handleStep3Complete = async () => {
    if (isMasterCV) {
      toast.error(coverLetterBlockedMessage);
      return;
    }

    setCompletedSteps([...completedSteps, 3]);

    // Route immediately
    goToStepSafely(4, { silent: true });

    // Save in background
    if (isGuestMode) {
      guestCVService.saveGuestDraft({
        cvData: state.cvData,
        currentStep: 4,
        completedSteps: [...completedSteps, 3],
        targetRole: state.targetRole,
        seniorityLevel: state.seniorityLevel,
        templateId: state.selectedTemplate?.id || state.selectedTemplate?._id,
        template: state.selectedTemplate,
        cvTitle: state.cvTitle
      }).catch(err => console.error('Failed to save draft:', err));
    } else if (hasUnsavedChanges) {
      handleSmartSave().catch(() => {});
    }
  };

  const handleStep4Complete = () => {
    setCompletedSteps([...completedSteps, 4]);

    // Guest mode: Save draft before moving to Step 5
    if (isGuestMode) {
      guestCVService.saveGuestDraft({
        cvData: state.cvData,
        currentStep: 5,
        completedSteps: [...completedSteps, 4],
        targetRole: state.targetRole,
        seniorityLevel: state.seniorityLevel,
        templateId: state.selectedTemplate?.id || state.selectedTemplate?._id,
        template: state.selectedTemplate,
        cvTitle: state.cvTitle
      }).catch(err => console.error('Failed to save draft:', err));
    } else if (hasUnsavedChanges) {
      handleSmartSave();
    }

    goToStep(5);
  };

  // Helper for deep equality check (simple but effective for our state objects)
  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    // If no initial data is captured yet, it's not "unsaved" yet
    if (!initialCVDataRef.current) {
        // For new CVs (create mode), check if any meaningful content exists
        if (mode === 'create') {
          const hasContent =
            (state.cvData.basics?.name && state.cvData.basics.name.trim() !== '') ||
            (state.cvData.work && state.cvData.work.length > 0) ||
            (state.cvData.education && state.cvData.education.length > 0) ||
            (state.cvData.skills && state.cvData.skills.length > 0);
          return hasContent;
        }
        return false;
    }

    // Deep comparison of CV data
    const dataChanged = !isDeepEqual(state.cvData, initialCVDataRef.current);

    // Check if title changed
    const titleChanged = state.cvTitle !== initialCVTitleRef.current;

    // Check if template changed
    const currentTemplateId = state.selectedTemplate?.id || (state.selectedTemplate as any)?._id || state.selectedTemplate;
    const initialTemplateId = initialTemplateRef.current?.id || (initialTemplateRef.current as any)?._id || initialTemplateRef.current;
    const templateChanged = currentTemplateId !== initialTemplateId;

    return dataChanged || titleChanged || templateChanged;
  }, [mode, state.cvData, state.cvTitle, state.selectedTemplate, isDeepEqual]);

  const handleBackStep = async () => {
    if (state.currentStep <= 1) return;
    if (hasUnsavedChanges) {
      await handleSmartSave();
    }
    goToStep(state.currentStep - 1);
  };

  const handleHomeClick = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation({ type: 'path', target: '/dashboard' });
      setShowSaveWarningModal(true);
    } else {
      router.push('/dashboard');
    }
  };

  const handleExit = async () => {
    if (isFromOnboarding) {
      await handleOnboardingExit();
      return;
    }

    if (state.currentStep > 1) {
      if (hasUnsavedChanges) {
        await handleSmartSave();
      }
      openEditorDashboard();
      return;
    }

    // Determine where to navigate back based on how user arrived
    let returnPath = '/dashboard'; // Default

    if (journeyId) {
      returnPath = '/dashboard/jobs?tab=applications';
    } else if (cvId && (mode === 'edit' || mode === 'edit-master')) {
      returnPath = '/editor';
    }

    // Only show confirmation if there are unsaved changes
    if (hasUnsavedChanges) {
      setPendingNavigation({ type: 'path', target: returnPath });
      setShowSaveWarningModal(true);
    } else {
      router.push(returnPath);
    }
  };

  const calculateCompletionPercentage = () => {
    let filledSections = 0;
    const totalSections = 8;

    if (state.cvData.basics?.name && state.cvData.basics?.email) filledSections++;
    if (state.cvData.work && state.cvData.work.length > 0) filledSections++;
    if (state.cvData.education && state.cvData.education.length > 0) filledSections++;
    if (state.cvData.skills && state.cvData.skills.length > 0) filledSections++;
    if (state.cvData.projects && state.cvData.projects.length > 0) filledSections++;
    if (state.cvData.certificates && state.cvData.certificates.length > 0) filledSections++;
    if (state.cvData.languages && state.cvData.languages.length > 0) filledSections++;
    if (state.cvData.volunteer && state.cvData.volunteer.length > 0) filledSections++;

    return Math.round((filledSections / totalSections) * 100);
  };

  // Listen for mobile bottom pill step navigation events
  useEffect(() => {
    const handleMobileBack = () => {
      handleBackStep();
    };
    const handleMobileNext = () => {
      if (isFromOnboarding) {
        handleOnboardingExitRef.current?.();
      } else if (state.currentStep === 3) {
        handleStep3Complete();
      } else if (state.currentStep === 4) {
        handleStep4Complete();
      }
    };

    window.addEventListener('editor-back-step', handleMobileBack);
    window.addEventListener('editor-next-step', handleMobileNext);
    return () => {
      window.removeEventListener('editor-back-step', handleMobileBack);
      window.removeEventListener('editor-next-step', handleMobileNext);
    };
  }, [state.currentStep, isFromOnboarding, handleBackStep, handleStep3Complete, handleStep4Complete]);

  // Helper function to ensure CV is saved and return cvId
  const ensureCVSaved = async (): Promise<string | null> => {
    // Check if CV is already saved
    const effectiveCvId = state.cvId || cvId;
    if (effectiveCvId) {
      return effectiveCvId;
    }

    // Guest mode: Save to draft instead of creating CV
    if (isGuestMode) {
      try {
        await guestCVService.saveGuestDraft({
          cvData: state.cvData,
          currentStep: state.currentStep,
          completedSteps: completedSteps,
          targetRole: state.targetRole,
          seniorityLevel: state.seniorityLevel,
          templateId: state.selectedTemplate?.id || state.selectedTemplate?._id,
          template: state.selectedTemplate,
          cvTitle: state.cvTitle
        });
        // Return null for guest mode - CV will be created after auth
        return null;
      } catch (error) {
        console.error('Failed to save draft:', error);
        throw error;
      }
    }

    // CV not saved yet - save it first

    try {
      const completionPercentage = calculateCompletionPercentage();
      const payload = {
        title: state.cvTitle || 'My CV',
        cvData: state.cvData,
        templateId: state.selectedTemplate?.id || (state.selectedTemplate as any)?._id,
        cvType: state.cvType || 'standalone',
        status: 'draft',
        metadata: {
          isMaster: state.cvType === 'master',
          completionPercentage,
          createdVia: 'resume-enhancer'
        }
      };

      let response = await fetch('/api/cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      // Handle 409 Conflict when Master CV already exists
      if (response.status === 409 && result.existingMasterCVId) {
        console.log('🔄 Layer 1 Defense: Master CV already exists, retrying as PUT with ID:', result.existingMasterCVId);
        
        // Update state with the found ID
        dispatch({ type: 'SET_CV_ID', payload: result.existingMasterCVId });
        
        // Retry the save as PUT
        response = await fetch(`/api/cvs/${result.existingMasterCVId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const retryResult = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(retryResult?.error || 'Failed to save CV after retry');
        }
        
        // Copy the successful retry result back to the main result object
        Object.assign(result, retryResult);
      } else if (!response.ok) {
        throw new Error(result?.error || 'Failed to save CV');
      }

      const savedCvId = extractCvIdFromResponse(result);
      if (savedCvId) {
        console.log('✅ CV saved successfully with ID:', savedCvId);
        dispatch({ type: 'SET_CV_ID', payload: savedCvId });

        // Update initial data refs
        initialCVDataRef.current = JSON.parse(JSON.stringify(state.cvData));
        initialCVTitleRef.current = state.cvTitle || 'My CV';
        initialTemplateRef.current = state.selectedTemplate;

        // Check if this is a standalone CV (not master or journey) and trigger upgrade popup if first
        const isStandaloneCV = payload.cvType === 'standalone' && !payload.metadata.isMaster;
        if (isStandaloneCV) {
          // Check if this is the first standalone CV by checking activity status
          setTimeout(async () => {
            try {
              const activityResponse = await fetch('/api/user/activity-status');
              const activityResult = await activityResponse.json();
              if (activityResult.success && activityResult.data) {
                // If this is the first standalone CV, show upgrade popup
                if (activityResult.data.standaloneCVCount === 1) {
                  showUpgradePopup();
                  setShowUpgradePopupState(true);
                }
              }
            } catch (error) {
              console.error('Error checking activity status:', error);
            }
          }, 1000);
        }

        return savedCvId;
      } else {
        throw new Error('CV saved but no ID returned');
      }
    } catch (error) {
      console.error('Failed to save CV:', error);
      throw error;
    }
  };

  const handleSmartSave = async (isManualClick = false) => {
    if (saveStatus === 'saving') return;

    // Check if auth prompt should be shown for guest users
    if (isManualClick && checkAndShowAuthPrompt('save', true)) {
      return; // Stop execution, auth prompt will be shown
    }

    const executeSave = async () => {
      // CRITICAL FIX: Clear any old offline backups at the start to prevent stale state
      // This ensures we don't show "Saved Offline" status due to residual localStorage data
      if (typeof window !== 'undefined' && !isGuestMode) {
        const hadBackup = !!localStorage.getItem('unsaved_master_cv');
        if (hadBackup) {
          console.log('🧹 Clearing old offline backup before save attempt');
          localStorage.removeItem('unsaved_master_cv');
          setHasOfflineBackup(false);
        }
      }

      setSaveStatus('saving');
      setSaveError(null);
      dispatch({ type: 'SET_SAVING', payload: true });

      // Guest mode: Save to draft instead of creating CV
      if (isGuestMode) {
      try {
        await guestCVService.saveGuestDraft({
          cvData: state.cvData,
          currentStep: state.currentStep,
          completedSteps: completedSteps,
          targetRole: state.targetRole,
          seniorityLevel: state.seniorityLevel,
          templateId: state.selectedTemplate?.id || state.selectedTemplate?._id,
          template: state.selectedTemplate,
          cvTitle: state.cvTitle
        });
        // Reset the unsaved-changes baseline so the user isn't re-prompted
        // right after a successful guest save.
        initialCVDataRef.current = JSON.parse(JSON.stringify(state.cvData));
        initialCVTitleRef.current = state.cvTitle;
        initialTemplateRef.current = state.selectedTemplate;
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 1200);
        dispatch({ type: 'SET_SAVING', payload: false });
        return;
      } catch (error) {
        console.error('Failed to save draft:', error);
        const message = error instanceof Error ? error.message : 'Failed to save draft';
        setSaveError(message);
        setSaveStatus('error');
        dispatch({ type: 'SET_SAVING', payload: false });
        return;
      }
    }

    const isFinishing = state.currentStep === 5;
    const isContinuing = state.currentStep === 3 || state.currentStep === 4;
    const completionPercentage = calculateCompletionPercentage();

    let scoreVal = state.scoreReport?.overall_score !== undefined
      ? state.scoreReport.overall_score
      : (state.surgeonAnalysis?.score ?? 0);

    if (state.cvType === 'journey') {
      scoreVal = Math.min(scoreVal, state.atsScoreCap || 100);
    }

    const payload = {
      title: state.cvTitle,
      cvData: state.cvData,
      templateId: state.selectedTemplate?.id || (state.selectedTemplate as any)?._id,
      cvType: state.cvType,
      status: isFinishing ? 'published' : 'draft',
      journeyId: state.journeyId,
      cv_score_master: state.cvType !== 'journey' ? scoreVal : undefined,
      cv_score_ats: state.cvType === 'journey' ? scoreVal : undefined,
      metadata: {
        isMaster: state.cvType === 'master',
        completionPercentage,
        createdVia: 'resume-enhancer',
        cvScore: state.cvType !== 'journey' ? scoreVal : undefined,
        atsScore: state.cvType === 'journey' ? scoreVal : undefined
      }
    };

    try {
      // For Master CV or any edit mode, ensure we use PUT (update) if cvId exists
      // This prevents trying to create a duplicate Master CV
      const isMasterCV = state.cvType === 'master' || mode === 'edit-master';
      const isEditMode = mode === 'edit' || mode === 'edit-master' || mode === 'journey';

      // Use cvId from state, or fallback to prop, or use the one from URL params
      const effectiveCvId = (state.cvId && state.cvId !== 'guest-draft') ? state.cvId : (cvId && cvId !== 'guest-draft' ? cvId : undefined);

      // LAYER 1: UPSERT PATTERN - If Master CV has no ID, create instead of erroring
      // This fixes the "CV ID missing" error by automatically switching to CREATE mode
      let shouldUpdate: string | boolean | undefined = isEditMode || effectiveCvId;
      let apiUrl = shouldUpdate && effectiveCvId ? `/api/cvs/${effectiveCvId}` : '/api/cvs';
      let apiMethod = shouldUpdate && effectiveCvId ? 'PUT' : 'POST';

      // If Master CV has no ID, switch to CREATE mode (upsert pattern)
      if (isMasterCV && !effectiveCvId) {
        console.log('🔄 Layer 1 Defense: Master CV missing ID, switching to CREATE mode');
        shouldUpdate = false;
        apiUrl = '/api/cvs';
        apiMethod = 'POST';
        // Note: localStorage backup is only saved if save fails (see error handler below)
      }

      let response;
      try {
        response = await fetch(apiUrl, {
          method: apiMethod,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (networkError) {
        // Network error (true offline)
        try {
          const backupData = {
            ...payload,
            attemptedSaveAt: Date.now(),
            error: 'Network offline',
            userId,
            mode: isMasterCV ? 'master-create' : 'create'
          };
          localStorage.setItem('unsaved_master_cv', JSON.stringify(backupData));
          console.log('💾 Layer 3 Defense: Network error, saved to localStorage');
        } catch (storageError) {
          console.warn('⚠️ Failed to save to localStorage after network error:', storageError);
        }
        throw new Error('NETWORK_OFFLINE');
      }

      const result = await response.json().catch(() => ({}));

      // Handle 409 Conflict when Master CV already exists
      if (response.status === 409 && result.existingMasterCVId && apiMethod === 'POST') {
        console.log('🔄 Layer 1 Defense: Master CV already exists, retrying as PUT with ID:', result.existingMasterCVId);
        
        // Update state with the found ID
        dispatch({ type: 'SET_CV_ID', payload: result.existingMasterCVId });
        
        // Retry the save as PUT
        response = await fetch(`/api/cvs/${result.existingMasterCVId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const retryResult = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(retryResult?.error || 'Failed to save CV after retry');
        }
        
        // Copy the successful retry result back to the main result object
        Object.assign(result, retryResult);
      } else if (!response.ok) {
        throw new Error(result?.error || 'Failed to save CV');
      }

      const savedCvId = extractCvIdFromResponse(result);
      console.log('💾 Save response:', {
        responseOk: response.ok,
        result,
        savedCvId,
        effectiveCvId,
        resultKeys: Object.keys(result || {}),
        resultCv: result?.cv,
        resultData: result?.data
      });

      if (savedCvId) {
        console.log('✅ CV saved successfully with ID:', savedCvId);
        dispatch({ type: 'SET_CV_ID', payload: savedCvId });

        // Update URL with new ID without reloading (Layer 1 enhancement)
        // Handle both /studio and /resume-enhancer paths
        if (!effectiveCvId && savedCvId) {
          // CRITICAL FIX: Set flag to prevent re-initialization from resetting state
          justSavedRef.current = true;

          if (pathname.includes('/studio')) {
            const newPath = `/studio/${savedCvId}`;
            router.replace(newPath);
            console.log('✅ Layer 1 Defense: Updated URL with new CV ID:', savedCvId);
          } else if (pathname.includes('/editor')) {
            // Update resume-enhancer URL to include cvId
            const currentSearchParams = new URLSearchParams(window.location.search);
            currentSearchParams.set('cvId', savedCvId);
            const newPath = `${pathname}?${currentSearchParams.toString()}`;
            router.replace(newPath);
            console.log('✅ Layer 1 Defense: Updated resume-enhancer URL with new CV ID:', savedCvId);
          } else {
            // For any other path, try to add cvId as query param
            const currentSearchParams = new URLSearchParams(window.location.search);
            currentSearchParams.set('cvId', savedCvId);
            const newPath = `${pathname}?${currentSearchParams.toString()}`;
            router.replace(newPath);
            console.log('✅ Layer 1 Defense: Updated URL with new CV ID:', savedCvId);
          }
        }

        // Clear localStorage backup on successful save
        try {
          localStorage.removeItem('unsaved_master_cv');
          setHasOfflineBackup(false);
          console.log('✅ Layer 3 Defense: Cleared localStorage backup after successful save');
        } catch (storageError) {
          console.warn('⚠️ Failed to clear localStorage:', storageError);
        }

        // Ensure offline status is cleared on successful save
        setHasOfflineBackup(false);
      } else {
        console.error('❌ Save succeeded but no CV ID returned in response. Full response:', JSON.stringify(result, null, 2));
        // Even if no ID, clear offline status since save succeeded
        setHasOfflineBackup(false);
      }

      // Note: CV to journey linking is now handled server-side in the API route
      // The API route will automatically link the CV to the journey if journeyId is provided

      // Update initial data refs after successful save to reset unsaved changes tracking
      initialCVDataRef.current = JSON.parse(JSON.stringify(state.cvData));
      initialCVTitleRef.current = state.cvTitle;
      initialTemplateRef.current = state.selectedTemplate;

      // SAVE COVER LETTER
      if (state.autoGeneratedCoverLetter && !isGuestMode) {
          const existingClId = state.coverLetterId || clId;
          const clApiUrl = existingClId ? `/api/cover-letters/${existingClId}` : '/api/cover-letters';
          const clApiMethod = existingClId ? 'PUT' : 'POST';
          
          const clPayload = {
              userId,
              cvId: savedCvId || effectiveCvId,
              title: state.cvTitle ? `${state.cvTitle} - Cover Letter` : 'Cover Letter',
              body: state.autoGeneratedCoverLetter,
              content: state.autoGeneratedCoverLetter, // Fallback for backward compatibility
              status: isFinishing ? 'final' : 'draft',
              jobId: state.jobData?.id || state.jobData?._id,
              journeyId: state.journeyId || undefined
          };
          
          try {
             const clResponse = await fetch(clApiUrl, {
                method: clApiMethod,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clPayload)
             });
              if (clResponse.ok) {
                  const clResult = await clResponse.json();
                  const newClId = clResult.data?.id || clResult.data?._id || clResult.coverLetter?._id || clResult.coverLetter?.id;
                  if (newClId && !existingClId) {
                      dispatch({ type: 'SET_AUTO_COVER_LETTER', payload: { draft: state.autoGeneratedCoverLetter, coverLetterId: newClId } });
                  }
              } else {
                  const errorText = await clResponse.text().catch(() => '');
                  console.error('Cover letter save failed with status:', clResponse.status, errorText);
                  toast.error('Cover letter could not be saved, but your CV was saved.');
              }
          } catch (clErr) {
              console.error("Failed to save cover letter:", clErr);
              toast.error('Cover letter could not be saved, but your CV was saved.');
          }
      }
      
      const thumbnailCvId = savedCvId || effectiveCvId;
      const currentTemplate = state.selectedTemplate || state.cvData?.metadata?.canvasTemplate;
      if (thumbnailCvId && currentTemplate) {
        try {
          await saveCvThumbnailSnapshot({
            cvId: thumbnailCvId,
            cvData: state.cvData,
            template: currentTemplate,
            forceRegenerate: true,
          });
        } catch (thumbnailError) {
          console.warn('Failed to save CV thumbnail snapshot after explicit save', thumbnailError);
        }
      }

      // Invalidate step 1 cache so it re-fetches when navigating back to step 1
      invalidateStep1Cache();

      setSaveStatus('success');

      // CRITICAL FIX: Removed legacy step 5 redirect to prevent resetting the session back to Step 1 in standalone mode.

      // Reset success state after a short delay (if we didn't navigate away)
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (error) {
      console.error('Save failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to save';
      
      const isOfflineError = message === 'NETWORK_OFFLINE';
      
      if (isOfflineError) {
        setHasOfflineBackup(true);
        setSaveError('Connection unstable. Your work has been saved locally and will sync when connection is restored.');
        setSaveStatus('offline');
        dispatch({ type: 'SET_SAVE_ERROR', payload: 'Connection unstable. Your work has been saved locally.' });
        console.log('💾 Layer 3 Defense: Data saved offline, will retry on next save');
      } else {
        // True API error
        setSaveError(message);
        setSaveStatus('error');
        dispatch({ type: 'SET_SAVE_ERROR', payload: message });
      }
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  };

  // Intercept manual save for authenticated users on free plan trying to save their master CV
  if (isManualClick && !isGuestMode && isMasterCV && (!userData || userData.currentPlanKey === 'free')) {
    openPaymentModal({
      preselectedPlanKey: 'focused_monthly',
      triggerContext: 'onboarding-exit',
      onSuccess: async () => {
        await executeSave();
      },
      onClose: async () => {
        try {
          await fetch('/api/user/subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planKey: 'starter_monthly' })
          });
          await refetch();
        } catch (err) {
          console.error('Failed to auto-assign starter plan on save close:', err);
        }
        await executeSave();
      }
    });
    return;
  }

  await executeSave();
};

  const startEditingTitle = () => {
    setTempTitle(state.cvTitle || '');
    setIsEditingTitle(true);
  };

  const saveTitle = async () => {
    setIsEditingTitle(false);
    const trimmed = tempTitle.trim();
    if (trimmed && trimmed !== state.cvTitle) {
      dispatch({ type: 'SET_CV_TITLE', payload: trimmed });
      setTimeout(() => {
        handleSmartSave();
      }, 50);
    }
  };

  const isSavingAndExitingRef = useRef(false);
  const handleOnboardingExitRef = useRef<(() => Promise<void>) | null>(null);

  const handleOnboardingExit = async () => {
    if (isSavingAndExitingRef.current) return;
    isSavingAndExitingRef.current = true;

    try {
      setSaveStatus('saving');
      await handleSmartSave(true);

      // Persist onboarding stage update to database
      try {
        await fetch('/api/user/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_stage: 'CV_READY_FORK',
            userLifecycleState: 'PRIMARY_CV_CREATED'
          })
        });
      } catch (err) {
        console.error('Failed to update onboarding session:', err);
      }

      // Update local storage backup
      try {
        const saved = localStorage.getItem('buildairesume_onboarding_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          localStorage.setItem('buildairesume_onboarding_state', JSON.stringify({
            ...parsed,
            stage: 'CV_READY_FORK',
            step: 4,
            editorCompleted: true
          }));
        }
      } catch (e) {
        console.error('Failed to update local storage onboarding state:', e);
      }

      const returnUrl = (typeof window !== 'undefined' && sessionStorage.getItem('onboardingReturnUrl')) || '/welcome?stage=cv_ready';
      router.push(returnUrl);
    } catch (err) {
      console.error('Failed to save CV on onboarding exit:', err);
      toast.error('We could not save your latest changes. Please try again.');
      isSavingAndExitingRef.current = false;
    }
  };

  // Keep ref in sync with latest handleOnboardingExit
  handleOnboardingExitRef.current = handleOnboardingExit;

  const handleHomeStepClick = async () => {
    if (isFromOnboarding) {
      await handleOnboardingExit();
      return;
    }
    // Guests should sign up before navigating away — show auth prompt instead
    if (isGuestMode) {
      setShowAuthPrompt(true);
      return;
    }
    isNavigatingHomeRef.current = true;
    // Save in the background — the home button must always return to step 1
    // (documents) even if the save fails (e.g. offline).
    handleSmartSave().catch(() => {});
    setTemplateOverlayOpen(false);
    resetState();
    initializedRef.current = null;
    router.push('/editor');
  };

  const handleStepNavigation = async (targetStep: number, openOverlay: boolean) => {
    // Route immediately, save in background
    setTemplateOverlayOpen(openOverlay);
    if (targetStep === 3) {
      goToStepSafely(3);
    } else if (targetStep === 4) {
      goToStepSafely(4);
    } else if (targetStep === 5) {
      goToStepSafely(5);
    }
    // Fire-and-forget save (auto-save useEffect also handles this)
    handleSmartSave().catch(() => {});
  };

  // Auto save CV on step transition for authenticated users
  const prevStepRef = useRef({ step: state.currentStep, overlay: state.isTemplateOverlayOpen });
  useEffect(() => {
    const stepChanged = prevStepRef.current.step !== state.currentStep;
    const overlayChanged = prevStepRef.current.overlay !== state.isTemplateOverlayOpen;
    
    if (stepChanged || overlayChanged) {
      if (!isGuestMode && state.cvData && state.cvId) {
        console.log('Auto-saving on step transition');
        handleSmartSave().catch(err => console.error('Auto-save on step transition failed:', err));
      }
      prevStepRef.current = { step: state.currentStep, overlay: state.isTemplateOverlayOpen };
    }
  }, [state.currentStep, state.isTemplateOverlayOpen, isGuestMode, state.cvData, state.cvId]);

  // Stepper steps configuration
  interface HeaderStep {
    id: 'layout' | 'edit' | 'cover' | 'review';
    label: string;
    isActive: boolean;
    isCompleted: boolean;
    targetStep: number;
    openTemplateOverlay?: boolean;
  }

  const getHeaderSteps = (): HeaderStep[] => {
    const steps: HeaderStep[] = [];
    const isCreateMode = mode === 'create' || mode === 'create-cover-letter';
    const isCoverLetterMode = mode === 'edit-cover-letter' || mode === 'create-cover-letter';
    
    // For users in the onboarding flow, present a clean "Design → Edit → Review" lifecycle
    if (isFromOnboarding) {
      return [
        {
          id: 'layout',
          label: 'Design',
          isActive: state.isTemplateOverlayOpen,
          isCompleted: !state.isTemplateOverlayOpen && !!state.selectedTemplate,
          targetStep: 3,
          openTemplateOverlay: true
        },
        {
          id: 'edit',
          label: 'Edit',
          isActive: state.currentStep === 3 && !state.isTemplateOverlayOpen,
          isCompleted: state.currentStep > 3 && !state.isTemplateOverlayOpen,
          targetStep: 3,
          openTemplateOverlay: false
        },
        {
          id: 'review',
          label: 'Review',
          isActive: state.currentStep === 5,
          isCompleted: false,
          targetStep: 5,
          openTemplateOverlay: false
        }
      ];
    }

    // 1. Determine if we show Layout Selection (only for new Master or new Journey CVs, or when editing/creating cover letter)
    const showLayoutStep = (isCreateMode && (state.cvType === 'master' || state.cvType === 'journey')) || isCoverLetterMode;
    
    // 2. Determine if we show Cover Letter (only for Journey CVs, and Standalone CVs when creating, or when editing/creating cover letter)
    const showCoverStep = state.cvType === 'journey' || (state.cvType === 'standalone' && isCreateMode) || isCoverLetterMode;

    if (showLayoutStep) {
      steps.push({
        id: 'layout',
        label: 'Layout Selection',
        isActive: state.isTemplateOverlayOpen,
        isCompleted: !state.isTemplateOverlayOpen && !!state.selectedTemplate,
        targetStep: 3,
        openTemplateOverlay: true
      });
    }

    steps.push({
      id: 'edit',
      label: 'Edit Resume',
      isActive: state.currentStep === 3 && !state.isTemplateOverlayOpen,
      isCompleted: state.currentStep > 3 && !state.isTemplateOverlayOpen,
      targetStep: 3,
      openTemplateOverlay: false
    });

    if (showCoverStep) {
      steps.push({
        id: 'cover',
        label: 'Cover Letter',
        isActive: state.currentStep === 4,
        isCompleted: state.currentStep > 4,
        targetStep: 4,
        openTemplateOverlay: false
      });
    }

    steps.push({
      id: 'review',
      label: 'Review & Export',
      isActive: state.currentStep === 5,
      isCompleted: false,
      targetStep: 5,
      openTemplateOverlay: false
    });

    return steps;
  };

  const renderHeaderStepper = () => {
    const steps = getHeaderSteps();
    
    // Determine flow type
    const showLayoutStep = steps.some(s => s.id === 'layout');
    const showCoverStep = steps.some(s => s.id === 'cover');
    
    let flowType: 'A' | 'B' | 'C' | 'D' = 'D';
    if (showLayoutStep && showCoverStep) flowType = 'A';
    else if (showLayoutStep && !showCoverStep) flowType = 'B';
    else if (!showLayoutStep && showCoverStep) flowType = 'C';
    else flowType = 'D';

    // Subtitle helper
    const showSubtitle = (step: HeaderStep) => {
      if (step.isActive) return true;
      if (flowType === 'C') {
        return step.id === 'cover' || step.id === 'edit';
      }
      if (flowType === 'D') {
        return step.id === 'edit' || step.id === 'review';
      }
      return false;
    };

    const isHorizontalLayout = flowType === 'C' || flowType === 'D';

    return (
      <div className="hidden lg:flex items-center gap-3 sm:gap-5 flex-1 justify-center max-w-4xl px-4 h-14 select-none">
        {steps.map((step, index) => {
          let IconComponent = Edit2;
          if (step.id === 'layout') IconComponent = Palette;
          else if (step.id === 'edit') IconComponent = PenTool;
          else if (step.id === 'cover') IconComponent = step.isActive ? PenTool : FileText;
          else if (step.id === 'review') IconComponent = FileText;

          const activePill = (
            <div className="flex items-center bg-[#f1f9ec] dark:bg-[#1a2312] border border-[#dcedd9] dark:border-[#2a3c1d] rounded-2xl px-4 py-1.5 shadow-sm transition-all duration-300">
              <div className="w-8 h-8 rounded-full bg-lime-600 dark:bg-[#02523c] flex items-center justify-center text-white flex-shrink-0">
                <IconComponent className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex flex-col ml-3 text-left">
                <span className="text-xs sm:text-sm font-black text-lime-800 dark:text-lime-400 tracking-tight leading-tight">
                  {step.label}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-lime-600 dark:text-lime-500 truncate max-w-[150px] leading-tight mt-0.5">
                  {state.cvTitle || 'Untitled CV'}
                </span>
              </div>
            </div>
          );

          const standardNode = (
            <button
              onClick={() => handleStepNavigation(step.targetStep, !!step.openTemplateOverlay)}
              className={`flex bg-transparent hover:bg-transparent border-none shadow-none focus:outline-none focus:ring-0 transition-all duration-200 hover:opacity-90 active:scale-95 group relative ${
                isHorizontalLayout 
                  ? 'items-center gap-3 text-left' 
                  : 'flex-col items-center text-center justify-center min-w-[80px]'
              }`}
            >
              {/* Circle */}
              {step.isCompleted ? (
                <div className="w-6 h-6 rounded-full bg-lime-500 dark:bg-[#013f2e] flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-lime-500/20 transition-transform group-hover:scale-105">
                  <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500 flex-shrink-0 transition-colors group-hover:border-lime-500 dark:group-hover:border-[#013f2e] group-hover:text-lime-600 dark:group-hover:text-lime-400">
                  <IconComponent className="w-3.5 h-3.5 stroke-[2]" />
                </div>
              )}

              {/* Text placement */}
              {isHorizontalLayout ? (
                <div className="flex flex-col">
                  <span className={`text-xs sm:text-sm font-black leading-tight ${
                    step.isCompleted 
                      ? 'text-gray-800 dark:text-gray-200 group-hover:text-lime-600 dark:group-hover:text-lime-400' 
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  }`}>
                    {step.label}
                  </span>
                  {showSubtitle(step) && (
                    <span className={`text-[10px] sm:text-[11px] font-bold truncate max-w-[140px] leading-tight mt-0.5 ${
                      step.isCompleted
                        ? 'text-gray-500 dark:text-gray-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {state.cvTitle || 'Untitled CV'}
                    </span>
                  )}
                </div>
              ) : (
                <span className={`absolute top-8 whitespace-nowrap text-xs font-bold transition-colors ${
                  step.isCompleted 
                    ? 'text-gray-800 dark:text-gray-200 group-hover:text-lime-600 dark:group-hover:text-lime-400' 
                    : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600'
                }`}>
                  {step.label}
                </span>
              )}
            </button>
          );

          return (
            <React.Fragment key={step.id}>
              {step.isActive ? activePill : standardNode}

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="h-[1px] w-6 sm:w-10 bg-gray-200 dark:bg-white/10 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // LAYER 3: Recovery mechanism - Check localStorage on mount and attempt to restore
  useEffect(() => {
    if (typeof window === 'undefined' || isGuestMode || mode !== 'create') return;

    const checkForOfflineBackup = async () => {
      try {
        const backupDataStr = localStorage.getItem('unsaved_master_cv');
        if (!backupDataStr) return;

        const backupData = JSON.parse(backupDataStr);
        const backupAge = Date.now() - (backupData.attemptedSaveAt || 0);

        // Only restore if backup is recent (within 24 hours)
        if (backupAge > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('unsaved_master_cv');
          return;
        }

        // Check if CV was already saved (by checking if we have a CV ID now)
        if (state.cvId || cvId) {
          // CV exists, clear backup
          localStorage.removeItem('unsaved_master_cv');
          return;
        }

        // Restore data from backup
        console.log('🔄 Layer 3 Defense: Found offline backup, attempting to restore...');

        // Restore CV data
        if (backupData.cvData) {
          dispatch({ type: 'SET_CV_DATA', payload: backupData.cvData });
        }
        if (backupData.title) {
          dispatch({ type: 'SET_CV_TITLE', payload: backupData.title });
        }
        if (backupData.templateId) {
          // Template restoration would need template lookup
          console.log('📋 Template ID found in backup:', backupData.templateId);
        }

        // Attempt to save again
        console.log('🔄 Layer 3 Defense: Retrying save after recovery...');
        setTimeout(() => {
          handleSmartSave().catch(err => {
            console.warn('⚠️ Recovery save failed:', err);
          });
        }, 1000);
      } catch (error) {
        console.warn('⚠️ Failed to restore from localStorage backup:', error);
        // Clear corrupted backup
        try {
          localStorage.removeItem('unsaved_master_cv');
        } catch (e) {
          // Ignore
        }
      }
    };

    // Only check on initial mount
    if (!initializedRef.current) {
      checkForOfflineBackup();
    }
  }, []); // Empty deps - only run on mount

  const isCanvasStep = state.currentStep === 3;
  const isLetterStep = state.currentStep === 4;
  // Page zoom is blocked on editor steps 2-5 (template, CV builder, cover letter,
  // review) so pinch/ctrl-wheel gestures can't break the fixed editor shell.
  // Canvas containers keep their own zoom controls — see ZoomGuard.
  const isZoomGuardedStep = state.currentStep >= 2 || showTemplateOverlay;
  const showOnScreenKeyboard = isZoomGuardedStep && isMobileViewport;

  if (isLoading && !showTemplateOverlay && requestedStep !== 2) {
    // Keep the editor chrome visible while the document loads: header skeleton + a
    // step-aware body skeleton (CV sheet + control panel, or letter sheet + panel).
    return (
      <div className="h-macro dashboard-workspace flex flex-col overflow-hidden w-full" role="status" aria-label="Loading document">
        {/* Editor header skeleton — static chrome */}
        <header className="editor-header relative h-14 flex items-center justify-between gap-2 px-3 sm:px-6 bg-[var(--header-bg)] sticky top-0 z-[60]">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="hidden md:block w-10 h-10 rounded-xl" />
            <div className="space-y-1.5 min-w-0">
              <Skeleton className="h-4 w-40 sm:w-52" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
      </header>

      {/* Floating Next Button (desktop only, steps 3+) */}
      {(state.currentStep >= 3 && !state.isTemplateOverlayOpen) && (
        <div className="hidden lg:flex fixed bottom-6 right-6 z-[70]">
          {state.currentStep === 3 && (
            <button
              onClick={handleStep3Complete}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-lime-500 dark:bg-[#013f2e] text-white font-bold text-sm shadow-lg shadow-lime-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {state.currentStep === 4 && (
            <button
              onClick={handleStep4Complete}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-lime-500 dark:bg-[#013f2e] text-white font-bold text-sm shadow-lg shadow-lime-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

        {/* CV canvas step: A4 preview sheet + control panel */}
        {isCanvasStep && (
          <div className="flex-1 min-h-0 flex gap-3 p-3">
            <div className="flex-1 lg:flex-none lg:w-[60%] min-h-0 flex items-start justify-center overflow-y-auto bg-gray-100/50 dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/[0.04] p-6">
              <div className="w-full max-w-[560px] aspect-[1/1.414] bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/[0.04] shadow-sm p-8 flex flex-col gap-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-3.5 w-1/4" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-2.5">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
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
            <div className="hidden lg:flex flex-col gap-3 flex-1 min-h-0">
              <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] p-4 space-y-3 flex-1">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
              <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] p-4 space-y-3 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        )}

        {/* Cover letter step: letter sheet + tuning panel */}
        {isLetterStep && (
          <div className="flex-1 min-h-0 flex gap-3 p-3">
            <div className="flex-1 min-h-0 overflow-y-auto bg-gray-100/50 dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/[0.04] p-6 lg:p-10 flex justify-center">
              <div className="w-full max-w-[620px] min-h-[520px] bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/[0.04] shadow-sm p-10 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64 mx-auto" />
                  <Skeleton className="h-3 w-40 mx-auto" />
                  <Skeleton className="h-3 w-52 mx-auto" />
                </div>
                <Skeleton className="h-px w-full my-4" />
                <div className="space-y-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className={`h-3 ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-5/6' : 'w-2/3'}`} />
                  ))}
                </div>
                <div className="space-y-2.5 pt-2">
                  <Skeleton className="h-3 w-11/12" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
            <div className="hidden lg:flex flex-col gap-3 w-[300px] shrink-0">
              <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] p-4 space-y-3 flex-1">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
              <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] p-4 space-y-3 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        )}

        {/* Other steps: generic content skeleton */}
        {!isCanvasStep && !isLetterStep && (
          <div className="flex-1 min-h-0 p-6">
            <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] p-6 space-y-4">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-96 max-w-full" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] p-6 space-y-3">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-macro dashboard-workspace flex overflow-hidden w-full" data-zoom-guard-root={isZoomGuardedStep || undefined}>
      <ZoomGuard enabled={isZoomGuardedStep} />
      {/* On-screen keyboard (mobile only) for canvas text editing on steps 2-5 */}
      {showOnScreenKeyboard && <OnScreenKeyboard />}
      {/* Desktop Sidebar - Hidden on sm/md, visible on lg and up */}
      {state.currentStep === 1 && (
        <div
          data-dashboard-sidebar
          className={`hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:z-[120] lg:py-0 lg:px-0 ${
            isDesktopExpanded ? 'lg:w-[280px]' : 'lg:w-[64px]'
          } overflow-visible pointer-events-auto transition-all duration-300 flex-shrink-0 bg-white dark:bg-[#141810]`}
        >
          <OptimizedNavigation />
        </div>
      )}

      {/* Mobile/Small Screen Full-Screen Menu - Hidden on lg and up */}
      {state.currentStep === 1 && (
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[150] bg-white dark:bg-[#141810] lg:hidden"
            >
              <OptimizedNavigation />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Main Content Area */}
      <div className="dashboard-page resume-enhancer-page flex flex-col flex-1 min-w-0 h-screen overflow-hidden text-[color:var(--text-primary)]">
        {/* HEADER - Top Bar */}
        <header className={`editor-header relative h-14 flex items-center justify-between gap-2 px-3 sm:px-6 bg-[var(--header-bg)] sticky top-0 z-[60] ${state.currentStep === 1 ? 'flex-wrap py-2 sm:py-0 min-h-14' : ''}`}>
          {(state.currentStep > 1 || state.isTemplateOverlayOpen) ? (
            <>
              {/* Left: Breadcrumb with all steps */}
              <div className="hidden lg:flex items-center gap-1.5 min-w-0 shrink-0">
                {!isFromOnboarding && (
                  <button
                    onClick={handleHomeStepClick}
                    className="flex items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-lime-600 dark:hover:text-lime-400 transition-all hover:scale-105 shrink-0 bg-transparent border-none outline-none p-0 shadow-none focus:ring-0"
                    title="Back to Step 1"
                  >
                    <Home className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
                {getHeaderSteps().map((step, index) => (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => handleStepNavigation(step.targetStep, !!step.openTemplateOverlay)}
                      className={`text-[11px] font-semibold transition-all hover:scale-105 shrink-0 bg-transparent border-none outline-none p-0 shadow-none focus:ring-0 ${
                        step.isActive
                          ? 'text-lime-700 dark:text-lime-400'
                          : step.isCompleted
                          ? 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      {step.label}
                    </button>
                    {index < getHeaderSteps().length - 1 && (
                      <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Center: Document name, save status, CV type (inline) */}
              <div className="flex items-center gap-2 sm:gap-3 flex-1 lg:flex-initial justify-center">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white bg-transparent border-b border-lime-500 focus:outline-none px-1 py-0.5 min-w-[200px]"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={startEditingTitle}
                    className="flex items-center gap-1 text-xs sm:text-sm font-bold text-gray-900 dark:text-white hover:text-lime-600 dark:hover:text-lime-400 transition-all hover:scale-105 group bg-transparent border-none outline-none p-0 shadow-none focus:ring-0"
                  >
                    <span className="truncate max-w-[20ch]">{state.cvTitle || 'Untitled CV'}</span>
                    <Edit2 className="w-3 h-3 text-gray-400 dark:text-gray-500 group-hover:text-lime-600 dark:group-hover:text-lime-400 shrink-0" />
                  </button>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    saveStatus === 'error' ? 'bg-red-500' :
                    saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' :
                    'bg-lime-500 dark:bg-[#013f2e]'
                  }`} />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {saveStatus === 'saving' ? 'Saving...' :
                     saveStatus === 'success' ? 'Saved' :
                     saveStatus === 'offline' ? 'Saved offline' :
                     saveStatus === 'error' ? 'Failed' :
                     'Saved'}
                  </span>
                </div>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 ${
                  state.cvType === 'master'
                    ? 'bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30'
                    : state.cvType === 'journey'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                }`}>
                  {state.cvType === 'master' ? 'Primary' : state.cvType === 'journey' ? 'Tailored' : 'Custom'}
                </span>
              </div>

            </>
          ) : (
            <div className="flex items-center flex-1 min-w-0 gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-xl bg-transparent border-none outline-none hover:scale-105 transition-all cursor-pointer lg:hidden shadow-none focus:ring-0"
                  aria-label="Toggle menu"
                >
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 flex justify-center">
                <GlobalSearchBar />
              </div>
            </div>
          )}

        {/* Actions - Right side */}
        <div className={`flex items-center space-x-1 sm:space-x-2 shrink-0 ${
          (state.currentStep > 1 || state.isTemplateOverlayOpen) ? 'lg:w-[280px] justify-end' : ''
        }`}>
          {(state.currentStep > 1 || state.isTemplateOverlayOpen) && (
            <>
              {state.currentStep > 1 && (
                <button
                  onClick={handleBackStep}
                  className="hidden md:flex lg:hidden items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded-full text-xs font-medium transition-all duration-200"
                  title="Back"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}

              {/* Save button - only show on step 3, 4, and 5 */}
              {(state.currentStep === 3 || state.currentStep === 4 || state.currentStep === 5) && (
                <motion.button
                  onClick={() => handleSmartSave(true)}
                  disabled={saveStatus === 'saving'}
                  className="hidden md:inline-flex lg:hidden p-1.5 sm:px-4 sm:py-1.5 bg-lime-500 dark:bg-[#013f2e] hover:bg-lime-600 dark:hover:bg-[#02523c] disabled:bg-gray-300 dark:disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-white disabled:text-gray-500 dark:disabled:text-[color:var(--text-tertiary)] rounded-full text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-md hover:shadow-lg overflow-hidden min-w-[36px] sm:min-w-[85px] justify-center"
                  title="Save"
                  whileHover={{ scale: saveStatus === 'saving' ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {saveStatus === 'saving' ? (
                      <motion.div
                        key="saving"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center space-x-1.5"
                      >
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="hidden sm:inline">Saving...</span>
                      </motion.div>
                    ) : saveStatus === 'success' ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 1, scale: 1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                        className="flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Saved!</span>
                      </motion.div>
                    ) : saveStatus === 'offline' ? (
                      <motion.div
                        key="offline"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center space-x-1.5"
                      >
                        <Save className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Saved Offline</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center space-x-1.5"
                      >
                        <Save className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Save</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}

              {/* Continue to Cover Letter button - only show on Step 3 for non-master CVs */}
              {state.currentStep === 3 && !isMasterCV && (
                <button
                  onClick={handleStep3Complete}
                  className="hidden md:inline-flex lg:hidden p-1.5 sm:px-4 sm:py-1.5 bg-white text-black dark:bg-white/10 dark:text-white hover:bg-gray-100 dark:hover:bg-white/15 border border-gray-200 dark:border-white/20 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-md hover:shadow-lg hover:scale-105"
                  title="Cover Letter"
                >
                  <FileText className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Cover Letter</span>
                </button>
              )}
              
              {/* Continue to Review button - only show on Step 4 */}
              {state.currentStep === 4 && (
                <button
                  onClick={handleStep4Complete}
                  className="hidden md:inline-flex lg:hidden p-1.5 sm:px-4 sm:py-1.5 bg-white text-black dark:bg-white/10 dark:text-white hover:bg-gray-100 dark:hover:bg-white/15 border border-gray-200 dark:border-white/20 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-md hover:shadow-lg hover:scale-105"
                  title="Review"
                >
                  <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Review</span>
                </button>
              )}
            </>
          )}

          {/* Onboarding Save & Continue Action */}
          {isFromOnboarding && (
            <button
              onClick={handleOnboardingExit}
              disabled={saveStatus === 'saving'}
              className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 bg-[#013f2e] hover:bg-[#02523c] text-white dark:bg-[#80FF00] dark:text-white font-extrabold text-xs rounded-full shadow-sm hover:shadow transition-all active:scale-95 shrink-0"
              title="Save & Continue to Onboarding"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span className="hidden sm:inline">Save &amp; Continue</span>
            </button>
          )}

          {/* Guest Mode Tag */}
          {isGuestMode && (
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium shrink-0">
              Guest
            </span>
          )}

          {/* Theme Toggle */}
          <div className="shrink-0">
            <ThemeToggle variant="pill" />
          </div>

          {/* Notification Center */}
          <div className="shrink-0">
            <NotificationCenter variant="pill" />
          </div>
        </div>

        {/* Save Error (lightweight inline) */}
        {saveStatus === 'error' && saveError && (
          <div className="absolute top-full left-0 right-0 px-4 py-2 bg-red-500/10 backdrop-blur-md border-b border-red-500/20 z-[90]">
            <div className="text-xs text-red-700 dark:text-red-400 text-center">
              {saveError}
            </div>
          </div>
        )}
      </header>

      {/* Content Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-hidden bg-[var(--bg-primary)] flex flex-col">
          <div className="w-full flex-1 min-h-0 box-border overflow-hidden flex flex-col">
            <div ref={stepContentRef} className="flex-1 min-h-0 flex flex-col relative">
              <AnimatePresence mode="wait">
                {state.currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full min-h-0 flex flex-col w-full"
                  >
                    <ErrorBoundary stepName="Dashboard" onReset={() => dispatch({ type: 'SET_STEP', payload: 1 })}>
                      <Step1Dashboard
                        onComplete={handleStep1Complete}
                        userHasMasterCV={state.hasMasterCV}
                        mode={'create'}
                        cvType={state.cvType}
                        isGuestMode={isGuestMode}
                        activeDocumentTab={stepOneDocumentTab}
                        onDocumentTabChange={setStepOneDocumentTab}
                      />
                    </ErrorBoundary>
                  </motion.div>
                )}
                {state.currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full min-h-0 flex flex-col w-full"
                  >
                    <ErrorBoundary stepName="CV Builder" onReset={() => dispatch({ type: 'SET_STEP', payload: 3 })}>
                      <Step3CV
                        ref={step3Ref}
                        onComplete={handleStep3Complete}
                        onActiveSectionChange={(sectionId) => setActiveSection(sectionId)}
                      />
                    </ErrorBoundary>
                  </motion.div>
                )}
                {state.currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full min-h-0 flex flex-col w-full"
                  >
                    <ErrorBoundary stepName="Cover Letter" onReset={() => dispatch({ type: 'SET_STEP', payload: 4 })}>
                      <Step4CoverLetter onComplete={handleStep4Complete} />
                    </ErrorBoundary>
                  </motion.div>
                )}
                {state.currentStep === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full min-h-0 flex flex-col w-full"
                  >
                    <ErrorBoundary stepName="Review & Download" onReset={() => dispatch({ type: 'SET_STEP', payload: 5 })}>
                      <Step5Review onSave={() => handleSmartSave(true)} />
                    </ErrorBoundary>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* Template Overlay - shown for new CVs after step 1 */}
      <AnimatePresence>
        {showTemplateOverlay && (
          <motion.div
            key="step2-template"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            ref={templateOverlayRef}
            className="fixed inset-0 z-[200] bg-[var(--bg-primary)] overflow-y-auto"
          >
            <Step2Template onComplete={handleStep2Complete} />
          </motion.div>
        )}
      </AnimatePresence>

      <JobParserSidebar
        isOpen={showRoleModal || showJobParserDialog}
        onClose={() => {
          setShowRoleModal(false);
          setShowJobParserDialog(false);
          setPendingRoleData(null);
        }}
        initialData={{
          jobDescription: state.jobData?.jobDescription || state.jobData?.description || state.jobData?.jd || ''
        }}
        matchScore={analysisScore || 82}
        onParseComplete={(data) => {
          handleRoleModalSubmit({
            targetRole: data.jobTitle,
            seniorityLevel: 'Mid Level (3-5 years)', // Mocked default since parser doesn't extract experience level explicitly yet
            jobDescription: data.jobDescription || data.jobDescriptionRaw || '',
            hasJD: !!(data.jobDescription || data.jobDescriptionRaw)?.trim()
          });
        }}
      />

      {/* Auth Prompt Modal - For guest users at Step 3 */}
      {isGuestMode && (
        <AuthPromptModal
          isOpen={showAuthPrompt}
          onClose={() => setShowAuthPrompt(false)}
          onContinueGuest={() => {
            setShowAuthPrompt(false);
          }}
          currentStep={state.currentStep}
        />
      )}

      {/* Upgrade Card - shown after first standalone CV creation */}
      {showUpgradePopupState && shouldShowUpgradePopup && userId && (
        <UpgradeCard
          userId={userId}
          onClose={() => {
            setShowUpgradePopupState(false);
            dismissUpgradePopup();
          }}
        />
      )}

      {/* Job Sidebar Overlay */}
      {showJobSidebar && selectedJob && (
        <JobSidebar
          job={selectedJob}
          journeys={journeysForJob}
          onClose={() => {
            setJobSidebarOpen(false);
            setSelectedJob(null);
            setJourneysForJob([]);
          }}
          onRefresh={async () => {
            if (selectedJob && userId) {
              const jobId = selectedJob.id || selectedJob._id;
              if (!jobId) return;

              try {
                const journeysResponse = await authenticatedFetchWithUserId(
                  `/api/application-journey?jobId=${jobId}`,
                  userId
                );
                const journeysData = await journeysResponse.json();
                setJourneysForJob(journeysData.success ? journeysData.data.journeys || [] : []);
              } catch (error) {
                console.error('Error refreshing journeys:', error);
              }
            }
          }}
        />
      )}

      {/* ATS Deep Dive Modal */}
      <ATSDeepDiveModal
        isOpen={showATSDeepDive}
        onClose={() => setShowATSDeepDive(false)}
        userId={userId}
      />

      {/* Save Warning Modal */}
      {showSaveWarningModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-[#141810] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-white/10"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Unsaved Changes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              You have unsaved changes. Would you like to save them before leaving?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={cancelNavigation}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmNavigation(false)}
                className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => confirmNavigation(true)}
                className="px-4 py-2 text-sm font-bold bg-lime-500 text-white hover:bg-lime-400 rounded-xl shadow-lg shadow-lime-500/20 transition-colors"
              >
                Save & Leave
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mode Transition Panel moved to ATSMeterPanel */}
      </div>
    </div>
  );
}
