'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Logo from '@/components/ui/Logo';
import { Upload, FileText, Edit3, CheckCircle2, Loader2, Briefcase, Sparkles, AlertTriangle, FolderOpen, Edit2, Copy, Plus, Grid, List, Trash2, MoreVertical } from 'lucide-react';
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
import toast from 'react-hot-toast';
import { StaticLayoutRenderer, EditableField } from '@/components/cv-builder-pro/components/CoreUI';
import { CANVAS_TEMPLATES } from '@/components/cv-builder-pro/registry';
import { normalizeCvDataForCanvas } from '@/lib/utils/cv-canvas-normalizer';

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
  atsScore?: number;
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
  
  const templateObj = React.useMemo(() => {
    if (item.template && (item.template.zones || item.template.type)) return item.template;
    
    let idToFind = '';
    if (typeof item.templateId === 'string') {
      idToFind = item.templateId;
    } else if (item.templateId && typeof item.templateId === 'object') {
      if (item.templateId.zones || item.templateId.type) {
        return item.templateId;
      }
      idToFind = item.templateId.id || item.templateId._id || '';
    } else if (item.metadata?.templateId) {
      idToFind = item.metadata.templateId;
    }

    if (idToFind) {
      const foundTemplate = getAllTemplates().find(t => t.id === idToFind || t._id === idToFind);
      if (foundTemplate) return foundTemplate;
    }

    // Default template fallback if no template ID is set
    const defaultTemplate = getAllTemplates().find(t => t.id === '1-col' || t.id === 'tpl-1') || getAllTemplates()[0];
    return defaultTemplate || null;
  }, [item.template, item.templateId, item.metadata?.templateId]);

  const cvDataForRenderer = React.useMemo(() => {
    return normalizeCvDataForCanvas(item.cvData || DEFAULT_UNIFIED_CV_DATA);
  }, [item.cvData]);

  const ReadOnlyWrapper = React.useMemo(() => function Editable(props: any) {
    return <EditableField {...props} data={cvDataForRenderer} readOnly={true} />;
  }, [cvDataForRenderer]);

  return (
    <div 
      ref={ref}
      className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-[#1a1a1a] p-4 pointer-events-none"
    >
      {/* Required CSS for CV Preview */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        :root {
          --cv-font: 'Inter';
          --cv-base-size: 12px;
          --cv-spacing: 1.0;
          --cv-accent: #22c55e;
        }
        .cv-document { font-family: var(--cv-font), sans-serif; color: #1f2937; font-size: var(--cv-base-size); }
        .cv-name { font-size: calc(var(--cv-base-size) * 2.5); line-height: 1.1; }
        .cv-name-narrow { font-size: calc(var(--cv-base-size) * 2.0); line-height: 1.1; }
        .cv-role { font-size: calc(var(--cv-base-size) * 1.15); }
        .cv-heading { font-size: calc(var(--cv-base-size) * 1.1); }
        .cv-title { font-size: calc(var(--cv-base-size) * 1.05); }
        .cv-subtitle { font-size: calc(var(--cv-base-size) * 0.95); }
        .cv-date { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-contact { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-body { font-size: inherit; line-height: calc(1.6 * var(--cv-spacing)); }
        .cv-document p, .cv-document ul, .cv-document li { font-size: inherit !important; line-height: inherit !important; margin: 0; padding: 0; }
        .cv-prose p { margin-bottom: calc(0.3em * var(--cv-spacing)) !important; }
        .cv-prose ul { list-style-type: disc; padding-left: 1.2em; margin-top: calc(0.25em * var(--cv-spacing)) !important; margin-bottom: calc(0.25em * var(--cv-spacing)) !important; }
      `}} />

      {isInView ? (
        <div className="relative w-full h-full max-w-[200px] max-h-[283px] aspect-[1/1.414] bg-white shadow-md overflow-hidden rounded-sm ring-1 ring-gray-300 @container">
          {!isCoverLetter && templateObj ? (
            <div className="absolute top-0 left-0 w-[794px] h-[1123px] origin-top-left" style={{ transform: 'scale(calc(100cqw / 794))' }}>
              <StaticLayoutRenderer template={templateObj} cvData={cvDataForRenderer} ReadOnlyWrapper={ReadOnlyWrapper} />
            </div>
          ) : (
            // Cover Letter or Fallback: Standard white A4 preview skeleton
            <div className="w-full h-full p-6 flex flex-col gap-4 bg-white relative">
              {/* Header placeholder */}
              <div className="space-y-2 border-b border-gray-100 pb-4">
                <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse" />
              </div>
              {/* Body paragraph placeholders */}
              <div className="space-y-3 pt-2">
                <div className="h-2 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-2 w-[95%] bg-gray-100 rounded animate-pulse" />
                <div className="h-2 w-[90%] bg-gray-100 rounded animate-pulse" />
                <div className="h-2 w-[85%] bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="space-y-3 pt-2">
                <div className="h-2 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-2 w-[95%] bg-gray-100 rounded animate-pulse" />
                <div className="h-2 w-[40%] bg-gray-100 rounded animate-pulse" />
              </div>
              {/* Signature placeholder */}
              <div className="mt-auto pt-4 space-y-2">
                <div className="h-2.5 w-1/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-2 w-1/5 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-full max-w-[200px] max-h-[283px] aspect-[1/1.414] bg-white shadow-md overflow-hidden rounded-sm ring-1 ring-gray-300">
          <div className="w-full h-full bg-gray-100 dark:bg-white/5 animate-pulse" />
        </div>
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
  const { state, dispatch, setFresherMode, detectFresherMode, determineCVType, setJdText, goToStep, setTemplateOverlayOpen } = useResumeEnhancer();
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
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [linkedInImportError, setLinkedInImportError] = useState('');
  const [forcedCvType, setForcedCvType] = useState<'master' | 'journey' | 'standalone' | null>(null);
  const [isCreatingBlank, setIsCreatingBlank] = useState(false);
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Guest';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDeleteCV = async (cvId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    try {
      const response = await fetch(`/api/cvs/${cvId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Resume deleted successfully');
        setExistingCVs(prev => prev.filter(cv => (cv.id || cv._id) !== cvId));
        if (cachedExistingCVs) {
          cachedExistingCVs = cachedExistingCVs.filter(cv => (cv.id || cv._id) !== cvId);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete resume');
      }
    } catch (error: any) {
      console.error('Error deleting CV:', error);
      toast.error(error.message || 'Failed to delete resume');
    }
  };

  const handleDeleteCoverLetter = async (clId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this cover letter?')) return;
    try {
      const response = await fetch(`/api/cover-letters/${clId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Cover letter deleted successfully');
        setExistingCoverLetters(prev => prev.filter(cl => (cl.id || cl._id) !== clId));
        if (cachedExistingCoverLetters) {
          cachedExistingCoverLetters = cachedExistingCoverLetters.filter(cl => (cl.id || cl._id) !== clId);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete cover letter');
      }
    } catch (error: any) {
      console.error('Error deleting cover letter:', error);
      toast.error(error.message || 'Failed to delete cover letter');
    }
  };

  const handleDuplicateCV = async (cvId: string, sourceTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDuplicating(true);
    try {
      const response = await fetch('/api/cvs/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceCvId: cvId,
          userId: user?.id,
          journeyId: null,
          customTitle: `${sourceTitle} (Copy)`
        }),
      });

      const result = await response.json();
      if (result.success && result.cvId) {
        toast.success('Resume duplicated successfully');
        fetchExistingCVs();
      } else {
        throw new Error(result.message || 'Failed to duplicate CV');
      }
    } catch (error: any) {
      console.error('Error duplicating CV:', error);
      toast.error(error.message || 'Error duplicating CV');
    } finally {
      setIsDuplicating(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / 86400000);
      
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const cvsWithAts = existingCVs.filter(cv => typeof cv.atsScore === 'number' || (cv as any).metadata?.atsScore !== undefined);
  const averageATSScore = cvsWithAts.length > 0 
    ? Math.round(cvsWithAts.reduce((sum, cv) => sum + (cv.atsScore ?? (cv as any).metadata?.atsScore ?? 0), 0) / cvsWithAts.length) 
    : 0;
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
  const [filterType, setFilterType] = useState<'all' | 'master' | 'standalone' | 'journey' | 'archived'>('all');
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
    if (user?.id) {
      fetchExistingCoverLetters();
    }
  }, [fetchExistingCVs, fetchExistingCoverLetters, fetchDraftCV, user?.id]);

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
    const isArchived = cv.status === 'archived';
    if (filterType === 'archived') return isArchived;
    if (isArchived) return false;
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

  const handleDuplicatePrimary = async () => {
    const masterCV = existingCVs.find(cv => cv.cvType === 'master');
    if (!masterCV) {
      alert("No Primary (Master) CV found to duplicate.");
      return;
    }
    
    setIsDuplicating(true);
    try {
      const response = await fetch('/api/cvs/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceCvId: masterCV.id || masterCV._id,
          userId: user?.id,
          journeyId: null,
          customTitle: `${masterCV.title} (Copy)`
        }),
      });

      const result = await response.json();
      if (result.success && result.cvId) {
        router.push(`/editor?mode=edit&cvId=${result.cvId}`);
      } else {
        throw new Error(result.message || 'Failed to duplicate CV');
      }
    } catch (error) {
      console.error('Error duplicating master CV:', error);
      alert('Error duplicating CV. Please try again.');
    } finally {
      setIsDuplicating(false);
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
    const cvType = forcedCvType || determineCVType();
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

  const handleManualEntry = async () => {
    const freshCvData = JSON.parse(JSON.stringify(DEFAULT_UNIFIED_CV_DATA)) as UnifiedCVDataStructure;
    const cvType = determineCVType();

    if (isGuestMode) {
      setFresherMode(true);
      dispatch({ type: 'SET_FRESHER_MODE', payload: true });
      dispatch({ type: 'SET_CV_TYPE', payload: cvType });

      if (cvType === 'master') {
        dispatch({ type: 'SET_IS_USER_MASTER', payload: true });
      }

      dispatch({ type: 'SET_CV_DATA', payload: freshCvData });
      
      // Navigate to step 2 (template selection)
      router.push('/editor?step=2');
    } else {
      setIsCreatingBlank(true);
      try {
        const payload = {
          title: cvType === 'master' ? 'Master CV' : 'Standalone CV',
          cvData: freshCvData,
          cvType: cvType,
          status: 'draft',
          metadata: {
            isMaster: cvType === 'master',
            createdVia: 'resume-enhancer'
          }
        };

        const response = await fetch('/api/cvs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        
        if (response.status === 409 && result.requiresMasterCV) {
          toast.error(result.error || 'Please create your Master CV first.');
          return;
        }

        if (!response.ok) {
          throw new Error(result?.error || 'Failed to create new CV');
        }

        const savedCvId = result.cv?.id || result.cv?._id;
        if (!savedCvId) {
          throw new Error('No CV ID returned from server');
        }

        // Set context values
        setFresherMode(true);
        dispatch({ type: 'SET_FRESHER_MODE', payload: true });
        dispatch({ type: 'SET_CV_TYPE', payload: cvType });
        if (cvType === 'master') {
          dispatch({ type: 'SET_IS_USER_MASTER', payload: true });
        }
        dispatch({ type: 'SET_CV_ID', payload: savedCvId });
        dispatch({ type: 'SET_CV_DATA', payload: freshCvData });

        // Navigate to edit mode with new cvId and step 2
        const currentParams = new URLSearchParams(window.location.search);
        currentParams.set('mode', cvType === 'master' ? 'edit-master' : 'edit');
        currentParams.set('cvId', savedCvId);
        currentParams.set('step', '2');
        router.push(`${window.location.pathname}?${currentParams.toString()}`);
      } catch (error: any) {
        console.error('Error starting from scratch:', error);
        toast.error(error.message || 'Failed to initialize a new CV');
      } finally {
        setIsCreatingBlank(false);
      }
    }
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
          className="flex flex-col h-full min-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar bg-[var(--bg-primary)] scroll-smooth"
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
                    {activeTab === 'cvs' ? 'Build Your Resume' : 'Let\'s Build Your Cover Letter'}
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
        <div ref={topSectionRef} className="w-full flex flex-col pt-6 pb-2">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-8">
            <motion.div
              style={{ 
                scale: headerScale,
                opacity: headerOpacity,
                y: headerY
              }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 mb-4 sm:mb-6 origin-bottom"
            >
              {/* Welcome text */}
              <div className="text-left max-w-2xl">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                  {getGreeting()}, <span className="text-lime-500">{firstName}</span> 👋
                </h2>
                <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 font-semibold mt-2">
                  Let's create your next winning resume.
                </p>
              </div>

              {/* Stats Widgets */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                <div className="flex items-center gap-3 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/5 px-5 py-3.5 rounded-2xl shadow-lg hover:scale-105 transition-all">
                  <div className="w-10 h-10 bg-lime-500/10 rounded-xl flex items-center justify-center text-lime-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-black text-gray-900 dark:text-white">{existingCVs.length}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Resumes</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/5 px-5 py-3.5 rounded-2xl shadow-lg hover:scale-105 transition-all">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-black text-gray-900 dark:text-white">{existingCoverLetters.length}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Cover Letters</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/5 px-5 py-3.5 rounded-2xl shadow-lg hover:scale-105 transition-all">
                  <div className="w-10 h-10 bg-lime-500/10 rounded-xl flex items-center justify-center text-lime-500 dark:text-[#80FF00]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {averageATSScore}%
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Avg. ATS Score</div>
                  </div>
                </div>
              </div>
            </motion.div>

           {/* Action Cards Grid - Optimized for all screens */}
           <motion.div 
             style={{
               scale: cardsScale,
               y: cardsY,
               opacity: cardsOpacity
             }}
             className="grid gap-3 sm:gap-4 origin-top grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto"
           >
            {activeTab === 'cvs' ? (
              <>
                {/* Resume Cards */}
                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleManualEntry()}
                  disabled={isCreatingBlank || isDuplicating || isLoadingCVs}
                  className={`group relative bg-white dark:bg-[#141810] rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-lime-500 dark:hover:border-[#80FF00]/50 overflow-hidden text-left flex flex-col items-center justify-center text-center ${(isCreatingBlank || isDuplicating || isLoadingCVs) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-lime-500/10 border border-lime-500/30 text-lime-550 dark:bg-[#80FF00]/10 dark:border-[#80FF00]/20 dark:text-[#80FF00] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-500">
                      {isCreatingBlank ? <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" /> : <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">Blank CV</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Start from scratch
                      </p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDuplicatePrimary}
                  disabled={!userHasMasterCV || isDuplicating || isLoadingCVs}
                  className={`group relative bg-white dark:bg-[#141810] rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-gray-250 dark:border-white/5 overflow-hidden text-left flex flex-col items-center justify-center text-center ${(!userHasMasterCV || isDuplicating || isLoadingCVs) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-lime-500/10 border border-lime-500/30 text-lime-550 dark:bg-[#80FF00]/10 dark:border-[#80FF00]/20 dark:text-[#80FF00] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-500">
                      {isDuplicating ? <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" /> : <Copy className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">Duplicate Primary CV</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Create a copy of your <br className="hidden xs:block" />
                        master CV.
                      </p>
                    </div>
                    {!userHasMasterCV && (
                      <span className="text-[9px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full">
                        Requires Master CV
                      </span>
                    )}
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setForcedCvType('standalone');
                    setParseMethod('upload');
                  }}
                  disabled={isCreatingBlank || isDuplicating || isLoadingCVs}
                  className={`group relative bg-white dark:bg-[#141810] rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-gray-250 dark:border-white/5 overflow-hidden text-left flex flex-col items-center justify-center text-center ${(isCreatingBlank || isDuplicating || isLoadingCVs) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-500/10 border border-purple-500/30 text-purple-500 dark:bg-[#c084fc]/10 dark:border-[#c084fc]/20 dark:text-[#c084fc] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-500">
                      <Upload className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">Upload a CV</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Upload your existing CV <br className="hidden xs:block" />
                        and improve it with AI.
                      </p>
                    </div>
                  </div>
                </motion.button>
              </>
            ) : (
              <>
                {/* Cover Letter Cards */}
                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartWithJob}
                  className="group relative bg-white dark:bg-[#141810] rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-lime-500/30 overflow-hidden text-left flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-lime-500/20 via-transparent to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="px-3 sm:px-4 py-1 sm:py-1.5 bg-lime-500 text-black text-[9px] sm:text-[10px] font-black rounded-full shadow-2xl shadow-lime-500/20">
                      AI POWERED
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-lime-500/20 border border-lime-500/40 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-all duration-500">
                      <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-lime-500" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">Write with AI</h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
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
                  className="group relative bg-white dark:bg-[#141810] rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-white/5 overflow-hidden text-left flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30 group-hover:-rotate-6 group-hover:scale-110 transition-all duration-500">
                      <Edit3 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">Start Fresh</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
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
                  className="group relative bg-white dark:bg-[#141810] rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-white/5 overflow-hidden text-left flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/30 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                      <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">Import</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
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
             className="mt-4 sm:mt-6 mb-2 sm:mb-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 max-w-5xl mx-auto text-center px-4 sm:px-8"
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
          <div className="snap-start w-full min-h-[80vh] pt-4 sm:pt-6 bg-[var(--bg-primary)] relative">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 pb-32">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-200/50 dark:border-white/5 sticky top-16 pt-6 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-md">
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight text-left">
                    {activeTab === 'cvs' ? 'Your Resumes' : 'Your Cover Letters'}
                  </h3>

                  {/* Toggles: Resume/Cover Letter + Grid/List */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Resumes / Cover Letters Tab Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#141810] p-1 rounded-full border border-gray-200 dark:border-white/5 w-fit">
                      <button
                        onClick={() => {
                          setActiveTab('cvs');
                          setFilterType('all');
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                          activeTab === 'cvs'
                            ? 'bg-lime-500 text-black dark:bg-[#0d100a] dark:text-[#80FF00] dark:border dark:border-[#80FF00]/25 shadow-md'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Resumes
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('cover-letters');
                          setFilterType('all');
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                          activeTab === 'cover-letters'
                            ? 'bg-lime-500 text-black dark:bg-[#0d100a] dark:text-[#80FF00] dark:border dark:border-[#80FF00]/25 shadow-md'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Cover Letters
                      </button>
                    </div>

                    {/* Grid / List Layout Switcher */}
                    <div className="flex items-center bg-gray-100 dark:bg-[#141810] p-1 rounded-full border border-gray-200 dark:border-white/5 w-fit">
                      <button
                        onClick={() => setViewLayout('grid')}
                        className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                          viewLayout === 'grid'
                            ? 'bg-lime-500 text-black dark:bg-[#0d100a] dark:text-[#80FF00] dark:border dark:border-[#80FF00]/25 shadow-md'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        Grid
                      </button>
                      <button
                        onClick={() => setViewLayout('list')}
                        className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                          viewLayout === 'list'
                            ? 'bg-lime-500 text-black dark:bg-[#0d100a] dark:text-[#80FF00] dark:border dark:border-[#80FF00]/25 shadow-md'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        List
                      </button>
                    </div>
                  </div>
                </div>

                {/* Enhanced Filters */}
              {existingCVs.length > 0 && activeTab === 'cvs' && (
                <div className="flex flex-wrap items-center gap-1.5 mb-6 sm:mb-8 px-1">
                    <button 
                      onClick={() => setFilterType('all')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        filterType === 'all'
                          ? 'bg-lime-500/10 border-lime-500/30 text-lime-600 dark:bg-[#80FF00]/10 dark:border-[#80FF00]/30 dark:text-[#80FF00]'
                          : 'bg-transparent border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Recent
                    </button>
                    
                    <InfoTooltip content="Your primary resume - the source of truth for all tailored versions.">
                      <button 
                        onClick={() => setFilterType('master')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${
                          filterType === 'master'
                            ? 'bg-lime-500/10 border-lime-500/30 text-lime-600 dark:bg-[#80FF00]/10 dark:border-[#80FF00]/30 dark:text-[#80FF00]'
                            : 'bg-transparent border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${filterType === 'master' ? 'bg-lime-500 dark:bg-[#80FF00]' : 'bg-gray-400 dark:bg-gray-650'}`} />
                        Master
                      </button>
                    </InfoTooltip>
    
                    <InfoTooltip content="Resumes tailored for specific job applications with ATS optimization.">
                      <button 
                        onClick={() => setFilterType('journey')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${
                          filterType === 'journey'
                            ? 'bg-lime-500/10 border-lime-500/30 text-lime-600 dark:bg-[#80FF00]/10 dark:border-[#80FF00]/30 dark:text-[#80FF00]'
                            : 'bg-transparent border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${filterType === 'journey' ? 'bg-lime-500 dark:bg-[#80FF00]' : 'bg-gray-400 dark:bg-gray-650'}`} />
                        Journey
                      </button>
                    </InfoTooltip>
    
                    <InfoTooltip content="Standalone resumes for various purposes.">
                      <button 
                        onClick={() => setFilterType('standalone')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${
                          filterType === 'standalone'
                            ? 'bg-lime-500/10 border-lime-500/30 text-lime-600 dark:bg-[#80FF00]/10 dark:border-[#80FF00]/30 dark:text-[#80FF00]'
                            : 'bg-transparent border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${filterType === 'standalone' ? 'bg-lime-500 dark:bg-[#80FF00]' : 'bg-gray-400 dark:bg-gray-650'}`} />
                        Standalone
                      </button>
                    </InfoTooltip>
    
                    <InfoTooltip content="Archived resumes.">
                      <button 
                        onClick={() => setFilterType('archived')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${
                          filterType === 'archived'
                            ? 'bg-lime-500/10 border-lime-500/30 text-lime-600 dark:bg-[#80FF00]/10 dark:border-[#80FF00]/30 dark:text-[#80FF00]'
                            : 'bg-transparent border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${filterType === 'archived' ? 'bg-lime-500 dark:bg-[#80FF00]' : 'bg-gray-400 dark:bg-gray-650'}`} />
                        Archived
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
                viewLayout === 'grid' ? (
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
                            setTemplateOverlayOpen(true);
                          } else {
                            goToStep(Math.max(3, draftCV.currentStep || 3) as 1 | 2 | 3 | 4 | 5);
                          }
                        }
                      }}
                      className="group cursor-pointer flex flex-col justify-between bg-white dark:bg-[#141810] border border-gray-250 dark:border-white/5 rounded-[2rem] p-4 sm:p-5 shadow-lg hover:shadow-2xl hover:border-orange-500/30 hover:scale-[1.01] transition-all duration-300 relative overflow-visible"
                    >
                      <div className="relative aspect-[1/1.414] w-full rounded-[1.5rem] overflow-hidden bg-orange-50 dark:bg-orange-950/20 border border-dashed border-orange-350 dark:border-orange-500/30 flex flex-col items-center justify-center">
                        <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-orange-400/50 dark:text-orange-500/30 mb-2 sm:mb-4 animate-pulse" />
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
                          className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 z-40 w-8 h-8 sm:w-10 sm:h-10 bg-red-500/80 backdrop-blur-md rounded-lg sm:rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-2xl hover:bg-red-650"
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
                          <Trash2 className="text-white w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      </div>
  
                      <div className="mt-4 flex flex-col justify-between flex-grow">
                         <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors tracking-tight">
                           {draftCV.cvTitle || 'Unfinished Resume'}
                         </h4>
                         <p className="text-[10px] sm:text-xs text-gray-550 dark:text-gray-400 font-bold flex items-center gap-1.5 sm:gap-2 mt-1">
                           <span className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
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
                      className="group cursor-pointer flex flex-col justify-between bg-white dark:bg-[#141810] border border-gray-250 dark:border-white/5 rounded-[2rem] p-4 sm:p-5 shadow-lg hover:shadow-2xl hover:border-lime-500/30 hover:scale-[1.01] transition-all duration-300 relative overflow-visible"
                    >
                      <div className="relative aspect-[1/1.414] w-full rounded-[1.5rem] overflow-hidden">
                        <LazyThumbnail item={cv} />
                        
                        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-30">
                          <span className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider shadow-lg ${
                            cv.cvType === 'master' ? 'bg-[#0D2C54] text-blue-200 border border-blue-500/30 shadow-blue-500/10' :
                            cv.cvType === 'journey' ? 'bg-[#5C3A21] text-amber-200 border border-amber-500/30 shadow-amber-500/10' :
                            'bg-[#134074] text-cyan-200 border border-cyan-500/30 shadow-cyan-500/10'
                          }`}>
                            {cv.cvType}
                          </span>
                        </div>
                        
                        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-30 w-8 h-8 sm:w-10 sm:h-10 bg-black/50 backdrop-blur-md rounded-lg sm:rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-2xl hover:bg-black/75">
                          <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                      </div>
  
                      <div className="mt-4 flex flex-col justify-between flex-grow">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate group-hover:text-lime-600 dark:group-hover:text-lime-500 transition-colors tracking-tight flex-grow">
                              {cv.title || 'Untitled Resume'}
                            </h4>
                            {/* ATS Score in layout */}
                            {(typeof cv.atsScore === 'number' || (cv as any).metadata?.atsScore !== undefined) && (
                              <div className="flex flex-col items-end shrink-0 leading-none">
                                <span className="text-xs font-black text-lime-500 dark:text-[#80FF00] flex items-center gap-0.5">
                                  <span className="w-1 h-1 rounded-full bg-lime-500 dark:bg-[#80FF00] animate-pulse" />
                                  {cv.atsScore ?? (cv as any).metadata?.atsScore}%
                                </span>
                                <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">ATS</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-xs text-gray-550 dark:text-gray-400 font-bold flex items-center gap-1.5 sm:gap-2 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-lime-500 rounded-full shadow-[0_0_8px_rgba(132,204,22,0.5)]" />
                            Edited {getRelativeTime(cv.updatedAt || cv.createdAt)}
                          </p>
                        </div>
  
                        {/* Bottom row with avatars and three-dots menu */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-white/5 relative">
                          <div className="flex items-center -space-x-1.5 overflow-hidden">
                            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#141810] bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                              {cv.title ? cv.title.substring(0, 2).toUpperCase() : 'CV'}
                            </div>
                            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#141810] bg-[#80FF00] flex items-center justify-center text-[9px] font-black text-black shadow-sm">
                              JD
                            </div>
                            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#141810] bg-purple-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                              AI
                            </div>
                          </div>
  
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(prev => prev === (cv.id || cv._id) ? null : (cv.id || cv._id || null));
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
  
                            {/* Dropdown Menu */}
                            {activeMenuId === (cv.id || cv._id) && (
                              <div 
                                className="absolute bottom-9 right-0 z-50 bg-white dark:bg-[#1f2917] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl py-1.5 w-32 text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleEditExistingCV(cv)}
                                  className="w-full px-3.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => handleDuplicateCV(cv.id || cv._id || '', cv.title, e)}
                                  className="w-full px-3.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  Duplicate
                                </button>
                                <div className="my-1 border-t border-gray-100 dark:border-white/5" />
                                <button
                                  onClick={(e) => handleDeleteCV(cv.id || cv._id || '', e)}
                                  className="w-full px-3.5 py-1.5 text-xs font-bold text-red-650 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                ) : (
                  <div className="flex flex-col gap-3 px-1">
                    {draftCV && filterType === 'all' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
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
                              goToStep(1);
                              setTemplateOverlayOpen(true);
                            } else {
                              goToStep(Math.max(3, draftCV.currentStep || 3) as 1 | 2 | 3 | 4 | 5);
                            }
                          }
                        }}
                        className="group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-[#141810] border border-gray-250 dark:border-white/5 rounded-2xl hover:border-orange-500/30 hover:shadow-lg transition-all duration-300 w-full"
                      >
                        <div className="flex items-center gap-4 flex-grow min-w-0">
                          {/* Mini Thumbnail */}
                          <div className="w-10 h-14 bg-orange-55/40 dark:bg-orange-950/20 border border-dashed border-orange-300 dark:border-orange-500/30 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                            <FileText className="w-5 h-5 text-orange-500" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-black text-gray-900 dark:text-white truncate group-hover:text-orange-650 dark:group-hover:text-orange-550">
                              {draftCV.cvTitle || 'Unfinished Resume'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-orange-500 text-white">
                                Unsaved Draft
                              </span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                                Edited {new Date(draftCV.lastSaved || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
  
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                          <button
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
                            className="p-2 bg-gray-100 hover:bg-red-500 hover:text-white dark:bg-[#1a230f]/60 dark:hover:bg-red-650 dark:hover:text-white text-red-500 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
  
                    {filteredCVs.map((cv, index) => (
                      <motion.div
                        key={cv.id || cv._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleEditExistingCV(cv)}
                        className="group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-[#141810] border border-gray-250 dark:border-white/5 rounded-2xl hover:border-lime-500/30 hover:shadow-lg transition-all duration-300 w-full"
                      >
                        <div className="flex items-center gap-4 flex-grow min-w-0">
                          {/* Mini Thumbnail */}
                          <div className="w-10 h-14 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden flex-shrink-0 relative">
                            <LazyThumbnail item={cv} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-black text-gray-900 dark:text-white truncate group-hover:text-lime-600 dark:group-hover:text-lime-500">
                              {cv.title || 'Untitled Resume'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                cv.cvType === 'master' ? 'bg-[#0D2C54] text-blue-200' :
                                cv.cvType === 'journey' ? 'bg-[#5C3A21] text-amber-200' :
                                'bg-[#134074] text-cyan-200'
                              }`}>
                                {cv.cvType}
                              </span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                                Edited {getRelativeTime(cv.updatedAt || cv.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
  
                        <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end w-full sm:w-auto">
                          {/* ATS Score */}
                          {(typeof cv.atsScore === 'number' || (cv as any).metadata?.atsScore !== undefined) ? (
                            <div className="flex items-center gap-1.5 shrink-0 bg-lime-500/10 dark:bg-[#80FF00]/10 border border-lime-500/20 dark:border-[#80FF00]/20 px-2.5 py-1 rounded-full text-lime-600 dark:text-[#80FF00]">
                              <span className="w-1.5 h-1.5 rounded-full bg-lime-500 dark:bg-[#80FF00] animate-pulse" />
                              <span className="text-xs font-black">{cv.atsScore ?? (cv as any).metadata?.atsScore}%</span>
                              <span className="text-[8px] uppercase tracking-wider text-gray-500 dark:text-gray-405 font-bold">ATS</span>
                            </div>
                          ) : (
                            <div className="w-1" />
                          )}
  
                          {/* Avatars */}
                          <div className="hidden xs:flex items-center -space-x-1.5 overflow-hidden">
                            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#141810] bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                              {cv.title ? cv.title.substring(0, 2).toUpperCase() : 'CV'}
                            </div>
                            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#141810] bg-[#80FF00] flex items-center justify-center text-[9px] font-black text-black shadow-sm">
                              JD
                            </div>
                          </div>
  
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditExistingCV(cv);
                              }}
                              className="p-2 bg-gray-100 hover:bg-lime-500 hover:text-black dark:bg-[#1a230f]/60 dark:hover:bg-[#80FF00] dark:hover:text-black text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDuplicateCV(cv.id || cv._id || '', cv.title, e)}
                              className="p-2 bg-gray-100 hover:bg-lime-500 hover:text-black dark:bg-[#1a230f]/60 dark:hover:bg-[#80FF00] dark:hover:text-black text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteCV(cv.id || cv._id || '', e)}
                              className="p-2 bg-gray-100 hover:bg-red-500 hover:text-white dark:bg-[#1a230f]/60 dark:hover:bg-red-650 dark:hover:text-white text-red-500 dark:text-red-400 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
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
                  viewLayout === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 px-1">
                      {existingCoverLetters.map((cl) => (
                        <motion.div
                          key={cl.id || cl._id}
                          onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                          className="group cursor-pointer flex flex-col justify-between bg-white dark:bg-[#141810] border border-gray-250 dark:border-white/5 rounded-[2rem] p-4 sm:p-5 shadow-lg hover:shadow-2xl hover:border-lime-500/30 hover:scale-[1.01] transition-all duration-300 relative overflow-visible animate-fadeIn"
                        >
                          <div className="relative aspect-[1/1.414] w-full rounded-[1.5rem] overflow-hidden">
                            <LazyThumbnail item={cl} isCoverLetter={true} />
                            
                            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-30">
                              <span className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider shadow-lg bg-emerald-600 text-white shadow-emerald-500/20">
                                Cover Letter
                              </span>
                            </div>
                            
                            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-30 w-8 h-8 sm:w-10 sm:h-10 bg-black/55 backdrop-blur-md rounded-lg sm:rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-2xl hover:bg-black/75">
                              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                          </div>
  
                          <div className="mt-4 flex flex-col justify-between flex-grow">
                            <div>
                              <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate group-hover:text-lime-650 dark:group-hover:text-lime-550 transition-colors tracking-tight">
                                {cl.title || 'Untitled Cover Letter'}
                              </h4>
                              <p className="text-[10px] sm:text-xs text-gray-550 dark:text-gray-400 font-bold flex items-center gap-1.5 sm:gap-2 mt-1">
                                <span className="w-1.5 h-1.5 bg-lime-500 rounded-full shadow-[0_0_8px_rgba(132,204,22,0.5)]" />
                                Edited {getRelativeTime(cl.updatedAt || cl.createdAt)}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-white/5 relative">
                              <div className="flex items-center -space-x-1.5 overflow-hidden">
                                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#141810] bg-emerald-600 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                                  CL
                                </div>
                                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#141810] bg-purple-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                                  AI
                                </div>
                              </div>
                              
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(prev => prev === (cl.id || cl._id) ? null : (cl.id || cl._id || null));
                                  }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 text-gray-405 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                
                                {activeMenuId === (cl.id || cl._id) && (
                                  <div 
                                    className="absolute bottom-9 right-0 z-50 bg-white dark:bg-[#1f2917] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl py-1.5 w-32 text-left"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                                      className="w-full px-3.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      Edit
                                    </button>
                                    <div className="my-1 border-t border-gray-100 dark:border-white/5" />
                                    <button
                                      onClick={(e) => handleDeleteCoverLetter(cl.id || cl._id || '', e)}
                                      className="w-full px-3.5 py-1.5 text-xs font-bold text-red-650 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 px-1">
                      {existingCoverLetters.map((cl, index) => (
                        <motion.div
                          key={cl.id || cl._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                          className="group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-[#141810] border border-gray-250 dark:border-white/5 rounded-2xl hover:border-lime-500/30 hover:shadow-lg transition-all duration-300 w-full"
                        >
                          <div className="flex items-center gap-4 flex-grow min-w-0">
                            {/* Mini Thumbnail */}
                            <div className="w-10 h-14 bg-gray-55 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden flex-shrink-0 relative">
                              <LazyThumbnail item={cl} isCoverLetter={true} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-black text-gray-900 dark:text-white truncate group-hover:text-lime-600 dark:group-hover:text-lime-500">
                                {cl.title || 'Untitled Cover Letter'}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                                  Cover Letter
                                </span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                                  Edited {getRelativeTime(cl.updatedAt || cl.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
  
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`);
                              }}
                              className="p-2 bg-gray-100 hover:bg-lime-500 hover:text-black dark:bg-[#1a230f]/60 dark:hover:bg-[#80FF00] dark:hover:text-black text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteCoverLetter(cl.id || cl._id || '', e)}
                              className="p-2 bg-gray-100 hover:bg-red-500 hover:text-white dark:bg-[#1a230f]/60 dark:hover:bg-red-650 dark:hover:text-white text-red-555 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
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
                    onClick={() => {
                      setParseMethod(null);
                      setForcedCvType(null);
                    }}
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
