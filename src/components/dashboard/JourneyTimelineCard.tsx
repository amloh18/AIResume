'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Download, 
  Trash2, 
  Play,
  Calendar,
  Building,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Eye,
  Settings,
  Mail,
  ExternalLink,
  Plus,
  Copy,
  RefreshCw,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  DollarSign,
  Target
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useUserPlan } from '@/lib/hooks/useUserPlan';
import MoveToAppliedModal from '@/components/modals/MoveToAppliedModal';
// CelebrationModal removed - simplified UX
import { JourneyAnalyticsService } from '@/lib/utils/journeyAnalytics';
import { defaultCoverLetterService } from '@/lib/services/defaultCoverLetterService';
import DownloadModal, { DocumentType, FormatType } from '@/components/ui/DownloadModal';

interface Journey {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'in-progress' | 'completed' | 'paused' | 'processing_documents' | 'creation_failed' | 'ready';
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  atsScore?: number;
  cvId?: string;
  coverLetterId?: string;
  lastWorkedOn?: string;
  completedAt?: string;
  journeyDuration?: number;
  atsScoreHistory?: Array<{ score: number; calculatedAt: string }>;
  downloadHistory?: Array<{ downloadedAt: string; fileType: string }>;
  _debug?: {
    linkedCVId?: string;
    linkedCVMetadata?: any;
    linkedCoverLetterId?: string;
    jobStatus?: string;
  };
}

interface CV {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  lastModified: string;
  updatedAt: string;
  jobId?: string;
  isMaster?: boolean;
  metadata?: any;
  journeyId?: string | null;
}

interface CoverLetter {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  lastModified: string;
  jobId?: string;
}

interface JourneyTimelineCardProps {
  journey: Journey;
  onResume: (journey: Journey) => void;
  onDownload: (journey: Journey) => void;
  onDelete: (journeyId: string) => void;
  onRefresh?: () => void;
  onUpdateJourney?: (journeyId: string, updates: Partial<Journey>) => void;
  onShowDeleteConfirm: (journeyId: string) => void;
}

