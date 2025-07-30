'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  ChevronDown, 
  Briefcase,
  ExternalLink,
  Plus,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface CVStudioHeaderProps {
  selectedCV: string | null;
  linkedJob: any;
  onCVChange: (cvId: string) => void;
  onJobChange: (job: any) => void;
  onAIAssist: (action: 'rewrite' | 'optimize' | 'suggest') => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
}

const CVStudioHeader: React.FC<CVStudioHeaderProps> = ({
  selectedCV,
  linkedJob,
  onCVChange,
  onJobChange,
  onAIAssist,
  hasUnsavedChanges,
  onSave
}) => {
  const [isCVDropdownOpen, setIsCVDropdownOpen] = useState(false);
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
  const [isAIMenuOpen, setIsAIMenuOpen] = useState(false);

  // Mock data
  const userCVs = [
    { id: '1', title: 'Senior UX Designer CV', lastModified: '2 hours ago', status: 'draft' },
    { id: '2', title: 'Product Manager CV', lastModified: '1 day ago', status: 'published' },
    { id: '3', title: 'Frontend Developer CV', lastModified: '3 days ago', status: 'draft' }
  ];

  const linkedJobs = [
    { id: '1', title: 'Senior UX Designer at Spotify', company: 'Spotify', status: 'applied' },
    { id: '2', title: 'Product Manager at Figma', company: 'Figma', status: 'interviewing' },
    { id: '3', title: 'Frontend Developer at Airbnb', company: 'Airbnb', status: 'applied' }
  ];

  const currentCV = userCVs.find(cv => cv.id === selectedCV) || userCVs[0];

  return (
    <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 py-4 relative z-50">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-6">
          {/* Back Button */}
          <motion.button
            className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={20} />
          </motion.button>

          {/* CV Title and Switcher */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors text-white font-medium"
                onClick={() => setIsCVDropdownOpen(!isCVDropdownOpen)}
              >
                <span className="max-w-xs truncate">{currentCV?.title || 'Untitled CV'}</span>
                <ChevronDown size={16} className={`transition-transform ${isCVDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isCVDropdownOpen && (
                  <motion.div
                    className="absolute top-full left-0 mt-2 w-80 bg-black/30 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl z-[60]"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold">My CVs</h3>
                        <button 
                          className="p-1 text-white/60 hover:text-white transition-colors"
                          onClick={() => {
                            setIsCVDropdownOpen(false);
                            window.location.href = '/cv-studio';
                          }}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {userCVs.map((cv) => (
                          <button
                            key={cv.id}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                              cv.id === selectedCV 
                                ? 'bg-white/20 text-white' 
                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                            onClick={() => {
                              onCVChange(cv.id);
                              setIsCVDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-lime-400" />
                              <div className="text-left">
                                <div className="font-medium truncate">{cv.title}</div>
                                <div className="text-xs text-white/60">{cv.lastModified}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {cv.status === 'published' && <CheckCircle size={14} className="text-green-400" />}
                              {cv.status === 'draft' && <Clock size={14} className="text-yellow-400" />}
                              {cv.status === 'archived' && <AlertCircle size={14} className="text-gray-400" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Linked Job */}
            {linkedJob && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg">
                <Briefcase size={14} className="text-blue-400" />
                <span className="text-sm text-white/80 truncate max-w-xs">
                  {linkedJob.title}
                </span>
                <button
                  className="p-1 text-white/60 hover:text-white transition-colors"
                  onClick={() => setIsJobDropdownOpen(!isJobDropdownOpen)}
                >
                  <ChevronDown size={12} className={`transition-transform ${isJobDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Save Status */}
          {hasUnsavedChanges && (
            <motion.div
              className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-sm text-yellow-400">Unsaved changes</span>
            </motion.div>
          )}

          {/* AI Assist Button */}
          <div className="relative">
            <motion.button
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAIMenuOpen(!isAIMenuOpen)}
            >
              <Sparkles size={16} />
              AI Assist
            </motion.button>

            <AnimatePresence>
              {isAIMenuOpen && (
                <motion.div
                  className="absolute top-full right-0 mt-2 w-64 bg-black/30 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl z-[60]"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 space-y-2">
                    <button
                      className="w-full flex items-center gap-3 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      onClick={() => {
                        onAIAssist('rewrite');
                        setIsAIMenuOpen(false);
                      }}
                    >
                      <Sparkles size={16} />
                      <div className="text-left">
                        <div className="font-medium">Smart Rewrite</div>
                        <div className="text-xs text-white/60">Improve tone and clarity</div>
                      </div>
                    </button>
                    
                    <button
                      className="w-full flex items-center gap-3 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      onClick={() => {
                        onAIAssist('optimize');
                        setIsAIMenuOpen(false);
                      }}
                    >
                      <Sparkles size={16} />
                      <div className="text-left">
                        <div className="font-medium">Optimize for Job</div>
                        <div className="text-xs text-white/60">Tailor to job requirements</div>
                      </div>
                    </button>
                    
                    <button
                      className="w-full flex items-center gap-3 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      onClick={() => {
                        onAIAssist('suggest');
                        setIsAIMenuOpen(false);
                      }}
                    >
                      <Sparkles size={16} />
                      <div className="text-left">
                        <div className="font-medium">Fill Section</div>
                        <div className="text-xs text-white/60">Generate content suggestions</div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Save Button */}
          <motion.button
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-lime-500 to-green-500 text-white hover:from-lime-400 hover:to-green-400'
                : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSave}
            disabled={!hasUnsavedChanges}
          >
            <Save size={16} />
            Save
          </motion.button>
        </div>
      </div>

      {/* Job Dropdown */}
      <AnimatePresence>
        {isJobDropdownOpen && (
          <motion.div
            className="absolute top-full left-0 mt-2 w-80 bg-black/30 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl z-[60]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Linked Jobs</h3>
                <button className="p-1 text-white/60 hover:text-white transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              
              <div className="space-y-2">
                {linkedJobs.map((job) => (
                  <button
                    key={job.id}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                      job.id === linkedJob?.id 
                        ? 'bg-white/20 text-white' 
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                    onClick={() => {
                      onJobChange(job);
                      setIsJobDropdownOpen(false);
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium truncate">{job.title}</div>
                      <div className="text-xs text-white/60">{job.company}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        job.status === 'applied' ? 'bg-blue-500/20 text-blue-400' :
                        job.status === 'interviewing' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default CVStudioHeader; 