'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Check
} from 'lucide-react';

interface CV {
  id: string;
  title: string;
  template: string;
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
  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCVId, setEditingCVId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Load CVs from API
  useEffect(() => {
    loadCVs();
  }, []);

  const loadCVs = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id || JSON.parse(userData)._id : '6889b151d17daa1eaee91a5c';
      
      const response = await fetch(`/api/cvs?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        const cvData = result.data.data || [];
        const enrichedCVs = cvData.map((cv: any) => ({
          id: cv._id,
          title: cv.title || 'Untitled CV',
          template: cv.template || 'Modern',
          lastModified: formatTimeAgo(new Date(cv.updatedAt)),
          status: cv.status || 'draft',
          views: cv.views || 0,
          isStarred: cv.isStarred || false,
          thumbnail: cv.thumbnail || '/api/placeholder/300/200',
          description: cv.description || 'No description available',
          connectedJobs: cv.connectedJobs || [],
          connectedCoverLetters: cv.connectedCoverLetters || [],
          completionPercentage: calculateCompletionPercentage(cv)
        }));
        setCvs(enrichedCVs);
      } else {
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
    // Mock completion calculation - in real app, this would be based on CV sections completion
    if (cv.status === 'published') return 100;
    if (cv.status === 'draft') {
      // Random completion between 30-90% for drafts
      return Math.floor(Math.random() * 60) + 30;
    }
    return 0;
  };

  const getMockCVs = (): CV[] => [
    {
      id: '1',
      title: 'Senior UX Designer CV',
      template: 'Modern',
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
      id: '2',
      title: 'Product Manager CV',
      template: 'Classic',
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
      id: '3',
      title: 'Frontend Developer CV',
      template: 'Creative',
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

  const templates = [
    { id: 'modern', name: 'Modern', description: 'Clean and professional', color: 'from-lime-400 to-lime-500' },
    { id: 'classic', name: 'Classic', description: 'Traditional and elegant', color: 'from-blue-400 to-blue-500' },
    { id: 'creative', name: 'Creative', description: 'Bold and innovative', color: 'from-purple-400 to-purple-500' },
    { id: 'minimal', name: 'Minimal', description: 'Simple and focused', color: 'from-gray-400 to-gray-500' }
  ];

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

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'from-green-400 to-green-500';
    if (percentage >= 60) return 'from-yellow-400 to-yellow-500';
    if (percentage >= 40) return 'from-orange-400 to-orange-500';
    return 'from-red-400 to-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">CV Studio</h1>
          <p className="text-white/60">Create, edit, and manage your professional CVs</p>
        </div>
        
        <div className="flex items-center gap-4">
          <motion.button
            className="px-6 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/cv-studio'}
          >
            <Plus size={16} />
            Create CV
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-lime-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total CVs</p>
              <p className="text-2xl font-bold text-white">{cvs.length}</p>
            </div>
          </div>
          {cvs.length === 0 && (
            <div className="mt-3 p-3 bg-lime-400/10 border border-lime-400/20 rounded-lg">
              <p className="text-lime-400 text-xs">Create your first CV to get started!</p>
            </div>
          )}
        </motion.div>

        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-xl flex items-center justify-center">
              <Eye size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total Views</p>
              <p className="text-2xl font-bold text-white">{cvs.reduce((sum, cv) => sum + cv.views, 0)}</p>
            </div>
          </div>
          {cvs.reduce((sum, cv) => sum + cv.views, 0) === 0 && (
            <div className="mt-3 p-3 bg-blue-400/10 border border-blue-400/20 rounded-lg">
              <p className="text-blue-400 text-xs">Publish your CVs to start getting views!</p>
            </div>
          )}
        </motion.div>

        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-xl flex items-center justify-center">
              <Star size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Starred</p>
              <p className="text-2xl font-bold text-white">{cvs.filter(cv => cv.isStarred).length}</p>
            </div>
          </div>
          {cvs.filter(cv => cv.isStarred).length === 0 && (
            <div className="mt-3 p-3 bg-purple-400/10 border border-purple-400/20 rounded-lg">
              <p className="text-purple-400 text-xs">Star your favorite CVs for quick access!</p>
            </div>
          )}
        </motion.div>

        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400/20 to-green-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Published</p>
              <p className="text-2xl font-bold text-white">{cvs.filter(cv => cv.status === 'published').length}</p>
            </div>
          </div>
          {cvs.filter(cv => cv.status === 'published').length === 0 && cvs.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
              <p className="text-yellow-400 text-xs">No published CVs yet. Click 'Edit' to publish!</p>
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

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
                    <p className="text-white/60 text-sm">{cv.template} Template</p>
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
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${getCompletionColor(cv.completionPercentage)} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${cv.completionPercentage}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                      />
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
                      window.location.href = `/cv-studio?cv=${cv.id}`;
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
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Templates Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Templates</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className={`w-12 h-16 bg-gradient-to-br ${template.color} rounded-lg mb-4 flex items-center justify-center`}>
                <FileText size={20} className="text-white" />
              </div>
              
              <h3 className="font-semibold text-white mb-2 group-hover:text-lime-400 transition-colors">
                {template.name}
              </h3>
              <p className="text-white/60 text-sm mb-4">{template.description}</p>
              
              <motion.button
                className="w-full px-4 py-2 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg text-sm font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={14} />
                Use Template
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CV Details Modal */}
      <AnimatePresence>
        {showModal && selectedCV && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedCV.title}</h2>
                  <p className="text-white/60">{selectedCV.template} Template • {selectedCV.status}</p>
                </div>
                <motion.button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={20} className="text-white" />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* CV Preview - Left Side */}
                  <div className="lg:col-span-1">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText size={20} className="text-lime-400" />
                        CV Preview
                      </h3>
                      
                      {/* CV Preview Card */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="aspect-[3/4] bg-gradient-to-br from-lime-400/10 to-blue-400/10 rounded-lg border border-white/20 flex items-center justify-center mb-4">
                          <div className="w-12 h-16 bg-white/20 rounded-lg border border-white/30 flex items-center justify-center">
                            <FileText size={24} className="text-white/60" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold text-white text-sm">{selectedCV.title}</h4>
                          <p className="text-white/60 text-xs">{selectedCV.template} Template</p>
                          <div className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(selectedCV.status)}`}>
                            {selectedCV.status}
                          </div>
                        </div>
                        
