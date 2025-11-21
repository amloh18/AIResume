'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetch, authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import {
  X, Briefcase, MapPin, DollarSign, Calendar, ExternalLink,
  FileText, CheckCircle, Clock, AlertCircle, Plus, Edit, Trash2,
  Target, Building2, Star, Copy, Archive, ChevronDown, User, Mail, Phone
} from 'lucide-react';

// Ensure all icons are properly tree-shaken and available
// This prevents HMR issues with missing icon exports
import JourneyTimelineCard from '../JourneyTimelineCard';
import JobInfoContent from '../JobInfoContent';
import EditJobSidebar from './EditJobSidebar';
import toast from 'react-hot-toast';
import { useJobInsights, useJobFallbacks, formatJobDate, formatJobSalary, formatJobUrl } from '@/hooks/useJobInsights';
import { CVJourney } from '@/types/cv';
import { useRouter } from 'next/navigation';

interface JobApplication {
  id: string;
  _id: string;
  userId: string;
  jobTitle: string;
  title?: string; // For compatibility
  company: string;
  status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  jobDescription?: string;
  description?: string; // For compatibility
  location?: string;
  jobUrl?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  type?: string; // For compatibility
  source?: string;
  postedDate?: Date;
  applicationDate?: Date;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  sponsorship?: 'yes' | 'no' | 'unknown';
  tags?: string[];
  isArchived?: boolean;
  contactDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  createdAt: string;
  updatedAt: string;
}



interface JobSidebarProps {
  job: JobApplication;
  journeys: CVJourney[];
  onClose: () => void;
  onRefresh: () => void;
}

