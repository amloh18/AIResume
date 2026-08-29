'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import { Upload, FileText, Files, Gauge, Edit3, CheckCircle2, Loader2, Briefcase, Sparkles, AlertTriangle, FolderOpen, Edit2, Copy, Plus, Grid, List, LayoutGrid, Trash2, SlidersHorizontal, ChevronDown, ChevronRight, CornerDownRight, Target, X, Clock, ArrowRight, Eye, PenLine, Award, Zap } from 'lucide-react';
import { CVJourneyLookupService } from '@/lib/services/cvJourneyLookupService';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';
import JDInputPanel from '@/components/resume-enhancer/JDInputPanel';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { getCvScoreForDisplay } from '@/lib/utils/cv-scoring';
import CVPreviewThumbnail from '@/components/dashboard/CVPreviewThumbnail';
import CVPreviewDocument from '@/components/cv-preview/CVPreviewDocument';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import DocumentPreviewSidebar from '@/components/dashboard/jobs/DocumentPreviewSidebar';
import { getAllTemplates } from '@/lib/templates/template-utils';
import SmartJDModal from '@/components/resume-enhancer/SmartJDModal';
import toast from 'react-hot-toast';
import { CANVAS_TEMPLATES } from '@/components/cv-builder-pro/registry';
import { Button, IconButton, TableActionGroup } from '@/components/ui';

