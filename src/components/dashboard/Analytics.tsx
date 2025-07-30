'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Briefcase, 
  PenTool, 
  Archive, 
  MessageSquare, 
  BarChart3,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Target,
  Sparkles,
  Zap,
  Lightbulb,
  BookOpen,
  Users,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Eye,
  Download,
  Share2,
  Settings,
  Bell,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  Heart,
  Award,
  Trophy,
  Crown,
  Brain,
  Bot,
  Wand2,
  Palette,
  Layers,
  Grid3X3,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface WidgetProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

const Widget: React.FC<WidgetProps> = ({ title, children, className = '', isMinimized = false, onToggleMinimize }) => {
  return (
    <motion.div
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-semibold text-base">{title}</h3>
        {onToggleMinimize && (
          <motion.button
            onClick={onToggleMinimize}
            className="p-1.5 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </motion.button>
        )}
      </div>
      
      {/* Widget Content */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Analytics: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [cvs, setCvs] = useState<any[]>([]);
  const [minimizedWidgets, setMinimizedWidgets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [cvStats, setCvStats] = useState({
    total: 0,
    drafts: 0,
    published: 0,
    archived: 0,
    lastModified: null,
    mostRecentCV: null
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadData(parsedUser.id || parsedUser._id);
    } else {
      // For testing, use the test user ID
      loadData('6889b151d17daa1eaee91a5c');
    }
  }, []);

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      
      // Load jobs
      const jobsResponse = await fetch(`/api/jobs?userId=${userId}`);
      const jobsResult = await jobsResponse.json();
      if (jobsResult.success) {
        setJobs(jobsResult.data || []);
      }

      // Load CVs
      const cvsResponse = await fetch(`/api/cvs?userId=${userId}`);
      const cvsResult = await cvsResponse.json();
      if (cvsResult.success) {
        const cvData = cvsResult.data.data || [];
        setCvs(cvData);
        
        // Calculate CV stats
        const stats = {
          total: cvData.length,
          drafts: cvData.filter((cv: any) => cv.status === 'draft').length,
          published: cvData.filter((cv: any) => cv.status === 'published').length,
          archived: cvData.filter((cv: any) => cv.status === 'archived').length,
          lastModified: cvData.length > 0 ? 
            new Date(Math.max(...cvData.map((cv: any) => new Date(cv.metadata?.lastModified || cv.updatedAt).getTime()))) : null,
          mostRecentCV: cvData.length > 0 ? 
            cvData.reduce((latest: any, current: any) => {
              const latestDate = new Date(latest.metadata?.lastModified || latest.updatedAt);
              const currentDate = new Date(current.metadata?.lastModified || current.updatedAt);
              return currentDate > latestDate ? current : latest;
            }) : null
        };
        setCvStats(stats);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWidgetMinimize = (widgetId: string) => {
    setMinimizedWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-500/20 text-blue-400';
      case 'screening': return 'bg-yellow-500/20 text-yellow-400';
      case 'interview': return 'bg-orange-500/20 text-orange-400';
      case 'offer': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
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

  const calculateCVHealthScore = () => {
    if (cvs.length === 0) return 0;
    
    // Calculate based on CV completeness and status
    const publishedCvs = cvs.filter((cv: any) => cv.status === 'published').length;
    const recentCvs = cvs.filter((cv: any) => {
      const lastModified = new Date(cv.metadata?.lastModified || cv.updatedAt);
      const daysSinceModified = (new Date().getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceModified < 30; // CVs modified in last 30 days
    }).length;
    
    const completeness = (publishedCvs / cvs.length) * 100;
    const recency = (recentCvs / cvs.length) * 100;
    
    return Math.round((completeness + recency) / 2);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
          <p className="text-white/60 text-sm">Track your career progress and application analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            className="px-4 py-2 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center gap-2 text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={14} />
            Export Report
          </motion.button>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* 1. Smart Resume Activity Widget */}
        <Widget 
          title="Continue Where You Left Off"
          isMinimized={minimizedWidgets.has('activity')}
          onToggleMinimize={() => toggleWidgetMinimize('activity')}
          className="lg:col-span-2"
        >
          {cvStats.mostRecentCV ? (
            <div className="flex items-center gap-4">
              <div className="w-16 h-12 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-lime-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium text-sm mb-1">{cvStats.mostRecentCV.title}</h4>
                <p className="text-white/60 text-xs mb-1">Status: {cvStats.mostRecentCV.status}</p>
                <p className="text-white/40 text-xs">
                  Last edited {formatTimeAgo(new Date(cvStats.mostRecentCV.metadata?.lastModified || cvStats.mostRecentCV.updatedAt))}
                </p>
              </div>
              <motion.button
                className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2 text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = `/cv-studio?cv=${cvStats.mostRecentCV.id}`}
              >
                <Edit size={14} />
                Continue Editing
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-16 h-12 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-lime-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium text-sm mb-1">No CVs yet</h4>
                <p className="text-white/60 text-xs mb-1">Create your first CV to get started</p>
              </div>
              <motion.button
                className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2 text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/cv-studio'}
              >
                <Plus size={14} />
                Create CV
              </motion.button>
            </div>
          )}
        </Widget>

        {/* 2. CV Statistics Widget */}
        <Widget 
          title="CV Portfolio Overview"
          isMinimized={minimizedWidgets.has('cvs')}
          onToggleMinimize={() => toggleWidgetMinimize('cvs')}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-white mb-1">{cvStats.total}</div>
                <div className="text-white/60 text-xs">Total CVs</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-green-400 mb-1">{cvStats.published}</div>
                <div className="text-white/60 text-xs">Published</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-yellow-400 mb-1">{cvStats.drafts}</div>
                <div className="text-white/60 text-xs">Drafts</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-gray-400 mb-1">{cvStats.archived}</div>
                <div className="text-white/60 text-xs">Archived</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/60 text-xs">
                <span>Portfolio Health</span>
                <span>{cvStats.total > 0 ? Math.round((cvStats.published / cvStats.total) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-lime-400 to-lime-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${cvStats.total > 0 ? (cvStats.published / cvStats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <motion.button
              className="w-full px-3 py-1.5 bg-gradient-to-r from-blue-400/20 to-blue-500/20 border border-blue-400/30 text-blue-400 rounded-lg font-medium hover:from-blue-400/30 hover:to-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('section', 'canvas');
                window.location.href = url.toString();
              }}
            >
              <ArrowRight size={14} />
              View All CVs
            </motion.button>
          </div>
        </Widget>

        {/* 3. Job Tracker Summary Widget */}
        <Widget 
          title="Application Pipeline"
          isMinimized={minimizedWidgets.has('jobs')}
          onToggleMinimize={() => toggleWidgetMinimize('jobs')}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-white mb-1">{jobs.length}</div>
                <div className="text-white/60 text-xs">Total Jobs</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-blue-400 mb-1">
                  {jobs.filter((job: any) => job.status === 'applied').length}
                </div>
                <div className="text-white/60 text-xs">Applied</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-orange-400 mb-1">
                  {jobs.filter((job: any) => job.status === 'interview').length}
                </div>
                <div className="text-white/60 text-xs">Interviews</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-green-400 mb-1">
                  {jobs.filter((job: any) => job.status === 'offer').length}
                </div>
                <div className="text-white/60 text-xs">Offers</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/60 text-xs">
                <span>Application Progress</span>
                <span>{jobs.length > 0 ? Math.round((jobs.filter((job: any) => job.status === 'applied').length / jobs.length) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-lime-400 to-lime-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${jobs.length > 0 ? (jobs.filter((job: any) => job.status === 'applied').length / jobs.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <motion.button
              className="w-full px-3 py-1.5 bg-gradient-to-r from-blue-400/20 to-blue-500/20 border border-blue-400/30 text-blue-400 rounded-lg font-medium hover:from-blue-400/30 hover:to-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('section', 'pipeline');
                window.location.href = url.toString();
              }}
            >
              <ArrowRight size={14} />
              View Full Tracker
            </motion.button>
          </div>
        </Widget>

        {/* 4. Saved Assets Quick Access Widget */}
        <Widget 
          title="My Vault"
          isMinimized={minimizedWidgets.has('vault')}
          onToggleMinimize={() => toggleWidgetMinimize('vault')}
        >
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('section', 'canvas');
                window.location.href = url.toString();
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-lg flex items-center justify-center">
                  <FileText size={12} className="text-lime-400" />
                </div>
                <span className="text-white font-medium text-xs">CVs</span>
              </div>
              <p className="text-white/60 text-xs">{cvStats.total} documents</p>
            </motion.div>

            <motion.div
              className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('section', 'inkpad');
                window.location.href = url.toString();
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                  <PenTool size={12} className="text-blue-400" />
                </div>
                <span className="text-white font-medium text-xs">Cover Letters</span>
              </div>
              <p className="text-white/60 text-xs">12 documents</p>
            </motion.div>

            <motion.div
              className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('section', 'quillbox');
                window.location.href = url.toString();
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <MessageSquare size={12} className="text-purple-400" />
                </div>
                <span className="text-white font-medium text-xs">Snippets</span>
              </div>
              <p className="text-white/60 text-xs">8 saved</p>
            </motion.div>

            <motion.div
              className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('section', 'vault');
                window.location.href = url.toString();
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-400/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                  <Archive size={12} className="text-orange-400" />
                </div>
                <span className="text-white font-medium text-xs">Saved Forms</span>
              </div>
              <p className="text-white/60 text-xs">5 templates</p>
            </motion.div>
          </div>
        </Widget>

        {/* 5. Personal Branding Meter Widget */}
        <Widget 
          title="CV Health Score"
          isMinimized={minimizedWidgets.has('health')}
          onToggleMinimize={() => toggleWidgetMinimize('health')}
        >
          <div className="space-y-4">
            {/* Overall Score */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-white/10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - calculateCVHealthScore() / 100)}`}
                    className="text-lime-400 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{calculateCVHealthScore()}%</span>
                </div>
              </div>
              <p className="text-white/60 text-xs">Overall CV Health</p>
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-xs">Published Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-white/10 rounded-full h-1.5">
                    <div 
                      className="bg-green-400 h-1.5 rounded-full"
                      style={{ width: `${cvStats.total > 0 ? (cvStats.published / cvStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-white/60 text-xs">{cvStats.total > 0 ? Math.round((cvStats.published / cvStats.total) * 100) : 0}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/80 text-xs">Portfolio Size</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-white/10 rounded-full h-1.5">
                    <div 
                      className="bg-blue-400 h-1.5 rounded-full"
                      style={{ width: `${Math.min(cvStats.total * 10, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-white/60 text-xs">{cvStats.total} CVs</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/80 text-xs">Activity Level</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-white/10 rounded-full h-1.5">
                    <div 
                      className="bg-purple-400 h-1.5 rounded-full"
                      style={{ width: `${cvStats.lastModified ? 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-white/60 text-xs">
                    {cvStats.lastModified ? formatTimeAgo(cvStats.lastModified) : 'No activity'}
                  </span>
                </div>
              </div>
            </div>

            <motion.button
              className="w-full px-3 py-1.5 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('section', 'canvas');
                window.location.href = url.toString();
              }}
            >
              <Sparkles size={14} />
              Optimize Your CV
            </motion.button>
          </div>
        </Widget>

        {/* 6. AI Job Assistant Widget */}
        <Widget 
          title="AI Job Whisperer"
          isMinimized={minimizedWidgets.has('ai')}
          onToggleMinimize={() => toggleWidgetMinimize('ai')}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* AI Suggestions */}
            <div className="space-y-3">
              <h4 className="text-white font-medium flex items-center gap-2 text-sm">
                <Bot size={14} className="text-lime-400" />
                Smart Suggestions
              </h4>
              <div className="space-y-2">
                {cvStats.total === 0 ? (
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/80 text-xs">Create your first CV to get personalized suggestions</p>
                  </div>
                ) : cvStats.drafts > 0 ? (
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/80 text-xs">You have {cvStats.drafts} draft CV(s). Consider publishing them for better visibility.</p>
                  </div>
                ) : (
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/80 text-xs">Great job! All your CVs are published and ready for applications.</p>
                  </div>
                )}
                
                {cvStats.total > 0 && (
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/80 text-xs">Your CV portfolio is {cvStats.total > 5 ? 'comprehensive' : 'growing'}. Keep building!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h4 className="text-white font-medium flex items-center gap-2 text-sm">
                <Target size={14} className="text-blue-400" />
                Quick Actions
              </h4>
              <div className="space-y-2">
                <motion.button
                  className="w-full p-2 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-all duration-300 text-left"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => window.location.href = '/cv-studio'}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-white font-medium text-xs">Create New CV</h5>
                      <p className="text-white/60 text-xs">Start with a template</p>
                    </div>
                    <Plus size={14} className="text-lime-400" />
                  </div>
                </motion.button>
                
                {cvStats.mostRecentCV && (
                  <motion.button
                    className="w-full p-2 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-all duration-300 text-left"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => window.location.href = `/cv-studio?cv=${cvStats.mostRecentCV.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-white font-medium text-xs">Edit Recent CV</h5>
                        <p className="text-white/60 text-xs">{cvStats.mostRecentCV.title}</p>
                      </div>
                      <Edit size={14} className="text-blue-400" />
                    </div>
                  </motion.button>
                )}
                
                <motion.button
                  className="w-full p-2 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-all duration-300 text-left"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('section', 'pipeline');
                    window.location.href = url.toString();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-white font-medium text-xs">Track Applications</h5>
                      <p className="text-white/60 text-xs">{jobs.length} jobs in pipeline</p>
                    </div>
                    <ArrowRight size={14} className="text-purple-400" />
                  </div>
                </motion.button>
              </div>
            </div>
          </div>
        </Widget>
      </div>
    </div>
  );
};

export default Analytics; 