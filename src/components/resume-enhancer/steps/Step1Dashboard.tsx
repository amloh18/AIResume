'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import { Upload, FileText, Files, Gauge, Edit3, CheckCircle2, Loader2, Briefcase, Sparkles, AlertTriangle, FolderOpen, Edit2, Copy, Plus, Grid, List, LayoutGrid, Trash2, SlidersHorizontal, ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { CVJourneyLookupService } from '@/lib/services/cvJourneyLookupService';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';
import JDInputPanel from '@/components/resume-enhancer/JDInputPanel';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import CVPreviewThumbnail from '@/components/dashboard/CVPreviewThumbnail';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import { getAllTemplates } from '@/lib/templates/template-utils';
import SmartJDModal from '@/components/resume-enhancer/SmartJDModal';
import toast from 'react-hot-toast';
import { CANVAS_TEMPLATES } from '@/components/cv-builder-pro/registry';

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
  _id: string;
  id?: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  cvData: UnifiedCVDataStructure;
  template: {
    id: string;
    zones?: any;
    type?: string;
    thumbnailUrl?: string;
    [key: string]: any;
  };
  status?: string;
  cvType?: 'master' | 'journey' | 'standalone';
  journeyId?: string;
  metadata?: any;
  atsScore?: number;
}

const LazyThumbnail = ({ item, isCoverLetter = false, cvData = null }: { item: any, isCoverLetter?: boolean, cvData?: any }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      if (containerWidth === 0 || containerHeight === 0) return;

      const aspectRatio = 794 / 1123; // A4 aspect ratio
      let renderWidth = containerWidth;
      let renderHeight = containerWidth / aspectRatio;

      if (renderHeight > containerHeight) {
        renderHeight = containerHeight;
        renderWidth = containerHeight * aspectRatio;
      }

      setDimensions({ width: renderWidth, height: renderHeight });
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const templateObj = React.useMemo(() => {
    if (item.template && (item.template.zones || item.template.type)) return item.template;
    
    let idToFind = item.template?.id || item.template?._id || '';
    if (!idToFind && item.cvData?.metadata?.canvasTemplate) {
      const canvasTpl = item.cvData.metadata.canvasTemplate;
      if (canvasTpl.zones || canvasTpl.type) {
        return canvasTpl;
      }
      idToFind = canvasTpl.id || canvasTpl._id || '';
    }
    if (!idToFind && typeof item.templateId === 'string') {
      idToFind = item.templateId;
    } else if (!idToFind && item.templateId && typeof item.templateId === 'object') {
      if (item.templateId.zones || item.templateId.type) {
        return item.templateId;
      }
      idToFind = item.templateId.id || item.templateId._id || '';
    } else if (!idToFind && item.metadata?.templateId) {
      idToFind = item.metadata.templateId;
    }

    if (idToFind) {
      const foundTemplate = CANVAS_TEMPLATES.find(t => t.id === idToFind)
        || getAllTemplates().find(t => t.id === idToFind || t._id === idToFind);
      if (foundTemplate) return foundTemplate;
    }

    return CANVAS_TEMPLATES.find(t => t.id === '1-col') || CANVAS_TEMPLATES[0] || null;
  }, [item.template, item.templateId, item.metadata?.templateId, item.cvData]);

  if (!isCoverLetter && templateObj) {
    return (
      <CVPreviewThumbnail
        cvData={item.cvData || DEFAULT_UNIFIED_CV_DATA}
        template={templateObj}
        className="bg-white pointer-events-none"
      />
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative overflow-hidden bg-white pointer-events-none">
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <div
          className="relative overflow-hidden bg-white shrink-0"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: '794px',
              height: '1123px',
              transform: `scale(${dimensions.width / 794})`,
              transformOrigin: 'top left',
            }}
          >
            <CoverLetterPreview
              content={item.content || item.body || ''}
              cvData={cvData || item.cvData}
              jobData={item.jobData}
              selectedCVData={cvData || item.cvData}
              header={item.header}
              body={item.body}
              footer={item.footer}
            />
          </div>
        </div>
      ) : (
        <div className="w-full h-full p-6 flex flex-col gap-4 bg-white relative overflow-hidden pointer-events-none">
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
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CVPairThumbnail – CV card with spring-physics cover-letter hover reveal
// ─────────────────────────────────────────────────────────────────────────────
interface CVPairThumbnailProps {
  cv: any;
  coverLetters: any[];
  index: number;
  onEditCV: () => void;
  onDeleteCV: (e: React.MouseEvent) => void;
  onEditCoverLetter: (cl: any) => void;
  onDeleteCoverLetter: (cl: any, e: React.MouseEvent) => void;
  getRelativeTime: (dateStr: string) => string;
  getScoreForCV: (cv: any) => number | undefined;
}

const CVPairThumbnail: React.FC<CVPairThumbnailProps> = ({
  cv, coverLetters, index,
  onEditCV, onDeleteCV, onEditCoverLetter, onDeleteCoverLetter,
  getRelativeTime, getScoreForCV,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const hasCoverLetter = coverLetters.length > 0;
  const firstCL = coverLetters[0];

  return (
    <React.Fragment>
      {/* CV Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.05 }}
        onClick={onEditCV}
        className="step-one-document-card group cursor-pointer hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
      >
        <div className="step-one-document-preview relative aspect-[1/1.414] w-full rounded-none overflow-hidden bg-white shadow-md hover:shadow-xl transition-shadow duration-300">
          <LazyThumbnail item={cv} />

          {/* CV type badge */}
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-30">
            <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[6px] sm:text-[7px] font-black uppercase tracking-wider shadow-md ${
              cv.cvType === 'master' ? 'bg-[#0D2C54]/90 text-blue-200' :
              cv.cvType === 'journey' ? 'bg-[#5C3A21]/90 text-amber-200' :
              'bg-[#134074]/90 text-cyan-200'
            }`}>
              {cv.cvType === 'master' ? 'Primary' : cv.cvType === 'journey' ? 'Job Based' : 'Custom'}
            </span>
          </div>

          {/* Edit/Delete hover buttons */}
          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center shadow-lg hover:bg-lime-500 hover:text-black text-white transition-colors duration-200">
              <Edit2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
            </div>
            {cv.cvType !== 'master' && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteCV(e); }}
                className="w-7 h-7 sm:w-9 sm:h-9 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center shadow-lg hover:bg-red-500 text-red-400 hover:text-white transition-colors duration-200"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
              </button>
            )}
          </div>

          {/* Bottom gradient overlay */}
          <div className="step-one-thumbnail-overlay absolute inset-x-0 bottom-0 z-20 px-3 sm:px-4 pt-10 sm:pt-14 pb-3 sm:pb-3.5 text-white">
            <h4 className="text-[11px] sm:text-xs font-semibold text-white truncate tracking-tight drop-shadow-sm leading-snug" title={cv.title || 'Untitled Resume'}>
              {cv.title || 'Untitled Resume'}
            </h4>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-[9px] sm:text-[10px] text-white/60 font-medium flex items-center gap-1">
                <span className="w-1 h-1 bg-[#80FF00] rounded-full shadow-[0_0_6px_rgba(128,255,0,0.6)]" />
                {getRelativeTime(cv.updatedAt || cv.createdAt)}
              </p>
              {getScoreForCV(cv) !== undefined && (
                <span className="text-[9px] sm:text-[10px] font-semibold text-[#80FF00] flex items-center gap-0.5 shrink-0">
                  {getScoreForCV(cv)}% ATS
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Linked Cover Letter Card */}
      {hasCoverLetter && firstCL && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: (index * 0.05) + 0.02 }}
          onClick={() => onEditCoverLetter(firstCL)}
          className="step-one-document-card group cursor-pointer hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
        >
          <div className="step-one-document-preview relative aspect-[1/1.414] w-full rounded-none overflow-hidden bg-white shadow-md hover:shadow-xl transition-shadow duration-300">
            <LazyThumbnail item={firstCL} isCoverLetter={true} cvData={cv.cvData} />

            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-30">
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-wider shadow-md bg-emerald-600 text-white shadow-emerald-500/20">
                Cover Letter (Linked)
              </span>
            </div>

            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center shadow-lg hover:bg-lime-500 hover:text-black text-white transition-colors duration-200">
                <Edit2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteCoverLetter(firstCL, e); }}
                className="w-7 h-7 sm:w-9 sm:h-9 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center shadow-lg hover:bg-red-500 text-red-400 hover:text-white transition-colors duration-200"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>

            <div className="step-one-thumbnail-overlay absolute inset-x-0 bottom-0 z-20 px-3 sm:px-4 pt-10 sm:pt-14 pb-3 sm:pb-3.5 text-white">
              <h4 className="text-[11px] sm:text-xs font-semibold text-white truncate tracking-tight drop-shadow-sm leading-snug" title={firstCL.title || 'Untitled Cover Letter'}>
                {firstCL.title || 'Untitled Cover Letter'}
              </h4>
              <p className="text-[9px] sm:text-[10px] text-white/60 font-medium flex items-center gap-1 mt-1">
                <span className="w-1 h-1 bg-[#80FF00] rounded-full shadow-[0_0_6px_rgba(128,255,0,0.6)]" />
                {getRelativeTime(firstCL.updatedAt || firstCL.createdAt)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </React.Fragment>
  );
};

interface Step1DashboardProps {
  onComplete: (cvData: UnifiedCVDataStructure, isExistingCV?: boolean) => void;
  /** Check if user already has a Master CV */
  userHasMasterCV?: boolean;
  /** Current mode of the enhancer */
  mode?: 'create' | 'edit' | 'edit-master' | 'journey';
  /** CV type being edited */
  cvType?: 'master' | 'standalone' | 'journey';
  /** Whether the user is in guest mode */
  isGuestMode?: boolean;
  /** Controlled document mode shown in the editor header. */
  activeDocumentTab?: 'cvs' | 'cover-letters';
  onDocumentTabChange?: (tab: 'cvs' | 'cover-letters') => void;
}

export default function Step1Dashboard({
  onComplete,
  userHasMasterCV = false,
  mode = 'create',
  cvType,
  isGuestMode = false,
  activeDocumentTab,
  onDocumentTabChange,
}: Step1DashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDesktopExpanded } = useMobileSidebar();
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
  const [viewLayout, setViewLayout] = useState<'grid' | 'list' | 'compact'>('grid');
  const [isDocumentsPanelExpanded, setIsDocumentsPanelExpanded] = useState(false);
  const [cvJourneysMap, setCvJourneysMap] = useState<Map<string, any>>(new Map());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const saved = localStorage.getItem('editor_view_layout');
    if (saved === 'grid' || saved === 'list' || saved === 'compact') {
      setViewLayout(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('editor_view_layout', viewLayout);
  }, [viewLayout]);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const documentsSectionRef = React.useRef<HTMLDivElement>(null);

  const scrollToDocuments = () => {
    documentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Guest';

  const handleDeleteCV = async (cvId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({
      isOpen: true,
      title: 'Delete Resume',
      message: 'Are you sure you want to delete this resume? This action cannot be undone.',
      onConfirm: async () => {
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
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteCoverLetter = async (clId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({
      isOpen: true,
      title: 'Delete Cover Letter',
      message: 'Are you sure you want to delete this cover letter? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/cover-letters/${clId}?userId=${user?.id || ''}`, {
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
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteDraft = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({
      isOpen: true,
      title: 'Delete Draft',
      message: 'Are you sure you want to delete this unsaved draft? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const response = await fetch('/api/cv-draft/delete', { method: 'DELETE' });
          if (response.ok) {
            setDraftCV(null);
            cachedDraftCV = null;
            toast.success('Draft deleted successfully');
          } else {
            throw new Error('Failed to delete draft');
          }
        } catch (err: any) {
          console.error('Failed to delete draft:', err);
          toast.error(err.message || 'Failed to delete draft');
        }
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      }
    });
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

  const getScoreForCV = (cv: any): number | undefined => {
    return cv.metadata?.surgeonAnalysis?.scoreReport?.overall_score
      ?? cv.scoreReport?.overall_score
      ?? (typeof cv.atsScore === 'number' ? cv.atsScore : undefined)
      ?? cv.metadata?.atsScore;
  };
  const cvsWithAts = existingCVs.filter(cv => getScoreForCV(cv) !== undefined);
  const averageATSScore = cvsWithAts.length > 0 
    ? Math.round(cvsWithAts.reduce((sum, cv) => sum + (getScoreForCV(cv) ?? 0), 0) / cvsWithAts.length) 
    : 0;
  const topSectionRef = React.useRef<HTMLDivElement>(null);
  

  
  const [existingCoverLetters, setExistingCoverLetters] = useState<any[]>([]);
  const [isLoadingCoverLetters, setIsLoadingCoverLetters] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState<'cvs' | 'cover-letters'>(searchParams.get('tab') === 'cover-letters' ? 'cover-letters' : 'cvs');
  const activeTab = activeDocumentTab ?? internalActiveTab;
  const setActiveTab = useCallback((tab: 'cvs' | 'cover-letters') => {
    setInternalActiveTab(tab);
    onDocumentTabChange?.(tab);
  }, [onDocumentTabChange]);
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
        const cvIds = cvs.map((c: any) => String(c.id || c._id));
        if (user?.id) {
          CVJourneyLookupService.findJourneysByCVIds(cvIds, user.id).then(map => {
            setCvJourneysMap(map);
          });
        }
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

  const coverLetterMap = React.useMemo(() => {
    const map = new Map<string, any[]>();
    existingCoverLetters.forEach((cl: any) => {
      const rawCvId = cl?.cvId;
      const cvId = rawCvId ? String(rawCvId) : null;
      if (cvId && cvId !== 'undefined' && cvId !== 'null') {
        if (!map.has(cvId)) map.set(cvId, []);
        map.get(cvId)!.push(cl);
      } else if (cl.journeyId && cl.journeyId !== 'undefined' && cl.journeyId !== 'null') {
        // Fallback: Link via journeyId if cvId is missing
        const matchingCv = existingCVs.find(cv => cv.journeyId === cl.journeyId || cv.metadata?.journeyId === cl.journeyId);
        if (matchingCv) {
          const cvIdStr = String(matchingCv.id || matchingCv._id);
          if (!map.has(cvIdStr)) map.set(cvIdStr, []);
          map.get(cvIdStr)!.push(cl);
        }
      }
    });
    return map;
  }, [existingCoverLetters, existingCVs]);

  const orphanedCoverLetters = React.useMemo(() => {
    const pairedCvIds = new Set<string>();
    filteredCVs.forEach(cv => {
      const cvId = String(cv.id || cv._id);
      if (coverLetterMap.has(cvId)) pairedCvIds.add(cvId);
    });
    return existingCoverLetters.filter((cl: any) => {
      const rawCvId = cl?.cvId;
      const cvId = rawCvId ? String(rawCvId) : null;
      
      if (cvId && pairedCvIds.has(cvId)) return false;
      
      // Check if it was mapped via journeyId
      if (cl.journeyId) {
        const matchingCv = filteredCVs.find(cv => cv.journeyId === cl.journeyId || cv.metadata?.journeyId === cl.journeyId);
        if (matchingCv) {
          const matchingCvId = String(matchingCv.id || matchingCv._id);
          if (pairedCvIds.has(matchingCvId)) return false;
        }
      }
      return true;
    });
  }, [filteredCVs, existingCoverLetters, coverLetterMap]);

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
      
      // Navigate to step 2 (template selection) — include fresher=true so the
      // re-mounted container knows to set fresherMode before the step-2 data guard runs
      router.push('/editor?mode=create&step=2&fresher=true');
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
          className="step-one-shell flex flex-col h-full overflow-y-auto custom-scrollbar bg-[var(--bg-primary)] scroll-smooth"
          onScroll={handleScroll}
        >


        {/* Top Section */}
        <div ref={topSectionRef} className="step-one-hero relative z-10 w-full flex flex-col min-h-[30vh] pt-6 sm:pt-8 pb-4 sm:pb-6">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-8">
            <div
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 mb-5 sm:mb-7 origin-bottom w-full px-1 lg:relative"
            >
              {/* Breadcrumb instead of welcome text */}
              <div className="flex items-center gap-1.5 text-base text-gray-500 dark:text-gray-400 font-medium py-2">
                <span 
                  onClick={() => router.push('/dashboard')}
                  className="hover:text-lime-600 dark:hover:text-lime-400 cursor-pointer transition-colors"
                >
                  Dashboard
                </span>
                <ChevronRight className="h-4 w-4 text-gray-450 dark:text-gray-500" />
                <span className="text-gray-800 dark:text-gray-200 font-bold">
                  {activeTab === 'cvs' ? 'Editor' : 'Cover Letters'}
                 </span>
</div>

                {activeDocumentTab && onDocumentTabChange && (
                  <div
                    className="flex justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2"
                    role="tablist"
                    aria-label="Document type"
                  >
                   <div className="relative grid grid-cols-2 w-full max-w-[330px] sm:w-[310px] rounded-full p-1 bg-[var(--bg-tertiary)] border border-[color:var(--border-primary)] shadow-inner">
                     <motion.div
                       className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-[var(--accent-primary)] shadow-[0_5px_18px_rgba(132,204,22,0.22)]"
                       animate={{ x: (activeDocumentTab ?? 'cvs') === 'cvs' ? 0 : '100%' }}
                       transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                     />
                     {([
                       ['cvs', 'RESUME'],
                       ['cover-letters', 'COVER LETTER'],
                     ] as const).map(([tab, label]) => (
                       <button
                         key={tab}
                         role="tab"
                         aria-selected={activeDocumentTab === tab}
                         onClick={() => onDocumentTabChange(tab)}
                          className={`relative z-10 min-h-9 px-3 rounded-full text-[10px] sm:text-[11px] font-black tracking-[0.13em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] ${
                            activeDocumentTab === tab ? 'text-black' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                          }`}
                       >
                         {label}
                       </button>
                     ))}
                   </div>
                 </div>
               )}

{/* Stats Widgets */}
                <div className="flex items-center justify-start lg:justify-end gap-6 sm:gap-8 shrink-0 lg:ml-auto w-full lg:w-auto">
                 <button
                   type="button"
                   onClick={() => {
                     setActiveTab('cvs');
                     setTimeout(scrollToDocuments, 100);
                   }}
                   aria-label={`Show ${existingCVs.length} resumes`}
                   className="flex flex-col items-start gap-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] hover:opacity-80 transition-opacity"
                 >
                   <span className="text-xl font-black text-gray-900 dark:text-white">{existingCVs.length}</span>
                   <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Resumes</span>
                 </button>

                 <button
                   type="button"
                   onClick={() => {
                     setActiveTab('cover-letters');
                     setTimeout(scrollToDocuments, 100);
                   }}
                   aria-label={`Show ${existingCoverLetters.length} cover letters`}
                   className="flex flex-col items-start gap-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] hover:opacity-80 transition-opacity"
                 >
                   <span className="text-xl font-black text-gray-900 dark:text-white">{existingCoverLetters.length}</span>
                   <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Cover Letters</span>
                 </button>

                 <div className="flex flex-col items-start gap-0.5 text-left">
                   <span className="text-xl font-black text-gray-900 dark:text-white">
                     {averageATSScore}%
                   </span>
                   <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Avg. ATS Score</span>
                 </div>
               </div>
            </div>

{/* Action Cards Grid - horizontal scroll on mobile, grid on sm+ */}
            <div className="w-full relative overflow-visible h-[180px] sm:h-[200px] mb-6 sm:mb-8">
              <div
                className="relative z-20 flex sm:grid gap-3 sm:gap-4 origin-top sm:grid-cols-2 lg:grid-cols-3 w-full overflow-x-auto sm:overflow-visible py-3 -my-3 h-full snap-x snap-mandatory sm:snap-none scroll-pl-4 -mx-4 px-4 sm:mx-0 sm:px-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
              {activeTab === 'cvs' ? (
                <>
                  {/* Resume Cards */}
                <motion.button
                  whileHover={{ y: -5, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleManualEntry()}
                  disabled={isCreatingBlank || isDuplicating || isLoadingCVs}
                  className={`step-one-action step-one-action-primary snap-start shrink-0 w-[72vw] sm:w-auto group relative rounded-xl sm:rounded-2xl p-5 sm:p-6 h-[156px] sm:h-[176px] border border-dashed overflow-hidden text-left flex flex-col items-center justify-center text-center ${(isCreatingBlank || isDuplicating || isLoadingCVs) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  whileHover={{ y: -5, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDuplicatePrimary}
                  disabled={!userHasMasterCV || isDuplicating || isLoadingCVs}
                  className={`step-one-action snap-start shrink-0 w-[72vw] sm:w-auto group relative rounded-xl sm:rounded-2xl p-5 sm:p-6 h-[156px] sm:h-[176px] overflow-hidden text-left flex flex-col items-center justify-center text-center ${(!userHasMasterCV || isDuplicating || isLoadingCVs) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  whileHover={{ y: -5, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setForcedCvType('standalone');
                    setParseMethod('upload');
                  }}
                  disabled={isCreatingBlank || isDuplicating || isLoadingCVs}
                  className={`step-one-action snap-start shrink-0 w-[72vw] sm:w-auto group relative rounded-xl sm:rounded-2xl p-5 sm:p-6 h-[156px] sm:h-[176px] overflow-hidden text-left flex flex-col items-center justify-center text-center ${(isCreatingBlank || isDuplicating || isLoadingCVs) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  whileHover={{ y: -5, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartWithJob}
                  className="step-one-action step-one-action-primary snap-start shrink-0 w-[72vw] sm:w-auto group relative rounded-xl sm:rounded-2xl p-5 sm:p-6 h-[156px] sm:h-[176px] border border-dashed overflow-hidden text-left flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-lime-500/10 border border-lime-500/30 text-lime-550 dark:bg-[#80FF00]/10 dark:border-[#80FF00]/20 dark:text-[#80FF00] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-500">
                      <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">Write with AI</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Generate a tailored letter <br className="hidden xs:block" />
                        from a job description.
                      </p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ y: -5, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/editor?mode=create-cover-letter&step=4')}
                  className="step-one-action snap-start shrink-0 w-[72vw] sm:w-auto group relative rounded-xl sm:rounded-2xl p-5 sm:p-6 h-[156px] sm:h-[176px] overflow-hidden text-left flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-lime-500/10 border border-lime-500/30 text-lime-550 dark:bg-[#80FF00]/10 dark:border-[#80FF00]/20 dark:text-[#80FF00] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-500">
                      <Edit3 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">Start Fresh</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Pick a template and <br className="hidden xs:block" />
                        write your own story.
                      </p>
                    </div>
                  </div>
                </motion.button>

              </>
            )}
          </div>
        </div>



          </div>
        </div>

        {/* Continue Editing Section (Integrated inline on page) */}
        {!isGuestMode && (
          <div 
            ref={documentsSectionRef}
            className="w-full mt-4 border-t border-[color:var(--border-primary)] pt-4 pb-24 px-4 sm:px-8 no-print"
          >
            <div className="w-full max-w-7xl mx-auto">
              <div className="step-one-documents-header flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5 pb-5 border-b border-[color:var(--border-primary)] pt-0">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-[color:var(--text-primary)] tracking-tight text-left">Your Documents</h2>
                    <p className="text-xs sm:text-sm text-[color:var(--text-secondary)] mt-1.5">All your resumes and cover letters in one place.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <label className="relative flex items-center h-10 min-w-[142px] rounded-full border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-[#141810] text-[color:var(--text-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/50 transition-all">
                      <SlidersHorizontal className="absolute left-3.5 w-3.5 h-3.5 text-[color:var(--text-secondary)] pointer-events-none" />
                      <span className="sr-only">Filter documents</span>
                      <select
                        value={filterType}
                        onChange={(event) => setFilterType(event.target.value as typeof filterType)}
                        className="w-full h-full appearance-none bg-transparent pl-9 pr-8 text-xs font-bold outline-none cursor-pointer"
                        aria-label="Filter documents"
                      >
                        <option value="all">Recent</option>
                        <option value="master">Primary</option>
                        <option value="journey">Job Based</option>
                        <option value="standalone">Custom</option>
                        <option value="archived">Archived</option>
                      </select>
                      <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-[color:var(--text-secondary)] pointer-events-none" />
                    </label>

                    {/* Grid / List Layout Switcher */}
                    <div className="flex items-center bg-gray-100 dark:bg-[#141810] p-1 rounded-full border border-gray-200 dark:border-white/5 w-fit h-10">
                      <button
                        onClick={() => setViewLayout('grid')}
                        className={`flex items-center gap-1 px-4 h-full rounded-full text-xs font-bold transition-all ${
                          viewLayout === 'grid'
                            ? 'bg-lime-500 text-black dark:bg-[#0d100a] dark:text-[#80FF00] dark:border dark:border-[#80FF00]/25 shadow-md'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        Grid
                      </button>
                      <button
                        onClick={() => setViewLayout('compact')}
                        className={`flex items-center gap-1 px-4 h-full rounded-full text-xs font-bold transition-all ${
                          viewLayout === 'compact'
                            ? 'bg-lime-500 text-black dark:bg-[#0d100a] dark:text-[#80FF00] dark:border dark:border-[#80FF00]/25 shadow-md'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Compact
                      </button>
                      <button
                        onClick={() => setViewLayout('list')}
                        className={`flex items-center gap-1 px-4 h-full rounded-full text-xs font-bold transition-all ${
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

              {isLoadingCVs ? (
                <div className={viewLayout === 'compact' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2" : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5"}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="relative">
                      {/* Image block matches aspect ratio of real CVPairThumbnail */}
                      <div className="w-full aspect-[1/1.414] bg-gray-100 dark:bg-white/5 rounded-none animate-pulse border border-gray-200 dark:border-white/5 overflow-hidden">
                        {/* Overlay text shimmer inside the image — matching real card structure */}
                        <div className="absolute inset-x-0 bottom-0 px-3 pt-10 pb-3 bg-gradient-to-t from-gray-300/60 dark:from-white/10 to-transparent">
                          <div className="h-2.5 w-3/4 bg-gray-300 dark:bg-white/10 rounded animate-pulse mb-1.5" />
                          <div className="h-2 w-1/2 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (filteredCVs.length > 0 || draftCV || orphanedCoverLetters.length > 0) ? (
                viewLayout !== 'list' ? (
                  <div className={viewLayout === 'compact' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 px-1" : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 px-1"}>
                  
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
                      className="group cursor-pointer flex flex-col justify-between hover:scale-[1.01] transition-all duration-300 relative overflow-visible"
                    >
                      <div className="relative aspect-[1/1.414] w-full rounded-none overflow-hidden bg-orange-50 dark:bg-orange-950/20 border border-dashed border-orange-350 dark:border-orange-500/30 flex flex-col items-center justify-center shadow-md hover:shadow-xl transition-shadow duration-300">
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
                          onClick={(e) => handleDeleteDraft(e)}
                        >
                          <Trash2 className="text-white w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      </div>
  
                      <div className="mt-2.5 flex flex-col justify-between flex-grow">
                         <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-650 dark:group-hover:text-orange-550 transition-colors tracking-tight" title={draftCV.cvTitle || 'Unfinished Resume'}>
                           {draftCV.cvTitle || 'Unfinished Resume'}
                         </h4>
                         <p className="text-[10px] sm:text-xs text-gray-550 dark:text-gray-400 font-bold flex items-center gap-1.5 sm:gap-2 mt-1">
                           <span className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                           Edited {new Date(draftCV.lastSaved || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                         </p>
                      </div>
                    </motion.div>
                  )}
  
                   {filteredCVs.map((cv, index) => {
                     const cvCoverLetters = coverLetterMap.get(String(cv.id || cv._id)) || [];
                     return (
                       <CVPairThumbnail
                         key={cv.id || cv._id}
                         cv={cv}
                         coverLetters={cvCoverLetters}
                         index={index}
                         onEditCV={() => handleEditExistingCV(cv)}
                         onDeleteCV={(e) => { e.stopPropagation(); handleDeleteCV(cv.id || cv._id || '', e); }}
                         onEditCoverLetter={(cl) => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                         onDeleteCoverLetter={(cl, e) => { e.stopPropagation(); handleDeleteCoverLetter(cl.id || cl._id || '', e); }}
                         getRelativeTime={getRelativeTime}
                         getScoreForCV={getScoreForCV}
                       />
                     );
                   })}
                   {orphanedCoverLetters.map((cl: any) => (
                     <motion.div
                       key={cl.id || cl._id}
                       initial={{ opacity: 0, scale: 0.9, y: 20 }}
                       whileInView={{ opacity: 1, scale: 1, y: 0 }}
                       viewport={{ once: true }}
                       onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                       className="step-one-document-card group cursor-pointer hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
                     >
                       <div className="step-one-document-preview relative aspect-[1/1.414] w-full rounded-none overflow-hidden bg-white shadow-md hover:shadow-xl transition-shadow duration-300">
                         <LazyThumbnail item={cl} isCoverLetter={true} />

                         <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-30">
                           <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-wider shadow-md bg-emerald-600 text-white shadow-emerald-500/20">
                             Cover Letter
                           </span>
                         </div>

                         <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                           <div className="w-7 h-7 sm:w-9 sm:h-9 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center shadow-lg hover:bg-lime-500 hover:text-black text-white transition-colors duration-200">
                             <Edit2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                           </div>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               handleDeleteCoverLetter(cl.id || cl._id || '', e);
                             }}
                             className="w-7 h-7 sm:w-9 sm:h-9 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center shadow-lg hover:bg-red-500 text-red-400 hover:text-white transition-colors duration-200"
                             title="Delete"
                           >
                             <Trash2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                           </button>
                         </div>

                         <div className="step-one-thumbnail-overlay absolute inset-x-0 bottom-0 z-20 px-3 sm:px-4 pt-10 sm:pt-14 pb-3 sm:pb-3.5 text-white">
                           <h4 className="text-[11px] sm:text-xs font-semibold text-white truncate tracking-tight drop-shadow-sm leading-snug" title={cl.title || 'Untitled Cover Letter'}>
                             {cl.title || 'Untitled Cover Letter'}
                           </h4>
                           <p className="text-[9px] sm:text-[10px] text-white/60 font-medium flex items-center gap-1 mt-1">
                             <span className="w-1 h-1 bg-[#80FF00] rounded-full shadow-[0_0_6px_rgba(128,255,0,0.6)]" />
                             {getRelativeTime(cl.updatedAt || cl.createdAt)}
                           </p>
                         </div>
                       </div>
                     </motion.div>
                   ))}
                </div>
                ) : (
                  <div className="bg-white dark:bg-[#0d100a] rounded-2xl border border-gray-250 dark:border-white/5 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-250 dark:border-white/5 bg-gray-50 dark:bg-black/25">
                            <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-wider">Type</th>
                            <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-wider">Document Name</th>
                            <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-wider">Company</th>
                            <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-wider">Profile</th>
                            <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-wider">Last Modified</th>
                            <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-wider">Score</th>
                            <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draftCV && filterType === 'all' && (
                            <tr className="border-b border-gray-200 dark:border-white/5 bg-orange-50/20 dark:bg-orange-950/10">
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-orange-500 text-white">
                                  Unsaved Draft
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span 
                                  onClick={() => {
                                    if (draftCV) {
                                      if (draftCV.cvData) dispatch({ type: 'SET_CV_DATA', payload: draftCV.cvData });
                                      if (draftCV.template) {
                                        dispatch({ type: 'SET_TEMPLATE', payload: draftCV.template });
                                        dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: draftCV.template });
                                      }
                                      if (draftCV.cvTitle) dispatch({ type: 'SET_CV_TITLE', payload: draftCV.cvTitle });
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
                                  className="font-black text-gray-900 dark:text-white hover:text-orange-650 dark:hover:text-orange-400 cursor-pointer text-sm"
                                >
                                  {draftCV.cvTitle || 'Unfinished Resume'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                {draftCV.targetCompany || '—'}
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-bold">
                                {draftCV.targetRole || 'In-progress Resume'}
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                Edited {new Date(draftCV.lastSaved || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-400">—</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={(e) => handleDeleteDraft(e)}
                                    className="p-2 bg-gray-155 hover:bg-red-500 hover:text-white dark:bg-[#1a230f]/60 dark:hover:bg-red-650 dark:hover:text-white text-red-500 dark:text-red-400 rounded-lg transition-all"
                                    title="Delete Draft"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {filteredCVs.map((cv) => {
                            const cvCoverLetters = coverLetterMap.get(String(cv.id || cv._id)) || [];
                            return (
                              <React.Fragment key={cv.id || cv._id}>
                                <tr className="border-b border-gray-250 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                      cv.cvType === 'master' ? 'bg-purple-600 text-white' : cv.cvType === 'journey' ? 'bg-lime-500 text-black dark:bg-[#80FF00]/10 dark:text-[#80FF00]' : 'bg-blue-600 text-white'
                                    }`}>
                                      {cv.cvType === 'master' ? 'Primary' : cv.cvType === 'journey' ? 'Job Based' : 'Custom'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span 
                                      onClick={() => handleEditExistingCV(cv)}
                                      className="font-black text-gray-900 dark:text-white hover:text-lime-650 dark:hover:text-lime-500 cursor-pointer text-sm"
                                    >
                                      {cv.title || 'Untitled CV'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                    {cvJourneysMap.get(String(cv.id || cv._id))?.company || cv.cvData?.work?.[0]?.name || '—'}
                                  </td>
                                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-bold">
                                    {cvJourneysMap.get(String(cv.id || cv._id))?.jobTitle || cv.cvData?.basics?.label || cv.cvData?.work?.[0]?.position || 'No Role Context'}
                                  </td>
                                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                    Edited {getRelativeTime(cv.updatedAt || cv.createdAt)}
                                  </td>
                                  <td className="px-6 py-4">
                                    {(typeof cv.atsScore === 'number' || (cv as any).metadata?.atsScore !== undefined) ? (
                                      <span className="text-xs font-black text-lime-600 dark:text-[#80FF00] bg-lime-500/10 dark:bg-[#80FF00]/10 px-2.5 py-0.5 rounded-full">
                                        {cv.atsScore ?? (cv as any).metadata?.atsScore}%
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleEditExistingCV(cv)}
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
                                      {cv.cvType !== 'master' && (
                                        <button
                                          onClick={(e) => handleDeleteCV(cv.id || cv._id || '', e)}
                                          className="p-2 bg-gray-100 hover:bg-red-500 hover:text-white dark:bg-[#1a230f]/60 dark:hover:bg-red-650 dark:hover:text-white text-red-500 dark:text-red-400 rounded-lg transition-all"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {cvCoverLetters.map((cl) => (
                                  <tr key={cl.id || cl._id} className="border-b border-gray-200 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01]">
                                    <td className="px-6 py-3 pl-10">
                                      <div className="flex items-center gap-1.5">
                                        <CornerDownRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                                          Letter
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <span 
                                        onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                                        className="font-bold text-gray-700 dark:text-gray-300 hover:text-emerald-500 cursor-pointer text-xs"
                                      >
                                        {cl.title || 'Untitled Cover Letter'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3 text-xs text-gray-400 font-semibold">—</td>
                                    <td className="px-6 py-3 text-xs text-gray-400 font-semibold">—</td>
                                    <td className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                      Edited {getRelativeTime(cl.updatedAt || cl.createdAt)}
                                    </td>
                                    <td className="px-6 py-3 text-xs text-gray-400">—</td>
                                    <td className="px-6 py-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                                          className="p-1.5 bg-gray-100 hover:bg-lime-500 hover:text-black dark:bg-[#1a230f]/60 dark:hover:bg-[#80FF00] dark:hover:text-black text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                                          title="Edit Cover Letter"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => handleDeleteCoverLetter(cl.id || cl._id || '', e)}
                                          className="p-1.5 bg-gray-100 hover:bg-red-500 hover:text-white dark:bg-[#1a230f]/60 dark:hover:bg-[#80FF00] dark:hover:text-black text-red-500 dark:text-red-400 rounded-lg transition-all"
                                          title="Delete Cover Letter"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}

                          {orphanedCoverLetters.map((cl) => (
                            <tr key={cl.id || cl._id} className="border-b border-gray-250 dark:border-white/5 hover:bg-gray-50/55 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                                  Letter
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span 
                                  onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                                  className="font-black text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-500 cursor-pointer text-sm"
                                >
                                  {cl.title || 'Untitled Cover Letter'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-400 font-semibold">—</td>
                              <td className="px-6 py-4 text-xs text-gray-400 font-semibold">—</td>
                              <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                Edited {getRelativeTime(cl.updatedAt || cl.createdAt)}
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-400">—</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                                    className="p-2 bg-gray-100 hover:bg-lime-500 hover:text-black dark:bg-[#1a230f]/60 dark:hover:bg-[#80FF00] dark:hover:text-black text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                                    title="Edit Cover Letter"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteCoverLetter(cl.id || cl._id || '', e)}
                                    className="p-2 bg-gray-150 hover:bg-red-500 hover:text-white dark:bg-[#1a230f]/60 dark:hover:bg-[#80FF00] dark:hover:text-black text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                                    title="Delete Cover Letter"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )

              ) : (
                <div className="text-center py-16 sm:py-32 bg-black/5 dark:bg-white/[0.02] rounded-2xl sm:rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/10 mx-1">
                  <FolderOpen className="w-12 h-12 sm:w-20 sm:h-20 text-gray-200 dark:text-gray-800 mx-auto mb-6 sm:mb-8 animate-bounce transition-all duration-1000" />
                  <h4 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">No Documents</h4>
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 font-medium max-w-xs mx-auto px-4">
                    Build your first high-performance resume or cover letter using the options above.
                  </p>
                </div>
              )}

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

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-2xl z-10"
            >
              <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                {deleteConfirmation.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6">
                {deleteConfirmation.message}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteConfirmation.onConfirm}
                  className="px-5 py-2 text-xs sm:text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
