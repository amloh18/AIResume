'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
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
import { authenticatedFetch } from '@/lib/utils/apiUtils';

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
  connectedJobs?: Job[];

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
  connectedJobs?: Job[];
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
              className="ml-auto p-1 hover:bg-white/10 rounded-lg transition-colors"
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
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
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
  const { data: session } = useSession();
  const { createCV } = useCreateCV();
  const [cvs, setCvs] = useState<CV[]>([]);
  
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
      const userId = session?.user?.id || getUserIdFromLocalStorage();
      if (userId) {
        await createCV({ userId });
      } else {
        console.error('No user ID available for CV creation');
      }
    } catch (error) {
      console.error('Error creating CV:', error);
    }
  };

  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCVId, setEditingCVId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingCVId, setDeletingCVId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cv' | 'coverLetter'>('cv');
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  
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
    // Check NextAuth session first
    if (session?.user?.id) {
      loadCVs(session.user.id);
      loadCoverLetters();
    } else {
      // Fallback to Firebase user data
      const userId = getUserIdFromLocalStorage();
      if (userId) {
        loadCVs(userId);
        loadCoverLetters();
      } else {
        console.log('No user ID available, cannot load CVs and Cover Letters');
        setLoading(false);
      }
    }
  }, [session?.user?.id]);

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
      const userIdToUse = userId || session?.user?.id;
      
      if (!userIdToUse) {
        console.error('No user ID available from session or localStorage');
        setCvs([]);
        return;
      }
      
      console.log('Loading CVs for user:', userIdToUse);
      
      const response = await authenticatedFetch(`/api/cvs?userId=${userIdToUse}`);
      const result = await response.json();
      console.log('🔍 Canvas - CV API response:', result);
      
      if (result.success) {
        const cvData = result.data.cvs || result.data.data || [];
        console.log('🔍 Canvas - CV data received:', cvData);
        console.log('🔍 Canvas - Number of CVs:', cvData.length);
        console.log('🔍 Canvas - Result structure:', Object.keys(result.data));
        
        // Load connected jobs and cover letters for each CV
        const enrichedCVs = await Promise.all(cvData.map(async (cv: any) => {
          console.log('Processing CV:', cv.id || cv._id, 'Type:', typeof (cv.id || cv._id));
          console.log('CV data structure:', Object.keys(cv));
          
          const cvId = cv.id || cv._id;
          
          // Load connected jobs
          let connectedJobs: Job[] = [];
          try {
            console.log('🔍 Canvas - Loading jobs for CV:', cvId, 'User:', userIdToUse);
            const jobsUrl = `/api/jobs?userId=${userIdToUse}&cvId=${cvId}`;
            console.log('🔍 Canvas - Jobs API URL:', jobsUrl);
            
            const jobsResponse = await fetch(jobsUrl);
            console.log('🔍 Canvas - Jobs response status:', jobsResponse.status);
            
            const jobsResult = await jobsResponse.json();
            console.log('🔍 Canvas - Jobs API result:', jobsResult);
            
            if (jobsResult.success && jobsResult.data && jobsResult.data.jobs) {
              console.log('🔍 Canvas - Found jobs:', jobsResult.data.jobs.length);
              connectedJobs = jobsResult.data.jobs.map((job: any) => ({
                id: job.id || job._id,
                title: job.jobTitle,
                company: job.company,
                location: typeof job.location === 'string' ? job.location : job.location?.city || 'Remote',
                status: job.status,
                appliedDate: job.applicationDate,
                salary: job.salary ? `${job.salary.min || ''} - ${job.salary.max || ''} ${job.salary.currency || ''}` : undefined,
                description: job.jobDescription
              }));
            } else {
              console.log('🔍 Canvas - No jobs found or API error:', jobsResult);
            }
          } catch (error) {
            console.error('Error loading connected jobs for CV:', cvId, error);
          }
          

          
          return {
            id: cvId,
            title: cv.title || 'Untitled CV',
            lastModified: formatTimeAgo(new Date(cv.lastModified || cv.updatedAt || cv.createdAt)),
            status: cv.status || 'draft',
            views: cv.viewCount || cv.views || 0,
            isStarred: cv.starred || cv.isStarred || false,
            thumbnail: cv.thumbnail || '/api/placeholder/300/200',
                            description: cv.description || '',
            cvData: cv.cvData || null, // Include CV data for preview
            connectedJobs,
            completionPercentage: calculateCompletionPercentage(cv)
          };
        }));
        
        console.log('🔍 Canvas - Setting CVs:', enrichedCVs.length);
        console.log('🔍 Canvas - First CV sample:', enrichedCVs[0]);
        setCvs(enrichedCVs);
      } else {
        console.log('🔍 Canvas - API returned success: false');
        setCvs([]);
      }
    } catch (error) {
      console.error('Error loading CVs:', error);
      setCvs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCoverLetters = async () => {
    try {
      console.log('🔍 Canvas - Loading Cover Letters...');
      const userId = session?.user?.id;
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
          lastModified: cl.lastModified || cl.updatedAt,
          views: cl.views || 0,
          isStarred: cl.isStarred || false,
          thumbnail: '/api/cover-letters/thumbnail/' + (cl.id || cl._id),
          description: cl.metadata?.targetCompany ? `For ${cl.metadata.targetCompany}` : 'Cover letter',
          coverLetterData: cl.content,
          connectedJobs: cl.connectedJobs || [],
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
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} months ago`;
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
    console.log('🔍 Canvas - Connected jobs:', cv.connectedJobs);
    
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
      let userId = session?.user?.id;
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
          type: 'error'
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

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);

  const confirmDeleteCV = (cvId: string) => {
    setShowDeleteConfirmation(cvId);
  };

  const deleteCV = async (cvId: string) => {
    try {
      setDeletingCVId(cvId);
      setShowDeleteConfirmation(null);
      
      // Get user ID from session or Firebase
      let userId = session?.user?.id;
      console.log('🔍 Delete - Session user ID:', session?.user?.id);
      console.log('🔍 Delete - Session data:', session);
      
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
        console.error('Session:', session);
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
        // Show success message
        showModalDialog({
          title: 'Success',
          message: 'CV deleted successfully!',
          type: 'success'
        });
      } else {
        console.error('Failed to delete CV:', result.message);
        showModalDialog({
          title: 'Delete Failed',
          message: `Failed to delete CV: ${result.message}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting CV:', error);
      showModalDialog({
        title: 'Delete Error',
        message: 'Error deleting CV. Please try again.',
        type: 'error'
      });
    } finally {
      setDeletingCVId(null);
    }
  };

  const unlinkJobFromCV = async (cvId: string, jobId: string) => {
    try {
      // Get user ID from session or Firebase
      let userId = session?.user?.id;
      
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
        showModalDialog({
          title: 'Authentication Error',
          message: 'Please log in again to continue.',
          type: 'error'
        });
        return;
      }

      // Update local state immediately for better UX
      setCvs(prevCvs => 
        prevCvs.map(cv => 
          cv.id === cvId 
            ? { 
                ...cv, 
                connectedJobs: cv.connectedJobs?.filter(job => job.id !== jobId) || [] 
              }
            : cv
        )
      );

      // Update selected CV if it's the one being modified
      if (selectedCV && selectedCV.id === cvId) {
        setSelectedCV(prev => 
          prev ? {
            ...prev,
            connectedJobs: prev.connectedJobs?.filter(job => job.id !== jobId) || []
          } : null
        );
      }

      // Make API call to update CV (remove jobId from connected jobs)
      const response = await authenticatedFetch(`/api/cvs/${cvId}`, {
        method: 'PUT',
        body: JSON.stringify({
          userId: userId,
          unlinkJobId: jobId // Signal to remove this job from connected jobs
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error unlinking job:', errorData);
        
        showModalDialog({
          title: 'Unlink Failed',
          message: 'Failed to unlink job from CV. Please try again.',
          type: 'error'
        });
      } else {
        showModalDialog({
          title: 'Success',
          message: 'Job unlinked from CV successfully.',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error unlinking job from CV:', error);
      showModalDialog({
        title: 'Unlink Error',
        message: 'Error unlinking job from CV. Please try again.',
        type: 'error'
      });
    }
  };

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

  if (loading) {
      return (
    <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-2">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            </div>
            <div className="h-4 w-96 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* Main Grid Layout Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                  <div className="h-4 w-20 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  </div>
                  <div className="h-6 w-12 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* CV Grid Skeleton */}
            <div className="space-y-6">
              <div className="h-6 w-32 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
              </div>

              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                    {/* CV Preview Skeleton */}
                    <div className="h-48 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                    
                    {/* CV Info Skeleton */}
                    <div className="p-6 space-y-3">
                      <div className="h-5 w-3/4 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                      </div>
                      <div className="h-3 w-1/2 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                      </div>
                      <div className="h-8 w-full bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-lg">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar Skeleton */}
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="h-5 w-32 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-8 w-full bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  </div>
                  <div className="h-8 w-full bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="CV Studio"
        description="Create, edit, and manage professional CVs"
        user={session?.user || { name: 'User', email: 'user@example.com' }}
        showSettings={true}
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <motion.button
          onClick={() => setActiveTab('cv')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeTab === 'cv' ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
          }`}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        >
          <FileText size={16} className="inline mr-2" />
          CVs
        </motion.button>
        <motion.button
          onClick={() => setActiveTab('coverLetter')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeTab === 'coverLetter' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
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
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
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
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
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
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
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
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
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

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Create New CV Card - Always First */}
          <motion.div
            className="bg-gradient-to-br from-lime-400/10 to-blue-400/10 border-2 border-dashed border-lime-400/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-lime-400/50 hover:from-lime-400/15 hover:to-blue-400/15 transition-all duration-300 cursor-pointer group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={() => window.location.href = '/studio'}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mb-6 group-hover:from-lime-400/30 group-hover:to-lime-500/30 transition-all duration-300">
              <Plus size={32} className="text-lime-400" />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-3">Create New CV</h3>
            <p className="text-white/60 mb-6 max-w-sm">
              Start building your professional CV with our intuitive editor. Choose from beautiful templates and customize every detail.
            </p>
            
            <div className="flex items-center gap-4 text-white/40 text-sm mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-lime-400" />
                <span>Professional Templates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-lime-400" />
                <span>Easy Customization</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                className="px-6 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2 group-hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const userData = localStorage.getItem('user');
                    const userId = userData ? JSON.parse(userData).id || JSON.parse(userData)._id : '6889b151d17daa1eaee91a5c';
                    await createCV({
                      userId
                    });
                  } catch (error) {
                    console.error('Error creating CV:', error);
                  }
                }}
              >
                <Plus size={18} />
                Create New
              </motion.button>
              
              <motion.button
                className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2 border border-white/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/onboarding?mode=import';
                }}
              >
                <FileText size={18} />
                Import CV
              </motion.button>
            </div>
            
            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-3 text-white/60 text-sm">
                <Sparkles size={16} className="text-lime-400" />
                <span>AI-powered suggestions to help you create the perfect CV</span>
              </div>
            </div>
          </motion.div>

          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-pulse">
                <div className="h-48 bg-white/10 rounded-lg mb-4"></div>
                <div className="h-4 bg-white/10 rounded mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-2/3"></div>
              </div>
            ))
          ) : (
            // CV Cards
            cvs.map((cv, index) => (
            <motion.div
              key={cv.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 group cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => handleCVClick(cv)}
            >
              {/* CV Stats Section */}
              <div className="relative h-48 bg-gray-50 overflow-hidden">
                {/* Status Badge */}
                <div className={`absolute top-4 left-4 px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(cv.status)} z-10`}>
                  {cv.status}
                </div>
                
                {/* Star Button */}
                <motion.button
                  className="absolute top-4 right-4 p-2 rounded-lg bg-black/20 backdrop-blur-sm text-white/60 hover:text-yellow-400 transition-colors z-10"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(cv.id);
                  }}
                >
                  <Star size={16} className={cv.isStarred ? 'fill-yellow-400 text-yellow-400' : ''} />
                </motion.button>

                {/* CV Preview */}
                <div className="h-full p-4 bg-gray-50 text-gray-900">
                  {cv.cvData ? (
                    <div className="text-sm">
                      {/* CV Header */}
                      <div className="text-center mb-2">
                        <h1 className="text-lg font-bold text-gray-800 mb-1">
                          {cv.cvData.basics?.name || 'Your Name'}
                        </h1>
                        {cv.cvData.basics?.email && (
                          <p className="text-gray-700 text-xs">{cv.cvData.basics.email}</p>
                        )}
                        {cv.cvData.basics?.phone && (
                          <p className="text-gray-700 text-xs">{cv.cvData.basics.phone}</p>
                        )}
                      </div>
                      
                      {/* Professional Summary */}
                      {cv.cvData.basics?.summary && (
                        <div className="mb-2">
                          <h2 className="text-sm font-semibold text-gray-800 mb-1 border-b border-gray-400 pb-1">Professional Summary</h2>
                          <p className="text-gray-800 text-xs leading-relaxed">
                            {cv.cvData.basics.summary.substring(0, 120)}
                            {cv.cvData.basics.summary.length > 120 && '...'}
                          </p>
                        </div>
                      )}
                      
                      {/* Work Experience - First entry */}
                      {cv.cvData.work && cv.cvData.work.length > 0 && (
                        <div>
                          <h2 className="text-sm font-semibold text-gray-800 mb-1 border-b border-gray-400 pb-1">Work Experience</h2>
                          <div className="mb-1">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold text-gray-800 text-xs">
                                {cv.cvData.work[0].position || cv.cvData.work[0].title}
                              </h3>
                              <span className="text-gray-600 text-xs">
                                {cv.cvData.work[0].startDate} - {cv.cvData.work[0].endDate || 'Present'}
                              </span>
                            </div>
                            <p className="text-gray-700 text-xs font-medium">
                              {cv.cvData.work[0].name || cv.cvData.work[0].company}
                            </p>
                            {cv.cvData.work[0].summary && (
                              <p className="text-gray-600 text-xs mt-1">
                                {cv.cvData.work[0].summary.substring(0, 80)}
                                {cv.cvData.work[0].summary.length > 80 && '...'}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm">
                      {/* Fallback CV Preview */}
                      <div className="text-center mb-2">
                        <h1 className="text-lg font-bold text-gray-800 mb-1">
                          {cv.title}
                        </h1>
                        <p className="text-gray-700 text-xs">CV Document</p>
                      </div>
                      
                      <div className="mb-2">
                        <h2 className="text-sm font-semibold text-gray-800 mb-1 border-b border-gray-400 pb-1">Status</h2>
                        <p className="text-gray-800 text-xs">
                          {cv.status === 'draft' ? 'Draft in progress' : 
                           cv.status === 'published' ? 'Published and ready' : 
                           'Archived'}
                        </p>
                      </div>
                      
                      {cv.completionPercentage !== undefined && (
                        <div>
                          <h2 className="text-sm font-semibold text-gray-800 mb-1 border-b border-gray-400 pb-1">Progress</h2>
                          <p className="text-gray-800 text-xs">
                            {cv.completionPercentage}% complete
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* CV Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {/* Inline Editable Title */}
                    {editingCVId === cv.id ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm font-semibold focus:outline-none focus:border-lime-400"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveTitle(cv.id);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                        />
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveTitle(cv.id);
                          }}
                          className="p-1 text-lime-400 hover:text-lime-300 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Check size={14} />
                        </motion.button>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                          className="p-1 text-white/60 hover:text-white transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <X size={14} />
                        </motion.button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white group-hover:text-lime-400 transition-colors flex-1">
                          {cv.title}
                        </h3>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(cv);
                          }}
                          className="p-1 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Pencil size={14} />
                        </motion.button>
                      </div>
                    )}

                    {cv.description && (
                      <p className="text-white/40 text-xs mt-1 line-clamp-2">{cv.description}</p>
                    )}
                  </div>
                </div>

                {/* Cover Letter Linked Status */}


                {/* Linked Job - Show if CV has connected jobs */}
                {cv.connectedJobs && cv.connectedJobs.length > 0 && (
                  <div className="mb-3">
                    <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase size={12} className="text-blue-400" />
                        <span className="text-blue-400 text-xs font-medium">Linked Job</span>
                      </div>
                      <div className="text-white text-xs font-medium truncate">
                        {cv.connectedJobs[0].title}
                      </div>
                      <div className="text-white/60 text-xs truncate">
                        {cv.connectedJobs[0].company} • {typeof cv.connectedJobs[0].location === 'string' ? cv.connectedJobs[0].location : cv.connectedJobs[0].location?.city || 'Remote'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          cv.connectedJobs[0].status === 'applied' ? 'bg-blue-400/20 text-blue-400' :
                          cv.connectedJobs[0].status === 'screening' ? 'bg-yellow-400/20 text-yellow-400' :
                          cv.connectedJobs[0].status === 'interview' ? 'bg-orange-400/20 text-orange-400' :
                          cv.connectedJobs[0].status === 'offer' ? 'bg-green-400/20 text-green-400' :
                          'bg-red-400/20 text-red-400'
                        }`}>
                          {cv.connectedJobs[0].status.charAt(0).toUpperCase() + cv.connectedJobs[0].status.slice(1)}
                        </span>
                        {cv.connectedJobs.length > 1 && (
                          <span className="text-white/40 text-xs">
                            +{cv.connectedJobs.length - 1} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}



                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <motion.button
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg text-sm font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Store CV session data and route to studio
                      sessionStorage.setItem('editingCVId', cv.id);
                      sessionStorage.setItem('editingCVTitle', cv.title);
                      sessionStorage.setItem('editingCVData', JSON.stringify(cv));
                      window.location.href = `/studio?type=cv&cvId=${cv.id}`;
                    }}
                  >
                    <Edit size={14} />
                    Edit
                  </motion.button>
                  
                  <motion.button
                    className="p-2 text-white/60 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Share2 size={16} />
                  </motion.button>
                  
                  <motion.button
                    className="p-2 text-white/60 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Download size={16} />
                  </motion.button>
                  
                  <motion.button
                    className="p-2 text-red-400/60 hover:text-red-400 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteCV(cv.id);
                    }}
                    disabled={deletingCVId === cv.id}
                  >
                    {deletingCVId === cv.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))
          )}
        </div>
        </div>
      </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">

          {/* CV Tips */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
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
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
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
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
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
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
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
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-400/20 to-red-500/20 rounded-lg flex items-center justify-center">
                    <Target size={16} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Connected Jobs</p>
                    <p className="text-lg font-bold text-white">{coverLetters.reduce((sum, cl) => sum + (cl.connectedJobs?.length || 0), 0)}</p>
                  </div>
                </div>
                {coverLetters.reduce((sum, cl) => sum + (cl.connectedJobs?.length || 0), 0) === 0 && (
                  <div className="mt-2 p-2 bg-red-400/10 border border-red-400/20 rounded-lg">
                    <p className="text-red-400 text-xs">Connect to jobs!</p>
                  </div>
                )}
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

              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {coverLetters.map((coverLetter) => (
                  <motion.div
                    key={coverLetter.id}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -5 }}
                  >
                    {/* Cover Letter Preview */}
                    <div className="h-48 bg-gradient-to-br from-blue-400/20 to-blue-500/20 flex items-center justify-center">
                      <PenTool size={48} className="text-blue-400" />
                    </div>
                    
                    {/* Cover Letter Info */}
                    <div className="p-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-semibold text-lg">{coverLetter.title}</h3>
                          <p className="text-white/60 text-sm">{coverLetter.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {coverLetter.isStarred && (
                            <Star size={16} className="text-yellow-400 fill-current" />
                          )}
                                                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                             coverLetter.status === 'final' ? 'bg-green-400/20 text-green-400' :
                             coverLetter.status === 'draft' ? 'bg-yellow-400/20 text-yellow-400' :
                             'bg-red-400/20 text-red-400'
                           }`}>
                             {coverLetter.status}
                           </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-white/40 text-xs">
                        <span>Modified {new Date(coverLetter.lastModified).toLocaleDateString()}</span>
                        <span>{coverLetter.views} views</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={() => window.location.href = `/studio?type=cover_letter&coverLetterId=${coverLetter.id}`}
                          className="flex-1 px-3 py-2 bg-blue-400/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-400/30 transition-all duration-300 flex items-center justify-center gap-2"
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        >
                          <Edit size={14} />
                          Edit
                        </motion.button>
                        <motion.button
                          onClick={() => window.open(`/api/cover-letters/preview/${coverLetter.id}`, '_blank')}
                          className="px-3 py-2 bg-white/10 text-white/80 rounded-lg text-sm font-medium hover:bg-white/20 transition-all duration-300"
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        >
                          <Eye size={14} />
                        </motion.button>
                        <motion.button
                          onClick={() => window.open(`/api/cover-letters/download/${coverLetter.id}`, '_blank')}
                          className="px-3 py-2 bg-white/10 text-white/80 rounded-lg text-sm font-medium hover:bg-white/20 transition-all duration-300"
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        >
                          <Download size={14} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Cover Letter Tips */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
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
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
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
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText size={20} className="text-lime-400" />
                        CV Preview
                      </h3>
                      
                    {/* CV Preview - Using CVPreviewContent component */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 h-96 overflow-hidden">
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
                          <div className="flex items-center justify-center h-full text-white/60">
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
                            className="px-4 py-2 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center gap-2 text-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Download size={14} />
                            Download
                        </motion.button>
                          <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <div className="p-1">
                              <button className="w-full px-3 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 rounded text-sm flex items-center gap-2">
                                <FileText size={12} />
                                Download CV (PDF)
                              </button>
                              <button className="w-full px-3 py-2 text-left text-white/40 hover:text-white hover:bg-white/10 rounded text-sm flex items-center gap-2" disabled>
                                <PenTool size={12} />
                                Download Cover Letter (PDF)
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <motion.button
                          className="px-4 py-2 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center gap-2 text-sm"
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
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-lime-400/50"
                            onChange={(e) => {
                              console.log('🔍 Canvas - Job selection changed:', e.target.value);
                              // Here you would link the selected job to the CV
                              if (e.target.value) {
                                // Link job to CV logic
                                console.log('🔍 Canvas - Linking job to CV:', e.target.value);
                              }
                            }}
                          >
                            <option value="">Select a job to link...</option>
                            {selectedCV.connectedJobs && selectedCV.connectedJobs.length > 0 ? (
                                                              selectedCV.connectedJobs.map((job: any) => (
                                  <option key={job.id} value={job.id}>
                                    {job.company} - {job.title}
                                  </option>
                                ))
                            ) : (
                              <option value="" disabled>No jobs available</option>
                            )}
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
                      
                      {/* Show linked jobs */}
                      {selectedCV.connectedJobs && selectedCV.connectedJobs.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-white font-medium text-sm">Currently Linked:</h4>
                          {selectedCV.connectedJobs.map((job: any) => (
                            <div key={job.id} className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-lg">
                              <div className="w-8 h-8 bg-blue-400/20 rounded border border-blue-400/30 flex items-center justify-center">
                                <Briefcase size={12} className="text-blue-400" />
                              </div>
                                                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-white text-sm truncate">{job.company} - {job.title}</p>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getJobStatusColor(job.status)}`}>
                                      {job.status}
                                    </span>
                                  </div>
                                </div>
                              <button 
                                className="p-1 text-red-400/60 hover:text-red-400 transition-colors"
                                onClick={() => {
                                  console.log('🔍 Canvas - Unlink job:', job.id);
                                  unlinkJobFromCV(selectedCV.id, job.id);
                                }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>


                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirmation && (
          <Modal
            isOpen={!!showDeleteConfirmation}
            onClose={() => setShowDeleteConfirmation(null)}
            title="Delete CV"
            message="Are you sure you want to delete this CV? This will permanently remove it and all associated data."
            type="confirmation"
            onConfirm={() => deleteCV(showDeleteConfirmation)}
            confirmText="Delete CV"
            cancelText="Cancel"
          />
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
    </div>
  );
};

export default Canvas; 