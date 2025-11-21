'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, TrendingUp, Clock, Info } from 'lucide-react';

interface SkillAnalysis {
  name: string;
  status: 'mastered' | 'transferable' | 'critical-gap';
  priority: 'critical' | 'high' | 'medium';
  jdContext: string;
  cvEvidence?: string;
  courseRecommendation?: {
    provider: string;
    title: string;
    url: string;
    estimatedHours: number;
  };
  cvRephraseSuggestion?: string;
}

interface SkillCategory {
  name: string;
  requiredSkills: number;
  matchedSkills: number;
  skills: SkillAnalysis[];
}

interface SkillGapAnalysis {
  overallMatchScore: number;
  lastAnalyzed: string | Date;
  categories: SkillCategory[];
}

interface SkillGapAnalysisSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle?: string;
  company?: string;
}

const SkillGapAnalysisSidebar: React.FC<SkillGapAnalysisSidebarProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  company
}) => {
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const sidebarRef = useRef<HTMLDivElement>(null);

  const sidebarWidth = 640;

  useEffect(() => {
    if (isOpen && jobId) {
      fetchAnalysis();
    }
  }, [isOpen, jobId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    if (!jobId) {
      setError('Job ID is missing');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching skill gap analysis for jobId:', jobId);
      const response = await fetch(`/api/jobs/${jobId}/skill-gap-analysis`);
      const data = await response.json();

      console.log('📊 Skill gap analysis response:', {
        ok: response.ok,
        status: response.status,
        success: data.success,
        error: data.error
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch skill gap analysis');
      }

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        // Expand all categories by default
        if (data.analysis.categories) {
          setExpandedCategories(new Set(data.analysis.categories.map((cat: SkillCategory) => cat.name)));
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching skill gap analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mastered':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'transferable':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical-gap':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'Mastered';
      case 'transferable':
        return 'Transferable';
      case 'critical-gap':
        return 'Critical Gap';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'text-green-600 dark:text-green-400';
      case 'transferable':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical-gap':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const formatDate = (date: string | Date) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-black/50 backdrop-blur-sm z-40"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            ref={sidebarRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen bg-white dark:bg-[#141810] shadow-2xl z-50 flex flex-col"
            style={{ width: sidebarWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] sticky top-0 z-10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <TrendingUp className="w-5 h-5 text-lime-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    Skill Gap Analysis
                  </h2>
                  {(jobTitle || company) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {jobTitle} {company ? `at ${company}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {!loading && !error && analysis && (
                <>
                  {/* Overall Match Score */}
                  <div className="p-4 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-900/20 dark:to-green-900/20 rounded-lg border border-lime-200 dark:border-lime-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Overall Match Score
                      </span>
                      <span className="text-2xl font-bold text-lime-600 dark:text-lime-400">
                        {analysis.overallMatchScore}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-lime-500 to-green-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis.overallMatchScore}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    {analysis.lastAnalyzed && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>Last analyzed: {formatDate(analysis.lastAnalyzed)}</span>
                      </div>
                    )}
                  </div>

                  {/* Categories */}
                  {analysis.categories && analysis.categories.length > 0 ? (
                    <div className="space-y-3">
                      {analysis.categories.map((category) => {
                        const isExpanded = expandedCategories.has(category.name);
                        const matchPercentage = category.requiredSkills > 0
                          ? Math.round((category.matchedSkills / category.requiredSkills) * 100)
                          : 0;

                        return (
                          <div
                            key={category.name}
                            className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden"
                          >
                            {/* Category Header */}
                            <button
                              onClick={() => toggleCategory(category.name)}
                              className="w-full p-3 bg-gray-50 dark:bg-[#1a2015] hover:bg-gray-100 dark:hover:bg-[#1f2a1a] transition-colors flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {category.name}
                                  </h3>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {category.matchedSkills}/{category.requiredSkills} Skills Matched ({matchPercentage}%)
                                  </p>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                            </button>

                            {/* Category Skills */}
                            {isExpanded && (
                              <div className="p-3 space-y-3 bg-white dark:bg-[#141810]">
                                {category.skills && category.skills.length > 0 ? (
                                  category.skills.map((skill, index) => (
                                    <div
                                      key={index}
                                      className="p-3 bg-gray-50 dark:bg-[#1a2015] rounded-lg border border-gray-200 dark:border-white/10"
                                    >
                                      <div className="flex items-start gap-2 mb-2">
                                        {getStatusIcon(skill.status)}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              {skill.name}
                                            </span>
                                            {skill.status === 'critical-gap' && (
                                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(skill.priority)}`}>
                                                {skill.priority.charAt(0).toUpperCase() + skill.priority.slice(1)} Priority
                                              </span>
                                            )}
                                          </div>
                                          <span className={`text-xs font-medium ${getStatusColor(skill.status)}`}>
                                            {getStatusLabel(skill.status)}
                                          </span>
                                        </div>
                                      </div>

                                      {skill.jdContext && (
                                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-gray-700 dark:text-gray-300">
                                          <span className="font-medium">JD Context: </span>
                                          {skill.jdContext}
                                        </div>
                                      )}

                                      {skill.cvEvidence && (
                                        <div className="mt-2 group relative">
                                          <div className="flex items-start gap-2">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                                <span className="font-medium text-green-700 dark:text-green-400">CV Evidence:</span>
                                              </div>
                                              <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                                                {skill.cvEvidence.length > 120 
                                                  ? `${skill.cvEvidence.substring(0, 120)}...` 
                                                  : skill.cvEvidence}
                                              </p>
                                              {skill.cvEvidence.length > 120 && (
                                                <div className="absolute left-0 top-full mt-2 w-80 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 pointer-events-none border border-gray-700">
                                                  <div className="font-semibold mb-2 text-green-400 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Full CV Evidence
                                                  </div>
                                                  <div className="text-gray-200 leading-relaxed">{skill.cvEvidence}</div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {skill.cvRephraseSuggestion && (
                                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-gray-700 dark:text-gray-300">
                                          <span className="font-medium">Suggested CV Rephrase: </span>
                                          {skill.cvRephraseSuggestion}
                                        </div>
                                      )}

                                      {skill.courseRecommendation && (
                                        <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs">
                                          <div className="font-medium text-gray-900 dark:text-white mb-1">
                                            Course Recommendation:
                                          </div>
                                          <div className="text-gray-700 dark:text-gray-300 mb-1">
                                            {skill.courseRecommendation.title} ({skill.courseRecommendation.provider})
                                          </div>
                                          <div className="text-gray-500 dark:text-gray-400 text-xs mb-2">
                                            Estimated: {skill.courseRecommendation.estimatedHours} hours
                                          </div>
                                          <a
                                            href={skill.courseRecommendation.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 dark:text-purple-400 hover:underline text-xs font-medium"
                                          >
                                            View Course →
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                    No skills found in this category
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <p>No skill categories found in the analysis.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SkillGapAnalysisSidebar;

