'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Logo from '@/components/ui/Logo';
import { Upload, FileText, Edit3, CheckCircle2, Loader2, Briefcase, Sparkles, AlertTriangle, FolderOpen, Edit2 } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';
import { InfoTooltip } from '@/components/ui/tooltip';
import JDInputPanel from '@/components/resume-enhancer/JDInputPanel';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import CVPreviewThumbnail from '@/components/dashboard/CVPreviewThumbnail';
import { useInView } from 'framer-motion';
import { getAllTemplates } from '@/lib/templates/template-utils';
import { ThumbnailGenerator } from '@/components/resume-enhancer/ThumbnailGenerator';
import SmartJDModal from '@/components/resume-enhancer/SmartJDModal';

// Global cache to prevent refetching when navigating between steps
let cachedExistingCVs: ExistingCV[] | null = null;
let cachedExistingCoverLetters: any[] | null = null;
let cachedDraftCV: any | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const invalidateStep1Cache = () => { 
  lastFetchTime = 0; 
  cachedDraftCV = null;
  cachedExistingCVs = null;
  cachedExistingCoverLetters = null;
};

interface ExistingCV {
  _id?: string;
  id?: string;
  title: string;
  cvType: 'master' | 'standalone' | 'journey';
  createdAt: string;
  updatedAt: string;
  cvData?: UnifiedCVDataStructure;
  templateId?: any;
  metadata?: {
    thumbnailUrl?: string;
    type?: string;
    [key: string]: any;
  };
  status?: string;
}

const LazyThumbnail = ({ item, isCoverLetter = false }: { item: any, isCoverLetter?: boolean }) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "200px" });

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(item.metadata?.thumbnailUrl || item.thumbnailUrl || null);
  const [showGenerator, setShowGenerator] = useState(false);
  
  const templateObj = React.useMemo(() => {
    if (item.template) return item.template;
    if (typeof item.templateId === 'object' && item.templateId) return item.templateId;
    if (typeof item.templateId === 'string') {
      const foundTemplate = getAllTemplates().find(t => t.id === item.templateId);
      if (foundTemplate) return foundTemplate;
    }
    return null;
  }, [item.template, item.templateId]);

  const handleThumbnailGenerated = (url: string) => {
    setThumbnailUrl(url);
    setShowGenerator(false);
  };

  return (
    <div 
      ref={ref}
      className="w-full aspect-[1/1.414] bg-gray-50 dark:bg-black/40 rounded-[2rem] border border-gray-200 dark:border-white/10 transition-all duration-500 shadow-md flex flex-col relative overflow-hidden group-hover:shadow-xl group-hover:border-lime-500/40 group-hover:scale-[1.02]"
    >
      {isInView ? (
        thumbnailUrl && !showGenerator ? (
          <img 
            src={thumbnailUrl} 
            alt={item.title} 
            className="w-full h-full object-cover bg-white" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const currentSrc = target.src;
              if (currentSrc.includes('s3.amazonaws.com') || currentSrc.includes('s3.')) {
                // Extract key and fetch presigned URL
                fetch(`/api/files/${encodeURIComponent(currentSrc.split('.amazonaws.com/')[1] || '')}`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.url && data.url !== currentSrc) {
                      setThumbnailUrl(data.url);
                    } else {
                      setThumbnailUrl(null);
                      setShowGenerator(true);
                    }
                  })
                  .catch(() => {
                    setThumbnailUrl(null);
                    setShowGenerator(true);
                  });
              } else {
                setThumbnailUrl(null);
                setShowGenerator(true);
              }
            }}
          />
        ) : !isCoverLetter && item.cvData && templateObj ? (
          <div className="w-full h-full relative">
            {showGenerator ? (
              <div className="absolute inset-0 p-4">
                <ThumbnailGenerator
                  cvData={item.cvData}
                  template={templateObj}
                  onThumbnailGenerated={handleThumbnailGenerated}
                  className="h-full"
                />
              </div>
            ) : (
              <div className="w-full h-full opacity-90 bg-white relative">
                <div className="absolute inset-0 pointer-events-none z-10" />
                <CVPreviewThumbnail cvData={item.cvData} template={templateObj} />
              </div>
            )}
            {/* Regenerate button */}
            {!showGenerator && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGenerator(true);
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/70 z-20"
                title="Regenerate thumbnail"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                </svg>
              </button>
            )}
          </div>
        ) : (
          // Generic fallback
          <div className="w-full h-full p-6 flex flex-col gap-3 bg-white/5">
            <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 to-transparent" />
            <div className="h-3 w-3/4 bg-gray-300 dark:bg-white/20 rounded-full" />
            <div className="h-2 w-1/2 bg-gray-200 dark:bg-white/10 rounded-full" />
            <div className="mt-auto space-y-2">
              <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full" />
              <div className="h-1.5 w-5/6 bg-gray-100 dark:bg-white/5 rounded-full" />
              <div className="h-1.5 w-4/6 bg-gray-100 dark:bg-white/5 rounded-full" />
            </div>
          </div>
        )
      ) : (
        <div className="w-full h-full bg-gray-100 dark:bg-white/5 animate-pulse" />
      )}
    </div>
  );
};

