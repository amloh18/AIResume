'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import FloatingStudioLayout from './FloatingStudioLayout';
import TabbedStudioPanel from './TabbedStudioPanel';
import JobATSSection from './JobATSSection';
import ComprehensiveATSAnalyzer from './ComprehensiveATSAnalyzer';
import CVHealthScore from './CVHealthScore';
import DraggableSections from './DraggableSections';
import CVSectionsAndOrdering from './CVSectionsAndOrdering';
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
  Globe,
  Heart,
  Star,
  BookOpen,
  Users
} from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useJobStore } from '@/lib/stores/jobStore';
import { UnifiedCVService as CVService } from '@/lib/services/unified-cv-service';
import { TemplateService } from '@/lib/services/templateService';
import { JobService } from '@/lib/services/jobService';
import { debounce } from 'lodash';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { generateCVName, generateCVDescription, getCVMetadata } from '@/lib/utils/cvNamingUtils';
import { generateDocumentName } from '@/lib/utils/documentNaming';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import ActionBlockerDialog from '@/components/modals/ActionBlockerDialog';
import { CVJourneyLookupService, CVJourneyInfo } from '@/lib/services/cvJourneyLookupService';
import { ApplicationPackageService } from '@/lib/services/applicationPackageService';
import { useNotifications } from '@/contexts/NotificationContext';

interface CVStudioProps {
  journeyId?: string | null; // PRIMARY: Journey ID for proper Application Package context
  cvId?: string | null;
  coverLetterId?: string | null;
  documentType?: 'cv' | 'cover-letter';
  userId: string;
  mode?: string | null; // 'cv-onboarding', 'ats-edit', 'cover-letter-edit', 'document-first'
}

