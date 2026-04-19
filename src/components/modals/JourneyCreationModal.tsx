'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Plus, 
  ArrowRight,
  Search,
  Star,
  Building2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  createdAt: string;
}

interface CV {
  id: string;
  title: string;
  isMaster: boolean;
  lastModified: string;
  status: string;
}

interface JourneyCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJourneyCreated: (journeyData: {
    jobId: string;
    cvId: string;
    journeyName: string;
  }) => void;
}

const JourneyCreationModal: React.FC<JourneyCreationModalProps> = ({
  isOpen,
  onClose,
  onJourneyCreated
}) => {
  const { data: session } = useSession();
  const { isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [userCVs, setUserCVs] = useState<CV[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [journeyName, setJourneyName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadJobs();
      loadCVs();
    }
  }, [isOpen]);

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      if (response.ok) {
        const data = await response.json();
        setAvailableJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadCVs = async () => {
    try {
      const response = await fetch('/api/cvs');
      if (response.ok) {
        const data = await response.json();
        setUserCVs(data.cvs || []);
        // Auto-select master CV if available
        const masterCV = data.cvs?.find((cv: CV) => cv.isMaster);
        if (masterCV) {
          setSelectedCV(masterCV);
        }
      }
    } catch (error) {
      console.error('Error loading CVs:', error);
    }
  };

  const filteredJobs = availableJobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateJourney = async () => {
    if (!selectedJob || !selectedCV) return;

    setIsLoading(true);
    try {
      // Generate smart default name
      const defaultName = `Application for ${selectedJob.title} at ${selectedJob.company}`;
      const finalName = journeyName || defaultName;

      onJourneyCreated({
        jobId: selectedJob.id,
        cvId: selectedCV.id,
        journeyName: finalName
      });

      onClose();
    } catch (error) {
      console.error('Error creating journey:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl w-[90%] max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Start New Journey
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                Step {currentStep} of 3: {currentStep === 1 ? 'Select Job' : currentStep === 2 ? 'Select CV' : 'Name Journey'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-lime-500 text-black'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      step < currentStep ? 'bg-lime-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Select Job</span>
              <span>Select CV</span>
              <span>Name Journey</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto min-h-0">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Select an Opportunity
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    Choose a job from your tracker to create a journey for
                  </p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  />
                </div>

                {/* Jobs List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredJobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No jobs found</p>
                      <p className="text-sm">Add a job to your tracker first</p>
                    </div>
                  ) : (
                    filteredJobs.map((job) => (
                      <motion.button
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className={`w-full p-4 text-left rounded-lg border transition-all ${
                          selectedJob?.id === job.id
                            ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-4 w-4 text-gray-500" />
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {job.title}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {job.company} {job.location && `• ${job.location}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Added {formatDate(job.createdAt)}
                            </p>
                          </div>
                          {selectedJob?.id === job.id && (
                            <CheckCircle className="h-5 w-5 text-lime-500" />
                          )}
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Select Base CV
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    Choose a CV to use as the foundation for this journey. A copy will be created for editing.
                  </p>
                </div>

                {/* CVs List */}
                <div className="space-y-2">
                  {userCVs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No CVs found</p>
                      <p className="text-sm">Create a CV first</p>
                    </div>
                  ) : (
                    userCVs.map((cv) => (
                      <motion.button
                        key={cv.id}
                        onClick={() => setSelectedCV(cv)}
                        className={`w-full p-4 text-left rounded-lg border transition-all ${
                          selectedCV?.id === cv.id
                            ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {cv.title}
                              </h4>
                              {cv.isMaster && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-full text-xs">
                                  <Star className="h-3 w-3" />
                                  Master
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Modified {formatDate(cv.lastModified)} • {cv.status}
                            </p>
                          </div>
                          {selectedCV?.id === cv.id && (
                            <CheckCircle className="h-5 w-5 text-lime-500" />
                          )}
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>

                {/* Note */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Selecting your Master CV will create a new, editable copy for this journey, keeping your original safe.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Name Your Journey
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    Give your journey a descriptive name to easily identify it later
                  </p>
                </div>

                {/* Journey Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Journey Name
                  </label>
                  <input
                    type="text"
                    value={journeyName}
                    onChange={(e) => setJourneyName(e.target.value)}
                    placeholder={`Application for ${selectedJob?.title} at ${selectedJob?.company}`}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  />
                </div>

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Journey Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-300">
                        <strong>Target:</strong> {selectedJob?.title} at {selectedJob?.company}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-300">
                        <strong>Using:</strong> A copy of '{selectedCV?.title}'
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={currentStep === 1 ? onClose : handleBack}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>
            
            <div className="flex items-center gap-3">
              {currentStep < 3 ? (
                <motion.button
                  onClick={handleNext}
                  disabled={!selectedJob || (currentStep === 2 && !selectedCV)}
                  className="flex items-center gap-2 px-6 py-2 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] disabled:bg-gray-300 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors"
                  whileHover={{ scale: selectedJob && (currentStep === 1 || selectedCV) ? 1.02 : 1 }}
                  whileTap={{ scale: selectedJob && (currentStep === 1 || selectedCV) ? 0.98 : 1 }}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleCreateJourney}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] disabled:bg-gray-300 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors"
                  whileHover={{ scale: !isLoading ? 1.02 : 1 }}
                  whileTap={{ scale: !isLoading ? 0.98 : 1 }}
                >
                  {isLoading ? 'Creating...' : 'Start Journey'}
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default JourneyCreationModal;
