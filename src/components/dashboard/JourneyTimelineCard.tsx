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
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useUserPlan } from '@/lib/hooks/useUserPlan';
import MoveToAppliedModal from '@/components/modals/MoveToAppliedModal';
import CelebrationModal from '@/components/modals/CelebrationModal';
import { JourneyAnalyticsService } from '@/lib/utils/journeyAnalytics';

interface Journey {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'in-progress' | 'completed';
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  atsScore?: number;
  cvId?: string;
  coverLetterId?: string;
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
  jobId?: string;
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
  const [isExpanded, setIsExpanded] = React.useState(true);
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
  
  // New state for Step 5 functionality
  const [showMoveToAppliedModal, setShowMoveToAppliedModal] = React.useState(false);
  const [fileSizeEstimates, setFileSizeEstimates] = React.useState<{
    cv: number;
    coverLetter: number;
    jobDescription: number;
    total: number;
  } | null>(null);
  const [isCompletingJourney, setIsCompletingJourney] = React.useState(false);
  const [showUndoToast, setShowUndoToast] = React.useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = React.useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = React.useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = React.useState(false);
  
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
              console.log('🔍 JourneyTimelineCard - Available CVs:', cvs.map(cv => ({ id: cv.id, title: cv.title })));
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
            
            // Check for duplicate IDs in cover letters
            const coverLetterIds = coverLetters.map(cl => cl.id);
            const duplicateCoverLetterIds = coverLetterIds.filter((id, index) => coverLetterIds.indexOf(id) !== index);
            if (duplicateCoverLetterIds.length > 0) {
              console.warn('⚠️ JourneyTimelineCard - Duplicate Cover Letter IDs found:', duplicateCoverLetterIds);
            }
            
            // Check for empty or invalid IDs in cover letters
            const emptyCoverLetterIds = coverLetterIds.filter(id => !id || id === '');
            if (emptyCoverLetterIds.length > 0) {
              console.warn('⚠️ JourneyTimelineCard - Empty Cover Letter IDs found:', emptyCoverLetterIds.length);
            }
            
