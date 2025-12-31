'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Eye, Loader2, Sparkles, User, Settings, LogOut, Sun, Moon, ChevronDown, ChevronUp, Minimize2, Maximize2, Home, Plus } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import StepIndicator from './StepIndicator';
import Step1Parser from './steps/Step1Parser';
import Step2Template from './steps/Step2Template';
import Step3BuilderSurgeon from './steps/Step3BuilderSurgeon';
import Step4Review from './steps/Step4Review';
import RoleSelectorModal from './RoleSelectorModal';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import UserAvatar from '@/components/ui/UserAvatar';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useUserData, getUserDisplayName, getUserAvatar } from '@/lib/hooks/useUserData';
import { useSession } from 'next-auth/react';
import SidebarMembershipCard from '@/components/resume-enhancer/SidebarMembershipCard';
import { CVSurgeonService } from '@/lib/services/cv-surgeon-service';
import { CVScoringService, type CVScoreBreakdown, type ATSScoreBreakdown } from '@/lib/services/cv-scoring-service';
import { logResumeEnhancerEvent } from '@/lib/services/resumeEnhancerLogClient';
import { inferRoleContextFromCVData } from '@/lib/utils/resumeEnhancerRoleInference';
import ATSFactorsList from '@/components/resume-enhancer/ATSFactorsList';
import { computeATSFactorScores } from '@/lib/utils/resumeEnhancerFactors';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { comprehensiveSignOut } from '@/lib/utils/signout';
import ResumeEnhancerSidebar from '@/components/resume-enhancer/ResumeEnhancerSidebar';
import { getVisibleCVSections } from '@/lib/selectors/cv-section-selectors';
import { migrateLegacyCV } from '@/lib/migrations/cv-structure-migration';
import { getSectionIcon } from '@/lib/utils/cv-section-selectors';
import type { Step3BuilderSurgeonRef } from '@/components/resume-enhancer/steps/Step3BuilderSurgeon';
import { InfoTooltip, HelpTooltip } from '@/components/ui/tooltip';
import { SaveIndicator } from '@/components/ui/AnimatedCheckmark';
import { AnimatedScore, AnimatedProgressBar } from '@/components/ui/AnimatedScore';
import JobCard from './JobCard';
import JobRoleCard from './JobRoleCard';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import JobParserDialog from '@/components/dashboard/jobs/JobParserDialog';
import AuthPromptModal from './AuthPromptModal';
import { CVJourney } from '@/types/cv';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import type { SkillGapAnalysis } from '@/lib/services/skillGapAnalysisService';
import { CheckCircle2, XCircle } from 'lucide-react';
import ATSDeepDiveModal from './ATSDeepDiveModal';
import { useATS } from '@/contexts/ATSContext';
import guestCVService from '@/lib/services/guestCVService';
import { useUpgradePopupTrigger } from '@/lib/hooks/useUpgradePopupTrigger';
import UpgradeCard from '@/components/dashboard/UpgradeCard';
import { generateCVTitle } from '@/lib/utils/cv-title-generator';
import ModeValidationBanner from '@/components/resume-enhancer/components/ModeValidationBanner';
import ModeTransitionDialog from '@/components/resume-enhancer/components/ModeTransitionDialog';
import { getAnalysisModeWithValidation, hasAnalysisContextChanged, type AnalysisMode } from '@/lib/utils/analysis-mode';

interface ResumeEnhancerContainerProps {
  userId: string;
  mode?: 'create' | 'edit' | 'edit-master' | 'journey';
  cvId?: string;
  journeyId?: string;
  isGuestMode?: boolean;
  restoreDraft?: boolean;
}

