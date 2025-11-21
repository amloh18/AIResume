'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Plus, Search, Filter, MoreVertical,
  Calendar, MapPin, DollarSign, Eye, Edit, Trash2,
  CheckCircle, Clock, AlertCircle, Target, FileText,
  ArrowRight, ChevronDown, ChevronUp, Star, Zap,
  TrendingUp, Users, Building2, Globe, Bookmark,
  Archive, Copy, Share2, Download, Upload, X, Mail, Linkedin
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { authenticatedFetch, authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { useFocusMode } from '@/lib/hooks/useFocusMode';
import PageHeader from './PageHeader';
import JobSidebar from './jobs/JobSidebar';
import EditJobSidebar from './jobs/EditJobSidebar';
import JourneyTimelineCard from './JourneyTimelineCard';
import FocusModeToggle from './jobs/FocusModeToggle';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import toast from 'react-hot-toast';
import { useOptimizedDataFetching } from '@/lib/hooks/useOptimizedDataFetching';
import { ApplicationTrackerSkeleton } from '@/components/ui/OptimizedSkeletons';
import { formatCardTime } from '@/lib/utils/timeUtils';
import { CVJourney } from '@/types/cv';
import JobCreationPaywall from '@/components/payment/JobCreationPaywall';

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
  sourceUrl?: string;
  postedDate?: Date;
  applicationDate?: Date;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  sponsorship?: 'yes' | 'no' | 'unknown';
  tags?: string[];
  contactDetails?: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  interviews?: any[];
  followUps?: any[];
  attachments?: any[];
  atsScore?: number;
  atsAnalysis?: any;
  statusHistory?: any[];
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}



