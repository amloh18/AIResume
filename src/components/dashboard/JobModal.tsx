'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetch, authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { 
  X, Briefcase, MapPin, DollarSign, Calendar, ExternalLink,
  FileText, CheckCircle, Clock, AlertCircle, Plus, Edit, Trash2,
  Target, Building2, Star, Copy, Archive, ChevronDown, ChevronUp, User, Mail
} from 'lucide-react';
import JourneyTimelineCard from './JourneyTimelineCard';
import JobInfoContent from './JobInfoContent';
import EditJobModal from '../modals/EditJobModal';
import toast from 'react-hot-toast';
import { useJobInsights, useJobFallbacks, formatJobDate, formatJobSalary, formatJobUrl } from '@/hooks/useJobInsights';

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

interface JobModalProps {
  job: JobApplication;
  journeys: CVJourney[];
  onClose: () => void;
  onRefresh: () => void;
}

const JobModal: React.FC<JobModalProps> = ({
  job,
  journeys: initialJourneys,
  onClose,
  onRefresh
}) => {
  const { user } = useUnifiedAuth();
  const [isCreatingJourney, setIsCreatingJourney] = useState(false);
  const [journeys, setJourneys] = useState<CVJourney[]>(initialJourneys);
  const [loadingJourneys, setLoadingJourneys] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isJobDescriptionExpanded, setIsJobDescriptionExpanded] = useState(false);
  
  // EditJobModal state for layered modal
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  
  // Dynamic data hooks
  const { insights, loading: insightsLoading } = useJobInsights(job.id);
  const fallbacks = useJobFallbacks();

  // Load journeys for this specific job when modal opens
  useEffect(() => {
    const loadJourneysForJob = async () => {
      if (!user?.id || !job?.id) return;

      setLoadingJourneys(true);
      try {
        console.log('🔍 Loading journeys for job:', job.id);
        const response = await authenticatedFetchWithUserId(`/api/application-journey?jobId=${job.id}`, user.id);
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
  }, [user?.id, job?.id]);





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

  const getEmailSubject = (job: JobApplication) => {
    switch(job.status) {
      case 'applied':
        return `Following up on ${job.jobTitle} Application`;
      case 'interview':
        return `Thank you for the ${job.jobTitle} Interview`;
      case 'offer':
        return `Re: ${job.jobTitle} Offer`;
      default:
        return 'Follow-up';
    }
  };

  const getEmailTemplate = (job: JobApplication) => {
    const templates = {
      applied: `Dear Hiring Manager,

I hope this email finds you well. I recently applied for the ${job.jobTitle} position at ${job.company} and wanted to follow up on the status of my application.

I remain very interested in this opportunity and believe my skills and experience would be a great fit for your team. I would welcome the chance to discuss how I can contribute to ${job.company}.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
[Your Name]`,
      interview: `Dear [Interviewer Name],

Thank you for taking the time to interview me for the ${job.jobTitle} position at ${job.company}. I enjoyed our conversation and learning more about the role and your team.

I'm very excited about the opportunity to contribute to ${job.company} and believe my skills align well with the position's requirements. 

I wanted to follow up to see if there are any updates on next steps in the hiring process. Please let me know if you need any additional information from me.

Thank you again for your consideration.

Best regards,
[Your Name]`,
      offer: `Dear [Hiring Manager],

Thank you for extending an offer for the ${job.jobTitle} position at ${job.company}. I appreciate the opportunity and am excited about the possibility of joining your team.

I would like to discuss a few details regarding the offer. Could we schedule a call to go over the specifics?

Thank you for your patience, and I look forward to our conversation.

Best regards,
[Your Name]`
    };
    return templates[job.status as keyof typeof templates] || '';
  };

  const getFollowUpTimeline = (job: JobApplication) => {
    const timelines = {
      applied: [
        { day: 'Day 3-5', action: 'Send initial follow-up email' },
        { day: 'Day 7-10', action: 'Connect with hiring manager on LinkedIn' },
        { day: 'Day 14', action: 'Send second follow-up if no response' }
      ],
      interview: [
        { day: 'Within 24 hours', action: 'Send thank-you email' },
        { day: 'Day 5-7', action: 'Follow up on timeline if not provided' },
        { day: 'Day 14', action: 'Send polite status inquiry if no update' }
      ],
      offer: [
        { day: 'Within 48 hours', action: 'Acknowledge receipt and express interest' },
        { day: 'Day 3-5', action: 'Ask clarifying questions or negotiate' },
        { day: 'Before deadline', action: 'Provide final decision' }
      ]
    };
    return timelines[job.status as keyof typeof timelines] || [];
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
      const existingJourney = journeys.find(j => j.jobId === job.id);
      
      if (existingJourney) {
        toast.success('A CV journey already exists for this job. You can continue with the existing journey.');
        return;
      }

      const response = await authenticatedFetchWithUserId('/api/application-journey', user.id, {
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
          toast.success('CV journey already exists with current data');
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

  const handleContinueJourney = (journey: any) => {
    // Determine the appropriate mode based on journey progress
    let mode = 'cv-onboarding'; // Default for new journeys
    
    if (journey.cvId) {
      // If CV exists, determine mode based on journey status
      if (journey.status === 'in-progress') {
        // Check if we need ATS editing or can proceed to cover letter
        if (journey.atsScore && journey.atsScore >= 80) {
          mode = 'cover-letter-edit'; // Ready for cover letter
        } else {
          mode = 'ats-edit'; // Need to improve ATS score
        }
      } else {
        mode = 'ats-edit'; // Default to ATS editing for existing CVs
      }
    }
    
    // Navigate to studio with journey context using determined mode
    const url = `/studio?journeyId=${journey.id}&type=cv&mode=${mode}`;
    if (journey.cvId) {
      window.location.href = `${url}&cvId=${journey.cvId}`;
    } else {
      window.location.href = url;
    }
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

  // Handler for opening EditJobModal
  const handleOpenEditModal = () => {
    setShowEditJobModal(true);
  };

  // Handler for when job is saved in EditJobModal
  const handleEditJobSaved = (updatedJob: any) => {
    // Close the EditJobModal
    setShowEditJobModal(false);
    
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

  const handleDeleteJob = async () => {
    try {
      const userId = user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      const response = await authenticatedFetchWithUserId(`/api/jobs/${job.id}`, user.id, {
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
      const userId = user?.id;
      
      if (!userId) {
        toast.error('User session not found. Please log in again.');
        return;
      }

      const response = await authenticatedFetchWithUserId(`/api/jobs/${job.id}`, user.id, {
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
          className="bg-[#1A201A] rounded-2xl shadow-2xl border border-white/10 w-full max-w-6xl max-h-[90vh] overflow-hidden mx-4 sm:mx-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Job Application Details</h2>
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleOpenEditModal}
                className="flex items-center gap-2 px-3 py-2 bg-[#80FF00]/20 hover:bg-[#80FF00]/30 border border-[#80FF00]/30 text-[#80FF00] rounded-full transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Edit size={16} />
                Edit
              </motion.button>
              <motion.button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={20} className="text-white/60" />
              </motion.button>
            </div>
          </div>

          {/* Job Title and Company */}
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-white mb-2">{job.jobTitle}</h1>
            <p className="text-white/70 text-lg">at {job.company}</p>
          </div>

          {/* CV Journeys Section */}
          <div className="px-6 py-4">
            <h3 className="text-lg font-semibold text-white mb-4">🎯 CV Journeys for this Job</h3>
            
            {journeys.length > 0 ? (
              <div className="space-y-4">
                {journeys
                  .filter(cvJourney => cvJourney.id)
                  .map((cvJourney, index) => {
                  const journey = {
                    id: cvJourney.id,
                    jobId: cvJourney.jobId,
                    jobTitle: cvJourney.jobTitle,
                    company: cvJourney.company,
                    status: cvJourney.status as 'in-progress' | 'completed',
                    currentStep: cvJourney.currentStep,
                    totalSteps: cvJourney.totalSteps,
                    createdAt: cvJourney.metadata.createdAt instanceof Date 
                      ? cvJourney.metadata.createdAt.toISOString()
                      : new Date(cvJourney.metadata.createdAt).toISOString(),
                    updatedAt: cvJourney.metadata.updatedAt instanceof Date 
                      ? cvJourney.metadata.updatedAt.toISOString()
                      : new Date(cvJourney.metadata.updatedAt).toISOString(),
                    atsScore: cvJourney.atsScore,
                    cvId: cvJourney.cvId,
                    coverLetterId: cvJourney.coverLetterId
                  };
                  
                  return (
                    <JourneyTimelineCard
                      key={journey.id || `journey-${index}`}
                      journey={journey}
                      onResume={handleContinueJourney}
                      onDownload={handleApplyNow}
                      onDelete={handleDeleteJourney}
                      onRefresh={onRefresh}
                      onUpdateJourney={handleUpdateJourney}
                      onShowDeleteConfirm={setShowDeleteConfirm}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target size={48} className="text-white/40 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">No CV Journeys Started</h4>
                <p className="text-white/70 text-sm mb-4">
                  Create your first CV journey to start preparing for this job application.
                </p>
                <motion.button
                  onClick={handleCreateJourney}
                  disabled={isCreatingJourney}
                  className="px-6 py-3 bg-[#80FF00] hover:bg-[#70e600] text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: isCreatingJourney ? 1 : 1.02 }}
                  whileTap={{ scale: isCreatingJourney ? 1 : 0.98 }}
                >
                  {isCreatingJourney ? 'Creating Journey...' : 'Create New CV Journey'}
                </motion.button>
              </div>
            )}
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Column - Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-2">
                {/* Job Description */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Job Description</h3>
                  <div className="text-gray-300 text-sm space-y-3 max-h-48 overflow-y-auto scrollbar-hide">
                    {job.jobDescription ? (
                      <div className="whitespace-pre-wrap">
                        {job.jobDescription}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText size={48} className="text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-500 text-sm">
                          No job description provided yet.
                        </p>
                        <p className="text-gray-600 text-xs mt-2">
                          Add a job description in the job details to see it here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Core Details */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Core Details</h3>
                  <div className="space-y-3">
                    {/* First Row */}
                    <div className="border-t border-lime-500/20 pt-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          <span className="text-gray-300">{job.location || fallbacks.defaultLocation}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="text-gray-300">
                            Applied on {formatJobDate(job.applicationDate, fallbacks.defaultApplicationDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Second Row */}
                    <div className="border-t border-lime-500/20 pt-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <ExternalLink size={16} className="text-gray-400" />
                          <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline">
                            {formatJobUrl(job.jobUrl, fallbacks.defaultJobUrl)}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-gray-400" />
                          <span className="text-gray-300">
                            Deadline: {formatJobDate(job.deadline, fallbacks.defaultDeadline)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Third Row - Contact Details */}
                    <div className="border-t border-lime-500/20 pt-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span className="text-gray-300">
                            Contact: {job.contactDetails?.name || fallbacks.defaultContactName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-gray-400" />
                          <span className="text-gray-300">
                            {job.contactDetails?.email || fallbacks.defaultContactEmail}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Notes</h3>
                  <div className="bg-[#232f1c] border border-lime-500/20 rounded-2xl p-3">
                    {job.notes ? (
                      <p className="text-gray-300 text-sm">{job.notes}</p>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No notes added yet</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="w-80 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Application Status */}
                <div className="bg-[#232f1c] border border-lime-500/20 rounded-2xl p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Status</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        job.status === 'applied' ? 'bg-lime-500 text-white' :
                        job.status === 'interview' ? 'bg-blue-500 text-white' :
                        job.status === 'offer' ? 'bg-purple-500 text-white' :
                        job.status === 'rejected' ? 'bg-red-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {job.status === 'applied' ? 'In Progress' : 
                         job.status === 'interview' ? 'Interview' :
                         job.status === 'offer' ? 'Offer' :
                         job.status === 'rejected' ? 'Rejected' :
                         'Created'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Priority</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        job.priority === 'high' ? 'bg-red-500 text-white' :
                        job.priority === 'medium' ? 'bg-yellow-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {job.priority?.charAt(0).toUpperCase() + job.priority?.slice(1) || 'Medium'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Sponsorship</span>
                      <span className="text-white/80">
                        {job.sponsorship === 'yes' ? 'Required' : 
                         job.sponsorship === 'no' ? 'Not Required' : 
                         'Unknown'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Salary</span>
                      <span className="text-white/80 text-xs">
                        {formatJobSalary(job.salary, fallbacks.defaultSalary)}
                      </span>
                    </div>
                    
                    {job.tags && job.tags.length > 0 && (
                      <div>
                        <span className="text-white/60 block mb-2">Tags</span>
                        <div className="flex flex-wrap gap-2">
                          {job.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-white/10 text-white/80 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Insights */}
                <div className="bg-[#232f1c] border border-lime-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Star size={16} className="text-[#80FF00]" />
                    <h3 className="text-lg font-semibold text-white">Job Insights</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Keyword Match Score</span>
                      <span className="text-[#80FF00] font-semibold">
                        {insightsLoading ? '...' : `${insights?.keywordMatchScore || 0}%`}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Company Hiring Trend</span>
                      <span className="text-white">
                        {insightsLoading ? '...' : insights?.companyHiringTrend || 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Skills Gap</span>
                      <span className="text-white">
                        {insightsLoading ? '...' : insights?.skillsGap || 'Unable to analyze'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Market Competition</span>
                      <span className="text-white">
                        {insightsLoading ? '...' : insights?.marketCompetitiveness || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delete Application Button */}
                <div className="flex justify-end">
                  <motion.button
                    onClick={handleDeleteJob}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 size={16} />
                    Delete Application
                  </motion.button>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6">
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

      {/* EditJobModal - Layered on top */}
      {showEditJobModal && (
        <EditJobModal
          isOpen={showEditJobModal}
          onClose={() => setShowEditJobModal(false)}
          onJobSaved={handleEditJobSaved}
          editingJob={{
            id: job.id,
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
    </AnimatePresence>
  );
};

export default JobModal;
