'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Download, 
  Plus, 
  ExternalLink, 
  ArrowRight,
  Sparkles,
  Search,
  Settings,
  Mail,
  Rocket,
  Link,
  Edit3,
  Eye,
  Star
} from 'lucide-react';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AddJobModal from './AddJobModal';

interface JobPipelineCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
}

interface CV {
  id: string;
  title: string;
  status: string;
  lastModified: string;
  completionPercentage?: number;
}

interface CoverLetter {
  id: string;
  title: string;
  status: string;
  lastModified: string;
}

const JobPipelineCardModal: React.FC<JobPipelineCardModalProps> = ({ isOpen, onClose, jobId }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { state, updateJourneyStatus, updateJobInfo, updateCurrentStep, updateCVId, updateCoverLetterId } = useJobJourney();
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [userCVs, setUserCVs] = useState<CV[]>([]);
  const [userCoverLetters, setUserCoverLetters] = useState<CoverLetter[]>([]);
  const [showCVSelector, setShowCVSelector] = useState(false);
  const [showCoverLetterSelector, setShowCoverLetterSelector] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsKeywords, setAtsKeywords] = useState<string[]>([]);
  const [isRunningATSCheck, setIsRunningATSCheck] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [isSelectingJob, setIsSelectingJob] = useState(false);
  const [jobSelectionSuccess, setJobSelectionSuccess] = useState(false);
  const [isSelectingCV, setIsSelectingCV] = useState(false);
  const [cvSelectionSuccess, setCvSelectionSuccess] = useState(false);
  const [selectedCV, setSelectedCV] = useState<any>(null);
  const [jobFormData, setJobFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    salary: '',
    description: '',
    requirements: '',
    jobUrl: ''
  });

  const { currentStep, steps, jobTitle, company } = state;

  // Step definitions with enhanced metadata
  const stepDefinitions = [
    {
      id: 1,
      name: 'Job Creation',
      icon: Briefcase,
      description: 'Define or select the job you want to apply for',
      primaryAction: 'Enter Job Details',
      secondaryAction: 'Link from List',
      color: 'blue'
    },
    {
      id: 2,
      name: 'CV Creation',
      icon: FileText,
      description: 'Craft a professional resume or select one you\'ve already made',
      primaryAction: 'Create New CV',
      secondaryAction: 'Link Existing CV',
      color: 'green'
    },
    {
      id: 3,
      name: 'ATS Scoring',
      icon: Settings,
      description: 'Maximize your chances of passing the ATS and getting noticed',
      primaryAction: 'Run ATS Check',
      secondaryAction: 'View Keywords',
      color: 'purple'
    },
    {
      id: 4,
      name: 'Cover Letter',
      icon: Mail,
      description: 'Create a personalized cover letter that tells your unique story',
      primaryAction: 'Generate with AI',
      secondaryAction: 'Link Existing Letter',
      color: 'orange'
    },
    {
      id: 5,
      name: 'Apply',
      icon: Rocket,
      description: 'Your application is complete. Download or apply directly',
      primaryAction: 'Download Documents',
      secondaryAction: 'Move to Applied',
      color: 'lime'
    }
  ];

  useEffect(() => {
    console.log('🔍 JobPipelineCardModal - useEffect triggered:', { jobId, sessionUserId: session?.user?.id });
    
    if (jobId && jobId !== 'temp' && session?.user?.id) {
      fetchJobData(jobId);
    } else if (!jobId || jobId === 'temp') {
      setJobData(null);
    }
  }, [jobId, session?.user?.id]);

  useEffect(() => {
    if (jobId && jobId !== 'temp') {
      updateCurrentStep(2);
      updateJourneyStatus('job-added');
    } else {
      updateCurrentStep(1);
      updateJourneyStatus('onboarding');
    }
  }, [jobId, updateCurrentStep, updateJourneyStatus]);

  useEffect(() => {
    if (session?.user?.id) {
      loadUserDocuments();
      loadAvailableJobs();
    }
  }, [session?.user?.id]);

  const fetchJobData = async (jobId: string) => {
    try {
      setIsLoadingJob(true);
      const userId = session?.user?.id;
      if (!userId) throw new Error('User not authenticated');
      
      const response = await fetch(`/api/jobs?userId=${userId}&jobId=${jobId}`);
      if (!response.ok) throw new Error('Failed to fetch job data');
      
      const responseData = await response.json();
      let jobData;
      if (responseData.data?.jobs) {
        jobData = responseData.data.jobs.find((job: any) => job.id === jobId || job._id === jobId);
      } else {
        jobData = responseData.job || responseData;
      }
      
      if (!jobData) throw new Error('Job not found');
      
      setJobData(jobData);
      updateJobInfo(jobData.title || jobData.jobTitle, jobData.company);
    } catch (error) {
      console.error('Error fetching job data:', error);
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

  const loadUserDocuments = async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      // Load CVs
      const cvResponse = await fetch(`/api/cvs?userId=${userId}&type=cv`);
      if (cvResponse.ok) {
        const cvData = await cvResponse.json();
        if (cvData.success) {
          setUserCVs(cvData.data.cvs || []);
        }
      }

      // Load Cover Letters
      const coverResponse = await fetch(`/api/cvs?userId=${userId}&type=cover`);
      if (coverResponse.ok) {
        const coverData = await coverResponse.json();
        if (coverData.success) {
          setUserCoverLetters(coverData.data.cvs || []);
        }
      }
    } catch (error) {
      console.error('Error loading user documents:', error);
    }
  };

  const loadAvailableJobs = async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      // Load jobs with status 'created'
      const response = await fetch(`/api/jobs?userId=${userId}&status=created`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableJobs(data.data.jobs || []);
        }
      }
    } catch (error) {
      console.error('Error loading available jobs:', error);
    }
  };

  const handleStepClick = (stepId: number) => {
    if (stepId <= currentStep) {
      updateCurrentStep(stepId);
    }
  };

  const handlePrimaryAction = (stepId: number) => {
    switch (stepId) {
      case 1:
        if (!jobId || jobId === 'temp') {
          setShowJobForm(!showJobForm);
        }
        break;
      case 2:
        handleCreateCV();
        break;
      case 3:
        handleATSCheck();
        break;
      case 4:
        handleCoverLetter();
        break;
      case 5:
        handleDownload();
        break;
    }
  };

  const handleSecondaryAction = (stepId: number) => {
    switch (stepId) {
      case 1:
        setShowJobDropdown(!showJobDropdown);
        break;
      case 2:
        setShowCVSelector(true);
        break;
      case 3:
        // View keywords - could show keyword analysis
        console.log('View keywords');
        break;
      case 4:
        setShowCoverLetterSelector(true);
        break;
      case 5:
        // Move to applied stage
        handleDownload();
        break;
    }
  };

  const handleJobSelect = async (selectedJob: any) => {
    try {
      setIsSelectingJob(true);
      const userId = session?.user?.id;
      if (!userId) return;

      // Update local state and journey
      setJobData(selectedJob);
      updateJobInfo(selectedJob.title || selectedJob.jobTitle, selectedJob.company);
      updateJourneyStatus('job-added');
      setShowJobDropdown(false);
      setJobSelectionSuccess(true);
      
      // Move to next step (Step 2: CV Creation)
      updateCurrentStep(2);
      
      // Update URL with job ID
      const jobId = selectedJob._id || selectedJob.id;
      if (jobId) {
        const newUrl = `/dashboard/cv-journey?jobId=${jobId}`;
        router.replace(newUrl);
      }
    } catch (error) {
      console.error('Error selecting job and moving to next step:', error);
    } finally {
      setIsSelectingJob(false);
    }
  };

  const handleCreateCV = () => {
    const studioUrl = jobId ? `/studio?jobId=${jobId}&mode=cv-onboarding` : '/studio?mode=cv-onboarding';
    router.push(studioUrl);
    onClose();
  };

  const handleATSCheck = async () => {
    setIsRunningATSCheck(true);
    try {
      // Simulate ATS check - in real implementation, this would call the ATS API
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const mockKeywords = ['project management', 'data analysis', 'agile', 'scrum', 'javascript'];
      setAtsScore(mockScore);
      setAtsKeywords(mockKeywords);
    } catch (error) {
      console.error('Error running ATS check:', error);
    } finally {
      setIsRunningATSCheck(false);
    }
  };

  const handleCoverLetter = () => {
    const studioUrl = jobId ? `/studio?jobId=${jobId}&mode=cover-letter-edit` : '/studio?mode=cover-letter-edit';
    router.push(studioUrl);
    onClose();
  };

  const handleDownload = async () => {
    try {
      const userId = session?.user?.id;
      if (!userId || !jobId) return;

      // Update the job status to 'applied' when all steps are completed
      const updateResponse = await fetch(`/api/jobs/${jobId}?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'applied',
          applicationDate: new Date()
        }),
      });

      if (updateResponse.ok) {
        console.log('✅ Job status updated to applied - all steps completed');
        // Update journey status to completed
        updateJourneyStatus('completed');
      } else {
        console.error('❌ Failed to update job status to applied');
      }
    } catch (error) {
      console.error('Error updating job status to applied:', error);
    }
    
    console.log('Downloading files for job:', jobId);
  };

  const handleJobAdded = async (job: any) => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      // Update local state and journey
      setJobData(job);
      updateJobInfo(job.jobTitle, job.company);
      updateJourneyStatus('job-added');
      setShowJobForm(false);
      
      // Move to next step (Step 2: CV Creation)
      updateCurrentStep(2);
      
      // Update URL with job ID
      const jobId = job._id || job.id;
      if (jobId) {
        const newUrl = `/dashboard/cv-journey?jobId=${jobId}`;
        router.replace(newUrl);
      }
    } catch (error) {
      console.error('Error adding new job and moving to next step:', error);
    }
  };

  const handleJobFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobTitle: jobFormData.jobTitle,
          company: jobFormData.company,
          location: jobFormData.location,
          salary: jobFormData.salary ? { amount: jobFormData.salary, currency: 'USD', period: 'yearly' } : undefined,
          description: jobFormData.description,
          requirements: jobFormData.requirements,
          jobUrl: jobFormData.jobUrl,
          status: 'created',
          priority: 'medium',
          applicationDate: new Date(),
          notes: '',
          tags: []
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          handleJobAdded(result.data);
          setJobFormData({ jobTitle: '', company: '', location: '', salary: '', description: '', requirements: '', jobUrl: '' });
        }
      }
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const handleCVSelect = async (cv: CV) => {
    try {
      setIsSelectingCV(true);
      const userId = session?.user?.id;
      if (!userId) return;

      // Update local state and journey
      setSelectedCV(cv);
      updateCVId(cv.id);
      updateJourneyStatus('cv-created');
      setShowCVSelector(false);
      setCvSelectionSuccess(true);
      
      // Move to next step (Step 3: ATS Scoring)
      updateCurrentStep(3);
    } catch (error) {
      console.error('Error selecting CV and moving to next step:', error);
    } finally {
      setIsSelectingCV(false);
    }
  };

  const handleCoverLetterSelect = async (coverLetter: CoverLetter) => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      // Update local state and journey
      updateCoverLetterId(coverLetter.id);
      updateJourneyStatus('cover-letter-created');
      setShowCoverLetterSelector(false);
      
      // Move to next step (Step 5: Apply)
      updateCurrentStep(5);
    } catch (error) {
      console.error('Error selecting cover letter and moving to next step:', error);
    }
  };

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  const getStepColor = (stepId: number) => {
    const step = stepDefinitions.find(s => s.id === stepId);
    return step?.color || 'gray';
  };

    const renderStepContent = () => {
    const currentStepDef = stepDefinitions.find(s => s.id === currentStep);
    if (!currentStepDef) return null;

    const status = getStepStatus(currentStep);
    const isActive = status === 'active';

    return (
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col"
      >
        {/* Step Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-white mb-2">
            Step {currentStep}: {currentStepDef.name}
          </h2>
          <p className="text-white/60 text-sm">
            {currentStepDef.description}
          </p>
        </div>

        {/* Step-specific content */}
        <div>
          {currentStep === 1 && (
            <div>
              {jobSelectionSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-lime-500/20 to-green-500/20 rounded-lg p-4 border border-lime-500/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-lime-500/20 rounded-full">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Briefcase className="h-4 w-4 text-lime-400" />
                      </motion.div>
                    </div>
                    <h3 className="text-base font-semibold text-white">Job Selected Successfully!</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">{jobData?.title || jobData?.jobTitle}</p>
                    <p className="text-white/60 text-sm">{jobData?.company}</p>
                    {jobData?.location && (
                      <p className="text-white/40 text-xs">{jobData.location}</p>
                    )}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 text-xs text-lime-300"
                  >
                    ✓ Job selected successfully • Moving to Step 2: CV Creation
                  </motion.div>
                </motion.div>
              ) : jobData ? (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-5 w-5 text-blue-400" />
                    <h3 className="text-base font-semibold text-white">Linked Job</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">{jobData.title || jobData.jobTitle}</p>
                    <p className="text-white/60 text-sm">{jobData.company}</p>
                    {jobData.location && (
                      <p className="text-white/40 text-xs">{jobData.location}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-left">
                    <Briefcase className="h-8 w-8 text-blue-400 mb-3" />
                    <h3 className="text-base font-semibold text-white mb-2">No Job Selected</h3>
                    <p className="text-white/60 text-sm">Start by adding the job you want to apply for</p>
                  </div>
                </div>
              )}
              
              {/* Job Selection Dropdown */}
              {showJobDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-lg border border-white/10 mt-2"
                >
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-white mb-2">Select from Created Jobs</h4>
                    {availableJobs.length === 0 ? (
                      <p className="text-white/60 text-xs">No jobs in 'Created' stage found</p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {availableJobs.map((job) => (
                          <button
                            key={job.id || job._id}
                            onClick={() => handleJobSelect(job)}
                            disabled={isSelectingJob}
                            className="w-full text-left p-2 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-white font-medium">{job.title || job.jobTitle}</div>
                                <div className="text-xs text-white/60">{job.company}</div>
                              </div>
                              {isSelectingJob && (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Settings className="h-3 w-3 text-lime-400" />
                                </motion.div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div>
              {cvSelectionSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-green-500/20 rounded-full">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <FileText className="h-4 w-4 text-green-400" />
                      </motion.div>
                    </div>
                    <h3 className="text-base font-semibold text-white">CV Selected Successfully!</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">{selectedCV?.title}</p>
                    <p className="text-white/60 text-sm">CV</p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 text-xs text-green-300"
                  >
                    ✓ CV linked successfully • Moving to Step 3: ATS Scoring
                  </motion.div>
                </motion.div>
              ) : selectedCV ? (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-green-400" />
                    <h3 className="text-base font-semibold text-white">Linked CV</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">{selectedCV.title}</p>
                    <p className="text-white/60 text-sm">CV</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-left">
                    <FileText className="h-8 w-8 text-green-400 mb-3" />
                    <h3 className="text-base font-semibold text-white mb-2">No CV Selected</h3>
                    <p className="text-white/60 text-sm">Choose to create a new CV or link an existing one from your collection</p>
                  </div>
                </div>
              )}
              
              {/* CV Selection Dropdown */}
              {showCVSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-lg border border-white/10 mt-2"
                >
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-white mb-2">Select from Your CVs</h4>
                    {userCVs.length === 0 ? (
                      <p className="text-white/60 text-xs">No CVs found. Create your first CV!</p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {userCVs.map((cv) => (
                          <button
                            key={cv.id}
                            onClick={() => handleCVSelect(cv)}
                            disabled={isSelectingCV}
                            className="w-full text-left p-2 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-white font-medium">{cv.title}</div>
                                <div className="text-xs text-white/60">CV</div>
                              </div>
                              {isSelectingCV && (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Settings className="h-3 w-3 text-green-400" />
                                </motion.div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div>
              {atsScore !== null ? (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-5 w-5 text-purple-400" />
                    <h3 className="text-base font-semibold text-white">ATS Score</h3>
                  </div>
                  
                  {/* ATS Score Meter */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60 text-sm">ATS Compatibility</span>
                      <span className="text-white font-semibold text-sm">{atsScore}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${atsScore}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Missing Keywords */}
                  {atsKeywords.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-2 text-sm">Missing Keywords</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {atsKeywords.map((keyword, index) => (
                          <motion.span
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-xs border border-red-500/30"
                          >
                            {keyword}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-5 w-5 text-purple-400" />
                    <h3 className="text-base font-semibold text-white">ATS Optimization</h3>
                  </div>
                  <p className="text-white/60 text-sm">
                    Run an ATS check to see how well your CV matches the job requirements
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-orange-400" />
                  <h3 className="text-base font-semibold text-white">Cover Letter</h3>
                </div>
                <p className="text-white/60 text-sm">
                  Create a personalized cover letter that complements your CV
                </p>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Rocket className="h-5 w-5 text-lime-400" />
                  <h3 className="text-base font-semibold text-white">Ready to Apply!</h3>
                </div>
                <p className="text-white/60 text-sm">
                  Your application is complete. Download your documents or apply directly.
                </p>
                
                {/* Summary */}
                <div className="bg-white/10 rounded-lg p-3 mt-3">
                  <h4 className="text-white font-medium mb-2 text-sm">Application Summary</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/60">Job:</span>
                      <span className="text-white">{jobData?.title || jobData?.jobTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Company:</span>
                      <span className="text-white">{jobData?.company}</span>
                    </div>
                    {atsScore && (
                      <div className="flex justify-between">
                        <span className="text-white/60">ATS Score:</span>
                        <span className="text-white">{atsScore}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Rocket className="h-5 w-5 text-lime-400" />
                  <h3 className="text-base font-semibold text-white">Ready to Apply!</h3>
                </div>
                <p className="text-white/60 text-sm">
                  Your application is complete. Download your documents or apply directly.
                </p>
                
                {/* Summary */}
                <div className="bg-white/10 rounded-lg p-3 mt-3">
                  <h4 className="text-white font-medium mb-2 text-sm">Application Summary</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/60">Job:</span>
                      <span className="text-white">{jobData?.title || jobData?.jobTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Company:</span>
                      <span className="text-white">{jobData?.company}</span>
                    </div>
                    {atsScore && (
                      <div className="flex justify-between">
                        <span className="text-white/60">ATS Score:</span>
                        <span className="text-white">{atsScore}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4 mt-4">
          <motion.button
            onClick={() => handlePrimaryAction(currentStep)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              isActive
                ? 'bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-black shadow-lg'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            disabled={!isActive}
          >
            {currentStep === 3 && isRunningATSCheck ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Settings className="h-3 w-3" />
                </motion.div>
                Running Check...
              </>
            ) : (
              <>
                {currentStep === 4 && <Sparkles className="h-3 w-3" />}
                {currentStep === 1 && showJobForm ? 'Cancel' : currentStepDef.primaryAction}
                {currentStep === 1 && showJobForm ? <X className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
              </>
            )}
          </motion.button>

          {currentStepDef.secondaryAction && !showJobForm && (
            <motion.button
              onClick={() => handleSecondaryAction(currentStep)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              {currentStep === 1 && <Search className="h-3 w-3" />}
              {currentStep === 2 && <FileText className="h-3 w-3" />}
              {currentStep === 3 && <Eye className="h-3 w-3" />}
              {currentStep === 4 && <Mail className="h-3 w-3" />}
              {currentStep === 5 && <Rocket className="h-3 w-3" />}
              {currentStepDef.secondaryAction}
            </motion.button>
          )}
        </div>

        {/* Job Form */}
        <AnimatePresence>
          {showJobForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-white/5 rounded-lg border border-white/10 p-4 mt-2 max-h-96 overflow-y-auto">
                <form onSubmit={handleJobFormSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={jobFormData.jobTitle}
                      onChange={(e) => setJobFormData({ ...jobFormData, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                      placeholder="e.g., Senior Software Engineer"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Company *</label>
                    <input
                      type="text"
                      value={jobFormData.company}
                      onChange={(e) => setJobFormData({ ...jobFormData, company: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                      placeholder="e.g., Tech Corp"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Location</label>
                    <input
                      type="text"
                      value={jobFormData.location}
                      onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                      placeholder="e.g., San Francisco, CA"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Salary Range</label>
                    <input
                      type="text"
                      value={jobFormData.salary}
                      onChange={(e) => setJobFormData({ ...jobFormData, salary: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                      placeholder="e.g., $80,000 - $120,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Job URL</label>
                    <input
                      type="url"
                      value={jobFormData.jobUrl}
                      onChange={(e) => setJobFormData({ ...jobFormData, jobUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Job Description</label>
                    <textarea
                      value={jobFormData.description}
                      onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors resize-none"
                      placeholder="Brief description of the role..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Requirements</label>
                    <textarea
                      value={jobFormData.requirements}
                      onChange={(e) => setJobFormData({ ...jobFormData, requirements: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-lime-400/50 focus:outline-none transition-colors resize-none"
                      placeholder="Key requirements and skills..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <motion.button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-black rounded-lg text-sm font-medium transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Create Job
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        {currentStep === 2 && (
          <div className="mt-6">
            <motion.img
              src="/images/CV Creation step 2.png"
              alt="CV Creation Step"
              className="w-48 h-auto mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        )}

        {currentStep === 3 && (
          <div className="mt-6">
            <motion.img
              src="/images/ATS scoring step 3.png"
              alt="ATS Scoring Step"
              className="w-48 h-auto mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        )}

        {currentStep === 4 && (
          <div className="mt-6">
            <motion.img
              src="/images/Cover Letter step 4.png"
              alt="Cover Letter Step"
              className="w-48 h-auto mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        )}

        {currentStep === 5 && (
          <div className="mt-6">
            <motion.img
              src="/images/Apply step5.png"
              alt="Apply Step"
              className="w-48 h-auto mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl w-fit max-w-[95vw] max-h-[75vh] overflow-hidden shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Job Application Journey</h2>
                {isLoadingJob ? (
                  <p className="text-gray-600 dark:text-white/60 text-xs mt-1">Loading job details...</p>
                ) : jobData ? (
                  <div className="text-gray-600 dark:text-white/60 text-xs mt-1">
                    <p>{jobData.title || jobData.jobTitle} at {jobData.company}</p>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-white/60 text-xs mt-1">Create a new CV journey</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Two-Column Layout */}
            <div className="flex max-h-[70vh]">
              {/* Left Column - Timeline Progress */}
              <div className="w-72 bg-white/5 border-r border-white/10 p-4 overflow-y-auto">
                <h3 className="text-base font-semibold text-white mb-4">Progress Timeline</h3>
                
                <div className="space-y-4">
                  {stepDefinitions.map((step, index) => {
                    const status = getStepStatus(step.id);
                    const isCompleted = status === 'completed';
                    const isActive = status === 'active';
                    const IconComponent = step.icon;
                    
                    return (
                      <motion.div
                        key={step.id}
                        className={`relative cursor-pointer transition-all duration-200 ${
                          isCompleted ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-60'
                        }`}
                        onClick={() => handleStepClick(step.id)}
                        whileHover={step.id <= currentStep ? { scale: 1.02 } : {}}
                      >
                        {/* Progress Line */}
                        {index < stepDefinitions.length - 1 && (
                          <div className={`absolute left-5 top-10 w-0.5 h-8 ${
                            isCompleted ? 'bg-green-500' : 'bg-white/20'
                          }`} />
                        )}

                        <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                          isCompleted
                            ? 'bg-green-500/10 border-green-500/20'
                            : isActive
                            ? 'bg-lime-500/10 border-lime-500/20'
                            : 'bg-white/5 border-white/10'
                        } border`}>
                          
                          {/* Step Icon */}
                          <div className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                            isCompleted
                              ? 'bg-green-500 text-black'
                              : isActive
                              ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/25'
                              : 'bg-white/10 text-white/40'
                          }`}>
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </motion.div>
                            ) : (
                              <IconComponent className="h-4 w-4" />
                            )}
                          </div>

                          {/* Step Content */}
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium transition-colors ${
                              isCompleted ? 'text-green-400' : isActive ? 'text-white' : 'text-white/60'
                            }`}>
                              {step.name}
                            </h4>
                            <p className={`text-xs transition-colors ${
                              isCompleted ? 'text-green-400/60' : isActive ? 'text-white/60' : 'text-white/40'
                            }`}>
                              {step.description}
                            </p>
                          </div>

                          {/* Status Indicator */}
                          {isActive && (
                            <motion.div
                              className="w-2 h-2 bg-lime-400 rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Progress Summary */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                    <span>Progress</span>
                    <span>{currentStep === 1 && !jobData ? '0%' : `${Math.round((currentStep / stepDefinitions.length) * 100)}%`}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <motion.div
                      className="bg-gradient-to-r from-lime-400 to-lime-500 h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: currentStep === 1 && !jobData ? '0%' : `${(currentStep / stepDefinitions.length) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

                             {/* Right Column - Content & Actions */}
               <div className="w-[576px] p-4 overflow-y-auto flex flex-col relative">
                 {/* Background Image */}
                 <div className="absolute inset-0 opacity-10 pointer-events-none">
                   <motion.img
                     src={currentStep === 1 ? "/images/Create JOB step 1.png" :
                          currentStep === 2 ? "/images/CV Creation step 2.png" :
                          currentStep === 3 ? "/images/ATS scoring step 3.png" :
                          currentStep === 4 ? "/images/Cover Letter step 4.png" :
                          currentStep === 5 ? "/images/Apply step5.png" : "/images/Create JOB step 1.png"}
                     alt="Background"
                     className="w-full h-full object-cover"
                     initial={{ opacity: 0, scale: 1.2 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ duration: 0.8, delay: 0.3 }}
                     key={currentStep}
                   />
                 </div>
                 
                 {/* Content */}
                 <div className="relative z-10">
                   {renderStepContent()}
                 </div>
               </div>
            </div>
          </motion.div>

          {/* Add Job Modal */}
          <AddJobModal
            isOpen={showAddJobModal}
            onClose={() => setShowAddJobModal(false)}
            onJobAdded={handleJobAdded}
          />

          {/* CV Selection Modal */}
          <AnimatePresence>
            {showCVSelector && (
              <motion.div
                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Select CV</h3>
                    <button
                      onClick={() => setShowCVSelector(false)}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {userCVs.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No CVs found</p>
                      <p className="text-white/40 text-sm">Create a CV first to link it to this journey</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userCVs.map((cv) => (
                        <motion.button
                          key={cv.id}
                          onClick={() => handleCVSelect(cv)}
                          className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors text-left"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-green-400" />
                              <div>
                                <h4 className="text-white font-medium">{cv.title}</h4>
                                <p className="text-white/60 text-sm">
                                  {cv.completionPercentage ? `${cv.completionPercentage}% complete` : 'Draft'}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-white/40" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cover Letter Selection Modal */}
          <AnimatePresence>
            {showCoverLetterSelector && (
              <motion.div
                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Select Cover Letter</h3>
                    <button
                      onClick={() => setShowCoverLetterSelector(false)}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {userCoverLetters.length === 0 ? (
                    <div className="text-center py-8">
                      <Mail className="h-12 w-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No cover letters found</p>
                      <p className="text-white/40 text-sm">Create a cover letter first to link it to this journey</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userCoverLetters.map((coverLetter) => (
                        <motion.button
                          key={coverLetter.id}
                          onClick={() => handleCoverLetterSelect(coverLetter)}
                          className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors text-left"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-orange-400" />
                              <div>
                                <h4 className="text-white font-medium">{coverLetter.title}</h4>
                                <p className="text-white/60 text-sm">
                                  {coverLetter.status === 'published' ? 'Published' : 'Draft'}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-white/40" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobPipelineCardModal;
