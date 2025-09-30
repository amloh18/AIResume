'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
// import { useSession  } from 'next-auth/react'; // Removed - using Clerk now
import FloatingStudioLayout from './FloatingStudioLayout';
import TabbedStudioPanel from './TabbedStudioPanel';
import JobATSSection from './JobATSSection';
import ComprehensiveATSAnalyzer from './ComprehensiveATSAnalyzer';
import CVHealthScore from './CVHealthScore';
import DraggableSections from './DraggableSections';
import DesignContent from './DesignContent';
import TemplateContent from './TemplateContent';
import PreviewPanel from './PreviewPanel';
import PersonalInfoForm from './forms/PersonalInfoForm';
import WorkExperienceSection from './forms/WorkExperienceSection';
import EducationSection from './forms/EducationSection';
import SkillsSection from './forms/SkillsSection';
import ProjectsSection from './forms/ProjectsSection';
import CertificatesSection from './forms/CertificatesSection';
import LanguagesSection from './forms/LanguagesSection';
import MasterCVCard from './MasterCVCard';
import {
  User,
  Briefcase,
  GraduationCap,
  Code,
  FolderOpen,
  Award,
  Globe
} from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useJobStore } from '@/lib/stores/jobStore';
import { UnifiedCVService as CVService } from '@/lib/services/unified-cv-service';
import { TemplateService } from '@/lib/services/templateService';
import { JobService } from '@/lib/services/jobService';
import { debounce } from 'lodash';
import Toast from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { generateCVName, generateCVDescription, getCVMetadata } from '@/lib/utils/cvNamingUtils';
import { generateDocumentName } from '@/lib/utils/documentNaming';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import ActionBlockerDialog from '@/components/modals/ActionBlockerDialog';
import { CVJourneyLookupService, CVJourneyInfo } from '@/lib/services/cvJourneyLookupService';
import { ApplicationPackageService } from '@/lib/services/applicationPackageService';

interface CVStudioProps {
  journeyId?: string | null; // PRIMARY: Journey ID for proper Application Package context
  jobId?: string | null; // DEPRECATED: Direct jobId usage violates Application Package model
  cvId?: string | null;
  coverLetterId?: string | null;
  documentType?: 'cv' | 'cover-letter';
  userId: string;
  mode?: string | null; // 'cv-onboarding', 'ats-edit', 'cover-letter-edit', 'document-first'
  cvJourneyId?: string | null; // LEGACY: Being replaced by journeyId
}

