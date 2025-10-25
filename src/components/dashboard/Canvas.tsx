'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import RecentActivityWidget from './RecentActivityWidget';
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
  AlertCircle
} from 'lucide-react';
import { useCreateCV } from '@/lib/utils/cvCreationUtils';
import CVPreviewContent from '@/components/studio/CVPreviewContent';
import PageHeader from './PageHeader';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { ApplicationPackageService } from '@/lib/services/applicationPackageService';
import { UnifiedCVService } from '@/lib/services/unified-cv-service';
import { useNotifications } from '@/contexts/NotificationContext';
import MasterCVCardOverlay from './MasterCVCardOverlay';
import CVCardOverlay from './CVCardOverlay';
import CoverLetterCardOverlay from './CoverLetterCardOverlay';
import ApplicationJourneyModal from './ApplicationJourneyModal';
import { useOptimizedDataFetching } from '@/lib/hooks/useOptimizedDataFetching';
import { CanvasSkeleton } from '@/components/ui/OptimizedSkeletons';
import { formatCardTime } from '@/lib/utils/timeUtils';

interface CV {
  id: string;
  title: string;
  lastModified: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  isStarred: boolean;
  thumbnail: string;
  description?: string;
  cvData?: any; // CV data structure for preview
  // connectedJobs removed - relationships now managed through CVJourney

  completionPercentage?: number;
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
  views: number;
  isStarred: boolean;
  thumbnail: string;
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
    const linkedItemIds = new Set();
    
    journeys.forEach(journey => {
      if (type === 'cv' && journey.cvId) {
        linkedItemIds.add(journey.cvId);
      } else if (type === 'cover-letter' && journey.coverLetterId) {
        linkedItemIds.add(journey.coverLetterId);
      }
    });

