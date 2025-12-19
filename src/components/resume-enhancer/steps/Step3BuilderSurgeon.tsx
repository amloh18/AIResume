'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import {
  User,
  Briefcase,
  GraduationCap,
  Code,
  FolderOpen,
  Award,
  Globe,
  Heart,
  Target,
  Sparkles,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

// Import CV Builder form components from Studio
import PersonalInfoForm from '@/components/studio/forms/PersonalInfoForm';
import WorkExperienceSection from '@/components/studio/forms/WorkExperienceSection';
import EducationSection from '@/components/studio/forms/EducationSection';
import SkillsSection from '@/components/studio/forms/SkillsSection';
import ProjectsSection from '@/components/studio/forms/ProjectsSection';
import CertificatesSection from '@/components/studio/forms/CertificatesSection';
import LanguagesSection from '@/components/studio/forms/LanguagesSection';
import VolunteerSection from '@/components/studio/forms/VolunteerSection';
import RoleProfilerModal from '@/components/resume-enhancer/RoleProfilerModal';
import SurgeonReportModal from '@/components/resume-enhancer/SurgeonReportModal';
import FieldFixOverlay from '@/components/resume-enhancer/annotations/FieldFixOverlay';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';

// CV Surgeon service
import { CVSurgeonService, SurgicalFix } from '@/lib/services/cv-surgeon-service';
import { logResumeEnhancerEvent } from '@/lib/services/resumeEnhancerLogClient';
import { inferRoleContextFromCVData } from '@/lib/utils/resumeEnhancerRoleInference';
import { getAddableCVSections, getVisibleCVSections } from '@/lib/selectors/cv-section-selectors';
import { getSectionIcon } from '@/lib/utils/cv-section-selectors';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { migrateLegacyCV } from '@/lib/migrations/cv-structure-migration';
import { InfoTooltip, HelpTooltip, ProTip } from '@/components/ui/tooltip';

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

const sections = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'work', label: 'Work Experience', icon: Briefcase },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'skills', label: 'Skills', icon: Code },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'languages', label: 'Languages', icon: Globe },
  { id: 'volunteer', label: 'Volunteer', icon: Heart }
];

