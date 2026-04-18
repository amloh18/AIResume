'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, FileText, CheckCircle, Download, X, Settings, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useSession } from 'next-auth/react';
import { useATS } from '@/contexts/ATSContext';

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
  const { data: session } = useSession();
  const user = session?.user;
  const [isExpanded, setIsExpanded] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [cvData, setCvData] = useState<any>(null);
  const [coverLetterData, setCoverLetterData] = useState<any>(null);
  const [atsScoreState, setAtsScoreState] = useState<number | null>(null);
  const [atsScoreLoading, setAtsScoreLoading] = useState<boolean>(false);
  const hasAttemptedATSCalculation = React.useRef(false);
  
  const { atsScore: contextAtsScore, refreshATSScore, isATSLoading: contextAtsLoading } = useATS();

  // Scroll direction detection for hide/show banner
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide banner immediately when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 10) {
        // Scrolling down past 10px - hide banner
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show banner
        setIsVisible(true);
      }

      // Always show at the very top
      if (currentScrollY <= 10) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Fetch ATS score function (same as journey card)
  const fetchATSScore = async (cvId: string, jobId: string) => {
    if (!cvId || !jobId || atsScoreLoading) {
      console.log('🚫 JourneyStatusBanner - ATS calculation skipped:', {
        hasCvId: !!cvId,
        hasJobId: !!jobId,
        isLoading: atsScoreLoading
      });
      return;
    }

    setAtsScoreLoading(true);
    console.log('🔍 JourneyStatusBanner - Fetching ATS score for CV:', cvId, 'Job:', jobId);

    try {
      await refreshATSScore(cvId, jobId, user?.id);
      // Wait a short tick for context to update
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('❌ JourneyStatusBanner - Error fetching ATS score:', error);
      setAtsScoreState(-1); // Mark as failed
    } finally {
      setAtsScoreLoading(false);
    }
  };

  // Keep local score in sync with context score if this is the active journey's CV
  useEffect(() => {
    if (contextAtsScore !== null && activeJourney.cvId && contextAtsScore > 0) {
      setAtsScoreState(contextAtsScore);
    }
  }, [contextAtsScore, activeJourney.cvId]);

  // Load linked documents data
  useEffect(() => {
    const loadLinkedData = async () => {
      if (!user?.id) return;

      try {
        // Load job data
        if (activeJourney.jobId && activeJourney.jobId !== 'temp') {
          const jobResponse = await fetch(`/api/jobs/${activeJourney.jobId}?userId=${user.id}`);
          if (jobResponse.ok) {
            const jobResult = await jobResponse.json();
            setJobData(jobResult.job);
          }
        }

        // Load ALL user CVs first, then find the linked one (same as journey card)
        const cvsResponse = await fetch(`/api/cvs?userId=${user.id}`);
        if (cvsResponse.ok) {
          const cvsData = await cvsResponse.json();
          if (cvsData.success && cvsData.data.cvs) {
            const cvs = cvsData.data.cvs || [];
            // Find the CV linked to this journey
            const linkedCV = cvs.find((cv: any) => String(cv.id) === String(activeJourney.cvId));
            if (linkedCV) {
              setCvData(linkedCV);
              console.log('🔍 JourneyStatusBanner - Found linked CV:', linkedCV);
            } else {
              console.log('🔍 JourneyStatusBanner - CV not found in user CVs:', activeJourney.cvId);
            }
          }
        }

        // Load ALL user cover letters first, then find the linked one (same as journey card)
        const coverLettersResponse = await fetch(`/api/cover-letters?userId=${user.id}`);
        if (coverLettersResponse.ok) {
          const coverLettersData = await coverLettersResponse.json();
          if (coverLettersData.success && coverLettersData.data.coverLetters) {
            const coverLetters = coverLettersData.data.coverLetters || [];
            // Find the cover letter linked to this journey
            const linkedCoverLetter = coverLetters.find((cl: any) => String(cl.id) === String(activeJourney.coverLetterId));
            if (linkedCoverLetter) {
              setCoverLetterData(linkedCoverLetter);
              console.log('🔍 JourneyStatusBanner - Found linked cover letter:', linkedCoverLetter);
            } else {
              console.log('🔍 JourneyStatusBanner - Cover letter not found in user cover letters:', activeJourney.coverLetterId);
            }
          }
        }
      } catch (error) {
        console.error('Error loading linked data:', error);
      }
    };

    loadLinkedData();
  }, [activeJourney.jobId, activeJourney.cvId, activeJourney.coverLetterId, user?.id]);

  // Initialize ATS score from journey data or auto-fetch if needed (same as journey card)
  useEffect(() => {
    // First, check if journey already has an ATS score
    if (activeJourney.atsScore !== undefined && activeJourney.atsScore !== null) {
      console.log('🔍 JourneyStatusBanner - Using existing ATS score from journey:', activeJourney.atsScore);
      setAtsScoreState(activeJourney.atsScore);
      hasAttemptedATSCalculation.current = true; // Mark as attempted
      return;
    }
    
    // Only auto-fetch if we don't have a score, CV is linked, haven't attempted before, and not currently loading
    if (activeJourney.cvId && activeJourney.jobId && atsScoreState === null && !atsScoreLoading && !hasAttemptedATSCalculation.current) {
      console.log('🔍 JourneyStatusBanner - Auto-fetching ATS score for linked CV');
      hasAttemptedATSCalculation.current = true; // Mark as attempted
      fetchATSScore(activeJourney.cvId, activeJourney.jobId);
    }
  }, [activeJourney.cvId, activeJourney.jobId, activeJourney.atsScore, atsScoreState, atsScoreLoading]);

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
            `📍 ${jobData.location || 'Location not specified'}`,
            `💼 ${jobData.jobType || 'Full-time'}`,
            `📅 Posted ${jobData.datePosted ? new Date(jobData.datePosted).toLocaleDateString() : 'Recently'}`
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
            `📝 ${cvData.cvData?.work?.length || 0} experience, ${cvData.cvData?.education?.length || 0} education`,
            `🎨 Template: ${cvData.template || 'Default'}`,
            `📅 Modified ${cvData.lastModified ? new Date(cvData.lastModified).toLocaleDateString() : 'Recently'}`
          ] : []
        };
      
      case 3: // ATS Score
        const scoreValue = (atsScoreState !== null ? atsScoreState : 0) || cvData?.metadata?.atsScore || 0;
        return {
          title: scoreValue > 0 ? `ATS Score: ${scoreValue}%` : 'ATS Score Pending',
          subtitle: scoreValue > 0 
            ? `${scoreValue >= 80 ? '🎉 Excellent' : scoreValue >= 60 ? '⚠️ Good' : scoreValue >= 40 ? '📊 Fair' : '❌ Needs Work'} match`
            : 'Analyze CV compatibility',
          description: status === 'completed'
            ? `Your CV scores ${scoreValue}% for this job`
            : status === 'active'
            ? 'Check how well your CV matches job requirements'
            : 'Complete CV step first',
          actionText: status === 'completed' ? 'Improve Score' : 'Check Score',
          details: scoreValue > 0 ? [
            `🎯 Match quality: ${scoreValue >= 80 ? 'High' : scoreValue >= 60 ? 'Medium' : 'Low'}`,
            `💡 ${scoreValue < 80 ? 'Improvement tips available' : 'Optimized for this role'}`,
            `🕒 Last checked ${cvData?.metadata?.atsScoreDate ? new Date(cvData.metadata.atsScoreDate).toLocaleDateString() : 'Today'}`
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
            `📝 ${coverLetterData.wordCount || 0} words • ${coverLetterData.tone || 'Professional'} tone`,
            `📅 Created ${coverLetterData.createdAt ? new Date(coverLetterData.createdAt).toLocaleDateString() : 'Recently'}`,
            `🎯 ${coverLetterData.isPersonalized ? 'Customized' : 'Template'} for ${jobData?.company || 'this position'}`
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
            `✅ Job: ${jobData?.title || 'Added'}`,
            `✅ CV: ${cvData?.title || 'Created'}`,
            `✅ ATS: ${atsScoreState || cvData?.metadata?.atsScore || 0}%`,
            `✅ Cover Letter: ${coverLetterData?.title || 'Created'}`
          ] : [
            `${jobData ? '✅' : '⭕'} Job tracking`,
            `${cvData ? '✅' : '⭕'} CV creation`,
            `${((atsScoreState && atsScoreState > 0) || (cvData?.metadata?.atsScore && cvData.metadata.atsScore > 0)) ? '✅' : '⭕'} ATS analysis`,
            `${coverLetterData ? '✅' : '⭕'} Cover letter`
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

  // Use the same logic as JourneyTimelineCard for consistency
  const getStepStatus = (stepId: number) => {
    // Use database values directly like the journey card
    const liveProgress = {
      currentStep: activeJourney.currentStep || 1,
      totalSteps: activeJourney.totalSteps || 5,
      atsScore: activeJourney.atsScore,
      cvId: activeJourney.cvId,
      coverLetterId: activeJourney.coverLetterId,
      status: activeJourney.status || 'in-progress'
    };

    console.log(`🔍 JourneyStatusBanner - getStepStatus(${stepId}):`, {
      stepId,
      liveProgress,
      jobData: !!jobData,
      cvData: !!cvData,
      coverLetterData: !!coverLetterData,
      cvNotFound: !cvData && liveProgress.cvId,
      coverLetterNotFound: !coverLetterData && liveProgress.coverLetterId
    });
    
    switch (stepId) {
      case 1: // Job Added
        return activeJourney.jobTitle && activeJourney.company ? 'completed' : 'pending';
      
      case 2: // CV Created/Linked
        return (liveProgress.cvId && cvData) ? 'completed' : 
               (liveProgress.currentStep >= 2 ? 'active' : 'pending');
      
      case 3: // ATS Score Checked
        // Only completed if we have a valid ATS score (not -1) AND CV is linked and available
        return (atsScoreState !== null && atsScoreState !== -1 && liveProgress.cvId && cvData) ? 'completed' :
               (liveProgress.currentStep >= 3 && liveProgress.cvId && cvData ? 'active' : 'pending');
      
      case 4: // Cover Letter Created
        // Only completed if cover letter is explicitly linked to this journey and available
        return (liveProgress.coverLetterId && liveProgress.coverLetterId.trim() !== '' && coverLetterData) ? 'completed' :
               (liveProgress.currentStep >= 4 && atsScoreState !== null && atsScoreState !== -1 && cvData ? 'active' : 'pending');
      
      case 5: // Download/Apply
        // Only completed if journey status is explicitly 'completed'
        return liveProgress.status === 'completed' ? 'completed' :
               (liveProgress.currentStep >= 5 && liveProgress.coverLetterId ? 'active' : 'pending');
      
      default:
        return 'pending';
    }
  };


  return (
    <>
      {/* Sliding Banner - Above header, hides on scroll */}
      <motion.div
        className="sticky top-0 left-0 right-0 bg-gradient-to-r from-lime-500/10 to-lime-600/10 border-b border-lime-500/20 z-40 backdrop-blur-sm overflow-hidden"
        initial={{ opacity: 1, y: 0 }}
        animate={{ 
          opacity: isVisible ? 1 : 0,
          y: isVisible ? 0 : -100
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ 
          pointerEvents: isVisible ? 'auto' : 'none'
        }}
      >
        {/* Compact Banner */}
        <div className="px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Left: Journey Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Briefcase className="h-4 w-4 text-lime-400 flex-shrink-0" />
                <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {displayJourney.jobTitle || jobData?.title || 'Active Journey'}
                  {displayJourney.company || jobData?.company ? (
                    <span className="text-gray-600 dark:text-white/60 font-normal">
                      {' - '}
                      {displayJourney.company || jobData?.company}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Progress Info */}
              {(isJourneyActive || journey) && (() => {
                // Calculate completion percentage
                const totalSteps = displayJourney.totalSteps || 5;
                const completedSteps = [1, 2, 3, 4, 5].filter(step => getStepStatus(step) === 'completed').length;
                const completionPercentage = Math.round((completedSteps / totalSteps) * 100);
                
                // Get next action needed
                const getNextAction = () => {
                  const currentStep = displayJourney.currentStep || 1;
                  const currentStatus = getStepStatus(currentStep);
                  
                  if (currentStatus === 'completed' && currentStep < totalSteps) {
                    const nextStep = currentStep + 1;
                    return getStepLabel(nextStep);
                  } else if (currentStatus === 'active') {
                    return getStepLabel(currentStep);
                  } else if (currentStatus === 'pending') {
                    return getStepLabel(currentStep);
                  }
                  return 'Complete';
                };

                // Count completed items
                const hasJob = getStepStatus(1) === 'completed';
                const hasCV = getStepStatus(2) === 'completed';
                const hasATS = getStepStatus(3) === 'completed';
                const hasCL = getStepStatus(4) === 'completed';
                const isReady = getStepStatus(5) === 'completed';

                return (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Progress with completion percentage */}
                    <div className="flex items-center gap-2 px-2 py-1 bg-lime-500/20 rounded-full">
                      {getStepIcon(displayJourney.currentStep)}
                      <span className="text-xs font-medium text-lime-600 dark:text-lime-400 whitespace-nowrap">
                        {completionPercentage}%
                      </span>
                    </div>

                    {/* ATS Score with quality indicator */}
                    {(atsScoreState !== null && atsScoreState !== -1 && atsScoreState > 0) && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 rounded-full" title={`ATS Match Score: ${atsScoreState}%`}>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          ATS: {atsScoreState}%
                        </span>
                        {atsScoreState >= 80 ? (
                          <span className="text-[10px] text-green-500">✓</span>
                        ) : atsScoreState >= 60 ? (
                          <span className="text-[10px] text-yellow-500">⚠</span>
                        ) : (
                          <span className="text-[10px] text-red-500">!</span>
                        )}
                      </div>
                    )}

                    {/* Quick Status Overview */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-500/10 dark:bg-white/5 rounded-full">
                      <div className="flex items-center gap-1">
                        {hasJob ? (
                          <CheckCircle className="h-3 w-3 text-green-500" title="Job Added" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border-2 border-gray-400" title="Job Pending" />
                        )}
                        {hasCV ? (
                          <FileText className="h-3 w-3 text-green-500 ml-0.5" title="CV Ready" />
                        ) : (
                          <FileText className="h-3 w-3 text-gray-400 ml-0.5" title="CV Pending" />
                        )}
                        {hasATS ? (
                          <CheckCircle className="h-3 w-3 text-green-500 ml-0.5" title="ATS Scored" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border-2 border-gray-400 ml-0.5" title="ATS Pending" />
                        )}
                        {hasCL ? (
                          <Mail className="h-3 w-3 text-green-500 ml-0.5" title="Cover Letter Ready" />
                        ) : (
                          <Mail className="h-3 w-3 text-gray-400 ml-0.5" title="Cover Letter Pending" />
                        )}
                      </div>
                      {isReady && (
                        <span className="text-[10px] text-green-500 font-medium ml-1">Ready!</span>
                      )}
                    </div>

                    {/* Next Action */}
                    {!isReady && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-full" title="Next Action">
                        <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium whitespace-nowrap">
                          Next: {getNextAction()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3 py-1 text-xs text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Details
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
                      <div className="grid grid-cols-1 tablet:grid-cols-5 gap-4">
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
