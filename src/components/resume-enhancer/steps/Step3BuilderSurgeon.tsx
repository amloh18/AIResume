'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef, useMemo, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';
import {
  Sparkles,
  Component, Eye, Target, ZoomIn, ZoomOut, Plus, Shuffle, Palette, X
} from 'lucide-react';

// Import CV Builder form components

import RoleProfilerModal from '@/components/resume-enhancer/RoleProfilerModal';
import SurgeonReportModal from '@/components/resume-enhancer/SurgeonReportModal';
import FieldFixOverlay from '@/components/resume-enhancer/annotations/FieldFixOverlay';
import { BuilderPreview } from '@/components/preview/BuilderPreview';
import { validateCVPreview } from '@/lib/validation/cv-preview-validator';
import JobParserDialog from '@/components/dashboard/jobs/JobParserDialog';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { AnimatedScore } from '@/components/ui/AnimatedScore';
import { useATS } from '@/contexts/ATSContext';

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
import AddSectionModal from '@/components/resume-enhancer/AddSectionModal';
import TemplateSelector from '@/components/resume-enhancer/TemplateSelector';
import { AnimatePresence, motion } from 'framer-motion';
import { ITemplate } from '@/types/template';
import { gsap } from 'gsap';

type ViewMode = 'edit' | 'preview' | 'recruiter' | 'ats';




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
  openAddSection: () => void;
  openTemplateSelector: () => void;
  activeSection: string;
}



