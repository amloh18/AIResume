'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Eye, Loader2, Sparkles, User, Settings, LogOut, Sun, Moon, ChevronDown, ChevronUp, Minimize2, Maximize2, Home } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import StepIndicator from './StepIndicator';
import RibbonStepIndicator from './RibbonStepIndicator';
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
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import JobParserDialog from '@/components/dashboard/jobs/JobParserDialog';
import { CVJourney } from '@/types/cv';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import type { SkillGapAnalysis } from '@/lib/services/skillGapAnalysisService';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ResumeEnhancerContainerProps {
  userId: string;
  mode?: 'create' | 'edit' | 'edit-master' | 'journey';
  cvId?: string;
  journeyId?: string;
}

export default function ResumeEnhancerContainer({
  userId,
  mode = 'create',
  cvId,
  journeyId
}: ResumeEnhancerContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, dispatch, goToStep, loadCV, setRoleContext } = useResumeEnhancer();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSidebarAnalyzing, setIsSidebarAnalyzing] = useState(false);
  const { data: session } = useSession();
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
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [isScoreAnalysisCompact, setIsScoreAnalysisCompact] = useState(false);
  const [showJobSidebar, setShowJobSidebar] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [journeysForJob, setJourneysForJob] = useState<CVJourney[]>([]);
  const [showJobParserDialog, setShowJobParserDialog] = useState(false);
  const [pendingRoleData, setPendingRoleData] = useState<{ targetRole: string; seniorityLevel: string } | null>(null);
  const [skillGapAnalysis, setSkillGapAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [isLoadingSkillGap, setIsLoadingSkillGap] = useState(false);

  const analysisScore = Math.max(0, Math.min(100, state.surgeonAnalysis?.score ?? 0));
  const jdText =
    (typeof state.jobData?.description === 'string' && state.jobData.description) ||
    (typeof state.jobData?.jobDescription === 'string' && state.jobData.jobDescription) ||
    (typeof state.jobData?.jd === 'string' && state.jobData.jd) ||
    '';
  const isJDReferenced = jdText.trim().length > 0;
  const isMasterCV = mode === 'edit-master' || state.cvType === 'master';
  const isJourneyCV = state.cvType === 'journey';
  const isStandaloneCV = state.cvType === 'standalone';
  const scoreLabel = isMasterCV ? 'CV score' : (isJourneyCV ? 'ATS score' : 'CV score');
  const openIssuesCount = (state.fixAnnotations || []).filter((f) => f.status === 'open').length;

  // Extract ATS keywords from skill gap analysis
  const atsKeywords = useMemo(() => {
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
  }, [skillGapAnalysis]);

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
    if (!jobId || !userId) return;
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

  // Initialize based on mode
  useEffect(() => {
    // Prevent re-initialization if already initialized with same params
    const initKey = `${mode}-${cvId || 'no-cv'}`;
    if (initializedRef.current && 
        initializedRef.current.mode === mode && 
        initializedRef.current.cvId === cvId) {
      return;
    }

    const initializeEnhancer = async () => {
      if (mode === 'edit' || mode === 'edit-master' || mode === 'journey') {
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

          // Master CVs are always role-based: auto-derive role + seniority so Step 3 analysis is ready.
          if (resolvedCvType === 'master') {
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

          dispatch({ type: 'SET_MODE', payload: 'edit' });
          // Skip to Step 3 for editing
          goToStep(3);
          setCompletedSteps([1, 2]);
          
          // Mark as initialized
          initializedRef.current = { mode, cvId };
        } catch (error) {
          console.error('Failed to load CV:', error);
          alert('Failed to load CV. Redirecting to dashboard.');
          router.push('/dashboard?tab=cvs');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Create mode
        dispatch({ type: 'SET_MODE', payload: 'create' });
        goToStep(1);
        
        // Mark as initialized
        initializedRef.current = { mode, cvId };
      }
    };

    initializeEnhancer();
  }, [mode, cvId]);

  const handleStep1Complete = (cvData: UnifiedCVDataStructure) => {
    dispatch({ type: 'SET_CV_DATA', payload: cvData });
    setCompletedSteps([...completedSteps, 1]);
    
    // For create mode, set initial data when first data is entered
    if (mode === 'create') {
      initialCVDataRef.current = JSON.parse(JSON.stringify(cvData));
      initialCVTitleRef.current = state.cvTitle;
    }
    
    // Show role selector modal
    setShowRoleModal(true);
  };

  const handleRoleModalSubmit = async (data: {
    targetRole: string;
    seniorityLevel: string;
    jobDescription?: string;
    hasJD: boolean;
  }) => {
    setShowRoleModal(false);

    // Set role context
    setRoleContext(data.targetRole, data.seniorityLevel);

    // If JD provided, create journey
    if (data.hasJD && data.jobDescription) {
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
      // Set as standalone
      dispatch({ type: 'SET_CV_TYPE', payload: 'standalone' });
    }

    // Proceed to template selection
    goToStep(2);
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
          // Create job application from parsed data
          const jobResponse = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobTitle: parsedData.jobTitle || state.targetRole || 'Software Engineer',
              company: parsedData.company || 'Unknown Company',
              jobDescription: jobDescription,
              location: parsedData.location,
              jobUrl: parsedData.jobUrl,
              status: 'created'
            })
          });

          if (jobResponse.ok) {
            const jobResult = await jobResponse.json();
            const jobId = jobResult.data.jobApplication._id;
            const journeyId = jobResult.data.journey._id;

            // Update CV with journeyId and cvType if CV exists
            if (state.cvId) {
              try {
                await fetch(`/api/cvs/${state.cvId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    journeyId: journeyId,
                    cvType: 'journey'
                  })
                });
              } catch (cvError) {
                console.error('Error updating CV:', cvError);
              }
            }

            // Update context to journey type
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
          } else {
            // If job creation fails, just update jobData
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
        } catch (error) {
          console.error('Failed to convert standalone to journey:', error);
          // Fallback: just update jobData
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
      // Create job application from parsed data
      const jobResponse = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: parsedData.jobTitle || roleData.targetRole,
          company: parsedData.company || 'Unknown Company',
          jobDescription: parsedData.jobDescription || parsedData.description || '',
          location: parsedData.location,
          jobUrl: parsedData.jobUrl,
          status: 'created'
        })
      });

      if (!jobResponse.ok) throw new Error('Failed to create job');

      const jobResult = await jobResponse.json();
      const newJourneyId = jobResult.data.journey._id;
      const jobId = jobResult.data.jobApplication._id;

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
    } catch (error) {
      console.error('Failed to create journey from parsed job:', error);
      alert('Failed to create job. Please try again.');
      // Continue as standalone
      dispatch({ type: 'SET_CV_TYPE', payload: 'standalone' });
      goToStep(2);
    } finally {
      setShowJobParserDialog(false);
      setPendingRoleData(null);
    }
  };

  const handleStep2Complete = () => {
    setCompletedSteps([...completedSteps, 2]);
    
    // For create mode, update initial template when Step 2 completes
    if (mode === 'create' && state.selectedTemplate && !initialTemplateRef.current) {
      initialTemplateRef.current = state.selectedTemplate;
    }
    
    goToStep(3);
  };

  const handleStep3Complete = () => {
    setCompletedSteps([...completedSteps, 3]);
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
    return (
      result?.data?.cv?.id ||
      result?.data?.cv?._id ||
      result?.cv?.id ||
      result?.cv?._id ||
      result?.id ||
      null
    );
  };

  const handleSmartSave = async () => {
    if (saveStatus === 'saving') return;

    setSaveStatus('saving');
    setSaveError(null);
    dispatch({ type: 'SET_SAVING', payload: true });

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
      
      // If we're in edit mode or have a cvId, we should update, not create
      const shouldUpdate = isEditMode || effectiveCvId;
      
      if (isMasterCV && !effectiveCvId) {
        throw new Error('Cannot save Master CV: CV ID is missing. Please reload the page and try again.');
      }
      
      const response = await fetch(
        shouldUpdate && effectiveCvId ? `/api/cvs/${effectiveCvId}` : '/api/cvs',
        {
          method: shouldUpdate && effectiveCvId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to save');
      }

      const savedCvId = extractCvIdFromResponse(result);
      if (savedCvId) {
        dispatch({ type: 'SET_CV_ID', payload: savedCvId });
      }

      // Update initial data refs after successful save to reset unsaved changes tracking
      initialCVDataRef.current = JSON.parse(JSON.stringify(state.cvData));
      initialCVTitleRef.current = state.cvTitle;
      initialTemplateRef.current = state.selectedTemplate;

      setSaveStatus('success');

      if (isContinuing) {
        // Move to review after a successful save
        handleStep3Complete();
      } else if (isFinishing && savedCvId) {
        router.push(`/dashboard?tab=cvs&highlight=${savedCvId}`);
      }

      // Reset success state after a short delay (if we didn't navigate away)
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (error) {
      console.error('Save failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to save';
      setSaveError(message);
      setSaveStatus('error');
      dispatch({ type: 'SET_SAVE_ERROR', payload: message });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  };

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
      <header className="bg-[#141810] sticky top-0 z-40 shadow-sm shadow-black/10 dark:shadow-black/30 backdrop-blur-sm">
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
              {state.cvType && (
                <span className="px-2 py-0.5 bg-[color:var(--accent-primary)]/15 text-[color:var(--accent-primary)] rounded-full text-xs font-medium capitalize">
                  {state.cvType}
                </span>
              )}
            </div>


            {/* Actions - Right side */}
            <div className="flex items-center space-x-2">

              {/* Save button - only show on step 3 and 4 */}
              {(state.currentStep === 3 || state.currentStep === 4) && (
                <button
                  onClick={handleSmartSave}
                  disabled={saveStatus === 'saving'}
                  className="px-3 py-1.5 bg-[#80FF00] hover:bg-[#70e600] disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed text-black disabled:text-[color:var(--text-tertiary)] rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-md hover:shadow-lg hover:scale-105"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              )}
              
              {/* Save Status Indicator - Animated */}
              {(saveStatus === 'saving' || saveStatus === 'success') && (
                <SaveIndicator status={saveStatus} className="hidden sm:flex" />
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

      {/* Ribbon Step Indicator - Below Header */}
      <RibbonStepIndicator
        currentStep={state.currentStep}
        completedSteps={completedSteps}
        onStepClick={(step) => {
          if (completedSteps.includes(step)) {
            goToStep(step);
          }
        }}
      />

      {/* Content Area (Left Sticky Steps + Main Content) */}
      <div className="flex-1 min-h-0 flex overflow-hidden bg-[var(--bg-primary)] h-[calc(100vh-64px-80px)]">
        {/* Floating / Sticky vertical steps panel (desktop) */}
        <aside className="hidden lg:block w-52 flex-shrink-0 mt-2 mb-2 ml-2 rounded-xl overflow-y-auto overscroll-contain bg-[#141810] border border-white/10 h-[calc(100vh-64px-80px)]">
          <div className="flex flex-col h-full p-3">
            <div className="flex-1 space-y-3 overflow-y-auto">
              {/* Job Card - Show for journey-based CVs */}
              {state.currentStep === 3 && state.cvType === 'journey' && state.jobData && (
                <JobCard
                  job={state.jobData}
                  onClick={async () => {
                    const jobId = state.jobData.id || state.jobData._id;
                    if (!jobId || !userId) return;

                    setSelectedJob(state.jobData);
                    
                    // Load journeys for this job
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
                    
                    setShowJobSidebar(true);
                  }}
                />
              )}

              {/* ATS Check Card - Redesigned (Step 3) */}
              {state.currentStep === 3 && (
                <div className="bg-[#1a230f] rounded-xl shadow-sm shadow-black/10 dark:shadow-black/30 border border-white/5 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[color:var(--accent-primary)]" />
                      <InfoTooltip content={isMasterCV || isStandaloneCV
                        ? "CVCircle Score analyzes your resume's overall quality, structure, and best practices for professional CVs."
                        : "ATS (Applicant Tracking System) Check analyzes how well your resume matches the job requirements and ATS software requirements."}>
                        <div className="text-sm font-semibold text-[color:var(--text-primary)] cursor-help">
                          {isMasterCV || isStandaloneCV ? 'CVCircle Score' : 'ATS Check*'}
                        </div>
                      </InfoTooltip>
                    </div>
                    <button
                      onClick={() => setIsScoreAnalysisCompact(!isScoreAnalysisCompact)}
                      className="p-1 rounded hover:bg-white/5 transition-colors"
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
                    <div className="bg-[#252a1f] rounded-full p-1 flex items-center gap-2">
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

                    {!isScoreAnalysisCompact && (
                      <>
                        {/* Missing Skills Section - Only show for non-Master CVs with job description */}
                        {!isMasterCV && (
                        <div>
                            <div className="space-y-2">
                              {/* Missing Skills Header */}
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <InfoTooltip content="Skills from the job description that are missing from your resume. Red dot indicates important skills that need to be added.">
                                  <span className="text-[10px] font-semibold text-[color:var(--text-primary)] uppercase cursor-help">Missing Skills</span>
                              </InfoTooltip>
                            </div>

                            {/* Keywords Table Header */}
                            <div className="grid grid-cols-3 gap-1 text-[9px] font-medium text-[color:var(--text-secondary)] px-1">
                              <span>Keyword</span>
                              <span className="text-center">In Resume</span>
                              <span className="text-center">In Job Ad</span>
                            </div>

                              {/* Keywords Preview - Show top 5 missing skills from skill gap analysis if available, otherwise from fix annotations */}
                              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                {atsKeywords.length > 0 ? (
                                  // Show top 5 missing skills from skill gap analysis
                                  atsKeywords
                                    .filter(kw => !kw.inResume)
                                    .slice(0, 5)
                                    .map((kw, idx) => (
                                      <div key={idx} className="grid grid-cols-3 gap-1 items-center py-1 px-1 rounded bg-[#252a1f] text-[9px]">
                                        <span className="text-[color:var(--text-primary)] truncate" title={kw.keyword}>
                                          {kw.keyword}
                                        </span>
                                        <div className="flex justify-center">
                                          <XCircle className="w-3 h-3 text-red-400" />
                                        </div>
                                        <span className="text-center text-[color:var(--text-secondary)]">{kw.inJobAd}</span>
                                      </div>
                                    ))
                                ) : (state.fixAnnotations || [])
                                .filter(f => f.category === 'keywords' && f.status === 'open')
                                .slice(0, 3)
                                .map((fix, idx) => (
                                  <div key={idx} className="grid grid-cols-3 gap-1 items-center py-1 px-1 rounded bg-[#252a1f] text-[9px]">
                                    <span className="text-[color:var(--text-primary)] truncate">{fix.issue?.split(' ').slice(0, 2).join(' ') || 'Keyword'}</span>
                                    <div className="flex justify-center">
                                      <span className="text-red-400">✕</span>
                                    </div>
                                    <span className="text-center text-[color:var(--text-secondary)]">1</span>
                                  </div>
                                ))}
                                {(atsKeywords.length === 0 || atsKeywords.filter(kw => !kw.inResume).length === 0) && (state.fixAnnotations || []).filter(f => f.category === 'keywords').length === 0 && (
                                <div className="text-[9px] text-[color:var(--text-tertiary)] text-center py-2 italic">
                                    {isLoadingSkillGap 
                                      ? 'Analyzing keywords...' 
                                      : isJDReferenced 
                                        ? (atsKeywords.length > 0 ? 'All skills are covered!' : 'No keywords found')
                                        : 'Add a job description to see keywords'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        )}

                        {/* Issues Count Badge */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-[color:var(--text-secondary)]">{openIssuesCount} suggestions available</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* View Report Button */}
                  <div className="px-3 pb-3">
                    <InfoTooltip content="Review mode highlights suggestions directly on your CV. Turn it on to see inline fixes and improvements.">
                      <button
                        onClick={() => dispatch({ type: 'SET_REVIEW_MODE', payload: !state.reviewMode })}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors mb-2 ${
                          state.reviewMode
                            ? 'bg-[#80FF00] text-black hover:bg-[#70e600]'
                            : 'bg-[#2a3520] text-[color:var(--text-secondary)] hover:bg-[#353f28]'
                        }`}
                      >
                        Review mode: {state.reviewMode ? 'ON' : 'OFF'}
                      </button>
                    </InfoTooltip>

                  <button
                    onClick={async () => {
                      if (isSidebarAnalyzing) return;

                      // NOTE: dispatch() is async; use local variables so the API call always receives non-empty role context.
                      let role = state.targetRole;
                      let seniority = state.seniorityLevel;
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

                      // Check for JD requirement for standalone CVs
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
                        <span>View report</span>
                      </>
                    )}
                  </button>
                  </div>
                </div>
              )}

            {/* Vertical Step Indicator - Hidden on desktop since we have ribbon, shown on mobile if needed */}
            <div className="bg-[#1a230f] rounded-xl shadow-sm shadow-black/10 dark:shadow-black/30 p-2.5 border border-white/5 hidden">
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
                      {/* View Profile */}
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

                      {/* Settings */}
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
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-lime-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          type="button"
                          aria-label="Toggle theme"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
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
                    src={getUserAvatar(userData)}
                    name={getUserDisplayName(userData)}
                    size="sm"
                    className="cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all flex-shrink-0"
                  />
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {getUserDisplayName(userData)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userData?.email || ''}
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
        <main className="flex-1 min-h-0 overflow-hidden bg-[#1a230f]">
          <div className="w-full h-full min-h-0 box-border overflow-hidden flex flex-col">
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
                  <Step1Parser onComplete={handleStep1Complete} />
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
      />

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
    </div>
  );
}

