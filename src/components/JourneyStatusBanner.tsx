'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, FileText, CheckCircle, Download, X, Settings, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useFirebaseAuth } from '@/lib/hooks/useFirebaseAuth';

interface JourneyStatusBannerProps {
  journey?: {
    id: string;
    jobId: string;
    jobTitle: string;
    company: string;
    status: 'in-progress' | 'completed';
    currentStep: number;
    totalSteps: number;
    atsScore?: number;
    cvId?: string;
    coverLetterId?: string;
  };
}

const JourneyStatusBanner: React.FC<JourneyStatusBannerProps> = ({ journey }) => {
  const { state, endJourney } = useJobJourney();
  const { isJourneyActive, jobTitle, company, currentStep, currentJobId, cvId, cvName, atsScore, coverLetterId } = state;
  
  // Use journey props if available, otherwise fall back to context
  const activeJourney = journey || {
    id: currentJobId || '',
    jobId: currentJobId || '',
    jobTitle: jobTitle || '',
    company: company || '',
    status: isJourneyActive ? 'in-progress' : 'completed',
    currentStep: currentStep || 1,
    totalSteps: 5,
    atsScore: atsScore || 0,
    cvId: cvId || '',
    coverLetterId: coverLetterId || ''
  };

  // Debug logging to see what data is being used
  console.log('🔍 JourneyStatusBanner - Journey prop:', journey);
  console.log('🔍 JourneyStatusBanner - Context state:', state);
  console.log('🔍 JourneyStatusBanner - Active journey:', activeJourney);
  
  // If we have a journey prop, use it exclusively (don't fall back to context)
  const displayJourney = journey ? journey : activeJourney;
  const { user } = useFirebaseAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [cvData, setCvData] = useState<any>(null);
  const [coverLetterData, setCoverLetterData] = useState<any>(null);


  // Load linked documents data
  useEffect(() => {
    const loadLinkedData = async () => {
      if (!user?.uid) return;

      try {
        // Load job data
        if (activeJourney.jobId && activeJourney.jobId !== 'temp') {
          const jobResponse = await fetch(`/api/jobs/${activeJourney.jobId}?userId=${user.uid}`);
          if (jobResponse.ok) {
            const jobResult = await jobResponse.json();
            setJobData(jobResult.job);
          }
        }

        // Load CV data
        if (activeJourney.cvId) {
          const cvResponse = await fetch(`/api/cvs/${activeJourney.cvId}?userId=${user.uid}`);
          if (cvResponse.ok) {
            const cvResult = await cvResponse.json();
            setCvData(cvResult.cv);
          }
        }

        // Load cover letter data
        if (activeJourney.coverLetterId) {
          const coverLetterResponse = await fetch(`/api/cover-letters/${activeJourney.coverLetterId}?userId=${user.uid}`);
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
  }, [activeJourney.jobId, activeJourney.cvId, activeJourney.coverLetterId, user?.uid]);

  if (!isJourneyActive && !journey) {
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

  const getStepDetails = (step: number) => {
    const status = getStepStatus(step);
    
    switch (step) {
      case 1: // Job Added
        return {
          title: jobData?.title || jobTitle || 'No job selected',
          subtitle: jobData?.company || company || 'Company not specified',
          description: status === 'completed' ? 'Job tracking enabled' : 'Add a job to start your application',
          actionText: status === 'completed' ? 'View Job' : 'Add Job',
          details: jobData ? [
            `Location: ${jobData.location || 'Not specified'}`,
            `Type: ${jobData.jobType || 'Not specified'}`,
            `Posted: ${jobData.datePosted ? new Date(jobData.datePosted).toLocaleDateString() : 'Not specified'}`
          ] : []
        };
      
      case 2: // CV Created/Linked
        return {
          title: cvData?.title || cvName || 'No CV linked',
          subtitle: cvData ? `${cvData.status || 'Draft'} • Version ${cvData.version || 1}` : 'Create or link a CV',
          description: status === 'completed' 
            ? 'CV tailored for this position' 
            : status === 'active' 
            ? 'Ready to create your tailored CV'
            : 'Complete job step first',
          actionText: status === 'completed' ? 'Edit CV' : 'Create CV',
          details: cvData ? [
            `Last modified: ${cvData.lastModified ? new Date(cvData.lastModified).toLocaleDateString() : 'Unknown'}`,
            `Sections: ${cvData.cvData?.work?.length || 0} experience, ${cvData.cvData?.education?.length || 0} education`,
            `Template: ${cvData.template || 'Default'}`
          ] : []
        };
      
      case 3: // ATS Score
        const scoreValue = atsScore || cvData?.metadata?.atsScore || 0;
        return {
          title: scoreValue > 0 ? `ATS Score: ${scoreValue}%` : 'ATS Score Pending',
          subtitle: scoreValue > 0 
            ? `${scoreValue >= 80 ? 'Excellent' : scoreValue >= 60 ? 'Good' : scoreValue >= 40 ? 'Fair' : 'Needs Improvement'} match`
            : 'Analyze CV compatibility',
          description: status === 'completed'
            ? `Your CV scores ${scoreValue}% for this job`
            : status === 'active'
            ? 'Check how well your CV matches job requirements'
            : 'Complete CV step first',
          actionText: status === 'completed' ? 'Improve Score' : 'Check Score',
          details: scoreValue > 0 ? [
            `Match quality: ${scoreValue >= 80 ? 'High' : scoreValue >= 60 ? 'Medium' : 'Low'}`,
            `Recommendations: ${scoreValue < 80 ? 'Available' : 'Optimized'}`,
            `Last checked: ${cvData?.metadata?.atsScoreDate ? new Date(cvData.metadata.atsScoreDate).toLocaleDateString() : 'Today'}`
          ] : []
        };
      
      case 4: // Cover Letter
        return {
          title: coverLetterData?.title || 'No cover letter',
          subtitle: coverLetterData ? `${coverLetterData.status || 'Draft'} • ${coverLetterData.wordCount || 0} words` : 'Create personalized cover letter',
          description: status === 'completed'
            ? 'Cover letter ready for submission'
            : status === 'active'
            ? 'Create a compelling cover letter'
            : 'Complete ATS scoring first',
          actionText: status === 'completed' ? 'Edit Letter' : 'Create Letter',
          details: coverLetterData ? [
            `Created: ${coverLetterData.createdAt ? new Date(coverLetterData.createdAt).toLocaleDateString() : 'Unknown'}`,
            `Tone: ${coverLetterData.tone || 'Professional'}`,
            `Personalization: ${coverLetterData.isPersonalized ? 'Customized' : 'Template'}`
          ] : []
        };
      
      case 5: // Download/Apply
        const hasAllComponents = status === 'completed';
        return {
          title: hasAllComponents ? 'Ready to Apply' : 'Preparing Application',
          subtitle: hasAllComponents ? 'All documents ready for submission' : 'Complete previous steps',
          description: hasAllComponents
            ? 'Download your application package and apply'
            : 'Finish all steps to prepare your application',
          actionText: hasAllComponents ? 'Download & Apply' : 'Complete Steps',
          details: hasAllComponents ? [
            `✓ Job: ${jobData?.title || 'Added'}`,
            `✓ CV: ${cvData?.title || 'Created'}`,
            `✓ ATS Score: ${atsScore || cvData?.metadata?.atsScore || 0}%`,
            `✓ Cover Letter: ${coverLetterData?.title || 'Created'}`
          ] : [
            `${jobData ? '✓' : '○'} Job tracking`,
            `${cvData ? '✓' : '○'} CV creation`,
            `${(atsScore > 0 || cvData?.metadata?.atsScore > 0) ? '✓' : '○'} ATS analysis`,
            `${coverLetterData ? '✓' : '○'} Cover letter`
          ]
        };
      
      default:
        return {
          title: 'Unknown Step',
          subtitle: '',
          description: '',
          actionText: 'Continue',
          details: []
        };
    }
  };

  const getStepStatus = (stepId: number) => {
    switch (stepId) {
      case 1: // Job Added
        return (jobData || activeJourney.jobId) ? 'completed' : 'pending';
      
      case 2: // CV Created/Linked
        // Check if CV is specifically linked to this journey
        const hasLinkedCV = (cvData && cvData.jobId === activeJourney.jobId) || 
                           (activeJourney.cvId && activeJourney.cvId === activeJourney.cvId);
        return hasLinkedCV ? 'completed' : 
               (jobData || activeJourney.jobId) ? 'active' : 'pending';
      
      case 3: // ATS Score Checked
        // Check if ATS score exists for this specific job-CV combination
        const hasATSScore = (activeJourney.atsScore !== null && activeJourney.atsScore > 0) || 
                           (cvData?.metadata?.atsScore && 
                            cvData?.metadata?.atsScoreJobId === activeJourney.jobId &&
                            cvData?.metadata?.atsScore > 0);
        return hasATSScore ? 'completed' :
               (cvData || activeJourney.cvId) ? 'active' : 'pending';
      
      case 4: // Cover Letter Created
        const atsCompleted = (activeJourney.atsScore !== null && activeJourney.atsScore > 0) || 
                            (cvData?.metadata?.atsScore && 
                             cvData?.metadata?.atsScoreJobId === activeJourney.jobId &&
                             cvData?.metadata?.atsScore > 0);
        return (coverLetterData || activeJourney.coverLetterId) ? 'completed' :
               atsCompleted ? 'active' : 'pending';
      
      case 5: // Download/Apply
        const atsReady = (activeJourney.atsScore !== null && activeJourney.atsScore > 0) || 
                        (cvData?.metadata?.atsScore && 
                         cvData?.metadata?.atsScoreJobId === activeJourney.jobId &&
                         cvData?.metadata?.atsScore > 0);
        const hasLinkedCVForDownload = (cvData && cvData.jobId === activeJourney.jobId) || 
                                     (activeJourney.cvId && activeJourney.cvId === activeJourney.cvId);
        const hasAllComponents = (jobData || activeJourney.jobId) && hasLinkedCVForDownload && 
                                atsReady && (coverLetterData || activeJourney.coverLetterId);
        return hasAllComponents ? 'completed' : 'pending';
      
      default:
        return 'pending';
    }
  };


  return (
    <>
      {/* Sliding Banner */}
      <motion.div
        className="sticky top-0 left-0 right-0 bg-gradient-to-r from-lime-500/10 to-lime-600/10 border-b border-lime-500/20 z-50 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        {/* Compact Banner */}
        <div className="px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left: Journey Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-lime-400" />
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {displayJourney.jobTitle || jobData?.title || 'Active Journey'}
                  {displayJourney.company || jobData?.company ? (
                    <span className="text-gray-600 dark:text-white/60 font-normal">
                      {' - '}
                      {displayJourney.company || jobData?.company}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Current Step Info */}
              {(isJourneyActive || journey) && (
                <div className="flex items-center gap-2 px-3 py-1 bg-lime-500/20 rounded-full">
                  {getStepIcon(displayJourney.currentStep)}
                  <span className="text-xs font-medium text-lime-600 dark:text-lime-400">
                    {getStepLabel(displayJourney.currentStep)}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3 py-1 text-xs text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Detailed Info
              </motion.button>
              
              {isJourneyActive && (
                <motion.button
                  onClick={endJourney}
                  className="p-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="End Journey"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Sliding Step Cards */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="border-t border-lime-500/20 bg-black/20 overflow-hidden"
              style={{ willChange: 'height' }}
            >
              <div className="px-6 py-4">
                <div className="max-w-7xl mx-auto">
                  {/* Active Journey Steps */}
                  {isJourneyActive && (
                    <div className="mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map((stepId) => {
                          const status = getStepStatus(stepId);
                          const details = getStepDetails(stepId);
                          return (
                            <motion.div
                              key={stepId}
                              className={`p-4 rounded-lg border transition-all ${
                                status === 'completed' 
                                  ? 'bg-lime-500/10 border-lime-500/30' 
                                  : status === 'active'
                                  ? 'bg-lime-400/10 border-lime-400/30'
                                  : 'bg-white/5 border-white/10'
                              }`}
                            >
                              {/* Header */}
                              <div className="flex items-center gap-2 mb-3">
                                {getStepIcon(stepId)}
                                <span className="text-xs font-medium text-white">{getStepLabel(stepId)}</span>
                                {status === 'completed' && (
                                  <CheckCircle className="h-3 w-3 text-lime-400" />
                                )}
                              </div>

                              {/* Main Content */}
                              <div className="space-y-2 mb-3">
                                <div>
                                  <h4 className="text-sm font-medium text-white truncate" title={details.title}>
                                    {details.title}
                                  </h4>
                                  {details.subtitle && (
                                    <p className="text-xs text-white/70 truncate" title={details.subtitle}>
                                      {details.subtitle}
                                    </p>
                                  )}
                                </div>
                                
                                <p className="text-xs text-white/60">
                                  {details.description}
                                </p>
                              </div>

                              {/* Details List */}
                              {details.details.length > 0 && (
                                <div className="space-y-1 mb-3">
                                  {details.details.slice(0, 2).map((detail, index) => (
                                    <div key={index} className="text-xs text-white/50 truncate" title={detail}>
                                      {detail}
                                    </div>
                                  ))}
                                  {details.details.length > 2 && (
                                    <div className="text-xs text-white/40">
                                      +{details.details.length - 2} more...
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Status Indicator */}
                              <div className="pt-2 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-white/60">
                                    {status === 'completed' ? 'Completed' : 
                                     status === 'active' ? 'Active' : 'Pending'}
                                  </span>
                                  <span className="text-xs text-lime-400 font-medium">
                                    {status === 'completed' ? '✓ Done' : 
                                     status === 'active' ? '→ Next' : '○ Waiting'}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </>
  );
};

export default JourneyStatusBanner;