const Step3BuilderSurgeon = forwardRef<Step3BuilderSurgeonRef, Step3BuilderSurgeonProps>(
  ({ onComplete, onActiveSectionChange }, ref) => {
    const { state, dispatch, convertToJourney, loadCV, getAnalysisModeInfo, setTemplate, setAtsScoreCap } = useResumeEnhancer();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [jdText, setJdText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showRoleProfiler, setShowRoleProfiler] = useState(false);
    const [showJobParserDialog, setShowJobParserDialog] = useState(false);
    const [showAddSectionModal, setShowAddSectionModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const templateModalRef = useRef<HTMLDivElement>(null);
    const templateModalContentRef = useRef<HTMLDivElement>(null);
    const [totalPages, setTotalPages] = useState(1);

    const cvPreviewRef = useRef<HTMLDivElement>(null);
    const sidePanelRef = useRef<HTMLDivElement>(null);
    const pillRef = useRef<FloatingPulsePillHandle>(null);

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

    const handleViewModeChange = (mode: ViewMode) => {
      setViewMode(mode);
    };

    const handleTemplateSelect = (template: ITemplate) => {
      setTemplate(template);
      dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: template });
      setShowTemplateModal(false);
    };

    // GSAP template modal animation
    useEffect(() => {
      if (!showTemplateModal || !templateModalRef.current || !templateModalContentRef.current) return;

      const tl = gsap.timeline();
      tl.fromTo(templateModalRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      tl.fromTo(templateModalContentRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.1)' },
        '-=0.15'
      );
    }, [showTemplateModal]);

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

    // Journey CVs use job description for analysis - don't require targetRole/seniorityLevel
    // Only standalone/master CVs need targetRole/seniorityLevel
    const isJourneyCV = state.cvType === 'journey' && (state.jobData || state.journeyId);
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
      // If we have a journey CV but no JD, prompt user
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
      openAddSection: () => setShowAddSectionModal(true),
      openTemplateSelector: () => setShowTemplateModal(true),
      activeSection: 'personal'
    }));



    if (!state.cvData) {
      return (
        <div className="flex flex-col h-[calc(100vh-64px)] items-center justify-center bg-gray-50 dark:bg-[#1a230f]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#80FF00] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Initializing Builder...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[calc(100vh-64px)] min-h-0 relative overflow-hidden bg-gray-50 dark:bg-[#1a230f]">
        {/* Main Container */}
        <div className="flex-1 h-full flex overflow-hidden relative px-3 pb-3 pt-3">
          {/* CV Preview — pill is rendered inside the toolbar */}
          <div className="flex-1 min-h-0 relative flex flex-col bg-[var(--bg-secondary)] rounded-xl overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30">
            <div ref={cvPreviewRef} className="flex-1 min-h-0 overflow-hidden">
              <BuilderPreview
                cvData={state.cvData}
                template={state.selectedTemplate as any}
                mode="edit"
                pageFormat={pageFormat}
                showToolbar={true}
                initialZoom={1}
                toolbarRightSlot={
                  <FloatingPulsePill
                    ref={pillRef}
                    atsResult={atsAnalysis ? {
                      score: atsAnalysis.score,
                      atsScore: atsAnalysis.score,
                      audit_report: atsAnalysis.audit_report,
                      suggestions: atsAnalysis.suggestions,
                      details: {
                        matchedKeywords: atsAnalysis.matchedKeywords || [],
                        missingKeywords: atsAnalysis.missingKeywords || [],
                        experienceYears: atsAnalysis.factorBreakdown?.experienceLength?.years || 0,
                        educationLevel: '',
                        formatIssues: atsAnalysis.factorBreakdown?.formatting?.issues || []
                      }
                    } : null}
                    isLoading={isAnalyzing}
                    isScanning={isAnalyzing}
                    analysisMode={analysisModeInfo.mode}
                    validationResult={validationResult}
                    onIssueHover={(fieldPath) => setHighlightedField(fieldPath)}
                    className=""
                    isSidebarOpen={false}
                    onToggleSidebar={() => dispatch({ type: 'SET_SHOW_SURGEON_OVERLAY', payload: !state.showSurgeonOverlay })}
                    onFixATS={() => handleRunAnalysis()}
                    onOpenReport={() => console.log("Open Report Clicked")}
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    onAddKeyword={handleAddKeyword}
                    onApplyFix={applyAnnotation}
                  />
                }
                sidePanelRef={sidePanelRef}
                highlightedField={highlightedField}
                fixAnnotations={state.fixAnnotations || []}
                onAnnotationClick={(fixId) => pillRef.current?.focusFix(fixId)}
                onCVDataChange={(updatedData) => {
                  dispatch({ type: 'SET_CV_DATA', payload: { ...state.cvData, ...updatedData } });
                }}
                onSectionClick={(sectionId) => {
                  console.log('Opening editor for section:', sectionId);
                  const sectionElement = document.querySelector(`[data-section-id="${sectionId}"]`);
                  const target = sectionElement || document.querySelector('.builder-preview');
                  const rect = target?.getBoundingClientRect();
                  const viewportWidth = window.innerWidth;
                  const editorWidth = 500;
                  const gap = 24;

                  let left = (rect?.right || viewportWidth * 0.6) + gap;
                  let alignment: 'left' | 'right' = 'left';

                  if (left + editorWidth > viewportWidth - 20) {
                    left = (rect?.left || 80) - editorWidth - gap;
                    alignment = 'right';
                  }

                  setEditorPosition({
                    top: Math.max(88, rect?.top || 120),
                    left,
                    height: rect?.height || 400,
                    alignment
                  });
                  setActiveEditorSectionId(sectionId);
                }}
              />
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

        {/* Job Parser Dialog (Magic Paste) for standalone CVs */}
        <JobParserDialog
          isOpen={showJobParserDialog}
          onClose={() => setShowJobParserDialog(false)}
          customDescription="Add a Job Description for ATS check. This helps us provide more accurate analysis tailored to your target role by matching your CV against the job requirements."
          showSaveAndTrack={state.cvType === 'standalone'} // Show "Save and Track" only for standalone CVs
          onParseComplete={(parsedData) => {
            // Extract job description from parsed data
            const jobDescription = parsedData.jobDescription || parsedData.jobDescriptionRaw || '';

            if (jobDescription) {
              setJdText(jobDescription);
              setShowJobParserDialog(true);

              // Update jobData in state with the parsed information
              dispatch({
                type: 'SET_JOB_DATA',
                payload: {
                  ...state.jobData,
                  jobTitle: parsedData.jobTitle || state.targetRole,
                  title: parsedData.jobTitle || state.targetRole,
                  company: parsedData.company || 'Unknown Company',
                  description: jobDescription,
                  jobDescription: jobDescription,
                  location: parsedData.location || ''
                }
              });
            }

            setShowJobParserDialog(false);
          }}
          onSaveAndTrack={async (parsedData) => {
            // Handle "Save and Track" - Save job and link CV to journey
            try {
              const jobDescription = parsedData.jobDescription || parsedData.jobDescriptionRaw || '';

              // EDGE CASE 2: Verify CV is standalone before proceeding
              if (!jobDescription) {
                alert('Missing job description. Please provide a job description to save and track.');
                return;
              }

              // WORKAROUND: Ensure CV is saved first if cvId is missing
              // This handles the case where CV was parsed but not saved yet
              let effectiveCvId: string | undefined | null = state.cvId;

              if (!effectiveCvId) {
                console.log('💾 CV not saved yet, saving CV first before saving job...');
                try {
                  // Calculate completion percentage
                  const hasPersonalInfo = !!(state.cvData?.basics?.name || state.cvData?.basics?.email);
                  const hasWorkExperience = (state.cvData?.work?.length || 0) > 0;
                  const hasEducation = (state.cvData?.education?.length || 0) > 0;
                  const hasSkills = (state.cvData?.skills?.length || 0) > 0;
                  const completionPercentage = [hasPersonalInfo, hasWorkExperience, hasEducation, hasSkills].filter(Boolean).length * 25;

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

                  const cvResponse = await fetch('/api/cvs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });

                  const cvResult = await cvResponse.json().catch(() => ({}));

                  if (!cvResponse.ok) {
                    throw new Error(cvResult?.error || 'Failed to save CV');
                  }

                  effectiveCvId = cvResult?.data?.cv?.id || cvResult?.data?.cv?._id || cvResult?.cv?.id || cvResult?.cv?._id || cvResult?.id || null;

                  if (effectiveCvId) {
                    console.log('✅ CV saved successfully with ID:', effectiveCvId);
                    dispatch({ type: 'SET_CV_ID', payload: effectiveCvId });
                  } else {
                    throw new Error('CV saved but no ID returned');
                  }
                } catch (saveError: any) {
                  console.error('Failed to save CV before creating job:', saveError);
                  const message = sanitizeErrorMessage(saveError, 'Failed to save CV. Please try again.');
                  alert(message);
                  return;
                }
              }

              // EDGE CASE 10: Set timeout for request (30 seconds)
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000);

              try {
                // Step 1: Save the job with cvId - this will link CV before document creation
                const jobResponse = await fetch('/api/jobs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jobTitle: parsedData.jobTitle || state.targetRole || 'Software Engineer',
                    company: parsedData.company || 'Unknown Company',
                    jobDescription: jobDescription,
                    location: parsedData.location || '',
                    jobUrl: parsedData.jobUrl || '',
                    salary: parsedData.salary,
                    status: 'created', // Start at 'created' stage
                    cvId: effectiveCvId // Pass effectiveCvId to link CV before journey auto-creates CV
                  }),
                  signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!jobResponse.ok) {
                  const errorData = await jobResponse.json().catch(() => ({}));
                  const errorMessage = errorData.error || errorData.message || 'Failed to save job';

                  // EDGE CASE 9: Check for tier/plan errors
                  if (errorMessage.includes('credit') || errorMessage.includes('limit')) {
                    throw new Error('This feature requires a Pro membership. Please upgrade your plan to continue.');
                  }
                  throw new Error(errorMessage);
                }

                const jobResult = await jobResponse.json();
                const jobId = jobResult.data?.jobApplication?._id || jobResult.data?.id;
                const journeyId = jobResult.data?.journey?._id;

                // EDGE CASE 6: Only proceed if journey was created successfully
                if (!jobId) {
                  throw new Error('Job saved but no job ID returned');
                }

                if (!journeyId) {
                  throw new Error('Journey creation failed');
                }

                // Step 2: Update context with journey information
                // CV is already linked by the job creation API, so we just update context
                convertToJourney(journeyId, {
                  description: jobDescription,
                  title: parsedData.jobTitle || state.targetRole,
                  jobTitle: parsedData.jobTitle || state.targetRole,
                  company: parsedData.company || 'Unknown Company',
                  id: jobId,
                  _id: jobId,
                  location: parsedData.location
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

                // Update jobData in state
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

                setJdText(jobDescription);
                setShowJobParserDialog(false);

                // Show success message using toast instead of alert
                toast.success(`Job saved and tracking started! Now tracking: ${parsedData.jobTitle || state.targetRole} at ${parsedData.company || 'Unknown Company'}`);

                // Reload CV with journey context dynamically (without navigating away)
                try {
                  // Fetch the updated CV with journey data
                  const cvResponse = await fetch(`/api/cvs/${state.cvId || effectiveCvId}`);
                  if (cvResponse.ok) {
                    const cvResult = await cvResponse.json();
                    const updatedCV = cvResult.data.cv;

                    // Reload CV with journey context using loadCV function
                    const finalJobData = updatedCV.jobData || {
                      id: jobId,
                      _id: jobId,
                      jobTitle: parsedData.jobTitle || state.targetRole,
                      title: parsedData.jobTitle || state.targetRole,
                      company: parsedData.company || 'Unknown Company',
                      description: jobDescription,
                      jobDescription: jobDescription,
                      location: parsedData.location
                    };

                    loadCV({
                      cvId: updatedCV.id,
                      cvType: 'journey',
                      cvTitle: updatedCV.title,
                      cvData: updatedCV.cvData,
                      template: updatedCV.template,
                      journeyId: journeyId,
                      jobData: finalJobData
                    });

                    // Journey CVs use job description for analysis - no need to set targetRole/seniorityLevel

                    // Update URL params to reflect journey mode
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('mode', 'journey');
                    if (state.cvId || effectiveCvId) params.set('cvId', state.cvId || effectiveCvId);
                    params.set('journeyId', journeyId);
                    router.replace(`${pathname}?${params.toString()}`);

                    console.log('✅ CV reloaded with journey context dynamically');
                  }
                } catch (reloadError) {
                  console.error('Failed to reload CV with journey context:', reloadError);
                  // Fallback: just update the state we have
                  dispatch({ type: 'SET_CV_TYPE', payload: 'journey' });
                  dispatch({ type: 'SET_JOURNEY_ID', payload: journeyId });
                }

              } catch (fetchError: any) {
                clearTimeout(timeoutId);

                // EDGE CASE 10: Handle network timeout
                if (fetchError.name === 'AbortError') {
                  throw new Error('Operation timed out. Please try again.');
                }
                throw fetchError;
              }
            } catch (error) {
              // EDGE CASE 3: Job creation failure - don't update state
              console.error('Failed to save and track:', error);
              const message = sanitizeErrorMessage(error, 'Failed to save and track. Please try again.');
              alert(message);
              // Don't update local state if operation fails - CV remains standalone
            }
          }}
        />

        {/* Add Section Modal */}
        <AddSectionModal
          isOpen={showAddSectionModal}
          onClose={() => setShowAddSectionModal(false)}
          onAddSection={addNewSection}
          existingSections={
            state.cvData.structure?.sections
              ?.filter(s => s.visible !== false)
              .map(s => s.type) || []
          }
        />

        {/* Template Selector Modal */}
        {showTemplateModal && (
          <div
            ref={templateModalRef}
            className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
            onClick={() => setShowTemplateModal(false)}
          >
            <div
              ref={templateModalContentRef}
              className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
                  Select Template
                </h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[color:var(--text-primary)]" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <TemplateSelector
                  selectedTemplate={state.selectedTemplate}
                  onTemplateSelect={handleTemplateSelect}
                  cvData={state.cvData}
                />
              </div>
            </div>
          </div>
        )}

      </div >
    );
  });

Step3BuilderSurgeon.displayName = 'Step3BuilderSurgeon';

export default Step3BuilderSurgeon;

