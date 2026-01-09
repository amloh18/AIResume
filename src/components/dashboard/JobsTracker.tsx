'use client';

import React, { useState, useEffect, useRef } from 'react';
// Force HMR update
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, Trash2, Columns3, List } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authenticatedFetch, authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import toast from 'react-hot-toast';
import { ApplicationTrackerSkeleton } from '@/components/ui/OptimizedSkeletons';
import { CVJourney } from '@/types/cv';
import JobSidebar from './jobs/JobSidebar';
import EditJobSidebar from './jobs/EditJobSidebar';
import JobCreationPaywall from '@/components/payment/JobCreationPaywall';
import JobsHeader from './jobs/JobsHeader';

import JobsListView from './jobs/JobsListView';
import JobsKanbanView from './jobs/JobsKanbanView';
import JobsFilters from './jobs/JobsFilters';
import JobParserDialog from './jobs/JobParserDialog';
import DownloadModal from '@/components/ui/DownloadModal';
import { useJobsPersistence } from '@/lib/hooks/useJobsPersistence';
import { useJobsKeyboardShortcuts } from '@/lib/hooks/useJobsKeyboardShortcuts';
import { useFocusMode } from '@/lib/hooks/useFocusMode';
import { useDebounce } from '@/hooks/useDebounce';
import { useCreditExhaustionHandler } from '@/hooks/useCreditExhaustionHandler';

