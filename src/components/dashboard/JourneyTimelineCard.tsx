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
  X
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useUserPlan } from '@/lib/hooks/useUserPlan';

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
            console.log('🔍 JourneyTimelineCard - Loaded CVs:', cvs.length, 'CVs');
            console.log('🔍 JourneyTimelineCard - CV titles:', cvs.map(cv => cv.title));
            setUserCVs(cvs);
            
            // Filter freestanding CVs (not master CVs and not linked to other journeys)
            const freestanding = cvs.filter((cv: CV) => 
              cv.isMaster !== true && (cv.journeyId === null || cv.journeyId === undefined)
            );
            console.log('🔍 JourneyTimelineCard - Freestanding CVs:', freestanding.length);
            console.log('🔍 JourneyTimelineCard - Freestanding CV titles:', freestanding.map(cv => cv.title));
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
      const response = await fetch(`/api/cv-journey`, {
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
      console.log('🔍 JourneyTimelineCard - Duplicating master CV');
      
      // Find the master CV
      const masterCV = userCVs.find(cv => cv.isMaster);
      if (!masterCV) {
        toast.error('No master CV found. Please create a master CV first.');
        return;
      }

      // Call the duplicate CV API to create a freestanding CV
      const response = await fetch('/api/cvs/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCvId: masterCV.id,
          userId: mongoDBUserId,
          // Don't pass journeyId to create a freestanding CV
          // journeyId: null will be set by default in the API
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ JourneyTimelineCard - Master CV duplicated successfully:', result);
        
        // Refresh the CV list to show the new freestanding CV
        if (onRefresh) {
          onRefresh();
        }
        
        toast.success('Master CV duplicated successfully! You can now link it to this journey.');
      } else {
        const errorData = await response.json();
        console.error('❌ JourneyTimelineCard - Failed to duplicate master CV:', errorData);
        const errorMessage = errorData.error || errorData.message || 'Failed to duplicate master CV. Please try again.';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ JourneyTimelineCard - Error duplicating master CV:', error);
      toast.error('Failed to duplicate master CV. Please try again.');
    }
    
    setExpandedStep(null);
  };

  const fetchATSScore = async (cvId: string, jobId: string) => {
    if (!cvId || !jobId || atsScoreLoading) return;
    
    setAtsScoreLoading(true);
    try {
      console.log('🔍 JourneyTimelineCard - Fetching ATS score for CV:', cvId, 'Job:', jobId);
      
      const response = await fetch('/api/ats/calculate-score', {
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
        
        if (result.score !== undefined) {
          setAtsScore(result.score);
          
          // Update journey with ATS score in database
          const journeyResponse = await fetch('/api/cv-journey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: mongoDBUserId,
              jobId: jobId,
              atsScore: result.score,
              currentStep: result.score >= 80 ? 4 : 3
            })
          });
          
          if (journeyResponse.ok) {
            console.log('✅ JourneyTimelineCard - ATS score saved to journey');
          }
          
          // Update journey context
          updateAtsScore(result.score);
          
          // Update journey status based on score
          if (result.score >= 80) {
            updateJourneyStatus('ats-checked');
            updateCurrentStep(4);
            toast.success(`ATS score calculated: ${result.score}% - Great match!`);
          } else {
            updateJourneyStatus('ats-needs-improvement');
            toast.info(`ATS score calculated: ${result.score}% - Consider optimizing for better match`);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ JourneyTimelineCard - Failed to fetch ATS score:', response.status, errorData);
        
        // Set a flag to prevent retrying when we get 400 errors (missing data)
        if (response.status === 400) {
          console.log('🚫 JourneyTimelineCard - ATS calculation failed due to missing data, not retrying');
          setAtsScore(-1); // Use -1 to indicate failed calculation
          
          // Show specific error message
          const errorMessage = errorData.error || 'Missing CV or job data for ATS calculation';
          toast.error(errorMessage);
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
      const response = await fetch('/api/ats-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvId: journey.cvId,
          jobId: journey.jobId,
          userId: mongoDBUserId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          updateAtsScore(result.data.score);
          fetch(`/api/cv-journey`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: mongoDBUserId,
              jobId: journey.jobId,
              atsScore: result.data.score
            })
          });
        }
      }
    } catch (error) {
      console.error('Error running ATS check:', error);
    } finally {
      setIsRunningATSCheck(false);
    }
  };

  const handleCreateCoverLetter = () => {
    router.push(`/studio?type=cover_letter&jobId=${journey.jobId}&cvId=${journey.cvId}&mode=cover-letter-edit`);
  };

  const handleSelectCoverLetter = (coverLetterId: string) => {
    updateCoverLetterId(coverLetterId);
    const selectedCoverLetter = userCoverLetters.find(cl => String(cl.id) === String(coverLetterId));
    setLinkedCoverLetter(selectedCoverLetter || null);
    fetch(`/api/cv-journey`, {
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
  
  const steps = [
    { id: 1, label: 'Add Job', icon: Briefcase, color: 'blue' },
    { id: 2, label: 'Create CV', icon: FileText, color: 'green' },
    { id: 3, label: 'ATS Score', icon: CheckCircle, color: 'purple' },
    { id: 4, label: 'Cover Letter', icon: FileText, color: 'orange' },
    { id: 5, label: 'Download', icon: Download, color: 'lime' }
  ];

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      className="bg-gradient-to-r from-lime-500/10 to-lime-600/10 border border-lime-500/20 rounded-xl overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-300 group"
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
              <Building className="h-5 w-5 text-lime-400" />
              <div>
                <h3 className="text-sm font-medium text-white">
                  {journey.jobTitle}
                </h3>
                <p className="text-xs text-white/60">{journey.company}</p>
              </div>
            </div>

            {/* Progress Steps - Clickable */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((stepId) => {
                const status = getStepStatus(stepId);
                return (
                  <motion.button
                    key={stepId}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      status === 'completed' 
                        ? 'bg-lime-500 text-black' 
                        : status === 'active' 
                        ? 'bg-lime-400 text-black' 
                        : 'bg-white/20 text-white/60 hover:bg-white/30'
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
              className="px-3 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Eye className="h-3 w-3" />
              {isExpanded ? 'Hide' : 'Details'}
            </motion.button>
            
            {liveProgress.status === 'completed' ? (
              <motion.button
                onClick={() => onDownload(journey)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors text-sm"
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
            className="border-t border-lime-500/20 bg-black/20 overflow-hidden"
          >
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Step 1: Job */}
                <div className={`p-3 rounded-lg border ${
                  getStepStatus(1) === 'completed' 
                    ? 'bg-lime-500/10 border-lime-500/30' 
                    : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-medium text-white">Job</span>
                    {getStepStatus(1) === 'completed' && (
                      <CheckCircle className="h-3 w-3 text-lime-400" />
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
                    ? 'bg-lime-500/10 border-lime-500/30' 
                    : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-medium text-white">CV</span>
                    {getStepStatus(2) === 'completed' && (
                      <CheckCircle className="h-3 w-3 text-lime-400" />
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
                            userCVs.some(cv => cv.isMaster) && (
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
                          <motion.button
                            onClick={() => router.push(`/studio?journeyId=${journey.id}&cvId=${journey.cvId}`)}
                            className="mt-1 text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Edit
                          </motion.button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <motion.button
                        onClick={handleCreateCV}
                        className="w-full px-2 py-1 bg-lime-500 hover:bg-lime-600 text-black text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="h-3 w-3" />
                        Create CV
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
                        userCVs.some(cv => cv.isMaster) && (
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
                  )}
                </div>

                {/* Step 3: ATS Score */}
                <div className={`p-3 rounded-lg border ${
                  getStepStatus(3) === 'completed' 
                    ? 'bg-lime-500/10 border-lime-500/30' 
                    : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-medium text-white">ATS Score</span>
                    {getStepStatus(3) === 'completed' && (
                      <CheckCircle className="h-3 w-3 text-lime-400" />
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
                          <p className={`text-xs font-medium ${
                            atsScore >= 80 ? 'text-green-400' : 
                            atsScore >= 60 ? 'text-yellow-400' : 
                            'text-red-400'
                          }`}>
                            {atsScore}%
                          </p>
                          <p className="text-xs text-white/60">
                            {atsScore >= 80 ? 'ATS Optimized' : 'Needs Improvement'}
                          </p>
                          {atsScore < 80 && (
                            <motion.button
                              onClick={() => router.push(`/studio?journeyId=${journey.id}&cvId=${journey.cvId}&mode=ats-edit`)}
                              className="mt-1 text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Settings className="h-3 w-3" />
                              Fix ATS
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
                    ? 'bg-lime-500/10 border-lime-500/30' 
                    : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-orange-400" />
                    <span className="text-xs font-medium text-white">Cover Letter</span>
                    {getStepStatus(4) === 'completed' && (
                      <CheckCircle className="h-3 w-3 text-lime-400" />
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
                            className="mt-1 text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
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
                    ? 'bg-lime-500/10 border-lime-500/30' 
                    : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="h-4 w-4 text-lime-400" />
                    <span className="text-xs font-medium text-white">Ready</span>
                    {getStepStatus(5) === 'completed' && (
                      <CheckCircle className="h-3 w-3 text-lime-400" />
                    )}
                  </div>
                  {getStepStatus(5) === 'completed' ? (
                    <div>
                      <p className="text-xs text-white font-medium">Complete</p>
                      <p className="text-xs text-white/60">Ready to apply</p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/60">In progress</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Inline CV Selector */}
        {expandedStep === 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg"
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
                const hasMasterCV = userCVs.some(cv => cv.isMaster);
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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                freestandingCVs.map((cv) => (
                  <motion.button
                    key={cv.id}
                    onClick={() => handleSelectCV(cv.id)}
                    className="w-full p-2 text-left bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded border border-gray-200 dark:border-white/10 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-white truncate">
                          {cv.title} {cv.isMaster && <span className="text-yellow-400">(Master)</span>}
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
            className="mt-3 p-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg"
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
              {userCoverLetters.map((cl) => (
                <motion.button
                  key={cl.id}
                  onClick={() => handleSelectCoverLetter(cl.id)}
                  className="w-full p-2 text-left bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded border border-gray-200 dark:border-white/10 transition-colors"
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


    </motion.div>
  );
};

export default JourneyTimelineCard;
