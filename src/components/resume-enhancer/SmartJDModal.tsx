'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, Briefcase, Award, X, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHIP_INLINE, CHIP_TONES } from '@/components/ui/chip-styles';

interface SmartJDModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; experienceLevel: string; jobDescription: string }) => void;
  initialData?: {
    title?: string;
    experienceLevel?: string;
    jobDescription?: string;
  };
  isLoading?: boolean;
}

const EXPERIENCE_LEVELS = [
  'Entry Level (0-2 years)',
  'Mid Level (3-5 years)',
  'Senior Level (5-8 years)',
  'Lead / Manager (8-12 years)',
  'Director / VP (12+ years)',
  'Executive / C-Suite'
];

export default function SmartJDModal({ isOpen, onClose, onSubmit, initialData, isLoading }: SmartJDModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [experienceLevel, setExperienceLevel] = useState(initialData?.experienceLevel || EXPERIENCE_LEVELS[0]);
  const [jobDescription, setJobDescription] = useState(initialData?.jobDescription || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, experienceLevel, jobDescription });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-lime-600 dark:text-lime-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Smart Job Profiler</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add a job description to unlock AI tailoring</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row h-full max-h-[75vh] overflow-y-auto">
            {/* Left Column: Form */}
            <div className="flex-1 p-6 space-y-6">
              <form id="smart-jd-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Title */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Briefcase className="w-4 h-4" />
                    Target Job Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Developer"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-lime-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                    required
                  />
                </div>

                {/* Experience Level */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Award className="w-4 h-4" />
                    Your Experience Level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-lime-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                  >
                    {EXPERIENCE_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                {/* JD Textarea */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Job Description
                    </span>
                    <span className={`${CHIP_INLINE} ${CHIP_TONES.neutral}`}>
                      Optional but Recommended
                    </span>
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    className="w-full h-40 px-4 py-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-lime-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 resize-none custom-scrollbar"
                  />
                </div>
              </form>
            </div>

            {/* Right Column: Gamification & Ext CTA */}
            <div className="w-full md:w-72 bg-gray-50 dark:bg-white/5 border-l border-gray-100 dark:border-white/10 p-6 flex flex-col gap-6">
              
              {/* Gamified Teaser */}
              <div className="bg-white dark:bg-[#141810] rounded-xl p-5 border border-gray-200 dark:border-lime-500/20 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-lime-500/10 blur-2xl rounded-full" />
                
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Expected ATS Match
                </h3>
                
                <div className="flex items-end gap-2 mb-2 relative">
                  <span className="text-4xl font-black text-gray-800 dark:text-white tracking-tighter blur-[6px] select-none opacity-80 group-hover:blur-[2px] transition-all duration-500">
                    92%
                  </span>
                  <span className="text-sm font-medium text-lime-600 dark:text-lime-400 mb-1 animate-pulse">
                    ?
                  </span>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed relative z-10">
                  Add a job description to instantly reveal your ATS score and unlock AI-powered content tailoring.
                </p>
              </div>

              {/* Chrome Extension CTA */}
              <div className="mt-auto">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-500/20 relative overflow-hidden">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Seamless Job Add</h4>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                    Install our browser extension to save jobs directly from LinkedIn, Indeed, and more with 1-click.
                  </p>
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 text-center bg-white dark:bg-black/50 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                  >
                    Get Extension
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6 border-gray-300 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="smart-jd-form"
              disabled={isLoading || !title.trim()}
              className="px-6 bg-lime-500 hover:bg-lime-600 text-white font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                'Save Job Profile'
              )}
            </Button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
