'use client';

import JobFilesTab from './sidebar/JobFilesTab';
import JobDetailsTab from './sidebar/JobDetailsTab';
import JobCommunicationTab from './sidebar/JobCommunicationTab';
import JobPeopleTab from './sidebar/JobPeopleTab';
import JobNotesTab from './sidebar/JobNotesTab';
import { moveJobToCreated } from '@/lib/utils/tracker-job-actions';
import { loadTrackerGenerationPreview } from '@/lib/utils/tracker-generation-preview';
import { getJobDeadlineString } from '@/lib/utils/job-deadline';
import { getDaysSinceLastUpdate, isFollowUpNeeded, getFollowUpSuggestion, getFollowUpEmailSubject as getEmailSubject } from '@/lib/utils/job-intelligence';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetch, authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import {
  X, Briefcase, MapPin, DollarSign, Calendar, ExternalLink,
  FileText, CheckCircle, Clock, AlertCircle, Plus, Edit, Trash2,
  Target, Building2, Star, Copy, Archive, ChevronDown, User, Mail, Phone, TrendingUp,
  Eye, ArrowRight, Sparkles, Loader2, Linkedin, Search, Send
} from 'lucide-react';

// Ensure all icons are properly tree-shaken and available
// This prevents HMR issues with missing icon exports
import JourneyTimelineCard from '../JourneyTimelineCard';
import JobInfoContent from '../JobInfoContent';
import EditJobSidebar from './EditJobSidebar';
import AgingTrackerWidget from './widgets/AgingTrackerWidget';
import DocumentPreviewSidebar from './DocumentPreviewSidebar';
import { EmailConnectModal } from './EmailConnectModal';
import toast from 'react-hot-toast';
import { useUserData } from '@/lib/hooks/useUserData';
import { useJobInsights, useJobFallbacks, formatJobDate, formatJobSalary, formatJobUrl } from '@/hooks/useJobInsights';
import { CVJourney } from '@/types/cv';
import { useRouter } from 'next/navigation';
import { useCreditExhaustionHandler } from '@/hooks/useCreditExhaustionHandler';
import { useUpgradePopupTrigger } from '@/lib/hooks/useUpgradePopupTrigger';
import UpgradeCard from '../UpgradeCard';
import { isJobStale, getFollowUpNudge, calculateSuccessProbability, getMarketSalaryComparison } from '@/lib/utils/jobIntelligence';
import TrackerCreatedStageModal from './TrackerCreatedStageModal';
import LinkedInJobTab from './LinkedInJobTab';
import { JobApplication } from '@/types/job';
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