// Global cache to prevent refetching when navigating between steps
let cachedExistingCVs: ExistingCV[] | null = null;
let cachedExistingCoverLetters: any[] | null = null;
let cachedDraftCV: any | null = null;
let lastFetchTime = 0;
let cacheUserId: string | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const invalidateStep1Cache = () => { 
  lastFetchTime = 0; 
  cacheUserId = null;
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
// CVPairThumbnail – Clean modern glassmorphism card design with bottom action icons
// ─────────────────────────────────────────────────────────────────────────────
interface CVPairThumbnailProps {
  cv: any;
  coverLetters: any[];
  index: number;
  compact?: boolean;
  onEditCV: () => void;
  onDeleteCV: (e: React.MouseEvent) => void;
  onPreviewCV: (cv: any) => void;
  onRenameCV: (cv: any) => void;
  onEditCoverLetter: (cl: any) => void;
  onDeleteCoverLetter: (cl: any, e: React.MouseEvent) => void;
  onPreviewCoverLetter: (cl: any) => void;
  onRenameCoverLetter: (cl: any) => void;
  getRelativeTime: (dateStr: string) => string;
  getScoreForCV: (cv: any) => number | undefined;
}

const CVPairThumbnail: React.FC<CVPairThumbnailProps> = ({
  cv, coverLetters, index, compact = false,
  onEditCV, onDeleteCV, onPreviewCV, onRenameCV,
  onEditCoverLetter, onDeleteCoverLetter, onPreviewCoverLetter, onRenameCoverLetter,
  getRelativeTime, getScoreForCV,
}) => {
  const hasCoverLetter = coverLetters.length > 0;
  const firstCL = coverLetters[0];
  const score = getScoreForCV(cv);

  return (
    <React.Fragment>
      {/* CV Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.05 }}
        className="step-one-document-card group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-md hover:shadow-2xl transition-all duration-300 bg-white dark:bg-[#141810]"
      >
        <div className="relative aspect-[1/1.414] w-full overflow-hidden">
          {/* Document Preview Thumbnail */}
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
            <LazyThumbnail item={cv} />
          </div>

          {/* Soft Diluting Glass Blur Backdrop */}
          <div
            className="absolute inset-x-0 bottom-0 h-44 sm:h-52 pointer-events-none z-10 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-[#0d100a] dark:via-[#0d100a]/90 dark:to-transparent backdrop-blur-[8px]"
            style={{
              maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
            }}
          />

          {/* Bottom Content Area */}
          <div className="absolute inset-x-0 bottom-0 z-20 px-3.5 sm:px-4.5 pb-3 sm:pb-3.5 flex flex-col justify-end">
            {/* Title + Rename Button */}
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <h4
                className={`font-black text-gray-950 dark:text-white tracking-tight leading-tight truncate ${
                  compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                }`}
                title={cv.title || 'Untitled Resume'}
              >
                {cv.title || 'Untitled Resume'}
              </h4>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameCV(cv);
                }}
                className="p-1 -mr-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                title="Rename Resume"
                aria-label="Rename Resume"
              >
                <PenLine className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
              </button>
            </div>

            {/* Subtitle / Role */}
            <p className={`font-semibold text-gray-600 dark:text-gray-300 line-clamp-1 mt-0.5 ${compact ? 'text-[9px] sm:text-[10px] mb-1' : 'text-[10px] sm:text-xs mb-1.5'}`}>
              {cv.targetRole || (cv.cvType === 'master' ? 'Primary Profile' : 'Resume')}
            </p>

            {/* Metadata Row: Date & ATS Score */}
            <div className={`flex items-center gap-2.5 sm:gap-3 font-semibold text-gray-500 dark:text-gray-400 ${compact ? 'text-[8px] sm:text-[9px] mb-1.5' : 'text-[9px] sm:text-xs mb-2'}`}>
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-400" />
                {getRelativeTime(cv.updatedAt || cv.createdAt)}
              </span>
              {score !== undefined && (
                <span className="flex items-center gap-1 text-lime-600 dark:text-lime-400 font-bold shrink-0">
                  <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-lime-600 dark:text-lime-400" />
                  {score}% ATS
                </span>
              )}
            </div>

            {/* Bottom Action Icon Buttons (Edit, Preview, Delete) */}
            <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5 border-t border-gray-200/80 dark:border-white/10">
              {/* Edit */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCV();
                }}
                className={`flex-1 rounded-xl bg-gray-100 hover:bg-lime-500 hover:text-white dark:bg-white/10 dark:hover:bg-lime-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                  compact ? 'py-1.5' : 'py-2 sm:py-2.5'
                }`}
                title="Edit Resume"
                aria-label="Edit Resume"
              >
                <Edit3 className={compact ? "w-3 h-3" : "w-4 h-4"} />
              </button>

              {/* Preview */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewCV(cv);
                }}
                className={`flex-1 rounded-xl bg-gray-100 hover:bg-blue-500 hover:text-white dark:bg-white/10 dark:hover:bg-blue-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                  compact ? 'py-1.5' : 'py-2 sm:py-2.5'
                }`}
                title="Preview Resume"
                aria-label="Preview Resume"
              >
                <Eye className={compact ? "w-3 h-3" : "w-4 h-4"} />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCV(e);
                }}
                className={`flex-1 rounded-xl bg-gray-100 hover:bg-red-500 hover:text-white dark:bg-white/10 dark:hover:bg-red-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                  compact ? 'py-1.5' : 'py-2 sm:py-2.5'
                }`}
                title="Delete Resume"
                aria-label="Delete Resume"
              >
                <Trash2 className={compact ? "w-3 h-3" : "w-4 h-4"} />
              </button>
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
          className="step-one-document-card group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-md hover:shadow-2xl transition-all duration-300 bg-white dark:bg-[#141810]"
        >
          <div className="relative aspect-[1/1.414] w-full overflow-hidden">
            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
              <LazyThumbnail item={firstCL} isCoverLetter={true} cvData={cv.cvData} />
            </div>

            {/* Soft Diluting Glass Blur Backdrop */}
            <div
              className="absolute inset-x-0 bottom-0 h-44 sm:h-52 pointer-events-none z-10 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-[#0d100a] dark:via-[#0d100a]/90 dark:to-transparent backdrop-blur-[8px]"
              style={{
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
              }}
            />

            {/* Bottom Content Area */}
            <div className="absolute inset-x-0 bottom-0 z-20 px-3.5 sm:px-4.5 pb-3 sm:pb-3.5 flex flex-col justify-end">
              {/* Title + Rename Button */}
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <h4
                  className={`font-black text-gray-950 dark:text-white tracking-tight leading-tight truncate ${
                    compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                  }`}
                  title={firstCL.title || 'Untitled Cover Letter'}
                >
                  {firstCL.title || 'Untitled Cover Letter'}
                </h4>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameCoverLetter(firstCL);
                  }}
                  className="p-1 -mr-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                  title="Rename Cover Letter"
                  aria-label="Rename Cover Letter"
                >
                  <PenLine className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
                </button>
              </div>

              <p className={`font-semibold text-gray-600 dark:text-gray-300 line-clamp-1 mt-0.5 ${compact ? 'text-[9px] sm:text-[10px] mb-1' : 'text-[10px] sm:text-xs mb-1.5'}`}>
                {firstCL.targetRole || 'Job Application Cover Letter'}
              </p>

              <div className={`flex items-center gap-2.5 sm:gap-3 font-semibold text-gray-500 dark:text-gray-400 ${compact ? 'text-[8px] sm:text-[9px] mb-1.5' : 'text-[9px] sm:text-xs mb-2'}`}>
                <span className="flex items-center gap-1 shrink-0">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-400" />
                  {getRelativeTime(firstCL.updatedAt || firstCL.createdAt)}
                </span>
              </div>

              {/* Bottom Action Icon Buttons (Edit, Preview, Delete) */}
              <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5 border-t border-gray-200/80 dark:border-white/10">
                {/* Edit */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCoverLetter(firstCL);
                  }}
                  className={`flex-1 rounded-xl bg-gray-100 hover:bg-lime-500 hover:text-white dark:bg-white/10 dark:hover:bg-lime-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                    compact ? 'py-1.5' : 'py-2 sm:py-2.5'
                  }`}
                  title="Edit Cover Letter"
                  aria-label="Edit Cover Letter"
                >
                  <Edit3 className={compact ? "w-3 h-3" : "w-4 h-4"} />
                </button>

                {/* Preview */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewCoverLetter(firstCL);
                  }}
                  className={`flex-1 rounded-xl bg-gray-100 hover:bg-blue-500 hover:text-white dark:bg-white/10 dark:hover:bg-blue-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                    compact ? 'py-1.5' : 'py-2 sm:py-2.5'
                  }`}
                  title="Preview Cover Letter"
                  aria-label="Preview Cover Letter"
                >
                  <Eye className={compact ? "w-3 h-3" : "w-4 h-4"} />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCoverLetter(firstCL, e);
                  }}
                  className={`flex-1 rounded-xl bg-gray-100 hover:bg-red-500 hover:text-white dark:bg-white/10 dark:hover:bg-red-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                    compact ? 'py-1.5' : 'py-2 sm:py-2.5'
                  }`}
                  title="Delete Cover Letter"
                  aria-label="Delete Cover Letter"
                >
                  <Trash2 className={compact ? "w-3 h-3" : "w-4 h-4"} />
                </button>
              </div>
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
  const [cvJourneysMap, setCvJourneysMap] = useState<Map<string, any>>(new Map());

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

  const firstName = user?.name ? user.name.split(' ')[0] : 'Guest';

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

  const getScoreForCV = getCvScoreForDisplay;
  const cvsWithAts = existingCVs.filter(cv => getScoreForCV(cv) !== undefined);
  const averageATSScore = cvsWithAts.length > 0 
    ? Math.round(cvsWithAts.reduce((sum, cv) => sum + (getScoreForCV(cv) ?? 0), 0) / cvsWithAts.length) 
    : 0;
  const topSectionRef = React.useRef<HTMLDivElement>(null);
  const pendingTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  React.useEffect(() => {
    return () => {
      pendingTimersRef.current.forEach(t => clearTimeout(t));
      pendingTimersRef.current = [];
    };
  }, []);

  const scheduleTimer = (fn: () => void, ms: number) => {
    const timer = setTimeout(fn, ms);
    pendingTimersRef.current.push(timer);
    return timer;
  };
  

  
  const [existingCoverLetters, setExistingCoverLetters] = useState<any[]>([]);
  const [isLoadingCoverLetters, setIsLoadingCoverLetters] = useState(false);
  const [smartJDMode, setSmartJDMode] = useState<'cv' | 'cover-letter'>('cover-letter');
  const [internalActiveTab, setInternalActiveTab] = useState<'cvs' | 'cover-letters'>(searchParams.get('tab') === 'cover-letters' ? 'cover-letters' : 'cvs');
  const activeTab = activeDocumentTab ?? internalActiveTab;
  const setActiveTab = useCallback((tab: 'cvs' | 'cover-letters') => {
    setInternalActiveTab(tab);
    onDocumentTabChange?.(tab);
  }, [onDocumentTabChange]);

  const kpiStats = React.useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const cvsThisWeek = existingCVs.filter((c) => {
      const t = new Date(c.createdAt || c.updatedAt).getTime();
      return !isNaN(t) && now - t < weekMs;
    }).length;

    const coverLettersThisWeek = existingCoverLetters.filter((cl) => {
      const t = new Date(cl.createdAt || cl.updatedAt).getTime();
      return !isNaN(t) && now - t < weekMs;
    }).length;

    const scoredCVs = existingCVs.filter(cv => getScoreForCV(cv) !== undefined);
    const avgAts = scoredCVs.length > 0 
      ? Math.round(scoredCVs.reduce((sum, cv) => sum + (getScoreForCV(cv) ?? 0), 0) / scoredCVs.length) 
      : 0;
    const strongAts = scoredCVs.filter(cv => (getScoreForCV(cv) ?? 0) >= 70).length;
    const journeyCount = existingCVs.filter(c => c.cvType === 'journey').length;

    return {
      cvCount: existingCVs.length,
      cvsThisWeek,
      clCount: existingCoverLetters.length,
      coverLettersThisWeek,
      avgAts,
      strongAts,
      scoredCount: scoredCVs.length,
      journeyCount,
    };
  }, [existingCVs, existingCoverLetters, getScoreForCV]);

  const [filterType, setFilterType] = useState<'all' | 'cv' | 'cover-letter' | 'master' | 'standalone' | 'journey' | 'interview-ready' | 'archived'>('all');

  const kpiMetrics = React.useMemo(() => [
    {
      id: 'resumes',
      label: 'Resumes',
      value: String(kpiStats.cvCount),
      icon: <Briefcase size={16} strokeWidth={1.75} />,
      trend: kpiStats.cvsThisWeek > 0 ? `↑ ${kpiStats.cvsThisWeek} this week` : (kpiStats.cvCount > 0 ? `${kpiStats.cvCount} total` : 'No resumes yet'),
      trendUp: kpiStats.cvsThisWeek > 0,
      active: filterType === 'cv',
      onClick: () => {
        setFilterType(prev => (prev === 'cv' ? 'all' : 'cv'));
      },
    },
    {
      id: 'cover-letters',
      label: 'Cover Letters',
      value: String(kpiStats.clCount),
      icon: <Sparkles size={16} strokeWidth={1.75} />,
      trend: kpiStats.coverLettersThisWeek > 0 ? `↑ ${kpiStats.coverLettersThisWeek} this week` : (kpiStats.clCount > 0 ? `${kpiStats.clCount} active` : 'None yet'),
      trendUp: kpiStats.coverLettersThisWeek > 0,
      active: filterType === 'cover-letter',
      onClick: () => {
        setFilterType(prev => (prev === 'cover-letter' ? 'all' : 'cover-letter'));
      },
    },
    {
      id: 'avg-ats',
      label: 'Avg. ATS Score',
      value: kpiStats.avgAts > 0 ? `${kpiStats.avgAts}%` : '—',
      icon: <Target size={16} strokeWidth={1.75} />,
      trend: kpiStats.scoredCount > 0 ? `Across ${kpiStats.scoredCount} scored` : 'No scores yet',
      trendUp: kpiStats.avgAts >= 70,
      active: filterType === 'interview-ready',
      onClick: () => {
        setFilterType(prev => (prev === 'interview-ready' ? 'all' : 'interview-ready'));
      },
    },
    {
      id: 'interview-ready',
      label: 'Interview Ready',
      value: String(kpiStats.strongAts),
      icon: <Award size={16} strokeWidth={1.75} />,
      trend: kpiStats.strongAts > 0 
        ? `${Math.round((kpiStats.strongAts / Math.max(kpiStats.scoredCount, 1)) * 100)}% scored ≥ 70%` 
        : (kpiStats.cvCount > 0 ? 'Aim for 70%+ score' : 'Create a resume'),
      trendUp: kpiStats.strongAts > 0,
      active: filterType === 'interview-ready',
      onClick: () => {
        setFilterType(prev => (prev === 'interview-ready' ? 'all' : 'interview-ready'));
      },
    },
    {
      id: 'tailored',
      label: 'Tailored to Jobs',
      value: String(kpiStats.journeyCount),
      icon: <Zap size={16} strokeWidth={1.75} />,
      trend: kpiStats.journeyCount > 0 ? `${kpiStats.journeyCount} job-specific` : 'Tailor to a role',
      trendUp: kpiStats.journeyCount > 0,
      active: filterType === 'journey',
      onClick: () => {
        setFilterType(prev => (prev === 'journey' ? 'all' : 'journey'));
      },
    },
  ], [kpiStats, filterType]);
  const [parsingSteps] = useState([
    { label: 'Extracting text...', progress: 20 },
    { label: 'Structuring sections...', progress: 40 },
    { label: 'Identifying personal info...', progress: 60 },
    { label: 'Parsing work experience...', progress: 75 },
    { label: 'Extracting education...', progress: 85 },
    { label: 'Finalizing structure...', progress: 95 }
  ]);
  const [showSmartJDModal, setShowSmartJDModal] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Preview Sidebar State
  const [previewDoc, setPreviewDoc] = useState<{
    type: 'cv' | 'coverLetter';
    data: any;
    id?: string;
    title?: string;
    cvData?: any;
    template?: any;
    jobData?: any;
  } | null>(null);

  // Rename Modal State
  const [renameDoc, setRenameDoc] = useState<{ type: 'cv' | 'cover-letter' | 'draft'; id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const handleOpenRename = (doc: { type: 'cv' | 'cover-letter' | 'draft'; id: string; title: string }) => {
    setRenameDoc(doc);
    setNewTitle(doc.title);
  };

  const handleSaveRename = async () => {
    if (!renameDoc || !newTitle.trim()) return;
    setIsRenaming(true);
    try {
      if (renameDoc.type === 'cv') {
        const res = await authenticatedFetchWithUserId(user?.id || '', `/api/cvs/${renameDoc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle.trim() }),
        });
        if (!res.ok) throw new Error('Failed to rename resume');
        setExistingCVs(prev => prev.map(cv => ((cv.id || cv._id) === renameDoc.id ? { ...cv, title: newTitle.trim() } : cv)));
        if (cachedExistingCVs) {
          cachedExistingCVs = cachedExistingCVs.map(cv => ((cv.id || cv._id) === renameDoc.id ? { ...cv, title: newTitle.trim() } : cv));
        }
      } else if (renameDoc.type === 'cover-letter') {
        const res = await authenticatedFetchWithUserId(user?.id || '', `/api/cover-letters/${renameDoc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle.trim() }),
        });
        if (!res.ok) throw new Error('Failed to rename cover letter');
        setExistingCoverLetters(prev => prev.map(cl => ((cl.id || cl._id) === renameDoc.id ? { ...cl, title: newTitle.trim() } : cl)));
        if (cachedExistingCoverLetters) {
          cachedExistingCoverLetters = cachedExistingCoverLetters.map(cl => ((cl.id || cl._id) === renameDoc.id ? { ...cl, title: newTitle.trim() } : cl));
        }
      } else if (renameDoc.type === 'draft') {
        setDraftCV((prev: any) => prev ? { ...prev, cvTitle: newTitle.trim() } : prev);
      }
      toast.success('Renamed successfully');
      setRenameDoc(null);
    } catch (err: any) {
      console.error('Rename error:', err);
      toast.error(err.message || 'Failed to rename');
    } finally {
      setIsRenaming(false);
    }
  };

  // Auto-open create modal if action=create or create=true query param is provided
  useEffect(() => {
    const action = searchParams.get('action');
    const create = searchParams.get('create');
    if (action === 'create' || create === 'true' || create === '1' || create === 'cv' || create === 'cl') {
      setIsCreateModalOpen(true);
      if (searchParams.get('tab') === 'cover-letters' || create === 'cl') {
        setActiveTab('cover-letters');
      } else if (searchParams.get('tab') === 'cvs' || create === 'cv') {
        setActiveTab('cvs');
      }
    }
  }, [searchParams, setActiveTab]);

  // Set hasMasterCV in context on mount - REDUNDANT: removed to prevent loops
  // useEffect(() => {
  //   dispatch({ type: 'SET_HAS_MASTER_CV', payload: userHasMasterCV });
  // }, [userHasMasterCV, dispatch]);

  // Fetch existing CVs on mount
  const fetchExistingCVs = useCallback(async () => {
    const cacheScope = user?.id ?? 'guest';
    if (cacheUserId === cacheScope && cachedExistingCVs && Date.now() - lastFetchTime < CACHE_TTL) {
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
        cacheUserId = cacheScope;
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
    const cacheScope = user?.id ?? 'guest';
    if (cacheUserId === cacheScope && cachedDraftCV && Date.now() - lastFetchTime < CACHE_TTL) {
      setDraftCV(cachedDraftCV);
      return;
    }
    try {
      const response = await fetch('/api/cv-draft/load');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          cachedDraftCV = data.data;
          cacheUserId = cacheScope;
          setDraftCV(data.data);
        } else {
          cachedDraftCV = null;
          setDraftCV(null);
        }
      }
    } catch (error) {
      console.error('Failed to load draft CV:', error);
    }
  }, [user?.id]);

  const fetchExistingCoverLetters = useCallback(async () => {
    if (!user?.id) return;
    const cacheScope = user.id;
    if (cacheUserId === cacheScope && cachedExistingCoverLetters && Date.now() - lastFetchTime < CACHE_TTL) {
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
        cacheUserId = cacheScope;
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
  const filteredCVs = React.useMemo(() => {
    if (filterType === 'cover-letter') return [];
    return existingCVs.filter(cv => {
      const isArchived = cv.status === 'archived';
      if (filterType === 'archived') return isArchived;
      if (isArchived) return false;
      if (filterType === 'all' || filterType === 'cv') return true;
      if (filterType === 'interview-ready') {
        const score = getScoreForCV(cv);
        return score !== undefined && score >= 70;
      }
      return cv.cvType === filterType;
    });
  }, [existingCVs, filterType, getScoreForCV]);

  const coverLetterMap = React.useMemo(() => {
    // Hide paired cover letters when filtering exclusively by CV, interview-ready, or archived
    if (filterType === 'cv' || filterType === 'interview-ready' || filterType === 'archived') {
      return new Map<string, any[]>();
    }

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
  }, [existingCoverLetters, existingCVs, filterType]);

  const orphanedCoverLetters = React.useMemo(() => {
    // Hide cover letters when filtering specifically for CVs or primary CVs
    if (filterType === 'cv' || filterType === 'master' || filterType === 'standalone' || filterType === 'interview-ready' || filterType === 'archived') {
      return [];
    }

    // Show ALL cover letters when filtered by 'cover-letter'
    if (filterType === 'cover-letter') {
      return existingCoverLetters;
    }

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
  }, [filterType, filteredCVs, existingCoverLetters, coverLetterMap]);

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
      scheduleTimer(() => {
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
          title: cvType === 'master' ? 'Primary Profile' : 'Standalone CV',
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
          toast.error(result.error || 'Please create your Profile first.');
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
        scheduleTimer(() => {
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
    if (smartJDMode === 'cv') {
      router.push('/editor?mode=journey&step=3');
    } else {
      router.push('/editor?mode=create-cover-letter&step=4');
    }
  };

  const handleStartWithJob = (mode: 'cv' | 'cover-letter' = 'cover-letter') => {
    setSmartJDMode(mode);
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
          className="step-one-shell dashboard-workspace flex flex-col h-full overflow-hidden pl-3 lg:pl-0 pb-3"
        >
          {/* Off-white rounded content card — matches the dashboard workspace */}
          <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm h-full min-h-0 flex flex-col overflow-hidden mr-3">
            <div
              ref={scrollContainerRef}
              className="flex-1 min-h-0 overflow-y-auto custom-scrollbar scroll-smooth"
              onScroll={handleScroll}
            >
              <div className="min-h-full flex flex-col">


        {/* Top Section */}
        <div ref={topSectionRef} className="step-one-hero relative z-10 w-full flex flex-col shrink-0 pt-6 sm:pt-8 pb-4 sm:pb-6">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
            {/* Header (Jobs Hub Style) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
              <div>
                <h1 className="text-h1 font-bold text-gray-900 dark:text-white">
                  Editor
                </h1>
                <p className="mt-1 text-small text-gray-600 dark:text-gray-400">
                  AI-powered resume &amp; cover letter builder
                </p>
              </div>

              {/* Create Button in Header */}
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              >
                Create
              </Button>
            </div>

            {/* Dashboard-Style KPI Strip */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-y md:divide-y-0 divide-[var(--border-primary)] overflow-hidden">
              {kpiMetrics.map((m) => (
                <div
                  key={m.label}
                  onClick={m.onClick}
                  className={`px-5 py-4 flex items-center gap-3.5 min-w-0 transition-all cursor-pointer select-none ${
                    m.active
                      ? 'bg-lime-500/10 dark:bg-lime-500/15 ring-2 ring-inset ring-lime-500/40 dark:ring-lime-400/40'
                      : 'hover:bg-gray-50/70 dark:hover:bg-white/[0.03]'
                  }`}
                  title={m.active ? `Filtering by ${m.label} (click to show all)` : `Filter by ${m.label}`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      m.active
                        ? 'bg-lime-500 text-white dark:bg-lime-400 dark:text-black shadow-sm'
                        : 'bg-[var(--bg-tertiary)] dark:bg-white/5 text-[var(--text-secondary)]'
                    }`}
                  >
                    {m.icon}
                  </div>
                  <div className="min-w-0">
                    {isLoadingCVs ? (
                      <>
                        <div className="h-5 w-10 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">{m.label}</div>
                        <div className="mt-1 h-3 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                      </>
                    ) : (
                      <>
                        <div className="text-xl font-semibold tracking-tight text-[var(--text-primary)] leading-none tabular-nums flex items-center gap-1.5">
                          <span>{m.value}</span>
                          {m.active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-lime-500 dark:bg-lime-400 animate-pulse" />
                          )}
                        </div>
                        <div className={`mt-1 text-xs font-medium truncate ${m.active ? 'text-lime-700 dark:text-lime-300 font-bold' : 'text-[var(--text-secondary)]'}`}>
                          {m.label}
                        </div>
                        <div className={`mt-0.5 text-[11px] font-medium truncate ${m.trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-tertiary)] text-gray-500 dark:text-gray-400'}`}>
                          {m.trend}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Your Documents — merged into the page flow (was a slide-up panel) */}
        {!isGuestMode && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 pb-12">
                <div className="step-one-documents-header flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5 pb-5 border-b border-[color:var(--border-primary)] pt-0">
                  <div>
                    <h3 className="mt-1 text-xs sm:text-sm text-[color:var(--text-secondary)] flex items-center gap-2">
                      <span>Your Documents</span>
                      {filterType !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setFilterType('all')}
                          className="text-xs font-bold text-lime-600 dark:text-lime-400 hover:underline cursor-pointer"
                        >
                          (Clear filter)
                        </button>
                      )}
                    </h3>
                    <p className="text-xl sm:text-2xl font-black text-[color:var(--text-primary)] tracking-tight text-left">
                      {filterType === 'cv' 
                        ? 'All your resumes in one place.' 
                        : filterType === 'cover-letter' 
                        ? 'All your cover letters in one place.' 
                        : filterType === 'journey'
                        ? 'Your job-tailored applications & resumes.'
                        : filterType === 'interview-ready'
                        ? 'High-scoring resumes (≥70% ATS score).'
                        : filterType === 'master'
                        ? 'Your primary profile resume.'
                        : filterType === 'standalone'
                        ? 'Your custom resumes.'
                        : filterType === 'archived'
                        ? 'Your archived documents.'
                        : 'All your resumes and cover letters in one place.'}
                    </p>
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
                        <option value="all">All Documents</option>
                        <option value="cv">Resumes Only</option>
                        <option value="cover-letter">Cover Letters Only</option>
                        <option value="journey">Job Based</option>
                        <option value="interview-ready">Interview Ready (≥70%)</option>
                        <option value="master">Primary Profile</option>
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
                            ? 'bg-lime-500 text-white dark:bg-[#0d100a] dark:text-[#013f2e] dark:border dark:border-[#013f2e]/25 shadow-md'
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
                            ? 'bg-lime-500 text-white dark:bg-[#0d100a] dark:text-[#013f2e] dark:border dark:border-[#013f2e]/25 shadow-md'
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
                            ? 'bg-lime-500 text-white dark:bg-[#0d100a] dark:text-[#013f2e] dark:border dark:border-[#013f2e]/25 shadow-md'
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
                <div className={viewLayout === 'compact' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 px-1" : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 px-1"}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200/80 dark:border-white/5 bg-gray-100 dark:bg-white/[0.03]">
                      <div className="w-full aspect-[1/1.414] animate-pulse relative">
                        {/* Soft Diluting Glass Backdrop Shimmer */}
                        <div
                          className="absolute inset-x-0 bottom-0 h-44 sm:h-52 pointer-events-none z-10 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-[#0d100a] dark:via-[#0d100a]/90 dark:to-transparent backdrop-blur-[8px]"
                          style={{
                            maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 z-20 p-3.5 sm:p-4.5 pb-3 sm:pb-3.5 space-y-2">
                          <div className="h-3 w-3/4 bg-gray-300 dark:bg-white/10 rounded" />
                          <div className="h-2 w-1/2 bg-gray-200 dark:bg-white/5 rounded" />
                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-200/80 dark:border-white/10">
                            <div className="flex-1 h-7 bg-gray-200 dark:bg-white/10 rounded-xl" />
                            <div className="flex-1 h-7 bg-gray-200 dark:bg-white/10 rounded-xl" />
                            <div className="flex-1 h-7 bg-gray-200 dark:bg-white/10 rounded-xl" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (filteredCVs.length > 0 || (draftCV && (filterType === 'all' || filterType === 'cv')) || orphanedCoverLetters.length > 0) ? (
                viewLayout !== 'list' ? (
                  <div className={viewLayout === 'compact' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 px-1" : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 px-1"}>
                  
                  {/* Render Draft CV if it exists */}
                  {draftCV && (filterType === 'all' || filterType === 'cv') && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="step-one-document-card group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-dashed border-orange-400/60 dark:border-orange-500/40 shadow-md hover:shadow-2xl transition-all duration-300 bg-gradient-to-b from-orange-100/40 to-white dark:from-orange-950/20 dark:to-[#141810]"
                    >
                      <div className="relative aspect-[1/1.414] w-full overflow-hidden">
                        {/* Center Icon & Draft Label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-6">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mb-1.5 sm:mb-2 shadow-lg group-hover:scale-110 transition-transform">
                            <FileText className="w-5 h-5 sm:w-7 sm:h-7 text-orange-500 animate-pulse" />
                          </div>
                          <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
                            Draft Resume
                          </span>
                        </div>

                        {/* Soft Diluting Glass Blur Backdrop */}
                        <div
                          className="absolute inset-x-0 bottom-0 h-44 sm:h-52 pointer-events-none z-10 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-[#0d100a] dark:via-[#0d100a]/90 dark:to-transparent backdrop-blur-[8px]"
                          style={{
                            maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                          }}
                        />

                        {/* Bottom Content Area */}
                        <div className="absolute inset-x-0 bottom-0 z-20 px-3.5 sm:px-4.5 pb-3 sm:pb-3.5 flex flex-col justify-end">
                          {/* Title + Rename Button */}
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <h4
                              className={`font-black text-gray-950 dark:text-white tracking-tight leading-tight truncate ${
                                viewLayout === 'compact' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                              }`}
                              title={draftCV.cvTitle || 'Professional - My CV | CV'}
                            >
                              {draftCV.cvTitle || 'Professional - My CV | CV'}
                            </h4>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRename({ type: 'draft', id: 'draft', title: draftCV.cvTitle || 'Draft Resume' });
                              }}
                              className="p-1 -mr-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                              title="Rename Draft"
                              aria-label="Rename Draft"
                            >
                              <PenLine className={viewLayout === 'compact' ? "w-3 h-3" : "w-3.5 h-3.5"} />
                            </button>
                          </div>

                          <p className={`font-semibold text-orange-600 dark:text-orange-400 line-clamp-1 mt-0.5 ${viewLayout === 'compact' ? 'text-[9px] sm:text-[10px] mb-1' : 'text-[10px] sm:text-xs mb-1.5'}`}>
                            {draftCV.targetRole || 'In-progress Resume'}
                          </p>

                          <div className={`flex items-center gap-2.5 sm:gap-3 font-semibold text-gray-500 dark:text-gray-400 ${viewLayout === 'compact' ? 'text-[8px] sm:text-[9px] mb-1.5' : 'text-[9px] sm:text-xs mb-2'}`}>
                            <span className="flex items-center gap-1 shrink-0">
                              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-400" />
                              Edited {new Date(draftCV.lastSaved || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          {/* Action Icon Buttons */}
                          <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5 border-t border-gray-200/80 dark:border-white/10">
                            {/* Edit / Continue */}
                            <button
                              type="button"
                              onClick={() => {
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
                              }}
                              className={`flex-1 rounded-xl bg-orange-100/80 hover:bg-orange-500 hover:text-white dark:bg-white/10 dark:hover:bg-orange-500 border border-orange-200 dark:border-white/10 text-orange-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                                viewLayout === 'compact' ? 'py-1.5' : 'py-2 sm:py-2.5'
                              }`}
                              title="Continue Draft"
                              aria-label="Continue Draft"
                            >
                              <Edit3 className={viewLayout === 'compact' ? "w-3 h-3" : "w-4 h-4"} />
                            </button>

                            {/* Preview */}
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ type: 'cv', data: draftCV.cvData || draftCV, template: draftCV.template })}
                              className={`flex-1 rounded-xl bg-gray-100 hover:bg-blue-500 hover:text-white dark:bg-white/10 dark:hover:bg-blue-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                                viewLayout === 'compact' ? 'py-1.5' : 'py-2 sm:py-2.5'
                              }`}
                              title="Preview Draft"
                              aria-label="Preview Draft"
                            >
                              <Eye className={viewLayout === 'compact' ? "w-3 h-3" : "w-4 h-4"} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm('Are you sure you want to delete this draft?')) {
                                  try {
                                    const response = await fetch('/api/cv-draft/delete', { method: 'DELETE' });
                                    if (response.ok) {
                                      setDraftCV(null);
                                      cachedDraftCV = null;
                                      toast.success('Draft deleted');
                                    }
                                  } catch (err) {
                                    console.error('Failed to delete draft:', err);
                                  }
                                }
                              }}
                              className={`flex-1 rounded-xl bg-gray-100 hover:bg-red-500 hover:text-white dark:bg-white/10 dark:hover:bg-red-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                                viewLayout === 'compact' ? 'py-1.5' : 'py-2 sm:py-2.5'
                              }`}
                              title="Delete Draft"
                              aria-label="Delete Draft"
                            >
                              <Trash2 className={viewLayout === 'compact' ? "w-3 h-3" : "w-4 h-4"} />
                            </button>
                          </div>
                        </div>
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
                         compact={viewLayout === 'compact'}
                         onEditCV={() => handleEditExistingCV(cv)}
                         onDeleteCV={(e) => { e.stopPropagation(); handleDeleteCV(cv.id || cv._id || '', e); }}
                         onPreviewCV={(cv) => setPreviewDoc({ type: 'cv', data: cv.cvData || cv, template: cv.template, id: cv.id || cv._id, title: cv.title })}
                         onRenameCV={(cv) => handleOpenRename({ type: 'cv', id: cv.id || cv._id, title: cv.title || '' })}
                         onEditCoverLetter={(cl) => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                         onDeleteCoverLetter={(cl, e) => { e.stopPropagation(); handleDeleteCoverLetter(cl.id || cl._id || '', e); }}
                         onPreviewCoverLetter={(cl) => setPreviewDoc({ type: 'coverLetter', data: cl, cvData: cv.cvData, id: cl.id || cl._id, title: cl.title })}
                         onRenameCoverLetter={(cl) => handleOpenRename({ type: 'cover-letter', id: cl.id || cl._id, title: cl.title || '' })}
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
                       className="step-one-document-card group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-md hover:shadow-2xl transition-all duration-300 bg-white dark:bg-[#141810]"
                     >
                       <div className="relative aspect-[1/1.414] w-full overflow-hidden">
                         <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                           <LazyThumbnail item={cl} isCoverLetter={true} />
                         </div>

                         {/* Soft Diluting Glass Blur Backdrop */}
                         <div
                           className="absolute inset-x-0 bottom-0 h-44 sm:h-52 pointer-events-none z-10 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-[#0d100a] dark:via-[#0d100a]/90 dark:to-transparent backdrop-blur-[8px]"
                           style={{
                             maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                             WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                           }}
                         />

                         {/* Bottom Content Area */}
                         <div className="absolute inset-x-0 bottom-0 z-20 px-3.5 sm:px-4.5 pb-3 sm:pb-3.5 flex flex-col justify-end">
                           {/* Title + Rename Button */}
                           <div className="flex items-center justify-between gap-1.5 min-w-0">
                             <h4
                               className={`font-black text-gray-950 dark:text-white tracking-tight leading-tight truncate ${
                                 viewLayout === 'compact' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                               }`}
                               title={cl.title || 'Untitled Cover Letter'}
                             >
                               {cl.title || 'Untitled Cover Letter'}
                             </h4>
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleOpenRename({ type: 'cover-letter', id: cl.id || cl._id, title: cl.title || '' });
                               }}
                               className="p-1 -mr-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                               title="Rename Cover Letter"
                               aria-label="Rename Cover Letter"
                             >
                               <PenLine className={viewLayout === 'compact' ? "w-3 h-3" : "w-3.5 h-3.5"} />
                             </button>
                           </div>

                           <p className={`font-semibold text-gray-600 dark:text-gray-300 line-clamp-1 mt-0.5 ${viewLayout === 'compact' ? 'text-[9px] sm:text-[10px] mb-1' : 'text-[10px] sm:text-xs mb-1.5'}`}>
                             {cl.targetRole || 'Job Application Cover Letter'}
                           </p>

                           <div className={`flex items-center gap-2.5 sm:gap-3 font-semibold text-gray-500 dark:text-gray-400 ${viewLayout === 'compact' ? 'text-[8px] sm:text-[9px] mb-1.5' : 'text-[9px] sm:text-xs mb-2'}`}>
                             <span className="flex items-center gap-1 shrink-0">
                               <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-400" />
                               {getRelativeTime(cl.updatedAt || cl.createdAt)}
                             </span>
                           </div>

                           {/* Bottom Action Icon Buttons (Edit, Preview, Delete) */}
                           <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5 border-t border-gray-200/80 dark:border-white/10">
                             {/* Edit */}
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`);
                               }}
                               className={`flex-1 rounded-xl bg-gray-100 hover:bg-lime-500 hover:text-white dark:bg-white/10 dark:hover:bg-lime-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                                 viewLayout === 'compact' ? 'py-1.5' : 'py-2 sm:py-2.5'
                               }`}
                               title="Edit Cover Letter"
                               aria-label="Edit Cover Letter"
                             >
                               <Edit3 className={viewLayout === 'compact' ? "w-3 h-3" : "w-4 h-4"} />
                             </button>

                              {/* Preview */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewDoc({ type: 'coverLetter', data: cl, cvData: cl.cvData, id: cl.id || cl._id, title: cl.title });
                                }}
                                className={`flex-1 rounded-xl bg-gray-100 hover:bg-blue-500 hover:text-white dark:bg-white/10 dark:hover:bg-blue-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                                  viewLayout === 'compact' ? 'py-1.5' : 'py-2 sm:py-2.5'
                                }`}
                                title="Preview Cover Letter"
                                aria-label="Preview Cover Letter"
                              >
                                <Eye className={viewLayout === 'compact' ? "w-3 h-3" : "w-4 h-4"} />
                              </button>

                             {/* Delete */}
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDeleteCoverLetter(cl.id || cl._id || '', e);
                               }}
                               className={`flex-1 rounded-xl bg-gray-100 hover:bg-red-500 hover:text-white dark:bg-white/10 dark:hover:bg-red-500 border border-gray-200/80 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm ${
                                 viewLayout === 'compact' ? 'py-1.5' : 'py-2 sm:py-2.5'
                               }`}
                               title="Delete Cover Letter"
                               aria-label="Delete Cover Letter"
                             >
                               <Trash2 className={viewLayout === 'compact' ? "w-3 h-3" : "w-4 h-4"} />
                             </button>
                           </div>
                         </div>
                       </div>
                     </motion.div>
                   ))}
                </div>
                ) : (
                  <div className="bg-white dark:bg-[#0d100a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-black/25 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-3.5 w-24 text-xs font-bold uppercase tracking-wider">Type</th>
                            <th className="py-3 px-3.5 min-w-[220px] text-xs font-bold uppercase tracking-wider">Document Name</th>
                            <th className="py-3 px-3.5 w-36 text-xs font-bold uppercase tracking-wider">Company</th>
                            <th className="py-3 px-3.5 w-44 text-xs font-bold uppercase tracking-wider">Profile</th>
                            <th className="py-3 px-3.5 w-32 text-xs font-bold uppercase tracking-wider whitespace-nowrap">Last Modified</th>
                            <th className="py-3 px-3.5 w-20 text-xs font-bold uppercase tracking-wider text-center">Score</th>
                            <th className="py-3 px-3.5 w-28 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {draftCV && (filterType === 'all' || filterType === 'cv') && (
                            <tr className="bg-orange-50/20 dark:bg-orange-950/10 hover:bg-orange-50/40 transition-colors">
                              <td className="py-3 px-3.5">
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-orange-500 text-white">
                                  Unsaved Draft
                                </span>
                              </td>
                              <td className="py-3 px-3.5">
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
                              <td className="py-3 px-3.5 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                {draftCV.targetCompany || '—'}
                              </td>
                              <td className="py-3 px-3.5 text-xs text-gray-500 dark:text-gray-400 font-bold">
                                {draftCV.targetRole || 'In-progress Resume'}
                              </td>
                              <td className="py-3 px-3.5 text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                                Edited {new Date(draftCV.lastSaved || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </td>
                              <td className="py-3 px-3.5 text-xs text-gray-400 text-center">—</td>
                              <td className="py-3 px-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
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
                                    className="p-1.5 bg-gray-100 hover:bg-red-500 hover:text-white dark:bg-white/5 dark:hover:bg-red-650 dark:hover:text-white text-red-500 dark:text-red-400 rounded-lg transition-all"
                                    title="Delete Draft"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {filteredCVs.map((cv) => {
                            const cvCoverLetters = coverLetterMap.get(String(cv.id || cv._id)) || [];
                            return (
                              <React.Fragment key={cv.id || cv._id}>
                                <tr className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                                  <td className="py-3 px-3.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                      cv.cvType === 'master' ? 'bg-purple-600 text-white' : cv.cvType === 'journey' ? 'bg-lime-500 text-white dark:bg-[#013f2e]/10 dark:text-[#013f2e]' : 'bg-blue-600 text-white'
                                    }`}>
                                      {cv.cvType === 'master' ? 'Primary' : cv.cvType === 'journey' ? 'Job Based' : 'Custom'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3.5">
                                    <span 
                                      onClick={() => handleEditExistingCV(cv)}
                                      className="font-black text-gray-900 dark:text-white hover:text-lime-650 dark:hover:text-lime-500 cursor-pointer text-sm"
                                    >
                                      {cv.title || 'Untitled CV'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3.5 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                    {cvJourneysMap.get(String(cv.id || cv._id))?.company || cv.cvData?.work?.[0]?.name || '—'}
                                  </td>
                                  <td className="py-3 px-3.5 text-xs text-gray-500 dark:text-gray-400 font-bold">
                                    {cvJourneysMap.get(String(cv.id || cv._id))?.jobTitle || cv.cvData?.basics?.label || cv.cvData?.work?.[0]?.position || 'No Role Context'}
                                  </td>
                                  <td className="py-3 px-3.5 text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                                    Edited {getRelativeTime(cv.updatedAt || cv.createdAt)}
                                  </td>
                                  <td className="py-3 px-3.5 text-center">
                                    {getScoreForCV(cv) !== undefined ? (
                                      <span className="text-xs font-black text-lime-600 dark:text-[#013f2e] bg-lime-500/10 dark:bg-[#013f2e]/10 px-2 py-0.5 rounded-full">
                                        {getScoreForCV(cv)}%
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <IconButton
                                        variant="secondary"
                                        size="sm"
                                        aria-label="Edit"
                                        tooltip="Edit"
                                        onClick={() => handleEditExistingCV(cv)}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </IconButton>
                                      <IconButton
                                        variant="secondary"
                                        size="sm"
                                        aria-label="Duplicate"
                                        tooltip="Duplicate"
                                        onClick={(e) => handleDuplicateCV(cv.id || cv._id || '', cv.title, e)}
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </IconButton>
                                      {cv.cvType !== 'master' && (
                                        <IconButton
                                          variant="danger"
                                          size="sm"
                                          aria-label="Delete"
                                          tooltip="Delete"
                                          onClick={(e) => handleDeleteCV(cv.id || cv._id || '', e)}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </IconButton>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {cvCoverLetters.map((cl) => (
                                  <tr key={cl.id || cl._id} className="bg-gray-50/40 dark:bg-white/[0.01] hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors">
                                    <td className="py-2.5 px-3.5 pl-7">
                                      <div className="flex items-center gap-1.5">
                                        <CornerDownRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                                          Letter
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3.5">
                                      <span 
                                        onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                                        className="font-bold text-gray-700 dark:text-gray-300 hover:text-emerald-500 cursor-pointer text-xs"
                                      >
                                        {cl.title || 'Untitled Cover Letter'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3.5 text-xs text-gray-400 font-semibold">—</td>
                                    <td className="py-2.5 px-3.5 text-xs text-gray-400 font-semibold">—</td>
                                    <td className="py-2.5 px-3.5 text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                                      Edited {getRelativeTime(cl.updatedAt || cl.createdAt)}
                                    </td>
                                    <td className="py-2.5 px-3.5 text-xs text-gray-400 text-center">—</td>
                                    <td className="py-2.5 px-3.5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <IconButton
                                          variant="secondary"
                                          size="sm"
                                          aria-label="Edit Cover Letter"
                                          tooltip="Edit Cover Letter"
                                          onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </IconButton>
                                        <IconButton
                                          variant="danger"
                                          size="sm"
                                          aria-label="Delete Cover Letter"
                                          tooltip="Delete Cover Letter"
                                          onClick={(e) => handleDeleteCoverLetter(cl.id || cl._id || '', e)}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </IconButton>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}

                          {orphanedCoverLetters.map((cl) => (
                            <tr key={cl.id || cl._id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-3.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                                  Letter
                                </span>
                              </td>
                              <td className="py-3 px-3.5">
                                <span 
                                   onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                                  className="font-black text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-500 cursor-pointer text-sm"
                                >
                                  {cl.title || 'Untitled Cover Letter'}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-xs text-gray-400 font-semibold">—</td>
                              <td className="py-3 px-3.5 text-xs text-gray-400 font-semibold">—</td>
                              <td className="py-3 px-3.5 text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                                Edited {getRelativeTime(cl.updatedAt || cl.createdAt)}
                              </td>
                              <td className="py-3 px-3.5 text-xs text-gray-400 text-center">—</td>
                              <td className="py-3 px-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <IconButton
                                    variant="secondary"
                                    size="sm"
                                    aria-label="Edit Cover Letter"
                                    tooltip="Edit Cover Letter"
                                    onClick={() => router.push(`/editor?mode=edit-cover-letter&coverLetterId=${cl.id || cl._id}`)}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </IconButton>
                                  <IconButton
                                    variant="danger"
                                    size="sm"
                                    aria-label="Delete Cover Letter"
                                    tooltip="Delete Cover Letter"
                                    onClick={(e) => handleDeleteCoverLetter(cl.id || cl._id || '', e)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </IconButton>
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
                  <h4 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">
                    {filterType === 'cover-letter' 
                      ? 'No Cover Letters' 
                      : filterType === 'cv' 
                      ? 'No Resumes' 
                      : filterType === 'interview-ready'
                      ? 'No Interview-Ready Resumes'
                      : filterType === 'journey'
                      ? 'No Job-Based Resumes'
                      : 'No Documents'}
                  </h4>
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 font-medium max-w-xs mx-auto px-4 mb-5">
                    {filterType !== 'all' 
                      ? 'No documents match the selected filter.' 
                      : 'Build your first high-performance resume or cover letter using the options above.'}
                  </p>
                  {filterType !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-xs hover:scale-105 transition-all shadow-md cursor-pointer"
                    >
                      Show All Documents
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-lime-500 text-black font-bold text-xs hover:scale-105 transition-all shadow-md cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      Create Document
                    </button>
                  )}
                </div>
              )}

            </div>
          )}
          </div>
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
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#013f2e]/15 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-[#013f2e]" />
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
                  <span className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-lime-500 dark:bg-[#013f2e] hover:bg-lime-600 dark:hover:bg-[#02523c] text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base">
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
                <div className="w-20 h-20 bg-[#013f2e]/15 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <FileText className="w-10 h-10 text-[#013f2e]" />
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
                              ? 'text-[#013f2e]'
                              : isCurrent
                                ? 'text-[#013f2e] font-medium'
                                : 'text-[color:var(--text-tertiary)]'
                              }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-[#013f2e] flex-shrink-0" />
                            ) : isCurrent ? (
                              <Loader2 className="w-5 h-5 text-[#013f2e] flex-shrink-0 animate-spin" />
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
                    className="bg-[#013f2e] h-2 rounded-full transition-all duration-300"
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
                <div className="w-20 h-20 bg-[#013f2e]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-[#013f2e]" />
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
                  className="px-6 py-2 bg-lime-500 dark:bg-[#013f2e] hover:bg-lime-600 dark:hover:bg-[#02523c] text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
      )}

      {/* Create Document Modal */}
      {isCreateModalOpen && (
        <div 
          key="create-document-modal" 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-600 dark:text-lime-400">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                    Create
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Choose what document you would like to build
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Action Cards */}
            <div className="p-5 sm:p-7 space-y-6 overflow-y-auto custom-scrollbar">
              {/* Resume & CV Section */}
              <div>
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="w-6 h-6 rounded-lg bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-600 dark:text-lime-400">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    Resume &amp; CV
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Tailor to Job */}
                  <motion.button
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      handleStartWithJob('cv');
                    }}
                    className="step-one-action step-one-action-primary group relative rounded-2xl p-5 border border-dashed border-gray-300 dark:border-white/15 hover:border-lime-500 dark:hover:border-lime-500 overflow-hidden text-center flex flex-col items-center justify-center bg-gray-50/70 dark:bg-white/[0.02] hover:bg-lime-500/5 transition-all"
                  >
                    <div className="relative flex flex-col items-center space-y-2.5">
                      <div className="w-11 h-11 bg-lime-500/10 border border-lime-500/30 text-lime-600 dark:text-lime-400 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Sparkles className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Tailor to Job</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Target a specific role</p>
                      </div>
                    </div>
                  </motion.button>

                  {/* Blank CV */}
                  <motion.button
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      handleManualEntry();
                    }}
                    disabled={isCreatingBlank || isDuplicating || isLoadingCVs}
                    className={`step-one-action group relative rounded-2xl p-5 border border-gray-200 dark:border-white/10 hover:border-lime-500 dark:hover:border-lime-500 overflow-hidden text-center flex flex-col items-center justify-center bg-gray-50/70 dark:bg-white/[0.02] hover:bg-lime-500/5 transition-all ${(isCreatingBlank || isDuplicating || isLoadingCVs) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="relative flex flex-col items-center space-y-2.5">
                      <div className="w-11 h-11 bg-lime-500/10 border border-lime-500/30 text-lime-600 dark:text-lime-400 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        {isCreatingBlank ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Blank CV</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Start from scratch</p>
                      </div>
                    </div>
                  </motion.button>

                  {/* Duplicate Profile */}
                  <motion.button
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      handleDuplicatePrimary();
                    }}
                    disabled={!userHasMasterCV || isDuplicating || isLoadingCVs}
                    className={`step-one-action group relative rounded-2xl p-5 border border-gray-200 dark:border-white/10 hover:border-lime-500 dark:hover:border-lime-500 overflow-hidden text-center flex flex-col items-center justify-center bg-gray-50/70 dark:bg-white/[0.02] hover:bg-lime-500/5 transition-all ${(!userHasMasterCV || isDuplicating || isLoadingCVs) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="relative flex flex-col items-center space-y-2.5">
                      <div className="w-11 h-11 bg-lime-500/10 border border-lime-500/30 text-lime-600 dark:text-lime-400 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        {isDuplicating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Copy className="w-5 h-5 stroke-[2.5]" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Duplicate Profile</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Copy your profile</p>
                      </div>
                      {!userHasMasterCV && (
                        <span className="text-[8px] font-bold px-2 py-0.5 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full">
                          Requires Profile
                        </span>
                      )}
                    </div>
                  </motion.button>

                  {/* Upload a CV */}
                  <motion.button
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setForcedCvType('standalone');
                      setParseMethod('upload');
                    }}
                    disabled={isCreatingBlank || isDuplicating || isLoadingCVs}
                    className={`step-one-action group relative rounded-2xl p-5 border border-gray-200 dark:border-white/10 hover:border-purple-500 dark:hover:border-purple-500 overflow-hidden text-center flex flex-col items-center justify-center bg-gray-50/70 dark:bg-white/[0.02] hover:bg-purple-500/5 transition-all ${(isCreatingBlank || isDuplicating || isLoadingCVs) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="relative flex flex-col items-center space-y-2.5">
                      <div className="w-11 h-11 bg-purple-500/10 border border-purple-500/30 text-purple-500 dark:text-purple-400 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Upload CV</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Improve with AI</p>
                      </div>
                    </div>
                  </motion.button>
                </div>
              </div>

              {/* Cover Letter Section */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    Cover Letter
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Write with AI */}
                  <motion.button
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      handleStartWithJob('cover-letter');
                    }}
                    className="step-one-action step-one-action-primary group relative rounded-2xl p-5 border border-dashed border-gray-300 dark:border-white/15 hover:border-lime-500 dark:hover:border-lime-500 overflow-hidden text-center flex flex-col items-center justify-center bg-gray-50/70 dark:bg-white/[0.02] hover:bg-lime-500/5 transition-all"
                  >
                    <div className="relative flex flex-col items-center space-y-2.5">
                      <div className="w-11 h-11 bg-lime-500/10 border border-lime-500/30 text-lime-600 dark:text-lime-400 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Sparkles className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Write with AI</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Generate a tailored letter from a job description</p>
                      </div>
                    </div>
                  </motion.button>

                  {/* Start Fresh */}
                  <motion.button
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      router.push('/editor?mode=create-cover-letter&step=4');
                    }}
                    className="step-one-action group relative rounded-2xl p-5 border border-gray-200 dark:border-white/10 hover:border-lime-500 dark:hover:border-lime-500 overflow-hidden text-center flex flex-col items-center justify-center bg-gray-50/70 dark:bg-white/[0.02] hover:bg-lime-500/5 transition-all"
                  >
                    <div className="relative flex flex-col items-center space-y-2.5">
                      <div className="w-11 h-11 bg-lime-500/10 border border-lime-500/30 text-lime-600 dark:text-lime-400 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Edit3 className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Start Fresh</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Pick a template and write your own story</p>
                      </div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rename Document Modal */}
      {renameDoc && (
        <div
          key="rename-document-modal"
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRenameDoc(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-md bg-white dark:bg-[#141810] border border-gray-250 dark:border-white/10 rounded-3xl shadow-2xl p-6 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <PenLine className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Rename {renameDoc.type === 'cv' ? 'Resume' : renameDoc.type === 'cover-letter' ? 'Cover Letter' : 'Draft'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRenameDoc(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveRename();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-250 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:outline-none"
                  placeholder="e.g. Senior Frontend Developer CV"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameDoc(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenaming || !newTitle.trim()}
                  className="px-5 py-2 text-xs font-bold bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md flex items-center gap-1.5"
                >
                  {isRenaming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isRenaming ? 'Saving...' : 'Save Title'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Document Preview Sidebar */}
      <DocumentPreviewSidebar
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        documentType={previewDoc?.type === 'coverLetter' ? 'coverLetter' : 'cv'}
        documentData={previewDoc?.data}
        documentId={previewDoc?.id || previewDoc?.data?._id || previewDoc?.data?.id}
        documentTitle={previewDoc?.title || previewDoc?.data?.title}
        cvData={previewDoc?.cvData || previewDoc?.data?.cvData}
        jobData={previewDoc?.jobData || previewDoc?.data?.jobData}
        template={previewDoc?.template || previewDoc?.data?.template || null}
      />
    </AnimatePresence>
  );
}