const ApplicationTracker: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData, loading: userLoading, error: userError } = useUserData();
  const searchParams = useSearchParams();
  const cvId = searchParams.get('cvId'); // Get CV ID from URL params

  // Add CSS for animated dotted border
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'drag-drop-animation-styles';
    style.textContent = `
      @keyframes dashMove {
        0% {
          background-position: 0 0;
        }
        100% {
          background-position: 16px 16px;
        }
      }
      .animated-dotted-border {
        position: relative;
        background-image: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 7px,
          rgba(147, 197, 253, 0.2) 7px,
          rgba(147, 197, 253, 0.2) 8px
        );
        background-size: 16px 16px;
        animation: dashMove 1s linear infinite;
        min-height: 100vh;
      }
      .dark .animated-dotted-border {
        background-image: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 7px,
          rgba(60, 75, 60, 0.3) 7px,
          rgba(60, 75, 60, 0.3) 8px
        );
      }
      .animated-dotted-border::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 0.75rem;
        border: 2px dashed rgb(147, 197, 253);
        pointer-events: none;
        min-height: 100vh;
      }
      .dark .animated-dotted-border::after {
        border-color: rgb(60, 75, 60);
      }
    `;
    if (!document.getElementById('drag-drop-animation-styles')) {
      document.head.appendChild(style);
    }
    return () => {
      const existingStyle = document.getElementById('drag-drop-animation-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);
  
  // Get user ID for data fetching using unified authentication
  const userId = getUserIdForAPI(user);
  
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [journeys, setJourneys] = useState<CVJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isLoadingViewMode, setIsLoadingViewMode] = useState(true);
  const [sortBy, setSortBy] = useState<'lastUpdated' | 'followUpDate' | 'salaryRange' | 'priority'>('lastUpdated');
  const [lastUpdatedFilter, setLastUpdatedFilter] = useState<'today' | 'last7days' | 'last30days' | 'all'>('all');
  const [followUpFilter, setFollowUpFilter] = useState<'upcoming' | 'overdue' | 'all'>('all');
  const [salaryRangeFilter, setSalaryRangeFilter] = useState<'all' | 'under50k' | '50k-75k' | '75k-100k' | '100k-150k' | '150k-200k' | 'over200k'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'high' | 'medium' | 'low' | 'all'>('all');
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [draggedJob, setDraggedJob] = useState<string | null>(null);
  const [showJourneyTemplates, setShowJourneyTemplates] = useState(false);
  const [cvContext, setCvContext] = useState<any>(null); // Store CV context when navigating from CV card
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [creditInfo, setCreditInfo] = useState<{ creditsRemaining: number; limit: number; resetTime?: Date } | null>(null);
  const [zoomedStage, setZoomedStage] = useState<string | null>(null);
  const [emailSentStatus, setEmailSentStatus] = useState<Record<string, Record<number, boolean>>>({});
  const [isUpdatingJobStatus, setIsUpdatingJobStatus] = useState<Set<string>>(new Set());

  // Focus mode
  const { isFocusMode, toggleFocusMode } = useFocusMode();

  // Reset zoomed stage if it's filtered out by focus mode
  useEffect(() => {
    if (isFocusMode && zoomedStage && (zoomedStage === 'draft' || zoomedStage === 'rejected')) {
      setZoomedStage(null);
    }
  }, [isFocusMode, zoomedStage]);

  // Check for paywall trigger from URL (e.g., from extension)
  useEffect(() => {
    const showPaywallParam = searchParams.get('showPaywall');
    const creditsRemainingParam = searchParams.get('creditsRemaining');
    const limitParam = searchParams.get('limit');
    
    if (showPaywallParam === 'true') {
      const creditsRemaining = creditsRemainingParam ? parseInt(creditsRemainingParam, 10) : 0;
      const limit = limitParam ? parseInt(limitParam, 10) : 1;
      
      setCreditInfo({
        creditsRemaining,
        limit
      });
      setShowPaywall(true);
      
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('showPaywall');
      url.searchParams.delete('creditsRemaining');
      url.searchParams.delete('limit');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Load data on component mount
  useEffect(() => {
    if (userId) {
      loadData();
      loadViewModePreference();
    }
  }, [userId]);

  // Handle URL parameters for add job action
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add-job') {
      setShowAddJobModal(true);
      // Clean up URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const loadViewModePreference = async () => {
    try {
      const response = await authenticatedFetch('/api/user/settings');
      const result = await response.json();
      
      if (result.success && result.data?.settings?.preferences?.dashboard?.layout) {
        const savedLayout = result.data.settings.preferences.dashboard.layout;
        // Map dashboard layout to our view modes
        if (savedLayout === 'list') {
          setViewMode('list');
        } else {
          setViewMode('kanban'); // Default to kanban for 'grid' or 'compact'
        }
      }
    } catch (error) {
      console.error('Error loading view mode preference:', error);
      // Keep default 'kanban' view mode
    } finally {
      setIsLoadingViewMode(false);
    }
  };

  // Load CV context if cvId is provided
  useEffect(() => {
    if (cvId && userId) {
      loadCVContext(cvId);
    }
  }, [cvId, userId]);

  const loadCVContext = async (cvId: string) => {
    try {
      const response = await authenticatedFetch(`/api/cv/${cvId}`);
      const result = await response.json();
      if (result.success) {
        setCvContext(result.data);
      }
    } catch (error) {
      console.error('Error loading CV context:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load jobs
      const jobsResponse = await authenticatedFetchWithUserId('/api/jobs', userId || undefined);
      const jobsResult = await jobsResponse.json();
      if (jobsResult.success) {
        // Transform jobs to match our interface - include ALL fields
        const transformedJobs = jobsResult.data.jobs.map((job: any) => {
          // Preserve optimistic updates for jobs that are currently being updated
          const existingJob = jobs.find(j => j.id === job.id);
          const isBeingUpdated = isUpdatingJobStatus.has(job.id);
          
          return {
          id: job.id,
          _id: job.id,
          userId: job.userId,
          jobTitle: job.jobTitle,
          title: job.jobTitle, // For compatibility
          company: job.company,
            // Preserve optimistic status if job is being updated
            status: (isBeingUpdated && existingJob) ? existingJob.status : job.status,
          jobDescription: job.jobDescription,
          description: job.jobDescription, // For compatibility
          location: job.location,
          jobUrl: job.jobUrl,
          salary: job.salary,
          jobType: job.type,
          type: job.type, // For compatibility
          source: job.source,
          sourceUrl: job.sourceUrl,
          postedDate: job.postedDate,
          applicationDate: job.applicationDate,
          deadline: job.deadline,
          priority: job.priority || 'medium',
          notes: job.notes,
          sponsorship: job.sponsorship,
          tags: job.tags || [],
          contactDetails: job.contactDetails || { name: '', email: '', phone: '', role: '' },
          interviews: job.interviews || [],
          followUps: job.followUps || [],
          attachments: job.attachments || [],
          atsScore: job.atsScore,
          isArchived: job.isArchived || false,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
          };
        });
        setJobs(transformedJobs);
      }

      // Load CV journeys using cv-journey API with cleanup
      const journeysResponse = await authenticatedFetchWithUserId('/api/application-journey', userId || undefined, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const journeysResult = await journeysResponse.json();
      if (journeysResult.success) {
        const loadedJourneys = journeysResult.data.journeys || [];
        setJourneys(loadedJourneys);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get journeys for a specific job
  const getJobJourneys = (jobId: string) => {
    return journeys.filter(journey => journey.jobId === jobId);
  };

  // Calculate journey progress
  const getJourneyProgress = (journey: CVJourney) => {
    // If journey is completed, return 100%
    if (journey.status === 'completed') {
      return 100;
    }

    // For in-progress journeys, calculate based on current step and completed steps
    if (journey.steps && journey.steps.length > 0) {
      const completedSteps = journey.steps.filter(step => step.status === 'completed').length;
      const totalSteps = journey.steps.length;

      // If we have a currentStep, use it for more accurate progress
      if (journey.currentStep && journey.currentStep > 0) {
        // Calculate progress based on current step (more accurate)
        const stepProgress = (journey.currentStep - 1) / totalSteps * 100;
        const completedProgress = (completedSteps / totalSteps) * 100;

        // Return the higher of the two for better accuracy
        return Math.round(Math.max(stepProgress, completedProgress));
      }

      // Fallback to completed steps calculation
      return Math.round((completedSteps / totalSteps) * 100);
    }

    // If no steps data, use currentStep if available
    if (journey.currentStep && journey.currentStep > 0) {
      const totalSteps = journey.totalSteps || 5;
      return Math.round(((journey.currentStep - 1) / totalSteps) * 100);
    }

    return 0;
  };

  // Get journey status text
  const getJourneyStatusText = (jobJourneys: CVJourney[], jobStatus?: string) => {
    if (jobJourneys.length === 0) return 'No CV Journeys Started';
    if (jobJourneys.length === 1) {
      const journey = jobJourneys[0];
      if (journey.status === 'completed') {
        // Don't show "Ready to Apply" for Applied/Interview/Offer/Rejected stages
        if (['applied', 'interview', 'offer', 'rejected'].includes(jobStatus || '')) {
          return '1 CV Journey Completed';
        }
        return '1 Ready to Apply';
      }
      return '1 CV Journey Active';
    }
    const completedCount = jobJourneys.filter(j => j.status === 'completed').length;
    const activeCount = jobJourneys.filter(j => j.status === 'in-progress').length;

    if (completedCount > 0 && activeCount > 0) {
      return `${completedCount} Ready, ${activeCount} Active`;
    } else if (completedCount > 0) {
      // Don't show "Ready to Apply" for Applied/Interview/Offer/Rejected stages
      if (['applied', 'interview', 'offer', 'rejected'].includes(jobStatus || '')) {
        return `${completedCount} CV Journeys Completed`;
      }
      return `${completedCount} Ready to Apply`;
    } else {
      return `${activeCount} CV Journeys Active`;
    }
  };

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

  // Get email subject
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
      default:
        return 'Follow-up';
    }
  };

  // Get user name from userData
  const getUserName = () => {
    if (userData?.name) {
      return userData.name;
    }
    if (user?.name) {
      return user.name;
    }
    return '[Your Name]';
  };

  // Get user email
  const getUserEmailAddress = () => {
    if (userData?.email) {
      return userData.email;
    }
    if (user?.email) {
      return user.email;
    }
    return '';
  };

  // Get contact name
  const getContactName = (job: JobApplication) => {
    if (job.contactDetails?.name) {
      return job.contactDetails.name;
    }
    return '[Hiring Manager]';
  };

  // Get interviewer name
  const getInterviewerName = (job: JobApplication) => {
    if (job.contactDetails?.name) {
      return job.contactDetails.name;
    }
    if (job.contactDetails?.role) {
      return job.contactDetails.role;
    }
    return '[Interviewer Name]';
  };

  // Get email template
  const getEmailTemplate = (job: JobApplication) => {
    const userName = getUserName();
    const contactName = getContactName(job);
    const interviewerName = getInterviewerName(job);
    
    const templates = {
      applied: `Dear ${contactName},

I hope this email finds you well. I recently applied for the ${job.jobTitle} position at ${job.company} and wanted to follow up on the status of my application.

I remain very interested in this opportunity and believe my skills and experience would be a great fit for your team. I would welcome the chance to discuss how I can contribute to ${job.company}.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
${userName}`,
      interview: `Dear ${interviewerName},

Thank you for taking the time to interview me for the ${job.jobTitle} position at ${job.company}. I enjoyed our conversation and learning more about the role and your team.

I'm very excited about the opportunity to contribute to ${job.company} and believe my skills align well with the position's requirements. 

I wanted to follow up to see if there are any updates on next steps in the hiring process. Please let me know if you need any additional information from me.

Thank you again for your consideration.

Best regards,
${userName}`
    };
    return templates[job.status as keyof typeof templates] || '';
  };

  // Get follow-up timeline
  const getFollowUpTimeline = (job: JobApplication) => {
    const timelines = {
      applied: [
        { day: 'Right after application', action: 'Connect with hiring manager on LinkedIn & send DM and email' },
        { day: 'Day 3-5', action: 'Send initial follow-up email' },
        { day: 'Day 14', action: 'Send second follow-up if no response' }
      ],
      interview: [
        { day: 'Within 24 hours', action: 'Send thank-you email' },
        { day: 'Day 5-7', action: 'Follow up on timeline if not provided' },
        { day: 'Day 14', action: 'Send polite status inquiry if no update' }
      ]
    };
    return timelines[job.status as keyof typeof timelines] || [];
  };

  // Create mailto link
  const getMailtoLink = (job: JobApplication) => {
    const recipientEmail = job.contactDetails?.email || '';
    const subject = encodeURIComponent(getEmailSubject(job));
    const body = encodeURIComponent(getEmailTemplate(job));
    
    if (recipientEmail) {
      return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    }
    return `mailto:?subject=${subject}&body=${body}`;
  };

  // Handle opening email client
  const handleOpenEmail = (job: JobApplication, timelineIndex: number) => {
    const mailtoLink = getMailtoLink(job);
    if (mailtoLink) {
      window.location.href = mailtoLink;
      
      setTimeout(() => {
        setEmailSentStatus(prev => ({
          ...prev,
          [job.id]: {
            ...(prev[job.id] || {}),
            [timelineIndex]: true
          }
        }));
        toast.success('Email opened! Mark as sent if you\'ve sent it.');
      }, 500);
    } else {
      toast.error('Unable to create email. Please check your email settings.');
    }
  };

  // Enhanced filtering and sorting with Application-Specific Metrics
  const filteredAndSortedJobs = React.useMemo(() => {
    let filtered = jobs.filter(job => {
      const matchesSearch = job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job.location?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
      
      // Application-Specific Metrics Filters
      const matchesLastUpdated = (() => {
        if (lastUpdatedFilter === 'all') return true;
        const now = new Date();
        const jobUpdated = new Date(job.updatedAt);
        const daysDiff = Math.floor((now.getTime() - jobUpdated.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (lastUpdatedFilter) {
          case 'today': return daysDiff === 0;
          case 'last7days': return daysDiff <= 7;
          case 'last30days': return daysDiff <= 30;
          default: return true;
        }
      })();
      
      const matchesFollowUp = (() => {
        if (followUpFilter === 'all') return true;
        // For now, we'll use applicationDate as a proxy for follow-up date
        // In a real implementation, you'd have a dedicated followUpDate field
        const followUpDate = job.applicationDate ? new Date(job.applicationDate) : new Date(job.createdAt);
        const now = new Date();
        const daysDiff = Math.floor((followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (followUpFilter) {
          case 'upcoming': return daysDiff > 0 && daysDiff <= 7;
          case 'overdue': return daysDiff < 0;
          default: return true;
        }
      })();
      
      const matchesSalaryRange = (() => {
        if (salaryRangeFilter === 'all' || !job.salary) return true;
        
        const jobMin = job.salary.min || 0;
        const jobMax = job.salary.max || jobMin;
        const jobAvg = (jobMin + jobMax) / 2;
        
        switch (salaryRangeFilter) {
          case 'under50k': return jobAvg < 50000;
          case '50k-75k': return jobAvg >= 50000 && jobAvg < 75000;
          case '75k-100k': return jobAvg >= 75000 && jobAvg < 100000;
          case '100k-150k': return jobAvg >= 100000 && jobAvg < 150000;
          case '150k-200k': return jobAvg >= 150000 && jobAvg < 200000;
          case 'over200k': return jobAvg >= 200000;
          default: return true;
        }
      })();
      
      const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesLastUpdated && matchesFollowUp && matchesSalaryRange && matchesPriority;
    });

    // Sort jobs by Application-Specific Metrics
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'lastUpdated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'followUpDate':
          const aFollowUp = a.applicationDate ? new Date(a.applicationDate) : new Date(a.createdAt);
          const bFollowUp = b.applicationDate ? new Date(b.applicationDate) : new Date(b.createdAt);
          return aFollowUp.getTime() - bFollowUp.getTime();
        case 'salaryRange':
          const aSalary = a.salary?.max || a.salary?.min || 0;
          const bSalary = b.salary?.max || b.salary?.min || 0;
          return bSalary - aSalary;
        case 'priority':
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [jobs, searchQuery, filterStatus, sortBy, lastUpdatedFilter, followUpFilter, salaryRangeFilter, priorityFilter]);

  // Apply focus mode filter (hide draft and rejected stages)
  const filteredJobsForView = React.useMemo(() => {
    if (isFocusMode) {
      return filteredAndSortedJobs.filter(job =>
        job.status !== 'draft' && job.status !== 'rejected'
      );
    }
    return filteredAndSortedJobs;
  }, [filteredAndSortedJobs, isFocusMode]);

  // Group jobs by status - memoized to ensure reactivity
  const jobsByStatus = React.useMemo(() => ({
    draft: filteredJobsForView.filter(job => job.status === 'draft'),
    created: filteredJobsForView.filter(job => job.status === 'created'),
    applied: filteredJobsForView.filter(job => job.status === 'applied'),
    interview: filteredJobsForView.filter(job => job.status === 'interview'),
    offer: filteredJobsForView.filter(job => job.status === 'offer'),
    rejected: filteredJobsForView.filter(job => job.status === 'rejected')
  }), [filteredJobsForView]);

  // Memoize stages array based on focus mode
  const stages = React.useMemo(() => {
    const allStages = [
      { status: 'draft', title: 'Draft', color: 'bg-gray-100 dark:bg-gray-500/20 border-gray-300 dark:border-gray-500/30 text-gray-600 dark:text-white' },
      { status: 'created', title: 'Created', color: 'bg-purple-100 dark:bg-purple-500/20 border-purple-300 dark:border-purple-500/30 text-purple-600 dark:text-white' },
      { status: 'applied', title: 'Applied', color: 'bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/30 text-blue-600 dark:text-white' },
      { status: 'interview', title: 'Interview', color: 'bg-orange-100 dark:bg-orange-500/20 border-orange-300 dark:border-orange-500/30 text-orange-600 dark:text-white' },
      { status: 'offer', title: 'Offer', color: 'bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/30 text-green-600 dark:text-white' },
      { status: 'rejected', title: 'Rejected', color: 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/30 text-red-600 dark:text-white' }
    ];
    // Filter stages based on focus mode
    return isFocusMode
      ? allStages.filter(stage => stage.status !== 'draft' && stage.status !== 'rejected')
      : allStages;
  }, [isFocusMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
      
      // Escape to close modal
      if (e.key === 'Escape' && showModal) {
        handleCloseModal();
      }
      
      // Ctrl/Cmd + A to select all visible jobs
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !showModal) {
        e.preventDefault();
        const visibleJobIds = filteredJobsForView.map(job => job.id);
        setSelectedJobs(new Set(visibleJobIds));
        setShowBulkActions(visibleJobIds.length > 0);
      }

      // Shift + F to toggle focus mode
      if (e.shiftKey && e.key === 'F' && !showModal && !showAddJobModal) {
        e.preventDefault();
        toggleFocusMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, filteredJobsForView, showAddJobModal, toggleFocusMode]);

  const handleJobClick = (job: JobApplication) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedJob(null);
  };

  const handleAddJob = () => {
    setEditingJob(null);
    setShowAddJobModal(true);
  };

  const handleJobSaved = (job: any) => {
    setShowAddJobModal(false);
    setEditingJob(null);
    // Refresh the jobs list
    loadData();
    toast.success(editingJob ? 'Job updated successfully!' : 'Job added successfully!');
  };

  const handleEditJob = (job: JobApplication) => {
    // Map JobApplication to Job interface for the modal - include ALL fields
    const jobForModal = {
      id: job.id,
      jobTitle: job.jobTitle || job.title,
      company: job.company,
      location: job.location,
      jobUrl: job.jobUrl,
      jobDescription: job.jobDescription || job.description,
      notes: job.notes,
      priority: job.priority,
      status: job.status,
      deadline: job.deadline ? (typeof job.deadline === 'string' ? job.deadline : new Date(job.deadline).toISOString().split('T')[0]) : '',
      applicationDate: job.applicationDate ? (typeof job.applicationDate === 'string' ? job.applicationDate : new Date(job.applicationDate).toISOString().split('T')[0]) : '',
      salary: job.salary,
      sponsorship: job.sponsorship,
      tags: job.tags || [],
      contactDetails: job.contactDetails || { name: '', email: '', phone: '', role: '' },
      interviews: job.interviews || [],
      followUps: job.followUps || [],
      attachments: job.attachments || [],
      source: job.source,
      sourceUrl: job.sourceUrl,
      atsScore: job.atsScore,
      atsAnalysis: job.atsAnalysis,
      statusHistory: job.statusHistory || [],
      isArchived: job.isArchived || false
    };
    setEditingJob(jobForModal as any);
    setShowAddJobModal(true);
  };

  const handleViewModeChange = async (mode: 'kanban' | 'list') => {
    setViewMode(mode);
    
    try {
      // Map our view modes to dashboard layout values
      const layoutValue = mode === 'list' ? 'list' : 'grid';
      
      const response = await authenticatedFetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            preferences: {
              dashboard: {
                layout: layoutValue
              }
            }
          }
        })
      });
      
      const result = await response.json();
      if (!result.success) {
        console.error('Error saving view mode preference:', result.message);
      }
    } catch (error) {
      console.error('Error saving view mode preference:', error);
    }
  };

  // Helper function to check if a stage allows drag operations
  const isDraggableStage = (stage: string) => {
    // Allow dropping on all stages except draft (can move forward from draft)
    // Allow moving from draft to created, applied, interview, offer, rejected
    return stage !== 'draft';
  };

  // Helper function to check if a job can be dragged
  const isJobDraggable = (job: JobApplication) => {
    // Allow dragging all jobs, including draft jobs
    return true;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || !isJobDraggable(job)) {
      e.preventDefault();
      return;
    }
    setDraggedJob(jobId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Clear dragged job state immediately when drag ends
    setDraggedJob(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const currentDraggedJob = draggedJob;
    
    // Clear dragged job state immediately when drop occurs
    setDraggedJob(null);
    
    if (!currentDraggedJob) return;

    // Validate that target stage allows drops
    if (!isDraggableStage(newStatus)) {
      return;
    }

    const job = jobs.find(j => j.id === currentDraggedJob);
    if (!job || !isJobDraggable(job)) {
      return;
    }

    // Store original status for potential rollback
    const originalStatus = job.status;

    // Mark job as being updated to prevent data refresh from overwriting
    setIsUpdatingJobStatus(prev => new Set(prev).add(currentDraggedJob));

    // Optimistic update: Update UI immediately for instant feedback
    setJobs(prevJobs => 
      prevJobs.map(j => 
        j.id === currentDraggedJob ? { ...j, status: newStatus as any } : j
      )
    );

    // Update in background with proper error handling
    authenticatedFetchWithUserId(`/api/jobs/${currentDraggedJob}`, userId || undefined, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(async response => {
        // Check both response status and body
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to update job status:', response.status, errorData);
          // Revert on failure
          setJobs(prevJobs => 
            prevJobs.map(j => 
              j.id === currentDraggedJob ? { ...j, status: originalStatus } : j
            )
          );
          toast.error('Failed to update job status. Please try again.');
          setIsUpdatingJobStatus(prev => {
            const next = new Set(prev);
            next.delete(currentDraggedJob);
            return next;
          });
          return;
        }

        // Parse response to check for success
        try {
          const result = await response.json();
          if (result.error || (result.success === false)) {
            console.error('API returned error:', result);
            // Revert on failure
            setJobs(prevJobs => 
              prevJobs.map(j => 
                j.id === currentDraggedJob ? { ...j, status: originalStatus } : j
              )
            );
            toast.error(result.message || 'Failed to update job status. Please try again.');
            setIsUpdatingJobStatus(prev => {
              const next = new Set(prev);
              next.delete(currentDraggedJob);
              return next;
            });
            return;
          }
          // Success - update with server response to ensure consistency
          console.log('✅ Job status updated successfully:', newStatus);
          if (result.job || result.data) {
            const updatedJob = result.job || result.data;
            setJobs(prevJobs => 
              prevJobs.map(j => 
                j.id === currentDraggedJob 
                  ? { ...j, status: updatedJob.status || newStatus, updatedAt: updatedJob.updatedAt || new Date().toISOString() }
                  : j
              )
            );
          }
          // Remove from updating set after a short delay to allow any pending updates to complete
          setTimeout(() => {
            setIsUpdatingJobStatus(prev => {
              const next = new Set(prev);
              next.delete(currentDraggedJob);
              return next;
            });
          }, 2000);
        } catch (parseError) {
          // If response is ok but we can't parse JSON, assume success
          console.log('✅ Job status updated (response ok, JSON parse skipped)');
          setTimeout(() => {
            setIsUpdatingJobStatus(prev => {
              const next = new Set(prev);
              next.delete(currentDraggedJob);
              return next;
            });
          }, 1000);
        }
      })
      .catch(error => {
        console.error('Error updating job status:', error);
        // Revert on error
        setJobs(prevJobs => 
          prevJobs.map(j => 
            j.id === currentDraggedJob ? { ...j, status: originalStatus } : j
          )
        );
        toast.error('Failed to update job status. Please try again.');
        setIsUpdatingJobStatus(prev => {
          const next = new Set(prev);
          next.delete(currentDraggedJob);
          return next;
        });
      });
  };

  // Stage zoom handlers
  const handleStageClick = (stageStatus: string) => {
    if (zoomedStage === stageStatus) {
      setZoomedStage(null);
    } else {
      setZoomedStage(stageStatus);
    }
  };

  // Bulk action handlers
  const handleSelectJob = (jobId: string) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      setShowBulkActions(newSet.size > 0);
      return newSet;
    });
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      const promises = Array.from(selectedJobs).map(jobId =>
        authenticatedFetchWithUserId(`/api/jobs/${jobId}`, userId || undefined, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        })
      );

      await Promise.all(promises);
      
      // Update local state
      setJobs(prevJobs => 
        prevJobs.map(job => 
          selectedJobs.has(job.id) ? { ...job, status: newStatus as any } : job
        )
      );
      
      setSelectedJobs(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error updating bulk job status:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedJobs.size} jobs?`)) return;

    try {
      const promises = Array.from(selectedJobs).map(jobId =>
        authenticatedFetchWithUserId(`/api/jobs/${jobId}`, userId || undefined, {
          method: 'DELETE',
        })
      );

      await Promise.all(promises);
      
      // Update local state
      setJobs(prevJobs => prevJobs.filter(job => !selectedJobs.has(job.id)));
      
      setSelectedJobs(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error deleting jobs:', error);
    }
  };

  return (
    <React.Fragment>
    <div className="h-full flex flex-col min-w-0">
      <div className="w-full h-full flex flex-col min-w-0">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-6 pb-4 pt-6 min-w-0">
        {/* Page Header - Always show immediately */}
        <div className="min-w-0 w-full">
          <PageHeader
            title="Application Tracker"
            description="Manage your job applications with integrated CV journeys"
            user={{
              name: getUserDisplayName(userData),
              email: getUserEmail(userData),
              username: userData?.username || '',
              profilePhoto: getUserAvatar(userData),
              designation: userData?.role || '',
              subscription: userData?.subscription
            }}
            showSettings={true}
            onMobileMenuToggle={toggleSidebar}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        </div>

        {/* CV Context Banner */}
        {cvContext && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full p-4 min-w-0"
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                    Working with CV: {cvContext.title}
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 truncate">
                    Create or continue application journeys for this CV
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCvContext(null);
                  window.history.replaceState({}, '', '/dashboard/application-tracker');
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium flex-shrink-0 whitespace-nowrap"
              >
                Clear Context
              </button>
            </div>
          </motion.div>
        )}

        {/* Enhanced Action Bar */}
        <div className="space-y-4 min-w-0">
          {/* Top Row */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-start lg:items-center justify-between min-w-0">
            <div className="flex flex-row items-center gap-2 w-full lg:w-auto lg:flex-1 min-w-0 flex-wrap sm:flex-nowrap">
            <motion.button
              onClick={handleAddJob}
              className="px-3 sm:px-4 py-2 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg flex-shrink-0 h-[36px]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Job</span>
            </motion.button>
            
            {/* Focus Mode Toggle */}
            <FocusModeToggle />
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 rounded-lg p-0.5 flex-shrink-0 h-[36px]">
              <motion.button
                onClick={() => handleViewModeChange('kanban')}
                disabled={isLoadingViewMode}
                className={`px-3 sm:px-4 h-full rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                  viewMode === 'kanban' 
                    ? 'bg-gray-200 dark:bg-[#2a3a1f] text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:text-white/80'
                } ${isLoadingViewMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                whileHover={isLoadingViewMode ? {} : { scale: 1.02 }}
                whileTap={isLoadingViewMode ? {} : { scale: 0.98 }}
              >
                Kanban
              </motion.button>
              <motion.button
                onClick={() => handleViewModeChange('list')}
                disabled={isLoadingViewMode}
                className={`px-3 sm:px-4 h-full rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                  viewMode === 'list' 
                    ? 'bg-gray-200 dark:bg-[#2a3a1f] text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:text-white/80'
                } ${isLoadingViewMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                whileHover={isLoadingViewMode ? {} : { scale: 1.02 }}
                whileTap={isLoadingViewMode ? {} : { scale: 0.98 }}
              >
                List
              </motion.button>
            </div>

              {/* Consolidated Sort Button */}
              <motion.button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#2a3a1f] transition-all duration-200 flex items-center gap-2 flex-shrink-0 h-[36px] min-w-0"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Filter size={16} className="flex-shrink-0" />
                <span className="hidden sm:inline truncate">Sort & Filter</span>
                <ChevronDown size={16} className="hidden sm:block flex-shrink-0" />
              </motion.button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {showBulkActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-blue-600 dark:bg-blue-500/10 backdrop-blur-md border border-blue-700 dark:border-blue-500/20 rounded-full p-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-400">
                    {selectedJobs.size} job{selectedJobs.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => {
                      setSelectedJobs(new Set());
                      setShowBulkActions(false);
                    }}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                    className="px-3 py-1 border border-gray-300 dark:border-lime-500/20 rounded-full bg-gray-100 dark:bg-[#232f1c] text-gray-900 dark:text-white text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>Update Status</option>
                    <option value="draft">Draft</option>
                    <option value="created">Created</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <motion.button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-medium transition-colors flex items-center gap-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Scrollable Kanban Board Container */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto pb-6 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div 
            key={zoomedStage || 'all-stages'}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={`h-full ${
              viewMode === 'kanban' 
                ? zoomedStage 
                  ? 'grid grid-cols-1 gap-4 auto-rows-max overflow-auto w-full' 
                  : 'w-full min-w-0'
                : 'grid grid-cols-1 gap-4 auto-rows-max overflow-auto w-full'
            }`}
          >
          {viewMode === 'kanban' ? (
            zoomedStage ? (
              // Zoomed stage - single column (only show if not filtered by focus mode)
              (() => {
                // Don't show zoomed stage if it's filtered out by focus mode
                if (isFocusMode && (zoomedStage === 'draft' || zoomedStage === 'rejected')) {
                  return null;
                }
                const stage = { 
                  status: zoomedStage, 
                  title: zoomedStage.charAt(0).toUpperCase() + zoomedStage.slice(1), 
                  color: 
                  zoomedStage === 'draft' ? 'bg-gray-600 dark:bg-gray-500/20 border-gray-700 dark:border-gray-500/30 text-white' :
                  zoomedStage === 'created' ? 'bg-purple-600 dark:bg-purple-500/20 border-purple-700 dark:border-purple-500/30 text-white' :
                  zoomedStage === 'applied' ? 'bg-blue-600 dark:bg-blue-500/20 border-blue-700 dark:border-blue-500/30 text-white' :
                  zoomedStage === 'interview' ? 'bg-orange-600 dark:bg-orange-500/20 border-orange-700 dark:border-orange-500/30 text-white' :
                  zoomedStage === 'offer' ? 'bg-green-600 dark:bg-green-500/20 border-green-700 dark:border-green-500/30 text-white' :
                  'bg-red-600 dark:bg-red-500/20 border-red-700 dark:border-red-500/30 text-white'
                };
                return (
                <div key={stage.status} className="space-y-4">
                  {/* Zoomed stage - will use same rendering as regular stages */}
                  <div className={`p-3 rounded-xl border-2 border-solid ${stage.color} min-h-[60px] flex items-center justify-center`}>
                    <h3 className="text-base font-bold">{stage.title}</h3>
                  </div>
                </div>
                );
              })()
            ) : (
              // All stages - horizontal scrollable
              <div className="flex flex-row gap-4 h-full pb-4 pl-0 sm:pl-2 pr-0 sm:pr-4" style={{ width: 'max-content' }}>
                {stages.map((stage) => (
              <div key={stage.status} className={`space-y-4 w-[320px] flex-shrink-0`}>
            {/* Stage Header */}
            <div 
              className={`p-3 rounded-xl border-2 border-solid ${stage.color} min-h-[60px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-200`}
              onClick={() => handleStageClick(stage.status)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {zoomedStage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedStage(null);
                      }}
                      className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                  )}
                  <h3 className={`text-base font-bold ${
                    stage.status === 'draft' ? 'text-gray-800 dark:text-gray-400' :
                    stage.status === 'created' ? 'text-purple-800 dark:text-purple-400' :
                    stage.status === 'applied' ? 'text-blue-800 dark:text-blue-400' :
                    stage.status === 'interview' ? 'text-orange-800 dark:text-orange-400' :
                    stage.status === 'offer' ? 'text-green-800 dark:text-green-400' :
                    'text-red-800 dark:text-red-400'
                  }`}>{stage.title}</h3>
                </div>
                <span className={`text-sm ${
                  stage.status === 'draft' ? 'text-gray-800 dark:text-gray-400' :
                  stage.status === 'created' ? 'text-purple-800 dark:text-purple-400' :
                  stage.status === 'applied' ? 'text-blue-800 dark:text-blue-400' :
                  stage.status === 'interview' ? 'text-orange-800 dark:text-orange-400' :
                  stage.status === 'offer' ? 'text-green-800 dark:text-green-400' :
                  'text-red-800 dark:text-red-400'
                }`}>
                  {jobsByStatus[stage.status as keyof typeof jobsByStatus].length}
                </span>
              </div>
            </div>

            {/* Follow-up Section - Show when stage is zoomed for applied or interview */}
            {zoomedStage && (stage.status === 'applied' || stage.status === 'interview') && jobsByStatus[stage.status as keyof typeof jobsByStatus].length > 0 && (
              <div className="mb-6 bg-gray-50 dark:bg-[#232f1c] border border-gray-200 dark:border-lime-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Mail size={18} className="text-lime-600 dark:text-[#80FF00]" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Follow-up & Templates</h3>
                </div>
                
                <div className="space-y-4">
                  {jobsByStatus[stage.status as keyof typeof jobsByStatus].map((job) => {
                    const timeline = getFollowUpTimeline(job);
                    if (timeline.length === 0) return null;
                    
                    return (
                      <div key={job.id} className="bg-white dark:bg-[#1A201A] border border-gray-200 dark:border-lime-500/30 rounded-lg p-4">
                        <div className="mb-3">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{job.jobTitle}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{job.company}</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          {timeline.map((item, index) => {
                            const isEmailSent = emailSentStatus[job.id]?.[index] === true;
                            return (
                              <div
                                key={index}
                                className={`flex-1 rounded-lg p-4 border shadow-sm transition-colors ${
                                  isEmailSent
                                    ? 'bg-lime-50 dark:bg-lime-500/10 border-lime-300 dark:border-lime-500/50'
                                    : 'bg-gray-50 dark:bg-[#232f1c] border-lime-200 dark:border-lime-500/30'
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
                                      {item.day}
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                      {item.action}
                                    </div>
                                  </div>
                                </div>
                                {getEmailTemplate(job) && (
                                  <motion.button
                                    onClick={() => handleOpenEmail(job, index)}
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drop Zone */}
            <div 
              className={`w-full rounded-xl border-2 border-dashed transition-all duration-300 ${
                draggedJob 
                  ? isDraggableStage(stage.status)
                    ? `border-blue-300 dark:border-[rgb(60,75,60)] bg-blue-50/50 dark:bg-[rgb(60,75,60)]/20 animated-dotted-border min-h-[100vh]`
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 opacity-50 min-h-[100px]'
                  : 'border-transparent min-h-[100px]'
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.status)}
            >
              {/* Job Cards or Journey Cards for Created Stage */}
              <div className={zoomedStage && stage.status === 'created' ? "space-y-4" : zoomedStage ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
              {loading ? (
                // Show skeleton loading for job cards
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-[#141810] rounded-xl p-4 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                      <div className="space-y-2">
                        <div className="h-4 bg-white/20 rounded w-32"></div>
                        <div className="h-3 bg-white/10 rounded w-24"></div>
                      </div>
                      <div className="h-6 bg-white/20 rounded w-16"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-white/10 rounded w-full"></div>
                      <div className="h-3 bg-white/10 rounded w-3/4"></div>
                    </div>
                  </div>
                ))
              ) : (stage.status === 'draft' || stage.status === 'created') && zoomedStage ? (
                // Show journey cards for created stage when zoomed
                jobsByStatus[stage.status as keyof typeof jobsByStatus].map((job) => {
                  const jobJourneys = getJobJourneys(job.id);
                  return jobJourneys
                    .filter(journey => journey.id) // Filter out journeys without valid IDs
                    .map((journey, index) => (
                    <JourneyTimelineCard
                      key={`${job.id}-${journey.id || `journey-${index}`}`}
                      journey={journey}
                      onResume={(journeyId) => {
                        // Handle resume journey
                        console.log('Resume journey:', journeyId);
                      }}
                      onDownload={(type) => {
                        // Handle download
                        console.log('Download:', type);
                      }}
                      onDelete={(journeyId) => {
                        // Handle delete journey
                        console.log('Delete journey:', journeyId);
                      }}
                      onRefresh={() => {
                        // Handle refresh
                        loadData();
                      }}
                      onUpdateJourney={(journeyId, updates) => {
                        // Handle journey update
                        console.log('Update journey:', journeyId, updates);
                        // Update local state
                        setJourneys(prev => prev.map(j => 
                          j.id === journeyId ? { ...j, ...updates } : j
                        ));
                      }}
                      onShowDeleteConfirm={(journeyId) => {
                        // Handle show delete confirmation
                        console.log('Show delete confirm:', journeyId);
                      }}
                    />
                  ));
                }).flat()
              ) : (
                jobsByStatus[stage.status as keyof typeof jobsByStatus].map((job) => {
                const jobJourneys = getJobJourneys(job.id);
                const journeyStatusText = getJourneyStatusText(jobJourneys, job.status);
                const avgProgress = jobJourneys.length > 0 
                  ? Math.round(jobJourneys.reduce((sum, journey) => sum + getJourneyProgress(journey), 0) / jobJourneys.length)
                  : 0;
                const isSelected = selectedJobs.has(job.id);
                const isDragging = draggedJob === job.id;
                const canDrag = isJobDraggable(job);

                return (
                  <div
                    key={job.id}
                    draggable={canDrag}
                    onDragStart={(e: React.DragEvent) => handleDragStart(e, job.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.status)}
                    onClick={() => handleJobClick(job)}
                    className={`group relative overflow-hidden cursor-pointer transition-all duration-300 w-full max-w-full ${
                      isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                    } ${isDragging ? 'opacity-50' : ''} ${
                      !canDrag && stage.status !== 'draft' && stage.status !== 'created' ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Job application: ${job.jobTitle} at ${job.company}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleJobClick(job);
                      }
                    }}
                  >
                    {/* Card Background */}
                    <div className="absolute inset-0 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/20 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300" />
                    
                    {/* Card Content */}
                    <div className="relative z-10 p-4 w-full">
                       {/* Collapsed View - Always Visible */}
                       <div className="space-y-3 w-full">
                         <div className="flex items-center justify-between w-full">
                           <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                             <div className="flex-1 min-w-0 w-full max-w-full">
                               <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-full">
                                 {job.jobTitle || job.title || 'Untitled Job'}
                               </h4>
                               <p className="text-gray-600 dark:text-gray-400 text-xs truncate max-w-full">{job.company}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             {/* Show CV/CL/ATS indicators for Applied, Interview, Offer, Rejected stages */}
                             {['applied', 'interview', 'offer', 'rejected'].includes(stage.status) && jobJourneys.length > 0 ? (
                               (() => {
                                 const primaryJourney = jobJourneys[0];
                                 const hasCV = !!primaryJourney.cvId;
                                 const hasCoverLetter = !!primaryJourney.coverLetterId;
                                 const atsScore = primaryJourney.atsScore;
                                 
                                 return (
                                   <div className="flex flex-col items-end gap-1">
                                     {/* CV Status */}
                                     <div className={`flex items-center gap-1 ${hasCV ? 'text-green-500' : 'text-red-500'}`}>
                                       {hasCV ? <CheckCircle size={14} /> : <X size={14} />}
                                       <span className="text-xs">CV</span>
                                     </div>
                                     
                                     {/* Cover Letter Status */}
                                     <div className={`flex items-center gap-1 ${hasCoverLetter ? 'text-green-500' : 'text-red-500'}`}>
                                       {hasCoverLetter ? <CheckCircle size={14} /> : <X size={14} />}
                                       <span className="text-xs">CL</span>
                                     </div>
                                     
                                     {/* ATS Score */}
                                     {atsScore !== null && atsScore !== undefined && (
                                       <div className={`flex items-center gap-1 text-xs font-medium ${
                                         atsScore >= 85 ? 'text-green-500' :
                                         atsScore >= 70 ? 'text-blue-500' :
                                         'text-red-500'
                                       }`}>
                                         <span>ATS {atsScore}%</span>
                                       </div>
                                     )}
                                   </div>
                                 );
                               })()
                             ) : (
                               /* Show journey completion indicator for other stages */
                               jobJourneys.length > 0 && (() => {
                                 const completedJourneys = jobJourneys.filter(j => j.status === 'completed');
                                 const hasCompleted = completedJourneys.length > 0;
                                 const allCompleted = completedJourneys.length === jobJourneys.length;
                                 
                                 return (
                                   <div className="flex items-center gap-1">
                                     {hasCompleted && (
                                       <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                         allCompleted 
                                           ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                           : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                       }`}>
                                         <CheckCircle size={10} />
                                         <span>{completedJourneys.length}/{jobJourneys.length}</span>
                                       </div>
                                     )}
                                   </div>
                                 );
                               })()
                             )}
                             
                             {/* Hover indicator */}
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                               <ChevronDown size={12} className="text-gray-400" />
                             </div>
                           </div>
                         </div>
                         
                         {/* Progress Bar - Only show for non-Applied/Interview/Offer/Rejected stages */}
                         {jobJourneys.length > 0 && !['applied', 'interview', 'offer', 'rejected'].includes(stage.status) && (
                           <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden group-hover:h-0 group-hover:opacity-0 transition-all duration-300">
                             <motion.div 
                               className={`h-2 rounded-full transition-all duration-500 ${
                                 avgProgress >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                 avgProgress >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                 avgProgress >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                 'bg-gradient-to-r from-red-500 to-red-600'
                               }`}
                               initial={{ width: 0 }}
                               animate={{ width: `${avgProgress}%` }}
                               transition={{ duration: 0.8, ease: "easeOut" }}
                             />
                           </div>
                         )}
                       </div>

                      {/* Expanded View - Visible on Hover */}
                      <div className="max-h-0 group-hover:max-h-96 overflow-hidden transition-all duration-300 ease-out">
                        <div className="mt-4 space-y-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                        

                        {/* Follow-up notification */}
                        {['applied', 'interview', 'offer', 'rejected'].includes(stage.status) && isFollowUpNeeded(job) && (
                          <div className="mb-3 p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-full">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AlertCircle size={14} className="text-orange-600" />
                                <span className="text-xs text-orange-700 dark:text-orange-400">
                                  Follow-up recommended - {getDaysSinceLastUpdate(job)} days since {job.status}
                                </span>
                              </div>
                              <button 
                                className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJobClick(job);
                                }}
                              >
                                Take Action
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Key Info */}
                        <div className="space-y-2">
                          {job.location && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <MapPin size={12} />
                              <span>{job.location}</span>
                            </div>
                          )}
                          {job.salary && (job.salary.min || job.salary.max) && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <DollarSign size={12} />
                              <span>
                                {job.salary.min && job.salary.max 
                                  ? `${job.salary.currency || '$'}${job.salary.min.toLocaleString()}-${job.salary.max.toLocaleString()}`
                                  : job.salary.min 
                                    ? `${job.salary.currency || '$'}${job.salary.min.toLocaleString()}+`
                                    : job.salary.max
                                      ? `${job.salary.currency || '$'}${job.salary.max.toLocaleString()}`
                                      : 'Not specified'
                                }
                              </span>
                            </div>
                          )}
                          {/* Show application date and deadline inline for created and applied stages */}
                          {['created', 'applied'].includes(stage.status) ? (
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                              {job.applicationDate && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar size={12} />
                                  <span>Applied: {new Date(job.applicationDate).toLocaleDateString()}</span>
                                </div>
                              )}
                              {job.deadline && (
                                <div className="flex items-center gap-1.5">
                                  <Clock size={12} />
                                  <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                                </div>
                              )}
                              {!job.applicationDate && !job.deadline && (
                                <div className="flex items-center gap-2">
                                  <Calendar size={12} />
                                  <span>Created: {new Date(job.createdAt).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                              <Calendar size={12} />
                              <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-200 dark:border-white/20 dark:border-gray-600/50"></div>

                        {/* Journey Status - Hidden for created and applied stages */}
                        {!['created', 'applied'].includes(stage.status) && (
                          <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Target size={12} />
                              <span>{journeyStatusText}</span>
                            </div>
                            {jobJourneys.length > 0 && (
                              <div className="flex items-center gap-1">
                                {jobJourneys
                                  .filter(journey => journey.id) // Filter out journeys without valid IDs
                                  .map((journey, index) => (
                                  <div
                                    key={`${job.id}-${journey.id || `journey-${index}`}`}
                                    className={`w-2 h-2 rounded-full ${
                                      journey.status === 'completed' ? 'bg-green-500' :
                                      journey.status === 'in-progress' ? 'bg-blue-500' :
                                      'bg-gray-400'
                                    }`}
                                    title={`${journey.jobTitle} Journey - ${journey.status}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Journey Completion Status */}
                          {jobJourneys.length > 0 && (
                            <div className="space-y-1">
                              {(() => {
                                const completedJourneys = jobJourneys.filter(j => j.status === 'completed');
                                const totalJourneys = jobJourneys.length;
                                const completionPercentage = totalJourneys > 0 ? Math.round((completedJourneys.length / totalJourneys) * 100) : 0;
                                
                                return (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <CheckCircle size={12} className="text-green-500" />
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                          {completedJourneys.length}/{totalJourneys} Completed
                                        </span>
                                      </div>
                                      {completionPercentage === 100 && (
                                        <div className="flex items-center gap-1">
                                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                            All Complete
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">
                                      {completionPercentage}%
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          
                          {jobJourneys.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                                <span className="text-gray-600 dark:text-gray-400">{Math.round(avgProgress)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden">
                                <motion.div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    avgProgress >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                    avgProgress >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                    avgProgress >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                    'bg-gradient-to-r from-red-500 to-red-600'
                                  }`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${avgProgress}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                />
                              </div>
                            </div>
                          )}
                          </div>
                        )}

                          {/* Follow-up Actions for Applied Stage */}
                          {job.status === 'applied' ? (
                            <div className="w-full mt-3 space-y-2">
                              {getFollowUpTimeline(job).slice(0, 1).map((timeline, idx) => (
                                <div key={idx} className="space-y-2">
                                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium px-1">
                                    {timeline.day}
                                  </div>
                                  <div className="flex gap-2">
                                    <motion.button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const searchQuery = encodeURIComponent(`${job.company} hiring manager`);
                                        window.open(`https://www.linkedin.com/search/results/people/?keywords=${searchQuery}`, '_blank');
                                      }}
                                      className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium rounded-full transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-sm"
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      <Linkedin size={12} />
                                      LinkedIn
                                    </motion.button>
                                    <motion.button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEmail(job, 0);
                                      }}
                                      className="flex-1 px-3 py-2 bg-gradient-to-r from-lime-500/80 to-lime-600/80 hover:from-lime-500 hover:to-lime-600 text-white text-xs font-medium rounded-full transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-sm"
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      <Mail size={12} />
                                      Email
                                    </motion.button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : job.status !== 'draft' ? (
                            <motion.button
                              className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-blue-500/80 to-blue-600/80 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-medium rounded-full transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-sm"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Eye size={12} />
                              Manage Applications
                              <ArrowRight size={12} />
                            </motion.button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
              )}
              </div>
            </div>
          </div>
                ))}
              </div>
            )
        ) : (
          /* List View */
          <div className="bg-white dark:bg-[#141810] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#141810]">
                  <tr>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">Company Name</th>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">Job Title</th>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">Application Date</th>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">Status</th>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">Priority</th>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">Application Journey</th>
                    <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobsForView.map((job) => {
                    const jobJourneys = getJobJourneys(job.id);
                    const journeyStatusText = getJourneyStatusText(jobJourneys);
                    const avgProgress = jobJourneys.length > 0 
                      ? Math.round(jobJourneys.reduce((sum, journey) => sum + getJourneyProgress(journey), 0) / jobJourneys.length)
                      : 0;

                    return (
                      <motion.tr
                        key={job.id}
                        className="border-b border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => handleJobClick(job)}
                        whileHover={{ backgroundColor: undefined }}
                      >
                        <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{job.company || 'Unknown Company'}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{job.jobTitle || 'Untitled Job'}</td>
                        <td className="px-6 py-4 text-gray-700 dark:text-white">
                          {job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : 
                           job.createdAt ? new Date(job.createdAt).toISOString().split('T')[0] : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            job.status === 'applied' ? 'bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-white' :
                            job.status === 'interview' ? 'bg-purple-100 dark:bg-purple-600 text-purple-700 dark:text-white' :
                            job.status === 'offer' ? 'bg-green-100 dark:bg-green-600 text-green-700 dark:text-white' :
                            'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-white'
                          }`}>
                            {job.status === 'applied' ? 'Applied' :
                             job.status === 'interview' ? 'Interviewing' :
                             job.status === 'offer' ? 'Offer' :
                             job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {job.priority === 'high' && <Zap className="w-4 h-4 text-orange-500 dark:text-orange-400" />}
                            {job.priority === 'medium' && <CheckCircle className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />}
                            {job.priority === 'low' && <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                            <span className={`text-sm font-medium ${
                              job.priority === 'high' ? 'text-orange-600 dark:text-orange-400' :
                              job.priority === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-gray-600 dark:text-gray-400'
                            }`}>
                              {job.priority ? job.priority.charAt(0).toUpperCase() + job.priority.slice(1) : 'Medium'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center">
                            {jobJourneys.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 dark:bg-white/20 rounded-full h-2 overflow-hidden">
                                  <motion.div 
                                    className={`h-2 rounded-full transition-all duration-500 ${
                                      avgProgress >= 80 ? 'bg-green-500 dark:bg-green-400' :
                                      avgProgress >= 60 ? 'bg-blue-500 dark:bg-blue-400' :
                                      avgProgress >= 40 ? 'bg-orange-500 dark:bg-orange-400' :
                                      'bg-red-500 dark:bg-red-400'
                                    }`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${avgProgress}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                  />
                                </div>
                                <span className="text-gray-900 dark:text-white text-xs font-medium">{avgProgress}%</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-white/40 text-sm">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditJob(job);
                              }}
                              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Edit
                            </motion.button>
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Add delete functionality here if needed
                              }}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Delete
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </motion.div>
      </AnimatePresence>
      </div>
      </div>
    </div>

      {/* Application Journey Sidebar */}
      {showModal && selectedJob && (
        <JobSidebar
          job={selectedJob}
          journeys={getJobJourneys(selectedJob.id)}
          onClose={handleCloseModal}
          onRefresh={loadData}
        />
      )}

      {/* Add/Edit Job Sidebar */}
      <EditJobSidebar
        isOpen={showAddJobModal}
        onClose={() => {
          setShowAddJobModal(false);
          setEditingJob(null);
        }}
        onJobSaved={handleJobSaved}
        editingJob={editingJob ? {
          ...editingJob,
          deadline: editingJob.deadline ? (editingJob.deadline instanceof Date ? editingJob.deadline.toISOString() : editingJob.deadline) : undefined,
          applicationDate: editingJob.applicationDate ? (editingJob.applicationDate instanceof Date ? editingJob.applicationDate.toISOString() : editingJob.applicationDate) : undefined,
          postedDate: editingJob.postedDate ? (editingJob.postedDate instanceof Date ? editingJob.postedDate.toISOString() : editingJob.postedDate) : undefined
        } as any : null}
        userId={userId || ''}
      />

      {/* Job Creation Paywall */}
      <JobCreationPaywall
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        creditsRemaining={creditInfo?.creditsRemaining || 0}
        limit={creditInfo?.limit || 1}
        resetTime={creditInfo?.resetTime}
        preselectedPlanKey="pro_monthly"
      />
    </React.Fragment>
  );
};

export default ApplicationTracker;