const CVStudio: React.FC<CVStudioProps> = ({
  journeyId,
  jobId, // DEPRECATED
  cvId,
  coverLetterId,
  documentType: initialDocumentType = 'cv',
  userId,
  mode,
  cvJourneyId // LEGACY
}) => {
  const router = useRouter();
  // const { data: session } = useSession(); // Removed - using Clerk now
  const session = null; // Temporary - will replace with Clerk user
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [documentType, setDocumentType] = useState<'cv' | 'cover-letter'>(initialDocumentType);
  const [panelStates, setPanelStates] = useState({
    left: true,
    right: true
  });
  const [justCreated, setJustCreated] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobId || null);
  const [jobAutoLoadedFromJourney, setJobAutoLoadedFromJourney] = useState(false);
  const [pagePadding, setPagePadding] = useState({ top: 32, bottom: 32 });

  // CV Journey state
  const [journeyInfo, setJourneyInfo] = useState<CVJourneyInfo | null>(null);
  const [journeyInitialized, setJourneyInitialized] = useState(false);

  // CV Data state
  const [cvData, setCvData] = useState<UnifiedCVDataStructure | null>(null);
  const [cvTitle, setCvTitle] = useState<string>('Untitled CV');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isMasterCV, setIsMasterCV] = useState(false);
  const [currentMasterCV, setCurrentMasterCV] = useState<any>(null);

  // Cover Letter Data state
  const [coverLetterData, setCoverLetterData] = useState<any>(null);
  const [coverLetterTitle, setCoverLetterTitle] = useState<string>('Untitled Cover Letter');

  // Store original document IDs to preserve them during switching
  const [originalCvId, setOriginalCvId] = useState<string | null>(cvId);
  const [originalCoverLetterId, setOriginalCoverLetterId] = useState<string | null>(coverLetterId);

  // Update original IDs when props change (but don't overwrite if we already have them)
  useEffect(() => {
    if (cvId && !originalCvId) {
      setOriginalCvId(cvId);
    }
    if (coverLetterId && !originalCoverLetterId) {
      setOriginalCoverLetterId(coverLetterId);
    }
  }, [cvId, coverLetterId, originalCvId, originalCoverLetterId]);

  // Section management state
  const [sectionOrder, setSectionOrder] = useState([
    'basics', 'work', 'education', 'skills', 'projects', 'certificates', 'languages'
  ]);
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({
    basics: true,
    work: true,
    education: true,
    skills: true,
    projects: true,
    certificates: true,
    languages: true
  });
  const [expandedSections, setExpandedSections] = useState(new Set([
    'basics', 'work', 'skills'
  ]));
  const [allSectionsCollapsed, setAllSectionsCollapsed] = useState(false);

  // Action blocker state
  const [showActionBlocker, setShowActionBlocker] = useState(false);
  const [actionBlockerConfig, setActionBlockerConfig] = useState({
    title: '',
    message: '',
    actionRequired: '',
    onAction: undefined as (() => void) | undefined
  });

  // Save tracking state
  const [lastSavedData, setLastSavedData] = useState<string>('');

  // Preview settings state
  const [zoom, setZoom] = useState(1);
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');



  const {
    templates,
    selectedTemplate,
    setTemplates,
    setSelectedTemplate
  } = useTemplateStore();



  const {
    currentJob,
    setCurrentJob
  } = useJobStore();

  // Job Journey integration
  const {
    state: journeyState,
    updateJourneyStatus,
    updateCVId,
    updateAtsScore,
    updateCurrentJobId,
    updateJobInfo,
    startJourney,
    updateCoverLetterId
  } = useJobJourney();

  // Function to initialize CV journey
  const initializeCVJourney = async () => {
    if (journeyInitialized) {
      console.log('🔍 Journey already initialized');
      return;
    }

    try {
      console.log('🔍 Initializing CV journey for studio:', {
        cvId,
        coverLetterId,
        jobId,
        cvJourneyId,
        userId
      });

      let journey: CVJourneyInfo | null = null;

      // CORRECTED APPROACH: Prioritize journeyId for proper Application Package context
      const primaryJourneyId = journeyId || cvJourneyId;
      
      if (primaryJourneyId) {
        console.log('🎯 CVStudio - Loading context from journey ID (Application Package):', primaryJourneyId);
        
        try {
          // Fetch the complete journey data from the journey ID
          const response = await fetch(`/api/application-journey/${primaryJourneyId}?userId=${userId}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.journey) {
              const journeyData = result.data.journey;
              journey = {
                journeyId: primaryJourneyId,
                cvId: journeyData.cvId || undefined,
                coverLetterId: journeyData.coverLetterId || undefined,
                jobId: journeyData.jobId || '',
                userId,
                status: journeyData.status || 'in-progress',
                currentStep: journeyData.currentStep || 1,
                jobTitle: journeyData.jobTitle,
                company: journeyData.company
              };
              console.log('✅ CVStudio - Journey context loaded successfully:', journey);
            }
          }
        } catch (error) {
          console.error('❌ CVStudio - Error loading journey context:', error);
        }
      } else {
        // FALLBACK: Legacy approach for backwards compatibility
        console.log('🔍 CVStudio - No journey ID provided, using legacy context discovery');
        journey = await CVJourneyLookupService.getJourneyInfoForStudio(
          cvId,
          coverLetterId,
          jobId,
          userId
        );
      }

      if (journey) {
        console.log('✅ Found existing journey:', journey);
        setJourneyInfo(journey);
        
        // Update selected job ID if we found a journey with a job
        if (journey.jobId && !selectedJobId) {
          setSelectedJobId(journey.jobId);
        }
        
        // Update journey context
        if (journey.cvId) {
          updateCVId(journey.cvId);
        }
        if (journey.coverLetterId) {
          updateCoverLetterId(journey.coverLetterId);
        }
        if (journey.jobId) {
          updateCurrentJobId(journey.jobId);
        }
      } else {
        console.log('🔍 No existing journey found, will create new one when needed');
      }

      setJourneyInitialized(true);
    } catch (error) {
      console.error('❌ Error initializing CV journey:', error);
      setJourneyInitialized(true); // Set to true to prevent infinite retries
    }
  };

  // Function to update CV journey with document IDs
  const updateJourneyWithDocument = async (documentId: string, documentType: 'cv' | 'cover-letter') => {
    const targetJobId = journeyInfo?.jobId || selectedJobId || jobId;
    
    if (!targetJobId) {
      console.log('🔍 No jobId available for journey update');
      return;
    }

    try {
      console.log(`🔍 Updating journey with ${documentType} ID:`, documentId);
      
      const updateData: any = {
        userId,
        jobId: targetJobId,
        currentStep: documentType === 'cv' ? 2 : 4, // CV is step 2, Cover Letter is step 4
        status: 'in-progress'
      };

      if (documentType === 'cv') {
        updateData.cvId = documentId;
      } else {
        updateData.coverLetterId = documentId;
      }

      const response = await fetch('/api/application-journey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Journey updated successfully:', result);
        
        // Update local journey state
        if (documentType === 'cv') {
          updateCVId(documentId);
        } else {
          updateCoverLetterId(documentId);
        }

        // Update journey info
        if (journeyInfo) {
          setJourneyInfo({
            ...journeyInfo,
            cvId: documentType === 'cv' ? documentId : journeyInfo.cvId,
            coverLetterId: documentType === 'cover-letter' ? documentId : journeyInfo.coverLetterId
          });
        }
      } else {
        console.error('❌ Failed to update journey:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error updating journey:', error);
    }
  };

  // Update CV field
  const updateCVField = useCallback((path: string, value: any) => {
    setCvData(prev => {
      if (!prev) return prev;

      const pathArray = path.split('.');
      const newData = { ...prev };
      let current: any = newData;

      for (let i = 0; i < pathArray.length - 1; i++) {
        current = current[pathArray[i]];
      }

      current[pathArray[pathArray.length - 1]] = value;

      // Auto-update CV title when name, label, or summary changes
      if (path.startsWith('basics.') && (path.includes('name') || path.includes('label') || path.includes('summary'))) {
        const newTitle = generateCVName(newData);
        const newDescription = generateCVDescription(newData);

        // Update local title state immediately
        setCvTitle(newTitle);

        // Update the CV title in the database if we have a CV ID
        if (cvId) {
          // Debounced update to avoid too many API calls
          const updateTitle = debounce(async () => {
            try {
              // Use updateCV with just the title field
              await CVService.updateCV(cvId, {
                title: newTitle
              }, userId || undefined);
              console.log('✅ Auto-updated CV title to:', newTitle);
            } catch (error) {
              console.error('❌ Failed to auto-update CV title:', error);
            }
          }, 1000);

          updateTitle();
        }
      }

      return newData;
    });
  }, [cvId, userId]);

  // Add section
  const addSection = useCallback((sectionType: keyof CVDataStructure, item?: any) => {
    setCvData(prev => {
      if (!prev) return prev;

      const newData = { ...prev };
      const section = newData[sectionType];

      if (Array.isArray(section)) {
        const defaultItem = item || getDefaultItemForSection(sectionType);
        newData[sectionType] = [...section, defaultItem] as any;
      }

      return newData;
    });
  }, []);

  // Remove section
  const removeSection = useCallback((sectionType: keyof CVDataStructure, id: string) => {
    setCvData(prev => {
      if (!prev) return prev;

      const newData = { ...prev };
      const section = newData[sectionType];

      if (Array.isArray(section)) {
        newData[sectionType] = section.filter((item: any) => {
          if (sectionType === 'work') return item.name !== id;
          if (sectionType === 'education') return item.institution !== id;
          if (sectionType === 'skills') return item.name !== id;
          if (sectionType === 'projects') return item.name !== id;
          if (sectionType === 'certificates') return item.name !== id;
          if (sectionType === 'languages') return item.language !== id;
          return true;
        }) as any;
      }

      return newData;
    });
  }, []);

  // Get default item for section
  const getDefaultItemForSection = (sectionType: keyof CVDataStructure) => {
    switch (sectionType) {
      case 'work':
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
          name: '',
          level: '',
          keywords: []
        };
      case 'projects':
        return {
          name: '',
          startDate: '',
          endDate: '',
          description: '',
          highlights: [],
          url: ''
        };
      case 'certificates':
        return {
          name: '',
          date: '',
          issuer: '',
          url: ''
        };
      case 'languages':
        return {
          language: '',
          fluency: ''
        };
      default:
        return {};
    }
  };

  // Manual save function
  const manualSave = useCallback(async () => {
    if (!cvData) return;

    try {
      console.log('🔍 Studio - Manual save triggered...');
      setSaveStatus('saving');

      if (cvId) {
        console.log('🔍 Studio - Manually updating existing CV:', cvId);
        // Properly format the request with cvData wrapped in the expected structure
        await CVService.updateCV(cvId, {
          title: cvTitle,
          cvData: cvData,
          templateId: selectedTemplate?.id || selectedTemplate?._id || '',
          metadata: {
            isMaster: isMasterCV
          }
        }, userId || undefined);
        console.log('✅ Studio - Manual CV update successful');
        setSaveStatus('saved');
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 2000); // Hide after 2 seconds
        // Update last saved data to prevent immediate auto-save
        setLastSavedData(JSON.stringify(cvData));
      } else {
        console.log('🔍 Studio - Manual save for new CV');
        // Create new CV with proper structure
        const newCV = await CVService.createCV({
          userId: userId || '',
          title: cvTitle || 'Untitled CV',
          cvData: cvData,
          templateId: selectedTemplate?.id || selectedTemplate?._id || '',
          metadata: {
            isMaster: isMasterCV
          }
        });

        const newCvId = newCV.id;
        console.log('🔍 Studio - Manual CV creation with ID:', newCvId);

        router.replace(`/studio?cvId=${newCvId}${selectedJobId || jobId ? `&jobId=${selectedJobId || jobId}` : ''}`);
        setSaveStatus('saved');
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 2000); // Hide after 2 seconds
        // Update last saved data to prevent immediate auto-save
        setLastSavedData(JSON.stringify(cvData));
        setJustCreated(true);
        setTimeout(() => setJustCreated(false), 2000);
      }
    } catch (err) {
      console.error('❌ Studio - Manual save error:', err);
      setSaveStatus('error');
    }
  }, [cvData, cvId, cvTitle, isMasterCV, userId, selectedJobId, jobId, router, selectedTemplate]);

  // Track if data has actually changed

  // Debounced autosave
  const debouncedSave = useCallback(
    debounce(async (data: CVDataStructure) => {
      try {
        console.log('🔍 Studio - Starting save operation...');
        setSaveStatus('saving');

        // Add timeout protection
        const saveTimeout = setTimeout(() => {
          console.error('❌ Studio - Save operation timed out');
          setSaveStatus('error');
        }, 10000); // 10 second timeout

        if (documentType === 'cover-letter') {
          // Handle cover letter save
          if (coverLetterId) {
            console.log('🔍 Studio - Updating existing cover letter:', coverLetterId);
            const response = await fetch(`/api/cover-letters/${coverLetterId}?userId=${userId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: coverLetterTitle,
                content: data.basics?.summary || '',
                cvId: cvId,
                jobId: selectedJobId || jobId
              })
            });

            if (!response.ok) {
              throw new Error('Failed to update cover letter');
            }

            console.log('✅ Studio - Cover letter updated successfully');
            clearTimeout(saveTimeout);
            setSaveStatus('saved');
            setShowSavedMessage(true);
            setTimeout(() => setShowSavedMessage(false), 2000);
          } else {
            // Check if journey already has a cover letter
            const existingCoverLetterId = journeyInfo?.coverLetterId;
            if (existingCoverLetterId) {
              console.log('🔍 Studio - Using existing cover letter from journey:', existingCoverLetterId);
              
              // Update the existing cover letter
              const response = await fetch(`/api/cover-letters/${existingCoverLetterId}?userId=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: coverLetterTitle,
                  content: data.basics?.summary || '',
                  cvId: cvId,
                  jobId: journeyInfo?.jobId || selectedJobId || jobId,
                  targetCompany: '',
                  targetPosition: '',
                  keywords: []
                })
              });

              if (response.ok) {
                console.log('✅ Studio - Existing cover letter updated successfully');
                
                // Update URL to use existing cover letter
                const urlParams = new URLSearchParams();
                urlParams.set('type', 'cover_letter');
                urlParams.set('coverLetterId', existingCoverLetterId);
                if (journeyInfo?.jobId || selectedJobId || jobId) {
                  urlParams.set('jobId', journeyInfo?.jobId || selectedJobId || jobId);
                }
                if (journeyInfo?.journeyId || cvJourneyId) {
                  urlParams.set('cvJourneyId', journeyInfo?.journeyId || cvJourneyId);
                }
                router.replace(`/studio?${urlParams.toString()}`);
                
                clearTimeout(saveTimeout);
                setSaveStatus('saved');
                setShowSavedMessage(true);
                setTimeout(() => setShowSavedMessage(false), 2000);
                return;
              }
            }

            // Create new cover letter
            if (justCreated) {
              console.log('🔍 Studio - Skipping cover letter creation, just created one');
              clearTimeout(saveTimeout);
              setSaveStatus('saved');
              return;
            }

            console.log('🔍 Studio - Creating new cover letter for user:', userId);
            const response = await fetch('/api/cover-letters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                title: coverLetterTitle,
                content: data.basics?.summary || '',
                cvId: cvId,
                jobId: journeyInfo?.jobId || selectedJobId || jobId,
                targetCompany: '',
                targetPosition: '',
                keywords: []
              })
            });

            if (!response.ok) {
              throw new Error('Failed to create cover letter');
            }

            const result = await response.json();
            const newCoverLetterId = result.data.id;
            console.log('🔍 Studio - New cover letter created with ID:', newCoverLetterId);

            // Update journey with new cover letter ID
            await updateJourneyWithDocument(newCoverLetterId, 'cover-letter');

            // Update URL to include the new cover letter ID and preserve cvJourneyId
            const urlParams = new URLSearchParams();
            urlParams.set('type', 'cover_letter');
            urlParams.set('coverLetterId', newCoverLetterId);
            if (journeyInfo?.jobId || selectedJobId || jobId) {
              urlParams.set('jobId', journeyInfo?.jobId || selectedJobId || jobId);
            }
            if (journeyInfo?.journeyId || cvJourneyId) {
              urlParams.set('cvJourneyId', journeyInfo?.journeyId || cvJourneyId);
            }
            router.replace(`/studio?${urlParams.toString()}`);

            clearTimeout(saveTimeout);
            setSaveStatus('saved');
            setShowSavedMessage(true);
            setTimeout(() => setShowSavedMessage(false), 2000);

            setJustCreated(true);
            setTimeout(() => setJustCreated(false), 2000);
          }
        } else {
          // Handle CV save
          if (cvId) {
            console.log('🔍 Studio - Updating existing CV:', cvId);
            await CVService.updateCV(cvId, {
              title: cvTitle,
              cvData: data,
              templateId: selectedTemplate?.id || selectedTemplate?._id || '',
              metadata: {
                isMaster: isMasterCV
              }
            }, userId || undefined);
            console.log('✅ Studio - CV updated successfully');
            clearTimeout(saveTimeout);
            setSaveStatus('saved');
            setShowSavedMessage(true);
            setTimeout(() => setShowSavedMessage(false), 2000); // Hide after 2 seconds
            // Update last saved data
            setLastSavedData(JSON.stringify(data));
          } else {
            // Check if journey already has a CV
            const existingCvId = journeyInfo?.cvId;
            if (existingCvId) {
              console.log('🔍 Studio - Using existing CV from journey:', existingCvId);
              
              // Update the existing CV
              await CVService.updateCV(existingCvId, {
                title: cvTitle,
                cvData: data,
                templateId: selectedTemplate?.id || selectedTemplate?._id || '',
                metadata: {
                  isMaster: isMasterCV
                }
              }, userId || undefined);
              console.log('✅ Studio - Existing CV updated successfully');
              
              // Update URL to use existing CV
              const urlParams = new URLSearchParams();
              urlParams.set('type', 'cv');
              urlParams.set('cvId', existingCvId);
              if (journeyInfo?.jobId || selectedJobId || jobId) {
                urlParams.set('jobId', journeyInfo?.jobId || selectedJobId || jobId);
              }
              if (journeyInfo?.journeyId || cvJourneyId) {
                urlParams.set('cvJourneyId', journeyInfo?.journeyId || cvJourneyId);
              }
              router.replace(`/studio?${urlParams.toString()}`);
              
              clearTimeout(saveTimeout);
              setSaveStatus('saved');
              setShowSavedMessage(true);
              setTimeout(() => setShowSavedMessage(false), 2000);
              return;
            }

            // Prevent multiple CV creation - only create if we don't have a CV ID
            if (justCreated) {
              console.log('🔍 Studio - Skipping CV creation, just created one');
              clearTimeout(saveTimeout);
              setSaveStatus('saved');
              return;
            }

            // Create new CV
            console.log('🔍 Studio - Creating new CV for user:', userId);
            console.log('🔍 Studio - CV creation payload:', {
              userId,
              title: cvTitle || 'Untitled CV',
              jobId: journeyInfo?.jobId || selectedJobId || jobId || undefined
            });
            const newCV = await CVService.createCV({
              userId: userId || '',
              title: cvTitle || 'Untitled CV',
              cvData: data,
              templateId: selectedTemplate?.id || selectedTemplate?._id || '',
              metadata: {
                isMaster: isMasterCV
              }
            });

            // Extract CV ID and update URL
            const newCvId = newCV.data?.cv?.id || newCV.data?.cv?._id || newCV.id || newCV._id;
            console.log('🔍 Studio - New CV created with ID:', newCvId);

            // Update journey with new CV ID
            await updateJourneyWithDocument(newCvId, 'cv');

            // Update URL using new structure with journeyId as primary context
            const urlParams = new URLSearchParams();
            urlParams.set('type', 'cv');
            urlParams.set('cvId', newCvId);
            
            // Prioritize journeyId for reliable Application Package context
            const primaryJourneyId = journeyId || journeyInfo?.journeyId || cvJourneyId;
            if (primaryJourneyId) {
              urlParams.set('journeyId', primaryJourneyId);
            }
            
            // Keep jobId for backwards compatibility
            if (journeyInfo?.jobId || selectedJobId || jobId) {
              urlParams.set('jobId', journeyInfo?.jobId || selectedJobId || jobId);
            }
            
            router.replace(`/studio?${urlParams.toString()}`);

            // Set save status to saved since we just created the CV
            clearTimeout(saveTimeout);
            setSaveStatus('saved');
            setShowSavedMessage(true);
            setTimeout(() => setShowSavedMessage(false), 2000); // Hide after 2 seconds

            // Set flag to prevent immediate autosave
            setJustCreated(true);
            setTimeout(() => setJustCreated(false), 2000); // Reset after 2 seconds

            // Update journey status for new CV
            if (updateCVId) {
              updateCVId(newCvId);
            }
            if (updateJourneyStatus) {
              updateJourneyStatus('cv-created');
            }
          }
        }
      } catch (err) {
        console.error('❌ Studio - Error saving document:', err);
        setSaveStatus('error');
      }
    }, 3000), // Increased from 1000ms to 3000ms
    [cvId, coverLetterId, jobId, selectedJobId, selectedTemplate, userId, justCreated, documentType, coverLetterTitle]
  );

  // Autosave on actual changes only
  useEffect(() => {
    if (documentType === 'cover-letter') {
      // For cover letters, save when cover letter data changes
      if (coverLetterData && !isLoading && !justCreated) {
        const currentDataHash = JSON.stringify(coverLetterData);
        if (currentDataHash !== lastSavedData) {
          const timeoutId = setTimeout(() => {
            if (cvData) {
              debouncedSave(cvData);
              setLastSavedData(currentDataHash);
            }
          }, 2000); // Increased from 500ms to 2000ms

          return () => clearTimeout(timeoutId);
        }
      }
    } else {
      // For CVs, save when CV data changes
      if (cvData && !isLoading && !justCreated) {
        const currentDataHash = JSON.stringify(cvData);
        if (currentDataHash !== lastSavedData) {
          const timeoutId = setTimeout(() => {
            debouncedSave(cvData);
            setLastSavedData(currentDataHash);
          }, 2000); // Increased from 500ms to 2000ms

          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [cvData, coverLetterData, debouncedSave, isLoading, justCreated, documentType, lastSavedData]);

  // Initialize CV journey on component mount
  useEffect(() => {
    initializeCVJourney();
  }, [journeyId, cvId, coverLetterId, jobId, cvJourneyId, userId]);

  // Auto-duplicate master CV function
  const autoDuplicateMasterCV = async () => {
    try {
      console.log('🔍 Auto-duplicating master CV for cv-onboarding mode');
      
      // Fetch master CV first
      const masterResponse = await fetch(`/api/cvs/master?userId=${userId}`);
      const masterResult = await masterResponse.json();
      
      if (!masterResult.success || !masterResult.data?.masterCV) {
        console.log('❌ No master CV found for auto-duplication');
        return;
      }
      
      const masterCV = masterResult.data.masterCV;
      console.log('🔍 Found master CV for auto-duplication:', masterCV.title);
      
      // Create duplicate CV using ApplicationPackageService
      const duplicateResult = await ApplicationPackageService.duplicateCV({
        sourceCvId: masterCV.id,
        userId,
        newTitle: `${masterCV.title} (Copy for ${currentJob?.title || 'Job'})`
      });
      
      if (duplicateResult.success && duplicateResult.data?.cvId) {
        const duplicatedCVId = duplicateResult.data.cvId;
        console.log('✅ Auto-duplicated master CV:', duplicatedCVId);
        
        // Load the duplicated CV data
        const cvResult = await CVService.getCV(duplicatedCVId, userId);
        if (cvResult.cvData) {
          setCvData(cvResult.cvData);
          setCvTitle(cvResult.title || `${masterCV.title} (Copy for ${currentJob?.title || 'Job'})`);
          setIsMasterCV(false);
          setCurrentMasterCV(null);
          
          // Update journey with the new CV ID
          await updateJourneyWithDocument(duplicatedCVId, 'cv');
          
          // Update URL to show duplicated CV with journey context
          const urlParams = new URLSearchParams();
          urlParams.set('type', 'cv');
          urlParams.set('cvId', duplicatedCVId);
          if (journeyId) {
            urlParams.set('journeyId', journeyId);
          } else if (selectedJobId || jobId) {
            urlParams.set('jobId', selectedJobId || jobId);
          }
          router.replace(`/studio?${urlParams.toString()}`);
          
          console.log('✅ Auto-duplication completed successfully');
        }
      } else {
        throw new Error(duplicateResult.message || 'Failed to auto-duplicate master CV');
      }
    } catch (error) {
      console.error('❌ Error auto-duplicating master CV:', error);
      setError('Failed to auto-duplicate master CV');
    }
  };

  // Handle journey mode and initialization
  useEffect(() => {
    // NEW APPROACH: Initialize journey using journeyId for reliable Application Package context
    const primaryJourneyId = journeyId || cvJourneyId;
    
    if (primaryJourneyId) {
      console.log('🎯 CVStudio - Initializing journey from journeyId:', primaryJourneyId);
      // Journey context will be loaded in initializeCVJourney()
    } else if (jobId && !journeyState.isJourneyActive) {
      // FALLBACK: Legacy approach for backwards compatibility
      console.log('🔍 CVStudio - Starting journey for job (legacy):', jobId);
      startJourney(jobId);
    } else if (jobId && journeyState.currentJobId !== jobId) {
      console.log('🔍 CVStudio - Updating journey job ID (legacy):', jobId);
      updateCurrentJobId(jobId);
    }

    // Update journey status based on current state
    if (cvId && journeyState.cvId !== cvId) {
      console.log('🔍 CVStudio - Updating journey CV ID:', cvId);
      updateCVId(cvId);
      updateJourneyStatus('cv-created');
    }

    if (mode) {
      console.log('🔍 CVStudio - Journey mode detected:', mode);

      switch (mode) {
        case 'cv-onboarding':
          // Set up CV creation mode
          updateJourneyStatus('job-added');
          // Auto-duplicate master CV for cv-onboarding mode
          if (!cvData && !cvId) {
            console.log('🔍 CVStudio - Auto-duplicating master CV for cv-onboarding mode');
            autoDuplicateMasterCV();
          }
          break;
        case 'ats-edit':
          // Set up ATS editing mode
          updateJourneyStatus('cv-created');
          break;
        case 'cover-letter-edit':
          // Check if CV has satisfactory ATS score
          if (journeyState.atsScore && journeyState.atsScore < 80) {
            setActionBlockerConfig({
              title: 'ATS Score Required',
              message: 'Please achieve a satisfactory ATS score before creating your cover letter.',
              actionRequired: 'Improve your CV to get an ATS score above 80%',
              onAction: () => {
                // Navigate to ATS editing mode
                router.push(`/studio?jobId=${jobId}&mode=ats-edit`);
              }
            });
            setShowActionBlocker(true);
          } else {
            updateJourneyStatus('ats-checked');
          }
          break;
      }
    }
  }, [mode, journeyState, jobId, cvId, router, updateJourneyStatus, updateCVId, updateCurrentJobId, startJourney]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔍 CVStudio - Loading initial data...', { cvId, coverLetterId, jobId, userId, documentType });
        console.log('🔍 CVStudio - User ID type:', typeof userId, 'Value:', userId);

        // Validate userId
        if (!userId) {
          throw new Error('User ID is required to load document data');
        }

        // Load templates
        let templatesResult: any[] = [];
        try {
          templatesResult = await TemplateService.getTemplates();
          setTemplates(templatesResult);
          console.log('Templates loaded:', templatesResult.length);
        } catch (templateError) {
          console.error('Failed to load templates:', templateError);
          // Don't fail the entire load for template errors
          setTemplates([]);
        }

        // NEW APPROACH: Load job data prioritizing journeyId for reliable Application Package context
        const primaryJourneyId = journeyId || cvJourneyId;
        const targetJobId = journeyInfo?.jobId || jobId;
        
        if (targetJobId) {
          try {
            console.log('🎯 CVStudio - Loading job data from journey context:', { 
              journeyId: primaryJourneyId, 
              jobId: targetJobId 
            });
            const jobResponse = await fetch(`/api/jobs?userId=${userId}&jobId=${targetJobId}`);
            if (!jobResponse.ok) {
              throw new Error('Failed to fetch job');
            }
            const jobResult = await jobResponse.json();

            // Extract job data from the response
            let jobData;
            if (jobResult.data?.jobs) {
              // If we got a list of jobs, find the specific one
              jobData = jobResult.data.jobs.find((job: any) => job.id === targetJobId || job._id === targetJobId);
            } else {
              // If we got a single job directly
              jobData = jobResult.job || jobResult;
            }

            if (!jobData) {
              throw new Error('Job not found');
            }

            setCurrentJob(jobData);
            setSelectedJobId(targetJobId);
            setJobAutoLoadedFromJourney(!!primaryJourneyId);
            console.log('✅ CVStudio - Job data loaded from journey context:', jobData);
          } catch (jobError) {
            console.error('❌ CVStudio - Failed to load job data from journey:', jobError);
            // Don't fail the entire load for job errors
          }
        } else {
          // If no specific jobId provided, try to load job from CV Journey
          try {
            const journeyInfo = await CVJourneyLookupService.getJourneyInfoForStudio(
              cvId,
              coverLetterId,
              null, // no specific jobId
              userId
            );
            
            if (journeyInfo && journeyInfo.jobTitle && journeyInfo.company) {
              setCurrentJob({
                id: journeyInfo.jobId,
                title: journeyInfo.jobTitle,
                company: journeyInfo.company
              });
              setSelectedJobId(journeyInfo.jobId);
              setJobAutoLoadedFromJourney(true);
              console.log('🔍 CVStudio - Auto-loaded job from CV Journey:', journeyInfo.jobTitle);
            }
          } catch (error) {
            console.error('❌ CVStudio - Failed to auto-load job from CV Journey:', error);
          }
        }

        // Load document data based on type
        if (documentType === 'cover-letter') {
          // Load Cover Letter data
          if (coverLetterId) {
            try {
              const response = await fetch(`/api/cover-letters/${coverLetterId}?userId=${userId}`);
              if (!response.ok) {
                throw new Error('Failed to load cover letter');
              }
              const coverLetterResult = await response.json();
              console.log('Cover letter data loaded:', coverLetterResult);
              setCoverLetterData(coverLetterResult.coverLetter || coverLetterResult);
              setCoverLetterTitle(coverLetterResult.coverLetter?.title || coverLetterResult.title || 'Untitled Cover Letter');

              // Load CV Journey data to get job and CV information
              try {
                const journeyInfo = await CVJourneyLookupService.getJourneyInfoForStudio(
                  null, // cvId
                  coverLetterId, // coverLetterId
                  jobId, // jobId from URL
                  userId
                );
                
                if (journeyInfo) {
                  console.log('🔍 CVStudio - Loaded CV Journey data for cover letter:', journeyInfo);
                  
                  // Set job information from CV Journey
                  if (journeyInfo.jobTitle && journeyInfo.company) {
                    setCurrentJob({
                      id: journeyInfo.jobId,
                      title: journeyInfo.jobTitle,
                      company: journeyInfo.company
                    });
                    // Auto-select the job in the job selector
                    setSelectedJobId(journeyInfo.jobId);
                    setJobAutoLoadedFromJourney(true);
                  }
                  
                  // Set CV information if available
                  if (journeyInfo.cvId) {
                    try {
                      const cvResponse = await fetch(`/api/cvs/${journeyInfo.cvId}?userId=${userId}`);
                      if (cvResponse.ok) {
                        const cvResult = await cvResponse.json();
                        const cvData = cvResult.data?.cv?.cvData || cvResult.cv?.cvData;
                        setCvData(cvData);
                        setCvTitle(cvResult.data?.cv?.title || cvResult.cv?.title || 'Untitled CV');
                        
                        // Check if this is a master CV
                        const isMasterCV = cvResult.data?.cv?.isMaster || false;
                        if (isMasterCV) {
                          setIsMasterCV(true);
                          setCurrentMasterCV({ id: journeyInfo.cvId, title: cvResult.data?.cv?.title || cvResult.cv?.title });
                        } else {
                          setIsMasterCV(false);
                          setCurrentMasterCV(null);
                        }
                      }
                    } catch (cvError) {
                      console.error('Error loading linked CV from journey:', cvError);
                    }
                  }
                } else {
                  console.log('🔍 CVStudio - No CV Journey data found for cover letter');
                  
                  // Fallback: Auto-load linked job and CV data if available (old logic)
                  const coverLetter = coverLetterResult.coverLetter || coverLetterResult;
                  if (coverLetter.jobId && !currentJob) {
                    console.log('🔍 CVStudio - Auto-loading linked job (fallback):', coverLetter.jobId);
                    setSelectedJobId(coverLetter.jobId);
                  }
                  if (coverLetter.cvId && !cvData) {
                    console.log('🔍 CVStudio - Auto-loading linked CV (fallback):', coverLetter.cvId);
                    // Load the linked CV data for context
                    try {
                      const cvResponse = await fetch(`/api/cvs/${coverLetter.cvId}?userId=${userId}`);
                      if (cvResponse.ok) {
                        const cvResult = await cvResponse.json();
                        // The API returns data in the correct format, use cvData directly
                        const cvData = cvResult.data?.cv?.cvData || cvResult.cv?.cvData;
                        setCvData(cvData);
                        setCvTitle(cvResult.data?.cv?.title || cvResult.cv?.title || 'Untitled CV');
                      }
                    } catch (cvError) {
                      console.error('Error loading linked CV:', cvError);
                    }
                  }
                }
              } catch (error) {
                console.error('❌ CVStudio - Failed to load CV Journey data for cover letter:', error);
              }
            } catch (error) {
              console.error('Error loading cover letter:', error);
              setError('Failed to load cover letter data');
            }
          } else {
            // Create default cover letter data with auto-linked job and CV
            console.log('🔍 CVStudio - Creating new cover letter with auto-linked data:', { jobId: selectedJobId || jobId, cvId });

            // Generate smart cover letter title based on job context
            const jobData = currentJob;
            const smartTitle = generateDocumentName({
              jobTitle: jobData?.title || jobData?.jobTitle,
              company: jobData?.company,
              documentType: 'cover-letter'
            });

            const defaultCoverLetterData = {
              title: smartTitle,
              content: '',
              status: 'draft',
              cvId: cvId || null, // Auto-link CV from URL params
              jobId: selectedJobId || jobId, // Auto-link job from URL params
              metadata: {
                targetCompany: jobData?.company || '',
                targetPosition: jobData?.title || jobData?.jobTitle || '',
                keywords: [],
                wordCount: 0,
                isPublic: false,
                lastModified: new Date(),
                version: 1
              }
            };
            console.log('Setting default cover letter data with smart title:', defaultCoverLetterData);
            setCoverLetterData(defaultCoverLetterData);
            setCoverLetterTitle(smartTitle);
          }
        } else {
          // Load CV data
          if (cvId) {
            let cvResult: any = null;
            let convertedData: any = null;

            // Check if CV data is in sessionStorage (for new CVs or master CVs)
            const sessionCVData = sessionStorage.getItem('newCVData');
            const masterCVData = sessionStorage.getItem('editingMasterCV');
            const editingCVData = sessionStorage.getItem('editingCVData');
            
            if (sessionCVData) {
              try {
                const parsedCVData = JSON.parse(sessionCVData);
                console.log('Found CV data in sessionStorage:', parsedCVData);

                // Set CV data from sessionStorage
                if (parsedCVData.cvData) {
                  // Data is already in unified format
                  convertedData = parsedCVData.cvData;
                  console.log('Session CV data:', convertedData);
                  setCvData(convertedData);
                  cvResult = parsedCVData;
                } else {
                  // Fallback to API call using unified service
                  const unifiedCV = await UnifiedCVService.getCV(cvId, userId);
                  console.log('Unified API CV data:', unifiedCV.cvData);
                  setCvData(unifiedCV.cvData);
                }

                // Set template if available
                if (parsedCVData.templateId && templatesResult.length > 0) {
                  const template = templatesResult.find((t: any) => t.id === parsedCVData.templateId);
                  if (template) {
                    setSelectedTemplate(template);
                  }
                }

                // Clear sessionStorage
                sessionStorage.removeItem('newCVData');
              } catch (error) {
                console.error('Error parsing session CV data:', error);
                // Fallback to API call
                cvResult = await CVService.getCV(cvId, userId);
                convertedData = cvResult.cvData;
                console.log('Error fallback CV data:', convertedData);
                setCvData(convertedData);

                // Set CV title from the result
                if (cvResult.title) {
                  setCvTitle(cvResult.title);
                } else {
                  // Generate title from CV data if not available
                  const generatedTitle = generateCVName(convertedData);
                  setCvTitle(generatedTitle);
                }
              }
            } else if (masterCVData || editingCVData) {
              // Handle master CV data from sessionStorage
              try {
                let masterCV: any = null;
                let cvDataFromStorage: any = null;
                
                if (masterCVData) {
                  masterCV = JSON.parse(masterCVData);
                  cvDataFromStorage = masterCV.cvData;
                  console.log('🔍 Found master CV data in sessionStorage:', masterCV);
                } else if (editingCVData) {
                  cvDataFromStorage = JSON.parse(editingCVData);
                  console.log('🔍 Found editing CV data in sessionStorage:', cvDataFromStorage);
                }
                
                if (cvDataFromStorage) {
                  // Data is already in unified format
                  convertedData = cvDataFromStorage;
                  
                  console.log('✅ Master CV data loaded from sessionStorage:', convertedData);
                  setCvData(convertedData);
                  setCvTitle(masterCV?.title || 'Master CV');
                  setIsMasterCV(true);
                  
                  // Create a mock cvResult for consistency
                  cvResult = {
                    title: masterCV?.title || 'Master CV',
                    cvData: convertedData,
                    isMaster: true
                  };
                }
                
                // Clear master CV sessionStorage
                sessionStorage.removeItem('editingMasterCV');
                sessionStorage.removeItem('editingCVId');
                sessionStorage.removeItem('editingCVTitle');
                sessionStorage.removeItem('editingCVData');
                
              } catch (error) {
                console.error('❌ Error parsing master CV data:', error);
                // Fallback to API call
                cvResult = await CVService.getCV(cvId, userId);
                convertedData = cvResult.cvData;
                console.log('Error fallback CV data:', convertedData);
                setCvData(convertedData);
              }
            } else {
              // Load existing CV from API
              console.log('🔍 CVStudio - Fetching CV with ID:', cvId, 'User ID:', userId);
              console.log('🔍 CVStudio - User ID type:', typeof userId, 'Length:', userId?.length);
              console.log('🔍 CVStudio - CV ID type:', typeof cvId, 'Length:', cvId?.length);
              
              // Check if this is a Master CV and try the master CV API first
              const isMasterCV = new URLSearchParams(window.location.search).get('master') === 'true';
              if (isMasterCV) {
                console.log('🔍 CVStudio - Detected Master CV, trying master API first');
                try {
                  const masterResponse = await fetch(`/api/cvs/master?userId=${userId}`);
                  const masterResult = await masterResponse.json();
                  
                  if (masterResult.success && masterResult.data?.masterCV) {
                    console.log('✅ CVStudio - Master CV loaded from master API');
                    cvResult = masterResult.data.masterCV;
                    convertedData = cvResult.cvData;
                    setCvData(convertedData);
                    setIsMasterCV(true);
                    
                    // Set CV title from the result
                    if (cvResult.title) {
                      setCvTitle(cvResult.title);
                    } else {
                      const generatedTitle = generateCVName(convertedData);
                      setCvTitle(generatedTitle);
                    }
                    
                    // Skip the CVService call since we got the data from master API
                    console.log('✅ CVStudio - Master CV loaded successfully from master API');
                  } else {
                    console.log('❌ CVStudio - Master CV not found in master API, falling back to CVService');
                    throw new Error('Master CV not found in master API');
                  }
                } catch (masterError) {
                  console.error('❌ CVStudio - Master API failed, falling back to CVService:', masterError);
                  // Fall through to CVService call below
                }
              }
              
              // If not a master CV or master API failed, use CVService
              if (!cvResult) {
                try {
                  console.log('🔍 CVStudio - Fetching CV using CVService with cvId:', cvId, 'userId:', userId);
                  cvResult = await CVService.getCV(cvId, userId);
                  console.log('🔍 CVStudio - CVService returned:', cvResult);
                  console.log('🔍 CVStudio - cvResult has cvData?', !!cvResult?.cvData);
                  
                  // CVService.getCV returns UnifiedCVDocument which has cvData property
                  convertedData = cvResult.cvData;
                  console.log('🔍 CVStudio - Existing CV data from service:', convertedData);
                  console.log('🔍 CVStudio - CV data type:', typeof convertedData);
                  console.log('🔍 CVStudio - CV data work section:', convertedData?.work);
                  console.log('🔍 CVStudio - CV data work array length:', convertedData?.work?.length);
                  setCvData(convertedData);

                  // Set CV title from the result
                  if (cvResult.title) {
                    setCvTitle(cvResult.title);
                  } else {
                    // Generate title from CV data if not available
                    const generatedTitle = generateCVName(convertedData);
                    setCvTitle(generatedTitle);
                  }

                  // Check if this is a master CV from the API response
                  // We need to fetch the full CV data to check isMaster field
                  const cvResponse = await fetch(`/api/cvs/${cvId}?userId=${userId}`);
                  if (cvResponse.ok) {
                    const cvData = await cvResponse.json();
                    const isMasterCV = cvData.data?.cv?.isMaster || false;
                    
                    if (isMasterCV) {
                      setIsMasterCV(true);
                      setCurrentMasterCV({ id: cvId, title: cvResult.title || cvTitle });
                      console.log('🔍 Master CV detected from API response');
                    } else {
                      setIsMasterCV(false);
                      setCurrentMasterCV(null);
                      console.log('🔍 Tailored CV detected from API response');
                    }
                  } else {
                    // Fallback: Check URL parameters if API call fails
                    const urlParams = new URLSearchParams(window.location.search);
                    const isMasterFromURL = urlParams.get('master') === 'true';
                    if (isMasterFromURL) {
                      setIsMasterCV(true);
                      setCurrentMasterCV({ id: cvId, title: cvResult.title || cvTitle });
                      console.log('🔍 Master CV detected from URL parameters (fallback)');
                    }
                  }
                } catch (error) {
                  console.error('❌ CVStudio - Failed to fetch CV:', error);
                  console.log('🔍 CVStudio - Fetch failed for CV ID:', cvId, 'User ID:', userId);
                  
                  // Provide more specific error messages
                  let errorMessage = 'CV not found or access denied';
                  if (error instanceof Error) {
                    if (error.message.includes('Authentication required')) {
                      errorMessage = 'Please log in to access this CV';
                    } else if (error.message.includes('Access denied')) {
                      errorMessage = 'You do not have permission to access this CV';
                    } else if (error.message.includes('CV not found')) {
                      errorMessage = 'This CV no longer exists or has been moved';
                    } else {
                      errorMessage = error.message;
                    }
                  }
                  
                  setError(`Failed to load CV: ${errorMessage}`);
                  setIsLoading(false);
                  return;
                }

                // Load CV Journey data to get job and cover letter information
                try {
                  const journeyInfo = await CVJourneyLookupService.getJourneyInfoForStudio(
                    cvId,
                    null, // coverLetterId
                    jobId, // jobId from URL
                    userId
                  );
                  
                  if (journeyInfo) {
                    console.log('🔍 CVStudio - Loaded CV Journey data:', journeyInfo);
                    
                    // Set job information from CV Journey
                    if (journeyInfo.jobTitle && journeyInfo.company) {
                      setCurrentJob({
                        id: journeyInfo.jobId,
                        title: journeyInfo.jobTitle,
                        company: journeyInfo.company
                      });
                      // Auto-select the job in the job selector
                      setSelectedJobId(journeyInfo.jobId);
                      setJobAutoLoadedFromJourney(true);
                    }
                    
                    // Set cover letter information if available
                    if (journeyInfo.coverLetterId) {
                      setCurrentCoverLetter({
                        id: journeyInfo.coverLetterId,
                        title: `Cover Letter for ${journeyInfo.jobTitle}`,
                        content: '' // Will be loaded separately if needed
                      });
                    }
                  } else {
                    console.log('🔍 CVStudio - No CV Journey data found');
                  }
                } catch (error) {
                  console.error('❌ CVStudio - Failed to load CV Journey data:', error);
                }
            }
          }

          // Set template if available, otherwise use Modern Professional as default
          if (cvResult && cvResult.templateId && templatesResult.length > 0) {
            // Handle both id and _id fields for template matching
            const templateIdToMatch = cvResult.templateId.toString();
            const template = templatesResult.find((t: any) => 
              t.id === templateIdToMatch || 
              t._id === templateIdToMatch || 
              t.id?.toString() === templateIdToMatch ||
              t._id?.toString() === templateIdToMatch
            );
            if (template) {
              console.log('✅ Studio - Loaded template from CV:', template.name);
              setSelectedTemplate(template);
            } else {
              console.log('⚠️ Studio - Template not found, using Modern Professional as fallback');
              // Fallback to Modern Professional if template not found
              const modernProfessional = templatesResult.find((t: any) => 
                t.name === 'Modern Professional' || t.name.toLowerCase().includes('modern professional')
              );
              setSelectedTemplate(modernProfessional || templatesResult[0]);
            }
          } else if (templatesResult.length > 0) {
            console.log('✅ Studio - No template specified, using Modern Professional as default');
            // No template specified, use Modern Professional as default
            const modernProfessional = templatesResult.find((t: any) => 
              t.name === 'Modern Professional' || t.name.toLowerCase().includes('modern professional')
            );
            setSelectedTemplate(modernProfessional || templatesResult[0]);
          }
        } else {
            // Create default CV data structure
            const defaultCVData: CVDataStructure = {
              basics: {
                name: '',
                label: '',
                image: '',
                email: '',
                phone: '',
                url: '',
                summary: '',
                location: {
                  address: '',
                  postalCode: '',
                  city: '',
                  countryCode: '',
                  region: ''
                },
                profiles: []
              },
              work: [],
              volunteer: [],
              education: [],
              awards: [],
              certificates: [],
              publications: [],
              skills: [],
              languages: [],
              interests: [],
              references: [],
              projects: []
            };
            console.log('Setting default CV data:', defaultCVData);
            setCvData(defaultCVData);

            // Set default title for new CV
            setCvTitle('Untitled CV');

            // If no cvId is provided, we're creating a new CV
            // Set Modern Professional as default template if available, otherwise use first template
            if (templatesResult.length > 0) {
              const modernProfessional = templatesResult.find((t: any) => 
                t.name === 'Modern Professional' || t.name.toLowerCase().includes('modern professional')
              );
              setSelectedTemplate(modernProfessional || templatesResult[0]);
            }
          }
        }

        setIsLoading(false);
        console.log('Initial data loading completed');
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document data');
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [cvId, coverLetterId, jobId, userId, documentType, setTemplates, setSelectedTemplate, setCurrentJob]);

  const handleExport = async (format: 'pdf' | 'docx' | 'json' = 'pdf') => {
    if (!cvData) {
      console.error('No CV data to export');
      return;
    }

    try {
      setSaveStatus('saving');

      const exportData = {
        cvData,
        template: selectedTemplate,
        format,
        userId,
        cvId,
        jobId: selectedJobId || jobId
      };

      const response = await fetch('/api/cv/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${cvTitle || 'CV'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSaveStatus('saved');
      console.log(`Successfully exported as ${format}`);
    } catch (err) {
      console.error('Error exporting:', err);
      setSaveStatus('error');
    }
  };

  const togglePanel = (panel: 'left' | 'right') => {
    setPanelStates(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  const handleJobSelection = async (jobId: string | null) => {
    setSelectedJobId(jobId);
    if (jobId) {
      try {
        // Fetch job data with userId
        console.log('🎯 CVStudio - Loading job data for jobId:', jobId);
        const response = await fetch(`/api/jobs?userId=${userId}&jobId=${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job');
        }
        const data = await response.json();

        // Extract job data from the response
        let jobData;
        if (data.data?.jobs) {
          // If we got a list of jobs, find the specific one
          jobData = data.data.jobs.find((job: any) => job.id === jobId || job._id === jobId);
        } else {
          // If we got a single job directly
          jobData = data.job || data;
        }

        if (!jobData) {
          throw new Error('Job not found');
        }

        setCurrentJob(jobData);
        
        // NEW: Update journey context if we have a journeyId
        const primaryJourneyId = journeyId || cvJourneyId;
        if (primaryJourneyId && journeyInfo) {
          console.log('🔄 CVStudio - Updating journey with new job selection:', jobId);
          updateCurrentJobId(jobId);
          
          // Update local journey info
          setJourneyInfo({
            ...journeyInfo,
            jobId: jobId
          });
        }
      } catch (err) {
        console.error('❌ CVStudio - Error loading job data:', err);
      }
    } else {
      setCurrentJob(null);
    }
  };

  const handleTitleUpdate = async (newTitle: string) => {
    if (documentType === 'cover-letter') {
      setCoverLetterTitle(newTitle);
    } else {
      if (cvId && newTitle.trim()) {
        try {
          await CVService.updateCV(cvId, {
            title: newTitle.trim()
          }, userId || undefined);
          setCvTitle(newTitle.trim());
          setIsEditingTitle(false);
        } catch (error) {
          console.error('Error updating CV title:', error);
        }
      } else {
        setCvTitle(newTitle.trim());
        setIsEditingTitle(false);
      }
    }
  };

  // Remove full page skeleton - show structure immediately with inline skeletons for data

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Function to reload CV data when switching back to CV
  const reloadCVData = async (cvIdToLoad: string) => {
    try {
      console.log('🔄 Reloading CV data for ID:', cvIdToLoad);
      const response = await fetch(`/api/cvs/${cvIdToLoad}?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load CV');
      }
      const cvResult = await response.json();
      const cvData = cvResult.data?.cv?.cvData || cvResult.cv?.cvData || cvResult.cvData;
      const cvTitle = cvResult.data?.cv?.title || cvResult.cv?.title || cvResult.title;
      
      if (cvData) {
        setCvData(cvData);
        setCvTitle(cvTitle || 'Untitled CV');
        console.log('✅ CV data reloaded successfully:', cvTitle);
      } else {
        console.warn('⚠️ No CV data found in response');
      }
    } catch (error) {
      console.error('❌ Failed to reload CV data:', error);
    }
  };

  // Function to reload cover letter data when switching to cover letter
  const reloadCoverLetterData = async (coverLetterIdToLoad: string) => {
    try {
      console.log('🔄 Reloading cover letter data for ID:', coverLetterIdToLoad);
      const response = await fetch(`/api/cover-letters/${coverLetterIdToLoad}?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load cover letter');
      }
      const coverLetterResult = await response.json();
      const coverLetterData = coverLetterResult.data?.coverLetter || coverLetterResult.coverLetter || coverLetterResult;
      const coverLetterTitle = coverLetterData.title || 'Untitled Cover Letter';
      
      if (coverLetterData) {
        setCoverLetterData(coverLetterData);
        setCoverLetterTitle(coverLetterTitle);
        console.log('✅ Cover letter data reloaded successfully:', coverLetterTitle);
      } else {
        console.warn('⚠️ No cover letter data found in response');
      }
    } catch (error) {
      console.error('❌ Failed to reload cover letter data:', error);
    }
  };

  const handleDocumentTypeChange = async (newType: 'cv' | 'cover-letter') => {
    setDocumentType(newType);
    
    // Update URL to reflect the document type change
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    
    // NEW APPROACH: Prioritize journeyId for reliable Application Package context
    const currentJourneyId = journeyId || journeyInfo?.journeyId || cvJourneyId;
    const currentJobId = journeyInfo?.jobId || selectedJobId || jobId;
    
    console.log('🔄 Document type change - Current context:', {
      journeyId,
      journeyInfoJourneyId: journeyInfo?.journeyId,
      cvJourneyId,
      currentJourneyId,
      currentJobId,
      cvId,
      coverLetterId
    });
    
    // Always preserve journeyId as the primary context identifier
    if (currentJourneyId) {
      searchParams.set('journeyId', currentJourneyId);
      // Remove legacy cvJourneyId to avoid confusion
      searchParams.delete('cvJourneyId');
      console.log('✅ Preserving journeyId in URL:', currentJourneyId);
    } else {
      console.warn('⚠️ No journeyId found - this may cause context loading issues');
    }
    
    // Keep jobId for backwards compatibility but it's now secondary to journeyId
    if (currentJobId) {
      searchParams.set('jobId', currentJobId);
    }
    
    if (newType === 'cover-letter') {
      // Switch to cover letter mode
      searchParams.set('type', 'cover_letter');
      
      // FIXED: Preserve existing coverLetterId from original state first, then component props, then URL params, then journeyInfo
      const existingCoverLetterId = originalCoverLetterId || coverLetterId || searchParams.get('coverLetterId') || journeyInfo?.coverLetterId;
      console.log('🔄 Switching to cover letter - Looking for coverLetterId:', {
        originalCoverLetterId,
        coverLetterIdFromProps: coverLetterId,
        coverLetterIdFromUrl: searchParams.get('coverLetterId'),
        coverLetterIdFromJourney: journeyInfo?.coverLetterId,
        finalCoverLetterId: existingCoverLetterId
      });
      
      if (existingCoverLetterId) {
        searchParams.set('coverLetterId', existingCoverLetterId);
        console.log('✅ Switching to existing cover letter:', existingCoverLetterId);
        
        // Reload cover letter data to ensure we have the latest version
        await reloadCoverLetterData(existingCoverLetterId);
      } else {
        console.log('🔍 No existing cover letter found');
        
        // Check if there's a cover letter in the journey context that we can load
        if (journeyInfo?.coverLetterId) {
          console.log('🔍 Found cover letter in journey context, loading:', journeyInfo.coverLetterId);
          searchParams.set('coverLetterId', journeyInfo.coverLetterId);
          await reloadCoverLetterData(journeyInfo.coverLetterId);
        } else {
          console.log('🔍 No existing cover letter found, creating new one');
          
          // Auto-create cover letter in the same journey
          try {
            const coverLetterTitle = `Cover Letter for ${journeyInfo?.jobTitle || currentJob?.title || 'Position'}`;
            const coverLetterResponse = await fetch('/api/cover-letters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId,
                title: coverLetterTitle,
                content: `Dear Hiring Manager,\n\nI am writing to express my interest in the ${journeyInfo?.jobTitle || currentJob?.title || 'position'} at ${journeyInfo?.company || currentJob?.company || 'your company'}.\n\n[Your cover letter content will go here]\n\nSincerely,\n[Your Name]`,
                jobId: journeyInfo?.jobId || currentJob?.id || jobId
              })
            });
            
            if (coverLetterResponse.ok) {
              const coverLetterResult = await coverLetterResponse.json();
              if (coverLetterResult.success && coverLetterResult.data?.coverLetter) {
                const newCoverLetterId = coverLetterResult.data.coverLetter.id;
                searchParams.set('coverLetterId', newCoverLetterId);
                console.log('✅ Created new cover letter:', newCoverLetterId);
              }
            }
          } catch (error) {
            console.error('❌ Failed to create cover letter:', error);
          }
        }
      }
      
      // Remove CV-specific params when switching to cover letter
      searchParams.delete('cvId');
    } else {
      // Switch to CV mode
      searchParams.set('type', 'cv');
      
      // FIXED: Preserve existing cvId from original state first, then component props, then URL params, then journeyInfo
      const existingCvId = originalCvId || cvId || searchParams.get('cvId') || journeyInfo?.cvId;
      console.log('🔄 Switching to CV - Looking for cvId:', {
        originalCvId,
        cvIdFromProps: cvId,
        cvIdFromUrl: searchParams.get('cvId'),
        cvIdFromJourney: journeyInfo?.cvId,
        finalCvId: existingCvId
      });
      
      if (existingCvId) {
        searchParams.set('cvId', existingCvId);
        console.log('✅ Switching to existing CV:', existingCvId);
        
        // Reload CV data to ensure we have the latest version
        await reloadCVData(existingCvId);
      } else {
        console.log('🔍 No existing CV found');
        
        // Check if there's a CV in the journey context that we can load
        if (journeyInfo?.cvId) {
          console.log('🔍 Found CV in journey context, loading:', journeyInfo.cvId);
          searchParams.set('cvId', journeyInfo.cvId);
          await reloadCVData(journeyInfo.cvId);
        } else {
          console.warn('⚠️ No CV found in any context - this may indicate a data issue');
          setError('No existing CV found. Please ensure you have a CV linked to this journey.');
        }
      }
      
      // Remove cover letter-specific params when switching to CV
      searchParams.delete('coverLetterId');
    }
    
    // Update the URL without page reload
    const newUrl = `${url.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    console.log('🔄 Document type changed to:', newType, 'with journey:', currentJourneyId);
    console.log('🔗 New URL structure:', `${url.pathname}?${searchParams.toString()}`);
  };







  const handleSectionToggle = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleSectionVisibilityToggle = (sectionId: string) => {
    setSectionVisibility(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleToggleAllSections = () => {
    if (allSectionsCollapsed) {
      // Expand all
      setExpandedSections(new Set(sectionOrder));
    } else {
      // Collapse all
      setExpandedSections(new Set());
    }
    setAllSectionsCollapsed(!allSectionsCollapsed);
  };

  const handleParsedData = (parsedData: any) => {
    // Apply parsed data to CV
    if (parsedData.basics) {
      Object.keys(parsedData.basics).forEach(key => {
        updateCVField(`basics.${key}`, parsedData.basics[key]);
      });
    }
    if (parsedData.work) {
      updateCVField('work', parsedData.work);
    }
    if (parsedData.education) {
      updateCVField('education', parsedData.education);
    }
    if (parsedData.skills) {
      updateCVField('skills', parsedData.skills);
    }
  };

  // Master CV handlers
  const handleEditMasterCV = async (masterCV: any) => {
    try {
      console.log('🔍 Editing master CV:', masterCV);
      console.log('🔍 Master CV ID:', masterCV.id, 'Type:', typeof masterCV.id);
      console.log('🔍 User ID:', userId, 'Type:', typeof userId);
      
      // Load master CV data using the same approach as Canvas
      // First try to get the master CV directly from the master CV API
      try {
        const masterResponse = await fetch(`/api/cvs/master?userId=${userId}`);
        const masterResult = await masterResponse.json();
        
        if (masterResult.success && masterResult.data?.masterCV) {
          console.log('✅ Master CV loaded from master API:', masterResult.data.masterCV);
          const masterCVData = masterResult.data.masterCV;
          
          if (masterCVData.cvData) {
            setCvData(masterCVData.cvData);
            setCvTitle(masterCVData.title || masterCV.title);
            setIsMasterCV(true);
            setCurrentMasterCV(masterCV);
            
            // Update URL to show master CV editing
            const urlParams = new URLSearchParams();
            urlParams.set('type', 'cv');
            urlParams.set('cvId', masterCV.id);
            urlParams.set('master', 'true');
            if (selectedJobId || jobId) {
              urlParams.set('jobId', selectedJobId || jobId);
            }
            router.replace(`/studio?${urlParams.toString()}`);
            
            return; // Success, exit early
          }
        }
      } catch (masterError) {
        console.error('❌ Failed to load master CV from master API:', masterError);
      }
      
      // Fallback: Try to load using UnifiedCVService
      console.log('🔄 Falling back to UnifiedCVService for master CV loading');
      const unifiedCV = await UnifiedCVService.getCV(masterCV.id, userId);
      if (unifiedCV.cvData) {
        setCvData(unifiedCV.cvData);
        setCvTitle(unifiedCV.title || masterCV.title);
        setIsMasterCV(true);
        setCurrentMasterCV(masterCV);
        
        // Update URL to show master CV editing
        const urlParams = new URLSearchParams();
        urlParams.set('type', 'cv');
        urlParams.set('cvId', masterCV.id);
        urlParams.set('master', 'true');
        if (selectedJobId || jobId) {
          urlParams.set('jobId', selectedJobId || jobId);
        }
        router.replace(`/studio?${urlParams.toString()}`);
      } else {
        throw new Error('Master CV data not found');
      }
      
      console.log('✅ Master CV loaded for editing');
    } catch (error) {
      console.error('❌ Error loading master CV:', error);
      setError('Failed to load master CV');
    }
  };

  const handleDuplicateMasterCV = async (masterCV: any) => {
    try {
      console.log('🔍 Duplicating master CV:', masterCV);
      
      // Only allow duplication if this is actually a master CV
      if (!isMasterCV) {
        console.log('❌ Cannot duplicate: This is not a master CV');
        setError('Only master CVs can be duplicated');
        return;
      }
      
      // Create duplicate CV
      const response = await fetch('/api/cvs/master', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          jobTitle: currentJob?.title || 'Untitled Job',
          company: currentJob?.company || 'Company',
          jobId: selectedJobId || jobId
        }),
      });

      const result = await response.json();
      
      if (result.success && result.data?.cv) {
        const duplicatedCV = result.data.cv;
        
        // Load the duplicated CV data
        const cvResult = await CVService.getCV(duplicatedCV.id, userId);
        if (cvResult.cvData) {
          setCvData(cvResult.cvData);
          setCvTitle(cvResult.title || duplicatedCV.title);
          setIsMasterCV(false);
          setCurrentMasterCV(null);
          
          // Update URL to show duplicated CV
          const urlParams = new URLSearchParams();
          urlParams.set('type', 'cv');
          urlParams.set('cvId', duplicatedCV.id);
          if (selectedJobId || jobId) {
            urlParams.set('jobId', selectedJobId || jobId);
          }
          router.replace(`/studio?${urlParams.toString()}`);
          
          console.log('✅ Master CV duplicated successfully');
        }
      } else {
        throw new Error(result.message || 'Failed to duplicate master CV');
      }
    } catch (error) {
      console.error('❌ Error duplicating master CV:', error);
      setError('Failed to duplicate master CV');
    }
  };


  // Create sections for draggable component
  const createSections = () => {
    const sectionComponents: Record<string, React.ReactNode> = {
      basics: (
        <PersonalInfoForm
          personalInfo={cvData?.basics || {
            name: '', label: '', image: '', email: '', phone: '', url: '', summary: '',
            location: { address: '', postalCode: '', city: '', countryCode: '', region: '' },
            profiles: []
          }}
          onUpdate={(field, value) => updateCVField(`basics.${field}`, value)}
          cvData={cvData}
          jobData={currentJob}
          userId={userId}
        />
      ),
      work: (
        <WorkExperienceSection
          data={(() => {
            const workData = cvData?.work || [];
            console.log('🔍 CVStudio - Passing work data to WorkExperienceSection:', workData);
            console.log('🔍 CVStudio - Work data length:', workData.length);
            console.log('🔍 CVStudio - Work data type:', Array.isArray(workData) ? 'array' : typeof workData);
            return workData;
          })()}
          onUpdate={updateCVField}
          onAdd={() => addSection('work')}
          onRemove={(index) => removeSection('work', index.toString())}
          jobData={currentJob}
          userId={userId}
        />
      ),
      education: (
        <EducationSection
          data={cvData?.education || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('education')}
          onRemove={(index) => removeSection('education', index.toString())}
          jobData={currentJob}
          userId={userId}
        />
      ),
      skills: (
        <SkillsSection
          data={cvData?.skills || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('skills')}
          onRemove={(index) => removeSection('skills', index.toString())}
        />
      ),
      projects: (
        <ProjectsSection
          data={cvData?.projects || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('projects')}
          onRemove={(index) => removeSection('projects', index.toString())}
          jobData={currentJob}
          userId={userId}
        />
      ),
      certificates: (
        <CertificatesSection
          data={cvData?.certificates || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('certificates')}
          onRemove={(index) => removeSection('certificates', index.toString())}
          jobData={currentJob}
          userId={userId}
        />
      ),
      languages: (
        <LanguagesSection
          data={cvData?.languages || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('languages')}
          onRemove={(index) => removeSection('languages', index.toString())}
        />
      )
    };

    return sectionOrder.map(sectionId => ({
      id: sectionId,
      title: sectionId.charAt(0).toUpperCase() + sectionId.slice(1),
      icon: getSectionIcon(sectionId),
      isVisible: sectionVisibility[sectionId],
      isExpanded: expandedSections.has(sectionId),
      component: sectionComponents[sectionId]
    }));
  };

  const getSectionIcon = (sectionId: string) => {
    const icons: Record<string, any> = {
      basics: User,
      work: Briefcase,
      education: GraduationCap,
      skills: Code,
      projects: FolderOpen,
      certificates: Award,
      languages: Globe
    };
    return icons[sectionId] || User;
  };

  return (
    <>
      <FloatingStudioLayout
        documentTitle={documentType === 'cover-letter' ? coverLetterTitle : cvTitle}
        onTitleUpdate={documentType === 'cover-letter' ? setCoverLetterTitle : handleTitleUpdate}
        saveStatus={saveStatus}
        onSave={manualSave}
        onDownload={() => handleExport('pdf')}
        leftPanel={
          <TabbedStudioPanel
            structureContent={
              documentType === 'cover-letter' ? (
                <div className="space-y-6">
                  {/* Cover Letter Content */}
                  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6`}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cover Letter Content</h3>
                    <textarea
                      className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      placeholder="Write your cover letter content here or use AI to generate it..."
                      value={cvData?.basics?.summary || ''}
                      onChange={(e) => updateCVField('basics.summary', e.target.value)}
                    />
                  </div>

                  {/* AI Cover Letter Generator */}
                  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6`}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI Assistant</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Generate a personalized cover letter based on your CV and the selected job position.
                    </p>
                    <button
                      onClick={() => {
                        // AI generation logic here
                        console.log('Generate AI cover letter');
                      }}
                      className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
                    >
                      Generate with AI
                    </button>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="space-y-4">
                  {/* Skeleton for sections while loading */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-3"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !cvData ? (
                <div className="space-y-6">
                  {/* Master CV Card */}
                  <MasterCVCard
                    onEditMasterCV={handleEditMasterCV}
                    onDuplicateMasterCV={handleDuplicateMasterCV}
                    userId={userId}
                    isMasterCV={isMasterCV}
                  />
                </div>
              ) : (
                <DraggableSections
                  sections={createSections()}
                  onSectionToggle={handleSectionToggle}
                  onSectionVisibilityToggle={handleSectionVisibilityToggle}
                  onSectionReorder={(newSections) => {
                    setSectionOrder(newSections.map(s => s.id));
                  }}
                  allCollapsed={allSectionsCollapsed}
                  onToggleAllSections={handleToggleAllSections}
                />
              )
            }
            designContent={
              <DesignContent
                onSettingsChange={(settings) => {
                  console.log('Design settings changed:', settings);
                  // Apply design settings to template
                  if (selectedTemplate) {
                    const updatedTemplate = {
                      ...selectedTemplate,
                      globalStyles: {
                        ...selectedTemplate.globalStyles,
                        fontFamily: settings.fontFamily,
                        fontSize: `${settings.bodyFontSize}px`,
                        lineHeight: settings.lineSpacing.toString(),
                        primaryColor: settings.colorScheme === 'professional' ? '#1f2937' :
                          settings.colorScheme === 'modern' ? '#059669' :
                            settings.colorScheme === 'creative' ? '#7c3aed' : '#374151'
                      }
                    };
                    setSelectedTemplate(updatedTemplate);
                  }
                }}
              />
            }
            templateContent={
              <TemplateContent
                selectedTemplate={selectedTemplate}
                onTemplateSelect={(template) => {
                  setSelectedTemplate(template);
                  console.log('Template selected:', template);
                }}
                onTemplatePreview={(template) => {
                  console.log('Template preview:', template);
                }}
              />
            }
            jobATSContent={
              isMasterCV ? (
                <CVHealthScore
                  cvData={cvData}
                  cvTitle={cvTitle}
                />
              ) : (
                <ComprehensiveATSAnalyzer
                  selectedJobId={selectedJobId}
                  onJobSelection={handleJobSelection}
                  userId={userId}
                  cvData={cvData}
                  jobData={currentJob}
                  cvId={cvId}
                  onUpdateField={updateCVField}
                  onScoreUpdate={(score) => {
                    updateAtsScore(score);
                    if (score >= 60) {
                      updateJourneyStatus('ats-checked');
                    }
                  }}
                />
              )
            }

          />
        }
        rightPanel={
          isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
                <div className="aspect-[8.5/11] bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ) : (
            <PreviewPanel
              cvData={cvData}
              template={selectedTemplate}
              jobData={currentJob}
              zoom={zoom}
              setZoom={setZoom}
              paperSize={paperSize}
              setPaperSize={setPaperSize}
              documentType={documentType}
              sectionOrder={sectionOrder}
              sectionVisibility={sectionVisibility}
              pagePadding={pagePadding}
              setPagePadding={setPagePadding}
              onDocumentTypeChange={handleDocumentTypeChange}
              isMasterCV={isMasterCV}
            />
          )
        }
      />

      <ActionBlockerDialog
        isOpen={showActionBlocker}
        onClose={() => setShowActionBlocker(false)}
        title={actionBlockerConfig.title}
        message={actionBlockerConfig.message}
        actionRequired={actionBlockerConfig.actionRequired}
        onAction={actionBlockerConfig.onAction}
        actionLabel="Go to ATS Editor"
      />
    </>
  );
};

export default CVStudio;
