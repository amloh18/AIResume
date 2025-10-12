'use client';

import React, { useState, useEffect } from 'react';
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

const Canvas: React.FC = () => {
  console.log('🔍 Canvas - Component rendered');
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { createCV } = useCreateCV();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData, loading: userLoading, error: userError } = useUserData();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [masterCVs, setMasterCVs] = useState<CV[]>([]);
  const [mongoDBUserId, setMongoDBUserId] = useState<string | null>(null);
  
  // ApplicationJourneyModal state
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [selectedJobForJourney, setSelectedJobForJourney] = useState<any>(null);
  const [journeysForSelectedJob, setJourneysForSelectedJob] = useState<any[]>([]);
  
  // Helper function to resolve MongoDB user ID using unified authentication
  const resolveMongoDBUserId = async (userId: string): Promise<string | null> => {
    try {
      // Check if it's already a MongoDB ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(userId)) {
        console.log('🔍 Canvas - Using MongoDB ObjectId:', userId);
        return userId;
      } else {
        // Try to get MongoDB user ID from server
        console.log('🔍 Canvas - Firebase UID detected, fetching MongoDB user ID...');
        const userResponse = await fetch('/api/user/current');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.user && userData.user.id) {
            console.log('✅ Canvas - Found MongoDB user ID:', userData.user.id);
            return userData.user.id;
          }
        }
      }
    } catch (error) {
      console.error('❌ Canvas - Error resolving user ID:', error);
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
        console.log('🔍 Canvas - MongoDB userId resolved:', resolvedUserId);
      }
    };
    
    initializeUserId();
  }, [user]);
  
  // Debug CVs state
  useEffect(() => {
    console.log('🔍 Canvas - CVs state updated:', cvs.length, 'CVs');
    if (cvs.length > 0) {
      console.log('🔍 Canvas - First CV:', cvs[0]);
    }
  }, [cvs]);

  // Handle CV creation
  const handleCreateCV = async () => {
    try {
      const userId = getUserIdForAPI(user);
      if (userId) {
        await createCV({ userId });
      } else {
        console.error('No user ID available for CV creation');
      }
    } catch (error) {
      console.error('Error creating CV:', error);
    }
  };

  // Master CV handlers
  const handleEditMasterCV = async (masterCV: any) => {
    try {
      console.log('🔍 Editing master CV:', masterCV);
      
      // Store master CV data in sessionStorage for studio to access
      sessionStorage.setItem('editingMasterCV', JSON.stringify(masterCV));
      sessionStorage.setItem('editingCVId', masterCV.id);
      sessionStorage.setItem('editingCVTitle', masterCV.title);
      sessionStorage.setItem('editingCVData', JSON.stringify(masterCV.cvData));
      
      // Navigate to studio with master CV
      window.location.href = `/studio?cvId=${masterCV.id}&master=true`;
    } catch (error) {
      console.error('❌ Error editing master CV:', error);
    }
  };

  const handleDuplicateMasterCV = async (masterCV: any) => {
    try {
      console.log('🔍 Duplicating master CV using ApplicationPackageService:', masterCV);
      
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
        
        console.log('✅ Master CV duplicated successfully:', duplicatedCVId);
        addToast('success', 'Master CV duplicated successfully! You can now link it to a job.');
      } else {
        throw new Error(duplicateResult.message || 'Failed to duplicate master CV');
      }
    } catch (error) {
      console.error('❌ Error duplicating master CV:', error);
      addToast('error', 'Failed to duplicate master CV');
    }
  };

  // CV Card handlers
  const handleDuplicateCV = async (cv: CV) => {
    try {
      console.log('🔍 Duplicating CV using ApplicationPackageService:', cv);
      
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
        console.log('✅ CV duplicated successfully as freestanding document:', duplicateResult.data.cvId);
        
        // If the source CV was linked to a journey, inform user about the duplication principle
        if (cv.journeyId) {
          addToast('info', 'A new freestanding copy was created. You can now link it to a different job application.', 5000);
        }
      } else {
        throw new Error(duplicateResult.message || 'Failed to duplicate CV');
      }
    } catch (error) {
      console.error('❌ Error duplicating CV:', error);
      addToast('error', 'Failed to duplicate CV');
    }
  };

  const handleDownloadCV = async (cv: CV) => {
    try {
      console.log('🔍 Downloading CV:', cv);
      // Open download URL in new tab
      window.open(`/api/cvs/download/${cv.id}`, '_blank');
    } catch (error) {
      console.error('❌ Error downloading CV:', error);
      addToast('error', 'Failed to download CV');
    }
  };

  const handleShareCV = async (cv: CV) => {
    try {
      console.log('🔍 Sharing CV:', cv);
      // Copy shareable link to clipboard
      const shareUrl = `${window.location.origin}/shared/cv/${cv.id}`;
      await navigator.clipboard.writeText(shareUrl);
      addToast('success', 'Share link copied to clipboard!');
    } catch (error) {
      console.error('❌ Error sharing CV:', error);
      addToast('error', 'Failed to share CV');
    }
  };

  const handleDeleteCV = async (cv: CV) => {
    try {
      console.log('🔍 Deleting CV:', cv);
      await deleteCV(cv.id);
    } catch (error) {
      console.error('❌ Error deleting CV:', error);
    }
  };

  const handleEditJourney = async (cv: CV, journey: any) => {
    try {
      console.log('🔍 Opening journey modal for CV:', cv, 'Journey:', journey);
      
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
      console.error('❌ Error opening journey modal:', error);
      addToast('error', 'Failed to open journey details');
    }
  };

  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [showModal, setShowModal] = useState(false);
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
      console.log('🔍 Canvas - User returning from onboarding, refreshing data');
      sessionStorage.removeItem('fromOnboarding'); // Clear the flag
    }
    
    // Use unified authentication
    const userId = getUserIdForAPI(user);
    if (userId) {
      loadCVs(userId);
      loadCoverLetters();
      fetchAvailableJobs();
    } else {
      console.log('No user ID available, cannot load CVs and Cover Letters');
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
      console.error('Error parsing user data from localStorage:', error);
    }
    return null;
  };

  const loadCVs = async (userId?: string) => {
    try {
      setLoading(true);
      const userIdToUse = getUserIdForAPI(user);
      
      if (!userIdToUse) {
        console.error('No user ID available from session or localStorage');
        setCvs([]);
        return;
      }
      
      console.log('Loading CVs for user:', userIdToUse);
      console.log('🔍 Canvas - User ID type:', typeof userIdToUse);
      console.log('🔍 Canvas - User ID length:', userIdToUse?.toString().length);
      
      // Use unified service to get CVs
      const result = await UnifiedCVService.getCVs(userIdToUse, { projection: 'summary' });
      console.log('🔍 Canvas - Unified CV service response:', result);
      
      if (result && result.length > 0) {
        console.log('🔍 Canvas - CV data received:', result);
        console.log('🔍 Canvas - Number of CVs:', result.length);
        
        // Process CVs with unified data structure
        const enrichedCVs = result.map((cv: any) => {
          console.log('Processing CV:', cv.id, 'Type:', typeof cv.id);
          console.log('CV data structure:', Object.keys(cv));
          
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
  };

  const loadCoverLetters = async () => {
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

  const handleCVClick = (cv: CV) => {
    console.log('🔍 Canvas - CV clicked:', cv.id);
    console.log('🔍 Canvas - CV data:', cv.cvData);
    // connectedJobs removed - relationships now managed through CVJourney
    
    setSelectedCV(cv);
    setShowModal(true);
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
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <motion.div
          className="frosted-glass-card rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-lime-400" />
            </div>
            <div>
              <p className="text-white/60 text-xs">Total CVs</p>
              <p className="text-lg font-bold text-white">{cvs.length}</p>
            </div>
          </div>
          {cvs.length === 0 && (
            <div className="mt-2 p-2 bg-lime-400/10 border border-lime-400/20 rounded-lg">
              <p className="text-lime-400 text-xs">Create your first CV!</p>
            </div>
          )}
        </motion.div>

        <motion.div
          className="frosted-glass-card rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-lg flex items-center justify-center">
              <Eye size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-xs">Total Views</p>
              <p className="text-lg font-bold text-white">{cvs.reduce((sum, cv) => sum + cv.views, 0)}</p>
            </div>
          </div>
          {cvs.reduce((sum, cv) => sum + cv.views, 0) === 0 && (
            <div className="mt-2 p-2 bg-blue-400/10 border border-blue-400/20 rounded-lg">
              <p className="text-blue-400 text-xs">Publish to get views!</p>
            </div>
          )}
        </motion.div>

        <motion.div
          className="frosted-glass-card rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-lg flex items-center justify-center">
              <Star size={16} className="text-purple-400" />
            </div>
            <div>
              <p className="text-white/60 text-xs">Starred</p>
              <p className="text-lg font-bold text-white">{cvs.filter(cv => cv.isStarred).length}</p>
            </div>
          </div>
          {cvs.filter(cv => cv.isStarred).length === 0 && (
            <div className="mt-2 p-2 bg-purple-400/10 border border-purple-400/20 rounded-lg">
              <p className="text-purple-400 text-xs">Star your favorites!</p>
            </div>
          )}
        </motion.div>

        <motion.div
          className="frosted-glass-card rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400/20 to-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle size={16} className="text-green-400" />
            </div>
            <div>
              <p className="text-white/60 text-xs">Published</p>
              <p className="text-lg font-bold text-white">{cvs.filter(cv => cv.status === 'published').length}</p>
            </div>
          </div>
          {cvs.filter(cv => cv.status === 'published').length === 0 && cvs.length > 0 && (
            <div className="mt-2 p-2 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
              <p className="text-yellow-400 text-xs">Click 'Edit' to publish!</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* CV Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your CVs</h2>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Clock size={16} />
            <span>Recently modified</span>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {/* Master CV Card - Always First */}
          <MasterCVCardOverlay
            onEditMasterCV={handleEditMasterCV}
            onDuplicateMasterCV={handleDuplicateMasterCV}
            userId={mongoDBUserId || getUserIdForAPI(user) || ''}
            onToggleStar={toggleStar}
            masterCVData={masterCVs.length > 0 ? masterCVs[0] : null}
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
                cv={cv}
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
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <motion.div
                className="bg-gray-50 dark:bg-gray-800 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                    <PenTool size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-white/60 text-xs">Total Cover Letters</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{coverLetters.length}</p>
                  </div>
                </div>
                {coverLetters.length === 0 && (
                  <div className="mt-2 p-2 bg-blue-400/10 border border-blue-400/20 rounded-lg">
                    <p className="text-blue-400 text-xs">Create your first cover letter!</p>
                  </div>
                )}
              </motion.div>

              <motion.div
                className="frosted-glass-card rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                    <Eye size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Total Views</p>
                    <p className="text-lg font-bold text-white">{coverLetters.reduce((sum, cl) => sum + cl.views, 0)}</p>
                  </div>
                </div>
                {coverLetters.reduce((sum, cl) => sum + cl.views, 0) === 0 && (
                  <div className="mt-2 p-2 bg-purple-400/10 border border-purple-400/20 rounded-lg">
                    <p className="text-purple-400 text-xs">Publish to get views!</p>
                  </div>
                )}
              </motion.div>

              <motion.div
                className="frosted-glass-card rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400/20 to-green-500/20 rounded-lg flex items-center justify-center">
                  <Star size={16} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Starred</p>
                    <p className="text-lg font-bold text-white">{coverLetters.filter(cl => cl.isStarred).length}</p>
                  </div>
                </div>
                {coverLetters.filter(cl => cl.isStarred).length === 0 && (
                  <div className="mt-2 p-2 bg-green-400/10 border border-green-400/20 rounded-lg">
                    <p className="text-green-400 text-xs">Star your favorites!</p>
                  </div>
                )}
              </motion.div>

              <motion.div
                className="frosted-glass-card rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle size={16} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Published</p>
                    <p className="text-lg font-bold text-white">{coverLetters.filter(cl => cl.status === 'final').length}</p>
                  </div>
                </div>
                {coverLetters.filter(cl => cl.status === 'final').length === 0 && coverLetters.length > 0 && (
                  <div className="mt-2 p-2 bg-orange-400/10 border border-orange-400/20 rounded-lg">
                    <p className="text-orange-400 text-xs">Publish your cover letters!</p>
                  </div>
                )}
              </motion.div>

              <motion.div
                className="frosted-glass-card rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {/* Connected Jobs statistics removed - relationships now managed through CVJourney */}
              </motion.div>
            </div>

            {/* Cover Letter Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Cover Letters</h2>
                <motion.button
                  onClick={() => window.location.href = '/studio?type=cover_letter'}
                  className="px-4 py-2 bg-blue-400/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-400/30 transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                >
                  <Plus size={16} />
                  Create Cover Letter
                </motion.button>
              </div>

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

      {/* CV Details Modal */}
      <AnimatePresence>
        {showModal && selectedCV && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg w-full max-w-[960px] max-h-[80vh] overflow-hidden"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 id="modal-title" className="text-xl font-bold text-white">CV — {selectedCV.title}</h2>
                </div>
                <motion.button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg bg-gray-700 dark:bg-white/10 hover:bg-gray-600 dark:hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close modal"
                >
                  <X size={20} className="text-white" />
                </motion.button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: CV Preview */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText size={20} className="text-lime-400" />
                        CV Preview
                      </h3>
                      
                    {/* CV Preview - Using CVPreviewContent component */}
                      <div className="bg-gray-300 dark:bg-white/5 border border-gray-400 dark:border-white/10 rounded-xl p-4 h-96 overflow-hidden text-gray-900 dark:text-white">
                        {selectedCV.cvData ? (
                          <div className="h-full flex items-center justify-center">
                            <div className="transform scale-[0.35] origin-center">
                              <div className="w-[794px] h-[1123px] bg-white rounded-lg shadow-lg overflow-hidden">
                                <CVPreviewContent 
                                  cvData={selectedCV.cvData}
                                  theme="light"
                                  showBadge={false}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-600 dark:text-white/60">
                            <div className="text-center">
                              <FileText size={48} className="mx-auto mb-4 opacity-50" />
                              <p className="text-lg font-medium">No CV data available</p>
                              <p className="text-sm">Start adding your information to see a preview</p>
                            </div>
                          </div>
                        )}
                      </div>
                        </div>
                        
                  {/* Right Column: Actions and Metadata */}
                  <div className="space-y-6">
                    {/* Primary Actions */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <motion.button
                          className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2 text-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setShowModal(false);
                            // Store CV session data and route to studio
                            sessionStorage.setItem('editingCVId', selectedCV.id);
                            sessionStorage.setItem('editingCVTitle', selectedCV.title);
                            sessionStorage.setItem('editingCVData', JSON.stringify(selectedCV));
                            window.location.href = `/studio?type=cv&cvId=${selectedCV.id}`;
                          }}
                        >
                          <Edit size={14} />
                          Edit CV
                        </motion.button>
                        
                        <div className="relative group">
                        <motion.button
                            className="px-4 py-2 bg-gray-700 dark:bg-white/10 border border-gray-600 dark:border-white/20 text-white font-medium rounded-lg hover:bg-gray-600 dark:hover:bg-white/20 transition-all duration-300 flex items-center gap-2 text-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Download size={14} />
                            Download
                        </motion.button>
                          <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <div className="p-1">
                              <button className="w-full px-3 py-2 text-left text-white/80 hover:text-white hover:bg-white/80 dark:hover:bg-white/10 rounded text-sm flex items-center gap-2">
                                <FileText size={12} />
                                Download CV (PDF)
                              </button>
                              <button className="w-full px-3 py-2 text-left text-white/40 hover:text-white hover:bg-white/80 dark:hover:bg-white/10 rounded text-sm flex items-center gap-2" disabled>
                                <PenTool size={12} />
                                Download Cover Letter (PDF)
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <motion.button
                          className="px-4 py-2 bg-white/80 dark:bg-white/10 border border-white/40 dark:border-white/20 text-white font-medium rounded-lg hover:bg-white/90 dark:hover:bg-white/20 transition-all duration-300 flex items-center gap-2 text-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Share2 size={14} />
                          Share CV
                        </motion.button>
                    </div>
                  </div>

                    {/* Linked Jobs */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-white/80 text-sm font-medium">Linked Jobs:</label>
                        <div className="flex-1 min-w-0">
                          <select 
                            className="w-full px-3 py-2 bg-gray-700 dark:bg-white/10 border border-gray-600 dark:border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-lime-400/50"
                            onChange={(e) => {
                              console.log('🔍 Canvas - Job selection changed:', e.target.value);
                              // Here you would link the selected job to the CV
                              if (e.target.value) {
                                // Link job to CV logic
                                console.log('🔍 Canvas - Linking job to CV:', e.target.value);
                              }
                            }}
                          >
                            <option value="">Job linking removed - use journey system</option>
                            <option value="" disabled>No jobs available</option>
                          </select>
                        </div>
                        <motion.button
                          className="p-2 bg-lime-400/20 text-lime-400 rounded-lg hover:bg-lime-400/30 transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="Link job to CV"
                          onClick={() => {
                            console.log('🔍 Canvas - Link job button clicked');
                            // Navigate to job tracker to select a job
                            window.location.href = '/dashboard?linkCV=' + selectedCV.id;
                          }}
                        >
                          <Link size={14} />
                        </motion.button>
                      </div>
                      
                      {/* Linked jobs section removed - relationships now managed through CVJourney */}
                    </div>


                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


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
