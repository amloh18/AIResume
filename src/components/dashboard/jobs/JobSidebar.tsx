'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetch, authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import {
  X, Briefcase, MapPin, DollarSign, Calendar, ExternalLink,
  FileText, CheckCircle, Clock, AlertCircle, Plus, Edit, Trash2,
  Target, Building2, Star, Copy, Archive, ChevronDown, User, Mail, Phone, TrendingUp,
  Eye, ArrowRight, Sparkles, Loader2, FileCheck, Tag, Download, Pencil, Check, RefreshCw, Send, Shield, Save, Edit2, Bookmark, CheckCircle2, BarChart3, Inbox
} from 'lucide-react';

// Ensure all icons are properly tree-shaken and available
// This prevents HMR issues with missing icon exports
import JourneyTimelineCard from '../JourneyTimelineCard';
import JobInfoContent from '../JobInfoContent';
import EditJobSidebar from './EditJobSidebar';
import DocumentPreviewSidebar from './DocumentPreviewSidebar';
import FormattedJobDescription from '@/components/jobs/FormattedJobDescription';
import toast from '@/lib/hot-toast';
import { haptic } from '@/lib/utils/haptic';
import { Button } from '@/components/ui';
import { useUserData } from '@/lib/hooks/useUserData';
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
import { useJobLiveStatusStore } from '@/lib/stores/jobLiveStatusStore';
import { JobLiveStatusCard } from '@/components/jobs/JobLiveStatusCard';

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
  matchScore?: number;
  atsType?: string;
  atsAnalysis?: any;
  statusHistory?: any[];
  extractedJd?: any;
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
  const { userData } = useUserData();
  const userPlanKey = userData?.currentPlanKey || userData?.subscription?.planKey || 'free';
  const isPremiumUser = ['focused_monthly', 'focused_yearly', 'focused_monthly', 'focused_quarterly', 'focused_yearly', 'focused_yearly', 'pro'].includes(userPlanKey);
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsModalView, setDetailsModalView] = useState<'details' | 'insights'>('details');
  
  // 5 Tab Navigation: analytics | details | communication | documents | notes
  type SidebarTab = 'analytics' | 'details' | 'communication' | 'documents' | 'notes';
  const [activeTab, setActiveTab] = useState<SidebarTab>('analytics');
  const [jobNotes, setJobNotes] = useState<string>(job.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [jobTags, setJobTags] = useState<string[]>(job.tags || []);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    setJobNotes(job.notes || '');
    setJobTags(job.tags || []);
    setIsEditingNotes(false);
  }, [job]);

  const handleSaveNotes = async () => {
    const targetJobId = job._id || job.id;
    if (!targetJobId) {
      toast.error('Unable to save: Job ID not found');
      return;
    }
    setIsSavingNotes(true);
    try {
      const currentUserId = user?.id || (user as any)?._id;
      const res = currentUserId
        ? await authenticatedFetchWithUserId(`/api/jobs/${targetJobId}`, currentUserId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notes: jobNotes,
              tags: jobTags,
            }),
          })
        : await authenticatedFetch(`/api/jobs/${targetJobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notes: jobNotes,
              tags: jobTags,
            }),
          });
      if (res.ok) {
        toast.success('Notes & tags saved successfully!');
        job.notes = jobNotes;
        job.tags = jobTags;
        setIsEditingNotes(false);
        if (typeof onRefresh === 'function') {
          onRefresh();
        }
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || 'Failed to save notes');
      }
    } catch (err: any) {
      console.error('Error saving notes:', err);
      toast.error(err.message || 'Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (jobTags.includes(trimmed)) {
      setNewTagInput('');
      return;
    }
    const updated = [...jobTags, trimmed];
    setJobTags(updated);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setJobTags(jobTags.filter((t) => t !== tagToRemove));
  };

  const [fallbackMasterCvId, setFallbackMasterCvId] = useState<string | null>(null);

  const handleDownloadDocument = (docType: 'cv' | 'coverLetter') => {
    const targetId =
      docType === 'cv'
        ? primaryJourney?.cvId || (job as any).cvId || fallbackMasterCvId
        : primaryJourney?.coverLetterId || (job as any).coverLetterId;
    if (!targetId) {
      toast.error(`No ${docType === 'cv' ? 'CV' : 'Cover Letter'} available to download.`);
      return;
    }
    const url =
      docType === 'cv'
        ? `/api/cvs/${targetId}/download?format=pdf`
        : `/api/cover-letters/${targetId}/download`;
    window.open(url, '_blank');
  };

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

  // Email connection status
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

  useEffect(() => {
    fetchEmailStatus();
  }, [jobId, fetchEmailStatus]);

  // Dynamic data hooks
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
    const targetJobId = job._id || job.id;
    if (!user?.id || !targetJobId) return;

    setLoadingJourneys(true);
    try {
      const response = await authenticatedFetchWithUserId(`/api/application-journey?jobId=${targetJobId}`, user.id);
      const result = await response.json();

      if (result.success && result.data?.journeys) {
        setJourneys(result.data.journeys);
      } else {
        setJourneys([]);
      }
    } catch (error) {
      setJourneys([]);
    } finally {
      setLoadingJourneys(false);
    }
  };

  // Load CV data for user information and document previews
  const loadCVData = async (cvId?: string) => {
    if (!user?.id) return;

    setLoadingCV(true);
    try {
      // First try to get CV from journey if cvId provided
      let targetCvId = cvId || (job as any).cvId;

      // If no cvId from journey, try to get master CV
      if (!targetCvId) {
        const masterCVResponse = await authenticatedFetchWithUserId('/api/cvs/master', user.id);
        const masterCVResult = await masterCVResponse.json();
        if (masterCVResult.success && masterCVResult.data?.masterCV) {
          targetCvId = masterCVResult.data.masterCV._id || masterCVResult.data.masterCV.id;
          if (targetCvId) {
            setFallbackMasterCvId(targetCvId);
          }
        }
      }

      if (targetCvId) {
        setFallbackMasterCvId(targetCvId);
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
        if (masterCVResult.success && masterCVResult.data?.masterCV) {
          const masterId = masterCVResult.data.masterCV._id || masterCVResult.data.masterCV.id;
          if (masterId) setFallbackMasterCvId(masterId);
          if (masterCVResult.data.masterCV.cvData) {
            setCvData(masterCVResult.data.masterCV.cvData);
          }
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
    const currentJobId = job?._id || job?.id;
    if (user?.id && currentJobId) {
      loadJourneysForJob();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, job?._id, job?.id]);

  // Load CV data when journeys are loaded or when modal opens
  useEffect(() => {
    if (user?.id) {
      const firstJourneyWithCV = journeys.find(j => j.cvId);
      loadCVData(firstJourneyWithCV?.cvId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys, user?.id, job?._id, job?.id]);

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

  // Get user email — prefer Stalwart/application sender email, not CV data
  const getUserEmail = () => {
    if ((user as any)?.stalwartEmail) {
      return (user as any).stalwartEmail;
    }
    if (process.env.NEXT_PUBLIC_APPLICATION_SENDER_EMAIL) {
      return process.env.NEXT_PUBLIC_APPLICATION_SENDER_EMAIL;
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

  const formatStageDateTime = useCallback((date?: string | Date | null) => {
    if (!date) return null;
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return null;
    const month = parsedDate.toLocaleDateString('en-US', { month: 'short' });
    const day = parsedDate.getDate();
    const time = parsedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${month} ${day} · ${time}`;
  }, []);

  const formatTimeAgo = useCallback((date?: string | Date | null) => {
    if (!date) return null;
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
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
  type StageStatus = 'completed' | 'current' | 'processing' | 'blocked' | 'failed' | 'upcoming';

  const stageItems = useMemo(() => {
    const normalizedTimelineStatus = job.status === 'screening' ? 'applied' : job.status;
    const liveStatus = useJobLiveStatusStore.getState().statuses[jobId];

    const items = [
      {
        key: 'draft',
        label: 'Saved',
        subLabel: 'Job bookmarked to tracker',
        icon: Bookmark,
        activeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
        completedColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      },
      {
        key: 'created',
        label: 'Tailored',
        subLabel: 'CV & cover letter tailored',
        icon: Sparkles,
        activeColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30',
        completedColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      },
      {
        key: 'applied',
        label: 'Applied',
        subLabel: job.status === 'screening' ? 'In recruiter screening' : 'Application submitted',
        icon: Send,
        activeColor: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30',
        completedColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      },
      {
        key: 'interview',
        label: 'Interview',
        subLabel: 'Interview rounds & prep',
        icon: Calendar,
        activeColor: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30',
        completedColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      },
      {
        key: 'offer',
        label: 'Offer',
        subLabel: 'Offer package review & terms',
        icon: Target,
        activeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        completedColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      },
      {
        key: job.status === 'rejected' ? 'rejected' : 'accepted',
        label: job.status === 'rejected' ? 'Rejected' : 'Accepted',
        subLabel: job.status === 'rejected' ? 'Application closed' : 'Offer accepted & confirmed',
        icon: job.status === 'rejected' ? X : CheckCircle2,
        activeColor: job.status === 'rejected' ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        completedColor: job.status === 'rejected' ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      },
    ];

    const currentIndex = items.findIndex(item => item.key === normalizedTimelineStatus);
    const lastReachedIndex = items.reduce((lastIndex, item, index) => {
      return getStageTransitionDate(item.key) ? index : lastIndex;
    }, -1);

    return items.map((item, index) => {
      const isCurrent = currentIndex > -1 ? item.key === normalizedTimelineStatus : false;
      const isCompleted = currentIndex > -1 ? index < currentIndex : index <= lastReachedIndex;
      const isUpcoming = currentIndex > -1 ? index > currentIndex : index > lastReachedIndex;
      const stageDate = getStageTransitionDate(item.key);

      let status: StageStatus = 'upcoming';
      if (isCompleted) {
        status = 'completed';
      } else if (isCurrent) {
        if (liveStatus && liveStatus.step === 'failed') {
          status = 'failed';
        } else if (liveStatus && (liveStatus.step === 'submitting' || liveStatus.step === 'tailoring' || liveStatus.step === 'matching' || liveStatus.step === 'queued')) {
          status = 'processing';
        } else if (job.status === 'screening' && item.key === 'applied') {
          status = 'current';
        } else {
          status = 'current';
        }
      }

      let dateLabel = 'Upcoming';
      if (status === 'completed' && stageDate) {
        dateLabel = formatStageDateTime(stageDate) || formatTimelineDate(stageDate);
      } else if (status === 'current') {
        if (stageDate) {
          dateLabel = formatTimeAgo(stageDate) || formatStageDateTime(stageDate) || 'In progress';
        } else {
          dateLabel = 'In progress';
        }
      } else if (status === 'processing') {
        dateLabel = 'In progress';
      } else if (status === 'failed') {
        dateLabel = stageDate ? `Failed · ${formatStageDateTime(stageDate)}` : 'Failed';
      }

      return {
        ...item,
        status,
        isCurrent,
        isCompleted,
        isUpcoming,
        stageDate,
        dateLabel,
      };
    });
  }, [getStageTransitionDate, job.status, jobId]);
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
    if (!user?.id) {
      return;
    }

    const targetId =
      documentType === 'cv'
        ? primaryJourney?.cvId || (job as any).cvId || fallbackMasterCvId
        : primaryJourney?.coverLetterId || (job as any).coverLetterId;

    if (!targetId) {
      toast.error(`No ${documentType === 'cv' ? 'CV' : 'cover letter'} document linked.`);
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
  }, [primaryJourney, job, fallbackMasterCvId, user?.id]);

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
        // Dispatch jobUpdated event to sync saved state across components
        window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: job.id || job._id, status: 'created' } }));
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
    const returnUrl = `/dashboard/jobs?tab=applications&journeyId=${journey.id}`;
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

  const handleApplyNow = async (journey: any) => {
    try {
      const jobId = job._id || job.id;
      const atsType = (job as any).atsType || 'unknown';

      // Use unified auto-apply endpoint for all ATS types
      const applyRes = await fetch('/api/jobs/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          title: job.jobTitle || job.title,
          company: job.company,
          description: job.jobDescription || job.description || '',
          jobUrl: job.jobUrl || '',
          location: job.location || '',
          salary: job.salary,
          atsType,
          source: job.source || 'manual',
          screeningQuestions: [],
        }),
      });

      const applyData = await applyRes.json();

      if (!applyRes.ok) {
        throw new Error(applyData?.error?.message || 'Auto-apply failed');
      }

      /*
        The endpoint dedupes rather than enqueueing a second row. Nothing was
        submitted, so do NOT force this record to 'applied' — that would mark a
        job as applied when it is merely sitting in the queue.
      */
      if (applyData?.status === 'already_queued') {
        toast.success('This application is already queued for processing.');
        onRefresh?.();
        return;
      }

      // Update the existing record's status to applied
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'applied' }),
      });

      toast.success(applyData.message || 'Applied successfully!');
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply');
    }
  };

  const handleTailorAndApply = async () => {
    try {
      const jobId = job._id || job.id;

      // If no journey exists yet, create one first (triggers CV/cover letter tailoring)
      if (!primaryJourney) {
        await handleCreateJourney();
        toast.success('Journey created! Documents are being tailored...');
        return;
      }

      // If journey exists but documents aren't ready yet
      if (primaryJourney.status !== 'ready' && primaryJourney.status !== 'completed') {
        toast.success('Documents are still being generated. Please wait...');
        return;
      }

      // Apply using the unified endpoint
      await handleApplyNow(primaryJourney);
    } catch (err: any) {
      toast.error(err.message || 'Failed to tailor & apply');
    }
  };

  const handleUpdateJourney = (journeyId: string, updates: any) => {
    // Update the specific journey in local state
    setJourneys(prev => prev.map(journey =>
      journey.id === journeyId
        ? { ...journey, ...updates }
        : journey
    ));
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
        } catch (parseError) {
        }

        // Handle insufficient credits error (403) - show paywall
        if (statusResponse.status === 403) {
          const limit = errorData.limit || 1;
          const currentUsage = errorData.currentUsage || limit;
          const creditsRemaining = Math.max(0, limit - currentUsage);

          // Show paywall if requiresUpgrade is true OR if it's a 403 (credit error)
          if (errorData.requiresUpgrade || errorData.error?.includes('limit exceeded') || errorData.error?.includes('insufficient credits')) {
            showExhaustionModal(
              {
                creditsRemaining,
                limit,
                reason: errorData.message || errorData.error || 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs'
              },
              'focused_monthly'
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

      // Dispatch jobUpdated event to sync saved state across components
      window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId, status: 'created' } }));

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
          'focused_monthly'
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

  const handleQuickStatusChange = async (newStatus: string) => {
    try {
      const targetJobId = job._id || job.id;
      const res = await authenticatedFetchWithUserId(`/api/jobs/${targetJobId}`, user?.id || '', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Job stage updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}!`);
        // Dispatch jobUpdated event to sync saved state across components
        window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: targetJobId, status: newStatus } }));
        await onRefresh();
      } else {
        toast.error('Failed to update stage');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stage');
    }
  };

  const handleDeleteJourney = async (journeyId: string) => {
    try {
      setIsDeleting(true);
      const userId = user?.id;
      if (!userId) {
        return;
      }

      // Call the CV Journey API to delete the journey
      const response = await authenticatedFetchWithUserId('/api/application-journey', user.id, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete journey');
      }

      const result = await response.json();

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
      // Dispatch jobUpdated event to sync saved state across components
      window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: response.ok ? (await response.json()).job?._id : undefined, status: 'created' } }));
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
      const currentUserId = user?.id || (user as any)?._id;
      const targetJobId = job._id || job.id;

      if (!targetJobId) {
        toast.error('Job ID not found. Please refresh and try again.');
        return;
      }

      const response = currentUserId
        ? await authenticatedFetchWithUserId(`/api/jobs/${targetJobId}`, currentUserId, {
            method: 'DELETE',
          })
        : await authenticatedFetch(`/api/jobs/${targetJobId}`, {
            method: 'DELETE',
          });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || errorData.message || response.statusText || `Failed to delete job (Status ${response.status})`;
        throw new Error(errorMessage);
      }

      toast.success('Job deleted successfully!');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jobDeleted', { detail: { jobId: targetJobId } }));
      }
      setShowDeleteConfirm(null);
      onClose();
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
    } catch (error: any) {
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
      // Dispatch jobUpdated event to sync saved state across components
      window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId, isArchived: job.isArchived } }));
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track window width for responsive sidebar
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate sidebar width (70% width on desktop with margins, 100% full width on mobile)
  const sidebarWidth = useMemo(() => {
    return windowWidth >= 768 ? 'calc(70vw - 24px)' : '100%';
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
      return;
    }

    // Deep link with edit intent (e.g. /dashboard/tracker?jobId=X&edit=1)
    if (openContext.autoOpenEdit) {
      handleOpenEditModal();
    }
  }, [handleOpenInterviewCoach, handleOpenEditModal, job.status, openContext, sidebarConfig.actionPayloads]);

  const atsType = ((job as any).atsType && (job as any).atsType !== 'unknown') ? (job as any).atsType : null;
  const isAtsSupported = Boolean(atsType);
  const hasCvReady = Boolean(primaryJourney?.cvId || (job as any).cvId || fallbackMasterCvId);
  const hasCoverLetterReady = Boolean(primaryJourney?.coverLetterId || (job as any).coverLetterId);

  interface GuidanceAction {
    label: string;
    icon?: any;
    onClick: () => void;
    disabled?: boolean;
  }

  interface GuidanceHubData {
    badgeText: string;
    badgeClasses: string;
    toneClasses: string;
    title: string;
    description: string;
    primaryAction?: GuidanceAction;
    secondaryActions: GuidanceAction[];
  }

  const guidanceHub: GuidanceHubData = useMemo(() => {
    const stage = job.status as string;

    if (stage === 'draft' || stage === 'saved') {
      return {
        badgeText: 'Draft Saved',
        badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
        toneClasses: 'border-blue-200/80 bg-gradient-to-b from-blue-50/30 to-white dark:border-blue-500/20 dark:from-blue-950/20 dark:to-[#131810]',
        title: 'Tailor Your Application to Stand Out',
        description: isAtsSupported
          ? `This role supports 1-click Auto-Apply (${atsType?.toUpperCase()}). Generate tailored documents now to maximize keyword alignment and submit automatically.`
          : 'This position requires a direct company application. Generate tailored documents to download your custom CV and cover letter before applying on the company portal.',
        primaryAction: {
          label: isAtsSupported ? 'Tailor & Auto-Apply' : 'Tailor Application',
          icon: Sparkles,
          onClick: () => void handleTailorAndApply(),
          disabled: isCreatingJourney || isMovingToCreated,
        },
        secondaryActions: [
          {
            label: 'Move to Staging',
            icon: ArrowRight,
            onClick: () => void handleMoveToCreated(),
          },
          {
            label: 'Edit Job',
            icon: Pencil,
            onClick: () => handleOpenEditModal(),
          },
        ],
      };
    }

    if (stage === 'created') {
      if (hasCvReady || hasCoverLetterReady) {
        return {
          badgeText: 'Tailored Docs Ready',
          badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40',
          toneClasses: 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/30 to-white dark:border-emerald-500/20 dark:from-emerald-950/20 dark:to-[#131810]',
          title: isAtsSupported ? 'Tailored Documents Ready for Auto-Apply' : 'Tailored Documents Ready for Application',
          description: isAtsSupported
            ? `Your CV and cover letter are tailored and calibrated for ${atsType?.toUpperCase()}. Click Submit Auto-Apply to send your application, or review and refine your CV in the editor.`
            : 'Your tailored documents are ready. Open the company job portal to complete the direct application, or download and fine-tune your CV in the editor.',
          primaryAction: isAtsSupported
            ? {
                label: 'Submit Auto-Apply',
                icon: Sparkles,
                onClick: () => void handleTailorAndApply(),
                disabled: isCreatingJourney,
              }
            : job.jobUrl
            ? {
                label: 'Apply on Company Site',
                icon: ExternalLink,
                onClick: () => {
                  window.open(job.jobUrl, '_blank');
                },
              }
            : {
                label: 'Mark as Applied',
                icon: CheckCircle,
                onClick: () => void handleQuickStatusChange('applied'),
              },
          secondaryActions: [
            ...(hasCvReady && primaryJourney
              ? [
                  {
                    label: 'Edit Tailored CV',
                    icon: Edit2,
                    onClick: () => handleContinueJourney(primaryJourney as any),
                  },
                ]
              : []),
            {
              label: 'View Documents',
              icon: FileCheck,
              onClick: () => setActiveTab('documents'),
            },
            ...(!isAtsSupported && job.jobUrl
              ? [
                  {
                    label: 'Mark as Applied',
                    icon: Check,
                    onClick: () => void handleQuickStatusChange('applied'),
                  },
                ]
              : []),
          ],
        };
      }

      return {
        badgeText: 'Documents In Progress',
        badgeClasses: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40',
        toneClasses: 'border-purple-200/80 bg-gradient-to-b from-purple-50/30 to-white dark:border-purple-500/20 dark:from-purple-950/20 dark:to-[#131810]',
        title: 'Preparing Tailored Application',
        description: 'Your tailored application journey is underway. We are calibrating your resume and cover letter against the job description.',
        primaryAction: {
          label: 'Generate Tailored Documents',
          icon: Sparkles,
          onClick: () => void handleTailorAndApply(),
          disabled: isCreatingJourney,
        },
        secondaryActions: [
          {
            label: 'View Job Details',
            icon: Briefcase,
            onClick: () => setActiveTab('details'),
          },
        ],
      };
    }

    if (stage === 'applied' || stage === 'screening') {
      return {
        badgeText: stage === 'screening' ? 'In Screening' : 'Application Submitted',
        badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
        toneClasses: 'border-blue-200/80 bg-gradient-to-b from-blue-50/30 to-white dark:border-blue-500/20 dark:from-blue-950/20 dark:to-[#131810]',
        title: 'Application Active — Recruiter Review',
        description: 'Your application has been recorded. Check recruiter emails in the Communication tab or practice role-specific interview questions to stay prepared.',
        primaryAction: {
          label: 'Interview Prep',
          icon: Sparkles,
          onClick: () => handleOpenInterviewCoach(),
        },
        secondaryActions: [
          {
            label: 'Communication & Emails',
            icon: Mail,
            onClick: () => setActiveTab('communication'),
          },
          {
            label: 'Move to Interview Stage',
            icon: ArrowRight,
            onClick: () => void handleQuickStatusChange('interview'),
          },
        ],
      };
    }

    if (stage === 'interview') {
      return {
        badgeText: 'Interview Active',
        badgeClasses: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40',
        toneClasses: 'border-orange-200/80 bg-gradient-to-b from-orange-50/30 to-white dark:border-orange-500/20 dark:from-orange-950/20 dark:to-[#131810]',
        title: 'Interview Preparation Active',
        description: 'Ace your upcoming interview rounds with tailored question analysis, AI coaching feedback, and talking points.',
        primaryAction: {
          label: 'Launch Interview Prep',
          icon: Sparkles,
          onClick: () => handleOpenInterviewCoach(),
        },
        secondaryActions: [
          {
            label: 'Add Interview Notes',
            icon: FileText,
            onClick: () => setActiveTab('notes'),
          },
          {
            label: 'Move to Offer Stage',
            icon: ArrowRight,
            onClick: () => void handleQuickStatusChange('offer'),
          },
        ],
      };
    }

    if (stage === 'offer') {
      return {
        badgeText: 'Offer Received',
        badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40',
        toneClasses: 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/30 to-white dark:border-emerald-500/20 dark:from-emerald-950/20 dark:to-[#131810]',
        title: 'Job Offer Received — Review & Finalize',
        description: 'Congratulations on receiving an offer! Review compensation, benefits, and start date before formally accepting.',
        primaryAction: {
          label: 'Accept Offer',
          icon: CheckCircle,
          onClick: () => void handleQuickStatusChange('accepted'),
        },
        secondaryActions: [
          {
            label: 'Review Notes & Terms',
            icon: FileText,
            onClick: () => setActiveTab('notes'),
          },
        ],
      };
    }

    if (stage === 'accepted') {
      return {
        badgeText: 'Offer Accepted',
        badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40',
        toneClasses: 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/30 to-white dark:border-emerald-500/20 dark:from-emerald-950/20 dark:to-[#131810]',
        title: 'Journey Successfully Completed!',
        description: `You've accepted the offer and finalized your application for ${job.jobTitle} at ${job.company}. Great work!`,
        primaryAction: {
          label: 'View Documents',
          icon: FileCheck,
          onClick: () => setActiveTab('documents'),
        },
        secondaryActions: [
          {
            label: 'View Notes',
            icon: FileText,
            onClick: () => setActiveTab('notes'),
          },
        ],
      };
    }

    // Rejected / Withdrawn / Closed
    return {
      badgeText: stage === 'withdrawn' ? 'Withdrawn' : 'Application Closed',
      badgeClasses: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40',
      toneClasses: 'border-rose-200/80 bg-gradient-to-b from-rose-50/30 to-white dark:border-rose-500/20 dark:from-rose-950/20 dark:to-[#131810]',
      title: stage === 'withdrawn' ? 'Application Withdrawn' : 'Application Archived',
      description: 'This application has been closed. All notes and tailored documents remain saved in your history for future opportunities.',
      primaryAction: {
        label: 'View Archived Notes',
        icon: FileText,
        onClick: () => setActiveTab('notes'),
      },
      secondaryActions: [
        {
          label: 'View Documents',
          icon: FileCheck,
          onClick: () => setActiveTab('documents'),
        },
      ],
    };
  }, [
    job.status,
    job.jobTitle,
    job.company,
    job.jobUrl,
    isAtsSupported,
    atsType,
    hasCvReady,
    hasCoverLetterReady,
    isCreatingJourney,
    isMovingToCreated,
    primaryJourney,
    handleTailorAndApply,
    handleMoveToCreated,
    handleOpenEditModal,
    handleContinueJourney,
    handleOpenInterviewCoach,
  ]);

  const journeyCardData = sidebarConfig.journeyCard;

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed bg-black/50 backdrop-blur-sm z-[99998]"
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
          initial={{ x: 'calc(100% + 12px)' }}
          animate={{ x: 0 }}
          exit={{ x: 'calc(100% + 12px)' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={`fixed shadow-2xl z-[99999] flex flex-col overflow-hidden transition-all duration-300 bg-white dark:bg-[#141810] ${
            windowWidth >= 768 ? 'top-3 right-3 bottom-3 rounded-2xl' : 'top-0 right-0 bottom-0 left-0 rounded-none'
          }`}
          style={{
            width: sidebarWidth,
            right: windowWidth >= 768 ? '12px' : '0px',
            top: windowWidth >= 768 ? '12px' : '0px',
            bottom: windowWidth >= 768 ? '12px' : '0px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-4 sm:p-6 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <h2 className="!text-lg font-semibold text-gray-900 dark:text-white truncate">{job.jobTitle || job.title}</h2>
              <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">at</span>
              <h2 className="!text-lg font-semibold text-gray-900 dark:text-white truncate">{job.company}</h2>

              {/* Sponsorship Tag */}
              {job.sponsorship && job.sponsorship !== 'unknown' && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-small font-medium ml-0 sm:ml-2 ${job.sponsorship === 'yes'
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

              {/* Portal / ATS Type Badge */}
              {(job as any).atsType && (job as any).atsType !== 'unknown' && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ml-0 sm:ml-1">
                  <Building2 size={11} />
                  <span>{(job as any).atsType}</span>
                </div>
              )}

              {/* Manual Application Required Badge */}
              {(job as any).atsType && (job as any).atsType === 'unknown' && job.status === 'draft' && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ml-0 sm:ml-1">
                  <AlertCircle size={11} />
                  <span>Manual Apply Required</span>
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
                onClick={() => {
                  haptic('light');
                  onClose();
                }}
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
            <div className="space-y-3 px-5 py-4 pb-6">
              {/* Two-Column Main Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                {/* Column 1: Small Width & Borderless Vertical Stage Timeline */}
                <div className="lg:col-span-4 w-full max-w-[260px] shrink-0 space-y-2 lg:sticky lg:top-0">
                  <div className="px-1 py-0.5">
                    {terminalStageLabel && (
                      <div className="mb-4">
                        <span className="rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 px-2.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">
                          {terminalStageLabel}
                        </span>
                      </div>
                    )}

                    <div className="relative space-y-4 pl-1">
                      {/* Connecting Vertical Track */}
                      <div className="absolute left-[17px] top-4 bottom-4 w-[2px] bg-gray-200/80 dark:bg-white/10" />

                      {stageItems.map((stage, stageIndex) => {
                        const Icon = stage.icon;
                        const status = stage.status as StageStatus;

                        const nodeClasses = (() => {
                          switch (status) {
                            case 'completed':
                              return `${stage.completedColor} shadow-sm`;
                            case 'current':
                              return `${stage.activeColor} ring-4 ring-current/15 shadow-md scale-105`;
                            case 'processing':
                              return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30 ring-4 ring-blue-500/10 shadow-md scale-105 animate-pulse';
                            case 'blocked':
                              return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 ring-4 ring-amber-500/10 shadow-md';
                            case 'failed':
                              return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30 shadow-sm';
                            default:
                              return 'bg-gray-50 text-gray-400 dark:bg-[#151a11] dark:text-gray-500 border-gray-200/80 dark:border-white/10';
                          }
                        })();

                        return (
                          <motion.div
                            key={stage.key}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: stageIndex * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="relative flex items-start gap-3.5 group"
                          >
                            {/* Round Icon Node */}
                            <div
                              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 border ${nodeClasses}`}
                            >
                              {status === 'completed' ? (
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              ) : status === 'processing' ? (
                                <Loader2 className="w-4 h-4 stroke-[2] animate-spin" />
                              ) : status === 'blocked' ? (
                                <span className="text-sm font-black">!</span>
                              ) : status === 'failed' ? (
                                <X className="w-4 h-4 stroke-[2.5]" />
                              ) : (
                                <Icon className="w-4 h-4 stroke-[2]" />
                              )}
                            </div>

                            {/* Stage Text & Info Details */}
                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex items-center gap-2">
                                <p
                                  className={`text-xs font-bold leading-tight ${
                                    status === 'current' || status === 'processing'
                                      ? 'text-gray-900 dark:text-white'
                                      : status === 'completed'
                                      ? 'text-gray-800 dark:text-gray-200'
                                      : status === 'blocked'
                                      ? 'text-amber-700 dark:text-amber-400'
                                      : status === 'failed'
                                      ? 'text-rose-700 dark:text-rose-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}
                                >
                                  {stage.label}
                                </p>
                                {status === 'current' && (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-[#013f2e] dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                                    Current
                                  </span>
                                )}
                                {status === 'processing' && (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
                                    Processing
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] mt-0.5 leading-snug ${
                                status === 'blocked' ? 'text-amber-600 dark:text-amber-400' :
                                status === 'failed' ? 'text-rose-600 dark:text-rose-400' :
                                'text-gray-500 dark:text-gray-400'
                              }`}>
                                {status === 'blocked' ? 'Action required' :
                                 status === 'failed' ? 'Submission failed' :
                                 status === 'processing' ? 'In progress...' :
                                 stage.subLabel}
                              </p>
                              <p className={`text-[10px] mt-0.5 font-medium ${
                                status === 'failed' ? 'text-rose-500 dark:text-rose-400' :
                                status === 'blocked' ? 'text-amber-500 dark:text-amber-400' :
                                'text-gray-400 dark:text-gray-500'
                              }`}>
                                {stage.dateLabel}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Column 2: Tab Content */}
                <div className="lg:col-span-8 space-y-3 min-w-0">

              {/* 5 Tab Navigation: Analytics, Job Details, Communication, Documents, Notes */}
              <section className="space-y-3 pt-3 pb-3">
                {/* Tab Bar — dashboard-style with underline */}
                <div className="flex items-center gap-0 border-b border-gray-200 dark:border-white/10 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                    { id: 'details', label: 'Job Details', icon: Briefcase },
                    { id: 'communication', label: 'Comms', icon: Mail },
                    { id: 'documents', label: 'Docs', icon: FileCheck },
                    { id: 'notes', label: 'Notes', icon: FileText },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          haptic('selection');
                          setActiveTab(tab.id as SidebarTab);
                        }}
                        className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'text-[#013f2e] dark:text-[#013f2e]'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{tab.label}</span>
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-tab-underline"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#013f2e] dark:bg-[#013f2e]"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab 2: Job Details */}
                {activeTab === 'details' && (
                  <motion.div
                    key="tab-details"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3"
                  >
                    {/* Core Metadata Card */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810]">
                      <div className="mb-3 flex items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-2.5">
                        <div>
                          <p className="text-small font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Job Information</p>
                          <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">{job.jobTitle}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowEditJobSidebar(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-[#273021] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit Job
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Company</p>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <p className="text-small font-semibold text-gray-900 dark:text-white truncate">{job.company}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Location</p>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                            <p className="text-small font-semibold text-gray-900 dark:text-white truncate">{job.location || fallbacks.defaultLocation}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Job Type</p>
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            <p className="text-small font-semibold capitalize text-gray-900 dark:text-white">{job.jobType || job.type || 'Full-time'}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Salary</p>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <p className="text-small font-semibold text-gray-900 dark:text-white">
                              {formatJobSalary(job.salary, fallbacks.defaultSalary)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Application Deadline</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <p className="text-small font-semibold text-gray-900 dark:text-white">{formatJobDate(job.deadline, 'No deadline set')}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Portal / Source</p>
                          <p className="text-small font-semibold text-gray-900 dark:text-white capitalize">{job.source || 'Direct ATS'}</p>
                        </div>

                        {job.jobUrl && (
                          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Job Posting Link</p>
                            <a
                              href={job.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-[#013f2e] hover:underline break-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              {job.jobUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Job Description */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810]">
                      <h4 className="text-h3 font-semibold text-gray-900 dark:text-white mb-3">Job Description</h4>
                      <div className="max-h-[350px] overflow-y-auto pr-2 border border-gray-100 dark:border-white/5 rounded-xl p-4 bg-gray-50/50 dark:bg-white/[0.02]">
                        <FormattedJobDescription content={job.jobDescription || fallbacks.defaultJobDescription} />
                      </div>
                    </div>

                    {/* Requirements & Skills if parsed */}
                    {job.extractedJd?.role_content && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810] space-y-4">
                        <h4 className="text-h3 font-semibold text-gray-900 dark:text-white">Role Requirements</h4>
                        {job.extractedJd.role_content.requirements_must_have?.length > 0 && (
                          <div>
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Must Have</h5>
                            <ul className="space-y-1.5 text-small text-gray-700 dark:text-gray-300">
                              {job.extractedJd.role_content.requirements_must_have.map((req: any, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                  <span>{req.text} {req.years_required ? `(${req.years_required} yrs)` : ''}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {job.extractedJd.role_content.requirements_nice_to_have?.length > 0 && (
                          <div>
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Nice to Have</h5>
                            <ul className="space-y-1.5 text-small text-gray-700 dark:text-gray-300">
                              {job.extractedJd.role_content.requirements_nice_to_have.map((req: any, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-lime-500 flex-shrink-0" />
                                  <span>{req.text} {req.years_required ? `(${req.years_required} yrs)` : ''}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Technical Skills */}
                    {job.extractedJd?.skills?.skills_technical?.length > 0 && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810]">
                        <h4 className="text-h3 font-semibold text-gray-900 dark:text-white mb-3">Key Technical Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.extractedJd.skills.skills_technical.map((item: any, i: number) => (
                            <span
                              key={i}
                              className={`px-3 py-1 text-xs font-semibold rounded-xl ${
                                item.importance === 'critical'
                                  ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              {item.skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Tab 1: Analytics — Command Center */}
                {activeTab === 'analytics' && (
                  <motion.div
                    key="tab-analytics"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3"
                  >
                    {/* Live Status (absorbed from JobLiveStatusCard) */}
                    {(() => {
                      const liveStatus = useJobLiveStatusStore.getState().statuses[jobId];
                      if (!liveStatus) return null;
                      const isSuccess = liveStatus.step === 'submitted' || liveStatus.success;
                      return (
                        <div className={`rounded-2xl border p-4 shadow-sm ${
                          isSuccess
                            ? 'border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-b from-emerald-50/30 to-white dark:from-emerald-950/20 dark:to-[#131810]'
                            : 'border-blue-200 dark:border-blue-800/40 bg-gradient-to-b from-blue-50/30 to-white dark:from-blue-950/20 dark:to-[#131810]'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isSuccess ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                              )}
                              <span className="text-xs font-bold text-gray-900 dark:text-white">{liveStatus.title}</span>
                            </div>
                            <button
                              onClick={() => useJobLiveStatusStore.getState().clearStatus(jobId)}
                              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-2">{liveStatus.description}</p>
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isSuccess ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${liveStatus.progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Current Stage + Readiness */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#131810]">
                      {(() => {
                        const currentStage = stageItems.find(s => s.status === 'current') || stageItems.find(s => s.status === 'processing');
                        const Icon = currentStage?.icon || Bookmark;
                        const status = currentStage?.status || 'current';
                        return (
                          <>
                            {/* Stage Header */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                                status === 'processing'
                                  ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30 animate-pulse'
                                  : currentStage
                                  ? `${currentStage.activeColor} ring-2 ring-current/10`
                                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10'
                              }`}>
                                {status === 'processing' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Icon className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {currentStage?.label || job.status}
                                  </span>
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                    status === 'processing'
                                      ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
                                      : 'text-[#013f2e] dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30'
                                  }`}>
                                    {status === 'processing' ? 'Processing' : 'Current'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  {currentStage?.dateLabel || ''}
                                </p>
                              </div>
                            </div>

                            {/* Stage Meta */}
                            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
                              {isAtsSupported && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Auto-Apply · {atsType?.toUpperCase()}
                                </span>
                              )}
                              {!isAtsSupported && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30">
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  Manual Apply
                                </span>
                              )}
                              {job.location && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {job.location}
                                </span>
                              )}
                              {job.sponsorship && job.sponsorship !== 'unknown' && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  job.sponsorship === 'yes'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-800/30'
                                }`}>
                                  {job.sponsorship === 'yes' ? 'Sponsorship' : 'No Sponsorship'}
                                </span>
                              )}
                            </div>

                            {/* Timeline: Application Date → Deadline */}
                            {(job.applicationDate || job.createdAt || job.deadline) && (() => {
                              const appDateRaw = job.applicationDate || job.createdAt;
                              const appDate = appDateRaw ? new Date(appDateRaw) : null;
                              const deadlineDate = job.deadline ? new Date(job.deadline) : null;
                              const now = new Date();
                              const totalDays = appDate && deadlineDate ? Math.ceil((deadlineDate.getTime() - appDate.getTime()) / 86400000) : null;
                              const elapsedDays = appDate ? Math.ceil((now.getTime() - appDate.getTime()) / 86400000) : null;
                              const remainingDays = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000) : null;
                              const progressPct = totalDays && elapsedDays !== null ? Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100)) : null;
                              const isOverdue = remainingDays !== null && remainingDays < 0;
                              const isUrgent = remainingDays !== null && remainingDays >= 0 && remainingDays <= 3;

                              return (
                                <div className="mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
                                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                                    {appDate && (
                                      <span className="text-gray-500 dark:text-gray-400">
                                        Applied {formatStageDateTime(appDate) || formatTimelineDate(appDate)}
                                      </span>
                                    )}
                                    {deadlineDate && (
                                      <span className={`font-bold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {isOverdue ? `${Math.abs(remainingDays)}d overdue` : `${remainingDays}d left`}
                                      </span>
                                    )}
                                  </div>
                                  {progressPct !== null && (
                                    <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          isOverdue ? 'bg-rose-500' : isUrgent ? 'bg-amber-500' : 'bg-[#013f2e]'
                                        }`}
                                        style={{ width: `${progressPct}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Speed Graph: Expected vs Actual — Smooth Curve with Date Labels */}
                            {(() => {
                              // Entry point: job posted date from postedAgeDays (how many days ago the job was made live)
                              const now = new Date();
                              const postedAgeDays = (job as any).postedAgeDays;
                              const postedDate = typeof postedAgeDays === 'number' && postedAgeDays >= 0
                                ? new Date(now.getTime() - postedAgeDays * 86400000)
                                : job.createdAt
                                  ? new Date(job.createdAt)
                                  : null;
                              if (!postedDate) return null;

                              const daysSincePosted = Math.max(0, (now.getTime() - postedDate.getTime()) / 86400000);

                              const appDateRaw = job.applicationDate;
                              const appDate = appDateRaw ? new Date(appDateRaw) : null;

                              const stageDefinitions: Array<{ key: string; label: string; expected: number; actual: number | null; date: Date | null }> = [
                                { key: 'posted', label: 'Posted', expected: 0, actual: 0, date: postedDate },
                                { key: 'created', label: 'Tailored', expected: 3, actual: null, date: null },
                                { key: 'applied', label: 'Applied', expected: 5, actual: null, date: null },
                                { key: 'interview', label: 'Interview', expected: 18, actual: null, date: null },
                                { key: 'offer', label: 'Offer', expected: 35, actual: null, date: null },
                                { key: 'accepted', label: 'Accepted', expected: 40, actual: null, date: null },
                              ];

                              // Fill actual values from statusHistory
                              const history = (job.statusHistory || []) as any[];
                              stageDefinitions.forEach((def) => {
                                if (def.key === 'posted') return;
                                const entry = history.find((h: any) => h.status === def.key && h.changedAt);
                                if (entry) {
                                  const entryDate = new Date(entry.changedAt);
                                  def.actual = Math.max(0, (entryDate.getTime() - postedDate.getTime()) / 86400000);
                                  def.date = entryDate;
                                }
                              });

                              // Use applicationDate if available for the "Applied" stage
                              if (appDate) {
                                const appliedDef = stageDefinitions.find(d => d.key === 'applied');
                                if (appliedDef && appliedDef.actual === null) {
                                  appliedDef.actual = Math.max(0, (appDate.getTime() - postedDate.getTime()) / 86400000);
                                  appliedDef.date = appDate;
                                }
                              }

                              // Mark current stage
                              const currentStageKey = stageItems.find(s => s.status === 'current')?.key || stageItems.find(s => s.status === 'processing')?.key;
                              if (currentStageKey) {
                                const def = stageDefinitions.find(d => d.key === currentStageKey);
                                if (def && def.actual === null) {
                                  def.actual = daysSincePosted;
                                  def.date = now;
                                }
                              }

                              // Show stages up to current + 1
                              const currentIdx = currentStageKey ? stageDefinitions.findIndex(d => d.key === currentStageKey) : 0;
                              const visibleStages = stageDefinitions.slice(0, Math.max(2, Math.min(stageDefinitions.length, currentIdx + 2)));

                              const maxDays = Math.max(
                                ...visibleStages.map(s => s.expected),
                                ...visibleStages.filter(s => s.actual !== null).map(s => s.actual!),
                                daysSincePosted,
                                1
                              );

                              // SVG dimensions
                              const W = 200, H = 64, PAD_L = 4, PAD_R = 4, PAD_T = 4, PAD_B = 4;
                              const plotW = W - PAD_L - PAD_R;
                              const plotH = H - PAD_T - PAD_B;
                              const n = visibleStages.length;

                              const toX = (i: number) => (i / Math.max(1, n - 1)) * plotW + PAD_L;
                              const toY = (days: number) => H - PAD_B - (maxDays > 0 ? (days / maxDays) * plotH : 0);

                              const ptsExpected = visibleStages.map((s, i) => ({ x: toX(i), y: toY(s.expected) }));
                              const actualStages = visibleStages.filter(s => s.actual !== null);
                              const ptsActual = actualStages.map((s) => {
                                const origIdx = visibleStages.indexOf(s);
                                return { x: toX(origIdx), y: toY(s.actual!) };
                              });

                              // Smooth cubic bezier path
                              const smoothPath = (pts: Array<{ x: number; y: number }>) => {
                                if (pts.length < 2) return '';
                                if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
                                let d = `M ${pts[0].x},${pts[0].y}`;
                                for (let i = 0; i < pts.length - 1; i++) {
                                  const p0 = pts[Math.max(0, i - 1)];
                                  const p1 = pts[i];
                                  const p2 = pts[i + 1];
                                  const p3 = pts[Math.min(pts.length - 1, i + 2)];
                                  const t = 0.3;
                                  d += ` C ${p1.x + (p2.x - p0.x) * t},${p1.y + (p2.y - p0.y) * t} ${p2.x - (p3.x - p1.x) * t},${p2.y - (p3.y - p1.y) * t} ${p2.x},${p2.y}`;
                                }
                                return d;
                              };

                              const smoothFill = (pts: Array<{ x: number; y: number }>) => {
                                if (pts.length < 2) return '';
                                return `${smoothPath(pts)} L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`;
                              };

                              // Format date: "Sep 19"
                              const fmtDate = (d: Date | null) => {
                                if (!d) return '';
                                const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                return `${m[d.getMonth()]} ${d.getDate()}`;
                              };

                              return (
                                <div className="mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Progress Speed</span>
                                    <div className="flex items-center gap-3">
                                      <span className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-gray-500">
                                        <span className="w-2 h-[2px] bg-gray-300 dark:bg-gray-600 rounded" /> Expected
                                      </span>
                                      <span className="flex items-center gap-1 text-[9px] text-[#013f2e] dark:text-emerald-400">
                                        <span className="w-2 h-[2px] bg-[#013f2e] dark:bg-emerald-400 rounded" /> Actual
                                      </span>
                                    </div>
                                  </div>
                                  <div className="relative w-full">
                                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
                                      {[0.25, 0.5, 0.75].map(pct => (
                                        <line key={pct} x1={PAD_L} y1={H - PAD_B - pct * plotH} x2={W - PAD_R} y2={H - PAD_B - pct * plotH}
                                          stroke="currentColor" className="text-gray-100 dark:text-white/5" strokeWidth="0.5" />
                                      ))}
                                      {ptsExpected.length > 1 && (
                                        <>
                                          <path d={smoothFill(ptsExpected)} fill="currentColor" className="text-gray-200/40 dark:text-white/5" />
                                          <path d={smoothPath(ptsExpected)} fill="none" stroke="currentColor" className="text-gray-300 dark:text-gray-600" strokeWidth="1.5" strokeLinecap="round" />
                                        </>
                                      )}
                                      {ptsActual.length > 1 && (
                                        <>
                                          <path d={smoothFill(ptsActual)} fill="currentColor" className="text-[#013f2e]/10 dark:text-emerald-400/10" />
                                          <path d={smoothPath(ptsActual)} fill="none" stroke="currentColor" className="text-[#013f2e] dark:text-emerald-400" strokeWidth="2" strokeLinecap="round" />
                                        </>
                                      )}
                                      {ptsActual.map((p, i) => (
                                        <circle key={i} cx={p.x} cy={p.y} r="3" fill="currentColor" className="text-[#013f2e] dark:text-emerald-400" />
                                      ))}
                                      {ptsActual.length < ptsExpected.length && ptsExpected[ptsActual.length] && (
                                        <circle cx={ptsExpected[ptsActual.length].x} cy={ptsExpected[ptsActual.length].y} r="2.5"
                                          fill="currentColor" className="text-[#013f2e] dark:text-emerald-400" stroke="currentColor"
                                          strokeWidth="1" strokeDasharray="2 1" />
                                      )}
                                    </svg>
                                    {/* X-axis labels: date + stage */}
                                    <div className="flex justify-between px-1 mt-1">
                                      {visibleStages.map((s) => {
                                        const dateStr = s.key === 'posted' ? fmtDate(postedDate) : fmtDate(s.date);
                                        const isCurrent = s.key === currentStageKey;
                                        return (
                                          <span key={s.key} className={`text-[7px] font-bold leading-tight text-center ${isCurrent ? 'text-[#013f2e] dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {dateStr}<br/>{s.label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Readiness Items */}
                            <div className="space-y-2.5">
                              {/* CV */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  {hasCvReady ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-gray-300 dark:border-gray-600 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <span className={`text-[11px] font-semibold ${hasCvReady ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                      Tailored CV
                                    </span>
                                    {hasCvReady && keywordMatchScore > 0 && (
                                      <span className={`ml-1.5 text-[10px] font-bold ${keywordMatchScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : keywordMatchScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {keywordMatchScore}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {hasCvReady ? (
                                  <button
                                    onClick={() => primaryJourney ? handleContinueJourney(primaryJourney as any) : void handleOpenDocumentPreview('cv')}
                                    className="text-[10px] font-bold text-[#013f2e] dark:text-emerald-400 hover:underline whitespace-nowrap"
                                  >
                                    Edit
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => void handleTailorAndApply()}
                                    disabled={isCreatingJourney}
                                    className="text-[10px] font-bold text-[#013f2e] dark:text-emerald-400 hover:underline whitespace-nowrap disabled:opacity-50"
                                  >
                                    {isCreatingJourney ? 'Generating...' : 'Generate'}
                                  </button>
                                )}
                              </div>

                              {/* Cover Letter */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  {hasCoverLetterReady ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-gray-300 dark:border-gray-600 shrink-0" />
                                  )}
                                  <span className={`text-[11px] font-semibold ${hasCoverLetterReady ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                    Cover Letter
                                  </span>
                                </div>
                                {hasCoverLetterReady ? (
                                  <button
                                    onClick={() => void handleOpenDocumentPreview('coverLetter')}
                                    className="text-[10px] font-bold text-[#013f2e] dark:text-emerald-400 hover:underline whitespace-nowrap"
                                  >
                                    View
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => void handleTailorAndApply()}
                                    disabled={isCreatingJourney}
                                    className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-[#013f2e] dark:hover:text-emerald-400 whitespace-nowrap disabled:opacity-50"
                                  >
                                    {isCreatingJourney ? 'Generating...' : 'Optional'}
                                  </button>
                                )}
                              </div>

                              {/* Job Info */}
                              <div className="flex items-center gap-2">
                                {Boolean(job.company && job.jobTitle) ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                )}
                                <span className={`text-[11px] font-semibold ${Boolean(job.company && job.jobTitle) ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {job.company && job.jobTitle ? `${job.company} · ${job.jobTitle}` : 'Missing job details'}
                                </span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Activity Log */}
                    {job.statusHistory && job.statusHistory.length > 0 && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#131810]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-3">Activity</span>
                        <div className="space-y-2">
                          {(job.statusHistory as any[]).slice(-5).reverse().map((entry: any, i: number) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap mt-0.5">
                                {formatStageDateTime(entry.changedAt) || formatTimelineDate(entry.changedAt)}
                              </span>
                              <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">{entry.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Action */}
                    <div className={`rounded-2xl border p-4 shadow-sm ${guidanceHub.toneClasses}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-2">Next Action</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mb-3">{guidanceHub.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {guidanceHub.primaryAction && (
                          <motion.button
                            type="button"
                            onClick={() => {
                              haptic('medium');
                              guidanceHub.primaryAction!.onClick();
                            }}
                            disabled={guidanceHub.primaryAction.disabled}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#013f2e] text-white text-xs font-black shadow-sm transition hover:brightness-95 disabled:opacity-60"
                          >
                            {guidanceHub.primaryAction.icon && (
                              <guidanceHub.primaryAction.icon className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{guidanceHub.primaryAction.label}</span>
                          </motion.button>
                        )}
                        {guidanceHub.secondaryActions.map((action, idx) => (
                          <motion.button
                            key={idx}
                            type="button"
                            onClick={() => {
                              haptic('light');
                              action.onClick();
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-all"
                          >
                            {action.icon && <action.icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />}
                            <span>{action.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Market Intelligence (collapsible) */}
                    <details className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#131810]">
                      <summary className="p-4 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300 select-none">
                        Market Intelligence & Trends
                      </summary>
                      <div className="px-4 pb-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Company Hiring Pace</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{insightsLoading ? '...' : insights?.companyHiringTrend || 'Steady Hiring'}</span>
                          </div>
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Salary Competitiveness</span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {salaryComp.comparison === 'above' ? 'Above Market' : salaryComp.comparison === 'below' ? 'Below Market' : 'At Market'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </details>

                    {/* JD Quality Audit (collapsible) */}
                    {job.extractedJd?.jd_quality && (
                      <details className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#131810]">
                        <summary className="p-4 cursor-pointer flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 select-none">
                          <span>Job Posting Quality Audit</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            job.extractedJd.jd_quality.jd_quality_score >= 70
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {job.extractedJd.jd_quality.jd_quality_score}/100
                          </span>
                        </summary>
                        <div className="px-4 pb-4 space-y-2">
                          {job.extractedJd.jd_quality.jd_red_flags?.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Flags ({job.extractedJd.jd_quality.jd_red_flags.length})</span>
                              {job.extractedJd.jd_quality.jd_red_flags.map((flag: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 p-2.5 bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-[11px] text-gray-700 dark:text-gray-300">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="block text-red-900 dark:text-red-300">{flag.flag}</strong>
                                    <span className="text-gray-600 dark:text-gray-400 mt-0.5 block">{flag.detail}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </motion.div>
                )}

                {/* Tab 3: Communication — Thread View */}
                {activeTab === 'communication' && (
                  <motion.div
                    key="tab-communication"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3"
                  >
                    {/* Thread Container */}
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#131810] overflow-hidden">
                      {/* Recruiter Message (Left) */}
                      <div className="border-b border-gray-100 dark:border-white/5">
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                              {(job.contactDetails?.name || job.company || 'R').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[11px] font-bold text-gray-900 dark:text-white block">
                                {job.contactDetails?.name || 'Recruiter'}
                              </span>
                              <span className="text-[9px] text-gray-400 dark:text-gray-500">
                                {job.contactDetails?.role || job.company || 'Hiring Team'}
                              </span>
                            </div>
                            {job.status === 'applied' || job.status === 'screening' ? (
                              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500">Applied follow-up</span>
                            ) : job.status === 'interview' ? (
                              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500">Interview follow-up</span>
                            ) : null}
                          </div>
                          <div className="ml-9">
                            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                              {job.status === 'applied' || job.status === 'screening'
                                ? 'Thank you for your application'
                                : job.status === 'interview'
                                ? 'Interview scheduled'
                                : 'Waiting for response'}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                              {job.status === 'applied' || job.status === 'screening'
                                ? `Your application for ${job.jobTitle} at ${job.company} has been received. The hiring team is reviewing candidates.`
                                : job.status === 'interview'
                                ? `Interview round for ${job.jobTitle} at ${job.company} is being coordinated.`
                                : `No messages yet from ${job.company}.`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Your Message (Right) — Always show drafted email */}
                      <div className="bg-gray-50/50 dark:bg-white/[0.02]">
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2 justify-end">
                            <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                              {getUserName()}<span className="text-[9px] font-normal text-gray-400 dark:text-gray-500 ml-1.5">{getUserEmail() || 'your@email.com'}</span>
                            </span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#013f2e] text-[10px] font-bold text-white shrink-0">
                              {(getUserName() || 'Y').charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-9">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                Subject: {getEmailSubject(job)}
                              </span>
                              <button
                                onClick={() => handleCopyToClipboard(getEmailSubject(job), 'subject')}
                                className="text-[9px] font-bold text-[#013f2e] dark:text-emerald-400 hover:underline"
                              >
                                Copy
                              </button>
                            </div>
                            <div className="rounded-lg bg-white dark:bg-[#20281d] border border-gray-100 dark:border-white/5 p-3 max-h-[200px] overflow-y-auto">
                              <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                                {getEmailTemplate(job)}
                              </p>
                            </div>
                            <div className="flex gap-2 mt-2.5">
                              <button
                                onClick={() => handleOpenEmail(0)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#013f2e] text-white text-[10px] font-bold hover:brightness-95 transition"
                              >
                                <Send className="w-3 h-3" />
                                Send Draft
                              </button>
                              <button
                                onClick={() => handleCopyToClipboard(getEmailTemplate(job), 'email')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#20281d] text-gray-700 dark:text-gray-300 text-[10px] font-bold hover:bg-gray-50 dark:hover:bg-[#273021] transition"
                              >
                                <Copy className="w-3 h-3" />
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#131810]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-3">Quick Actions</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleOpenEmail(0)}
                          className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition text-left"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#013f2e] dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 block">Email Recruiter</span>
                            <span className="text-[9px] text-gray-400 dark:text-gray-500">Open in mail client</span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            // Navigate to Comms tab in JobsDashboard home view
                            window.dispatchEvent(new CustomEvent('navigate-to-comms'));
                          }}
                          className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition text-left"
                        >
                          <Inbox className="w-3.5 h-3.5 text-[#013f2e] dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 block">Inbox</span>
                            <span className="text-[9px] text-gray-400 dark:text-gray-500">View all threads</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Tab 5: Notes */}
                {activeTab === 'notes' && (
                  <motion.div
                    key="tab-notes"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3"
                  >
                    {!isEditingNotes && !jobNotes?.trim() ? (
                      /* 1. Empty State: Shown as clean CTA */
                      <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50/50 p-6 dark:border-white/10 dark:bg-[#131810]/50 transition-all hover:border-gray-300 dark:hover:border-white/20 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-lime-500/10 dark:text-lime-400 flex items-center justify-center mx-auto">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-body font-bold text-gray-900 dark:text-white">Personal Job Notes</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                            Keep interview takeaways, recruiter details, tech stack questions, or salary targets handy.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          onClick={() => setIsEditingNotes(true)}
                          leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                          className="mx-auto mt-2"
                        >
                          Add Personal Notes
                        </Button>
                      </div>
                    ) : !isEditingNotes && Boolean(jobNotes?.trim()) ? (
                      /* 2. Notes Present: Show saved notes preview with Edit CTA */
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810] space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                          <div>
                            <p className="text-small font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Job Notes</p>
                            <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Personal Interview & Role Notes</h3>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsEditingNotes(true)}
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                          >
                            Edit Notes
                          </Button>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto pr-2">
                          {jobNotes}
                        </div>
                      </div>
                    ) : (
                      /* 3. Editing State: Live Interactive Notes Editor */
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810] space-y-4 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                          <div>
                            <p className="text-small font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Job Notes</p>
                            <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Personal Interview & Role Notes</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setJobNotes(job.notes || '');
                                setIsEditingNotes(false);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={handleSaveNotes}
                              isLoading={isSavingNotes}
                              loadingText="Saving..."
                              leftIcon={<Save className="w-3.5 h-3.5" />}
                            >
                              Save Notes
                            </Button>
                          </div>
                        </div>

                        {/* Quick Template Buttons */}
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: '+ Recruiter Call', text: '\n\n--- Recruiter Call Takeaways ---\n- Recruiter Name:\n- Salary Mentioned:\n- Next Stage Timeline:' },
                            { label: '+ Interview Prep', text: '\n\n--- Interview Preparation ---\n- Key Projects to Highlight:\n- System Design Points:\n- Tech Stack Overlap:' },
                            { label: '+ System Design / Tech', text: '\n\n--- Technical / Architecture Focus ---\n- Core Frameworks & DBs:\n- Scaling Bottlenecks & Solutions:\n- Performance & Reliability Goals:' },
                            { label: '+ Questions for Team', text: '\n\n--- Questions for Interviewer ---\n1. What does the day-to-day look like?\n2. What are the key engineering challenges this quarter?\n3. How is engineering success and velocity measured?' },
                            { label: '+ Salary & Offer Comp', text: '\n\n--- Compensation & Negotiation Target ---\n- Base Salary Goal:\n- Equity / Bonus Expected:\n- Competing Deadlines:' },
                            { label: '+ Referral & Contacts', text: '\n\n--- Key Referral & Contact Notes ---\n- Contact Person:\n- Role / Connection:\n- Date Followed Up:' },
                          ].map((prompt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setJobNotes(prev => (prev ? prev + prompt.text : prompt.text.trim()))}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-[11px] font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                            >
                              {prompt.label}
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={jobNotes}
                          onChange={(e) => setJobNotes(e.target.value)}
                          placeholder="Type any interview prep notes, referral contacts, salary requirements, or recruiter discussion points here..."
                          rows={8}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-xs leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-lime-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:focus:bg-[#181f16]"
                        />
                      </div>
                    )}

                    {/* Job Tags Manager */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810] space-y-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-500" />
                        <h4 className="text-small font-bold text-gray-900 dark:text-white">Custom Job Tags</h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {jobTags.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                haptic('light');
                                handleRemoveTag(tag);
                              }}
                              className="hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Add new tag (e.g. Remote, Referral, High Priority)..."
                          className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-lime-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.02] dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            haptic('success');
                            handleAddTag();
                          }}
                          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 dark:border-white/10 dark:bg-[#20281d] dark:text-white transition-colors"
                        >
                          Add Tag
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Tab 4: Documents */}
                {activeTab === 'documents' && (() => {
                  const resolvedCvId = primaryJourney?.cvId || (job as any).cvId || fallbackMasterCvId;
                  const resolvedCoverLetterId = primaryJourney?.coverLetterId || (job as any).coverLetterId;
                  const isAdvancedStage = job.status !== 'draft';
                  const hasCv = Boolean(resolvedCvId);
                  const hasCoverLetter = Boolean(resolvedCoverLetterId);

                  return (
                    <motion.div
                      key="tab-documents"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-3"
                    >
                      {/* Applied / Tailored CV Card */}
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810]">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-white/5 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-lime-50 dark:bg-[#013f2e]/10 text-emerald-600 dark:text-[#013f2e]">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-small font-bold text-gray-900 dark:text-white">
                                {primaryJourney?.cvId ? 'Tailored CV' : isAdvancedStage ? 'Applied CV' : 'Resume / CV'}
                              </h4>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {cvData?.title || `Customized for ${job.jobTitle} at ${job.company}`}
                              </p>
                            </div>
                          </div>
                          {hasCv ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {primaryJourney?.cvId ? 'Tailored & Ready' : isAdvancedStage ? 'Attached to Application' : 'Ready'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
                              Not Generated
                            </span>
                          )}
                        </div>

                        {hasCv ? (
                          <div className="flex flex-wrap gap-2.5">
                            <button
                              type="button"
                              onClick={() => void handleOpenDocumentPreview('cv')}
                              disabled={previewLoading === 'cv'}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 dark:border-white/10 dark:bg-[#20281d] dark:text-white dark:hover:bg-[#273021] transition-colors"
                            >
                              {previewLoading === 'cv' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                              Preview CV
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/editor?mode=edit&cvId=${resolvedCvId}`)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:border-white/10 dark:bg-[#20281d] dark:text-blue-400 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit in CV Builder
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument('cv')}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 dark:border-white/10 dark:bg-[#20281d] dark:text-white transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download PDF
                            </button>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 p-4 text-center">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">No tailored CV has been created for this job application yet.</p>
                            <button
                              type="button"
                              onClick={() => void handleTailorAndApply()}
                              disabled={isCreatingJourney}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#013f2e] hover:brightness-95 text-white rounded-xl text-xs font-black shadow-sm"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Generate Tailored CV
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Tailored / Applied Cover Letter Card */}
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810]">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-white/5 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-small font-bold text-gray-900 dark:text-white">Cover Letter</h4>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">Targeted for {job.company}</p>
                            </div>
                          </div>
                          {hasCoverLetter ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {primaryJourney?.coverLetterId ? 'Generated' : 'Attached'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
                              Not Generated
                            </span>
                          )}
                        </div>

                        {hasCoverLetter ? (
                          <div className="flex flex-wrap gap-2.5">
                            <button
                              type="button"
                              onClick={() => void handleOpenDocumentPreview('coverLetter')}
                              disabled={previewLoading === 'coverLetter'}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 dark:border-white/10 dark:bg-[#20281d] dark:text-white dark:hover:bg-[#273021] transition-colors"
                            >
                              {previewLoading === 'coverLetter' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                              Preview Cover Letter
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument('coverLetter')}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 dark:border-white/10 dark:bg-[#20281d] dark:text-white transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download PDF
                            </button>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 p-4 text-center">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">No tailored cover letter has been generated yet.</p>
                            <button
                              type="button"
                              onClick={() => void handleTailorAndApply()}
                              disabled={isCreatingJourney}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 text-gray-900 dark:text-white rounded-xl text-xs font-bold shadow-sm"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Generate Cover Letter
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Application Submission Evidence & Verified Receipt */}
                      {isAdvancedStage && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810]">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-small font-bold text-gray-900 dark:text-white">Application Submission Evidence</h4>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3 text-xs">
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                              <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Current Stage</span>
                              <span className="font-bold text-gray-900 dark:text-white capitalize">{job.status}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                              <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Portal / ATS</span>
                              <span className="font-bold text-gray-900 dark:text-white capitalize">{job.source || (job as any).atsType || 'Direct Portal'}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                              <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Submission Record</span>
                              <span className="font-bold text-emerald-600 dark:text-[#013f2e]">✓ Verified Applied</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })()}
              </section>
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
            className="fixed inset-0 z-[100005] bg-black/70 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
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
          <React.Fragment key="details-modal-sidebar">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100001] bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDetailsModal(false)}
            />

            {/* Modal Sidebar Panel */}
            <motion.div
              initial={{ x: 'calc(100% + 12px)' }}
              animate={{ x: 0 }}
              exit={{ x: 'calc(100% + 12px)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 left-0 md:left-auto md:top-3 md:right-3 md:bottom-3 w-full md:w-[calc(70vw-24px)] md:max-w-[70vw] bg-white dark:bg-[#141810] shadow-2xl z-[100002] flex flex-col rounded-none md:rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-white/10 flex-shrink-0 flex items-start justify-between gap-4">
                <div>
                  <p className="text-small font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                    {detailsModalView === 'details' ? 'Job Details' : 'Application Insights'}
                  </p>
                  <h3 className="!text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {job.jobTitle || job.title} at {job.company}
                  </h3>
                  {activeActionPayload && (
                    <p className="mt-2 text-small text-gray-500 dark:text-gray-400">
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

              <div className="mb-6 flex gap-2 rounded-2xl bg-gray-100 p-1 dark:bg-[#222a1f] mx-6 mt-4">
                <button
                  onClick={() => setDetailsModalView('details')}
                  className={`flex-1 rounded-xl px-4 py-2 text-small font-medium transition ${
                    detailsModalView === 'details'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-[#2a3326] dark:text-white'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Job Details
                </button>
                <button
                  onClick={() => setDetailsModalView('insights')}
                  className={`flex-1 rounded-xl px-4 py-2 text-small font-medium transition ${
                    detailsModalView === 'insights'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-[#2a3326] dark:text-white'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Application Insights
                </button>
              </div>

              {activeActionPayload && (
                <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-small text-gray-600 dark:border-white/10 dark:bg-[#20281d] dark:text-gray-300 mx-6">
                  {activeActionId === 'open_insights'
                    ? `Insights are filtered to the ${formatStageLabel(activeActionPayload.stage)} stage for this tracker item.`
                    : `This panel opened from the ${formatStageLabel(activeActionPayload.stage)} stage and keeps the current job, journey, and entitlement context together.`}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">
                {detailsModalView === 'details' ? (
                  <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                    {/* Left Column */}
                    <div className="space-y-5">
                      {/* Core Details */}
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                        <h4 className="mb-4 text-body font-semibold text-gray-900 dark:text-white">Core Details</h4>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <Building2 className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="text-small uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Company</p>
                              <p className="text-small font-medium text-gray-900 dark:text-white">{job.company}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="text-small uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Location</p>
                              <p className="text-small font-medium text-gray-900 dark:text-white">{job.location || fallbacks.defaultLocation}</p>
                              {job.extractedJd?.location?.location_type?.value && (
                                <span className="inline-block mt-1 px-2 py-0.5 text-small bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded capitalize">
                                  Type: {job.extractedJd.location.location_type.value}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Briefcase className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="text-small uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Type</p>
                              <p className="text-small font-medium capitalize text-gray-900 dark:text-white">{job.jobType || job.type || 'Not specified'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <DollarSign className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="text-small uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Salary</p>
                              <p className="text-small font-medium text-gray-900 dark:text-white">
                                {formatJobSalary(job.salary, fallbacks.defaultSalary)}
                                {job.extractedJd?.compensation?.salary_inferred && (
                                  <span className="inline-block ml-2 px-1.5 py-0.5 text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                                    Estimated
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Calendar className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="text-small uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Deadline</p>
                              <p className="text-small font-medium text-gray-900 dark:text-white">{formatJobDate(job.deadline, 'No deadline set')}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <ExternalLink className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <div className="min-w-0">
                              <p className="text-small uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Job URL</p>
                              {job.jobUrl ? (
                                <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="truncate text-small font-medium text-emerald-600 hover:underline dark:text-[#013f2e]">
                                  {job.jobUrl}
                                </a>
                              ) : (
                                <p className="text-small font-medium text-gray-900 dark:text-white">No URL provided</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact Details */}
                      {job.contactDetails && (job.contactDetails.name || job.contactDetails.email || job.contactDetails.phone || job.contactDetails.role) && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                          <h4 className="mb-4 text-body font-semibold text-gray-900 dark:text-white">Contact Details</h4>
                          <div className="space-y-4">
                            {job.contactDetails.name && <p className="text-small text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Name:</span> {job.contactDetails.name}</p>}
                            {job.contactDetails.role && <p className="text-small text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Role:</span> {job.contactDetails.role}</p>}
                            {job.contactDetails.email && <p className="text-small text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Email:</span> {job.contactDetails.email}</p>}
                            {job.contactDetails.phone && <p className="text-small text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Phone:</span> {job.contactDetails.phone}</p>}
                          </div>
                        </div>
                      )}

                      {/* Requirements */}
                      {job.extractedJd?.role_content && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d] space-y-4">
                          <h4 className="text-body font-semibold text-gray-900 dark:text-white">Job Requirements</h4>
                          
                          {/* Must Have */}
                          {job.extractedJd.role_content.requirements_must_have?.length > 0 && (
                            <div>
                              <h5 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Must Have</h5>
                              <ul className="space-y-1.5 text-small text-gray-700 dark:text-gray-300">
                                {job.extractedJd.role_content.requirements_must_have.map((req: any, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                    <span>{req.text} {req.years_required ? `(${req.years_required} yrs)` : ''}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Nice to Have */}
                          {job.extractedJd.role_content.requirements_nice_to_have?.length > 0 && (
                            <div>
                              <h5 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Nice to Have</h5>
                              <ul className="space-y-1.5 text-small text-gray-700 dark:text-gray-300">
                                {job.extractedJd.role_content.requirements_nice_to_have.map((req: any, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-lime-500 flex-shrink-0" />
                                    <span>{req.text} {req.years_required ? `(${req.years_required} yrs)` : ''}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Inferred Requirements */}
                          {job.extractedJd.role_content.requirements_inferred?.length > 0 && (
                            <div>
                              <h5 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Inferred (AI Identified)</h5>
                              <ul className="space-y-2 text-small text-gray-700 dark:text-gray-300">
                                {job.extractedJd.role_content.requirements_inferred.map((req: any, i: number) => (
                                  <li key={i} className="flex flex-col bg-white/50 dark:bg-white/5 p-2 rounded-lg border border-gray-100 dark:border-white/5">
                                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                      {req.text}
                                    </span>
                                    {req.inference_reason && (
                                      <span className="text-small text-gray-500 dark:text-gray-400 mt-0.5 italic">Reason: {req.inference_reason}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Skills & Tech Stack */}
                      {job.extractedJd?.skills && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d] space-y-4">
                          <h4 className="text-body font-semibold text-gray-900 dark:text-white">Skills & Tech Stack</h4>
                          
                          {/* Technical Skills */}
                          {job.extractedJd.skills.skills_technical?.length > 0 && (
                            <div>
                              <h5 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Technical Skills</h5>
                              <div className="flex flex-wrap gap-1.5">
                                {job.extractedJd.skills.skills_technical.map((item: any, i: number) => (
                                  <span key={i} className={`px-2.5 py-1 text-small font-medium rounded-full ${
                                    item.importance === 'critical' 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200/50' 
                                      : item.importance === 'strong'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300'
                                  }`}>
                                    {item.skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tools & Platforms */}
                          {job.extractedJd.skills.tools_and_platforms?.length > 0 && (
                            <div>
                              <h5 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Tools & Platforms</h5>
                              <div className="flex flex-wrap gap-1.5">
                                {job.extractedJd.skills.tools_and_platforms.map((item: any, i: number) => (
                                  <span key={i} className="px-2.5 py-1 text-small font-medium bg-lime-100 text-lime-800 dark:bg-[#013f2e]/10 dark:text-[#013f2e] rounded-full border border-lime-200/20">
                                    {item.tool}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Soft Skills */}
                          {job.extractedJd.skills.skills_soft?.length > 0 && (
                            <div>
                              <h5 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Soft Skills</h5>
                              <div className="flex flex-wrap gap-1.5">
                                {job.extractedJd.skills.skills_soft.map((item: any, i: number) => (
                                  <span key={i} className="px-2.5 py-1 text-small font-medium bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300 rounded-full">
                                    {item.skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                      {/* Job Description */}
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                        <h4 className="mb-4 text-body font-semibold text-gray-900 dark:text-white">Job Description</h4>
                        <div className="max-h-[300px] overflow-y-auto pr-2">
                          <FormattedJobDescription content={job.jobDescription || fallbacks.defaultJobDescription} />
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d] space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-body font-semibold text-gray-900 dark:text-white">Personal Job Notes</h4>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setActiveTab('notes');
                              setIsEditingNotes(true);
                            }}
                            leftIcon={jobNotes?.trim() ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          >
                            {jobNotes?.trim() ? 'Edit Notes' : 'Add Notes'}
                          </Button>
                        </div>
                        <div className="whitespace-pre-wrap text-small leading-6 text-gray-700 dark:text-gray-300">
                          {jobNotes?.trim() || <span className="text-gray-400 italic">No notes added yet.</span>}
                        </div>
                      </div>

                      {/* Team & Culture */}
                      {job.extractedJd?.team_and_culture && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d] space-y-4">
                          <h4 className="text-body font-semibold text-gray-900 dark:text-white">Team & Culture</h4>
                          
                          {/* Structure */}
                          {job.extractedJd.team_and_culture.team_structure && (
                            <div className="grid grid-cols-2 gap-3 text-small border-b border-gray-100 dark:border-white/5 pb-3">
                              {job.extractedJd.team_and_culture.team_structure.department && (
                                <div>
                                  <span className="text-small text-gray-500 dark:text-gray-400 block">Department</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{job.extractedJd.team_and_culture.team_structure.department}</span>
                                </div>
                              )}
                              {job.extractedJd.team_and_culture.team_structure.reports_to && (
                                <div>
                                  <span className="text-small text-gray-500 dark:text-gray-400 block">Reports To</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{job.extractedJd.team_and_culture.team_structure.reports_to}</span>
                                </div>
                              )}
                              {job.extractedJd.team_and_culture.team_structure.team_size && (
                                <div>
                                  <span className="text-small text-gray-500 dark:text-gray-400 block">Team Size</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{job.extractedJd.team_and_culture.team_structure.team_size}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Company Values */}
                          {job.extractedJd.team_and_culture.company_values?.length > 0 && (
                            <div>
                              <h5 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Company Values</h5>
                              <div className="space-y-2 text-small">
                                {job.extractedJd.team_and_culture.company_values.map((val: any, i: number) => (
                                  <div key={i} className="flex flex-col bg-white/50 dark:bg-white/5 p-2 rounded-lg border border-gray-100 dark:border-white/5">
                                    <span className="font-semibold text-gray-900 dark:text-white">{val.value}</span>
                                    {val.evidence && <span className="text-small text-gray-500 dark:text-gray-400 mt-0.5">{val.evidence}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                    {/* Left Column */}
                    <div className="space-y-5">
                      {/* Application Snapshot */}
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                        <h4 className="mb-4 text-body font-semibold text-gray-900 dark:text-white">Application Snapshot</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-small text-gray-600 dark:text-gray-300">Status</span>
                            <span className="text-small font-semibold capitalize text-gray-900 dark:text-white">{job.status}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-small text-gray-600 dark:text-gray-300">Success Probability</span>
                            <span className="text-small font-semibold text-gray-900 dark:text-white">{successProb}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-small text-gray-600 dark:text-gray-300">Priority</span>
                            <span className="text-small font-semibold capitalize text-gray-900 dark:text-white">{job.priority || 'medium'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-small text-gray-600 dark:text-gray-300">Sponsorship</span>
                            <span className="text-small font-semibold text-gray-900 dark:text-white">
                              {job.sponsorship === 'yes' ? 'Provided' : job.sponsorship === 'no' ? 'Not provided' : 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-small text-gray-600 dark:text-gray-300">Match Score</span>
                            <span className="text-small font-semibold text-emerald-600 dark:text-emerald-400">{insightsLoading ? '...' : `${keywordMatchScore}%`}</span>
                          </div>
                        </div>
                      </div>

                      {/* JD Quality & Flags */}
                      {job.extractedJd?.jd_quality && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d] space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-body font-semibold text-gray-900 dark:text-white">JD Quality Audit</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-small text-gray-500 dark:text-gray-400 capitalize">Grade: {job.extractedJd.jd_quality.jd_quality_grade}</span>
                              <span className={`px-2 py-0.5 rounded text-small font-bold ${
                                job.extractedJd.jd_quality.jd_quality_score >= 70
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {job.extractedJd.jd_quality.jd_quality_score}/100
                              </span>
                            </div>
                          </div>

                          {/* Red Flags */}
                          {job.extractedJd.jd_quality.jd_red_flags?.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-small font-semibold text-red-600 dark:text-red-400 block uppercase tracking-wider">Concerns & Red Flags ({job.extractedJd.jd_quality.jd_red_flags.length})</span>
                              <div className="space-y-2">
                                {job.extractedJd.jd_quality.jd_red_flags.map((flag: any, i: number) => (
                                  <div key={i} className="flex gap-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg text-small text-gray-700 dark:text-gray-300">
                                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-semibold block text-red-800 dark:text-red-400">{flag.flag}</span>
                                      <span className="text-small text-gray-600 dark:text-gray-400 mt-0.5 block">{flag.detail}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Positive Signals */}
                          {job.extractedJd.jd_quality.jd_positive_signals?.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-small font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">Positive Signals</span>
                              <div className="space-y-2">
                                {job.extractedJd.jd_quality.jd_positive_signals.map((sig: any, i: number) => (
                                  <div key={i} className="flex gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-small text-gray-700 dark:text-gray-300">
                                    <Sparkles className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-semibold block text-emerald-800 dark:text-emerald-400">{sig.signal}</span>
                                      {sig.detail && <span className="text-small text-gray-600 dark:text-gray-400 mt-0.5 block">{sig.detail}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                      {/* Deeper Insights */}
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d]">
                        <h4 className="mb-4 text-body font-semibold text-gray-900 dark:text-white">Deeper Insights</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-small text-gray-600 dark:text-gray-300">Hiring Trend</span>
                            <span className="text-small font-semibold text-gray-900 dark:text-white">{insightsLoading ? '...' : insights?.companyHiringTrend || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-small text-gray-600 dark:text-gray-300">Skills Gap</span>
                            <span className="text-right text-small font-semibold text-gray-900 dark:text-white">{insightsLoading ? '...' : insights?.skillsGap || 'Unable to analyze'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-small text-gray-600 dark:text-gray-300">Market Competitiveness</span>
                            <span className={`text-right text-small font-semibold ${
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
                            <div className="rounded-xl bg-blue-50 px-4 py-3 text-small leading-6 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                              <span className="font-semibold">Smart action:</span> {nudge}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ATS Keywords Section */}
                      {job.extractedJd?.ats_keywords && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d] space-y-4">
                          <h4 className="text-body font-semibold text-gray-900 dark:text-white">ATS Target Keywords</h4>
                          
                          {/* Primary Keywords */}
                          {job.extractedJd.ats_keywords.primary?.length > 0 && (
                            <div>
                              <h5 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Primary Keywords (High Importance)</h5>
                              <div className="flex flex-wrap gap-1.5">
                                {job.extractedJd.ats_keywords.primary.map((kw: any, i: number) => (
                                  <span key={i} className="px-2.5 py-1 text-small font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg flex items-center gap-1">
                                    {kw.keyword}
                                    {kw.frequency > 0 && <span className="opacity-60 font-mono text-[9px]">x{kw.frequency}</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Secondary Keywords */}
                          {job.extractedJd.ats_keywords.secondary?.length > 0 && (
                            <div>
                              <h5 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Secondary Keywords</h5>
                              <div className="flex flex-wrap gap-1.5">
                                {job.extractedJd.ats_keywords.secondary.map((kw: any, i: number) => (
                                  <span key={i} className="px-2.5 py-1 text-small font-medium bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300 rounded-lg">
                                    {kw.keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Interview Prep & Questions */}
                      {job.extractedJd?.tracker_enrichment && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-[#20281d] space-y-4">
                          <h4 className="text-body font-semibold text-gray-900 dark:text-white">Interview Prep Planner</h4>
                          
                          {/* Prep Topics */}
                          {job.extractedJd.tracker_enrichment.interview_prep_topics?.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-small font-semibold text-gray-500 dark:text-gray-400 block uppercase tracking-wider">Top Topics to Prepare</span>
                              <div className="space-y-2">
                                {job.extractedJd.tracker_enrichment.interview_prep_topics.map((item: any, i: number) => (
                                  <div key={i} className="flex flex-col bg-white/50 dark:bg-white/5 p-2 rounded-lg border border-gray-100 dark:border-white/5 text-small">
                                    <span className="font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                                      {item.topic}
                                      {item.prep_type && (
                                        <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded uppercase">
                                          {item.prep_type}
                                        </span>
                                      )}
                                    </span>
                                    {item.why_likely && <span className="text-small text-gray-500 dark:text-gray-400 mt-1">{item.why_likely}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Questions to Ask */}
                          {job.extractedJd.tracker_enrichment.questions_to_ask_interviewer?.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-small font-semibold text-gray-500 dark:text-gray-400 block uppercase tracking-wider">Suggested Questions for the Interviewer</span>
                              <div className="space-y-2 text-small text-gray-700 dark:text-gray-300">
                                {job.extractedJd.tracker_enrichment.questions_to_ask_interviewer.map((item: any, i: number) => (
                                  <div key={i} className="p-2 bg-white/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                    <span className="font-medium text-gray-900 dark:text-white block">Q: {item.question}</span>
                                    {item.why_ask && <span className="text-small text-gray-500 dark:text-gray-400 mt-1 block">Context: {item.why_ask}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </React.Fragment>
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
                  <Mail size={20} className="text-lime-600 dark:text-[#013f2e]" />
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
                  className="px-4 py-2 bg-[#013f2e] hover:bg-[#025c43] text-white rounded-lg font-bold transition-colors shadow-sm"
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
    </AnimatePresence>,
    document.body
  );
};

export default JobSidebar;
