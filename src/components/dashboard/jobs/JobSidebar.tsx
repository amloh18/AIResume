'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetch, authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import {
  X, Briefcase, MapPin, DollarSign, Calendar, ExternalLink,
  FileText, CheckCircle, Clock, AlertCircle, Plus, Edit, Trash2,
  Target, Building2, Star, Copy, Archive, ChevronDown, User, Mail, Phone, TrendingUp,
  Eye, ArrowRight, Sparkles, Loader2
} from 'lucide-react';

// Ensure all icons are properly tree-shaken and available
// This prevents HMR issues with missing icon exports
import JourneyTimelineCard from '../JourneyTimelineCard';
import JobInfoContent from '../JobInfoContent';
import EditJobSidebar from './EditJobSidebar';
import DocumentPreviewSidebar from './DocumentPreviewSidebar';
import toast from 'react-hot-toast';
import { useJobInsights, useJobFallbacks, formatJobDate, formatJobSalary, formatJobUrl } from '@/hooks/useJobInsights';
import { CVJourney } from '@/types/cv';
import { useRouter } from 'next/navigation';
import { useCreditExhaustionHandler } from '@/hooks/useCreditExhaustionHandler';
import { useUpgradePopupTrigger } from '@/lib/hooks/useUpgradePopupTrigger';
import UpgradeCard from '../UpgradeCard';
import { isJobStale, getFollowUpNudge, calculateSuccessProbability, getMarketSalaryComparison } from '@/lib/utils/jobIntelligence';
import TrackerCreatedStageModal from './TrackerCreatedStageModal';
import {
  shouldSkipTrackerCreatedStageModalForToday,
  type TrackerCreatedStagePreview,
} from '@/lib/utils/tracker-created-stage-modal';
import {
  buildTrackerSidebarConfig,
  type TrackerSidebarActionId,
  type TrackerSidebarActionPayload,
  type TrackerSidebarOpenContext,
} from './trackerSidebarConfig';

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
  interviews?: any[];
  followUps?: any[];
  attachments?: any[];
  atsScore?: number;
  atsAnalysis?: any;
  statusHistory?: any[];
}



interface JobSidebarProps {
  job: JobApplication;
  journeys: CVJourney[];
  onClose: () => void;
  onRefresh: () => void;
  openContext?: TrackerSidebarOpenContext;
}

