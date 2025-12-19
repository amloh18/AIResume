'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Target, Sparkles } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { filterJobTitles } from '@/lib/data/role-profiler-data';

interface RoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: UnifiedCVDataStructure;
  onSubmit: (data: {
    targetRole: string;
    seniorityLevel: string;
    jobDescription?: string;
    hasJD: boolean;
  }) => void;
  onOpenJobParser?: () => void;
}

const SENIORITY_LEVELS = [
  { value: 'beginner', label: 'Beginner (0-2 years)' },
  { value: 'experienced', label: 'Experienced (2-5 years)' },
  { value: 'professional', label: 'Professional (5-10 years)' },
  { value: 'senior', label: 'Senior (10-15 years)' },
  { value: 'executive', label: 'Executive (15+ years)' }
];

export default function RoleSelectorModal({
  isOpen,
  onClose,
  cvData,
  onSubmit,
  onOpenJobParser
}: RoleSelectorModalProps) {
  const [targetRole, setTargetRole] = useState('');
  const [seniorityLevel, setSeniorityLevel] = useState('');
  const [roleAutoFilled, setRoleAutoFilled] = useState(false);
  const [seniorityAutoFilled, setSeniorityAutoFilled] = useState(false);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const roleInputRef = useRef<HTMLDivElement>(null);

  // Auto-fill role from latest work experience
  useEffect(() => {
    if (isOpen && cvData.work && cvData.work.length > 0) {
      const latestPosition = cvData.work[0].position;
      if (latestPosition && !targetRole) {
        setTargetRole(latestPosition);
        setRoleAutoFilled(true);
      }
    }
  }, [isOpen, cvData]);

  // Auto-calculate seniority from work history
  useEffect(() => {
    if (isOpen && cvData.work && cvData.work.length > 0 && !seniorityLevel) {
      const totalYears = calculateTotalWorkYears(cvData.work);
      const suggestedSeniority = getSeniorityFromYears(totalYears);
      setSeniorityLevel(suggestedSeniority);
      setSeniorityAutoFilled(true);
    }
  }, [isOpen, cvData]);

  // Filter role suggestions based on input
  useEffect(() => {
    if (targetRole) {
      setRoleSuggestions(filterJobTitles(targetRole));
      setShowRoleSuggestions(true);
    } else {
      setRoleSuggestions(filterJobTitles(''));
      setShowRoleSuggestions(true);
    }
  }, [targetRole]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleInputRef.current && !roleInputRef.current.contains(event.target as Node)) {
        setShowRoleSuggestions(false);
      }
    };

    if (showRoleSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showRoleSuggestions]);

  const calculateTotalWorkYears = (work: any[]): number => {
    try {
      const now = new Date();
      let totalMonths = 0;

      work.forEach(exp => {
        const startDate = new Date(exp.startDate);
        const endDate = exp.endDate && exp.endDate !== 'Present' 
          ? new Date(exp.endDate) 
          : now;

        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                      (endDate.getMonth() - startDate.getMonth());
        totalMonths += months;
      });

      return totalMonths / 12;
    } catch (error) {
      return 0;
    }
  };

  const getSeniorityFromYears = (years: number): string => {
    if (years < 2) return 'beginner';
    if (years < 5) return 'experienced';
    if (years < 10) return 'professional';
    if (years < 15) return 'senior';
    return 'executive';
  };

  const handleSubmit = (submitType: 'role_only' | 'with_jd' | 'skip') => {
    if (submitType === 'skip') {
      onSubmit({
        targetRole: '',
        seniorityLevel: '',
        hasJD: false
      });
      return;
    }

    if (submitType === 'role_only') {
      onSubmit({
        targetRole,
        seniorityLevel,
        hasJD: false
      });
    } else if (submitType === 'with_jd') {
      // This path should not be used anymore - onOpenJobParser should be called instead
      onSubmit({
        targetRole,
        seniorityLevel,
        hasJD: true
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl shadow-black/30 dark:shadow-black/60 w-full max-w-2xl mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Target className="w-8 h-8 text-gray-900 dark:text-white" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Define Your Target Role</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a2015] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Help us tailor your resume for maximum impact
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 bg-white dark:bg-[#141810]">
              {/* Role Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4" />
                    <span>Role Title</span>
                    {roleAutoFilled && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[color:var(--accent-primary)]/15 text-[color:var(--accent-primary)] shadow-sm shadow-black/10 dark:shadow-black/30">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI
                      </span>
                    )}
                  </div>
                </label>
                <div className="relative" ref={roleInputRef}>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => {
                    setTargetRole(e.target.value);
                    setRoleAutoFilled(false);
                  }}
                    onFocus={() => setShowRoleSuggestions(true)}
                  placeholder="e.g., Software Engineer, Product Manager"
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:border-[#80FF00] bg-gray-50 dark:bg-[#1a2015] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                  {/* Autocomplete Suggestions */}
                  <AnimatePresence>
                    {showRoleSuggestions && roleSuggestions.length > 0 && (() => {
                      // Filter out the currently selected role from suggestions
                      const filteredSuggestions = roleSuggestions.filter(role => role !== targetRole);
                      return filteredSuggestions.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 w-full mt-2 bg-white dark:bg-[#1a2015] rounded-lg shadow-xl shadow-black/20 dark:shadow-black/50 border border-gray-200 dark:border-white/10 max-h-60 overflow-y-auto"
                        >
                          {filteredSuggestions.map((role, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setTargetRole(role);
                                setRoleAutoFilled(false);
                                // Don't close the list - keep it open until clicked outside
                              }}
                              className="w-full px-4 py-3 text-left text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#050705] hover:text-gray-900 dark:hover:text-white transition-colors first:rounded-t-lg last:rounded-b-lg"
                            >
                              {role}
                            </button>
                          ))}
                        </motion.div>
                      ) : null;
                    })()}
                  </AnimatePresence>
                </div>
              </div>

              {/* Seniority Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>Seniority Level</span>
                    {seniorityAutoFilled && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[color:var(--accent-primary)]/15 text-[color:var(--accent-primary)] shadow-sm shadow-black/10 dark:shadow-black/30">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI
                      </span>
                    )}
                  </div>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SENIORITY_LEVELS.map(level => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => {
                        setSeniorityLevel(level.value);
                        setSeniorityAutoFilled(false);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        seniorityLevel === level.value
                          ? 'bg-[#80FF00] text-black shadow-md'
                          : 'bg-gray-100 dark:bg-[#1a2015] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#222327] border border-gray-200 dark:border-white/10'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleSubmit('skip')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                Skip
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleSubmit('role_only')}
                  disabled={!targetRole || !seniorityLevel}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-[#1a2015] text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-[#222327] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Role Only
                </button>
                <button
                  onClick={() => {
                    if (onOpenJobParser && targetRole && seniorityLevel) {
                      // Pass role data to parent before opening parser
                      onOpenJobParser({ targetRole, seniorityLevel });
                    } else if (!targetRole || !seniorityLevel) {
                      // Don't do anything if required fields are missing
                      return;
                    } else {
                      // Fallback to old behavior
                      handleSubmit('with_jd');
                    }
                  }}
                  disabled={!targetRole || !seniorityLevel}
                  className="px-6 py-2.5 bg-[#80FF00] text-black rounded-lg hover:bg-[#70e600] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <span>Add JD & Track</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

