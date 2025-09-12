'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Download, 
  Trash2, 
  Play,
  Calendar,
  Building,
  MoreVertical,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Eye,
  Settings,
  Mail,
  ExternalLink,
  Plus,
  Copy,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUserPlan } from '@/lib/hooks/useUserPlan';

interface Journey {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'in-progress' | 'completed';
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  atsScore?: number;
  cvId?: string;
  coverLetterId?: string;
  _debug?: {
    linkedCVId?: string;
    linkedCVMetadata?: any;
    linkedCoverLetterId?: string;
    jobStatus?: string;
  };
}

interface CV {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  lastModified: string;
  jobId?: string;
}

interface CoverLetter {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  lastModified: string;
  jobId?: string;
}

interface JourneyTimelineCardProps {
  journey: Journey;
  onResume: (journey: Journey) => void;
  onDownload: (journey: Journey) => void;
  onDelete: (journeyId: string) => void;
  onShowDeleteConfirm: (journeyId: string) => void;
}

const JourneyTimelineCard: React.FC<JourneyTimelineCardProps> = ({
  journey,
  onResume,
  onDownload,
  onDelete,
  onShowDeleteConfirm
}) => {
  const { isDark } = useTheme();
  const { state, updateJourneyStatus, updateJobInfo, updateCurrentStep, updateCVId, updateCoverLetterId, updateAtsScore, updateCurrentJobId, endJourney } = useJobJourney();
  const { hasAI } = useUserPlan();
  const { data: session } = useSession();
  const router = useRouter();
  const [showMenu, setShowMenu] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [userCVs, setUserCVs] = React.useState<CV[]>([]);
  const [userCoverLetters, setUserCoverLetters] = React.useState<CoverLetter[]>([]);
  const [isRunningATSCheck, setIsRunningATSCheck] = React.useState(false);
  const [linkedCV, setLinkedCV] = React.useState<CV | null>(null);
  const [linkedCoverLetter, setLinkedCoverLetter] = React.useState<CoverLetter | null>(null);
  const [expandedStep, setExpandedStep] = React.useState<number | null>(null);
  
  // Always use database values to ensure consistency with actual data
  const liveProgress = {
    currentStep: journey.currentStep,
    totalSteps: journey.totalSteps,
    atsScore: journey.atsScore,
    cvId: journey.cvId, // Always use database cvId
    coverLetterId: journey.coverLetterId, // Always use database coverLetterId
    status: journey.status
  };

  // Load user documents
  React.useEffect(() => {
    const loadUserDocuments = async () => {
      try {
        const userId = session?.user?.id;
        if (!userId) return;

        // Load CVs
        const cvsResponse = await fetch(`/api/cvs?userId=${userId}`);
        if (cvsResponse.ok) {
          const cvsData = await cvsResponse.json();
          if (cvsData.success) {
            const cvs = cvsData.data.cvs || [];
            setUserCVs(cvs);
            
            // Find and set the linked CV
            if (journey.cvId) {
              console.log('Looking for CV with ID:', journey.cvId);
              console.log('Available CVs:', cvs.map(cv => ({ id: cv.id, title: cv.title })));
              const linked = cvs.find((cv: CV) => String(cv.id) === String(journey.cvId));
              console.log('Found linked CV:', linked);
              setLinkedCV(linked || null);
            }
          }
        }

        // Load Cover Letters
        const coverLettersResponse = await fetch(`/api/cover-letters?userId=${userId}`);
        if (coverLettersResponse.ok) {
          const coverLettersData = await coverLettersResponse.json();
          if (coverLettersData.success) {
            const coverLetters = coverLettersData.data.coverLetters || [];
            setUserCoverLetters(coverLetters);
            
            // Find and set the linked cover letter
            if (journey.coverLetterId) {
              const linked = coverLetters.find((cl: CoverLetter) => String(cl.id) === String(journey.coverLetterId));
              setLinkedCoverLetter(linked || null);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user documents:', error);
      }
    };

    if (session?.user?.id) {
      loadUserDocuments();
    }
  }, [session?.user?.id, journey.cvId, journey.coverLetterId]);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  const handleCreateCV = () => {
    updateCurrentJobId(journey.jobId);
    router.push(`/studio?jobId=${journey.jobId}&mode=cv-onboarding`);
  };

  const handleSelectCV = (cvId: string) => {
    updateCVId(cvId);
    const selectedCV = userCVs.find(cv => String(cv.id) === String(cvId));
    setLinkedCV(selectedCV || null);
    fetch(`/api/cv-journey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session?.user?.id,
        jobId: journey.jobId,
        cvId: cvId
      })
    });
    setExpandedStep(null);
  };

  const handleATSCheck = async () => {
    if (!journey.cvId) return;
    
    setIsRunningATSCheck(true);
    try {
      const response = await fetch('/api/ats-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvId: journey.cvId,
          jobId: journey.jobId,
          userId: session?.user?.id
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          updateAtsScore(result.data.score);
          fetch(`/api/cv-journey`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session?.user?.id,
              jobId: journey.jobId,
              atsScore: result.data.score
            })
          });
        }
      }
    } catch (error) {
      console.error('Error running ATS check:', error);
    } finally {
      setIsRunningATSCheck(false);
    }
  };

  const handleCreateCoverLetter = () => {
    router.push(`/studio?type=cover_letter&jobId=${journey.jobId}&cvId=${journey.cvId}&mode=cover-letter-edit`);
  };

  const handleSelectCoverLetter = (coverLetterId: string) => {
    updateCoverLetterId(coverLetterId);
    const selectedCoverLetter = userCoverLetters.find(cl => String(cl.id) === String(coverLetterId));
    setLinkedCoverLetter(selectedCoverLetter || null);
    fetch(`/api/cv-journey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session?.user?.id,
        jobId: journey.jobId,
        coverLetterId: coverLetterId
      })
    });
    setExpandedStep(null);
  };
  
  const steps = [
    { id: 1, label: 'Add Job', icon: Briefcase, color: 'blue' },
    { id: 2, label: 'Create CV', icon: FileText, color: 'green' },
    { id: 3, label: 'ATS Score', icon: CheckCircle, color: 'purple' },
    { id: 4, label: 'Cover Letter', icon: FileText, color: 'orange' },
    { id: 5, label: 'Download', icon: Download, color: 'lime' }
  ];

  // Enhanced step status calculation using live progress data
  const getStepStatus = (stepId: number) => {
    switch (stepId) {
      case 1: // Job Added
        return journey.jobTitle && journey.company ? 'completed' : 'pending';
      
      case 2: // CV Created/Linked
        return liveProgress.cvId ? 'completed' : 
               (liveProgress.currentStep >= 2 ? 'active' : 'pending');
      
      case 3: // ATS Score Checked
        // Only completed if we have an ATS score AND CV is linked
        return (liveProgress.atsScore !== undefined && liveProgress.cvId) ? 'completed' :
               (liveProgress.currentStep >= 3 && liveProgress.cvId ? 'active' : 'pending');
      
      case 4: // Cover Letter Created
        // Only completed if cover letter is explicitly linked to this journey
        return (liveProgress.coverLetterId && liveProgress.coverLetterId.trim() !== '') ? 'completed' :
               (liveProgress.currentStep >= 4 && liveProgress.atsScore !== undefined ? 'active' : 'pending');
      
      case 5: // Download/Apply
        // Only completed if journey status is explicitly 'completed'
        return liveProgress.status === 'completed' ? 'completed' :
               (liveProgress.currentStep >= 5 && liveProgress.coverLetterId ? 'active' : 'pending');
      
      default:
        return 'pending';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      className="bg-gradient-to-r from-lime-500/10 to-lime-600/10 border border-lime-500/20 rounded-xl overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-300 group"
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Compact Banner Bar */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Job Info and Progress */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-lime-400" />
              <div>
                <h3 className="text-sm font-medium text-white">
                  {journey.jobTitle}
                </h3>
                <p className="text-xs text-white/60">{journey.company}</p>
              </div>
            </div>

            {/* Progress Steps - Clickable */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((stepId) => {
                const status = getStepStatus(stepId);
                return (
                  <motion.button
                    key={stepId}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      status === 'completed' 
                        ? 'bg-lime-500 text-black' 
                        : status === 'active' 
                        ? 'bg-lime-400 text-black' 
                        : 'bg-white/20 text-white/60 hover:bg-white/30'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title={steps.find(s => s.id === stepId)?.label}
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
              {steps.find(s => s.id === liveProgress.currentStep)?.icon && 
                React.createElement(steps.find(s => s.id === liveProgress.currentStep)!.icon, { className: "h-4 w-4" })
              }
              <span className="text-xs font-medium text-lime-400">
                {steps.find(s => s.id === liveProgress.currentStep)?.label}
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
            
            {liveProgress.status === 'completed' ? (
              <motion.button
                onClick={() => onDownload(journey)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Download Files"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </motion.button>
            ) : (
              <motion.button
                onClick={() => onResume(journey)}
                className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Resume Journey"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Resume</span>
              </motion.button>
            )}
            
            {/* More Actions Menu */}
            <div className="relative">
              <motion.button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </motion.button>
              
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                >
                  <button
                    onClick={() => {
                      onShowDeleteConfirm(journey.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Journey</span>
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details with Step Cards */}
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
                  <div>
                    <p className="text-xs text-white font-medium truncate">{journey.jobTitle}</p>
                    <p className="text-xs text-white/60 truncate">{journey.company}</p>
                  </div>
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
                  {journey.cvId ? (
                    <div>
                      <p className="text-xs text-white font-medium truncate">
                        {linkedCV?.title || 'CV Linked'}
                      </p>
                      <p className="text-xs text-white/60">
                        {linkedCV ? 'Ready for editing' : 'CV Document'}
                      </p>
                      {linkedCV && (
                        <motion.button
                          onClick={() => router.push(`/studio?cvId=${linkedCV.id}`)}
                          className="mt-1 text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Edit
                        </motion.button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <motion.button
                        onClick={handleCreateCV}
                        className="w-full px-2 py-1 bg-lime-500 hover:bg-lime-600 text-black text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="h-3 w-3" />
                        Create CV
                      </motion.button>
                      {userCVs.length > 0 && (
                        <motion.button
                          onClick={() => setExpandedStep(expandedStep === 2 ? null : 2)}
                          className="w-full px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors flex items-center gap-1 justify-center"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Copy className="h-3 w-3" />
                          Select CV
                        </motion.button>
                      )}
                    </div>
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
                  {liveProgress.atsScore !== undefined ? (
                    <div>
                      <p className="text-xs text-white font-medium">
                        {liveProgress.atsScore}%
                      </p>
                      <p className="text-xs text-white/60">ATS Optimized</p>
                    </div>
                  ) : liveProgress.cvId ? (
                    <motion.button
                      onClick={handleATSCheck}
                      disabled={isRunningATSCheck}
                      className="w-full px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isRunningATSCheck ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Settings className="h-3 w-3" />
                          </motion.div>
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          Check ATS
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <p className="text-xs text-white/60">CV required first</p>
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
                  {journey.coverLetterId ? (
                    <div>
                      <p className="text-xs text-white font-medium truncate">
                        {linkedCoverLetter?.title || 'Cover Letter Ready'}
                      </p>
                      <p className="text-xs text-white/60">
                        {linkedCoverLetter ? 'Ready for download' : 'Cover Letter'}
                      </p>
                      {linkedCoverLetter && (
                        <motion.button
                          onClick={() => router.push(`/studio?type=cover_letter&id=${linkedCoverLetter.id}`)}
                          className="mt-1 text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Edit
                        </motion.button>
                      )}
                    </div>
                  ) : liveProgress.atsScore !== undefined ? (
                    <div className="space-y-1">
                      <motion.button
                        onClick={handleCreateCoverLetter}
                        className="w-full px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 justify-center"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Sparkles className="h-3 w-3" />
                        Create Letter
                      </motion.button>
                      {userCoverLetters.length > 0 && (
                        <motion.button
                          onClick={() => setExpandedStep(expandedStep === 4 ? null : 4)}
                          className="w-full px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors flex items-center gap-1 justify-center"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Copy className="h-3 w-3" />
                          Select Letter
                        </motion.button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-white/60">ATS check required first</p>
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
                    <p className="text-xs text-white/60">In progress</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Inline CV Selector */}
        {expandedStep === 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Select CV</h4>
              <button
                onClick={() => setExpandedStep(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {userCVs.map((cv) => (
                <motion.button
                  key={cv.id}
                  onClick={() => handleSelectCV(cv.id)}
                  className="w-full p-2 text-left bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-white truncate">{cv.title}</p>
                      <p className="text-xs text-white/60">
                        {cv.status} • {new Date(cv.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                    {String(cv.id) === String(journey.cvId) && (
                      <CheckCircle className="h-4 w-4 text-lime-400" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Inline Cover Letter Selector */}
        {expandedStep === 4 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Select Cover Letter</h4>
              <button
                onClick={() => setExpandedStep(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {userCoverLetters.map((cl) => (
                <motion.button
                  key={cl.id}
                  onClick={() => handleSelectCoverLetter(cl.id)}
                  className="w-full p-2 text-left bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-white truncate">{cl.title}</p>
                      <p className="text-xs text-white/60">
                        {cl.status} • {new Date(cl.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                    {String(cl.id) === String(journey.coverLetterId) && (
                      <CheckCircle className="h-4 w-4 text-lime-400" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </motion.div>
  );
};

export default JourneyTimelineCard;
