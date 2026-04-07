'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
// Force HMR update
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { safeJsonParse } from '@/lib/utils/safeJsonParse';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import {
  FileText,
  Plus,
  Edit,
  Copy,
  Download,
  Share2,
  Trash2,
  Eye,
  Star,
  Calendar,
  Users,
  Palette,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Clock,
  TrendingUp,
  X,
  Briefcase,
  PenTool,
  ExternalLink,
  Link,
  Trash,
  MessageSquare,
  Building,
  MapPin,
  CalendarDays,
  Target,
  Award,
  BookOpen,
  Pencil,
  Save,
  Check,
  Lightbulb,
  Activity,
  AlertTriangle,
  AlertCircle,
  SortAsc,
  BarChart3
} from 'lucide-react';
import { useCreateCV } from '@/lib/utils/cvCreationUtils';
import PageHeader from './PageHeader';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { ApplicationPackageService } from '@/lib/services/applicationPackageService';
import { UnifiedCVService } from '@/lib/services/unified-cv-service';
import MasterCVCardOverlay from './MasterCVCardOverlay';
import CVCardOverlay from './CVCardOverlay';
import CoverLetterCardOverlay from './CoverLetterCardOverlay';
import JobSidebar from './jobs/JobSidebar';
import CVListView from './CVListView';
import CoverLetterListView from './CoverLetterListView';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { useOptimizedDataFetching } from '@/lib/hooks/useOptimizedDataFetching';
import { formatCardTime } from '@/lib/utils/timeUtils';
import DownloadModal, { DocumentType, FormatType } from '@/components/ui/DownloadModal';
import { CVJourneyLookupService } from '@/lib/services/cvJourneyLookupService';
import { filterMasterCVs, filterRegularCVs } from '@/lib/utils/cvFilterUtils';
import CareerReportSidebar from './CareerReportSidebar';
import CreditExhaustionModal from '@/components/payment/CreditExhaustionModal';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface CV {
  id: string;
  title: string;
  lastModified: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  isStarred: boolean;
  thumbnail?: string; // Make optional to match CVCardOverlay
  description?: string;
  cvData?: any; // CV data structure for preview
  // connectedJobs removed - relationships now managed through CVJourney
  journeyId?: string;
  template?: any;
  templateId?: string;
  templateName?: string;
  templateData?: any; // Saved template data from API
  cvType?: 'master' | 'journey' | 'standalone'; // NEW: Resume Enhancer CV type
  isMaster?: boolean; // Legacy support - new format uses metadata.isMaster
  metadata?: {
    isMaster?: boolean;
    [key: string]: any;
  };
  completionPercentage?: number;
  // Additional fields that CVCardOverlay might need
  atsScore?: number;
  stage?: string; // App stage/status from Journey
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | { address?: string; postalCode?: string; city?: string; countryCode?: string; region?: string };
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';
  appliedDate: string;
  salary?: string;
  description?: string;
}

interface CoverLetter {
  id: string;
  title: string;
  lastModified: string;
  status: 'draft' | 'final' | 'archived';
  views?: number; // Optional to match CoverLetterCardOverlay interface
  isStarred?: boolean;
  thumbnail?: string;
  description?: string;
  coverLetterData?: any;
  // connectedJobs removed - relationships now managed through CVJourney
  completionPercentage?: number;
  content?: string;
  journeyId?: string;
  cvId?: string;
  jobId?: string;
  metadata?: {
    targetCompany?: string;
    targetPosition?: string;
    keywords?: string[];
    wordCount?: number;
    isPublic?: boolean;
    lastModified?: Date;
    version?: number;
  };
}



// Modal Component for Confirmations and Errors
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error' | 'confirmation';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-400" />;
      case 'confirmation':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      default:
        return <AlertCircle className="w-6 h-6 text-blue-400" />;
    }
  };

  const getButtonColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      case 'error':
        return 'bg-red-500 hover:bg-red-600';
      case 'confirmation':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            {getIcon()}
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Content */}
          <p className="text-white/80 mb-6">{message}</p>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            {type === 'confirmation' && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 dark:bg-white/10 hover:bg-gray-600 dark:hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-white rounded-lg transition-colors ${getButtonColors()}`}
            >
              {type === 'confirmation' ? confirmText : 'OK'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Clean Unlinked Button Component
interface CleanUnlinkedButtonProps {
  type: 'cv' | 'cover-letter';
  items: any[];
  journeys: any[];
  onClean: (items: any[]) => void;
  className?: string;
}

const CleanUnlinkedButton: React.FC<CleanUnlinkedButtonProps> = ({
  type,
  items,
  journeys,
  onClean,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [unlinkedItems, setUnlinkedItems] = useState<any[]>([]);

  const checkUnlinkedItems = () => {
    // Get all CV/cover letter IDs that are linked to journeys
    const linkedItemIds = new Set<string>();

    journeys.forEach(journey => {
      if (type === 'cv' && journey.cvId) {
        linkedItemIds.add(String(journey.cvId));
      } else if (type === 'cover-letter' && journey.coverLetterId) {
        linkedItemIds.add(String(journey.coverLetterId));
      }
    });

    // Filter items that are not linked to any journeys
    const unlinked = items.filter(item => {
      // Skip master CVs and non-journey CVs (only clean journey CVs)
      if (type === 'cv' && (item.isMaster || item.cvType !== 'journey')) {
        return false;
      }

      // Check if item is linked to any journey
      // Convert item.id or item._id to string for comparison
      const itemId = item.id || item._id;
      if (!itemId) {
        // If item has no ID, consider it unlinked (should be deleted)
        return true;
      }
      return !linkedItemIds.has(String(itemId));
    });

    setUnlinkedItems(unlinked);
    setIsExpanded(true);
  };

  const handleConfirmClean = () => {
    onClean(unlinkedItems);
    setIsExpanded(false);
    setUnlinkedItems([]);
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setUnlinkedItems([]);
  };

  return (
    <div className="flex items-center gap-2">
      <motion.button
        onClick={checkUnlinkedItems}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${className} ${isExpanded ? 'bg-red-500 text-white hover:bg-red-600' : ''
          }`}
        whileHover={!isExpanded ? { scale: 1.05 } : {}}
        whileTap={!isExpanded ? { scale: 0.95 } : {}}
        disabled={items.length === 0 || isExpanded}
        animate={isExpanded ? { width: 'auto' } : { width: 'auto' }}
      >
        <Trash size={16} />
        <span className="hidden md:inline">Clean Unlinked</span>
        {isExpanded && unlinkedItems.length > 0 && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="ml-1"
          >
            ({unlinkedItems.length})
          </motion.span>
        )}
      </motion.button>

      {isExpanded && unlinkedItems.length > 0 && (
        <>
          <motion.button
            onClick={handleConfirmClean}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all duration-200 flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 'auto' }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Check size={16} />
            <span>Confirm</span>
          </motion.button>
          <motion.button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 'auto' }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X size={16} />
            <span>Cancel</span>
          </motion.button>
        </>
      )}
    </div>
  );
};