const JobSidebar: React.FC<JobSidebarProps> = ({
  job,
  journeys: initialJourneys,
  onClose,
  onRefresh,
  openContext,
}) => {
  const { user } = useUnifiedAuth();
  const router = useRouter();
  const { showExhaustionModal } = useCreditExhaustionHandler();
  const { shouldShow: shouldShowUpgradePopup, show: showUpgradePopup, dismiss: dismissUpgradePopup } = useUpgradePopupTrigger();
  const [showUpgradePopupState, setShowUpgradePopupState] = useState(false);
  const [isCreatingJourney, setIsCreatingJourney] = useState(false);
  const [isMovingToCreated, setIsMovingToCreated] = useState(false);
  const [journeys, setJourneys] = useState<CVJourney[]>(initialJourneys);
  const [loadingJourneys, setLoadingJourneys] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isJobDescriptionExpanded, setIsJobDescriptionExpanded] = useState(false);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cvData, setCvData] = useState<any>(null);
  const [loadingCV, setLoadingCV] = useState(false);
  const [trackerGenerationPreview, setTrackerGenerationPreview] = useState<TrackerCreatedStagePreview | null>(null);
  const [showCreatedStageModal, setShowCreatedStageModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsModalView, setDetailsModalView] = useState<'details' | 'insights'>('details');
  const [activeActionId, setActiveActionId] = useState<TrackerSidebarActionId | null>(null);
  const [activeActionPayload, setActiveActionPayload] = useState<TrackerSidebarActionPayload | null>(null);
  const [previewDocumentType, setPreviewDocumentType] = useState<'cv' | 'coverLetter' | null>(null);
  const [previewDocumentData, setPreviewDocumentData] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<'cv' | 'coverLetter' | null>(null);

  // EditJobSidebar state for layered sidebar
  const [showEditJobSidebar, setShowEditJobSidebar] = useState(false);

  // Email sent confirmation state
  const [showEmailSentDialog, setShowEmailSentDialog] = useState(false);
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState<number | null>(null);
  const [emailSentStatus, setEmailSentStatus] = useState<Record<number, boolean>>({});
  const appliedOpenContextRef = useRef<string | null>(null);

  // Dynamic data hooks
  const jobId = job.id || job._id;
  const { insights, loading: insightsLoading } = useJobInsights(jobId);
  const fallbacks = useJobFallbacks();

  const successProb = calculateSuccessProbability(job as any);
  const nudge = getFollowUpNudge(job as any);
  
  // Use fallbacks defaultSalary for comparison if insights doesn't have marketAverageSalary
  const marketAverage = 75000; // Generic fallback
  const salaryComp = getMarketSalaryComparison(job.salary, marketAverage);

  const loadTrackerGenerationPreview = useCallback(async () => {
    if (!user?.id || job.status !== 'draft') {
      return null;
    }

    try {
      const response = await authenticatedFetch('/api/jobs/tracker-generation-preview');
      const result = await response.json();
      const preview = result?.preview;

      if (result?.success && preview) {
        const normalizedPreview: TrackerCreatedStagePreview = {
          mode: preview.mode,
          entitlementReasonCode: result.entitlementReasonCode,
          title: preview.title,
          summary: preview.summary,
          supportMessage: preview.supportMessage,
          aiCreditsRemaining: preview.aiCreditsRemaining,
          aiCreditsLimit: preview.aiCreditsLimit,
          isTailoredEligible: preview.isTailoredEligible
        };
        setTrackerGenerationPreview(normalizedPreview);
        return normalizedPreview;
      }
    } catch (error) {
      console.error('Failed to load tracker generation preview:', error);
    }

    const fallbackPreview: TrackerCreatedStagePreview = {
      mode: 'tailored',
      title: 'Documents will be generated',
      summary: 'Moving this job to Created will start CV and cover letter generation for this tracker journey.',
      supportMessage: 'The tracker will show whether the generated drafts are tailored or fallback once processing begins.'
    };
    setTrackerGenerationPreview(fallbackPreview);
    return fallbackPreview;
  }, [job.status, user?.id]);

  useEffect(() => {
    loadTrackerGenerationPreview();
  }, [loadTrackerGenerationPreview]);

  const draftToCreatedMessaging = useMemo(() => {
    return trackerGenerationPreview || {
      mode: 'tailored' as const,
      title: 'Documents will be generated',
      summary: 'Moving this job to Created will start CV and cover letter generation for this tracker journey.',
      supportMessage: 'The tracker will show whether the generated drafts are tailored or fallback once processing begins.'
    };
  }, [trackerGenerationPreview]);

  const loadJourneysForJob = async () => {
    const jobId = job.id || job._id;
    if (!user?.id || !jobId) return;

    setLoadingJourneys(true);
    try {
      console.log('🔍 Loading journeys for job:', jobId);
      const response = await authenticatedFetchWithUserId(`/api/application-journey?jobId=${jobId}`, user.id);
      const result = await response.json();

      if (result.success && result.data.journeys) {
        console.log('✅ Loaded journeys for job:', result.data.journeys);
        setJourneys(result.data.journeys);
      } else {
        console.log('ℹ️ No journeys found for job:', jobId);
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
        // Do not fallback to master CV - if no journey CV, we have no CV data
        setLoadingCV(false);
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

    switch (job.status) {
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
    switch (job.status) {
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
    switch (job.status) {
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
    // Helper to format date
    const formatDate = (date: Date): string => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
    };

    // Get deadline date
    const deadlineDate = job.deadline
      ? (typeof job.deadline === 'string' ? new Date(job.deadline) : job.deadline)
      : null;

    // Get application date (use updatedAt if applicationDate doesn't exist)
    const applicationDate = job.applicationDate
      ? (typeof job.applicationDate === 'string' ? new Date(job.applicationDate) : job.applicationDate)
      : (job.updatedAt ? (typeof job.updatedAt === 'string' ? new Date(job.updatedAt) : job.updatedAt) : new Date());

    const timelines: Record<string, Array<{ day: string; action: string; date?: Date }>> = {
      applied: [],
      interview: [],
      offer: [
        { day: 'Within 48 hours', action: 'Acknowledge receipt and express interest' },
        { day: 'Day 3-5', action: 'Ask clarifying questions or negotiate' },
        { day: 'Before deadline', action: 'Provide final decision' }
      ]
    };

    // Applied stage - calculate dates based on deadline
    if (job.status === 'applied') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Right after application (today)
      timelines.applied.push({
        day: formatDate(today),
        action: 'Connect with hiring manager on LinkedIn & send DM and email',
        date: today
      });

      // Day 3-5: Calculate 4 days after application (middle of 3-5 range)
      const day4Date = new Date(applicationDate);
      day4Date.setDate(day4Date.getDate() + 4);
      day4Date.setHours(0, 0, 0, 0);

      // If deadline exists, ensure we don't go past it
      if (deadlineDate) {
        const deadline = new Date(deadlineDate);
        deadline.setHours(0, 0, 0, 0);
        if (day4Date > deadline) {
          // Use 2 days before deadline instead
          day4Date.setTime(deadline.getTime());
          day4Date.setDate(day4Date.getDate() - 2);
        }
      }

      if (day4Date >= today) {
        timelines.applied.push({
          day: formatDate(day4Date),
          action: 'Send initial follow-up email',
          date: day4Date
        });
      }

      // Day 14: 14 days after application
      const day14Date = new Date(applicationDate);
      day14Date.setDate(day14Date.getDate() + 14);
      day14Date.setHours(0, 0, 0, 0);

      // If deadline exists, ensure we don't go past it
      if (deadlineDate) {
        const deadline = new Date(deadlineDate);
        deadline.setHours(0, 0, 0, 0);
        if (day14Date > deadline) {
          // Use 1 day before deadline instead
          day14Date.setTime(deadline.getTime());
          day14Date.setDate(day14Date.getDate() - 1);
        }
      }

      if (day14Date >= today && day14Date.getTime() !== day4Date.getTime()) {
        timelines.applied.push({
          day: formatDate(day14Date),
          action: 'Send second follow-up if no response',
          date: day14Date
        });
      }
    }

    // Interview stage - calculate dates based on deadline
    if (job.status === 'interview') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get interview date (prefer actual interview date, fallback to deadline)
      let interviewDate: Date;
      if (job.interviews && job.interviews.length > 0) {
        const firstInterview = job.interviews[0];
        interviewDate = typeof firstInterview.date === 'string'
          ? new Date(firstInterview.date)
          : firstInterview.date;
      } else if (deadlineDate) {
        interviewDate = new Date(deadlineDate);
      } else {
        interviewDate = new Date();
        interviewDate.setDate(interviewDate.getDate() + 1); // Default to tomorrow
      }
      if (interviewDate) {
        interviewDate.setHours(0, 0, 0, 0);
      }

      // Before interview: 1 day before interview date (or today if interview is today/tomorrow)
      const prepDate = new Date(interviewDate);
      prepDate.setDate(prepDate.getDate() - 1);
      if (prepDate < today) {
        prepDate.setTime(today.getTime());
      }

      timelines.interview.push({
        day: formatDate(prepDate),
        action: 'View Prep - Practice interview questions',
        date: prepDate
      });

      // Day 5-7: Calculate 6 days after interview (middle of 5-7 range)
      const day6Date = new Date(interviewDate);
      day6Date.setDate(day6Date.getDate() + 6);
      day6Date.setHours(0, 0, 0, 0);

      if (day6Date >= today) {
        timelines.interview.push({
          day: formatDate(day6Date),
          action: 'Follow up on timeline if not provided',
          date: day6Date
        });
      }

      // Day 14: 14 days after interview
      const day14Date = new Date(interviewDate);
      day14Date.setDate(day14Date.getDate() + 14);
      day14Date.setHours(0, 0, 0, 0);

      if (day14Date >= today && day14Date.getTime() !== day6Date.getTime()) {
        timelines.interview.push({
          day: formatDate(day14Date),
          action: 'Send polite status inquiry if no update',
          date: day14Date
        });
      }
    }

    return timelines[job.status as keyof typeof timelines] || [];
  };

  const primaryJourney = useMemo(() => {
    if (!journeys.length) return null;

    return [...journeys]
      .filter(journey => journey.id)
      .sort((a, b) => new Date(b.metadata?.updatedAt || b.updatedAt || 0).getTime() - new Date(a.metadata?.updatedAt || a.updatedAt || 0).getTime())[0];
  }, [journeys]);

  const generationState = primaryJourney?.generationState;
  const keywordMatchScore = insights?.keywordMatchScore ?? job.atsScore ?? 0;
  const followUpTimeline = useMemo(() => getFollowUpTimeline(job), [job]);
  const formatTimelineDate = useCallback((date?: string | Date | null) => {
    if (!date) return 'Not reached';

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Not reached';
    }

    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: parsedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }, []);
  const getStageTransitionDate = useCallback((stageKey: string) => {
    if (stageKey === 'draft') {
      return job.createdAt || null;
    }

    const matchingHistory = (job.statusHistory || [])
      .filter((entry: any) => entry?.status === stageKey && entry?.changedAt)
      .sort(
        (a: any, b: any) =>
          new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
      );

    if (matchingHistory.length > 0) {
      return matchingHistory[0].changedAt;
    }

    if (stageKey === job.status) {
      return job.updatedAt || null;
    }

    return null;
  }, [job.createdAt, job.status, job.statusHistory, job.updatedAt]);
  const stageItems = useMemo(() => {
    const normalizedTimelineStatus = job.status === 'screening' ? 'applied' : job.status;
    const items = [
      { key: 'draft', label: 'Draft' },
      { key: 'created', label: 'Created' },
      { key: 'applied', label: 'Applied' },
      { key: 'interview', label: 'Interview' },
      { key: 'offer', label: 'Offer' },
      { key: job.status === 'rejected' ? 'rejected' : 'accepted', label: job.status === 'rejected' ? 'Rejected' : 'Accepted' }
    ];

    const currentIndex = items.findIndex(item => item.key === normalizedTimelineStatus);
    const lastReachedIndex = items.reduce((lastIndex, item, index) => {
      return getStageTransitionDate(item.key) ? index : lastIndex;
    }, -1);

    return items.map((item, index) => ({
      ...item,
      isCurrent: currentIndex > -1 ? item.key === normalizedTimelineStatus : false,
      isCompleted:
        currentIndex > -1
          ? index < currentIndex
          : index <= lastReachedIndex,
      isUpcoming:
        currentIndex > -1
          ? index > currentIndex
          : index > lastReachedIndex,
      stageDate: getStageTransitionDate(item.key),
      statusLabel:
        job.status === 'screening' && item.key === 'applied'
          ? 'In screening'
          : item.key === normalizedTimelineStatus
            ? 'Current stage'
            : currentIndex > -1
              ? index < currentIndex
                ? 'Completed'
                : 'Upcoming'
              : index <= lastReachedIndex
                ? 'Completed'
                : 'Upcoming',
    }));
  }, [getStageTransitionDate, job.status]);
  const terminalStageLabel = useMemo(() => {
    if (job.status === 'withdrawn') return 'Withdrawn';
    return null;
  }, [job.status]);
  const activeJourneyForPayload = useMemo(() => {
    if (!activeActionPayload?.journeyId) {
      return primaryJourney;
    }

    return journeys.find(journey => journey.id === activeActionPayload.journeyId) || primaryJourney;
  }, [activeActionPayload?.journeyId, journeys, primaryJourney]);
  const isRecruiterVisibilityStage = job.status === 'applied' || job.status === 'screening';
  const hasRecruiterEmail = Boolean(job.contactDetails?.email);
  const recruiterVisibilitySteps = useMemo(() => {
    if (!isRecruiterVisibilityStage) return [];

    return [
      'You can send a ready email for high chances of visibility to the recruiter.',
      hasRecruiterEmail
        ? `Current path: we can open a draft to ${job.contactDetails?.email} with the role context already filled in.`
        : 'Current limit: no recruiter email is saved for this job yet, so the draft opens without a recipient.',
      hasRecruiterEmail
        ? 'Manual fallback: review the draft, send it from your inbox, then log the follow-up here.'
        : 'Manual fallback: copy the draft, add a recruiter email in Job Details, or send the same message on LinkedIn.',
    ];
  }, [hasRecruiterEmail, isRecruiterVisibilityStage, job.contactDetails?.email]);
  const formatStageLabel = useCallback((stage?: string) => {
    if (!stage) return 'Unknown stage';
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  }, []);
  const handleOpenInterviewCoach = useCallback(() => {
    if (!jobId) return;
    router.push(`/dashboard/interview/${jobId}`);
  }, [jobId, router]);
  const handleOpenDocumentPreview = useCallback(async (documentType: 'cv' | 'coverLetter') => {
    if (!user?.id || !primaryJourney) {
      return;
    }

    const targetId = documentType === 'cv' ? primaryJourney.cvId : primaryJourney.coverLetterId;
    if (!targetId) {
      return;
    }

    try {
      setPreviewLoading(documentType);

      if (documentType === 'cv') {
        const response = await authenticatedFetchWithUserId(`/api/cvs/${targetId}`, user.id);
        const result = await response.json();
        const linkedCV = result?.data?.cv || result?.cv;

        if (!response.ok || !linkedCV) {
          throw new Error(result?.error || 'Failed to load CV preview');
        }

        setPreviewDocumentType('cv');
        setPreviewDocumentData(linkedCV.cvData || linkedCV);
        setPreviewTemplate(linkedCV.template || null);
        setPreviewOpen(true);
        return;
      }

      const response = await authenticatedFetchWithUserId(`/api/cover-letters/${targetId}`, user.id);
      const result = await response.json();
      const linkedCoverLetter = result?.coverLetter || result?.data?.coverLetter;

      if (!response.ok || !linkedCoverLetter) {
        throw new Error(result?.error || 'Failed to load cover letter preview');
      }

      setPreviewDocumentType('coverLetter');
      setPreviewDocumentData(linkedCoverLetter);
      setPreviewTemplate(null);
      setPreviewOpen(true);
    } catch (error) {
      console.error(`Failed to load ${documentType} preview:`, error);
      toast.error(
        documentType === 'cv'
          ? 'Failed to open CV preview.'
          : 'Failed to open cover letter preview.',
      );
    } finally {
      setPreviewLoading(null);
    }
  }, [primaryJourney, user?.id]);

  const openDetailsView = (view: 'details' | 'insights') => {
    setDetailsModalView(view);
    setShowDetailsModal(true);
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
      const currentJobId = job.id || job._id;
      const existingJourney = journeys.find(j => j.jobId === currentJobId);

      if (existingJourney) {
        // If journey exists but job is still in draft, move it to created
        if (job.status === 'draft') {
          try {
            const statusResponse = await authenticatedFetchWithUserId(`/api/jobs/${currentJobId}`, user.id, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'created'
              }),
            });

            if (statusResponse.ok) {
              const statusResult = await statusResponse.json();
              toast.success(statusResult?.trackerGeneration?.summary || draftToCreatedMessaging.summary);
              await onRefresh();
              return;
            }
          } catch (error) {
            console.error('Error updating job status:', error);
          }
        } else {
          toast.success('A CV journey already exists for this job. You can continue with the existing journey.');
          return;
        }
      }

      // IMPORTANT: Move job to 'created' status BEFORE creating journey
      // Journeys and documents should only be created for jobs in 'created' status or later
      if (job.status === 'draft') {
        try {
          const statusResponse = await authenticatedFetchWithUserId(`/api/jobs/${currentJobId}`, user.id, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'created'
            }),
          });

          if (!statusResponse.ok) {
            const errorData = await statusResponse.json();
            toast.error(errorData.error || 'Failed to move job to created stage. Please try again.');
            return;
          }

          const statusResult = await statusResponse.json();
          toast.success(statusResult?.trackerGeneration?.summary || draftToCreatedMessaging.summary);
          // Refresh job data to get updated status
          await onRefresh();
        } catch (error) {
          console.error('Error updating job status:', error);
          toast.error('Failed to move job to created stage. Please try again.');
          return;
        }
      }

      const response = await authenticatedFetchWithUserId('/api/application-journey', user.id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id || job._id,
          jobTitle: job.jobTitle || job.title,
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

          // Check if this is the first journey and show upgrade popup
          // Check journey count before this creation
          const journeyCountBefore = journeys.length;
          if (journeyCountBefore === 0) {
            // This is the first journey, trigger upgrade popup
            // Wait a bit for the activity status API to update
            setTimeout(() => {
              showUpgradePopup();
              setShowUpgradePopupState(true);
            }, 1000);
          }
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
    // Navigate to editor with journey context
    const returnUrl = `/dashboard/tracker?journeyId=${journey.id}`;
    const params = new URLSearchParams();
    params.set('mode', 'journey');
    params.set('journeyId', journey.id);
    params.set('step', '3');
    params.set('returnUrl', returnUrl);

    if (journey.cvId) {
      params.set('cvId', journey.cvId);
    }

    router.push(`/editor?${params.toString()}`);
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

  const executeMoveToCreated = async () => {
    if (isMovingToCreated || !user?.id) return;

    try {
      setIsMovingToCreated(true);

      const statusResponse = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'created'
        }),
      });

      if (!statusResponse.ok) {
        let errorData: any = {};
        try {
          errorData = await statusResponse.json();
          console.log('🔍 JobSidebar - Error response data:', errorData);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }

        // Handle insufficient credits error (403) - show paywall
        if (statusResponse.status === 403) {
          const limit = errorData.limit || 1;
          const currentUsage = errorData.currentUsage || limit;
          const creditsRemaining = Math.max(0, limit - currentUsage);

          console.log('🔍 JobSidebar - Credit error detected:', {
            requiresUpgrade: errorData.requiresUpgrade,
            limit,
            currentUsage,
            creditsRemaining,
            error: errorData.error
          });

          // Show paywall if requiresUpgrade is true OR if it's a 403 (credit error)
          if (errorData.requiresUpgrade || errorData.error?.includes('limit exceeded') || errorData.error?.includes('insufficient credits')) {
            console.log('🔍 JobSidebar - Showing paywall modal');
            showExhaustionModal(
              {
                creditsRemaining,
                limit,
                reason: errorData.message || errorData.error || 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs'
              },
              'pro_monthly'
            );
            return;
          }
        }

        toast.error(errorData.error || errorData.message || 'Failed to move job to created stage. Please try again.');
        return;
      }

      const statusResult = await statusResponse.json();
      toast.success(statusResult?.trackerGeneration?.summary || draftToCreatedMessaging.summary);

      // Dispatch credit update event to refresh membership card
      window.dispatchEvent(new CustomEvent('creditsUpdated'));

      // Refresh job data to get updated status
      await onRefresh();
    } catch (error: any) {
      console.error('Error updating job status:', error);

      // Check if error message indicates credit issue
      if (error?.message?.includes('limit exceeded') || error?.message?.includes('insufficient credits')) {
        showExhaustionModal(
          {
            creditsRemaining: 0,
            limit: 1,
            reason: 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs'
          },
          'pro_monthly'
        );
      } else {
        toast.error('Failed to move job to created stage. Please try again.');
      }
    } finally {
      setIsMovingToCreated(false);
    }
  };

  const handleMoveToCreated = async () => {
    if (isMovingToCreated || !user?.id) return;

    const preview = trackerGenerationPreview || await loadTrackerGenerationPreview();
    if (
      preview?.mode === 'fallback' &&
      !shouldSkipTrackerCreatedStageModalForToday()
    ) {
      setShowCreatedStageModal(true);
      return;
    }

    await executeMoveToCreated();
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

      const response = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
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

  const sidebarConfig = useMemo(() => buildTrackerSidebarConfig({
    job,
    primaryJourney: primaryJourney as any,
    trackerGenerationPreview,
    insights,
    successProb,
    keywordMatchScore,
    nudge,
    followUpAction: followUpTimeline[0]?.action || null,
    formattedDeadline: formatJobDate(job.deadline, 'No deadline set'),
    formattedJobUrl: formatJobUrl(job.jobUrl, 'No URL provided'),
    handlers: {
      move_to_created: handleMoveToCreated,
      preview_free_output: () => setShowCreatedStageModal(true),
      edit_job: handleOpenEditModal,
      create_journey: handleCreateJourney,
      continue_journey: () => primaryJourney && handleContinueJourney(primaryJourney as any),
      open_details: () => openDetailsView('details'),
      open_insights: () => openDetailsView('insights'),
        open_interview_prep: handleOpenInterviewCoach,
      archive_job: handleArchiveJob,
      duplicate_job: handleDuplicateJob,
    },
  }), [
    job,
    primaryJourney,
    trackerGenerationPreview,
    insights,
    successProb,
    keywordMatchScore,
    nudge,
    followUpTimeline,
    handleMoveToCreated,
    handleOpenEditModal,
    handleCreateJourney,
    handleArchiveJob,
    handleDuplicateJob,
    handleOpenInterviewCoach,
  ]);

  const runSidebarAction = useCallback(async (actionId: TrackerSidebarActionId) => {
    const payload = sidebarConfig.actionPayloads[actionId] || null;
    setActiveActionId(actionId);
    setActiveActionPayload(payload);

    switch (actionId) {
      case 'move_to_created':
        await handleMoveToCreated();
        return;
      case 'preview_free_output':
        setShowCreatedStageModal(true);
        return;
      case 'edit_job':
        handleOpenEditModal();
        return;
      case 'create_journey':
        await handleCreateJourney();
        return;
      case 'continue_journey':
        if (primaryJourney) {
          handleContinueJourney(primaryJourney as any);
        }
        return;
      case 'open_details':
        openDetailsView('details');
        return;
      case 'open_insights':
        openDetailsView('insights');
        return;
      case 'open_interview_prep':
        handleOpenInterviewCoach();
        return;
      case 'archive_job':
        await handleArchiveJob();
        return;
      case 'duplicate_job':
        await handleDuplicateJob();
        return;
      default:
        return;
    }
  }, [
    handleArchiveJob,
    handleCreateJourney,
    handleDuplicateJob,
    handleMoveToCreated,
    handleOpenEditModal,
    openDetailsView,
    handleOpenInterviewCoach,
    primaryJourney,
    sidebarConfig.actionPayloads,
  ]);

  useEffect(() => {
    if (!openContext) {
      appliedOpenContextRef.current = null;
      return;
    }

    const contextKey = JSON.stringify(openContext);
    if (appliedOpenContextRef.current === contextKey) {
      return;
    }

    appliedOpenContextRef.current = contextKey;

    if (openContext.preferredDetailsView) {
      setActiveActionId(openContext.preferredDetailsView === 'insights' ? 'open_insights' : 'open_details');
      setActiveActionPayload(
        sidebarConfig.actionPayloads[
          openContext.preferredDetailsView === 'insights' ? 'open_insights' : 'open_details'
        ] || null
      );
      openDetailsView(openContext.preferredDetailsView);
      return;
    }

    if (openContext.highlightAction === 'open_interview_prep' && job.status === 'interview') {
      setActiveActionId('open_interview_prep');
      setActiveActionPayload(sidebarConfig.actionPayloads.open_interview_prep || null);
      handleOpenInterviewCoach();
    }
  }, [handleOpenInterviewCoach, job.status, openContext, sidebarConfig.actionPayloads]);

  const journeyCardData = sidebarConfig.journeyCard;
  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed bg-black/50 backdrop-blur-sm z-[99]"
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
          className="fixed right-0 top-0 h-screen bg-white dark:bg-[#141810] shadow-2xl z-[100] flex flex-col"
          style={{ width: sidebarWidth }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-4 sm:p-6 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">{job.jobTitle || job.title}</h2>
              <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">at</span>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">{job.company}</h2>

              {/* Sponsorship Tag */}
              {job.sponsorship && job.sponsorship !== 'unknown' && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ml-0 sm:ml-2 ${job.sponsorship === 'yes'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                  {job.sponsorship === 'yes' ? (
                    <>
                      <CheckCircle size={12} />
                      <span>Sponsorship Provided</span>
                    </>
                  ) : (
                    <>
                      <X size={12} />
                      <span>No Sponsorship</span>
                    </>
                  )}
                </div>
              )}
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
            <div className="space-y-6 px-6 py-5 pb-8">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Stages</p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Application timeline</h3>
                  </div>
                  {terminalStageLabel && (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      {terminalStageLabel}
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-emerald-500/10 dark:bg-[#131810]">
                  <div className="grid gap-3 md:grid-cols-7">
                    {stageItems.map((stage, index) => (
                      <div key={stage.key} className="relative">
                        {index < stageItems.length - 1 && (
                          <div className={`absolute left-[calc(50%+18px)] right-[-18px] top-4 hidden h-[2px] md:block ${
                            stage.isCompleted ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-emerald-500/20'
                          }`} />
                        )}
                        <div className={`rounded-2xl border px-3 py-3 transition-colors ${
                          stage.isCurrent
                            ? 'border-blue-200 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-900/20'
                            : stage.isCompleted
                              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-900/20'
                              : 'border-gray-200 bg-gray-50 dark:border-emerald-500/5 dark:bg-[#181f16]'
                        }`}>
                          <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                            stage.isCurrent
                              ? 'bg-blue-600 text-white'
                              : stage.isCompleted
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                          }`}>
                            {stage.isCompleted ? <CheckCircle size={14} /> : index + 1}
                          </div>
                          <p className={`text-sm font-semibold capitalize ${
                            stage.isCurrent ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                          }`}>
                            {stage.label}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {stage.statusLabel}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {formatTimelineDate(stage.stageDate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Journey Card</p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">What matters right now</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${journeyCardData.accentClasses}`}>
                    {journeyCardData.eyebrow}
                  </span>
                </div>

                <div className={`rounded-[28px] border p-6 shadow-sm ${journeyCardData.toneClasses}`}>
                  <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-emerald-600 shadow-sm dark:bg-[#2a3326] dark:text-emerald-400">
                          {job.status === 'draft' ? <Target className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                        </div>
                        <div>
                          <h4 className="text-2xl font-semibold text-gray-900 dark:text-white">{journeyCardData.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{journeyCardData.summary}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {journeyCardData.bullets.map((bullet, index) => (
                          <div key={`${bullet}-${index}`} className="flex items-start gap-3">
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">{bullet}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                        <motion.button
                          onClick={() => void runSidebarAction(journeyCardData.primaryActionId)}
                          disabled={isMovingToCreated || isCreatingJourney}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#80FF00] px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95 disabled:opacity-60"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {journeyCardData.primaryLabel}
                          <ArrowRight className="h-4 w-4" />
                        </motion.button>
                        {journeyCardData.secondaryAction && journeyCardData.secondaryLabel && (
                          <motion.button
                            onClick={() => journeyCardData.secondaryActionId && void runSidebarAction(journeyCardData.secondaryActionId)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-white/10 dark:bg-[#20281d] dark:text-white dark:hover:bg-[#273021]"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {journeyCardData.secondaryLabel}
                          </motion.button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {sidebarConfig.sections.showJourneySnapshot && (
                        <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#1b2218]">
                          <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Journey Snapshot</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {journeyCardData.stats.map((stat) => (
                              <div key={stat.label} className="rounded-xl bg-gray-50 px-3 py-3 dark:bg-[#181f16]">
                                <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {sidebarConfig.sections.showTrackerJourneySummary && (
                        <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#1b2218]">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Tracker Journey</p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {loadingJourneys ? 'Loading...' : primaryJourney ? 'Active' : 'Not started'}
                            </span>
                          </div>
                          <div className="mt-3 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                            {primaryJourney ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <span>Journey status</span>
                                  <span className="font-medium capitalize text-gray-900 dark:text-white">
                                    {primaryJourney.status?.replace(/_/g, ' ') || 'In progress'}
                                  </span>
                                </div>
                                {typeof primaryJourney.currentStep === 'number' && typeof primaryJourney.totalSteps === 'number' && (
                                  <div className="flex items-center justify-between">
                                    <span>Current step</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {primaryJourney.currentStep}/{primaryJourney.totalSteps}
                                    </span>
                                  </div>
                                )}
                                {(primaryJourney.updatedAt || primaryJourney.metadata?.updatedAt) && (
                                  <div className="flex items-center justify-between">
                                    <span>Last updated</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {formatJobDate(primaryJourney.updatedAt || primaryJourney.metadata?.updatedAt)}
                                    </span>
                                  </div>
                                )}
                                {(primaryJourney.cvId || primaryJourney.coverLetterId) && (
                                  <div className="border-t border-gray-200 pt-3 dark:border-white/10">
                                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                                      Ready previews
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        onClick={() => void handleOpenDocumentPreview('cv')}
                                        disabled={!primaryJourney.cvId || previewLoading === 'cv'}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-[#273021]"
                                      >
                                        {previewLoading === 'cv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                        Preview CV
                                      </button>
                                      <button
                                        onClick={() => void handleOpenDocumentPreview('coverLetter')}
                                        disabled={!primaryJourney.coverLetterId || previewLoading === 'coverLetter'}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-[#273021]"
                                      >
                                        {previewLoading === 'coverLetter' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                        Preview Cover Letter
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="leading-6">
                                {sidebarConfig.trackerJourneyEmptyState}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {isRecruiterVisibilityStage && (
                <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810]">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Recruiter Visibility</p>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Outreach that keeps this application visible</h3>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {job.status === 'screening' ? 'Screening follow-up' : 'Applied follow-up'}
                    </span>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-3">
                      {recruiterVisibilitySteps.map((step, index) => (
                        <div key={`${step}-${index}`} className="flex items-start gap-3">
                          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                          <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">{step}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#181f16]">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Current action path</p>
                        <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {hasRecruiterEmail
                            ? 'Open the draft email now, then confirm whether you sent it so the tracker can keep the timeline honest.'
                            : 'Use the manual fallback first: copy the draft, add a recruiter email, or send the same message through LinkedIn.'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => handleOpenEmail(0)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#80FF00] px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95"
                        >
                          <Mail className="h-4 w-4" />
                          {hasRecruiterEmail ? 'Open Recruiter Email Draft' : 'Open Manual Outreach Draft'}
                        </button>
                        <button
                          onClick={() => {
                            setActiveActionId('open_details');
                            setActiveActionPayload(sidebarConfig.actionPayloads.open_details || null);
                            setShowEmailTemplate(!showEmailTemplate);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-white/10 dark:bg-[#20281d] dark:text-white dark:hover:bg-[#273021]"
                        >
                          {showEmailTemplate ? 'Hide Manual Script' : 'View Manual Script'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {showEmailTemplate && (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#181f16]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Manual outreach fallback</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Subject: {getEmailSubject(job)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyToClipboard(getEmailSubject(job), 'subject')}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-white dark:border-white/10 dark:text-gray-200 dark:hover:bg-[#20281d]"
                          >
                            Copy Subject
                          </button>
                          <button
                            onClick={() => handleCopyToClipboard(getEmailTemplate(job), 'email')}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-white dark:border-white/10 dark:text-gray-200 dark:hover:bg-[#20281d]"
                          >
                            Copy Message
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 whitespace-pre-wrap rounded-xl bg-white px-4 py-4 text-sm leading-6 text-gray-700 dark:bg-[#20281d] dark:text-gray-300">
                        {getEmailTemplate(job)}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {(sidebarConfig.sections.showJobDetails || sidebarConfig.sections.showInsights) && (
                <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                  {sidebarConfig.sections.showJobDetails && (
                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810]">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Job Details</p>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Core job information</h3>
                        </div>
                        <button
                          onClick={() => void runSidebarAction('open_details')}
                          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-[#273021]"
                        >
                          View Full Details
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {sidebarConfig.detailRows.map((row) => (
                          <div
                            key={row.label}
                            className={`space-y-1 ${row.label === 'Job URL' ? 'sm:col-span-2' : ''}`}
                          >
                            <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{row.label}</p>
                            <div className="flex items-center gap-2">
                              <p className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">{row.value}</p>
                              {row.label === 'Job URL' && job.jobUrl && (
                                <a
                                  href={job.jobUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-emerald-600 hover:text-emerald-700 dark:text-[#80FF00]"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sidebarConfig.sections.showInsights && (
                    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810]">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Application Insights</p>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance snapshot</h3>
                        </div>
                        <button
                          onClick={() => void runSidebarAction('open_insights')}
                          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-[#273021]"
                        >
                          View Full Insights
                        </button>
                      </div>

                      {sidebarConfig.insightRows.length > 0 ? (
                        <div className="space-y-3">
                          {sidebarConfig.insightRows.map((row) => (
                            <div key={row.label} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-[#181f16]">
                              <span className="text-sm text-gray-600 dark:text-gray-300">{row.label}</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {row.label === 'Match Score' && insightsLoading ? '...' : row.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm leading-6 text-gray-600 dark:border-white/10 dark:bg-[#181f16] dark:text-gray-300">
                          {sidebarConfig.insightsEmptyState}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </motion.div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[101] bg-black/70 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
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

        {showDetailsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[101] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="w-full max-w-4xl rounded-[28px] border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#171d15]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                    {detailsModalView === 'details' ? 'Job Details' : 'Application Insights'}
                  </p>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {job.jobTitle || job.title} at {job.company}
                  </h3>
                  {activeActionPayload && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Viewing {formatStageLabel(activeActionPayload.stage)} context
                      {activeJourneyForPayload?.id ? ` with journey ${activeJourneyForPayload.id.slice(0, 8)}` : ' without a linked journey yet'}.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6 flex gap-2 rounded-2xl bg-gray-100 p-1 dark:bg-[#222a1f]">
                <button
                  onClick={() => setDetailsModalView('details')}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    detailsModalView === 'details'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-[#2a3326] dark:text-white'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Job Details
                </button>
                <button
                  onClick={() => setDetailsModalView('insights')}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    detailsModalView === 'insights'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-[#2a3326] dark:text-white'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Application Insights
                </button>
              </div>

              {activeActionPayload && (
                <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-white/10 dark:bg-[#20281d] dark:text-gray-300">
                  {activeActionId === 'open_insights'
                    ? `Insights are filtered to the ${formatStageLabel(activeActionPayload.stage)} stage for this tracker item.`
                    : `This panel opened from the ${formatStageLabel(activeActionPayload.stage)} stage and keeps the current job, journey, and entitlement context together.`}
                </div>
              )}

              {detailsModalView === 'details' ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                      <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Core Details</h4>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Building2 className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Company</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{job.company}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Location</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{job.location || fallbacks.defaultLocation}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Briefcase className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Type</p>
                            <p className="text-sm font-medium capitalize text-gray-900 dark:text-white">{job.jobType || job.type || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <DollarSign className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Salary</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatJobSalary(job.salary, fallbacks.defaultSalary)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Calendar className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Deadline</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatJobDate(job.deadline, 'No deadline set')}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <ExternalLink className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Job URL</p>
                            {job.jobUrl ? (
                              <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium text-emerald-600 hover:underline dark:text-[#80FF00]">
                                {job.jobUrl}
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-gray-900 dark:text-white">No URL provided</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {job.contactDetails && (job.contactDetails.name || job.contactDetails.email || job.contactDetails.phone || job.contactDetails.role) && (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                        <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Contact Details</h4>
                        <div className="space-y-4">
                          {job.contactDetails.name && <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Name:</span> {job.contactDetails.name}</p>}
                          {job.contactDetails.role && <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Role:</span> {job.contactDetails.role}</p>}
                          {job.contactDetails.email && <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Email:</span> {job.contactDetails.email}</p>}
                          {job.contactDetails.phone && <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Phone:</span> {job.contactDetails.phone}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                      <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Job Description</h4>
                      <div className="max-h-[260px] overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                        {job.jobDescription || fallbacks.defaultJobDescription}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                      <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Notes</h4>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                        {job.notes || 'No notes added yet.'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                    <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Application Snapshot</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
                        <span className="text-sm font-semibold capitalize text-gray-900 dark:text-white">{job.status}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Success Probability</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{successProb}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Priority</span>
                        <span className="text-sm font-semibold capitalize text-gray-900 dark:text-white">{job.priority || 'medium'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Sponsorship</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {job.sponsorship === 'yes' ? 'Provided' : job.sponsorship === 'no' ? 'Not provided' : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Match Score</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{insightsLoading ? '...' : `${keywordMatchScore}%`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                    <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Deeper Insights</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Hiring Trend</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{insightsLoading ? '...' : insights?.companyHiringTrend || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Skills Gap</span>
                        <span className="text-right text-sm font-semibold text-gray-900 dark:text-white">{insightsLoading ? '...' : insights?.skillsGap || 'Unable to analyze'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Market Competitiveness</span>
                        <span className={`text-right text-sm font-semibold ${
                          salaryComp.comparison === 'above'
                            ? 'text-green-600 dark:text-green-400'
                            : salaryComp.comparison === 'below'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-white'
                        }`}>
                          {salaryComp.comparison !== 'unknown' ? salaryComp.text : (insightsLoading ? '...' : insights?.marketCompetitiveness || 'Unknown')}
                        </span>
                      </div>
                      {nudge && (
                        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                          <span className="font-semibold">Smart action:</span> {nudge}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
              id: job.id || job._id,
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
            className="fixed inset-0 z-[101] bg-black/70 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
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


        {/* Upgrade Card - shown after first journey creation */}
        {showUpgradePopupState && shouldShowUpgradePopup && user?.id && (
          <UpgradeCard
            userId={user.id}
            onClose={() => {
              setShowUpgradePopupState(false);
              dismissUpgradePopup();
            }}
          />
        )}

        <TrackerCreatedStageModal
          isOpen={showCreatedStageModal}
          onClose={() => setShowCreatedStageModal(false)}
          onConfirm={async () => {
            setShowCreatedStageModal(false);
            await executeMoveToCreated();
          }}
          jobTitle={job.jobTitle || job.title}
          company={job.company}
          preview={trackerGenerationPreview}
          isSubmitting={isMovingToCreated}
          actionContext={activeActionPayload}
        />
        <DocumentPreviewSidebar
          isOpen={previewOpen && !!previewDocumentType}
          onClose={() => setPreviewOpen(false)}
          documentType={previewDocumentType || 'cv'}
          documentData={previewDocumentData}
          cvData={cvData || previewDocumentData}
          jobData={job}
          template={previewTemplate}
        />
      </>
    </AnimatePresence>
  );
};

export default JobSidebar;
