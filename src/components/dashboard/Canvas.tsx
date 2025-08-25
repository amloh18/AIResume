'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
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
  Activity
} from 'lucide-react';
import { useCreateCV } from '@/lib/utils/cvCreationUtils';

interface CV {
  id: string;
  title: string;
  lastModified: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  isStarred: boolean;
  thumbnail: string;
  description?: string;
  connectedJobs?: Job[];
  connectedCoverLetters?: CoverLetter[];
  completionPercentage?: number;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';
  appliedDate: string;
  salary?: string;
  description?: string;
}

interface CoverLetter {
  id: string;
  title: string;
  jobTitle: string;
  company: string;
  createdDate: string;
  status: 'draft' | 'sent' | 'archived';
}

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
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCVId, setEditingCVId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingCVId, setDeletingCVId] = useState<string | null>(null);

  // Load CVs from API
  useEffect(() => {
    const userId = session?.user?.id || getUserIdFromLocalStorage();
    if (userId) {
      loadCVs(userId);
    } else {
      console.log('No user ID available, cannot load CVs');
      setLoading(false);
    }
  }, [session?.user?.id]);

  const getUserIdFromLocalStorage = (): string | null => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        return parsedUser.id;
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
      
      const response = await fetch(`/api/cvs?userId=${userIdToUse}`);
      const result = await response.json();
      console.log('🔍 Canvas - CV API response:', result);
      
      if (result.success) {
        const cvData = result.data.cvs || result.data.data || [];
        console.log('🔍 Canvas - CV data received:', cvData);
        console.log('🔍 Canvas - Number of CVs:', cvData.length);
        console.log('🔍 Canvas - Result structure:', Object.keys(result.data));
        const enrichedCVs = cvData.map((cv: any) => {
          console.log('Processing CV:', cv.id || cv._id, 'Type:', typeof (cv.id || cv._id));
          console.log('CV data structure:', Object.keys(cv));
          return {
            id: cv.id || cv._id,
            title: cv.title || 'Untitled CV',
            lastModified: formatTimeAgo(new Date(cv.lastModified || cv.updatedAt)),
            status: cv.status || 'draft',
            views: cv.viewCount || cv.views || 0,
            isStarred: cv.starred || cv.isStarred || false,
            thumbnail: cv.thumbnail || '/api/placeholder/300/200',
            description: cv.description || 'No description available',
            connectedJobs: cv.connectedJobs || [],
            connectedCoverLetters: cv.connectedCoverLetters || [],
            completionPercentage: calculateCompletionPercentage(cv)
          };
        });
        console.log('🔍 Canvas - Setting CVs:', enrichedCVs.length);
        console.log('🔍 Canvas - First CV sample:', enrichedCVs[0]);
        setCvs(enrichedCVs);
      } else {
        console.log('🔍 Canvas - API returned success: false, using fallback data');
        // Fallback to mock data
        setCvs(getMockCVs());
      }
    } catch (error) {
      console.error('Error loading CVs:', error);
      setCvs(getMockCVs());
    } finally {
      setLoading(false);
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

  const getMockCVs = (): CV[] => [
    {
      id: '507f1f77bcf86cd799439011',
      title: 'Senior UX Designer CV',
      lastModified: '2 hours ago',
      status: 'published',
      views: 12,
      isStarred: true,
      thumbnail: '/api/placeholder/300/200',
      description: 'Professional CV for senior UX design positions',
      completionPercentage: 100,
      connectedJobs: [
        {
          id: 'job1',
          title: 'Senior UX Designer',
          company: 'Spotify',
          location: 'Stockholm, Sweden',
          status: 'interview',
          appliedDate: '2024-01-15',
          salary: '$120k - $150k',
          description: 'Leading user experience design for music streaming platform'
        },
        {
          id: 'job2',
          title: 'UX Design Lead',
          company: 'Figma',
          location: 'San Francisco, CA',
          status: 'applied',
          appliedDate: '2024-01-10',
          salary: '$140k - $180k',
          description: 'Leading design systems and user experience'
        }
      ],
      connectedCoverLetters: [
        {
          id: 'cl1',
          title: 'Spotify UX Designer Cover Letter',
          jobTitle: 'Senior UX Designer',
          company: 'Spotify',
          createdDate: '2024-01-15',
          status: 'sent'
        },
        {
          id: 'cl2',
          title: 'Figma Design Lead Cover Letter',
          jobTitle: 'UX Design Lead',
          company: 'Figma',
          createdDate: '2024-01-10',
          status: 'draft'
        }
      ]
    },
    {
      id: '507f1f77bcf86cd799439012',
      title: 'Product Manager CV',
      lastModified: '1 day ago',
      status: 'draft',
      views: 0,
      isStarred: false,
      thumbnail: '/api/placeholder/300/200',
      description: 'Product management CV for tech companies',
      completionPercentage: 65,
      connectedJobs: [],
      connectedCoverLetters: []
    },
    {
      id: '507f1f77bcf86cd799439013',
      title: 'Frontend Developer CV',
      lastModified: '3 days ago',
      status: 'published',
      views: 8,
      isStarred: true,
      thumbnail: '/api/placeholder/300/200',
      description: 'Frontend development CV with React and TypeScript focus',
      completionPercentage: 100,
      connectedJobs: [
        {
          id: 'job3',
          title: 'Senior Frontend Developer',
          company: 'Netflix',
          location: 'Los Gatos, CA',
          status: 'screening',
          appliedDate: '2024-01-08',
          salary: '$130k - $160k',
          description: 'Building scalable frontend applications'
        }
      ],
      connectedCoverLetters: [
        {
          id: 'cl3',
          title: 'Netflix Frontend Developer Cover Letter',
          jobTitle: 'Senior Frontend Developer',
          company: 'Netflix',
          createdDate: '2024-01-08',
          status: 'sent'
        }
      ]
    }
  ];

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
    setSelectedCV(cv);
    setShowModal(true);
  };

  const startEditing = (cv: CV) => {
    setEditingCVId(cv.id);
    setEditingTitle(cv.title);
  };

  const saveTitle = async (cvId: string) => {
    try {
      // In a real app, you would make an API call here to save the title
      setCvs(cvs.map(cv => 
        cv.id === cvId ? { ...cv, title: editingTitle } : cv
      ));
      setEditingCVId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error saving CV title:', error);
    }
  };

  const cancelEditing = () => {
    setEditingCVId(null);
    setEditingTitle('');
  };

  const deleteCV = async (cvId: string) => {
    try {
      setDeletingCVId(cvId);
      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id || JSON.parse(userData)._id : '6889b151d17daa1eaee91a5c';
      
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
        alert('Invalid CV ID format. Cannot delete this CV.');
        return;
      }
      
      const response = await fetch(`/api/cvs/${cvId}?userId=${userId}`, {
        method: 'DELETE',
      });
      
      console.log('Delete response status:', response.status);
      
      const result = await response.json();
      console.log('Delete response:', result);
      
      if (result.success) {
        // Remove the CV from the local state
        setCvs(cvs.filter(cv => cv.id !== cvId));
      } else {
        console.error('Failed to delete CV:', result.message);
        alert(`Failed to delete CV: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting CV:', error);
      alert('Error deleting CV. Please try again.');
    } finally {
      setDeletingCVId(null);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">CV Studio</h1>
          <p className="text-white/60">Create, edit, and manage your professional CVs</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
      {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <h2 className="text-xl font-semibold text-white">Your CVs</h2>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Clock size={16} />
            <span>Recently modified</span>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {/* Create CV Card - Show when no CVs exist */}
          {cvs.length === 0 && (
            <motion.div
              className="bg-gradient-to-br from-lime-400/10 to-blue-400/10 border-2 border-dashed border-lime-400/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-lime-400/50 hover:from-lime-400/15 hover:to-blue-400/15 transition-all duration-300 cursor-pointer group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => window.location.href = '/studio'}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mb-6 group-hover:from-lime-400/30 group-hover:to-lime-500/30 transition-all duration-300">
                <Plus size={32} className="text-lime-400" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3">Create Your First CV</h3>
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
              
              <motion.button
                className="px-8 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-3 group-hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const userData = localStorage.getItem('user');
                    const userId = userData ? JSON.parse(userData).id || JSON.parse(userData)._id : '6889b151d17daa1eaee91a5c';
                    await createCV({
                      userId,
                      title: 'My Professional CV',
                      type: 'cv'
                    });
                  } catch (error) {
                    console.error('Error creating CV:', error);
                  }
                }}
              >
                <Plus size={20} />
                Start Creating
                <ArrowRight size={16} />
              </motion.button>
              
              <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3 text-white/60 text-sm">
                  <Sparkles size={16} className="text-lime-400" />
                  <span>AI-powered suggestions to help you create the perfect CV</span>
                </div>
              </div>
            </motion.div>
          )}
          
          {cvs.map((cv, index) => (
            <motion.div
              key={cv.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 group cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => handleCVClick(cv)}
            >
              {/* CV Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-lime-400/10 to-blue-400/10 flex items-center justify-center">
                <div className="w-16 h-20 bg-white/20 rounded-lg border border-white/30 flex items-center justify-center">
                  <FileText size={24} className="text-white/60" />
                </div>
                
                {/* Status Badge */}
                <div className={`absolute top-4 left-4 px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(cv.status)}`}>
                  {cv.status}
                </div>
                
                {/* Star Button */}
                <motion.button
                  className="absolute top-4 right-4 p-2 rounded-lg bg-black/20 backdrop-blur-sm text-white/60 hover:text-yellow-400 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(cv.id);
                  }}
                >
                  <Star size={16} className={cv.isStarred ? 'fill-yellow-400 text-yellow-400' : ''} />
                </motion.button>

                {/* Connection Indicators */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  {cv.connectedJobs && cv.connectedJobs.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-400/20 rounded-lg text-xs text-blue-400">
                      <Briefcase size={12} />
                      <span>{cv.connectedJobs.length}</span>
                    </div>
                  )}
                  {cv.connectedCoverLetters && cv.connectedCoverLetters.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-400/20 rounded-lg text-xs text-purple-400">
                      <PenTool size={12} />
                      <span>{cv.connectedCoverLetters.length}</span>
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

                {/* Progress Bar for Draft Completion */}
                {cv.status === 'draft' && cv.completionPercentage !== undefined && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-white/60 text-xs mb-1">
                      <span>Completion</span>
                      <span>{cv.completionPercentage}%</span>
                    </div>
                    <div className="relative group">
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden cursor-help">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${getCompletionColor(cv.completionPercentage)} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${cv.completionPercentage}%` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                        />
                      </div>
                      
                      {/* Tooltip with completion feedback */}
                      {cv.completionPercentage < 100 && (
                        <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-80">
                          <div className="text-white text-xs font-medium mb-3">CV Completion Breakdown:</div>
                          
                          {/* Section completion indicators */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {Object.entries(getSectionCompletion(cv)).map(([key, section]) => (
                              <div key={key} className="flex items-center gap-2 text-xs">
                                <span className="text-lg">{section.icon}</span>
                                <span className={`${section.completed ? 'text-green-400' : 'text-white/40'}`}>
                                  {section.name}
                                </span>
                                {section.completed && (
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <div className="border-t border-white/10 pt-2">
                            <div className="text-white text-xs font-medium mb-2">Next steps:</div>
                            <ul className="space-y-1">
                              {getCompletionFeedback(cv).map((feedback, idx) => (
                                <li key={idx} className="text-white/70 text-xs flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-lime-400 rounded-full"></div>
                                  {feedback}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {cv.completionPercentage < 50 && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <div className="text-lime-400 text-xs font-medium">💡 Quick tip:</div>
                              <div className="text-white/60 text-xs">Focus on adding your name, email, and at least one work experience to get started.</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-white/40 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>{cv.lastModified}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye size={14} />
                    <span>{cv.views} views</span>
                  </div>
                </div>

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
                      window.location.href = `/studio?cvId=${cv.id}`;
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
                      if (confirm('Are you sure you want to delete this CV? This action cannot be undone.')) {
                        deleteCV(cv.id);
                      }
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
          ))}
        </div>
        </div>
      </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-lime-400" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <motion.button
                className="w-full p-3 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 rounded-lg text-lime-400 font-medium text-sm hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center gap-3 shadow-lg shadow-lime-400/10"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/studio'}
              >
                <Plus size={16} className="text-lime-400" />
                Create New CV
              </motion.button>
              <motion.button
                className="w-full p-3 bg-white/10 rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download size={16} />
                Import CV
              </motion.button>
              <motion.button
                className="w-full p-3 bg-white/10 rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Share2 size={16} />
                Share All CVs
              </motion.button>
            </div>
          </div>

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
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
              <Activity size={14} className="text-blue-400" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-white/60 text-xs">
                <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                <span>Created Product Manager CV</span>
              </div>
              <div className="flex items-center gap-3 text-white/60 text-xs">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Updated Software Engineer CV</span>
              </div>
              <div className="flex items-center gap-3 text-white/60 text-xs">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Published Designer CV</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: CV Preview */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText size={20} className="text-lime-400" />
                        CV Preview
                      </h3>
                      
                    {/* CV Preview - Clean, no redundant info */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="aspect-[1/1.4142] bg-gradient-to-br from-lime-400/10 to-blue-400/10 rounded-lg border border-white/20 flex items-center justify-center">
                        <div className="w-16 h-20 bg-white/20 rounded-lg border border-white/30 flex items-center justify-center">
                          <FileText size={32} className="text-white/60" />
                          </div>
                        </div>
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
                            window.location.href = `/studio?cvId=${selectedCV.id}`;
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

                    {/* Connected Jobs */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-white/80 text-sm font-medium">Connected Job:</label>
                        <div className="flex-1 min-w-0">
                          <select className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-lime-400/50">
                            <option value="">Select a job...</option>
                            <option value="job1">Software Engineer at Google</option>
                            <option value="job2">Product Manager at Microsoft</option>
                          </select>
                        </div>
                        <motion.button
                          className="p-2 bg-lime-400/20 text-lime-400 rounded-lg hover:bg-lime-400/30 transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title="Link job to CV"
                        >
                          <Link size={14} />
                        </motion.button>
                      </div>
                      </div>

                    {/* Cover Letters */}
                        <div className="space-y-3">
                      <h4 className="text-white font-medium text-sm">Cover Letters</h4>
                      
                      {/* Cover Letter Previews */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                          <div className="w-12 h-8 bg-purple-400/20 rounded border border-purple-400/30 flex items-center justify-center">
                            <PenTool size={12} className="text-purple-400" />
                          </div>
                                  <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">Software Engineer Cover Letter</p>
                            <p className="text-white/60 text-xs">Google • Updated 2 days ago</p>
                                    </div>
                                      <div className="flex items-center gap-1">
                            <button className="p-1 text-white/60 hover:text-white transition-colors">
                              <Eye size={12} />
                            </button>
                            <button className="p-1 text-white/60 hover:text-white transition-colors">
                              <Download size={12} />
                            </button>
                                      </div>
                                  </div>
                                </div>
                                
                      {/* Cover Letter Actions */}
                      <div className="flex flex-wrap gap-2">
                                  <motion.button
                          className="px-3 py-2 bg-purple-400/20 text-purple-400 rounded-lg text-sm hover:bg-purple-400/30 transition-colors flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled
                          title="Select a job first"
                        >
                          <Sparkles size={12} />
                          Generate Cover Letter
                                  </motion.button>
                        
                          <motion.button
                          className="px-3 py-2 text-white/60 hover:text-white transition-colors text-sm flex items-center gap-2"
                              whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setShowModal(false);
                            window.location.href = `/studio/cover-letter?cvId=${selectedCV.id}`;
                          }}
                        >
                          <Plus size={12} />
                          Create New Cover Letter
                            </motion.button>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Canvas; 