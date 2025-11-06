'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
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
  SortAsc
} from 'lucide-react';
import { useCreateCV } from '@/lib/utils/cvCreationUtils';
import CVPreviewContent from '@/components/studio/CVPreviewContent';
import PageHeader from './PageHeader';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { ApplicationPackageService } from '@/lib/services/applicationPackageService';
import { UnifiedCVService } from '@/lib/services/unified-cv-service';
import MasterCVCardOverlay from './MasterCVCardOverlay';
import CVCardOverlay from './CVCardOverlay';
import CoverLetterCardOverlay from './CoverLetterCardOverlay';
import JobModal from './JobModal';
import { useOptimizedDataFetching } from '@/lib/hooks/useOptimizedDataFetching';
import { CanvasSkeleton } from '@/components/ui/OptimizedSkeletons';
import { formatCardTime } from '@/lib/utils/timeUtils';
import DownloadModal, { DocumentType, FormatType } from '@/components/ui/DownloadModal';
import { CVJourneyLookupService } from '@/lib/services/cvJourneyLookupService';

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
  isMaster?: boolean; // Legacy support - new format uses metadata.isMaster
  metadata?: {
    isMaster?: boolean;
    [key: string]: any;
  };
  completionPercentage?: number;
  // Additional fields that CVCardOverlay might need
  atsScore?: number;
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
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
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
  const [showModal, setShowModal] = useState(false);
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
      // Skip master CVs
      if (type === 'cv' && item.isMaster) {
        return false;
      }
      
      // Check if item is linked to any journey
      // Convert item.id to string for comparison
      return !linkedItemIds.has(String(item.id));
    });
    
    setUnlinkedItems(unlinked);
    setShowModal(true);
  };

  const handleConfirmClean = () => {
    onClean(unlinkedItems);
    setShowModal(false);
  };

  return (
    <>
      <motion.button
        onClick={checkUnlinkedItems}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={items.length === 0}
      >
        <Trash size={16} />
        Clean Unlinked
      </motion.button>

      {/* Clean Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Clean Unlinked {type === 'cv' ? 'CVs' : 'Cover Letters'}
                </h3>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  This will permanently delete {unlinkedItems.length} {type === 'cv' ? 'CVs' : 'cover letters'} that are not linked to any application journeys.
                </p>
                
                {unlinkedItems.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-32 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Items to be deleted:
                    </h4>
                    <ul className="space-y-1">
                      {unlinkedItems.slice(0, 5).map((item, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          • {item.title}
                        </li>
                      ))}
                      {unlinkedItems.length > 5 && (
                        <li className="text-sm text-gray-500 dark:text-gray-400">
                          ... and {unlinkedItems.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleConfirmClean}
                  className="flex-1 px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Delete {unlinkedItems.length} Items
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Canvas: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { createCV } = useCreateCV();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData, loading: userLoading, error: userError } = useUserData();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [masterCVs, setMasterCVs] = useState<CV[]>([]);
  const [mongoDBUserId, setMongoDBUserId] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<any[]>([]);
  
  // JobModal state
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [selectedJobForJourney, setSelectedJobForJourney] = useState<any>(null);
  const [journeysForSelectedJob, setJourneysForSelectedJob] = useState<any[]>([]);
  
  // Helper function to resolve MongoDB user ID using unified authentication
  const resolveMongoDBUserId = async (userId: string): Promise<string | null> => {
    try {
      console.log('🔍 Canvas - Resolving MongoDB user ID for:', userId);
      
      // Check if it's already a MongoDB ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(userId)) {
        console.log('✅ Canvas - User ID is already MongoDB ObjectId');
        return userId;
      } else {
        console.log('🔍 Canvas - User ID is not MongoDB ObjectId, fetching from server...');
        // Try to get MongoDB user ID from server
        const userResponse = await fetch('/api/user/current');
        console.log('🔍 Canvas - User API response status:', userResponse.status);
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('🔍 Canvas - User API response data:', userData);
          
          if (userData.success && userData.user && userData.user.id) {
            console.log('✅ Canvas - Found MongoDB user ID:', userData.user.id);
            return userData.user.id;
          } else {
            console.log('❌ Canvas - User API response missing required fields');
          }
        } else {
          console.log('❌ Canvas - User API request failed with status:', userResponse.status);
        }
      }
    } catch (error) {
      console.error('❌ Canvas - Error resolving MongoDB user ID:', error);
    }
    console.log('❌ Canvas - Failed to resolve MongoDB user ID');
    return null;
  };
  
  // Search and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'lastModified' | 'title' | 'status'>('lastModified');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Resolve MongoDB userId when session changes
  useEffect(() => {
    const initializeUserId = async () => {
      console.log('🔍 Canvas - Initializing user ID...');
      console.log('🔍 Canvas - User object:', user);
      
      const userId = getUserIdForAPI(user);
      console.log('🔍 Canvas - getUserIdForAPI result:', userId);
      
      if (userId) {
        const resolvedUserId = await resolveMongoDBUserId(userId);
        console.log('🔍 Canvas - Resolved user ID:', resolvedUserId);
        setMongoDBUserId(resolvedUserId);
      } else {
        console.log('❌ Canvas - No user ID available from getUserIdForAPI');
        setMongoDBUserId(null);
      }
    };
    
    initializeUserId();
  }, [user]);
  
  // CVs state monitoring
  useEffect(() => {
    // CVs loaded successfully
  }, [cvs]);

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

  // Handle CV creation
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

  // Master CV handlers
  const handleEditMasterCV = async (masterCV: any) => {
    try {
      // Store master CV data in sessionStorage for studio to access
      sessionStorage.setItem('editingMasterCV', JSON.stringify(masterCV));
      sessionStorage.setItem('editingCVId', masterCV.id);
      sessionStorage.setItem('editingCVTitle', masterCV.title);
      sessionStorage.setItem('editingCVData', JSON.stringify(masterCV.cvData));
      
      // Navigate to studio with master CV
      window.location.href = `/studio?cvId=${masterCV.id}&master=true`;
    } catch (error) {
      // Removed notification:'error', 'Failed to open master CV');
    }
  };

  const handleDuplicateMasterCV = async (masterCV: any) => {
    try {
      
      const userId = getUserIdForAPI(user) || getUserIdFromLocalStorage();
      if (!userId) {
        // Removed notification:'error', 'User not authenticated');
        return;
      }

      // Use ApplicationPackageService to properly duplicate CV
      const duplicateResult = await ApplicationPackageService.duplicateCV({
        sourceCvId: masterCV.id,
        userId,
        newTitle: `${masterCV.title} (Copy)`
      });

      if (duplicateResult.success && duplicateResult.data?.cvId) {
        const duplicatedCVId = duplicateResult.data.cvId;
        
        // Navigate to studio with duplicated CV (freestanding, ready for job linking)
        window.location.href = `/studio?cvId=${duplicatedCVId}&mode=document-first`;
        
        // Removed notification:'success', 'Master CV duplicated successfully! You can now link it to a job.');
      } else {
        throw new Error(duplicateResult.message || 'Failed to duplicate master CV');
      }
    } catch (error) {
      // Removed notification:'error', 'Failed to duplicate master CV');
    }
  };

  // CV Card handlers
  const handleDuplicateCV = async (cv: CV) => {
    try {
      
      const userId = getUserIdForAPI(user) || getUserIdFromLocalStorage();
      if (!userId) {
        // Removed notification:'error', 'User not authenticated');
        return;
      }

      // Use ApplicationPackageService to properly duplicate CV
      const duplicateResult = await ApplicationPackageService.duplicateCV({
        sourceCvId: cv.id,
        userId,
        newTitle: `${cv.title} (Copy)`
      });

      if (duplicateResult.success && duplicateResult.data?.cvId) {
        // Refresh CVs list to show the new freestanding duplicate
        loadCVs();
        // Removed notification:'success', 'CV duplicated successfully! The copy is ready to be linked to a new job.');
        
        // If the source CV was linked to a journey, inform user about the duplication principle
        if (cv.journeyId) {
          // Removed notification:'info', 'A new freestanding copy was created. You can now link it to a different job application.', 5000);
        }
      } else {
        throw new Error(duplicateResult.message || 'Failed to duplicate CV');
      }
    } catch (error) {
      // Removed notification:'error', 'Failed to duplicate CV');
    }
  };

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
            window.open(`/api/cvs/download/${selectedCVForDownload.id}?format=pdf`, '_blank');
          } else {
            const response = await fetch(`/api/cvs/${selectedCVForDownload.id}/export?format=${format}`);
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
              window.open(`/api/cvs/download/${selectedCVForDownload.id}?format=pdf`, '_blank');
            }
            // Wait a bit then download cover letter
            setTimeout(() => {
              window.open(`/api/cover-letters/download/${journey.coverLetterId}?format=${format}`, '_blank');
            }, 500);
          }
        } else if (documentType === 'all') {
          // Try to find journey for CV to download all documents
          const journey = await CVJourneyLookupService.findJourneyByCVId(selectedCVForDownload.id, userId || '');
          if (journey?.journeyId) {
            window.open(`/api/application-journey/${journey.journeyId}/download?type=all`, '_blank');
          } else {
            // No journey, just download CV
            window.open(`/api/cvs/download/${selectedCVForDownload.id}`, '_blank');
          }
        }
      } else if (selectedCoverLetterForDownload) {
        // Cover Letter download
        if (documentType === 'coverLetter') {
          if (format === 'pdf') {
            window.open(`/api/cover-letters/download/${selectedCoverLetterForDownload.id}?format=pdf`, '_blank');
          } else {
            // For DOCX/DOC, might need to check if there's an export endpoint
            window.open(`/api/cover-letters/download/${selectedCoverLetterForDownload.id}?format=${format}`, '_blank');
          }
        } else if (documentType === 'cvAndCoverLetter') {
          // Download cover letter first, then CV
          const journey = await CVJourneyLookupService.findJourneyByCoverLetterId(selectedCoverLetterForDownload.id, userId || '');
          if (journey?.cvId) {
            // Download cover letter
            if (format === 'pdf') {
              window.open(`/api/cover-letters/download/${selectedCoverLetterForDownload.id}?format=pdf`, '_blank');
            }
            // Wait a bit then download CV
            setTimeout(() => {
              window.open(`/api/cvs/download/${journey.cvId}?format=${format}`, '_blank');
            }, 500);
          }
        } else if (documentType === 'all') {
          // Try to find journey for cover letter to download all documents
          const journey = await CVJourneyLookupService.findJourneyByCoverLetterId(selectedCoverLetterForDownload.id, userId || '');
          if (journey?.journeyId) {
            window.open(`/api/application-journey/${journey.journeyId}/download?type=all`, '_blank');
          } else {
            // No journey, just download cover letter
            window.open(`/api/cover-letters/download/${selectedCoverLetterForDownload.id}`, '_blank');
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

  const handleDeleteCV = async (cv: CV) => {
    try {
      await deleteCV(cv.id);
    } catch (error) {
      // Removed notification:'error', 'Failed to delete CV');
    }
  };

  const handleEditJourney = async (cv: CV, journey: any) => {
    try {
      
      // Fetch the job details for the journey
      const jobResponse = await fetch(`/api/jobs/${journey.jobId}`);
      if (jobResponse.ok) {
        const jobResult = await jobResponse.json();
        if (jobResult.success) {
          setSelectedJobForJourney(jobResult.data);
          
          // Fetch journeys for this job
          const journeysResponse = await fetch(`/api/application-journey?jobId=${journey.jobId}`);
          if (journeysResponse.ok) {
            const journeysResult = await journeysResponse.json();
            if (journeysResult.success) {
              setJourneysForSelectedJob(journeysResult.data.journeys || []);
            }
          }
          
          setShowJourneyModal(true);
        } else {
          // Removed notification:'error', 'Failed to load job details');
        }
      } else {
        // Removed notification:'error', 'Failed to load job details');
      }
    } catch (error) {
      // Removed notification:'error', 'Failed to open journey details');
    }
  };

  const [loading, setLoading] = useState(true);
  const [editingCVId, setEditingCVId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingCVId, setDeletingCVId] = useState<string | null>(null);
  
  // Cover Letter editing states
  const [editingCoverLetterId, setEditingCoverLetterId] = useState<string | null>(null);
  const [editingCoverLetterTitle, setEditingCoverLetterTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'cv' | 'coverLetter'>('cv');
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
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
    // Check if user is returning from onboarding
    const fromOnboarding = typeof window !== 'undefined' && sessionStorage.getItem('fromOnboarding') === 'true';
    if (fromOnboarding) {
      sessionStorage.removeItem('fromOnboarding'); // Clear the flag
    }
    
    // Use unified authentication
    const userId = getUserIdForAPI(user);
    if (userId) {
      loadCVs(userId);
      loadCoverLetters();
      loadJourneys();
      fetchAvailableJobs();
    } else {
      setLoading(false);
    }
  }, [user]);

  const getUserIdFromLocalStorage = (): string | null => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = safeJsonParse(userData);
        if (!parsedUser) return null;
        // Only return ID if it's a Firebase user
        if (parsedUser.firebaseUid) {
          return parsedUser.id || parsedUser._id;
        }
      }
    } catch (error) {
      // Silent fail - localStorage parsing failed
    }
    return null;
  };

  const loadCVs = useCallback(async (userId?: string) => {
    try {
      setLoading(true);
      const userIdToUse = userId || getUserIdForAPI(user);
      
      if (!userIdToUse) {
        console.log('❌ Canvas - No user ID available for loading CVs');
        setCvs([]);
        setMasterCVs([]);
        return;
      }
      
      console.log('🔍 Canvas - Loading CVs with user ID:', userIdToUse);
      
      // Use unified service to get CVs
      // Use 'full' projection to include cvData and template needed for preview rendering
      console.log('🔍 Canvas - Calling UnifiedCVService.getCVs...');
      const result = await UnifiedCVService.getCVs(userIdToUse, { projection: 'full' });
      console.log('🔍 Canvas - UnifiedCVService.getCVs result:', result);
      console.log('🔍 Canvas - Result type:', typeof result, 'Is array:', Array.isArray(result), 'Length:', result?.length);
      
      if (result && Array.isArray(result) && result.length > 0) {
        // Process CVs with unified data structure
        const enrichedCVs = result.map((cv: any) => {
          
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
            template: cv.template || (cv.templateId ? { _id: cv.templateId, name: cv.templateName || 'Default Template' } : null), // Include template data for preview - handle both populated and ID formats
            templateId: cv.templateId,
            templateName: cv.templateName,
            journeyId: cv.journeyId,
            completionPercentage: calculateCompletionPercentage(cv),
            isMaster: cv.metadata?.isMaster || cv.isMaster || false, // Include master flag - handle both formats
            atsScore: cv.metadata?.atsScore, // Include ATS score
            metadata: cv.metadata // Include full metadata
          } as CV;
        });
        
        // Separate Master CVs from regular CVs based on isMaster metadata
        console.log('🔍 Canvas - All CVs before filtering:', enrichedCVs.map(cv => ({ 
          id: cv.id, 
          title: cv.title, 
          isMaster: cv.isMaster,
          metadataIsMaster: cv.metadata?.isMaster 
        })));
        
        // Filter CVs based on isMaster - handle both old and new formats
        const masterCVs = enrichedCVs.filter(cv => {
          const isMasterAtRoot = cv.isMaster === true;
          const metadataIsMaster = cv.metadata?.isMaster;
          const isMasterInMetadata = metadataIsMaster === true || 
            (typeof metadataIsMaster === 'string' && metadataIsMaster === 'true');
          return isMasterAtRoot || isMasterInMetadata;
        });
        const regularCVs = enrichedCVs.filter(cv => {
          const isMasterAtRoot = cv.isMaster === true;
          const metadataIsMaster = cv.metadata?.isMaster;
          const isMasterInMetadata = metadataIsMaster === true || 
            (typeof metadataIsMaster === 'string' && metadataIsMaster === 'true');
          return !isMasterAtRoot && !isMasterInMetadata;
        });
        
        console.log('🔍 Canvas - Master CVs:', masterCVs.length);
        console.log('🔍 Canvas - Regular CVs:', regularCVs.length);
        console.log('🔍 Canvas - First CV sample:', regularCVs[0]);
        console.log('🔍 Canvas - Master CVs data:', masterCVs);
        console.log('🔍 Canvas - First Master CV:', masterCVs[0]);
        
        // Store both Master CVs and regular CVs
        setCvs(regularCVs);
        setMasterCVs(masterCVs);
        console.log('✅ Canvas - CVs loaded successfully:', { regular: regularCVs.length, master: masterCVs.length });
      } else {
        console.log('🔍 Canvas - No CVs found for user:', userIdToUse);
        console.log('🔍 Canvas - Result was:', result);
        setCvs([]);
        setMasterCVs([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading CVs:', error);
      console.error('❌ Error details:', error.message, error.stack);
      // Don't clear CVs on error - keep existing ones if any
      // setCvs([]);
      // setMasterCVs([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadCoverLetters = useCallback(async () => {
    try {
      console.log('🔍 Canvas - Loading Cover Letters...');
      const userId = getUserIdForAPI(user);
      if (!userId) {
        console.log('🔍 Canvas - No user ID, skipping Cover Letter load');
        return;
      }

      const response = await authenticatedFetch(`/api/cover-letters?userId=${userId}`);
      const result = await response.json();
      
      console.log('🔍 Canvas - Cover Letter API response:', result);
      
      if (result.success && result.data?.coverLetters) {
        const enrichedCoverLetters = result.data.coverLetters.map((cl: any) => ({
          ...cl,
          id: cl.id || cl._id,
          lastModified: formatTimeAgo(new Date(cl.metadata?.lastModified || cl.updatedAt || cl.createdAt)),
          views: cl.views || 0,
          isStarred: cl.isStarred || false,
          thumbnail: '/api/cover-letters/thumbnail/' + (cl.id || cl._id),
          description: cl.metadata?.targetCompany ? `For ${cl.metadata.targetCompany}` : 'Cover letter',
          coverLetterData: cl.content,
          content: cl.content, // Add content field for the overlay component
          // connectedJobs removed - relationships now managed through CVJourney
          completionPercentage: cl.completionPercentage || 0
        }));
        
        console.log('🔍 Canvas - Setting Cover Letters:', enrichedCoverLetters.length);
        console.log('🔍 Canvas - First Cover Letter sample:', enrichedCoverLetters[0]);
        setCoverLetters(enrichedCoverLetters);
      } else {
        console.log('🔍 Canvas - Cover Letter API returned success: false');
        setCoverLetters([]);
      }
    } catch (error) {
      console.error('Error loading Cover Letters:', error);
      setCoverLetters([]);
    }
  }, [user]);

  const loadJourneys = useCallback(async () => {
    try {
      console.log('🔍 Canvas - Loading Journeys...');
      const userId = getUserIdForAPI(user);
      if (!userId) {
        console.log('🔍 Canvas - No user ID, skipping Journey load');
        return;
      }

      const response = await authenticatedFetch(`/api/journeys?userId=${userId}`);
      const result = await response.json();
      
      console.log('🔍 Canvas - Journey API response:', result);
      
      if (result.success && result.data?.journeys) {
        console.log('🔍 Canvas - Setting Journeys:', result.data.journeys.length);
        setJourneys(result.data.journeys);
      } else {
        console.log('🔍 Canvas - Journey API returned success: false');
        setJourneys([]);
      }
    } catch (error) {
      console.error('Error loading Journeys:', error);
      setJourneys([]);
    }
  }, [user]);

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
  
  // Helper functions to calculate section scores
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
      let maxEntryScore = 4;
      
      if (entry.institution && entry.institution.trim()) entryScore += 1;
      if (entry.area && entry.area.trim()) entryScore += 1;
      if (entry.studyType && entry.studyType.trim()) entryScore += 1;
      if (entry.startDate && entry.startDate.trim()) entryScore += 1;
      
      totalScore += (entryScore / maxEntryScore) * 100;
    });
    
    return Math.min(100, totalScore / Math.min(education.length, maxEntries));
  };
  
  const calculateSkillsScore = (skills: any[]): number => {
    if (!Array.isArray(skills) || skills.length === 0) return 0;
    
    let totalScore = 0;
    const maxSkills = 5; // Consider up to 5 skill categories
    
    skills.slice(0, maxSkills).forEach(skill => {
      let skillScore = 0;
      let maxSkillScore = 2;
      
      if (skill.name && skill.name.trim()) skillScore += 1;
      if (skill.keywords && Array.isArray(skill.keywords) && skill.keywords.length > 0) skillScore += 1;
      
      totalScore += (skillScore / maxSkillScore) * 100;
    });
    
    return Math.min(100, totalScore / Math.min(skills.length, maxSkills));
  };
  
  const calculateProjectsScore = (projects: any[]): number => {
    if (!Array.isArray(projects) || projects.length === 0) return 0;
    
    let totalScore = 0;
    const maxProjects = 2; // Consider up to 2 most recent projects
    
    projects.slice(0, maxProjects).forEach(project => {
      let projectScore = 0;
      let maxProjectScore = 3;
      
      if (project.name && project.name.trim()) projectScore += 1;
      if (project.description && project.description.trim()) projectScore += 1;
      if (project.url && project.url.trim()) projectScore += 1;
      
      totalScore += (projectScore / maxProjectScore) * 100;
    });
    
    return Math.min(100, totalScore / Math.min(projects.length, maxProjects));
  };

  

  const formatTimeAgo = (date: Date) => {
    return formatCardTime(date);
  };



  const toggleStar = (id: string) => {
    setCvs(cvs.map(cv => 
      cv.id === id ? { ...cv, isStarred: !cv.isStarred } : cv
    ));
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
    console.log('🔍 Canvas - CV clicked:', cv.id);
    console.log('🔍 Canvas - CV data:', cv.cvData);
    
    try {
      // Find the journey associated with this CV
      const associatedJourney = journeys.find(journey => journey.cvId === cv.id);
      
      if (associatedJourney) {
        // Fetch the job details for the journey
        const jobResponse = await fetch(`/api/jobs/${associatedJourney.jobId}`);
        if (jobResponse.ok) {
          const jobResult = await jobResponse.json();
          if (jobResult.success) {
            setSelectedJobForJourney(jobResult.data);
            
            // Fetch journeys for this job
            const journeysResponse = await fetch(`/api/application-journey?jobId=${associatedJourney.jobId}`);
            if (journeysResponse.ok) {
              const journeysResult = await journeysResponse.json();
              if (journeysResult.success) {
                setJourneysForSelectedJob(journeysResult.data.journeys || []);
              }
            }
            
            setShowJourneyModal(true);
          } else {
            // Removed notification:'error', 'Failed to load job details');
          }
        } else {
          // Removed notification:'error', 'Failed to load job details');
        }
      } else {
        // If no journey found, show a message or create a new journey
        // Removed notification:'info', 'This CV is not linked to any application journey. Please create a journey first.');
      }
    } catch (error) {
      console.error('Error opening journey details:', error);
      // Removed notification:'error', 'Failed to open journey details');
    }
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
            if (parsedUser.firebaseUid) {
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
            if (parsedUser.firebaseUid) {
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

  const handleDeleteCoverLetter = async (coverLetter: CoverLetter) => {
    try {
      const userId = getUserIdForAPI(user);
      if (!userId) {
        console.error('User not authenticated for cover letter deletion');
        return;
      }

      const response = await authenticatedFetch(`/api/cover-letters/${coverLetter.id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        if (result.success) {
          setCoverLetters(coverLetters.filter(cl => cl.id !== coverLetter.id));
          console.log(`Successfully deleted cover letter: ${coverLetter.title}`);
        } else {
          console.error('Delete cover letter error:', {
            coverLetterId: coverLetter.id,
            title: coverLetter.title,
            error: result.error || 'Unknown error'
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Delete cover letter error:', {
          coverLetterId: coverLetter.id,
          title: coverLetter.title,
          userId,
          status: response.status,
          error: errorData.error || errorData.message || 'Failed to delete cover letter'
        });
      }
    } catch (error) {
      console.error('Error deleting cover letter:', {
        coverLetterId: coverLetter.id,
        title: coverLetter.title,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Clean unlinked CVs handler
  const handleCleanUnlinkedCVs = async (unlinkedCVs: any[]) => {
    try {
      const userId = getUserIdForAPI(user);
      if (!userId) {
        // Removed notification:'error', 'User not authenticated');
        return;
      }

      // Delete each unlinked CV
      for (const cv of unlinkedCVs) {
        const response = await authenticatedFetch(`/api/cvs/${cv.id}?userId=${userId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          console.error(`Failed to delete CV: ${cv.title}`);
        }
      }

      // Refresh CVs list
      await loadCVs(userId);
      // Removed notification:'success', `Successfully deleted ${unlinkedCVs.length} unlinked CVs`);
    } catch (error) {
      console.error('Clean unlinked CVs error:', error);
      // Removed notification:'error', 'Failed to clean unlinked CVs');
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
        try {
          // Ensure we have a valid ID - check both id and _id fields
          const coverLetterId = coverLetter.id || coverLetter._id;
          
          const coverLetterTitle = coverLetter.title || coverLetter.name || 'Unknown Cover Letter';
          
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

      // Refresh cover letters list
      await loadCoverLetters();
      
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

  const toggleCoverLetterStar = async (coverLetterId: string) => {
    try {
      const coverLetter = coverLetters.find(cl => cl.id === coverLetterId);
      if (!coverLetter) return;

      const response = await authenticatedFetch(`/api/cover-letters/${coverLetterId}`, {
        method: 'PUT',
        body: JSON.stringify({
          isStarred: !coverLetter.isStarred,
          userId: getUserIdForAPI(user)
        }),
      });

      if (response.ok) {
        setCoverLetters(coverLetters.map(cl => 
          cl.id === coverLetterId ? { ...cl, isStarred: !cl.isStarred } : cl
        ));
        // Removed notification:'success', coverLetter.isStarred ? 'Removed from favorites' : 'Added to favorites');
      } else {
        // Removed notification:'error', 'Failed to update favorite status');
      }
    } catch (error) {
      console.error('Error toggling cover letter star:', error);
      // Removed notification:'error', 'Error updating favorite status');
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
            if (parsedUser.firebaseUid) {
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

  // Fetch available jobs for linking
  const fetchAvailableJobs = async () => {
    try {
      const userId = getUserIdForAPI(user);
      if (!userId) return;

      const response = await authenticatedFetch(`/api/jobs?userId=${userId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.jobs) {
          setAvailableJobs(result.jobs);
        }
      }
    } catch (error) {
      console.error('Error fetching available jobs:', error);
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
        loadCVs();
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
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });
  }, [coverLetters, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Page Header - Always show immediately */}
      <PageHeader
        title="CV Studio"
        description="Create, edit, and manage professional CVs"
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

      {/* Tab Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('cv')}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-none border-b-2 ${
                  activeTab === 'cv'
                    ? 'text-lime-700 dark:text-lime-400 border-lime-500 dark:border-lime-400'
                    : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4 mr-2" />
                CVs
              </button>
              <button
                onClick={() => setActiveTab('coverLetter')}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-none border-b-2 ${
                  activeTab === 'coverLetter'
                    ? 'text-lime-700 dark:text-lime-400 border-lime-500 dark:border-lime-400'
                    : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <PenTool className="h-4 w-4 mr-2" />
                Cover Letters
              </button>
            </div>
          </div>
          </div>

        {/* Right Side - Sort and Clean Unlinked Buttons */}
        <div className="flex items-center gap-2">
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
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        sortBy === option.value
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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-3 space-y-6">


      {/* CV Grid */}
      <div className="space-y-6">

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {/* Master CV Card - Always First */}
          {(() => {
            console.log('🔍 Canvas - Rendering CV Grid:', {
              activeTab,
              loading,
              cvsLength: cvs.length,
              masterCVsLength: masterCVs.length,
              filteredAndSortedCVsLength: filteredAndSortedCVs.length,
              mongoDBUserId,
              userIdFromAPI: getUserIdForAPI(user),
              masterCVs: masterCVs.map(m => ({ 
                id: m.id, 
                title: m.title,
                hasCvData: !!m.cvData,
                hasTemplate: !!m.template,
                templateType: typeof m.template,
                templateKeys: m.template ? Object.keys(m.template) : []
              })),
              filteredCVs: filteredAndSortedCVs.map(cv => ({ id: cv.id, title: cv.title }))
            });
            return null;
          })()}
          <MasterCVCardOverlay
            onEditMasterCV={handleEditMasterCV}
            onDuplicateMasterCV={handleDuplicateMasterCV}
            userId={mongoDBUserId || getUserIdForAPI(user) || ''}
            onToggleStar={toggleStar}
            masterCVData={masterCVs.length > 0 ? {
              id: masterCVs[0].id,
              title: masterCVs[0].title,
              lastModified: masterCVs[0].lastModified,
              status: masterCVs[0].status,
              isMaster: true,
              cvData: masterCVs[0].cvData,
              template: masterCVs[0].template && typeof masterCVs[0].template === 'object' 
                ? masterCVs[0].template 
                : (masterCVs[0].templateId ? { 
                    _id: masterCVs[0].templateId, 
                    name: masterCVs[0].templateName || 'Default Template',
                    globalStyles: {},
                    availableSections: []
                  } : null),
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
                console.log('🔍 Canvas - Rendering CV Card:', { index, id: cv.id, title: cv.title });
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
                      atsScore: cv.atsScore,
                      metadata: cv.metadata
                    }}
                    onEdit={(cv) => { handleCVClick(cv as any); }}
                    onDownload={(cv) => { handleDownloadCV(cv as any); }}
                    onDelete={(cv) => { handleDeleteCV(cv as any); }}
                    onToggleStar={toggleStar}
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
      </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* KPI Metrics - 2x2 Grid */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">CV Metrics</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Total CVs</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{cvs.length}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                    <Eye className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Views</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{cvs.reduce((sum, cv) => sum + cv.views, 0)}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                    <Star className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Starred</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{cvs.filter(cv => cv.isStarred).length}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Published</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{cvs.filter(cv => cv.status === 'published').length}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* CV Tips */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">CV Tips</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
                <p className="text-[#80FF00] text-sm font-bold mb-2">Keep it concise</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Limit your CV to 1-2 pages for better readability</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
                <p className="text-[#80FF00] text-sm font-bold mb-2">Use action verbs</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Start bullet points with strong action verbs</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
                <p className="text-[#80FF00] text-sm font-bold mb-2">Quantify achievements</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Include specific numbers and metrics when possible</p>
              </div>
            </div>
          </div>

        </div>
      </div>
      ) : (
        /* Cover Letter Content */
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-3 space-y-6">


            {/* Cover Letter Grid */}
            <div className="space-y-6">

              {filteredAndSortedCoverLetters.length > 0 ? (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredAndSortedCoverLetters.map((coverLetter) => (
                    <CoverLetterCardOverlay
                      key={coverLetter.id}
                      coverLetter={{
                        id: coverLetter.id,
                        title: coverLetter.title,
                        lastModified: coverLetter.lastModified,
                        status: coverLetter.status,
                        content: coverLetter.content || '',
                        isStarred: coverLetter.isStarred,
                        views: coverLetter.views || 0,
                        thumbnail: coverLetter.thumbnail || '',
                        metadata: coverLetter.metadata
                      }}
                      onEdit={(cl) => { window.location.href = `/studio?type=cover_letter&coverLetterId=${cl.id}`; }}
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
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* KPI Metrics - 2x2 Grid */}
            <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Cover Letter Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <motion.div
                  className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                      <PenTool className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">Total</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{coverLetters.length}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                      <Eye className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">Views</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{coverLetters.reduce((sum, cl) => sum + (cl.views || 0), 0)}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                      <Star className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">Starred</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{coverLetters.filter(cl => cl.isStarred).length}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">Published</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{coverLetters.filter(cl => cl.status === 'final').length}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Cover Letter Tips */}
            <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Cover Letter Tips</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
                  <p className="text-[#80FF00] text-sm font-bold mb-2">Personalize it</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Address the hiring manager by name when possible</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
                  <p className="text-[#80FF00] text-sm font-bold mb-2">Show enthusiasm</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Express genuine interest in the company and role</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
                  <p className="text-[#80FF00] text-sm font-bold mb-2">Keep it concise</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Limit to one page and focus on key achievements</p>
                </div>
              </div>
            </div>
          </div>
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

      {/* Download Modal */}
      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => {
          setDownloadModalOpen(false);
          setSelectedCVForDownload(null);
        }}
        onDownload={handleDownload}
        hasCV={!!selectedCVForDownload}
        hasCoverLetter={false}
        isDownloading={isDownloading}
      />

      {/* JobModal */}
      {showJourneyModal && selectedJobForJourney && (
        <JobModal
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
            loadCVs();
          }}
        />
      )}
    </div>
  );
};

export default Canvas;
