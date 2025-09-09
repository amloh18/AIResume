'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Download, 
  Plus, 
  ExternalLink, 
  ArrowRight,
  Sparkles,
  Search,
  Settings,
  Mail,
  Rocket,
  Link,
  Edit3,
  Eye,
  Star
} from 'lucide-react';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useUserPlan } from '@/lib/hooks/useUserPlan';
import ATSScoreAnalyzer from '@/components/studio/ATSScoreAnalyzer';
import AddJobModal from './AddJobModal';
import CVSelectionStep from '@/components/journey/CVSelectionStep';

interface JobPipelineCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
  onJourneyUpdated?: () => void; // Callback to refresh journey data
}

interface CV {
  id: string;
  title: string;
  status: string;
  lastModified: string;
  completionPercentage?: number;
  metadata?: {
    atsScore?: number;
    atsScoreDate?: Date;
    atsScoreJobId?: string;
  };
}

interface CoverLetter {
  id: string;
  title: string;
  status: string;
  lastModified: string;
  jobId?: string;
}

const JobPipelineCardModal: React.FC<JobPipelineCardModalProps> = ({ isOpen, onClose, jobId, onJourneyUpdated }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { state, updateJourneyStatus, updateJobInfo, updateCurrentStep, updateCVId, updateCoverLetterId, updateAtsScore, updateCurrentJobId, endJourney } = useJobJourney();
  const { hasAI } = useUserPlan();
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [userCVs, setUserCVs] = useState<CV[]>([]);
  const [userCoverLetters, setUserCoverLetters] = useState<CoverLetter[]>([]);
  const [showCVSelector, setShowCVSelector] = useState(false);
  const [showCoverLetterSelector, setShowCoverLetterSelector] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsKeywords, setAtsKeywords] = useState<string[]>([]);
  const [isRunningATSCheck, setIsRunningATSCheck] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [isSelectingJob, setIsSelectingJob] = useState(false);
  const [jobSelectionSuccess, setJobSelectionSuccess] = useState(false);
  const [isSelectingCV, setIsSelectingCV] = useState(false);
  const [cvSelectionSuccess, setCvSelectionSuccess] = useState(false);
  const [selectedCV, setSelectedCV] = useState<any>(null);
  const [jobFormData, setJobFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    salary: '',
    description: '',
    requirements: '',
    jobUrl: ''
  });

  const { currentStep, steps, jobTitle, company } = state;

  // Step definitions with enhanced metadata
  const stepDefinitions = [
    {
      id: 1,
      name: 'Job Creation',
      icon: Briefcase,
      description: 'Define or select the job you want to apply for',
      primaryAction: 'Enter Job Details',
      secondaryAction: 'Link from List',
      color: 'blue'
    },
    {
      id: 2,
      name: 'CV Creation',
      icon: FileText,
      description: 'Craft a professional resume or select one you\'ve already made',
      primaryAction: 'Create New CV',
      secondaryAction: 'Link Existing CV',
      color: 'green'
    },
    {
      id: 3,
      name: 'ATS Scoring',
      icon: Settings,
      description: 'Maximize your chances of passing the ATS and getting noticed',
      primaryAction: 'Run ATS Check',
      secondaryAction: 'View Keywords',
      color: 'purple'
    },
    {
      id: 4,
      name: 'Cover Letter',
      icon: Mail,
      description: 'Create a personalized cover letter that tells your unique story',
      primaryAction: 'Generate with AI',
      secondaryAction: 'Link Existing Letter',
      color: 'orange'
    },
    {
      id: 5,
      name: 'Apply',
      icon: Rocket,
      description: 'Your application is complete. Download or apply directly',
      primaryAction: 'Download Documents',
      secondaryAction: 'Move to Applied',
      color: 'lime'
    }
  ];

  useEffect(() => {
    console.log('🔍 JobPipelineCardModal - useEffect triggered:', { jobId, sessionUserId: session?.user?.id });
    
    if (jobId && jobId !== 'temp' && session?.user?.id) {
      fetchJobData(jobId);
    } else if (!jobId || jobId === 'temp') {
      setJobData(null);
      // Reset CV selection state for new journeys
      setSelectedCV(null);
      setCvSelectionSuccess(false);
    }
  }, [jobId, session?.user?.id]);

  // Fetch journey state from database and restore complete state
  const fetchJourneyStateFromDatabase = async (jobId: string, availableCVs: CV[] = []) => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      console.log('🔍 JobPipelineCardModal - Fetching journey state from database for jobId:', jobId);
      
      // Fetch the specific journey from the database
      const response = await fetch(`/api/journeys?userId=${userId}&jobId=${jobId}`);
      if (!response.ok) {
        console.error('❌ Failed to fetch journey state from database');
        return;
      }

      const journeyData = await response.json();
      console.log('🔍 JobPipelineCardModal - Journey data from database:', journeyData);

      if (journeyData.success && journeyData.data?.journeys?.length > 0) {
        const journey = journeyData.data.journeys[0];
        console.log('🔍 JobPipelineCardModal - Found journey in database:', {
          id: journey.id,
          currentStep: journey.currentStep,
          status: journey.status,
          cvId: journey.cvId,
          atsScore: journey.atsScore,
          coverLetterId: journey.coverLetterId
        });

        // Update the journey context with database state
        updateCurrentJobId(jobId);
        updateJobInfo(journey.jobTitle, journey.company);
        updateCurrentStep(journey.currentStep);
        updateJourneyStatus(journey.status === 'completed' ? 'completed' : 'job-added');

        // Set local state based on database state
        setJobSelectionSuccess(true);

        // Restore CV state if linked - try both userCVs and passed availableCVs
        if (journey.cvId) {
          let linkedCV = userCVs.find(cv => cv.id === journey.cvId);
          if (!linkedCV && availableCVs.length > 0) {
            linkedCV = availableCVs.find(cv => cv.id === journey.cvId);
          }
          
          if (linkedCV) {
            setSelectedCV(linkedCV);
            setCvSelectionSuccess(true);
            updateCVId(journey.cvId);
            console.log('🔍 JobPipelineCardModal - Restored CV from database:', linkedCV.title);
            
            // Check if CV has ATS score for this job in metadata (priority over journey ATS score)
            if (linkedCV.metadata?.atsScore && linkedCV.metadata?.atsScoreJobId === jobId) {
              setAtsScore(linkedCV.metadata.atsScore);
              updateAtsScore(linkedCV.metadata.atsScore);
              console.log('🔍 JobPipelineCardModal - Restored ATS score from CV metadata (priority):', linkedCV.metadata.atsScore);
            } else if (journey.atsScore) {
              // Fallback to journey ATS score if CV doesn't have metadata for this job
              setAtsScore(journey.atsScore);
              updateAtsScore(journey.atsScore);
              console.log('🔍 JobPipelineCardModal - Restored ATS score from journey (fallback):', journey.atsScore);
            }
          } else {
            // CV exists in database but not loaded yet - mark as selected
            setCvSelectionSuccess(true);
            updateCVId(journey.cvId);
            console.log('🔍 JobPipelineCardModal - CV linked in database but not found in local arrays:', journey.cvId);
            
            // Still restore ATS score from journey if available
            if (journey.atsScore) {
              setAtsScore(journey.atsScore);
              updateAtsScore(journey.atsScore);
              console.log('🔍 JobPipelineCardModal - Restored ATS score from journey (CV not found locally):', journey.atsScore);
            }
          }
        }

        // This is now handled in the CV restoration section above to avoid overriding CV metadata scores

        // Restore cover letter if linked
        if (journey.coverLetterId) {
          updateCoverLetterId(journey.coverLetterId);
          console.log('🔍 JobPipelineCardModal - Restored cover letter from database:', journey.coverLetterId);
        }

        console.log('✅ JobPipelineCardModal - Successfully restored journey state from database');
        return true; // Indicate successful restoration
      } else {
        console.log('🔍 JobPipelineCardModal - No journey found in database, initializing new journey');
        updateCurrentStep(1);
        updateJourneyStatus('onboarding');
        setJobSelectionSuccess(false);
        setSelectedCV(null);
        setCvSelectionSuccess(false);
        setAtsScore(null);
        setAtsKeywords([]);
        return false;
      }
    } catch (error) {
      console.error('❌ Error fetching journey state from database:', error);
      // Fallback to default state
      updateCurrentStep(1);
      updateJourneyStatus('onboarding');
      setJobSelectionSuccess(false);
      setSelectedCV(null);
      setCvSelectionSuccess(false);
      setAtsScore(null);
      setAtsKeywords([]);
      return false;
    }
  };

  // Initialize modal state - separate from CV loading to avoid race conditions
  useEffect(() => {
    if (jobId && jobId !== 'temp' && session?.user?.id) {
      console.log('🔍 JobPipelineCardModal - Initialized with existing job:', jobId);
      // Try to fetch journey state immediately, then again when CVs are loaded
      fetchJourneyStateFromDatabase(jobId, userCVs);
    } else if (jobId === 'temp') {
      console.log('🔍 JobPipelineCardModal - Initialized with new journey');
      updateCurrentStep(1);
      updateJourneyStatus('onboarding');
      setJobSelectionSuccess(false);
      setSelectedCV(null);
      setCvSelectionSuccess(false);
      setAtsScore(null);
      setAtsKeywords([]);
    }
  }, [jobId, session?.user?.id]);

  // Re-fetch journey state when CVs are loaded to restore CV and ATS data
  useEffect(() => {
    if (jobId && jobId !== 'temp' && userCVs.length > 0 && session?.user?.id) {
      console.log('🔍 JobPipelineCardModal - CVs loaded, re-fetching journey state to restore CV data');
      fetchJourneyStateFromDatabase(jobId, userCVs);
    }
  }, [userCVs.length, jobId, session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      loadUserDocuments();
      loadAvailableJobs();
    }
  }, [session?.user?.id]);

  // Check if there's a CV already linked from the journey context
  useEffect(() => {
    if (state.cvId && userCVs.length > 0) {
      const linkedCV = userCVs.find(cv => cv.id === state.cvId);
      if (linkedCV && !selectedCV) {
        setSelectedCV(linkedCV);
        setCvSelectionSuccess(true);
        console.log('🔍 JobPipelineCardModal - Restored CV from journey context:', linkedCV.title);
        
        // Also check for ATS score in CV metadata for this job
        if (linkedCV.metadata?.atsScore && linkedCV.metadata?.atsScoreJobId === jobId && !atsScore) {
          setAtsScore(linkedCV.metadata.atsScore);
          updateAtsScore(linkedCV.metadata.atsScore);
          console.log('🔍 JobPipelineCardModal - Restored ATS score from CV metadata:', linkedCV.metadata.atsScore);
        }
      }
    }
  }, [state.cvId, userCVs, selectedCV, jobId, atsScore]);

  // Debug CV restoration
  useEffect(() => {
    console.log('🔍 JobPipelineCardModal - CV State Debug:', {
      cvSelectionSuccess,
      selectedCV: selectedCV ? selectedCV.title : null,
      jobDataCvId: jobData?.cvId,
      stateCvId: state.cvId,
      userCVsCount: userCVs.length,
      currentStep
    });
  }, [cvSelectionSuccess, selectedCV, jobData?.cvId, state.cvId, userCVs.length, currentStep]);

  // Sync local state with journey context state
  useEffect(() => {
    console.log('🔍 JobPipelineCardModal - State Sync Debug:', {
      stateCvId: state.cvId,
      stateAtsScore: state.atsScore,
      stateCoverLetterId: state.coverLetterId,
      stateCurrentJobId: state.currentJobId,
      stateCurrentStep: state.currentStep,
      localAtsScore: atsScore,
      localSelectedCV: selectedCV ? selectedCV.title : null,
      localCvSelectionSuccess: cvSelectionSuccess
    });

    // Sync ATS score from journey context if not already set
    if (state.atsScore !== null && atsScore === null) {
      setAtsScore(state.atsScore);
      console.log('🔍 JobPipelineCardModal - Synced ATS score from journey context:', state.atsScore);
    }

    // Sync CV selection from journey context
    if (state.cvId && !selectedCV && userCVs.length > 0) {
      const linkedCV = userCVs.find(cv => cv.id === state.cvId);
      if (linkedCV) {
        setSelectedCV(linkedCV);
        setCvSelectionSuccess(true);
        console.log('🔍 JobPipelineCardModal - Synced CV selection from journey context:', linkedCV.title);
        
        // Also check for ATS score in CV metadata
        if (linkedCV.metadata?.atsScore && linkedCV.metadata?.atsScoreJobId === jobId && !atsScore) {
          setAtsScore(linkedCV.metadata.atsScore);
          updateAtsScore(linkedCV.metadata.atsScore);
          console.log('🔍 JobPipelineCardModal - Synced ATS score from CV metadata:', linkedCV.metadata.atsScore);
        }
      }
    }
  }, [state.cvId, state.atsScore, state.coverLetterId, state.currentJobId, state.currentStep, atsScore, selectedCV, cvSelectionSuccess, userCVs, jobId]);

  // Additional state restoration when userCVs are loaded
  useEffect(() => {
    if (userCVs.length > 0 && state.cvId && !selectedCV) {
      console.log('🔍 JobPipelineCardModal - Additional CV restoration attempt:', {
        stateCvId: state.cvId,
        userCVsCount: userCVs.length,
        selectedCV: selectedCV ? selectedCV.title : null
      });
      
      const linkedCV = userCVs.find(cv => cv.id === state.cvId);
      if (linkedCV) {
        setSelectedCV(linkedCV);
        setCvSelectionSuccess(true);
        console.log('🔍 JobPipelineCardModal - Additional CV restoration successful:', linkedCV.title);
        
        // Check for ATS score in CV metadata
        if (linkedCV.metadata?.atsScore && linkedCV.metadata?.atsScoreJobId === jobId && !atsScore) {
          setAtsScore(linkedCV.metadata.atsScore);
          updateAtsScore(linkedCV.metadata.atsScore);
          console.log('🔍 JobPipelineCardModal - Restored ATS score from additional CV restoration:', linkedCV.metadata.atsScore);
        }
      } else {
        console.log('🔍 JobPipelineCardModal - CV not found in userCVs:', state.cvId);
      }
    }
  }, [userCVs, state.cvId, selectedCV, jobId, atsScore]);

  // Monitor step 5 completion and mark journey as completed
  useEffect(() => {
    if (currentStep === 5) {
      const step5Status = getStepStatus(5);
      if (step5Status === 'completed') {
        console.log('🔍 JobPipelineCardModal - Step 5 completed, marking journey as completed');
        endJourney();
        updateJourneyStatus('completed');
        // Notify parent components that journey has been updated
        if (onJourneyUpdated) {
          onJourneyUpdated();
        }
      }
    }
  }, [currentStep, jobData, selectedCV, cvSelectionSuccess, atsScore, state.atsScore, state.coverLetterId, userCoverLetters, jobId, endJourney, updateJourneyStatus, onJourneyUpdated]);

  // Notify parent when modal is closed after significant changes
  useEffect(() => {
    if (!isOpen && onJourneyUpdated) {
      // Small delay to ensure all state updates are complete
      const timeoutId = setTimeout(() => {
        onJourneyUpdated();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, onJourneyUpdated]);

  // Check if there's a job already linked from the journey context
  useEffect(() => {
    if (state.currentJobId && availableJobs.length > 0 && !jobData) {
      const linkedJob = availableJobs.find(job => (job._id || job.id) === state.currentJobId);
      if (linkedJob) {
        setJobData(linkedJob);
        setJobSelectionSuccess(true);
        updateJobInfo(linkedJob.jobTitle || linkedJob.title, linkedJob.company);
        console.log('🔍 JobPipelineCardModal - Restored job from journey context:', linkedJob.jobTitle || linkedJob.title);
      }
    }
  }, [state.currentJobId, availableJobs, jobData]);

  const fetchJobData = async (jobId: string) => {
    try {
      setIsLoadingJob(true);
      const userId = session?.user?.id;
      if (!userId) throw new Error('User not authenticated');
      
      console.log('🔍 JobPipelineCardModal - Fetching job data:', { jobId, userId });
      
      // Use the individual job endpoint to get complete job data including cvId
      const response = await fetch(`/api/jobs/${jobId}?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch job data');
      
      const responseData = await response.json();
      const jobData = responseData.job;
      
      if (!jobData) throw new Error('Job not found');
      
      console.log('🔍 JobPipelineCardModal - Job data fetched:', {
        id: jobData.id,
        title: jobData.title || jobData.jobTitle,
        company: jobData.company,
        cvId: jobData.cvId
      });
      
      setJobData(jobData);
      updateJobInfo(jobData.title || jobData.jobTitle, jobData.company);
    } catch (error) {
      console.error('Error fetching job data:', error);
      const mockJobData = {
        id: jobId,
        jobTitle: 'Job Title',
        company: 'Company Name',
        location: 'Location',
        description: 'Job description...'
      };
      setJobData(mockJobData);
      updateJobInfo(mockJobData.jobTitle, mockJobData.company);
    } finally {
      setIsLoadingJob(false);
    }
  };

  const loadUserDocuments = async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      console.log('🔍 JobPipelineCardModal - Loading user documents for userId:', userId);

      // Load CVs with metadata (including ATS scores)
      const cvResponse = await fetch(`/api/cvs?userId=${userId}&type=cv`);
      if (cvResponse.ok) {
        const cvData = await cvResponse.json();
        if (cvData.success) {
          const cvs = cvData.data.cvs || [];
          console.log('🔍 JobPipelineCardModal - Loaded CVs:', cvs.length, 'CVs with metadata');
          setUserCVs(cvs);
        }
      }

      // Load Cover Letters
      console.log('🔍 JobPipelineCardModal - Fetching cover letters for userId:', userId);
      const coverResponse = await fetch(`/api/cover-letters?userId=${userId}`);
      if (coverResponse.ok) {
        const coverData = await coverResponse.json();
        console.log('🔍 JobPipelineCardModal - Cover letter response:', coverData);
        if (coverData.success) {
          setUserCoverLetters(coverData.data.coverLetters || []);
          console.log('🔍 JobPipelineCardModal - Set cover letters:', coverData.data.coverLetters?.length || 0);
        } else {
          console.error('❌ JobPipelineCardModal - Cover letter fetch failed:', coverData.message);
        }
      } else {
        console.error('❌ JobPipelineCardModal - Cover letter API request failed:', coverResponse.status);
      }
    } catch (error) {
      console.error('Error loading user documents:', error);
    }
  };

  const loadAvailableJobs = async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      // Load jobs with status 'created'
      const response = await fetch(`/api/jobs?userId=${userId}&status=created`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableJobs(data.data.jobs || []);
        }
      }
    } catch (error) {
      console.error('Error loading available jobs:', error);
    }
  };

  const handleStepClick = (stepId: number) => {
    const status = getStepStatus(stepId);
    if (status === 'completed' || status === 'active') {
      updateCurrentStep(stepId);
    }
  };

  const handlePrimaryAction = (stepId: number) => {
    switch (stepId) {
      case 1:
        if (!jobId || jobId === 'temp') {
          setShowJobForm(!showJobForm);
        }
        break;
      case 2:
        handleCreateCV();
        break;
      case 3:
        handleATSCheck();
        break;
      case 4:
        handleCoverLetter();
        break;
      case 5:
        handleDownload();
        break;
    }
  };

  const handleSecondaryAction = (stepId: number) => {
    switch (stepId) {
      case 1:
        setShowJobDropdown(!showJobDropdown);
        break;
      case 2:
        setShowCVSelector(true);
        break;
      case 3:
        // View keywords - could show keyword analysis
        console.log('View keywords');
        break;
      case 4:
        setShowCoverLetterSelector(true);
        break;
      case 5:
        // Move to applied stage
        handleDownload();
        break;
    }
  };

  const handleJobSelect = async (selectedJob: any) => {
    try {
      setIsSelectingJob(true);
      const userId = session?.user?.id;
      if (!userId) return;

      console.log('🔍 JobPipelineCardModal - Selecting job:', selectedJob);

      // Update local state and journey
      setJobData(selectedJob);
      updateJobInfo(selectedJob.title || selectedJob.jobTitle, selectedJob.company);
      updateJourneyStatus('job-added');
      setShowJobDropdown(false);
      setJobSelectionSuccess(true);
      
      // Move to next step (Step 2: CV Creation)
      updateCurrentStep(2);
      
      // Update the journey context with the selected job ID FIRST
      const jobId = selectedJob._id || selectedJob.id;
      if (jobId) {
        updateCurrentJobId(jobId);
        
        // Update URL with job ID to maintain state
        const newUrl = `/dashboard/cv-journey?jobId=${jobId}`;
        router.replace(newUrl);
        console.log('🔍 JobPipelineCardModal - Updated URL with jobId:', jobId);
        console.log('🔍 JobPipelineCardModal - Job selected successfully, moving to step 2');
      }
    } catch (error) {
      console.error('Error selecting job and moving to next step:', error);
    } finally {
      setIsSelectingJob(false);
    }
  };

  const handleCreateCV = () => {
    const studioUrl = jobId ? `/studio?jobId=${jobId}&mode=cv-onboarding` : '/studio?mode=cv-onboarding';
    router.push(studioUrl);
    onClose();
  };

  const handleATSCheck = async () => {
    setIsRunningATSCheck(true);
    try {
      if (!selectedCV || !jobData) {
        console.error('❌ Missing CV or Job data for ATS check');
        return;
      }

      console.log('🔍 JobPipelineCardModal - Running ATS check:', {
        cvId: selectedCV.id,
        jobId: jobData._id || jobData.id,
        cvTitle: selectedCV.title,
        jobTitle: jobData.jobTitle || jobData.title
      });

      // Call the ATS API with CV ID and Job ID
      const response = await fetch('/api/ats/calculate-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvText: JSON.stringify(selectedCV.cvData), // Convert CV data to text
          jobDescription: jobData.jobDescription || jobData.description || '',
          cvData: selectedCV.cvData,
          cvId: selectedCV.id,
          jobId: jobData._id || jobData.id
        }),
      });

      if (response.ok) {
        const atsResult = await response.json();
        setAtsScore(atsResult.score);
        setAtsKeywords(atsResult.details?.matchedKeywords || []);
        updateAtsScore(atsResult.score);
        
        // Move to next step (Step 4: Cover Letter)
        updateCurrentStep(4);
        
        // Notify parent components that journey has been updated
        if (onJourneyUpdated) {
          onJourneyUpdated();
        }
        
        console.log('✅ ATS check completed successfully:', atsResult.score);
      } else {
        console.error('❌ ATS check failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error running ATS check:', error);
    } finally {
      setIsRunningATSCheck(false);
    }
  };

  const handleCoverLetter = () => {
    const studioUrl = jobId ? `/studio?jobId=${jobId}&mode=cover-letter-edit` : '/studio?mode=cover-letter-edit';
    router.push(studioUrl);
    onClose();
  };

  const handleDownload = async () => {
    try {
      const userId = session?.user?.id;
      if (!userId || !jobId) return;

      // Update the job status to 'applied' when all steps are completed
      const updateResponse = await fetch(`/api/jobs/${jobId}?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'applied',
          applicationDate: new Date()
        }),
      });

      if (updateResponse.ok) {
        console.log('✅ Job status updated to applied - all steps completed');
        // Update journey status to completed
        updateJourneyStatus('completed');
      } else {
        console.error('❌ Failed to update job status to applied');
      }
    } catch (error) {
      console.error('Error updating job status to applied:', error);
    }
    
    console.log('Downloading files for job:', jobId);
  };

  const handleJobAdded = async (job: any) => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      console.log('🔍 JobPipelineCardModal - Job added:', job);

      // Update local state and journey
      setJobData(job);
      updateJobInfo(job.jobTitle, job.company);
      updateJourneyStatus('job-added');
      setShowJobForm(false);
      setJobSelectionSuccess(true);
      
      // Move to next step (Step 2: CV Creation)
      updateCurrentStep(2);
      
      // Update the journey context with the new job ID FIRST
      const jobId = job._id || job.id;
      if (jobId) {
        updateCurrentJobId(jobId);
        
        // Update URL with job ID to maintain state
        const newUrl = `/dashboard/cv-journey?jobId=${jobId}`;
        router.replace(newUrl);
        console.log('🔍 JobPipelineCardModal - Updated journey with new job ID:', jobId);
        console.log('🔍 JobPipelineCardModal - Job created successfully, moving to step 2');
      }
    } catch (error) {
      console.error('Error adding new job and moving to next step:', error);
    }
  };

  const handleJobFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobTitle: jobFormData.jobTitle,
          company: jobFormData.company,
          location: jobFormData.location,
          salary: jobFormData.salary ? { amount: jobFormData.salary, currency: 'USD', period: 'yearly' } : undefined,
          description: jobFormData.description,
          requirements: jobFormData.requirements,
          jobUrl: jobFormData.jobUrl,
          status: 'created',
          priority: 'medium',
          applicationDate: new Date(),
          notes: '',
          tags: []
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          handleJobAdded(result.data);
          setJobFormData({ jobTitle: '', company: '', location: '', salary: '', description: '', requirements: '', jobUrl: '' });
        }
      }
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const handleCVSelect = async (cv: CV) => {
    try {
      setIsSelectingCV(true);
      const userId = session?.user?.id;
      if (!userId || !jobData) {
        console.error('❌ Missing userId or jobData for CV selection');
        return;
      }

      console.log('🔍 JobPipelineCardModal - Selecting CV:', cv.title, 'for job:', jobData.title || jobData.jobTitle);

      // Update the job with the linked CV
      const jobUpdateResponse = await fetch(`/api/jobs/${jobId}?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvId: cv.id
        }),
      });

      if (jobUpdateResponse.ok) {
        console.log('✅ Job linked to CV successfully');
        // Update the local jobData to reflect the CV link
        setJobData((prev: any) => ({ ...prev, cvId: cv.id }));
      } else {
        console.error('❌ Failed to link job to CV');
      }

      // Update local state and journey
      setSelectedCV(cv);
      updateCVId(cv.id);
      updateJourneyStatus('cv-created');
      setShowCVSelector(false);
      setCvSelectionSuccess(true);
      
      // Move to next step (Step 3: ATS Scoring)
      updateCurrentStep(3);
      
      // Notify parent components that journey has been updated
      if (onJourneyUpdated) {
        onJourneyUpdated();
      }
      
      console.log('🔍 JobPipelineCardModal - CV selection completed, moved to step 3');
    } catch (error) {
      console.error('Error selecting CV and moving to next step:', error);
    } finally {
      setIsSelectingCV(false);
    }
  };

  // New enhanced CV selection handler for the CVSelectionStep component
  const handleCVSelectionStepComplete = async (cvId: string, action: 'existing' | 'duplicate' | 'new') => {
    try {
      const userId = session?.user?.id;
      if (!userId || !jobData) {
        console.error('❌ Missing userId or jobData for CV selection');
        return;
      }

      console.log('🔍 JobPipelineCardModal - CV selection step completed:', { cvId, action });

      if (action === 'existing' || action === 'duplicate') {
        // Find the CV in our local array
        const selectedCVData = userCVs.find(cv => cv.id === cvId);
        
        if (selectedCVData) {
          // Update the job with the linked CV
          const jobUpdateResponse = await fetch(`/api/jobs/${jobId}?userId=${userId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cvId: cvId
            }),
          });

          if (jobUpdateResponse.ok) {
            console.log('✅ Job linked to CV successfully');
            setJobData((prev: any) => ({ ...prev, cvId: cvId }));
          }

          // Update local state and journey
          setSelectedCV(selectedCVData);
          updateCVId(cvId);
          updateJourneyStatus('cv-created');
          setCvSelectionSuccess(true);
          
          // Move to next step (Step 3: ATS Scoring)
          updateCurrentStep(3);
          
          if (onJourneyUpdated) {
            onJourneyUpdated();
          }
          
          console.log('🔍 JobPipelineCardModal - CV selection completed, moved to step 3');
        }
      } else if (action === 'new') {
        // Redirect to CV studio for new CV creation
        const params = new URLSearchParams({
          jobId: jobId || '',
          jobTitle: jobData?.title || jobData?.jobTitle || '',
          company: jobData?.company || ''
        });
        router.push(`/studio?${params.toString()}`);
      }
    } catch (error) {
      console.error('Error in CV selection step:', error);
    }
  };

  const handleCoverLetterSelect = async (coverLetter: CoverLetter) => {
    try {
      const userId = session?.user?.id;
      if (!userId || !jobData) {
        console.error('❌ Missing userId or jobData for cover letter selection');
        return;
      }

      console.log('🔍 JobPipelineCardModal - Selecting cover letter:', coverLetter.title, 'for job:', jobData.title || jobData.jobTitle);

      // Update the cover letter with the linked job ID
      const coverLetterUpdateResponse = await fetch(`/api/cover-letters/${coverLetter.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobData._id || jobData.id,
          userId: userId
        }),
      });

      if (coverLetterUpdateResponse.ok) {
        console.log('✅ Cover letter linked to job successfully');
      } else {
        console.error('❌ Failed to link cover letter to job');
      }

      // Update local state and journey
      updateCoverLetterId(coverLetter.id);
      updateJourneyStatus('cover-letter-created');
      setShowCoverLetterSelector(false);
      
      // Move to next step (Step 5: Apply)
      updateCurrentStep(5);
      
      console.log('🔍 JobPipelineCardModal - Cover letter selection completed, moved to step 5');
    } catch (error) {
      console.error('Error selecting cover letter and moving to next step:', error);
    }
  };

  const getStepStatus = (stepId: number) => {
    // Check actual database state for step completion
    let status: 'completed' | 'active' | 'pending' = 'pending';
    
    switch (stepId) {
      case 1: // Job Added
        status = (jobData || jobSelectionSuccess || (jobId && jobId !== 'temp')) ? 'completed' : 'pending';
        break;
      
      case 2: // CV Created/Linked
        // Check multiple sources for CV link - prioritize actual CV data over flags
        const linkedCVId = selectedCV?.id || state.cvId || (jobData && jobData.cvId);
        const hasCVLinked = linkedCVId && (
          selectedCV || 
          cvSelectionSuccess || 
          (userCVs.some(cv => cv.id === linkedCVId))
        );
        
        status = hasCVLinked ? 'completed' : 
                 (jobData || jobSelectionSuccess || (jobId && jobId !== 'temp')) ? 'active' : 'pending';
        break;
      
      case 3: // ATS Score Checked
        // Check multiple sources for ATS score including CV metadata
        const hasATSScore = atsScore !== null || 
                           (selectedCV && selectedCV.metadata?.atsScore && selectedCV.metadata?.atsScoreJobId === jobId) ||
                           state.atsScore !== null ||
                           (userCVs.some(cv => cv.metadata?.atsScore && cv.metadata?.atsScoreJobId === jobId && cv.id === state.cvId));
        
        const hasCVLinkedForATS = selectedCV || 
                                 cvSelectionSuccess || 
                                 (jobData && jobData.cvId) || 
                                 state.cvId ||
                                 (userCVs.some(cv => cv.id === state.cvId));
        
        status = hasATSScore ? 'completed' :
                 hasCVLinkedForATS ? 'active' : 'pending';
        break;
      
      case 4: // Cover Letter Created
        // Only consider cover letter completed if it's explicitly linked to this journey
        const hasCoverLetter = state.coverLetterId && state.coverLetterId.trim() !== '';
        
        const hasATSScoreForCoverLetter = atsScore !== null || 
                                         (selectedCV && selectedCV.metadata?.atsScore && selectedCV.metadata?.atsScoreJobId === jobId) ||
                                         state.atsScore !== null ||
                                         (userCVs.some(cv => cv.metadata?.atsScore && cv.metadata?.atsScoreJobId === jobId && cv.id === state.cvId));
        
        status = hasCoverLetter ? 'completed' :
                 hasATSScoreForCoverLetter ? 'active' : 'pending';
        break;
      
      case 5: // Download/Apply
        // Only consider cover letter completed if it's explicitly linked to this journey
        const hasCoverLetterForApply = state.coverLetterId && state.coverLetterId.trim() !== '';
        
        // Step 5 is completed if we have all previous steps completed
        const hasJob = jobData || jobSelectionSuccess || (jobId && jobId !== 'temp');
        const hasCV = selectedCV || cvSelectionSuccess || (jobData && jobData.cvId) || state.cvId;
        const hasATS = atsScore !== null || state.atsScore !== null || 
                      (selectedCV && selectedCV.metadata?.atsScore && selectedCV.metadata?.atsScoreJobId === jobId) ||
                      (userCVs.some(cv => cv.metadata?.atsScore && cv.metadata?.atsScoreJobId === jobId && cv.id === state.cvId));
        
        status = (hasJob && hasCV && hasATS && hasCoverLetterForApply) ? 'completed' : 
                 hasCoverLetterForApply ? 'active' : 'pending';
        break;
      
      default:
        status = 'pending';
    }
    
    console.log(`🔍 JobPipelineCardModal - Step ${stepId} status:`, {
      status,
      jobData: !!jobData,
      jobSelectionSuccess,
      selectedCV: !!selectedCV,
      cvSelectionSuccess,
      atsScore,
      stateAtsScore: state.atsScore,
      stateCvId: state.cvId,
      coverLetterId: state.coverLetterId,
      jobId,
      currentJobId: state.currentJobId,
      userCVsCount: userCVs.length,
      userCoverLettersCount: userCoverLetters.length,
      selectedCVMetadata: selectedCV?.metadata,
      hasCoverLetterCheck: stepId === 4 ? (state.coverLetterId && state.coverLetterId.trim() !== '') : undefined
    });
    
    return status;
  };

  const getStepColor = (stepId: number) => {
    const step = stepDefinitions.find(s => s.id === stepId);
    return step?.color || 'gray';
  };

    const renderStepContent = () => {
    const currentStepDef = stepDefinitions.find(s => s.id === currentStep);
    if (!currentStepDef) return null;

    const status = getStepStatus(currentStep);
    const isActive = status === 'active';

    return (
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col"
      >
        {/* Step Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-white mb-2">
            Step {currentStep}: {currentStepDef.name}
          </h2>
          <p className="text-white/60 text-sm">
            {currentStepDef.description}
          </p>
        </div>

        {/* Step-specific content */}
        <div>
          {currentStep === 1 && (
            <div>
              {jobSelectionSuccess || jobData ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-lime-500/20 to-green-500/20 rounded-lg p-4 border border-lime-500/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-lime-500/20 rounded-full">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Briefcase className="h-4 w-4 text-lime-400" />
                      </motion.div>
                    </div>
                    <h3 className="text-base font-semibold text-white">Job Selected Successfully!</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">{jobData?.title || jobData?.jobTitle}</p>
                    <p className="text-white/60 text-sm">{jobData?.company}</p>
                    {jobData?.location && (
                      <p className="text-white/40 text-xs">{jobData.location}</p>
                    )}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 text-xs text-lime-300"
                  >
                    ✓ Job selected successfully • Moving to Step 2: CV Creation
                  </motion.div>
                </motion.div>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-left">
                    <Briefcase className="h-8 w-8 text-blue-400 mb-3" />
                    <h3 className="text-base font-semibold text-white mb-2">No Job Selected</h3>
                    <p className="text-white/60 text-sm">Start by adding the job you want to apply for</p>
                  </div>
                </div>
              )}
              
              {/* Job Selection Dropdown */}
              {showJobDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-lg border border-white/10 mt-2"
                >
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-white mb-2">Select from Created Jobs</h4>
                    {availableJobs.length === 0 ? (
                      <p className="text-white/60 text-xs">No jobs in 'Created' stage found</p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {availableJobs.map((job) => (
                          <button
                            key={job.id || job._id}
                            onClick={() => handleJobSelect(job)}
                            disabled={isSelectingJob}
                            className="w-full text-left p-2 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-white font-medium">{job.title || job.jobTitle}</div>
                                <div className="text-xs text-white/60">{job.company}</div>
                              </div>
                              {isSelectingJob && (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Settings className="h-3 w-3 text-lime-400" />
                                </motion.div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div>
              {(() => {
                const linkedCVId = selectedCV?.id || state.cvId || (jobData && jobData.cvId);
                const hasCVLinked = linkedCVId && (
                  selectedCV || 
                  cvSelectionSuccess || 
                  (userCVs.some(cv => cv.id === linkedCVId)) ||
                  (jobData && jobData.cvId)
                );
                return hasCVLinked;
              })() ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-green-500/20 rounded-full">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <FileText className="h-4 w-4 text-green-400" />
                      </motion.div>
                    </div>
                    <h3 className="text-base font-semibold text-white">CV Selected Successfully!</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">
                      {selectedCV?.title || 
                       (state.cvId && userCVs.find(cv => cv.id === state.cvId)?.title) ||
                       (jobData?.cvId && userCVs.find(cv => cv.id === jobData.cvId)?.title) ||
                       'Linked CV'}
                    </p>
                    <p className="text-white/60 text-sm">CV Document</p>
                    {(selectedCV || state.cvId || jobData?.cvId) && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => {
                            const cvIdToEdit = selectedCV?.id || state.cvId || jobData?.cvId;
                            if (cvIdToEdit) {
                              router.push(`/studio?cvId=${cvIdToEdit}`);
                            }
                          }}
                          className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Edit CV
                        </button>
                      </div>
                    )}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 text-xs text-green-300"
                  >
                    ✓ CV linked successfully • Moving to Step 3: ATS Scoring
                  </motion.div>
                </motion.div>
              ) : (
                <CVSelectionStep
                  jobTitle={jobData?.title || jobData?.jobTitle}
                  company={jobData?.company}
                  jobId={jobId}
                  onCVSelected={handleCVSelectionStepComplete}
                  onBack={() => updateCurrentStep(1)}
                />
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div>
              {(() => {
                // Check if ATS score exists either locally or from CV metadata
                const currentATSScore = atsScore || 
                                       (selectedCV && selectedCV.metadata?.atsScore && selectedCV.metadata?.atsScoreJobId === jobId ? selectedCV.metadata.atsScore : null) ||
                                       state.atsScore;
                
                console.log('🔍 JobPipelineCardModal - Step 3 ATS check:', {
                  atsScore,
                  selectedCVMetadata: selectedCV?.metadata,
                  stateAtsScore: state.atsScore,
                  currentATSScore,
                  jobId
                });
                
                return currentATSScore !== null;
              })() ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg p-4 border border-purple-500/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-purple-500/20 rounded-full">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Settings className="h-4 w-4 text-purple-400" />
                      </motion.div>
                    </div>
                    <h3 className="text-base font-semibold text-white">ATS Score Completed!</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">
                      ATS Score: {atsScore || 
                                 (selectedCV && selectedCV.metadata?.atsScore && selectedCV.metadata?.atsScoreJobId === jobId ? selectedCV.metadata.atsScore : null) ||
                                 state.atsScore}%
                    </p>
                    <p className="text-white/60 text-sm">CV optimized for ATS systems</p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 text-xs text-purple-300"
                  >
                    ✓ ATS check completed successfully • Moving to Step 4: Cover Letter
                  </motion.div>
                </motion.div>
              ) : (
                <div>
                  {hasAI ? (
                    // Pro users get the full ATS analyzer
                    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                      <div className="p-4 border-b border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings className="h-5 w-5 text-purple-400" />
                          <h3 className="text-base font-semibold text-white">ATS Score Analyzer</h3>
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">PRO</span>
                        </div>
                        <p className="text-white/60 text-sm">
                          Advanced ATS analysis with detailed insights and optimization suggestions
                        </p>
                      </div>
                      <div className="p-4">
                        {jobData && selectedCV ? (
                          <ATSScoreAnalyzer
                            cvData={selectedCV.cvData}
                            jobData={jobData}
                            onScoreUpdate={(score) => {
                              setAtsScore(score);
                              updateAtsScore(score);
                            }}
                            onUpdateField={(path, value) => {
                              // Handle CV field updates if needed
                              console.log('CV field update:', path, value);
                            }}
                          />
                        ) : (
                          <div className="text-center py-8">
                            <Settings className="h-12 w-12 text-white/40 mx-auto mb-4" />
                            <p className="text-white/60 text-sm mb-2">Job and CV Required</p>
                            <p className="text-white/40 text-xs">
                              Please complete Steps 1 and 2 to run ATS analysis
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Settings className="h-5 w-5 text-purple-400" />
                        <h3 className="text-base font-semibold text-white">ATS Optimization</h3>
                      </div>
                      <p className="text-white/60 text-sm">
                        Run an ATS check to see how well your CV matches the job requirements
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div>
              {state.coverLetterId && state.coverLetterId.trim() !== '' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-4 border border-orange-500/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-orange-500/20 rounded-full">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Mail className="h-4 w-4 text-orange-400" />
                      </motion.div>
                    </div>
                    <h3 className="text-base font-semibold text-white">Cover Letter Selected!</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">Cover Letter Linked</p>
                    <p className="text-white/60 text-sm">Ready for application</p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 text-xs text-orange-300"
                  >
                    ✓ Cover letter linked successfully • Moving to Step 5: Apply
                  </motion.div>
                </motion.div>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-left">
                    <Mail className="h-8 w-8 text-orange-400 mb-3" />
                    <h3 className="text-base font-semibold text-white mb-2">Cover Letter Required</h3>
                    <p className="text-white/60 text-sm mb-4">Create or select a cover letter for this job application</p>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowCoverLetterSelector(!showCoverLetterSelector)}
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                      >
                        Select Existing Cover Letter
                      </button>
                      <button
                        onClick={() => {
                          // Navigate to cover letter creation with job and CV data
                          const params = new URLSearchParams({
                            type: 'cover',
                            jobId: jobId || '',
                            cvId: selectedCV?.id || state.cvId || ''
                          });
                          router.push(`/studio?${params.toString()}`);
                        }}
                        className="w-full px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm border border-white/20"
                      >
                        Create New Cover Letter
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Cover Letter Selection Dropdown */}
              {showCoverLetterSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-lg border border-white/10 mt-2"
                >
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-white mb-2">Select from Your Cover Letters</h4>
                    {userCoverLetters.length === 0 ? (
                      <p className="text-white/60 text-xs">No cover letters found. Create your first cover letter!</p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {userCoverLetters.map((coverLetter) => (
                          <button
                            key={coverLetter.id}
                            onClick={() => handleCoverLetterSelect(coverLetter)}
                            className="w-full text-left p-2 hover:bg-white/10 rounded transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-white font-medium">{coverLetter.title}</div>
                                <div className="text-xs text-white/60">Cover Letter</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Rocket className="h-5 w-5 text-lime-400" />
                  <h3 className="text-base font-semibold text-white">Ready to Apply!</h3>
                </div>
                <p className="text-white/60 text-sm">
                  Your application is complete. Download your documents or apply directly.
                </p>
                
                {/* Summary */}
                <div className="bg-white/10 rounded-lg p-3 mt-3">
                  <h4 className="text-white font-medium mb-2 text-sm">Application Summary</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/60">Job:</span>
                      <span className="text-white">{jobData?.title || jobData?.jobTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Company:</span>
                      <span className="text-white">{jobData?.company}</span>
                    </div>
                    {atsScore && (
                      <div className="flex justify-between">
                        <span className="text-white/60">ATS Score:</span>
                        <span className="text-white">{atsScore}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4 mt-4">
          <motion.button
            onClick={() => handlePrimaryAction(currentStep)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              isActive
                ? 'bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-black shadow-lg'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            disabled={!isActive}
          >
            {currentStep === 3 && isRunningATSCheck ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Settings className="h-3 w-3" />
                </motion.div>
                Running Check...
              </>
            ) : (
              <>
                {currentStep === 4 && <Sparkles className="h-3 w-3" />}
                {currentStep === 1 && showJobForm ? 'Cancel' : currentStepDef.primaryAction}
                {currentStep === 1 && showJobForm ? <X className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
              </>
            )}
          </motion.button>

          {currentStepDef.secondaryAction && !showJobForm && (
            <motion.button
              onClick={() => handleSecondaryAction(currentStep)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              {currentStep === 1 && <Search className="h-3 w-3" />}
              {currentStep === 2 && <FileText className="h-3 w-3" />}
              {currentStep === 3 && <Eye className="h-3 w-3" />}
              {currentStep === 4 && <Mail className="h-3 w-3" />}
              {currentStep === 5 && <Rocket className="h-3 w-3" />}
              {currentStepDef.secondaryAction}
            </motion.button>
          )}
        </div>

        {/* Job Form */}
        <AnimatePresence>
          {showJobForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-white/5 rounded-lg border border-white/10 p-4 mt-2 max-h-96 overflow-y-auto">
                <form onSubmit={handleJobFormSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={jobFormData.jobTitle}
                      onChange={(e) => setJobFormData({ ...jobFormData, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                      placeholder="e.g., Senior Software Engineer"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Company *</label>
                    <input
                      type="text"
                      value={jobFormData.company}
                      onChange={(e) => setJobFormData({ ...jobFormData, company: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                      placeholder="e.g., Tech Corp"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Location</label>
                    <input
                      type="text"
                      value={jobFormData.location}
                      onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                      placeholder="e.g., San Francisco, CA"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Salary Range</label>
                    <input
                      type="text"
                      value={jobFormData.salary}
                      onChange={(e) => setJobFormData({ ...jobFormData, salary: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                      placeholder="e.g., $80,000 - $120,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Job URL</label>
                    <input
                      type="url"
                      value={jobFormData.jobUrl}
                      onChange={(e) => setJobFormData({ ...jobFormData, jobUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Job Description</label>
                    <textarea
                      value={jobFormData.description}
                      onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors resize-none"
                      placeholder="Brief description of the role..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Requirements</label>
                    <textarea
                      value={jobFormData.requirements}
                      onChange={(e) => setJobFormData({ ...jobFormData, requirements: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors resize-none"
                      placeholder="Key requirements and skills..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <motion.button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-black rounded-lg text-sm font-medium transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Create Job
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        {currentStep === 2 && (
          <div className="mt-6">
            <motion.img
              src="/images/CV Creation step 2.png"
              alt="CV Creation Step"
              className="w-48 h-auto mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        )}

        {currentStep === 3 && (
          <div className="mt-6">
            <motion.img
              src="/images/ATS scoring step 3.png"
              alt="ATS Scoring Step"
              className="w-48 h-auto mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        )}

        {currentStep === 4 && (
          <div className="mt-6">
            <motion.img
              src="/images/Cover Letter step 4.png"
              alt="Cover Letter Step"
              className="w-48 h-auto mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        )}

        {currentStep === 5 && (
          <div className="mt-6">
            <motion.img
              src="/images/Apply step5.png"
              alt="Apply Step"
              className="w-48 h-auto mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl w-fit max-w-[95vw] max-h-[75vh] overflow-hidden shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Job Application Journey</h2>
                {isLoadingJob ? (
                  <p className="text-gray-600 dark:text-white/60 text-xs mt-1">Loading job details...</p>
                ) : jobData ? (
                  <div className="text-gray-600 dark:text-white/60 text-xs mt-1">
                    <p>{jobData.title || jobData.jobTitle} at {jobData.company}</p>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-white/60 text-xs mt-1">Create a new CV journey</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Two-Column Layout */}
            <div className="flex max-h-[70vh]">
              {/* Left Column - Timeline Progress */}
              <div className="w-72 bg-white/5 border-r border-white/10 p-4 overflow-y-auto">
                <h3 className="text-base font-semibold text-white mb-4">Progress Timeline</h3>
                
                <div className="space-y-4">
                  {stepDefinitions.map((step, index) => {
                    const status = getStepStatus(step.id);
                    const isCompleted = status === 'completed';
                    const isActive = status === 'active';
                    const IconComponent = step.icon;
                    
                    return (
                      <motion.div
                        key={step.id}
                        className={`relative cursor-pointer transition-all duration-200 ${
                          isCompleted ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-60'
                        }`}
                        onClick={() => handleStepClick(step.id)}
                        whileHover={(isCompleted || isActive) ? { scale: 1.02 } : {}}
                      >
                        {/* Progress Line */}
                        {index < stepDefinitions.length - 1 && (
                          <div className={`absolute left-5 top-10 w-0.5 h-8 ${
                            isCompleted ? 'bg-green-500' : 'bg-white/20'
                          }`} />
                        )}

                        <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                          isCompleted
                            ? 'bg-green-500/10 border-green-500/20'
                            : isActive
                            ? 'bg-lime-500/10 border-lime-500/20'
                            : 'bg-white/5 border-white/10'
                        } border`}>
                          
                          {/* Step Icon */}
                          <div className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                            isCompleted
                              ? 'bg-green-500 text-black'
                              : isActive
                              ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/25'
                              : 'bg-white/10 text-white/40'
                          }`}>
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </motion.div>
                            ) : (
                              <IconComponent className="h-4 w-4" />
                            )}
                          </div>

                          {/* Step Content */}
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium transition-colors ${
                              isCompleted ? 'text-green-400' : isActive ? 'text-white' : 'text-white/60'
                            }`}>
                              {step.name}
                            </h4>
                            <p className={`text-xs transition-colors ${
                              isCompleted ? 'text-green-400/60' : isActive ? 'text-white/60' : 'text-white/40'
                            }`}>
                              {step.description}
                            </p>
                          </div>

                          {/* Status Indicator */}
                          {isActive && (
                            <motion.div
                              className="w-2 h-2 bg-lime-400 rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Progress Summary */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                    <span>Progress</span>
                    <span>{currentStep === 1 && !jobData ? '0%' : `${Math.round((currentStep / stepDefinitions.length) * 100)}%`}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <motion.div
                      className="bg-gradient-to-r from-lime-400 to-lime-500 h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: currentStep === 1 && !jobData ? '0%' : `${(currentStep / stepDefinitions.length) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

                             {/* Right Column - Content & Actions */}
               <div className="w-[576px] p-4 overflow-y-auto flex flex-col relative">
                 {/* Background Image */}
                 <div className="absolute inset-0 opacity-10 pointer-events-none">
                   <motion.img
                     src={currentStep === 1 ? "/images/Create JOB step 1.png" :
                          currentStep === 2 ? "/images/CV Creation step 2.png" :
                          currentStep === 3 ? "/images/ATS scoring step 3.png" :
                          currentStep === 4 ? "/images/Cover Letter step 4.png" :
                          currentStep === 5 ? "/images/Apply step5.png" : "/images/Create JOB step 1.png"}
                     alt="Background"
                     className="w-full h-full object-cover"
                     initial={{ opacity: 0, scale: 1.2 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ duration: 0.8, delay: 0.3 }}
                     key={currentStep}
                   />
                 </div>
                 
                 {/* Content */}
                 <div className="relative z-10">
                   {renderStepContent()}
                 </div>
               </div>
            </div>
          </motion.div>

          {/* Add Job Modal */}
          <AddJobModal
            isOpen={showAddJobModal}
            onClose={() => setShowAddJobModal(false)}
            onJobAdded={handleJobAdded}
          />

          {/* CV Selection Modal */}
          <AnimatePresence>
            {showCVSelector && (
              <motion.div
                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Select CV</h3>
                    <button
                      onClick={() => setShowCVSelector(false)}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {userCVs.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No CVs found</p>
                      <p className="text-white/40 text-sm">Create a CV first to link it to this journey</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userCVs.map((cv) => (
                        <motion.button
                          key={cv.id}
                          onClick={() => handleCVSelect(cv)}
                          className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors text-left"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-green-400" />
                              <div>
                                <h4 className="text-white font-medium">{cv.title}</h4>
                                <p className="text-white/60 text-sm">
                                  {cv.completionPercentage ? `${cv.completionPercentage}% complete` : 'Draft'}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-white/40" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cover Letter Selection Modal */}
          <AnimatePresence>
            {showCoverLetterSelector && (
              <motion.div
                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Select Cover Letter</h3>
                    <button
                      onClick={() => setShowCoverLetterSelector(false)}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {userCoverLetters.length === 0 ? (
                    <div className="text-center py-8">
                      <Mail className="h-12 w-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No cover letters found</p>
                      <p className="text-white/40 text-sm">Create a cover letter first to link it to this journey</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userCoverLetters.map((coverLetter) => (
                        <motion.button
                          key={coverLetter.id}
                          onClick={() => handleCoverLetterSelect(coverLetter)}
                          className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors text-left"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-orange-400" />
                              <div>
                                <h4 className="text-white font-medium">{coverLetter.title}</h4>
                                <p className="text-white/60 text-sm">
                                  {coverLetter.status === 'published' ? 'Published' : 'Draft'}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-white/40" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobPipelineCardModal;