            console.log('🔍 JourneyTimelineCard - Cover Letter ID details:', coverLetterIds.map((id, index) => ({
              index,
              id,
              type: typeof id,
              length: id?.length,
              isEmpty: !id || id === ''
            })));
            
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
    router.push(`/studio?journeyId=${journey.id}&mode=cv-onboarding`);
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
          toast.info('CV already linked to this journey');
        } else {
          toast.success('CV linked to journey successfully!');
        }
        
        // Trigger ATS score calculation for the newly linked CV
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
      
      console.log('🔍 JourneyTimelineCard - User ID validation:', {
        userId: mongoDBUserId,
        userIdType: typeof mongoDBUserId,
        userIdLength: mongoDBUserId?.length,
        isValidObjectId: /^[0-9a-fA-F]{24}$/.test(mongoDBUserId)
      });
      
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
      
      console.log('🔍 JourneyTimelineCard - Master CV found:', {
        id: masterCV.id,
        title: masterCV.title,
        isMaster: masterCV.isMaster,
        userId: mongoDBUserId,
        idType: typeof masterCV.id,
        idLength: masterCV.id?.length
      });
      
      // Validate CV ID format
      if (!masterCV.id || typeof masterCV.id !== 'string') {
        console.error('❌ JourneyTimelineCard - Invalid CV ID:', masterCV.id);
        toast.error('Invalid CV ID. Please try again.');
        return;
      }

      // Generate smart CV name: "name - jobtitle - company name" with number suffix if needed
      const generateCVName = (baseName: string, jobTitle: string, company: string) => {
        // Clean the inputs
        const cleanJobTitle = jobTitle?.trim() || 'Job';
        const cleanCompany = company?.trim() || 'Company';
        const cleanBaseName = baseName?.trim() || 'CV';
        
        // Create the base name
        const baseCVName = `${cleanBaseName} - ${cleanJobTitle} - ${cleanCompany}`;
        
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

      const smartCVName = generateCVName(masterCV.title, journey.jobTitle, journey.company);
      console.log('🔍 JourneyTimelineCard - Generated CV name:', smartCVName);

      // Prepare the request data
      const requestData = {
        sourceCvId: masterCV.id,
        userId: mongoDBUserId,
        customTitle: smartCVName, // Pass the custom title
        // Don't pass journeyId to create a freestanding CV
        // journeyId: null will be set by default in the API
      };
      
      console.log('🔍 JourneyTimelineCard - Making duplication request with data:', requestData);

      // Call the duplicate CV API to create a freestanding CV with smart naming
      const response = await fetch('/api/cvs/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      console.log('🔍 JourneyTimelineCard - Duplication response status:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ JourneyTimelineCard - Master CV duplicated successfully:', result);
        
        // If we have a duplicated CV, automatically link it to the journey
        if (result.data?.cv?.id) {
          const duplicatedCVId = result.data.cv.id;
          console.log('🔗 JourneyTimelineCard - Auto-linking duplicated CV to journey:', duplicatedCVId);
          
          // Link the duplicated CV to this journey
          await handleChangeCV(duplicatedCVId);
          
          // Close the selector
          setShowCVSelector(false);
          
          toast.success('Master CV duplicated and linked to this journey!');
        } else {
          // Fallback: refresh and show success message
          if (onRefresh) {
            onRefresh();
          }
          toast.success('Master CV duplicated successfully! You can now select it from the list.');
        }
      } else {
        console.error('❌ JourneyTimelineCard - Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ JourneyTimelineCard - Error data:', errorData);
        } catch (parseError) {
          console.error('❌ JourneyTimelineCard - Failed to parse error response:', parseError);
          errorData = { error: 'Failed to parse server response' };
        }
        
        const errorMessage = errorData.error || errorData.message || `Failed to duplicate master CV (${response.status}). Please try again.`;
        console.error('❌ JourneyTimelineCard - Duplication failed:', {
          status: response.status,
          errorData,
          errorMessage
        });
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error duplicating master CV:', error);
      toast.error('Failed to duplicate master CV. Please try again.');
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
      
      const response = await fetch('/api/ai/ats-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvId: cvId,
          jobId: jobId,
          userId: mongoDBUserId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ JourneyTimelineCard - ATS score fetched:', result);
        
        if (result.success && result.data) {
          const score = result.data.score || result.data.atsScore;
          if (score !== undefined) {
            setAtsScore(score);
            
            // Update journey with ATS score in database
            const journeyResponse = await fetch('/api/application-journey', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: mongoDBUserId,
                jobId: jobId,
                atsScore: score,
                currentStep: score >= 80 ? 4 : 3
              })
            });
            
            if (journeyResponse.ok) {
              console.log('✅ JourneyTimelineCard - ATS score saved to journey');
            }
            
            // Update journey context
            updateAtsScore(score);
            
            // Update journey status based on score
            if (score >= 80) {
              updateJourneyStatus('ats-checked');
              updateCurrentStep(4);
              toast.success(`ATS score calculated: ${score}% - Great match!`);
            } else {
              updateJourneyStatus('ats-needs-improvement');
              toast.info(`ATS score calculated: ${score}% - Consider optimizing for better match`);
            }
          }
        } else {
          console.error('❌ JourneyTimelineCard - ATS check failed:', result);
          toast.error('ATS calculation failed. Please try again.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ JourneyTimelineCard - Failed to fetch ATS score:', response.status, errorData);
        
        // Set a flag to prevent retrying when we get 400 errors (missing data)
        if (response.status === 400) {
          console.log('🚫 JourneyTimelineCard - ATS calculation failed due to missing data, not retrying');
          setAtsScore(-1); // Use -1 to indicate failed calculation
          
          // Show specific error message with actionable guidance
          const errorMessage = errorData.error || 'Missing CV or job data for ATS calculation';
          if (errorMessage.includes('CV data is missing')) {
            toast.error('Please add content to your CV before calculating ATS score. Go to CV Studio to add your experience, skills, and education.');
          } else if (errorMessage.includes('Job description is missing')) {
            toast.error('Job description is missing. Please ensure the job application has a description.');
          } else {
            toast.error(errorMessage);
          }
        } else if (response.status === 404) {
          setAtsScore(-1);
          toast.error('CV or job not found for ATS calculation');
        } else {
          setAtsScore(-1);
          toast.error('ATS calculation failed. Please try again later.');
        }
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
      
      const response = await fetch('/api/ai/ats-score', {
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
          if (score !== undefined) {
            updateAtsScore(score);
            
            // Update journey with ATS score
            const journeyResponse = await fetch(`/api/application-journey`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: mongoDBUserId,
                jobId: journey.jobId,
                atsScore: score
              })
            });
            
            if (journeyResponse.ok) {
              console.log('✅ JourneyTimelineCard - ATS score saved to journey');
            }
            
            // Show success toast
            if (score >= 80) {
              toast.success(`ATS score calculated: ${score}% - Great match!`);
            } else {
              toast.info(`ATS score calculated: ${score}% - Consider optimizing for better match`);
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
    router.push(`/studio?journeyId=${journey.id}&type=cover_letter&mode=journey`);
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
        onUpdateJourney?.({
          ...journey,
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
        
        // Show celebration modal
        setShowCelebrationModal(true);
        
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

  return (
    <motion.div
      className={`journey-card ${
        liveProgress.status === 'completed' 
          ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20' 
          : 'bg-gradient-to-r from-lime-500/10 to-lime-600/10 border border-lime-500/20'
      } rounded-xl overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-300 group`}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Compact Banner Bar */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Job Info and Progress */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building className={`h-5 w-5 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
              <div>
                <h3 className="text-sm font-medium text-white">
                  {journey.jobTitle}
                </h3>
                <p className="text-xs text-white/60">{journey.company}</p>
                {journey.lastWorkedOn && (
                  <p className="text-xs text-white/40">
                    Last worked {formatRelativeTime(journey.lastWorkedOn)}
                  </p>
                )}
                {liveProgress.status !== 'completed' && (() => {
                  // Calculate estimated time to completion
                  const estimatedTime = JourneyAnalyticsService.calculateEstimatedTimeToCompletion(
                    journey, 
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
                          : 'bg-lime-500 text-black'
                        : status === 'active' 
                        ? 'bg-lime-400 text-black' 
                        : 'bg-gray-700 dark:bg-white/20 text-white hover:bg-gray-600 dark:hover:bg-white/30'
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
                        className="w-3 h-3 bg-lime-300 rounded-full"
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

            {/* Current Step Info */}
            <div className="flex items-center gap-2 px-3 py-1 bg-lime-500/20 rounded-full">
              {steps.find(s => s.id === liveProgress.currentStep)?.icon && 
                React.createElement(steps.find(s => s.id === liveProgress.currentStep)!.icon, { className: "h-4 w-4" })
              }
              <span className="text-xs font-medium text-lime-400">
                {steps.find(s => s.id === liveProgress.currentStep)?.label}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-xs text-white/60 hover:text-white hover:bg-gray-600 dark:hover:bg-white/10 rounded transition-colors flex items-center gap-1"
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
                className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors text-sm"
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
              className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`border-t ${
              liveProgress.status === 'completed' 
                ? 'border-blue-500/20' 
                : 'border-lime-500/20'
            } bg-black/20 overflow-hidden`}
          >
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Step 1: Job */}
                <div className={`p-3 rounded-lg border ${
                  getStepStatus(1) === 'completed' 
                    ? liveProgress.status === 'completed'
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-lime-500/10 border-lime-500/30'
                    : 'bg-gray-300 dark:bg-white/5 border-gray-400 dark:border-white/10 text-gray-900 dark:text-white'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-medium text-white">Job</span>
                    {getStepStatus(1) === 'completed' && (
                      <CheckCircle className={`h-3 w-3 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-white font-medium truncate">{journey.jobTitle}</p>
                    <p className="text-xs text-white/60 truncate">{journey.company}</p>
                  </div>
                </div>

                {/* Step 2: CV */}
                <div className={`p-3 rounded-lg border ${
                  getStepStatus(2) === 'completed' 
                    ? liveProgress.status === 'completed'
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-lime-500/10 border-lime-500/30'
                    : 'bg-gray-300 dark:bg-white/5 border-gray-400 dark:border-white/10 text-gray-900 dark:text-white'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-medium text-white">CV</span>
                    {getStepStatus(2) === 'completed' && (
                      <CheckCircle className={`h-3 w-3 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    )}
                  </div>
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
                                onClick={() => router.push(`/studio?journeyId=${journey.id}&cvId=${journey.cvId}`)}
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
                                onClick={() => router.push(`/studio?journeyId=${journey.id}&cvId=${journey.cvId}`)}
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
                  ) : (
                    <div className="space-y-1">
                      <motion.button
                        onClick={handleCreateCV}
                        className="w-full px-2 py-1 bg-lime-500 hover:bg-lime-600 text-black text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center"
                      >
                        <Plus className="h-3 w-3" />
                        Create CV
                      </motion.button>
                      {freestandingCVs.length > 0 ? (
                        <motion.button
                          onClick={() => setExpandedStep(expandedStep === 2 ? null : 2)}
                          className="w-full px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors flex items-center gap-1 justify-center"
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
                  )}
                </div>

                {/* Step 3: ATS Score */}
                <div className={`p-3 rounded-lg border ${
                  getStepStatus(3) === 'completed' 
                    ? liveProgress.status === 'completed'
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-lime-500/10 border-lime-500/30'
                    : 'bg-gray-300 dark:bg-white/5 border-gray-400 dark:border-white/10 text-gray-900 dark:text-white'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-medium text-white">ATS Score</span>
                    {getStepStatus(3) === 'completed' && (
                      <CheckCircle className={`h-3 w-3 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    )}
                  </div>
                  {atsScoreLoading ? (
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Settings className="h-3 w-3 text-purple-400" />
                      </motion.div>
                      <p className="text-xs text-white/60">Calculating ATS...</p>
                    </div>
                  ) : atsScore !== null ? (
                    <div>
                      {atsScore === -1 ? (
                        <div>
                          <p className="text-xs text-red-400 font-medium">ATS Calculation Failed</p>
                          <p className="text-xs text-red-300">Missing CV or job data</p>
                          <motion.button
                            onClick={() => {
                              setAtsScore(null);
                              hasAttemptedATSCalculation.current = false; // Reset attempt flag
                              toast.info('Retrying ATS score calculation...');
                              fetchATSScore(journey.cvId!, journey.jobId!);
                            }}
                            className="mt-1 text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Settings className="h-3 w-3" />
                            Retry ATS
                          </motion.button>
                        </div>
                      ) : (
                        <div>
                          {/* Enhanced ATS Score Display */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                atsScore >= 80 ? 'bg-green-400' : 
                                atsScore >= 60 ? 'bg-yellow-400' : 
                                'bg-red-400'
                              }`} />
                              <p className={`text-sm font-bold ${
                                atsScore >= 80 ? 'text-green-400' : 
                                atsScore >= 60 ? 'text-yellow-400' : 
                                'text-red-400'
                              }`}>
                                {atsScore}%
                              </p>
                            </div>
                            <motion.button
                              onClick={handleRefreshATS}
                              disabled={atsScoreLoading}
                              className="p-1 text-white/60 hover:text-white/80 transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Refresh ATS Score"
                            >
                              <RefreshCw className={`h-3 w-3 ${atsScoreLoading ? 'animate-spin' : ''}`} />
                            </motion.button>
                          </div>
                          
                          <p className="text-xs text-white/60 mb-2">
                            {atsScore >= 80 ? '🎉 Excellent ATS Match!' : 
                             atsScore >= 60 ? '⚠️ Good, but could be better' : 
                             '❌ Needs significant improvement'}
                          </p>
                          
                          {/* ATS Score History */}
                          {journey.atsScoreHistory && journey.atsScoreHistory.length > 1 && (
                            <div className="mb-2">
                              <p className="text-xs text-white/50 mb-1">Score History:</p>
                              <div className="flex gap-1">
                                {journey.atsScoreHistory.slice(-3).map((entry, index) => (
                                  <div key={index} className={`w-2 h-2 rounded-full ${
                                    entry.score >= 80 ? 'bg-green-400' : 
                                    entry.score >= 60 ? 'bg-yellow-400' : 
                                    'bg-red-400'
                                  }`} title={`${entry.score}% - ${new Date(entry.calculatedAt).toLocaleDateString()}`} />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {atsScore < 80 && (
                            <motion.button
                              onClick={() => router.push(`/studio?journeyId=${journey.id}&cvId=${journey.cvId}&mode=ats-edit`)}
                              className="w-full px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs rounded transition-colors flex items-center gap-1 justify-center"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Settings className="h-3 w-3" />
                              Optimize ATS
                            </motion.button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : cvNotFound ? (
                    <div>
                      <p className="text-xs text-red-400 font-medium">CV Not Available</p>
                      <p className="text-xs text-red-300">Cannot check ATS score</p>
                    </div>
                  ) : liveProgress.cvId ? (
                    <motion.button
                      onClick={handleATSCheck}
                      disabled={isRunningATSCheck}
                      className="w-full px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isRunningATSCheck ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Settings className="h-3 w-3" />
                          </motion.div>
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          Check ATS
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <p className="text-xs text-white/60">CV required first</p>
                  )}
                </div>

                {/* Step 4: Cover Letter */}
                <div className={`p-3 rounded-lg border ${
                  getStepStatus(4) === 'completed' 
                    ? liveProgress.status === 'completed'
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-lime-500/10 border-lime-500/30'
                    : 'bg-gray-300 dark:bg-white/5 border-gray-400 dark:border-white/10 text-gray-900 dark:text-white'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-orange-400" />
                    <span className="text-xs font-medium text-white">Cover Letter</span>
                    {getStepStatus(4) === 'completed' && (
                      <CheckCircle className={`h-3 w-3 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    )}
                  </div>
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
                          <motion.button
                            onClick={() => router.push(`/studio?journeyId=${journey.id}&type=cover_letter&coverLetterId=${journey.coverLetterId}`)}
                            className={`mt-1 text-xs flex items-center gap-1 ${
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
                        </div>
                      )}
                    </div>
                  ) : cvNotFound ? (
                    <div>
                      <p className="text-xs text-red-400 font-medium">CV Not Available</p>
                      <p className="text-xs text-red-300">Cannot create cover letter</p>
                    </div>
                  ) : atsScore !== null ? (
                    <div className="space-y-1">
                      <motion.button
                        onClick={handleCreateCoverLetter}
                        className="w-full px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Sparkles className="h-3 w-3" />
                        Create Letter
                      </motion.button>
                      {userCoverLetters.length > 0 && (
                        <motion.button
                          onClick={() => setExpandedStep(expandedStep === 4 ? null : 4)}
                          className="w-full px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors flex items-center gap-1 justify-center"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Copy className="h-3 w-3" />
                          Select Letter
                        </motion.button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-white/60">ATS check required first</p>
                  )}
                </div>

                {/* Step 5: Ready to Apply */}
                <div className={`p-3 rounded-lg border ${
                  getStepStatus(5) === 'completed' 
                    ? 'bg-blue-500/10 border-blue-500/30' 
                    : 'bg-gray-300 dark:bg-white/5 border-gray-400 dark:border-white/10 text-gray-900 dark:text-white'
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
                      <p className="text-xs text-white/60">Ready to apply</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-white/60 mb-2">Ready to apply</p>
                      {/* Action buttons for Step 5 */}
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => {
                            handleGetFileSizeEstimates();
                            setShowMoveToAppliedModal(true);
                          }}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1 justify-center"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={isCompletingJourney}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Move to Applied
                        </motion.button>
                        
                        <div className="relative flex-1">
                          <motion.button
                            onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                            className="download-button w-full px-3 py-2 bg-lime-600 hover:bg-lime-700 text-white text-xs rounded transition-colors flex items-center gap-1 justify-center"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Download className="h-3 w-3" />
                            Download
                            <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showDownloadDropdown ? 'rotate-180' : ''}`} />
                          </motion.button>
                          
                          {/* Download Dropdown */}
                          {showDownloadDropdown && (
                            <div className="download-dropdown absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 min-w-48 animate-in slide-in-from-top-2 duration-200">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setShowDownloadDropdown(false);
                                  handleDownloadFiles('all');
                                }}
                                className="w-full px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs flex items-center gap-2"
                              >
                                <Download className="h-3 w-3" />
                                Download All (ZIP)
                              </button>
                              <button
                                onClick={() => {
                                  setShowDownloadDropdown(false);
                                  handleDownloadFiles('cv');
                                }}
                                className="w-full px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs flex items-center gap-2"
                              >
                                <FileText className="h-3 w-3" />
                                CV Only (PDF)
                              </button>
                              <button
                                onClick={() => {
                                  setShowDownloadDropdown(false);
                                  handleDownloadFiles('coverLetter');
                                }}
                                className="w-full px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs flex items-center gap-2"
                              >
                                <Mail className="h-3 w-3" />
                                Cover Letter Only (PDF)
                              </button>
                              <button
                                onClick={() => {
                                  setShowDownloadDropdown(false);
                                  handleDownloadFiles('jobDescription');
                                }}
                                className="w-full px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs flex items-center gap-2"
                              >
                                <Briefcase className="h-3 w-3" />
                                Job Description (PDF)
                              </button>
                            </div>
                          </div>
                          )}
                        </div>
                      </div>
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
                className="text-white/60 hover:text-white"
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
                    key={cv.id && cv.id !== '' ? cv.id : `cv-${index}`}
                    onClick={() => handleSelectCV(cv.id)}
                    className="w-full p-2 text-left bg-gray-600 dark:bg-white/5 hover:bg-gray-700 dark:hover:bg-white/10 rounded border border-gray-700 dark:border-white/10 transition-colors text-white dark:text-white"
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
                          {cv.status} • {new Date(cv.lastModified).toLocaleDateString()}
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
                className="text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {userCoverLetters.map((cl, index) => (
                <motion.button
                  key={cl.id && cl.id !== '' ? cl.id : `cl-${index}`}
                  onClick={() => handleSelectCoverLetter(cl.id)}
                  className="w-full p-2 text-left bg-gray-600 dark:bg-white/5 hover:bg-gray-700 dark:hover:bg-white/10 rounded border border-gray-700 dark:border-white/10 transition-colors text-white dark:text-white"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-white truncate">{cl.title}</p>
                      <p className="text-xs text-white/60">
                        {cl.status} • {new Date(cl.lastModified).toLocaleDateString()}
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
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
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
                        key={cv.id && cv.id !== '' ? cv.id : `cv-selector-${index}`}
                        onClick={() => {
                          handleChangeCV(cv.id);
                          setShowCVSelector(false);
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          String(cv.id) === String(journey.cvId)
                            ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
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

        {/* Celebration Modal */}
        <CelebrationModal
          isOpen={showCelebrationModal}
          onClose={() => setShowCelebrationModal(false)}
          journey={{
            id: journey.id,
            jobTitle: journey.jobTitle,
            company: journey.company,
            atsScore: journey.atsScore,
            journeyDuration: journey.journeyDuration
          }}
          onDownloadFiles={() => {
            setShowCelebrationModal(false);
            handleDownloadFiles('all');
          }}
          onViewJourney={() => {
            setShowCelebrationModal(false);
            // Keep the journey expanded to show details
          }}
        />

    </motion.div>
  );
};

export default JourneyTimelineCard;