const Step3BuilderSurgeon = forwardRef<Step3BuilderSurgeonRef, Step3BuilderSurgeonProps>(
  ({ onComplete, onActiveSectionChange }, ref) => {
  const { state, dispatch, convertToJourney } = useResumeEnhancer();
  const [activeSection, setActiveSection] = useState('personal');
  const [jdText, setJdText] = useState('');
  const [showJourneyBanner, setShowJourneyBanner] = useState(false);
  const [showJDInput, setShowJDInput] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [fixes, setFixes] = useState<SurgicalFix[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isSurgeonOpen, setIsSurgeonOpen] = useState(false);
  const [aiAnalysisPreview, setAiAnalysisPreview] = useState<{ score?: number; benefits?: string[] } | null>(null);
  const [aiPreviewStatus, setAiPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [aiPreviewError, setAiPreviewError] = useState<string | null>(null);
  const [showChatbotCard, setShowChatbotCard] = useState(true);
  const [showRoleProfiler, setShowRoleProfiler] = useState(false);
  const [showAddSectionTiles, setShowAddSectionTiles] = useState(false);

  const isRoleReady = Boolean(state.targetRole && state.seniorityLevel);

  const activeAnnotation: FixAnnotation | undefined = state.activeFixId
    ? state.fixAnnotations.find((f) => f.id === state.activeFixId && f.status === 'open')
    : undefined;

  const sectionPrefix = (sectionId: string) => {
    switch (sectionId) {
      case 'personal':
        return 'basics.';
      case 'work':
        return 'work[';
      case 'education':
        return 'education[';
      case 'skills':
        return 'skills[';
      case 'projects':
        return 'projects[';
      case 'certificates':
        return 'certificates[';
      case 'languages':
        return 'languages[';
      case 'volunteer':
        return 'volunteer[';
      default:
        return '';
    }
  };

  const getOpenFixesForSection = (sectionId: string) => {
    const prefix = sectionPrefix(sectionId);
    return (state.fixAnnotations || []).filter((f) => f.status === 'open' && (prefix ? f.fieldPath.startsWith(prefix) : false));
  };

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

  // When review mode is enabled and a fix is active, auto-scroll to the matching section.
  useEffect(() => {
    if (!state.reviewMode || !activeAnnotation?.fieldPath) return;
    const fp = activeAnnotation.fieldPath;
    const targetSection =
      fp.startsWith('basics.') ? 'personal' :
      fp.startsWith('work[') ? 'work' :
      fp.startsWith('education[') ? 'education' :
      fp.startsWith('skills[') ? 'skills' :
      fp.startsWith('projects[') ? 'projects' :
      fp.startsWith('certificates[') ? 'certificates' :
      fp.startsWith('languages[') ? 'languages' :
      fp.startsWith('volunteer[') ? 'volunteer' :
      null;
    if (!targetSection) return;
    // Ensure section is expanded
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.delete(targetSection);
      return next;
    });
    scrollToSection(targetSection);
  }, [state.reviewMode, state.activeFixId]);

  // Sync JD text with job data when it exists
  useEffect(() => {
    if (state.jobData) {
      const jobDescription = 
        state.jobData.jobDescription || 
        state.jobData.description || 
        state.jobData.jd || 
        '';
      
      if (jobDescription && !jdText) {
        setJdText(jobDescription);
        setShowJDInput(true);
      }
    }
  }, [state.jobData]);

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

  // Detect JD paste for standalone CVs
  useEffect(() => {
    if (state.cvType === 'standalone' && jdText.trim().length > 100) {
      setShowJourneyBanner(true);
    }
  }, [jdText, state.cvType]);

  // Auto-analyze CV when data is available to show preview (only once when component mounts)
  useEffect(() => {
    if (!isSurgeonOpen && !aiAnalysisPreview && aiPreviewStatus === 'idle' && state.targetRole && state.seniorityLevel && state.cvData) {
      // Quick preview analysis
      const quickAnalysis = async () => {
        setAiPreviewStatus('loading');
        setAiPreviewError(null);
        try {
          const result = await CVSurgeonService.analyzeCV(
            state.cvData,
            state.targetRole,
            state.seniorityLevel,
            state.jobData || (jdText ? { description: jdText } : undefined)
          );
          setAiAnalysisPreview({
            score: result.score,
            benefits: result.fixes.slice(0, 3).map(fix => fix.issue)
          });
          setAiPreviewStatus('ready');
        } catch (error) {
          console.error('Preview analysis failed:', error);
          setAiPreviewStatus('error');
          setAiPreviewError(error instanceof Error ? error.message : 'Preview analysis failed');
        }
      };
      quickAnalysis();
    }
  }, [state.cvData, state.targetRole, state.seniorityLevel, aiPreviewStatus, isSurgeonOpen, aiAnalysisPreview]);

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
      // Use cache-aware analysis to avoid unnecessary AI token usage
      const result = await CVSurgeonService.analyzeCVWithCache(
        state.cvData,
        state.targetRole,
        state.seniorityLevel,
        state.cvId,
        undefined, // userId will be passed from context if available
        state.jobData || (jdText ? { description: jdText } : undefined)
      );

      setMatchScore(result.score);
      setFixes(result.fixes);
      dispatch({ type: 'SET_SURGEON_ANALYSIS', payload: { score: result.score, fixes: result.fixes } });
      dispatch({ type: 'SET_FIX_ANNOTATIONS', payload: result.annotations });
      setAiAnalysisPreview({
        score: result.score,
        benefits: result.fixes.slice(0, 3).map(fix => fix.issue)
      });
      setAiPreviewStatus('ready');
      setAiPreviewError(null);

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
      setAiPreviewStatus('error');
      setAiPreviewError(error instanceof Error ? error.message : 'Analysis failed');
      alert('Failed to analyze CV. Please try again.');
    } finally {
      setIsAnalyzing(false);
      dispatch({ type: 'SET_ANALYZING', payload: false });
    }
  };

  const handleApplyFix = (fix: SurgicalFix) => {
    // Apply the fix to CV data
    const updatedData = CVSurgeonService.applySurgicalFix(state.cvData, fix);
    dispatch({ type: 'SET_CV_DATA', payload: updatedData });
    
    // Remove the applied fix from the list
    setFixes(fixes.filter(f => f !== fix));
    logResumeEnhancerEvent({
      action: 'resume_enhancer_fix_applied',
      resourceType: 'cv',
      resourceId: state.cvId,
      metadata: { fixId: fix.id, section: fix.section, fieldPath: (fix as any).fieldPath }
    });
  };

  const handleApplyAllFixes = () => {
    logResumeEnhancerEvent({
      action: 'resume_enhancer_apply_all_clicked',
      resourceType: 'cv',
      resourceId: state.cvId,
      metadata: { fixesCount: fixes.length }
    });
    // Apply all fixes sequentially
    let updatedData = state.cvData;
    fixes.forEach(fix => {
      updatedData = CVSurgeonService.applySurgicalFix(updatedData, fix);
    });
    
    // Update CV data with all fixes applied
    dispatch({ type: 'SET_CV_DATA', payload: updatedData });
    
    // Clear all fixes from the list
    setFixes([]);
  };

  const handleConvertToJourney = async () => {
    if (!jdText.trim()) return;

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
              jobDescription: jdText
            })
          });

          if (response.ok) {
            dispatch({ 
              type: 'SET_JOB_DATA', 
              payload: { 
                ...state.jobData, 
                jobDescription: jdText,
                description: jdText
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
    if (state.cvType === 'master') {
      alert('Master CVs are role-based and cannot be linked to specific jobs. Please create a journey-based CV instead.');
      return;
    }

    try {
      // Try to extract company name from JD
      let companyName = 'Unknown Company';
      const jdLower = jdText.toLowerCase();
      
      // Common patterns: "at Company Name", "Company Name is", "Company Name seeks", etc.
      const companyPatterns = [
        /(?:at|with|from)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+is|\s+seeks|\s+looking|\s+seeking|\.|$)/i,
        /^([A-Z][A-Za-z0-9\s&]+?)\s+(?:is|seeks|looking|seeking)/i,
        /company[:\s]+([A-Z][A-Za-z0-9\s&]+?)(?:\s|$)/i
      ];
      
      for (const pattern of companyPatterns) {
        const match = jdText.match(pattern);
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
          jobDescription: jdText,
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
        description: jdText, 
        title: state.targetRole,
        jobTitle: state.targetRole,
        company: companyName,
        id: jobId,
        _id: jobId
      });
      setShowJourneyBanner(false);
      
      // Show success message
      alert(`Job tracking created! Now tracking: ${state.targetRole} at ${companyName}`);
    } catch (error) {
      console.error('Failed to convert to journey:', error);
      alert(`Failed to create journey: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const updateCVData = (updates: Partial<typeof state.cvData>) => {
    dispatch({ type: 'SET_CV_DATA', payload: { ...state.cvData, ...updates } });
  };

  const emptyBasics = {
    name: '',
    label: '',
    image: '',
    email: '',
    phone: '',
    url: '',
    summary: '',
    location: { address: '', postalCode: '', city: '', countryCode: '', region: '' },
    profiles: [] as Array<{ network: string; username: string; url: string }>
  };

  const getBasics = () => (state.cvData.basics ? state.cvData.basics : emptyBasics);

  const updateBasicsField = (field: string, value: any) => {
    const basics = getBasics();
    if (field === 'location') {
      updateCVData({ basics: { ...basics, location: value } });
      return;
    }
    if (field === 'profiles' || field === 'basics.profiles') {
      updateCVData({ basics: { ...basics, profiles: value } });
      return;
    }
    updateCVData({ basics: { ...basics, [field]: value } as any });
  };

  const addEducation = () => {
    const next = [
      ...(state.cvData.education || []),
      { institution: '', url: '', area: '', studyType: '', startDate: '', endDate: '', score: '', courses: [], description: '' }
    ];
    updateCVData({ education: next });
  };
  const removeEducation = (index: number) => {
    updateCVData({ education: (state.cvData.education || []).filter((_, i) => i !== index) });
  };

  const addSkills = () => {
    updateCVData({ skills: [...(state.cvData.skills || []), { category: '', skills: [] }] });
  };
  const removeSkills = (index: number) => {
    updateCVData({ skills: (state.cvData.skills || []).filter((_, i) => i !== index) });
  };

  const addProject = () => {
    updateCVData({
      projects: [
        ...(state.cvData.projects || []),
        { name: '', startDate: '', endDate: '', description: '', highlights: [], keywords: [], url: '' }
      ]
    });
  };
  const removeProject = (index: number) => {
    updateCVData({ projects: (state.cvData.projects || []).filter((_, i) => i !== index) });
  };

  const addCertificate = () => {
    updateCVData({
      certificates: [...(state.cvData.certificates || []), { name: '', date: '', issuer: '', url: '', description: '' }]
    });
  };
  const removeCertificate = (index: number) => {
    updateCVData({ certificates: (state.cvData.certificates || []).filter((_, i) => i !== index) });
  };

  const addLanguage = () => {
    updateCVData({ languages: [...(state.cvData.languages || []), { language: '', fluency: '' }] });
  };
  const removeLanguage = (index: number) => {
    updateCVData({ languages: (state.cvData.languages || []).filter((_, i) => i !== index) });
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
        setExpandedSections(expanded => {
          const newExpanded = new Set(expanded);
          newExpanded.add(sectionId);
          return newExpanded;
        });
      } else {
        newSet.add(sectionId);
        setExpandedSections(expanded => {
          const newExpanded = new Set(expanded);
          newExpanded.delete(sectionId);
          return newExpanded;
        });
      }
      return newSet;
    });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
      onActiveSectionChange?.(sectionId);
    }
  };

  // Toggle section visibility (hide/show in CV)
  const handleToggleSectionVisibility = (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Don't allow hiding personal_header
    if (sectionId === 'personal' || sectionId === 'personal_header') {
      return;
    }

    const updatedData = { ...state.cvData };

    // Map sidebar IDs to structure types
    const sidebarToTypeMap: Record<string, string> = {
      'personal': 'personal_header',
      'work': 'work_experience',
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

    const structureType = sidebarToTypeMap[sectionId] || sectionId;

    // Toggle visibility in structure
    if (updatedData.structure?.sections) {
      updatedData.structure = {
        ...updatedData.structure,
        sections: updatedData.structure.sections.map(section => {
          if (section.type === structureType) {
            return { ...section, visible: !section.visible };
          }
          return section;
        })
      };
    }

    dispatch({ type: 'SET_CV_DATA', payload: updatedData });
  };

  // Get section visibility status
  const getSectionVisibility = (sectionId: string): boolean => {
    if (!state.cvData?.structure?.sections) return true;
    
    const sidebarToTypeMap: Record<string, string> = {
      'personal': 'personal_header',
      'work': 'work_experience',
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

    const structureType = sidebarToTypeMap[sectionId] || sectionId;
    const section = state.cvData.structure.sections.find(s => s.type === structureType);
    return section?.visible !== false;
  };

  // Get visible sections from CV data structure (ensuring migration)
  const cvDataWithStructure = React.useMemo(() => {
    if (!state.cvData) return null;
    // Ensure structure exists
    if (!state.cvData.structure?.sections || state.cvData.structure.sections.length === 0) {
      return migrateLegacyCV(state.cvData);
    }
    return state.cvData;
  }, [state.cvData]);

  // Map visible sections to CVSection format for sidebar
  const visibleSections = React.useMemo(() => {
    if (!cvDataWithStructure) return [];
    return getVisibleCVSections(cvDataWithStructure, 'cv');
  }, [cvDataWithStructure]);

  const cvSections = React.useMemo(() => {
    const mappedSections = visibleSections.map(section => {
      // Map section type to section ID for sidebar
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
        type: section.type, // Keep original type for structure updates
        title: section.label,
        icon: IconComponent,
        visible: true
      };
    });

    // CRITICAL: Ensure personal info is always present and first
    const hasPersonalInfo = mappedSections.some(s => s.id === 'personal' || s.type === 'personal_header');
    if (!hasPersonalInfo) {
      // Add personal info at the beginning if it's missing
      const PersonalIcon = getSectionIcon('personal_header');
      mappedSections.unshift({
        id: 'personal',
        type: 'personal_header',
        title: 'Personal Information',
        icon: PersonalIcon,
        visible: true
      });
    } else {
      // Ensure personal info is first
      const personalIndex = mappedSections.findIndex(s => s.id === 'personal' || s.type === 'personal_header');
      if (personalIndex > 0) {
        const personalSection = mappedSections[personalIndex];
        mappedSections.splice(personalIndex, 1);
        mappedSections.unshift(personalSection);
      }
    }

    return mappedSections;
  }, [visibleSections]);

  const handleSectionReorder = (sectionIds: string[]) => {
    if (!cvDataWithStructure || !cvDataWithStructure.structure?.sections) return;

    const updatedData = { ...cvDataWithStructure };

    // Map sidebar IDs back to structure types
    const sidebarToTypeMap: Record<string, string> = {
      'personal': 'personal_header',
      'work': 'work_experience',
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

    // Convert sidebar IDs to structure types
    const structureTypes = sectionIds.map(id => sidebarToTypeMap[id] || id);

    // Ensure personal_header is always first
    const personalHeaderIndex = structureTypes.indexOf('personal_header');
    if (personalHeaderIndex > 0) {
      structureTypes.splice(personalHeaderIndex, 1);
      structureTypes.unshift('personal_header');
    } else if (personalHeaderIndex === -1) {
      structureTypes.unshift('personal_header');
    }

    // Create a map of existing sections by type
    const sectionMap = new Map(
      updatedData.structure.sections.map(s => [s.type, s])
    );

    // Reorder sections based on new order
    const reorderedSections = structureTypes
      .map(type => {
        const existing = sectionMap.get(type);
        if (existing) {
          return existing;
        }
        // If section doesn't exist in structure, create it
        return {
          id: `section-${type}-${Date.now()}`,
          type: type,
          visible: false
        };
      })
      .filter(Boolean);

    // Add any sections that weren't in the reorder list (shouldn't happen, but safety)
    updatedData.structure.sections.forEach(section => {
      if (!structureTypes.includes(section.type)) {
        reorderedSections.push(section);
      }
    });

    updatedData.structure = {
      ...updatedData.structure,
      sections: reorderedSections
    };

    dispatch({ type: 'SET_CV_DATA', payload: updatedData });
  };

  // Get default item for section
  const getDefaultItemForSection = (sectionType: keyof UnifiedCVDataStructure | string) => {
    switch (sectionType) {
      case 'work':
      case 'work_experience':
        return {
          name: '',
          position: '',
          url: '',
          startDate: '',
          endDate: '',
          summary: '',
          highlights: []
        };
      case 'education':
        return {
          institution: '',
          url: '',
          area: '',
          studyType: '',
          startDate: '',
          endDate: '',
          score: '',
          courses: []
        };
      case 'skills':
        return {
          category: '',
          skills: []
        };
      case 'projects':
        return {
          name: '',
          startDate: '',
          endDate: '',
          description: '',
          highlights: [],
          keywords: [],
          url: ''
        };
      case 'certificates':
        return {
          name: '',
          date: '',
          issuer: '',
          url: '',
          description: ''
        };
      case 'languages':
        return {
          language: '',
          fluency: 'intermediate'
        };
      case 'volunteer':
        return {
          organization: '',
          position: '',
          url: '',
          startDate: '',
          endDate: '',
          summary: '',
          highlights: []
        };
      case 'awards':
        return {
          title: '',
          date: '',
          awarder: '',
          summary: ''
        };
      case 'publications':
        return {
          name: '',
          publisher: '',
          releaseDate: '',
          url: '',
          summary: ''
        };
      case 'interests':
        return {
          name: '',
          keywords: []
        };
      case 'references':
        return {
          name: '',
          reference: '',
          position: '',
          company: ''
        };
      default:
        return {};
    }
  };

  // Get available sections that can be added
  const getAvailableSectionsToAdd = () => {
    const addableSections = getAddableCVSections(state.cvData);
    return addableSections.map(section => ({
      id: section.id,
      title: section.label,
      icon: getSectionIcon(section.id),
      category: section.category,
      description: section.description
    }));
  };

  // Add a new section with default data
  const addNewSection = (sectionId: string) => {
    const updatedData = { ...state.cvData };
    
    // Map section IDs to data keys
    const sectionTypeMap: Record<string, keyof UnifiedCVDataStructure> = {
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

    const dataKey = sectionTypeMap[sectionId] || sectionId;

    // Initialize section with empty data (blank section)
    // For array sections, initialize as empty array - user will add items through the form
    // For single sections like skills, initialize with empty structure
    switch (dataKey) {
      case 'skills': {
        // Initialize skills as empty array - user will add skill categories through form
        if (!updatedData.skills || updatedData.skills.length === 0) {
          updatedData.skills = [];
        }
        break;
      }
      case 'projects': {
        // Initialize as empty array - user will add projects through form
        if (!updatedData.projects || updatedData.projects.length === 0) {
          updatedData.projects = [];
        }
        break;
      }
      case 'certificates': {
        // Initialize as empty array - user will add certificates through form
        if (!updatedData.certificates || updatedData.certificates.length === 0) {
          updatedData.certificates = [];
        }
        break;
      }
      case 'languages': {
        // Initialize as empty array - user will add languages through form
        if (!updatedData.languages || updatedData.languages.length === 0) {
          updatedData.languages = [];
        }
        break;
      }
      case 'volunteer': {
        // Initialize as empty array - user will add volunteer experience through form
        if (!updatedData.volunteer || updatedData.volunteer.length === 0) {
          updatedData.volunteer = [];
        }
        break;
      }
      case 'awards': {
        // Initialize as empty array - user will add awards through form
        if (!updatedData.awards || updatedData.awards.length === 0) {
          updatedData.awards = [];
        }
        break;
      }
      case 'publications': {
        // Initialize as empty array - user will add publications through form
        if (!updatedData.publications || updatedData.publications.length === 0) {
          updatedData.publications = [];
        }
        break;
      }
      case 'interests': {
        // Initialize as empty array - user will add interests through form
        if (!updatedData.interests || updatedData.interests.length === 0) {
          updatedData.interests = [];
        }
        break;
      }
      case 'references': {
        // Initialize as empty array - user will add references through form
        if (!updatedData.references || updatedData.references.length === 0) {
          updatedData.references = [];
        }
        break;
      }
      default:
        break;
    }

    // Update structure to mark section as visible
    if (!updatedData.structure) {
      updatedData.structure = {
        sections: []
      };
    }

    if (!updatedData.structure.sections) {
      updatedData.structure.sections = [];
    }

    // Check if section already exists in structure
    const sectionExists = updatedData.structure.sections.some(s => s.type === sectionId);
    
    if (!sectionExists) {
      updatedData.structure.sections.push({
        id: `section-${sectionId}-${Date.now()}`,
        type: sectionId,
        visible: true
      });
    } else {
      // Mark existing section as visible
      updatedData.structure.sections = updatedData.structure.sections.map(section => {
        if (section.type === sectionId) {
          return { ...section, visible: true };
        }
        return section;
      });
    }

    // CRITICAL: Ensure personal_header is always present, visible, and first
    const personalHeaderExists = updatedData.structure.sections.some(s => s.type === 'personal_header');
    if (!personalHeaderExists) {
      // Add personal_header if it doesn't exist
      updatedData.structure.sections.unshift({
        id: 'personal_header',
        type: 'personal_header',
        visible: true
      });
    } else {
      // Ensure personal_header is visible and move it to first position
      updatedData.structure.sections = updatedData.structure.sections.map(section => {
        if (section.type === 'personal_header') {
          return { ...section, visible: true };
        }
        return section;
      });
      
      // Move personal_header to first position
      const personalHeaderIndex = updatedData.structure.sections.findIndex(s => s.type === 'personal_header');
      if (personalHeaderIndex > 0) {
        const personalHeader = updatedData.structure.sections[personalHeaderIndex];
        updatedData.structure.sections.splice(personalHeaderIndex, 1);
        updatedData.structure.sections.unshift(personalHeader);
      }
    }

    dispatch({ type: 'SET_CV_DATA', payload: updatedData });
    setShowAddSectionTiles(false);
    
    // Scroll to the new section
    const sectionIdForScroll = sectionId === 'work_experience' ? 'work' : dataKey;
    if (sectionIdForScroll) {
      scrollToSection(sectionIdForScroll);
    }
  };

  const handleAddSection = () => {
    setShowAddSectionTiles(!showAddSectionTiles);
  };

  // Expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToSection,
    handleAddSection,
    addNewSection,
    handleDeleteSectionFromSidebar,
    handleSectionReorder,
    activeSection
  }));

  const handleDeleteSectionFromSidebar = (sectionId: string) => {
    // Don't allow deleting personal_header
    if (sectionId === 'personal' || sectionId === 'personal_header') {
      return;
    }

    const updatedData = { ...state.cvData };

    // Map sidebar IDs to structure types
    const sidebarToTypeMap: Record<string, string> = {
      'personal': 'personal_header',
      'work': 'work_experience',
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

    const structureType = sidebarToTypeMap[sectionId] || sectionId;

    // Map structure types to data keys
    const sectionTypeMap: Record<string, keyof UnifiedCVDataStructure> = {
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

    const dataKey = sectionTypeMap[structureType] || structureType;

    // COMPLETELY DELETE the section data (set to empty array for list sections, empty object for single sections)
    if (dataKey === 'work' || dataKey === 'education' || dataKey === 'skills' ||
        dataKey === 'projects' || dataKey === 'certificates' || dataKey === 'languages' ||
        dataKey === 'volunteer' || dataKey === 'awards' || dataKey === 'publications' ||
        dataKey === 'interests' || dataKey === 'references') {
      updatedData[dataKey] = [] as any;
    }

    // Remove section from structure completely (not just mark as invisible)
    if (updatedData.structure?.sections) {
      updatedData.structure = {
        ...updatedData.structure,
        sections: updatedData.structure.sections.filter(section => section.type !== structureType)
      };
    }

    dispatch({ type: 'SET_CV_DATA', payload: updatedData });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] min-h-0 relative overflow-hidden bg-[#1a230f]">
      {/* Main Container */}
      <div className="flex-1 h-full flex overflow-hidden relative p-4">
        {/* Form Content - Full Width */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1a230f] rounded-xl border border-white/10 shadow-2xl">
          {/* Scrollable Area */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain overflow-x-hidden px-4 pt-2 pb-20">
            <div className="flex flex-col gap-4">
              {cvSections.map((section) => {
                const Icon = section.icon;
                const isCollapsed = collapsedSections.has(section.id);
                const openFixesForSection = getOpenFixesForSection(section.id);
                const showOverlay =
                  state.reviewMode &&
                  !!activeAnnotation &&
                  openFixesForSection.some((f) => f.id === activeAnnotation.id);
                return (
                  <div
                    key={section.id}
                    id={`section-${section.id}`}
                    className={`bg-white/5 rounded-2xl border border-white/10 overflow-hidden scroll-mt-4 mt-2 ${
                      state.reviewMode && openFixesForSection.length > 0 ? 'bg-red-500/5' : ''
                    }`}
                  >
                    {/* Section Header */}
                    <div
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-4 py-4 bg-white/5 hover:bg-[#2D332D] transition-colors text-white rounded-t-2xl cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <Icon className="w-5 h-5 text-white/70" />
                        <h3 className="text-base font-semibold text-white">{section.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Eye icon - hide for personal section */}
                        {section.id !== 'personal' && section.id !== 'personal_header' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSectionVisibility(section.id, e);
                            }}
                            className="p-1.5 hover:bg-blue-500/20 rounded-lg transition-colors group"
                            title={getSectionVisibility(section.id) ? "Hide section from CV" : "Show section in CV"}
                          >
                            {getSectionVisibility(section.id) ? (
                              <Eye className="w-4 h-4 text-white/40 group-hover:text-blue-400" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-white/40 group-hover:text-blue-400" />
                            )}
                          </button>
                        )}
                        <div className="p-1.5">
                          {isCollapsed ? (
                            <ChevronDown className="w-5 h-5 text-white/60" />
                          ) : (
                            <ChevronUp className="w-5 h-5 text-white/60" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section Content */}
                    {!isCollapsed && (
                      <div className="px-4 pt-4 pb-4">
                        {(() => {
                          switch (section.id) {
                            case 'personal':
                              return (
                                <PersonalInfoForm
                                  data={getBasics()}
                                  cvData={state.cvData}
                                  jobData={state.jobData}
                                  onUpdate={updateBasicsField}
                                  annotations={state.fixAnnotations || []}
                                  onApplyAnnotation={applyAnnotation}
                                  onDismissAnnotation={dismissAnnotation}
                                />
                              );
                            case 'work':
                              return (
                                <WorkExperienceSection
                                  data={state.cvData.work || []}
                                  onUpdate={(updated) => updateCVData({ work: updated })}
                                  annotations={state.fixAnnotations || []}
                                  onApplyAnnotation={applyAnnotation}
                                  onDismissAnnotation={dismissAnnotation}
                                />
                              );
                            case 'education':
                              return (
                                <EducationSection
                                  data={state.cvData.education || []}
                                  onUpdate={(updated) => updateCVData({ education: updated })}
                                  onAdd={addEducation}
                                  onRemove={removeEducation}
                                  jobData={state.jobData}
                                />
                              );
                            case 'skills':
                              return (
                                <SkillsSection
                                  data={state.cvData.skills || []}
                                  onUpdate={(updated) => updateCVData({ skills: updated })}
                                  onAdd={addSkills}
                                  onRemove={removeSkills}
                                />
                              );
                            case 'projects':
                              return (
                                <ProjectsSection
                                  data={state.cvData.projects || []}
                                  onUpdate={(updated) => updateCVData({ projects: updated })}
                                  onAdd={addProject}
                                  onRemove={removeProject}
                                  jobData={state.jobData}
                                />
                              );
                            case 'certificates':
                              return (
                                <CertificatesSection
                                  data={state.cvData.certificates || []}
                                  onUpdate={(updated) => updateCVData({ certificates: updated })}
                                  onAdd={addCertificate}
                                  onRemove={removeCertificate}
                                  jobData={state.jobData}
                                />
                              );
                            case 'languages':
                              return (
                                <LanguagesSection
                                  data={state.cvData.languages || []}
                                  onUpdate={(updated) => updateCVData({ languages: updated })}
                                  onAdd={addLanguage}
                                  onRemove={removeLanguage}
                                />
                              );
                            case 'volunteer':
                              return (
                                <VolunteerSection
                                  data={state.cvData.volunteer || []}
                                  onUpdate={(updated) => updateCVData({ volunteer: updated })}
                                />
                              );
                            default:
                              return null;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Section Tiles - Show when add section is clicked, after all sections */}
              {showAddSectionTiles && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#141810] rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Add New Section</h3>
                    <button
                      onClick={() => setShowAddSectionTiles(false)}
                      className="text-white/60 hover:text-white transition-colors p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 tablet:grid-cols-4 gap-2">
                    {getAvailableSectionsToAdd().map((section) => {
                      const IconComponent = section.icon;

                      return (
                        <motion.button
                          key={section.id}
                          onClick={() => addNewSection(section.id)}
                          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg transition-all duration-200 bg-white/10 hover:bg-white/20 text-white hover:scale-105"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title={section.description || section.title}
                        >
                          {React.createElement(IconComponent, { size: 20 })}
                          <span className="font-medium text-xs text-center leading-tight">{section.title}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane - CV Surgeon - Only visible when opened */}
        {isSurgeonOpen && (
          <div className="w-[55vw] flex-none min-w-[550px] max-w-[900px] flex flex-col bg-[var(--bg-secondary)] rounded-xl overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30 animate-in slide-in-from-right duration-300 min-h-0">
          <div className="bg-[var(--bg-secondary)] p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
            <div className="flex items-center space-x-2 text-[color:var(--text-primary)]">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-base font-semibold">CVCircle Optimisation</h3>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain overflow-x-hidden p-3 space-y-3 bg-[var(--bg-secondary)]">
            {/* Journey Conversion Banner */}
            <AnimatePresence>
              {showJourneyBanner && state.cvType === 'standalone' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[color:var(--accent-primary)]/10 rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30"
                >
                  <div className="flex items-start space-x-2">
                    <Target className="w-4 h-4 text-[color:var(--accent-primary)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[color:var(--text-primary)] mb-1.5">
                        🎯 Optimize for this job?
                      </p>
                      <div className="flex space-x-1.5">
                        <button
                          onClick={handleConvertToJourney}
                          className="px-2.5 py-1 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black text-xs rounded-lg transition-colors"
                        >
                          Track as Journey
                        </button>
                        <button
                          onClick={() => setShowJourneyBanner(false)}
                          className="px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] text-xs rounded-lg transition-colors shadow-sm shadow-black/10 dark:shadow-black/30"
                        >
                          Keep Standalone
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* JD Input for Journey/Standalone CVs */}
            {state.cvType !== 'master' && (
              <div>
                {!showJDInput ? (
                  <button
                    onClick={() => setShowJDInput(true)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[color:var(--text-secondary)] hover:text-[color:var(--accent-primary)] transition-all flex items-center justify-center space-x-2 hover:bg-[var(--hover-bg)] text-sm shadow-sm shadow-black/10 dark:shadow-black/30"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span className="font-medium">Add Job Description</span>
                  </button>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-[color:var(--text-secondary)]">
                        Job Description (Optional)
                      </label>
                      <button
                        onClick={() => {
                          setShowJDInput(false);
                          setJdText('');
                        }}
                        className="text-[10px] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      placeholder="Paste job description here for targeted optimization..."
                      rows={5}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[color:var(--accent-primary)] bg-[var(--input-bg)] text-[color:var(--text-primary)] text-xs resize-none placeholder:text-[color:var(--text-tertiary)] shadow-sm shadow-black/10 dark:shadow-black/30"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Match Score and Analysis Button - Inline */}
            <div className="flex items-center gap-3">
              {/* Match Score */}
              {matchScore !== null && (
                <div className="flex-1 bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-[color:var(--text-secondary)]">
                      Match Score
                    </span>
                    <span className="text-xl font-bold text-[color:var(--accent-primary)]">
                      {matchScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[var(--accent-primary)] h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${matchScore}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Analysis Button */}
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  isRoleReady
                    ? 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] shadow-sm shadow-black/10 dark:shadow-black/30'
                } disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed disabled:text-[color:var(--text-tertiary)] ${matchScore !== null ? 'flex-shrink-0' : 'w-full'}`}
                title={!isRoleReady ? 'Set target role & seniority to run analysis' : 'Run AI analysis'}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{isRoleReady ? 'Run Analysis' : 'Set Role to Analyze'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Suggested Fixes */}
            {fixes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[color:var(--text-primary)] flex items-center space-x-2">
                    <span>📌 Suggested Fixes</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-[color:var(--accent-primary)]/15 text-[color:var(--accent-primary)] rounded-full shadow-sm shadow-black/10 dark:shadow-black/30">
                      {fixes.length}
                    </span>
                  </h4>
                  <button
                    onClick={handleApplyAllFixes}
                    className="px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-md hover:shadow-lg hover:scale-105"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Apply All</span>
                  </button>
                </div>
                <div className="space-y-1.5">
                  {fixes.map((fix, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-[var(--bg-tertiary)] rounded-lg p-2 shadow-sm shadow-black/10 dark:shadow-black/30"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="text-[10px] font-medium text-[color:var(--text-tertiary)]">
                          {fix.section}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-[color:var(--accent-primary)]/15 text-[color:var(--accent-primary)] rounded-full shadow-sm shadow-black/10 dark:shadow-black/30">
                          +{fix.impact_score_delta}
                        </span>
                      </div>
                      <p className="text-[10px] text-[color:var(--text-secondary)] mb-1.5 leading-tight">
                        {fix.issue}
                      </p>
                      <div className="space-y-1">
                        <div className="text-[10px]">
                          <span className="text-red-400 line-through">
                            {fix.original_text.substring(0, 40)}...
                          </span>
                        </div>
                        <div className="text-[10px]">
                          <span className="text-[color:var(--accent-primary)]">
                            {fix.fixed_text.substring(0, 40)}...
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleApplyFix(fix)}
                        className="mt-2 w-full px-2 py-1 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black text-[10px] rounded-lg transition-colors flex items-center justify-center space-x-1"
                      >
                        <CheckCircle className="w-2.5 h-2.5" />
                        <span>Apply Fix</span>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* AI Analysis Chatbot Card - Bottom Right - Outside flex container */}
      {!isSurgeonOpen && showChatbotCard && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 w-80 bg-[var(--bg-secondary)] rounded-2xl shadow-2xl shadow-black/30 dark:shadow-black/60 overflow-hidden lg:hidden"
        >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-[color:var(--accent-primary)] to-[color:var(--accent-hover)] p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-black" />
                <InfoTooltip content="AI-powered analysis of your CV against industry standards and job requirements.">
                  <h3 className="text-base font-bold text-black cursor-help">CVCircle Score Analysis</h3>
                </InfoTooltip>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4 space-y-3">
              {aiAnalysisPreview ? (
                <>
                  {aiAnalysisPreview.score !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[color:var(--text-secondary)]">Match Score</span>
                      <span className="text-2xl font-bold text-[color:var(--accent-primary)]">
                        {aiAnalysisPreview.score}/100
                      </span>
                    </div>
                  )}
                  
                  {aiAnalysisPreview.benefits && aiAnalysisPreview.benefits.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[color:var(--text-secondary)] mb-2">Key Improvements Available:</p>
                      <ul className="space-y-1.5">
                        {aiAnalysisPreview.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs text-[color:var(--text-tertiary)]">
                            <CheckCircle className="w-3.5 h-3.5 text-[color:var(--accent-primary)] flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : aiPreviewStatus === 'loading' ? (
                <div className="flex items-center gap-2 text-sm text-[color:var(--text-tertiary)]">
                  <div className="w-4 h-4 border-2 border-[color:var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing your CV...</span>
                </div>
              ) : aiPreviewStatus === 'error' ? (
                <div className="text-sm text-red-300 bg-red-500/10 rounded-xl p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                  <div className="font-semibold mb-1">Couldn’t analyze yet</div>
                  <div className="text-xs text-red-200/80">{aiPreviewError || 'Please try again.'}</div>
                </div>
              ) : (
                <div className="text-sm text-[color:var(--text-secondary)]">
                  Click below to run analysis and view the report.
                </div>
              )}

              {/* CTA Button */}
              <button
                onClick={async () => {
                  if (!isRoleReady) {
                    setShowRoleProfiler(true);
                    return;
                  }
                  // Ensure we have a full analysis before showing the report
                  if (!state.surgeonAnalysis || (state.fixAnnotations || []).length === 0) {
                    await handleRunAnalysis();
                  }

                  const firstOpen = (state.fixAnnotations || []).find((f) => f.status === 'open');
                  if (!state.activeFixId && firstOpen) {
                    dispatch({ type: 'SET_ACTIVE_FIX', payload: firstOpen.id });
                  }
                  logResumeEnhancerEvent({
                    action: 'resume_enhancer_report_opened',
                    resourceType: 'cv',
                    resourceId: state.cvId,
                    metadata: { cvType: state.cvType, score: state.surgeonAnalysis?.score ?? null }
                  });
                  dispatch({ type: 'SET_REPORT_OPEN', payload: true });
                }}
                className="w-full px-4 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>View Report</span>
              </button>
            </div>
          </motion.div>
        )}

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

    </div>
  );
});

Step3BuilderSurgeon.displayName = 'Step3BuilderSurgeon';

export default Step3BuilderSurgeon;

