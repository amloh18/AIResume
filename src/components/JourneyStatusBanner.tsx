'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, FileText, CheckCircle, Download, X, Settings, Mail, Eye, ExternalLink } from 'lucide-react';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CVJourneyModal from '@/components/modals/CVJourneyModal';

const JourneyStatusBanner: React.FC = () => {
  const { state, endJourney } = useJobJourney();
  const { isJourneyActive, jobTitle, company, currentStep, currentJobId, cvId, cvName, atsScore, coverLetterId } = state;
  const { data: session } = useSession();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [jobData, setJobData] = useState<any>(null);
  const [cvData, setCvData] = useState<any>(null);
  const [coverLetterData, setCoverLetterData] = useState<any>(null);

  // Load linked documents data
  useEffect(() => {
    const loadLinkedData = async () => {
      if (!session?.user?.id) return;

      try {
        // Load job data
        if (currentJobId && currentJobId !== 'temp') {
          const jobResponse = await fetch(`/api/jobs/${currentJobId}?userId=${session.user.id}`);
          if (jobResponse.ok) {
            const jobResult = await jobResponse.json();
            setJobData(jobResult.job);
          }
        }

        // Load CV data
        if (cvId) {
          const cvResponse = await fetch(`/api/cvs/${cvId}?userId=${session.user.id}`);
          if (cvResponse.ok) {
            const cvResult = await cvResponse.json();
            setCvData(cvResult.cv);
          }
        }

        // Load cover letter data
        if (coverLetterId) {
          const coverLetterResponse = await fetch(`/api/cover-letters/${coverLetterId}?userId=${session.user.id}`);
          if (coverLetterResponse.ok) {
            const coverLetterResult = await coverLetterResponse.json();
            setCoverLetterData(coverLetterResult.coverLetter);
          }
        }
      } catch (error) {
        console.error('Error loading linked data:', error);
      }
    };

    loadLinkedData();
  }, [currentJobId, cvId, coverLetterId, session?.user?.id]);

  if (!isJourneyActive) {
    return null;
  }

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <Briefcase className="h-4 w-4" />;
      case 2: return <FileText className="h-4 w-4" />;
      case 3: return <Settings className="h-4 w-4" />;
      case 4: return <Mail className="h-4 w-4" />;
      case 5: return <Download className="h-4 w-4" />;
      default: return <Briefcase className="h-4 w-4" />;
    }
  };

  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: return 'Add Job';
      case 2: return 'Create CV';
      case 3: return 'ATS Score';
      case 4: return 'Cover Letter';
      case 5: return 'Download';
      default: return 'Unknown';
    }
  };

  const getStepStatus = (stepId: number) => {
    switch (stepId) {
      case 1: // Job Added
        return (jobData || currentJobId) ? 'completed' : 'pending';
      
      case 2: // CV Created/Linked
        return (cvData || cvId) ? 'completed' : 
               (jobData || currentJobId) ? 'active' : 'pending';
      
      case 3: // ATS Score Checked
        // Check if ATS score exists for this specific job-CV combination
        const hasATSScore = (atsScore !== null && atsScore > 0) || 
                           (cvData?.metadata?.atsScore && 
                            cvData?.metadata?.atsScoreJobId === currentJobId &&
                            cvData?.metadata?.atsScore > 0);
        return hasATSScore ? 'completed' :
               (cvData || cvId) ? 'active' : 'pending';
      
      case 4: // Cover Letter Created
        const atsCompleted = (atsScore !== null && atsScore > 0) || 
                            (cvData?.metadata?.atsScore && 
                             cvData?.metadata?.atsScoreJobId === currentJobId &&
                             cvData?.metadata?.atsScore > 0);
        return (coverLetterData || coverLetterId) ? 'completed' :
               atsCompleted ? 'active' : 'pending';
      
      case 5: // Download/Apply
        const atsReady = (atsScore !== null && atsScore > 0) || 
                        (cvData?.metadata?.atsScore && 
                         cvData?.metadata?.atsScoreJobId === currentJobId &&
                         cvData?.metadata?.atsScore > 0);
        const hasAllComponents = (jobData || currentJobId) && (cvData || cvId) && 
                                atsReady && (coverLetterData || coverLetterId);
        return hasAllComponents ? 'completed' : 'pending';
      
      default:
        return 'pending';
    }
  };

  const handleStepClick = (stepId: number) => {
    // Open CV journey modal at specific step
    setModalStep(stepId);
    setShowJourneyModal(true);
  };

  const handleViewDocument = (type: 'job' | 'cv' | 'cover-letter') => {
    switch (type) {
      case 'job':
        if (currentJobId) {
          router.push(`/dashboard/pipeline`); // Or specific job view
        }
        break;
      case 'cv':
        if (cvId) {
          router.push(`/studio?cvId=${cvId}`);
        }
        break;
      case 'cover-letter':
        if (coverLetterId) {
          router.push(`/studio?type=cover&id=${coverLetterId}`);
        }
        break;
    }
  };

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 bg-gradient-to-r from-lime-500/10 to-lime-600/10 border-b border-lime-500/20 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Compact Banner */}
      <div className="px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Job Info and Progress */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-lime-400" />
              <div>
                <h3 className="text-sm font-medium text-white">
                  {jobData?.title || jobTitle || 'Untitled Job'}
                </h3>
                {(jobData?.company || company) && (
                  <p className="text-xs text-white/60">{jobData?.company || company}</p>
                )}
              </div>
            </div>

            {/* Progress Steps - Clickable */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((stepId) => {
                const status = getStepStatus(stepId);
                return (
                  <motion.button
                    key={stepId}
                    onClick={() => handleStepClick(stepId)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      status === 'completed' 
                        ? 'bg-lime-500 text-black' 
                        : status === 'active' 
                        ? 'bg-lime-400 text-black' 
                        : 'bg-white/20 text-white/60 hover:bg-white/30'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title={getStepLabel(stepId)}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      stepId
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Current Step Info */}
            <div className="flex items-center gap-2 px-3 py-1 bg-lime-500/20 rounded-full">
              {getStepIcon(currentStep)}
              <span className="text-xs font-medium text-lime-400">
                {getStepLabel(currentStep)}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Eye className="h-3 w-3" />
              {isExpanded ? 'Hide' : 'Details'}
            </motion.button>
            <motion.button
              onClick={endJourney}
              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="End Journey"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-lime-500/20 bg-black/20 overflow-hidden"
          >
            <div className="px-6 py-4">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Step 1: Job */}
                  <div className={`p-3 rounded-lg border ${
                    getStepStatus(1) === 'completed' 
                      ? 'bg-lime-500/10 border-lime-500/30' 
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-medium text-white">Job</span>
                      {getStepStatus(1) === 'completed' && (
                        <CheckCircle className="h-3 w-3 text-lime-400" />
                      )}
                    </div>
                    {jobData ? (
                      <div>
                        <p className="text-xs text-white font-medium truncate">{jobData.title}</p>
                        <p className="text-xs text-white/60 truncate">{jobData.company}</p>
                        <button
                          onClick={() => handleViewDocument('job')}
                          className="mt-1 text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-white/40">No job selected</p>
                    )}
                  </div>

                  {/* Step 2: CV */}
                  <div className={`p-3 rounded-lg border ${
                    getStepStatus(2) === 'completed' 
                      ? 'bg-lime-500/10 border-lime-500/30' 
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-green-400" />
                      <span className="text-xs font-medium text-white">CV</span>
                      {getStepStatus(2) === 'completed' && (
                        <CheckCircle className="h-3 w-3 text-lime-400" />
                      )}
                    </div>
                    {cvId ? (
                      <div>
                        <p className="text-xs text-white font-medium truncate">
                          {cvName || cvData?.title || 'CV Document'}
                        </p>
                        <p className="text-xs text-white/60">CV Document</p>
                        <button
                          onClick={() => handleViewDocument('cv')}
                          className="mt-1 text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Edit
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-white/40">No CV linked</p>
                    )}
                  </div>

                  {/* Step 3: ATS Score */}
                  <div className={`p-3 rounded-lg border ${
                    getStepStatus(3) === 'completed' 
                      ? 'bg-lime-500/10 border-lime-500/30' 
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-medium text-white">ATS Score</span>
                      {getStepStatus(3) === 'completed' && (
                        <CheckCircle className="h-3 w-3 text-lime-400" />
                      )}
                    </div>
                    {((atsScore !== null && atsScore > 0) || (cvData?.metadata?.atsScore && cvData?.metadata?.atsScoreJobId === currentJobId && cvData?.metadata?.atsScore > 0)) ? (
                      <div>
                        <p className="text-xs text-white font-medium">
                          {atsScore || cvData?.metadata?.atsScore}%
                        </p>
                        <p className="text-xs text-white/60">ATS Optimized</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-white/40">Not checked</p>
                        {(cvData || cvId) && (
                          <button
                            onClick={() => window.location.href = `/studio?cvId=${cvId}&jobId=${currentJobId}&mode=ats-edit`}
                            className="mt-1 text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                          >
                            <Settings className="h-3 w-3" />
                            Check ATS
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 4: Cover Letter */}
                  <div className={`p-3 rounded-lg border ${
                    getStepStatus(4) === 'completed' 
                      ? 'bg-lime-500/10 border-lime-500/30' 
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-orange-400" />
                      <span className="text-xs font-medium text-white">Cover Letter</span>
                      {getStepStatus(4) === 'completed' && (
                        <CheckCircle className="h-3 w-3 text-lime-400" />
                      )}
                    </div>
                    {(coverLetterData && coverLetterId) ? (
                      <div>
                        <p className="text-xs text-white font-medium truncate">{coverLetterData.title}</p>
                        <p className="text-xs text-white/60">Cover Letter</p>
                        <button
                          onClick={() => handleViewDocument('cover-letter')}
                          className="mt-1 text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-white/40">Not created</p>
                        {((atsScore !== null && atsScore > 0) || (cvData?.metadata?.atsScore && cvData?.metadata?.atsScoreJobId === currentJobId && cvData?.metadata?.atsScore > 0)) && (
                          <button
                            onClick={() => window.location.href = `/studio?type=cover_letter&cvId=${cvId}&jobId=${currentJobId}&mode=cover-letter-edit`}
                            className="mt-1 text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            Create
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 5: Ready to Apply */}
                  <div className={`p-3 rounded-lg border ${
                    getStepStatus(5) === 'completed' 
                      ? 'bg-lime-500/10 border-lime-500/30' 
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="h-4 w-4 text-lime-400" />
                      <span className="text-xs font-medium text-white">Ready</span>
                      {getStepStatus(5) === 'completed' && (
                        <CheckCircle className="h-3 w-3 text-lime-400" />
                      )}
                    </div>
                    {getStepStatus(5) === 'completed' ? (
                      <div>
                        <p className="text-xs text-white font-medium">Complete</p>
                        <p className="text-xs text-white/60">Ready to apply</p>
                      </div>
                    ) : (
                      <p className="text-xs text-white/40">In progress</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CV Journey Modal */}
      <CVJourneyModal
        isOpen={showJourneyModal}
        onClose={() => setShowJourneyModal(false)}
        initialStep={modalStep}
      />
    </motion.div>
  );
};

export default JourneyStatusBanner;