const JourneyTimelineCard: React.FC<JourneyTimelineCardProps> = ({
  journey,
  onResume,
  onDownload,
  onDelete,
  onRefresh,
  onUpdateJourney,
  onShowDeleteConfirm
}) => {
  const { isDark } = useTheme();
  const { state, updateJourneyStatus, updateJobInfo, updateCurrentStep, updateCVId, updateCoverLetterId, updateAtsScore, updateCurrentJobId, endJourney } = useJobJourney();
  const { hasAI } = useUserPlan();
  const { data: session } = useSession();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [userCVs, setUserCVs] = React.useState<CV[]>([]);
  const [freestandingCVs, setFreestandingCVs] = React.useState<CV[]>([]);
  const [userCoverLetters, setUserCoverLetters] = React.useState<CoverLetter[]>([]);
  const [isRunningATSCheck, setIsRunningATSCheck] = React.useState(false);
  const [linkedCV, setLinkedCV] = React.useState<CV | null>(null);
  const [linkedCoverLetter, setLinkedCoverLetter] = React.useState<CoverLetter | null>(null);
  const [expandedStep, setExpandedStep] = React.useState<number | null>(null);
  const [cvNotFound, setCvNotFound] = React.useState<boolean>(false);
  const [coverLetterNotFound, setCoverLetterNotFound] = React.useState<boolean>(false);
  const [atsScore, setAtsScore] = React.useState<number | null>(null);
  const [atsScoreLoading, setAtsScoreLoading] = React.useState<boolean>(false);
  const hasAttemptedATSCalculation = React.useRef(false);
  const [mongoDBUserId, setMongoDBUserId] = React.useState<string | null>(null);
  const [showCVSelector, setShowCVSelector] = React.useState(false);
  const [isRetryingDocuments, setIsRetryingDocuments] = React.useState(false);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // New state for Step 5 functionality
  const [showMoveToAppliedModal, setShowMoveToAppliedModal] = React.useState(false);
  const [fileSizeEstimates, setFileSizeEstimates] = React.useState<{
    cv: number;
    coverLetter: number;
    jobDescription: number;
    total: number;
  } | undefined>(undefined);
  const [isCompletingJourney, setIsCompletingJourney] = React.useState(false);
  const [showUndoToast, setShowUndoToast] = React.useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = React.useState(false);
  // Celebration modal removed - using toast notifications instead
  const [showDownloadDropdown, setShowDownloadDropdown] = React.useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  
  // Job details state
  const [jobDetails, setJobDetails] = React.useState<any | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = React.useState(false);
  
  // Helper function to resolve MongoDB user ID
  const resolveMongoDBUserId = async (sessionUserId: string): Promise<string | null> => {
    try {
      // Check if it's already a MongoDB ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(sessionUserId)) {
        console.log('🔍 JourneyTimelineCard - Using MongoDB ObjectId:', sessionUserId);
        return sessionUserId;
      } else {
        // Try to get MongoDB user ID from server
        console.log('🔍 JourneyTimelineCard - Firebase UID detected, fetching MongoDB user ID...');
        const userResponse = await fetch('/api/user/current');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.user && userData.user.id) {
            console.log('✅ JourneyTimelineCard - Found MongoDB user ID:', userData.user.id);
            return userData.user.id;
          }
        }
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error resolving user ID:', error);
    }
    return null;
  };
  
  // Always use database values to ensure consistency with actual data
  const liveProgress = {
    currentStep: journey.currentStep,
    totalSteps: journey.totalSteps,
    atsScore: journey.atsScore,
    cvId: journey.cvId, // Always use database cvId
    coverLetterId: journey.coverLetterId, // Always use database coverLetterId
    status: journey.status
  };

  // Load user documents
  React.useEffect(() => {
    const loadUserDocuments = async () => {
      try {
        // Use the same userId resolution logic as master CV onboarding
        const sessionUserId = session?.user?.id;
        if (!sessionUserId) {
          console.log('❌ JourneyTimelineCard - No session user ID available');
          return;
        }

        const userId = await resolveMongoDBUserId(sessionUserId);
        if (!userId) {
          console.log('❌ JourneyTimelineCard - Could not resolve MongoDB user ID');
          return;
        }

        // Store the resolved MongoDB user ID for use in other functions
        setMongoDBUserId(userId);
        console.log('🔍 JourneyTimelineCard - Loading CVs with MongoDB userId:', userId);
        console.log('🔍 JourneyTimelineCard - UserId details:', {
          userId,
          userIdType: typeof userId,
          userIdLength: userId?.length,
          isMongoDbFormat: /^[0-9a-fA-F]{24}$/.test(userId)
        });
        
        // Load CVs
        const cvsResponse = await fetch(`/api/cvs?userId=${userId}`);
        if (cvsResponse.ok) {
          const cvsData = await cvsResponse.json();
          if (cvsData.success) {
            const cvs = cvsData.data.cvs || [];
            
            // Debug: Check for duplicate CV IDs
            const cvIds = cvs.map((cv: any) => cv.id);
            const duplicateCvIds = cvIds.filter((id: any, index: number) => cvIds.indexOf(id) !== index);
            if (duplicateCvIds.length > 0) {
              console.warn('⚠️ JourneyTimelineCard - Found duplicate CV IDs:', duplicateCvIds);
            }
            
            // CVs loaded successfully
            setUserCVs(cvs);
            
            // Filter freestanding CVs (not master CVs and not linked to other journeys)
            const freestanding = cvs.filter((cv: CV) => {
              const isMasterAtRoot = cv.isMaster === true;
              const isMasterInMetadata = cv.metadata?.isMaster === true;
              const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
              const isMasterCV = isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
              
              return !isMasterCV && (cv.journeyId === null || cv.journeyId === undefined);
            });
            // Only show toast for debugging info
            if (freestanding.length > 0) {
              console.log('🔍 JourneyTimelineCard - Freestanding CVs available:', freestanding.length);
            }
            
            setFreestandingCVs(freestanding);
            
            // Find and set the linked CV
            if (journey.cvId) {
              console.log('🔍 JourneyTimelineCard - Looking for CV with ID:', journey.cvId);
              console.log('🔍 JourneyTimelineCard - Available CVs:', cvs.map((cv: CV) => ({ id: cv.id, title: cv.title })));
              const linked = cvs.find((cv: CV) => String(cv.id) === String(journey.cvId));
              console.log('🔍 JourneyTimelineCard - Found linked CV:', linked);
              if (linked) {
                console.log('✅ JourneyTimelineCard - CV found with title:', linked.title);
                setLinkedCV(linked);
                setCvNotFound(false);
              } else {
                console.log('❌ JourneyTimelineCard - CV not found in user CVs list');
                setLinkedCV(null);
                setCvNotFound(true);
                toast.error('Linked CV has been deleted. Please create a new CV or link an existing one.');
              }
            }
          }
        }

        // Load Cover Letters
        const coverLettersResponse = await fetch(`/api/cover-letters?userId=${userId}`);
        if (coverLettersResponse.ok) {
          const coverLettersData = await coverLettersResponse.json();
          if (coverLettersData.success) {
            const coverLetters = coverLettersData.data.coverLetters || [];
            
            // Debug: Check for duplicate IDs
            const ids = coverLetters.map((cl: any) => cl.id);
            const duplicateIds = ids.filter((id: any, index: number) => ids.indexOf(id) !== index);
            if (duplicateIds.length > 0) {
              console.warn('⚠️ JourneyTimelineCard - Found duplicate cover letter IDs:', duplicateIds);
            }
            
            setUserCoverLetters(coverLetters);
            
            // Find and set the linked cover letter
            if (journey.coverLetterId) {
              const linked = coverLetters.find((cl: CoverLetter) => String(cl.id) === String(journey.coverLetterId));
              if (linked) {
                setLinkedCoverLetter(linked);
                setCoverLetterNotFound(false);
              } else {
                setLinkedCoverLetter(null);
                setCoverLetterNotFound(true);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading user documents:', error);
      }
    };

    if (session?.user?.id) {
      loadUserDocuments();
    }
  }, [session?.user?.id, journey.cvId, journey.coverLetterId]); // Include journey IDs to reload when they change

  // Separate effect to update linked CV when journey.cvId changes
  React.useEffect(() => {
    if (journey.cvId && userCVs.length > 0) {
      const linked = userCVs.find((cv: CV) => String(cv.id) === String(journey.cvId));
      if (linked) {
        setLinkedCV(linked);
        setCvNotFound(false);
      } else {
        setLinkedCV(null);
        setCvNotFound(true);
        toast.error('Linked CV has been deleted. Please create a new CV or link an existing one.');
      }
    } else if (journey.cvId && userCVs.length === 0) {
      // If we have a CV ID but no CVs loaded yet, try to fetch the specific CV
      const fetchSpecificCV = async () => {
        try {
          const response = await fetch(`/api/cvs/${journey.cvId}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.cv) {
              console.log('✅ JourneyTimelineCard - Fetched specific CV:', result.data.cv.title);
              setLinkedCV(result.data.cv);
              setCvNotFound(false);
            }
          } else if (response.status === 404) {
            console.log('❌ JourneyTimelineCard - CV not found (404)');
            setLinkedCV(null);
            setCvNotFound(true);
            toast.error('Linked CV has been deleted. Please create a new CV or link an existing one.');
          }
        } catch (error) {
          console.error('❌ JourneyTimelineCard - Error fetching specific CV:', error);
          setLinkedCV(null);
          setCvNotFound(true);
          toast.error('Linked CV has been deleted. Please create a new CV or link an existing one.');
        }
      };
      fetchSpecificCV();
    } else {
      setLinkedCV(null);
      setCvNotFound(false);
    }
  }, [journey.cvId, userCVs]);

  // Separate effect to update linked cover letter when journey.coverLetterId changes
  React.useEffect(() => {
    if (journey.coverLetterId && userCoverLetters.length > 0) {
      const linked = userCoverLetters.find((cl: CoverLetter) => String(cl.id) === String(journey.coverLetterId));
      if (linked) {
        setLinkedCoverLetter(linked);
        setCoverLetterNotFound(false);
      } else {
        setLinkedCoverLetter(null);
        setCoverLetterNotFound(true);
      }
    } else {
      setLinkedCoverLetter(null);
      setCoverLetterNotFound(false);
    }
  }, [journey.coverLetterId, userCoverLetters]);

  // Initialize ATS score from journey data or auto-fetch if needed
  React.useEffect(() => {
    // First, check if journey already has an ATS score
    if (journey.atsScore !== undefined && journey.atsScore !== null) {
      console.log('🔍 JourneyTimelineCard - Using existing ATS score from journey:', journey.atsScore);
      setAtsScore(journey.atsScore);
      setAtsScoreLoading(false); // Ensure loading state is false when using cached score
      hasAttemptedATSCalculation.current = true; // Mark as attempted
      return;
    }
    
    // Only auto-fetch if we don't have a score, CV is linked, haven't attempted before, and not currently loading
    if (journey.cvId && journey.jobId && atsScore === null && !atsScoreLoading && !hasAttemptedATSCalculation.current) {
      console.log('🔍 JourneyTimelineCard - Auto-fetching ATS score for linked CV');
      hasAttemptedATSCalculation.current = true; // Mark as attempted
      fetchATSScore(journey.cvId, journey.jobId);
    }
  }, [journey.cvId, journey.jobId, journey.atsScore, atsScore, atsScoreLoading]);

  // Polling for document creation status
  React.useEffect(() => {
    // Poll if status is processing_documents OR if we're missing cvId or coverLetterId but status isn't failed
    const needsPolling = journey.status === 'processing_documents' || 
                         (journey.status !== 'creation_failed' && (!journey.cvId || !journey.coverLetterId));
    
    if (needsPolling) {
      console.log('🔄 JourneyTimelineCard - Starting polling for journey:', journey.id, {
        status: journey.status,
        hasCvId: !!journey.cvId,
        hasCoverLetterId: !!journey.coverLetterId
      });
      
      // Poll every 2 seconds
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/application-journey?jobId=${journey.jobId}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.journeys) {
              const updatedJourney = result.data.journeys.find((j: any) => j.id === journey.id);
              if (updatedJourney) {
                // Check if documents were created (by checking cvId and coverLetterId)
                const hasBothDocuments = updatedJourney.cvId && updatedJourney.coverLetterId;
                const statusChanged = updatedJourney.status !== 'processing_documents';
                
                if (hasBothDocuments || statusChanged) {
                  console.log('✅ JourneyTimelineCard - Documents created or status changed:', {
                    status: updatedJourney.status,
                    cvId: updatedJourney.cvId,
                    coverLetterId: updatedJourney.coverLetterId
                  });
                  
                  // Stop polling and refresh
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  
                  // Trigger refresh to update the component
                  if (onRefresh) {
                    console.log('🔄 JourneyTimelineCard - Triggering refresh');
                    onRefresh();
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ JourneyTimelineCard - Error polling journey status:', error);
        }
      }, 2000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    } else {
      // Stop polling if not needed
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [journey.status, journey.id, journey.jobId, journey.cvId, journey.coverLetterId, onRefresh]);

  // Handle retry for document creation
  const handleRetryDocuments = async () => {
    if (isRetryingDocuments) return;
    
    setIsRetryingDocuments(true);
    try {
      const response = await fetch('/api/journey-documents/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId: journey.id })
      });
      
      if (response.ok) {
        toast.success('Document creation retry triggered');
        // Start polling again
        if (onRefresh) {
          setTimeout(() => onRefresh(), 1000);
        }
      } else {
        toast.error('Failed to retry document creation');
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error retrying documents:', error);
      toast.error('Failed to retry document creation');
    } finally {
      setIsRetryingDocuments(false);
    }
  };

  // Enhanced step status calculation using live progress data
  const getStepStatus = (stepId: number) => {
    switch (stepId) {
      case 1: // Job Added
        return journey.jobTitle && journey.company ? 'completed' : 'pending';
      
      case 2: // CV Created/Linked
        return (liveProgress.cvId && !cvNotFound) ? 'completed' : 
               (liveProgress.currentStep >= 2 ? 'active' : 'pending');
      
      case 3: // ATS Score Checked
        // Only completed if we have a valid ATS score (not -1) AND CV is linked and available
        return (atsScore !== null && atsScore !== -1 && liveProgress.cvId && !cvNotFound) ? 'completed' :
               (liveProgress.currentStep >= 3 && liveProgress.cvId && !cvNotFound ? 'active' : 'pending');
      
      case 4: // Cover Letter Created
        // Only completed if cover letter is explicitly linked to this journey and available
        return (liveProgress.coverLetterId && liveProgress.coverLetterId.trim() !== '' && !coverLetterNotFound) ? 'completed' :
               (liveProgress.currentStep >= 4 && atsScore !== null && atsScore !== -1 && !cvNotFound ? 'active' : 'pending');
      
      case 5: // Download/Apply
        // Only completed if journey status is explicitly 'completed'
        return liveProgress.status === 'completed' ? 'completed' :
               (liveProgress.currentStep >= 5 && liveProgress.coverLetterId ? 'active' : 'pending');
      
      default:
        return 'pending';
    }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when the card is focused or visible
      if (event.target instanceof HTMLElement && event.target.closest('.journey-card')) {
        if (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          if (liveProgress.status === 'completed') {
            handleDownloadFiles('all');
          } else if (getStepStatus(5) === 'active') {
            handleDownloadFiles('all');
          }
        } else if (event.key.toLowerCase() === 'a' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          if (getStepStatus(5) === 'active' && liveProgress.status !== 'completed') {
            handleGetFileSizeEstimates();
            setShowMoveToAppliedModal(true);
          }
        } else if (event.key === '?' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [liveProgress.status, getStepStatus(5)]);

  // Close download dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDownloadDropdown && event.target instanceof HTMLElement) {
        const dropdown = event.target.closest('.download-dropdown');
        const button = event.target.closest('.download-button');
        if (!dropdown && !button) {
          setShowDownloadDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadDropdown]);

  const handleCreateCV = () => {
    updateCurrentJobId(journey.jobId);
    router.push(`/studio?journeyId=${journey.id}&jobId=${journey.jobId}&mode=cv-tailoring`);
  };

  const handleSelectCV = async (cvId: string) => {
    try {
      console.log('🔍 JourneyTimelineCard - Selecting CV:', cvId, 'for journey:', journey.id);
      
      const selectedCV = userCVs.find(cv => String(cv.id) === String(cvId));
      setLinkedCV(selectedCV || null);
      
      // Update journey with selected CV
      const response = await fetch(`/api/application-journey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: mongoDBUserId,
          jobId: journey.jobId,
          cvId: cvId,
          currentStep: 3 // Move to next step after CV selection
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ JourneyTimelineCard - CV linked successfully:', result);
        
        // Update local journey state
        journey.cvId = cvId;
        journey.currentStep = 3;
        
        // Update journey context
        updateCVId(cvId);
        updateCurrentStep(3);
        updateJourneyStatus('cv-created');
        
        // Update parent component's journey state directly instead of full refresh
        // This prevents modal from closing and page from refreshing
        if (onUpdateJourney) {
          onUpdateJourney(journey.id, {
            cvId: cvId,
            currentStep: 3
          });
          console.log('✅ CV linked successfully, parent journey updated');
        } else if (onRefresh) {
          // Fallback to full refresh if targeted update not available
          onRefresh();
        }
        
        // Show success toast based on result
        if (result.message === 'Journey updated successfully') {
          toast.success('CV linked to journey successfully!');
        } else if (result.message === 'Journey already exists with current data') {
          toast.success('CV already linked to this journey');
        } else {
          toast.success('CV linked to journey successfully!');
        }
        
        // Reset ATS score and trigger calculation for the newly linked CV
        setAtsScore(null);
        hasAttemptedATSCalculation.current = false;
        
        if (journey.jobId) {
          console.log('🔍 JourneyTimelineCard - Triggering ATS calculation for newly linked CV');
          fetchATSScore(cvId, journey.jobId);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ JourneyTimelineCard - Failed to link CV:', errorData);
        const errorMessage = errorData.error || errorData.message || 'Failed to link CV. Please try again.';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error linking CV:', error);
      toast.error('Failed to link CV. Please try again.');
    }
    
    setExpandedStep(null);
  };

  const handleDuplicateMasterCV = async () => {
    try {
      console.log('🔍 JourneyTimelineCard - Duplicating master CV for CV change');
      
      // Check if we have a valid user ID
      if (!mongoDBUserId) {
        console.error('❌ JourneyTimelineCard - No MongoDB user ID available');
        toast.error('User session not found. Please refresh the page and try again.');
        return;
      }
      
      // Find the master CV
      const masterCV = userCVs.find(cv => 
        (() => {
          const isMasterAtRoot = cv.isMaster === true;
          const isMasterInMetadata = cv.metadata?.isMaster === true;
          const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
          return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
        })()
      );
      if (!masterCV) {
        toast.error('No master CV found. Please create a master CV first.');
        return;
      }
      
      // Validate CV ID format
      if (!masterCV.id || typeof masterCV.id !== 'string') {
        console.error('❌ JourneyTimelineCard - Invalid CV ID:', masterCV.id);
        toast.error('Invalid CV ID. Please try again.');
        return;
      }

      // Generate smart CV name
      const generateCVName = (jobTitle: string, company: string) => {
        const cleanJobTitle = jobTitle?.trim() || 'Job';
        const cleanCompany = company?.trim() || 'Company';
        const baseCVName = `${cleanCompany}_${cleanJobTitle} | CV`;
        
        let finalName = baseCVName;
        let counter = 1;
        
        while (userCVs.some(cv => cv.title === finalName)) {
          finalName = `${baseCVName} ${counter}`;
          counter++;
        }
        
        return finalName;
      };

      const smartCVName = generateCVName(journey.jobTitle, journey.company);

      // Call the duplicate CV API with journey info for proper linking
      const requestData = {
        sourceCvId: masterCV.id,
        userId: mongoDBUserId,
        customTitle: smartCVName,
        journeyId: journey.id, // Pass journey ID for proper linking
        jobId: journey.jobId
      };

      const response = await fetch('/api/cvs/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ JourneyTimelineCard - Master CV duplicated successfully:', result);
        
        if (result.data?.cv?.id || result.cvId) {
          const duplicatedCVId = result.data?.cv?.id || result.cvId;
          const duplicatedCVTitle = result.data?.cv?.title || result.title || smartCVName;
          
          // Update journey via API to ensure database persistence
          const journeyUpdateResponse = await fetch(`/api/application-journey`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: mongoDBUserId,
              jobId: journey.jobId,
              cvId: duplicatedCVId,
              currentStep: 3,
              status: 'in-progress'
            })
          });
          
          if (journeyUpdateResponse.ok) {
            console.log('✅ JourneyTimelineCard - Journey updated with duplicated CV');
            
            // Update local state
            setLinkedCV({
              id: duplicatedCVId,
              title: duplicatedCVTitle,
              status: 'draft',
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            setCvNotFound(false);
            
            // Update journey object
            journey.cvId = duplicatedCVId;
            journey.currentStep = 3;
            
            // Update contexts
            updateCVId(duplicatedCVId);
            updateCurrentStep(3);
            updateJourneyStatus('cv-created');
            
            // Update parent component
            if (onUpdateJourney) {
              onUpdateJourney(journey.id, {
                cvId: duplicatedCVId,
                currentStep: 3
              });
            }
            
            setShowCVSelector(false);
            toast.success('Master CV duplicated and linked to journey!');
            
            // Reset and fetch ATS score with a small delay to ensure CV data is fully processed
            setAtsScore(null);
            hasAttemptedATSCalculation.current = false;
            
            if (journey.jobId) {
              // Add a small delay to ensure the duplicated CV data is fully processed
              setTimeout(() => {
                console.log('🔍 JourneyTimelineCard - Triggering ATS calculation after CV duplication delay');
                fetchATSScore(duplicatedCVId, journey.jobId);
              }, 1000); // 1 second delay
            }
            
            // Refresh to ensure UI is in sync
            if (onRefresh) {
              onRefresh();
            }
          } else {
            console.error('❌ JourneyTimelineCard - Failed to update journey with duplicated CV');
            toast.error('CV duplicated but failed to link to journey. Please refresh and try again.');
          }
        } else {
          toast.error('CV duplicated but ID is missing. Please refresh and try again.');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || errorData.message || 'Failed to duplicate master CV';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error duplicating master CV:', error);
      toast.error('Failed to duplicate master CV. Please try again.');
    }
  };

  const handleDuplicateRegularCV = async (cvId: string) => {
    try {
      console.log('🔍 JourneyTimelineCard - Duplicating regular CV:', cvId);
      
      // Check if we have a valid user ID
      if (!mongoDBUserId) {
        console.error('❌ JourneyTimelineCard - No MongoDB user ID available');
        toast.error('User session not found. Please refresh the page and try again.');
        return;
      }
      
      // Find the selected CV
      const selectedCV = userCVs.find(cv => String(cv.id) === String(cvId));
      if (!selectedCV) {
        toast.error('Selected CV not found. Please try again.');
        return;
      }
      
      console.log('🔍 JourneyTimelineCard - Selected CV found:', {
        id: selectedCV.id,
        title: selectedCV.title
      });
      
      // Generate smart CV name: "Company_JobTitle | CV" with number suffix if needed
      const generateCVName = (jobTitle: string, company: string) => {
        // Clean the inputs
        const cleanJobTitle = jobTitle?.trim() || 'Job';
        const cleanCompany = company?.trim() || 'Company';
        
        // Create the base name in new format: "Company_JobTitle | CV"
        const baseCVName = `${cleanCompany}_${cleanJobTitle} | CV`;
        
        // Check if this name already exists and find the next available number
        let finalName = baseCVName;
        let counter = 1;
        
        // Check against all existing CVs to avoid conflicts
        while (userCVs.some(cv => cv.title === finalName)) {
          finalName = `${baseCVName} ${counter}`;
          counter++;
        }
        
        return finalName;
      };

      const smartCVName = generateCVName(journey.jobTitle, journey.company);
      console.log('🔍 JourneyTimelineCard - Generated CV name:', smartCVName);

      // Prepare the request data
      const requestData = {
        sourceCvId: selectedCV.id,
        userId: mongoDBUserId,
        customTitle: smartCVName,
        jobId: journey.jobId,
        journeyId: journey.id
      };
      
      console.log('🔍 JourneyTimelineCard - Making duplication request with data:', requestData);

      // Call the duplicate CV API
      const response = await fetch('/api/cvs/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      console.log('🔍 JourneyTimelineCard - Duplication response status:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ JourneyTimelineCard - CV duplicated successfully:', result);
        
        if (result.data?.cv?.id || result.cvId) {
          const duplicatedCVId = result.data?.cv?.id || result.cvId;
          const duplicatedCVTitle = result.data?.cv?.title || result.title || smartCVName;
          
          // Update journey via API to ensure database persistence
          const journeyUpdateResponse = await fetch(`/api/application-journey`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: mongoDBUserId,
              jobId: journey.jobId,
              cvId: duplicatedCVId,
              currentStep: 3,
              status: 'in-progress'
            })
          });
          
          if (journeyUpdateResponse.ok) {
            console.log('✅ JourneyTimelineCard - Journey updated with duplicated CV');
            
            // Update local state
            setLinkedCV({
              id: duplicatedCVId,
              title: duplicatedCVTitle,
              status: 'draft',
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            setCvNotFound(false);
            
            // Update journey object
            journey.cvId = duplicatedCVId;
            journey.currentStep = 3;
            
            // Update contexts
            updateCVId(duplicatedCVId);
            updateCurrentStep(3);
            updateJourneyStatus('cv-created');
            
            // Update parent component
            if (onUpdateJourney) {
              onUpdateJourney(journey.id, {
                cvId: duplicatedCVId,
                currentStep: 3
              });
            }
            
            toast.success('CV duplicated and linked to journey!');
            
            // Reset and fetch ATS score with a small delay to ensure CV data is fully processed
            setAtsScore(null);
            hasAttemptedATSCalculation.current = false;
            
            if (journey.jobId) {
              // Add a small delay to ensure the duplicated CV data is fully processed
              setTimeout(() => {
                console.log('🔍 JourneyTimelineCard - Triggering ATS calculation after CV duplication delay');
                fetchATSScore(duplicatedCVId, journey.jobId);
              }, 1000); // 1 second delay
            }
            
            // Refresh to ensure UI is in sync
            if (onRefresh) {
              onRefresh();
            }
          } else {
            console.error('❌ JourneyTimelineCard - Failed to update journey with duplicated CV');
            toast.error('CV duplicated but failed to link to journey. Please refresh and try again.');
          }
        } else {
          toast.error('CV duplicated but ID is missing. Please refresh and try again.');
        }
      } else {
        let errorData: any = {};
        try {
          errorData = await response.json();
          console.error('❌ JourneyTimelineCard - Error data:', errorData);
        } catch (parseError) {
          console.error('❌ JourneyTimelineCard - Failed to parse error response:', parseError);
          errorData = { error: 'Failed to parse server response' };
        }
        
        const errorMessage = errorData.error || errorData.message || `Failed to duplicate CV (${response.status}). Please try again.`;
        console.error('❌ JourneyTimelineCard - Duplication failed:', {
          status: response.status,
          errorData,
          errorMessage
        });
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error duplicating regular CV:', error);
      toast.error('Failed to duplicate CV. Please try again.');
    }
  };

  const fetchATSScore = async (cvId: string, jobId: string) => {
    if (!cvId || !jobId || atsScoreLoading) {
      console.log('🚫 JourneyTimelineCard - ATS calculation skipped:', {
        hasCvId: !!cvId,
        hasJobId: !!jobId,
        isLoading: atsScoreLoading
      });
      return;
    }
    
    setAtsScoreLoading(true);
    try {
      console.log('🔍 JourneyTimelineCard - Fetching ATS score for CV:', cvId, 'Job:', jobId);
      
      // Use real ATS API endpoint
      const response = await fetch('/api/ats/calculate-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvId,
          jobId,
          userId: mongoDBUserId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ JourneyTimelineCard - ATS score fetched:', result);
      
      if (result.success && result.data) {
        const score = result.data.score || result.data.atsScore;
        if (score !== undefined && score !== null) {
          setAtsScore(score);
          
          // Update journey context
          updateAtsScore(score);
          
          // Update journey with ATS score using PUT endpoint with journey.id
          const journeyResponse = await fetch(`/api/application-journey/${journey.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              atsScore: score,
              metadata: {
                updatedAt: new Date(),
                lastAccessedAt: new Date()
              }
            })
          });
          
          if (journeyResponse.ok) {
            console.log('✅ JourneyTimelineCard - ATS score saved to journey');
          } else {
            console.error('❌ JourneyTimelineCard - Failed to save ATS score to journey');
          }
          
          // Update parent component with new score
          if (onUpdateJourney) {
            onUpdateJourney(journey.id, {
              atsScore: score,
              currentStep: score >= 80 ? 4 : 3
            });
          }
          
          // Update journey status based on score
          if (score >= 80) {
            updateJourneyStatus('ats-checked');
            updateCurrentStep(4);
            toast.success(`ATS score calculated: ${score}% - Great match!`);
          } else {
            updateJourneyStatus('ats-checked');
            updateCurrentStep(3);
            toast.success(`ATS score calculated: ${score}% - Consider optimizing for better match`);
          }
        } else {
          throw new Error('Invalid score in response');
        }
      } else {
        throw new Error(result.error || 'Failed to calculate ATS score');
      }
      
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error fetching ATS score:', error);
      setAtsScore(-1); // Use -1 to indicate failed calculation
      toast.error('Network error during ATS calculation. Please check your connection.');
    } finally {
      setAtsScoreLoading(false);
    }
  };

  const handleATSCheck = async () => {
    if (!journey.cvId) return;
    
    setIsRunningATSCheck(true);
    try {
      console.log('🔍 JourneyTimelineCard - Running ATS check for CV:', journey.cvId, 'Job:', journey.jobId);
      
      // Use real ATS API endpoint
      const response = await fetch('/api/ats/calculate-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvId: journey.cvId,
          jobId: journey.jobId,
          userId: mongoDBUserId
        })
      });
      
      console.log('🔍 JourneyTimelineCard - ATS check response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ JourneyTimelineCard - ATS check result:', result);
        
        if (result.success && result.data) {
          const score = result.data.score || result.data.atsScore;
          if (score !== undefined && score !== null) {
            // Update local state first
            setAtsScore(score);
            
            // Update journey context
            updateAtsScore(score);
            
            // Update journey with ATS score using PUT endpoint with journey.id
            const journeyResponse = await fetch(`/api/application-journey/${journey.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                atsScore: score,
                metadata: {
                  updatedAt: new Date(),
                  lastAccessedAt: new Date()
                }
              })
            });
            
            if (journeyResponse.ok) {
              console.log('✅ JourneyTimelineCard - ATS score saved to journey');
            } else {
              console.error('❌ JourneyTimelineCard - Failed to save ATS score to journey');
            }
            
            // Update parent component with new score
            if (onUpdateJourney) {
              onUpdateJourney(journey.id, {
                atsScore: score,
                currentStep: score >= 80 ? 4 : 3
              });
            }
            
            // Update journey status based on score
            if (score >= 80) {
              updateJourneyStatus('ats-checked');
              updateCurrentStep(4);
              toast.success(`ATS score calculated: ${score}% - Great match!`);
            } else {
              updateJourneyStatus('ats-checked');
              updateCurrentStep(3);
              toast.success(`ATS score calculated: ${score}% - Consider optimizing for better match`);
            }
          }
        } else {
          console.error('❌ JourneyTimelineCard - ATS check failed:', result);
          toast.error('ATS calculation failed. Please try again.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ JourneyTimelineCard - ATS check API error:', response.status, errorData);
        toast.error('ATS calculation failed. Please try again later.');
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error running ATS check:', error);
      toast.error('Network error during ATS calculation. Please check your connection.');
    } finally {
      setIsRunningATSCheck(false);
    }
  };


  const handleCreateCoverLetter = () => {
    router.push(`/studio?journeyId=${journey.id}&jobId=${journey.jobId}&mode=cover-letter-tailoring`);
  };

  const handleSelectCoverLetter = (coverLetterId: string) => {
    updateCoverLetterId(coverLetterId);
    const selectedCoverLetter = userCoverLetters.find(cl => String(cl.id) === String(coverLetterId));
    setLinkedCoverLetter(selectedCoverLetter || null);
    fetch(`/api/application-journey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: mongoDBUserId,
        jobId: journey.jobId,
        coverLetterId: coverLetterId
      })
    });
    setExpandedStep(null);
  };

  const handleChangeCV = async (newCvId: string) => {
    try {
      console.log('🔄 JourneyTimelineCard - Changing CV from', journey.cvId, 'to', newCvId);
      
      // Update the journey with the new CV ID using POST method
      // The application-journey POST endpoint handles updates to existing journeys
      const response = await fetch('/api/application-journey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: journey.jobId,
          cvId: newCvId,
          userId: mongoDBUserId,
          currentStep: 2, // CV step completed
          status: 'in-progress'
        })
      });

      if (response.ok) {
        // Update local state
        const selectedCV = userCVs.find(cv => String(cv.id) === String(newCvId));
        if (selectedCV) {
          setLinkedCV(selectedCV);
          setCvNotFound(false);
        }
        
        // Update the journey object
        onUpdateJourney?.(journey.id, {
          cvId: newCvId
        });
        
        toast.success('CV updated successfully');
        console.log('✅ CV changed successfully');
      } else {
        console.error('❌ Failed to update CV');
        toast.error('Failed to update CV');
      }
    } catch (error) {
      console.error('❌ Error changing CV:', error);
      toast.error('Error changing CV');
    }
  };

  // Step 5 handler functions
  const handleMoveToApplied = async () => {
    try {
      setIsCompletingJourney(true);
      
      const response = await fetch(`/api/application-journey/${journey.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Journey completed! Job moved to Applied stage');
        
        // Journey completed - showing toast notification
        
        // Show undo toast for 5 seconds
        setShowUndoToast(true);
        setTimeout(() => setShowUndoToast(false), 5000);
        
        // Refresh the journey data
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to complete journey');
      }
    } catch (error) {
      console.error('Error completing journey:', error);
      toast.error('Error completing journey');
    } finally {
      setIsCompletingJourney(false);
      setShowMoveToAppliedModal(false);
    }
  };

  const handleDownloadFiles = async (downloadType: 'all' | 'cv' | 'coverLetter' | 'jobDescription' = 'all') => {
    try {
      const url = `/api/application-journey/${journey.id}/download?type=${downloadType}`;
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${journey.jobTitle} - Application Files${downloadType === 'all' ? '.zip' : '.pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Files downloaded successfully');
    } catch (error) {
      console.error('Error downloading files:', error);
      toast.error('Error downloading files');
    }
  };

  const handleUndoComplete = async () => {
    try {
      const response = await fetch(`/api/application-journey/${journey.id}/undo-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        toast.success('Journey completion undone');
        setShowUndoToast(false);
        
        // Refresh the journey data
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to undo completion');
      }
    } catch (error) {
      console.error('Error undoing completion:', error);
      toast.error('Error undoing completion');
    }
  };

  const handleGetFileSizeEstimates = async () => {
    try {
      const response = await fetch(`/api/application-journey/${journey.id}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ journeyId: journey.id })
      });

      if (response.ok) {
        const result = await response.json();
        setFileSizeEstimates(result.fileSizeEstimates);
      }
    } catch (error) {
      console.error('Error getting file size estimates:', error);
    }
  };

  const handleRefreshATS = async () => {
    try {
      setAtsScoreLoading(true);
      
      const response = await fetch(`/api/application-journey/${journey.id}/refresh-ats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAtsScore(result.atsScore);
        toast.success(`ATS score updated: ${result.atsScore}%`);
        
        // Refresh the journey data to get updated history
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to refresh ATS score');
      }
    } catch (error) {
      console.error('Error refreshing ATS score:', error);
      toast.error('Error refreshing ATS score');
    } finally {
      setAtsScoreLoading(false);
    }
  };
  
  const steps = [
    { id: 1, label: 'Add Job', icon: Briefcase, color: 'blue' },
    { id: 2, label: 'Create CV', icon: FileText, color: 'green' },
    { id: 3, label: 'ATS Score', icon: CheckCircle, color: 'purple' },
    { id: 4, label: 'Cover Letter', icon: FileText, color: 'orange' },
    { id: 5, label: 'Download', icon: Download, color: 'lime' }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatRelativeTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
  };


  const handleDuplicateCoverLetter = async (coverLetterId?: string) => {
    try {
      console.log('🔍 JourneyTimelineCard - Duplicating cover letter:', coverLetterId);
      
      // Check if we have a valid user ID
      if (!mongoDBUserId) {
        console.error('❌ JourneyTimelineCard - No MongoDB user ID available');
        toast.error('User session not found. Please refresh the page and try again.');
        return;
      }
      
      // Ensure we have a default cover letter to duplicate from
      const defaultCoverLetterId = await defaultCoverLetterService.ensureDefaultCoverLetter(mongoDBUserId);
      
      // Find the selected cover letter (use provided ID or default)
      const targetCoverLetterId = coverLetterId || defaultCoverLetterId;
      const selectedCoverLetter = userCoverLetters.find(cl => String(cl.id) === String(targetCoverLetterId));
      
      if (!selectedCoverLetter) {
        // If we can't find the cover letter in our list, we might need to refresh the list
        console.log('🔄 JourneyTimelineCard - Cover letter not in current list, refreshing...');
        // For now, proceed with the ID we have
        console.log('🔍 JourneyTimelineCard - Using cover letter ID:', targetCoverLetterId);
      }
      
      console.log('🔍 JourneyTimelineCard - Using cover letter ID:', targetCoverLetterId);
      
      // Generate cover letter name: "Company_JobTitle | Cover_Letter" with number suffix if needed
      const generateCoverLetterName = (jobTitle: string, company: string) => {
        const cleanJobTitle = jobTitle?.trim() || 'Job';
        const cleanCompany = company?.trim() || 'Company';
        
        // Create the base name in new format: "Company_JobTitle | Cover_Letter"
        const baseCoverLetterName = `${cleanCompany}_${cleanJobTitle} | Cover_Letter`;
        
        // Check if this name already exists and find the next available number
        let finalName = baseCoverLetterName;
        let counter = 1;
        
        // Check against all existing cover letters to avoid conflicts
        while (userCoverLetters.some(cl => cl.title === finalName)) {
          finalName = `${baseCoverLetterName} ${counter}`;
          counter++;
        }
        
        return finalName;
      };

      const smartCoverLetterName = generateCoverLetterName(journey.jobTitle, journey.company);
      console.log('🔍 JourneyTimelineCard - Generated cover letter name:', smartCoverLetterName);

      // Prepare the request data
      const requestData = {
        sourceCoverLetterId: targetCoverLetterId,
        userId: mongoDBUserId,
        customTitle: smartCoverLetterName,
        jobId: journey.jobId,
        journeyId: journey.id
      };
      
      console.log('🔍 JourneyTimelineCard - Making duplication request with data:', requestData);

      // Call the duplicate cover letter API
      const response = await fetch('/api/cover-letters/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      console.log('🔍 JourneyTimelineCard - Duplication response status:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ JourneyTimelineCard - Cover letter duplicated successfully:', result);
        
        if (result.success && result.data?.coverLetter?.id) {
          const duplicatedCoverLetterId = result.data.coverLetter.id;
          const duplicatedCoverLetterTitle = result.data.coverLetter.title || smartCoverLetterName;
          
          // Update journey via API to ensure database persistence
          const journeyUpdateResponse = await fetch(`/api/application-journey`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: mongoDBUserId,
              jobId: journey.jobId,
              coverLetterId: duplicatedCoverLetterId,
              currentStep: 5,
              status: 'in-progress'
            })
          });
          
          if (journeyUpdateResponse.ok) {
            console.log('✅ JourneyTimelineCard - Journey updated with duplicated cover letter');
            
            // Update local state
            setLinkedCoverLetter({
              id: duplicatedCoverLetterId,
              title: duplicatedCoverLetterTitle,
              status: 'draft',
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString()
            });
            setCoverLetterNotFound(false);
            
            // Update journey object
            journey.coverLetterId = duplicatedCoverLetterId;
            journey.currentStep = 5;
            
            // Update contexts
            updateCoverLetterId(duplicatedCoverLetterId);
            updateCurrentStep(5);
            updateJourneyStatus('cover-letter-created');
            
            // Update parent component
            if (onUpdateJourney) {
              onUpdateJourney(journey.id, {
                coverLetterId: duplicatedCoverLetterId,
                currentStep: 5
              });
            }
            
            toast.success('Cover letter duplicated and linked to journey!');
            
            // Refresh to ensure UI is in sync
            if (onRefresh) {
              onRefresh();
            }
          } else {
            console.error('❌ JourneyTimelineCard - Failed to update journey with duplicated cover letter');
            toast.error('Cover letter duplicated but failed to link to journey. Please refresh and try again.');
          }
        } else {
          toast.error('Cover letter duplicated but ID is missing. Please refresh and try again.');
        }
      } else {
        let errorData: any = {};
        try {
          errorData = await response.json();
          console.error('❌ JourneyTimelineCard - Error data:', errorData);
        } catch (parseError) {
          console.error('❌ JourneyTimelineCard - Failed to parse error response:', parseError);
          errorData = { error: 'Failed to parse server response' };
        }
        
        const errorMessage = errorData.error || errorData.message || `Failed to duplicate cover letter (${response.status}). Please try again.`;
        console.error('❌ JourneyTimelineCard - Duplication failed:', {
          status: response.status,
          errorData,
          errorMessage
        });
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error duplicating cover letter:', error);
      toast.error('Failed to duplicate cover letter. Please try again.');
    }
  };

  const fetchJobDetails = async (jobId: string) => {
    if (jobDetails || jobDetailsLoading) return; // Don't fetch if already loaded or loading
    
    setJobDetailsLoading(true);
    try {
      console.log('🔍 JourneyTimelineCard - Fetching job details for:', jobId);
      
      const response = await fetch(`/api/jobs/${jobId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Handle both nested structure (result.data.job) and flat structure (result.job)
          const jobData = result.data?.job || result.job || result.data;
          if (jobData) {
            setJobDetails(jobData); // Store the job directly, not nested
            console.log('✅ JourneyTimelineCard - Job details loaded:', jobData);
          } else {
            console.warn('⚠️ JourneyTimelineCard - Job details response missing job data:', result);
          }
        } else {
          console.warn('⚠️ JourneyTimelineCard - Job details response missing data:', result);
        }
      } else {
          console.warn('⚠️ JourneyTimelineCard - Failed to fetch job details:', response.status);
        }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error fetching job details:', error);
    } finally {
      setJobDetailsLoading(false);
    }
  };

  return (
    <motion.div
      className={`journey-card ${
        liveProgress.status === 'completed' 
          ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-500/50' 
          : 'bg-[#24320f] border border-lime-500/30'
      } rounded-xl overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-300 group`}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Compact Banner Bar */}
      <div className="px-6 py-4">
        {/* Mobile View - Inline Layout */}
        <div className="block md:hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Building className={`h-4 w-4 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                <h3 className={`text-sm font-medium truncate ${
                  liveProgress.status === 'completed' 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-white'
                }`}>
                  {journey.jobTitle}
                </h3>
              </div>
              <div className={`flex items-center gap-2 text-xs ${
                liveProgress.status === 'completed' 
                  ? 'text-gray-600 dark:text-white/60' 
                  : 'text-white/60'
              }`}>
                <span>{journey.company}</span>
                {liveProgress.status !== 'completed' && (() => {
                  const estimatedTime = JourneyAnalyticsService.calculateEstimatedTimeToCompletion(
                    journey as any,
                    []
                  );
                  const formattedTime = JourneyAnalyticsService.formatEstimatedTime(estimatedTime);
                  
                  return (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-white/40" />
                        <span>Est. {formattedTime} remaining</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          
          {/* Mobile: Steps Status, ATS Score, and Details */}
          <div className="flex items-center justify-between">
            {/* Steps Status */}
            <div className="flex items-center gap-1">
              {steps.map((step) => {
                const stepId = step.id;
                const status = getStepStatus(stepId);
                
                return (
                  <motion.button
                    key={stepId}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                      status === 'completed' 
                        ? 'bg-lime-500 text-white' 
                        : status === 'active'
                        ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    animate={status === 'active' ? {
                      scale: [1, 1.1, 1],
                      opacity: [0.8, 1, 0.8]
                    } : {}}
                    transition={status === 'active' ? {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : {}}
                    title={step.label}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : status === 'active' ? (
                      <motion.div
                        className={`w-2 h-2 rounded-full ${
                          liveProgress.status === 'completed' 
                            ? 'bg-blue-300' 
                            : 'bg-lime-300'
                        }`}
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 1, 0.7]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    ) : (
                      stepId
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* ATS Score and Details */}
            <div className="flex items-center gap-3">
              {/* ATS Score */}
              {atsScore !== null && atsScore !== -1 && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  liveProgress.status === 'completed' 
                    ? 'bg-blue-200 dark:bg-white/10' 
                    : 'bg-white/10'
                }`}>
                  <Target className={`h-3 w-3 ${
                    liveProgress.status === 'completed' 
                      ? 'text-blue-700 dark:text-white/60' 
                      : 'text-white/60'
                  }`} />
                  <span className={`text-xs font-medium ${
                    liveProgress.status === 'completed' 
                      ? 'text-blue-900 dark:text-white/80' 
                      : 'text-white/80'
                  }`}>
                    {atsScore}%
                  </span>
                </div>
              )}
              
              {/* Details Dropdown */}
              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-1 rounded transition-colors ${
                  liveProgress.status === 'completed' 
                    ? 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-blue-200 dark:hover:bg-white/10' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Desktop View - Original Layout */}
        <div className="hidden md:flex items-center justify-between">
          {/* Left: Job Info and Progress */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building className={`h-5 w-5 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
              <div>
                <h3 className={`text-sm font-medium ${
                  liveProgress.status === 'completed' 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-white'
                }`}>
                  {journey.jobTitle}
                </h3>
                <p className={`text-xs ${
                  liveProgress.status === 'completed' 
                    ? 'text-gray-600 dark:text-white/60' 
                    : 'text-white/60'
                }`}>{journey.company}</p>
                {journey.lastWorkedOn && (
                  <p className={`text-xs ${
                    liveProgress.status === 'completed' 
                      ? 'text-gray-500 dark:text-white/40' 
                      : 'text-white/40'
                  }`}>
                    Last worked {formatRelativeTime(journey.lastWorkedOn)}
                  </p>
                )}
                {liveProgress.status !== 'completed' && (() => {
                  // Calculate estimated time to completion
                  const estimatedTime = JourneyAnalyticsService.calculateEstimatedTimeToCompletion(
                    journey as any,
                    [] // We'll need to pass all journeys from parent component
                  );
                  const formattedTime = JourneyAnalyticsService.formatEstimatedTime(estimatedTime);
                  
                  return (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-white/40" />
                      <p className="text-xs text-white/40">
                        Est. {formattedTime} remaining
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Progress Steps - Clickable */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((stepId, index) => {
                const status = getStepStatus(stepId);
                return (
                  <motion.button
                    key={`step-${stepId}-${index}`}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      status === 'completed' 
                        ? liveProgress.status === 'completed' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-lime-500 text-white'
                        : status === 'active' 
                        ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30' 
                        : 'bg-gray-300 dark:bg-white/20 text-gray-500 dark:text-white hover:bg-gray-400 dark:hover:bg-white/30'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    animate={status === 'active' ? {
                      scale: [1, 1.1, 1],
                      opacity: [0.8, 1, 0.8]
                    } : {}}
                    transition={status === 'active' ? {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : {}}
                    title={steps.find(s => s.id === stepId)?.label}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : status === 'active' ? (
                      <motion.div
                        className={`w-3 h-3 rounded-full ${
                          liveProgress.status === 'completed' 
                            ? 'bg-blue-300' 
                            : 'bg-lime-300'
                        }`}
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 1, 0.7]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    ) : (
                      stepId
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Next Step Info */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              liveProgress.status === 'completed' 
                ? 'bg-blue-100 dark:bg-blue-500/20' 
                : 'bg-lime-100 dark:bg-lime-500/20'
            }`}>
              {steps.find(s => s.id === liveProgress.currentStep + 1)?.icon && 
                React.createElement(steps.find(s => s.id === liveProgress.currentStep + 1)!.icon, { className: "h-4 w-4" })
              }
              <span className={`text-xs font-medium ${
                liveProgress.status === 'completed' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-lime-600 dark:text-lime-400'
              }`}>
                {steps.find(s => s.id === liveProgress.currentStep + 1)?.label}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Eye className="h-3 w-3" />
              {isExpanded ? 'Hide' : 'Details'}
            </motion.button>
            
            {liveProgress.status === 'completed' ? (
              <motion.button
                onClick={() => handleDownloadFiles('all')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Download Files"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </motion.button>
            ) : (
              <motion.button
                onClick={() => onResume(journey)}
                className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-xl transition-colors text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Resume Journey"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Resume</span>
              </motion.button>
            )}
            
            {/* Delete Button */}
            <motion.button
              onClick={() => onShowDeleteConfirm(journey.id)}
              className={`p-2 rounded transition-colors ${
                liveProgress.status === 'completed' 
                  ? 'text-gray-600 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20' 
                  : 'text-white/60 hover:text-red-400 hover:bg-red-500/20'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Delete Journey"
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Expanded Details with Step Cards */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="journey-expanded-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`border-t ${
              liveProgress.status === 'completed' 
                ? 'border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/10' 
                : 'border-lime-500/20 bg-[#24320f]'
            } overflow-hidden`}
          >
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Step 1: Job */}
                <div className={`p-3 rounded-lg border ${
                  liveProgress.status === 'completed' 
                    ? 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-500/30 text-gray-900 dark:text-white' 
                    : 'bg-[#24320f] border-white/20 text-white'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-blue-400" />
                    <span className={`text-xs font-medium ${
                      liveProgress.status === 'completed' 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-white'
                    }`}>Job</span>
                    {getStepStatus(1) === 'completed' && (
                      <CheckCircle className={`h-3 w-3 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    )}
                    <motion.button
                      onClick={() => {
                        setExpandedStep(expandedStep === 1 ? null : 1);
                        if (expandedStep !== 1 && journey.jobId) {
                          fetchJobDetails(journey.jobId);
                        }
                      }}
                      className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="View job details"
                    >
                      <ChevronDown className={`h-3 w-3 text-gray-600 dark:text-white/60 transition-transform ${expandedStep === 1 ? 'rotate-180' : ''}`} />
                    </motion.button>
                  </div>
                  <div>
                    <p className="text-xs text-gray-900 dark:text-white font-medium truncate">{journey.jobTitle}</p>
                    <p className="text-xs text-gray-600 dark:text-white/60 truncate">{journey.company}</p>
                  </div>
                </div>

                {/* Step 2: CV */}
                <div className={`p-3 rounded-lg border ${
                  liveProgress.status === 'completed' 
                    ? 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-500/30 text-gray-900 dark:text-white' 
                    : 'bg-[#24320f] border-white/20 text-white'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-green-400" />
                    <span className={`text-xs font-medium ${
                      liveProgress.status === 'completed' 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-white'
                    }`}>CV</span>
                    {getStepStatus(2) === 'completed' && (
                      <CheckCircle className={`h-3 w-3 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    )}
                  </div>
                  {/* Handle document creation status */}
                  {journey.cvId ? (
                    <div>
                      {cvNotFound ? (
                        <div className="space-y-1">
                          <p className="text-xs text-red-400 font-medium truncate">
                            CV {journey.cvId.slice(-6)} - Not Found
                          </p>
                          <p className="text-xs text-red-300">
                            This CV has been deleted or is unavailable
                          </p>
                          <motion.button
                            onClick={handleCreateCV}
                            className="w-full px-2 py-1 bg-lime-500 hover:bg-lime-600 text-black text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Plus className="h-3 w-3" />
                            Create New CV
                          </motion.button>
                          {freestandingCVs.length > 0 ? (
                            <motion.button
                              onClick={() => setExpandedStep(expandedStep === 2 ? null : 2)}
                              className="w-full px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors flex items-center gap-1 justify-center"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Copy className="h-3 w-3" />
                              Link Existing CV
                            </motion.button>
                          ) : (
                            userCVs.some(cv => 
                              (() => {
                                const isMasterAtRoot = cv.isMaster === true;
                                const isMasterInMetadata = cv.metadata?.isMaster === true;
                                const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
                                return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
                              })()
                            ) && (
                              <motion.button
                                onClick={handleDuplicateMasterCV}
                                className="w-full px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs rounded transition-colors flex items-center gap-1 justify-center border border-blue-500/30"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Copy className="h-3 w-3" />
                                Duplicate Master CV
                              </motion.button>
                            )
                          )}
                          {/* Debug info */}
                          {process.env.NODE_ENV === 'development' && (
                            <div className="text-xs text-gray-400">
                              Debug: freestandingCVs.length = {freestandingCVs.length}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-white font-medium truncate">
                            {linkedCV?.title || `CV ${journey.cvId.slice(-6)}`}
                          </p>
                          <p className="text-xs text-white/60">
                            {linkedCV ? 'Ready for editing' : 'Document linked'}
                          </p>
                          {liveProgress.status !== 'completed' && (
                            <div className="flex items-center gap-2 mt-1">
                              <motion.button
                                onClick={() => {
                                  // Determine mode: cv-tailoring if journey step <= 2, otherwise cv-edit
                                  const mode = journey.currentStep <= 2 ? 'cv-tailoring' : 'cv-edit';
                                  router.push(`/studio?journeyId=${journey.id}&cvId=${journey.cvId}&jobId=${journey.jobId}&type=cv&mode=${mode}`);
                                }}
                                className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Edit
                              </motion.button>
                              <motion.button
                                onClick={() => setShowCVSelector(!showCVSelector)}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Change
                              </motion.button>
                            </div>
                          )}
                          {liveProgress.status === 'completed' && (
                            <div className="flex items-center gap-2 mt-1">
                              <motion.button
                                onClick={() => {
                                  // Determine mode: cv-tailoring if journey step <= 2, otherwise cv-edit
                                  const mode = journey.currentStep <= 2 ? 'cv-tailoring' : 'cv-edit';
                                  router.push(`/studio?journeyId=${journey.id}&cvId=${journey.cvId}&jobId=${journey.jobId}&type=cv&mode=${mode}`);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Edit
                              </motion.button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : journey.status === 'processing_documents' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                        <p className="text-xs text-blue-400 font-medium">Creating CV...</p>
                      </div>
                      <p className="text-xs text-white/60">Please wait while we create your CV</p>
                    </div>
                  ) : journey.status === 'creation_failed' ? (
                    <div className="space-y-1">
                      <p className="text-xs text-red-400 font-medium">Failed to create CV</p>
                      <p className="text-xs text-red-300">Document creation encountered an error</p>
                      <motion.button
                        onClick={handleRetryDocuments}
                        disabled={isRetryingDocuments}
                        className="w-full px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <RefreshCw className={`h-3 w-3 ${isRetryingDocuments ? 'animate-spin' : ''}`} />
                        {isRetryingDocuments ? 'Retrying...' : 'Retry'}
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-white/60">No CV linked</p>
                      <motion.button
                        onClick={handleCreateCV}
                        className="w-full px-2 py-1 bg-lime-500 hover:bg-lime-600 text-black text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="h-3 w-3" />
                        Create CV
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Step 3: ATS Analysis */}
                <div className={`p-3 rounded-lg border ${
                  liveProgress.status === 'completed' 
                    ? 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-500/30 text-gray-900 dark:text-white' 
                    : 'bg-[#24320f] border-white/20 text-white'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-medium text-white">ATS Analysis</span>
                    {getStepStatus(3) === 'completed' && (
                      <CheckCircle className={`h-3 w-3 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    )}
                  </div>
                  
                  {/* Comprehensive ATS Analyzer */}
                  <div className="max-h-96 overflow-y-auto">
                    {/* ATS Score Display */}
                    <div className="space-y-3">
                      {atsScoreLoading ? (
                        <div className="flex items-center gap-2 text-gray-400">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Calculating ATS score...</span>
                        </div>
                      ) : atsScore !== null && atsScore !== undefined ? (
                        <div className="space-y-2">
                          {/* Score Display */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                atsScore >= 80 ? 'bg-green-500 text-white' :
                                atsScore >= 60 ? 'bg-yellow-500 text-white' :
                                'bg-red-500 text-white'
                              }`}>
                                {atsScore}%
                              </div>
                              <div>
                                <p className="text-xs font-medium text-white">
                                  {atsScore >= 80 ? 'Excellent Match' :
                                   atsScore >= 60 ? 'Good Match' :
                                   'Needs Improvement'}
                                </p>
                                <p className="text-xs text-gray-400">ATS Compatibility Score</p>
                              </div>
                            </div>
                            
                            {/* Refresh Button */}
                            <motion.button
                              onClick={() => fetchATSScore(journey.cvId!, journey.jobId)}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              disabled={atsScoreLoading}
                            >
                              <RefreshCw className={`h-3 w-3 ${atsScoreLoading ? 'animate-spin' : ''}`} />
                            </motion.button>
                          </div>
                          
                          {/* Improve Score Button */}
                          <motion.button
                            onClick={() => {
                              // Open Studio with CV type and ATS mode
                              const studioUrl = `/studio?type=cv&mode=ats&cvId=${journey.cvId}&jobId=${journey.jobId}`;
                              window.open(studioUrl, '_blank');
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs rounded-lg transition-colors border border-purple-500/30"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Improve Score
                          </motion.button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-400">
                            No ATS score calculated yet
                          </div>
                          <motion.button
                            onClick={() => fetchATSScore(journey.cvId!, journey.jobId)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs rounded-lg transition-colors border border-purple-500/30"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={atsScoreLoading}
                          >
                            <RefreshCw className={`h-3 w-3 ${atsScoreLoading ? 'animate-spin' : ''}`} />
                            Calculate ATS Score
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 4: Cover Letter */}
                <div className={`p-3 rounded-lg border ${
                  liveProgress.status === 'completed' 
                    ? 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-500/30 text-gray-900 dark:text-white' 
                    : 'bg-[#24320f] border-white/20 text-white'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-orange-400" />
                    <span className="text-xs font-medium text-white">Cover Letter</span>
                    {getStepStatus(4) === 'completed' && (
                      <CheckCircle className={`h-3 w-3 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    )}
                  </div>
                  {/* Handle document creation status */}
                  {journey.coverLetterId ? (
                    <div>
                      {coverLetterNotFound ? (
                        <div>
                          <p className="text-xs text-red-400 font-medium truncate">
                            Cover Letter {journey.coverLetterId.slice(-6)} - Not Found
                          </p>
                          <p className="text-xs text-red-300">
                            This cover letter has been deleted or is unavailable
                          </p>
                          <motion.button
                            onClick={handleCreateCoverLetter}
                            className="mt-1 text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Plus className="h-3 w-3" />
                            Create New Cover Letter
                          </motion.button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-white font-medium truncate">
                            {linkedCoverLetter?.title || `Cover Letter ${journey.coverLetterId.slice(-6)}`}
                          </p>
                          <p className="text-xs text-white/60">
                            {linkedCoverLetter ? 'Ready for download' : 'Document linked'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <motion.button
                              onClick={() => router.push(`/studio?journeyId=${journey.id}&jobId=${journey.jobId}&coverLetterId=${journey.coverLetterId}&type=cover_letter&mode=cover-letter-edit`)}
                              className={`text-xs flex items-center gap-1 ${
                                liveProgress.status === 'completed' 
                                  ? 'text-blue-400 hover:text-blue-300' 
                                  : 'text-lime-400 hover:text-lime-300'
                              }`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Edit
                            </motion.button>
                            <motion.button
                              onClick={() => setExpandedStep(expandedStep === 4 ? null : 4)}
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Change
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : journey.status === 'processing_documents' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                        <p className="text-xs text-blue-400 font-medium">Creating Cover Letter...</p>
                      </div>
                      <p className="text-xs text-white/60">Please wait while we create your cover letter</p>
                    </div>
                  ) : journey.status === 'creation_failed' ? (
                    <div className="space-y-1">
                      <p className="text-xs text-red-400 font-medium">Failed to create Cover Letter</p>
                      <p className="text-xs text-red-300">Document creation encountered an error</p>
                      <motion.button
                        onClick={handleRetryDocuments}
                        disabled={isRetryingDocuments}
                        className="w-full px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <RefreshCw className={`h-3 w-3 ${isRetryingDocuments ? 'animate-spin' : ''}`} />
                        {isRetryingDocuments ? 'Retrying...' : 'Retry'}
                      </motion.button>
                    </div>
                  ) : cvNotFound ? (
                    <div>
                      <p className="text-xs text-red-400 font-medium">CV Not Available</p>
                      <p className="text-xs text-red-300">Cannot create cover letter</p>
                    </div>
                  ) : atsScore !== null ? (
                    <div className="space-y-1">
                      {/* Single Duplicate Cover Letter button */}
                      <motion.button
                        onClick={() => setExpandedStep(expandedStep === 4 ? null : 4)}
                        className="w-full px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Copy className="h-3 w-3" />
                        Duplicate Cover Letter
                      </motion.button>
                    </div>
                  ) : (
                    <p className="text-xs text-white/60">ATS check required first</p>
                  )}
                </div>

                {/* Step 5: Ready to Apply */}
                <div className={`p-3 rounded-lg border ${
                  liveProgress.status === 'completed' 
                    ? 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-500/30 text-gray-900 dark:text-white' 
                    : 'bg-[#24320f] border-white/20 text-white'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Download className={`h-4 w-4 ${getStepStatus(5) === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    <span className="text-xs font-medium text-white">Ready</span>
                    {getStepStatus(5) === 'completed' && (
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                    )}
                  </div>
                  
                  {getStepStatus(5) === 'completed' ? (
                    <div>
                      <p className="text-xs text-white font-medium">Complete</p>
                    </div>
                  ) : (
                    <div>
                      {/* Check conditions for Step 5 */}
                      {(() => {
                        const hasCV = journey.cvId && !cvNotFound;
                        const hasCoverLetter = journey.coverLetterId && !coverLetterNotFound;
                        const hasGoodATS = atsScore !== null && atsScore >= 70;
                        const canMoveToApplied = hasCV && hasCoverLetter && hasGoodATS;
                        
                        return canMoveToApplied ? (
                          /* Action buttons for Step 5 - All conditions met */
                          <div className="flex gap-2 w-full">
                            <motion.button
                              onClick={() => {
                                handleGetFileSizeEstimates();
                                setShowMoveToAppliedModal(true);
                              }}
                              className="flex-1 px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1 justify-center min-w-0"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              disabled={isCompletingJourney}
                            >
                              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">Move to Applied</span>
                            </motion.button>
                        
                          <motion.button
                          onClick={() => setDownloadModalOpen(true)}
                          className="flex-1 px-2 py-2 bg-lime-600 hover:bg-lime-700 text-white text-xs rounded transition-colors flex items-center gap-1 justify-center min-w-0"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Download className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Download</span>
                          </motion.button>
                      </div>
                        ) : (
                          /* Conditions not met - Show message */
                          <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-orange-400" />
                            <div className="flex-1">
                              <p className="text-xs text-orange-400 font-medium">
                                {!hasCV || !hasCoverLetter 
                                  ? "Please link CV and Cover Letter"
                                  : "ATS score below 70%. Please improve your CV to continue."}
                              </p>
                              <p className="text-xs text-orange-300 mt-1">
                                {!hasCV ? "Complete Step 2 to add a CV" :
                                 !hasCoverLetter ? "Complete Step 4 to add a Cover Letter" :
                                 "Improve your CV content to increase ATS score"}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Application Timeline for Completed Journeys */}
        {isExpanded && liveProgress.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-medium text-white">Application Timeline</h4>
            </div>
            
            <div className="space-y-3">
              {/* Journey Started */}
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <div className="flex-1">
                  <p className="text-xs text-white font-medium">Journey Started</p>
                  <p className="text-xs text-white/60">{formatDate(journey.createdAt)}</p>
                </div>
              </div>
              
              {/* CV Created/Linked */}
              {journey.cvId && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">CV Created</p>
                    <p className="text-xs text-white/60">
                      {linkedCV ? linkedCV.title : 'CV linked to journey'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* ATS Score Calculated */}
              {journey.atsScore && journey.atsScore !== -1 && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">ATS Score: {journey.atsScore}%</p>
                    <p className="text-xs text-white/60">
                      {journey.atsScoreHistory && journey.atsScoreHistory.length > 0 
                        ? `First calculated ${formatDate(journey.atsScoreHistory[0].calculatedAt)}`
                        : 'Score calculated'
                      }
                    </p>
                  </div>
                </div>
              )}
              
              {/* Cover Letter Created */}
              {journey.coverLetterId && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Cover Letter Created</p>
                    <p className="text-xs text-white/60">
                      {linkedCoverLetter ? linkedCoverLetter.title : 'Cover letter linked to journey'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Journey Completed */}
              {journey.completedAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Journey Completed</p>
                    <p className="text-xs text-white/60">
                      Completed {formatDate(journey.completedAt)}
                      {journey.journeyDuration && (
                        <span className="ml-2">
                          (Duration: {Math.round(journey.journeyDuration / 60)} hours)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Files Downloaded */}
              {journey.downloadHistory && journey.downloadHistory.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-lime-400 rounded-full" />
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">
                      Files Downloaded ({journey.downloadHistory.length} times)
                    </p>
                    <p className="text-xs text-white/60">
                      Last download: {formatDate(journey.downloadHistory[journey.downloadHistory.length - 1].downloadedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Inline Job Details */}
        {expandedStep === 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-black/20 border border-blue-500/20 rounded-lg"
          >
            {jobDetailsLoading ? (
              <div className="flex items-center gap-2 p-2">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                  <Settings className="h-4 w-4 text-blue-400" />
                </motion.div>
                <p className="text-xs text-white/60">Loading job details...</p>
              </div>
            ) : jobDetails ? (
              <div className="space-y-3">
                {/* Extract job data from nested structure */}
                {(() => {
                  // jobDetails is now the job object directly, not nested
                  const job = jobDetails?.job || jobDetails;
                  return (
                    <>
                      {/* Quick Stats Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                        {job?.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-blue-400" />
                            <span>{job.location}</span>
                          </div>
                        )}
                        {job?.salary && (job.salary.min || job.salary.max) && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-green-400" />
                            <span>
                              {job.salary.min && job.salary.max 
                                ? `$${job.salary.min.toLocaleString()}-$${job.salary.max.toLocaleString()}`
                                : job.salary.min 
                                  ? `$${job.salary.min.toLocaleString()}+`
                                  : `Up to $${job.salary.max.toLocaleString()}`
                              }
                              {job.salary.period && `/${job.salary.period === 'yearly' ? 'yr' : job.salary.period === 'monthly' ? 'mo' : 'hr'}`}
                            </span>
                          </div>
                        )}
                        {job?.priority && (
                          <div className="flex items-center gap-1">
                            <Star className={`h-3 w-3 ${
                              job.priority === 'high' ? 'text-red-400' : 
                              job.priority === 'medium' ? 'text-yellow-400' : 'text-gray-400'
                            }`} />
                            <span className="capitalize">{job.priority}</span>
                          </div>
                        )}
                        {job?.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-purple-400" />
                            <span>{new Date(job.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                        {job?.status && job.status !== 'created' && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-400" />
                            <span className="capitalize">{job.status}</span>
                          </div>
                        )}
                      </div>

                      {/* Job Description (Compact) */}
                      {(job?.jobDescription || job?.description) ? (
                        <div className="relative">
                          <div className="text-xs text-white/60 mb-1">Description:</div>
                          <div className="relative max-h-16 overflow-hidden">
                            <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">
                              {job.jobDescription || job.description}
                            </p>
                            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                          </div>
                        </div>
                      ) : null}

                      {/* Secondary Info Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                        {job?.type && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3 text-orange-400" />
                            <span className="capitalize">{job.type}</span>
                          </div>
                        )}
                        {job?.remote !== undefined && (
                          <div className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 text-cyan-400" />
                            <span>{job.remote ? 'Remote' : 'On-site'}</span>
                          </div>
                        )}
                        {job.requirements && job.requirements.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-white/60">
                              {job.requirements.length} requirements
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {job.jobUrl && (
                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(job.jobUrl);
                              toast.success('Job URL copied to clipboard');
                            }}
                            className="text-xs text-green-400 hover:text-green-300 underline transition-colors"
                          >
                            Copy URL
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="p-2 text-center text-white/60 text-xs">
                Unable to load job details
              </div>
            )}
          </motion.div>
        )}

        {/* Inline CV Selector */}
        {expandedStep === 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-gray-300 dark:bg-white/5 border border-gray-400 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Select CV</h4>
              <button
                onClick={() => setExpandedStep(null)}
                className="text-white/60 hover:text-gray-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {/* Duplicate Master CV Option */}
              {(() => {
                const hasMasterCV = userCVs.some(cv => 
                  (() => {
                    const isMasterAtRoot = cv.isMaster === true;
                    const isMasterInMetadata = cv.metadata?.isMaster === true;
                    const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
                    return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
                  })()
                );
                console.log('🔍 JourneyTimelineCard - Master CV check:', {
                  totalCVs: userCVs.length,
                  hasMasterCV,
                  cvDetails: userCVs.map(cv => ({
                    id: cv.id,
                    title: cv.title,
                    isMaster: cv.isMaster
                  }))
                });
                return hasMasterCV;
              })() && (
                <motion.button
                  onClick={handleDuplicateMasterCV}
                  className="w-full p-2 text-left bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Copy className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-xs font-medium text-blue-400">Duplicate Master CV</p>
                      <p className="text-xs text-blue-300">Create a copy of your master CV</p>
                    </div>
                  </div>
                </motion.button>
              )}
              
              {/* Existing CVs */}
              {freestandingCVs.length > 0 ? (
                freestandingCVs.map((cv, index) => (
                  <motion.button
                    key={`cv-${cv.id || 'empty'}-${index}`}
                    onClick={() => handleDuplicateRegularCV(cv.id)}
                    className="w-full p-2 text-left bg-gray-600 dark:bg-white/5 hover:bg-gray-700 dark:hover:bg-white/10 rounded border border-gray-700 dark:border-white/10 transition-colors text-white"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-white truncate">
                          {cv.title} {(() => {
                            const isMasterAtRoot = cv.isMaster === true;
                            const isMasterInMetadata = cv.metadata?.isMaster === true;
                            const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
                            return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
                          })() && <span className="text-yellow-400">(Master)</span>}
                        </p>
                        <p className="text-xs text-white/60">
                          {cv.status} • {new Date(cv.lastModified).toLocaleDateString()} • Click to duplicate
                        </p>
                      </div>
                      {String(cv.id) === String(journey.cvId) && (
                        <CheckCircle className="h-4 w-4 text-lime-400" />
                      )}
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="p-3 text-center text-white/60 text-xs">
                  No freestanding CVs available. Create a new CV or duplicate your master CV.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Inline Cover Letter Selector */}
        {expandedStep === 4 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-gray-300 dark:bg-white/5 border border-gray-400 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Select Cover Letter</h4>
              <button
                onClick={() => setExpandedStep(null)}
                className="text-white/60 hover:text-gray-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {/* Duplicate Default Template Option */}
              <motion.button
                onClick={() => handleDuplicateCoverLetter()}
                className="w-full p-2 text-left bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-xs font-medium text-blue-300">Duplicate Default Template</p>
                    <p className="text-xs text-blue-200">Start with a fresh template</p>
                  </div>
                </div>
              </motion.button>
              
              {/* Existing Cover Letters */}
              {userCoverLetters.map((cl, index) => (
                <motion.button
                  key={`cover-letter-${cl.id || 'empty'}-${index}`}
                  onClick={() => handleDuplicateCoverLetter(cl.id)}
                  className="w-full p-2 text-left bg-gray-600 dark:bg-white/5 hover:bg-gray-700 dark:hover:bg-white/10 rounded border border-gray-700 dark:border-white/10 transition-colors text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-white truncate">{cl.title}</p>
                      <p className="text-xs text-white/60">
                        {cl.status} • {new Date(cl.lastModified).toLocaleDateString()} • Click to duplicate
                      </p>
                    </div>
                    {String(cl.id) === String(journey.coverLetterId) && (
                      <CheckCircle className="h-4 w-4 text-lime-400" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Inline CV Change Selector */}
        {showCVSelector && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-gray-300 dark:bg-white/5 border border-gray-400 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Select a different CV</h4>
                <button
                  onClick={() => setShowCVSelector(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {userCVs.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* Duplicate Master CV Option */}
                  {(() => {
                    const hasMasterCV = userCVs.some(cv => 
                      (() => {
                        const isMasterAtRoot = cv.isMaster === true;
                        const isMasterInMetadata = cv.metadata?.isMaster === true;
                        const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
                        return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
                      })()
                    );
                    return hasMasterCV;
                  })() && (
                    <motion.button
                      onClick={handleDuplicateMasterCV}
                      className="w-full p-3 text-left bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Copy className="h-4 w-4 text-blue-400" />
                        <div>
                          <h5 className="font-medium text-blue-300">Duplicate Master CV</h5>
                          <p className="text-xs text-blue-200">Create a copy of your master CV for this journey</p>
                        </div>
                      </div>
                    </motion.button>
                  )}
                  
                  {/* Regular CVs (excluding master CVs) */}
                  {userCVs
                    .filter(cv => 
                      !(() => {
                        const isMasterAtRoot = cv.isMaster === true;
                        const isMasterInMetadata = cv.metadata?.isMaster === true;
                        const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
                        return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
                      })()
                    )
                    .map((cv, index) => (
                      <motion.button
                        key={`cv-selector-${cv.id || 'empty'}-${index}`}
                        onClick={() => {
                          handleChangeCV(cv.id);
                          setShowCVSelector(false);
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          String(cv.id) === String(journey.cvId)
                            ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <h5 className="font-medium text-gray-900 dark:text-white truncate">
                                {cv.title}
                              </h5>
                              {String(cv.id) === String(journey.cvId) && (
                                <span className="px-2 py-1 text-xs bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <span>Updated {new Date(cv.updatedAt).toLocaleDateString()}</span>
                              <span>Created {new Date(cv.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {String(cv.id) === String(journey.cvId) && (
                            <CheckCircle className="h-5 w-5 text-lime-500" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No CVs found</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Create a CV first to link it to this journey
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Move to Applied Modal */}
        <MoveToAppliedModal
          isOpen={showMoveToAppliedModal}
          onClose={() => setShowMoveToAppliedModal(false)}
          onConfirm={handleMoveToApplied}
          journey={{
            jobTitle: journey.jobTitle,
            company: journey.company,
            id: journey.id
          }}
          fileSizeEstimates={fileSizeEstimates}
          isLoading={isCompletingJourney}
        />

        {/* Undo Toast */}
        {showUndoToast && (
          <div className="fixed bottom-4 right-4 z-50">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Journey Completed!
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Undo available for 5 seconds
                  </p>
                </div>
                <button
                  onClick={handleUndoComplete}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                  Undo
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Keyboard Shortcuts Help Modal */}
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Keyboard Shortcuts
                </h3>
                <button
                  onClick={() => setShowKeyboardShortcuts(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Download Files</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">Ctrl+D</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Move to Applied</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">Ctrl+A</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Show Shortcuts</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">Ctrl+?</kbd>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Shortcuts only work when this journey card is focused
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Celebration Modal - Removed for simplified UX */}

      {/* Download Modal */}
      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        onDownload={async (documentType: DocumentType, format: FormatType) => {
          setIsDownloading(true);
          try {
            // Map modal document types to API types
            let apiType: 'all' | 'cv' | 'coverLetter' | 'jobDescription' = 'all';
            if (documentType === 'cv') {
              apiType = 'cv';
            } else if (documentType === 'coverLetter') {
              apiType = 'coverLetter';
            } else if (documentType === 'cvAndCoverLetter') {
              // For separate files, download both
              await handleDownloadFiles('cv');
              await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between downloads
              await handleDownloadFiles('coverLetter');
              setDownloadModalOpen(false);
              setIsDownloading(false);
              return;
            } else if (documentType === 'all') {
              apiType = 'all';
            }

            await handleDownloadFiles(apiType);
            setDownloadModalOpen(false);
          } catch (error) {
            console.error('Download error:', error);
          } finally {
            setIsDownloading(false);
          }
        }}
        hasCV={!!journey.cvId && !cvNotFound}
        hasCoverLetter={!!journey.coverLetterId && !coverLetterNotFound}
        isDownloading={isDownloading}
      />
    </motion.div>
  );
};

export default JourneyTimelineCard;