const CVStudio: React.FC<CVStudioProps> = ({
  journeyId,
  cvId,
  coverLetterId,
  documentType: initialDocumentType = 'cv',
  userId,
  mode,
}) => {
  const router = useRouter();
  const { data: session } = useSession();
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
  const { addNotification } = useNotifications();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
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
    'personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'
  ]);
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({
    personal_header: true,
    work_experience: true,
    education: true,
    skills: true,
    projects: true,
    certificates: true,
    languages: true
  });
  const [expandedSections, setExpandedSections] = useState(new Set([
    'personal_header', 'work_experience', 'skills'
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

  // Debounced autosave - defined early to avoid reference errors
  const debouncedSave = useCallback(
    debounce(async (data: CVDataStructure) => {
      try {
        setSaveStatus('saving');

        // Add timeout protection
        const saveTimeout = setTimeout(() => {
          console.error('❌ Studio - Save operation timed out');
          setSaveStatus('error');
        }, 10000); // 10 second timeout

        if (documentType === 'cover-letter') {
          // Handle cover letter save
          if (coverLetterId) {
            const response = await fetch(`/api/cover-letters/${coverLetterId}?userId=${userId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: coverLetterTitle,
                content: data.basics?.summary || '',
                cvId: cvId,
                jobId: selectedJobId
              })
            });

            if (!response.ok) {
              throw new Error('Failed to update cover letter');
            }

            clearTimeout(saveTimeout);
            setSaveStatus('saved');
            addNotification({
              type: 'success',
              title: 'Cover Letter Updated',
              message: 'Your cover letter has been saved successfully',
              persistent: false
            });
          } else {
            // Check if journey already has a cover letter
            const existingCoverLetterId = journeyInfo?.coverLetterId;
            if (existingCoverLetterId) {
              
              // Update the existing cover letter
              const response = await fetch(`/api/cover-letters/${existingCoverLetterId}?userId=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: coverLetterTitle,
                  content: data.basics?.summary || '',
                  cvId: cvId,
                  jobId: journeyInfo?.jobId || selectedJobId,
                  targetCompany: '',
                  targetPosition: '',
                  keywords: []
                })
              });

              if (response.ok) {
                
                // Update URL to use existing cover letter
                const urlParams = new URLSearchParams();
                urlParams.set('type', 'cover_letter');
                urlParams.set('coverLetterId', existingCoverLetterId);
                if (journeyInfo?.jobId || selectedJobId) {
                  urlParams.set('jobId', journeyInfo?.jobId || selectedJobId);
                }
                if (journeyInfo?.journeyId) {
                  urlParams.set('journeyId', journeyInfo?.journeyId);
                }
                router.replace(`/studio?${urlParams.toString()}`);
                
                clearTimeout(saveTimeout);
                setSaveStatus('saved');
                addNotification({
                  type: 'success',
                  title: 'Cover Letter Updated',
                  message: 'Your cover letter has been saved successfully',
                  persistent: false
                });
                return;
              }
            }

            // Create new cover letter
            if (justCreated) {
              clearTimeout(saveTimeout);
              setSaveStatus('saved');
              return;
            }

            const response = await fetch('/api/cover-letters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                title: coverLetterTitle,
                content: data.basics?.summary || '',
                cvId: cvId,
                jobId: journeyInfo?.jobId || selectedJobId,
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

            // Update journey with new cover letter ID
            await updateJourneyWithDocument(newCoverLetterId, 'cover-letter');

            // Update URL to include the new cover letter ID and preserve cvJourneyId
            const urlParams = new URLSearchParams();
            urlParams.set('type', 'cover_letter');
            urlParams.set('coverLetterId', newCoverLetterId);
            if (journeyInfo?.jobId || selectedJobId) {
              urlParams.set('jobId', journeyInfo?.jobId || selectedJobId);
            }
            if (journeyInfo?.journeyId || cvJourneyId) {
              urlParams.set('cvJourneyId', journeyInfo?.journeyId || cvJourneyId);
            }
            router.replace(`/studio?${urlParams.toString()}`);

            clearTimeout(saveTimeout);
            setSaveStatus('saved');
            
            // Only show notification if not just created to avoid spam
            if (!justCreated) {
              addNotification({
                type: 'success',
                title: 'Cover Letter Updated',
                message: 'Your cover letter has been saved successfully',
                persistent: false
              });
            }

            setJustCreated(true);
            setTimeout(() => setJustCreated(false), 2000);
          }
        } else {
          // Handle CV save
          if (cvId) {
            await CVService.updateCV(cvId, {
              title: cvTitle,
              cvData: data,
              templateId: selectedTemplate?.id || selectedTemplate?._id || '',
              metadata: {
                isMaster: isMasterCV
              }
            }, userId || undefined);
            clearTimeout(saveTimeout);
            setSaveStatus('saved');
            
            // Only show notification for master CV saves
            if (isMasterCV) {
              addNotification({
                type: 'success',
                title: 'Master CV Updated',
                message: 'Your master CV has been saved successfully',
                persistent: false
              });
            }
            
            // Update last saved data
            setLastSavedData(JSON.stringify(data));
          } else {
            // Check if journey already has a CV
            const existingCvId = journeyInfo?.cvId;
            if (existingCvId) {
              
              // Update the existing CV
              await CVService.updateCV(existingCvId, {
                title: cvTitle,
                cvData: data,
                templateId: selectedTemplate?.id || selectedTemplate?._id || '',
                metadata: {
                  isMaster: isMasterCV
                }
              }, userId || undefined);
              
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
              addNotification({
                type: 'success',
                title: 'CV Updated',
                message: 'Your CV has been saved successfully',
                persistent: false
              });
              return;
            }

            // Prevent multiple CV creation - only create if we don't have a CV ID
            if (justCreated) {
              clearTimeout(saveTimeout);
              setSaveStatus('saved');
              return;
            }

            // Create new CV
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
            if (journeyInfo?.jobId || selectedJobId) {
              urlParams.set('jobId', journeyInfo?.jobId || selectedJobId);
            }
            
            router.replace(`/studio?${urlParams.toString()}`);

            // Set save status to saved since we just created the CV
            clearTimeout(saveTimeout);
            setSaveStatus('saved');
            
            // Only show notification for master CV saves
            if (isMasterCV) {
              addNotification({
                type: 'success',
                title: 'Master CV Updated',
                message: 'Your master CV has been saved successfully',
                persistent: false
              });
            }

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
    [cvId, coverLetterId, selectedJobId, selectedTemplate, userId, justCreated, documentType, coverLetterTitle]
  );


  // Function to initialize CV journey
  const initializeCVJourney = async () => {
    if (journeyInitialized) {
      return;
    }

    try {
      console.log('🔍 Initializing CV journey for studio:', {
        cvId,
        coverLetterId,
        userId
      });

      let journey: CVJourneyInfo | null = null;

      // CORRECTED APPROACH: Prioritize journeyId for proper Application Package context
      const primaryJourneyId = journeyId;
      
      if (primaryJourneyId) {
        
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
            }
          }
        } catch (error) {
          console.error('❌ CVStudio - Error loading journey context:', error);
        }
      } else {
        // FALLBACK: Legacy approach for backwards compatibility
        journey = await CVJourneyLookupService.getJourneyInfoForStudio(
          cvId,
          coverLetterId,
          jobId,
          userId
        );
      }

      if (journey) {
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
      }

      setJourneyInitialized(true);
    } catch (error) {
      console.error('❌ Error initializing CV journey:', error);
      setJourneyInitialized(true); // Set to true to prevent infinite retries
    }
  };

  // Function to update CV journey with document IDs
  const updateJourneyWithDocument = async (documentId: string, documentType: 'cv' | 'cover-letter') => {
    const targetJobId = journeyInfo?.jobId || selectedJobId;
    
    if (!targetJobId) {
      return;
    }

    try {
      
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
            } catch (error) {
              console.error('❌ Failed to auto-update CV title:', error);
            }
          }, 1000);

          updateTitle();
        }
      }

      // Trigger auto-save for CV data changes
      if (cvId && documentType === 'cv') {
        const saveTimeout = setTimeout(() => {
          debouncedSave(newData);
        }, 2000);
        
        // Store the timeout ID for cleanup if needed
        // Note: We don't return the cleanup function here as it would break the state update
      }

      return newData;
    });
  }, [cvId, userId, documentType, debouncedSave]);

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
  const removeSection = useCallback((sectionType: keyof CVDataStructure, index: number) => {
    setCvData(prev => {
      if (!prev) return prev;

      const newData = { ...prev };
      const section = newData[sectionType];

      if (Array.isArray(section)) {
        // Remove the item at the specified index
        newData[sectionType] = section.filter((_, i) => i !== index) as any;
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
    try {
      setSaveStatus('saving');

      if (documentType === 'cover-letter') {
        // Save cover letter
        if (!coverLetterData) {
          console.log('❌ Studio - No cover letter data to save');
          addNotification({
            type: 'error',
            title: 'Save Failed',
            message: 'No cover letter data to save',
            persistent: false
          });
          setSaveStatus('error');
          return;
        }

        console.log('🔍 Studio - Starting cover letter save...', { coverLetterId, userId, coverLetterTitle });
        
        if (coverLetterId) {
          console.log('🔍 Studio - Updating existing cover letter...');
          const response = await fetch(`/api/cover-letters/${coverLetterId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: coverLetterTitle,
              content: coverLetterData.content,
              status: 'draft',
              cvId: cvId,
              jobId: selectedJobId,
              metadata: coverLetterData.metadata || {}
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update cover letter');
          }

          setSaveStatus('saved');
          addNotification({
            type: 'success',
            title: 'Cover Letter Updated',
            message: 'Your cover letter has been saved successfully',
            persistent: false
          });
        } else {
          console.log('🔍 Studio - Creating new cover letter...');
          const response = await fetch('/api/cover-letters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userId,
              title: coverLetterTitle,
              content: coverLetterData.content,
              status: 'draft',
              cvId: cvId,
              jobId: selectedJobId,
              metadata: coverLetterData.metadata || {}
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create cover letter');
          }

          const result = await response.json();
          console.log('✅ Studio - Cover letter created:', result);
          
          setSaveStatus('saved');
          addNotification({
            type: 'success',
            title: 'Cover Letter Created',
            message: 'Your cover letter has been saved successfully',
            persistent: false
          });
        }
      } else {
        // Save CV
        if (!cvData) {
          console.log('❌ Studio - No CV data to save');
          addNotification({
            type: 'error',
            title: 'Save Failed',
            message: 'No CV data to save',
            persistent: false
          });
          setSaveStatus('error');
          return;
        }

        console.log('🔍 Studio - Starting CV save...', { cvId, userId, cvTitle });
        
        if (cvId) {
          console.log('🔍 Studio - Updating existing CV...');
          const updateData = {
            title: cvTitle,
            cvData: cvData,
            templateId: selectedTemplate?.id || selectedTemplate?._id || '',
            metadata: {
              isMaster: isMasterCV
            }
          };
          console.log('🔍 Studio - Update data:', updateData);
          
          await CVService.updateCV(cvId, updateData, userId || undefined);
          setSaveStatus('saved');
          addNotification({
            type: 'success',
            title: 'CV Updated',
            message: 'Your CV has been saved successfully',
            persistent: false
          });
          setLastSavedData(JSON.stringify(cvData));
        } else {
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
          
          console.log('✅ Studio - CV created:', newCV);
          setSaveStatus('saved');
          addNotification({
            type: 'success',
            title: 'CV Created',
            message: 'Your CV has been saved successfully',
            persistent: false
          });
          setLastSavedData(JSON.stringify(cvData));
        }
      }
    } catch (error) {
      console.error('❌ Studio - Save error:', error);
      setSaveStatus('error');
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: `Failed to save ${documentType === 'cover-letter' ? 'cover letter' : 'CV'}. Please try again.`,
        persistent: false
      });
    }
  }, [documentType, coverLetterData, coverLetterId, coverLetterTitle, cvData, cvId, cvTitle, userId, selectedTemplate, isMasterCV, selectedJobId, addNotification]);

  // Track if data has actually changed

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
  }, [journeyId, cvId, coverLetterId, userId]);

  // Load CV and Job data when journeyInfo becomes available (for cover letters)
  useEffect(() => {
    const loadDataFromJourney = async () => {
      if (!journeyInfo || documentType !== 'cover-letter') return;
      
      console.log('🔍 CVStudio - Loading CV and job data from journeyInfo:', journeyInfo);

      // Load job data if we have jobId and job is not loaded
      if (journeyInfo.jobId && !currentJob) {
        try {
          console.log('🔍 CVStudio - Loading job from journey:', journeyInfo.jobId);
          const jobResponse = await fetch(`/api/jobs?userId=${userId}&jobId=${journeyInfo.jobId}`);
          if (jobResponse.ok) {
            const jobResult = await jobResponse.json();
            const loadedJob = jobResult.data?.jobs?.find((job: any) => job.id === journeyInfo.jobId) || jobResult.job || jobResult;
            if (loadedJob) {
              console.log('✅ CVStudio - Job loaded from journey:', loadedJob);
              setCurrentJob(loadedJob);
              setSelectedJobId(journeyInfo.jobId);
            }
          }
        } catch (error) {
          console.error('❌ CVStudio - Failed to load job from journey:', error);
        }
      }

      // Load CV data if we have cvId and CV is not loaded
      if (journeyInfo.cvId && !cvData) {
        try {
          console.log('🔍 CVStudio - Loading CV from journey:', journeyInfo.cvId);
          const cvResponse = await fetch(`/api/cvs/${journeyInfo.cvId}?userId=${userId}`);
          if (cvResponse.ok) {
            const cvResult = await cvResponse.json();
            const loadedCvData = cvResult.data?.cv?.cvData || cvResult.cv?.cvData;
            if (loadedCvData) {
              console.log('✅ CVStudio - CV loaded from journey:', loadedCvData);
              setCvData(loadedCvData);
              setCvTitle(cvResult.data?.cv?.title || cvResult.cv?.title || 'Untitled CV');
              
              // Check if this is a master CV
              const isMasterCV = cvResult.data?.cv?.isMaster || false;
              if (isMasterCV) {
                setIsMasterCV(true);
                setCurrentMasterCV({ id: journeyInfo.cvId, title: cvResult.data?.cv?.title || cvResult.cv?.title });
              }
            }
          }
        } catch (error) {
          console.error('❌ CVStudio - Failed to load CV from journey:', error);
        }
      }
    };

    loadDataFromJourney();
  }, [journeyInfo, documentType, userId]); // Only re-run when journeyInfo changes

  // Auto-duplicate master CV function
  const autoDuplicateMasterCV = async () => {
    try {
      
      // Fetch master CV first
      const masterResponse = await fetch(`/api/cvs/master?userId=${userId}`);
      const masterResult = await masterResponse.json();
      
      if (!masterResult.success || !masterResult.data?.masterCV) {
        return;
      }
      
      const masterCV = masterResult.data.masterCV;
      
      // Create duplicate CV using ApplicationPackageService
      const duplicateResult = await ApplicationPackageService.duplicateCV({
        sourceCvId: masterCV.id,
        userId,
        newTitle: `${masterCV.title} (Copy for ${currentJob?.title || 'Job'})`
      });
      
      if (duplicateResult.success && duplicateResult.data?.cvId) {
        const duplicatedCVId = duplicateResult.data.cvId;
        
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
          } else if (selectedJobId) {
            urlParams.set('jobId', selectedJobId);
          }
          router.replace(`/studio?${urlParams.toString()}`);
          
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
    const primaryJourneyId = journeyId;
    
    if (primaryJourneyId) {
      // Journey context will be loaded in initializeCVJourney()
    }

    // Update journey status based on current state
    if (cvId && journeyState.cvId !== cvId) {
      updateCVId(cvId);
      updateJourneyStatus('cv-created');
    }

    if (mode) {

      switch (mode) {
        case 'cv-onboarding':
          // Set up CV creation mode
          updateJourneyStatus('job-added');
          // Auto-duplicate master CV for cv-onboarding mode
          if (!cvData && !cvId) {
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
                router.push(`/studio?mode=ats-edit`);
              }
            });
            setShowActionBlocker(true);
          } else {
            updateJourneyStatus('ats-checked');
          }
          break;
      }
    }
  }, [mode, journeyState, cvId, router, updateJourneyStatus, updateCVId, updateCurrentJobId, startJourney]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔍 CVStudio - Loading initial data...', { cvId, coverLetterId, userId, documentType });
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
        const primaryJourneyId = journeyId;
        const targetJobId = journeyInfo?.jobId;
        
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

              // Load CV and Job data from journey context
              let loadedJourneyInfo = null;
              
              // PRIORITY 1: If journeyId is provided, fetch journey data directly
              if (journeyId) {
                try {
                  console.log('🔍 CVStudio - Loading journey data from journeyId:', journeyId);
                  const journeyResponse = await fetch(`/api/application-journey/${journeyId}?userId=${userId}`);
                  if (journeyResponse.ok) {
                    const journeyResult = await journeyResponse.json();
                    if (journeyResult.success && journeyResult.data?.journey) {
                      const journeyData = journeyResult.data.journey;
                      loadedJourneyInfo = {
                        journeyId: journeyId,
                        cvId: journeyData.cvId || undefined,
                        coverLetterId: journeyData.coverLetterId || undefined,
                        jobId: journeyData.jobId || '',
                        userId,
                        status: journeyData.status || 'in-progress',
                        currentStep: journeyData.currentStep || 1,
                        jobTitle: journeyData.jobTitle,
                        company: journeyData.company
                      };
                      console.log('✅ CVStudio - Journey data loaded:', loadedJourneyInfo);
                      setJourneyInfo(loadedJourneyInfo);
                    }
                  }
                } catch (error) {
                  console.error('❌ CVStudio - Failed to load journey data:', error);
                }
              }
              
              // PRIORITY 2: Fallback to CVJourneyLookupService if no journeyId
              if (!loadedJourneyInfo) {
                try {
                  loadedJourneyInfo = await CVJourneyLookupService.getJourneyInfoForStudio(
                    null, // cvId
                    coverLetterId, // coverLetterId
                    jobId, // jobId from URL
                    userId
                  );
                  if (loadedJourneyInfo) {
                    console.log('🔍 CVStudio - Loaded CV Journey data from lookup service:', loadedJourneyInfo);
                    setJourneyInfo(loadedJourneyInfo);
                  }
                } catch (error) {
                  console.error('❌ CVStudio - Failed to load CV Journey data:', error);
                }
              }
              
              // Now load Job and CV data using the journey info
              if (loadedJourneyInfo) {
                // Load job data if we have jobId
                if (loadedJourneyInfo.jobId) {
                  try {
                    console.log('🔍 CVStudio - Loading job from journey:', loadedJourneyInfo.jobId);
                    const jobResponse = await fetch(`/api/jobs?userId=${userId}&jobId=${loadedJourneyInfo.jobId}`);
                    if (jobResponse.ok) {
                      const jobResult = await jobResponse.json();
                      const loadedJob = jobResult.data?.jobs?.find((job: any) => job.id === loadedJourneyInfo.jobId) || jobResult.job || jobResult;
                      if (loadedJob) {
                        console.log('✅ CVStudio - Job loaded:', loadedJob);
                        setCurrentJob(loadedJob);
                        setSelectedJobId(loadedJourneyInfo.jobId);
                        setJobAutoLoadedFromJourney(true);
                      }
                    }
                  } catch (error) {
                    console.error('❌ CVStudio - Failed to load job:', error);
                  }
                }
                
                // Load CV data if we have cvId
                if (loadedJourneyInfo.cvId) {
                  try {
                    console.log('🔍 CVStudio - Loading CV from journey:', loadedJourneyInfo.cvId);
                    const cvResponse = await fetch(`/api/cvs/${loadedJourneyInfo.cvId}?userId=${userId}`);
                    if (cvResponse.ok) {
                      const cvResult = await cvResponse.json();
                      const cvData = cvResult.data?.cv?.cvData || cvResult.cv?.cvData;
                      if (cvData) {
                        console.log('✅ CVStudio - CV loaded:', cvData);
                        setCvData(cvData);
                        setCvTitle(cvResult.data?.cv?.title || cvResult.cv?.title || 'Untitled CV');
                        
                        // Check if this is a master CV
                        const isMasterCV = cvResult.data?.cv?.isMaster || false;
                        if (isMasterCV) {
                          setIsMasterCV(true);
                          setCurrentMasterCV({ id: loadedJourneyInfo.cvId, title: cvResult.data?.cv?.title || cvResult.cv?.title });
                        } else {
                          setIsMasterCV(false);
                          setCurrentMasterCV(null);
                        }
                        
                        // Store cvId for seamless switching
                        setOriginalCvId(loadedJourneyInfo.cvId);
                      }
                    }
                  } catch (error) {
                    console.error('❌ CVStudio - Failed to load CV:', error);
                  }
                }
              } else {
                // No journey info - fallback to direct links from cover letter
                console.log('🔍 CVStudio - No journey data found, using direct links from cover letter');
                const coverLetter = coverLetterResult.coverLetter || coverLetterResult;
                
                if (coverLetter.jobId) {
                  console.log('🔍 CVStudio - Auto-loading linked job:', coverLetter.jobId);
                  setSelectedJobId(coverLetter.jobId);
                  try {
                    const jobResponse = await fetch(`/api/jobs?userId=${userId}&jobId=${coverLetter.jobId}`);
                    if (jobResponse.ok) {
                      const jobResult = await jobResponse.json();
                      const loadedJob = jobResult.data?.jobs?.find((job: any) => job.id === coverLetter.jobId) || jobResult.job || jobResult;
                      if (loadedJob) {
                        setCurrentJob(loadedJob);
                      }
                    }
                  } catch (error) {
                    console.error('Error loading linked job:', error);
                  }
                }
                
                if (coverLetter.cvId) {
                  console.log('🔍 CVStudio - Auto-loading linked CV:', coverLetter.cvId);
                  try {
                    const cvResponse = await fetch(`/api/cvs/${coverLetter.cvId}?userId=${userId}`);
                    if (cvResponse.ok) {
                      const cvResult = await cvResponse.json();
                      const cvData = cvResult.data?.cv?.cvData || cvResult.cv?.cvData;
                      setCvData(cvData);
                      setCvTitle(cvResult.data?.cv?.title || cvResult.cv?.title || 'Untitled CV');
                      setOriginalCvId(coverLetter.cvId);
                    }
                  } catch (error) {
                    console.error('Error loading linked CV:', error);
                  }
                }
              }
            } catch (error) {
              console.error('Error loading cover letter:', error);
              setError('Failed to load cover letter data');
            }
          } else {
            // Create default cover letter data with auto-linked job and CV
            console.log('🔍 CVStudio - Creating new cover letter with auto-linked data:', { jobId: selectedJobId, cvId, journeyInfo });

            // Load CV and job data from journeyInfo if available
            if (journeyInfo) {
              console.log('🔍 CVStudio - Loading CV and job data from journey for new cover letter');
              
              // Load job data if we have jobId
              if (journeyInfo.jobId && !currentJob) {
                try {
                  const jobResponse = await fetch(`/api/jobs?userId=${userId}&jobId=${journeyInfo.jobId}`);
                  if (jobResponse.ok) {
                    const jobResult = await jobResponse.json();
                    const loadedJob = jobResult.data?.jobs?.find((job: any) => job.id === journeyInfo.jobId) || jobResult.job || jobResult;
                    if (loadedJob) {
                      console.log('✅ CVStudio - Job loaded from journey:', loadedJob);
                      setCurrentJob(loadedJob);
                      setSelectedJobId(journeyInfo.jobId);
                    }
                  }
                } catch (error) {
                  console.error('❌ CVStudio - Failed to load job from journey:', error);
                }
              }

              // Load CV data if we have cvId
              if (journeyInfo.cvId && !cvData) {
                try {
                  const cvResponse = await fetch(`/api/cvs/${journeyInfo.cvId}?userId=${userId}`);
                  if (cvResponse.ok) {
                    const cvResult = await cvResponse.json();
                    const loadedCvData = cvResult.data?.cv?.cvData || cvResult.cv?.cvData;
                    if (loadedCvData) {
                      console.log('✅ CVStudio - CV loaded from journey:', loadedCvData);
                      setCvData(loadedCvData);
                      setCvTitle(cvResult.data?.cv?.title || cvResult.cv?.title || 'Untitled CV');
                    }
                  }
                } catch (error) {
                  console.error('❌ CVStudio - Failed to load CV from journey:', error);
                }
              }
            }

            // Generate smart cover letter title based on job context
            const jobData = currentJob;
            const smartTitle = generateDocumentName({
              jobTitle: jobData?.title || jobData?.jobTitle || journeyInfo?.jobTitle,
              company: jobData?.company || journeyInfo?.company,
              documentType: 'cover-letter'
            });

            const defaultCoverLetterData = {
              title: smartTitle,
              content: '',
              status: 'draft',
              cvId: cvId || journeyInfo?.cvId || null, // Auto-link CV from URL params or journey
              jobId: selectedJobId || journeyInfo?.jobId, // Auto-link job from URL params or journey
              metadata: {
                targetCompany: jobData?.company || journeyInfo?.company || '',
                targetPosition: jobData?.title || jobData?.jobTitle || journeyInfo?.jobTitle || '',
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
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document data');
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [cvId, coverLetterId, userId, documentType, journeyId, setTemplates, setSelectedTemplate, setCurrentJob]);

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
        const primaryJourneyId = journeyId;
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
    console.log('🔄 Starting document type change to:', newType);
    
    // Save current document before switching to prevent data loss
    if (documentType === 'cv' && cvData) {
      console.log('💾 Auto-saving CV before switching...');
      await manualSave();
    } else if (documentType === 'cover-letter' && coverLetterData) {
      console.log('💾 Auto-saving cover letter before switching...');
      await manualSave();
    }
    
    // Update local state first
    setDocumentType(newType);
    
    // Build new URL parameters
    const currentJourneyId = journeyId || journeyInfo?.journeyId || cvJourneyId;
    const currentJobId = journeyInfo?.jobId || selectedJobId || jobId;
    
    console.log('🔄 Document type change - Current context:', {
      journeyId,
      journeyInfoJourneyId: journeyInfo?.journeyId,
      cvJourneyId,
      currentJourneyId,
      currentJobId,
      originalCvId,
      originalCoverLetterId,
      cvId,
      coverLetterId
    });
    
    // CRITICAL: Always reload job data from journey to ensure it's available
    if (currentJobId && userId) {
      try {
        console.log('🔄 Reloading job data from journey:', currentJobId);
        const jobResponse = await fetch(`/api/jobs?userId=${userId}&jobId=${currentJobId}`);
        if (jobResponse.ok) {
          const jobResult = await jobResponse.json();
          const loadedJob = jobResult.data?.jobs?.find((job: any) => job.id === currentJobId) || jobResult.job || jobResult;
          if (loadedJob) {
            console.log('✅ Job data reloaded for switching:', loadedJob.title || loadedJob.jobTitle);
            setCurrentJob(loadedJob);
            setSelectedJobId(currentJobId);
          }
        }
      } catch (error) {
        console.error('❌ Failed to reload job data:', error);
      }
    }
    
    // Build the new URL params object
    const newParams = new URLSearchParams();
    
    // Always preserve journeyId as the primary context identifier
    if (currentJourneyId) {
      newParams.set('journeyId', currentJourneyId);
      console.log('✅ Preserving journeyId in URL:', currentJourneyId);
    }
    
    // Keep jobId for backwards compatibility
    if (currentJobId) {
      newParams.set('jobId', currentJobId);
    }
    
    if (newType === 'cover-letter') {
      // Switch to cover letter mode
      newParams.set('type', 'cover_letter');
      
      // CRITICAL: Ensure CV data is loaded for AI generation in cover letters
      const existingCvId = originalCvId || cvId || journeyInfo?.cvId;
      if (existingCvId && !cvData) {
        console.log('🔄 Loading CV data for cover letter context:', existingCvId);
        await reloadCVData(existingCvId);
      }
      
      // Find existing cover letter ID
      const existingCoverLetterId = originalCoverLetterId || coverLetterId || journeyInfo?.coverLetterId;
      console.log('🔄 Switching to cover letter - Found:', existingCoverLetterId);
      
      if (existingCoverLetterId) {
        newParams.set('coverLetterId', existingCoverLetterId);
        
        // Update state to ensure we track this coverLetterId
        setOriginalCoverLetterId(existingCoverLetterId);
        
        // Reload cover letter data
        await reloadCoverLetterData(existingCoverLetterId);
      } else if (journeyInfo?.coverLetterId) {
        // Use cover letter from journey
        newParams.set('coverLetterId', journeyInfo.coverLetterId);
        setOriginalCoverLetterId(journeyInfo.coverLetterId);
        await reloadCoverLetterData(journeyInfo.coverLetterId);
      } else {
        // Create new cover letter
        console.log('🔍 Creating new cover letter for journey');
        try {
          const coverLetterTitle = `Cover Letter for ${journeyInfo?.jobTitle || currentJob?.title || 'Position'}`;
          const coverLetterResponse = await fetch('/api/cover-letters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              title: coverLetterTitle,
              content: `Dear Hiring Manager,\n\nI am writing to express my interest in the ${journeyInfo?.jobTitle || currentJob?.title || 'position'} at ${journeyInfo?.company || currentJob?.company || 'your company'}.\n\n[Your cover letter content will go here]\n\nSincerely,\n[Your Name]`,
              jobId: currentJobId,
              cvId: originalCvId || cvId
            })
          });
          
          if (coverLetterResponse.ok) {
            const coverLetterResult = await coverLetterResponse.json();
            const newCoverLetterData = coverLetterResult.data || coverLetterResult;
            const newCoverLetter = newCoverLetterData.coverLetter || newCoverLetterData;
            
            if (newCoverLetter && (newCoverLetter.id || newCoverLetter._id)) {
              const newCoverLetterId = newCoverLetter.id || newCoverLetter._id;
              newParams.set('coverLetterId', newCoverLetterId);
              
              // Update component state
              setOriginalCoverLetterId(newCoverLetterId);
              setCoverLetterData(newCoverLetter);
              setCoverLetterTitle(newCoverLetter.title || coverLetterTitle);
              
              // Update journey with new cover letter
              if (currentJourneyId) {
                await updateJourneyWithDocument(newCoverLetterId, 'cover-letter');
              }
              
              console.log('✅ Created new cover letter:', newCoverLetterId);
            }
          }
        } catch (error) {
          console.error('❌ Failed to create cover letter:', error);
        }
      }
    } else {
      // Switch to CV mode
      newParams.set('type', 'cv');
      
      // Find existing CV ID
      const existingCvId = originalCvId || cvId || journeyInfo?.cvId;
      console.log('🔄 Switching to CV - Found:', existingCvId);
      
      if (existingCvId) {
        newParams.set('cvId', existingCvId);
        
        // Update state to ensure we track this cvId
        setOriginalCvId(existingCvId);
        
        // Reload CV data
        await reloadCVData(existingCvId);
      } else if (journeyInfo?.cvId) {
        // Use CV from journey
        newParams.set('cvId', journeyInfo.cvId);
        setOriginalCvId(journeyInfo.cvId);
        await reloadCVData(journeyInfo.cvId);
      } else {
        console.warn('⚠️ No CV found in any context');
        setError('No existing CV found. Please ensure you have a CV linked to this journey.');
      }
    }
    
    // Use Next.js router to update URL - this will trigger proper re-render with new props
    const newUrl = `/studio?${newParams.toString()}`;
    console.log('🔗 Navigating to new URL:', newUrl);
    router.replace(newUrl);
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
            if (selectedJobId) {
              urlParams.set('jobId', selectedJobId);
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
    // All possible sections from CV JSON structure
    const allSections = [
      'personal_header', 'work_experience', 'education', 'skills', 'projects', 
      'certificates', 'languages', 'volunteer', 'awards', 'publications', 
      'interests', 'references'
    ];

    const sectionComponents: Record<string, React.ReactNode> = {
      personal_header: (
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
      work_experience: (
        <WorkExperienceSection
          data={cvData?.work || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('work')}
          onRemove={(index) => removeSection('work', index)}
          jobData={currentJob}
          userId={userId}
        />
      ),
      education: (
        <EducationSection
          data={cvData?.education || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('education')}
          onRemove={(index) => removeSection('education', index)}
          jobData={currentJob}
          userId={userId}
        />
      ),
      skills: (
        <SkillsSection
          data={cvData?.skills || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('skills')}
          onRemove={(index) => removeSection('skills', index)}
        />
      ),
      projects: (
        <ProjectsSection
          data={cvData?.projects || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('projects')}
          onRemove={(index) => removeSection('projects', index)}
        />
      ),
      certificates: (
        <CertificatesSection
          data={cvData?.certificates || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('certificates')}
          onRemove={(index) => removeSection('certificates', index)}
        />
      ),
      languages: (
        <LanguagesSection
          data={cvData?.languages || []}
          onUpdate={updateCVField}
          onAdd={() => addSection('languages')}
          onRemove={(index) => removeSection('languages', index)}
        />
      ),
      volunteer: (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p>Volunteer Experience section - Coming soon</p>
        </div>
      ),
      awards: (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p>Awards & Recognition section - Coming soon</p>
        </div>
      ),
      publications: (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p>Publications section - Coming soon</p>
        </div>
      ),
      interests: (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p>Interests section - Coming soon</p>
        </div>
      ),
      references: (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p>References section - Coming soon</p>
        </div>
      )
    };

    const sectionTitles: Record<string, string> = {
      personal_header: 'Personal Information',
      work_experience: 'Work Experience',
      education: 'Education',
      skills: 'Skills',
      projects: 'Projects',
      certificates: 'Certificates',
      languages: 'Languages',
      volunteer: 'Volunteer Experience',
      awards: 'Awards & Recognition',
      publications: 'Publications',
      interests: 'Interests',
      references: 'References'
    };

    // Function to check if a section has data
    const hasSectionData = (sectionId: string): boolean => {
      if (!cvData) return false;
      
      switch (sectionId) {
        case 'personal_header':
          return !!(cvData.basics?.name || cvData.basics?.email || cvData.basics?.phone);
        case 'work_experience':
          return Array.isArray(cvData.work) && cvData.work.length > 0;
        case 'education':
          return Array.isArray(cvData.education) && cvData.education.length > 0;
        case 'skills':
          return Array.isArray(cvData.skills) && cvData.skills.length > 0;
        case 'projects':
          return Array.isArray(cvData.projects) && cvData.projects.length > 0;
        case 'certificates':
          return Array.isArray(cvData.certificates) && cvData.certificates.length > 0;
        case 'languages':
          return Array.isArray(cvData.languages) && cvData.languages.length > 0;
        case 'volunteer':
          return Array.isArray(cvData.volunteer) && cvData.volunteer.length > 0;
        case 'awards':
          return Array.isArray(cvData.awards) && cvData.awards.length > 0;
        case 'publications':
          return Array.isArray(cvData.publications) && cvData.publications.length > 0;
        case 'interests':
          return Array.isArray(cvData.interests) && cvData.interests.length > 0;
        case 'references':
          return Array.isArray(cvData.references) && cvData.references.length > 0;
        default:
          return false;
      }
    };

    return allSections.map(sectionId => {
      const hasData = hasSectionData(sectionId);
      const isDisabled = !hasData;
      
      return {
        id: sectionId,
        title: sectionTitles[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1),
        icon: getSectionIcon(sectionId),
        visible: sectionVisibility[sectionId] || false,
        expanded: expandedSections.has(sectionId),
        component: sectionComponents[sectionId],
        hasData,
        isDisabled
      };
    });
  };

  const getSectionIcon = (sectionId: string) => {
    const icons: Record<string, any> = {
      personal_header: User,
      work_experience: Briefcase,
      education: GraduationCap,
      skills: Code,
      projects: FolderOpen,
      certificates: Award,
      languages: Globe,
      volunteer: Heart,
      awards: Star,
      publications: BookOpen,
      interests: Users,
      references: Users
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
                  {/* AI Cover Letter Generator */}
                  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6`}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI Assistant</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Generate a personalized cover letter based on your CV and the selected job position.
                    </p>
                    <button
                      onClick={async (e) => {
                        // Add loading state
                        const button = e.target as HTMLButtonElement;
                        const originalText = button.textContent;
                        button.disabled = true;
                        button.textContent = 'Generating...';
                        
                        console.log('🔍 AI Cover Letter Generation - Starting:', {
                          hasCvData: !!cvData,
                          hasCurrentJob: !!currentJob,
                          hasJourneyInfo: !!journeyInfo,
                          journeyInfo
                        });

                        try {
                          let finalCvData = cvData;
                          let finalJobData = currentJob;

                          // If data is missing and we have journeyInfo, load it
                          if ((!finalCvData || !finalJobData) && journeyInfo) {
                            console.log('📥 Loading missing data from journey...');
                            
                            // Load both in parallel
                            const promises = [];
                            
                            if (!finalCvData && journeyInfo.cvId) {
                              promises.push(
                                fetch(`/api/cvs/${journeyInfo.cvId}?userId=${userId}`)
                                  .then(res => res.json())
                                  .then(result => {
                                    const data = result.data?.cv?.cvData || result.cv?.cvData;
                                    if (data) {
                                      finalCvData = data;
                                      setCvData(data);
                                      console.log('✅ CV loaded');
                                    }
                                  })
                                  .catch(err => console.error('❌ CV load failed:', err))
                              );
                            }
                            
                            if (!finalJobData && journeyInfo.jobId) {
                              promises.push(
                                fetch(`/api/jobs?userId=${userId}&jobId=${journeyInfo.jobId}`)
                                  .then(res => res.json())
                                  .then(result => {
                                    const job = result.data?.jobs?.find((j: any) => j.id === journeyInfo.jobId) || result.job || result;
                                    if (job) {
                                      finalJobData = job;
                                      setCurrentJob(job);
                                      console.log('✅ Job loaded');
                                    }
                                  })
                                  .catch(err => console.error('❌ Job load failed:', err))
                              );
                            }
                            
                            if (promises.length > 0) {
                              await Promise.all(promises);
                              // Small delay to ensure state updates
                              await new Promise(resolve => setTimeout(resolve, 100));
                            }
                          }

                          // Final validation
                          if (!finalCvData || !finalJobData) {
                            console.error('❌ Still missing data after load attempt:', {
                              hasCvData: !!finalCvData,
                              hasJobData: !!finalJobData
                            });
                            
                            addNotification({
                              type: 'error',
                              title: 'Missing Data',
                              message: 'Please select both a CV and a job first. If you are in a journey, please wait for the data to load.',
                              persistent: false
                            });
                            button.disabled = false;
                            button.textContent = originalText;
                            return;
                          }

                          console.log('✅ Data validated, generating cover letter...');
                          
                          // Try the main API endpoint first
                          let response = await fetch('/api/ai/cover-letter-generate', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              cvData: finalCvData,
                              jobData: finalJobData,
                              recipientName: 'Hiring Manager',
                              companyName: finalJobData.company
                            }),
                          });

                          // If main endpoint fails, try the fallback
                          if (!response.ok) {
                            console.log('Main API failed, trying fallback...');
                            response = await fetch('/api/ai/generate-cover-letter', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                cvInfo: {
                                  name: finalCvData?.basics?.name || '',
                                  summary: finalCvData?.basics?.summary || '',
                                  experience: finalCvData?.work?.slice(0, 3) || [],
                                  skills: finalCvData?.skills?.slice(0, 5) || []
                                },
                                jobInfo: {
                                  title: finalJobData?.title || finalJobData?.jobTitle || '',
                                  company: finalJobData?.company || '',
                                  description: finalJobData?.description || finalJobData?.jobDescription || '',
                                  requirements: finalJobData?.requirements || []
                                }
                              }),
                            });
                          }

                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            console.error('API Error:', response.status, errorData);
                            throw new Error(`API Error: ${response.status} - ${errorData.error || 'Unknown error'}`);
                          }

                          const result = await response.json();
                          console.log('API Response:', result);
                          
                          if (result.success && result.content) {
                            // Update cover letter data with the generated content
                            setCoverLetterData((prev: any) => ({
                              ...prev,
                              content: result.content
                            }));
                            addNotification({
                              type: 'success',
                              title: 'Cover Letter Generated',
                              message: 'Your AI-generated cover letter is ready!',
                              persistent: false
                            });
                          } else {
                            console.error('No content in response:', result);
                            throw new Error(`No content generated: ${result.error || 'Unknown error'}`);
                          }
                        } catch (error) {
                          console.error('Error generating cover letter:', error);
                          addNotification({
                            type: 'error',
                            title: 'Generation Failed',
                            message: 'Failed to generate cover letter. Please try again.',
                            persistent: false
                          });
                        } finally {
                          // Restore button state
                          button.disabled = false;
                          button.textContent = originalText;
                        }
                      }}
                      className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
                    >
                      Generate with AI
                    </button>
                  </div>

                  {/* Cover Letter Content */}
                  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6`}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cover Letter Content</h3>
                    
                    {/* Formatting Options */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        onClick={() => {
                          const textarea = document.querySelector('textarea[data-cover-letter]') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const selectedText = textarea.value.substring(start, end);
                            const newText = textarea.value.substring(0, start) + `**${selectedText}**` + textarea.value.substring(end);
                            setCoverLetterData((prev: any) => ({
                              ...prev,
                              content: newText
                            }));
                            // Force re-render by updating the textarea value
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 2, end + 2);
                            }, 0);
                          }
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="Bold"
                      >
                        <strong>B</strong>
                      </button>
                      <button
                        onClick={() => {
                          const textarea = document.querySelector('textarea[data-cover-letter]') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const selectedText = textarea.value.substring(start, end);
                            const newText = textarea.value.substring(0, start) + `*${selectedText}*` + textarea.value.substring(end);
                            setCoverLetterData((prev: any) => ({
                              ...prev,
                              content: newText
                            }));
                            // Force re-render by updating the textarea value
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 1, end + 1);
                            }, 0);
                          }
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="Italic"
                      >
                        <em>I</em>
                      </button>
                      <button
                        onClick={() => {
                          const textarea = document.querySelector('textarea[data-cover-letter]') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const selectedText = textarea.value.substring(start, end);
                            const newText = textarea.value.substring(0, start) + `\n\n${selectedText}\n\n` + textarea.value.substring(end);
                            setCoverLetterData((prev: any) => ({
                              ...prev,
                              content: newText
                            }));
                            textarea.focus();
                            textarea.setSelectionRange(start + 2, end + 2);
                          }
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="New Paragraph"
                      >
                        ¶
                      </button>
                      <button
                        onClick={() => {
                          const textarea = document.querySelector('textarea[data-cover-letter]') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const selectedText = textarea.value.substring(start, end);
                            const newText = textarea.value.substring(0, start) + `\n• ${selectedText}` + textarea.value.substring(end);
                            setCoverLetterData((prev: any) => ({
                              ...prev,
                              content: newText
                            }));
                            textarea.focus();
                            textarea.setSelectionRange(start + 3, end + 3);
                          }
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="Bullet Point"
                      >
                        •
                      </button>
                    </div>
                    
                    <textarea
                      data-cover-letter
                      className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      placeholder="Write your cover letter content here or use AI to generate it..."
                      value={coverLetterData?.content || ''}
                      onChange={(e) => setCoverLetterData((prev: any) => ({
                        ...prev,
                        content: e.target.value
                      }))}
                      style={{ whiteSpace: 'pre-wrap' }}
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Tip: Use **bold** for emphasis, *italic* for style, and double line breaks for paragraphs
                    </div>
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
              ) : null
            }
            cvSectionsAndOrderingContent={
              documentType === 'cv' && cvData ? (
                <CVSectionsAndOrdering
                  sections={createSections()}
                  onSectionToggle={handleSectionToggle}
                  onSectionVisibilityToggle={handleSectionVisibilityToggle}
                  onSectionReorder={async (newSections) => {
                    const newOrder = newSections.map(s => s.id);
                    setSectionOrder(newOrder);
                    
                    // Save section order to database
                    if (cvId && newOrder.length > 0) {
                      try {
                        await CVService.updateCV(cvId, {
                          sectionOrder: newOrder
                        }, userId || undefined);
                        console.log('✅ Section order saved to database');
                      } catch (error) {
                        console.error('❌ Failed to save section order:', error);
                      }
                    }
                  }}
                  allCollapsed={allSectionsCollapsed}
                  onToggleAllSections={handleToggleAllSections}
                  onUpdateDocument={setCvData}
                />
              ) : null
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
              coverLetterData={coverLetterData}
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
