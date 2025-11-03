'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Briefcase,
  FileText,
  CheckCircle,
  X,
  Search,
  ArrowRight,
  Sparkles,
  Building,
  Calendar,
  Copy
} from 'lucide-react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useRouter } from 'next/navigation';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useSession } from 'next-auth/react';
import { ApplicationPackageService } from '@/lib/services/applicationPackageService';

interface Job {
  id: string;
  jobTitle: string;
  company: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CV {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  lastModified: string;
  isMaster?: boolean;
  journeyId?: string | null;
  metadata?: {
    isMaster?: boolean | string;
    [key: string]: any;
  };
}

interface NewJourneyCardProps {
  onJourneyCreated?: (journeyData: {
    jobId: string;
    cvId: string;
    journeyName: string;
  }) => void;
  onCancel?: () => void;
  className?: string;
}

const NewJourneyCard: React.FC<NewJourneyCardProps> = ({
  onJourneyCreated,
  onCancel,
  className = ''
}) => {
  console.log('🔍 NewJourneyCard - Component initialized');
  const { user: unifiedUser } = useUnifiedAuth();
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const { startJourney } = useJobJourney();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [journeyName, setJourneyName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cvSearchQuery, setCvSearchQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cvs, setCVs] = useState<CV[]>([]);
  const [masterCVs, setMasterCVs] = useState<CV[]>([]);
  const [freestandingCVs, setFreestandingCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingDuplicate, setIsCreatingDuplicate] = useState(false);

  // Fetch jobs and CVs when component mounts
  useEffect(() => {
    if (isExpanded) {
      fetchJobs();
      fetchCVs();
    }
  }, [isExpanded]);

  const fetchJobs = async () => {
    try {
      // Use same authentication logic as CV Journey page
      const userId = unifiedUser?.id || user?.id;
      if (!userId) return;

      const response = await fetch(`/api/jobs?userId=${userId}&status=all`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setJobs(result.data.jobs || []);
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchCVs = async () => {
    try {
      const userId = unifiedUser?.id || user?.id;
      if (!userId) return;

      const response = await fetch(`/api/cvs?userId=${userId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const allCVs = result.data.cvs || [];
          
          // Separate CVs according to Application Package model
          const masters = allCVs.filter((cv: CV) => 
            (() => {
              const isMasterAtRoot = cv.isMaster === true;
              const isMasterInMetadata = cv.metadata?.isMaster === true;
              const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
              return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
            })()
          );
          const freestanding = allCVs.filter((cv: CV) => 
            !(() => {
              const isMasterAtRoot = cv.isMaster === true;
              const isMasterInMetadata = cv.metadata?.isMaster === true;
              const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
              return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
            })() && 
            (cv.journeyId === null || cv.journeyId === undefined)
          );
          
          console.log('🔍 NewJourneyCard - Master CVs:', masters.length);
          console.log('🔍 NewJourneyCard - Freestanding CVs:', freestanding.length);
          
          setCVs(allCVs);
          setMasterCVs(masters);
          setFreestandingCVs(freestanding);
        }
      }
    } catch (error) {
      console.error('Error fetching CVs:', error);
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Only show freestanding CVs for direct selection (not Master CVs)
  const filteredFreestandingCVs = freestandingCVs.filter(cv =>
    cv.title.toLowerCase().includes(cvSearchQuery.toLowerCase())
  );
  
  // Filter Master CVs for duplication option
  const filteredMasterCVs = masterCVs.filter(cv =>
    cv.title.toLowerCase().includes(cvSearchQuery.toLowerCase())
  );

  const handleStartJourney = () => {
    setIsExpanded(true);
    setCurrentStep(1);
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    setCurrentStep(2);
    setError(null);
  };

  const handleCVSelect = (cv: CV) => {
    setSelectedCV(cv);
    setCurrentStep(3);
    setError(null);
  };
  
  const handleDuplicateMasterCV = async (masterCV: CV) => {
    try {
      setIsCreatingDuplicate(true);
      setError(null);
      
      const userId = unifiedUser?.id || user?.id;
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      console.log('🔄 NewJourneyCard - Duplicating Master CV:', masterCV.title);
      
      // Use ApplicationPackageService to properly duplicate the Master CV
      const duplicateResult = await ApplicationPackageService.duplicateCV({
        sourceCvId: masterCV.id,
        userId,
        newTitle: `${masterCV.title} (Copy for ${selectedJob?.jobTitle})`
      });

      if (duplicateResult.success && duplicateResult.data?.cvId) {
        console.log('✅ NewJourneyCard - Master CV duplicated successfully:', duplicateResult.data.cvId);
        
        // Create a CV object for the duplicated CV
        const duplicatedCV: CV = {
          id: duplicateResult.data.cvId,
          title: `${masterCV.title} (Copy for ${selectedJob?.jobTitle})`,
          status: 'draft',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          isMaster: false,
          journeyId: null
        };
        
        // Select the duplicated CV and proceed
        setSelectedCV(duplicatedCV);
        setCurrentStep(3);
        
        // Refresh CVs to show the new duplicate
        await fetchCVs();
      } else {
        setError(duplicateResult.message || 'Failed to duplicate Master CV');
      }
    } catch (error) {
      console.error('❌ NewJourneyCard - Error duplicating Master CV:', error);
      setError('Failed to duplicate Master CV. Please try again.');
    } finally {
      setIsCreatingDuplicate(false);
    }
  };

  const handleCreateJourney = async () => {
    console.log('🔍 NewJourneyCard - handleCreateJourney called');
    console.log('🔍 NewJourneyCard - selectedJob:', selectedJob);
    console.log('🔍 NewJourneyCard - selectedCV:', selectedCV);
    
    if (!selectedJob || !selectedCV) {
      console.log('❌ NewJourneyCard - Missing job or CV');
      setError('Please select both a job and CV');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const finalJourneyName = journeyName.trim() || `${selectedJob.jobTitle} at ${selectedJob.company}`;
      console.log('🔍 NewJourneyCard - Creating journey with name:', finalJourneyName);
      
      const userId = unifiedUser?.id || user?.id;
      if (!userId) {
        console.log('❌ NewJourneyCard - No user ID available');
        setError('User authentication required');
        return;
      }

      // Step 1: Create Application Package using the corrected service
      console.log('🎯 NewJourneyCard - Creating Application Package');
      const packageResult = await ApplicationPackageService.createNewPackage({
        userId,
        jobId: selectedJob.id,
        journeyName: finalJourneyName
      });

      if (!packageResult.success || !packageResult.data?.journeyId) {
        setError(packageResult.message || 'Failed to create application package');
        return;
      }

      const journeyId = packageResult.data.journeyId;
      console.log('✅ NewJourneyCard - Application Package created:', journeyId);

      // Step 2: Lock the selected CV to the package
      console.log('🔒 NewJourneyCard - Locking CV to package');
      const lockResult = await ApplicationPackageService.lockDocumentToPackage(
        selectedCV.id,
        journeyId,
        'cv',
        userId
      );

      if (!lockResult.success) {
        setError(lockResult.message || 'Failed to link CV to application package');
        return;
      }

      console.log('✅ NewJourneyCard - CV locked to package successfully');
      
      // Start the journey in the context
      startJourney(selectedJob.id);
      
      // Call the callback if provided
      if (onJourneyCreated) {
        console.log('🔍 NewJourneyCard - Calling onJourneyCreated callback');
        onJourneyCreated({
          jobId: selectedJob.id,
          cvId: selectedCV.id,
          journeyName: finalJourneyName
        });
      }
      
      // Reset the card
      resetCard();
      
    } catch (error) {
      console.error('❌ NewJourneyCard - Error creating journey:', error);
      setError('An error occurred while creating the journey');
    } finally {
      setLoading(false);
    }
  };

  const resetCard = () => {
    setIsExpanded(false);
    setCurrentStep(1);
    setSelectedJob(null);
    setSelectedCV(null);
    setJourneyName('');
    setSearchQuery('');
    setCvSearchQuery('');
    setError(null);
  };

  const handleCancel = () => {
    resetCard();
    if (onCancel) {
      onCancel();
    }
  };

  const canProceedToStep2 = selectedJob !== null;
  const canProceedToStep3 = selectedCV !== null;
  const canCreateJourney = selectedJob && selectedCV && journeyName.trim();

  return (
    <motion.div
      className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-300 group ${className}`}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {!isExpanded ? (
        // Compact state - Start button
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Plus className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Start New Journey</h3>
                <p className="text-xs text-gray-600 dark:text-white/60">Create a CV journey for your job application</p>
              </div>
            </div>
            <motion.button
              onClick={handleStartJourney}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles className="h-4 w-4" />
              Get Started
            </motion.button>
          </div>
        </div>
      ) : (
        // Expanded state - Multi-step form
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Start New Journey</h3>
              <p className="text-sm text-gray-600 dark:text-white/60">
                Step {currentStep} of 3: {
                  currentStep === 1 ? 'Select Job' : 
                  currentStep === 2 ? 'Select CV' : 
                  'Name Journey'
                }
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-white/20 text-gray-600 dark:text-white/60'
                  }`}>
                    {step < currentStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      step
                    )}
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      step < currentStep ? 'bg-blue-500' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-white/60">
              <span>Select Job</span>
              <span>Select CV</span>
              <span>Name Journey</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-gray-900 dark:text-white font-semibold mb-2">Select an Opportunity</h4>
                  <p className="text-gray-600 dark:text-white/60 text-sm mb-4">Choose a job from your tracker</p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-white/40" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-400/50 focus:border-transparent"
                  />
                </div>

                {/* Jobs List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredJobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 dark:text-white/60">
                      <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No jobs found</p>
                      <p className="text-sm">Add a job to your tracker first</p>
                    </div>
                  ) : (
                    filteredJobs.map((job) => (
                      <motion.button
                        key={job.id}
                        onClick={() => handleJobSelect(job)}
                        className={`w-full p-4 text-left rounded-lg border transition-all ${
                          selectedJob?.id === job.id
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          <Building className="h-5 w-5 text-blue-400" />
                          <div>
                            <h5 className="text-gray-900 dark:text-white font-medium">{job.jobTitle}</h5>
                            <p className="text-gray-600 dark:text-white/60 text-sm">{job.company}</p>
                          </div>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>

                {canProceedToStep2 && (
                  <motion.button
                    onClick={() => setCurrentStep(2)}
                    className="w-full mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    Continue to CV Selection
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                )}
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-gray-900 dark:text-white font-semibold mb-2">Select a CV</h4>
                  <p className="text-gray-600 dark:text-white/60 text-sm mb-4">Choose a CV for this journey</p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-white/40" />
                  <input
                    type="text"
                    placeholder="Search CVs..."
                    value={cvSearchQuery}
                    onChange={(e) => setCvSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-400/50 focus:border-transparent"
                  />
                </div>

                {/* CVs List */}
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {/* Freestanding CVs Section */}
                  {filteredFreestandingCVs.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-white/70 border-b border-gray-200 dark:border-white/20 pb-1">
                        Available CVs
                      </h5>
                      {filteredFreestandingCVs.map((cv) => (
                        <motion.button
                          key={cv.id}
                          onClick={() => handleCVSelect(cv)}
                          className={`w-full p-4 text-left rounded-lg border transition-all ${
                            selectedCV?.id === cv.id
                              ? 'border-blue-500 bg-blue-500/20'
                              : 'border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-400" />
                            <div className="flex-1">
                              <h5 className="text-gray-900 dark:text-white font-medium">{cv.title}</h5>
                              <p className="text-gray-600 dark:text-white/60 text-sm">Modified: {new Date(cv.lastModified).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                  
                  {/* Master CVs Section */}
                  {filteredMasterCVs.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-white/70 border-b border-gray-200 dark:border-white/20 pb-1 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        Master CVs (Click to Duplicate)
                      </h5>
                      {filteredMasterCVs.map((cv) => (
                        <motion.button
                          key={cv.id}
                          onClick={() => handleDuplicateMasterCV(cv)}
                          disabled={isCreatingDuplicate}
                          className="w-full p-4 text-left rounded-lg border border-yellow-300 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          whileHover={{ scale: isCreatingDuplicate ? 1 : 1.02 }}
                          whileTap={{ scale: isCreatingDuplicate ? 1 : 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-5 w-5 text-yellow-500" />
                              <Copy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="flex-1">
                              <h5 className="text-gray-900 dark:text-white font-medium">{cv.title}</h5>
                              <p className="text-gray-600 dark:text-white/60 text-sm">
                                {isCreatingDuplicate ? 'Creating duplicate...' : 'Click to duplicate for this journey'}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                  
                  {/* No CVs Found */}
                  {filteredFreestandingCVs.length === 0 && filteredMasterCVs.length === 0 && (
                    <div className="text-center py-8 text-gray-600 dark:text-white/60">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No CVs found</p>
                      <p className="text-sm">Create a CV first or check your search terms</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <motion.button
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#232f1c] hover:bg-gray-200 dark:hover:bg-[#2a3a1f] text-gray-700 dark:text-white font-medium rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Back
                  </motion.button>
                  {canProceedToStep3 && (
                    <motion.button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      Continue to Naming
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-gray-900 dark:text-white font-semibold mb-2">Name Your Journey</h4>
                  <p className="text-gray-600 dark:text-white/60 text-sm mb-4">Give your journey a memorable name</p>
                </div>

                {/* Selected Items Summary */}
                <div className="space-y-3 p-4 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedJob?.jobTitle}</p>
                      <p className="text-gray-600 dark:text-white/60 text-sm">{selectedJob?.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedCV?.title}</p>
                      <p className="text-gray-600 dark:text-white/60 text-sm">CV</p>
                    </div>
                  </div>
                </div>

                {/* Journey Name Input */}
                <div>
                  <label className="block text-gray-900 dark:text-white font-medium mb-2">Journey Name</label>
                  <input
                    type="text"
                    value={journeyName}
                    onChange={(e) => setJourneyName(e.target.value)}
                    placeholder={`${selectedJob?.jobTitle} at ${selectedJob?.company}`}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-400/50 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2 mt-6">
                  <motion.button
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#232f1c] hover:bg-gray-200 dark:hover:bg-[#2a3a1f] text-gray-700 dark:text-white font-medium rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Back
                  </motion.button>
                  <motion.button
                    onClick={handleCreateJourney}
                    disabled={!canCreateJourney || loading}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    whileHover={{ scale: canCreateJourney && !loading ? 1.02 : 1 }}
                    whileTap={{ scale: canCreateJourney && !loading ? 0.98 : 1 }}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Create Journey
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default NewJourneyCard;
