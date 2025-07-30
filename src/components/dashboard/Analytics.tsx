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

  // Mock data for demonstration
  const mockData = {
    lastActivity: {
      type: 'cv',
      title: 'Senior UX Designer CV',
      jobTitle: 'Product Designer at Airbnb',
      lastEdited: '2 hours ago',
      thumbnail: '/api/placeholder/80/60'
    },
    jobStats: {
      total: 14,
      inProgress: 4,
      interviews: 2,
      awaitingResponse: 3,
      rejected: 5
    },
    deadlines: [
      { jobTitle: 'Senior Frontend Developer', company: 'Google', daysLeft: 2, isUrgent: true },
      { jobTitle: 'Product Manager', company: 'Meta', daysLeft: 5, isUrgent: false },
      { jobTitle: 'UX Designer', company: 'Apple', daysLeft: 8, isUrgent: false }
    ],
    cvHealth: {
      score: 87,
      completeness: 95,
      atsCompliance: 92,
      keywordMatch: 78,
      tailoredCvs: 8,
      totalCvs: 12
    },
    aiSuggestions: [
      'Add a short impact summary to your CV profile for 30% higher engagement',
      'Your CV for Google UX Designer is not ready. Want to finish now?',
      'Based on your background, this job is a great fit. Do you want to add a tailored cover letter?'
    ],
    recommendedJobs: [
      { title: 'Senior Product Designer', company: 'Netflix', match: 94 },
      { title: 'UX Research Lead', company: 'Spotify', match: 89 },
      { title: 'Design Systems Manager', company: 'Figma', match: 85 }
    ]
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadData(parsedUser.id || parsedUser._id);
    }
  }, []);

  const loadData = async (userId: string) => {
    try {
      // Load jobs
      const jobsResponse = await fetch(`/api/jobs?userId=${userId}`);
      const jobsResult = await jobsResponse.json();
      if (jobsResult.success) {
        setJobs(jobsResult.data);
      }

      // Load CVs
      const cvsResponse = await fetch(`/api/cvs?userId=${userId}`);
      const cvsResult = await cvsResponse.json();
      if (cvsResult.success) {
        setCvs(cvsResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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
          <div className="flex items-center gap-4">
            <div className="w-16 h-12 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-lime-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium text-sm mb-1">{mockData.lastActivity.title}</h4>
              <p className="text-white/60 text-xs mb-1">Tailored for: {mockData.lastActivity.jobTitle}</p>
              <p className="text-white/40 text-xs">Last edited {mockData.lastActivity.lastEdited}</p>
            </div>
            <motion.button
              className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2 text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/cv-studio'}
            >
              <Edit size={14} />
              Continue Editing
            </motion.button>
          </div>
        </Widget>

        {/* 2. Job Tracker Summary Widget */}
        <Widget 
          title="My Application Snapshot"
          isMinimized={minimizedWidgets.has('jobs')}
          onToggleMinimize={() => toggleWidgetMinimize('jobs')}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-white mb-1">{mockData.jobStats.total}</div>
                <div className="text-white/60 text-xs">Total Jobs</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-blue-400 mb-1">{mockData.jobStats.inProgress}</div>
                <div className="text-white/60 text-xs">In Progress</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-orange-400 mb-1">{mockData.jobStats.interviews}</div>
                <div className="text-white/60 text-xs">Interviews</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-xl font-bold text-yellow-400 mb-1">{mockData.jobStats.awaitingResponse}</div>
                <div className="text-white/60 text-xs">Awaiting</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-white/60 text-xs">
                <span>Application Progress</span>
                <span>{Math.round((mockData.jobStats.inProgress / mockData.jobStats.total) * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-lime-400 to-lime-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(mockData.jobStats.inProgress / mockData.jobStats.total) * 100}%` }}
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

        {/* 3. Job Deadline Radar Widget */}
        <Widget 
          title="Upcoming Deadlines"
          isMinimized={minimizedWidgets.has('deadlines')}
          onToggleMinimize={() => toggleWidgetMinimize('deadlines')}
        >
          <div className="space-y-3">
            {mockData.deadlines.map((deadline, index) => (
              <motion.div
                key={index}
                className={`p-3 rounded-lg border transition-all duration-300 ${
                  deadline.isUrgent 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-white/5 border-white/10'
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-white font-medium text-xs">{deadline.jobTitle}</h4>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    deadline.isUrgent 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {deadline.daysLeft} days
                  </span>
                </div>
                <p className="text-white/60 text-xs mb-1">{deadline.company}</p>
                {deadline.isUrgent && (
                  <div className="flex items-center gap-1 text-red-400 text-xs">
                    <AlertTriangle size={10} />
                    <span>Urgent - Apply soon!</span>
                  </div>
                )}
              </motion.div>
            ))}
            
            <motion.button
              className="w-full px-3 py-1.5 bg-gradient-to-r from-orange-400/20 to-orange-500/20 border border-orange-400/30 text-orange-400 rounded-lg font-medium hover:from-orange-400/30 hover:to-orange-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('section', 'pipeline');
                window.location.href = url.toString();
              }}
            >
              <Calendar size={14} />
              View All Deadlines
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
              <p className="text-white/60 text-xs">{cvs.length} documents</p>
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
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - mockData.cvHealth.score / 100)}`}
                    className="text-lime-400 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{mockData.cvHealth.score}%</span>
                </div>
              </div>
              <p className="text-white/60 text-xs">Overall CV Health</p>
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-xs">Completeness</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-white/10 rounded-full h-1.5">
                    <div 
                      className="bg-green-400 h-1.5 rounded-full"
                      style={{ width: `${mockData.cvHealth.completeness}%` }}
                    ></div>
                  </div>
                  <span className="text-white/60 text-xs">{mockData.cvHealth.completeness}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/80 text-xs">ATS Compliance</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-white/10 rounded-full h-1.5">
                    <div 
                      className="bg-blue-400 h-1.5 rounded-full"
                      style={{ width: `${mockData.cvHealth.atsCompliance}%` }}
                    ></div>
                  </div>
                  <span className="text-white/60 text-xs">{mockData.cvHealth.atsCompliance}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/80 text-xs">Keyword Match</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-white/10 rounded-full h-1.5">
                    <div 
                      className="bg-purple-400 h-1.5 rounded-full"
                      style={{ width: `${mockData.cvHealth.keywordMatch}%` }}
                    ></div>
                  </div>
                  <span className="text-white/60 text-xs">{mockData.cvHealth.keywordMatch}%</span>
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
                {mockData.aiSuggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    className="p-2 bg-white/5 rounded-lg border border-white/10"
                    whileHover={{ scale: 1.02 }}
                  >
                    <p className="text-white/80 text-xs">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Recommended Jobs */}
            <div className="space-y-3">
              <h4 className="text-white font-medium flex items-center gap-2 text-sm">
                <Target size={14} className="text-blue-400" />
                Recommended Jobs
              </h4>
              <div className="space-y-2">
                {mockData.recommendedJobs.map((job, index) => (
                  <motion.div
                    key={index}
                    className="p-2 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-white font-medium text-xs">{job.title}</h5>
                      <span className="text-green-400 text-xs font-medium">{job.match}% match</span>
                    </div>
                    <p className="text-white/60 text-xs mb-1">{job.company}</p>
                    <div className="flex items-center gap-1">
                      <motion.button
                        className="px-2 py-0.5 bg-gradient-to-r from-blue-400/20 to-blue-500/20 border border-blue-400/30 text-blue-400 rounded text-xs font-medium hover:from-blue-400/30 hover:to-blue-500/30 transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.set('section', 'pipeline');
                          window.location.href = url.toString();
                        }}
                      >
                        Apply
                      </motion.button>
                      <motion.button
                        className="px-2 py-0.5 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded text-xs font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.set('section', 'canvas');
                          window.location.href = url.toString();
                        }}
                      >
                        Tailor CV
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Widget>
      </div>
    </div>
  );
};

export default Analytics; 