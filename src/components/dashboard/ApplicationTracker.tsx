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
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import PageHeader from './PageHeader';
import ApplicationJourneyModal from './ApplicationJourneyModal';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import toast from 'react-hot-toast';

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
  const { data: session } = useSession();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const searchParams = useSearchParams();
  const cvId = searchParams.get('cvId'); // Get CV ID from URL params
  
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [journeys, setJourneys] = useState<CVJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'status' | 'priority'>('date');
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [draggedJob, setDraggedJob] = useState<string | null>(null);
  const [showJourneyTemplates, setShowJourneyTemplates] = useState(false);
  const [cvContext, setCvContext] = useState<any>(null); // Store CV context when navigating from CV card

  // Load data on component mount
  useEffect(() => {
    if (session?.user?.id) {
      loadData();
    }
  }, [session?.user?.id]);

  // Load CV context if cvId is provided
  useEffect(() => {
    if (cvId && session?.user?.id) {
      loadCVContext(cvId);
    }
  }, [cvId, session?.user?.id]);

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
      const userId = session?.user?.id;
      
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
      const journeysResponse = await authenticatedFetch(`/api/cv-journey?userId=${userId}&cleanup=true`);
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
    if (!journey.steps || journey.steps.length === 0) {
      return 0;
    }
    
    const completedSteps = journey.steps.filter(step => step.status === 'completed').length;
    const totalSteps = journey.steps.length;
    
    return Math.round((completedSteps / totalSteps) * 100);
  };

  // Get journey status text
  const getJourneyStatusText = (jobJourneys: CVJourney[]) => {
    if (jobJourneys.length === 0) return 'No CV Journeys Started';
    if (jobJourneys.length === 1) {
      const journey = jobJourneys[0];
      if (journey.status === 'completed') return '1 Ready to Apply';
      return '1 CV Journey Active';
    }
    const completedCount = jobJourneys.filter(j => j.status === 'completed').length;
    const activeCount = jobJourneys.filter(j => j.status === 'in-progress').length;
    
    if (completedCount > 0 && activeCount > 0) {
      return `${completedCount} Ready, ${activeCount} Active`;
    } else if (completedCount > 0) {
      return `${completedCount} Ready to Apply`;
    } else {
      return `${activeCount} CV Journeys Active`;
    }
  };

  // Enhanced filtering and sorting
  const filteredAndSortedJobs = React.useMemo(() => {
    let filtered = jobs.filter(job => {
      const matchesSearch = job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job.location?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    // Sort jobs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'company':
          return a.company.localeCompare(b.company);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'priority':
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [jobs, searchQuery, filterStatus, sortBy]);

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
    window.location.href = '/dashboard/pipeline';
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, jobId: string) => {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-2"></div>
        <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-6"></div>
        <div className="grid grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Application Tracker"
        description="Manage your job applications with integrated CV journeys"
        user={{
          name: session?.user?.name || session?.user?.firstName || 'User',
          email: session?.user?.email || 'user@example.com'
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
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} />
              Add Job
            </motion.button>
            
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs, companies, locations... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Search jobs"
                role="searchbox"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <motion.button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'kanban' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Kanban
              </motion.button>
              <motion.button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                List
              </motion.button>
            </div>

            {/* Filter Button */}
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showFilters 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
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
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {selectedJobs.size} job{selectedJobs.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => {
                      setSelectedJobs(new Set());
                      setShowBulkActions(false);
                    }}
                    className="text-blue-500 hover:text-blue-600 text-sm"
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
          className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4"
        >
          {/* Status Filters */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</h4>
            <div className="flex flex-wrap gap-2">
              {['all', 'created', 'applied', 'interview', 'offer', 'rejected'].map((status) => (
                <motion.button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'date', label: 'Date Created', icon: Calendar },
                { key: 'company', label: 'Company', icon: Building2 },
                { key: 'status', label: 'Status', icon: Target },
                { key: 'priority', label: 'Priority', icon: Star }
              ].map(({ key, label, icon: Icon }) => (
                <motion.button
                  key={key}
                  onClick={() => setSortBy(key as any)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    sortBy === key
                      ? 'bg-green-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon size={12} />
                  {label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-500">{jobsByStatus.created.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Created</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">{jobsByStatus.applied.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Applied</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-500">{jobsByStatus.interview.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Interview</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-500">{jobsByStatus.offer.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Offer</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-500">{jobsByStatus.rejected.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Rejected</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Enhanced Kanban Board */}
      <div className={`grid gap-4 ${
        viewMode === 'kanban' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' 
          : 'grid-cols-1'
      }`}>
        {viewMode === 'kanban' ? (
          [
            { status: 'created', title: 'Created', color: 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' },
            { status: 'applied', title: 'Applied', color: 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' },
            { status: 'interview', title: 'Interview', color: 'bg-purple-100 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700' },
            { status: 'offer', title: 'Offer', color: 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700' },
            { status: 'rejected', title: 'Rejected', color: 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700' }
          ].map((stage) => (
          <div key={stage.status} className="space-y-4">
            {/* Stage Header */}
            <div className={`p-3 rounded-lg border ${stage.color}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">{stage.title}</h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {jobsByStatus[stage.status as keyof typeof jobsByStatus].length}
                </span>
              </div>
            </div>

            {/* Job Cards */}
            <div className="space-y-3">
              {jobsByStatus[stage.status as keyof typeof jobsByStatus].map((job) => {
                const jobJourneys = getJobJourneys(job.id);
                const journeyStatusText = getJourneyStatusText(jobJourneys);
                const avgProgress = jobJourneys.length > 0 
                  ? Math.round(jobJourneys.reduce((sum, journey) => sum + getJourneyProgress(journey), 0) / jobJourneys.length)
                  : 0;
                const isSelected = selectedJobs.has(job.id);
                const isDragging = draggedJob === job.id;

                return (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={(e: React.DragEvent) => handleDragStart(e, job.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.status)}
                    onClick={() => handleJobClick(job)}
                    className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ${
                      isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                    } ${isDragging ? 'opacity-50' : ''}`}
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
                             <input
                               type="checkbox"
                               checked={isSelected}
                               onChange={(e) => {
                                 e.stopPropagation();
                                 handleSelectJob(job.id);
                               }}
                               className="w-4 h-4 text-blue-600 bg-white/50 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700/50 dark:border-gray-600"
                             />
                             <div className="flex-1 min-w-0">
                               <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                 {job.jobTitle}
                               </h4>
                               <p className="text-gray-600 dark:text-gray-400 text-xs truncate">{job.company}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             {/* Hover indicator */}
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                               <ChevronDown size={12} className="text-gray-400" />
                             </div>
                           </div>
                         </div>
                         
                         {/* Progress Bar - Hidden on Hover */}
                         <div className="w-full bg-white/30 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden group-hover:h-0 group-hover:opacity-0 transition-all duration-300">
                           {jobJourneys.length > 0 ? (
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
                           ) : (
                             <div className="h-2 w-0 rounded-full bg-gray-400/50" />
                           )}
                         </div>
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
              })}
            </div>
          </div>
        ))
        ) : (
          /* List View */
          <div className="space-y-4">
            {filteredAndSortedJobs.map((job) => {
              const jobJourneys = getJobJourneys(job.id);
              const journeyStatusText = getJourneyStatusText(jobJourneys);
              const avgProgress = jobJourneys.length > 0 
                ? Math.round(jobJourneys.reduce((sum, journey) => sum + getJourneyProgress(journey), 0) / jobJourneys.length)
                : 0;
              const isSelected = selectedJobs.has(job.id);

              return (
                <motion.div
                  key={job.id}
                  onClick={() => handleJobClick(job)}
                  className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ${
                    isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                  }`}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  layout
                >
                  {/* Glass Morphism Background */}
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-white/20 dark:border-gray-700/50 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300" />
                  
                  {/* Card Content */}
                  <div className="relative z-10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectJob(job.id);
                          }}
                          className="w-4 h-4 text-blue-600 bg-white/50 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700/50 dark:border-gray-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {job.jobTitle}
                            </h4>
                            {job.priority === 'high' && (
                              <Star size={14} className="text-red-500 fill-current" />
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-xs">{job.company}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          {job.location && (
                            <div className="flex items-center gap-1">
                              <MapPin size={12} />
                              <span className="hidden sm:inline">{job.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Target size={12} />
                            <span>{journeyStatusText}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.status === 'created' ? 'bg-yellow-100/80 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            job.status === 'applied' ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            job.status === 'interview' ? 'bg-purple-100/80 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                            job.status === 'offer' ? 'bg-green-100/80 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-red-100/80 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                      </div>
                      {jobJourneys.length > 0 && (
                        <div className="ml-4">
                          <div className="w-16 bg-white/30 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden">
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
                          <div className="text-xs text-gray-500 text-center mt-1">{avgProgress}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Application Journey Modal */}
      {showModal && selectedJob && (
        <ApplicationJourneyModal
          job={selectedJob}
          journeys={getJobJourneys(selectedJob.id)}
          onClose={handleCloseModal}
          onRefresh={loadData}
        />
      )}
    </div>
  );
};

export default ApplicationTracker;
