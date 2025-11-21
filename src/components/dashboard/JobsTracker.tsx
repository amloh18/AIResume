'use client';

import React, { useState, useEffect, useRef } from 'react';
// Force HMR update
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, Trash2, Columns3, List } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
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
import SkillGapAnalysisSidebar from './jobs/SkillGapAnalysisSidebar';
import { useJobsPersistence } from '@/lib/hooks/useJobsPersistence';
import { useJobsKeyboardShortcuts } from '@/lib/hooks/useJobsKeyboardShortcuts';
import { useFocusMode } from '@/lib/hooks/useFocusMode';
import { useDebounce } from '@/hooks/useDebounce';

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
  const searchParams = useSearchParams();
  const cvId = searchParams.get('cvId');

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
  const [skillGapAnalysisOpen, setSkillGapAnalysisOpen] = useState(false);
  const [selectedJobForAnalysis, setSelectedJobForAnalysis] = useState<JobApplication | null>(null);

  // Use persistence hook
  const { preferences, savePreferences } = useJobsPersistence();

  // Focus mode
  const { isFocusMode, toggleFocusMode } = useFocusMode();

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
  const [creditInfo, setCreditInfo] = useState<{ creditsRemaining: number; limit: number; resetTime?: Date } | null>(null);
  const [zoomedStage, setZoomedStage] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

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
        const transformedJobs = jobsResult.data.jobs.map((job: any) => ({
          id: job.id,
          _id: job.id,
          userId: job.userId,
          jobTitle: job.jobTitle,
          title: job.jobTitle,
          company: job.company,
          status: job.status,
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
        }));
        setJobs(transformedJobs);
      }

      // Load CV journeys
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

  // Group jobs by status
  const jobsByStatus = {
    draft: filteredJobsForView.filter(job => job.status === 'draft'),
    created: filteredJobsForView.filter(job => job.status === 'created'),
    applied: filteredJobsForView.filter(job => job.status === 'applied'),
    interview: filteredJobsForView.filter(job => job.status === 'interview'),
    offer: filteredJobsForView.filter(job => job.status === 'offer'),
    rejected: filteredJobsForView.filter(job => job.status === 'rejected')
  };

  // Handlers
  const handleAddJob = () => {
    setEditingJob(null);
    setShowAddJobModal(true);
  };

  const handleQuickAdd = () => {
    setShowJobParserDialog(true);
  };

  const handleParseComplete = async (parsedData: any, status: 'draft' | 'created') => {
    try {
      // Map parsed data to EditJobSidebar format
      // Preserve the selected status (draft or created)
      const mappedStatus = status;

      // Convert deadline Date to string if present
      let deadlineString: string | undefined = undefined;
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
          // Leave deadlineString as undefined if parsing fails
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
          priority: 'medium' as const,
          status: mappedStatus as 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn',
          deadline: deadlineString,
          applicationDate: undefined,
          sponsorship: 'unknown' as const,
          tags: parsedData.tags || [],
          salary: parsedData.salary || undefined,
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
      // Update job status to 'created'
      const response = await fetch(`/api/jobs/${job.id || job._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'created'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update job status');
      }

      // Create journey
      const journeyResponse = await fetch('/api/application-journey', {
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
        throw new Error('Failed to create journey');
      }

      // Refresh data
      await loadData();
    } catch (error) {
      console.error('Error creating journey:', error);
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

  // Drag and drop handlers
  const isJobDraggable = (job: JobApplication) => {
    return job.status !== 'draft' && job.status !== 'created';
  };

  const isDraggableStage = (stage: string) => {
    return stage !== 'draft' && stage !== 'created';
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
      .then(response => {
        if (!response.ok) {
          setJobs(prevJobs =>
            prevJobs.map(j =>
              j.id === currentDraggedJob ? { ...j, status: originalStatus } : j
            )
          );
          toast.error('Failed to update job status. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error updating job status:', error);
        setJobs(prevJobs =>
          prevJobs.map(j =>
            j.id === currentDraggedJob ? { ...j, status: originalStatus } : j
          )
        );
        toast.error('Failed to update job status. Please try again.');
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
          <div className="flex-shrink-0 w-full px-4 sm:px-6">
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
            />
          </div>

          {/* CV Context Banner - Fixed Width Container */}
          {cvContext && (
            <div className="flex-shrink-0 w-full px-4 sm:px-6">
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
                      window.history.replaceState({}, '', '/dashboard/jobs');
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
          <div className="flex-shrink-0 w-full px-4 sm:px-6">
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
          <div className="flex-shrink-0 w-full px-4 sm:px-6">
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
            <div className="absolute inset-x-0 top-0 bottom-0 mt-4 px-4 sm:px-6 pb-6 overflow-x-auto overflow-y-hidden">
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
                    onSkillGapAnalysis={(job) => {
                      setSelectedJobForAnalysis(job);
                      setSkillGapAnalysisOpen(true);
                    }}
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

      {showPaywall && creditInfo && (
        <JobCreationPaywall
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          creditsRemaining={creditInfo.creditsRemaining}
          limit={creditInfo.limit}
        />
      )}

      {/* Skill Gap Analysis Sidebar */}
      {selectedJobForAnalysis && (
        <SkillGapAnalysisSidebar
          isOpen={skillGapAnalysisOpen}
          onClose={() => {
            setSkillGapAnalysisOpen(false);
            setSelectedJobForAnalysis(null);
          }}
          jobId={selectedJobForAnalysis.id || selectedJobForAnalysis._id}
          jobTitle={selectedJobForAnalysis.jobTitle || selectedJobForAnalysis.title}
          company={selectedJobForAnalysis.company}
        />
      )}

    </React.Fragment>
  );
};

export default JobsTracker;