interface JobSidebarProps {
  job: JobApplication;
  journeys: CVJourney[];
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
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
  const { userData } = useUserData();
  const userPlanKey = userData?.currentPlanKey || userData?.subscription?.planKey || 'free';
  const isPremiumUser = ['focused_monthly', 'focused_yearly', 'smart_quarterly', 'smart_yearly', 'pro_monthly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime', 'pro'].includes(userPlanKey);
  const router = useRouter();
  const { showExhaustionModal } = useCreditExhaustionHandler();
  const { shouldShow: shouldShowUpgradePopup, show: showUpgradePopup, dismiss: dismissUpgradePopup } = useUpgradePopupTrigger();
  const [showUpgradePopupState, setShowUpgradePopupState] = useState(false);
  const [isCreatingJourney, setIsCreatingJourney] = useState(false);
  const [isMovingToCreated, setIsMovingToCreated] = useState(false);
  const [journeys, setJourneys] = useState<CVJourney[]>(initialJourneys);
  const [loadingJourneys, setLoadingJourneys] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isConfirmingDeleteJob, setIsConfirmingDeleteJob] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isJobDescriptionExpanded, setIsJobDescriptionExpanded] = useState(false);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cvData, setCvData] = useState<any>(null);
  const [loadingCV, setLoadingCV] = useState(false);
  const [trackerGenerationPreview, setTrackerGenerationPreview] = useState<TrackerCreatedStagePreview | null>(null);
  const [showCreatedStageModal, setShowCreatedStageModal] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);


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

  const jobId = job.id || job._id;

  // Comms sidebar states
  const [isEmailConnectModalOpen, setIsEmailConnectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'communication' | 'people' | 'notes' | 'files'>('details');
  const [progress, setProgress] = useState(15);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab !== 'communication') {
      setShowEmailTemplate(false);
    }
  };




  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);









  const [isEmailConnected, setIsEmailConnected] = useState(false);
  const [connectedEmailAddress, setConnectedEmailAddress] = useState('');

  const fetchEmailStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tracker/emails/sync`);
      const data = await res.json();
      if (data.success) {
        setIsEmailConnected(data.connected);
        setConnectedEmailAddress(data.emailAddress || '');
      }
    } catch (err) {
      console.error('Error fetching email connection status:', err);
    }
  }, []);




  // Dynamic data hooks
  const { insights, loading: insightsLoading } = useJobInsights(jobId);
  const fallbacks = useJobFallbacks();

  const successProb = calculateSuccessProbability(job as any);
  const nudge = getFollowUpNudge(job as any);
  
  // Use fallbacks defaultSalary for comparison if insights doesn't have marketAverageSalary
  const marketAverage = 75000; // Generic fallback
  const salaryComp = getMarketSalaryComparison(job.salary, marketAverage);

  const contacts = useMemo(() => {
    const list: Array<{ name: string; email: string; role: string }> = [];
    if (job.contactDetails?.name || job.contactDetails?.email) {
      list.push({
        name: job.contactDetails.name || 'Recruiter',
        email: job.contactDetails.email || 'No email logged',
        role: 'Recruiter'
      });
    }
    if (job.contacts && Array.isArray(job.contacts)) {
      job.contacts.forEach(c => {
        if (c.name) {
          list.push({
            name: c.name,
            email: c.email || 'No email logged',
            role: c.role || 'Contact'
          });
        }
      });
    }

    return list;
  }, [job.contactDetails, job.contacts]);


  

  const draftToCreatedMessaging = useMemo(() => {
    return trackerGenerationPreview || {
      mode: 'tailored' as const,
      title: 'Documents will be generated',
      summary: 'Moving this job to Created will start CV and cover letter generation for this tracker journey.',
      supportMessage: 'The tracker will show whether the generated drafts are tailored or fallback once processing begins.'
    };
  }, [trackerGenerationPreview]);


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

  // Sync initialJourneys from parent
  useEffect(() => {
    setJourneys(initialJourneys || []);
  }, [initialJourneys]);

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
      if (timelineIndex !== undefined) {
        setCurrentTimelineIndex(timelineIndex);
      }

      window.open(mailtoLink, '_blank');

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

  const notesSource = primaryJourney ? 'journey' : 'job';
  const notesString = primaryJourney ? ((primaryJourney as any).notes || '') : (job.notes || '');




  const generationState = primaryJourney?.generationState;
  
  const isGenerating = !!(
    (job.relationship?.journey && (
      job.relationship.journey.status === "processing_documents" ||
      (job.relationship.journey.status !== "creation_failed" &&
       job.relationship.journey.status !== "ready" &&
       (!job.relationship.documents?.cv?.id || !job.relationship.documents?.coverLetter?.id))
    )) ||
    (primaryJourney && (
      primaryJourney.status === "processing_documents" ||
      (primaryJourney.status !== "creation_failed" &&
       primaryJourney.status !== "ready" &&
       (!primaryJourney.cvId || !primaryJourney.coverLetterId))
    ))
  );

  // Progress simulation timer
  useEffect(() => {
    if (!isGenerating) {
      setProgress(15);
      return;
    }

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const inc = Math.floor(Math.random() * 5) + 3; // 3% to 7%
        return Math.min(95, prev + inc);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGenerating]);

  // Polling database for updates on journey status
  useEffect(() => {
    if (!isGenerating || !primaryJourney) return;

    let isMounted = true;
    const pollTimer = setInterval(async () => {
      try {
        const jobId = job.id || job._id;
        const url = `/api/application-journey?jobId=${jobId}`;
        let res;
        if (user?.id) {
          res = await authenticatedFetchWithUserId(url, user.id);
        } else {
          res = await fetch(url);
        }
        if (res.ok && isMounted) {
          const result = await res.json();
          if (result.success && result.data?.journeys && result.data.journeys.length > 0) {
            const updatedJourney = result.data.journeys.find(
              (j: any) => j.id === primaryJourney.id || j._id === primaryJourney.id || j.jobId === jobId
            );
            if (updatedJourney) {
              const hasBoth = updatedJourney.cvId && updatedJourney.coverLetterId;
              const notProcessing = updatedJourney.status !== "processing_documents";
              if (hasBoth || notProcessing || updatedJourney.status === "ready" || updatedJourney.status === "creation_failed") {
                clearInterval(pollTimer);
                if (isMounted) {
                  await onRefresh();
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error polling journey status in Sidebar:", err);
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
    };
  }, [isGenerating, primaryJourney, job.id, job._id, onRefresh]);

  const keywordMatchScore = insights?.keywordMatchScore ?? job.atsScore ?? 0;
  const followUpTimeline = useMemo(() => getFollowUpTimeline(job), [job.status, job.updatedAt, job.deadline]);
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
      { key: 'created', label: 'Staging' },
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
  const nextFollowUpAt = useMemo(() => {
    const followUps = job.followUps || [];
    if (!followUps.length) return undefined;
    const sorted = [...followUps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const raw = sorted[0].date;
    return raw instanceof Date ? raw : new Date(raw);
  }, [job.followUps]);
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
    if (!user?.id || (!primaryJourney && !job.relationship?.journey)) {
      return;
    }

    const targetId = documentType === 'cv'
      ? (job.relationship?.documents?.cv?.id || primaryJourney?.cvId)
      : (job.relationship?.documents?.coverLetter?.id || primaryJourney?.coverLetterId);
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



  const handleCreateJourney = async () => {
    if (isCreatingJourney || loadingJourneys) return; // Prevent multiple clicks and race conditions

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
        if (job.status === 'draft') {
          await moveJobToCreated(currentJobId, user.id, showExhaustionModal, toast, async () => {
            await onRefresh();
          });
          return;
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
        // Parent will refresh and pass down new journeys via initialJourneys
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
      await moveJobToCreated(jobId, user.id, showExhaustionModal, toast, async () => {
        window.dispatchEvent(new CustomEvent('creditsUpdated'));
        await onRefresh();
      });
    } finally {
      setIsMovingToCreated(false);
    }
  };

  const handleMoveToCreated = async () => {
    if (isMovingToCreated || !user?.id) return;

    const preview = trackerGenerationPreview || await loadTrackerGenerationPreview(user?.id);
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
      window.dispatchEvent(new CustomEvent('journeyDeleted', { detail: { journeyId } }));

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
      window.dispatchEvent(new CustomEvent('jobDeleted', { detail: { jobId } }));
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

  const bodyOverflowRef = useRef(0);

  useEffect(() => {
    bodyOverflowRef.current += 1;
    document.body.style.overflow = 'hidden';

    return () => {
      bodyOverflowRef.current -= 1;
      if (bodyOverflowRef.current <= 0) {
        bodyOverflowRef.current = 0;
        document.body.style.overflow = '';
      }
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
      open_details: () => {
        setIsEditingDetails(true);
        setActiveTab('details');
      },
      open_insights: () => {
        setActiveTab('details');
      },
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
        setIsEditingDetails(true);
        setActiveTab('details');
        return;
      case 'open_insights':
        setActiveTab('details');
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
      setActiveTab('details');
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
          className="fixed bg-black/50 backdrop-blur-sm z-[9998]"
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
          className="fixed right-0 top-0 h-screen bg-white dark:bg-[#141810] shadow-2xl z-[9999] flex flex-col transition-all duration-300"
          style={{ width: sidebarWidth, right: '0' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-4 sm:p-6 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                <h2 className="text-h3 font-semibold text-gray-900 dark:text-white truncate">{job.jobTitle || job.title}</h2>
                <span className="text-gray-500 dark:text-gray-400 text-small">at</span>
                <h3 className="text-body font-semibold text-gray-800 dark:text-gray-200 truncate">{job.company}</h3>
                
                {/* Sponsorship Tag */}
                {job.sponsorship && job.sponsorship !== 'unknown' && (
                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    job.sponsorship === 'yes'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {job.sponsorship === 'yes' ? 'Sponsorship' : 'No Sponsorship'}
                  </span>
                )}
              </div>

              {/* Sub-header meta row: Location, Salary, Job Type */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                {job.location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={12} className="text-gray-400" />
                    <span>{job.location}</span>
                  </div>
                )}
                
                {(job.salary?.min || job.salary?.max) && (
                  <>
                    <span className="text-gray-300 dark:text-white/10 hidden sm:inline">&bull;</span>
                    <div className="flex items-center gap-1">
                      <DollarSign size={12} className="text-gray-400" />
                      <span>{formatJobSalary(job.salary)}</span>
                    </div>
                  </>
                )}

                {(job.jobType || job.type) && (
                  <>
                    <span className="text-gray-300 dark:text-white/10 hidden sm:inline">&bull;</span>
                    <div className="flex items-center gap-1">
                      <Briefcase size={12} className="text-gray-400" />
                      <span className="capitalize">{job.jobType || job.type}</span>
                    </div>
                  </>
                )}

                {job.priority && (
                  <>
                    <span className="text-gray-300 dark:text-white/10 hidden sm:inline">&bull;</span>
                    <div className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        job.priority === 'high' ? 'bg-red-500' : job.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <span className="capitalize">{job.priority} Priority</span>
                    </div>
                  </>
                )}
              </div>
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
              {isConfirmingDeleteJob ? (
                <div className="flex items-center gap-1.5 bg-red-500/10 dark:bg-red-500/20 border border-red-500/35 rounded-xl px-2 py-1 animate-in fade-in slide-in-from-right-2 duration-200">
                  <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 select-none">Delete Job?</span>
                  <button
                    onClick={handleDeleteJob}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-extrabold uppercase transition-all"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setIsConfirmingDeleteJob(false)}
                    className="px-2 py-1 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-extrabold uppercase transition-all"
                  >
                    No
                  </button>
                </div>
              ) : (
                <motion.button
                  onClick={() => setIsConfirmingDeleteJob(true)}
                  className="p-2 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Delete Job"
                >
                  <Trash2 size={20} className="text-gray-600 dark:text-white/60 group-hover:text-red-500 transition-colors" />
                </motion.button>
              )}
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
                {terminalStageLabel && (
                  <div className="flex justify-end">
                    <span className="rounded-full bg-red-100 px-3 py-1 text-small font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      {terminalStageLabel}
                    </span>
                  </div>
                )}

                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-emerald-500/10 dark:bg-[#131810] relative overflow-hidden">
                  {/* Progress Line Background */}
                  <div className="absolute left-[8.33%] right-[8.33%] top-[28px] h-[2px] bg-gray-150 dark:bg-emerald-500/15" />
                  
                  {/* Active Progress Line */}
                  {(() => {
                    const currentIndex = stageItems.findIndex(s => s.isCurrent);
                    const lastCompletedIndex = stageItems.reduce((maxIdx, s, idx) => s.isCompleted ? idx : maxIdx, 0);
                    const activeIndex = currentIndex > -1 ? currentIndex : lastCompletedIndex;
                    const progressWidthPercent = (activeIndex / (stageItems.length - 1)) * 83.33;
                    return (
                      <div 
                        className="absolute left-[8.33%] top-[28px] h-[2px] bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progressWidthPercent}%` }}
                      />
                    );
                  })()}

                  <div className="grid grid-cols-6 relative z-10">
                    {stageItems.map((stage, index) => {
                      return (
                        <div key={stage.key} className="flex flex-col items-center text-center">
                          {/* Node Circle */}
                          <div className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200 border ${
                            stage.isCurrent
                              ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-500/15 scale-105'
                              : stage.isCompleted
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-gray-50 text-gray-400 dark:bg-[#151a11] dark:text-gray-500 border-gray-200 dark:border-white/5'
                          }`}>
                            {stage.isCompleted ? <CheckCircle size={12} className="stroke-[2.5]" /> : index + 1}
                          </div>

                          {/* Stage Label */}
                          <p className={`text-[11px] font-bold capitalize truncate max-w-full px-1 ${
                            stage.isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                          }`}>
                            {stage.label}
                          </p>

                          {/* Status/Date */}
                          <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-full px-1">
                            {stage.stageDate ? formatTimelineDate(stage.stageDate) : stage.statusLabel}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Journey Card and Aging Tracker side-by-side (60:40 split) */}
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
                {/* Left Column (60%): Journey Card */}
                <div className="lg:col-span-6 flex flex-col">
                  <div className={`flex-1 rounded-[24px] border p-5 shadow-sm ${journeyCardData.toneClasses} flex flex-col justify-between h-full`}>
                    <div className="flex flex-col gap-4">
                      {/* Top Row: Eyebrow & Description */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-small font-black text-gray-900 dark:text-white uppercase tracking-wider">
                              {journeyCardData.title || (job.status === 'applied' || job.status === 'screening' ? 'Journey Snapshot' : 'Next Steps')}
                            </h4>
                          </div>
                          <p className={`text-small text-gray-600 dark:text-gray-300 leading-normal ${
                            journeyCardData.summary.includes("ready to review") ? "lg:whitespace-nowrap overflow-x-auto scrollbar-none" : ""
                          }`}>
                            {journeyCardData.summary}
                          </p>

                          {/* Progress Bar for document generation */}
                          {isGenerating && (
                            <div className="mt-3 space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-blue-600 dark:text-blue-400 animate-pulse">Generating Documents...</span>
                                <span className="text-blue-600 dark:text-blue-400">{progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-1.5 rounded-full bg-blue-500 transition-all duration-500 ease-out"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Stats chips row - hidden if CV or Cover Letter is ready to merge them into preview area */}
                        {journeyCardData.stats && journeyCardData.stats.length > 0 && !job.relationship?.documents?.cv?.id && !job.relationship?.documents?.coverLetter?.id && !primaryJourney?.cvId && !primaryJourney?.coverLetterId && (
                          <div className="flex flex-wrap gap-2 shrink-0 md:justify-end">
                            {journeyCardData.stats.map((stat) => (
                              <div key={stat.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                                <span className="opacity-60">{stat.label}:</span>
                                <span className="font-extrabold text-[#80FF00] dark:text-[#99FF00]">{stat.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Previews / Document Indicators Inline */}
                      {(job.relationship?.journey || primaryJourney) && (
                        <div className="flex flex-wrap items-center gap-3 bg-white/40 dark:bg-white/5 border border-gray-200/40 dark:border-white/5 rounded-xl p-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Ready Previews:</span>
                          <div className="flex flex-wrap gap-2">
                            {(job.relationship?.documents?.cv?.id || primaryJourney?.cvId) ? (
                              <button
                                onClick={() => void handleOpenDocumentPreview('cv')}
                                disabled={previewLoading === 'cv'}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-[#1a2015] px-2.5 py-1.5 text-small font-semibold text-gray-700 hover:bg-gray-50 dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-tertiary)] transition-colors"
                              >
                                {previewLoading === 'cv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                <span>CV: </span>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-emerald-600 dark:text-[#99FF00] text-[10px] font-black uppercase tracking-wider">Ready</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => void runSidebarAction(journeyCardData.primaryActionId)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-white/10 bg-white/40 dark:bg-[#1a2015]/40 px-2.5 py-1.5 text-small font-semibold text-gray-500 hover:text-emerald-500 dark:text-gray-405 transition-all"
                                title="Regenerate CV"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-gray-400" />
                                <span>CV: </span>
                                <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Regenerate</span>
                              </button>
                            )}

                            {(job.relationship?.documents?.coverLetter?.id || primaryJourney?.coverLetterId) ? (
                              <button
                                onClick={() => void handleOpenDocumentPreview('coverLetter')}
                                disabled={previewLoading === 'coverLetter'}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-[#1a2015] px-2.5 py-1.5 text-small font-semibold text-gray-700 hover:bg-gray-50 dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-tertiary)] transition-colors"
                              >
                                {previewLoading === 'coverLetter' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                <span>Cover Letter: </span>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-emerald-600 dark:text-[#99FF00] text-[10px] font-black uppercase tracking-wider">Ready</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => void runSidebarAction(journeyCardData.primaryActionId)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-white/10 bg-white/40 dark:bg-[#1a2015]/40 px-2.5 py-1.5 text-small font-semibold text-gray-500 hover:text-emerald-500 dark:text-gray-450 transition-all"
                                title="Regenerate Cover Letter"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-gray-400" />
                                <span>Cover Letter: </span>
                                <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Regenerate</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="h-[1px] bg-gray-205/60 dark:bg-white/5" />

                      {/* Actions and status inline */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mt-auto">
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() => void runSidebarAction(journeyCardData.primaryActionId)}
                            disabled={isMovingToCreated || isCreatingJourney}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#80FF00] px-4 py-2.5 text-small font-black text-black shadow-sm transition hover:brightness-95 dark:bg-[#99FF00] disabled:opacity-60"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <span>{journeyCardData.primaryLabel}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </motion.button>
                          {journeyCardData.secondaryAction && journeyCardData.secondaryLabel && (
                            <motion.button
                              onClick={() => journeyCardData.secondaryActionId && void runSidebarAction(journeyCardData.secondaryActionId)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-250 bg-white px-4 py-2.5 text-small font-black text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-all"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {journeyCardData.secondaryLabel}
                            </motion.button>
                          )}
                        </div>

                        {/* Journey Status Nudge - stage-aware */}
                        {(() => {
                          const terminalStages = ['accepted', 'rejected', 'withdrawn'] as const;
                          const isTerminal = terminalStages.includes(job.status as any);
                          if (job.status === 'draft') {
                            return (
                              <div className="flex items-center gap-1.5 text-small text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                                <span>Move to Created to start the tracker journey</span>
                              </div>
                            );
                          }
                          if (isTerminal) {
                            return (
                              <div className="flex items-center gap-1.5 text-small text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>
                                  <strong className="capitalize text-gray-700 dark:text-gray-300">{job.status}</strong>&mdash;Job closed. Review or archive.
                                </span>
                              </div>
                            );
                          }
                          if (primaryJourney) {
                            return (
                              <div className="flex items-center gap-1.5 text-small text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#80FF00] animate-pulse shrink-0" />
                                <span>Status: <strong className="capitalize text-gray-700 dark:text-gray-300">{primaryJourney.status?.replace(/_/g, ' ') || 'In progress'}</strong></span>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center gap-1.5 text-small text-gray-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>Journey not started</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (40%): Aging Tracker & Quick Links */}
                <div className="lg:col-span-4 flex flex-col">
                  <AgingTrackerWidget
                    status={job.status}
                    applicationDate={job.applicationDate}
                    deadline={job.deadline}
                    nextFollowUpAt={nextFollowUpAt}
                  />
                </div>
              </div>

              {isRecruiterVisibilityStage && (
                <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810]">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-small font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Recruiter Visibility</p>
                      <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Outreach that keeps this application visible</h3>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-small font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {job.status === 'screening' ? 'Screening follow-up' : 'Applied follow-up'}
                    </span>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-3">
                      {recruiterVisibilitySteps.map((step, index) => (
                        <div key={`${step}-${index}`} className="flex items-start gap-3">
                          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                          <p className="text-small leading-6 text-gray-700 dark:text-gray-300">{step}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#181f16]">
                      <div>
                        <p className="text-small font-semibold text-gray-900 dark:text-white">Current action path</p>
                        <p className="mt-1 text-small leading-6 text-gray-600 dark:text-gray-300">
                          {hasRecruiterEmail
                            ? 'Open the draft email now, then confirm whether you sent it so the tracker can keep the timeline honest.'
                            : 'Use the manual fallback first: copy the draft, add a recruiter email, or send the same message through LinkedIn.'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => handleOpenEmail(0)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#80FF00] px-4 py-3 text-small font-semibold text-black shadow-sm transition hover:brightness-95"
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
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-small font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-white/10 dark:bg-[#20281d] dark:text-white dark:hover:bg-[#273021]"
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
                          <p className="text-small font-semibold text-gray-900 dark:text-white">Manual outreach fallback</p>
                          <p className="text-small text-gray-500 dark:text-gray-400">
                            Subject: {getEmailSubject(job)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyToClipboard(getEmailSubject(job), 'subject')}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-small font-medium text-gray-700 transition hover:bg-white dark:border-white/10 dark:text-gray-200 dark:hover:bg-[#20281d]"
                          >
                            Copy Subject
                          </button>
                          <button
                            onClick={() => handleCopyToClipboard(getEmailTemplate(job), 'email')}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-small font-medium text-gray-700 transition hover:bg-white dark:border-white/10 dark:text-gray-200 dark:hover:bg-[#20281d]"
                          >
                            Copy Message
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 whitespace-pre-wrap rounded-xl bg-white px-4 py-4 text-small leading-6 text-gray-700 dark:bg-[#20281d] dark:text-gray-300">
                        {getEmailTemplate(job)}
                      </div>
                    </div>
                  )}

                  {/* Integrated Inbox & Emails */}
                  <div className="mt-5 pt-5 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-emerald-500" />
                        <p className="text-small font-semibold text-gray-900 dark:text-white">Inbox & Emails</p>
                      </div>
                      
                      {isPremiumUser ? (
                        isEmailConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <span className="h-1 w-1 rounded-full bg-emerald-500"></span>
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
                            Disconnected
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm animate-pulse">
                          🔒 Focused / Pro
                        </span>
                      )}
                    </div>

                    <div className="text-small leading-5">
                      {isPremiumUser ? (
                        isEmailConnected ? (
                          <div className="space-y-2">
                            <p className="text-gray-500 dark:text-gray-400">
                              Inbox connection active (<b>{connectedEmailAddress}</b>). Recruiter threads are linked and stages are updated automatically.
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('communication')}
                              className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-600 font-semibold"
                            >
                              View Recruiter Threads & Reply <ArrowRight size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-gray-500 dark:text-gray-400">
                              Connect your inbox (Gmail/Outlook) to automatically sync emails from recruiters and track pipeline status.
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsEmailConnectModalOpen(true)}
                              className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-600 font-semibold"
                            >
                              Connect Inbox / View Comms <ArrowRight size={12} />
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="relative rounded-2xl border border-white/5 bg-[#161d12] p-4 text-center overflow-hidden">
                          <p className="text-gray-300 font-semibold mb-1">Recruiter Auto-Sync</p>
                          <p className="text-[11px] text-gray-500 mb-3 max-w-sm mx-auto leading-relaxed">
                            Upgrade to Focused or Pro to connect Gmail, Outlook, or IMAP. Automatically match emails, parse interviews, and auto-update journey stages.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowUpgradePopupState(true)}
                            className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black rounded-xl text-small font-bold transition shadow-md shadow-lime-500/10"
                          >
                            Upgrade to Unlock
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}


              {/* Dynamic Tabbed Content Panel with increased height */}
              <div className="rounded-[24px] border border-gray-200 bg-white shadow-sm dark:border-emerald-500/10 dark:bg-[#131810] overflow-hidden min-h-[500px] flex flex-col">
                {/* Tab Header bar */}
                <div className="flex border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#151a11]/30 px-2 py-1 overflow-x-auto scrollbar-hide flex-shrink-0">
                  {[
                    { key: 'details', label: 'Details' },
                    { key: 'communication', label: 'Communication', badge: 0 || recruiterVisibilitySteps.length || undefined },
                    { key: 'people', label: 'People', badge: contacts.length || undefined },
                    { key: 'notes', label: 'Notes' },
                    { key: 'files', label: 'Files', badge: ((job.relationship?.documents?.cv?.id || primaryJourney?.cvId) ? 1 : 0) + ((job.relationship?.documents?.coverLetter?.id || primaryJourney?.coverLetterId) ? 1 : 0) || undefined }
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => handleTabChange(t.key as typeof activeTab)}
                      className={`relative flex items-center gap-1.5 px-4 py-3 text-small font-bold transition-all whitespace-nowrap ${
                        activeTab === t.key
                          ? 'text-emerald-600 dark:text-[#80FF00]'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      <span>{t.label}</span>
                      {t.badge !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-black">
                          {t.badge}
                        </span>
                      )}
                      {activeTab === t.key && (
                        <motion.div
                          layoutId="activeTabUnderline"
                          className="absolute bottom-0 left-4 right-4 h-[2px] bg-emerald-500 dark:bg-[#80FF00]"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content Panel */}
                <div className="p-5 flex-1 flex flex-col min-h-0">
                  {activeTab === 'details' && (
                    <JobDetailsTab
                      job={job}
                      user={user}
                      onRefresh={async () => { if (onRefresh) await onRefresh(); }}
                      isEditingDetails={isEditingDetails}
                      setIsEditingDetails={setIsEditingDetails}
                      sidebarConfig={sidebarConfig}
                      runSidebarAction={runSidebarAction}
                      nextFollowUpAt={nextFollowUpAt}
                    />
                  )}

                  {activeTab === 'communication' && (
                    <JobCommunicationTab
                      job={job}
                      isRecruiterVisibilityStage={isRecruiterVisibilityStage}
                      recruiterVisibilitySteps={recruiterVisibilitySteps}
                      hasRecruiterEmail={hasRecruiterEmail}
                      handleOpenEmail={handleOpenEmail}
                      setIsEmailConnectModalOpen={setIsEmailConnectModalOpen}
                      user={user}
                      onRefresh={async () => { if (onRefresh) await onRefresh(); }}
                    />
                  )}

                  {activeTab === 'people' && (
                    <JobPeopleTab
                      job={job}
                      user={user}
                      onRefresh={async () => { if (onRefresh) await onRefresh(); }}
                    />
                  )}

                  {activeTab === 'notes' && (
                    <JobNotesTab
                      job={job}
                      user={user}
                      notesString={notesString}
                      notesSource={notesSource}
                      activeActionPayload={activeActionPayload}
                      primaryJourney={primaryJourney || undefined}
                      onRefresh={async () => { if (onRefresh) await onRefresh(); }}
                    />
                  )}

                  {activeTab === 'files' && (
                    <JobFilesTab
                      job={job}
                      primaryJourney={primaryJourney || undefined}
                      previewLoading={previewLoading}
                      handleOpenDocumentPreview={handleOpenDocumentPreview}
                      runSidebarAction={runSidebarAction}
                      journeyCardData={journeyCardData}
                      user={user}
                      onRefresh={onRefresh}
                    />
                  )}
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
            className="fixed inset-0 z-[1001] bg-black/70 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
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
                <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">
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
              id: job.id || job._id,
              _id: job._id || job.id,
              userId: job.userId,
              jobTitle: job.jobTitle,
              company: job.company,
              location: job.location,
              jobUrl: job.jobUrl,
              jobDescription: job.jobDescription,
              notes: job.notes,
              priority: job.priority,
              status: job.status,
              deadline: job.deadline ? new Date(job.deadline) : undefined,
              applicationDate: job.applicationDate ? new Date(job.applicationDate) : undefined,
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
            className="fixed inset-0 z-[1001] bg-black/70 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
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
                <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">
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
          cvData={previewDocumentData}
          jobData={job}
          template={previewTemplate}
        />
        <EmailConnectModal
          isOpen={isEmailConnectModalOpen}
          onClose={() => setIsEmailConnectModalOpen(false)}
          onConnected={() => {
            fetchEmailStatus();

            if (onRefresh) onRefresh();
          }}
        />
      </>
    </AnimatePresence>
  );
};

export default JobSidebar;
