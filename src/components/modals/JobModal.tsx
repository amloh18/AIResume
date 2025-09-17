'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ExternalLink, 
  Briefcase, 
  Building, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  Star,
  Clock,
  CheckCircle,
  Loader2,
  Sparkles,
  Link,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  List,
  Hash,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff
} from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';

interface Job {
  id?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  jobUrl?: string;
  jobDescription?: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'created' | 'applied' | 'interview' | 'offer' | 'rejected';
  deadline?: string;
  sponsorship?: 'yes' | 'no' | 'unknown';
}

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobSaved: (job: Job) => void;
  editingJob?: Job | null;
  userId: string;
}

const JobModal: React.FC<JobModalProps> = ({
  isOpen,
  onClose,
  onJobSaved,
  editingJob,
  userId
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({});
  const themeClasses = getThemeClasses;

  // Initialize text statistics when modal opens
  useEffect(() => {
    if (isOpen && editingJob) {
      // Initialize job description stats
      const jobDescStats = getTextStats(editingJob.jobDescription || '');
      const jobDescStatsElement = document.getElementById('jobDescription-stats');
      if (jobDescStatsElement) {
        jobDescStatsElement.textContent = `${jobDescStats.words} words, ${jobDescStats.characters} chars`;
      }

      // Initialize notes stats
      const notesStats = getTextStats(editingJob.notes || '');
      const notesStatsElement = document.getElementById('notes-stats');
      if (notesStatsElement) {
        notesStatsElement.textContent = `${notesStats.words} words, ${notesStats.characters} chars`;
      }
    }
  }, [isOpen, editingJob]);

  // Text field utility functions
  const getTextStats = (text: string) => {
    const characters = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;
    return { characters, words, lines };
  };

  const toggleFieldExpansion = (fieldId: string) => {
    setExpandedFields(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const togglePreview = (fieldId: string) => {
    setShowPreview(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const formatText = (text: string, format: string) => {
    switch (format) {
      case 'bold':
        return `**${text}**`;
      case 'italic':
        return `*${text}*`;
      case 'bullet':
        return `• ${text}`;
      case 'number':
        return `1. ${text}`;
      default:
        return text;
    }
  };

  const handleParseJobUrl = async () => {
    const urlInput = document.getElementById('jobUrlParser') as HTMLInputElement;
    const url = urlInput?.value?.trim();
    
    if (!url) {
      alert('Please enter a job URL');
      return;
    }

    try {
      // Parse job URL logic would go here
      console.log('Parsing job URL:', url);
      // For now, just show an alert
      alert('Job URL parsing feature coming soon!');
    } catch (error) {
      console.error('Error parsing job URL:', error);
      alert('Failed to parse job URL. Please try again.');
    }
  };

  const handleSaveJob = async (formData: any) => {
    setIsSaving(true);
    
    try {
      const jobData = {
        ...formData,
        userId,
        applicationDate: new Date().toISOString()
      };

      const url = editingJob ? `/api/jobs/${editingJob.id}` : '/api/jobs';
      const method = editingJob ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      });

      if (!response.ok) {
        throw new Error('Failed to save job');
      }

      const result = await response.json();
      const savedJob = result.job || result.data?.job || result;
      
      onJobSaved(savedJob);
      onClose();
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Failed to save job. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    const deadlineValue = (document.getElementById('deadline') as HTMLInputElement)?.value;
    const jobTitle = (document.getElementById('jobTitle') as HTMLInputElement)?.value?.trim();
    const company = (document.getElementById('company') as HTMLInputElement)?.value?.trim();
    
    // Validate required fields
    if (!jobTitle) {
      alert('Job Title is required');
      return;
    }
    if (!company) {
      alert('Company is required');
      return;
    }
    
    const formData = {
      jobTitle,
      company,
      location: (document.getElementById('location') as HTMLInputElement)?.value?.trim(),
      jobUrl: (document.getElementById('jobUrl') as HTMLInputElement)?.value?.trim(),
      jobDescription: (document.getElementById('jobDescription') as HTMLTextAreaElement)?.value?.trim(),
      notes: (document.getElementById('notes') as HTMLTextAreaElement)?.value?.trim(),
      sponsorship: (document.getElementById('sponsorship') as HTMLSelectElement)?.value as 'yes' | 'no' | 'unknown',
      priority: (document.getElementById('priority') as HTMLSelectElement)?.value as 'low' | 'medium' | 'high',
      status: (document.getElementById('status') as HTMLSelectElement)?.value as Job['status'],
      deadline: deadlineValue ? new Date(deadlineValue).toISOString() : undefined,
    };
    
    console.log('🔍 Job Form - Form data to save:', formData);
    handleSaveJob(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${themeClasses.background.overlay} backdrop-blur-sm`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`${themeClasses.card.base} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border`}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-lime-500/10 to-emerald-500/10 dark:from-lime-500/10 dark:to-emerald-500/10 border-b border-gray-200 dark:border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-lime-500 to-emerald-500 rounded-xl shadow-lg">
                    {editingJob ? (
                      <Briefcase className="w-6 h-6 text-white" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                      {editingJob ? 'Edit Job Position' : 'Add New Job'}
                    </h2>
                    <p className={`${themeClasses.text.secondary} text-sm mt-1`}>
                      {editingJob ? 'Update your job details' : 'Create a new job application'}
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  className={`p-3 ${themeClasses.text.muted} hover:${themeClasses.text.primary} hover:${themeClasses.background.hover} rounded-xl transition-all duration-200 group`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={24} className="group-hover:rotate-90 transition-transform duration-200" />
                </motion.button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
              
              {/* Enhanced Link Parser */}
              {!editingJob && (
                <motion.div 
                  className="mb-8 p-6 bg-gradient-to-r from-lime-500/10 to-emerald-500/10 dark:from-lime-500/10 dark:to-emerald-500/10 border border-lime-500/30 dark:border-lime-500/30 rounded-xl shadow-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-lime-500 to-emerald-500 rounded-lg shadow-md">
                      <ExternalLink size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Quick Job Import</h3>
                      <p className={`${themeClasses.text.secondary} text-sm`}>Import job details from popular job boards</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="url"
                        id="jobUrlParser"
                        placeholder="Paste job posting URL (LinkedIn, Indeed, Glassdoor, etc.)"
                        className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200`}
                      />
                      <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${themeClasses.text.muted}`}>
                        <Link className="w-5 h-5" />
                      </div>
                    </div>
                    <motion.button
                      onClick={handleParseJobUrl}
                      className="px-6 py-3 bg-gradient-to-r from-lime-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Parse
                    </motion.button>
                  </div>
                  <div className={`mt-3 flex items-center gap-2 text-sm text-lime-600 dark:text-lime-300`}>
                    <CheckCircle className="w-4 h-4" />
                    <span>Supports LinkedIn, Indeed, Glassdoor, and other major job boards</span>
                  </div>
                </motion.div>
              )}

              {/* Enhanced Form Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Job Title */}
                  <motion.div 
                    className="group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className={`flex items-center gap-2 ${themeClasses.text.primary} font-semibold text-sm mb-3`}>
                      <Briefcase className="w-4 h-4 text-lime-500 dark:text-lime-400" />
                      Job Title *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="jobTitle"
                        defaultValue={editingJob?.jobTitle || ''}
                        className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200`}
                        placeholder="e.g., Senior Frontend Developer"
                      />
                    </div>
                  </motion.div>

                  {/* Company */}
                  <motion.div 
                    className="group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <label className={`flex items-center gap-2 ${themeClasses.text.primary} font-semibold text-sm mb-3`}>
                      <Building className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      Company *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="company"
                        defaultValue={editingJob?.company || ''}
                        className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200`}
                        placeholder="e.g., TechCorp Inc."
                      />
                    </div>
                  </motion.div>

                  {/* Location */}
                  <motion.div 
                    className="group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className={`flex items-center gap-2 ${themeClasses.text.primary} font-semibold text-sm mb-3`}>
                      <MapPin className="w-4 h-4 text-green-500 dark:text-green-400" />
                      Location
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="location"
                        defaultValue={editingJob?.location || ''}
                        className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200`}
                        placeholder="e.g., San Francisco, CA"
                      />
                    </div>
                  </motion.div>

                  {/* Job URL */}
                  <motion.div 
                    className="group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <label className={`flex items-center gap-2 ${themeClasses.text.primary} font-semibold text-sm mb-3`}>
                      <Link className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      Job URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        id="jobUrl"
                        defaultValue={editingJob?.jobUrl || ''}
                        className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200`}
                        placeholder="https://company.com/careers/job"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Priority */}
                  <motion.div 
                    className="group"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label className={`flex items-center gap-2 ${themeClasses.text.primary} font-semibold text-sm mb-3`}>
                      <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                      Priority
                    </label>
                    <div className="relative">
                      <select
                        id="priority"
                        defaultValue={editingJob?.priority || 'medium'}
                        className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200 appearance-none cursor-pointer`}
                      >
                        <option value="low" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Low Priority</option>
                        <option value="medium" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Medium Priority</option>
                        <option value="high" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">High Priority</option>
                      </select>
                    </div>
                  </motion.div>

                  {/* Status */}
                  <motion.div 
                    className="group"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <label className={`flex items-center gap-2 ${themeClasses.text.primary} font-semibold text-sm mb-3`}>
                      <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      Status
                    </label>
                    <div className="relative">
                      <select
                        id="status"
                        defaultValue={editingJob?.status || 'created'}
                        className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200 appearance-none cursor-pointer`}
                      >
                        <option value="created" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Created</option>
                        <option value="applied" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Applied</option>
                        <option value="interview" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Interview</option>
                        <option value="offer" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Offer</option>
                        <option value="rejected" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Rejected</option>
                      </select>
                    </div>
                  </motion.div>

                  {/* Deadline */}
                  <motion.div 
                    className="group"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <label className={`flex items-center gap-2 ${themeClasses.text.primary} font-semibold text-sm mb-3`}>
                      <Calendar className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                      Deadline (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        id="deadline"
                        defaultValue={editingJob?.deadline ? new Date(editingJob.deadline).toISOString().split('T')[0] : ''}
                        className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200`}
                      />
                    </div>
                  </motion.div>

                  {/* Sponsorship */}
                  <motion.div 
                    className="group"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 }}
                  >
                    <label className={`flex items-center gap-2 ${themeClasses.text.primary} font-semibold text-sm mb-3`}>
                      <DollarSign className="w-4 h-4 text-green-500 dark:text-green-400" />
                      Sponsorship
                    </label>
                    <div className="relative">
                      <select
                        id="sponsorship"
                        defaultValue={editingJob?.sponsorship || 'unknown'}
                        className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200 appearance-none cursor-pointer`}
                      >
                        <option value="unknown" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Unknown</option>
                        <option value="yes" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Yes</option>
                        <option value="no" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">No</option>
                      </select>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Professional Job Description Section */}
              <motion.div 
                className="mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <label className={`flex items-center gap-2 ${themeClasses.text.primary} font-semibold text-sm`}>
                    <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    Job Description
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Text Statistics */}
                    <div className={`flex items-center gap-3 text-xs ${themeClasses.text.muted}`}>
                      <span id="jobDescription-stats">0 words, 0 chars</span>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <motion.button
                        onClick={() => togglePreview('jobDescription')}
                        className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={showPreview.jobDescription ? 'Hide Preview' : 'Show Preview'}
                      >
                        {showPreview.jobDescription ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </motion.button>
                      <motion.button
                        onClick={() => toggleFieldExpansion('jobDescription')}
                        className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={expandedFields.jobDescription ? 'Minimize' : 'Maximize'}
                      >
                        {expandedFields.jobDescription ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Formatting Toolbar */}
                <div className={`flex items-center gap-2 p-3 ${themeClasses.background.secondary} rounded-lg mb-3 border`}>
                  <div className="flex items-center gap-1">
                    <motion.button
                      className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Bullet List"
                    >
                      <List className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Numbered List"
                    >
                      <Hash className="w-4 h-4" />
                    </motion.button>
                  </div>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
                  <div className="flex items-center gap-1">
                    <motion.button
                      className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Align Left"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Align Center"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Align Right"
                    >
                      <AlignRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                {/* Text Area Container */}
                <div className="relative">
                  {showPreview.jobDescription ? (
                    <div className={`w-full px-4 py-3 ${themeClasses.background.secondary} rounded-xl text-sm border min-h-32 max-h-96 overflow-y-auto`}>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans">{editingJob?.jobDescription || 'No content to preview'}</pre>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      id="jobDescription"
                      defaultValue={editingJob?.jobDescription || ''}
                      className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200 resize-none ${expandedFields.jobDescription ? 'h-96' : 'h-32'}`}
                      placeholder="Paste or enter the job description here..."
                      onChange={(e) => {
                        const stats = getTextStats(e.target.value);
                        const statsElement = document.getElementById('jobDescription-stats');
                        if (statsElement) {
                          statsElement.textContent = `${stats.words} words, ${stats.characters} chars`;
                        }
                      }}
                    />
                  )}
                </div>

                {/* Help Text */}
                <div className={`mt-2 text-xs ${themeClasses.text.muted} flex items-center gap-2`}>
                  <Type className="w-3 h-3" />
                  <span>Use formatting tools above to style your text. Supports markdown formatting.</span>
                </div>
              </motion.div>

              {/* Professional Notes Section */}
              <motion.div 
                className="mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <label className={`flex items-center gap-2 ${themeClasses.text.primary} font-semibold text-sm`}>
                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    Notes
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Text Statistics */}
                    <div className={`flex items-center gap-3 text-xs ${themeClasses.text.muted}`}>
                      <span id="notes-stats">0 words, 0 chars</span>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <motion.button
                        onClick={() => togglePreview('notes')}
                        className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={showPreview.notes ? 'Hide Preview' : 'Show Preview'}
                      >
                        {showPreview.notes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </motion.button>
                      <motion.button
                        onClick={() => toggleFieldExpansion('notes')}
                        className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={expandedFields.notes ? 'Minimize' : 'Maximize'}
                      >
                        {expandedFields.notes ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Simplified Formatting Toolbar for Notes */}
                <div className={`flex items-center gap-2 p-2 ${themeClasses.background.secondary} rounded-lg mb-3 border`}>
                  <div className="flex items-center gap-1">
                    <motion.button
                      className={`p-1.5 ${themeClasses.background.hover} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Bold"
                    >
                      <Bold className="w-3 h-3" />
                    </motion.button>
                    <motion.button
                      className={`p-1.5 ${themeClasses.background.hover} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Italic"
                    >
                      <Italic className="w-3 h-3" />
                    </motion.button>
                    <motion.button
                      className={`p-1.5 ${themeClasses.background.hover} rounded-lg transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Bullet List"
                    >
                      <List className="w-3 h-3" />
                    </motion.button>
                  </div>
                </div>

                {/* Text Area Container */}
                <div className="relative">
                  {showPreview.notes ? (
                    <div className={`w-full px-4 py-3 ${themeClasses.background.secondary} rounded-xl text-sm border min-h-24 max-h-64 overflow-y-auto`}>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans">{editingJob?.notes || 'No notes to preview'}</pre>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      id="notes"
                      defaultValue={editingJob?.notes || ''}
                      className={`w-full px-4 py-3 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-xl text-sm transition-all duration-200 resize-none ${expandedFields.notes ? 'h-64' : 'h-24'}`}
                      placeholder="Add any notes about this job application..."
                      onChange={(e) => {
                        const stats = getTextStats(e.target.value);
                        const statsElement = document.getElementById('notes-stats');
                        if (statsElement) {
                          statsElement.textContent = `${stats.words} words, ${stats.characters} chars`;
                        }
                      }}
                    />
                  )}
                </div>

                {/* Help Text */}
                <div className={`mt-2 text-xs ${themeClasses.text.muted} flex items-center gap-2`}>
                  <Type className="w-3 h-3" />
                  <span>Add personal notes, reminders, or additional context for this job application.</span>
                </div>
              </motion.div>
            </div>

            {/* Enhanced Footer */}
            <div className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 border-t border-gray-200 dark:border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${themeClasses.text.muted} text-sm`}>
                  <CheckCircle className="w-4 h-4" />
                  <span>All fields marked with * are required</span>
                </div>
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={onClose}
                    className={`px-6 py-3 ${themeClasses.text.secondary} hover:${themeClasses.text.primary} hover:${themeClasses.background.hover} rounded-xl transition-all duration-200 text-sm font-medium`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="px-8 py-3 bg-gradient-to-r from-lime-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {editingJob ? 'Update Job' : 'Create Job'}
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobModal;
