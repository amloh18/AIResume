'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenTool, 
  Plus, 
  Edit, 
  Copy, 
  Download, 
  Share2, 
  Trash2, 
  Eye,
  Star,
  Calendar,
  Building,
  Clock,
  CheckCircle,
  Sparkles,
  MessageSquare,
  FileText,
  Target,
  Zap,
  Palette,
  Type,
  Volume2,
  Settings,
  ArrowRight,
  Save,
  RefreshCw,
  Lightbulb,
  BookOpen,
  Users,
  TrendingUp,
  Award,
  Briefcase,
  ChevronDown
} from 'lucide-react';

interface Job {
  id: string;
  jobTitle: string;
  company: string;
  location?: string;
  status: string;
  applicationDate?: string;
}

interface CoverLetter {
  id: string;
  title: string;
  company: string;
  jobTitle: string;
  content: string;
  tone: 'professional' | 'friendly' | 'enthusiastic' | 'formal';
  length: 'short' | 'medium' | 'long';
  lastModified: string;
  status: 'draft' | 'final' | 'sent';
  isStarred: boolean;
  linkedCV?: string;
  linkedJob?: string;
  wordCount: number;
}

const InkPad: React.FC = () => {
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Load user and jobs on component mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadJobs(parsedUser.id || parsedUser._id);
    }
  }, []);

  const loadJobs = async (userId: string) => {
    try {
      const response = await fetch(`/api/jobs?userId=${userId}`);
      const result = await response.json();
      if (result.success) {
        setJobs(result.data);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const tones = [
    { id: 'professional', name: 'Professional', description: 'Formal and business-like', color: 'from-blue-400 to-blue-500' },
    { id: 'friendly', name: 'Friendly', description: 'Warm and approachable', color: 'from-green-400 to-green-500' },
    { id: 'enthusiastic', name: 'Enthusiastic', description: 'Energetic and passionate', color: 'from-orange-400 to-orange-500' },
    { id: 'formal', name: 'Formal', description: 'Traditional and respectful', color: 'from-gray-400 to-gray-500' }
  ];

  const lengths = [
    { id: 'short', name: 'Short', description: '150-200 words', color: 'from-green-400 to-green-500' },
    { id: 'medium', name: 'Medium', description: '250-350 words', color: 'from-blue-400 to-blue-500' },
    { id: 'long', name: 'Long', description: '400-500 words', color: 'from-purple-400 to-purple-500' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'final': return 'text-green-400 bg-green-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      case 'sent': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-white/60 bg-white/10';
    }
  };

  const getToneColor = (tone: string) => {
    const toneObj = tones.find(t => t.id === tone);
    return toneObj ? toneObj.color : 'from-gray-400 to-gray-500';
  };

  const toggleStar = (id: string) => {
    setCoverLetters(coverLetters.map(letter => 
      (letter.id === id || letter._id === id) ? { ...letter, isStarred: !letter.isStarred } : letter
    ));
  };

  const generateCoverLetter = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      // Add new cover letter to list
    }, 3000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Cover Letters</h1>
          <p className="text-white/60">Create compelling cover letters with AI-powered suggestions</p>
        </div>
        
        <motion.button
          className="px-6 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={16} />
          New Cover Letter
        </motion.button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
                  <div className="xl:col-span-2 space-y-6">
          {/* AI Generation Section */}
          <motion.div 
            className="bg-gradient-to-r from-purple-400/10 to-pink-400/10 border border-purple-400/20 rounded-2xl p-6 backdrop-blur-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center">
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">AI Cover Letter Generator</h2>
            <p className="text-white/60">Generate tailored cover letters in seconds</p>
          </div>
        </div>

        {/* Job Selector */}
        <div className="mb-6">
          <label className="block text-white/80 text-sm font-medium mb-3">Select Job from Tracker</label>
          <div className="relative">
            <motion.button
              onClick={() => setShowJobSelector(!showJobSelector)}
              className="w-full flex items-center justify-between p-4 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/15 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <Briefcase size={20} className="text-white/60" />
                <span className={selectedJob ? 'text-white' : 'text-white/60'}>
                  {selectedJob ? `${selectedJob.jobTitle} at ${selectedJob.company}` : 'Choose a job from your tracker...'}
                </span>
              </div>
              <ChevronDown size={20} className="text-white/60" />
            </motion.button>

            {/* Job Dropdown */}
            <AnimatePresence>
              {showJobSelector && (
                <motion.div
                  className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/20 rounded-xl shadow-2xl z-10 max-h-60 overflow-y-auto"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {jobs.length > 0 ? (
                    jobs.map((job, index) => (
                      <motion.button
                        key={job.id || job._id || `job-${index}`}
                        onClick={() => {
                          setSelectedJob(job);
                          setShowJobSelector(false);
                        }}
                        className="w-full p-4 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                        whileHover={{ x: 5 }}
                      >
                        <div className="text-white font-medium">{job.jobTitle}</div>
                        <div className="text-white/60 text-sm">{job.company}</div>
                        {job.location && (
                          <div className="text-white/40 text-xs">{job.location}</div>
                        )}
                      </motion.button>
                    ))
                  ) : (
                    <div className="p-4 text-white/60 text-center">
                      No jobs found. Add jobs to your tracker first.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Tone</label>
            <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50">
              {tones.map(tone => (
                <option key={tone.id} value={tone.id}>{tone.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Length</label>
            <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50">
              {lengths.map(length => (
                <option key={length.id} value={length.id}>{length.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-white/80 text-sm font-medium mb-2">Additional Context (Optional)</label>
          <textarea
            placeholder="Add specific details about your experience, achievements, or why you're interested in this role..."
            rows={3}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 resize-none"
          />
        </div>

        <motion.button
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold rounded-xl hover:from-purple-300 hover:to-purple-400 transition-all duration-300 flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateCoverLetter}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Generate Cover Letter
            </>
          )}
        </motion.button>
      </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-xl flex items-center justify-center">
              <MessageSquare size={24} className="text-lime-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total Letters</p>
              <p className="text-2xl font-bold text-white">{coverLetters.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400/20 to-green-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Finalized</p>
              <p className="text-2xl font-bold text-white">{coverLetters.filter(l => l.status === 'final').length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-xl flex items-center justify-center">
              <Star size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Starred</p>
              <p className="text-2xl font-bold text-white">{coverLetters.filter(l => l.isStarred).length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Avg Words</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(coverLetters.reduce((sum, l) => sum + l.wordCount, 0) / coverLetters.length)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Cover Letters Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Your Cover Letters</h2>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Clock size={16} />
            <span>Recently modified</span>
          </div>
        </div>

        <div className="grid gap-6">
          {coverLetters.map((letter, index) => (
            <motion.div
              key={letter.id || letter._id || `letter-${index}`}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ y: -2, scale: 1.01 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white group-hover:text-lime-400 transition-colors">
                      {letter.title}
                    </h3>
                    <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(letter.status)}`}>
                      {letter.status}
                    </div>
                    {letter.isStarred && (
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-white/60 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <Building size={14} />
                      <span>{letter.company}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target size={14} />
                      <span>{letter.jobTitle}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Type size={14} />
                      <span>{letter.wordCount} words</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${getToneColor(letter.tone)} text-white`}>
                      {letter.tone}
                    </div>
                    <div className="text-white/40 text-sm">
                      {letter.length} length
                    </div>
                  </div>
                  
                  <p className="text-white/80 text-sm mb-4 line-clamp-3">{letter.content}</p>
                  
                  <div className="flex items-center gap-4 text-white/40 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{letter.lastModified}</span>
                    </div>
                    {letter.linkedCV && (
                      <div className="flex items-center gap-1">
                        <FileText size={14} />
                        <span>Linked CV</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    className="p-2 text-white/60 hover:text-yellow-400 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleStar(letter.id || letter._id || `letter-${index}`)}
                  >
                    <Star size={16} className={letter.isStarred ? 'fill-yellow-400 text-yellow-400' : ''} />
                  </motion.button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <motion.button
                  className="px-4 py-2 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg text-sm font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Edit size={14} />
                  Edit
                </motion.button>
                
                <motion.button
                  className="px-4 py-2 bg-gradient-to-r from-blue-400/20 to-blue-500/20 border border-blue-400/30 text-blue-400 rounded-lg text-sm font-medium hover:from-blue-400/30 hover:to-blue-500/30 transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Eye size={14} />
                  Preview
                </motion.button>
                
                <motion.button
                  className="px-4 py-2 bg-gradient-to-r from-purple-400/20 to-purple-500/20 border border-purple-400/30 text-purple-400 rounded-lg text-sm font-medium hover:from-purple-400/30 hover:to-purple-500/30 transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Copy size={14} />
                  Copy
                </motion.button>
                
                <motion.button
                  className="px-4 py-2 bg-gradient-to-r from-green-400/20 to-green-500/20 border border-green-400/30 text-green-400 rounded-lg text-sm font-medium hover:from-green-400/30 hover:to-green-500/30 transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download size={14} />
                  Download
                </motion.button>
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
              <Sparkles size={14} className="text-purple-400" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <motion.button
                className="w-full p-3 bg-white/10 rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={16} />
                Create New Letter
              </motion.button>
              <motion.button
                className="w-full p-3 bg-white/10 rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download size={16} />
                Import Template
              </motion.button>
              <motion.button
                className="w-full p-3 bg-white/10 rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Share2 size={16} />
                Share Letters
              </motion.button>
            </div>
          </div>

          {/* Writing Tips */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
              <Lightbulb size={14} className="text-yellow-400" />
              Writing Tips
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
                <p className="text-yellow-400 text-xs font-medium mb-1">Be specific</p>
                <p className="text-white/60 text-xs">Mention specific achievements and experiences</p>
              </div>
              <div className="p-3 bg-blue-400/10 border border-blue-400/20 rounded-lg">
                <p className="text-blue-400 text-xs font-medium mb-1">Show enthusiasm</p>
                <p className="text-white/60 text-xs">Express genuine interest in the role and company</p>
              </div>
              <div className="p-3 bg-green-400/10 border border-green-400/20 rounded-lg">
                <p className="text-green-400 text-xs font-medium mb-1">Keep it concise</p>
                <p className="text-white/60 text-xs">Aim for 250-350 words for optimal impact</p>
              </div>
            </div>
          </div>

          {/* Tone Templates */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
              <MessageSquare size={14} className="text-purple-400" />
              Tone Templates
            </h3>
            <div className="space-y-3">
              {tones.map((tone) => (
                <motion.button
                  key={tone.id}
                  className="w-full p-3 bg-white/10 rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${tone.color}`}></div>
                  {tone.name}
                </motion.button>
              ))}
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
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Created Software Engineer letter</span>
              </div>
              <div className="flex items-center gap-3 text-white/60 text-xs">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Updated Product Manager letter</span>
              </div>
              <div className="flex items-center gap-3 text-white/60 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Sent Designer letter</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InkPad; 