const Canvas: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createCV } = useCreateCV();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData, loading: userLoading, error: userError } = useUserData();
  const { openPaymentModal } = usePaymentModal();

  // Use centralized dashboard data context for CVs and cover letters (prevents refetching on navigation)
  const {
    cvs: contextCVs,
    coverLetters: contextCoverLetters,
    secondaryLoading,
    refreshCVs,
    refreshCoverLetters
  } = useDashboardData();

  const [cvs, setCvs] = useState<CV[]>([]);
  const [masterCVs, setMasterCVs] = useState<CV[]>([]);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // CRITICAL: Define loading state early, before functions that use it

  // Track if CVs have been loaded to prevent re-fetching on tab switch  
  const hasLoadedCVsRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const hasInitializedFromContextRef = useRef(false);

  // JobSidebar state (for viewing job details and journeys)
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [selectedJobForJourney, setSelectedJobForJourney] = useState<any>(null);
  const [journeysForSelectedJob, setJourneysForSelectedJob] = useState<any[]>([]);

  // Search and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'lastModified' | 'title' | 'status'>('lastModified');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // Default to list view

  // Career Report Sidebar state
  const [showCareerReportSidebar, setShowCareerReportSidebar] = useState(false);
  const [selectedCVForReport, setSelectedCVForReport] = useState<CV | null>(null);

  // Sync CVs from context to local state (prevents refetching on navigation)
  useEffect(() => {
    // Only initialize from context if not already loaded and context has data
    if (!hasInitializedFromContextRef.current && contextCVs && contextCVs.length > 0) {
      hasInitializedFromContextRef.current = true;

      // Process context CVs with completion percentage and type classification
      const enrichedCVs = contextCVs.map((cv: any) => ({
        id: cv.id || cv._id,
        title: cv.title || 'Untitled CV',
        lastModified: cv.metadata?.lastModified || cv.updatedAt || cv.createdAt,
        updatedAt: cv.updatedAt || cv.metadata?.lastModified || cv.createdAt || new Date().toISOString(),
        status: cv.status || 'draft',
        views: cv.metadata?.viewCount || 0,
        isStarred: cv.metadata?.starred || false,
        thumbnail: cv.metadata?.thumbnailUrl || '',
        description: cv.description || '',
        cvData: cv.cvData || null,
        template: cv.template || cv.templateData || null,
        templateId: cv.templateId,
        templateName: cv.templateName,
        templateData: cv.templateData,
        journeyId: cv.journeyId,
        cvType: cv.cvType || cv.metadata?.cvType || (cv.journeyId ? 'journey' : cv.metadata?.isMaster ? 'master' : 'standalone'),
        completionPercentage: cv.completionPercentage || calculateCompletionPercentage(cv),
        isMaster: cv.metadata?.isMaster === true || cv.isMaster === true,
        atsScore: cv.metadata?.atsScore || cv.atsScore,
        metadata: cv.metadata
      })) as CV[];

      // Split into master and regular CVs
      const masters = filterMasterCVs(enrichedCVs);
      const regulars = filterRegularCVs(enrichedCVs);

      setCvs(regulars);
      setMasterCVs(masters);
      setLoading(false);
      hasLoadedCVsRef.current = true;
    }
  }, [contextCVs]);

  // Update loading state based on context
  useEffect(() => {
    if (!secondaryLoading.cvs && hasInitializedFromContextRef.current) {
      setLoading(false);
    }
  }, [secondaryLoading.cvs]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSortDropdown) {
        const target = event.target as Element;
        if (!target.closest('[data-sort-dropdown]')) {
          setShowSortDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown]);

  // Helper function to get user ID from localStorage
  const getUserIdFromLocalStorage = (): string | null => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = safeJsonParse(userData);
        if (!parsedUser) return null;
        // Return user ID
        return parsedUser.id || parsedUser._id;
      }
    } catch (error) {
      // Silent fail - localStorage parsing failed
    }
    return null;
  };

  // Helper functions for calculating completion percentage (must be before loadCVs)
  const calculatePersonalInfoScore = (basics: any): number => {
    let score = 0;
    let maxScore = 5;

    if (basics.name && basics.name.trim()) score += 1;
    if (basics.email && basics.email.trim()) score += 1;
    if (basics.phone && basics.phone.trim()) score += 1;
    if (basics.location && (basics.location.city || basics.location.address)) score += 1;
    if (basics.summary && basics.summary.trim()) score += 1;

    return (score / maxScore) * 100;
  };

  const calculateExperienceScore = (work: any[]): number => {
    if (!Array.isArray(work) || work.length === 0) return 0;

    let totalScore = 0;
    const maxEntries = 3; // Consider up to 3 most recent experiences

    work.slice(0, maxEntries).forEach(entry => {
      let entryScore = 0;
      let maxEntryScore = 4;

      if (entry.name && entry.name.trim()) entryScore += 1;
      if (entry.position && entry.position.trim()) entryScore += 1;
      if (entry.startDate && entry.startDate.trim()) entryScore += 1;
      if (entry.summary && entry.summary.trim()) entryScore += 1;

      totalScore += (entryScore / maxEntryScore) * 100;
    });

    return Math.min(100, totalScore / Math.min(work.length, maxEntries));
  };

  const calculateEducationScore = (education: any[]): number => {
    if (!Array.isArray(education) || education.length === 0) return 0;

    let totalScore = 0;
    const maxEntries = 2; // Consider up to 2 most recent education entries

    education.slice(0, maxEntries).forEach(entry => {
      let entryScore = 0;
      let maxEntryScore = 3;

      if (entry.institution && entry.institution.trim()) entryScore += 1;
      if (entry.area && entry.area.trim()) entryScore += 1;
      if (entry.startDate && entry.startDate.trim()) entryScore += 1;

      totalScore += (entryScore / maxEntryScore) * 100;
    });

    return Math.min(100, totalScore / Math.min(education.length, maxEntries));
  };

  const calculateSkillsScore = (skills: any[]): number => {
    if (!Array.isArray(skills) || skills.length === 0) return 0;
    return Math.min(100, (skills.length / 10) * 100); // 10 skills = 100%
  };

  const calculateProjectsScore = (projects: any[]): number => {
    if (!Array.isArray(projects) || projects.length === 0) return 0;

    let totalScore = 0;
    const maxEntries = 2; // Consider up to 2 most recent projects

    projects.slice(0, maxEntries).forEach(project => {
      let projectScore = 0;
      let maxProjectScore = 3;

      if (project.name && project.name.trim()) projectScore += 1;
      if (project.description && project.description.trim()) projectScore += 1;
      if (project.url && project.url.trim()) projectScore += 1;

      totalScore += (projectScore / maxProjectScore) * 100;
    });

    return Math.min(100, totalScore / Math.min(projects.length, maxEntries));
  };

  const calculateCompletionPercentage = (cv: any): number => {
    // If CV is published, it's considered complete
    if (cv.status === 'published') return 100;

    // If CV is archived, return 0
    if (cv.status === 'archived') return 0;

    // Calculate completion based on CV sections
    let totalScore = 0;
    let maxScore = 0;

    // Section weights (total = 100)
    const sectionWeights = {
      personalInfo: 25,    // Name, email, phone, location, summary
      experience: 30,      // Work experience entries
      education: 20,       // Education entries
      skills: 15,          // Skills and competencies
      projects: 10         // Projects and achievements
    };

    // Check personal info section
    if (cv.cvData?.basics) {
      const basics = cv.cvData.basics;
      const personalInfoScore = calculatePersonalInfoScore(basics);
      totalScore += (personalInfoScore * sectionWeights.personalInfo) / 100;
    }
    maxScore += sectionWeights.personalInfo;

    // Check experience section
    if (cv.cvData?.work) {
      const experienceScore = calculateExperienceScore(cv.cvData.work);
      totalScore += (experienceScore * sectionWeights.experience) / 100;
    }
    maxScore += sectionWeights.experience;

    // Check education section
    if (cv.cvData?.education) {
      const educationScore = calculateEducationScore(cv.cvData.education);
      totalScore += (educationScore * sectionWeights.education) / 100;
    }
    maxScore += sectionWeights.education;

    // Check skills section
    if (cv.cvData?.skills) {
      const skillsScore = calculateSkillsScore(cv.cvData.skills);
      totalScore += (skillsScore * sectionWeights.skills) / 100;
    }
    maxScore += sectionWeights.skills;

    // Check projects section
    if (cv.cvData?.projects) {
      const projectsScore = calculateProjectsScore(cv.cvData.projects);
      totalScore += (projectsScore * sectionWeights.projects) / 100;
    }
    maxScore += sectionWeights.projects;

    // Calculate final percentage
    const completionPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Ensure percentage is between 0 and 100
    return Math.max(0, Math.min(100, completionPercentage));
  };

  // CRITICAL FIX: Load functions must be defined before they're used in useEffect and handlers
  // Unified function to load all document data (CVs, journeys, and cover letters in one batch)
  const loadAllCVData = useCallback(async (userId?: string) => {
    try {
      const userIdToUse = userId || getUserIdForAPI(user);

      if (!userIdToUse) {
        setCvs([]);
        setMasterCVs([]);
        setCoverLetters([]);
        return;
      }

      // Prevent re-fetching on tab switch - only fetch if user ID changed or first load
      if (hasLoadedCVsRef.current && lastUserIdRef.current === userIdToUse) {
        return;
      }

      // Mark as loading for this user
      hasLoadedCVsRef.current = true;
      lastUserIdRef.current = userIdToUse;

      setLoading(true);

      // Load CVs and cover letters in parallel for better performance
      const [cvsResult, coverLettersResponse] = await Promise.allSettled([
        UnifiedCVService.getCVs(userIdToUse, { projection: 'summary' }),
        authenticatedFetch(`/api/cover-letters?userId=${userIdToUse}`)
      ]);

      // Process CVs
      if (cvsResult.status === 'fulfilled' && cvsResult.value && Array.isArray(cvsResult.value) && cvsResult.value.length > 0) {
        // Process CVs with unified data structure
        const enrichedCVs = cvsResult.value.map((cv: any) => {
          return {
            id: cv.id,
            title: cv.title || 'Untitled CV',
            lastModified: cv.metadata?.lastModified || cv.updatedAt || cv.createdAt,
            updatedAt: cv.updatedAt || cv.metadata?.lastModified || cv.createdAt || new Date().toISOString(),
            status: cv.status || 'draft',
            views: cv.metadata?.viewCount || 0,
            isStarred: cv.metadata?.starred || false,
            thumbnail: cv.metadata?.thumbnailUrl || '',
            description: cv.description || '',
            cvData: cv.cvData || null, // Include CV data for preview
            template: cv.template || cv.templateData || (cv.templateId ? { _id: cv.templateId, name: cv.templateName || 'Default Template' } : null), // Include template data for preview - prioritize saved templateData
            templateId: cv.templateId,
            templateName: cv.templateName,
            templateData: cv.templateData, // Include saved template data
            journeyId: cv.journeyId,
            // Prioritize explicit cvType from API, then check metadata.cvType, then infer from journeyId/isMaster
            cvType: cv.cvType || cv.metadata?.cvType || (cv.journeyId ? 'journey' : cv.metadata?.isMaster ? 'master' : 'standalone'), // Include CV type
            completionPercentage: calculateCompletionPercentage(cv),
            // Include master flag - Master CV: isMaster: true OR createdVia: 'ai-career-report'
            // Regular CV: isMaster: false (and if createdVia: 'journey', it's definitely a regular CV)
            isMaster: cv.metadata?.isMaster === true ||
              cv.metadata?.isMaster === 'true' ||
              cv.isMaster === true ||
              cv.metadata?.createdVia === 'ai-career-report',
            atsScore: cv.metadata?.atsScore, // Single source of truth from CentralScoreManager
            metadata: cv.metadata // Include full metadata
          } as CV;
        });

        // Use utility functions to filter Master CVs and regular CVs
        const masterCVs = filterMasterCVs(enrichedCVs);
        const regularCVs = filterRegularCVs(enrichedCVs);

        // Store both Master CVs and regular CVs
        setCvs(regularCVs);
        setMasterCVs(masterCVs);

        // Performance optimization: Load journeys in batch for all CVs
        // This eliminates N+1 query problem (one API call instead of N calls)
        if (regularCVs.length > 0 || masterCVs.length > 0) {
          const allCVIds = [...regularCVs, ...masterCVs].map(cv => cv.id).filter(Boolean);
          if (allCVIds.length > 0) {
            try {
              const journeysMap = await CVJourneyLookupService.findJourneysByCVIds(allCVIds, userIdToUse);
              // Convert map to array format expected by Canvas
              const journeysArray = Array.from(journeysMap.values());
              if (journeysArray.length > 0) {
                setJourneys(journeysArray);
              }
            } catch (error) {
              console.error('Error batch loading journeys:', error);
            }
          }
        }
      } else {
        setCvs([]);
        setMasterCVs([]);
      }

      // Process Cover Letters
      if (coverLettersResponse.status === 'fulfilled' && coverLettersResponse.value) {
        try {
          const result = await coverLettersResponse.value.json();

          if (result.success && result.data?.coverLetters) {
            const coverLettersArray = Array.isArray(result.data.coverLetters)
              ? result.data.coverLetters
              : [];

            const enrichedCoverLetters = coverLettersArray.map((cl: any) => {
              const rawDate = new Date(cl.metadata?.lastModified || cl.updatedAt || cl.createdAt);
              return {
                ...cl,
                id: cl.id || cl._id,
                lastModified: formatCardTime(rawDate), // Formatted string for display
                lastModifiedDate: rawDate, // Raw date for sorting
                views: cl.views || 0,
                isStarred: cl.isStarred || false,
                thumbnail: '/api/cover-letters/thumbnail/' + (cl.id || cl._id),
                description: cl.metadata?.targetCompany ? `For ${cl.metadata.targetCompany}` : 'Cover letter',
                coverLetterData: cl.content,
                content: cl.content, // Add content field for the overlay component
                journeyId: cl.journeyId, // Include journeyId for navigation
                cvId: cl.cvId, // Include cvId for navigation
                jobId: cl.jobId, // Include jobId for navigation
                // connectedJobs removed - relationships now managed through CVJourney
                completionPercentage: cl.completionPercentage || 0
              };
            });

            setCoverLetters(enrichedCoverLetters);
          } else {
            setCoverLetters([]);
          }
        } catch (error) {
          console.error('Error processing cover letters:', error);
          setCoverLetters([]);
        }
      } else if (coverLettersResponse.status === 'rejected') {
        console.error('Error loading cover letters:', coverLettersResponse.reason);
        setCoverLetters([]);
      }
    } catch (error: any) {
      console.error('Error loading document data:', error);
      // Don't clear data on error - keep existing ones if any
    } finally {
      setLoading(false);
    }
  }, [user]);



  // Available Jobs state
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);

  // Load Available Jobs function
  const fetchAvailableJobs = useCallback(async () => {
    try {
      const userId = getUserIdForAPI(user);
      if (!userId) {
        return;
      }

      const response = await authenticatedFetch(`/api/jobs?userId=${userId}`);
      const result = await response.json();

      if (result.success && result.data?.jobs) {
        setAvailableJobs(result.data.jobs);
      } else {
        setAvailableJobs([]);
      }
    } catch (error) {
      console.error('Error loading Available Jobs:', error);
      setAvailableJobs([]);
    }
  }, [user]);

  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [selectedCVForDownload, setSelectedCVForDownload] = useState<CV | null>(null);
  const [selectedCoverLetterForDownload, setSelectedCoverLetterForDownload] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCV = async (cv: CV) => {
    setSelectedCVForDownload(cv);
    setSelectedCoverLetterForDownload(null);
    setDownloadModalOpen(true);
  };

  const handleDownloadCoverLetter = async (coverLetter: any) => {
    setSelectedCoverLetterForDownload(coverLetter);
    setSelectedCVForDownload(null);
    setDownloadModalOpen(true);
  };

  const handleDownload = async (documentType: DocumentType, format: FormatType) => {
    if (!selectedCVForDownload && !selectedCoverLetterForDownload) return;

    setIsDownloading(true);
    try {
      const userId = getUserIdForAPI(user) || getUserIdFromLocalStorage();

      if (selectedCVForDownload) {
        // CV download
        if (documentType === 'cv') {
          if (format === 'pdf') {
            window.open(`/api/cvs/${selectedCVForDownload.id}/download?format=pdf`, '_blank');
          } else {
            const response = await fetch(`/api/cvs/${selectedCVForDownload.id}/download?format=${format}`);
            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${selectedCVForDownload.title || 'CV'}.${format}`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            }
          }
        } else if (documentType === 'cvAndCoverLetter') {
          // Download CV first, then cover letter
          const journey = await CVJourneyLookupService.findJourneyByCVId(selectedCVForDownload.id, userId || '');
          if (journey?.coverLetterId) {
            // Download CV
            if (format === 'pdf') {
              window.open(`/api/cvs/${selectedCVForDownload.id}/download?format=pdf`, '_blank');
            }
            // Wait a bit then download cover letter
            setTimeout(() => {
              window.open(`/api/cover-letters/${journey.coverLetterId}?format=${format}`, '_blank');
            }, 500);
          }
        } else if (documentType === 'all') {
          // Try to find journey for CV to download all documents
          const journey = await CVJourneyLookupService.findJourneyByCVId(selectedCVForDownload.id, userId || '');
          if (journey?.journeyId) {
            window.open(`/api/application-journey/${journey.journeyId}/download?type=all`, '_blank');
          } else {
            // No journey, just download CV
            window.open(`/api/cvs/${selectedCVForDownload.id}/download`, '_blank');
          }
        }
      } else if (selectedCoverLetterForDownload) {
        // Cover Letter download
        if (documentType === 'coverLetter') {
          if (format === 'pdf') {
            window.open(`/api/cover-letters/${selectedCoverLetterForDownload.id}?format=pdf`, '_blank');
          } else {
            // For DOCX/DOC, might need to check if there's an export endpoint
            window.open(`/api/cover-letters/${selectedCoverLetterForDownload.id}/download?format=${format}`, '_blank');
          }
        } else if (documentType === 'cvAndCoverLetter') {
          // Download cover letter first, then CV
          const journey = await CVJourneyLookupService.findJourneyByCoverLetterId(selectedCoverLetterForDownload.id, userId || '');
          if (journey?.cvId) {
            // Download cover letter
            if (format === 'pdf') {
              window.open(`/api/cover-letters/${selectedCoverLetterForDownload.id}?format=pdf`, '_blank');
            }
            // Wait a bit then download CV
            setTimeout(() => {
              window.open(`/api/cvs/${journey.cvId}/download?format=${format}`, '_blank');
            }, 500);
          }
        } else if (documentType === 'all') {
          // Try to find journey for cover letter to download all documents
          const journey = await CVJourneyLookupService.findJourneyByCoverLetterId(selectedCoverLetterForDownload.id, userId || '');
          if (journey?.journeyId) {
            window.open(`/api/application-journey/${journey.journeyId}/download?type=all`, '_blank');
          } else {
            // No journey, just download cover letter
            window.open(`/api/cover-letters/${selectedCoverLetterForDownload.id}/download`, '_blank');
          }
        }
      }

      setDownloadModalOpen(false);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareCV = async (cv: CV) => {
    try {
      // Copy shareable link to clipboard
      const shareUrl = `${window.location.origin}/shared/cv/${cv.id}`;
      await navigator.clipboard.writeText(shareUrl);
      // Removed notification:'success', 'Share link copied to clipboard!');
    } catch (error) {
      // Removed notification:'error', 'Failed to share CV');
    }
  };

  // Optimistic UI: Delete CV with immediate feedback and rollback on error
  const handleDeleteCV = async (cv: CV) => {
    // Store original state for rollback
    const originalCvs = [...cvs];

    // Optimistic update: Remove from UI immediately
    setCvs(cvs.filter(c => c.id !== cv.id));

    try {
      await deleteCV(cv.id);
    } catch (error) {
      // Rollback on error
      console.error('Error deleting CV:', error);
      setCvs(originalCvs);
      // Removed notification:'error', 'Failed to delete CV');
    }
  };

  const handleEditJourney = async (cv: CV, journey: any) => {
    try {
      const userId = getUserIdForAPI(user);
      if (!userId) {
        console.error('User not authenticated');
        return;
      }

      // Fetch the job details for the journey using authenticatedFetch
      const jobResponse = await authenticatedFetch(`/api/jobs/${journey.jobId}`);
      if (jobResponse.ok) {
        const jobResult = await jobResponse.json();
        if (jobResult.success) {
          setSelectedJobForJourney(jobResult.data);

          // Fetch journeys for this job using authenticatedFetch
          const journeysResponse = await authenticatedFetch(`/api/application-journey?jobId=${journey.jobId}`);
          if (journeysResponse.ok) {
            const journeysResult = await journeysResponse.json();
            if (journeysResult.success) {
              setJourneysForSelectedJob(journeysResult.data.journeys || []);
            }
          }

          setShowJourneyModal(true);
        } else {
          console.error('Failed to load job details:', jobResult.error);
        }
      } else {
        const errorData = await jobResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to load job details:', errorData);
      }
    } catch (error) {
      console.error('Failed to open journey details:', error);
    }
  };

  // loading state is already defined above (line ~392) before functions that use it
  const [editingCVId, setEditingCVId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingCVId, setDeletingCVId] = useState<string | null>(null);

  // Cover Letter editing states
  const [editingCoverLetterId, setEditingCoverLetterId] = useState<string | null>(null);
  const [editingCoverLetterTitle, setEditingCoverLetterTitle] = useState('');
  // Initialize activeTab from URL parameter if present, otherwise default to 'cv'
  const initialTab = searchParams.get('tab') === 'coverLetter' ? 'coverLetter' : 'cv';
  const [activeTab, setActiveTab] = useState<'cv' | 'coverLetter'>(initialTab as 'cv' | 'coverLetter');
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  // availableJobs is already defined above (line 850) before fetchAvailableJobs
  const [linkingJobCVId, setLinkingJobCVId] = useState<string | null>(null);

  // Modal state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'confirmation';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });

  const showModalDialog = (config: Omit<typeof modalConfig, 'isOpen'>) => {
    setModalConfig({ ...config, isOpen: true });
  };

  const hideModalDialog = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Load CVs and Cover Letters from API
  useEffect(() => {
    // Guard: Ensure we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Check if user is returning from onboarding
    const fromOnboarding = sessionStorage.getItem('fromOnboarding') === 'true';
    if (fromOnboarding) {
      sessionStorage.removeItem('fromOnboarding'); // Clear the flag
    }

    // Use unified authentication
    const userId = getUserIdForAPI(user);
    if (!userId) {
      setLoading(false);
      return;
    }

    // Prevent re-fetching on tab switch - only fetch if user ID changed or first load
    if (hasLoadedCVsRef.current && lastUserIdRef.current === userId) {
      return;
    }

    // Reset refs if user ID actually changed (different user logged in)
    if (lastUserIdRef.current && lastUserIdRef.current !== userId) {
      hasLoadedCVsRef.current = false;
    }

    // Load data for this user with error handling
    // Use Promise.allSettled to prevent one failure from blocking others
    let isMounted = true;

    const loadData = async () => {
      try {
        // Load CVs, journeys, and cover letters together (unified function)
        await loadAllCVData(userId).catch(err => {
          console.error('Error loading document data:', err);
        });

        // Load jobs in parallel
        if (isMounted) {
          await fetchAvailableJobs().catch(err => {
            console.error('Error loading jobs:', err);
          });
        }
      } catch (error) {
        console.error('Error in loadData:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user?.id, loadAllCVData, fetchAvailableJobs]);

  // Handle URL parameters to set active tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'coverLetter' && activeTab !== 'coverLetter') {
      setActiveTab('coverLetter');
    } else if (tabParam === 'cv' && activeTab !== 'cv') {
      setActiveTab('cv');
    }
  }, [searchParams, activeTab]);

  // Handle URL parameters to open report sidebar for master CV
  useEffect(() => {
    const openReport = searchParams.get('openReport');
    const cvId = searchParams.get('cvId');

    // Only proceed if openReport is true and CVs have been loaded
    if (openReport === 'true' && (masterCVs.length > 0 || cvs.length > 0) && !loading) {
      let targetCV: CV | null = null;

      // If cvId is specified, find that CV
      if (cvId) {
        targetCV = [...masterCVs, ...cvs].find(cv => cv.id === cvId) || null;
      } else {
        // Otherwise, use the master CV
        targetCV = masterCVs.length > 0 ? masterCVs[0] : null;
      }

      if (targetCV) {
        // Open the report sidebar for the target CV
        // Use the handleViewCareerReport function logic directly here to avoid dependency issues
        const openReportForCV = async (cv: CV) => {
          try {
            console.log('🔍 Canvas - Opening career report for CV from URL param:', cv.id, cv.title);

            // Fetch full CV data with metadata first (before opening sidebar)
            const cvResponse = await fetch(`/api/cvs/${cv.id}`);
            const cvResult = await cvResponse.json();

            if (cvResult.success && cvResult.data?.cv) {
              const fullCV: CV = {
                ...cv,
                ...cvResult.data.cv,
                metadata: {
                  ...cv.metadata,
                  ...cvResult.data.cv.metadata,
                  // Ensure aiAnalysis is included
                  aiAnalysis: cvResult.data.cv.metadata?.aiAnalysis || cv.metadata?.aiAnalysis
                },
                cvData: cvResult.data.cv.cvData || cv.cvData
              };

              // Set CV and open sidebar with complete data
              setSelectedCVForReport(fullCV);
              setShowCareerReportSidebar(true);
            } else {
              // Use basic CV data and open sidebar
              setSelectedCVForReport(cv);
              setShowCareerReportSidebar(true);
            }
          } catch (error) {
            console.error('❌ Canvas - Error loading CV for report:', error);
            // Use basic CV data and open sidebar (FullCareerReport will try to fetch)
            setSelectedCVForReport(cv);
            setShowCareerReportSidebar(true);
          }
        };

        openReportForCV(targetCV);

        // Clean up URL parameters
        const url = new URL(window.location.href);
        url.searchParams.delete('openReport');
        url.searchParams.delete('cvId');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams, masterCVs, cvs, loading]);

  // Handle CV creation (moved after load functions to avoid initialization issues)
  const handleCreateCV = async () => {
    try {
      const userId = getUserIdForAPI(user);
      if (userId) {
        await createCV({ userId });
      }
    } catch (error) {
      // Removed notification:'error', 'Failed to create CV');
    }
  };

  // Master CV handlers (moved after load functions)
  const handleEditMasterCV = async (masterCV: any) => {
    try {
      // Route Master CV edit into Resume Enhancer (replaces legacy studio edit flow)
      router.push(`/resume-enhancer?mode=edit&cvId=${masterCV.id}`);
    } catch (error) {
      console.error('Failed to route to ai-career-report for master CV editing:', error);
    }
  };

  const handleDuplicateMasterCV = async (masterCV: any) => {
    try {
      const userId = getUserIdForAPI(user) || getUserIdFromLocalStorage();
      if (!userId) {
        return;
      }

      // Use UnifiedCVService to duplicate CV (Standard CRUD operation)
      const duplicateCV = await UnifiedCVService.duplicateCV(
        masterCV.id,
        `${masterCV.title} (Copy)`,
        userId
      );

      if (duplicateCV && duplicateCV.id) {
        // Navigate to resume-enhancer with duplicated CV (standalone mode, ready for job linking)
        router.push(`/resume-enhancer?mode=edit&cvId=${duplicateCV.id}`);
      } else {
        throw new Error('Failed to duplicate master CV');
      }
    } catch (error: any) {
      console.error('Failed to duplicate master CV', error);

      // Check for limit exhaustion error (403 with requiresUpgrade flag)
      try {
        const userId = getUserIdForAPI(user) || getUserIdFromLocalStorage();
        if (!userId) return;

        const response = await authenticatedFetch('/api/cvs/duplicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceCvId: masterCV.id,
            customTitle: `${masterCV.title} (Copy)`,
            userId
          }),
        });

        if (response.status === 403) {
          const result = await response.json();
          if (result.requiresUpgrade) {
            setShowLimitModal(true);
            return;
          }
        }
      } catch (innerError) {
        // If the direct fetch also fails or if we are just falling back
        console.error("Direct duplicate check failed for master CV", innerError);
      }
    }
  };

  // Modal state for credit exhaustion
  const [showLimitModal, setShowLimitModal] = useState(false);

  // CV Card handlers (moved after load functions and wrapped in useCallback to ensure loadCVs is available)
  const handleDuplicateCV = useCallback(async (cv: CV) => {
    try {
      const userId = getUserIdForAPI(user) || getUserIdFromLocalStorage();
      if (!userId) {
        return;
      }

      // Use UnifiedCVService to duplicate CV
      const duplicateCV = await UnifiedCVService.duplicateCV(
        cv.id,
        `${cv.title} (Copy)`,
        userId
      );

      if (duplicateCV && duplicateCV.id) {
        // Refresh CVs list
        loadAllCVData();

        // If the source CV was linked to a journey, inform user about the duplication principle
        if (cv.journeyId) {
          // Logic for notification can be added here if needed
        }
      } else {
        throw new Error('Failed to duplicate CV');
      }
    } catch (error: any) {
      console.error('Failed to duplicate CV', error);

      // Check for limit exhaustion error (403 with requiresUpgrade flag)
      // The UnifiedCVService might throw an error object or we might need to parse the response manually if we were using fetch directly.
      // Since UnifiedCVService throws Error, we check the error message or properties if attached.
      // However, UnifiedCVService currently throws generic errors for non-200.
      // We might need to update UnifiedCVService to pass through the status/data or handle it here if we refactor to use fetch directly or check error props.

      // Let's refactor to use authenticatedFetch directly here to have full control over the response handling for this specific case,
      // OR better, checking if the error message contains the specific string we sent from backend or if UnifiedCVService attaches the response.

      // Since we didn't modifying UnifiedCVService to pass the 'requiresUpgrade' flag, 
      // we'll quickly try to use authenticatedFetch directly to catch the 403 cleanly.

      try {
        const userId = getUserIdForAPI(user) || getUserIdFromLocalStorage();
        if (!userId) return;

        const response = await authenticatedFetch('/api/cvs/duplicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceCvId: cv.id,
            customTitle: `${cv.title} (Copy)`,
            userId
          }),
        });

        if (response.status === 403) {
          const result = await response.json();
          if (result.requiresUpgrade) {
            setShowLimitModal(true);
            return;
          }
        }

        if (!response.ok) {
          throw new Error('Failed to duplicate');
        }

        // If successful (and redo because the first Service call failed/threw)
        loadAllCVData();

      } catch (innerError) {
        // If the direct fetch also fails or if we are just falling back
        console.error("Direct duplicate attempt failed", innerError);
      }
    }
  }, [user, loadAllCVData]);

  const formatTimeAgo = (date: Date) => {
    return formatCardTime(date);
  };



  // Optimistic UI: Toggle star with immediate feedback and rollback on error
  const toggleStar = async (id: string) => {
    // Store original state for rollback
    const originalCvs = [...cvs];
    const cv = cvs.find(c => c.id === id);
    const newStarredState = !cv?.isStarred;

    // Optimistic update: Update UI immediately
    setCvs(cvs.map(cv =>
      cv.id === id ? { ...cv, isStarred: newStarredState } : cv
    ));

    try {
      // Execute the actual API call
      const response = await authenticatedFetch(`/api/cvs/${id}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: newStarredState })
      });

      if (!response.ok) {
        throw new Error('Failed to update star status');
      }
    } catch (error) {
      // Rollback on error
      console.error('Error toggling star:', error);
      setCvs(originalCvs);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-400 bg-green-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      case 'archived': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-white/60 bg-white/10';
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'text-blue-400 bg-blue-400/10';
      case 'screening': return 'text-yellow-400 bg-yellow-400/10';
      case 'interview': return 'text-orange-400 bg-orange-400/10';
      case 'offer': return 'text-green-400 bg-green-400/10';
      case 'rejected': return 'text-red-400 bg-red-400/10';
      default: return 'text-white/60 bg-white/10';
    }
  };

  const getCoverLetterStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-400 bg-green-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      case 'archived': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-white/60 bg-white/10';
    }
  };

  const handleCVClick = async (cv: CV) => {
    try {
      // All CV edits should open Resume Enhancer (replaces legacy studio)
      router.push(`/resume-enhancer?mode=edit&cvId=${cv.id}`);
    } catch (error) {
      console.error('Error navigating to resume-enhancer:', error);
      // Fallback: still attempt to open resume-enhancer
      router.push(`/resume-enhancer?mode=edit&cvId=${cv.id}`);
    }
  };

  const handleViewCareerReport = async (cv: CV) => {
    try {
      console.log('🔍 Canvas - Opening career report for CV:', cv.id, cv.title);

      // Fetch full CV data with metadata first (before opening sidebar)
      const cvResponse = await fetch(`/api/cvs/${cv.id}`);
      const cvResult = await cvResponse.json();

      if (cvResult.success && cvResult.data?.cv) {
        const fullCV: CV = {
          ...cv,
          ...cvResult.data.cv,
          metadata: {
            ...cv.metadata,
            ...cvResult.data.cv.metadata,
            // Ensure aiAnalysis is included
            aiAnalysis: cvResult.data.cv.metadata?.aiAnalysis || cv.metadata?.aiAnalysis
          },
          cvData: cvResult.data.cv.cvData || cv.cvData
        };
        console.log('✅ Canvas - CV data loaded successfully with metadata:', {
          id: fullCV.id,
          hasAiAnalysis: !!fullCV.metadata?.aiAnalysis
        });

        // Set CV and open sidebar with complete data
        setSelectedCVForReport(fullCV);
        setShowCareerReportSidebar(true);
      } else {
        console.warn('⚠️ Canvas - CV fetch returned no data, using basic CV');
        // Use basic CV data and open sidebar
        setSelectedCVForReport(cv);
        setShowCareerReportSidebar(true);
      }
    } catch (error) {
      console.error('❌ Canvas - Error loading CV for report:', error);
      // Use basic CV data and open sidebar (FullCareerReport will try to fetch)
      setSelectedCVForReport(cv);
      setShowCareerReportSidebar(true);
    }
  };

  const handleCVSelectForReport = async (cv: CV) => {
    await handleViewCareerReport(cv);
  };

  const startEditing = (cv: CV) => {
    setEditingCVId(cv.id);
    setEditingTitle(cv.title);
  };

  const saveTitle = async (cvId: string) => {
    try {
      // Get user ID from session or Firebase
      let userId = getUserIdForAPI(user);
      if (!userId) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = safeJsonParse(userData);
            if (parsedUser.id || parsedUser._id) {
              userId = parsedUser.id || parsedUser._id;
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      }

      if (!userId) {
        console.error('No user ID available for title update');
        showModalDialog({
          title: 'Authentication Error',
          message: 'Please log in again to continue.',
          type: 'error' as const
        });
        return;
      }

      // Make API call to update the CV title
      const response = await authenticatedFetch(`/api/cvs/${cvId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editingTitle,
          userId: userId
        }),
      });

      if (response.ok) {
        // Update local state only after successful API call
        setCvs(cvs.map(cv =>
          cv.id === cvId ? { ...cv, title: editingTitle } : cv
        ));
        setEditingCVId(null);
        setEditingTitle('');
      } else {
        const errorData = await response.json();
        console.error('Error updating CV title:', errorData);
        showModalDialog({
          title: 'Update Failed',
          message: 'Failed to update CV title. Please try again.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error saving CV title:', error);
      showModalDialog({
        title: 'Update Error',
        message: 'Error updating CV title. Please try again.',
        type: 'error'
      });
    }
  };

  const cancelEditing = () => {
    setEditingCVId(null);
    setEditingTitle('');
  };

  // Cover Letter editing handlers
  const startEditingCoverLetter = (coverLetter: CoverLetter) => {
    setEditingCoverLetterId(coverLetter.id);
    setEditingCoverLetterTitle(coverLetter.title);
  };

  const saveCoverLetterTitle = async (coverLetterId: string) => {
    try {
      // Get user ID from session or Firebase
      let userId = getUserIdForAPI(user);
      if (!userId) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = safeJsonParse(userData);
            if (parsedUser.id || parsedUser._id) {
              userId = parsedUser.id || parsedUser._id;
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      }

      if (!userId) {
        console.error('No user ID available for title update');
        // Removed notification:'error', 'Please log in again to continue.');
        return;
      }

      // Make API call to update the cover letter title
      const response = await authenticatedFetch(`/api/cover-letters/${coverLetterId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editingCoverLetterTitle,
          userId: userId
        }),
      });

      if (response.ok) {
        // Update local state only after successful API call
        setCoverLetters(coverLetters.map(cl =>
          cl.id === coverLetterId ? { ...cl, title: editingCoverLetterTitle } : cl
        ));
        setEditingCoverLetterId(null);
        setEditingCoverLetterTitle('');
        // Removed notification:'success', 'Cover letter title updated successfully');
      } else {
        const errorData = await response.json();
        console.error('Error updating cover letter title:', errorData);
        // Removed notification:'error', 'Failed to update cover letter title. Please try again.');
      }
    } catch (error) {
      console.error('Error saving cover letter title:', error);
      // Removed notification:'error', 'Error updating cover letter title. Please try again.');
    }
  };

  const cancelEditingCoverLetter = () => {
    setEditingCoverLetterId(null);
    setEditingCoverLetterTitle('');
  };

  // Optimistic UI: Delete cover letter with immediate feedback and rollback on error
  const handleDeleteCoverLetter = async (coverLetter: CoverLetter) => {
    // Store original state for rollback
    const originalCoverLetters = [...coverLetters];

    // Optimistic update: Remove from UI immediately
    setCoverLetters(coverLetters.filter(cl => cl.id !== coverLetter.id));

    try {
      const userId = getUserIdForAPI(user);
      if (!userId) {
        throw new Error('User not authenticated for cover letter deletion');
      }

      const response = await authenticatedFetch(`/api/cover-letters/${coverLetter.id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete cover letter');
      }

      const result = await response.json().catch(() => ({}));
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      console.log(`Successfully deleted cover letter: ${coverLetter.title}`);
    } catch (error) {
      // Rollback on error
      console.error('Error deleting cover letter:', {
        coverLetterId: coverLetter.id,
        title: coverLetter.title,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setCoverLetters(originalCoverLetters);
    }
  };

  // Clean unlinked CVs handler
  const handleCleanUnlinkedCVs = async (unlinkedCVs: any[]) => {
    try {
      const userId = getUserIdForAPI(user);
      if (!userId) {
        console.error('User not authenticated for CV deletion');
        return;
      }

      console.log('🔍 handleCleanUnlinkedCVs - Starting deletion', {
        count: unlinkedCVs.length,
        userId,
        cvs: unlinkedCVs.map(cv => ({
          id: cv.id || cv._id,
          title: cv.title,
          hasId: !!cv.id,
          has_id: !!cv._id
        }))
      });

      let deletedCount = 0;
      let failedCount = 0;

      // Delete each unlinked CV
      for (const cv of unlinkedCVs) {
        // Ensure we have a valid ID - check both id and _id fields
        const cvId = cv.id || cv._id;
        const cvTitle = cv.title || cv.name || 'Unknown CV';

        try {
          if (!cvId) {
            console.error(`CV missing ID: ${cvTitle}`, {
              hasTitle: !!cv.title,
              hasName: !!cv.name,
              hasId: !!cv.id,
              has_id: !!cv._id
            });
            failedCount++;
            continue;
          }

          // Validate ObjectId format before making request (MongoDB ObjectId is 24 hex characters)
          const objectIdRegex = /^[0-9a-fA-F]{24}$/;
          if (!objectIdRegex.test(cvId)) {
            console.error(`Invalid CV ID format: ${cvId}`, {
              cvTitle: cvTitle,
              cvId: cvId
            });
            failedCount++;
            continue;
          }

          const response = await authenticatedFetch(`/api/cvs/${cvId}?userId=${userId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`Failed to delete CV: ${cvTitle}`, {
              cvId: cvId,
              userId,
              status: response.status,
              statusText: response.statusText,
              error: errorData.error || errorData.message || 'Unknown error',
              response: errorData
            });
            failedCount++;
          } else {
            const result = await response.json().catch(() => ({ success: false }));
            if (result.success !== false) {
              deletedCount++;
              console.log(`✅ Successfully deleted CV: ${cvTitle}`, {
                cvId: cvId
              });
            } else {
              console.error(`Failed to delete CV: ${cvTitle}`, {
                cvId: cvId,
                error: result.error || 'Unknown error'
              });
              failedCount++;
            }
          }
        } catch (error) {
          console.error(`Error deleting CV: ${cvTitle}`, {
            cvId: cvId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          failedCount++;
        }
      }

      // Refresh CVs list - reset refs to force fresh fetch
      hasLoadedCVsRef.current = false;
      lastUserIdRef.current = null;
      await loadAllCVData(userId);

      if (deletedCount > 0) {
        console.log(`✅ Successfully deleted ${deletedCount} unlinked CV(s)`);
      }
      if (failedCount > 0) {
        console.warn(`⚠️ Failed to delete ${failedCount} CV(s)`);
      }
    } catch (error) {
      console.error('Clean unlinked CVs error:', error);
    }
  };

  // Clean unlinked cover letters handler
  const handleCleanUnlinkedCoverLetters = async (unlinkedCoverLetters: any[]) => {
    try {
      const userId = getUserIdForAPI(user);
      if (!userId) {
        console.error('User not authenticated for cover letter deletion');
        return;
      }

      console.log('🔍 handleCleanUnlinkedCoverLetters - Starting deletion', {
        count: unlinkedCoverLetters.length,
        userId,
        coverLetters: unlinkedCoverLetters.map(cl => ({
          id: cl.id || cl._id,
          title: cl.title,
          hasId: !!cl.id,
          has_id: !!cl._id
        }))
      });

      let deletedCount = 0;
      let failedCount = 0;

      // Delete each unlinked cover letter
      for (const coverLetter of unlinkedCoverLetters) {
        // Ensure we have a valid ID - check both id and _id fields (declared outside try for catch block access)
        const coverLetterId = coverLetter.id || coverLetter._id;
        const coverLetterTitle = coverLetter.title || coverLetter.name || 'Unknown Cover Letter';

        try {

          if (!coverLetterId) {
            console.error(`Cover letter missing ID: ${coverLetterTitle}`, {
              hasTitle: !!coverLetter.title,
              hasName: !!coverLetter.name,
              hasId: !!coverLetter.id,
              has_id: !!coverLetter._id
            });
            failedCount++;
            continue;
          }

          // Validate ObjectId format before making request (MongoDB ObjectId is 24 hex characters)
          const objectIdRegex = /^[0-9a-fA-F]{24}$/;
          if (!objectIdRegex.test(coverLetterId)) {
            console.error(`Invalid cover letter ID format: ${coverLetterId}`, {
              coverLetterTitle: coverLetterTitle,
              coverLetterId: coverLetterId
            });
            failedCount++;
            continue;
          }

          const response = await authenticatedFetch(`/api/cover-letters/${coverLetterId}?userId=${userId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            // Build error object without empty objects
            const errorInfo: any = {
              coverLetterId: coverLetterId,
              userId,
              status: response.status,
              statusText: response.statusText,
              error: errorData.error || errorData.message || 'Unknown error'
            };
            // Only include responseBody if it has meaningful content
            if (errorData && typeof errorData === 'object' && Object.keys(errorData).length > 0) {
              const hasContent = Object.keys(errorData).some(key => {
                const value = errorData[key];
                return value !== null && value !== undefined && value !== '';
              });
              if (hasContent) {
                errorInfo.responseBody = errorData;
              }
            }
            console.error(`Failed to delete cover letter: ${coverLetterTitle}`, errorInfo);
            failedCount++;
          } else {
            const result = await response.json().catch(() => ({ success: false }));
            if (result.success) {
              deletedCount++;
              console.log(`Successfully deleted cover letter: ${coverLetterTitle}`, {
                coverLetterId: coverLetterId
              });
            } else {
              // Build error object without empty objects
              const errorInfo: any = {
                coverLetterId: coverLetterId,
                error: result.error || 'Unknown error'
              };
              // Only include responseBody if it has meaningful content
              if (result && typeof result === 'object' && Object.keys(result).length > 0) {
                const hasContent = Object.keys(result).some(key => {
                  const value = result[key];
                  return value !== null && value !== undefined && value !== '' && key !== 'success';
                });
                if (hasContent) {
                  errorInfo.responseBody = result;
                }
              }
              console.error(`Failed to delete cover letter: ${coverLetterTitle}`, errorInfo);
              failedCount++;
            }
          }
        } catch (error) {
          const coverLetterTitle = coverLetter.title || coverLetter.name || 'Unknown Cover Letter';
          const errorInfo: any = {
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          if (error instanceof Error && error.stack) {
            errorInfo.stack = error.stack;
          }
          if (coverLetterId) {
            errorInfo.coverLetterId = coverLetterId;
          }
          console.error(`Error deleting cover letter ${coverLetterTitle}:`, errorInfo);
          failedCount++;
        }
      }

      // Refresh cover letters list - reset refs to force fresh fetch
      hasLoadedCVsRef.current = false;
      lastUserIdRef.current = null;
      await loadAllCVData();

      if (deletedCount > 0) {
        console.log(`Successfully deleted ${deletedCount} unlinked cover letter(s)`);
      }
      if (failedCount > 0) {
        console.warn(`Failed to delete ${failedCount} cover letter(s)`);
      }
    } catch (error) {
      console.error('Clean unlinked cover letters error:', error);
    }
  };

  // Optimistic UI: Toggle cover letter star with immediate feedback and rollback on error
  const toggleCoverLetterStar = async (coverLetterId: string) => {
    // Store original state for rollback
    const originalCoverLetters = [...coverLetters];
    const coverLetter = coverLetters.find(cl => cl.id === coverLetterId);
    if (!coverLetter) return;

    const newStarredState = !coverLetter.isStarred;

    // Optimistic update: Update UI immediately
    setCoverLetters(coverLetters.map(cl =>
      cl.id === coverLetterId ? { ...cl, isStarred: newStarredState } : cl
    ));

    try {
      const response = await authenticatedFetch(`/api/cover-letters/${coverLetterId}`, {
        method: 'PUT',
        body: JSON.stringify({
          isStarred: newStarredState,
          userId: getUserIdForAPI(user)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
    } catch (error) {
      // Rollback on error
      console.error('Error toggling cover letter star:', error);
      setCoverLetters(originalCoverLetters);
    }
  };


  const deleteCV = async (cvId: string) => {
    try {
      setDeletingCVId(cvId);

      // Get user ID from unified authentication
      let userId = getUserIdForAPI(user);
      console.log('🔍 Delete - User ID:', getUserIdForAPI(user));
      console.log('🔍 Delete - User data:', user);

      if (!userId) {
        const userData = localStorage.getItem('user');
        console.log('🔍 Delete - localStorage user data:', userData);
        if (userData) {
          try {
            const parsedUser = safeJsonParse(userData);
            if (parsedUser.id || parsedUser._id) {
              userId = parsedUser.id || parsedUser._id;
              console.log('🔍 Delete - Parsed user ID from localStorage:', userId);
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      }

      if (!userId) {
        console.error('No user ID available for delete operation');
        console.error('User:', user);
        console.error('localStorage user data:', localStorage.getItem('user'));
        showModalDialog({
          title: 'Authentication Error',
          message: 'Please log in again to continue.',
          type: 'error'
        });
        return;
      }

      console.log('Deleting CV:', cvId, 'Type:', typeof cvId, 'for user:', userId);

      // Check if this is a mock CV (for demo purposes)
      const mockCVIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'];
      if (mockCVIds.includes(cvId)) {
        // For mock CVs, just remove from local state
        setCvs(cvs.filter(cv => cv.id !== cvId));
        return;
      }

      // Check if CV ID is a valid ObjectId format
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(cvId)) {
        console.error('Invalid CV ID format:', cvId);
        showModalDialog({
          title: 'Invalid CV',
          message: 'Invalid CV ID format. Cannot delete this CV.',
          type: 'error'
        });
        return;
      }

      console.log('Making DELETE request to:', `/api/cvs/${cvId}?userId=${userId}`);

      const response = await authenticatedFetch(`/api/cvs/${cvId}?userId=${userId}`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);
      console.log('Delete response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse.substring(0, 500));
        throw new Error(`Server returned non-JSON response: ${response.status}`);
      }

      const result = await response.json();
      console.log('Delete response:', result);

      if (result.success) {
        // Remove the CV from the local state
        setCvs(cvs.filter(cv => cv.id !== cvId));
        // Show success toast and notification
      } else {
        console.error('Failed to delete CV:', result.message);
      }
    } catch (error) {
      console.error('Error deleting CV:', error);
      // Removed notification:'error', 'Error deleting CV. Please try again.');
    } finally {
      setDeletingCVId(null);
    }
  };


  // User profile is now handled by the useUserData hook

  // Link job to CV using centralized journey linking service
  const linkJobToCV = async (cvId: string, jobId: string) => {
    try {
      const userId = getUserIdForAPI(user);
      if (!userId) return;

      // Use ApplicationPackageService for proper application package management
      const result = await ApplicationPackageService.createNewPackage({
        jobId,
        userId,
        journeyName: `Application for ${jobId}`
      });

      if (result.success) {
        // Refresh CVs to show updated job links
        loadAllCVData();
        setLinkingJobCVId(null);
        showModalDialog({
          title: 'Success',
          message: 'Job linked to CV successfully via journey system!',
          type: 'success'
        });
      } else {
        showModalDialog({
          title: 'Error',
          message: `Failed to link job to CV: ${result.message}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error linking job to CV:', error);
      showModalDialog({
        title: 'Error',
        message: 'Failed to link job to CV',
        type: 'error'
      });
    }
  };

  // unlinkJobFromCV removed - relationships now managed through CVJourney

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'from-green-400 to-green-500';
    if (percentage >= 60) return 'from-yellow-400 to-yellow-500';
    if (percentage >= 40) return 'from-orange-400 to-orange-500';
    return 'from-red-400 to-red-500';
  };

  const getCompletionFeedback = (cv: any): string[] => {
    const feedback: string[] = [];

    // Check personal info
    if (!cv.cvData?.basics?.name?.trim()) feedback.push('Add your full name');
    if (!cv.cvData?.basics?.email?.trim()) feedback.push('Add your email address');
    if (!cv.cvData?.basics?.phone?.trim()) feedback.push('Add your phone number');
    if (!cv.cvData?.basics?.summary?.trim()) feedback.push('Add a professional summary');

    // Check experience
    if (!cv.cvData?.work || cv.cvData.work.length === 0) {
      feedback.push('Add work experience');
    } else {
      const work = cv.cvData.work[0];
      if (!work.position?.trim()) feedback.push('Add job titles to experience');
      if (!work.summary?.trim()) feedback.push('Add descriptions to work experience');
    }

    // Check education
    if (!cv.cvData?.education || cv.cvData.education.length === 0) {
      feedback.push('Add education history');
    }

    // Check skills
    if (!cv.cvData?.skills || cv.cvData.skills.length === 0) {
      feedback.push('Add skills and competencies');
    }

    // Check projects
    if (!cv.cvData?.projects || cv.cvData.projects.length === 0) {
      feedback.push('Add projects or achievements');
    }

    return feedback.slice(0, 3); // Return top 3 suggestions
  };

  const getSectionCompletion = (cv: any) => {
    const sections = {
      personalInfo: {
        name: 'Personal Info',
        completed: !!(cv.cvData?.basics?.name?.trim() && cv.cvData?.basics?.email?.trim()),
        icon: '👤'
      },
      experience: {
        name: 'Experience',
        completed: !!(cv.cvData?.work && cv.cvData.work.length > 0),
        icon: '💼'
      },
      education: {
        name: 'Education',
        completed: !!(cv.cvData?.education && cv.cvData.education.length > 0),
        icon: '🎓'
      },
      skills: {
        name: 'Skills',
        completed: !!(cv.cvData?.skills && cv.cvData.skills.length > 0),
        icon: '⚡'
      },
      projects: {
        name: 'Projects',
        completed: !!(cv.cvData?.projects && cv.cvData.projects.length > 0),
        icon: '🚀'
      }
    };

    return sections;
  };

  // Filter and sort CVs
  // Separate standalone CVs and journey CVs from regular cvs
  const standaloneCVs = React.useMemo(() => {
    return cvs.filter(cv => cv.cvType !== 'journey');
  }, [cvs]);

  const journeyCVs = React.useMemo(() => {
    return cvs.filter(cv => cv.cvType === 'journey');
  }, [cvs]);

  // "My CVs" = Master CVs + Standalone CVs (combined)
  const myCVs = React.useMemo(() => {
    return [...masterCVs, ...standaloneCVs];
  }, [masterCVs, standaloneCVs]);

  // Filter and sort "My CVs" section
  const filteredAndSortedMyCVs = React.useMemo(() => {
    let filtered = myCVs.filter(cv => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return cv.title.toLowerCase().includes(query) ||
          (cv.description && cv.description.toLowerCase().includes(query));
      }
      return true;
    });

    return filtered.sort((a, b) => {
      // Always show master CVs first
      if (a.isMaster && !b.isMaster) return -1;
      if (!a.isMaster && b.isMaster) return 1;

      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'lastModified':
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });
  }, [myCVs, searchQuery, sortBy]);

  // Filter and sort "Tracked Applications" section (journey CVs)
  const filteredAndSortedJourneyCVs = React.useMemo(() => {
    let filtered = journeyCVs.filter(cv => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return cv.title.toLowerCase().includes(query) ||
          (cv.description && cv.description.toLowerCase().includes(query));
      }
      return true;
    });

    // Enrich with stage info from journeys
    const enriched = filtered.map(cv => {
      const journey = journeys.find(j => j.cvId === cv.id);
      return {
        ...cv,
        stage: journey?.jobStatus || 'Applied' // Use actual job status (e.g., Applied, Interview), default to Applied
      };
    });

    return enriched.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'lastModified':
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });
  }, [journeyCVs, searchQuery, sortBy]);

  // Keep filteredAndSortedCVs for backward compatibility (all non-master CVs)
  const filteredAndSortedCVs = React.useMemo(() => {
    console.log('🔍 Canvas - filteredAndSortedCVs calculation:', {
      cvsLength: cvs.length,
      searchQuery,
      sortBy,
      cvs: cvs.map(cv => ({ id: cv.id, title: cv.title }))
    });

    let filtered = cvs.filter(cv => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return cv.title.toLowerCase().includes(query) ||
          (cv.description && cv.description.toLowerCase().includes(query));
      }
      return true;
    });

    const sorted = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'lastModified':
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });

    console.log('🔍 Canvas - filteredAndSortedCVs result:', {
      filteredLength: filtered.length,
      sortedLength: sorted.length,
      sorted: sorted.map(cv => ({ id: cv.id, title: cv.title }))
    });

    return sorted;
  }, [cvs, searchQuery, sortBy]);

  // Filter and sort Cover Letters
  const filteredAndSortedCoverLetters = React.useMemo(() => {
    let filtered = coverLetters.filter(cl => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return cl.title.toLowerCase().includes(query) ||
          (cl.description && cl.description.toLowerCase().includes(query));
      }
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'lastModified':
        default:
          // Use raw date for sorting if available, otherwise try to parse the formatted string
          const dateA = (a as any).lastModifiedDate || new Date(a.lastModified);
          const dateB = (b as any).lastModifiedDate || new Date(b.lastModified);
          return dateB.getTime() - dateA.getTime();
      }
    });
  }, [coverLetters, searchQuery, sortBy]);

  // Authentication check - redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('🔒 Canvas - User not authenticated, redirecting to sign-in');
      router.push('/sign-in?callbackUrl=' + encodeURIComponent('/dashboard/canvas'));
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render UI if not authenticated (redirect will happen)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header - Always show immediately */}
      <PageHeader
        title="Documents"
        description="Saved CVs/ Cover Letter and Career Reports"
        user={{
          name: getUserDisplayName(userData),
          email: getUserEmail(userData),
          username: userData?.username || '',
          profilePhoto: getUserAvatar(userData),
          designation: userData?.role || '',
          subscription: userData?.subscription
        }}
        showSettings={true}
        onMobileMenuToggle={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Document Type Toggle (CVs / Cover Letters) */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('cv')}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-none border-b-2 ${activeTab === 'cv'
                  ? 'text-lime-700 dark:text-lime-400 border-lime-500 dark:border-lime-400'
                  : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <FileText className="h-4 w-4 mr-2" />
                CVs
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'cv'
                  ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                  {cvs.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('coverLetter')}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-none border-b-2 ${activeTab === 'coverLetter'
                  ? 'text-lime-700 dark:text-lime-400 border-lime-500 dark:border-lime-400'
                  : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <PenTool className="h-4 w-4 mr-2" />
                Cover Letters
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'coverLetter'
                  ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                  {coverLetters.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Sort and Clean Unlinked Buttons */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-[#232f1c] rounded-lg p-1 border border-gray-300 dark:border-lime-500/20">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list'
                ? 'bg-white dark:bg-lime-500/20 text-lime-700 dark:text-lime-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              title="List View"
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid'
                ? 'bg-white dark:bg-lime-500/20 text-lime-700 dark:text-lime-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          {/* Sort By Button */}
          <div className="relative" data-sort-dropdown>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-700 dark:text-gray-300 hover:bg-[#141810] dark:hover:bg-[#141810]"
            >
              <SortAsc className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sortBy === 'lastModified' ? 'Last Modified' :
                  sortBy === 'title' ? 'Title' :
                    sortBy === 'status' ? 'Status' : 'Sort By'}
              </span>
            </button>

            {/* Sort Dropdown */}
            <AnimatePresence>
              {showSortDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-1 bg-white/95 dark:bg-[#141810] border border-gray-200/50 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 min-w-[160px] backdrop-blur-sm"
                >
                  {[
                    { value: 'lastModified', label: 'Last Modified' },
                    { value: 'title', label: 'Title' },
                    { value: 'status', label: 'Status' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value as any);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${sortBy === option.value
                        ? 'bg-lime-500/10 text-lime-700 dark:text-lime-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Clean Unlinked Button - Inline with sort button */}
          {activeTab === 'cv' && (
            <CleanUnlinkedButton
              type="cv"
              items={cvs}
              journeys={journeys}
              onClean={handleCleanUnlinkedCVs}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
            />
          )}
          {activeTab === 'coverLetter' && (
            <CleanUnlinkedButton
              type="cover-letter"
              items={coverLetters}
              journeys={journeys}
              onClean={handleCleanUnlinkedCoverLetters}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
            />
          )}
        </div>
      </div>

      {/* Main Content Based on Active Tab */}
      {activeTab === 'cv' ? (
        /* CV Content */
        <div className="space-y-6">



          {viewMode === 'list' ? (
            <div className="space-y-6">
              {/* My CVs Section (Master CVs + Standalone CVs) */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">My CVs</h3>
                <CVListView
                  cvs={filteredAndSortedMyCVs}
                  onEdit={(cv) => {
                    if (cv.isMaster) {
                      // Handle Master CV edit redirect
                      router.push(`/resume-enhancer?mode=edit&cvId=${cv.id}`);
                    } else {
                      handleCVClick(cv as any);
                    }
                  }}
                  onDuplicate={(cv) => cv.isMaster ? handleDuplicateMasterCV(cv) : handleDuplicateCV(cv as any)}
                  onDownload={(cv) => handleDownloadCV(cv as any)}
                  onDelete={(cv) => cv.isMaster ? undefined : handleDeleteCV(cv as any)}
                  onToggleStar={toggleStar}
                  onViewReport={(cv) => handleViewCareerReport(cv as any)}
                  onRename={(cvId, newTitle) => {
                    setEditingTitle(newTitle);
                    return saveTitle(cvId);
                  }}
                  editingCVId={editingCVId}
                  editingTitle={editingTitle}
                  onStartEditing={(cv) => startEditing(cv as any)}
                  onTitleEdit={(cvId, newTitle) => setEditingTitle(newTitle)}
                  onCancelEditing={cancelEditing}
                  scoreLabel="CV Score"
                  hideType={true}
                  hideStatus={true}
                />
              </div>

              {/* Tracked Applications Section (Journey CVs) */}
              {filteredAndSortedJourneyCVs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Tracked Applications</h3>
                  <CVListView
                    cvs={filteredAndSortedJourneyCVs}
                    onEdit={(cv) => handleCVClick(cv as any)}
                    onDuplicate={(cv) => handleDuplicateCV(cv as any)}
                    onDownload={(cv) => handleDownloadCV(cv as any)}
                    onDelete={(cv) => handleDeleteCV(cv as any)}
                    onToggleStar={toggleStar}
                    onViewReport={(cv) => handleViewCareerReport(cv as any)}
                    onRename={(cvId, newTitle) => {
                      setEditingTitle(newTitle);
                      return saveTitle(cvId);
                    }}
                    editingCVId={editingCVId}
                    editingTitle={editingTitle}
                    onStartEditing={(cv) => startEditing(cv as any)}
                    onTitleEdit={(cvId, newTitle) => setEditingTitle(newTitle)}
                    onCancelEditing={cancelEditing}
                    scoreLabel="ATS Score"
                    hideType={true}
                    hideStatus={true}
                    showStage={true}
                  />
                </div>
              )}
            </div>
          ) : (
            /* CV Grid */
            <div className="space-y-6">

              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
                {/* Master CV Card - Always First */}
                <MasterCVCardOverlay
                  onEditMasterCV={handleEditMasterCV}
                  onDuplicateMasterCV={handleDuplicateMasterCV}
                  userId={getUserIdForAPI(user) || ''}
                  onToggleStar={toggleStar}
                  onViewReport={(cv) => { handleViewCareerReport(cv as any); }}
                  masterCVData={masterCVs.length > 0 ? {
                    id: masterCVs[0].id,
                    title: masterCVs[0].title,
                    lastModified: masterCVs[0].lastModified,
                    status: masterCVs[0].status,
                    isMaster: true,
                    cvData: masterCVs[0].cvData,
                    // Use templateData if available (from API summary projection), otherwise use template object
                    template: masterCVs[0].templateData || (masterCVs[0].template && typeof masterCVs[0].template === 'object'
                      ? masterCVs[0].template
                      : (masterCVs[0].templateId ? {
                        _id: masterCVs[0].templateId,
                        name: masterCVs[0].templateName || 'Default Template',
                        globalStyles: {},
                        availableSections: []
                      } : null)),
                    templateId: masterCVs[0].templateId,
                    templateName: masterCVs[0].templateName,
                    isStarred: masterCVs[0].isStarred,
                    thumbnail: masterCVs[0].thumbnail || '',
                    metadata: masterCVs[0].metadata
                  } : null}
                />

                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse border border-gray-200 dark:border-gray-700">
                      <div className="h-48 bg-gray-200 dark:bg-white/10 rounded-lg mb-4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-2/3"></div>
                    </div>
                  ))
                ) : (
                  // CV Cards with Overlay Design
                  filteredAndSortedCVs.length > 0 ? (
                    filteredAndSortedCVs.map((cv, index) => {
                      // Find linked journey for this CV (performance optimization - no API call per card)
                      const linkedJourney = journeys.find(journey => journey.cvId === cv.id) || null;
                      return (
                        <CVCardOverlay
                          key={cv.id || `cv-${index}`}
                          cv={{
                            id: cv.id,
                            title: cv.title,
                            lastModified: cv.lastModified,
                            status: cv.status,
                            views: cv.views,
                            isStarred: cv.isStarred,
                            thumbnail: cv.thumbnail,
                            description: cv.description,
                            cvData: cv.cvData,
                            template: cv.template,
                            completionPercentage: cv.completionPercentage,
                            isMaster: cv.isMaster,
                            journeyId: cv.journeyId,
                            cvType: cv.cvType,
                            atsScore: cv.atsScore,
                            metadata: cv.metadata
                          }}
                          linkedJourney={linkedJourney}
                          onEdit={(cv) => { handleCVClick(cv as any); }}
                          onDownload={(cv) => { handleDownloadCV(cv as any); }}
                          onDelete={(cv) => { handleDeleteCV(cv as any); }}
                          onToggleStar={toggleStar}
                          onViewReport={(cv) => { handleViewCareerReport(cv as any); }}
                          onRename={(cvId, newTitle) => {
                            setEditingTitle(newTitle);
                            saveTitle(cvId);
                          }}
                          onEditJourney={(cv, journey) => { handleEditJourney(cv as any, journey); }}
                          onTitleEdit={(cvId, newTitle) => setEditingTitle(newTitle)}
                          editingCVId={editingCVId}
                          editingTitle={editingTitle}
                          onStartEditing={(cv) => startEditing(cv as any)}
                          onSaveTitle={saveTitle}
                          onCancelEditing={cancelEditing}
                        />
                      );
                    })
                  ) : searchQuery ? (
                    // Only show empty state if there's a search query (filtered out all results)
                    <div className="col-span-full flex flex-col items-center justify-center py-12 px-4">
                      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 max-w-md w-full text-center">
                        <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No CVs Found</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          No CVs found.
                        </p>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Cover Letter Content */
        <div className="space-y-6">
          {/* Cover Letter Grid */}
          {/* Cover Letter Grid */}
          {viewMode === 'list' ? (
            <CoverLetterListView
              coverLetters={filteredAndSortedCoverLetters}
              onEdit={(cl) => {
                const params = new URLSearchParams();
                params.set('mode', cl.journeyId ? 'journey' : 'edit');
                params.set('coverLetterId', cl.id);
                if (cl.journeyId) params.set('journeyId', cl.journeyId);
                if (cl.cvId) params.set('cvId', cl.cvId);
                if (cl.jobId) params.set('jobId', cl.jobId);
                router.push(`/cover-letter-editor?${params.toString()}`);
              }}
              onDownload={handleDownloadCoverLetter}
              onDelete={handleDeleteCoverLetter}
              onToggleStar={toggleCoverLetterStar}
              onRename={(id, newTitle) => {
                setEditingCoverLetterTitle(newTitle);
                return saveCoverLetterTitle(id);
              }}
              editingCoverLetterId={editingCoverLetterId}
              editingTitle={editingCoverLetterTitle}
              onStartEditing={startEditingCoverLetter}
              onTitleEdit={(id, newTitle) => setEditingCoverLetterTitle(newTitle)}
              onCancelEditing={cancelEditingCoverLetter}
            />
          ) : (
            <div className="space-y-6">

              {filteredAndSortedCoverLetters.length > 0 ? (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredAndSortedCoverLetters.map((coverLetter) => (
                    <CoverLetterCardOverlay
                      key={coverLetter.id}
                      coverLetter={{
                        id: coverLetter.id,
                        title: coverLetter.title,
                        lastModified: String(coverLetter.lastModified), // Ensure string
                        status: coverLetter.status,
                        content: coverLetter.content || '',
                        isStarred: coverLetter.isStarred,
                        views: coverLetter.views || 0,
                        thumbnail: coverLetter.thumbnail || '',
                        metadata: coverLetter.metadata,
                        journeyId: coverLetter.journeyId, // Pass these IDs
                        cvId: coverLetter.cvId,
                        jobId: coverLetter.jobId
                      }}
                      onEdit={(cl) => {
                        const params = new URLSearchParams();
                        params.set('mode', cl.journeyId ? 'journey' : 'edit');
                        params.set('coverLetterId', cl.id);
                        if (cl.journeyId) params.set('journeyId', cl.journeyId);
                        if (cl.cvId) params.set('cvId', cl.cvId);
                        if (cl.jobId) params.set('jobId', cl.jobId);
                        router.push(`/cover-letter-editor?${params.toString()}`);
                      }}
                      onDownload={handleDownloadCoverLetter}
                      onDelete={handleDeleteCoverLetter}
                      onToggleStar={toggleCoverLetterStar}
                      onTitleEdit={(id, newTitle) => setEditingCoverLetterTitle(newTitle)}
                      editingCoverLetterId={editingCoverLetterId}
                      editingTitle={editingCoverLetterTitle}
                      onStartEditing={startEditingCoverLetter}
                      onSaveTitle={saveCoverLetterTitle}
                      onCancelEditing={cancelEditingCoverLetter}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 max-w-md w-full text-center">
                    <MessageSquare className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Cover Letters Found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Create your first cover letter to get started.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Cover letters are typically created when you start a job application journey.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Modal for Errors and Success Messages */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={hideModalDialog}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />

      {/* Career Report Sidebar */}
      {user?.id && (
        <CareerReportSidebar
          isOpen={showCareerReportSidebar}
          onClose={() => {
            setShowCareerReportSidebar(false);
            setSelectedCVForReport(null);
          }}
          selectedCV={selectedCVForReport}
          allCVs={cvs}
          userId={getUserIdForAPI(user) || user.id}
          onCVSelect={handleCVSelectForReport}
        />
      )}

      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => {
          setDownloadModalOpen(false);
          setSelectedCVForDownload(null);
          setSelectedCoverLetterForDownload(null);
        }}
        hasCV={!!selectedCVForDownload || (!!selectedCoverLetterForDownload && !!selectedCoverLetterForDownload.journeyId)}
        hasCoverLetter={!!selectedCoverLetterForDownload}
        coverLetterId={selectedCoverLetterForDownload?.id}
        cvId={selectedCVForDownload?.id || selectedCoverLetterForDownload?.cvId}
        userId={user?.id}
        cvType={
          selectedCVForDownload
            ? (selectedCVForDownload.cvType === 'journey' ? 'journey' : (selectedCVForDownload.isMaster ? 'master' : 'standalone'))
            : (selectedCoverLetterForDownload?.journeyId ? 'journey' : 'standalone')
        }
        onDownload={handleDownload}
        onPaywallRequired={() => {
          openPaymentModal({
            preselectedPlanKey: 'pro_monthly',
            triggerContext: 'docx-export',
            returnUrl: window.location.href
          });
          setDownloadModalOpen(false);
        }}
      />
      {/* JobSidebar */}
      {showJourneyModal && selectedJobForJourney && (
        <JobSidebar
          job={selectedJobForJourney}
          journeys={journeysForSelectedJob}
          onClose={() => {
            setShowJourneyModal(false);
            setSelectedJobForJourney(null);
            setJourneysForSelectedJob([]);
          }}
          onRefresh={async () => {
            // Refresh the journeys for the selected job
            if (selectedJobForJourney) {
              const journeysResponse = await fetch(`/api/application-journey?jobId=${selectedJobForJourney.id}`);
              if (journeysResponse.ok) {
                const journeysResult = await journeysResponse.json();
                if (journeysResult.success) {
                  setJourneysForSelectedJob(journeysResult.data.journeys || []);
                }
              }
            }
            // Also refresh CVs to update any changes
            loadAllCVData();
          }}
        />
      )}
      {/* Credit Exhaustion Modal */}
      <CreditExhaustionModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        creditsRemaining={0}
        limit={1}
        reason="Free users can only have 1 Standalone CV. Upgrade to create unlimited CVs."
        preselectedPlanKey="pro_monthly"
      />
    </div>
  );
};

// Export component directly - React.memo can cause hook resolution issues with dynamic imports
// If memoization is needed, it should be done at the usage site, not here
Canvas.displayName = 'Canvas';

export default Canvas;