interface Step1ParserProps {
  onComplete: (cvData: UnifiedCVDataStructure, isExistingCV?: boolean) => void;
  /** Check if user already has a Master CV */
  userHasMasterCV?: boolean;
  /** Current mode of the enhancer */
  mode?: 'create' | 'edit' | 'edit-master' | 'journey';
  /** CV type being edited */
  cvType?: 'master' | 'standalone' | 'journey';
  /** Whether the user is in guest mode */
  isGuestMode?: boolean;
}

export default function Step1Parser({ onComplete, userHasMasterCV = false, mode = 'create', cvType, isGuestMode = false }: Step1ParserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, dispatch, setFresherMode, detectFresherMode, determineCVType, setJdText, goToStep } = useResumeEnhancer();
  const { user } = useUnifiedAuth();
  const [parseMethod, setParseMethod] = useState<'upload' | 'manual' | 'job' | 'linkedin' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [parsingStep, setParsingStep] = useState('');
  const [currentParsingStepIndex, setCurrentParsingStepIndex] = useState<number>(-1);
  const [showJDInput, setShowJDInput] = useState(false);
  const [existingCVs, setExistingCVs] = useState<ExistingCV[]>([]);
  const [isLoadingCVs, setIsLoadingCVs] = useState(false);
  const [draftCV, setDraftCV] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLinkedInImporting, setIsLinkedInImporting] = useState(false);
  const [linkedInImportError, setLinkedInImportError] = useState('');
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const topSectionRef = React.useRef<HTMLDivElement>(null);
  
  const { scrollY } = useScroll({ container: scrollContainerRef });
  
  // Smooth scroll transforms
  const headerScale = useTransform(scrollY, [0, 300], [1, 0.85]);
  const headerOpacity = useTransform(scrollY, [0, 300], [1, 0.4]);
  const headerY = useTransform(scrollY, [0, 300], [0, -30]);

  const cardsScale = useTransform(scrollY, [0, 400], [1, 0.75]);
  const cardsY = useTransform(scrollY, [0, 400], [0, -60]);
  const cardsOpacity = useTransform(scrollY, [0, 400], [1, 0.7]);
  
  const [existingCoverLetters, setExistingCoverLetters] = useState<any[]>([]);
  const [isLoadingCoverLetters, setIsLoadingCoverLetters] = useState(false);
  const [activeTab, setActiveTab] = useState<'cvs' | 'cover-letters'>(searchParams.get('tab') === 'cover-letters' ? 'cover-letters' : 'cvs');
  const [filterType, setFilterType] = useState<'all' | 'master' | 'standalone' | 'journey'>('all');
  const [parsingSteps] = useState([
    { label: 'Extracting text...', progress: 20 },
    { label: 'Structuring sections...', progress: 40 },
    { label: 'Identifying personal info...', progress: 60 },
    { label: 'Parsing work experience...', progress: 75 },
    { label: 'Extracting education...', progress: 85 },
    { label: 'Finalizing structure...', progress: 95 }
  ]);
  const [showSmartJDModal, setShowSmartJDModal] = useState(false);

  // Set hasMasterCV in context on mount - REDUNDANT: removed to prevent loops
  // useEffect(() => {
  //   dispatch({ type: 'SET_HAS_MASTER_CV', payload: userHasMasterCV });
  // }, [userHasMasterCV, dispatch]);

  // Fetch existing CVs on mount
  const fetchExistingCVs = useCallback(async () => {
    if (cachedExistingCVs && Date.now() - lastFetchTime < CACHE_TTL) {
      setExistingCVs(cachedExistingCVs);
      return;
    }
    setIsLoadingCVs(true);
    try {
      const response = await fetch('/api/cvs');
      if (response.ok) {
        const data = await response.json();
        const cvs = data.cvs || data.data?.cvs || [];
        cachedExistingCVs = cvs;
        lastFetchTime = Date.now();
        setExistingCVs(cvs);
      }
    } catch (error) {
      console.error('Failed to fetch existing CVs:', error);
    } finally {
      setIsLoadingCVs(false);
    }
  }, [user?.id]);

  const fetchDraftCV = useCallback(async () => {
    if (cachedDraftCV && Date.now() - lastFetchTime < CACHE_TTL) {
      setDraftCV(cachedDraftCV);
      return;
    }
    try {
      const response = await fetch('/api/cv-draft/load');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          cachedDraftCV = data.data;
          setDraftCV(data.data);
        } else {
          cachedDraftCV = null;
          setDraftCV(null);
        }
      }
    } catch (error) {
      console.error('Failed to load draft CV:', error);
    }
  }, []);

  const fetchExistingCoverLetters = useCallback(async () => {
    if (!user?.id) return;
    if (cachedExistingCoverLetters && Date.now() - lastFetchTime < CACHE_TTL) {
      setExistingCoverLetters(cachedExistingCoverLetters);
      return;
    }
    setIsLoadingCoverLetters(true);
    try {
      const response = await authenticatedFetchWithUserId('/api/cover-letters', user.id);
      if (response.ok) {
        const data = await response.json();
        const cls = data.coverLetters || data.data?.coverLetters || [];
        cachedExistingCoverLetters = cls;
        setExistingCoverLetters(cls);
      }
    } catch (error) {
      console.error('Failed to fetch existing cover letters:', error);
    } finally {
      setIsLoadingCoverLetters(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchExistingCVs();
    fetchDraftCV();
    if (user) {
      fetchExistingCoverLetters();
    }
  }, [fetchExistingCVs, fetchExistingCoverLetters, fetchDraftCV, user]);

  useEffect(() => {
    if (existingCVs.length === 0) return;
    const hasMaster = existingCVs.some((cv) => cv.cvType === 'master');
    // Only dispatch if the value is actually different from current state to prevent loops
    if (state.hasMasterCV !== hasMaster) {
      dispatch({ type: 'SET_HAS_MASTER_CV', payload: hasMaster });
    }
  }, [dispatch, existingCVs, state.hasMasterCV]);

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
    // Navigate to step 2 (template selection) with fresh CV data
    // This will be a fresher by default (no work experience yet)
    const freshCvData = JSON.parse(JSON.stringify(DEFAULT_UNIFIED_CV_DATA)) as UnifiedCVDataStructure;
    setFresherMode(true);
    dispatch({ type: 'SET_FRESHER_MODE', payload: true });

    const cvType = determineCVType();
    dispatch({ type: 'SET_CV_TYPE', payload: cvType });

    if (cvType === 'master') {
      dispatch({ type: 'SET_IS_USER_MASTER', payload: true });
    }

    dispatch({ type: 'SET_CV_DATA', payload: freshCvData });
    
    // Navigate to step 2 (template selection)
    router.push('/editor?step=2');
  };

  /**
   * Handle LinkedIn import
   */
  const handleLinkedInImport = async () => {
    setIsLinkedInImporting(true);
    setLinkedInImportError('');
    setUploadProgress(0);
    setUploadStatus('uploading');

    try {
      // Simulate progress
      setUploadProgress(20);
      
      const response = await fetch('/api/linkedin/import');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import from LinkedIn');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setUploadProgress(80);
        
        // Wait a moment to show progress
        setTimeout(() => {
          setUploadProgress(100);
          setUploadStatus('success');
          setIsLinkedInImporting(false);
          
          // Complete parsing with LinkedIn data
          completeParsing(data.data, false);
        }, 500);
      } else {
        throw new Error(data.error || 'Failed to import from LinkedIn');
      }
    } catch (error: any) {
      console.error('LinkedIn import error:', error);
      setUploadStatus('error');
      setLinkedInImportError(error.message || 'Failed to import from LinkedIn');
      setIsLinkedInImporting(false);
    }
  };

  /**
   * Handle JD input for Journey CV or Cover Letter flow
   */
  const handleSmartJDSubmit = (data: { title: string; experienceLevel: string; jobDescription: string }) => {
    const { title, experienceLevel, jobDescription } = data;
    
    // Set job data in context
    dispatch({
      type: 'SET_JOB_DATA',
      payload: {
        title,
        jobTitle: title,
        company: 'Target Company',
        description: jobDescription,
        jobDescription,
        experienceLevel
      }
    });

    // Set JD text
    setJdText(jobDescription);
    
    // Navigate to correct step based on intent
    if (activeTab === 'cvs') {
      router.push('/editor?mode=journey&step=3');
    } else {
      router.push('/editor?mode=create-cover-letter&step=4');
    }
  };

  const handleStartWithJob = () => {
    setShowSmartJDModal(true);
  };

  // Show Smart JD modal if user chose to start with a job
  if (showSmartJDModal) {
    return (
      <SmartJDModal
        isOpen={showSmartJDModal}
        onClose={() => setShowSmartJDModal(false)}
        onSubmit={handleSmartJDSubmit}
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
          className="flex flex-col h-full min-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar bg-[var(--bg-primary)] snap-y snap-mandatory scroll-smooth"
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
              className="fixed top-16 left-0 right-0 z-[110] bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-white/5 py-3 px-4 sm:px-8 flex items-center justify-between shadow-xl"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <Logo size="sm" />
                <div className="hidden xs:block">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    {activeTab === 'cvs' ? 'Build Your Resume' : 'Lets build your COver lEtter'}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium">Quick actions</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <button 
                   onClick={() => setParseMethod('upload')}
                   className="flex items-center gap-2 px-3 sm:px-5 py-2 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] text-black rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-lg hover:shadow-lime-500/20"
                >
                  <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xxs:inline">{activeTab === 'cvs' ? 'Upload' : 'Import'}</span>
                  <span className="xxs:hidden">UP</span>
                </button>
                <button 
                   onClick={() => activeTab === 'cvs' ? handleManualEntry() : router.push('/editor?mode=create-cover-letter&step=2')}
                   className="flex items-center gap-2 px-3 sm:px-5 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-sm"
                >
                  <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xxs:inline">Start Fresh</span>
                  <span className="xxs:hidden">New</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Section */}
        <div ref={topSectionRef} className="snap-start snap-always w-full min-h-[85vh] flex flex-col justify-center pt-8 sm:pt-12 pb-8 sm:pb-12">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-8">
            <motion.div
            style={{ 
              scale: headerScale,
              opacity: headerOpacity,
              y: headerY
            }}
            className="text-center mb-12 sm:mb-20 origin-bottom"
          >
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-4 sm:mb-6 tracking-tighter leading-tight sm:leading-none">
                {activeTab === 'cvs' ? (
                  <>Let's Build Your <span className="text-lime-500 italic relative">Resume</span></>
                ) : (
                  <>Lets build your <span className="text-lime-500 italic relative">COver lEtter</span></>
                )}
              </h2>
            <p className="text-lg sm:text-xl text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed px-4">
              {activeTab === 'cvs' 
                ? 'Design a high-performance resume that bypasses ATS filters and lands you the interview.'
                : 'Craft a compelling narrative that connects your experience to the job and grabs attention.'}
            </p>

            {/* Journey mode indicator if JD was already provided */}
            {state.jdText && state.jdWordCount >= 10 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 mt-6 sm:mt-8 px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl shadow-xl shadow-purple-500/5 mx-4"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 h-4 text-purple-500" />
                <span className="text-xs sm:text-sm font-bold text-purple-500">
                  Journey Mode Active: Auto-tailoring to Job Description
                </span>
              </motion.div>
            )}
          </motion.div>

           {/* Action Cards Grid - Optimized for all screens */}
           <motion.div 
             style={{
               scale: cardsScale,
               y: cardsY,
               opacity: cardsOpacity
             }}
             className={`grid gap-4 sm:gap-8 origin-top ${userHasMasterCV || activeTab === 'cover-letters'
               ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
               : 'grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto'}`}
           >
            {activeTab === 'cvs' ? (
              <>
                {/* Resume Cards */}
                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setParseMethod('upload')}
                  className="group relative bg-white dark:bg-[#141810] rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-white/5 overflow-hidden text-left flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-4 sm:space-y-8">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-lime-500 text-black rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-2xl shadow-lime-500/30 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                      <Upload className="w-8 h-8 sm:w-12 sm:h-12 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">Upload</h3>
                      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Import your existing resume. <br className="hidden xs:block" />
                        We'll handle the rest.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[9px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 bg-black/5 dark:bg-white/10 rounded-full text-gray-400 group-hover:text-lime-500 transition-colors">
                        PDF / DOCX
                      </span>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleManualEntry()}
                  className="group relative bg-white dark:bg-[#141810] rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-white/5 overflow-hidden text-left flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-4 sm:space-y-8">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-blue-500 text-white rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 group-hover:-rotate-6 group-hover:scale-110 transition-all duration-500">
                      <Edit3 className="w-8 h-8 sm:w-12 sm:h-12 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">Start Fresh</h3>
                      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Build a winning resume <br className="hidden xs:block" />
                        from scratch with AI.
                      </p>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-500/10 text-blue-500 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-all">
                      STEP-BY-STEP
                    </span>
                  </div>
                </motion.button>

                {userHasMasterCV ? (
                  <motion.button
                    whileHover={{ y: -8, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartWithJob}
                    className="group relative bg-white dark:bg-[#141810] rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-lime-500/30 overflow-hidden text-left flex flex-col items-center justify-center text-center"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-lime-500/20 via-transparent to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-lime-500/10 blur-[100px] rounded-full" />
                    <div className="relative flex flex-col items-center space-y-4 sm:space-y-8">
                      <div className="px-3 sm:px-4 py-1 sm:py-1.5 bg-lime-500 text-black text-[9px] sm:text-[10px] font-black rounded-full shadow-2xl shadow-lime-500/20">
                        POWERFUL
                      </div>
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-lime-500/20 border border-lime-500/40 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-all duration-500">
                        <Briefcase className="w-8 h-8 sm:w-12 sm:h-12 text-lime-500" />
                      </div>
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">Apply to Job</h3>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                          Auto-tailor your Master CV <br className="hidden xs:block" />
                          to any job description.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[9px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 bg-lime-500/10 text-lime-500 border border-lime-500/20 rounded-full group-hover:bg-lime-500 group-hover:text-black transition-all">
                          ATS OPTIMIZED
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ y: -8, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setParseMethod('linkedin')}
                    disabled={!user}
                    className={`group relative bg-white dark:bg-[#141810] rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border overflow-hidden text-left flex flex-col items-center justify-center text-center transition-all ${user 
                      ? 'border-blue-200 dark:border-blue-500/20 hover:border-blue-500' 
                      : 'border-gray-200 dark:border-white/5 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex flex-col items-center space-y-4 sm:space-y-8">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-blue-500/20 border border-blue-500/40 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-all duration-500">
                        <svg className="w-8 h-8 sm:w-12 sm:h-12 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">LinkedIn</h3>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                          Import your profile data <br className="hidden xs:block" />
                          directly from LinkedIn.
                        </p>
                      </div>
                      {!user && (
                        <span className="text-[9px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-600 rounded-full">
                          Sign in required
                        </span>
                      )}
                    </div>
                  </motion.button>
                )}
              </>
            ) : (
              <>
                {/* Cover Letter Cards */}
                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartWithJob}
                  className="group relative bg-white dark:bg-[#141810] rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-lime-500/30 overflow-hidden text-left flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-lime-500/20 via-transparent to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-4 sm:space-y-8">
                    <div className="px-3 sm:px-4 py-1 sm:py-1.5 bg-lime-500 text-black text-[9px] sm:text-[10px] font-black rounded-full shadow-2xl shadow-lime-500/20">
                      AI POWERED
                    </div>
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-lime-500/20 border border-lime-500/40 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-all duration-500">
                      <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-lime-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">Write with AI</h3>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                        Generate a tailored letter <br className="hidden xs:block" />
                        from a job description.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[9px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 bg-lime-500/10 text-lime-500 border border-lime-500/20 rounded-full group-hover:bg-lime-500 group-hover:text-black transition-all">
                        RECOMMENDED
                      </span>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/editor?mode=create-cover-letter&step=2')}
                  className="group relative bg-white dark:bg-[#141810] rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-white/5 overflow-hidden text-left flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-4 sm:space-y-8">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-blue-500 text-white rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 group-hover:-rotate-6 group-hover:scale-110 transition-all duration-500">
                      <Edit3 className="w-8 h-8 sm:w-12 sm:h-12 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">Start Fresh</h3>
                      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Pick a template and <br className="hidden xs:block" />
                        write your own story.
                      </p>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-500/10 text-blue-500 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-all">
                      BLANK TEMPLATE
                    </span>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setParseMethod('upload')}
                  className="group relative bg-white dark:bg-[#141810] rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-white/5 overflow-hidden text-left flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-4 sm:space-y-8">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-orange-500 text-white rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-2xl shadow-orange-500/30 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                      <FolderOpen className="w-8 h-8 sm:w-12 sm:h-12 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">Import</h3>
                      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Import an existing letter <br className="hidden xs:block" />
                        to redesign it.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[9px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 bg-orange-500/10 text-orange-500 rounded-full">
                        PDF / DOCX
                      </span>
                    </div>
                  </div>
                </motion.button>
              </>
            )}
          </motion.div>

          {/* Pro Tip - Minimalist Inline Section */}
          <motion.div
             initial={{ opacity: 0, y: 10 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="mt-8 sm:mt-12 mb-8 sm:mb-12 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 max-w-5xl mx-auto text-center px-4 sm:px-8"
          >
             <span className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] italic flex-shrink-0">PRO TIP:</span>
             <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium leading-relaxed max-w-lg">
               {userHasMasterCV 
                 ? "Use 'Apply to Job' to automatically customize your resume for 90%+ ATS matching in seconds."
                 : "Create a Master CV first. It will act as your source-of-truth and save you hours of repetitive work."}
             </p>
          </motion.div>

          </div>
        </div>

        {/* Continue Editing Section */}
        {!isGuestMode && (
          <div className="snap-start w-full min-h-[80vh] pt-8 sm:pt-12 bg-[var(--bg-primary)] relative">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 pb-32">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 mb-6 pb-6 border-b border-gray-200/50 dark:border-white/5 sticky top-16 pt-6 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-md">
                  <div className="text-left">
                    <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-lime-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner">
                        <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-lime-500" />
                      </div>
                      <h3 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                        Continue Editing
                      </h3>
                    </div>
                    <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 font-medium px-1">
                      Pick up where you left off with your recent resumes and cover letters.
                    </p>
                  </div>
                  
                  {/* Toggle Tab UI */}
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-100 dark:bg-black/20 p-1 sm:p-1.5 rounded-xl border border-gray-200 dark:border-white/5 shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar">
                     <button
                       onClick={() => setActiveTab('cvs')}
                       className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'cvs' ? 'bg-lime-500 text-black shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`}
                     >
                       Resumes
                     </button>
                     <button
                       onClick={() => setActiveTab('cover-letters')}
                       className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'cover-letters' ? 'bg-lime-500 text-black shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`}
                     >
                       Cover Letters
                     </button>
                  </div>
                </div>

                {/* Enhanced Filters */}
              {existingCVs.length > 0 && activeTab === 'cvs' && (
                <div className="flex flex-wrap items-center gap-1 mb-6 sm:mb-8 px-1">
                   <button 
                     onClick={() => setFilterType('all')}
                     className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black transition-all ${filterType === 'all' ? 'text-gray-900 dark:text-white border border-gray-200 dark:border-white/20 bg-gray-100 dark:bg-white/5' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                   >
                     All
                   </button>
                   
                   <InfoTooltip content="Your primary resume - the source of truth for all tailored versions.">
                     <button 
                       onClick={() => setFilterType('master')}
                       className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black transition-all flex items-center gap-2 ${filterType === 'master' ? 'text-blue-600 dark:text-blue-500 border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/5' : 'text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
                     >
                       <div className={`w-1.5 h-1.5 rounded-full ${filterType === 'master' ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                       Master
                     </button>
                   </InfoTooltip>
   
                   <InfoTooltip content="Resumes tailored for specific job applications with ATS optimization.">
                     <button 
                       onClick={() => setFilterType('journey')}
                       className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black transition-all flex items-center gap-2 ${filterType === 'journey' ? 'text-purple-600 dark:text-purple-500 border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/5' : 'text-gray-500 hover:text-purple-600 dark:hover:text-purple-400'}`}
                     >
                       <div className={`w-1.5 h-1.5 rounded-full ${filterType === 'journey' ? 'bg-purple-600 dark:bg-purple-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                       Journey
                     </button>
                   </InfoTooltip>
   
                   <InfoTooltip content="Standalone resumes for various purposes.">
                     <button 
                       onClick={() => setFilterType('standalone')}
                       className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black transition-all flex items-center gap-2 ${filterType === 'standalone' ? 'text-orange-600 dark:text-orange-500 border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/5' : 'text-gray-500 hover:text-orange-600 dark:hover:text-orange-400'}`}
                     >
                       <div className={`w-1.5 h-1.5 rounded-full ${filterType === 'standalone' ? 'bg-orange-600 dark:bg-orange-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                       Standalone
                     </button>
                   </InfoTooltip>
                </div>
                )}

              {isLoadingCVs ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex flex-col gap-2 sm:gap-3">
                      <div className="w-full aspect-[1/1.414] bg-gray-100 dark:bg-white/5 rounded-2xl sm:rounded-[2rem] animate-pulse border border-gray-200 dark:border-white/5" />
                      <div className="h-4 sm:h-5 w-3/4 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                      <div className="h-2.5 sm:h-3 w-1/2 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : activeTab === 'cvs' && (filteredCVs.length > 0 || draftCV) ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 px-1">
                
                {/* Render Draft CV if it exists */}
                {draftCV && filterType === 'all' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    onClick={() => {
                      if (draftCV) {
                        if (draftCV.cvData) {
                          dispatch({ type: 'SET_CV_DATA', payload: draftCV.cvData });
                        }
                        if (draftCV.template) {
                          dispatch({ type: 'SET_TEMPLATE', payload: draftCV.template });
                          dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: draftCV.template });
                        }
                        if (draftCV.cvTitle) {
                          dispatch({ type: 'SET_CV_TITLE', payload: draftCV.cvTitle });
                        }
                        if (draftCV.targetRole && draftCV.seniorityLevel) {
                          dispatch({ type: 'SET_ROLE_CONTEXT', payload: { targetRole: draftCV.targetRole, seniorityLevel: draftCV.seniorityLevel } });
                        }
                        
                        if (!draftCV.template || draftCV.currentStep === 2) {
                          goToStep(1); // Since step 2 is an overlay
                          window.dispatchEvent(new CustomEvent('show-template-overlay'));
                        } else {
                          goToStep(Math.max(3, draftCV.currentStep || 3) as 1 | 2 | 3 | 4 | 5);
                        }
                      }
                    }}
                    className="group cursor-pointer flex flex-col gap-2 sm:gap-3 relative"
                  >
                    <div className="relative">
                      {/* A special styled thumbnail for drafts */}
                      <div className="w-full aspect-[1/1.414] bg-orange-50 dark:bg-orange-950/20 rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-orange-300 dark:border-orange-500/30 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-orange-500 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-all duration-300">
                        <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-orange-400/50 dark:text-orange-500/30 mb-2 sm:mb-4" />
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-xs sm:text-sm">Draft Resume</span>
                        
                        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-30">
                          <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider shadow-lg bg-orange-500 text-white shadow-orange-500/20 flex items-center gap-1">
                            <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-white rounded-full animate-pulse" />
                            Unsaved
                          </span>
                        </div>
                        
                        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-30 w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 backdrop-blur-md rounded-lg sm:rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-2xl">
                          <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>

                        <div 
                          className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 z-40 w-8 h-8 sm:w-10 sm:h-10 bg-red-500/80 backdrop-blur-md rounded-lg sm:rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-2xl hover:bg-red-600"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this draft?')) {
                              try {
                                const response = await fetch('/api/cv-draft/delete', { method: 'DELETE' });
                                if (response.ok) {
                                  setDraftCV(null);
                                  cachedDraftCV = null;
                                }
                              } catch (err) {
                                console.error('Failed to delete draft:', err);
                              }
                            }
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-5 sm:h-5"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </div>
                      </div>
                    </div>

                    <div className="px-0.5 sm:px-1">
                       <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors tracking-tight">
                         {draftCV.cvTitle || 'Unfinished Resume'}
                       </h4>
                       <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                         <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                         Edited {new Date(draftCV.lastSaved || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                       </p>
                    </div>
                  </motion.div>
                )}

                {filteredCVs.map((cv, index) => (
                  <motion.div
                    key={cv.id || cv._id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleEditExistingCV(cv)}
                    className="group cursor-pointer flex flex-col gap-2 sm:gap-3"
                  >
                    <div className="relative">
                      <LazyThumbnail item={cv} />
                      
                      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-30">
                        <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider shadow-lg ${
                          cv.cvType === 'master' ? 'bg-blue-600 text-white shadow-blue-500/20' :
                          cv.cvType === 'journey' ? 'bg-purple-600 text-white shadow-purple-500/20' :
                          'bg-orange-600 text-white shadow-orange-500/20'
                        }`}>
                          {cv.cvType}
                        </span>
                      </div>
                      
                      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-30 w-8 h-8 sm:w-10 sm:h-10 bg-black/40 backdrop-blur-md rounded-lg sm:rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-2xl">
                        <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                    </div>

                    <div className="px-0.5 sm:px-1">
                       <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate group-hover:text-lime-600 dark:group-hover:text-lime-500 transition-colors tracking-tight">
                         {cv.title || 'Untitled Resume'}
                       </h4>
                       <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                         <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-lime-500 rounded-full shadow-[0_0_8px_rgba(132,204,22,0.5)]" />
                         {new Date(cv.updatedAt || cv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                       </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : activeTab === 'cvs' ? (
                <div className="text-center py-16 sm:py-32 bg-black/5 dark:bg-white/[0.02] rounded-2xl sm:rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/10 mx-1">
                  <FolderOpen className="w-12 h-12 sm:w-20 sm:h-20 text-gray-200 dark:text-gray-800 mx-auto mb-6 sm:mb-8 animate-bounce transition-all duration-1000" />
                  <h4 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">No Resumes</h4>
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 font-medium max-w-xs mx-auto px-4">
                    Build your first high-performance resume using the options above.
                  </p>
                </div>
              ) : null}

              {/* Cover Letters Grid */}
              {activeTab === 'cover-letters' && (
                isLoadingCoverLetters ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 px-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex flex-col gap-2 sm:gap-3">
                        <div className="w-full aspect-[1/1.414] bg-gray-100 dark:bg-white/5 rounded-2xl sm:rounded-[2rem] animate-pulse border border-gray-200 dark:border-white/5" />
                        <div className="h-4 sm:h-5 w-3/4 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                        <div className="h-2.5 sm:h-3 w-1/2 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : existingCoverLetters && existingCoverLetters.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 px-1">
                    {existingCoverLetters.map((cl) => (
                      <motion.div
                        key={cl.id || cl._id}
                        onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                        className="group cursor-pointer flex flex-col gap-2 sm:gap-3"
                      >
                        <div className="relative">
                          <LazyThumbnail item={cl} isCoverLetter={true} />
                          
                          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-30">
                            <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider shadow-lg bg-emerald-600 text-white shadow-emerald-500/20">
                              Cover Letter
                            </span>
                          </div>
                          
                          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-30 w-8 h-8 sm:w-10 sm:h-10 bg-black/40 backdrop-blur-md rounded-lg sm:rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-2xl">
                            <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                        </div>

                        <div className="px-0.5 sm:px-1">
                           <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate group-hover:text-lime-600 dark:group-hover:text-lime-500 transition-colors tracking-tight">
                             {cl.title || 'Untitled Cover Letter'}
                           </h4>
                           <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                              <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-lime-500 rounded-full shadow-[0_0_8px_rgba(132,204,22,0.5)]" />
                              {new Date(cl.updatedAt || cl.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                           </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 sm:py-32 bg-black/5 dark:bg-white/[0.02] rounded-2xl sm:rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/10 mx-1">
                    <FolderOpen className="w-12 h-12 sm:w-20 sm:h-20 text-gray-400 dark:text-gray-600 mx-auto mb-6 sm:mb-8 animate-bounce transition-all duration-1000" />
                    <h4 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">No Letters</h4>
                    <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 font-medium max-w-xs mx-auto px-4">
                      Create your first cover letter from the dashboard or job application journey.
                    </p>
                  </div>
                )
              )}
            </motion.div>
            </div>
          </div>
        )}
        </motion.div>
      )}

      {parseMethod === 'upload' && (
        <motion.div 
          key="upload"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center justify-center h-full min-h-[calc(100vh-200px)] px-4"
        >
          <div className="w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#141810] rounded-2xl sm:rounded-3xl shadow-xl shadow-black/10 dark:shadow-black/40 p-6 sm:p-12 border border-gray-200 dark:border-white/5"
            >
            {uploadStatus === 'idle' && (
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-[#80FF00]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[color:var(--text-primary)] mb-2 sm:mb-4">
                  Upload Your Resume
                </h3>
                <p className="text-sm sm:text-base text-[color:var(--text-secondary)] mb-6 sm:mb-8">
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
                  <span className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] text-black rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base">
                    Choose File
                  </span>
                </label>
                 <p className="text-[10px] sm:text-xs text-[color:var(--text-tertiary)] mt-4">
                   Supports PDF, DOCX, and images (max 10MB)
                 </p>
                 
                 {/* LinkedIn Import Option */}
                 {user ? (
                   <>
                     <div className="my-6 sm:my-8 border-t border-gray-200 dark:border-white/10" />
                     <div className="text-center">
                       <p className="text-xs sm:text-sm text-[color:var(--text-tertiary)] mb-4">Or import directly from LinkedIn</p>
                       <button
                         onClick={handleLinkedInImport}
                         disabled={isLinkedInImporting}
                         className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 text-sm sm:text-base"
                       >
                         <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                           <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                         </svg>
                         {isLinkedInImporting ? 'Importing...' : 'LinkedIn Import'}
                       </button>
                       {linkedInImportError && (
                         <p className="text-red-400 text-xs mt-2">{linkedInImportError}</p>
                       )}
                     </div>
                   </>
                 ) : (
                   <p className="text-[10px] sm:text-xs text-[color:var(--text-tertiary)] mt-4">
                     Sign in to import from LinkedIn
                   </p>
                 )}
                 
                 <button
                   onClick={() => setParseMethod(null)}
                   className="mt-6 text-sm sm:text-base text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] font-medium"
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