                        {selectedCV.description && (
                          <p className="text-white/40 text-xs mt-3 line-clamp-3">{selectedCV.description}</p>
                        )}
                      </div>

                      {/* CV Actions */}
                      <div className="space-y-2">
                        <motion.button
                          className="w-full px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setShowModal(false);
                            window.location.href = `/cv-studio?cv=${selectedCV.id}`;
                          }}
                        >
                          <Edit size={14} />
                          Edit CV
                        </motion.button>
                        
                        <motion.button
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Download size={14} />
                          Download PDF
                        </motion.button>
                        
                        <motion.button
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Share2 size={14} />
                          Share CV
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Connected Jobs & Cover Letters - Right Side */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Connected Jobs Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Briefcase size={20} className="text-blue-400" />
                          <h3 className="text-lg font-semibold text-white">Connected Jobs</h3>
                          <span className="px-2 py-1 bg-blue-400/20 text-blue-400 text-xs rounded-lg">
                            {selectedCV.connectedJobs?.length || 0}
                          </span>
                        </div>
                        
                        <motion.button
                          className="px-4 py-2 bg-blue-400/20 text-blue-400 rounded-lg text-sm hover:bg-blue-400/30 transition-colors flex items-center gap-2"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Plus size={14} />
                          Add Job
                        </motion.button>
                      </div>

                      {selectedCV.connectedJobs && selectedCV.connectedJobs.length > 0 ? (
                        <div className="space-y-3">
                          {/* Jobs List - One Line Each */}
                          {selectedCV.connectedJobs.map((job, index) => (
                            <motion.div
                              key={job.id}
                              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-8 h-8 bg-blue-400/20 rounded-lg flex items-center justify-center">
                                    <span className="text-blue-400 text-xs font-medium">{index + 1}</span>
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-white text-sm truncate">{job.title}</h4>
                                      <span className="text-white/40 text-xs">at</span>
                                      <span className="text-white/60 text-sm font-medium">{job.company}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-white/40 text-xs">
                                      <div className="flex items-center gap-1">
                                        <MapPin size={12} />
                                        <span>{job.location}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <CalendarDays size={12} />
                                        <span>{new Date(job.appliedDate).toLocaleDateString()}</span>
                                      </div>
                                      {job.salary && (
                                        <div className="flex items-center gap-1">
                                          <span>💰</span>
                                          <span>{job.salary}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getJobStatusColor(job.status)}`}>
                                    {job.status}
                                  </div>
                                  
                                  <motion.button
                                    className="p-2 text-white/60 hover:text-white transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <ExternalLink size={14} />
                                  </motion.button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-blue-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase size={24} className="text-blue-400" />
                          </div>
                          <p className="text-white/60 text-sm mb-4">No jobs connected to this CV yet</p>
                          <motion.button
                            className="px-4 py-2 bg-blue-400/20 text-blue-400 rounded-lg text-sm hover:bg-blue-400/30 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Connect a Job
                          </motion.button>
                        </div>
                      )}
                    </div>

                    {/* Cover Letters Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PenTool size={20} className="text-purple-400" />
                          <h3 className="text-lg font-semibold text-white">Cover Letters</h3>
                          <span className="px-2 py-1 bg-purple-400/20 text-purple-400 text-xs rounded-lg">
                            {selectedCV.connectedCoverLetters?.length || 0}
                          </span>
                        </div>
                        
                        {selectedCV.connectedJobs && selectedCV.connectedJobs.length > 0 ? (
                          <motion.button
                            className="px-4 py-2 bg-purple-400/20 text-purple-400 rounded-lg text-sm hover:bg-purple-400/30 transition-colors flex items-center gap-2"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setShowModal(false);
                              // Navigate to cover letter editor (future update)
                              window.location.href = `/cover-letter-editor?cv=${selectedCV.id}`;
                            }}
                          >
                            <Plus size={14} />
                            Create Cover Letter
                          </motion.button>
                        ) : (
                          <div className="px-4 py-2 bg-gray-400/20 text-gray-400 rounded-lg text-sm flex items-center gap-2">
                            <span>Connect a job first</span>
                          </div>
                        )}
                      </div>

                      {selectedCV.connectedCoverLetters && selectedCV.connectedCoverLetters.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedCV.connectedCoverLetters.map((coverLetter, index) => (
                            <motion.div
                              key={coverLetter.id}
                              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => {
                                setShowModal(false);
                                // Navigate to cover letter editor (future update)
                                window.location.href = `/cover-letter-editor?id=${coverLetter.id}`;
                              }}
                            >
                              {/* Cover Letter Thumbnail */}
                              <div className="aspect-[3/4] bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-lg border border-white/20 flex items-center justify-center mb-3">
                                <div className="w-8 h-10 bg-white/20 rounded-lg border border-white/30 flex items-center justify-center">
                                  <PenTool size={16} className="text-white/60" />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-white text-sm truncate">{coverLetter.title}</h4>
                                    <p className="text-white/60 text-xs">{coverLetter.jobTitle} at {coverLetter.company}</p>
                                  </div>
                                  <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getCoverLetterStatusColor(coverLetter.status)}`}>
                                    {coverLetter.status}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 text-white/40 text-xs">
                                  <CalendarDays size={12} />
                                  <span>{new Date(coverLetter.createdDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PenTool size={24} className="text-purple-400" />
                          </div>
                          <p className="text-white/60 text-sm mb-4">
                            {selectedCV.connectedJobs && selectedCV.connectedJobs.length > 0 
                              ? "No cover letters created yet" 
                              : "Connect a job first to create cover letters"
                            }
                          </p>
                          {selectedCV.connectedJobs && selectedCV.connectedJobs.length > 0 ? (
                            <motion.button
                              className="px-4 py-2 bg-purple-400/20 text-purple-400 rounded-lg text-sm hover:bg-purple-400/30 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setShowModal(false);
                                // Navigate to cover letter editor (future update)
                                window.location.href = `/cover-letter-editor?cv=${selectedCV.id}`;
                              }}
                            >
                              Create Cover Letter
                            </motion.button>
                          ) : (
                            <motion.button
                              className="px-4 py-2 bg-blue-400/20 text-blue-400 rounded-lg text-sm hover:bg-blue-400/30 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Connect a Job First
                            </motion.button>
                          )}
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
    </div>
  );
};

export default Canvas; 