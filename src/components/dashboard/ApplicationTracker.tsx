'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Plus, Search, Filter, MoreVertical, 
  Calendar, MapPin, DollarSign, Eye, Edit, Trash2,
  CheckCircle, Clock, AlertCircle, Target, FileText,
  ArrowRight, ChevronDown, ChevronUp, Star, Zap,
  TrendingUp, Users, Building2, Globe, Bookmark,
  Archive, Copy, Share2, Download, Upload
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import PageHeader from './PageHeader';
import ApplicationJourneyModal from './ApplicationJourneyModal';
import AddEditJobModal from '@/components/modals/AddEditJobModal';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import toast from 'react-hot-toast';
import { useOptimizedDataFetching } from '@/lib/hooks/useOptimizedDataFetching';
import { ApplicationTrackerSkeleton } from '@/components/ui/OptimizedSkeletons';
import { formatCardTime } from '@/lib/utils/timeUtils';

interface JobApplication {
  id: string;
  _id: string;
  userId: string;
  jobTitle: string;
  title?: string; // For compatibility
  company: string;
  status: 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  jobDescription?: string;
  description?: string; // For compatibility
  location?: string;
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
  createdAt: string;
  updatedAt: string;
}

interface CVJourney {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'in-progress' | 'completed' | 'paused';
  currentStep: number;
  totalSteps: number;
  cvId?: string;
  coverLetterId?: string;
  atsScore?: number;
  steps: Array<{
    stepId: number;
    name: string;
    status: 'pending' | 'active' | 'completed';
    completedAt?: Date;
    data?: any;
  }>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt: Date;
    completedAt?: Date;
    tags?: string[];
    notes?: string;
  };
}

