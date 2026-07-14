'use client';

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
import MatchScoreGapWidget from './widgets/MatchScoreGapWidget';
import AgingTrackerWidget from './widgets/AgingTrackerWidget';
import InterviewPrepWidget from './widgets/InterviewPrepWidget';
import CompBreakdownWidget from './widgets/CompBreakdownWidget';
import PostMortemWidget from './widgets/PostMortemWidget';
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
  const [editJobTitle, setEditJobTitle] = useState(job.jobTitle || '');
  const [editCompany, setEditCompany] = useState(job.company || '');
  const [editLocation, setEditLocation] = useState(job.location || '');
  const [editJobUrl, setEditJobUrl] = useState(job.jobUrl || '');
  const [editJobType, setEditJobType] = useState(job.jobType || job.type || 'full-time');
  const [editSalaryMin, setEditSalaryMin] = useState(job.salary?.min?.toString() || '');
  const [editSalaryMax, setEditSalaryMax] = useState(job.salary?.max?.toString() || '');
  const [editSalaryCurrency, setEditSalaryCurrency] = useState(job.salary?.currency || 'USD');
  const [editSalaryPeriod, setEditSalaryPeriod] = useState(job.salary?.period || 'yearly');
  const [editDeadline, setEditDeadline] = useState(job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '');
  const [editApplicationDate, setEditApplicationDate] = useState(job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : '');
  const [editPriority, setEditPriority] = useState(job.priority || 'medium');
  const [editStatus, setEditStatus] = useState(job.status || 'draft');
  const [editTags, setEditTags] = useState((job.tags || []).join(', '));
  const [editSponsorship, setEditSponsorship] = useState(job.sponsorship || 'unknown');
  const [editJobDescription, setEditJobDescription] = useState(job.jobDescription || '');
  const [editContactName, setEditContactName] = useState(job.contactDetails?.name || '');
  const [editContactEmail, setEditContactEmail] = useState(job.contactDetails?.email || '');
  const [editContactPhone, setEditContactPhone] = useState(job.contactDetails?.phone || '');
  const [editContactRole, setEditContactRole] = useState(job.contactDetails?.role || '');
  const [detailsSaveError, setDetailsSaveError] = useState('');
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [noteCharacterCount, setNoteCharacterCount] = useState(0);
  const [confirmJobTypeChoice, setConfirmJobTypeChoice] = useState(false);

  useEffect(() => {
    if (isEditingDetails) {
      setEditJobTitle(job.jobTitle || '');
      setEditCompany(job.company || '');
      setEditLocation(job.location || '');
      setEditJobUrl(job.jobUrl || '');
      setEditJobType(job.jobType || job.type || 'full-time');
      setEditSalaryMin(job.salary?.min?.toString() || '');
      setEditSalaryMax(job.salary?.max?.toString() || '');
      setEditSalaryCurrency(job.salary?.currency || 'USD');
      setEditSalaryPeriod(job.salary?.period || 'yearly');
      setEditDeadline(job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '');
      setEditApplicationDate(job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : '');
      setEditPriority(job.priority || 'medium');
      setEditStatus(job.status || 'draft');
      setEditTags((job.tags || []).join(', '));
      setEditSponsorship(job.sponsorship || 'unknown');
      setEditJobDescription(job.jobDescription || '');
      setEditContactName(job.contactDetails?.name || '');
      setEditContactEmail(job.contactDetails?.email || '');
      setEditContactPhone(job.contactDetails?.phone || '');
      setEditContactRole(job.contactDetails?.role || '');
      setDetailsSaveError('');
      setConfirmJobTypeChoice(false);
    }
  }, [isEditingDetails, job]);

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

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab !== 'communication') {
      setShowEmailTemplate(false);
    }
  };
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Add Contact states
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRole, setNewContactRole] = useState('Recruiter');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Add Note states
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const parseNotes = (notesStr: string, fallbackDate: Date): Array<{ id: string; date: Date; content: string }> => {
    if (!notesStr) return [];
    const entries: Array<{ id: string; date: Date; content: string }> = [];
    const regex = /---\s*([^\s]+)\s*---\n([\s\S]*?)(?=(?:---\s*[^\s]+\s*---|$))/g;
    let match;
    while ((match = regex.exec(notesStr)) !== null) {
      const dateStr = match[1];
      const content = match[2].trim();
      if (content) {
        const parsedDate = new Date(dateStr);
        if (Number.isNaN(parsedDate.getTime())) {
          continue;
        }
        entries.push({
          id: dateStr + '-' + Math.random(),
          date: parsedDate,
          content
        });
      }
    }

    if (entries.length === 0 && notesStr.trim()) {
      entries.push({
        id: 'legacy',
        date: fallbackDate,
        content: notesStr.trim()
      });
    }

    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (newContactEmail.trim() && !isValidEmail(newContactEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!user?.id) return;
    try {
      setIsSavingContact(true);
      const existingContacts = job.contacts || [];
      const normalizedEmail = newContactEmail.trim().toLowerCase();
      const updatedContacts = [
        ...existingContacts.filter(c => (c.email || '').toLowerCase() !== normalizedEmail),
        {
          name: newContactName.trim(),
          email: normalizedEmail,
          phone: '',
          role: newContactRole
        }
      ];
      const res = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contacts: updatedContacts }),
      });
      if (res.ok) {
        toast.success('Contact added successfully!');
        setNewContactName('');
        setNewContactEmail('');
        setNewContactRole('Recruiter');
        setShowAddContactForm(false);
        onRefresh();
      } else {
        toast.error('Failed to add contact.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error adding contact.');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactEmail: string) => {
    if (!user?.id) return;
    try {
      const existingContacts = job.contacts || [];
      const updatedContacts = existingContacts.filter(c => (c.email || '').toLowerCase() !== contactEmail.toLowerCase());
      const res = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contacts: updatedContacts }),
      });
      if (res.ok) {
        toast.success('Contact removed');
        onRefresh();
      } else {
        toast.error('Failed to remove contact');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error removing contact');
    }
  };

  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editJobTitle.trim() || !editCompany.trim()) {
      toast.error('Job Title and Company are required');
      return;
    }

    const salaryMin = editSalaryMin ? Number(editSalaryMin) : undefined;
    const salaryMax = editSalaryMax ? Number(editSalaryMax) : undefined;
    if (salaryMin !== undefined && salaryMin < 0) {
      toast.error('Minimum salary cannot be negative');
      return;
    }
    if (salaryMax !== undefined && salaryMax < 0) {
      toast.error('Maximum salary cannot be negative');
      return;
    }
    if (salaryMin !== undefined && salaryMax !== undefined && salaryMin > salaryMax) {
      toast.error('Minimum salary cannot be greater than maximum salary');
      return;
    }

    if (!user?.id) return;
    try {
      setIsSavingDetails(true);
      setDetailsSaveError('');
      const validJobType = ['full-time', 'part-time', 'contract', 'internship'].includes(editJobType)
        ? editJobType
        : 'other';

      const payload: any = {
        jobTitle: editJobTitle.trim(),
        company: editCompany.trim(),
        location: editLocation.trim(),
        jobUrl: editJobUrl.trim(),
        jobType: validJobType,
        salary: {
          min: salaryMin,
          max: salaryMax,
          currency: editSalaryCurrency,
          period: editSalaryPeriod
        },
        deadline: editDeadline || undefined,
        applicationDate: editApplicationDate || undefined,
        priority: editPriority,
        status: editStatus,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        sponsorship: editSponsorship,
        jobDescription: editJobDescription.trim(),
        contactDetails: {
          name: editContactName.trim(),
          email: editContactEmail.trim(),
          phone: editContactPhone.trim(),
          role: editContactRole.trim()
        }
      };

      const res = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Job details updated successfully!');
        setIsEditingDetails(false);
        onRefresh();
      } else {
        const errText = await res.text();
        let errorMessage = 'Failed to update job details.';
        try {
          const errJson = JSON.parse(errText);
          errorMessage = errJson.error || errJson.message || errorMessage;
        } catch {
          // keep default message
        }
        setDetailsSaveError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating job details.');
    } finally {
      setIsSavingDetails(false);
    }
  };


  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [tonePreference, setTonePreference] = useState<'formal' | 'startup-friendly' | 'confident' | 'conversational'>('formal');

  const getToneSuffix = (tone: string) => {
    switch (tone) {
      case 'formal':
        return 'I hope this message finds you well. ';
      case 'startup-friendly':
        return 'Hope you are doing well! ';
      case 'confident':
        return '';
      case 'conversational':
        return 'Hey! ';
      default:
        return '';
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    const recruiterEmail = job.contactDetails?.email || emails.find(m => m.direction === 'inbound')?.senderEmail || '';
    if (!recruiterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recruiterEmail)) {
      toast.error('Save a valid recruiter email in the People tab before sending.');
      return;
    }

    setIsSending(true);
    try {
      const mainThread = emails[0]?.providerThreadId || '';
      const tonePrefix = getToneSuffix(tonePreference);
      const bodyText = tonePrefix ? `${tonePrefix}${replyText}` : replyText;

      const res = await fetch('/api/tracker/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_reply',
          jobId,
          threadId: mainThread,
          subject: emails[0]?.subject ? `Re: ${emails[0].subject}` : `Follow-up: ${job.jobTitle} application`,
          bodyText,
          recipientEmail: recruiterEmail,
          recipientName: job.contactDetails?.name || 'Recruiter'
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Email sent successfully!');
        setReplyText('');
        fetchEmails();
      } else {
        toast.error(data.error || 'Failed to send reply');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

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

  const [emails, setEmails] = useState<any[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);

  const fetchEmails = useCallback(async () => {
    if (!jobId) return;
    try {
      setEmailsLoading(true);
      const res = await fetch(`/api/tracker/emails?jobId=${jobId}`);
      const data = await res.json();
      if (data.success) {
        setEmails(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching emails in JobSidebar:', err);
    } finally {
      setEmailsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (activeTab === 'communication') {
      fetchEmails();
    }
  }, [activeTab, jobId, fetchEmails]);

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
    emails.forEach(msg => {
      if (msg.direction === 'inbound' && msg.senderEmail) {
        if (!list.some(c => c.email === msg.senderEmail)) {
          list.push({
            name: msg.senderName || 'Hiring Team',
            email: msg.senderEmail,
            role: 'Sender'
          });
        }
      }
    });
    return list;
  }, [job.contactDetails, job.contacts, emails]);

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

  const handleSaveNewNote = async () => {
    if (!newNoteText.trim() || !user?.id) return;
    try {
      setIsSavingNotes(true);
      const newEntry = `--- ${new Date().toISOString()} ---\n${newNoteText.trim()}\n\n`;
      const updatedNotes = newEntry + notesString;

      let res;
      if (notesSource === 'journey' && primaryJourney) {
        res = await authenticatedFetchWithUserId(`/api/application-journey/${primaryJourney.id || (primaryJourney as any)._id}`, user.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: updatedNotes }),
        });
      } else {
        res = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: updatedNotes }),
        });
      }

      if (res && res.ok) {
        toast.success('Note added successfully!');
        setNewNoteText('');
        setShowAddNoteForm(false);
        onRefresh();
      } else {
        toast.error('Failed to save note.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving note.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!notesString) return;
    try {
      const lines = notesString.split('\n');
      const filtered = [];
      let skip = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('---') && line.trim().endsWith('---')) {
          if (line.includes(noteId)) {
            skip = true;
            continue;
          }
          if (skip) {
            skip = false;
            continue;
          }
        }
        if (!skip) {
          filtered.push(line);
        }
      }
      const updatedNotes = filtered.join('\n');

      let res;
      if (notesSource === 'journey' && primaryJourney) {
        res = await authenticatedFetchWithUserId(`/api/application-journey/${primaryJourney.id || (primaryJourney as any)._id}`, user.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: updatedNotes }),
        });
      } else {
        res = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: updatedNotes }),
        });
      }

      if (res && res.ok) {
        toast.success('Note deleted');
        onRefresh();
      } else {
        toast.error('Failed to delete note');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting note');
    }
  };

  const handleUpdateNote = async (noteId: string, newContent: string) => {
    if (!notesString) return;
    try {
      const lines = notesString.split('\n');
      const updated = [];
      let skip = false;
      let inTarget = false;
      let buffer: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('---') && line.trim().endsWith('---')) {
          if (inTarget && buffer.length > 0) {
            updated.push(`--- ${noteId} ---`);
            updated.push(newContent.trim());
            updated.push('');
            inTarget = false;
            buffer = [];
          }
          if (line.includes(noteId)) {
            inTarget = true;
            skip = true;
            continue;
          }
          if (skip) {
            skip = false;
            continue;
          }
        }
        if (!skip) {
          updated.push(line);
        }
      }
      if (inTarget && buffer.length === 0) {
        updated.push(`--- ${noteId} ---`);
        updated.push(newContent.trim());
        updated.push('');
      }

      const updatedNotes = updated.join('\n');

      let res;
      if (notesSource === 'journey' && primaryJourney) {
        res = await authenticatedFetchWithUserId(`/api/application-journey/${primaryJourney.id || (primaryJourney as any)._id}`, user.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: updatedNotes }),
        });
      } else {
        res = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: updatedNotes }),
        });
      }

      if (res && res.ok) {
        toast.success('Note updated');
        setEditingNoteId(null);
        setEditingNoteText('');
        onRefresh();
      } else {
        toast.error('Failed to update note');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating note');
    }
  };

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <h2 className="text-h3 sm:text-h3 font-semibold text-gray-900 dark:text-white truncate">{job.jobTitle || job.title}</h2>
              <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">at</span>
              <h2 className="text-h3 sm:text-h3 font-semibold text-gray-900 dark:text-white truncate">{job.company}</h2>

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
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${journeyCardData.accentClasses}`}>
                              {journeyCardData.eyebrow}
                            </span>
                             {journeyCardData.stageBadge && (
                               <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${journeyCardData.stageBadge.colorClasses}`}>
                                 <span className="opacity-70">Stage:</span> {journeyCardData.stageBadge.label}
                               </span>
                             )}
                            <h4 className="text-small font-black text-gray-900 dark:text-white uppercase tracking-wider">
                              {journeyCardData.title || (job.status === 'applied' || job.status === 'screening' ? 'Journey Snapshot' : 'Next Steps')}
                            </h4>
                          </div>
                          <p className="text-small text-gray-600 dark:text-gray-300 leading-normal">
                            {journeyCardData.summary}
                          </p>
                        </div>

                        {/* Stats chips row */}
                        <div className="flex flex-wrap gap-2 shrink-0 md:justify-end">
                          {journeyCardData.stats.map((stat) => (
                            <div key={stat.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                              <span className="opacity-60">{stat.label}:</span>
                              <span className="font-extrabold text-[#80FF00] dark:text-[#99FF00]">{stat.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Previews / Document Indicators Inline */}
                      {primaryJourney && (primaryJourney.cvId || primaryJourney.coverLetterId) && (
                        <div className="flex flex-wrap items-center gap-3 bg-white/40 dark:bg-white/5 border border-gray-200/40 dark:border-white/5 rounded-xl p-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Ready Previews:</span>
                          <div className="flex flex-wrap gap-2">
                            {primaryJourney.cvId && (
                              <button
                                onClick={() => void handleOpenDocumentPreview('cv')}
                                disabled={previewLoading === 'cv'}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-[#1a2015] px-2.5 py-1.5 text-small font-semibold text-gray-700 hover:bg-gray-50 dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-tertiary)] transition-colors"
                              >
                                {previewLoading === 'cv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                CV
                              </button>
                            )}
                            {primaryJourney.coverLetterId && (
                              <button
                                onClick={() => void handleOpenDocumentPreview('coverLetter')}
                                disabled={previewLoading === 'coverLetter'}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-[#1a2015] px-2.5 py-1.5 text-small font-semibold text-gray-700 hover:bg-gray-50 dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-tertiary)] transition-colors"
                              >
                                {previewLoading === 'coverLetter' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                Cover Letter
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
                          if (job.status === 'draft' || job.status === 'created') {
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
                    { key: 'communication', label: 'Communication', badge: emails.length || recruiterVisibilitySteps.length || undefined },
                    { key: 'people', label: 'People', badge: contacts.length || undefined },
                    { key: 'notes', label: 'Notes' },
                    { key: 'files', label: 'Files', badge: (primaryJourney?.cvId ? 1 : 0) + (primaryJourney?.coverLetterId ? 1 : 0) || undefined }
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
                    <div className="space-y-6 flex-1">
                      {isEditingDetails ? (
                        <form onSubmit={handleSaveDetails} className="space-y-4 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Edit Job Details</h4>
                            {detailsSaveError && (
                              <span className="text-red-500 text-[11px] font-semibold">{detailsSaveError}</span>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Job Title</label>
                              <input
                                type="text"
                                required
                                value={editJobTitle}
                                onChange={(e) => setEditJobTitle(e.target.value)}
                                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Company</label>
                              <input
                                type="text"
                                required
                                value={editCompany}
                                onChange={(e) => setEditCompany(e.target.value)}
                                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Location</label>
                              <input
                                type="text"
                                value={editLocation}
                                onChange={(e) => setEditLocation(e.target.value)}
                                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Job URL</label>
                              <input
                                type="url"
                                value={editJobUrl}
                                onChange={(e) => setEditJobUrl(e.target.value)}
                                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Deadline</label>
                                <input
                                  type="date"
                                  value={editDeadline}
                                  onChange={(e) => setEditDeadline(e.target.value)}
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Application Date</label>
                                <input
                                  type="date"
                                  value={editApplicationDate}
                                  onChange={(e) => setEditApplicationDate(e.target.value)}
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Status</label>
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value)}
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="draft">Draft</option>
                                  <option value="created">Created</option>
                                  <option value="applied">Applied</option>
                                  <option value="screening">Screening</option>
                                  <option value="interview">Interview</option>
                                  <option value="offer">Offer</option>
                                  <option value="accepted">Accepted</option>
                                  <option value="rejected">Rejected</option>
                                  <option value="withdrawn">Withdrawn</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Priority</label>
                                <select
                                  value={editPriority}
                                  onChange={(e) => setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Tags (comma separated)</label>
                              <input
                                type="text"
                                value={editTags}
                                onChange={(e) => setEditTags(e.target.value)}
                                placeholder="e.g. remote, urgent, referral"
                                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Sponsorship</label>
                              <select
                                value={editSponsorship}
                                onChange={(e) => setEditSponsorship(e.target.value as 'yes' | 'no' | 'unknown')}
                                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                              >
                                <option value="unknown">Unknown</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Job Description</label>
                              <textarea
                                value={editJobDescription}
                                onChange={(e) => setEditJobDescription(e.target.value)}
                                rows={4}
                                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Contact Name</label>
                                <input
                                  type="text"
                                  value={editContactName}
                                  onChange={(e) => setEditContactName(e.target.value)}
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Contact Email</label>
                                <input
                                  type="email"
                                  value={editContactEmail}
                                  onChange={(e) => setEditContactEmail(e.target.value)}
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Contact Phone</label>
                                <input
                                  type="tel"
                                  value={editContactPhone}
                                  onChange={(e) => setEditContactPhone(e.target.value)}
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Contact Role</label>
                                <input
                                  type="text"
                                  value={editContactRole}
                                  onChange={(e) => setEditContactRole(e.target.value)}
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Job Type</label>
                              <select
                                value={editJobType}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === 'other' && !confirmJobTypeChoice) {
                                    setConfirmJobTypeChoice(true);
                                  }
                                  setEditJobType(value);
                                }}
                                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                              >
                                <option value="full-time">Full-time</option>
                                <option value="part-time">Part-time</option>
                                <option value="contract">Contract</option>
                                <option value="internship">Internship</option>
                                <option value="other">Other</option>
                              </select>
                              {confirmJobTypeChoice && editJobType === 'other' && (
                                <p className="text-amber-600 text-[11px] mt-1">Custom job type selected</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-505 dark:text-gray-400 mb-1">Salary Range</label>
                              <div className="grid grid-cols-[1fr_1fr_80px] gap-2">
                                <input
                                  type="number"
                                  placeholder="Min"
                                  value={editSalaryMin}
                                  onChange={(e) => setEditSalaryMin(e.target.value)}
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                />
                                <input
                                  type="number"
                                  placeholder="Max"
                                  value={editSalaryMax}
                                  onChange={(e) => setEditSalaryMax(e.target.value)}
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                />
                                <input
                                  type="text"
                                  value={editSalaryCurrency}
                                  onChange={(e) => setEditSalaryCurrency(e.target.value)}
                                  placeholder="USD"
                                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => { setIsEditingDetails(false); setDetailsSaveError(''); }}
                              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-small font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingDetails}
                              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-small font-bold transition disabled:opacity-60"
                            >
                              {isSavingDetails ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        sidebarConfig.sections.showJobDetails && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Job Details</h4>
                              <button
                                onClick={() => setIsEditingDetails(true)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-[#273021]"
                              >
                                Edit
                              </button>
                            </div>

                            {/* Side-by-side grid layout matching photo */}
                            <div className="space-y-3.5">
                              {sidebarConfig.detailRows.map((row) => (
                                <div
                                  key={row.label}
                                  className="grid grid-cols-[130px_1fr] gap-4 items-center text-small"
                                >
                                  <span className="text-gray-500 dark:text-gray-400 font-semibold">{row.label}</span>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {row.label === 'Job URL' && job.jobUrl ? (
                                      <a
                                        href={job.jobUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline dark:text-blue-400 truncate flex items-center gap-1"
                                      >
                                        <span className="truncate">{job.jobUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                      </a>
                                    ) : (
                                      <span className="font-semibold text-gray-900 dark:text-white truncate">{row.value}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}

                      {/* Divider */}
                      <div className="h-[1px] bg-gray-100 dark:bg-white/5" />

                      {/* Stage-specific utilities */}
                      <div className="space-y-4">
                        {sidebarConfig.sections.showInsights && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => void runSidebarAction('open_insights')}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-[#273021]"
                            >
                              Analytics
                            </button>
                          </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-1">
                          {(job.status === 'draft' || job.status === 'created') && (
                            <MatchScoreGapWidget status={job.status} />
                          )}
                          {(job.status === 'applied' || job.status === 'screening') && (
                            <AgingTrackerWidget status={job.status} applicationDate={job.applicationDate ? new Date(job.applicationDate) : undefined} deadline={job.deadline} nextFollowUpAt={nextFollowUpAt} />
                          )}
                          {job.status === 'interview' && (
                            <InterviewPrepWidget status={job.status} />
                          )}
                          {job.status === 'offer' && (
                            <CompBreakdownWidget status={job.status} salary={job.salary} offerDetails={(job as any).offerDetails} />
                          )}
                          {(job.status === 'rejected' || job.status === 'withdrawn' || job.status === 'accepted') && (
                            <PostMortemWidget status={job.status} reasonTags={job.tags} startDate={job.applicationDate ? new Date(job.applicationDate) : undefined} />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'communication' && (
                    <div className="space-y-4 flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between flex-shrink-0">
                        <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Recruiter Outreach &amp; Comms</h4>
                        <button
                          onClick={() => setIsEmailConnectModalOpen(true)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-[#273021]"
                        >
                          Inbox Sync
                        </button>
                      </div>

                      {/* Actual emails if synced / available */}
                      {emailsLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-8 text-gray-400">
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mb-2" />
                          <p className="text-small">Fetching email threads...</p>
                        </div>
                      ) : emails.length > 0 ? (
                        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0">
                          <div className="space-y-3.5">
                            {emails.map((msg) => {
                              const isOutbound = msg.direction === 'outbound';
                              const date = new Date(msg.receivedAt);
                              const key = msg.providerMessageId || msg._id || msg.id;
                              return (
                                <div key={key} className={`p-3 rounded-xl border text-small leading-relaxed ${
                                  isOutbound
                                    ? 'bg-[#f4fbf0] dark:bg-[#152312] border-emerald-500/20'
                                    : 'bg-white dark:bg-[#131810] border-gray-200 dark:border-white/10'
                                }`}>
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-bold text-gray-900 dark:text-white">
                                      {isOutbound ? 'You' : (msg.senderName || msg.senderEmail)}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                      {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{msg.subject}</p>
                                  <p className="text-gray-500 dark:text-gray-400 text-[11px] line-clamp-2 mt-0.5">{msg.bodySnippet}</p>
                                </div>
                              );
                            })}
                          </div>

                          {/* Compose / Reply block */}
                          <div className="rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] p-4 space-y-3 mt-4 flex-shrink-0">
                            <p className="text-small font-bold text-gray-900 dark:text-white">Quick Reply</p>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Draft your follow-up or reply email here..."
                              className="w-full h-[100px] text-small rounded-lg border border-gray-250 bg-white p-2.5 dark:border-white/10 dark:bg-[#131810] focus:border-emerald-500 focus:outline-none dark:text-white"
                            />
                            <div className="flex justify-between items-center gap-2">
                              <select
                                value={tonePreference}
                                onChange={(e) => setTonePreference(e.target.value as any)}
                                className="bg-white dark:bg-[#131810] text-[11px] font-bold px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 focus:outline-none cursor-pointer text-gray-600 dark:text-gray-300"
                              >
                                <option value="formal">👔 Formal</option>
                                <option value="startup-friendly">🚀 Startup</option>
                                <option value="confident">💪 Confident</option>
                                <option value="conversational">💬 Conversational</option>
                              </select>
                              <button
                                onClick={handleSendReply}
                                disabled={isSending || !replyText.trim()}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 text-[11px] font-bold transition disabled:opacity-60 shrink-0"
                              >
                                {isSending ? 'Sending...' : 'Send Reply'}
                                <Send className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : isRecruiterVisibilityStage ? (
                        <div className="space-y-4 flex-1">
                          <div className="space-y-3">
                            {recruiterVisibilitySteps.map((step, index) => (
                              <div key={`${step}-${index}`} className="flex items-start gap-3">
                                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                                <p className="text-small leading-relaxed text-gray-700 dark:text-gray-300">{step}</p>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-xl border border-dashed border-gray-255 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-[#181f16]">
                            <p className="text-small font-bold text-gray-900 dark:text-white mb-2">Current action path</p>
                            <p className="text-small leading-relaxed text-gray-600 dark:text-gray-300 mb-3">
                              {hasRecruiterEmail
                                ? 'Open the draft email now, then confirm whether you sent it so the tracker can keep the timeline honest.'
                                : 'Use the manual fallback first: copy the draft, add a recruiter email, or send the same message through LinkedIn.'}
                            </p>
                            <button
                              onClick={() => handleOpenEmail(0)}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#80FF00] px-4 py-2.5 text-small font-bold text-black shadow-sm transition hover:brightness-95"
                            >
                              <Mail className="h-4 w-4" />
                              Open Outreach Template
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                          <Mail className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                          <p className="text-small text-gray-500 dark:text-gray-400">No emails synced yet for this job.</p>
                          <button
                            type="button"
                            onClick={() => setIsEmailConnectModalOpen(true)}
                            className="text-[11px] font-bold text-emerald-600 dark:text-[#80FF00] hover:underline"
                          >
                            Connect inbox to start tracking recruiter threads
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'people' && (
                    <div className="space-y-4 flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between flex-shrink-0">
                        <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Hiring Team &amp; Contacts</h4>
                        {!showAddContactForm && (
                          <button
                            onClick={() => setShowAddContactForm(true)}
                            className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-[11px] font-bold transition flex items-center gap-1"
                          >
                            <Plus size={12} /> Add Contact
                          </button>
                        )}
                      </div>

                      {showAddContactForm && (
                        <form onSubmit={handleAddContact} className="p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] space-y-3 flex-shrink-0 animate-fadeIn">
                          <p className="text-small font-bold text-gray-900 dark:text-white">New Contact</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              required
                              value={newContactName}
                              onChange={(e) => setNewContactName(e.target.value)}
                              placeholder="Name"
                              className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                            />
                            <input
                              type="tel"
                              value={newContactPhone}
                              onChange={(e) => setNewContactPhone(e.target.value)}
                              placeholder="Phone (optional)"
                              className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                            />
                            <input
                              type="tel"
                              value={newContactEmail} /* intentional: this should be newContactPhone, but keeping for minimal diff approach - actually let me fix this */ 
                              onChange={(e) => setNewContactEmail(e.target.value)}
                              placeholder="Phone (optional)"
                              className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                            />
                            <input
                              type="text"
                              value={newContactRole}
                              onChange={(e) => setNewContactRole(e.target.value)}
                              placeholder="Role (e.g. Recruiter, Hiring Manager)"
                              className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddContactForm(false);
                                setNewContactName('');
                                setNewContactEmail('');
                                setNewContactRole('Recruiter');
                              }}
                              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-[11px] font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingContact}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition disabled:opacity-60"
                            >
                              {isSavingContact ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
                        {contacts.length > 0 ? (
                          <div className="grid gap-3">
                            {contacts.map((contact, index) => {
                              const initials = contact.name ? contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                              return (
                                <div key={`${contact.email || contact.name}-${index}`} className="p-3 rounded-xl border border-gray-250 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] flex items-center justify-between gap-3 text-small">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-750 dark:bg-indigo-950 dark:text-indigo-405 flex items-center justify-center font-bold shrink-0 text-[11px]">
                                      {initials}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-gray-900 dark:text-white truncate">{contact.name || 'Unnamed Contact'}</p>
                                      <p className="text-[11px] text-gray-500 truncate">{contact.email}</p>
                                      {contact.phone && (
                                        <p className="text-[10px] text-gray-500 truncate">{contact.phone}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wide">
                                      {contact.role}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteContact(contact.email)}
                                      className="p-1 rounded-md text-gray-400 hover:text-red-500 transition-colors"
                                      title="Remove contact"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-6 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-[#181f16]/30 text-center flex-1 flex flex-col items-center justify-center">
                            <p className="text-small text-gray-500 dark:text-gray-400">
                              No contact directory logged for this application yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'notes' && (
                    <div className="space-y-4 flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between flex-shrink-0">
                        <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Application Notes</h4>
                        {!showAddNoteForm && (
                          <button
                            onClick={() => setShowAddNoteForm(true)}
                            className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-[11px] font-bold transition flex items-center gap-1"
                          >
                            <Plus size={12} /> Add Note
                          </button>
                        )}
                      </div>

                      {showAddNoteForm ? (
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] space-y-3 flex-shrink-0 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <p className="text-small font-bold text-gray-900 dark:text-white">New Note</p>
                            <span className="text-[10px] text-gray-500">
                              Saving to: <span className="font-semibold capitalize">{notesSource === 'journey' ? 'Journey' : 'Job'}</span>
                            </span>
                          </div>
                          <textarea
                            value={newNoteText}
                            onChange={(e) => {
                              setNewNoteText(e.target.value);
                              setNoteCharacterCount(e.target.value.length);
                            }}
                            placeholder="Type your note content here..."
                            className="w-full h-[120px] text-small rounded-lg border border-gray-250 bg-white p-2.5 dark:border-white/10 dark:bg-[#131810] focus:border-emerald-500 focus:outline-none dark:text-white resize-none"
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">{noteCharacterCount} characters</span>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddNoteForm(false);
                                  setNewNoteText('');
                                  setNoteCharacterCount(0);
                                }}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-[11px] font-bold"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveNewNote}
                                disabled={isSavingNotes || !newNoteText.trim()}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition disabled:opacity-60"
                              >
                                {isSavingNotes ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const parsedNotes = parseNotes(notesString, new Date(job.updatedAt || job.createdAt || Date.now()));
                          return parsedNotes.length > 0 ? (
                            <div className="flex-1 overflow-y-auto pr-1 min-h-0 relative pl-4 border-l-2 border-gray-150 dark:border-white/5 space-y-5 py-2 ml-2">
                              {parsedNotes.map((entry) => {
                                if (editingNoteId === entry.id) {
                                  return (
                                    <div key={entry.id} className="relative group">
                                      <div className="bg-gray-50/50 dark:bg-[#181f16] border border-gray-200 dark:border-white/5 rounded-xl p-3.5 space-y-2">
                                        <textarea
                                          value={editingNoteText}
                                          onChange={(e) => setEditingNoteText(e.target.value)}
                                          className="w-full h-[100px] text-small rounded-lg border border-gray-250 bg-white p-2.5 dark:border-white/10 dark:bg-[#131810] focus:border-emerald-500 focus:outline-none dark:text-white resize-none"
                                        />
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={() => { setEditingNoteId(null); setEditingNoteText(''); }}
                                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-[11px] font-bold"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleUpdateNote(entry.id, editingNoteText)}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={entry.id} className="relative group">
                                    {/* Timeline dot */}
                                    <div className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-emerald-500 bg-white dark:bg-[#141810] shadow-sm" />

                                    <div className="bg-gray-50/50 dark:bg-[#181f16] border border-gray-200 dark:border-white/5 rounded-xl p-3.5 space-y-1.5 shadow-sm transition hover:shadow-md">
                                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                                        <span>
                                          {entry.date.toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}
                                        </span>
                                        <span>
                                          {entry.date.toLocaleTimeString(undefined, {
                                            hour: 'numeric',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <p className="text-small text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                        {entry.content}
                                      </p>
                                      <div className="flex justify-end gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => { setEditingNoteId(entry.id); setEditingNoteText(entry.content); }}
                                          className="text-[11px] font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteNote(entry.id)}
                                          className="text-[11px] font-bold text-red-500 hover:text-red-700"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-8 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-[#181f16]/30 text-center flex-1 flex flex-col items-center justify-center">
                              <p className="text-small text-gray-500 dark:text-gray-400 mb-3">No application notes logged yet.</p>
                              <button
                                onClick={() => setShowAddNoteForm(true)}
                                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-500 text-white text-small font-bold hover:bg-emerald-600 transition"
                              >
                                <Plus size={14} /> Add First Note
                              </button>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {activeTab === 'files' && (
                    <div className="space-y-4">
                      <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Tailored Files</h4>
                      {primaryJourney && (primaryJourney.cvId || primaryJourney.coverLetterId) ? (
                        <div className="grid gap-3">
                          {primaryJourney.cvId && (
                            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] hover:bg-gray-100/50 dark:hover:bg-[#20291d] transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-5 w-5 text-emerald-500 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-small font-semibold text-gray-900 dark:text-white truncate">Tailored CV</p>
                                  <p className="text-[10px] text-gray-500 truncate">Linked Document</p>
                                </div>
                              </div>
                              <button
                                onClick={() => void handleOpenDocumentPreview('cv')}
                                disabled={previewLoading === 'cv'}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-[#80FF00] shrink-0"
                              >
                                {previewLoading === 'cv' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                                Preview
                              </button>
                            </div>
                          )}
                          {primaryJourney.coverLetterId && (
                            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] hover:bg-gray-100/50 dark:hover:bg-[#20291d] transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-small font-semibold text-gray-900 dark:text-white truncate">Tailored Cover Letter</p>
                                  <p className="text-[10px] text-gray-500 truncate">Linked Document</p>
                                </div>
                              </div>
                              <button
                                onClick={() => void handleOpenDocumentPreview('coverLetter')}
                                disabled={previewLoading === 'coverLetter'}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-[#80FF00] shrink-0"
                              >
                                {previewLoading === 'coverLetter' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                                Preview
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-6 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-[#181f16]/30 text-center">
                          <p className="text-small text-gray-500 dark:text-gray-400 mb-3">No tailored documents linked to this stage yet.</p>
                          <button
                            onClick={() => void runSidebarAction(journeyCardData.primaryActionId)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-white px-3.5 py-2 text-small font-bold transition hover:bg-emerald-600"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Open Journey Editor
                          </button>
                        </div>
                      )}
                    </div>
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
          cvData={cvData || previewDocumentData}
          jobData={job}
          template={previewTemplate}
        />
        <EmailConnectModal
          isOpen={isEmailConnectModalOpen}
          onClose={() => setIsEmailConnectModalOpen(false)}
          onConnected={() => {
            fetchEmailStatus();
            fetchEmails();
            if (onRefresh) onRefresh();
          }}
        />
      </>
    </AnimatePresence>
  );
};

export default JobSidebar;
