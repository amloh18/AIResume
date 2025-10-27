'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  TrendingUp, 
  RefreshCw,
  Key,
  Camera,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock
} from 'lucide-react';

interface FloatingATSAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle?: string;
  onFixAll?: () => void;
}

export default function FloatingATSAnalyzer({ 
  isOpen, 
  onClose, 
  jobTitle = "Senior Product Designer",
  onFixAll 
}: FloatingATSAnalyzerProps) {
  const [activeTab, setActiveTab] = useState<'keywords' | 'formatting' | 'fixlog'>('keywords');
  const [expandedSections, setExpandedSections] = useState<{
    missingKeywords: boolean;
    keywordsDensity: boolean;
    softSkills: boolean;
  }>({
    missingKeywords: false,
    keywordsDensity: false,
    softSkills: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-[#1A201A] rounded-2xl shadow-2xl shadow-black/50 w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                ATS Match Report
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {jobTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Overall Match Score */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center">
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - 0.78)}`}
                        className="text-[#80FF00]"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-gray-800 dark:text-white">78%</span>
                    </div>
                  </div>
                  <p className="text-gray-800 dark:text-white text-lg font-medium">Overall Match Score</p>
                </div>

                {/* Top 3 Actions */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Top 3 Actions</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-[#80FF00] rounded">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-gray-800 dark:text-white text-sm">
                        Add 5+ high-priority keywords to your skills section.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-[#80FF00] rounded">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-gray-800 dark:text-white text-sm">
                        Quantify achievements in your last role with metrics.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-[#80FF00] rounded">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-gray-800 dark:text-white text-sm">
                        Fix formatting errors in the experience section.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4 text-[#80FF00]" />
                    </div>
                    <p className="text-gray-800 dark:text-white text-sm font-medium">Keyword Gaps</p>
                    <p className="text-[#80FF00] text-xs mt-1">Needs Improvement</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4 text-[#80FF00]" />
                    </div>
                    <p className="text-gray-800 dark:text-white text-sm font-medium">Formatting & Parsability</p>
                    <p className="text-[#80FF00] text-xs mt-1">Good</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-[#80FF00]" />
                    </div>
                    <p className="text-gray-800 dark:text-white text-sm font-medium">Experience Alignment</p>
                    <p className="text-[#80FF00] text-xs mt-1">Strong</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex space-x-6">
                    <button
                      onClick={() => setActiveTab('keywords')}
                      className={`pb-3 text-sm font-medium transition-colors ${
                        activeTab === 'keywords'
                          ? 'text-[#80FF00] border-b-2 border-[#80FF00]'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Keywords & Skills
                    </button>
                    <button
                      onClick={() => setActiveTab('formatting')}
                      className={`pb-3 text-sm font-medium transition-colors ${
                        activeTab === 'formatting'
                          ? 'text-[#80FF00] border-b-2 border-[#80FF00]'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Formatting & Structure
                    </button>
                    <button
                      onClick={() => setActiveTab('fixlog')}
                      className={`pb-3 text-sm font-medium transition-colors ${
                        activeTab === 'fixlog'
                          ? 'text-[#80FF00] border-b-2 border-[#80FF00]'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Fix Log
                    </button>
                  </nav>
                </div>

                {/* Expandable Sections */}
                <div className="space-y-3">
                  {/* Missing Keywords */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <button
                      onClick={() => toggleSection('missingKeywords')}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <span className="text-gray-800 dark:text-white font-medium">Missing Keywords (5)</span>
                      <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    {expandedSections.missingKeywords && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4"
                      >
                        <div className="space-y-2">
                          {['React', 'TypeScript', 'Figma', 'User Research', 'Agile'].map((keyword, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800/30">
                              <span className="text-gray-800 dark:text-white text-sm">{keyword}</span>
                              <button className="text-[#80FF00] hover:text-[#80FF00]/80 text-xs">
                                Add to CV
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Keywords to Increase Density */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <button
                      onClick={() => toggleSection('keywordsDensity')}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <span className="text-gray-800 dark:text-white font-medium">Keywords to Increase Density</span>
                      <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    {expandedSections.keywordsDensity && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4"
                      >
                        <div className="space-y-2">
                          {['Product Design', 'UX/UI', 'Prototyping', 'Design Systems'].map((keyword, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800/30">
                              <span className="text-gray-800 dark:text-white text-sm">{keyword}</span>
                              <span className="text-yellow-600 dark:text-yellow-400 text-xs">Low density</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Soft Skills Alignment */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <button
                      onClick={() => toggleSection('softSkills')}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <span className="text-gray-800 dark:text-white font-medium">Soft Skills Alignment</span>
                      <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    {expandedSections.softSkills && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4"
                      >
                        <div className="space-y-2">
                          {['Leadership', 'Communication', 'Problem Solving', 'Collaboration'].map((skill, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800/30">
                              <span className="text-gray-800 dark:text-white text-sm">{skill}</span>
                              <span className="text-[#80FF00] text-xs">Well aligned</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onFixAll}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              Fix Now
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#80FF00] text-white rounded-lg hover:bg-[#80FF00]/90 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