interface JobApplication {
  id: string;
  _id: string;
  userId: string;
  jobTitle: string;
  title?: string;
  company: string;
  status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  jobDescription?: string;
  description?: string;
  location?: string;
  jobUrl?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  type?: string;
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

const JobsTracker: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData, loading: userLoading, error: userError } = useUserData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cvId = searchParams.get('cvId');
  const stageParam = searchParams.get('stage');

  // Get user ID for data fetching
  const userId = getUserIdForAPI(user);

  // State management
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [journeys, setJourneys] = useState<CVJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');

  // Use persistence hook
  const { preferences, savePreferences } = useJobsPersistence();

  // Focus mode
  const { isFocusMode, toggleFocusMode } = useFocusMode();

  // Credit exhaustion handler
  const { showExhaustionModal } = useCreditExhaustionHandler();

  // Job limit info (will be fetched from API or passed as prop)
  const [limitInfo, setLimitInfo] = useState<any>(null);

  // Initialize from persisted preferences
  useEffect(() => {
    if (preferences.mode) {
      setViewMode(preferences.mode);
    }
    if (preferences.filterStatus) {
      setFilterStatus(preferences.filterStatus);
    }
    if (preferences.sortBy) {
      setSortBy(preferences.sortBy);
    }
    if (preferences.lastUpdatedFilter) {
      setLastUpdatedFilter(preferences.lastUpdatedFilter);
    }
    if (preferences.followUpFilter) {
      setFollowUpFilter(preferences.followUpFilter);
    }
    if (preferences.salaryRangeFilter) {
      setSalaryRangeFilter(preferences.salaryRangeFilter);
    }
    if (preferences.priorityFilter) {
      setPriorityFilter(preferences.priorityFilter);
    }
  }, []); // Only on mount
  const [sortBy, setSortBy] = useState<'lastUpdated' | 'followUpDate' | 'salaryRange' | 'priority'>('lastUpdated');
  const [lastUpdatedFilter, setLastUpdatedFilter] = useState<'today' | 'last7days' | 'last30days' | 'all'>('all');
  const [followUpFilter, setFollowUpFilter] = useState<'upcoming' | 'overdue' | 'all'>('all');
  const [salaryRangeFilter, setSalaryRangeFilter] = useState<'all' | 'under50k' | '50k-75k' | '75k-100k' | '100k-150k' | '150k-200k' | 'over200k'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'high' | 'medium' | 'low' | 'all'>('all');
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [draggedJob, setDraggedJob] = useState<string | null>(null);
  const [cvContext, setCvContext] = useState<any>(null);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showJobParserDialog, setShowJobParserDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallInfo, setPaywallInfo] = useState<{ currentCount: number; limit: number } | null>(null);
  const [zoomedStage, setZoomedStage] = useState<string | null>(null);
  const [isUpdatingJobStatus, setIsUpdatingJobStatus] = useState<Set<string>>(new Set());
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadJobId, setDownloadJobId] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  // Listen for job updates (including draft saves and auto-saves)
  useEffect(() => {
    if (!userId) return;

    const handleJobUpdate = (event: CustomEvent) => {
      console.log('🔄 JobsTracker - Job update event received', event.detail);

      // If we have specific updates in the event detail, update state directly
      // This prevents full reload/spinner for simple score updates
      if (event.detail && event.detail.jobId) {
        setJobs(prevJobs => prevJobs.map(job => {
          if (job.id === event.detail.jobId || job._id === event.detail.jobId) {
            // Merge existing job with updates
            // Filter out 'jobId' from updates as it's not a job property
            const { jobId, ...updates } = event.detail;
            return { ...job, ...updates } as JobApplication;
          }
          return job;
        }));
        return; // Skip full reload
      }

      // Fallback to full reload if no specific details
      console.log('🔄 JobsTracker - Refreshing full list');
      loadData();
    };

    window.addEventListener('jobUpdated', handleJobUpdate as EventListener);

    return () => {
      window.removeEventListener('jobUpdated', handleJobUpdate as EventListener);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load CV context if cvId is provided
  useEffect(() => {
    if (cvId && userId) {
      loadCVContext(cvId);
    }
  }, [cvId, userId]);

  // Set zoomed stage from URL parameter
  useEffect(() => {
    if (stageParam && ['draft', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'].includes(stageParam)) {
      setZoomedStage(stageParam);
    }
  }, [stageParam]);

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

      // Load jobs and journeys in parallel
      const [jobsResponse, journeysResponse] = await Promise.all([
        authenticatedFetchWithUserId('/api/jobs?limit=all', userId || undefined),
        authenticatedFetchWithUserId('/api/application-journey', userId || undefined, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const jobsResult = await jobsResponse.json();
      const journeysResult = await journeysResponse.json();

      let transformedJobs: JobApplication[] = [];

      if (jobsResult.success) {
        transformedJobs = jobsResult.data.jobs.map((job: any) => {
          // Preserve optimistic updates for jobs that are currently being updated
          const existingJob = jobs.find(j => j.id === job.id);
          const isBeingUpdated = isUpdatingJobStatus.has(job.id);

          return {
            id: job.id,
            _id: job.id,
            userId: job.userId,
            jobTitle: job.jobTitle,
            title: job.jobTitle,
            company: job.company,
            // Preserve optimistic status if job is being updated
            status: (isBeingUpdated && existingJob) ? existingJob.status : job.status,
            jobDescription: job.jobDescription,
            description: job.jobDescription,
            location: job.location,
            jobUrl: job.jobUrl,
            salary: job.salary,
            jobType: job.type,
            type: job.type,
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
      }

      // Load CV journeys and populate ATS scores
      if (journeysResult.success) {
        const loadedJourneys = journeysResult.data.journeys || [];
        setJourneys(loadedJourneys);

        // Populate ATS scores from journeys to jobs (same approach as Canvas)
        // Journey is the source of truth for ATS scores
        transformedJobs = transformedJobs.map(job => {
          // Find journeys for this job (normalize IDs for comparison)
          const jobIdStr = job.id || job._id;
          const jobJourneys = loadedJourneys.filter((journey: any) => {
            const journeyJobId = journey.jobId?.toString() || journey.jobId;
            return journeyJobId === jobIdStr;
          });

          if (jobJourneys.length === 0) {
            return job; // No journeys found for this job
          }

          // Get ATS score from the most recent journey with a score
          // Priority: journey.atsScore (source of truth, same as Canvas)
          const journeyWithScore = jobJourneys
            .filter((journey: any) => journey.atsScore !== undefined && journey.atsScore !== null)
            .sort((a: any, b: any) => {
              // Sort by updatedAt descending to get most recent
              const aDate = new Date(a.metadata?.updatedAt || a.updatedAt || 0);
              const bDate = new Date(b.metadata?.updatedAt || b.updatedAt || 0);
              return bDate.getTime() - aDate.getTime();
            })[0];

          // Use journey ATS score (journey is source of truth, same as Canvas)
          if (journeyWithScore && journeyWithScore.atsScore !== undefined && journeyWithScore.atsScore !== null) {
            return {
              ...job,
              atsScore: journeyWithScore.atsScore
            };
          }

          return job;
        });
      }

      setJobs(transformedJobs);
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
    if (journey.status === 'completed') {
      return 100;
    }

    if (journey.steps && journey.steps.length > 0) {
      const completedSteps = journey.steps.filter(step => step.status === 'completed').length;
      const totalSteps = journey.steps.length;

      if (journey.currentStep && journey.currentStep > 0) {
        const stepProgress = (journey.currentStep - 1) / totalSteps * 100;
        const completedProgress = (completedSteps / totalSteps) * 100;
        return Math.round(Math.max(stepProgress, completedProgress));
      }

      return Math.round((completedSteps / totalSteps) * 100);
    }

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
      if (['applied', 'interview', 'offer', 'rejected'].includes(jobStatus || '')) {
        return `${completedCount} CV Journeys Completed`;
      }
      return `${completedCount} Ready to Apply`;
    } else {
      return `${activeCount} CV Journeys Active`;
    }
  };

  // Filter and sort jobs
  const filteredAndSortedJobs = React.useMemo(() => {
    let filtered = jobs.filter(job => {
      const matchesSearch = job.jobTitle.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        job.location?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || job.status === filterStatus;

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

    // Sort jobs
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
  }, [jobs, debouncedSearchQuery, filterStatus, sortBy, lastUpdatedFilter, followUpFilter, salaryRangeFilter, priorityFilter]);

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
  const jobsByStatus = React.useMemo(() => {
    // Debug logging
    console.log('🔍 JobsTracker - Filtering jobs:', {
      total: jobs.length,
      filtered: filteredJobsForView.length,
      filterStatus,
      isFocusMode
    });

    const grouped = {
      draft: filteredJobsForView.filter(job => job.status === 'draft'),
      created: filteredJobsForView.filter(job => job.status === 'created'),
      applied: filteredJobsForView.filter(job => job.status === 'applied'),
      interview: filteredJobsForView.filter(job => job.status === 'interview'),
      offer: filteredJobsForView.filter(job => job.status === 'offer'),
      rejected: filteredJobsForView.filter(job => job.status === 'rejected')
    };

    console.log('🔍 JobsTracker - Jobs by status:', {
      draft: grouped.draft.length,
      created: grouped.created.length,
      applied: grouped.applied.length,
      interview: grouped.interview.length,
      offer: grouped.offer.length,
      rejected: grouped.rejected.length
    });

    return grouped;
  }, [filteredJobsForView, jobs.length, filterStatus, isFocusMode]);

  // Handlers
  const handleAddJob = () => {
    // EDGE CASE 4: Block "Add Job" button when limit reached
    if (limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0) {
      setShowPaywall(true);
      setPaywallInfo({
        currentCount: limitInfo.currentCount,
        limit: limitInfo.limit
      });
      toast.error('Tracker full. Upgrade to track unlimited applications.');
      return;
    }
    setEditingJob(null);
    setShowAddJobModal(true);
  };

  const handleQuickAdd = () => {
    // EDGE CASE 4: Block "Quick Add" when limit reached
    if (limitInfo && !limitInfo.isUnlimited && limitInfo.remaining === 0) {
      setShowPaywall(true);
      setPaywallInfo({
        currentCount: limitInfo.currentCount,
        limit: limitInfo.limit
      });
      toast.error('Tracker full. Upgrade to track unlimited applications.');
      return;
    }
    setShowJobParserDialog(true);
  };

  const handleParseComplete = async (parsedData: any) => {
    try {
      // Helper function to get date string in YYYY-MM-DD format (15 days from now)
      const getDateString = (daysFromNow: number): string => {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString().split('T')[0];
      };

      // Map parsed data to EditJobSidebar format
      // Respect parsed status if valid, otherwise default to 'draft'
      const validStatuses = ['draft', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'];
      let mappedStatus = 'draft';

      if (parsedData.status) {
        const normalizedStatus = parsedData.status.toLowerCase();
        if (validStatuses.includes(normalizedStatus)) {
          mappedStatus = normalizedStatus;
        } else if (normalizedStatus === 'interviewing') {
          mappedStatus = 'interview';
        } else if (normalizedStatus === 'hired') {
          mappedStatus = 'offer';
        } else if (normalizedStatus === 'archived') {
          mappedStatus = 'withdrawn';
        }
      }

      // Convert deadline Date to string if present, otherwise default to 15 days from now
      let deadlineString: string = getDateString(15); // Default to 15 days from now
      if (parsedData.deadline) {
        try {
          if (parsedData.deadline instanceof Date) {
            deadlineString = parsedData.deadline.toISOString().split('T')[0];
          } else if (typeof parsedData.deadline === 'string') {
            // Try to parse and format the date string
            const date = new Date(parsedData.deadline);
            if (!isNaN(date.getTime())) {
              deadlineString = date.toISOString().split('T')[0];
            }
          }
        } catch (error) {
          console.warn('Error parsing deadline:', error);
          // Use default deadline if parsing fails
        }
      }

      // Validate and clean jobUrl before passing to EditJobSidebar
      let cleanedJobUrl: string | undefined = undefined;
      if (parsedData.jobUrl && parsedData.jobUrl.trim()) {
        try {
          new URL(parsedData.jobUrl);
          cleanedJobUrl = parsedData.jobUrl.trim();
        } catch {
          // Invalid URL - will be validated in EditJobSidebar
          console.warn('Invalid job URL from parser:', parsedData.jobUrl);
          cleanedJobUrl = undefined;
        }
      }

      // Validate source is a valid enum value
      const validSources = ['extension', 'manual', 'import', 'linkedin', 'indeed', 'company-website', 'referral', 'other'];
      let cleanedSource = parsedData.source || 'other';
      if (!validSources.includes(cleanedSource)) {
        cleanedSource = 'other';
      }

      // Ensure salary structure matches new format (with currency and period)
      let salaryData: {
        min?: number;
        max?: number;
        currency?: string;
        period?: 'hourly' | 'monthly' | 'yearly';
      } | undefined = undefined;

      if (parsedData.salary) {
        salaryData = {
          min: parsedData.salary.min,
          max: parsedData.salary.max,
          currency: parsedData.salary.currency || 'USD', // Default to USD
          period: parsedData.salary.period || 'yearly' // Default to yearly
        };
      }

      // Pre-fill EditJobSidebar with parsed data
      // Close parser dialog first, then open edit modal to prevent state conflicts
      setShowJobParserDialog(false);

      // Use requestAnimationFrame to ensure state updates happen in the next frame
      // This prevents infinite loops from rapid state updates
      requestAnimationFrame(() => {
        setEditingJob({
          id: '',
          userId: userId || '',
          jobTitle: parsedData.jobTitle || '',
          company: parsedData.company || '',
          location: parsedData.location || '',
          jobUrl: cleanedJobUrl || '',
          jobDescription: parsedData.jobDescription || '',
          jobDescriptionRaw: parsedData.jobDescriptionRaw || parsedData.jobDescription || '',
          notes: parsedData.notes || '',
          priority: 'medium' as const, // Default priority
          status: mappedStatus as 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn',
          deadline: deadlineString, // Always set (defaults to 15 days from now)
          // applicationDate is removed - no longer used in the form
          sponsorship: 'unknown' as const, // Default sponsorship
          tags: parsedData.tags || [],
          salary: salaryData, // Properly structured salary with currency and period
          source: cleanedSource as 'extension' | 'manual' | 'import' | 'linkedin' | 'indeed' | 'company-website' | 'referral' | 'other',
          sourceUrl: parsedData.sourceUrl || '',
          contactDetails: {
            name: '',
            email: '',
            phone: '',
            role: ''
          },
          interviews: [],
          followUps: [],
          attachments: []
        } as JobApplication);
        setShowAddJobModal(true);
      });
    } catch (error) {
      console.error('Error handling parsed job:', error);
      toast.error('Failed to process parsed job data');
    }
  };

  const handleJobSaved = (job: any) => {
    setShowAddJobModal(false);
    setEditingJob(null);
    loadData();
    toast.success(editingJob ? 'Job updated successfully!' : 'Job added successfully!');
  };

  const handleJobClick = (job: JobApplication) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedJob(null);
  };

  const handleViewModeChange = (mode: 'kanban' | 'list') => {
    setViewMode(mode);
    savePreferences({ mode });
  };

  // Keyboard shortcuts
  useJobsKeyboardShortcuts({
    onToggleView: () => handleViewModeChange(viewMode === 'kanban' ? 'list' : 'kanban'),
    onAddJob: handleAddJob,
    onToggleFilters: () => setShowFilters(!showFilters),
    onFocusSearch: () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      searchInput?.focus();
    },
    onCloseModal: () => {
      if (showModal) handleCloseModal();
      if (showAddJobModal) {
        setShowAddJobModal(false);
        setEditingJob(null);
      }
      if (showFilters) setShowFilters(false);
    },
    onSelectAll: () => {
      const visibleJobIds = filteredJobsForView.map(job => job.id);
      setSelectedJobs(new Set(visibleJobIds));
      setShowBulkActions(visibleJobIds.length > 0);
    },
    enabled: !showModal && !showAddJobModal
  });

  // Focus mode keyboard shortcut (Shift+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F' && !showModal && !showAddJobModal) {
        e.preventDefault();
        toggleFocusMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFocusMode, showModal, showAddJobModal]);

  // Save filter preferences when they change
  // Use useRef to track previous values and only save when they actually change
  const prevFiltersRef = useRef({
    filterStatus,
    sortBy,
    lastUpdatedFilter,
    followUpFilter,
    salaryRangeFilter,
    priorityFilter
  });

  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip saving on initial mount (values are already loaded from localStorage)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Update ref with initial values
      prevFiltersRef.current = {
        filterStatus,
        sortBy,
        lastUpdatedFilter,
        followUpFilter,
        salaryRangeFilter,
        priorityFilter
      };
      return;
    }

    const currentFilters = {
      filterStatus,
      sortBy,
      lastUpdatedFilter,
      followUpFilter,
      salaryRangeFilter,
      priorityFilter
    };

    // Only save if values actually changed
    const hasChanged =
      prevFiltersRef.current.filterStatus !== currentFilters.filterStatus ||
      prevFiltersRef.current.sortBy !== currentFilters.sortBy ||
      prevFiltersRef.current.lastUpdatedFilter !== currentFilters.lastUpdatedFilter ||
      prevFiltersRef.current.followUpFilter !== currentFilters.followUpFilter ||
      prevFiltersRef.current.salaryRangeFilter !== currentFilters.salaryRangeFilter ||
      prevFiltersRef.current.priorityFilter !== currentFilters.priorityFilter;

    if (hasChanged) {
      prevFiltersRef.current = currentFilters;
      savePreferences(currentFilters);
    }
  }, [filterStatus, sortBy, lastUpdatedFilter, followUpFilter, salaryRangeFilter, priorityFilter, savePreferences]);

  const handleStageClick = (stageStatus: string) => {
    // Toggle zoom for the stage
    if (zoomedStage === stageStatus) {
      setZoomedStage(null);
    } else {
      setZoomedStage(stageStatus);
    }
  };

  const handleCreateJourney = async (job: JobApplication) => {
    try {
      // IMPORTANT: Move job to 'created' status FIRST (this checks credits and creates journey automatically)
      // The API route will automatically create the journey when moving from draft to created
      if (job.status === 'draft') {
        const response = await authenticatedFetchWithUserId(`/api/jobs/${job.id || job._id}`, userId || undefined, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'created'
          }),
        });

        if (!response.ok) {
          let errorData: any = {};
          try {
            const text = await response.text();
            errorData = text ? JSON.parse(text) : {};
          } catch (parseError) {
            // Only log parse errors, not the actual error response
            console.error('Failed to parse error response:', parseError);
          }

          // Check if this is a credit-related error
          // When moving from draft to created, 500 errors are likely credit-related
          const isCreditError =
            (response.status === 403 && (errorData.requiresUpgrade || errorData.error?.includes('limit exceeded') || errorData.error?.includes('insufficient credits') || errorData.error?.includes('Plan limit exceeded'))) ||
            (response.status === 500 && (errorData.error?.includes('limit exceeded') || errorData.error?.includes('insufficient credits') || errorData.error?.includes('Plan limit exceeded'))) ||
            (response.status === 500) || // Assume 500 errors when moving draft->created are credit issues
            (errorData.error?.includes('limit') || errorData.error?.includes('credit'));

          if (isCreditError) {
            const limit = errorData.limit || 1;
            const currentUsage = errorData.currentUsage || limit;
            const creditsRemaining = Math.max(0, limit - currentUsage);

            showExhaustionModal(
              {
                creditsRemaining,
                limit,
                reason: errorData.message || errorData.error || 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs'
              },
              'pro_monthly'
            );
            throw new Error('Insufficient credits to create journey');
          }

          // Only log non-credit errors to console
          console.error('Failed to move job to created stage:', response.status, errorData);
          throw new Error(errorData.error || errorData.message || 'Failed to move job to created stage');
        }

        // Job status updated successfully - API route automatically creates journey
        toast.success('CV and Cover Letter journey created!');

        // Dispatch credit update event to refresh membership card
        window.dispatchEvent(new CustomEvent('creditsUpdated'));

        // Refresh data
        await loadData();
      } else {
        // Job is already in 'created' or later stage, check if journey exists
        const checkJourneyResponse = await authenticatedFetchWithUserId(`/api/application-journey?jobId=${job.id || job._id}`, userId || undefined, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        let journeyExists = false;
        if (checkJourneyResponse.ok) {
          const journeyData = await checkJourneyResponse.json();
          journeyExists = journeyData && journeyData.length > 0;
        }

        // Create journey if it doesn't exist
        if (!journeyExists) {
          const journeyResponse = await authenticatedFetchWithUserId('/api/application-journey', userId || undefined, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jobId: job.id || job._id,
              jobTitle: job.jobTitle || job.title,
              company: job.company,
              journeyType: 'standard'
            }),
          });

          if (!journeyResponse.ok) {
            let errorData: any = {};
            try {
              const text = await journeyResponse.text();
              errorData = text ? JSON.parse(text) : {};
            } catch (parseError) {
              console.error('Failed to parse error response:', parseError);
            }
            throw new Error(errorData.error || errorData.message || 'Failed to create journey');
          }

          toast.success('CV and Cover Letter journey created!');
          await loadData();
        } else {
          toast.success('Journey already exists for this job');
        }
      }
    } catch (error: any) {
      console.error('Error creating journey:', error);

      // Don't show toast if it's a credit error (paywall already shown)
      if (!error?.message?.includes('Insufficient credits')) {
        toast.error(error?.message || 'Failed to create journey. Please try again.');
      }

      throw error;
    }
  };

  const handleJobStatusUpdate = async (jobId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update job status');
      }

      // Refresh data
      await loadData();
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  };

  // Handle Improve ATS action
  const handleImproveATS = (job: JobApplication) => {
    const jobJourneys = getJobJourneys(job.id);
    if (jobJourneys.length > 0) {
      // Use the most recent journey or the one with the highest update time
      const journey = jobJourneys[0]; // Assuming filtered/sorted or taking the first one
      if (journey.cvId) {
        router.push(`/resume-enhancer?journeyId=${journey.id}&cvId=${journey.cvId}&mode=edit`);
      } else {
        router.push(`/resume-enhancer?journeyId=${journey.id}&mode=edit`);
      }
    } else {
      // If no journey exists (shouldn't happen in Created stage), create one or alert
      // Since it's 'Created' stage, a journey likely exists or we can just redirect to enhancer to start one
      // But passing just cvId or existing params might be needed.
      // For now, let's assume if they are in Created stage they should have a journey, but if not:
      toast.error('No CV Journey found for this job.');
    }
  };

  // Handle Download action
  const handleDownload = (job: JobApplication) => {
    setDownloadJobId(job.id);
    setShowDownloadModal(true);
  };

  // Drag and drop handlers
  const isJobDraggable = (job: JobApplication) => {
    // Allow dragging from draft and created stages to further stages
    return true; // All jobs can be dragged
  };

  const isDraggableStage = (stage: string) => {
    // Allow dropping on all stages except draft (can move forward from draft)
    // Allow moving from draft to created, applied, interview, offer, rejected
    return stage !== 'draft';
  };

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
    setDraggedJob(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const currentDraggedJob = draggedJob;
    setDraggedJob(null);

    if (!currentDraggedJob) return;

    if (!isDraggableStage(newStatus)) {
      return;
    }

    const job = jobs.find(j => j.id === currentDraggedJob);
    if (!job || !isJobDraggable(job)) {
      return;
    }

    const originalStatus = job.status;

    // Mark job as being updated to prevent data refresh from overwriting
    setIsUpdatingJobStatus(prev => new Set(prev).add(currentDraggedJob));

    setJobs(prevJobs =>
      prevJobs.map(j =>
        j.id === currentDraggedJob ? { ...j, status: newStatus as any } : j
      )
    );

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
          let errorData: any = {};
          try {
            const text = await response.text();
            errorData = text ? JSON.parse(text) : {};
          } catch (parseError) {
            // Only log parse errors, not the actual error response
            console.error('Failed to parse error response:', parseError);
          }

          // Check if this is a credit-related error
          // When moving from draft to created, 500 errors are likely credit-related
          const isDraftToCreated = originalStatus === 'draft' && newStatus === 'created';
          const isCreditError =
            (response.status === 403 && (errorData.requiresUpgrade || errorData.error?.includes('limit exceeded') || errorData.error?.includes('insufficient credits') || errorData.error?.includes('Plan limit exceeded'))) ||
            (response.status === 500 && (errorData.error?.includes('limit exceeded') || errorData.error?.includes('insufficient credits') || errorData.error?.includes('Plan limit exceeded'))) ||
            (isDraftToCreated && response.status === 500) || // Assume 500 errors when moving draft->created are credit issues
            (isDraftToCreated && (errorData.requiresUpgrade || errorData.error?.includes('limit') || errorData.error?.includes('credit')));

          // Handle insufficient credits error - show paywall
          if (isCreditError) {
            const limit = errorData.limit || 1;
            const currentUsage = errorData.currentUsage || limit;
            const creditsRemaining = Math.max(0, limit - currentUsage);

            showExhaustionModal(
              {
                creditsRemaining,
                limit,
                reason: errorData.message || errorData.error || 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs'
              },
              'pro_monthly'
            );
          } else {
            // Only log non-credit errors to console
            console.error('Failed to update job status:', response.status, errorData);
            toast.error(errorData.message || errorData.error || `Failed to update job status (${response.status}). Please try again.`);
          }

          // Revert on failure
          setJobs(prevJobs =>
            prevJobs.map(j =>
              j.id === currentDraggedJob ? { ...j, status: originalStatus } : j
            )
          );
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
            // Check if this is a credit-related error
            const isDraftToCreated = originalStatus === 'draft' && newStatus === 'created';
            const isCreditError =
              result.requiresUpgrade ||
              result.error?.includes('limit exceeded') ||
              result.error?.includes('insufficient credits') ||
              result.error?.includes('Plan limit exceeded') ||
              (isDraftToCreated && (result.error?.includes('limit') || result.error?.includes('credit')));

            // Handle insufficient credits error - show paywall
            if (isCreditError) {
              const limit = result.limit || 1;
              const currentUsage = result.currentUsage || limit;
              const creditsRemaining = Math.max(0, limit - currentUsage);

              showExhaustionModal(
                {
                  creditsRemaining,
                  limit,
                  reason: result.message || result.error || 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs'
                },
                'pro_monthly'
              );
            } else {
              // Only log non-credit errors to console
              console.error('API returned error:', result);
              toast.error(result.message || result.error || 'Failed to update job status. Please try again.');
            }

            // Revert on failure
            setJobs(prevJobs =>
              prevJobs.map(j =>
                j.id === currentDraggedJob ? { ...j, status: originalStatus } : j
              )
            );
            setIsUpdatingJobStatus(prev => {
              const next = new Set(prev);
              next.delete(currentDraggedJob);
              return next;
            });
            return;
          }
          // Success - update with server response to ensure consistency
          console.log('✅ Job status updated successfully:', newStatus);

          // Dispatch credit update event if moving from draft to created
          if (originalStatus === 'draft' && newStatus === 'created') {
            window.dispatchEvent(new CustomEvent('creditsUpdated'));
          }

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
          }, 2000);
        }
      })
      .catch(error => {
        console.error('Error updating job status:', error);

        // Check if error is credit-related
        const errorMessage = error?.message || error?.toString() || '';
        const isCreditError =
          errorMessage.includes('limit exceeded') ||
          errorMessage.includes('insufficient credits') ||
          errorMessage.includes('Plan limit exceeded') ||
          (originalStatus === 'draft' && newStatus === 'created' && (errorMessage.includes('limit') || errorMessage.includes('credit')));

        if (isCreditError) {
          showExhaustionModal(
            {
              creditsRemaining: 0,
              limit: 1,
              reason: 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs'
            },
            'pro_monthly'
          );
        } else {
          toast.error('Failed to update job status. Please try again.');
        }

        // Revert on error
        setJobs(prevJobs =>
          prevJobs.map(j =>
            j.id === currentDraggedJob ? { ...j, status: originalStatus } : j
          )
        );
        setIsUpdatingJobStatus(prev => {
          const next = new Set(prev);
          next.delete(currentDraggedJob);
          return next;
        });
      });
  };

  if (authLoading || userLoading) {
    return <ApplicationTrackerSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <React.Fragment>
      <div className="h-full flex flex-col min-w-0 w-full max-w-full overflow-hidden">
        <div className="w-full h-full flex flex-col min-w-0 max-w-full overflow-hidden">
          {/* Enhanced Header - Fixed Width Container */}
          <div className="flex-shrink-0 w-full px-0 sm:px-4 md:px-6">
            <JobsHeader
              onAddJob={handleAddJob}
              onQuickAdd={handleQuickAdd}
              onToggleFilters={() => setShowFilters(!showFilters)}
              showFilters={showFilters}
              onMobileMenuToggle={toggleSidebar}
              isMobileMenuOpen={isMobileMenuOpen}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              user={{
                name: getUserDisplayName(userData),
                email: getUserEmail(userData),
                username: userData?.username || '',
                profilePhoto: getUserAvatar(userData),
                designation: userData?.role || '',
                subscription: userData?.subscription,
                isEmailVerified: userData?.isEmailVerified,
              }}
              jobLimitInfo={limitInfo}
            />
          </div>

          {/* CV Context Banner - Fixed Width Container */}
          {cvContext && (
            <div className="flex-shrink-0 w-full px-0 sm:px-4 md:px-6">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full p-4 min-w-0 w-full max-w-full overflow-hidden mb-4"
              >
                <div className="flex items-center justify-between gap-2 min-w-0 w-full max-w-full overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
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
                      window.history.replaceState({}, '', '/dashboard/tracker');
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium flex-shrink-0 whitespace-nowrap"
                  >
                    Clear Context
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Filters Panel - Fixed Width Container */}
          <div className="flex-shrink-0 w-full px-0 sm:px-4 md:px-6">
            <AnimatePresence>
              {showFilters && (
                <JobsFilters
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  lastUpdatedFilter={lastUpdatedFilter}
                  setLastUpdatedFilter={setLastUpdatedFilter}
                  followUpFilter={followUpFilter}
                  setFollowUpFilter={setFollowUpFilter}
                  salaryRangeFilter={salaryRangeFilter}
                  setSalaryRangeFilter={setSalaryRangeFilter}
                  priorityFilter={priorityFilter}
                  setPriorityFilter={setPriorityFilter}
                  onClose={() => setShowFilters(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Bulk Actions Bar - Fixed Width Container */}
          <div className="flex-shrink-0 w-full px-0 sm:px-4 md:px-6">
            <AnimatePresence>
              {showBulkActions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-blue-600 dark:bg-blue-500/10 backdrop-blur-md border border-blue-700 dark:border-blue-500/20 rounded-full p-4 text-white mb-4"
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
                        onChange={(e) => {
                          // Handle bulk status update
                          const promises = Array.from(selectedJobs).map(jobId =>
                            authenticatedFetchWithUserId(`/api/jobs/${jobId}`, userId || undefined, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: e.target.value }),
                            })
                          );
                          Promise.all(promises).then(() => {
                            loadData();
                            setSelectedJobs(new Set());
                            setShowBulkActions(false);
                          });
                        }}
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
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to delete ${selectedJobs.size} jobs?`)) return;
                          const promises = Array.from(selectedJobs).map(jobId =>
                            authenticatedFetchWithUserId(`/api/jobs/${jobId}`, userId || undefined, {
                              method: 'DELETE',
                            })
                          );
                          await Promise.all(promises);
                          loadData();
                          setSelectedJobs(new Set());
                          setShowBulkActions(false);
                        }}
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

          {/* View Content - Kanban or List */}
          <div className="flex-1 min-h-0 w-full relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 bottom-0 mt-4 px-0 sm:px-4 md:px-6 overflow-x-auto overflow-y-hidden">
              {viewMode === 'kanban' ? (
                <div className="h-full w-full overflow-x-auto overflow-y-hidden rounded-lg">
                  <JobsKanbanView
                    jobs={filteredJobsForView}
                    jobsByStatus={jobsByStatus}
                    loading={loading}
                    selectedJobs={selectedJobs}
                    setSelectedJobs={setSelectedJobs}
                    setShowBulkActions={setShowBulkActions}
                    draggedJob={draggedJob}
                    zoomedStage={zoomedStage}
                    onJobClick={handleJobClick}
                    onStageClick={handleStageClick}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isJobDraggable={isJobDraggable}
                    isDraggableStage={isDraggableStage}
                    getJobJourneys={getJobJourneys}
                    getJourneyProgress={getJourneyProgress}
                    getJourneyStatusText={getJourneyStatusText}
                    isFocusMode={isFocusMode}
                    journeys={journeys}
                    onJobStatusUpdate={handleJobStatusUpdate}
                    onCreateJourney={handleCreateJourney}
                    onRefresh={loadData}
                    onImproveATS={handleImproveATS}
                    onDownload={handleDownload}
                  />
                </div>
              ) : (
                <div className="h-full w-full overflow-y-auto overflow-x-hidden rounded-lg">
                  <JobsListView
                    jobs={filteredJobsForView}
                    loading={loading}
                    selectedJobs={selectedJobs}
                    setSelectedJobs={setSelectedJobs}
                    setShowBulkActions={setShowBulkActions}
                    onJobClick={handleJobClick}
                    getJobJourneys={getJobJourneys}
                    getJourneyProgress={getJourneyProgress}
                    getJourneyStatusText={getJourneyStatusText}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebars */}
      <EditJobSidebar
        isOpen={showAddJobModal}
        onClose={() => {
          setShowAddJobModal(false);
          setEditingJob(null);
        }}
        onJobSaved={handleJobSaved}
        existingJobs={jobs} // Pass existing jobs for duplicate detection
        editingJob={editingJob ? {
          id: editingJob.id,
          jobTitle: editingJob.jobTitle,
          company: editingJob.company,
          location: editingJob.location,
          jobUrl: editingJob.jobUrl,
          jobDescription: editingJob.jobDescription,
          notes: editingJob.notes,
          priority: editingJob.priority,
          status: editingJob.status,
          deadline: editingJob.deadline ? (typeof editingJob.deadline === 'string' ? editingJob.deadline : new Date(editingJob.deadline).toISOString().split('T')[0]) : undefined,
          applicationDate: editingJob.applicationDate ? (typeof editingJob.applicationDate === 'string' ? editingJob.applicationDate : new Date(editingJob.applicationDate).toISOString().split('T')[0]) : undefined,
          salary: editingJob.salary,
          sponsorship: editingJob.sponsorship,
          tags: editingJob.tags,
          contactDetails: editingJob.contactDetails || { name: '', email: '', phone: '', role: '' },
          source: editingJob.source as 'linkedin' | 'indeed' | 'company-website' | 'referral' | 'other' | undefined,
          createdAt: editingJob.createdAt,
          updatedAt: editingJob.updatedAt
        } : null}
        userId={userId || ''}
      />

      {showModal && selectedJob && (
        <JobSidebar
          job={selectedJob}
          journeys={getJobJourneys(selectedJob.id)}
          onClose={handleCloseModal}
          onRefresh={loadData}
        />
      )}

      <JobParserDialog
        isOpen={showJobParserDialog}
        onClose={() => setShowJobParserDialog(false)}
        onParseComplete={handleParseComplete}
      />

      {showPaywall && paywallInfo && (
        <JobCreationPaywall
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          currentCount={paywallInfo.currentCount}
          limit={paywallInfo.limit}
        />
      )}

      {/* Download Modal */}
      {showDownloadModal && downloadJobId && (
        <DownloadModal
          isOpen={showDownloadModal}
          onClose={() => {
            setShowDownloadModal(false);
            setDownloadJobId(null);
          }}
          onDownload={(docType, format) => {
            // The modal handles the UI state for downloading.
            // Typically we'd trigger a download service here if not handled within modal.
            // Looking at DownloadModal.tsx, it calls `onDownload(selectedDocument, selectedFormat)`.
            // We need to implement the actual download logic or confirm if DownloadModal does it.
            // Wait, DownloadModal just exposes the selection. We need to trigger the download.
            // But existing implementations might have the logic.
            // Let's import the download logic or service if needed?
            // Actually, `DownloadModal` in `src/components/ui/DownloadModal.tsx` just calls the prop.
            // So we need to implement the download logic here.
            // Let's use `window.location.href` or similar for now, or assume we need to implement it.
            // BUT simpler: reuse the logic from `JourneyTimelineCard` or similar if available.
            // For now I'll just close it and log, or better, implement a basic fetch to the download endpoint.
            // The endpoint is likely `/api/download`.

            const journey = getJobJourneys(downloadJobId).find(j => j.id);
            if (!journey) return;

            // Construct download URL
            const baseUrl = '/api/download';
            const params = new URLSearchParams();

            if (journey.cvId) params.append('cvId', journey.cvId);
            if (journey.coverLetterId) params.append('coverLetterId', journey.coverLetterId);
            params.append('type', docType);
            params.append('format', format);

            // Trigger download
            window.open(`${baseUrl}?${params.toString()}`, '_blank');
            setShowDownloadModal(false);
          }}
          cvId={getJobJourneys(downloadJobId).find(j => j.cvId)?.cvId}
          coverLetterId={getJobJourneys(downloadJobId).find(j => j.coverLetterId)?.coverLetterId}
        />
      )}

    </React.Fragment>
  );
};

export default JobsTracker;