const JobSidebar: React.FC<JobSidebarProps> = ({
  job,
  journeys: initialJourneys,
  onClose,
  onRefresh
}) => {
  const { user } = useUnifiedAuth();
  const router = useRouter();
  const [isCreatingJourney, setIsCreatingJourney] = useState(false);
  const [journeys, setJourneys] = useState<CVJourney[]>(initialJourneys);
  const [loadingJourneys, setLoadingJourneys] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isJobDescriptionExpanded, setIsJobDescriptionExpanded] = useState(false);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cvData, setCvData] = useState<any>(null);
  const [loadingCV, setLoadingCV] = useState(false);
  
  // EditJobSidebar state for layered sidebar
  const [showEditJobSidebar, setShowEditJobSidebar] = useState(false);
  
  // Email sent confirmation state
  const [showEmailSentDialog, setShowEmailSentDialog] = useState(false);
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState<number | null>(null);
  const [emailSentStatus, setEmailSentStatus] = useState<Record<number, boolean>>({});
  
  // Dynamic data hooks
  const { insights, loading: insightsLoading } = useJobInsights(job.id);
  const fallbacks = useJobFallbacks();

  const loadJourneysForJob = async () => {
    if (!user?.id || !job?.id) return;

    setLoadingJourneys(true);
    try {
      console.log('🔍 Loading journeys for job:', job.id);
      const response = await authenticatedFetchWithUserId(`/api/application-journey?jobId=${job.id}`, user.id);
      const result = await response.json();

      if (result.success && result.data.journeys) {
        console.log('✅ Loaded journeys for job:', result.data.journeys);
        setJourneys(result.data.journeys);
      } else {
        console.log('ℹ️ No journeys found for job:', job.id);
        setJourneys([]);
      }
    } catch (error) {
      console.error('❌ Error loading journeys for job:', error);
      setJourneys([]);
    } finally {
      setLoadingJourneys(false);
    }
  };

  // Load CV data for user information
  const loadCVData = async (cvId?: string) => {
    if (!user?.id) return;

    setLoadingCV(true);
    try {
      // First try to get CV from journey if cvId provided
      let targetCvId = cvId;
      
      // If no cvId from journey, try to get master CV
      if (!targetCvId) {
        const masterCVResponse = await authenticatedFetchWithUserId('/api/cvs/master', user.id);
        const masterCVResult = await masterCVResponse.json();
        if (masterCVResult.success && masterCVResult.data?.masterCV) {
          targetCvId = masterCVResult.data.masterCV._id || masterCVResult.data.masterCV.id;
        }
      }
      
      if (targetCvId) {
        const cvResponse = await authenticatedFetchWithUserId(`/api/cvs/${targetCvId}`, user.id);
        const cvResult = await cvResponse.json();
        if (cvResult.success && cvResult.data?.cv) {
          setCvData(cvResult.data.cv.cvData);
        } else if (cvResult.cv?.cvData) {
          setCvData(cvResult.cv.cvData);
        }
      }
    } catch (error) {
      console.error('❌ Error loading CV data:', error);
      // Try to get master CV as fallback
      try {
        const masterCVResponse = await authenticatedFetchWithUserId('/api/cvs/master', user.id);
        const masterCVResult = await masterCVResponse.json();
        if (masterCVResult.success && masterCVResult.data?.masterCV?.cvData) {
          setCvData(masterCVResult.data.masterCV.cvData);
        }
      } catch (fallbackError) {
        console.error('❌ Error loading master CV:', fallbackError);
      }
    } finally {
      setLoadingCV(false);
    }
  };

  // Load journeys for this specific job when modal opens
  useEffect(() => {
    if (user?.id && job?.id) {
      loadJourneysForJob();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, job?.id]);

  // Load CV data when journeys are loaded or when modal opens
  useEffect(() => {
    if (user?.id) {
      // Try to get CV from first journey, otherwise get master CV
      const firstJourneyWithCV = journeys.find(j => j.cvId);
      if (firstJourneyWithCV?.cvId) {
        loadCVData(firstJourneyWithCV.cvId);
      } else {
        loadCVData(); // Will fetch master CV
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys, user?.id]);

  // Calculate days since job status last changed
  const getDaysSinceLastUpdate = (job: JobApplication) => {
    const lastUpdate = new Date(job.updatedAt);
    const now = new Date();
    return Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Determine if follow-up is needed based on stage and days
  const isFollowUpNeeded = (job: JobApplication) => {
    const days = getDaysSinceLastUpdate(job);
    
    switch(job.status) {
      case 'applied':
        return days >= 3 || days >= 7; // Show after 3 or 7 days
      case 'interview':
        return days >= 3 || days >= 7;
      case 'offer':
        return days >= 3 || days >= 7;
      case 'rejected':
        return false; // No follow-up for rejected
      default:
        return false;
    }
  };

  // Get follow-up suggestion text
  const getFollowUpSuggestion = (job: JobApplication, days: number) => {
    switch(job.status) {
      case 'applied':
        return `It's been ${days} days since you applied. Consider sending a polite follow-up email to check on your application status.`;
      case 'interview':
        return `It's been ${days} days since your interview. Consider reaching out to thank them and inquire about next steps.`;
      case 'offer':
        return `It's been ${days} days since receiving the offer. Make sure to respond within their deadline.`;
      default:
        return '';
    }
  };

  const getEmailSubject = (job: JobApplication) => {
    switch(job.status) {
      case 'applied':
        return `Following up on ${job.jobTitle} Application`;
      case 'screening':
        return `Re: ${job.jobTitle} Application - Screening Stage`;
      case 'interview':
        return `Thank you for the ${job.jobTitle} Interview`;
      case 'offer':
        return `Re: ${job.jobTitle} Offer`;
      case 'accepted':
        return `Acceptance: ${job.jobTitle} Position`;
      case 'rejected':
        return `Thank you - ${job.jobTitle} Application`;
      default:
        return 'Follow-up';
    }
  };

  // Get user name from CV data
  const getUserName = () => {
    if (cvData?.basics?.name) {
      return cvData.basics.name;
    }
    // Fallback to user from auth if available
    // Note: UnifiedUser uses 'name' property, not firstName/lastName
    if (user?.name) {
      return user.name;
    }
    return '[Your Name]';
  };

  // Get user email from CV data or user object
  const getUserEmail = () => {
    if (cvData?.basics?.email) {
      return cvData.basics.email;
    }
    if (user?.email) {
      return user.email;
    }
    return '';
  };

  // Create mailto link with subject and body
  const getMailtoLink = () => {
    const userEmail = getUserEmail();
    const recipientEmail = job.contactDetails?.email || '';
    const subject = encodeURIComponent(getEmailSubject(job));
    const body = encodeURIComponent(getEmailTemplate(job));
    
    // If we have a recipient email, use it; otherwise just open with subject and body
    if (recipientEmail) {
      return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    }
    return `mailto:?subject=${subject}&body=${body}`;
  };

  // Handle opening email client
  const handleOpenEmail = (timelineIndex?: number) => {
    const mailtoLink = getMailtoLink();
    if (mailtoLink) {
      // Set the timeline index first
      if (timelineIndex !== undefined) {
        setCurrentTimelineIndex(timelineIndex);
      }
      
      // Open email client
      window.location.href = mailtoLink;
      
      // Show confirmation dialog after a short delay to ensure email client opens
      setTimeout(() => {
        if (timelineIndex !== undefined) {
          setShowEmailSentDialog(true);
        }
      }, 500);
    } else {
      toast.error('Unable to create email. Please check your email settings.');
    }
  };

  // Handle email sent confirmation
  const handleEmailSentConfirmation = (sent: boolean) => {
    if (currentTimelineIndex !== null) {
      setEmailSentStatus(prev => ({
        ...prev,
        [currentTimelineIndex]: sent
      }));
      if (sent) {
        toast.success('Email sent status recorded!');
      }
    }
    setShowEmailSentDialog(false);
    setCurrentTimelineIndex(null);
  };

  // Get contact name from job details
  const getContactName = () => {
    if (job.contactDetails?.name) {
      return job.contactDetails.name;
    }
    return '[Hiring Manager]';
  };

  // Get interviewer name (could be contact name or hiring manager)
  const getInterviewerName = () => {
    if (job.contactDetails?.name) {
      return job.contactDetails.name;
    }
    if (job.contactDetails?.role) {
      return job.contactDetails.role;
    }
    return '[Interviewer Name]';
  };

  const getEmailTemplate = (job: JobApplication) => {
    const userName = getUserName();
    const contactName = getContactName();
    const interviewerName = getInterviewerName();
    
    const templates = {
      applied: `Dear ${contactName},

I hope this email finds you well. I recently applied for the ${job.jobTitle} position at ${job.company} and wanted to follow up on the status of my application.

I remain very interested in this opportunity and believe my skills and experience would be a great fit for your team. I would welcome the chance to discuss how I can contribute to ${job.company}.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
${userName}`,
      screening: `Dear ${contactName},

Thank you for considering my application for the ${job.jobTitle} position at ${job.company}. I was delighted to learn that my application has progressed to the screening stage.

I remain very enthusiastic about this opportunity and would be happy to provide any additional information or documentation you may need. Please don't hesitate to reach out if you have any questions.

Thank you for your time and consideration.

Best regards,
${userName}`,
      interview: `Dear ${interviewerName},

Thank you for taking the time to interview me for the ${job.jobTitle} position at ${job.company}. I enjoyed our conversation and learning more about the role and your team.

I'm very excited about the opportunity to contribute to ${job.company} and believe my skills align well with the position's requirements. 

I wanted to follow up to see if there are any updates on next steps in the hiring process. Please let me know if you need any additional information from me.

Thank you again for your consideration.

Best regards,
${userName}`,
      offer: `Dear ${contactName},

Thank you for extending an offer for the ${job.jobTitle} position at ${job.company}. I appreciate the opportunity and am excited about the possibility of joining your team.

I would like to discuss a few details regarding the offer. Could we schedule a call to go over the specifics?

Thank you for your patience, and I look forward to our conversation.

Best regards,
${userName}`,
      accepted: `Dear ${contactName},

I am thrilled to formally accept the offer for the ${job.jobTitle} position at ${job.company}. I am very excited about this opportunity and look forward to contributing to the team.

I understand the next steps will be communicated shortly, and I am ready to proceed with any onboarding requirements. Please let me know if there is anything you need from me in the meantime.

Thank you again for this wonderful opportunity. I am eager to get started!

Best regards,
${userName}`,
      rejected: `Dear ${contactName},

Thank you for considering my application for the ${job.jobTitle} position at ${job.company}. While I'm disappointed to learn that I wasn't selected for this role, I appreciate you taking the time to review my qualifications.

I remain interested in future opportunities at ${job.company} and would welcome the chance to be considered for other positions that may align with my skills and experience.

I wish you and the team all the best in finding the right candidate for this role.

Best regards,
${userName}`
    };
    return templates[job.status as keyof typeof templates] || '';
  };

  const getFollowUpTimeline = (job: JobApplication) => {
    const timelines = {
      applied: [
        { day: 'Day 3-5', action: 'Send initial follow-up email' },
        { day: 'Day 7-10', action: 'Connect with hiring manager on LinkedIn' },
        { day: 'Day 14', action: 'Send second follow-up if no response' }
      ],
      interview: [
        { day: 'Within 24 hours', action: 'Send thank-you email' },
        { day: 'Day 5-7', action: 'Follow up on timeline if not provided' },
        { day: 'Day 14', action: 'Send polite status inquiry if no update' }
      ],
      offer: [
        { day: 'Within 48 hours', action: 'Acknowledge receipt and express interest' },
        { day: 'Day 3-5', action: 'Ask clarifying questions or negotiate' },
        { day: 'Before deadline', action: 'Provide final decision' }
      ]
    };
    return timelines[job.status as keyof typeof timelines] || [];
  };

  const handleCreateJourney = async () => {
    if (isCreatingJourney) return; // Prevent multiple clicks
    
    try {
      setIsCreatingJourney(true);
      
      // Get userId from user
      const userId = user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      // Check if journey already exists for this job
      const existingJourney = journeys.find(j => j.jobId === job.id);
      
      if (existingJourney) {
        toast.success('A CV journey already exists for this job. You can continue with the existing journey.');
        return;
      }

      const response = await authenticatedFetchWithUserId('/api/application-journey', user.id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.jobTitle,
          company: job.company,
          cvId: null, // Will be set later
          coverLetterId: null, // Will be set later
          journeyType: 'standard'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.message === 'Journey updated successfully') {
          toast.success('CV journey updated successfully!');
        } else if (result.message === 'Journey already exists with current data') {
          toast.success('CV journey already exists with current data');
        } else {
          toast.success('CV journey created successfully!');
        }
        // Reload journeys immediately to show the new journey card
        await loadJourneysForJob();
        // Also refresh parent component
        await onRefresh();
      } else {
        const errorMessage = result.error || result.message || 'Failed to create journey';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating journey:', error);
      toast.error('Error creating journey. Please try again.');
    } finally {
      setIsCreatingJourney(false);
    }
  };

  const handleContinueJourney = (journey: any) => {
    // Navigate to studio with journey context (new architecture)
    // The studio will automatically determine document type and load appropriate data
    if (journey.atsScore && journey.atsScore >= 80 && journey.coverLetterId) {
      // If ATS score is good and cover letter exists, open cover letter
      router.push(`/studio?journeyId=${journey.id}&documentType=cl&mode=cledit`);
    } else {
      // Default to CV editing
      router.push(`/studio?journeyId=${journey.id}&documentType=cv&mode=cvedit`);
    }
  };

  const handleApplyNow = (journey: any) => {
    // Mark as applied and move job to applied stage
    console.log('Applying with journey:', journey.id);
    // TODO: Implement apply functionality
  };

  const handleUpdateJourney = (journeyId: string, updates: any) => {
    console.log('🔍 ApplicationJourneyModal - Updating journey:', journeyId, 'with updates:', updates);
    
    // Update the specific journey in local state
    setJourneys(prev => prev.map(journey => 
      journey.id === journeyId 
        ? { ...journey, ...updates }
        : journey
    ));
    
    console.log('✅ ApplicationJourneyModal - Journey updated in local state');
  };


  const handleDeleteJourney = async (journeyId: string) => {
    try {
      console.log('🔍 ApplicationJourneyModal - handleDeleteJourney called with journeyId:', journeyId);
      setIsDeleting(true);
      const userId = user?.id;
      if (!userId) {
        console.error('❌ ApplicationJourneyModal - No user ID available');
        return;
      }

      console.log('🔍 ApplicationJourneyModal - Deleting journey:', journeyId, 'userId:', userId);
      
      // Call the CV Journey API to delete the journey
      console.log('🔍 ApplicationJourneyModal - Making DELETE request to /api/application-journey');
      const response = await authenticatedFetchWithUserId('/api/application-journey', user.id, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId })
      });

      console.log('🔍 ApplicationJourneyModal - Response status:', response.status);
      console.log('🔍 ApplicationJourneyModal - Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ ApplicationJourneyModal - API error:', errorData);
        throw new Error(errorData.message || 'Failed to delete journey');
      }

      const result = await response.json();
      console.log('🔍 ApplicationJourneyModal - Journey deleted successfully:', result);

      // Remove from local state
      setJourneys(prev => prev.filter(journey => journey.id !== journeyId));
      
      // Close confirmation dialog
      setShowDeleteConfirm(null);
      
      // Show success message
      toast.success('CV journey deleted successfully');
      
      // Refresh the parent component
      await onRefresh();
    } catch (error) {
      console.error('Error deleting journey:', error);
      toast.error('Failed to delete journey. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for opening EditJobSidebar
  const handleOpenEditModal = () => {
    setShowEditJobSidebar(true);
  };

  // Handler for when job is saved in EditJobSidebar
  const handleEditJobSaved = (updatedJob: any) => {
    // Close the EditJobSidebar
    setShowEditJobSidebar(false);
    
    // Refresh the parent component to get updated data
    onRefresh();
    
    toast.success('Job updated successfully!');
  };

  const handleDuplicateJob = async () => {
    try {
      const userId = user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      const duplicatedJobData = {
        jobTitle: `${job.jobTitle} (Copy)`,
        company: job.company,
        location: job.location,
        jobUrl: job.jobUrl,
        jobDescription: job.jobDescription,
        notes: job.notes,
        priority: job.priority,
        status: 'created',
        applicationDate: undefined,
        deadline: job.deadline,
        salary: job.salary,
        sponsorship: job.sponsorship,
        tags: job.tags,
        userId: userId
      };

      const response = await authenticatedFetchWithUserId('/api/jobs', user.id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicatedJobData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to duplicate job');
      }

      toast.success('Job duplicated successfully!');
      onRefresh();
      
    } catch (error) {
      console.error('❌ Error duplicating job:', error);
      toast.error('Failed to duplicate job. Please try again.');
    }
  };

  const handleCopyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName === 'subject' ? 'Subject' : 'Email'} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDeleteJob = async () => {
    try {
      const userId = user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      // Use job._id if available, otherwise fall back to job.id
      const jobId = job._id || job.id;
      
      if (!jobId) {
        toast.error('Job ID not found. Please refresh and try again.');
        return;
      }

      console.log('🔍 JobSidebar - Deleting job with ID:', jobId);
      console.log('🔍 JobSidebar - Job object:', { id: job.id, _id: job._id });

      const response = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete job';
        try {
          // Check if response has content before parsing
          const contentType = response.headers.get('content-type');
          const hasJsonContent = contentType && contentType.includes('application/json');
          
          if (hasJsonContent) {
            const text = await response.text();
            if (text && text.trim()) {
              const errorData = JSON.parse(text);
              console.error('❌ JobSidebar - Delete failed:', errorData);
              
              // Check if errorData has meaningful content
              if (errorData && Object.keys(errorData).length > 0) {
                errorMessage = errorData.error || errorData.message || errorMessage;
              } else {
                // If empty object, use status text or status code
                errorMessage = response.statusText || `Server returned status ${response.status}`;
              }
            } else {
              // Empty response body
              errorMessage = response.statusText || `Server returned status ${response.status}`;
            }
          } else {
            // Not JSON response
            errorMessage = response.statusText || `Server returned status ${response.status}`;
          }
        } catch (parseError) {
          // If JSON parsing fails, use status text
          console.error('❌ JobSidebar - Failed to parse error response:', parseError);
          errorMessage = response.statusText || `Server returned status ${response.status}`;
        }
        
        console.error('❌ JobSidebar - Delete error details:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage
        });
        
        throw new Error(errorMessage);
      }

      toast.success('Job deleted successfully!');
      onClose(); // Close modal after deletion
      onRefresh();
      
    } catch (error) {
      console.error('❌ Error deleting job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete job. Please try again.');
    }
  };

  const handleArchiveJob = async () => {
    try {
      const userId = user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      const response = await authenticatedFetchWithUserId(`/api/jobs/${job.id}`, user.id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isArchived: !job.isArchived
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to archive job');
      }

      const result = await response.json();
      const updatedJob = result.job || result;
      if (updatedJob) {
        job.isArchived = updatedJob.isArchived;
      }

      toast.success(job.isArchived ? 'Job archived successfully!' : 'Job unarchived successfully!');
      onRefresh();
      
    } catch (error) {
      console.error('❌ Error archiving job:', error);
      toast.error('Failed to archive job. Please try again.');
    }
  };


  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);

  // Track window width for responsive sidebar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate sidebar width
  const sidebarWidth = useMemo(() => {
    return windowWidth >= 768 ? '50vw' : '100%';
  }, [windowWidth]);

  // Swipe gesture handling for mobile
  useEffect(() => {
    if (!sidebarRef.current) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.touches[0].clientX;
      const touchEndY = e.touches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      // Only handle horizontal swipes (swipe left to close)
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50) {
        onClose();
        touchStartX.current = null;
        touchStartY.current = null;
      }
    };

    const sidebar = sidebarRef.current;
    sidebar.addEventListener('touchstart', handleTouchStart);
    sidebar.addEventListener('touchmove', handleTouchMove);

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
    };
  }, [onClose]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed bg-black/50 backdrop-blur-sm z-40"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
          onClick={onClose}
        />

        {/* Sidebar */}
        <motion.div
          ref={sidebarRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 h-screen bg-white dark:bg-[#141810] shadow-2xl z-50 flex flex-col"
          style={{ width: sidebarWidth }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-4 sm:p-6 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">{job.jobTitle || job.title}</h2>
              <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">at</span>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">{job.company}</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <motion.button
                onClick={handleOpenEditModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Edit Job"
              >
                <Edit size={20} className="text-gray-600 dark:text-white/60" />
              </motion.button>
              <motion.button
                onClick={handleDeleteJob}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Delete Job"
              >
                <Trash2 size={20} className="text-gray-600 dark:text-white/60" />
              </motion.button>
              <motion.button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Close"
              >
                <X size={20} className="text-gray-600 dark:text-white/60" />
              </motion.button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-6 px-6 py-4">
              {/* Row 1: CV Journeys Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🎯 CV Journeys for this Job</h3>
                
                {journeys.length > 0 ? (
                  <div className="space-y-4">
                    {journeys
                      .filter(cvJourney => cvJourney.id)
                      .map((cvJourney, index) => {
                      const journey = {
                        id: cvJourney.id,
                        jobId: cvJourney.jobId,
                        jobTitle: cvJourney.jobTitle,
                        company: cvJourney.company,
                        status: cvJourney.status as 'in-progress' | 'completed',
                        currentStep: cvJourney.currentStep,
                        totalSteps: cvJourney.totalSteps,
                        createdAt: cvJourney.metadata.createdAt instanceof Date 
                          ? cvJourney.metadata.createdAt.toISOString()
                          : new Date(cvJourney.metadata.createdAt).toISOString(),
                        updatedAt: cvJourney.metadata.updatedAt instanceof Date 
                          ? cvJourney.metadata.updatedAt.toISOString()
                          : new Date(cvJourney.metadata.updatedAt).toISOString(),
                        atsScore: cvJourney.atsScore,
                        cvId: cvJourney.cvId,
                        coverLetterId: cvJourney.coverLetterId
                      };
                      
                      return (
                        <JourneyTimelineCard
                          key={journey.id || `journey-${index}`}
                          journey={journey}
                          onResume={handleContinueJourney}
                          onDownload={handleApplyNow}
                          onRefresh={onRefresh}
                          onUpdateJourney={handleUpdateJourney}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target size={32} className="text-gray-400 dark:text-white/40 mx-auto mb-3" />
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No CV Journeys Started</h4>
                    <p className="text-gray-600 dark:text-white/70 text-xs mb-3">
                      Create your first CV journey to start preparing for this job application.
                    </p>
                    <motion.button
                      onClick={handleCreateJourney}
                      disabled={isCreatingJourney}
                      className="px-4 py-2 bg-[#80FF00] hover:bg-[#70e600] text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: isCreatingJourney ? 1 : 1.02 }}
                      whileTap={{ scale: isCreatingJourney ? 1 : 0.98 }}
                    >
                      {isCreatingJourney ? 'Creating Journey...' : 'Create New CV Journey'}
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Row 2: Follow-up & Templates Section - Horizontal Ribbon */}
              {(isFollowUpNeeded(job) || job.status === 'applied' || job.status === 'screening' || job.status === 'interview' || job.status === 'offer' || job.status === 'accepted' || job.status === 'rejected') && (
                <div>
                  <div className="bg-gray-50 dark:bg-[#232f1c] border border-gray-200 dark:border-lime-500/20 rounded-2xl p-4">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-4">
                      <Mail size={18} className="text-lime-600 dark:text-[#80FF00]" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Follow-up & Templates</h3>
                    </div>

                    {/* Horizontal Timeline Ribbon */}
                    {getFollowUpTimeline(job).length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-4">
                        {getFollowUpTimeline(job).map((timeline, index) => {
                          const isEmailSent = emailSentStatus[index] === true;
                          return (
                            <div
                              key={index}
                              className={`flex-1 rounded-lg p-4 border shadow-sm transition-colors ${
                                isEmailSent
                                  ? 'bg-lime-50 dark:bg-lime-500/10 border-lime-300 dark:border-lime-500/50'
                                  : 'bg-white dark:bg-[#1A201A] border-lime-200 dark:border-lime-500/30'
                              }`}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                  isEmailSent
                                    ? 'bg-lime-500 dark:bg-lime-500/30'
                                    : 'bg-lime-100 dark:bg-lime-500/20'
                                }`}>
                                  <span className={`font-semibold text-xs ${
                                    isEmailSent
                                      ? 'text-white'
                                      : 'text-lime-600 dark:text-[#80FF00]'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-xs font-semibold mb-1 ${
                                    isEmailSent
                                      ? 'text-lime-700 dark:text-lime-300'
                                      : 'text-lime-600 dark:text-[#80FF00]'
                                  }`}>
                                    {timeline.day}
                                  </div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">
                                    {timeline.action}
                                  </div>
                                </div>
                              </div>
                              {getEmailTemplate(job) && (
                                <motion.button
                                  onClick={() => handleOpenEmail(index)}
                                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-lime-500/80 dark:bg-[#80FF00]/60 hover:bg-lime-600/80 dark:hover:bg-[#80FF00]/70 text-white rounded-lg text-xs font-medium transition-colors"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <Mail size={14} />
                                  Send Email
                                </motion.button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Row 3: Two Column Layout */}
              <div className="flex flex-col lg:flex-row gap-6 pb-6 min-w-0 w-full">
                {/* Column 1: Job Description, Job Info, Notes */}
                <div className="w-full lg:flex-[3] lg:flex-shrink min-w-0">
                  <div className="space-y-6">
                    {/* Job Description */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Job Description</h3>
                      <div className="bg-gray-50 dark:bg-[#232f1c] border border-gray-200 dark:border-lime-500/20 rounded-2xl p-4">
                        <div className="text-gray-700 dark:text-gray-300 text-sm space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                          {job.jobDescription ? (
                            <div className="whitespace-pre-wrap font-mono text-xs">
                              {job.jobDescription}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <FileText size={48} className="text-gray-500 mx-auto mb-4" />
                              <p className="text-gray-500 text-sm">
                                No job description provided yet.
                              </p>
                              <p className="text-gray-600 text-xs mt-2">
                                Add a job description in the job details to see it here.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Job Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Job Info</h3>
                      <div className="bg-gray-50 dark:bg-[#232f1c] border border-gray-200 dark:border-lime-500/20 rounded-2xl p-4">
                        <div className="space-y-4">
                          {job.location && (
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-xs text-gray-600 dark:text-white/60">Location</span>
                                <p className="text-sm text-gray-900 dark:text-white">{job.location}</p>
                              </div>
                            </div>
                          )}
                          
                          {job.jobUrl && (
                            <div className="flex items-center gap-2">
                              <ExternalLink size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-gray-600 dark:text-white/60">Job URL</span>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={job.jobUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-lime-600 dark:text-[#80FF00] hover:underline truncate"
                                  >
                                    {job.jobUrl}
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {job.salary && (job.salary.min || job.salary.max) && (
                            <div className="flex items-center gap-2">
                              <DollarSign size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-xs text-gray-600 dark:text-white/60">Salary</span>
                                <p className="text-sm text-gray-900 dark:text-white">
                                  {formatJobSalary(job.salary, fallbacks.defaultSalary)}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {job.applicationDate && (
                            <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-xs text-gray-600 dark:text-white/60">Application Date</span>
                                <p className="text-sm text-gray-900 dark:text-white">{formatDate(job.applicationDate)}</p>
                              </div>
                            </div>
                          )}
                          
                          {job.deadline && (
                            <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-xs text-gray-600 dark:text-white/60">Deadline</span>
                                <p className="text-sm text-gray-900 dark:text-white">{formatDate(job.deadline)}</p>
                              </div>
                            </div>
                          )}
                          
                          {job.jobType && (
                            <div className="flex items-center gap-2">
                              <Briefcase size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-xs text-gray-600 dark:text-white/60">Job Type</span>
                                <p className="text-sm text-gray-900 dark:text-white capitalize">{job.jobType}</p>
                              </div>
                            </div>
                          )}
                          
                          {job.source && (
                            <div className="flex items-center gap-2">
                              <Building2 size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-xs text-gray-600 dark:text-white/60">Source</span>
                                <p className="text-sm text-gray-900 dark:text-white capitalize">{job.source}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact Details Section */}
                    {job.contactDetails && (job.contactDetails.name || job.contactDetails.email || job.contactDetails.phone || job.contactDetails.role) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Contact Details</h3>
                        <div className="bg-gray-50 dark:bg-[#232f1c] border border-gray-200 dark:border-lime-500/20 rounded-2xl p-4">
                          <div className="space-y-4">
                            {job.contactDetails.name && (
                              <div className="flex items-center gap-2">
                                <User size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="text-xs text-gray-600 dark:text-white/60">Name</span>
                                  <p className="text-sm text-gray-900 dark:text-white">{job.contactDetails.name}</p>
                                </div>
                              </div>
                            )}
                            
                            {job.contactDetails.email && (
                              <div className="flex items-center gap-2">
                                <Mail size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs text-gray-600 dark:text-white/60">Email</span>
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={`mailto:${job.contactDetails.email}`}
                                      className="text-sm text-lime-600 dark:text-[#80FF00] hover:underline truncate"
                                    >
                                      {job.contactDetails.email}
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {job.contactDetails.phone && (
                              <div className="flex items-center gap-2">
                                <Phone size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="text-xs text-gray-600 dark:text-white/60">Phone</span>
                                  <a
                                    href={`tel:${job.contactDetails.phone}`}
                                    className="text-sm text-gray-900 dark:text-white hover:text-lime-600 dark:hover:text-[#80FF00]"
                                  >
                                    {job.contactDetails.phone}
                                  </a>
                                </div>
                              </div>
                            )}
                            
                            {job.contactDetails.role && (
                              <div className="flex items-center gap-2">
                                <Briefcase size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="text-xs text-gray-600 dark:text-white/60">Role</span>
                                  <p className="text-sm text-gray-900 dark:text-white">{job.contactDetails.role}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Notes</h3>
                      <div className="bg-gray-50 dark:bg-[#232f1c] border border-gray-200 dark:border-lime-500/20 rounded-2xl p-4">
                        {job.notes ? (
                          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{job.notes}</p>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-500 text-sm italic">No notes added yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Application Insights, Job Insights */}
                <div className="w-full lg:w-[25%] lg:flex-[1] lg:flex-shrink-0 lg:flex-grow-0 lg:min-w-[250px] lg:max-w-[300px] border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-white/10 lg:pl-6 box-border overflow-hidden">
                  <div className="space-y-6 pt-6 lg:pt-0 w-full overflow-hidden">
                    {/* Application Insights */}
                    <div className="min-w-0 w-full overflow-hidden">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 truncate">Application Insights</h3>
                      <div className="bg-gray-50 dark:bg-[#232f1c] border border-gray-200 dark:border-lime-500/20 rounded-2xl p-3 min-w-0 w-full overflow-hidden">
                        <div className="space-y-3 min-w-0 w-full">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="text-gray-600 dark:text-white/60 text-xs truncate min-w-0">Status</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                              job.status === 'applied' ? 'bg-lime-500 text-white' :
                              job.status === 'interview' ? 'bg-blue-500 text-white' :
                              job.status === 'offer' ? 'bg-purple-500 text-white' :
                              job.status === 'rejected' ? 'bg-red-500 text-white' :
                              'bg-gray-500 text-white'
                            }`}>
                              {job.status === 'applied' ? 'In Progress' : 
                               job.status === 'interview' ? 'Interview' :
                               job.status === 'offer' ? 'Offer' :
                               job.status === 'rejected' ? 'Rejected' :
                               'Created'}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="text-gray-600 dark:text-white/60 text-xs truncate min-w-0">Priority</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                              job.priority === 'high' ? 'bg-red-500 text-white' :
                              job.priority === 'medium' ? 'bg-yellow-500 text-white' :
                              'bg-gray-500 text-white'
                            }`}>
                              {job.priority?.charAt(0).toUpperCase() + job.priority?.slice(1) || 'Medium'}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="text-gray-600 dark:text-white/60 text-xs truncate min-w-0">Sponsorship</span>
                            <span className="text-gray-900 dark:text-white/80 text-xs text-right flex-shrink-0 truncate">
                              {job.sponsorship === 'yes' ? 'Required' : 
                               job.sponsorship === 'no' ? 'Not Required' : 
                               'Unknown'}
                            </span>
                          </div>
                          
                          {job.tags && job.tags.length > 0 && (
                            <div>
                              <span className="text-gray-600 dark:text-white/60 block mb-2">Tags</span>
                              <div className="flex flex-wrap gap-2">
                                {job.tags.map((tag, index) => (
                                  <span key={index} className="px-2 py-1 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white/80 rounded text-xs">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Job Insights */}
                    <div className="min-w-0 w-full overflow-hidden">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 truncate">Job Insights</h3>
                      <div className="bg-gray-50 dark:bg-[#232f1c] border border-gray-200 dark:border-lime-500/20 rounded-2xl p-3 min-w-0 w-full overflow-hidden">
                        <div className="space-y-3 min-w-0">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="text-gray-600 dark:text-white/60 text-xs truncate min-w-0">Keyword Match</span>
                            <span className="text-lime-600 dark:text-[#80FF00] font-semibold text-xs flex-shrink-0">
                              {insightsLoading ? '...' : `${insights?.keywordMatchScore || 0}%`}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="text-gray-600 dark:text-white/60 text-xs truncate min-w-0">Hiring Trend</span>
                            <span className="text-gray-900 dark:text-white text-xs text-right flex-shrink-0 truncate">
                              {insightsLoading ? '...' : insights?.companyHiringTrend || 'Unknown'}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="text-gray-600 dark:text-white/60 text-xs truncate min-w-0">Skills Gap</span>
                            <span className="text-gray-900 dark:text-white text-xs text-right flex-shrink-0 truncate">
                              {insightsLoading ? '...' : insights?.skillsGap || 'Unable to analyze'}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="text-gray-500 dark:text-gray-400 text-xs truncate min-w-0">Market Comp.</span>
                            <span className="text-gray-900 dark:text-white text-xs text-right flex-shrink-0 truncate">
                              {insightsLoading ? '...' : insights?.marketCompetitiveness || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 bg-black/70 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete CV Journey
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this CV journey? This action cannot be undone and will remove all associated CV and cover letter data.
            </p>
            
            <div className="flex gap-3 justify-end">
              <motion.button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isDeleting}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={() => {
                  console.log('🔍 ApplicationJourneyModal - Delete button clicked, journeyId:', showDeleteConfirm);
                  console.log('🔍 ApplicationJourneyModal - isDeleting state:', isDeleting);
                  handleDeleteJourney(showDeleteConfirm);
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isDeleting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Trash2 size={16} />
                    </motion.div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Journey
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* EditJobSidebar - Layered on top */}
      {showEditJobSidebar && (
        <EditJobSidebar
          isOpen={showEditJobSidebar}
          onClose={() => setShowEditJobSidebar(false)}
          onJobSaved={handleEditJobSaved}
          editingJob={{
            id: job.id,
            userId: job.userId,
            jobTitle: job.jobTitle,
            company: job.company,
            location: job.location,
            jobUrl: job.jobUrl,
            jobDescription: job.jobDescription,
            notes: job.notes,
            priority: job.priority,
            status: job.status,
            deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : undefined,
            applicationDate: job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : undefined,
            sponsorship: job.sponsorship,
            tags: job.tags,
            salary: job.salary,
            contactDetails: job.contactDetails,
            source: job.source as 'linkedin' | 'indeed' | 'company-website' | 'referral' | 'other' | undefined,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt
          }}
          userId={user?.id}
        />
      )}

      {/* Email Sent Confirmation Dialog */}
      {showEmailSentDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 bg-black/70 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowEmailSentDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-[#1A201A] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-lime-100 dark:bg-lime-500/20 rounded-lg">
                <Mail size={20} className="text-lime-600 dark:text-[#80FF00]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Email Sent?
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Did you send the email?
            </p>
            
            <div className="flex gap-3 justify-end">
              <motion.button
                onClick={() => handleEmailSentConfirmation(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                No
              </motion.button>
              <motion.button
                onClick={() => handleEmailSentConfirmation(true)}
                className="px-4 py-2 bg-lime-600 dark:bg-[#80FF00] hover:bg-lime-700 dark:hover:bg-[#70e600] text-white rounded-lg font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Yes
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </>
    </AnimatePresence>
  );
};

export default JobSidebar;