const ApplicationTracker: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData, loading: userLoading, error: userError } = useUserData();
  const searchParams = useSearchParams();
  const cvId = searchParams.get('cvId'); // Get CV ID from URL params
  
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
  const [zoomedStage, setZoomedStage] = useState<string | null>(null);

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
      const jobsResponse = await authenticatedFetch(`/api/jobs?userId=${userId}`);
      const jobsResult = await jobsResponse.json();
      if (jobsResult.success) {
        // Transform jobs to match our interface
        const transformedJobs = jobsResult.data.jobs.map((job: any) => ({
          id: job.id,
          _id: job.id,
          userId: job.userId,
          jobTitle: job.jobTitle,
          title: job.jobTitle, // For compatibility
          company: job.company,
          status: job.status,
          jobDescription: job.jobDescription,
          description: job.jobDescription, // For compatibility
          location: job.location,
          salary: job.salary,
          jobType: job.type,
          type: job.type, // For compatibility
          source: job.source,
          postedDate: job.postedDate,
          applicationDate: job.applicationDate,
          deadline: job.deadline,
          priority: job.priority || 'medium',
          notes: job.notes,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        }));
        setJobs(transformedJobs);
      }

      // Load CV journeys using cv-journey API with cleanup
      const journeysResponse = await authenticatedFetch(`/api/application-journey?userId=${userId}&cleanup=true`);
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
    
    // If journey is paused, return current progress
    if (journey.status === 'paused') {
      const completedSteps = journey.steps?.filter(step => step.status === 'completed').length || 0;
      const totalSteps = journey.steps?.length || 5;
      return Math.round((completedSteps / totalSteps) * 100);
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
  const getJourneyStatusText = (jobJourneys: CVJourney[]) => {
    if (jobJourneys.length === 0) return 'No CV Journeys Started';
    if (jobJourneys.length === 1) {
      const journey = jobJourneys[0];
      if (journey.status === 'completed') return '1 Ready to Apply';
      if (journey.status === 'paused') return '1 CV Journey Paused';
      return '1 CV Journey Active';
    }
    const completedCount = jobJourneys.filter(j => j.status === 'completed').length;
    const activeCount = jobJourneys.filter(j => j.status === 'in-progress').length;
    const pausedCount = jobJourneys.filter(j => j.status === 'paused').length;
    
    if (completedCount > 0 && activeCount > 0) {
      return `${completedCount} Ready, ${activeCount} Active`;
    } else if (completedCount > 0 && pausedCount > 0) {
      return `${completedCount} Ready, ${pausedCount} Paused`;
    } else if (completedCount > 0) {
      return `${completedCount} Ready to Apply`;
    } else if (pausedCount > 0 && activeCount > 0) {
      return `${activeCount} Active, ${pausedCount} Paused`;
    } else if (pausedCount > 0) {
      return `${pausedCount} CV Journeys Paused`;
    } else {
      return `${activeCount} CV Journeys Active`;
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

  // Group jobs by status
  const jobsByStatus = {
    created: filteredAndSortedJobs.filter(job => job.status === 'created'),
    applied: filteredAndSortedJobs.filter(job => job.status === 'applied'),
    interview: filteredAndSortedJobs.filter(job => job.status === 'interview'),
    offer: filteredAndSortedJobs.filter(job => job.status === 'offer'),
    rejected: filteredAndSortedJobs.filter(job => job.status === 'rejected')
  };

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
        const visibleJobIds = filteredAndSortedJobs.map(job => job.id);
        setSelectedJobs(new Set(visibleJobIds));
        setShowBulkActions(visibleJobIds.length > 0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, filteredAndSortedJobs]);

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
    // Map JobApplication to Job interface for the modal
    const jobForModal = {
      id: job.id,
      jobTitle: job.jobTitle || job.title,
      company: job.company,
      location: job.location,
      jobDescription: job.jobDescription || job.description,
      notes: job.notes,
      priority: job.priority,
      status: job.status,
      deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
      applicationDate: job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : '',
      salary: job.salary,
      // Add other fields as needed
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
    return ['applied', 'interview', 'offer', 'rejected'].includes(stage);
  };

  // Helper function to check if a job can be dragged
  const isJobDraggable = (job: JobApplication) => {
    return isDraggableStage(job.status);
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

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedJob) return;

    // Validate that target stage allows drops
    if (!isDraggableStage(newStatus)) {
      setDraggedJob(null);
      return;
    }

    const job = jobs.find(j => j.id === draggedJob);
    if (!job || !isJobDraggable(job)) {
      setDraggedJob(null);
      return;
    }

    try {
      // Update job status
      const response = await authenticatedFetch(`/api/jobs/${draggedJob}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setJobs(prevJobs => 
          prevJobs.map(job => 
            job.id === draggedJob ? { ...job, status: newStatus as any } : job
          )
        );
      }
    } catch (error) {
      console.error('Error updating job status:', error);
    } finally {
      setDraggedJob(null);
    }
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
        authenticatedFetch(`/api/jobs/${jobId}`, {
          method: 'PUT',
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
        authenticatedFetch(`/api/jobs/${jobId}`, {
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
    <div className="space-y-6">
      {/* Page Header - Always show immediately */}
      <PageHeader
        title="Application Tracker"
        description="Manage your job applications with integrated CV journeys"
        user={{
          name: getUserDisplayName(userData),
          email: getUserEmail(userData),
          username: userData?.username || '',
          profilePhoto: getUserAvatar(userData),
          designation: userData?.role || '',
          role: user?.role,
          subscription: userData?.subscription
        }}
        showSettings={true}
        onMobileMenuToggle={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* CV Context Banner */}
      {cvContext && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Working with CV: {cvContext.title}
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Create or continue application journeys for this CV
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                // Clear CV context and remove URL parameter
                setCvContext(null);
                window.history.replaceState({}, '', '/dashboard/application-tracker');
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
            >
              Clear Context
            </button>
          </div>
        </motion.div>
      )}


      {/* Enhanced Action Bar */}
      <div className="space-y-4">
        {/* Top Row */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <motion.button
              onClick={handleAddJob}
              className="px-4 py-2 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} />
              Add Job
            </motion.button>
            
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
              <input
                type="text"
                placeholder="Search jobs, companies, locations... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-700 dark:bg-white/10 backdrop-blur-md border border-gray-600 dark:border-white/20 text-white placeholder-white/80 dark:placeholder-white/60 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-600 dark:focus:bg-white/20 transition-all duration-200"
                aria-label="Search jobs"
                role="searchbox"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-800 dark:bg-white/10 backdrop-blur-md border border-gray-700 dark:border-white/20 rounded-lg p-1">
              <motion.button
                onClick={() => handleViewModeChange('kanban')}
                disabled={isLoadingViewMode}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'kanban' 
                    ? 'bg-gray-700 dark:bg-white/20 text-white shadow-sm' 
                    : 'text-white/60 hover:text-white/80'
                } ${isLoadingViewMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                whileHover={isLoadingViewMode ? {} : { scale: 1.02 }}
                whileTap={isLoadingViewMode ? {} : { scale: 0.98 }}
              >
                Kanban
              </motion.button>
              <motion.button
                onClick={() => handleViewModeChange('list')}
                disabled={isLoadingViewMode}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-gray-700 dark:bg-white/20 text-white shadow-sm' 
                    : 'text-white/60 hover:text-white/80'
                } ${isLoadingViewMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                whileHover={isLoadingViewMode ? {} : { scale: 1.02 }}
                whileTap={isLoadingViewMode ? {} : { scale: 0.98 }}
              >
                List
              </motion.button>
            </div>

            {/* Filter Button */}
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showFilters 
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' 
                  : 'bg-gray-600 dark:bg-white/10 backdrop-blur-md border border-gray-500 dark:border-white/20 text-white/60 hover:text-white hover:bg-gray-700 dark:hover:bg-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Filter size={16} />
              Filter
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
              className="bg-blue-600 dark:bg-blue-500/10 backdrop-blur-md border border-blue-700 dark:border-blue-500/20 rounded-lg p-4 text-white"
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
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>Update Status</option>
                    <option value="created">Created</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <motion.button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-1"
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

      {/* Enhanced Filter Options */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-700 dark:bg-white/10 backdrop-blur-md border border-gray-600 dark:border-white/20 rounded-lg p-4 space-y-4 text-white"
        >
          {/* Application-Specific Metrics Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Last Updated Filter */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Last Updated</label>
              <select
                value={lastUpdatedFilter}
                onChange={(e) => setLastUpdatedFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-600 dark:bg-white/10 backdrop-blur-md border border-gray-500 dark:border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-500 dark:focus:bg-white/20 transition-all duration-200"
              >
                <option value="all" className="bg-gray-800 text-white">All Time</option>
                <option value="today" className="bg-gray-800 text-white">Today</option>
                <option value="last7days" className="bg-gray-800 text-white">Last 7 Days</option>
                <option value="last30days" className="bg-gray-800 text-white">Last 30 Days</option>
              </select>
            </div>

            {/* Follow-Up Date Filter */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Follow-Up Status</label>
              <select
                value={followUpFilter}
                onChange={(e) => setFollowUpFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/90 dark:bg-white/10 backdrop-blur-md border border-gray-300 dark:border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 focus:bg-white/95 dark:focus:bg-white/20 transition-all duration-200"
              >
                <option value="all" className="bg-gray-800 text-white">All</option>
                <option value="upcoming" className="bg-gray-800 text-white">Upcoming (Next 7 Days)</option>
                <option value="overdue" className="bg-gray-800 text-white">Overdue</option>
              </select>
            </div>

            {/* Salary Range Filter */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Salary Range</label>
              <select
                value={salaryRangeFilter}
                onChange={(e) => setSalaryRangeFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/90 dark:bg-white/10 backdrop-blur-md border border-gray-300 dark:border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-white/95 dark:focus:bg-white/20 transition-all duration-200"
              >
                <option value="all" className="bg-gray-800 text-white">All Salaries</option>
                <option value="under50k" className="bg-gray-800 text-white">Under $50k</option>
                <option value="50k-75k" className="bg-gray-800 text-white">$50k - $75k</option>
                <option value="75k-100k" className="bg-gray-800 text-white">$75k - $100k</option>
                <option value="100k-150k" className="bg-gray-800 text-white">$100k - $150k</option>
                <option value="150k-200k" className="bg-gray-800 text-white">$150k - $200k</option>
                <option value="over200k" className="bg-gray-800 text-white">Over $200k</option>
              </select>
            </div>

            {/* Priority Level Filter */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Priority Level</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/90 dark:bg-white/10 backdrop-blur-md border border-gray-300 dark:border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 focus:bg-white/95 dark:focus:bg-white/20 transition-all duration-200"
              >
                <option value="all" className="bg-gray-800 text-white">All Priorities</option>
                <option value="high" className="bg-gray-800 text-white">High Priority</option>
                <option value="medium" className="bg-gray-800 text-white">Medium Priority</option>
                <option value="low" className="bg-gray-800 text-white">Low Priority</option>
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/90 dark:bg-white/10 backdrop-blur-md border border-gray-300 dark:border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 focus:bg-white/95 dark:focus:bg-white/20 transition-all duration-200"
              >
                <option value="lastUpdated" className="bg-gray-800 text-white">Last Updated</option>
                <option value="followUpDate" className="bg-gray-800 text-white">Follow-Up Date</option>
                <option value="salaryRange" className="bg-gray-800 text-white">Salary Range</option>
                <option value="priority" className="bg-gray-800 text-white">Priority Level</option>
              </select>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-white/20">
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">{jobsByStatus.created.length}</div>
              <div className="text-xs text-white/60">Created</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{jobsByStatus.applied.length}</div>
              <div className="text-xs text-white/60">Applied</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-400">{jobsByStatus.interview.length}</div>
              <div className="text-xs text-white/60">Interview</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{jobsByStatus.offer.length}</div>
              <div className="text-xs text-white/60">Offer</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">{jobsByStatus.rejected.length}</div>
              <div className="text-xs text-white/60">Rejected</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Enhanced Kanban Board */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={zoomedStage || 'all-stages'}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={`grid gap-4 ${
            viewMode === 'kanban' 
              ? zoomedStage 
                ? 'grid-cols-1' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
              : 'grid-cols-1'
          }`}
        >
          {viewMode === 'kanban' ? (
          (zoomedStage 
            ? [
                { status: zoomedStage, title: zoomedStage.charAt(0).toUpperCase() + zoomedStage.slice(1), color: 
                  zoomedStage === 'created' ? 'bg-purple-600 dark:bg-purple-500/20 border-purple-700 dark:border-purple-500/30 text-white' :
                  zoomedStage === 'applied' ? 'bg-blue-600 dark:bg-blue-500/20 border-blue-700 dark:border-blue-500/30 text-white' :
                  zoomedStage === 'interview' ? 'bg-orange-600 dark:bg-orange-500/20 border-orange-700 dark:border-orange-500/30 text-white' :
                  zoomedStage === 'offer' ? 'bg-green-600 dark:bg-green-500/20 border-green-700 dark:border-green-500/30 text-white' :
                  'bg-red-600 dark:bg-red-500/20 border-red-700 dark:border-red-500/30 text-white'
                }
              ]
            : [
                { status: 'created', title: 'Created', color: 'bg-purple-600 dark:bg-purple-500/20 border-purple-700 dark:border-purple-500/30 text-white' },
                { status: 'applied', title: 'Applied', color: 'bg-blue-600 dark:bg-blue-500/20 border-blue-700 dark:border-blue-500/30 text-white' },
                { status: 'interview', title: 'Interview', color: 'bg-orange-600 dark:bg-orange-500/20 border-orange-700 dark:border-orange-500/30 text-white' },
                { status: 'offer', title: 'Offer', color: 'bg-green-600 dark:bg-green-500/20 border-green-700 dark:border-green-500/30 text-white' },
                { status: 'rejected', title: 'Rejected', color: 'bg-red-600 dark:bg-red-500/20 border-red-700 dark:border-red-500/30 text-white' }
              ]
          ).map((stage) => (
          <div key={stage.status} className="space-y-4">
            {/* Stage Header */}
            <div 
              className={`p-3 rounded-xl border-2 border-dashed ${stage.color} min-h-[60px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-200`}
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
                    stage.status === 'created' ? 'text-purple-400' :
                    stage.status === 'applied' ? 'text-blue-400' :
                    stage.status === 'interview' ? 'text-orange-400' :
                    stage.status === 'offer' ? 'text-green-400' :
                    'text-red-400'
                  }`}>{stage.title}</h3>
                </div>
                <span className={`text-sm ${
                  stage.status === 'created' ? 'text-purple-400' :
                  stage.status === 'applied' ? 'text-blue-400' :
                  stage.status === 'interview' ? 'text-orange-400' :
                  stage.status === 'offer' ? 'text-green-400' :
                  'text-red-400'
                }`}>
                  {jobsByStatus[stage.status as keyof typeof jobsByStatus].length}
                </span>
              </div>
            </div>

            {/* Drop Zone */}
            <div 
              className={`min-h-[100px] rounded-xl border-2 border-dashed border-transparent transition-all duration-300 ${
                draggedJob && isDraggableStage(stage.status) ? 'border-blue-400 bg-blue-400/10' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.status)}
            >
              {/* Job Cards */}
              <div className={zoomedStage ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
              {loading ? (
                // Show skeleton loading for job cards
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-widget-premium rounded-xl p-4 animate-pulse">
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
              ) : (
                jobsByStatus[stage.status as keyof typeof jobsByStatus].map((job) => {
                const jobJourneys = getJobJourneys(job.id);
                const journeyStatusText = getJourneyStatusText(jobJourneys);
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
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.status)}
                    onClick={() => handleJobClick(job)}
                    className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ${
                      isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                    } ${isDragging ? 'opacity-50' : ''} ${
                      !canDrag ? 'opacity-60 cursor-not-allowed' : ''
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
                    {/* Glass Morphism Background */}
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-white/20 dark:border-gray-700/50 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300" />
                    
                    {/* Card Content */}
                    <div className="relative z-10 p-4">
                       {/* Collapsed View - Always Visible */}
                       <div className="space-y-3">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3 flex-1 min-w-0">
                             <div className="flex-1 min-w-0">
                               <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                 {job.jobTitle}
                               </h4>
                               <p className="text-gray-600 dark:text-gray-400 text-xs truncate">{job.company}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             {/* Journey completion indicator */}
                             {jobJourneys.length > 0 && (() => {
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
                             })()}
                             
                             {/* Hover indicator */}
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                               <ChevronDown size={12} className="text-gray-400" />
                             </div>
                           </div>
                         </div>
                         
                         {/* Progress Bar - Only show if job has journeys */}
                         {jobJourneys.length > 0 && (
                           <div className="w-full bg-white/30 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden group-hover:h-0 group-hover:opacity-0 transition-all duration-300">
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
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                            <Calendar size={12} />
                            <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/20 dark:border-gray-600/50"></div>

                        {/* Journey Status */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Target size={12} />
                              <span>{journeyStatusText}</span>
                            </div>
                            {jobJourneys.length > 0 && (
                              <div className="flex items-center gap-1">
                                {jobJourneys.map((journey, index) => (
                                  <div
                                    key={journey.id}
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
                              <div className="w-full bg-white/30 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden">
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

                          {/* Action Button */}
                          <motion.button
                            className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-blue-500/80 to-blue-600/80 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-sm"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Eye size={12} />
                            Manage Applications
                            <ArrowRight size={12} />
                          </motion.button>
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
        ))
        ) : (
          /* List View */
          <div className="frosted-glass-widget rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-white/80 font-medium">Company</th>
                    <th className="px-4 py-3 text-left text-white/80 font-medium">Role/Title</th>
                    <th className="px-4 py-3 text-left text-white/80 font-medium">Stage</th>
                    <th className="px-4 py-3 text-left text-white/80 font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-white/80 font-medium">Location</th>
                    <th className="px-4 py-3 text-left text-white/80 font-medium">Journey Status</th>
                    <th className="px-4 py-3 text-left text-white/80 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedJobs.map((job) => {
                    const jobJourneys = getJobJourneys(job.id);
                    const journeyStatusText = getJourneyStatusText(jobJourneys);
                    const avgProgress = jobJourneys.length > 0 
                      ? Math.round(jobJourneys.reduce((sum, journey) => sum + getJourneyProgress(journey), 0) / jobJourneys.length)
                      : 0;

                    return (
                      <motion.tr
                        key={job.id}
                        className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => handleJobClick(job)}
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      >
                        <td className="px-4 py-3 text-white font-medium">{job.company || 'Unknown Company'}</td>
                        <td className="px-4 py-3 text-white/80">{job.jobTitle || 'Untitled Job'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            job.status === 'created' ? 'bg-purple-500/20 text-purple-400' :
                            job.status === 'applied' ? 'bg-blue-500/20 text-blue-400' :
                            job.status === 'interview' ? 'bg-orange-500/20 text-orange-400' :
                            job.status === 'offer' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/60 text-sm">
                          {job.status === 'created' ? (job.createdAt ? formatCardTime(job.createdAt) : '-') :
                           job.status === 'applied' ? (job.applicationDate || job.createdAt ? formatCardTime(job.applicationDate || job.createdAt) : '-') :
                           job.status === 'interview' ? (job.applicationDate || job.createdAt ? formatCardTime(job.applicationDate || job.createdAt) : '-') :
                           (job.updatedAt || job.createdAt ? formatCardTime(job.updatedAt || job.createdAt) : '-')}
                        </td>
                        <td className="px-4 py-3 text-white/60 text-sm">{job.location || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-white/60 text-sm">{journeyStatusText}</span>
                            {jobJourneys.length > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-white/20 rounded-full h-2 overflow-hidden">
                                  <motion.div 
                                    className={`h-2 rounded-full transition-all duration-500 ${
                                      avgProgress >= 80 ? 'bg-green-400' :
                                      avgProgress >= 60 ? 'bg-blue-400' :
                                      avgProgress >= 40 ? 'bg-orange-400' :
                                      'bg-red-400'
                                    }`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${avgProgress}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                  />
                                </div>
                                <span className="text-white/60 text-xs font-medium">{avgProgress}%</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJobClick(job);
                              }}
                              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Eye size={14} />
                            </motion.button>
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditJob(job);
                              }}
                              className="p-1 text-white/60 hover:text-lime-400 hover:bg-lime-500/10 rounded transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Edit size={14} />
                            </motion.button>
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Add delete functionality here if needed
                              }}
                              className="p-1 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Trash2 size={14} />
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

      {/* Application Journey Modal */}
      {showModal && selectedJob && (
        <ApplicationJourneyModal
          job={selectedJob}
          journeys={getJobJourneys(selectedJob.id)}
          onClose={handleCloseModal}
          onRefresh={loadData}
        />
      )}

      {/* Add/Edit Job Modal */}
      <AddEditJobModal
        isOpen={showAddJobModal}
        onClose={() => {
          setShowAddJobModal(false);
          setEditingJob(null);
        }}
        onJobSaved={handleJobSaved}
        editingJob={editingJob}
        userId={userId || ''}
      />
    </div>
  );
};

export default ApplicationTracker;
