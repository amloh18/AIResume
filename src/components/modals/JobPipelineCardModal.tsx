'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, FileText, CheckCircle, Download, Plus, ExternalLink, ArrowRight } from 'lucide-react';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AddJobModal from './AddJobModal';

interface JobPipelineCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
}

const JobPipelineCardModal: React.FC<JobPipelineCardModalProps> = ({ isOpen, onClose, jobId }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { state, updateJourneyStatus, updateJobInfo, updateCurrentStep } = useJobJourney();
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);

  const { currentStep, steps, jobTitle, company } = state;

  useEffect(() => {
    console.log('🔍 JobPipelineCardModal - useEffect triggered:', { jobId, sessionUserId: session?.user?.id });
    
    if (jobId && jobId !== 'temp' && session?.user?.id) {
      // Fetch job data from backend
      console.log('🔍 JobPipelineCardModal - Fetching job data for existing job');
      fetchJobData(jobId);
    } else if (!jobId || jobId === 'temp') {
      // For new journeys, start at step 1 (Add Job)
      console.log('🔍 JobPipelineCardModal - Starting new journey');
      // Clear any existing job data
      setJobData(null);
    }
  }, [jobId, session?.user?.id]);

  // Debug: Monitor jobData changes
  useEffect(() => {
    console.log('🔍 JobPipelineCardModal - jobData changed:', jobData);
  }, [jobData]);

  // Handle step progression based on jobId - only run once when jobId changes
  useEffect(() => {
    if (jobId && jobId !== 'temp') {
      // For existing jobs, start at step 2 (Create CV) since job is already selected
      updateCurrentStep(2);
      updateJourneyStatus('job-added');
    } else {
      // For new journeys, start at step 1 (Add Job)
      updateCurrentStep(1);
      updateJourneyStatus('onboarding');
    }
  }, [jobId, updateCurrentStep, updateJourneyStatus]);

  const fetchJobData = async (jobId: string) => {
    try {
      console.log('🔍 JobPipelineCardModal - Fetching job data for jobId:', jobId);
      setIsLoadingJob(true);
      
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Fetch actual job data from API
      const response = await fetch(`/api/jobs?userId=${userId}&jobId=${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job data');
      }
      
      const responseData = await response.json();
      console.log('🔍 JobPipelineCardModal - Job data fetched:', responseData);
      
      // Extract job data from the response
      let jobData;
      if (responseData.data?.jobs) {
        // If we got a list of jobs, find the specific one
        jobData = responseData.data.jobs.find((job: any) => job.id === jobId || job._id === jobId);
      } else {
        // If we got a single job directly
        jobData = responseData.job || responseData;
      }
      
      if (!jobData) {
        throw new Error('Job not found');
      }
      console.log('🔍 JobPipelineCardModal - Extracted job data:', jobData);
      console.log('🔍 JobPipelineCardModal - Job title:', jobData.title || jobData.jobTitle);
      console.log('🔍 JobPipelineCardModal - Job company:', jobData.company);
      
      setJobData(jobData);
      updateJobInfo(jobData.title || jobData.jobTitle, jobData.company);
    } catch (error) {
      console.error('Error fetching job data:', error);
      // Fallback to mock data if API fails
      const mockJobData = {
        id: jobId,
        jobTitle: 'Job Title',
        company: 'Company Name',
        location: 'Location',
        description: 'Job description...'
      };
      setJobData(mockJobData);
      updateJobInfo(mockJobData.jobTitle, mockJobData.company);
    } finally {
      setIsLoadingJob(false);
    }
  };

  const handleStepAction = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        // Add Job action - only show if no job is selected
        if (!jobId || jobId === 'temp') {
          setShowAddJobModal(true);
        } else {
          // If job is already selected, skip to step 2
          handleCreateCV();
        }
        break;
      case 2:
        // Create CV action
        handleCreateCV();
        break;
      case 3:
        // ATS Score action
        handleATSCheck();
        break;
      case 4:
        // Cover Letter action
        handleCoverLetter();
        break;
      case 5:
        // Download action
        handleDownload();
        break;
    }
  };

  const handleCreateCV = () => {
    const studioUrl = jobId ? `/studio?jobId=${jobId}&mode=cv-onboarding` : '/studio?mode=cv-onboarding';
    router.push(studioUrl);
    onClose();
  };

  const handleATSCheck = () => {
    const studioUrl = jobId ? `/studio?jobId=${jobId}&mode=ats-edit` : '/studio?mode=ats-edit';
    router.push(studioUrl);
    onClose();
  };

  const handleCoverLetter = () => {
    const studioUrl = jobId ? `/studio?jobId=${jobId}&mode=cover-letter-edit` : '/studio?mode=cover-letter-edit';
    router.push(studioUrl);
    onClose();
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Downloading files for job:', jobId);
  };

  const handleJobAdded = (job: any) => {
    console.log('🔍 JobPipelineCardModal - Job added:', job);
    setJobData(job);
    updateJobInfo(job.jobTitle, job.company);
    updateJourneyStatus('job-added');
    setShowAddJobModal(false);
    
    // Move to step 2 (Create CV) after job is added
    updateCurrentStep(2);
    
    // Update the jobId if this was a new job
    if (job._id || job.id) {
      const newJobId = job._id || job.id;
      console.log('🔍 JobPipelineCardModal - New job ID:', newJobId);
      // Update the URL to include the new job ID
      const newUrl = `/dashboard/cv-journey?jobId=${newJobId}`;
      router.replace(newUrl);
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: 
        // Show different icon based on whether job is already selected
        if (jobId && jobId !== 'temp') {
          return <CheckCircle className="h-5 w-5" />;
        }
        return <Briefcase className="h-5 w-5" />;
      case 2: return <FileText className="h-5 w-5" />;
      case 3: return <CheckCircle className="h-5 w-5" />;
      case 4: return <FileText className="h-5 w-5" />;
      case 5: return <Download className="h-5 w-5" />;
      default: return <Briefcase className="h-5 w-5" />;
    }
  };

  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: 
        // Show different label based on whether job is already selected
        if (jobId && jobId !== 'temp') {
          return 'Job Selected';
        }
        return 'Add Job';
      case 2: return 'Create CV';
      case 3: return 'ATS Score';
      case 4: return 'Cover Letter';
      case 5: return 'Download';
      default: return 'Unknown';
    }
  };

  const getStepDescription = (step: number) => {
    switch (step) {
      case 1: 
        // Show different description based on whether job is already selected
        if (jobId && jobId !== 'temp') {
          if (jobData && (jobData.title || jobData.jobTitle)) {
            console.log('🔍 JobPipelineCardModal - Step 1 description with job data:', jobData);
            return `Linked to: ${jobData.title || jobData.jobTitle} at ${jobData.company}`;
          }
          return 'Job already selected - proceed to create CV';
        }
        return 'Add the job you\'re applying for';
      case 2: return 'Create or select a CV for this job';
      case 3: return 'Check and improve your ATS score';
      case 4: return 'Create a compelling cover letter';
      case 5: return 'Download your application files';
      default: return '';
    }
  };

  const isStepEnabled = (step: number) => {
    return step <= currentStep;
  };

  const isStepCompleted = (step: number) => {
    return step < currentStep;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">CV Journey Pipeline</h2>
                {isLoadingJob ? (
                  <p className="text-white/60 text-sm mt-1">
                    Loading job details...
                  </p>
                ) : jobData ? (
                  <div className="text-white/60 text-sm mt-1">
                    <p>{jobData.title || jobData.jobTitle} at {jobData.company}</p>
                    {jobData.status && (
                      <p className="text-xs text-white/40 mt-1">
                        Status: {jobData.status.charAt(0).toUpperCase() + jobData.status.slice(1)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-white/60 text-sm mt-1">
                    Create a new CV journey
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Progress Overview */}
            <div className="mb-6 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Progress</span>
                <span className="text-sm text-white/60">{currentStep} of {steps.length} steps</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <motion.div
                  className="bg-lime-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={`${step.id}-${jobData ? 'with-job' : 'no-job'}`}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    isStepCompleted(step.id)
                      ? 'bg-green-500/10 border-green-500/20'
                      : step.status === 'active'
                      ? 'bg-lime-500/10 border-lime-500/20'
                      : 'bg-white/5 border-white/10'
                  }`}
                  whileHover={isStepEnabled(step.id) ? { scale: 1.02 } : {}}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isStepCompleted(step.id)
                          ? 'bg-green-500 text-black'
                          : step.status === 'active'
                          ? 'bg-lime-500 text-black'
                          : 'bg-white/10 text-white/40'
                      }`}>
                        {getStepIcon(step.id)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${
                            isStepEnabled(step.id) ? 'text-white' : 'text-white/40'
                          }`}>
                            {getStepLabel(step.id)}
                          </h3>
                          {step.id === 1 && jobId && jobId !== 'temp' && jobData && (
                            <span className="px-2 py-1 text-xs bg-lime-500/20 text-lime-400 rounded-full border border-lime-500/30">
                              Linked
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${
                          isStepEnabled(step.id) ? 'text-white/60' : 'text-white/20'
                        }`}>
                          {getStepDescription(step.id)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isStepCompleted(step.id) && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-black" />
                        </div>
                      )}
                      
                      {isStepEnabled(step.id) && !isStepCompleted(step.id) && (
                        <motion.button
                          onClick={() => handleStepAction(step.id)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                            step.status === 'active'
                              ? 'bg-lime-500 hover:bg-lime-600 text-black'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {step.id === 1 ? (
                            <>
                              {jobId && jobId !== 'temp' ? (
                                <>
                                  <ArrowRight className="h-4 w-4" />
                                  Continue
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  Add Job
                                </>
                              )}
                            </>
                          ) : step.id === 2 ? (
                            <>
                              <FileText className="h-4 w-4" />
                              Create CV
                            </>
                          ) : step.id === 3 ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Check ATS
                            </>
                          ) : step.id === 4 ? (
                            <>
                              <FileText className="h-4 w-4" />
                              Cover Letter
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Download
                            </>
                          )}
                          <ArrowRight className="h-4 w-4" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>Complete all steps to finish your CV journey</span>
                <span>{Math.round((currentStep / steps.length) * 100)}% Complete</span>
              </div>
            </div>
          </motion.div>

          {/* Add Job Modal */}
          <AddJobModal
            isOpen={showAddJobModal}
            onClose={() => setShowAddJobModal(false)}
            onJobAdded={handleJobAdded}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobPipelineCardModal;
