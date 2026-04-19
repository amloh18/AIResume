'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Logo from '@/components/ui/Logo';
import { Upload, FileText, Edit3, CheckCircle2, Loader2, Briefcase, Sparkles, AlertTriangle, FolderOpen, Edit2 } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';
import { InfoTooltip } from '@/components/ui/tooltip';
import JDInputPanel from '@/components/resume-enhancer/JDInputPanel';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';

interface ExistingCV {
  _id?: string;
  id?: string;
  title: string;
  cvType: 'master' | 'standalone' | 'journey';
  createdAt: string;
  updatedAt: string;
  cvData?: UnifiedCVDataStructure;
  status?: string;
}

interface Step1ParserProps {
  onComplete: (cvData: UnifiedCVDataStructure, isExistingCV?: boolean) => void;
  /** Check if user already has a Master CV */
  userHasMasterCV?: boolean;
  /** Current mode of the enhancer */
  mode?: 'create' | 'edit' | 'edit-master' | 'journey';
  /** CV type being edited */
  cvType?: 'master' | 'standalone' | 'journey';
}

export default function Step1Parser({ onComplete, userHasMasterCV = false, mode = 'create', cvType }: Step1ParserProps) {
  const router = useRouter();
  const { state, dispatch, setFresherMode, detectFresherMode, determineCVType, setJdText } = useResumeEnhancer();
  const { user } = useUnifiedAuth();
  const [parseMethod, setParseMethod] = useState<'upload' | 'manual' | 'job' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [parsingStep, setParsingStep] = useState('');
  const [currentParsingStepIndex, setCurrentParsingStepIndex] = useState<number>(-1);
  const [showJDInput, setShowJDInput] = useState(false);
  const [existingCVs, setExistingCVs] = useState<ExistingCV[]>([]);
  const [isLoadingCVs, setIsLoadingCVs] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const topSectionRef = React.useRef<HTMLDivElement>(null);
  
  const [existingCoverLetters, setExistingCoverLetters] = useState<any[]>([]);
  const [isLoadingCoverLetters, setIsLoadingCoverLetters] = useState(false);
  const [activeTab, setActiveTab] = useState<'cvs' | 'cover-letters'>('cvs');
  const [filterType, setFilterType] = useState<'all' | 'master' | 'standalone' | 'journey'>('all');
  const [parsingSteps] = useState([
    { label: 'Extracting text...', progress: 20 },
    { label: 'Structuring sections...', progress: 40 },
    { label: 'Identifying personal info...', progress: 60 },
    { label: 'Parsing work experience...', progress: 75 },
    { label: 'Extracting education...', progress: 85 },
    { label: 'Finalizing structure...', progress: 95 }
  ]);

  // Set hasMasterCV in context on mount
  useEffect(() => {
    dispatch({ type: 'SET_HAS_MASTER_CV', payload: userHasMasterCV });
  }, [userHasMasterCV, dispatch]);

  // Fetch existing CVs on mount
  const fetchExistingCVs = useCallback(async () => {
    setIsLoadingCVs(true);
    try {
      const response = await fetch('/api/cvs');
      if (response.ok) {
        const data = await response.json();
        setExistingCVs(data.cvs || data.data?.cvs || []);
      }
    } catch (error) {
      console.error('Failed to fetch existing CVs:', error);
    } finally {
      setIsLoadingCVs(false);
    }
  }, [user?.id]);

  const fetchExistingCoverLetters = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingCoverLetters(true);
    try {
      const response = await authenticatedFetchWithUserId('/api/cover-letters', user.id);
      if (response.ok) {
        const data = await response.json();
        setExistingCoverLetters(data.coverLetters || data.data?.coverLetters || []);
      }
    } catch (error) {
      console.error('Failed to fetch existing cover letters:', error);
    } finally {
      setIsLoadingCoverLetters(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchExistingCVs();
    if (user) {
      fetchExistingCoverLetters();
    }
  }, [fetchExistingCVs, fetchExistingCoverLetters, user]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (topSectionRef.current) {
      // Show ribbon when top section is out of view
      setIsScrolled(target.scrollTop > topSectionRef.current.offsetHeight - 50);
    } else {
      setIsScrolled(target.scrollTop > 200);
    }
  };

  // Filtered CVs
  const filteredCVs = existingCVs.filter(cv => {
    if (filterType === 'all') return true;
    return cv.cvType === filterType;
  });

  // Handle editing an existing CV - navigate to editor with full fetch
  const handleEditExistingCV = (cv: ExistingCV) => {
    const editMode = cv.cvType === 'master' ? 'edit-master' : 'edit';
    const originalCvId = cv.id || cv._id;
    if (originalCvId) {
      router.push(`/editor?mode=${editMode}&cvId=${originalCvId}`);
    } else {
      console.error('Failed to enter edit mode: Missing CV ID on object', cv);
    }
  };

  /**
   * Detect if CV data indicates a fresher (no work experience)
   * This triggers projects-focused layout
   */
  const checkFresherMode = (cvData: UnifiedCVDataStructure): boolean => {
    const work = cvData.work;
    if (!work || !Array.isArray(work) || work.length === 0) {
      return true;
    }
    // Check if work entries have meaningful content
    const hasValidWork = work.some((w: any) =>
      w && (w.name || w.company || w.position)
    );
    return !hasValidWork;
  };

  /**
   * Determine CV type based on current state and complete the step
   */
  const completeParsing = (cvData: UnifiedCVDataStructure, isExistingCV = false) => {
    // Detect fresher mode
    const isFresher = checkFresherMode(cvData);
    setFresherMode(isFresher);
    dispatch({ type: 'SET_FRESHER_MODE', payload: isFresher });

    // Determine CV type based on state
    const cvType = determineCVType();
    dispatch({ type: 'SET_CV_TYPE', payload: cvType });

    // If this is the first CV and no Master exists, mark as Master
    if (cvType === 'master') {
      dispatch({ type: 'SET_IS_USER_MASTER', payload: true });
    }

    // Update context with parsed data
    dispatch({ type: 'SET_CV_DATA', payload: cvData });

    onComplete(cvData, isExistingCV);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');
    setCurrentParsingStepIndex(-1);

    let uploadInterval: NodeJS.Timeout | null = null;
    let parsingInterval: NodeJS.Timeout | null = null;

    try {
      // Simulate upload progress
      uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 20) {
            if (uploadInterval) clearInterval(uploadInterval);
            return 20;
          }
          return prev + 5;
        });
      }, 50);

      // Wait a bit for upload, then start parsing
      setTimeout(() => {
        if (uploadInterval) clearInterval(uploadInterval);
        setUploadStatus('parsing');

        // Simulate parsing steps with progress
        let currentStepIndex = 0;
        setCurrentParsingStepIndex(0);
        parsingInterval = setInterval(() => {
          if (currentStepIndex < parsingSteps.length) {
            const step = parsingSteps[currentStepIndex];
            setParsingStep(step.label);
            setUploadProgress(step.progress);
            setCurrentParsingStepIndex(currentStepIndex);
            currentStepIndex++;
          } else {
            if (parsingInterval) clearInterval(parsingInterval);
            setCurrentParsingStepIndex(parsingSteps.length);
          }
        }, 400);
      }, 500);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/cv/parse', {
        method: 'POST',
        body: formData
      });

      // Clear intervals when API call completes
      if (uploadInterval) clearInterval(uploadInterval);
      if (parsingInterval) clearInterval(parsingInterval);

      if (!response.ok) {
        const errorData = await response.json();
        const rawError = errorData.error || 'Failed to parse CV';
        throw new Error(sanitizeErrorMessage(rawError, 'Failed to parse CV'));
      }

      const result = await response.json();

      setUploadProgress(100);
      setParsingStep('Complete!');
      setUploadStatus('success');

      // Wait a moment to show success, then complete with fresher detection
      setTimeout(() => {
        completeParsing(result);
      }, 1000);

    } catch (error) {
      // Clear intervals on error
      if (uploadInterval) clearInterval(uploadInterval);
      if (parsingInterval) clearInterval(parsingInterval);

      console.error('CV parsing error:', error);
      setUploadStatus('error');
      setErrorMessage(sanitizeErrorMessage(error, 'Failed to parse CV'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualEntry = () => {
    // For manual entry, use default empty CV data
    // User will fill in forms in next steps
    // This will be a fresher by default (no work experience yet)
    setFresherMode(true);
    dispatch({ type: 'SET_FRESHER_MODE', payload: true });

    const cvType = determineCVType();
    dispatch({ type: 'SET_CV_TYPE', payload: cvType });

    if (cvType === 'master') {
      dispatch({ type: 'SET_IS_USER_MASTER', payload: true });
    }

    dispatch({ type: 'SET_CV_DATA', payload: state.cvData });
    onComplete(state.cvData);
  };

  /**
   * Handle JD input for Journey CV flow
   */
  const handleJDSubmit = (jdText: string) => {
    setJdText(jdText);
    setShowJDInput(false);
    // JD submitted - now need to get CV data (upload or manual)
    // Proceed to upload option to continue the flow
    setParseMethod('upload');
  };

  const handleStartWithJob = () => {
    setShowJDInput(true);
  };

  // Show JD input as a magic paste modal if user chose to start with a job
  if (showJDInput) {
    return (
      <JDInputPanel
        isModal={true}
        onSubmit={handleJDSubmit}
        onCancel={() => setShowJDInput(false)}
        showJourneyIndicator={true}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      {/* Main Content Area */}
      {parseMethod === null && (
        <motion.div 
          key="options"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          ref={scrollContainerRef}
          className="flex flex-col h-full min-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[var(--bg-primary)] snap-y snap-mandatory scroll-smooth"
          onScroll={handleScroll}
        >
        {/* Sticky Small Header on Scroll */}
        <AnimatePresence>
          {isScrolled && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-16 left-0 right-0 z-[110] bg-white dark:bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-white/5 py-3 px-8 flex items-center justify-between shadow-xl"
            >
              <div className="flex items-center gap-4">
                <Logo size="sm" showText={false} />
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Build Your Resume</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Quick actions</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                   onClick={() => setParseMethod('upload')}
                   className="flex items-center gap-2 px-5 py-2 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] text-black rounded-full text-xs font-bold transition-all shadow-lg hover:shadow-lime-500/20"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
                <button 
                   onClick={() => handleManualEntry()}
                   className="flex items-center gap-2 px-5 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-full text-xs font-bold transition-all shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Start Fresh
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Section */}
        <div ref={topSectionRef} className="snap-start snap-always w-full min-h-[85vh] flex flex-col justify-center pt-12 pb-12">
          <div className="w-full max-w-6xl mx-auto px-8">
            <motion.div
            animate={{ 
              scale: isScrolled ? 0.95 : 1,
              opacity: isScrolled ? 0.6 : 1,
              y: isScrolled ? -20 : 0
            }}
            transition={{ duration: 0.5, ease: "circOut" }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-lime-500/10 border border-lime-500/20 rounded-full mb-8"
            >
              <Sparkles className="w-4 h-4 text-lime-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-500">
                AI-Powered Career Engine
              </span>
            </motion.div>

            <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 tracking-tighter leading-none whitespace-nowrap">
                Let's Build Your <span className="text-lime-500 italic relative">Resume</span>
              </h2>
            <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
              Design a high-performance resume that bypasses ATS filters and lands you the interview.
            </p>

            {/* Journey mode indicator if JD was already provided */}
            {state.jdText && state.jdWordCount >= 10 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl shadow-xl shadow-purple-500/5"
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-bold text-purple-500">
                  Journey Mode Active: Auto-tailoring to Job Description
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Action Cards Grid - Now always 3 columns if userHasMasterCV exists */}
          <div className={`grid gap-8 transition-all duration-700 ${userHasMasterCV ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-4xl mx-auto'}`}>
            {/* Upload Option */}
            <motion.button
              whileHover={{ y: -12, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setParseMethod('upload')}
              className="group relative bg-white dark:bg-[#141810] rounded-[2.5rem] p-12 shadow-2xl border border-white/5 overflow-hidden text-left flex flex-col items-center justify-center text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex flex-col items-center space-y-8">
                <div className="w-24 h-24 bg-lime-500 text-black rounded-[2rem] flex items-center justify-center shadow-2xl shadow-lime-500/30 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                  <Upload className="w-12 h-12 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Upload</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-relaxed">
                    Import your existing resume. <br />
                    We'll handle the rest.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-black px-4 py-1.5 bg-black/5 dark:bg-white/10 rounded-full text-gray-400 group-hover:text-lime-500 transition-colors">
                    PDF / DOCX
                  </span>
                </div>
              </div>
            </motion.button>

            {/* Manual Entry Option */}
            <motion.button
              whileHover={{ y: -12, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleManualEntry()}
              className="group relative bg-white dark:bg-[#141810] rounded-[2.5rem] p-12 shadow-2xl border border-white/5 overflow-hidden text-left flex flex-col items-center justify-center text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex flex-col items-center space-y-8">
                <div className="w-24 h-24 bg-blue-500 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 group-hover:-rotate-6 group-hover:scale-110 transition-all duration-500">
                  <Edit3 className="w-12 h-12 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Start Fresh</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-relaxed">
                    Build a winning resume <br />
                    from scratch with AI.
                  </p>
                </div>
                <span className="text-[10px] font-black px-4 py-1.5 bg-blue-500/10 text-blue-500 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-all">
                  STEP-BY-STEP
                </span>
              </div>
            </motion.button>

            {/* Apply to Job Option - Always visible if userHasMasterCV */}
            {userHasMasterCV && (
              <motion.button
                whileHover={{ y: -12, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartWithJob}
                className="group relative bg-white dark:bg-[#141810] rounded-[2.5rem] p-12 shadow-2xl border border-lime-500/30 overflow-hidden text-left flex flex-col items-center justify-center text-center"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-lime-500/20 via-transparent to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-lime-500/10 blur-[100px] rounded-full" />
                <div className="relative flex flex-col items-center space-y-8">
                  <div className="px-4 py-1.5 bg-lime-500 text-black text-[10px] font-black rounded-full shadow-2xl shadow-lime-500/20">
                    POWERFUL
                  </div>
                  <div className="w-24 h-24 bg-lime-500/20 border border-lime-500/40 rounded-[2.5rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-all duration-500">
                    <Briefcase className="w-12 h-12 text-lime-500" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Apply to Job</h3>
                    <p className="text-gray-400 text-base font-medium leading-relaxed">
                      Auto-tailor your Master CV <br />
                      to any job description.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black px-4 py-1.5 bg-lime-500/10 text-lime-500 border border-lime-500/20 rounded-full group-hover:bg-lime-500 group-hover:text-black transition-all">
                      ATS OPTIMIZED
                    </span>
                  </div>
                </div>
              </motion.button>
            )}
          </div>

          {/* Pro Tip - Minimalist Inline Section */}
          <motion.div
             initial={{ opacity: 0, y: 10 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="mt-12 mb-12 flex items-center justify-center gap-3 max-w-4xl mx-auto text-center px-8"
          >
             <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] italic flex-shrink-0">PRO TIP:</span>
             <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
               {userHasMasterCV 
                 ? "Use 'Apply to Job' to automatically customize your resume for 90%+ ATS matching in seconds."
                 : "Create a Master CV first. It will act as your source-of-truth and save you hours of repetitive work."}
             </p>
          </motion.div>

          </div>
        </div>

        {/* Continue Editing Section */}
        <div className="snap-start w-full min-h-screen pt-12 bg-gray-50 dark:bg-[var(--bg-primary)]">
          <div className="w-full max-w-6xl mx-auto px-8 pb-32">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 pb-8 border-b border-gray-200/50 dark:border-white/5">
                <div className="text-left">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-lime-500/10 rounded-2xl flex items-center justify-center shadow-inner">
                      <FolderOpen className="w-6 h-6 text-lime-500" />
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                      Continue Editing
                    </h3>
                  </div>
                  <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                    Pick up where you left off with your recent resumes and cover letters.
                  </p>
                </div>
                
                {/* Toggle Tab UI */}
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/20 p-1.5 rounded-xl border border-gray-200 dark:border-white/5">
                   <button
                     onClick={() => setActiveTab('cvs')}
                     className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'cvs' ? 'bg-lime-500 text-black shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`}
                   >
                     Resumes
                   </button>
                   <button
                     onClick={() => setActiveTab('cover-letters')}
                     className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'cover-letters' ? 'bg-lime-500 text-black shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`}
                   >
                     Cover Letters
                   </button>
                </div>
              </div>

              {/* Enhanced Filters */}
              {existingCVs.length > 0 && activeTab === 'cvs' && (
                <div className="flex flex-wrap items-center gap-1">
                   <button 
                     onClick={() => setFilterType('all')}
                     className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filterType === 'all' ? 'text-white border border-white/20 bg-white/5' : 'text-gray-500 hover:text-white'}`}
                   >
                     All
                   </button>
                   
                   <InfoTooltip content="Your primary resume - the source of truth for all tailored versions.">
                     <button 
                       onClick={() => setFilterType('master')}
                       className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${filterType === 'master' ? 'text-blue-500 border border-blue-500/30 bg-blue-500/5' : 'text-gray-500 hover:text-blue-400'}`}
                     >
                       <div className={`w-1.5 h-1.5 rounded-full ${filterType === 'master' ? 'bg-blue-500' : 'bg-gray-600'}`} />
                       Master
                     </button>
                   </InfoTooltip>
   
                   <InfoTooltip content="Resumes tailored for specific job applications with ATS optimization.">
                     <button 
                       onClick={() => setFilterType('journey')}
                       className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${filterType === 'journey' ? 'text-purple-500 border border-purple-500/30 bg-purple-500/5' : 'text-gray-500 hover:text-purple-400'}`}
                     >
                       <div className={`w-1.5 h-1.5 rounded-full ${filterType === 'journey' ? 'bg-purple-500' : 'bg-gray-600'}`} />
                       Journey
                     </button>
                   </InfoTooltip>
   
                   <InfoTooltip content="Standalone resumes for various purposes.">
                     <button 
                       onClick={() => setFilterType('standalone')}
                       className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${filterType === 'standalone' ? 'text-orange-500 border border-orange-500/30 bg-orange-500/5' : 'text-gray-500 hover:text-orange-400'}`}
                     >
                       <div className={`w-1.5 h-1.5 rounded-full ${filterType === 'standalone' ? 'bg-orange-500' : 'bg-gray-600'}`} />
                       Standalone
                     </button>
                   </InfoTooltip>
                </div>
                )}

              {isLoadingCVs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-[3/4] bg-gray-100 dark:bg-white/5 rounded-[2.5rem] animate-pulse border border-gray-200 dark:border-white/5" />
                  ))}
                </div>
              ) : activeTab === 'cvs' && filteredCVs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredCVs.map((cv, index) => (
                  <motion.div
                    key={cv.id || cv._id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleEditExistingCV(cv)}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-[3/4] relative bg-white dark:bg-[#141810] rounded-[2.5rem] shadow-xl border border-white/5 overflow-hidden transition-all duration-500 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.2)] group-hover:border-lime-500/40 group-hover:-translate-y-4">
                       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                       
                       <div className="h-full p-6 flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg ${
                              cv.cvType === 'master' ? 'bg-blue-600 text-white shadow-blue-500/20' :
                              cv.cvType === 'journey' ? 'bg-purple-600 text-white shadow-purple-500/20' :
                              'bg-orange-600 text-white shadow-orange-500/20'
                            }`}>
                              {cv.cvType}
                            </span>
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 shadow-2xl">
                              <Edit2 className="w-5 h-5 text-lime-500" />
                            </div>
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-center items-center gap-6 py-8">
                             <div className="w-32 h-44 bg-gray-50 dark:bg-black/40 rounded-2xl border border-gray-200 dark:border-white/10 group-hover:scale-105 transition-all duration-700 shadow-inner flex flex-col p-4 gap-3 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 to-transparent" />
                                <div className="h-3 w-3/4 bg-gray-300 dark:bg-white/20 rounded-full" />
                                <div className="h-2 w-1/2 bg-gray-200 dark:bg-white/10 rounded-full" />
                                <div className="mt-auto space-y-2">
                                   <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full" />
                                   <div className="h-1.5 w-5/6 bg-gray-100 dark:bg-white/5 rounded-full" />
                                   <div className="h-1.5 w-4/6 bg-gray-100 dark:bg-white/5 rounded-full" />
                                </div>
                             </div>
                          </div>

                          <div className="mt-auto relative z-20 overflow-hidden">
                             <h4 className="text-xl font-black text-white truncate group-hover:text-lime-500 transition-colors tracking-tight">
                               {cv.title || 'Untitled Resume'}
                             </h4>
                             <p className="text-xs text-gray-400 font-bold flex items-center gap-2 mt-2">
                               <span className="w-2 h-2 bg-lime-500 rounded-full shadow-[0_0_10px_rgba(128,255,0,0.5)]" />
                               Updated {new Date(cv.updatedAt || cv.createdAt).toLocaleDateString()}
                             </p>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : activeTab === 'cvs' ? (
                <div className="text-center py-32 bg-black/5 dark:bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/10">
                  <FolderOpen className="w-20 h-20 text-gray-200 dark:text-gray-800 mx-auto mb-8 animate-bounce transition-all duration-1000" />
                  <h4 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">No Resumes Found</h4>
                  <p className="text-lg text-gray-600 dark:text-gray-400 font-medium max-w-sm mx-auto">
                    Build your first high-performance resume using the options above.
                  </p>
                </div>
              ) : null}

              {/* Cover Letters Grid */}
              {activeTab === 'cover-letters' && (
                isLoadingCoverLetters ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="aspect-[3/4] bg-gray-100 dark:bg-white/5 rounded-[2.5rem] animate-pulse border border-gray-200 dark:border-white/5" />
                    ))}
                  </div>
                ) : existingCoverLetters.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {existingCoverLetters.map((cl) => (
                      <motion.div
                        key={cl.id || cl._id}
                        whileHover={{ y: -8, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                        className="group cursor-pointer"
                      >
                        <div className="aspect-[3/4] relative bg-white dark:bg-[#141810] rounded-[2.5rem] shadow-xl border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-500 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] dark:group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.2)] group-hover:border-lime-500/40 group-hover:-translate-y-4">
                           <div className="absolute inset-0 bg-gradient-to-t from-gray-100/90 via-gray-100/40 dark:from-black/90 dark:via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                           
                           <div className="h-full p-6 flex flex-col">
                              <div className="flex justify-between items-start mb-4">
                                <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg bg-emerald-600 text-white shadow-emerald-500/20">
                                  Cover Letter
                                </span>
                                <div className="w-10 h-10 bg-black/10 dark:bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 shadow-2xl">
                                  <Edit2 className="w-5 h-5 text-lime-600 dark:text-lime-500" />
                                </div>
                              </div>
                              
                              <div className="flex-1 flex flex-col justify-center items-center gap-6 py-8">
                                 <div className="w-32 h-44 bg-white dark:bg-black/40 rounded-2xl border border-gray-200 dark:border-white/10 group-hover:scale-105 transition-all duration-700 shadow-inner flex flex-col p-4 gap-3 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 to-transparent" />
                                    <div className="h-3 w-1/2 bg-gray-200 dark:bg-white/20 rounded-full mb-2" />
                                    <div className="space-y-1.5">
                                       <div className="h-1.5 w-full bg-gray-50 dark:bg-white/5 rounded-full" />
                                       <div className="h-1.5 w-full bg-gray-50 dark:bg-white/5 rounded-full" />
                                       <div className="h-1.5 w-5/6 bg-gray-50 dark:bg-white/5 rounded-full" />
                                       <div className="h-1.5 w-4/6 bg-gray-50 dark:bg-white/5 rounded-full" />
                                    </div>
                                 </div>
                              </div>
  
                              <div className="mt-auto relative z-20 overflow-hidden">
                                 <h4 className="text-xl font-black text-gray-900 dark:text-white truncate group-hover:text-lime-600 dark:group-hover:text-lime-500 transition-colors tracking-tight">
                                   {cl.title || 'Untitled Cover Letter'}
                                 </h4>
                                 <p className="text-xs text-gray-500 dark:text-gray-400 font-bold flex items-center gap-2 mt-2">
                                    <span className="w-2 h-2 bg-lime-500 rounded-full shadow-[0_0_10px_rgba(132,204,22,0.5)] dark:shadow-[0_0_10px_rgba(128,255,0,0.5)]" />
                                    Updated {new Date(cl.updatedAt || cl.createdAt).toLocaleDateString()}
                                 </p>
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 bg-black/5 dark:bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/10">
                    <FolderOpen className="w-20 h-20 text-gray-200 dark:text-gray-800 mx-auto mb-8 animate-bounce transition-all duration-1000" />
                    <h4 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">No Cover Letters Found</h4>
                    <p className="text-lg text-gray-600 dark:text-gray-400 font-medium max-w-sm mx-auto">
                      Create your first cover letter from the dashboard or job application journey.
                    </p>
                  </div>
                )
              )}
            </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {parseMethod === 'upload' && (
        <motion.div 
          key="upload"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center justify-center h-full min-h-[calc(100vh-200px)]"
        >
          <div className="w-full max-w-2xl px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#141810] rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 p-12 border border-gray-200 dark:border-transparent"
            >
            {uploadStatus === 'idle' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-[#80FF00]" />
                </div>
                <h3 className="text-2xl font-bold text-[color:var(--text-primary)] mb-4">
                  Upload Your Resume
                </h3>
                <p className="text-[color:var(--text-secondary)] mb-8">
                  Drag and drop your file here or click to browse
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <span className="inline-block px-8 py-3 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] text-black rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105">
                    Choose File
                  </span>
                </label>
                <p className="text-sm text-[color:var(--text-tertiary)] mt-4">
                  Supports PDF, DOCX, and image files (max 10MB)
                </p>
                <button
                  onClick={() => setParseMethod(null)}
                  className="mt-6 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                >
                  ← Back to options
                </button>
              </div>
            )}

            {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
              <div className="text-center">
                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <FileText className="w-10 h-10 text-[#80FF00]" />
                </div>
                <h3 className="text-2xl font-bold text-[color:var(--text-primary)] mb-6">
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Parsing Your Resume...'}
                </h3>

                {uploadStatus === 'parsing' && (
                  <div className="mb-6">
                    <ul className="space-y-3 text-left max-w-md mx-auto">
                      {parsingSteps.map((step, index) => {
                        const isCompleted = index < currentParsingStepIndex;
                        const isCurrent = index === currentParsingStepIndex;
                        const isPending = index > currentParsingStepIndex;

                        return (
                          <li
                            key={index}
                            className={`flex items-center gap-3 text-sm transition-colors ${isCompleted
                              ? 'text-[#80FF00]'
                              : isCurrent
                                ? 'text-[#80FF00] font-medium'
                                : 'text-[color:var(--text-tertiary)]'
                              }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-[#80FF00] flex-shrink-0" />
                            ) : isCurrent ? (
                              <Loader2 className="w-5 h-5 text-[#80FF00] flex-shrink-0 animate-spin" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-[color:var(--text-tertiary)] flex-shrink-0" />
                            )}
                            <span>{step.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
                  <div
                    className="bg-[#80FF00] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[color:var(--text-secondary)] text-sm">
                  {uploadProgress}% complete
                </p>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-[#80FF00]" />
                </div>
                <h3 className="text-2xl font-bold text-[color:var(--text-primary)] mb-4">
                  Successfully Parsed!
                </h3>
                <p className="text-[color:var(--text-secondary)]">
                  Moving to the next step...
                </p>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-[color:var(--text-primary)] mb-4">
                  Upload Failed
                </h3>
                <p className="text-red-400 mb-6">
                  {errorMessage}
                </p>
                <button
                  onClick={() => {
                    setUploadStatus('idle');
                    setErrorMessage('');
                    setUploadProgress(0);
                  }}
                  className="px-6 py-2 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] text-black rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

