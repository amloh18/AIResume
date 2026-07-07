// @ts-nocheck
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  FileText,
  CheckCircle,
  Download,
  Calendar,
  Building,
  Clock,
  Star,
  ChevronDown,
  Trash2,
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
// @ts-ignore
import Play from 'lucide-react/dist/esm/icons/play';
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
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { useATS } from '@/contexts/ATSContext';
import DocumentPreviewSidebar from './jobs/DocumentPreviewSidebar';

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
  generationState?: {
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    mode: 'tailored' | 'fallback';
    reasonCode: string;
    title: string;
    summary: string;
    supportMessage: string;
    nextAction: 'wait' | 'review' | 'retry' | 'upgrade' | 'edit_manually' | 'contact_support';
    nextActionLabel: string;
    isTailoredEligible: boolean;
    aiCreditsRemaining?: number;
    aiCreditsLimit?: number;
    fallbackCreated?: boolean;
    failureMessage?: string;
    documents: {
      cv: 'queued' | 'created' | 'failed';
      coverLetter: 'queued' | 'created' | 'failed';
    };
    updatedAt: string;
  };
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
  onRefresh?: () => void;
  onUpdateJourney?: (journeyId: string, updates: Partial<Journey>) => void;
  onDelete?: (journey: Journey) => void;
}