export default function ResumeEnhancerContainer({
  userId,
  mode = 'create',
  cvId,
  journeyId,
  isGuestMode = false,
  restoreDraft = false
}: ResumeEnhancerContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { state, dispatch, goToStep, loadCV, setRoleContext } = useResumeEnhancer();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error' | 'offline'>('idle');
  const [hasOfflineBackup, setHasOfflineBackup] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSidebarAnalyzing, setIsSidebarAnalyzing] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const { userData } = useUserData();
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuExpanded, setIsUserMenuExpanded] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const step3Ref = useRef<Step3BuilderSurgeonRef>(null);
  const initializedRef = useRef<{ mode: string; cvId?: string } | null>(null);
  // Track initial CV data to detect unsaved changes
  const initialCVDataRef = useRef<UnifiedCVDataStructure | null>(null);
  const initialCVTitleRef = useRef<string>('');
  const initialTemplateRef = useRef<ITemplate | null>(null);
  // Track if role was explicitly set by user (via modal or sidebar)
  const roleExplicitlySetRef = useRef<boolean>(false);
  // Track if we just saved to prevent re-initialization from resetting state
  const justSavedRef = useRef<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [isScoreAnalysisCompact, setIsScoreAnalysisCompact] = useState(false);
  const [showJobSidebar, setShowJobSidebar] = useState(false);
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
  const [showModeTransitionDialog, setShowModeTransitionDialog] = useState(false);
  const [modeTransitionData, setModeTransitionData] = useState<{
    fromMode: AnalysisMode;
    toMode: AnalysisMode;
    transitionType: string;
  } | null>(null);

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
    // Compute isJDReferenced inside useMemo to avoid initialization order issues
    const hasJD = jdText.trim().length > 0;
    if (atsScore !== null && hasJD) {
      return Math.max(0, Math.min(100, atsScore));
    }
    return Math.max(0, Math.min(100, state.surgeonAnalysis?.score ?? 0));
  }, [atsScore, jdText, state.surgeonAnalysis?.score]);

  // Calculate score breakdown using CVScoringService - same as Step4Review
  const scoreResult = useMemo(() => {
    return CVScoringService.getFullScoreResult(
      state.cvData,
      state.keywordGapAnalysis || undefined,
      state.atsScoreCap
    );
  }, [state.cvData, state.keywordGapAnalysis, state.atsScoreCap]);
  // Check if this is a master CV - check mode, state, or sessionStorage flag
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
      f => f.category === 'keywords' && f.status === 'resolved'
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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

  const getSeniorityFromYears = (years: number): string => {
    if (years < 2) return 'beginner';
    if (years < 5) return 'experienced';
    if (years < 10) return 'professional';
    if (years < 15) return 'senior';
    return 'executive';
  };

  const mapExperienceLevelToSeniority = (level?: string): string | null => {
    if (!level) return null;
    const normalized = String(level).trim().toLowerCase();
    if (normalized === 'entry' || normalized === 'junior') return 'beginner';
    if (normalized === 'mid' || normalized === 'middle' || normalized === 'mid-level') return 'professional';
    if (normalized === 'senior') return 'senior';
    if (normalized === 'executive' || normalized === 'lead' || normalized === 'principal') return 'executive';
    return null;
  };

  // Sync cvId prop to state if available and state doesn't have it
  useEffect(() => {
    if (cvId && !state.cvId) {
      console.log('🔄 Syncing cvId prop to state:', cvId);
      dispatch({ type: 'SET_CV_ID', payload: cvId });
    }
  }, [cvId, state.cvId]);

  // Guest mode: Load draft on mount if restoreDraft is true
  useEffect(() => {
    if (isGuestMode && restoreDraft) {
      const loadGuestDraft = async () => {
        try {
          const result = await guestCVService.loadGuestDraft();
          if (result.success && result.data) {
            const draft = result.data;
            console.log('📦 Restoring guest draft:', draft);

            // Restore CV data
            if (draft.cvData) {
              dispatch({ type: 'SET_CV_DATA', payload: draft.cvData });
            }

            // Restore step
            if (draft.currentStep) {
              goToStep(draft.currentStep as 1 | 2 | 3 | 4);
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

            console.log('✅ Guest draft restored successfully');
          }
        } catch (error) {
          console.error('Failed to load guest draft:', error);
        }
      };

      loadGuestDraft();
    }
  }, [isGuestMode, restoreDraft, dispatch, goToStep, setRoleContext]);

  // Guest mode: Auto-save draft
  useEffect(() => {
    if (isGuestMode && state.cvData) {
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
        cvTitle: state.cvTitle
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
            cvTitle: state.cvTitle
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
  }, [isGuestMode, state.cvData, state.currentStep, completedSteps, activeSection, state.targetRole, state.seniorityLevel, state.selectedTemplate, state.cvTitle]);

  // Track transfer attempts to prevent loops
  const transferAttemptedRef = useRef<boolean>(false);

  // Guest mode: Check for authentication after signup/signin
  useEffect(() => {
    // Only attempt transfer if we are in guest mode, user is authenticated, and we haven't tried yet
    if (isGuestMode && sessionStatus === 'authenticated' && session?.user?.id && !transferAttemptedRef.current) {
      const transferDraft = async () => {
        // Mark as attempted immediately to prevent concurrent or repeat calls
        transferAttemptedRef.current = true;

        if (isTransferringDraft) {
          console.log('⏳ Draft transfer already in progress, skipping...');
          return;
        }

        // Add a small delay to ensure session is fully established
        await new Promise(resolve => setTimeout(resolve, 500));

        setIsTransferringDraft(true);
        try {
          const sessionId = guestCVService.getSessionId();
          if (!sessionId) {
            console.log('ℹ️ No session ID available for transfer, skipping...');
            setIsTransferringDraft(false);
            return;
          }

          // CRITICAL FIX: Check if we actually have a draft to transfer before calling API
          // This prevents infinite loops of 404s when user logs in with a fresh guest session
          const hasDraft = await guestCVService.hasDraft(sessionId);
          if (!hasDraft) {
            console.log('ℹ️ No guest draft found to transfer, skipping...');
            setIsTransferringDraft(false);
            return;
          }

          console.log('🔄 Transferring draft with sessionId:', sessionId, 'userId:', session.user.id);
          const result = await guestCVService.transferDraftToUser(sessionId, session.user.id);

          if (result.success && result.cvId) {
            console.log('✅ Draft transferred successfully:', result);
            // Reload page to switch to authenticated mode
            window.location.href = `/resume-enhancer?cvId=${result.cvId}&mode=edit&step=${result.step || 3}`;
          } else {
            // Check for specific error indicating draft not found or already transferred
            if (result.error?.includes('Draft not found') || result.error?.includes('already transferred')) {
              console.warn('⚠️ Draft transfer skipped:', result.error);
            } else {
              console.error('❌ Failed to transfer draft:', result.error);
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
  const checkAndShowAuthPrompt = (action: 'save' | 'fix-cv') => {
    if (isGuestMode && !hasShownAuthPrompt) {
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
      console.log('✅ Auto-updated CV title:', newTitle, 'for cvType:', state.cvType);
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
      console.log('🔄 Analysis context changed - invalidating cached scores:', {
        from: state.lastAnalysisContext?.mode,
        to: modeInfo.mode,
        roleChanged: roleHashChanged,
        jdChanged: jdHashChanged
      });

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
          setModeTransitionData({
            fromMode: currentMode,
            toMode: modeInfo.mode,
            transitionType
          });
          // Only show dialog if user hasn't opted out and it's a significant change
          const hideDialog = sessionStorage.getItem(`hide_transition_${transitionType}`);
          if (!hideDialog) {
            setShowModeTransitionDialog(true);
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

  // Initialize based on mode
  useEffect(() => {
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
      if (mode === 'edit' || mode === 'edit-master') {
        // Load existing CV
        if (!cvId) {
          console.error('CV ID required for edit mode');
          return;
        }

        setIsLoading(true);
        try {
          const response = await fetch(`/api/cvs/${cvId}`);
          if (!response.ok) throw new Error('Failed to load CV');

          const result = await response.json();
          const cv = result.data.cv;

          // Resolve CV type: 
          // 1. If mode is 'journey', force journey type
          // 2. Otherwise, prioritize cvType field, then infer from metadata/journeyId
          let resolvedCvType: 'master' | 'journey' | 'standalone' =
            mode === 'journey'
              ? 'journey'
              : cv.cvType || (cv.metadata?.isMaster ? 'master' : cv.journeyId ? 'journey' : 'standalone');

          // For journey CVs: ensure we have jobData to show journey-based interface
          if (resolvedCvType === 'journey') {
            console.log('🎯 Journey CV detected - will show journey-based interface', {
              cvId: cv.id,
              journeyId: cv.journeyId,
              hasJobData: !!cv.jobData
            });

            // If jobData is missing but journeyId exists, try to fetch it
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

            // If still no jobData, log warning but continue (journey interface may be limited)
            if (!cv.jobData) {
              console.warn('⚠️ Journey CV loaded without jobData - journey interface may be limited');
            }
          }

          // Edge case: Master CV with JD - don't treat as journey
          if (resolvedCvType === 'master' && cv.jobData) {
            console.log('ℹ️ Master CV has job data - ignoring (master CVs are role-based)');
            // Don't set jobData for master CVs
            loadCV({
              cvId: cv.id,
              cvType: 'master',
              cvTitle: cv.title,
              cvData: cv.cvData,
              template: cv.template,
              journeyId: undefined,
              jobData: undefined
            });

            // Store initial data for unsaved changes detection
            initialCVDataRef.current = JSON.parse(JSON.stringify(cv.cvData));
            initialCVTitleRef.current = cv.title;
            initialTemplateRef.current = cv.template || null;
          } else {
            // Load CV with resolved type and jobData (for journey CVs)
            loadCV({
              cvId: cv.id,
              cvType: resolvedCvType,
              cvTitle: cv.title,
              cvData: cv.cvData,
              template: cv.template,
              journeyId: cv.journeyId,
              jobData: cv.jobData
            });

            // Store initial data for unsaved changes detection
            initialCVDataRef.current = JSON.parse(JSON.stringify(cv.cvData));
            initialCVTitleRef.current = cv.title;
            initialTemplateRef.current = cv.template || null;
          }

          // Master and Standalone CVs are role-based: auto-derive role + seniority so Step 3 analysis is ready.
          if (resolvedCvType === 'master' || resolvedCvType === 'standalone') {
            const inferredRole =
              cv.cvData?.basics?.label ||
              cv.cvData?.work?.[0]?.position ||
              '';

            const inferredSeniority =
              mapExperienceLevelToSeniority(cv?.metadata?.aiAnalysis?.experienceLevel?.level) ||
              getSeniorityFromYears(calculateTotalWorkYears(cv.cvData?.work || [])) ||
              '';

            if (inferredRole || inferredSeniority) {
              setRoleContext(inferredRole, inferredSeniority);
            }
          }

          // Journey CVs use job description for analysis - no need to set targetRole/seniorityLevel
          // They will use jobData.jobDescription for ATS and other analysis

          dispatch({ type: 'SET_MODE', payload: 'edit' });
          // Skip to Step 3 for editing
          goToStep(3);
          setCompletedSteps([1, 2]);

          // Update URL to include mode parameter
          // For master CVs, use 'edit-master' mode in URL
          const urlMode = resolvedCvType === 'master' ? 'edit-master' : 'edit';
          const currentParams = new URLSearchParams(window.location.search);
          if (!currentParams.has('mode')) {
            currentParams.set('mode', urlMode);
            currentParams.set('cvId', cvId);
            const newUrl = `${pathname}?${currentParams.toString()}`;
            router.replace(newUrl);
            console.log('✅ Updated URL with mode:', urlMode);
          }

          // Mark as initialized
          initializedRef.current = { mode, cvId };
        } catch (error) {
          console.error('Failed to load CV:', error);
          alert('Failed to load CV. Redirecting to dashboard.');
          router.push('/dashboard?tab=cvs');
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

            loadCV({
              cvId: cv.id,
              cvType: resolvedCvType,
              cvTitle: cv.title,
              cvData: cv.cvData,
              template: cv.template,
              journeyId: cv.journeyId || journeyId,
              jobData: cv.jobData
            });

            initialCVDataRef.current = JSON.parse(JSON.stringify(cv.cvData));
            initialCVTitleRef.current = cv.title;
            initialTemplateRef.current = cv.template || null;

            dispatch({ type: 'SET_MODE', payload: 'edit' });
            goToStep(3);
            setCompletedSteps([1, 2]);

            initializedRef.current = { mode, cvId };
          } catch (error) {
            console.error('Failed to load CV:', error);
            alert('Failed to load CV. Redirecting to dashboard.');
            router.push('/dashboard?tab=cvs');
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
          router.push('/dashboard/tracker');
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
                  if (journey.cvId) {
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
        }

        // Only go to step 1 if we are starting fresh (create mode, no ID)
        if (mode === 'create' && !cvId && !journeyId) {
          goToStep(1);
        }

        // Mark as initialized
        initializedRef.current = { mode, cvId };
      }
    };

    initializeEnhancer();
  }, [mode, cvId, journeyId]);

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
        mapExperienceLevelToSeniority(state.cvData?.metadata?.aiAnalysis?.experienceLevel?.level) ||
        getSeniorityFromYears(calculateTotalWorkYears(cvData?.work || [])) ||
        '';

      if (inferredRole || inferredSeniority) {
        setRoleContext(inferredRole, inferredSeniority);
      }

      // Proceed directly to template selection (Step 2) without showing role modal
      goToStep(2);
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

        // Proceed directly to template selection (Step 2) without showing role modal
        goToStep(2);
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
      console.log('📝 Edit mode: Preserving existing CV type:', state.cvType);
      // No cvType change - just update role context
      // Do not proceed to step 2 - we're just updating the role
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

      // Proceed to template selection (only in create mode)
      goToStep(2);
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

              // EDGE CASE 9: Check for credit errors
              if (errorMessage.includes('credit') || errorMessage.includes('limit')) {
                alert('Insufficient credits. Please upgrade your plan to track jobs.');
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

          // EDGE CASE 9: Check for credit errors
          if (errorMessage.includes('credit') || errorMessage.includes('limit')) {
            throw new Error('Insufficient credits. Please upgrade your plan to track jobs.');
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

          // Proceed to template selection
          goToStep(2);
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
      goToStep(2);
    } finally {
      setShowJobParserDialog(false);
      setPendingRoleData(null);
    }
  };

  const handleStep2Complete = () => {
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



  const handleStep3Complete = () => {
    setCompletedSteps([...completedSteps, 3]);

    // Guest mode: Save draft before moving to Step 4
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
    }

    goToStep(4);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    // For new CVs (create mode), check if any data has been entered after Step 1
    if (mode === 'create') {
      // If initial data is set (Step 1 completed), compare with current data
      if (initialCVDataRef.current) {
        const currentDataStr = JSON.stringify(state.cvData);
        const initialDataStr = JSON.stringify(initialCVDataRef.current);
        const dataChanged = currentDataStr !== initialDataStr;
        const titleChanged = state.cvTitle !== initialCVTitleRef.current;
        const currentTemplateId = state.selectedTemplate?.id || (state.selectedTemplate as any)?._id;
        const initialTemplateId = initialTemplateRef.current?.id || (initialTemplateRef.current as any)?._id;
        const templateChanged = currentTemplateId !== initialTemplateId;
        return dataChanged || titleChanged || templateChanged;
      }

      // If initial data not set yet, check if any meaningful content exists
      const hasContent =
        (state.cvData.basics?.name && state.cvData.basics.name.trim() !== '') ||
        (state.cvData.work && state.cvData.work.length > 0) ||
        (state.cvData.education && state.cvData.education.length > 0) ||
        (state.cvData.skills && state.cvData.skills.length > 0);

      return hasContent;
    }

    // For edit mode, compare with initial data
    if (!initialCVDataRef.current) return false;

    // Deep comparison of CV data
    const currentDataStr = JSON.stringify(state.cvData);
    const initialDataStr = JSON.stringify(initialCVDataRef.current);
    const dataChanged = currentDataStr !== initialDataStr;

    // Check if title changed
    const titleChanged = state.cvTitle !== initialCVTitleRef.current;

    // Check if template changed
    const currentTemplateId = state.selectedTemplate?.id || (state.selectedTemplate as any)?._id;
    const initialTemplateId = initialTemplateRef.current?.id || (initialTemplateRef.current as any)?._id;
    const templateChanged = currentTemplateId !== initialTemplateId;

    return dataChanged || titleChanged || templateChanged;
  }, [mode, state.cvData, state.cvTitle, state.selectedTemplate]);

  const handleExit = () => {
    // Determine where to navigate back based on how user arrived
    let returnPath = '/dashboard'; // Default

    if (journeyId) {
      // User came from tracker (journey-based editing)
      returnPath = '/dashboard/tracker';
    } else if (cvId && (mode === 'edit' || mode === 'edit-master')) {
      // User came from canvas/documents page
      returnPath = '/dashboard/canvas';
    }

    // Only show confirmation if there are unsaved changes
    if (hasUnsavedChanges) {
      if (confirm('Are you sure you want to exit? Unsaved changes will be lost.')) {
        router.push(returnPath);
      }
    } else {
      // No unsaved changes, exit without confirmation
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

  const extractCvIdFromResponse = (result: any): string | null => {
    // Try multiple possible response structures
    const cvId =
      result?.data?.cv?.id ||
      result?.data?.cv?._id ||
      result?.data?.id ||
      result?.cv?.id ||
      result?.cv?._id ||
      result?.id ||
      null;

    // Convert to string if it's an ObjectId
    if (cvId) {
      return String(cvId);
    }

    return null;
  };

  // Helper function to ensure CV is saved and return cvId
  const ensureCVSaved = async (): Promise<string | null> => {
    // Check if CV is already saved
    const effectiveCvId = state.cvId || cvId;
    if (effectiveCvId) {
      return effectiveCvId;
    }

    // Guest mode: Save to draft instead of creating CV
    if (isGuestMode) {
      console.log('💾 Guest mode: Saving to draft instead of creating CV...');
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
    console.log('💾 CV not saved yet, saving CV first before saving job...');

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

      const response = await fetch('/api/cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
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

  const handleSmartSave = async () => {
    if (saveStatus === 'saving') return;

    // Check if auth prompt should be shown for guest users
    if (checkAndShowAuthPrompt('save')) {
      return; // Stop execution, auth prompt will be shown
    }

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

    const isFinishing = state.currentStep === 4;
    const isContinuing = state.currentStep === 3;
    const completionPercentage = calculateCompletionPercentage();

    const payload = {
      title: state.cvTitle,
      cvData: state.cvData,
      templateId: state.selectedTemplate?.id || (state.selectedTemplate as any)?._id,
      cvType: state.cvType,
      status: isFinishing ? 'published' : 'draft',
      journeyId: state.journeyId,
      metadata: {
        isMaster: state.cvType === 'master',
        completionPercentage,
        createdVia: 'resume-enhancer'
      }
    };

    try {
      // For Master CV or any edit mode, ensure we use PUT (update) if cvId exists
      // This prevents trying to create a duplicate Master CV
      const isMasterCV = state.cvType === 'master' || mode === 'edit-master';
      const isEditMode = mode === 'edit' || mode === 'edit-master' || mode === 'journey';

      // Use cvId from state, or fallback to prop, or use the one from URL params
      const effectiveCvId = state.cvId || cvId;

      // LAYER 1: UPSERT PATTERN - If Master CV has no ID, create instead of erroring
      // This fixes the "CV ID missing" error by automatically switching to CREATE mode
      let shouldUpdate = isEditMode || effectiveCvId;
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

      const response = await fetch(apiUrl, {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        // LAYER 3: If save fails, ensure data is in localStorage
        try {
          const backupData = {
            ...payload,
            attemptedSaveAt: Date.now(),
            error: result?.error || 'Failed to save',
            userId,
            mode: isMasterCV ? 'master-create' : 'create'
          };
          localStorage.setItem('unsaved_master_cv', JSON.stringify(backupData));
          console.log('💾 Layer 3 Defense: Save failed, saved to localStorage');
        } catch (storageError) {
          console.warn('⚠️ Failed to save to localStorage after error:', storageError);
        }
        throw new Error(result?.error || 'Failed to save');
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
          } else if (pathname.includes('/resume-enhancer')) {
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

      setSaveStatus('success');

      // CRITICAL FIX: Don't auto-navigate from step 3 - stay on current step
      // This preserves parsed data and surgeon analysis
      if (isFinishing && savedCvId) {
        router.push(`/dashboard?tab=cvs&highlight=${savedCvId}`);
      }
      // Removed: isContinuing navigation that was moving to step 4

      // Reset success state after a short delay (if we didn't navigate away)
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (error) {
      console.error('Save failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to save';

      // LAYER 3: Show user-friendly message if data was saved offline
      const offlineBackupExists = typeof window !== 'undefined' && localStorage.getItem('unsaved_master_cv');
      setHasOfflineBackup(!!offlineBackupExists);

      const errorMessage = offlineBackupExists
        ? 'Connection unstable. Your work has been saved locally and will sync when connection is restored.'
        : message;

      setSaveError(errorMessage);
      setSaveStatus(offlineBackupExists ? 'offline' : 'error');
      dispatch({ type: 'SET_SAVE_ERROR', payload: errorMessage });

      // Show toast notification for offline save
      if (offlineBackupExists) {
        console.log('💾 Layer 3 Defense: Data saved offline, will retry on next save');
      }
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
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

  if (isLoading) {
    return (
      <div className="dashboard-page resume-enhancer-page flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[color:var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[color:var(--text-secondary)]">Loading Resume Enhancer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page resume-enhancer-page min-h-screen bg-[var(--bg-primary)] text-[color:var(--text-primary)] flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-[#141810] sticky top-0 z-[100] shadow-sm shadow-black/10 dark:shadow-black/30 backdrop-blur-sm w-full border-b border-gray-200 dark:border-transparent">
        <div className="w-full px-4 py-1.5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExit}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                title="Go back"
              >
                <Home className="w-5 h-5 text-[color:var(--text-primary)]" />
              </button>
              <h1 className="text-[color:var(--text-primary)] font-bold">
                <span className="text-xl">Resume Enhancer</span>
                <span className="text-sm">
                  {' '}
                  BY <span className="text-[color:var(--accent-primary)]">CV</span>
                  <span className="text-[color:var(--text-primary)]">Circle</span>
                </span>
              </h1>
            </div>


            {/* Actions - Right side */}
            <div className="flex items-center space-x-2">

              {/* Save button - only show on step 3 and 4 */}
              {(state.currentStep === 3 || state.currentStep === 4) && (
                <button
                  onClick={handleSmartSave}
                  disabled={saveStatus === 'saving'}
                  className="px-3 py-1.5 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] disabled:bg-gray-300 dark:disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-black disabled:text-gray-500 dark:disabled:text-[color:var(--text-tertiary)] rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-md hover:shadow-lg hover:scale-105"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </>
                  ) : saveStatus === 'offline' ? (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Saved Offline</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              )}

              {/* Continue to Review button - only show on Step 3 */}
              {state.currentStep === 3 && (
                <button
                  onClick={handleStep3Complete}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-md hover:shadow-lg hover:scale-105"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review</span>
                </button>
              )}

              {/* Save Status Indicator - Animated */}
              {(saveStatus === 'saving' || saveStatus === 'success') && (
                <SaveIndicator status={saveStatus} className="hidden sm:flex" />
              )}

              {/* Guest Mode Tag */}
              {isGuestMode && (
                <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium">
                  Guest
                </span>
              )}

              {/* Notification Center */}
              <NotificationCenter />
            </div>
          </div>
        </div>

        {/* Save Error (lightweight inline) */}
        {saveStatus === 'error' && saveError && (
          <div className="px-4 pb-2">
            <div className="text-xs text-red-700 dark:text-red-400 bg-red-500/10 rounded-lg px-3 py-2 shadow-sm shadow-black/10 dark:shadow-black/30">
              {saveError}
            </div>
          </div>
        )}
      </header>

      {/* Content Area (Left Sticky Steps + Main Content) */}
      <div className="flex-1 min-h-0 flex overflow-hidden bg-[var(--bg-primary)] h-[calc(100vh-64px-80px)]">
        {/* Floating / Sticky vertical steps panel (desktop) */}
        <aside className="hidden lg:flex lg:flex-col w-72 flex-shrink-0 m-2 rounded-xl bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 h-auto max-h-[calc(100vh-80px)] overflow-hidden">
          <div className="flex flex-col h-full p-3 overflow-hidden">
            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
              {/* Step Indicator Card */}
              <div className="bg-white dark:bg-[#1a230f] rounded-xl shadow-sm shadow-black/10 dark:shadow-black/30 border border-gray-200 dark:border-white/5 overflow-hidden">
                <div className="p-3">
                  <StepIndicator
                    orientation="vertical"
                    currentStep={state.currentStep}
                    completedSteps={completedSteps}
                    onStepClick={(step) => {
                      if (completedSteps.includes(step)) {
                        goToStep(step);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Job Role Card - Show for master and standalone CVs (including guest mode) */}
              {(state.cvType === 'master' || state.cvType === 'standalone' || (isGuestMode && !state.cvType)) && (
                <JobRoleCard
                  targetRole={state.targetRole}
                  seniorityLevel={state.seniorityLevel}
                  optimizationScore={analysisScore}
                  cvType={state.cvType || (isGuestMode ? 'master' : 'standalone')}
                  mode={mode}
                  hasJD={isJDReferenced}
                  onEditRole={() => {
                    roleExplicitlySetRef.current = true;
                    setShowRoleModal(true);
                  }}
                  onAddJD={() => setShowJobParserDialog(true)}
                />
              )}

              {/* Job Card - Show for journey-based CVs on all steps */}
              {state.cvType === 'journey' && state.jobData && (
                <JobCard
                  job={state.jobData}
                  onClick={async () => {
                    const jobId = state.jobData.id || state.jobData._id;
                    if (!jobId || (userId === 'guest' ? false : !userId)) return;

                    setSelectedJob(state.jobData);

                    // Load journeys for this job (skip for guest users)
                    if (userId !== 'guest') {
                      try {
                        const journeysResponse = await authenticatedFetchWithUserId(
                          `/api/application-journey?jobId=${jobId}`,
                          userId
                        );
                        const journeysData = await journeysResponse.json();
                        setJourneysForJob(journeysData.success ? journeysData.data.journeys || [] : []);
                      } catch (error) {
                        console.error('Error loading journeys:', error);
                        setJourneysForJob([]);
                      }
                    }

                    setShowJobSidebar(true);
                  }}
                />
              )}

              {/* ATS Check Card - Redesigned (Step 3) */}
              {state.currentStep === 3 && (
                <div className="bg-white dark:bg-[#1a230f] rounded-xl shadow-sm shadow-black/10 dark:shadow-black/30 border border-gray-200 dark:border-white/5 overflow-hidden relative">
                  {/* Blur overlay for guest users - always show for guest mode */}
                  {isGuestMode && (
                    <div className="absolute inset-0 bg-white/90 dark:bg-[#1a230f]/90 backdrop-blur-md z-20 rounded-xl flex items-center justify-center">
                      <div className="text-center px-4 space-y-3">
                        <p className="text-sm font-semibold text-[color:var(--accent-primary)] mb-2">
                          Sign in to view analysis
                        </p>
                        <p className="text-xs text-[color:var(--text-secondary)] mb-3">
                          Create an account to see your CV score and get personalized suggestions
                        </p>
                        <button
                          onClick={() => {
                            const currentPath = pathname;
                            const currentSearch = searchParams.toString();
                            const callbackUrl = currentSearch
                              ? `${currentPath}?${currentSearch}`
                              : currentPath;
                            router.push(`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`);
                          }}
                          className="px-4 py-2 bg-[#39FF14] hover:bg-[#32E614] text-black rounded-lg text-xs font-semibold transition-all shadow-lg hover:shadow-[#39FF14]/50 hover:scale-105"
                        >
                          Sign Up Free
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Sparkles className="w-4 h-4 text-[color:var(--accent-primary)] flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                          {isJDReferenced ? 'ATS Score' : 'CVCircle Score'}
                        </div>
                        {state.targetRole && (
                          <div className="text-[9px] text-[color:var(--text-tertiary)] truncate">
                            for {state.targetRole}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsScoreAnalysisCompact(!isScoreAnalysisCompact)}
                      className="p-1 rounded hover:bg-white/5 transition-colors flex-shrink-0"
                      aria-label={isScoreAnalysisCompact ? 'Expand' : 'Collapse'}
                    >
                      {isScoreAnalysisCompact ? (
                        <Maximize2 className="w-3.5 h-3.5 text-[color:var(--text-secondary)]" />
                      ) : (
                        <Minimize2 className="w-3.5 h-3.5 text-[color:var(--text-secondary)]" />
                      )}
                    </button>
                  </div>

                  <div className="p-3 space-y-3">

                    {/* Score Bar - Animated */}
                    <div className="bg-gray-100 dark:bg-[#80FF00]/10 rounded-full p-1 flex items-center gap-2">
                      <div className="px-2">
                        <AnimatedScore
                          value={analysisScore}
                          suffix="%"
                          size="sm"
                          showChange={true}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <AnimatedProgressBar
                          value={analysisScore}
                          height={4}
                          colorStops={[
                            { threshold: 0, color: '#ef4444' },
                            { threshold: 50, color: '#f59e0b' },
                            { threshold: 70, color: '#80FF00' }
                          ]}
                        />
                      </div>
                    </div>

                    {/* Score Breakdown - Same as Step4 Review */}
                    <div className="rounded-lg p-2 space-y-1.5 mt-2 bg-gray-50 dark:bg-[#1a230f]/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">Score Breakdown</span>
                        <span className={`text-[10px] font-bold ${scoreResult.cvScore.total >= 80 ? 'text-green-400' :
                          scoreResult.cvScore.total >= 60 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                          Grade: {scoreResult.overallGrade}
                        </span>
                      </div>
                      {/* Breakdown Bars */}
                      <div className="space-y-1.5">
                        {/* Completeness */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-600 dark:text-gray-300 w-20">Completeness</span>
                          <div className="flex-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${(scoreResult.cvScore.completeness / 25) * 100 >= 80 ? 'bg-green-500' : (scoreResult.cvScore.completeness / 25) * 100 >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${(scoreResult.cvScore.completeness / 25) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-700 dark:text-gray-300 w-8 text-right">{scoreResult.cvScore.completeness}/25</span>
                        </div>
                        {/* Impact Verbs */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-600 dark:text-gray-300 w-20">Impact Verbs</span>
                          <div className="flex-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${(scoreResult.cvScore.impactVerbs / 20) * 100 >= 80 ? 'bg-green-500' : (scoreResult.cvScore.impactVerbs / 20) * 100 >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${(scoreResult.cvScore.impactVerbs / 20) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-700 dark:text-gray-300 w-8 text-right">{scoreResult.cvScore.impactVerbs}/20</span>
                        </div>
                        {/* Quantification */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-600 dark:text-gray-300 w-20">Quantification</span>
                          <div className="flex-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${(scoreResult.cvScore.quantification / 20) * 100 >= 80 ? 'bg-green-500' : (scoreResult.cvScore.quantification / 20) * 100 >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${(scoreResult.cvScore.quantification / 20) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-700 dark:text-gray-300 w-8 text-right">{scoreResult.cvScore.quantification}/20</span>
                        </div>
                        {/* Formatting */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-600 dark:text-gray-300 w-20">Formatting</span>
                          <div className="flex-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${(scoreResult.cvScore.formatting / 15) * 100 >= 80 ? 'bg-green-500' : (scoreResult.cvScore.formatting / 15) * 100 >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${(scoreResult.cvScore.formatting / 15) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-700 dark:text-gray-300 w-8 text-right">{scoreResult.cvScore.formatting}/15</span>
                        </div>
                        {/* Readability */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-600 dark:text-gray-300 w-20">Readability</span>
                          <div className="flex-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${(scoreResult.cvScore.readability / 20) * 100 >= 80 ? 'bg-green-500' : (scoreResult.cvScore.readability / 20) * 100 >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${(scoreResult.cvScore.readability / 20) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-700 dark:text-gray-300 w-8 text-right">{scoreResult.cvScore.readability}/20</span>
                        </div>
                      </div>
                    </div>

                    {!isScoreAnalysisCompact && (
                      <>
                        {/* Keywords Status Section - Only show for non-Master CVs with JD, or show role info for standalone */}
                        {!isMasterCV && (
                          <div>
                            <div className="space-y-2">
                              {/* Dynamic Header based on state */}
                              <div className="flex items-center gap-2">
                                {(() => {
                                  // Determine header based on state
                                  if (isLoadingSkillGap) {
                                    return (
                                      <>
                                        <Loader2 className="w-3 h-3 text-[color:var(--accent-primary)] animate-spin" />
                                        <InfoTooltip content="Analyzing keywords from job description...">
                                          <span className="text-[10px] font-semibold text-[color:var(--text-primary)] uppercase cursor-help">Analyzing Keywords</span>
                                        </InfoTooltip>
                                      </>
                                    );
                                  }

                                  if (!isJDReferenced) {
                                    // No keywords section when no JD - Add JD button is in JobRoleCard
                                    return null;
                                  }

                                  if (keywordStats.allMatched && keywordStats.hasKeywords) {
                                    return (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-[#80FF00]" />
                                        <InfoTooltip content="All keywords from the job description are present in your CV">
                                          <span className="text-[10px] font-semibold text-[color:var(--text-primary)] uppercase cursor-help">All Keywords Matched</span>
                                        </InfoTooltip>
                                      </>
                                    );
                                  }

                                  if (keywordStats.missing > 0) {
                                    return (
                                      <>
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <InfoTooltip content={`${keywordStats.missing} keywords from the job description are missing from your resume`}>
                                          <span className="text-[10px] font-semibold text-[color:var(--text-primary)] uppercase cursor-help">Missing Keywords</span>
                                        </InfoTooltip>
                                      </>
                                    );
                                  }

                                  return (
                                    <>
                                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                      <InfoTooltip content="Keyword analysis status">
                                        <span className="text-[10px] font-semibold text-[color:var(--text-primary)] uppercase cursor-help">Keywords</span>
                                      </InfoTooltip>
                                    </>
                                  );
                                })()}
                              </div>

                              {/* Dynamic Status Message */}
                              {(() => {
                                if (isLoadingSkillGap) {
                                  return (
                                    <div className="text-[9px] text-[color:var(--text-tertiary)] text-center py-2 italic">
                                      Analyzing keywords from job description...
                                    </div>
                                  );
                                }

                                if (!isJDReferenced) {
                                  // No content when no JD - the Add JD button is in JobRoleCard
                                  return null;
                                }

                                if (keywordStats.allMatched && keywordStats.hasKeywords) {
                                  return (
                                    <div className="bg-[#80FF00]/10 border border-[#80FF00]/30 rounded-lg p-2 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-[#80FF00] flex-shrink-0" />
                                        <span className="text-[9px] font-semibold text-[#80FF00]">
                                          Your CV now contains all keywords from JD
                                        </span>
                                      </div>
                                      <div className="text-[8px] text-[color:var(--text-secondary)] pl-5">
                                        {keywordStats.matched} of {keywordStats.total} keywords matched ({keywordStats.matchPercentage}%)
                                      </div>
                                      {fixesApplied && (
                                        <div className="text-[8px] text-[color:var(--text-secondary)] pl-5 italic">
                                          ✓ Fixes have been applied
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                if (keywordStats.missing > 0 && keywordStats.hasKeywords) {
                                  return (
                                    <>
                                      {/* Keywords Table Header */}
                                      <div className="grid grid-cols-3 gap-1 text-[9px] font-medium text-[color:var(--text-secondary)] px-1">
                                        <span>Keyword</span>
                                        <span className="text-center">In Resume</span>
                                        <span className="text-center">In Job Ad</span>
                                      </div>

                                      {/* Missing Keywords List */}
                                      <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                        {atsKeywords
                                          .filter(kw => !kw.inResume)
                                          .slice(0, 5)
                                          .map((kw, idx) => (
                                            <div key={idx} className="grid grid-cols-3 gap-1 items-center py-1 px-1 rounded bg-gray-100 dark:bg-[#252a1f] text-[9px]">
                                              <span className="text-[color:var(--text-primary)] truncate" title={kw.keyword}>
                                                {kw.keyword}
                                              </span>
                                              <div className="flex justify-center">
                                                <XCircle className="w-3 h-3 text-red-400" />
                                              </div>
                                              <span className="text-center text-[color:var(--text-secondary)]">{kw.inJobAd}</span>
                                            </div>
                                          ))}

                                        {keywordStats.missing > 5 && (
                                          <div className="text-[8px] text-[color:var(--text-tertiary)] text-center py-1 italic">
                                            +{keywordStats.missing - 5} more missing keywords
                                          </div>
                                        )}
                                      </div>

                                      {/* Match Statistics */}
                                      <div className="bg-gray-100 dark:bg-[#252a1f] rounded-lg p-2 space-y-1">
                                        <div className="text-[9px] text-[color:var(--text-secondary)]">
                                          <span className="font-semibold text-[color:var(--text-primary)]">{keywordStats.matched}</span> of{' '}
                                          <span className="font-semibold text-[color:var(--text-primary)]">{keywordStats.total}</span> keywords matched
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-[#1a230f] rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-[#80FF00] transition-all duration-500"
                                              style={{ width: `${keywordStats.matchPercentage}%` }}
                                            />
                                          </div>
                                          <span className="text-[8px] text-[color:var(--text-secondary)]">{keywordStats.matchPercentage}%</span>
                                        </div>
                                      </div>
                                    </>
                                  );
                                }

                                // Fallback: No keywords found
                                if (!keywordStats.hasKeywords && !isLoadingSkillGap) {
                                  return (
                                    <div className="text-[9px] text-[color:var(--text-tertiary)] text-center py-2 italic">
                                      No keywords found in job description
                                    </div>
                                  );
                                }

                                // Fallback: Show fix annotations if available
                                if ((state.fixAnnotations || []).filter(f => f.category === 'keywords' && f.status === 'open').length > 0) {
                                  return (
                                    <>
                                      <div className="grid grid-cols-3 gap-1 text-[9px] font-medium text-[color:var(--text-secondary)] px-1">
                                        <span>Keyword</span>
                                        <span className="text-center">In Resume</span>
                                        <span className="text-center">In Job Ad</span>
                                      </div>
                                      <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                        {(state.fixAnnotations || [])
                                          .filter(f => f.category === 'keywords' && f.status === 'open')
                                          .slice(0, 3)
                                          .map((fix, idx) => (
                                            <div key={idx} className="grid grid-cols-3 gap-1 items-center py-1 px-1 rounded bg-gray-100 dark:bg-[#252a1f] text-[9px]">
                                              <span className="text-[color:var(--text-primary)] truncate">{fix.issue?.split(' ').slice(0, 2).join(' ') || 'Keyword'}</span>
                                              <div className="flex justify-center">
                                                <span className="text-red-400">✕</span>
                                              </div>
                                              <span className="text-center text-[color:var(--text-secondary)]">1</span>
                                            </div>
                                          ))}
                                      </div>
                                    </>
                                  );
                                }

                                return null;
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Issues Count Badge - Dynamic based on state */}
                        <div className="flex items-center justify-between pt-1">
                          {(() => {
                            if (openIssuesCount === 0 && fixesApplied) {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3 h-3 text-[#80FF00]" />
                                  <span className="text-[10px] text-[#80FF00] font-semibold">All fixes applied</span>
                                </div>
                              );
                            }

                            if (openIssuesCount === 0 && keywordStats.allMatched) {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3 h-3 text-[#80FF00]" />
                                  <span className="text-[10px] text-[#80FF00] font-semibold">CV optimized</span>
                                </div>
                              );
                            }

                            if (openIssuesCount > 0) {
                              return (
                                <span className="text-[10px] text-[color:var(--text-secondary)]">
                                  {openIssuesCount} {openIssuesCount === 1 ? 'suggestion' : 'suggestions'} available
                                </span>
                              );
                            }

                            if (!isJDReferenced && !isMasterCV) {
                              // No message when no JD - Add JD button is in JobRoleCard
                              return null;
                            }

                            return (
                              <span className="text-[10px] text-[color:var(--text-secondary)]">
                                No suggestions at this time
                              </span>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>

                  {/* View Report Button */}
                  <div className="px-3 pb-3 space-y-2">
                    <InfoTooltip content="Review mode highlights suggestions directly on your CV. Turn it on to see inline fixes and improvements.">
                      <button
                        onClick={() => dispatch({ type: 'SET_REVIEW_MODE', payload: !state.reviewMode })}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${state.reviewMode
                          ? 'bg-[#80FF00] text-black hover:bg-[#70e600]'
                          : 'bg-[#2a3520] text-[color:var(--text-secondary)] hover:bg-[#353f28]'
                          }`}
                      >
                        Review mode: {state.reviewMode ? 'ON' : 'OFF'}
                      </button>
                    </InfoTooltip>

                    {/* Report Button - Deep Dive Analysis */}
                    {(journeyId || state.journeyId || state.jobData) && (state.cvId || cvId) && (
                      <button
                        onClick={() => {
                          setShowATSDeepDive(true);
                          logResumeEnhancerEvent({
                            action: 'ats_deep_dive_opened',
                            resourceType: 'cv',
                            resourceId: state.cvId || cvId,
                            metadata: { cvType: state.cvType, source: 'sidebar' }
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-gray-200 dark:bg-[#2a3520] hover:bg-gray-300 dark:hover:bg-[#353f28] text-[color:var(--text-secondary)] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Report</span>
                      </button>
                    )}

                    {/* Fix ATS Button (renamed from View report) */}
                    <button
                      onClick={async () => {
                        if (isSidebarAnalyzing) return;

                        // For guest users, always show auth prompt when clicking Fix CV
                        if (isGuestMode) {
                          setShowAuthPrompt(true);
                          setHasShownAuthPrompt(true);
                          return; // Stop execution, auth prompt will be shown
                        }

                        // NOTE: Journey CVs use job description for analysis, don't require targetRole/seniorityLevel
                        // Only standalone/master CVs need targetRole/seniorityLevel
                        const isJourneyCV = state.cvType === 'journey' && (state.jobData || state.journeyId);

                        // Define role and seniority for both journey and non-journey CVs
                        let role: string;
                        let seniority: string;

                        if (isJourneyCV) {
                          // For journey CVs, use job title and default seniority
                          role = state.jobData?.jobTitle || state.jobData?.title || '';
                          seniority = 'professional';
                        } else {
                          // For standalone/master CVs, require targetRole and seniorityLevel
                          role = state.targetRole || '';
                          seniority = state.seniorityLevel || '';
                          if (!role || !seniority) {
                            const inferred = inferRoleContextFromCVData(state.cvData);
                            if (inferred.targetRole && inferred.seniorityLevel) {
                              role = inferred.targetRole;
                              seniority = inferred.seniorityLevel;
                              dispatch({
                                type: 'SET_ROLE_CONTEXT',
                                payload: { targetRole: inferred.targetRole, seniorityLevel: inferred.seniorityLevel }
                              });
                            } else {
                              alert('Please set your target role and seniority level first.');
                              return;
                            }
                          }
                        }

                        // Check for JD requirement for standalone CVs (only for authenticated users)
                        if (state.cvType === 'standalone' && !isJDReferenced) {
                          // Navigate to Step 3 if not already there, then open job parser
                          if (state.currentStep !== 3) {
                            goToStep(3);
                          }
                          setShowJobParserDialog(true);
                          return;
                        }

                        setIsSidebarAnalyzing(true);
                        try {
                          // Ensure we have analysis + annotations before opening report
                          // Use cache-aware method to avoid regenerating analysis unnecessarily
                          if (!state.surgeonAnalysis || (state.fixAnnotations || []).length === 0) {
                            const result = await CVSurgeonService.analyzeCVWithCache(
                              state.cvData,
                              role,
                              seniority,
                              state.cvId,
                              userId,
                              state.jobData
                            );
                            dispatch({ type: 'SET_SURGEON_ANALYSIS', payload: { score: result.score, fixes: result.fixes } });
                            dispatch({ type: 'SET_FIX_ANNOTATIONS', payload: result.annotations });

                            const firstOpenFromResult = result.annotations.find((f) => f.status === 'open');
                            if (!state.activeFixId && firstOpenFromResult) {
                              dispatch({ type: 'SET_ACTIVE_FIX', payload: firstOpenFromResult.id });
                            }

                            if (result.cached) {
                              console.log('✅ Loaded cached analysis - no AI tokens used');
                            }
                          }

                          // If we already had annotations, ensure an active issue is selected.
                          const firstOpen = (state.fixAnnotations || []).find((f) => f.status === 'open');
                          if (!state.activeFixId && firstOpen) dispatch({ type: 'SET_ACTIVE_FIX', payload: firstOpen.id });

                          logResumeEnhancerEvent({
                            action: 'resume_enhancer_report_opened',
                            resourceType: 'cv',
                            resourceId: state.cvId,
                            metadata: { cvType: state.cvType, score: state.surgeonAnalysis?.score ?? null, source: 'sidebar' }
                          });

                          dispatch({ type: 'SET_REPORT_OPEN', payload: true });
                        } catch (error) {
                          console.error('CV Surgeon analysis failed (sidebar View report):', error);
                          const message = error instanceof Error ? error.message : 'CV Surgeon analysis failed';
                          alert(message);
                        } finally {
                          setIsSidebarAnalyzing(false);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[#80FF00] hover:bg-[#70e600] text-black text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed"
                      disabled={isSidebarAnalyzing}
                    >
                      {isSidebarAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isJourneyCV ? 'Fix ATS' : 'Fix CV'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Vertical Step Indicator - Hidden on desktop since we have ribbon, shown on mobile if needed */}
              <div className="bg-white dark:bg-[#1a230f] rounded-xl shadow-sm shadow-black/10 dark:shadow-black/30 p-2.5 border border-gray-200 dark:border-white/5 hidden">
                <StepIndicator
                  orientation="vertical"
                  currentStep={state.currentStep}
                  completedSteps={completedSteps}
                  onStepClick={(step) => {
                    if (completedSteps.includes(step)) {
                      goToStep(step);
                    }
                  }}
                />
              </div>

              {/* Membership Card (from dashboard sidebar concept) */}
              <SidebarMembershipCard />
            </div>

            {/* User Profile Section - At the bottom */}
            <div className="mt-auto border-t border-white/10 pt-3 flex-shrink-0">
              {/* Menu Items - Above Avatar */}
              <AnimatePresence>
                {isUserMenuExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                    onMouseEnter={handleMenuContentMouseEnter}
                    onMouseLeave={handleMenuContentMouseLeave}
                  >
                    <div className="p-2 space-y-1">
                      {/* View Profile - Hidden in guest mode */}
                      {!isGuestMode && (
                        <motion.button
                          onClick={handleProfileClick}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <User className="w-5 h-5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">View Profile</div>
                          </div>
                        </motion.button>
                      )}

                      {/* Settings - Hidden in guest mode */}
                      {!isGuestMode && (
                        <motion.button
                          onClick={handleSettingsClick}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Settings className="w-5 h-5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">Settings</div>
                          </div>
                        </motion.button>
                      )}

                      {/* Theme Toggle */}
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {theme === 'dark' ? (
                            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                          ) : (
                            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                          )}
                          <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
                        </div>
                        <button
                          onClick={toggleTheme}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 cursor-pointer ${theme === 'dark'
                            ? 'bg-lime-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          type="button"
                          aria-label="Toggle theme"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                              }`}
                          />
                        </button>
                      </div>

                      {/* Sign Out */}
                      <motion.button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">Sign Out</div>
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User Avatar - At the bottom, clickable to toggle menu */}
              <div className="p-2">
                <motion.button
                  onClick={() => setIsUserMenuExpanded(!isUserMenuExpanded)}
                  onMouseEnter={handleUserMenuMouseEnter}
                  onMouseLeave={handleUserMenuMouseLeave}
                  className="w-full flex items-center gap-3 focus:outline-none rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors p-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <UserAvatar
                    src={isGuestMode ? undefined : getUserAvatar(userData)}
                    name={
                      isGuestMode
                        ? 'Guest'
                        : (state.cvData?.basics?.name?.trim() || getUserDisplayName(userData))
                    }
                    size="sm"
                    className="cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all flex-shrink-0"
                  />
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {isGuestMode
                        ? 'Guest'
                        : (state.cvData?.basics?.name?.trim() || getUserDisplayName(userData))
                      }
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {isGuestMode
                        ? 'Not signed in'
                        : (state.cvData?.basics?.email?.trim() || userData?.email || '')
                      }
                    </div>
                  </div>
                  {/* Chevron Icon */}
                  <motion.div
                    animate={{ rotate: isUserMenuExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </motion.div>
                </motion.button>
              </div>
            </div>
          </div>
        </aside>

        {/* Structure Sidebar - Only for Step 3 */}
        {state.currentStep === 3 && (
          <div className="flex-shrink-0 overflow-hidden h-[calc(100vh-64px)] ml-2 mb-2 mt-2">
            <ResumeEnhancerSidebar
              cvSections={cvSections}
              activeSection={activeSection}
              onSectionClick={(sectionId) => {
                setActiveSection(sectionId);
                step3Ref.current?.scrollToSection(sectionId);
              }}
              onAddSection={() => {
                step3Ref.current?.handleAddSection();
              }}
              onDeleteSection={(sectionId) => {
                step3Ref.current?.handleDeleteSectionFromSidebar(sectionId);
              }}
              onSectionReorder={(sectionIds) => {
                step3Ref.current?.handleSectionReorder(sectionIds);
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-hidden bg-gray-50 dark:bg-[#1a230f]">
          <div className="w-full h-full min-h-0 box-border overflow-hidden flex flex-col">
            {/* Mode Validation Banner */}
            {state.analysisModeInfo && state.currentStep === 3 && (
              <div className="px-4 pt-4">
                <ModeValidationBanner
                  modeInfo={state.analysisModeInfo}
                  onDismiss={() => dispatch({ type: 'CLEAR_MODE_WARNINGS' })}
                  onActionClick={(action) => {
                    if (action.toLowerCase().includes('role')) {
                      setShowRoleModal(true);
                    } else if (action.toLowerCase().includes('jd') || action.toLowerCase().includes('job')) {
                      setShowJobParserDialog(true);
                    }
                  }}
                  className="mb-2"
                />
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={state.currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full min-h-0 flex flex-col"
              >
                {state.currentStep === 1 && (
                  <Step1Parser
                    onComplete={handleStep1Complete}
                    mode={mode}
                    cvType={state.cvType}
                  />
                )}
                {state.currentStep === 2 && (
                  <Step2Template onComplete={handleStep2Complete} />
                )}
                {state.currentStep === 3 && (
                  <Step3BuilderSurgeon
                    ref={step3Ref}
                    onComplete={handleStep3Complete}
                    onActiveSectionChange={(sectionId) => setActiveSection(sectionId)}
                  />
                )}
                {state.currentStep === 4 && (
                  <Step4Review />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Role Selector Modal */}
      <RoleSelectorModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        cvData={state.cvData}
        onSubmit={handleRoleModalSubmit}
        onOpenJobParser={(roleData) => {
          handleOpenJobParser(roleData);
        }}
        isOnboardingMode={false}
        isGuestMode={isGuestMode}
        cvType={state.cvType}
      />

      {/* Auth Prompt Modal - For guest users at Step 3 */}
      {isGuestMode && (
        <AuthPromptModal
          isOpen={showAuthPrompt}
          onClose={() => setShowAuthPrompt(false)}
          onContinueGuest={() => {
            setShowAuthPrompt(false);
            // Allow continuing as guest with limitations
          }}
          currentStep={state.currentStep}
        />
      )}

      {/* Job Parser Dialog (Magic Paste) */}
      <JobParserDialog
        isOpen={showJobParserDialog}
        onClose={() => {
          setShowJobParserDialog(false);
          setPendingRoleData(null);
          // Reopen role modal if we don't have role data (only for non-standalone)
          if (state.cvType !== 'standalone' && !state.targetRole || !state.seniorityLevel) {
            setShowRoleModal(true);
          }
        }}
        customDescription={state.cvType === 'standalone'
          ? 'Add a Job Description for ATS check. This helps us provide more accurate analysis tailored to your target role by matching your CV against the job requirements.'
          : undefined
        }
        onParseComplete={handleJobParserComplete}
      />

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
            setShowJobSidebar(false);
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

      {/* Mode Transition Dialog */}
      <ModeTransitionDialog
        isOpen={showModeTransitionDialog}
        onClose={() => {
          setShowModeTransitionDialog(false);
          setModeTransitionData(null);
        }}
        onConfirm={() => {
          setShowModeTransitionDialog(false);
          setModeTransitionData(null);
          dispatch({ type: 'CLEAR_MODE_WARNINGS' });
        }}
        fromMode={modeTransitionData?.fromMode || 'insufficient-data'}
        toMode={modeTransitionData?.toMode || 'insufficient-data'}
        transitionType={modeTransitionData?.transitionType as any || 'generic'}
        cvType={state.cvType}
      />
    </div>
  );
}

