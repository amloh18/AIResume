'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { authenticatedFetch, authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { 
  X, Briefcase, MapPin, DollarSign, Calendar, ExternalLink,
  FileText, CheckCircle, Clock, AlertCircle, Plus, Edit, Trash2,
  Download, Eye, ArrowRight, ChevronDown, ChevronUp, Target,
  Sparkles, Zap, Star, Copy, Share2, Archive, Bookmark,
  TrendingUp, Users, Building2, Globe, Award, Lightbulb, Settings
} from 'lucide-react';
import JourneyTimelineCard from './JourneyTimelineCard';
import JobInfoContent from './JobInfoContent';
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

interface ApplicationJourneyModalProps {
  job: JobApplication;
  journeys: CVJourney[];
  onClose: () => void;
  onRefresh: () => void;
}

const ApplicationJourneyModal: React.FC<ApplicationJourneyModalProps> = ({
  job,
  journeys: initialJourneys,
  onClose,
  onRefresh
}) => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'job-info' | 'journey'>('job-info');
  const [journeyAnalytics, setJourneyAnalytics] = useState<any>(null);
  const [isCreatingJourney, setIsCreatingJourney] = useState(false);
  const [journeys, setJourneys] = useState<CVJourney[]>(initialJourneys);
  const [loadingJourneys, setLoadingJourneys] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Job editing states
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [editedJob, setEditedJob] = useState({
    jobUrl: job.jobUrl || '',
    jobDescription: job.jobDescription || job.description || '',
    sponsorship: job.sponsorship || 'unknown',
    salary: {
      min: job.salary?.min || '',
      max: job.salary?.max || '',
      currency: job.salary?.currency || 'USD',
      period: job.salary?.period || 'yearly'
    },
    status: job.status || 'created',
    priority: job.priority || 'medium',
    applicationDate: job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : '',
    deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
    notes: job.notes || '',
    tags: job.tags ? job.tags.join(', ') : ''
  });
  const [isSavingJob, setIsSavingJob] = useState(false);

  // Load journeys for this specific job when modal opens
  useEffect(() => {
    const loadJourneysForJob = async () => {
      if (!session?.user?.id || !job?.id) return;

      setLoadingJourneys(true);
      try {
        console.log('🔍 Loading journeys for job:', job.id);
        const response = await authenticatedFetchWithUserId(`/api/cv-journey?jobId=${job.id}`, session.user.id);
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

    loadJourneysForJob();
  }, [session?.user?.id, job?.id]);





  const handleCreateJourney = async () => {
    if (isCreatingJourney) return; // Prevent multiple clicks
    
    try {
      setIsCreatingJourney(true);
      
      // Get userId from session
      const userId = session?.user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      // Check if journey already exists for this job
      const existingJourney = journeys.find(j => j.jobId === job.id);
      
      if (existingJourney) {
        toast.info('A CV journey already exists for this job. You can continue with the existing journey.');
        return;
      }

      const response = await fetch('/api/cv-journey', {
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
          toast.info('CV journey already exists with current data');
        } else {
          toast.success('CV journey created successfully!');
        }
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

  const handleContinueJourney = (journey: CVJourney) => {
    // Navigate to studio with journey context using new URL structure
    const url = `/studio?journeyId=${journey.id}&type=cv&mode=cv-onboarding`;
    if (journey.cvId) {
      window.location.href = `${url}&cvId=${journey.cvId}`;
    } else {
      window.location.href = url;
    }
  };

  const handleApplyNow = (journey: CVJourney) => {
    // Mark as applied and move job to applied stage
    console.log('Applying with journey:', journey.id);
    // TODO: Implement apply functionality
  };

  const handleUpdateJourney = (journeyId: string, updates: Partial<CVJourney>) => {
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
      setIsDeleting(true);
      const userId = session?.user?.id;
      if (!userId) {
        console.error('No user ID available');
        return;
      }

      console.log('🔍 ApplicationJourneyModal - Deleting journey:', journeyId);
      
      // Call the CV Journey API to delete the journey
      const response = await fetch('/api/cv-journey', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId, userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
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

  const handleSaveJob = async () => {
    try {
      setIsSavingJob(true);
      const userId = session?.user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      console.log('🔍 ApplicationJourneyModal - Saving job data for job:', job.id);

      // Prepare the job data
      const jobData = {
        jobUrl: editedJob.jobUrl,
        jobDescription: editedJob.jobDescription,
        sponsorship: editedJob.sponsorship,
        salary: {
          min: editedJob.salary.min ? Number(editedJob.salary.min) : undefined,
          max: editedJob.salary.max ? Number(editedJob.salary.max) : undefined,
          currency: editedJob.salary.currency,
          period: editedJob.salary.period
        },
        status: editedJob.status,
        priority: editedJob.priority,
        applicationDate: editedJob.applicationDate ? new Date(editedJob.applicationDate) : undefined,
        deadline: editedJob.deadline ? new Date(editedJob.deadline) : undefined,
        notes: editedJob.notes,
        tags: editedJob.tags ? editedJob.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };

      const response = await fetch(`/api/jobs/${job.id}?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update job');
      }

      const result = await response.json();
      console.log('✅ ApplicationJourneyModal - Job updated successfully:', result);

      // Update local job object with the returned data
      const updatedJob = result.job || result;
      if (updatedJob) {
        Object.assign(job, updatedJob);
      }

      // Exit edit mode
      setIsEditingJob(false);
      
      // Show success message
      toast.success('Job updated successfully!');
      
    } catch (error) {
      console.error('❌ Error updating job:', error);
      toast.error('Failed to update job. Please try again.');
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleCancelEditJob = () => {
    setEditedJob({
      jobUrl: job.jobUrl || '',
      jobDescription: job.jobDescription || job.description || '',
      sponsorship: job.sponsorship || 'unknown',
      salary: {
        min: job.salary?.min || '',
        max: job.salary?.max || '',
        currency: job.salary?.currency || 'USD',
        period: job.salary?.period || 'yearly'
      },
      status: job.status || 'created',
      priority: job.priority || 'medium',
      applicationDate: job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : '',
      deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
      notes: job.notes || '',
      tags: job.tags ? job.tags.join(', ') : ''
    });
    setIsEditingJob(false);
  };

  const handleDuplicateJob = async () => {
    try {
      const userId = session?.user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      const duplicatedJobData = {
        ...job,
        jobTitle: `${job.jobTitle} (Copy)`,
        status: 'created',
        applicationDate: undefined,
        userId: userId
      };

      delete duplicatedJobData.id;
      delete duplicatedJobData._id;

      const response = await fetch('/api/jobs', {
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

  const handleDeleteJob = async () => {
    try {
      const userId = session?.user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      const response = await fetch(`/api/jobs/${job.id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete job');
      }

      toast.success('Job deleted successfully!');
      onClose(); // Close modal after deletion
      onRefresh();
      
    } catch (error) {
      console.error('❌ Error deleting job:', error);
      toast.error('Failed to delete job. Please try again.');
    }
  };

  const handleArchiveJob = async () => {
    try {
      const userId = session?.user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      const response = await fetch(`/api/jobs/${job.id}?userId=${userId}`, {
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

  // Calculate journey progress
  const getJourneyProgress = (journey: CVJourney) => {
    if (!journey.steps || journey.steps.length === 0) {
      return 0;
    }
    
    const completedSteps = journey.steps.filter(step => step.status === 'completed').length;
    const totalSteps = journey.steps.length;
    
    return Math.round((completedSteps / totalSteps) * 100);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-5xl max-h-[90vh] overflow-hidden mx-4 sm:mx-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Enhanced Modal Header */}
          <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Briefcase size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                      {job.jobTitle}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 size={16} className="text-gray-500 dark:text-gray-400" />
                      <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                        {job.company}
                      </p>
                    </div>
                  </div>
                </div>
                {job.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin size={14} />
                    <span>{job.location}</span>
                  </div>
                )}
              </div>
              <motion.button
                onClick={onClose}
                className="p-3 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={24} className="text-gray-500 dark:text-gray-400" />
              </motion.button>
            </div>
          </div>

          {/* Enhanced Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <motion.button
              onClick={() => setActiveTab('job-info')}
              className={`relative flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'job-info'
                  ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Briefcase size={16} />
              Job Info
              {activeTab === 'job-info' && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                  layoutId="activeTab"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('journey')}
              className={`relative flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'journey'
                  ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Target size={16} />
              CV Journeys
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 'journey'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {journeys.length}
              </span>
              {activeTab === 'journey' && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                  layoutId="activeTab"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          </div>

          {/* Tab Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'job-info' ? (
              <JobInfoContent
                job={job}
                isEditingJob={isEditingJob}
                editedJob={editedJob}
                setEditedJob={setEditedJob}
                isSavingJob={isSavingJob}
                onSaveJob={handleSaveJob}
                onCancelEditJob={handleCancelEditJob}
                onEditJob={() => setIsEditingJob(true)}
                onDuplicateJob={handleDuplicateJob}
                onDeleteJob={handleDeleteJob}
                onArchiveJob={handleArchiveJob}
                formatDate={formatDate}
              />
            ) : (
              <div className="space-y-6">
                {/* Journey Management */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      🎯 CV Journeys for this Job
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {journeys.filter(j => j.status === 'completed').length} completed
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {journeys.filter(j => j.status === 'in-progress').length} in progress
                      </span>
                    </div>
                  </div>

                  {/* Journey Analytics */}
                  {journeys.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-500" />
                        Journey Analytics
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-500">
                            {Math.round(journeys.reduce((sum, j) => sum + getJourneyProgress(j), 0) / journeys.length)}%
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Avg Progress</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-500">
                            {journeys.reduce((sum, j) => j.steps?.filter(s => s.status === 'completed').length || 0, 0)}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Steps Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-500">
                            {journeys.filter(j => j.atsScore && j.atsScore >= 80).length}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">High ATS Scores</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-500">
                            {Math.round(journeys.reduce((sum, j) => sum + (j.atsScore || 0), 0) / journeys.filter(j => j.atsScore).length) || 0}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Avg ATS Score</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {journeys.length > 0 ? (
                    <div className="space-y-4">
                      {journeys.map((journey) => (
                        <JourneyTimelineCard
                            key={journey.id} 
                          journey={journey}
                          onResume={handleContinueJourney}
                          onDownload={handleApplyNow}
                          onDelete={handleDeleteJourney}
                          onRefresh={onRefresh}
                          onUpdateJourney={handleUpdateJourney}
                          onShowDeleteConfirm={setShowDeleteConfirm}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No CV Journeys Started</h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Create your first CV journey to start preparing for this job application.
                      </p>
                    </div>
                  )}
                </div>

                {/* Journey Creation - Only show if no journeys exist */}
                {journeys.length === 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <motion.button
                      onClick={handleCreateJourney}
                      disabled={isCreatingJourney}
                      className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: isCreatingJourney ? 1 : 1.02 }}
                      whileTap={{ scale: isCreatingJourney ? 1 : 0.98 }}
                    >
                      {isCreatingJourney ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Plus size={20} />
                          </motion.div>
                          Creating Journey...
                        </>
                      ) : (
                        <>
                          <Plus size={20} />
                          Create New CV Journey
                        </>
                      )}
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
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
                onClick={() => handleDeleteJourney(showDeleteConfirm)}
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
    </AnimatePresence>
  );
};

export default ApplicationJourneyModal;