const JourneyTimelineCard: React.FC<JourneyTimelineCardProps> = ({
  journey,
  onResume,
  onDownload,
  onRefresh,
  onUpdateJourney,
  onDelete
}) => {
  if (!journey) {
    return null;
  }
  const { isDark } = useTheme();
  const { state, updateJourneyStatus, updateJobInfo, updateCurrentStep, updateCVId, updateCoverLetterId, updateAtsScore, updateCurrentJobId, endJourney } = useJobJourney();
  const { hasAI, userProfile } = useUserPlan();
  const { data: session } = useSession();
  const router = useRouter();
  const { openPaymentModal } = usePaymentModal();
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
  const [isCreatingCoverLetter, setIsCreatingCoverLetter] = React.useState(false);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isAutoCreatingCV, setIsAutoCreatingCV] = React.useState(false);
  const [isAutoCreatingCoverLetter, setIsAutoCreatingCoverLetter] = React.useState(false);
  const hasAttemptedAutoCreateCV = React.useRef(false);
  const hasAttemptedAutoCreateCoverLetter = React.useRef(false);
  const [hasMasterCV, setHasMasterCV] = React.useState(false);
  const hasAttemptedRecreateFromMaster = React.useRef(false);
  const [isRecreatingFromMaster, setIsRecreatingFromMaster] = React.useState(false);

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
  const [previewDocumentType, setPreviewDocumentType] = React.useState<'cv' | 'coverLetter' | null>(null);
  const [previewDocumentData, setPreviewDocumentData] = React.useState<any>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

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
  const generationState = journey.generationState;
  const isGenerationFailure = generationState?.status === 'failed';
  const generationAccentClasses = isGenerationFailure
    ? 'border-red-500/30 bg-red-500/10 text-red-200'
    : generationState?.mode === 'fallback'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : 'border-lime-500/30 bg-lime-500/10 text-lime-100';
  const generationBadgeLabel = generationState
    ? `${generationState.mode === 'tailored' ? 'Tailored' : 'Fallback'} ${generationState.status.replace('_', ' ')}`
    : null;

  const handleGenerationAction = () => {
    if (!generationState) {
      return;
    }

    switch (generationState.nextAction) {
      case 'retry':
        handleRetryDocuments();
        return;
      case 'upgrade':
        openPaymentModal({ preselectedPlanKey: 'pro_monthly', triggerContext: 'tracker-generation' });
        return;
      case 'edit_manually':
      case 'review':
        onResume(journey);
        return;
      case 'contact_support':
        window.open('mailto:support@cvcircle.app?subject=Tracker%20document%20generation%20support', '_blank');
        return;
      default:
        return;
    }
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

            // Check if master CV exists
            const masterCVExists = cvs.some((cv: CV) => {
              const isMasterAtRoot = cv.isMaster === true;
              const isMasterInMetadata = cv.metadata?.isMaster === true;
              const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
              return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
            });
            setHasMasterCV(masterCVExists);

            // Filter freestanding CVs (not master CVs and not linked to other journeys)
            const freestanding = cvs.filter((cv: CV) => {
              const isMasterAtRoot = cv.isMaster === true;
              const isMasterInMetadata = cv.metadata?.isMaster === true;
              const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
              const isMasterCV = isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;

              return !isMasterCV && (cv.journeyId === null || cv.journeyId === undefined);
            });
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
                // Don't show toast - will auto-recreate from master CV
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
        // Don't show toast - will auto-recreate from master CV
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
            // Don't show toast - will auto-recreate from master CV
          }
        } catch (error) {
          console.error('❌ JourneyTimelineCard - Error fetching specific CV:', error);
          setLinkedCV(null);
          setCvNotFound(true);
          // Don't show toast - will auto-recreate from master CV
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

  // Auto-recreate CV from master CV when CV is not found
  React.useEffect(() => {
    // Only recreate if:
    // 1. CV ID exists but CV is not found
    // 2. Master CV is available
    // 3. Haven't attempted recreate yet
    // 4. Not currently recreating
    // 5. Journey is active
    if (
      journey.cvId &&
      cvNotFound &&
      hasMasterCV &&
      !hasAttemptedRecreateFromMaster.current &&
      !isRecreatingFromMaster &&
      journey.status !== 'completed' &&
      mongoDBUserId
    ) {
      hasAttemptedRecreateFromMaster.current = true;
      setIsRecreatingFromMaster(true);

      // Auto-duplicate master CV to recreate the missing CV
      const recreateFromMaster = async () => {
        try {
          // Find the master CV
          const masterCV = userCVs.find(cv =>
            (() => {
              const isMasterAtRoot = cv.isMaster === true;
              const isMasterInMetadata = cv.metadata?.isMaster === true;
              const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
              return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
            })()
          );

          if (!masterCV || !masterCV.id) {
            setIsRecreatingFromMaster(false);
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

          // Call the duplicate CV API
          const response = await fetch('/api/cvs/duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceCvId: masterCV.id,
              userId: mongoDBUserId,
              customTitle: smartCVName,
              journeyId: journey.id,
              jobId: journey.jobId
            })
          });

          if (response.ok) {
            const result = await response.json();

            if (result.data?.cv?.id || result.cvId) {
              const duplicatedCVId = result.data?.cv?.id || result.cvId;

              // Update journey via API
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
                // Update local state
                updateCVId(duplicatedCVId);
                updateCurrentStep(3);
                updateJourneyStatus('cv-created');
                setCvNotFound(false);

                // Update local userCVs to prevent "not found" loop
                setUserCVs((prev) => {
                  if (prev.some((cv) => cv.id === duplicatedCVId)) return prev;
                  return [...prev, {
                    id: duplicatedCVId,
                    title: smartCVName,
                    status: 'draft',
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    journeyId: journey.id,
                    isMaster: false,
                    views: 0,
                    isStarred: false
                  } as CV];
                });

                // Update parent component
                if (onUpdateJourney) {
                  onUpdateJourney(journey.id, {
                    cvId: duplicatedCVId,
                    currentStep: 3
                  });
                }

                // Refresh journey data
                if (onRefresh) {
                  setTimeout(() => {
                    onRefresh();
                  }, 1000);
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ JourneyTimelineCard - Error recreating CV from master:', error);
        } finally {
          setIsRecreatingFromMaster(false);
        }
      };

      recreateFromMaster();
    }
  }, [journey.cvId, cvNotFound, hasMasterCV, journey.status, mongoDBUserId, userCVs, journey.jobTitle, journey.company, journey.id, journey.jobId, onRefresh, onUpdateJourney, updateCVId, updateCurrentStep, updateJourneyStatus]);

  // Auto-create CV when step 2 is empty (no cvId)
  React.useEffect(() => {
    // Only auto-create if:
    // 1. Journey is active (not completed)
    // 2. No CV exists
    // 3. Haven't attempted auto-create yet
    // 4. Not currently processing documents
    // 5. Not in failed state
    if (
      !journey.cvId &&
      journey.status !== 'completed' &&
      journey.status !== 'processing_documents' &&
      journey.status !== 'creation_failed' &&
      !hasAttemptedAutoCreateCV.current &&
      !isAutoCreatingCV &&
      mongoDBUserId
    ) {
      hasAttemptedAutoCreateCV.current = true;
      setIsAutoCreatingCV(true);

      // Auto-create CV via journey documents API
      const createCV = async () => {
        try {
          const response = await fetch('/api/journey-documents/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ journeyId: journey.id })
          });

          const result = await response.json();

          if (response.ok && result.success) {
            // Refresh journey data
            if (onRefresh) {
              setTimeout(() => {
                onRefresh();
              }, 1000);
            }

            // Update local state if CV ID is returned
            if (result.data?.cvId) {
              updateCVId(result.data.cvId);

              // Update local userCVs to prevent "not found" loop
              setUserCVs((prev) => {
                if (prev.some((cv) => cv.id === result.data.cvId)) return prev;
                return [...prev, {
                  id: result.data.cvId,
                  title: result.data.cvTitle || 'Journey CV',
                  status: 'draft',
                  createdAt: new Date().toISOString(),
                  lastModified: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  journeyId: journey.id,
                  isMaster: false,
                  views: 0,
                  isStarred: false
                } as CV];
              });
              if (onUpdateJourney) {
                onUpdateJourney(journey.id, {
                  cvId: result.data.cvId,
                  status: 'in-progress'
                });
              }
            }
          }
        } catch (error) {
          console.error('❌ JourneyTimelineCard - Error auto-creating CV:', error);
        } finally {
          setIsAutoCreatingCV(false);
        }
      };

      createCV();
    }
  }, [journey.cvId, journey.id, journey.status, mongoDBUserId, onRefresh, onUpdateJourney, updateCVId]);

  // Auto-create Cover Letter when step 4 is empty (no coverLetterId) and CV exists
  // CRITICAL: Only create cover letter after CV is fully created and ready
  React.useEffect(() => {
    // Only auto-create if:
    // 1. CV exists and is not being created
    // 2. CV creation is not in progress (to avoid race condition)
    // 3. No Cover Letter exists
    // 4. Journey is active (not completed)
    // 5. Haven't attempted auto-create yet
    // 6. Not currently processing documents
    // 7. Not in failed state
    if (
      journey.cvId &&
      !isAutoCreatingCV && // Ensure CV creation is complete
      !journey.coverLetterId &&
      journey.status !== 'completed' &&
      journey.status !== 'processing_documents' &&
      journey.status !== 'creation_failed' &&
      !hasAttemptedAutoCreateCoverLetter.current &&
      !isAutoCreatingCoverLetter &&
      mongoDBUserId &&
      !cvNotFound
    ) {
      // Add a small delay to ensure CV is fully saved and ready
      const delayTimeout = setTimeout(() => {
        hasAttemptedAutoCreateCoverLetter.current = true;
        setIsAutoCreatingCoverLetter(true);

        // Auto-create Cover Letter via journey documents API
        // This will generate cover letter with AI using cvData and jobData
        const createCoverLetter = async () => {
          try {
            const response = await fetch('/api/journey-documents/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ journeyId: journey.id })
            });

            const result = await response.json();

            if (response.ok && result.success) {
              // Refresh journey data
              if (onRefresh) {
                setTimeout(() => {
                  onRefresh();
                }, 1000);
              }

              // Update local state if cover letter ID is returned
              if (result.data?.coverLetterId) {
                updateCoverLetterId(result.data.coverLetterId);

                // Update local userCoverLetters to prevent "not found" loop
                setUserCoverLetters((prev) => {
                  if (prev.some((cl) => cl.id === result.data.coverLetterId)) return prev;
                  return [...prev, {
                    id: result.data.coverLetterId,
                    title: result.data.coverLetterTitle || 'Journey Cover Letter',
                    status: 'draft',
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    journeyId: journey.id,
                    jobId: journey.jobId,
                  } as CoverLetter];
                });
                if (onUpdateJourney) {
                  onUpdateJourney(journey.id, {
                    coverLetterId: result.data.coverLetterId,
                    status: 'in-progress'
                  });
                }
              }
            }
          } catch (error) {
            console.error('❌ JourneyTimelineCard - Error auto-creating cover letter:', error);
          } finally {
            setIsAutoCreatingCoverLetter(false);
          }
        };

        createCoverLetter();
      }, 500); // Small delay to ensure CV is ready

      return () => clearTimeout(delayTimeout);
    }
  }, [journey.cvId, journey.coverLetterId, journey.id, journey.status, mongoDBUserId, cvNotFound, isAutoCreatingCV, onRefresh, onUpdateJourney, updateCoverLetterId]);

  // Initialize ATS score from journey data or auto-fetch if needed
  React.useEffect(() => {
    // Only use journey.atsScore if CV is linked and score is valid (not a placeholder/default)
    // ATS score should only be displayed if it was calculated for the current CV-Job pair
    const hasValidCV = journey.cvId && journey.cvId.trim() !== '';
    const hasValidJob = journey.jobId && journey.jobId.trim() !== '';
    const hasScoreInDB = journey.atsScore !== undefined && journey.atsScore !== null;

    // If we have a CV and Job, we should verify/recalculate the score
    // Don't trust database score if CV or Job might have changed
    if (hasValidCV && hasValidJob) {
      // Always recalculate if we don't have a score in state, or if the CV/Job might have changed
      if (atsScore === null && !atsScoreLoading && !hasAttemptedATSCalculation.current) {
        console.log('🔍 JourneyTimelineCard - Auto-fetching ATS score for linked CV');
        hasAttemptedATSCalculation.current = true; // Mark as attempted
        fetchATSScore(journey.cvId, journey.jobId);
      } else if (hasScoreInDB && atsScore === null && !atsScoreLoading) {
        // If database has a score but we haven't set it in state, use it as initial value
        // but still verify it's correct by checking if CV matches
        console.log('🔍 JourneyTimelineCard - Using existing ATS score from journey as initial value:', journey.atsScore);
        setAtsScore(journey.atsScore);
        setAtsScoreLoading(false);
        // Don't mark as attempted - allow recalculation if needed
      }
    } else if (hasScoreInDB && atsScore === null) {
      // If no CV is linked but database has a score, it's likely stale - don't use it
      console.log('🔍 JourneyTimelineCard - Database has ATS score but no CV linked, ignoring stale score');
      setAtsScore(null);
      setAtsScoreLoading(false);
    } else if (!hasValidCV && atsScore === null) {
      // No CV linked, no score to show
      setAtsScore(null);
      setAtsScoreLoading(false);
    }
  }, [journey.cvId, journey.jobId, journey.atsScore, atsScore, atsScoreLoading]);

  // Polling for document creation status
  React.useEffect(() => {
    // Poll if status is processing_documents OR if we're missing cvId or coverLetterId but status isn't failed
    const isProcessing = journey.status === 'processing_documents';
    const needsPolling = isProcessing ||
      (journey.status !== 'creation_failed' && journey.status !== 'ready' && (!journey.cvId || !journey.coverLetterId));

    if (needsPolling) {
      // Poll faster (1.5s) for processing state, then slow down
      const pollInterval = isProcessing ? 1500 : 2000;
      console.log('🔄 JourneyTimelineCard - Starting polling for journey:', journey.id, {
        status: journey.status,
        hasCvId: !!journey.cvId,
        hasCoverLetterId: !!journey.coverLetterId,
        pollInterval
      });

      // Poll at the determined interval
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

                  // Update journey state directly for immediate UI update
                  if (onUpdateJourney) {
                    onUpdateJourney(journey.id, {
                      cvId: updatedJourney.cvId,
                      coverLetterId: updatedJourney.coverLetterId,
                      status: updatedJourney.status
                    });
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
        const result = await response.json();
        toast.success(result?.generationState?.summary || 'Document creation retry triggered');
        onUpdateJourney?.(journey.id, {
          status: 'processing_documents',
          generationState: result?.generationState
        });
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
        // Only completed if we have a valid ATS score (not -1, not null, not undefined) AND CV is linked and available
        // Also verify that the score was actually calculated (not just a stale database value)
        const hasValidScore = atsScore !== null && atsScore !== undefined && atsScore !== -1 && atsScore >= 0 && atsScore <= 100;
        const hasValidCV = liveProgress.cvId && liveProgress.cvId.trim() !== '' && !cvNotFound;
        return (hasValidScore && hasValidCV) ? 'completed' :
          (liveProgress.currentStep >= 3 && hasValidCV ? 'active' : 'pending');

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

  const handleCreateCV = async () => {
    if (isRetryingDocuments) return;

    setIsRetryingDocuments(true);
    try {
      // Auto-create CV via journey documents API
      const response = await fetch('/api/journey-documents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId: journey.id })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Refresh journey data
        if (onRefresh) {
          setTimeout(() => {
            onRefresh();
          }, 1000);
        }

        // Update local state if CV ID is returned
        if (result.data?.cvId) {
          updateCVId(result.data.cvId);
          if (onUpdateJourney) {
            onUpdateJourney(journey.id, {
              cvId: result.data.cvId,
              status: 'in-progress'
            });
          }
        }
      } else {
        console.error('❌ JourneyTimelineCard - Failed to create CV:', result);
        toast.error(result.error || result.message || 'Failed to create CV');
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error creating CV:', error);
      toast.error('Failed to create CV. Please try again.');
    } finally {
      setIsRetryingDocuments(false);
    }
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

  const { refreshATSScore } = useATS();

  const fetchATSScore = async (cvId: string, jobId: string, forceRecalculate: boolean = false) => {
    if (userProfile?.currentPlanKey === 'free' || !userProfile?.subscription || userProfile.subscription.status !== 'active') {
        openPaymentModal({ preselectedPlanKey: 'pro_monthly', triggerContext: 'ats-score' });
        return;
    }

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

      // Primary source: Fetch from database first (journey.atsScore)
      if (!forceRecalculate && journey.atsScore !== undefined && journey.atsScore !== null) {
        console.log('📊 JourneyTimelineCard - Using cached ATS score from journey:', journey.atsScore);
        setAtsScore(journey.atsScore);
        updateAtsScore(journey.atsScore);
        setAtsScoreLoading(false);
        return;
      }

      // If not in journey, check CV metadata
      if (!forceRecalculate && linkedCV?.metadata?.atsScore !== undefined && linkedCV.metadata.atsScore !== null) {
        console.log('📊 JourneyTimelineCard - Using cached ATS score from CV metadata:', linkedCV.metadata.atsScore);
        const cachedScore = linkedCV.metadata.atsScore;
        setAtsScore(cachedScore);
        updateAtsScore(cachedScore);

        // Also update journey with cached score
        const journeyResponse = await fetch(`/api/application-journey/${journey.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            atsScore: cachedScore,
            metadata: {
              updatedAt: new Date(),
              lastAccessedAt: new Date()
            }
          })
        });

        if (journeyResponse.ok) {
          console.log('✅ JourneyTimelineCard - Cached score synced to journey');
        }

        setAtsScoreLoading(false);
        return;
      }

      // No cached score found - calculate new score
      console.log('🔄 JourneyTimelineCard - No cached score found, calculating new score...');

      // Call global refreshATSScore which hits the unified API and updates ATSContext
      const score = await refreshATSScore(cvId, jobId, mongoDBUserId || undefined);

      if (score !== null && score !== undefined) {
        setAtsScore(score);
        updateAtsScore(score);

        // Score is already saved to database by API endpoint (atomic operation)
        // Just update parent component if needed
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

      // Force recalculation (user explicitly requested)
      await fetchATSScore(journey.cvId, journey.jobId, true);
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error running ATS check:', error);
      toast.error('Network error during ATS calculation. Please check your connection.');
    } finally {
      setIsRunningATSCheck(false);
    }
  };


  const handleCreateCoverLetter = async () => {
    if (isCreatingCoverLetter) return;

    setIsCreatingCoverLetter(true);
    try {
      console.log('🔍 JourneyTimelineCard - Creating cover letter for journey:', journey.id);

      // Call the same API endpoint used when journey is created
      // This will automatically create and link the cover letter to the journey
      const response = await fetch('/api/journey-documents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId: journey.id })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Cover letter created and linked successfully!');
        console.log('✅ JourneyTimelineCard - Cover letter created:', result.data);

        // Refresh journey data to show the new cover letter
        // The useEffect will automatically reload when journey.coverLetterId changes
        if (onRefresh) {
          setTimeout(() => {
            onRefresh();
          }, 1000);
        }

        // Update local state if cover letter ID is returned
        if (result.data?.coverLetterId) {
          updateCoverLetterId(result.data.coverLetterId);
          // Update journey in parent component
          if (onUpdateJourney) {
            onUpdateJourney(journey.id, {
              coverLetterId: result.data.coverLetterId,
              status: 'in-progress'
            });
          }
        }
      } else {
        console.error('❌ JourneyTimelineCard - Failed to create cover letter:', result);
        toast.error(result.error || result.message || 'Failed to create cover letter');
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error creating cover letter:', error);
      toast.error('Failed to create cover letter. Please try again.');
    } finally {
      setIsCreatingCoverLetter(false);
    }
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

  const handleDownloadFiles = async (
    downloadType: 'all' | 'cv' | 'coverLetter' | 'jobDescription' = 'all',
    format: FormatType = 'pdf'
  ) => {
    try {
      // For DOCX format, use CV export API with template
      if (format === 'docx' && downloadType === 'cv' && journey.cvId && linkedCV) {
        try {
          // Get CV data and template
          const cvResponse = await fetch(`/api/cvs/${journey.cvId}`);
          if (!cvResponse.ok) throw new Error('Failed to fetch CV data');

          const cvResult = await cvResponse.json();
          if (!cvResult.success || !cvResult.data) throw new Error('CV data not found');

          const cv = cvResult.data.cv;

          // Get template data - try multiple sources
          let template = cv.templateData || cv.template || {};

          // If template is just an ID, fetch the full template
          if (cv.templateId && (!template || typeof template === 'string')) {
            try {
              const templateResponse = await fetch(`/api/templates/${cv.templateId}`);
              if (templateResponse.ok) {
                const templateResult = await templateResponse.json();
                if (templateResult.success && templateResult.data) {
                  template = templateResult.data;
                }
              }
            } catch (templateError) {
              console.warn('Could not fetch template, using defaults:', templateError);
            }
          }

          // Use DOCX format for export
          const exportFormat = format;

          // Use CV export API for DOC/DOCX
          const exportResponse = await fetch('/api/cv/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cvData: cv.cvData || cv.data,
              template: template,
              format: exportFormat,
              userId: session?.user?.id,
              cvId: journey.cvId,
              jobId: journey.jobId
            })
          });

          if (!exportResponse.ok) {
            const errorData = await exportResponse.json().catch(() => ({ error: 'Export failed' }));
            throw new Error(errorData.error || `Export failed: ${exportResponse.status} ${exportResponse.statusText}`);
          }

          const blob = await exportResponse.blob();

          // Check if blob is valid
          if (!blob || blob.size === 0) {
            throw new Error('Exported file is empty');
          }

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.style.display = 'none';
          // Use .docx extension for both DOC and DOCX (DOCX is compatible with DOC readers)
          a.download = `${journey.jobTitle} - CV.${exportFormat}`;
          document.body.appendChild(a);
          a.click();

          // Clean up after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);

          toast.success('CV downloaded successfully');
          return;
        } catch (error: any) {
          console.error('Error downloading CV in DOC/DOCX format:', error);
          toast.error(error.message || 'Failed to download CV');
          throw error;
        }
      }

      // For PDF or other formats, use the journey download endpoint
      const url = `/api/application-journey/${journey.id}/download?type=${downloadType}${format !== 'pdf' ? `&format=${format}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': downloadType === 'all' ? 'application/zip' : format === 'pdf' ? 'application/pdf' : format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/msword',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(errorData.error || `Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      // Check if blob is valid
      if (!blob || blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.style.display = 'none';

      const extension = downloadType === 'all' ? 'zip' : format === 'pdf' ? 'pdf' : format;
      const filename = `${journey.jobTitle} - ${downloadType === 'all' ? 'Application Files' : downloadType === 'cv' ? 'CV' : downloadType === 'coverLetter' ? 'Cover Letter' : 'Job Description'}.${extension}`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();

      // Clean up after a delay to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(link);
      }, 100);

      toast.success('Files downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading files:', error);
      const errorMessage = error.message || 'Error downloading files';
      toast.error(errorMessage);

      // Show retry option with better UX
      const shouldRetry = window.confirm(`Download failed: ${errorMessage}\n\nWould you like to retry?`);
      if (shouldRetry) {
        // Retry after a short delay
        setTimeout(() => {
          handleDownloadFiles(downloadType, format).catch(err => {
            console.error('Retry failed:', err);
          });
        }, 1000);
      }
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
      className={`journey-card ${liveProgress.status === 'completed'
        ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-500/50'
        : 'bg-lime-50 dark:bg-[#24320f] border border-lime-200 dark:border-lime-500/30'
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
              <div className="flex items-center gap-2">
                <Building className={`h-4 w-4 flex-shrink-0 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                <h3 className={`text-small font-medium truncate ${liveProgress.status === 'completed'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-900 dark:text-white'
                  }`}>
                  {journey.jobTitle}
                </h3>
                  <span className={`text-small flex-shrink-0 ${liveProgress.status === 'completed'
                    ? 'text-gray-600 dark:text-white/60'
                    : 'text-gray-600 dark:text-white/60'
                    }`}>
                  {journey.company}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile: Steps Status, ATS Score, and Details */}
          <div className="flex items-center justify-between gap-2">
            {/* Steps Status */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-shrink">
              {steps.map((step) => {
                const stepId = step.id;
                const status = getStepStatus(stepId);

                return (
                  <motion.button
                    key={stepId}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-small font-medium transition-all duration-200 ${status === 'completed'
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
                        className={`w-2 h-2 rounded-full ${liveProgress.status === 'completed'
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
              {atsScore !== null && atsScore !== -1 && atsScore !== undefined && journey.cvId ? (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${liveProgress.status === 'completed'
                  ? 'bg-blue-200 dark:bg-white/10'
                  : 'bg-lime-100 dark:bg-lime-500/10'
                  }`}>
                  <Target className={`h-3 w-3 ${liveProgress.status === 'completed'
                    ? 'text-blue-700 dark:text-white/60'
                    : 'text-lime-700 dark:text-lime-300'
                    }`} />
                  <span className={`text-small font-medium ${liveProgress.status === 'completed'
                    ? 'text-blue-900 dark:text-white/80'
                    : 'text-lime-900 dark:text-lime-100'
                    }`}>
                    {atsScore}%
                  </span>
                </div>
              ) : null}

              {/* Details Dropdown */}
              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-1 rounded transition-colors ${liveProgress.status === 'completed'
                  ? 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-blue-200 dark:hover:bg-white/10'
                  : 'text-gray-700 dark:text-lime-200 hover:text-gray-900 dark:hover:text-lime-100 hover:bg-lime-100 dark:hover:bg-lime-500/10'
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
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building className={`h-5 w-5 flex-shrink-0 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className={`text-small font-medium truncate ${liveProgress.status === 'completed'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-white'
                  }`}>
                  {journey.jobTitle}
                </h3>
                <p className={`text-small flex-shrink-0 ${liveProgress.status === 'completed'
                  ? 'text-gray-600 dark:text-white/60'
                  : 'text-white/60'
                  }`}>{journey.company}</p>
                {journey.lastWorkedOn && (
                  <p className={`text-small ${liveProgress.status === 'completed'
                    ? 'text-gray-500 dark:text-white/40'
                    : 'text-white/40'
                    }`}>
                    Last worked {formatRelativeTime(journey.lastWorkedOn)}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Steps - Clickable */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((stepId, index) => {
                const status = getStepStatus(stepId);
                return (
                  <motion.button
                    key={`step-${stepId}-${index}`}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-small font-medium transition-all ${status === 'completed'
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
                        className={`w-3 h-3 rounded-full ${liveProgress.status === 'completed'
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
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${liveProgress.status === 'completed'
              ? 'bg-blue-100 dark:bg-blue-500/20'
              : 'bg-lime-100 dark:bg-lime-500/20'
              }`}>
              {steps.find(s => s.id === liveProgress.currentStep + 1)?.icon &&
                React.createElement(steps.find(s => s.id === liveProgress.currentStep + 1)!.icon, { className: "h-4 w-4" })
              }
              <span className={`text-small font-medium ${liveProgress.status === 'completed'
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
              className="px-3 py-1 text-small text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Eye className="h-3 w-3" />
              {isExpanded ? 'Hide' : 'Details'}
            </motion.button>

            {liveProgress.status === 'completed' ? (
              <motion.button
                onClick={() => handleDownloadFiles('all')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-small"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Download Files"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </motion.button>
            ) : (
              onDelete && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(journey);
                  }}
                  className="flex items-center justify-center p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Delete Journey"
                >
                  <Trash2 className="h-4 w-4" />
                </motion.button>
              )
            )}
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
            className={`border-t ${liveProgress.status === 'completed'
              ? 'border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/10'
              : 'border-lime-500/20 bg-[#24320f]'
              } overflow-hidden`}
          >
            <div className="px-6 py-4">
              {generationState && (
                <div className={`mb-3 rounded-xl border p-3 ${generationAccentClasses}`}>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {isGenerationFailure ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : generationState.mode === 'tailored' ? (
                          <Sparkles className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <p className="text-small font-semibold">{generationState.title}</p>
                        {generationBadgeLabel && (
                          <span className="rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                            {generationBadgeLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-small">{generationState.summary}</p>
                      <p className="text-small opacity-90">{generationState.supportMessage}</p>
                      {generationState.failureMessage && (
                        <p className="text-small opacity-80">{generationState.failureMessage}</p>
                      )}
                    </div>

                    {generationState.nextAction !== 'wait' && (
                      <motion.button
                        onClick={handleGenerationAction}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shrink-0 font-medium transition-colors hover:bg-white/10"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {generationState.nextAction === 'retry' ? (
                          <RefreshCw className="h-3 w-3" />
                        ) : generationState.nextAction === 'upgrade' ? (
                          <Sparkles className="h-3 w-3" />
                        ) : generationState.nextAction === 'contact_support' ? (
                          <Mail className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                        {generationState.nextActionLabel}
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

                  {/* Stage badge shown when expanded and jobDetails is loaded */}
                  {jobDetails?.status && (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {(() => {
                        const s = jobDetails.status;
                        const badgeMap = {
                          draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
                          created: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
                          applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                          screening: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
                          interview: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
                          offer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                          accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                          rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                          withdrawn: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
                        };
                        return (
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeMap[s] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </span>
                        );
                      })()}
                      {jobDetails.deadline && (
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                          Deadline: {new Date(jobDetails.deadline).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}
                        </span>
                      )}
                    </div>
                  )}


              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Step 1: Job */}
                <div className={`p-3 rounded-lg border ${liveProgress.status === 'completed'
                  ? 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-500/30 text-gray-900 dark:text-white'
                  : 'bg-lime-50 dark:bg-[#24320f] border-gray-200 dark:border-white/20 text-gray-900 dark:text-white'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-blue-400" />
                    <span className={`text-small font-medium ${liveProgress.status === 'completed'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-900 dark:text-white'
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
                    <p className="text-small text-gray-900 dark:text-white font-medium truncate">{journey.jobTitle}</p>
                    <p className="text-small text-gray-600 dark:text-white/60 truncate">{journey.company}</p>
                  </div>
                </div>

                {/* Step 2: CV */}
                <div className={`p-3 rounded-lg border ${liveProgress.status === 'completed'
                  ? 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-500/30 text-gray-900 dark:text-white'
                  : 'bg-lime-50 dark:bg-[#24320f] border-gray-200 dark:border-white/20 text-gray-900 dark:text-white'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-green-400" />
                    <span className={`text-small font-medium ${liveProgress.status === 'completed'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-900 dark:text-white'
                      }`}>CV</span>
                    {getStepStatus(2) === 'completed' && (
                      <CheckCircle className={`h-3 w-3 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    )}
                  </div>
                  {/* Handle document creation status */}
                  {journey.cvId ? (
                    <div>
                      {cvNotFound && isRecreatingFromMaster ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                            <p className="text-small text-blue-400 font-medium">Recreating CV from master...</p>
                          </div>
                          <p className="text-small text-gray-600 dark:text-gray-400">Please wait while we recreate your CV</p>
                        </div>
                      ) : cvNotFound && !hasMasterCV ? (
                        <div className="space-y-2">
                          <p className="text-small text-yellow-400 font-medium">No Master CV Available</p>
                          <p className="text-small text-gray-600 dark:text-gray-400">
                            You need to create a master CV first before creating job-specific CVs.
                          </p>
                          <motion.button
                            onClick={() => router.push('/editor')}
                            className="w-full px-2 py-1 bg-lime-500 hover:bg-lime-600 text-black text-small font-medium rounded transition-colors flex items-center gap-1 justify-center"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Plus className="h-3 w-3" />
                            Create Master CV
                          </motion.button>
                        </div>
                      ) : cvNotFound ? (
                        <div className="space-y-1">
                          <p className="text-small text-gray-600 dark:text-gray-400">Recreating CV from master...</p>
                        </div>
                      ) : (
                        <div>
                          <p className={`text-small font-medium truncate ${liveProgress.status === 'completed'
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-900 dark:text-white'
                            }`}>
                            {linkedCV?.title || `CV ${journey.cvId.slice(-6)}`}
                          </p>
                          <p className={`text-small ${liveProgress.status === 'completed'
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'text-gray-600 dark:text-gray-400'
                            }`}>
                            {generationState?.mode === 'fallback'
                              ? 'Non-tailored fallback draft ready'
                              : linkedCV
                                ? 'Tailored draft ready for editing'
                                : 'Document linked'}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            {linkedCV && (
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewDocumentType('cv');
                                  setPreviewDocumentData(linkedCV.cvData || linkedCV);
                                  setPreviewOpen(true);
                                }}
                                className="text-small text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                Preview
                              </motion.button>
                            )}
                            {/* Only show Edit button - but hide for post-application stages */}
                            {(!jobDetails?.status || !['applied', 'interview', 'offer', 'rejected'].includes(jobDetails.status)) && journey.status !== 'completed' && (
                              <motion.button
                                onClick={() => {
                                  // Navigate to cv-builder-pro in journey mode
                                  const params = new URLSearchParams();
                                  params.set('mode', 'journey');
                                  params.set('journeyId', journey.id);
                                  if (journey.cvId) {
                                    params.set('cvId', journey.cvId);
                                  }
                                  router.push(`/editor?${params.toString()}`);
                                }}
                                className="text-small text-lime-400 hover:text-lime-300 flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Edit
                              </motion.button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : journey.status === 'processing_documents' || isAutoCreatingCV ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                        <p className="text-small text-blue-400 font-medium">
                          {generationState?.mode === 'fallback' ? 'Creating fallback CV...' : 'Creating tailored CV...'}
                        </p>
                      </div>
                      <p className="text-small text-gray-600 dark:text-gray-400">
                        {generationState?.summary || 'Please wait while we create your CV'}
                      </p>
                    </div>
                  ) : journey.status === 'creation_failed' ? (
                    <div className="space-y-2">
                      <p className="text-small text-red-400 font-medium">
                        {generationState?.title || 'Failed to create CV'}
                      </p>
                      <p className="text-small text-red-300">
                        {generationState?.supportMessage || 'Document creation encountered an error'}
                      </p>
                      <motion.button
                        onClick={handleGenerationAction}
                        disabled={isRetryingDocuments}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-small font-medium rounded transition-colors border border-red-500/30 disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isRetryingDocuments ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {generationState?.nextActionLabel || 'Retry'}
                      </motion.button>
                    </div>
                  ) : !hasMasterCV ? (
                    <div className="space-y-2">
                      <p className="text-small text-yellow-400 font-medium">No Master CV Available</p>
                      <p className="text-small text-gray-600 dark:text-gray-400">
                        You need to create a master CV first before creating job-specific CVs.
                      </p>
                      <motion.button
                        onClick={() => router.push('/editor')}
                        className="w-full px-2 py-1 bg-lime-500 hover:bg-lime-600 text-black text-small font-medium rounded transition-colors flex items-center gap-1 justify-center"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="h-3 w-3" />
                        Create Master CV
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-small text-gray-600 dark:text-gray-400">
                        {generationState?.summary || 'Creating CV...'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 3: ATS Analysis */}
                <div className={`p-3 rounded-lg border ${liveProgress.status === 'completed'
                  ? 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-500/30 text-gray-900 dark:text-white'
                  : 'bg-lime-50 dark:bg-[#24320f] border-gray-200 dark:border-white/20 text-gray-900 dark:text-white'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-purple-400" />
                    <span className={`text-small font-medium ${liveProgress.status === 'completed'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-900 dark:text-white'
                      }`}>ATS Analysis</span>
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
                          <span className="text-small">Calculating ATS score...</span>
                        </div>
                      ) : atsScore !== null && atsScore !== undefined && atsScore !== -1 && journey.cvId ? (
                        <div className="space-y-2">
                          {/* Score Display */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 min-w-8 min-h-8 aspect-square rounded-full flex items-center justify-center text-small font-bold flex-shrink-0 ${atsScore >= 80 ? 'bg-green-500 text-white' :
                                atsScore >= 60 ? 'bg-yellow-500 text-white' :
                                  'bg-red-500 text-white'
                                }`}>
                                {atsScore}%
                              </div>
                              <div>
                                <p className="text-small font-medium text-white">
                                  {atsScore >= 80 ? 'Excellent Match' :
                                    atsScore >= 60 ? 'Good Match' :
                                      'Needs Improvement'}
                                </p>
                                <p className="text-small text-gray-400">ATS Score</p>
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
                              // Navigate to cv-builder-pro step 3 with CV loaded
                              const params = new URLSearchParams();
                              params.set('mode', 'journey');
                              params.set('journeyId', journey.id);
                              params.set('step', '3');
                              if (journey.cvId) {
                                params.set('cvId', journey.cvId);
                              }
                              if (journey.jobId) {
                                params.set('jobId', journey.jobId);
                              }
                              router.push(`/editor?${params.toString()}`);
                            }}
                            className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-small font-medium rounded transition-colors border border-purple-500/30"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Improve Score
                          </motion.button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-small text-gray-400">
                            No ATS score calculated yet
                          </div>
                          <motion.button
                            onClick={() => fetchATSScore(journey.cvId!, journey.jobId)}
                            className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-small font-medium rounded transition-colors border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className={`p-3 rounded-lg border ${liveProgress.status === 'completed'
                  ? 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-500/30 text-gray-900 dark:text-white'
                  : 'bg-lime-50 dark:bg-[#24320f] border-gray-200 dark:border-white/20 text-gray-900 dark:text-white'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-orange-400" />
                    <span className={`text-small font-medium ${liveProgress.status === 'completed'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-900 dark:text-white'
                      }`}>Cover Letter</span>
                    {getStepStatus(4) === 'completed' && (
                      <CheckCircle className={`h-3 w-3 ${liveProgress.status === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    )}
                  </div>
                  {/* Handle document creation status */}
                  {journey.coverLetterId ? (
                    <div>
                      {coverLetterNotFound ? (
                        <div>
                          <p className="text-small text-red-400 font-medium truncate">
                            Cover Letter {journey.coverLetterId.slice(-6)} - Not Found
                          </p>
                          <p className="text-small text-red-300">
                            This cover letter has been deleted or is unavailable
                          </p>
                        </div>
                      ) : (
                      <div>
                        <p className={`text-small font-medium truncate ${liveProgress.status === 'completed'
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-900 dark:text-white'
                          }`}>
                          {linkedCoverLetter?.title || `Cover Letter ${journey.coverLetterId.slice(-6)}`}
                        </p>
                        <p className={`text-small ${liveProgress.status === 'completed'
                          ? 'text-gray-600 dark:text-gray-400'
                          : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {generationState?.mode === 'fallback'
                              ? 'Fallback draft ready for review'
                              : linkedCoverLetter
                                ? 'Tailored draft ready for review'
                                : 'Document linked'}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            {linkedCoverLetter && (
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewDocumentType('coverLetter');
                                  setPreviewDocumentData(linkedCoverLetter);
                                  setPreviewOpen(true);
                                }}
                                className={`text-small flex items-center gap-1 ${liveProgress.status === 'completed'
                                  ? 'text-blue-400 hover:text-blue-300'
                                  : 'text-lime-400 hover:text-lime-300'
                                  }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Eye className="h-3 w-3" />
                                Preview
                              </motion.button>
                            )}
                            {/* Only show Edit button - but hide for post-application stages */}
                            {(!jobDetails?.status || !['applied', 'interview', 'offer', 'rejected'].includes(jobDetails.status)) && (
                              <motion.button
                                onClick={() => {
                                  if (userProfile?.currentPlanKey === 'free' || !userProfile?.subscription || userProfile.subscription.status !== 'active') {
                                      openPaymentModal({ preselectedPlanKey: 'pro_monthly', triggerContext: 'cover-letter-edit' });
                                      return;
                                  }
                                  // Navigate to cv-builder-pro in edit-cover-letter mode
                                  const params = new URLSearchParams();
                                  params.set('mode', 'edit-cover-letter');
                                  params.set('journeyId', journey.id);
                                  if (journey.coverLetterId) {
                                    params.set('coverLetterId', journey.coverLetterId);
                                  }
                                  if (journey.cvId) {
                                    params.set('cvId', journey.cvId);
                                  }
                                  if (journey.jobId) {
                                    params.set('jobId', journey.jobId);
                                  }
                                  router.push(`/editor?${params.toString()}`);
                                }}
                                className={`text-small flex items-center gap-1 ${liveProgress.status === 'completed'
                                  ? 'text-blue-400 hover:text-blue-300'
                                  : 'text-lime-400 hover:text-lime-300'
                                  }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <ExternalLink className="h-3 w-3" />
                                Edit
                              </motion.button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : journey.status === 'processing_documents' || isAutoCreatingCoverLetter ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                        <p className="text-small text-blue-400 font-medium">
                          {generationState?.mode === 'fallback' ? 'Creating fallback Cover Letter...' : 'Creating tailored Cover Letter...'}
                        </p>
                      </div>
                      <p className="text-small text-white/60">
                        {generationState?.supportMessage || 'Please wait while we create your cover letter'}
                      </p>
                    </div>
                  ) : journey.status === 'creation_failed' ? (
                    <div className="space-y-2">
                      <p className="text-small text-red-400 font-medium">
                        {generationState?.title || 'Failed to create Cover Letter'}
                      </p>
                      <p className="text-small text-red-300">
                        {generationState?.supportMessage || 'Document creation encountered an error'}
                      </p>
                      <motion.button
                        onClick={handleGenerationAction}
                        disabled={isRetryingDocuments}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-small font-medium rounded transition-colors border border-red-500/30 disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isRetryingDocuments ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {generationState?.nextActionLabel || 'Retry'}
                      </motion.button>
                    </div>
                  ) : cvNotFound ? (
                    <div>
                      <p className="text-small text-red-400 font-medium">CV Not Available</p>
                      <p className="text-small text-red-300">Cannot create cover letter</p>
                    </div>
                  ) : journey.cvId ? (
                    <div className="space-y-2">
                      <p className="text-small text-white/60">No cover letter yet</p>
                      <motion.button
                        onClick={async () => {
                          if (!session?.user?.id || !journey.cvId || !journey.jobId) {
                            toast.error('Missing required data to generate cover letter');
                            return;
                          }

                          setIsAutoCreatingCoverLetter(true);
                          try {
                            // First fetch CV and Job data
                            const [cvRes, jobRes] = await Promise.all([
                              fetch(`/api/cvs/${journey.cvId}?userId=${session.user.id}`),
                              fetch(`/api/jobs/${journey.jobId}?userId=${session.user.id}`)
                            ]);

                            if (!cvRes.ok || !jobRes.ok) {
                              throw new Error('Failed to fetch CV or Job data');
                            }

                            const cvData = await cvRes.json();
                            const jobData = await jobRes.json();

                            // Generate cover letter content using AI
                            const generateRes = await fetch('/api/ai/cover-letter-generate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                cvData: cvData.data?.cv || cvData.cv || cvData,
                                jobData: jobData.data?.job || jobData.job || jobData,
                                userId: session.user.id
                              })
                            });

                            if (!generateRes.ok) {
                              throw new Error('Failed to generate cover letter content');
                            }

                            const generateResult = await generateRes.json();
                            const coverLetterContent = generateResult.content || generateResult.body || generateResult.data?.content;

                            // Create cover letter document and link to journey
                            const createRes = await fetch('/api/cover-letters', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                userId: session.user.id,
                                title: `Cover Letter - ${journey.jobTitle} at ${journey.company}`,
                                content: coverLetterContent,
                                jobId: journey.jobId,
                                journeyId: journey.id,
                                status: 'draft'
                              })
                            });

                            if (!createRes.ok) {
                              throw new Error('Failed to create cover letter');
                            }

                            const createResult = await createRes.json();
                            const newCoverLetterId = createResult.data?.id || createResult.id;

                            if (newCoverLetterId) {
                              // Update journey with cover letter ID
                              await fetch(`/api/application-journey/${journey.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  userId: session.user.id,
                                  coverLetterId: newCoverLetterId
                                })
                              });

                              toast.success('Cover letter generated successfully!');
                              // Trigger refresh of journey data
                              window.location.reload();
                            }
                          } catch (error) {
                            console.error('Error generating cover letter:', error);
                            toast.error('Failed to generate cover letter');
                          } finally {
                            setIsAutoCreatingCoverLetter(false);
                          }
                        }}
                        disabled={isAutoCreatingCoverLetter}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-small font-medium rounded transition-colors border border-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isAutoCreatingCoverLetter ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" />
                            Generate Cover Letter
                          </>
                        )}
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-small text-gray-600 dark:text-gray-400">Complete Step 2 first</p>
                    </div>
                  )}
                </div>

                {/* Step 5: Ready to Apply */}
                <div className={`p-3 rounded-lg border ${liveProgress.status === 'completed'
                  ? 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-500/30 text-gray-900 dark:text-white'
                  : 'bg-lime-50 dark:bg-[#24320f] border-gray-200 dark:border-white/20 text-gray-900 dark:text-white'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Download className={`h-4 w-4 ${getStepStatus(5) === 'completed' ? 'text-blue-400' : 'text-lime-400'}`} />
                    <span className={`text-small font-medium ${liveProgress.status === 'completed'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-900 dark:text-white'
                      }`}>Ready</span>
                    {getStepStatus(5) === 'completed' && (
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                    )}
                  </div>

                  {getStepStatus(5) === 'completed' ? (
                    <div>
                      <p className="text-small text-white font-medium">Complete</p>
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
                          <div className="flex flex-col gap-2 w-full">
                            <motion.button
                              onClick={() => {
                                handleGetFileSizeEstimates();
                                setShowMoveToAppliedModal(true);
                              }}
                              className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-small font-medium rounded transition-colors flex items-center gap-1 justify-center min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              disabled={isCompletingJourney}
                            >
                              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">Move to Applied</span>
                            </motion.button>

                            <motion.button
                              onClick={() => setDownloadModalOpen(true)}
                              className="w-full px-2 py-1 bg-lime-600 hover:bg-lime-700 text-white text-small font-medium rounded transition-colors flex items-center gap-1 justify-center min-w-0"
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
                              <p className="text-small text-orange-400 font-medium">
                                {!hasCV || !hasCoverLetter
                                  ? "Please link CV and Cover Letter"
                                  : "ATS score below 70%. Please improve your CV to continue."}
                              </p>
                              {/* Only show second line for CV/Cover Letter missing, not for ATS score */}
                              {(!hasCV || !hasCoverLetter) && (
                                <p className="text-small text-orange-300 mt-1">
                                  {!hasCV ? "Complete Step 2 to add a CV" :
                                    !hasCoverLetter ? "Complete Step 4 to add a Cover Letter" : ""}
                                </p>
                              )}
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
              <h4 className="text-small font-medium text-white">Application Timeline</h4>
            </div>

            <div className="space-y-3">
              {/* Journey Started */}
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <div className="flex-1">
                  <p className="text-small text-white font-medium">Journey Started</p>
                  <p className="text-small text-white/60">{formatDate(journey.createdAt)}</p>
                </div>
              </div>

              {/* CV Created/Linked */}
              {journey.cvId && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <div className="flex-1">
                    <p className="text-small text-white font-medium">CV Created</p>
                    <p className="text-small text-white/60">
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
                    <p className="text-small text-white font-medium">ATS Score: {journey.atsScore}%</p>
                    <p className="text-small text-white/60">
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
                    <p className="text-small text-white font-medium">Cover Letter Created</p>
                    <p className="text-small text-white/60">
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
                    <p className="text-small text-white font-medium">Journey Completed</p>
                    <p className="text-small text-white/60">
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
                    <p className="text-small text-white font-medium">
                      Files Downloaded ({journey.downloadHistory.length} times)
                    </p>
                    <p className="text-small text-white/60">
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
                <p className="text-small text-white/60">Loading job details...</p>
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
                      <div className="flex flex-wrap items-center gap-3 text-small text-white/80">
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
                            <Star className={`h-3 w-3 ${job.priority === 'high' ? 'text-red-400' :
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
                        {job?.status && job.status !== 'draft' && job.status !== 'created' && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-400" />
                            <span className="capitalize">{job.status}</span>
                          </div>
                        )}
                      </div>

                      {/* Job Description (Compact) */}
                      {(job?.jobDescription || job?.description) ? (
                        <div className="relative">
                          <div className="text-small text-white/60 mb-1">Description:</div>
                          <div className="relative max-h-16 overflow-hidden">
                            <p className="text-small text-white/80 whitespace-pre-wrap leading-relaxed">
                              {job.jobDescription || job.description}
                            </p>
                            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                          </div>
                        </div>
                      ) : null}

                      {/* Secondary Info Row */}
                      <div className="flex flex-wrap items-center gap-3 text-small text-white/60">
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
                            <span className="text-small text-white/60">
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
                            className="text-small text-green-400 hover:text-green-300 underline transition-colors"
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
              <div className="p-2 text-center text-white/60 text-small">
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
              <h4 className="text-small font-medium text-white">Select CV</h4>
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
                return hasMasterCV;
              })() && (
                  <motion.button
                    onClick={handleDuplicateMasterCV}
                    className="w-full p-2 text-left bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4 text-blue-400" />
                      <div>
                        <p className="text-small font-medium text-blue-400">Duplicate Master CV</p>
                        <p className="text-small text-blue-300">Create a copy of your master CV</p>
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
                        <p className="text-small font-medium text-white truncate">
                          {cv.title} {(() => {
                            const isMasterAtRoot = cv.isMaster === true;
                            const isMasterInMetadata = cv.metadata?.isMaster === true;
                            const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
                            return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
                          })() && <span className="text-yellow-400">(Master)</span>}
                        </p>
                        <p className="text-small text-white/60">
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
                <div className="p-3 text-center text-white/60 text-small">
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
              <h4 className="text-small font-medium text-white">Select Cover Letter</h4>
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
                    <p className="text-small font-medium text-blue-300">Duplicate Default Template</p>
                    <p className="text-small text-blue-200">Start with a fresh template</p>
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
                      <p className="text-small font-medium text-white truncate">{cl.title}</p>
                      <p className="text-small text-white/60">
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
              <h4 className="text-small font-medium text-gray-900 dark:text-white">Select a different CV</h4>
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
                          <p className="text-small text-blue-200">Create a copy of your master CV for this journey</p>
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
                      className={`w-full p-3 rounded-lg border text-left transition-all ${String(cv.id) === String(journey.cvId)
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
                              <span className="px-2 py-1 text-small bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-small text-gray-500 dark:text-gray-400">
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
                <p className="text-gray-500 dark:text-gray-400 text-small">No CVs found</p>
                <p className="text-gray-400 dark:text-gray-500 text-small mt-1">
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
                <p className="text-small font-medium text-gray-900 dark:text-white">
                  Journey Completed!
                </p>
                <p className="text-small text-gray-600 dark:text-gray-400">
                  Undo available for 5 seconds
                </p>
              </div>
              <button
                onClick={handleUndoComplete}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-small rounded transition-colors"
              >
                Undo
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">
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
                <span className="text-small text-gray-600 dark:text-gray-400">Download Files</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-small rounded">Ctrl+D</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-small text-gray-600 dark:text-gray-400">Move to Applied</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-small rounded">Ctrl+A</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-small text-gray-600 dark:text-gray-400">Show Shortcuts</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-small rounded">Ctrl+?</kbd>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-small text-gray-500 dark:text-gray-400">
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
              await handleDownloadFiles('cv', format);
              await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between downloads
              await handleDownloadFiles('coverLetter', format);
              setDownloadModalOpen(false);
              setIsDownloading(false);
              return;
            } else if (documentType === 'all') {
              apiType = 'all';
            }

            await handleDownloadFiles(apiType, format);
            setDownloadModalOpen(false);
          } catch (error) {
            console.error('Download error:', error);
            // Error handling is done in handleDownloadFiles
          } finally {
            setIsDownloading(false);
          }
        }}
        hasCV={!!journey.cvId && !cvNotFound}
        hasCoverLetter={!!journey.coverLetterId && !coverLetterNotFound}
        isDownloading={isDownloading}
        cvType="journey"
        cvId={journey.cvId}
        coverLetterId={journey.coverLetterId}
        onPaywallRequired={() => {
          openPaymentModal({
            preselectedPlanKey: 'pro_monthly',
            triggerContext: 'docx-export',
            returnUrl: window.location.href
          });
          setDownloadModalOpen(false);
        }}
      />

      <DocumentPreviewSidebar
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        documentType={previewDocumentType!}
        documentData={previewDocumentData}
        cvData={linkedCV?.cvData || linkedCV}
        jobData={jobDetails}
      />
    </motion.div>
  );
};

export default JourneyTimelineCard;