    // Filter items that are not linked to any journeys
    const unlinked = items.filter(item => {
      // Skip master CVs
      if (type === 'cv' && item.isMaster) {
        return false;
      }
      
      // Check if item is linked to any journey
      return !linkedItemIds.has(item.id);
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
  
  // ApplicationJourneyModal state
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [selectedJobForJourney, setSelectedJobForJourney] = useState<any>(null);
  const [journeysForSelectedJob, setJourneysForSelectedJob] = useState<any[]>([]);
  
  // Helper function to resolve MongoDB user ID using unified authentication
  const resolveMongoDBUserId = async (userId: string): Promise<string | null> => {
    try {
      // Check if it's already a MongoDB ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(userId)) {
        return userId;
      } else {
        // Try to get MongoDB user ID from server
        const userResponse = await fetch('/api/user/current');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.user && userData.user.id) {
            return userData.user.id;
          }
        }
      }
    } catch (error) {
      // Silent fail - user ID resolution failed
    }
    return null;
  };
  
  // Resolve MongoDB userId when session changes
  useEffect(() => {
    const initializeUserId = async () => {
      const userId = getUserIdForAPI(user);
      if (userId) {
        const resolvedUserId = await resolveMongoDBUserId(userId);
        setMongoDBUserId(resolvedUserId);
      }
    };
    
    initializeUserId();
  }, [user]);
  
  // CVs state monitoring
  useEffect(() => {
    // CVs loaded successfully
  }, [cvs]);

  // Handle CV creation
  const handleCreateCV = async () => {
    try {
      const userId = getUserIdForAPI(user);
      if (userId) {
        await createCV({ userId });
      }
    } catch (error) {
      addToast('error', 'Failed to create CV');
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
      addToast('error', 'Failed to open master CV');
    }
  };

  const handleDuplicateMasterCV = async (masterCV: any) => {
    try {
      
      const userId = getUserIdForAPI(user) || getUserIdFromLocalStorage();
      if (!userId) {
        addToast('error', 'User not authenticated');
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
        
        addToast('success', 'Master CV duplicated successfully! You can now link it to a job.');
      } else {
        throw new Error(duplicateResult.message || 'Failed to duplicate master CV');
      }
    } catch (error) {
      addToast('error', 'Failed to duplicate master CV');
    }
  };

  // CV Card handlers
  const handleDuplicateCV = async (cv: CV) => {
    try {
      
      const userId = getUserIdForAPI(user) || getUserIdFromLocalStorage();
      if (!userId) {
        addToast('error', 'User not authenticated');
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
        addToast('success', 'CV duplicated successfully! The copy is ready to be linked to a new job.');
        
        // If the source CV was linked to a journey, inform user about the duplication principle
        if (cv.journeyId) {
          addToast('info', 'A new freestanding copy was created. You can now link it to a different job application.', 5000);
        }
      } else {
        throw new Error(duplicateResult.message || 'Failed to duplicate CV');
      }
    } catch (error) {
      addToast('error', 'Failed to duplicate CV');
    }
  };

  const handleDownloadCV = async (cv: CV) => {
    try {
      // Open download URL in new tab
      window.open(`/api/cvs/download/${cv.id}`, '_blank');
    } catch (error) {
      addToast('error', 'Failed to download CV');
    }
  };

  const handleShareCV = async (cv: CV) => {
    try {
      // Copy shareable link to clipboard
      const shareUrl = `${window.location.origin}/shared/cv/${cv.id}`;
      await navigator.clipboard.writeText(shareUrl);
      addToast('success', 'Share link copied to clipboard!');
    } catch (error) {
      addToast('error', 'Failed to share CV');
    }
  };

  const handleDeleteCV = async (cv: CV) => {
    try {
      await deleteCV(cv.id);
    } catch (error) {
      addToast('error', 'Failed to delete CV');
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
          addToast('error', 'Failed to load job details');
        }
      } else {
        addToast('error', 'Failed to load job details');
      }
    } catch (error) {
      addToast('error', 'Failed to open journey details');
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
  const { notifications, addNotification, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  // userProfile is now handled by the useUserData hook
  
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

  // Notification functions (using unified notification system)
  const addToast = (type: 'success' | 'error' | 'info', message: string, duration: number = 4000) => {
    addNotification({
      type,
      title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
      message,
      persistent: false
    });
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
        const parsedUser = JSON.parse(userData);
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
      const userIdToUse = getUserIdForAPI(user);
      
      if (!userIdToUse) {
        setCvs([]);
        return;
      }
      
      // Use unified service to get CVs
      const result = await UnifiedCVService.getCVs(userIdToUse, { projection: 'summary' });
      
      if (result && result.length > 0) {
        // Process CVs with unified data structure
        const enrichedCVs = result.map((cv: any) => {
          
          return {
            id: cv.id,
            title: cv.title || 'Untitled CV',
            lastModified: cv.metadata?.lastModified || cv.updatedAt || cv.createdAt,
            status: cv.status || 'draft',
            views: cv.metadata?.viewCount || 0,
            isStarred: cv.metadata?.starred || false,
            thumbnail: cv.metadata?.thumbnailUrl,
            description: cv.description || '',
            cvData: cv.cvData || null, // Include CV data for preview
            completionPercentage: calculateCompletionPercentage(cv),
            isMaster: cv.metadata?.isMaster || false, // Include master flag
            atsScore: cv.metadata?.atsScore, // Include ATS score
            metadata: cv.metadata // Include full metadata
          };
        });
        
        // Separate Master CVs from regular CVs based on isMaster metadata
        console.log('🔍 Canvas - All CVs before filtering:', enrichedCVs.map(cv => ({ 
          id: cv.id, 
          title: cv.title, 
          isMaster: cv.isMaster,
          metadataIsMaster: cv.metadata?.isMaster 
        })));
        
        // Filter CVs based on isMaster metadata
        const masterCVs = enrichedCVs.filter(cv => cv.isMaster === true);
        const regularCVs = enrichedCVs.filter(cv => cv.isMaster === false);
        
        console.log('🔍 Canvas - Master CVs:', masterCVs.length);
        console.log('🔍 Canvas - Regular CVs:', regularCVs.length);
        console.log('🔍 Canvas - First CV sample:', regularCVs[0]);
        console.log('🔍 Canvas - Master CVs data:', masterCVs);
        console.log('🔍 Canvas - First Master CV:', masterCVs[0]);
        
        // Store both Master CVs and regular CVs
        setCvs(regularCVs);
        setMasterCVs(masterCVs);
      } else {
        console.log('🔍 Canvas - No CVs found');
        setCvs([]);
        setMasterCVs([]);
      }
    } catch (error) {
      console.error('Error loading CVs:', error);
      setCvs([]);
      setMasterCVs([]);
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
            addToast('error', 'Failed to load job details');
          }
        } else {
          addToast('error', 'Failed to load job details');
        }
      } else {
        // If no journey found, show a message or create a new journey
        addToast('info', 'This CV is not linked to any application journey. Please create a journey first.');
      }
    } catch (error) {
      console.error('Error opening journey details:', error);
      addToast('error', 'Failed to open journey details');
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
            const parsedUser = JSON.parse(userData);
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
            const parsedUser = JSON.parse(userData);
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
        addToast('error', 'Please log in again to continue.');
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
        addToast('success', 'Cover letter title updated successfully');
      } else {
        const errorData = await response.json();
        console.error('Error updating cover letter title:', errorData);
        addToast('error', 'Failed to update cover letter title. Please try again.');
      }
    } catch (error) {
      console.error('Error saving cover letter title:', error);
      addToast('error', 'Error updating cover letter title. Please try again.');
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
        addToast('error', 'User not authenticated');
        return;
      }

      const response = await authenticatedFetch(`/api/cover-letters/${coverLetter.id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCoverLetters(coverLetters.filter(cl => cl.id !== coverLetter.id));
        addToast('success', 'Cover letter deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Delete cover letter error:', errorData);
        addToast('error', errorData.error || 'Failed to delete cover letter');
      }
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      addToast('error', 'Error deleting cover letter');
    }
  };

  // Clean unlinked CVs handler
  const handleCleanUnlinkedCVs = async (unlinkedCVs: any[]) => {
    try {
      const userId = getUserIdForAPI(user);
      if (!userId) {
        addToast('error', 'User not authenticated');
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
      addToast('success', `Successfully deleted ${unlinkedCVs.length} unlinked CVs`);
    } catch (error) {
      console.error('Clean unlinked CVs error:', error);
      addToast('error', 'Failed to clean unlinked CVs');
    }
  };

  // Clean unlinked cover letters handler
  const handleCleanUnlinkedCoverLetters = async (unlinkedCoverLetters: any[]) => {
    try {
      const userId = getUserIdForAPI(user);
      if (!userId) {
        addToast('error', 'User not authenticated');
        return;
      }

      // Delete each unlinked cover letter
      for (const coverLetter of unlinkedCoverLetters) {
        const response = await authenticatedFetch(`/api/cover-letters/${coverLetter.id}?userId=${userId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          console.error(`Failed to delete cover letter: ${coverLetter.title}`);
        }
      }

      // Refresh cover letters list
      await loadCoverLetters();
      addToast('success', `Successfully deleted ${unlinkedCoverLetters.length} unlinked cover letters`);
    } catch (error) {
      console.error('Clean unlinked cover letters error:', error);
      addToast('error', 'Failed to clean unlinked cover letters');
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
        addToast('success', coverLetter.isStarred ? 'Removed from favorites' : 'Added to favorites');
      } else {
        addToast('error', 'Failed to update favorite status');
      }
    } catch (error) {
      console.error('Error toggling cover letter star:', error);
      addToast('error', 'Error updating favorite status');
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
            const parsedUser = JSON.parse(userData);
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
        addToast('success', 'CV deleted successfully!');
        addNotification('success', 'CV Deleted', 'Your CV has been successfully deleted.');
      } else {
        console.error('Failed to delete CV:', result.message);
        addToast('error', `Failed to delete CV: ${result.message}`);
        addNotification('error', 'Delete Failed', `Failed to delete CV: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting CV:', error);
      addToast('error', 'Error deleting CV. Please try again.');
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
      const result = await ApplicationPackageService.createApplicationPackage({
        jobId,
        cvId,
        userId,
        journeyName: `Application for ${jobId}`
      });

      if (result.success) {
        // Refresh CVs to show updated job links
        loadCVs();
        setLinkingJobCVId(null);
        showModalDialog('Success', 'Job linked to CV successfully via journey system!', 'success');
      } else {
        showModalDialog('Error', `Failed to link job to CV: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('Error linking job to CV:', error);
      showModalDialog('Error', 'Failed to link job to CV', 'error');
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
          role: user?.role,
          subscription: userData?.subscription
        }}
        showSettings={true}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onRemoveNotification={removeNotification}
        onMobileMenuToggle={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <motion.button
          onClick={() => setActiveTab('cv')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeTab === 'cv' ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30' : 'bg-gray-700 dark:bg-white/5 text-white dark:text-white/60 border border-gray-600 dark:border-white/10 hover:bg-gray-600 dark:hover:bg-white/10'
          }`}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        >
          <FileText size={16} className="inline mr-2" />
          CVs
        </motion.button>
        <motion.button
          onClick={() => setActiveTab('coverLetter')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeTab === 'coverLetter' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' : 'bg-gray-700 dark:bg-white/5 text-white dark:text-white/60 border border-gray-600 dark:border-white/10 hover:bg-gray-600 dark:hover:bg-white/10'
          }`}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        >
          <PenTool size={16} className="inline mr-2" />
          Cover Letters
        </motion.button>
      </div>

      {/* Main Content Based on Active Tab */}
      {activeTab === 'cv' ? (
        /* CV Content */
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-3 space-y-6">

      {/* CV Section Header with Clean Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">CVs</h2>
          <span className="text-sm text-gray-400">({cvs.length + masterCVs.length} total)</span>
        </div>
        <CleanUnlinkedButton
          type="cv"
          items={cvs}
          journeys={journeys}
          onClean={handleCleanUnlinkedCVs}
          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
        />
      </div>

      {/* CV Grid */}
      <div className="space-y-6">

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {/* Master CV Card - Always First */}
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
              isStarred: masterCVs[0].isStarred,
              thumbnail: masterCVs[0].thumbnail || '',
              metadata: masterCVs[0].metadata
            } : null}
          />

          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="frosted-glass-card rounded-2xl p-6 animate-pulse">
                <div className="h-48 bg-gray-200 dark:bg-white/10 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-2/3"></div>
              </div>
            ))
          ) : (
            // CV Cards with Overlay Design
            cvs.map((cv, index) => (
              <CVCardOverlay
                key={cv.id}
                cv={{
                  ...cv,
                  thumbnail: cv.thumbnail || ''
                }}
                onEdit={handleCVClick}
                onDownload={handleDownloadCV}
                onDelete={handleDeleteCV}
                onToggleStar={toggleStar}
                onRename={(cvId, newTitle) => {
                  setEditingTitle(newTitle);
                  saveTitle(cvId);
                }}
                onEditJourney={handleEditJourney}
                onTitleEdit={(cvId, newTitle) => setEditingTitle(newTitle)}
                editingCVId={editingCVId}
                editingTitle={editingTitle}
                onStartEditing={startEditing}
                onSaveTitle={saveTitle}
                onCancelEditing={cancelEditing}
              />
            ))
          )}
        </div>
        </div>
      </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* KPI Metrics - 2x2 Grid */}
          <div className="frosted-glass-widget rounded-xl p-6">
            <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-400" />
              CV Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                className="frosted-glass-card rounded-lg p-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-lg flex items-center justify-center">
                    <FileText size={12} className="text-lime-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Total CVs</p>
                    <p className="text-sm font-bold text-white">{cvs.length}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="frosted-glass-card rounded-lg p-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                    <Eye size={12} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Views</p>
                    <p className="text-sm font-bold text-white">{cvs.reduce((sum, cv) => sum + cv.views, 0)}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="frosted-glass-card rounded-lg p-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                    <Star size={12} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Starred</p>
                    <p className="text-sm font-bold text-white">{cvs.filter(cv => cv.isStarred).length}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="frosted-glass-card rounded-lg p-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-400/20 to-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle size={12} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Published</p>
                    <p className="text-sm font-bold text-white">{cvs.filter(cv => cv.status === 'published').length}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* CV Tips */}
          <div className="frosted-glass-widget rounded-xl p-6">
            <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-4 flex items-center gap-2">
              <Lightbulb size={14} className="text-yellow-400" />
              CV Tips
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
                <p className="text-yellow-400 text-xs font-medium mb-1">Keep it concise</p>
                <p className="text-white/60 text-xs">Limit your CV to 1-2 pages for better readability</p>
              </div>
              <div className="p-3 bg-blue-400/10 border border-blue-400/20 rounded-lg">
                <p className="text-blue-400 text-xs font-medium mb-1">Use action verbs</p>
                <p className="text-white/60 text-xs">Start bullet points with strong action verbs</p>
              </div>
              <div className="p-3 bg-green-400/10 border border-green-400/20 rounded-lg">
                <p className="text-green-400 text-xs font-medium mb-1">Quantify achievements</p>
                <p className="text-white/60 text-xs">Include specific numbers and metrics when possible</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <RecentActivityWidget limit={5} />
        </div>
      </div>
      ) : (
        /* Cover Letter Content */
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-3 space-y-6">

            {/* Cover Letter Section Header with Clean Button */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">Cover Letters</h2>
                <span className="text-sm text-gray-400">({coverLetters.length} total)</span>
              </div>
              <CleanUnlinkedButton
                type="cover-letter"
                items={coverLetters}
                journeys={journeys}
                onClean={handleCleanUnlinkedCoverLetters}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
              />
            </div>

            {/* Cover Letter Grid */}
            <div className="space-y-6">

              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {coverLetters.map((coverLetter) => (
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
                    onEdit={(cl) => window.location.href = `/studio?type=cover_letter&coverLetterId=${cl.id}`}
                    onDownload={(cl) => window.open(`/api/cover-letters/download/${cl.id}`, '_blank')}
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
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* KPI Metrics - 2x2 Grid */}
            <div className="frosted-glass-widget rounded-xl p-6">
              <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-400" />
                Cover Letter Metrics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <motion.div
                  className="frosted-glass-card rounded-lg p-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                      <PenTool size={12} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-xs">Total</p>
                      <p className="text-sm font-bold text-white">{coverLetters.length}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="frosted-glass-card rounded-lg p-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                      <Eye size={12} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-xs">Views</p>
                      <p className="text-sm font-bold text-white">{coverLetters.reduce((sum, cl) => sum + cl.views, 0)}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="frosted-glass-card rounded-lg p-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-400/20 to-green-500/20 rounded-lg flex items-center justify-center">
                      <Star size={12} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-xs">Starred</p>
                      <p className="text-sm font-bold text-white">{coverLetters.filter(cl => cl.isStarred).length}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="frosted-glass-card rounded-lg p-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-orange-400/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                      <CheckCircle size={12} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-xs">Published</p>
                      <p className="text-sm font-bold text-white">{coverLetters.filter(cl => cl.status === 'final').length}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Cover Letter Tips */}
            <div className="frosted-glass-widget rounded-xl p-6">
              <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-4 flex items-center gap-2">
                <Lightbulb size={14} className="text-blue-400" />
                Cover Letter Tips
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-400/10 border border-blue-400/20 rounded-lg">
                  <p className="text-blue-400 text-xs font-medium mb-1">Personalize it</p>
                  <p className="text-white/60 text-xs">Address the hiring manager by name when possible</p>
                </div>
                <div className="p-3 bg-green-400/10 border border-green-400/20 rounded-lg">
                  <p className="text-green-400 text-xs font-medium mb-1">Show enthusiasm</p>
                  <p className="text-white/60 text-xs">Express genuine interest in the company and role</p>
                </div>
                <div className="p-3 bg-purple-400/10 border border-purple-400/20 rounded-lg">
                  <p className="text-purple-400 text-xs font-medium mb-1">Keep it concise</p>
                  <p className="text-white/60 text-xs">Limit to one page and focus on key achievements</p>
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


      {/* ApplicationJourneyModal */}
      {showJourneyModal && selectedJobForJourney && (
        <ApplicationJourneyModal
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
