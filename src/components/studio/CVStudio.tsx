'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import FloatingStudioLayout from './FloatingStudioLayout';
import SidebarStudioPanel from './SidebarStudioPanel';
import ComprehensiveATSAnalyzer from './ComprehensiveATSAnalyzer';
import DraggableSections from './DraggableSections';
import CVSectionsAndOrdering from './CVSectionsAndOrdering';
import DesignContent from './DesignContent';
import CoverLetterDesignContent from './CoverLetterDesignContent';
import TemplateContent from './TemplateContent';
import CoverLetterTemplateContent from './CoverLetterTemplateContent';
import CoverLetterStructureContent from './CoverLetterStructureContent';
import PreviewPanel from './PreviewPanel';
import RestructuredStudioLayout from './RestructuredStudioLayout';
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
  Users,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useJobStore } from '@/lib/stores/jobStore';
import { UnifiedCVService as CVService } from '@/lib/services/unified-cv-service';
import { TemplateService } from '@/lib/services/templateService';
import { UnifiedCVService } from '@/lib/services/unified-cv-service';
import { safeSessionStorageParse, safeSessionStorageSet } from '@/lib/utils/safeJsonParse';
import { JobService } from '@/lib/services/jobService';
import { debounce } from 'lodash';
import { getVisibleCVSections, getAddableCVSections } from '@/lib/selectors/cv-section-selectors';
import { hasSectionData } from '@/lib/utils/cv-data-validation';
import { migrateLegacyCV } from '@/lib/migrations/cv-structure-migration';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { generateCVName, generateCVDescription, getCVMetadata } from '@/lib/utils/cvNamingUtils';
import { generateDocumentName } from '@/lib/utils/documentNaming';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import ActionBlockerDialog from '@/components/modals/ActionBlockerDialog';
import { CVJourneyLookupService, CVJourneyInfo } from '@/lib/services/cvJourneyLookupService';
import { ApplicationPackageService } from '@/lib/services/applicationPackageService';
import { useDebounce } from '@/hooks/useDebounce';
import { migrateLegacyCVToStructureFormat, hasStructure } from '@/lib/migrations/cv-structure-migration';
import toast from 'react-hot-toast';
// Define fallback templates directly to avoid import issues
const getFallbackTemplates = () => [
  {
    _id: 'fallback-1',
    id: 'fallback-1',
    name: 'Professional CV',
    description: 'Clean and professional CV template',
    category: 'cv',
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#1f2937',
      secondaryColor: '#6b7280',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.6',
      spacing: '24px',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['header', 'summary', 'experience', 'education', 'skills']
      }
    },
    sectionStyling: {},
    availableSections: [
      {
        key: 'header',
        displayName: 'Header',
        componentName: 'HeaderSection',
        isList: false,
        defaultItemContent: {}
      },
      {
        key: 'summary',
        displayName: 'Professional Summary',
        componentName: 'SummarySection',
        isList: false,
        defaultItemContent: {}
      },
      {
        key: 'experience',
        displayName: 'Work Experience',
        componentName: 'ExperienceSection',
        isList: true,
        defaultItemContent: {}
      },
      {
        key: 'education',
        displayName: 'Education',
        componentName: 'EducationSection',
        isList: true,
        defaultItemContent: {}
      },
      {
        key: 'skills',
        displayName: 'Skills',
        componentName: 'SkillsSection',
        isList: true,
        defaultItemContent: {}
      }
    ],
    pageSettings: {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      },
      maxHeight: '297mm'
    },
    isActive: true,
    isDefault: true,
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

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
  const [documentType, setDocumentType] = useState<'cv' | 'cover-letter'>(initialDocumentType || 'cv');
  const [panelStates, setPanelStates] = useState({
    left: true,
    right: true
  });
  const [justCreated, setJustCreated] = useState(false);

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
  
  // Track if CV data has changed during this session (for thumbnail generation on exit)
  const cvDataChangedRef = useRef(false);
  const thumbnailGenerationInProgressRef = useRef(false);
  
  // Debounced CV data for preview - prevents excessive re-renders during typing
  // This is the key optimization from Reactive Resume: separate edit state from preview state
  const debouncedCvData = useDebounce(cvData, 300);

  // Cover Letter Data state
  const [coverLetterData, setCoverLetterData] = useState<any>(null);
  const [coverLetterTitle, setCoverLetterTitle] = useState<string>('Untitled Cover Letter');

  // Store original document IDs to preserve them during switching
  const [originalCvId, setOriginalCvId] = useState<string | null>(cvId || null);
  const [originalCoverLetterId, setOriginalCoverLetterId] = useState<string | null>(coverLetterId || null);

  // Update original IDs when props change (but don't overwrite if we already have them)
  useEffect(() => {
    if (cvId && !originalCvId && typeof cvId === 'string') {
      setOriginalCvId(cvId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('originalCvId', cvId);
        } catch (e) {
          console.warn('Failed to set localStorage:', e);
        }
      }
    }
    if (coverLetterId && !originalCoverLetterId && typeof coverLetterId === 'string') {
      setOriginalCoverLetterId(coverLetterId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('originalCoverLetterId', coverLetterId);
        } catch (e) {
          console.warn('Failed to set localStorage:', e);
        }
      }
    }
  }, [cvId, coverLetterId, originalCvId, originalCoverLetterId]);

  // CRITICAL: Sync documentType state with prop changes from URL
  useEffect(() => {
    console.log('📝 Props changed - checking documentType sync:', { 
      initialDocumentType,
      currentDocumentType: documentType,
      cvId,
      coverLetterId 
    });
    
    // Only sync if the prop from URL changes (client-side navigation)
    // This should NOT revert user's UI switch clicks
    if (initialDocumentType) {
      setDocumentType(initialDocumentType);
    }
  }, [initialDocumentType]); // <-- CRITICAL: Only depend on the prop, not documentType

  // Section management state (legacy - now synced with cvData.structure)
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

  // Helper functions for structure/content map
  const getSectionOrderFromCVData = (data: UnifiedCVDataStructure | null): string[] => {
    if (!data?.structure?.sections) {
      return sectionOrder; // Fallback to current state
    }
    // Map structure section IDs to section types for compatibility
    // Note: For now, we use types; later we'll need to track IDs properly
    return data.structure.sections.map(s => s.type);
  };

  const getSectionVisibilityFromCVData = (data: UnifiedCVDataStructure | null): Record<string, boolean> => {
    if (!data?.structure?.sections) {
      return sectionVisibility; // Fallback to current state
    }
    const visibility: Record<string, boolean> = {};
    // For structure sections, we need to track by type
    // Note: This assumes one section per type initially; will need refinement for multiple sections of same type
    data.structure.sections.forEach(section => {
      visibility[section.type] = section.visible;
    });
    return visibility;
  };

  // Helper function to migrate and initialize CV data with structure
  const migrateAndInitializeCVData = async (
    data: UnifiedCVDataStructure,
    templateId?: string | null
  ): Promise<UnifiedCVDataStructure> => {
    // Migrate legacy CV data to structure format if needed
    if (!hasStructure(data)) {
      console.log('🔄 Migrating legacy CV data using new Harmony migration...');
      try {
        // Use new simplified migration (no template parameter needed)
        data = migrateLegacyCV(data);
        console.log('✅ CV data migrated to structure format using Harmony architecture');
      } catch (error) {
        console.error('❌ Migration error:', error);
        // Continue with original data if migration fails
      }
    }
    return data;
  };

  // Helper function to set CV data with migration and structure initialization
  const setCvDataWithStructure = useCallback(async (
    newData: UnifiedCVDataStructure | null,
    templateId?: string | null
  ) => {
    if (!newData) {
      setCvData(null);
      return;
    }

    // Migrate if needed
    const migratedData = await migrateAndInitializeCVData(newData, templateId);

    // Initialize section order and visibility from structure
    const order = getSectionOrderFromCVData(migratedData);
    const visibility = getSectionVisibilityFromCVData(migratedData);

    setCvData(migratedData);
    setSectionOrder(order);
    setSectionVisibility(visibility);
  }, []);

  const updateStructureInCVData = (
    data: UnifiedCVDataStructure | null,
    updates: {
      sectionOrder?: string[];
      sectionVisibility?: Record<string, boolean>;
    }
  ): UnifiedCVDataStructure => {
    if (!data) {
      return data || {} as UnifiedCVDataStructure;
    }

    let updatedData = { ...data };

    // Ensure structure exists
    if (!updatedData.structure) {
      updatedData.structure = { sections: [] };
    }

    // Clone structure
    updatedData.structure = {
      ...updatedData.structure,
      sections: [...updatedData.structure.sections]
    };

    // Update section order
    if (updates.sectionOrder) {
      // Reorder sections array based on new order
      const typeToSection = new Map(updatedData.structure.sections.map(s => [s.type, s]));
      updatedData.structure.sections = updates.sectionOrder
        .map(type => typeToSection.get(type))
        .filter(Boolean) as typeof updatedData.structure.sections;
      
      // Add any missing sections
      updates.sectionOrder.forEach(type => {
        if (!typeToSection.has(type)) {
          const sectionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 
            `section-${Date.now()}-${Math.random()}`;
          updatedData.structure!.sections.push({
            id: sectionId,
            type,
            visible: updates.sectionVisibility?.[type] ?? true
          });
        }
      });
    }

    // Update section visibility
    if (updates.sectionVisibility) {
      updatedData.structure.sections = updatedData.structure.sections.map(section => ({
        ...section,
        visible: updates.sectionVisibility![section.type] !== undefined 
          ? updates.sectionVisibility![section.type] 
          : section.visible
      }));
    }

    return updatedData;
  };
  const [expandedSections, setExpandedSections] = useState(new Set([
    'personal_header', 'work_experience', 'skills', 'projects'
  ]));
  const [allSectionsCollapsed, setAllSectionsCollapsed] = useState(false);

  // Sidebar state
  const [activeSidebarSection, setActiveSidebarSection] = useState<'template' | 'design' | 'ai-report' | 'structure'>('structure');
  const [activeStructureSection, setActiveStructureSection] = useState<string | null>(null);
  const [previousStructureSectionIndex, setPreviousStructureSectionIndex] = useState<number>(-1);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);

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

  // Debounced cover letter save function
  const debouncedCoverLetterSave = useCallback(
    debounce(async () => {
      try {
        setSaveStatus('saving');
        
        if (coverLetterId) {
          console.log('🔍 Studio - Auto-saving cover letter...');
          
          const response = await fetch(`/api/cover-letters/${coverLetterId}?userId=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: coverLetterTitle,
              content: coverLetterData?.content || '',
              cvId: cvId,
              jobId: selectedJobId
            })
          });

          if (!response.ok) {
            throw new Error('Failed to update cover letter');
          }

          setSaveStatus('saved');
        } else {
          console.log('🔍 Studio - Auto-creating cover letter...');
          
          const response = await fetch('/api/cover-letters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              title: coverLetterTitle,
              content: coverLetterData?.content || '',
              cvId: cvId,
              jobId: selectedJobId
            })
          });

          if (!response.ok) {
            throw new Error('Failed to create cover letter');
          }

          const result = await response.json();
          console.log('✅ Studio - Cover letter auto-created:', result);
          setSaveStatus('saved');
        }
      } catch (error) {
        console.error('❌ Studio - Cover letter save error:', error);
        setSaveStatus('error');
      }
    }, 2000),
    [coverLetterId, coverLetterData, coverLetterTitle, cvId, selectedJobId, userId]
  );

  // Debounced autosave - defined early to avoid reference errors
  const debouncedSave = useCallback(
    debounce(async (data: UnifiedCVDataStructure) => {
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
                content: coverLetterData?.content || '',
                cvId: cvId,
                jobId: selectedJobId
              })
            });

            if (!response.ok) {
              throw new Error('Failed to update cover letter');
            }

            clearTimeout(saveTimeout);
            setSaveStatus('saved');
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
                  content: coverLetterData?.content || '',
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
                const jobId = journeyInfo?.jobId || selectedJobId;
                if (jobId) {
                  urlParams.set('jobId', jobId);
                }
                if (journeyInfo?.journeyId) {
                  urlParams.set('journeyId', journeyInfo.journeyId);
                }
                router.replace(`/studio?${urlParams.toString()}`);
                
                clearTimeout(saveTimeout);
                setSaveStatus('saved');
                toast.success('Cover Letter Updated');
                return;
              }
            }

            // Create new cover letter
            if (justCreated) {
              clearTimeout(saveTimeout);
              setSaveStatus('saved');
              return;
            }

            // CRITICAL: Check if a cover letter already exists for this journey before creating
            // This prevents duplicate creation when the API is called multiple times
            if (journeyId || journeyInfo?.journeyId) {
              const checkResponse = await fetch(`/api/cover-letters?userId=${userId}&journeyId=${journeyId || journeyInfo?.journeyId}`);
              if (checkResponse.ok) {
                const checkResult = await checkResponse.json();
                const existingCoverLetter = checkResult.data?.coverLetters?.find((cl: any) => 
                  cl.journeyId === (journeyId || journeyInfo?.journeyId)
                );
                
                if (existingCoverLetter) {
                  console.log('✅ Studio - Cover letter already exists for journey, using existing:', existingCoverLetter.id);
                  setOriginalCoverLetterId(existingCoverLetter.id);
                  setJustCreated(true);
                  setTimeout(() => setJustCreated(false), 2000);
                  clearTimeout(saveTimeout);
                  setSaveStatus('saved');
                  return;
                }
              }
            }

            const response = await fetch('/api/cover-letters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                title: coverLetterTitle,
                content: coverLetterData?.content || '',
                cvId: cvId,
                jobId: journeyInfo?.jobId || selectedJobId,
                journeyId: journeyId || journeyInfo?.journeyId,
                targetCompany: '',
                targetPosition: '',
                keywords: []
              })
            });

            if (!response.ok) {
              throw new Error('Failed to create cover letter');
            }

            const result = await response.json();
            const newCoverLetterId = result.data?.id || result.data?.coverLetter?.id || result.id;

            if (newCoverLetterId) {
              // Update journey with new cover letter ID
              await updateJourneyWithDocument(newCoverLetterId, 'cover-letter');

              // Update URL to include the new cover letter ID and preserve journeyId
              const urlParams = new URLSearchParams();
              urlParams.set('type', 'cover_letter');
              urlParams.set('mode', 'cover-letter');
              urlParams.set('coverLetterId', newCoverLetterId);
              if (journeyInfo?.jobId || selectedJobId) {
                urlParams.set('jobId', journeyInfo?.jobId || selectedJobId || '');
              }
              if (journeyInfo?.journeyId || journeyId) {
                urlParams.set('journeyId', journeyInfo?.journeyId || journeyId || '');
              }
              router.replace(`/studio?${urlParams.toString()}`);

              clearTimeout(saveTimeout);
              setSaveStatus('saved');
              
              // Store the new cover letter ID
              setOriginalCoverLetterId(newCoverLetterId);

              setJustCreated(true);
              setTimeout(() => setJustCreated(false), 2000);
            }
          }
        } else {
          // Handle CV save
          if (cvId) {
            // Ensure templateId is a string (handle hardcoded templates)
            const templateId = selectedTemplate?._id?.toString() || selectedTemplate?.id?.toString() || '';
            const templateIdString = typeof templateId === 'string' ? templateId : String(templateId);
            
            await CVService.updateCV(cvId, {
              title: cvTitle,
              cvData: data,
              templateId: templateIdString,
              metadata: {
                isMaster: isMasterCV
              }
            }, userId || undefined);
            clearTimeout(saveTimeout);
            setSaveStatus('saved');
            
            
            // Update last saved data
            setLastSavedData(JSON.stringify(data));
          } else {
            // Check if journey already has a CV
            const existingCvId = journeyInfo?.cvId;
            if (existingCvId) {
              
              // Update the existing CV
              // Ensure templateId is a string (handle hardcoded templates)
              const templateId = selectedTemplate?._id?.toString() || selectedTemplate?.id?.toString() || '';
              const templateIdString = typeof templateId === 'string' ? templateId : String(templateId);
              
              await CVService.updateCV(existingCvId, {
                title: cvTitle,
                cvData: data,
                templateId: templateIdString,
                metadata: {
                  isMaster: isMasterCV
                }
              }, userId || undefined);
              
              // Update URL to use existing CV
              const urlParams = new URLSearchParams();
              urlParams.set('type', 'cv');
              urlParams.set('cvId', existingCvId);
              if (journeyInfo?.jobId || selectedJobId) {
                urlParams.set('jobId', journeyInfo?.jobId || selectedJobId || '');
              }
            if (journeyInfo?.journeyId || journeyId) {
              urlParams.set('cvJourneyId', (journeyInfo?.journeyId || journeyId || '').toString());
            }
              router.replace(`/studio?${urlParams.toString()}`);
              
              clearTimeout(saveTimeout);
              setSaveStatus('saved');
              return;
            }

            // Prevent multiple CV creation - only create if we don't have a CV ID
            if (justCreated) {
              clearTimeout(saveTimeout);
              setSaveStatus('saved');
              return;
            }

            // CRITICAL: Check if a CV already exists for this journey before creating
            // This prevents duplicate creation when the API is called multiple times
            if (journeyId || journeyInfo?.journeyId) {
              const checkResponse = await fetch(`/api/cvs?userId=${userId}&journeyId=${journeyId || journeyInfo?.journeyId}`);
              if (checkResponse.ok) {
                const checkResult = await checkResponse.json();
                // The API returns data.cvs array
                const existingCV = checkResult.data?.cvs?.find((cv: any) => {
                  const cvJourneyId = cv.journeyId || cv.templateId?.journeyId;
                  const targetJourneyId = journeyId || journeyInfo?.journeyId;
                  return cvJourneyId && (
                    String(cvJourneyId) === String(targetJourneyId) ||
                    cvJourneyId === targetJourneyId
                  );
                });
                
                if (existingCV) {
                  console.log('✅ Studio - CV already exists for journey, using existing:', existingCV.id);
                  setCvId(existingCV.id);
                  setJustCreated(true);
                  setTimeout(() => setJustCreated(false), 2000);
                  clearTimeout(saveTimeout);
                  setSaveStatus('saved');
                  return;
                }
              }
            }

            // Create new CV
            const newCV = await CVService.createCV({
              title: cvTitle || 'Untitled CV',
              cvData: data,
              templateId: selectedTemplate?._id?.toString() || selectedTemplate?.id?.toString() || '',
              journeyId: journeyId || journeyInfo?.journeyId,
              metadata: {
                isMaster: isMasterCV
              }
            }, userId || '');

            // Extract CV ID and update URL
            const newCvId = (newCV as any)?.data?.cv?.id || (newCV as any)?.data?.cv?._id || (newCV as any)?.id || (newCV as any)?._id || '';

            // Update journey with new CV ID
            await updateJourneyWithDocument(newCvId, 'cv');

            // Update URL using new structure with journeyId as primary context
            const urlParams = new URLSearchParams();
            urlParams.set('type', 'cv');
            urlParams.set('cvId', newCvId);
            
            // Prioritize journeyId for reliable Application Package context
            const primaryJourneyId = journeyId || journeyInfo?.journeyId;
            if (primaryJourneyId) {
              urlParams.set('journeyId', primaryJourneyId);
            }
            
            // Keep jobId for backwards compatibility
            const jobId = journeyInfo?.jobId || selectedJobId;
            if (jobId) {
              urlParams.set('jobId', jobId);
            }
            
            router.replace(`/studio?${urlParams.toString()}`);

            // Set save status to saved since we just created the CV
            clearTimeout(saveTimeout);
            setSaveStatus('saved');
            

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
          // Fetch the complete journey data using jobId (since primaryJourneyId is now the jobId)
          const response = await fetch(`/api/application-journey?userId=${userId}&jobId=${primaryJourneyId}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.journeys && result.data.journeys.length > 0) {
              const journeyData = result.data.journeys[0]; // Get the first journey
              journey = {
                journeyId: journeyData.journeyId,
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
          userId,
          cvId,
          coverLetterId,
          selectedJobId || undefined
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
  const updateCVField = useCallback((path: string, valueOrFn: any) => {
    setCvData(prev => {
      if (!prev) return prev;

      // Validate value for array fields - ensure they're always arrays
      const arrayFields = ['work', 'volunteer', 'education', 'awards', 'certificates',
                           'publications', 'skills', 'languages', 'interests', 'references', 'projects'];

      // Support functional updates - if valueOrFn is a function, get the current value and call the function
      let value: any;
      if (typeof valueOrFn === 'function') {
        // For functional updates, navigate to the current value at the path and pass it to the updater function
        const pathArray = path.split('.');
        let current: any = prev;
        for (let i = 0; i < pathArray.length; i++) {
          if (current && typeof current === 'object') {
            current = current[pathArray[i]];
          } else {
            current = undefined;
            break;
          }
        }
        value = valueOrFn(current); // Pass existing value to updater function
      } else {
        // Direct value assignment
        value = valueOrFn;
      }
      
      // If path is just an array field name (e.g., "awards", "certificates"), ensure value is an array
      if (arrayFields.includes(path)) {
        if (!Array.isArray(value)) {
          console.warn(`⚠️ CVStudio - Field ${path} must be an array, but got ${typeof value}. Converting to array.`);
          // If value is a string that matches the field name, it's an error - use empty array
          if (typeof value === 'string' && value === path) {
            value = [];
          } else {
            // Default to empty array for non-array values
            value = [];
          }
        }
      }

      const pathArray = path.split('.');
      const newData = { ...prev };
      let current: any = newData;

      // Safely navigate and create intermediate objects/arrays if they don't exist
      for (let i = 0; i < pathArray.length - 1; i++) {
        const key = pathArray[i];
        const nextKey = pathArray[i + 1];
        
        // Validate that array fields remain arrays
        if (arrayFields.includes(key) && current[key] !== undefined && !Array.isArray(current[key])) {
          console.warn(`⚠️ CVStudio - Field ${key} should be an array but is ${typeof current[key]}. Resetting to empty array.`);
          current[key] = [];
        }
        
        // If current[key] doesn't exist or is not an object/array, create it
        if (!current[key] || typeof current[key] !== 'object') {
          // Check if next key is a number (array index) or if current key is an array field
          const isArrayIndex = !isNaN(parseInt(nextKey));
          const isArrayField = arrayFields.includes(key);
          current[key] = (isArrayIndex || isArrayField) ? [] : {};
        } else {
          // Make a shallow copy to avoid mutating nested objects
          current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
        }
        
        current = current[key];
      }

      // Final validation before setting value
      const finalKey = pathArray[pathArray.length - 1];
      if (arrayFields.includes(finalKey) && !Array.isArray(value)) {
        console.warn(`⚠️ CVStudio - Attempted to set ${finalKey} (array field) with non-array value. Skipping update.`);
        return prev; // Don't update if trying to set array field with non-array value
      }

      current[finalKey] = value;

      // Mark that CV data has changed (for thumbnail generation on exit)
      if (documentType === 'cv') {
        cvDataChangedRef.current = true;
      }

      // Note: CV title is only updated when manually edited from the header
      // Auto-update of title based on name/label/summary changes has been disabled

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

  // Add section - updates both legacy arrays and structure/content map
  const addSection = useCallback((sectionType: keyof UnifiedCVDataStructure, item?: any) => {
    setCvData(prev => {
      if (!prev) return prev;

      const newData = { ...prev };
      const section = newData[sectionType];

      if (Array.isArray(section)) {
        const defaultItem = item || getDefaultItemForSection(sectionType);
        
        // Update legacy array
        newData[sectionType] = [...section, defaultItem] as any;

        // Update structure and content map if using new architecture
        if (newData.structure && newData.content) {
          // Generate UUID for new section
          const sectionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 
            `section-${Date.now()}-${Math.random()}`;
          
          // Map sectionType to section type string
          const sectionTypeMap: Record<string, string> = {
            'work': 'work_experience',
            'volunteer': 'volunteer',
            'education': 'education',
            'awards': 'awards',
            'certificates': 'certificates',
            'publications': 'publications',
            'skills': 'skills',
            'languages': 'languages',
            'interests': 'interests',
            'references': 'references',
            'projects': 'projects'
          };

          const sectionTypeString = sectionTypeMap[sectionType as string] || sectionType as string;

          // Ensure structure exists
          if (!newData.structure.sections) {
            newData.structure.sections = [];
          }

          // Add to structure
          newData.structure.sections.push({
            id: sectionId,
            type: sectionTypeString,
            visible: true
          });

          // Add to content map
          if (!newData.content) {
            newData.content = {};
          }
          newData.content[sectionId] = { ...defaultItem };
        }
      }

      return newData;
    });
  }, []);

  // Remove section - updates both legacy arrays and structure/content map
  const removeSection = useCallback((sectionType: keyof UnifiedCVDataStructure, index: number) => {
    setCvData(prev => {
      if (!prev) return prev;

      const newData = { ...prev };
      const section = newData[sectionType];

      if (Array.isArray(section)) {
        // Map sectionType to section type string
        const sectionTypeMap: Record<string, string> = {
          'work': 'work_experience',
          'volunteer': 'volunteer',
          'education': 'education',
          'awards': 'awards',
          'certificates': 'certificates',
          'publications': 'publications',
          'skills': 'skills',
          'languages': 'languages',
          'interests': 'interests',
          'references': 'references',
          'projects': 'projects'
        };

        const sectionTypeString = sectionTypeMap[sectionType as string] || sectionType as string;

        // Update structure and content map if using new architecture
        if (newData.structure?.sections && newData.content) {
          // Find all structure sections of this type
          const sectionsOfType = newData.structure.sections.filter(s => s.type === sectionTypeString);
          
          if (sectionsOfType.length > index) {
            const sectionToRemove = sectionsOfType[index];
            
            // Remove from structure
            newData.structure.sections = newData.structure.sections.filter(
              s => s.id !== sectionToRemove.id
            );

            // Remove from content map
            if (newData.content[sectionToRemove.id]) {
              const { [sectionToRemove.id]: removed, ...rest } = newData.content;
              newData.content = rest;
            }
          }
        }

        // Update legacy array
        newData[sectionType] = section.filter((_, i) => i !== index) as any;
      }

      return newData;
    });
  }, []);

  // Get default item for section
  const getDefaultItemForSection = (sectionType: keyof UnifiedCVDataStructure) => {
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
          fluency: 'intermediate'
        };
      case 'volunteer':
        return {
          organization: '',
          position: '',
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

  // Manual save function
  const manualSave = useCallback(async () => {
    try {
      setSaveStatus('saving');

      if (documentType === 'cover-letter') {
        // Save cover letter
        if (!coverLetterData) {
          console.log('⚠️ Studio - No cover letter data to save yet (switching modes or loading)');
          // When switching modes, there might not be data yet - this is OK
          // Just mark as saved instead of error to avoid false error indicators
          setSaveStatus('saved');
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
        }
      } else {
        // Save CV
        if (!cvData) {
          console.log('⚠️ Studio - No CV data to save yet (switching modes or loading)');
          // When switching modes, there might not be data yet - this is OK
          // Just mark as saved instead of error to avoid false error indicators
          setSaveStatus('saved');
          return;
        }

        console.log('🔍 Studio - Starting CV save...', { cvId, userId, cvTitle });
        
        if (cvId) {
          console.log('🔍 Studio - Updating existing CV...');
          const updateData = {
            title: cvTitle,
            cvData: cvData,
            templateId: selectedTemplate?._id?.toString() || selectedTemplate?.id?.toString() || '',
            metadata: {
              isMaster: isMasterCV
            }
          };
          // Ensure templateId is a string (handle hardcoded templates)
          const templateId = selectedTemplate?._id?.toString() || selectedTemplate?.id?.toString() || '';
          updateData.templateId = typeof templateId === 'string' ? templateId : String(templateId);
          
          console.log('🔍 Studio - Update data:', updateData);
          console.log('🔍 Studio - Template ID being saved:', updateData.templateId);
          
          await CVService.updateCV(cvId, updateData, userId || undefined);
          setSaveStatus('saved');
          setLastSavedData(JSON.stringify(cvData));
          
          // Trigger ATS recalculation if we have a journey and job
          if (journeyId && selectedJobId) {
            console.log('🔄 Studio - Triggering ATS recalculation after CV save');
            try {
              const response = await fetch('/api/ai/ats-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cvId: cvId,
                  jobId: selectedJobId,
                  userId: userId
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                  const score = result.data.score || result.data.atsScore;
                  console.log('✅ Studio - ATS score recalculated:', score);
                  
                  // Update journey with new ATS score
                  await fetch('/api/application-journey', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: userId,
                      jobId: selectedJobId,
                      atsScore: score
                    })
                  });
                }
              }
            } catch (atsError) {
              console.warn('⚠️ Studio - ATS recalculation failed:', atsError);
              // Don't show error to user as this is a background process
            }
          }
        } else {
          // Create new CV with proper structure
          const newCV = await CVService.createCV({
            title: cvTitle || 'Untitled CV',
            cvData: cvData,
            templateId: selectedTemplate?._id?.toString() || selectedTemplate?.id?.toString() || '',
            metadata: {
              isMaster: isMasterCV
            }
          }, userId || '');
          
          console.log('✅ Studio - CV created:', newCV);
          setSaveStatus('saved');
          setLastSavedData(JSON.stringify(cvData));
        }
      }
    } catch (error) {
      console.error('❌ Studio - Save error:', error);
      setSaveStatus('error');
    }
  }, [documentType, coverLetterData, coverLetterId, coverLetterTitle, cvData, cvId, cvTitle, userId, selectedTemplate, isMasterCV, selectedJobId]);

  // Track if data has actually changed

  // Autosave on actual changes only
  useEffect(() => {
    if (documentType === 'cover-letter') {
      // For cover letters, save when cover letter data changes
      if (coverLetterData && !isLoading && !justCreated) {
        const currentDataHash = JSON.stringify(coverLetterData);
        if (currentDataHash !== lastSavedData) {
          debouncedCoverLetterSave();
          setLastSavedData(currentDataHash);
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

  // Generate thumbnail on studio exit (robust implementation)
  const generateThumbnailOnExit = useCallback(async () => {
    // Only generate if CV data changed and we have a CV ID
    if (!cvDataChangedRef.current || !cvId || documentType !== 'cv' || !userId) {
      return;
    }

    // Prevent multiple simultaneous thumbnail generations
    if (thumbnailGenerationInProgressRef.current) {
      console.log('⚠️ Studio - Thumbnail generation already in progress, skipping');
      return;
    }

    thumbnailGenerationInProgressRef.current = true;

    try {
      console.log('🖼️ Studio - Generating thumbnail on exit for CV:', cvId);
      
      // Use sendBeacon for more reliable delivery on page unload
      const useBeacon = typeof navigator !== 'undefined' && 'sendBeacon' in navigator;
      
      if (useBeacon) {
        // For page unload scenarios, use sendBeacon
        const data = JSON.stringify({ cvId, userId, forceRegenerate: true });
        const blob = new Blob([data], { type: 'application/json' });
        const success = navigator.sendBeacon('/api/cv/thumbnail/generate-on-exit', blob);
        
        if (success) {
          console.log('✅ Studio - Thumbnail generation request sent via beacon');
        } else {
          // Fallback to fetch if beacon fails
          await fetch('/api/cv/thumbnail/generate-on-exit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cvId, userId, forceRegenerate: true }),
            keepalive: true // Keep request alive even if page unloads
          });
        }
      } else {
        // Standard fetch with keepalive
        await fetch('/api/cv/thumbnail/generate-on-exit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvId, userId, forceRegenerate: true }),
          keepalive: true
        });
      }
      
      console.log('✅ Studio - Thumbnail generation triggered on exit');
    } catch (error) {
      console.warn('⚠️ Studio - Failed to trigger thumbnail generation on exit:', error);
      // Non-critical, don't block exit
    } finally {
      // Reset after a delay to allow retry if needed
      setTimeout(() => {
        thumbnailGenerationInProgressRef.current = false;
      }, 2000);
    }
  }, [cvId, userId, documentType]);

  // Handle studio exit - generate thumbnail on component unmount
  useEffect(() => {
    return () => {
      if (cvDataChangedRef.current && cvId && documentType === 'cv' && userId) {
        generateThumbnailOnExit();
      }
    };
  }, [cvId, documentType, userId, generateThumbnailOnExit]);

  // Handle page visibility change and beforeunload for robust exit handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && cvDataChangedRef.current && cvId && documentType === 'cv' && userId) {
        // Page is being hidden, generate thumbnail
        generateThumbnailOnExit();
      }
    };

    const handleBeforeUnload = () => {
      if (cvDataChangedRef.current && cvId && documentType === 'cv' && userId) {
        // Generate thumbnail before page unload
        generateThumbnailOnExit();
      }
    };

    const handlePageHide = () => {
      if (cvDataChangedRef.current && cvId && documentType === 'cv' && userId) {
        // Generate thumbnail on page hide
        generateThumbnailOnExit();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [cvId, documentType, userId, generateThumbnailOnExit]);

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
            const templateId = cvResult.data?.cv?.templateId || cvResult.cv?.templateId;
            if (loadedCvData) {
              console.log('✅ CVStudio - CV loaded from journey:', loadedCvData);
              await setCvDataWithStructure(loadedCvData, templateId);
              setCvTitle(cvResult.data?.cv?.title || cvResult.cv?.title || 'Untitled CV');
              
              // Check if this is a master CV
              const isMasterCV = cvResult.data?.cv?.metadata?.isMaster || false;
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
          await setCvDataWithStructure(cvResult.cvData, cvResult.templateId);
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

  // Use refs to track previous values and prevent infinite loops
  const prevCvIdRef = useRef<string | null>(null);
  const prevModeRef = useRef<string | null>(null);
  const prevJourneyCvIdRef = useRef<string | null>(null);
  const prevAtsScoreRef = useRef<number | null>(null);

  // Handle journey mode and initialization
  useEffect(() => {
    // NEW APPROACH: Initialize journey using journeyId for reliable Application Package context
    const primaryJourneyId = journeyId;
    
    if (primaryJourneyId) {
      // Journey context will be loaded in initializeCVJourney()
    }

    // Update journey status based on current state - only if cvId actually changed
    const currentJourneyCvId = journeyState.cvId;
    if (cvId && cvId !== prevCvIdRef.current && currentJourneyCvId !== cvId) {
      prevCvIdRef.current = cvId;
      prevJourneyCvIdRef.current = currentJourneyCvId;
      updateCVId(cvId);
      updateJourneyStatus('cv-created');
      return; // Exit early to prevent multiple updates
    }

    // Handle mode changes - only if mode actually changed
    if (mode && mode !== prevModeRef.current) {
      prevModeRef.current = mode;

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
          // Check if CV has satisfactory ATS score - only check once per score change
          const currentAtsScore = journeyState.atsScore;
          if (currentAtsScore !== prevAtsScoreRef.current) {
            prevAtsScoreRef.current = currentAtsScore;
            
            if (currentAtsScore && currentAtsScore < 80) {
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
            } else if (currentAtsScore && currentAtsScore >= 80) {
              updateJourneyStatus('ats-checked');
            }
          }
          break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cvId, router, updateJourneyStatus, updateCVId, cvData]);

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
              userId,
              cvId,
              coverLetterId,
              null // no specific jobId
            );
            
            if (journeyInfo && journeyInfo.jobTitle && journeyInfo.company) {
              // Can't set currentJob with partial data - Job type requires all fields
              // Just keep journeyInfo for job context instead
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
              console.log('🔍 CVStudio - Loading cover letter:', { coverLetterId, userId });
              const response = await fetch(`/api/cover-letters/${coverLetterId}?userId=${userId}`);
              console.log('🔍 CVStudio - Cover letter API response status:', response.status);
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ CVStudio - Cover letter API error:', response.status, errorText);
                throw new Error(`Failed to load cover letter: ${response.status} - ${errorText}`);
              }
              
              const coverLetterResult = await response.json();
              console.log('✅ CVStudio - Cover letter API response:', coverLetterResult);
              
              // Handle different response structures
              const coverLetter = coverLetterResult.coverLetter || coverLetterResult.data?.coverLetter || coverLetterResult;
              
              if (!coverLetter) {
                console.error('❌ CVStudio - No cover letter in response:', coverLetterResult);
                throw new Error('Cover letter data not found in response');
              }
              
              console.log('✅ CVStudio - Setting cover letter data:', coverLetter);
              setCoverLetterData({
                content: coverLetter.content || '',
                title: coverLetter.title || 'Untitled Cover Letter',
                metadata: coverLetter.metadata || {}
              });
              setCoverLetterTitle(coverLetter.title || 'Untitled Cover Letter');
              
              // Store the coverLetterId
              setOriginalCoverLetterId(coverLetterId);

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
                    userId,
                    null, // cvId
                    coverLetterId, // coverLetterId
                    selectedJobId || undefined // use selectedJobId instead of undefined jobId
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
                      const templateId = cvResult.data?.cv?.templateId || cvResult.cv?.templateId;
                      if (cvData) {
                        console.log('✅ CVStudio - CV loaded:', cvData);
                        await setCvDataWithStructure(cvData, templateId);
                        setCvTitle(cvResult.data?.cv?.title || cvResult.cv?.title || 'Untitled CV');
                        
                        // Check if this is a master CV
                        const isMasterCV = cvResult.data?.cv?.metadata?.isMaster || false;
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
                      const templateId = cvResult.data?.cv?.templateId || cvResult.cv?.templateId;
                      if (cvData) {
                        await setCvDataWithStructure(cvData, templateId);
                        setCvTitle(cvResult.data?.cv?.title || cvResult.cv?.title || 'Untitled CV');
                        setOriginalCvId(coverLetter.cvId);
                      }
                    }
                  } catch (error) {
                    console.error('Error loading linked CV:', error);
                  }
                }
              }
            } catch (error) {
              console.error('❌ Error loading cover letter:', error);
              // CRITICAL: Cover letter itself failed to load
              console.error('❌ CRITICAL: Failed to load cover letter:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to load cover letter data';
              setError(errorMessage);
              setIsLoading(false);
              return;
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
              jobTitle: jobData?.title || (jobData as any)?.jobTitle || journeyInfo?.jobTitle,
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
                targetPosition: jobData?.title || (jobData as any)?.jobTitle || journeyInfo?.jobTitle || '',
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
            const sessionCVData = safeSessionStorageParse('newCVData');
            const masterCVData = safeSessionStorageParse('editingMasterCV');
            const editingCVData = safeSessionStorageParse('editingCVData');
            
            if (sessionCVData) {
              try {
                console.log('Found CV data in sessionStorage:', sessionCVData);

                // Set CV data from sessionStorage
                if (sessionCVData.cvData) {
                  // Data is already in unified format
                  convertedData = sessionCVData.cvData;
                  console.log('Session CV data:', convertedData);
                  setCvData(convertedData);
                  cvResult = sessionCVData;
                } else {
                  // Fallback to API call using unified service
                  const unifiedCV = await UnifiedCVService.getCV(cvId, userId);
                  console.log('Unified API CV data:', unifiedCV.cvData);
                  await setCvDataWithStructure(unifiedCV.cvData, unifiedCV.templateId);
                }

                // Set template if available
                if (sessionCVData.templateId && templatesResult.length > 0) {
                  const template = templatesResult.find((t: any) => t.id === sessionCVData.templateId);
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
                  masterCV = masterCVData;
                  cvDataFromStorage = masterCV.cvData;
                  console.log('🔍 Found master CV data in sessionStorage:', masterCV);
                } else if (editingCVData) {
                  cvDataFromStorage = editingCVData;
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
                  if (convertedData?.work && Array.isArray(convertedData.work) && convertedData.work.length > 0) {
                    console.log('🔍 CVStudio - First work item:', convertedData.work[0]);
                    console.log('🔍 CVStudio - First work item summary:', convertedData.work[0]?.summary);
                    console.log('🔍 CVStudio - First work item summary type:', typeof convertedData.work[0]?.summary);
                    console.log('🔍 CVStudio - First work item summary length:', convertedData.work[0]?.summary?.length);
                  }
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
                    const isMasterCV = cvData.data?.cv?.metadata?.isMaster || false;
                    
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
                    userId,
                    cvId,
                    null, // coverLetterId
                    null // jobId - will be determined from journey data
                  );
                  
                  if (journeyInfo) {
                    console.log('🔍 CVStudio - Loaded CV Journey data:', journeyInfo);
                    
                    // Set job information from CV Journey
                    if (journeyInfo.jobTitle && journeyInfo.company) {
                      // Can't set currentJob with partial data - Job type requires all fields
                      // Just keep journeyInfo for job context instead
                      // Auto-select the job in the job selector
                      setSelectedJobId(journeyInfo.jobId);
                      setJobAutoLoadedFromJourney(true);
                    }
                    
                    // Set cover letter information if available
                    if (journeyInfo.coverLetterId) {
                      setCoverLetterData({
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

          // Set template - FIXED: Properly load saved template from CV
          if (cvResult && cvResult.templateId) {
            console.log('🔍 Studio - Loading saved template:', cvResult.templateId);
            const templateIdToMatch = cvResult.templateId.toString();
            
            // First, try to find in database templates
            let template = templatesResult.find((t: any) =>
              t.id === templateIdToMatch ||
              t._id === templateIdToMatch ||
              t.id?.toString() === templateIdToMatch ||
              t._id?.toString() === templateIdToMatch
            );

            // If not found in database, check hardcoded templates
            if (!template) {
              const { HARDCODED_TEMPLATES } = await import('@/lib/templates/hardcoded-templates');
              template = HARDCODED_TEMPLATES.find((t: any) =>
                t.id === templateIdToMatch ||
                t._id === templateIdToMatch ||
                t.name.toLowerCase().replace(/\s+/g, '-') === templateIdToMatch.toLowerCase() ||
                templateIdToMatch.toLowerCase().includes(t.name.toLowerCase().replace(/\s+/g, '-'))
              );
            }

            if (template) {
              console.log('✅ Studio - Loaded saved template:', template.name);
              setSelectedTemplate(template);
            } else {
              console.warn('⚠️ Studio - Saved template not found, using Executive Professional as fallback');
              // Fallback to Executive Professional template
              const { HARDCODED_TEMPLATES } = await import('@/lib/templates/hardcoded-templates');
              const executiveProfessional = HARDCODED_TEMPLATES.find((t: any) => 
                t.id === 'executive-professional-layout-template' || 
                t.name === 'Executive Professional'
              );
              if (executiveProfessional) {
                console.log('✅ Studio - Using Executive Professional as fallback');
                setSelectedTemplate(executiveProfessional);
              } else if (templatesResult.length > 0) {
                setSelectedTemplate(templatesResult[0]);
              }
            }
          } else if (!selectedTemplate) {
            // No saved template, use Executive Professional as default
            console.log('🔍 Studio - No saved template, using Executive Professional as default');
            const { HARDCODED_TEMPLATES } = await import('@/lib/templates/hardcoded-templates');
            const executiveProfessional = HARDCODED_TEMPLATES.find((t: any) => 
              t.id === 'executive-professional-layout-template' || 
              t.name === 'Executive Professional'
            );
            if (executiveProfessional) {
              setSelectedTemplate(executiveProfessional);
            } else if (templatesResult.length > 0) {
              setSelectedTemplate(templatesResult[0]);
            }
          }
          
          // Reset change tracking flag after initial load
          cvDataChangedRef.current = false;
        } else {
            // Create default CV data structure
            const defaultCVData: UnifiedCVDataStructure = {
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
            // Set Elegant Timeline as default template if available, otherwise use first template
            if (templatesResult.length > 0) {
              const elegantTimeline = templatesResult.find((t: any) => 
                t.name === 'Elegant Timeline' || t.name.toLowerCase().includes('elegant timeline')
              );
              setSelectedTemplate(elegantTimeline || templatesResult[0]);
            } else {
              // If no templates from database, use hardcoded templates
              const { HARDCODED_TEMPLATES } = await import('@/lib/templates/hardcoded-templates');
              const elegantTimeline = HARDCODED_TEMPLATES.find((t: any) => 
                t.name === 'Elegant Timeline' || t.name.toLowerCase().includes('elegant timeline')
              );
              if (elegantTimeline) {
                console.log('✅ Studio - Using hardcoded Elegant Timeline as default for new CV');
                setSelectedTemplate(elegantTimeline);
              }
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

  // Ref to store preview element for downloads
  const previewRef = useRef<HTMLDivElement | null>(null);

  const handleDownload = async (documentType: import('@/components/ui/DownloadModal').DocumentType, format: import('@/components/ui/DownloadModal').FormatType) => {
    if (!cvData && documentType !== 'coverLetter') {
      console.error('No CV data to export');
      return;
    }

    try {
      setSaveStatus('saving');

      // Get the preview element from the preview panel
      // The previewRef wraps the PreviewPanel, so we need to find the actual preview content
      let previewElement: HTMLElement | null = null;
      
      if (previewRef.current) {
        // Find the preview content inside the wrapper
        previewElement = previewRef.current.querySelector('.cv-preview-container') as HTMLElement ||
                         previewRef.current.querySelector('[class*="cv-preview"]') as HTMLElement ||
                         previewRef.current;
      }
      
      // Fallback: try to find the preview container in the DOM
      if (!previewElement && documentType !== 'all') {
        previewElement = document.querySelector('.cv-preview-container') as HTMLElement ||
                         document.querySelector('[class*="cv-preview"]') as HTMLElement;
        
        if (!previewElement) {
          throw new Error('Preview element not found');
        }
      }

      // Import download utilities
      const { downloadAsPDF, downloadAsDOCX } = await import('@/lib/utils/download');

      let filename = '';
      const baseName = cvData?.basics?.name?.toLowerCase().replace(/\s+/g, '-') || cvTitle?.toLowerCase().replace(/\s+/g, '-') || 'document';

      if (documentType === 'all') {
        // For journey downloads, use the API
        if (journeyId) {
          const response = await fetch(`/api/application-journey/${journeyId}/download?type=all`);
          if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
          a.download = `${baseName}-application-files.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
        } else {
          throw new Error('Journey ID required for full download');
        }
      } else if (documentType === 'cvAndCoverLetter') {
        // Download both as separate files
        if (!previewElement) throw new Error('Preview element not found');
        
        // Download CV
        if (cvData && previewElement) {
          await downloadAsPDF(previewElement, `${baseName}-cv.${format}`);
        }
        
        // Download Cover Letter (if available)
        if (coverLetterId && coverLetterData) {
          // Switch to cover letter view temporarily
          const originalDocType = documentType;
          // Note: We'd need to switch document type and get cover letter preview
          // For now, use API approach
          const response = await fetch(`/api/cvs/${coverLetterId}/download?format=${format}`);
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}-cover-letter.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }
        }
      } else if (documentType === 'cv') {
        // Download CV only
        if (!previewElement) throw new Error('Preview element not found');
        
        if (format === 'pdf') {
          await downloadAsPDF(previewElement, `${baseName}-cv.pdf`);
        } else if (format === 'docx') {
          if (cvData) {
            await downloadAsDOCX(cvData, `${baseName}-cv.docx`);
          }
        } else if (format === 'doc') {
          // DOC format - convert DOCX or use API
          if (cvData) {
            await downloadAsDOCX(cvData, `${baseName}-cv.doc`);
          }
        }
      } else if (documentType === 'coverLetter') {
        // Download Cover Letter only
        if (coverLetterId) {
          const response = await fetch(`/api/cvs/${coverLetterId}/download?format=${format}`);
          if (!response.ok) throw new Error('Cover letter download failed');
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${baseName}-cover-letter.${format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }

      setSaveStatus('saved');
      console.log(`Successfully downloaded ${documentType} as ${format}`);
    } catch (err) {
      console.error('Error downloading:', err);
      setSaveStatus('error');
      throw err;
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
      let cvData = cvResult.data?.cv?.cvData || cvResult.cv?.cvData || cvResult.cvData;
      const cvTitle = cvResult.data?.cv?.title || cvResult.cv?.title || cvResult.title;
      const templateId = cvResult.data?.cv?.templateId || cvResult.cv?.templateId;
      
      if (cvData) {
        await setCvDataWithStructure(cvData, templateId);
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
    // Initialize variables that might be needed in error handler
    const currentJourneyId = journeyId || journeyInfo?.journeyId;
    const currentJobId = journeyInfo?.jobId || selectedJobId;
    let newParams = new URLSearchParams();
    
    try {
      console.log('🔄 ================================================');
      console.log('🔄 HANDLE DOCUMENT TYPE CHANGE CALLED');
      console.log('🔄 New Type:', newType);
      console.log('🔄 Current Type:', documentType);
      console.log('🔄 ================================================');
      
      // Save current document before switching to prevent data loss
      if (documentType === 'cv' && cvData) {
        console.log('💾 Auto-saving CV before switching...');
        await manualSave();
      } else if (documentType === 'cover-letter' && coverLetterData) {
        console.log('💾 Auto-saving cover letter before switching...');
        await manualSave();
      }
    } catch (error) {
      console.error('❌ Error in save before switch:', error);
      // Continue anyway
    }
    
    // Wrap the rest of the function in try-catch for error handling
    try {
      // CRITICAL: Load fresh journey data from database before switching
      let freshJourneyData = journeyInfo;
      
      if (currentJourneyId && userId) {
      try {
        console.log('🔄 Loading fresh journey data from database:', currentJourneyId);
        const journeyResponse = await fetch(`/api/application-journey/${currentJourneyId}?userId=${userId}`);
        
        console.log('📡 Journey API response status:', journeyResponse.status);
        
        if (journeyResponse.ok) {
          const journeyResult = await journeyResponse.json();
          console.log('📡 Journey API result:', journeyResult);
          
          if (journeyResult.success && journeyResult.data?.journey) {
            freshJourneyData = {
              journeyId: currentJourneyId,
              cvId: journeyResult.data.journey.cvId,
              coverLetterId: journeyResult.data.journey.coverLetterId,
              jobId: journeyResult.data.journey.jobId,
              userId,
              status: journeyResult.data.journey.status,
              currentStep: journeyResult.data.journey.currentStep,
              jobTitle: journeyResult.data.journey.jobTitle,
              company: journeyResult.data.journey.company
            };
            setJourneyInfo(freshJourneyData);
            console.log('✅ Fresh journey data loaded:', {
              cvId: freshJourneyData.cvId,
              coverLetterId: freshJourneyData.coverLetterId,
              jobId: freshJourneyData.jobId
            });
          }
        } else {
          console.warn('⚠️  Journey API returned non-OK status:', journeyResponse.status);
          // Continue with existing journeyInfo
        }
      } catch (error) {
        console.error('❌ Failed to load fresh journey data:', error);
        // Continue with existing journeyInfo
      }
    } else {
      console.warn('⚠️ Missing currentJourneyId or userId, using existing journeyInfo');
    }
    
    // DON'T update local state here - let URL change trigger it via useEffect
    // This prevents race conditions and ensures URL is source of truth
    
    // Build new URL parameters using fresh journey data
    const currentJobId = freshJourneyData?.jobId || selectedJobId;
    
    console.log('🔄 Document type change - Current context:', {
      journeyId,
      journeyInfoJourneyId: journeyInfo?.journeyId,
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
      
      // Build the new URL params object (reuse the one declared at top of function)
      newParams = new URLSearchParams();
      
      // Always preserve journeyId as the primary context identifier
      if (currentJourneyId) {
        newParams.set('journeyId', currentJourneyId);
        console.log('✅ Preserving journeyId in URL:', currentJourneyId);
      }
      
      // Keep jobId for backwards compatibility
      const finalJobId = freshJourneyData?.jobId || selectedJobId;
      if (finalJobId) {
        newParams.set('jobId', finalJobId);
      }
    
      if (newType === 'cover-letter') {
        // Switch to cover letter mode
        console.log('🔄 Setting cover letter mode parameters');
        newParams.set('type', 'cover_letter');
        newParams.set('mode', 'cover-letter');  // Set mode to match document type
        newParams.delete('cvId'); // Ensure cvId is not in params for cover letter mode
        
        // CRITICAL: Ensure CV data is loaded for AI generation in cover letters
        const existingCvId = freshJourneyData?.cvId || originalCvId || cvId;
        if (existingCvId && !cvData) {
          console.log('🔄 Loading CV data for cover letter context:', existingCvId);
          await reloadCVData(existingCvId);
        }
        
        // Find existing cover letter ID from multiple sources
        const existingCoverLetterId = freshJourneyData?.coverLetterId ||
                                     journeyInfo?.coverLetterId ||
                                     originalCoverLetterId ||
                                     coverLetterId;
        
        console.log('🔄 Switching to cover letter - Checking for existing cover letter:', {
          freshJourneyDataCoverLetterId: freshJourneyData?.coverLetterId,
          journeyInfoCoverLetterId: journeyInfo?.coverLetterId,
          originalCoverLetterId,
          coverLetterId,
          finalExistingId: existingCoverLetterId
        });
        
        // Determine final cover letter ID to use
        let finalCoverLetterId: string | null = existingCoverLetterId || null;
        
        if (existingCoverLetterId) {
          console.log('✅ Using existing cover letter ID:', existingCoverLetterId);
          
          // Update state to ensure we track this coverLetterId
          setOriginalCoverLetterId(existingCoverLetterId);
          
          // Reload cover letter data
          try {
            await reloadCoverLetterData(existingCoverLetterId);
            console.log('✅ Cover letter data reloaded');
          } catch (error) {
            console.error('❌ Error reloading cover letter:', error);
          }
        } else {
          // No existing cover letter found - need to create one
          console.log('🔍 No existing cover letter found, creating new one');
          
          // Final safety check: Query the journey to make sure no cover letter exists
          if (currentJourneyId && userId) {
            try {
              console.log('🔍 Safety check - Querying journey for cover letter...');
              const safetyCheckResponse = await fetch(`/api/application-journey/${currentJourneyId}?userId=${userId}`);
              
              if (safetyCheckResponse.ok) {
                const safetyCheckResult = await safetyCheckResponse.json();
                const safetyCoverLetterId = safetyCheckResult.data?.journey?.coverLetterId;
                
                if (safetyCoverLetterId) {
                  console.log('✅ Found cover letter in safety check:', safetyCoverLetterId);
                  finalCoverLetterId = safetyCoverLetterId;
                  setOriginalCoverLetterId(safetyCoverLetterId);
                  
                  // Update local journey info
                  setJourneyInfo(prev => prev ? {
                    ...prev,
                    coverLetterId: safetyCoverLetterId
                  } : null);
                  
                  // Reload the cover letter data
                  try {
                    await reloadCoverLetterData(safetyCoverLetterId);
                  } catch (error) {
                    console.error('❌ Error reloading cover letter:', error);
                  }
                } else {
                  // No cover letter exists - create new one via duplication
                  console.log('🔍 Creating new cover letter via duplication');
                  try {
                    const { defaultCoverLetterService } = await import('@/lib/services/defaultCoverLetterService');
                    const defaultCoverLetterId = await defaultCoverLetterService.ensureDefaultCoverLetter(userId);
                    
                    const newCoverLetterTitle = `${journeyInfo?.company || currentJob?.company || 'Company'}_${journeyInfo?.jobTitle || currentJob?.title || 'Position'} | Cover_Letter`;
                    
                    const duplicateResponse = await fetch('/api/cover-letters/duplicate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sourceCoverLetterId: defaultCoverLetterId,
                        userId,
                        customTitle: newCoverLetterTitle,
                        jobId: currentJobId,
                        journeyId: currentJourneyId
                      })
                    });
                    
                    if (duplicateResponse.ok) {
                      const duplicateResult = await duplicateResponse.json();
                      const newCoverLetterData = duplicateResult.data?.coverLetter || duplicateResult.coverLetter;
                      
                      if (newCoverLetterData) {
                        const newCoverLetterId = newCoverLetterData.id || newCoverLetterData._id;
                        finalCoverLetterId = newCoverLetterId;
                        
                        // Update state
                        setOriginalCoverLetterId(newCoverLetterId);
                        setCoverLetterData(newCoverLetterData);
                        setCoverLetterTitle(newCoverLetterData.title || newCoverLetterTitle);
                        
                        // Update journey
                        if (currentJourneyId) {
                          await updateJourneyWithDocument(newCoverLetterId, 'cover-letter');
                          setJourneyInfo(prev => prev ? {
                            ...prev,
                            coverLetterId: newCoverLetterId
                          } : null);
                        }
                        
                        console.log('✅ Created new cover letter:', newCoverLetterId);
                      }
                    } else {
                      console.error('❌ Duplication failed:', await duplicateResponse.text());
                    }
                  } catch (error) {
                    console.error('❌ Error creating cover letter:', error);
                  }
                }
              }
            } catch (error) {
              console.error('❌ Safety check failed:', error);
            }
          }
        }
        
        // CRITICAL: Always set coverLetterId in URL if we have one
        // This must happen AFTER all async operations complete
        if (finalCoverLetterId) {
          newParams.set('coverLetterId', finalCoverLetterId);
          newParams.delete('cvId');
          console.log('✅ Final cover letter ID set in URL:', finalCoverLetterId);
        } else {
          console.warn('⚠️ No cover letter ID available for URL');
          // If no cover letter ID was found or created, we still navigate
          // The studio will handle creating one on load if needed
        }
      } else {
        // Switch to CV mode
        newParams.set('type', 'cv');
        newParams.set('mode', 'cv');  // Set mode to match document type
        
        // Find existing CV ID from fresh journey data FIRST
        const existingCvId = freshJourneyData?.cvId || originalCvId || cvId;
        console.log('🔄 Switching to CV - Found from journey:', existingCvId);
        
        if (existingCvId) {
          newParams.set('cvId', existingCvId);
          // Remove coverLetterId param when in CV mode
          newParams.delete('coverLetterId');
          
          // Update state to ensure we track this cvId
          setOriginalCvId(existingCvId);
          
          // Reload CV data
          try {
            await reloadCVData(existingCvId);
          } catch (error) {
            console.error('❌ Error reloading CV, but continuing:', error);
          }
        } else if (journeyInfo?.cvId) {
          // Use CV from journey
          newParams.set('cvId', journeyInfo.cvId);
          // Remove coverLetterId param when in CV mode
          newParams.delete('coverLetterId');
          setOriginalCvId(journeyInfo.cvId);
          try {
            await reloadCVData(journeyInfo.cvId);
          } catch (error) {
            console.error('❌ Error reloading CV, but continuing:', error);
          }
        } else {
          console.warn('⚠️ No CV found in any context');
          setError('No existing CV found. Please ensure you have a CV linked to this journey.');
        }
      }
      
      // Use Next.js router to update URL - this will trigger proper re-render with new props
      const newUrl = `/studio?${newParams.toString()}`;
      console.log('🔗 ============================================');
      console.log('🔗 FINAL URL NAVIGATION');
      console.log('🔗 ============================================');
      console.log('🔗 New document type:', newType);
      console.log('🔗 Final URL params:', {
        type: newParams.get('type'),
        mode: newParams.get('mode'),
        cvId: newParams.get('cvId'),
        coverLetterId: newParams.get('coverLetterId'),
        journeyId: newParams.get('journeyId'),
        jobId: newParams.get('jobId')
      });
      console.log('🔗 Full URL:', newUrl);
      console.log('🔗 About to call router.push()...');
      console.log('🔗 ============================================');
      
      // Use push to trigger full navigation and re-render
      router.push(newUrl);
      
      console.log('🔗 router.push() called successfully');
  } catch (error) {
    console.error('❌ Error in handleDocumentTypeChange:', error);
    setError('Failed to switch document type. Please try again.');
    // Still try to navigate even if there was an error, but without coverLetterId
    try {
      const fallbackParams = new URLSearchParams();
      if (currentJourneyId) fallbackParams.set('journeyId', currentJourneyId);
      const finalJobId = journeyInfo?.jobId || selectedJobId;
      if (finalJobId) fallbackParams.set('jobId', finalJobId);
      if (newType === 'cover-letter') {
        fallbackParams.set('type', 'cover_letter');
        fallbackParams.set('mode', 'cover-letter');
      } else {
        fallbackParams.set('type', 'cv');
        fallbackParams.set('mode', 'cv');
      }
      router.push(`/studio?${fallbackParams.toString()}`);
    } catch (navError) {
      console.error('❌ Failed to navigate on error:', navError);
    }
  }
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
    // Update React state for immediate UI feedback
    setSectionVisibility(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));

    // Update cvData structure for persistence
    if (cvData) {
      const updatedData = updateStructureInCVData(cvData, {
        sectionVisibility: {
          ...sectionVisibility,
          [sectionId]: !sectionVisibility[sectionId]
        }
      });
      setCvData(updatedData);
    }
  };

  const handleSectionReorder = (newSections: Array<{ id: string; type: string }>) => {
    // Extract new order from sections
    const newOrder = newSections.map(s => s.type || s.id);
    
    // Update React state for immediate UI feedback
    setSectionOrder(newOrder);

    // Update cvData structure for persistence
    if (cvData) {
      const updatedData = updateStructureInCVData(cvData, {
        sectionOrder: newOrder
      });
      setCvData(updatedData);
    }
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
        if (selectedJobId) {
          urlParams.set('jobId', selectedJobId);
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
          jobId: selectedJobId || undefined
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
          if (selectedJobId) {
            urlParams.set('jobId', selectedJobId);
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
          data={cvData?.basics || {
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
          onUpdate={(data: any[]) => updateCVField('work', data)}
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

    // Use centralized hasSectionData function

    // Build sections - use structure if available, otherwise use section type as ID
    const sectionsList: Array<{ id: string; type: string }> = [];
    
    if (cvData?.structure?.sections && Array.isArray(cvData.structure.sections)) {
      // Use structure sections - maintain order from structure
      cvData.structure.sections.forEach(structureSection => {
        sectionsList.push({
          id: structureSection.id, // Use structure ID
          type: structureSection.type // Use structure type
        });
      });
      
      // Add any sections from allSections that aren't in structure yet
      allSections.forEach(sectionType => {
        if (!sectionsList.some(s => s.type === sectionType)) {
          sectionsList.push({
            id: sectionType, // Use type as ID for new sections
            type: sectionType
          });
        }
      });
    } else {
      // Legacy: use section types as IDs
      sectionOrder.forEach(sectionType => {
        if (allSections.includes(sectionType)) {
          sectionsList.push({
            id: sectionType,
            type: sectionType
          });
        }
      });
      
      // Add any remaining sections
      allSections.forEach(sectionType => {
        if (!sectionsList.some(s => s.type === sectionType)) {
          sectionsList.push({
            id: sectionType,
            type: sectionType
          });
        }
      });
    }

    return sectionsList.map(section => {
      const sectionId = section.type; // Use type for lookup
      const hasData = hasSectionData(cvData, sectionId);
      const isDisabled = !hasData;
      
      return {
        id: section.id, // Structure ID or type ID
        type: section.type, // Section type string
        title: sectionTitles[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1),
        icon: getSectionIcon(sectionId),
        visible: sectionVisibility[sectionId] !== false, // Default to visible if not set
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

  // Get CV sections for sidebar - uses centralized selector
  const getCVSectionsForSidebar = () => {
    if (!cvData) return [];

    // Use centralized selector - single source of truth for section visibility
    const visibleSections = getVisibleCVSections(cvData, documentType);

    // Map to sidebar format (maintains compatibility with existing sidebar component)
    return visibleSections.map(section => ({
      id: section.type, // Use type as id for compatibility
      title: section.label, // Use label from selector
      icon: getSectionIcon(section.type), // Map icon name to component
      visible: true, // All sections from selector are visible
      hasData: hasSectionData(cvData, section.type) // Compute data status
    }));
  };

  // Helper to get section title
  const getSectionTitle = (sectionId: string) => {
    const titles: Record<string, string> = {
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
    return titles[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1).replace(/_/g, ' ');
  };

  // Handle structure section click
  const handleStructureSectionClick = (sectionId: string) => {
    const currentIndex = sectionOrder.indexOf(sectionId);
    const previousIndex = sectionOrder.findIndex(s => s === activeStructureSection);
    
    setActiveStructureSection(sectionId);
    setPreviousStructureSectionIndex(previousIndex);
    
    // Scroll to section in the content if needed
    // This will be handled by FloatingStudioLayout animation
  };

  // Get available sections that can be added using centralized selector
  const getAvailableSectionsToAdd = () => {
    // Use the "Palette" selector - single source of truth for addable sections
    const addableSections = getAddableCVSections(cvData);
    
    // Map to format expected by modal (convert icon names to components)
    return addableSections.map(section => ({
      id: section.id,
      title: section.label,
      icon: getSectionIcon(section.id), // Map icon name to component
      category: section.category,
      description: section.description
      }));
  };

  // Handle add section
  const handleAddSection = () => {
    setShowAddSectionModal(true);
  };

  // Add a new section with default data - use functional updates to avoid stale state
  const addNewSection = (sectionId: string) => {
    setCvData(prev => {
      if (!prev) return prev;
      
      const updatedData = { ...prev };

      // Update CV data with default item
      switch (sectionId) {
        case 'skills': {
          const defaultSkill = getDefaultItemForSection('skills') as { category: string; skills: string[] };
          updatedData.skills = [...(prev.skills || []), defaultSkill];
          break;
        }
        case 'projects': {
          const defaultProject = getDefaultItemForSection('projects') as unknown as { name: string; startDate: string; endDate: string; description: string; highlights: string[]; keywords: string[]; url: string };
          updatedData.projects = [...(prev.projects || []), defaultProject];
          break;
        }
        case 'certificates': {
          const defaultCert = getDefaultItemForSection('certificates') as unknown as { name: string; date: string; issuer: string; url: string; description: string };
          updatedData.certificates = [...(prev.certificates || []), defaultCert];
          break;
        }
        case 'languages': {
          const defaultLang = getDefaultItemForSection('languages') as { language: string; fluency: string };
          updatedData.languages = [...(prev.languages || []), defaultLang];
          break;
        }
        case 'volunteer': {
          const defaultVolunteer = getDefaultItemForSection('volunteer') as unknown as { organization: string; position: string; url: string; startDate: string; endDate: string; summary: string; highlights: string[] };
          updatedData.volunteer = [...(prev.volunteer || []), defaultVolunteer];
          break;
        }
        case 'awards': {
          const defaultAward = getDefaultItemForSection('awards') as { title: string; date: string; awarder: string; summary: string };
          updatedData.awards = [...(prev.awards || []), defaultAward];
          break;
        }
        case 'publications': {
          const defaultPub = getDefaultItemForSection('publications') as { name: string; publisher: string; releaseDate: string; url: string; summary: string };
          updatedData.publications = [...(prev.publications || []), defaultPub];
          break;
        }
        case 'interests': {
          const defaultInterest = getDefaultItemForSection('interests') as { name: string; keywords: string[] };
          updatedData.interests = [...(prev.interests || []), defaultInterest];
          break;
        }
        case 'references': {
          const defaultRef = getDefaultItemForSection('references') as { name: string; reference: string };
          updatedData.references = [...(prev.references || []), defaultRef];
          break;
        }
        default:
          return prev;
      }

      // CRITICAL: Update structure to mark section as visible
      // Only run migration if structure doesn't exist at all
      // If structure exists, preserve it and just add/update the section
      if (!updatedData.structure) {
        // Structure doesn't exist - run migration to create complete structure
        const migratedData = migrateLegacyCV(updatedData);
        updatedData.structure = migratedData.structure;
      } else {
        // Structure exists - preserve it and just update/add the section
        // Ensure sections array exists
        if (!updatedData.structure.sections) {
          updatedData.structure.sections = [];
        }
        
        // Clone structure to avoid mutations
        updatedData.structure = {
          ...updatedData.structure,
          sections: [...updatedData.structure.sections]
        };
        
        // Find or create the section in structure
        let sectionExists = false;
        updatedData.structure.sections = updatedData.structure.sections.map(section => {
          if (section.type === sectionId) {
            sectionExists = true;
            // Mark as visible since it now has data
            return { ...section, visible: true };
          }
          return section;
        });
        
        // If section doesn't exist in structure, add it
        if (!sectionExists) {
          const sectionIdForStructure = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 
            `section-${Date.now()}-${Math.random()}`;
          updatedData.structure.sections.push({
            id: sectionIdForStructure,
            type: sectionId,
            visible: true // Mark as visible since it now has data
          });
        }
      }

      return updatedData;
    });
    
    setShowAddSectionModal(false);
    setActiveStructureSection(sectionId);
  };

  // Delete a section - marks as invisible and clears data
  const deleteSection = (sectionId: string) => {
    // Don't allow deleting personal_header
    if (sectionId === 'personal_header') {
      return;
    }

    setCvData(prev => {
      if (!prev) return prev;
      
      const updatedData = { ...prev };

      // Clear section data
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
      
      // Clear the section data (set to empty array for list sections)
      if (dataKey === 'work' || dataKey === 'education' || dataKey === 'skills' || 
          dataKey === 'projects' || dataKey === 'certificates' || dataKey === 'languages' ||
          dataKey === 'volunteer' || dataKey === 'awards' || dataKey === 'publications' ||
          dataKey === 'interests' || dataKey === 'references') {
        updatedData[dataKey] = [] as any;
      }

      // Update structure to mark section as invisible
      if (updatedData.structure?.sections) {
        updatedData.structure = {
          ...updatedData.structure,
          sections: updatedData.structure.sections.map(section => {
            if (section.type === sectionId) {
              return { ...section, visible: false };
            }
            return section;
          })
        };
      }

      return updatedData;
    });

    // If this was the active section, clear it
    if (activeStructureSection === sectionId) {
      setActiveStructureSection(null);
    }
  };

  // Handle section reordering from sidebar
  const handleSidebarSectionReorder = (sectionIds: string[]) => {
    setCvData(prev => {
      if (!prev || !prev.structure?.sections) return prev;

      const updatedData = { ...prev };
      
      // Ensure personal_header is always first
      const personalHeaderIndex = sectionIds.indexOf('personal_header');
      if (personalHeaderIndex > 0) {
        sectionIds.splice(personalHeaderIndex, 1);
        sectionIds.unshift('personal_header');
      } else if (personalHeaderIndex === -1) {
        // If personal_header is missing, add it at the beginning
        sectionIds.unshift('personal_header');
      }

      // Create a map of existing sections by type
      const sectionMap = new Map(
        updatedData.structure.sections.map(s => [s.type, s])
      );

      // Reorder sections based on new order
      const reorderedSections = sectionIds
        .map(type => {
          const existing = sectionMap.get(type);
          if (existing) {
            return existing;
          }
          // If section doesn't exist in structure, create it
          return {
            id: type,
            type: type,
            visible: false
          };
        })
        .filter(Boolean);

      // Add any sections that weren't in the reorder list (shouldn't happen, but safety)
      updatedData.structure.sections.forEach(section => {
        if (!sectionIds.includes(section.type)) {
          reorderedSections.push(section);
        }
      });

      updatedData.structure = {
        ...updatedData.structure,
        sections: reorderedSections
      };

      return updatedData;
    });
  };

  return (
    <>
      <FloatingStudioLayout
        documentTitle={documentType === 'cover-letter' ? coverLetterTitle : cvTitle}
        onTitleUpdate={documentType === 'cover-letter' ? setCoverLetterTitle : handleTitleUpdate}
        saveStatus={saveStatus}
        onSave={manualSave}
        onDownload={handleDownload}
        hasCV={!!cvData && documentType === 'cv'}
        hasCoverLetter={!!coverLetterData && documentType === 'cover-letter'}
        leftPanel={
          <SidebarStudioPanel
            activeSection={activeSidebarSection}
            onSectionChange={setActiveSidebarSection}
            cvSections={getCVSectionsForSidebar()}
            activeStructureSection={activeStructureSection || undefined}
            onStructureSectionClick={handleStructureSectionClick}
            onAddSection={handleAddSection}
            onDeleteSection={deleteSection}
            onSectionReorder={handleSidebarSectionReorder}
            previousStructureSectionIndex={previousStructureSectionIndex}
            documentType={documentType}
            structureContent={
              documentType === 'cover-letter' ? (
                <div className="h-full w-full bg-[#1A201A] p-6">
                  <CoverLetterStructureContent
                    coverLetterData={coverLetterData}
                    onUpdate={setCoverLetterData}
                    cvData={cvData}
                    jobData={currentJob}
                    userId={userId}
                  />
                </div>
              ) : documentType === 'cv' && cvData ? (
                <RestructuredStudioLayout
                  jobData={currentJob}
                  onJobChange={() => {
                    // Handle job change - could open job selector modal
                    console.log('Job change requested');
                  }}
                  selectedJobId={selectedJobId}
                  onJobSelection={handleJobSelection}
                  userId={userId}
                  cvData={cvData}
                  cvId={cvId || ''}
                  onUpdateField={updateCVField}
                  onScoreUpdate={(score) => {
                    updateAtsScore(score);
                    if (score >= 60) {
                      updateJourneyStatus('ats-checked');
                    }
                  }}
                  onUpdateCV={setCvData}
                  jobContext={currentJob}
                />
              ) : isLoading ? (
                <div className="space-y-4">
                  {/* Skeleton for sections while loading */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white dark:bg-[#1a230f] rounded-lg border border-gray-200 dark:border-white/10 p-4 animate-pulse">
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
            designContent={
              documentType === 'cover-letter' ? (
                <CoverLetterDesignContent
                  currentTemplate={selectedTemplate}
                  coverLetterData={coverLetterData}
                  onSettingsChange={(settings) => {
                    console.log('Cover letter design settings changed:', settings);
                    // Apply design settings for cover letter
                  }}
                />
              ) : (
                <DesignContent
                  currentTemplate={selectedTemplate}
                  cvData={cvData}
                  onSettingsChange={(settings) => {
                    console.log('Design settings changed:', settings);
                    // Apply design settings to template in real-time
                    if (selectedTemplate) {
                      const updatedTemplate = {
                        ...selectedTemplate,
                        globalStyles: {
                          ...selectedTemplate.globalStyles,
                          fontFamily: settings.fontFamily,
                          fontSize: `${settings.bodyFontSize}px`,
                          headerFontSize: `${settings.headerFontSize}px`,
                          sectionFontSize: `${settings.sectionFontSize}px`,
                          lineHeight: settings.lineSpacing.toString(),
                          letterSpacing: `${settings.letterSpacing}px`,
                          spacing: `${settings.sectionSpacing}px`,
                          primaryColor: settings.primaryColor || settings.colorScheme?.split('-')[0] || '#000000',
                          secondaryColor: settings.secondaryColor || '#374151',
                          accentColor: settings.accentColor || '#80FF00'
                        }
                      };
                      setSelectedTemplate(updatedTemplate);
                      
                      // Auto-save template changes if we have a CV ID
                      if (cvId && cvData) {
                        debouncedSave(cvData);
                      }
                    }
                  }}
                />
              )
            }
            templateContent={
              documentType === 'cover-letter' ? (
                <CoverLetterTemplateContent
                  selectedTemplate={selectedTemplate as any}
                  onTemplateSelect={(template) => {
                    setSelectedTemplate(template as any);
                    console.log('Cover letter template selected:', template);
                  }}
                />
              ) : (
                <TemplateContent
                  selectedTemplate={selectedTemplate}
                  onTemplateSelect={async (template) => {
                    setSelectedTemplate(template);
                    console.log('Template selected:', template);
                    
                    // Auto-save the template selection if we have a CV ID
                    if (cvId && cvData) {
                      try {
                        setSaveStatus('saving');
                        const updateData = {
                          title: cvTitle,
                          cvData: cvData,
                          templateId: template?.id || template?._id || '',
                          metadata: {
                            isMaster: isMasterCV
                          }
                        };
                        
                        await CVService.updateCV(cvId, updateData, userId || undefined);
                        setSaveStatus('saved');
                        console.log('✅ Template selection auto-saved');
                      } catch (error) {
                        console.error('❌ Failed to auto-save template selection:', error);
                        setSaveStatus('error');
                      }
                    }
                  }}
                  onTemplatePreview={(template) => {
                    console.log('Template preview:', template);
                  }}
                />
              )
            }
            aiReportContent={
              documentType === 'cv' && cvData ? (
                <ComprehensiveATSAnalyzer
                  selectedJobId={selectedJobId}
                  onJobSelection={handleJobSelection}
                  userId={userId}
                  cvData={cvData}
                  jobData={currentJob}
                  cvId={cvId || undefined}
                  onUpdateField={updateCVField}
                  onScoreUpdate={(score) => {
                    updateAtsScore(score);
                    if (score >= 60) {
                      updateJourneyStatus('ats-checked');
                    }
                  }}
                />
              ) : null
            }
          />
        }
        rightPanel={
          isLoading ? (
            <div className="bg-white dark:bg-[#1a230f] rounded-lg border border-gray-200 dark:border-white/10 p-6 animate-pulse">
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
                <div className="aspect-[8.5/11] bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ) : (
            <PreviewPanel
              ref={previewRef}
              cvData={debouncedCvData}
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

      {/* Add Section Modal - Matching MasterCVBuilderStep */}
        {showAddSectionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[#222B22] rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Section</h2>
                  <button
                    onClick={() => setShowAddSectionModal(false)}
                className="text-white/60 hover:text-white transition-colors"
                  >
                <X size={24} />
                  </button>
              </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {getAvailableSectionsToAdd().map((section) => {
                      const IconComponent = section.icon;
                
                      return (
                        <motion.button
                          key={section.id}
                    onClick={() => addNewSection(section.id)}
                    className="w-full aspect-square flex flex-col items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 bg-white/10 hover:bg-white/20 text-white hover:scale-105"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                        >
                    {React.createElement(IconComponent, { size: 32 })}
                    <span className="font-medium text-sm text-center">{section.title}</span>
                    {section.description && (
                      <span className="text-xs text-white/60 text-center">{section.description}</span>
                    )}
                        </motion.button>
                      );
                    })}
                  </div>
          </motion.div>
                  </div>
                )}
    </>
  );
};

export default CVStudio;
