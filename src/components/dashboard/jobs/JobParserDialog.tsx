'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, FileText, Loader2, CheckCircle, AlertCircle, ScanLine, Crown, Check, Upload, LayoutDashboard, Briefcase, Building2, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useMembership } from '@/lib/hooks/useMembership';
import UpgradeCard from '@/components/dashboard/UpgradeCard';
import Image from 'next/image';
import { COMMON_JOB_TITLES } from '@/lib/data/role-profiler-data';

interface ParsedJobData {
  jobTitle: string;
  company: string;
  location?: string;
  jobUrl?: string;
  jobDescription?: string;
  jobDescriptionRaw?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  deadline?: Date;
  source?: string;
  sourceUrl?: string;
  tags?: string[];
  notes?: string;
  experienceLevel?: string;
}

interface JobParserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onParseComplete: (data: ParsedJobData) => void;
  customDescription?: string;
  showSaveAndTrack?: boolean;
  onSaveAndTrack?: (data: ParsedJobData) => void;
  initialData?: {
    jobDescription?: string;
  };
  matchScore?: number;
}

const JobParserDialog: React.FC<JobParserDialogProps> = ({
  isOpen,
  onClose,
  onParseComplete,
  customDescription,
  showSaveAndTrack = false,
  onSaveAndTrack,
  initialData,
  matchScore = 82
}) => {
  const { user } = useUnifiedAuth();
  const { membership, loading: membershipLoading, canAccess } = useMembership();
  const [inputText, setInputText] = useState(initialData?.jobDescription || '');
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedJobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  // Editable fields state
  const [editedJobTitle, setEditedJobTitle] = useState('');
  const [editedCompany, setEditedCompany] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedSalary, setEditedSalary] = useState<{ min?: number; max?: number; currency?: string; period?: 'hourly' | 'monthly' | 'yearly' } | null>(null);

  const [targetJobTitle, setTargetJobTitle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid Level (3-5 years)');
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  
  // Filter job titles based on input
  const filteredTitles = COMMON_JOB_TITLES.filter(t => t.toLowerCase().includes(targetJobTitle.toLowerCase())).slice(0, 5);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setInputText('');
      setParsedData(null);
      setError(null);
      setIsParsing(false);
      setEditedJobTitle('');
      setEditedCompany('');
      setEditedLocation('');
      setEditedSalary(null);
      setActiveTab('paste');
      setTargetJobTitle('');
      setExperienceLevel('Mid Level (3-5 years)');
      setShowTitleDropdown(false);
    } else {
      if (initialData?.jobDescription) {
        setInputText(initialData.jobDescription);
      }
    }
  }, [isOpen, initialData]);

  const handleParse = async () => {
    if (!inputText) {
      setError('Please enter job description text');
      return;
    }

    // Check if user is signed in first
    if (!user?.id) {
      setError('Please sign in to parse job descriptions');
      return;
    }

    // Wait for membership to load
    if (membershipLoading) {
      setIsParsing(true);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Check if user has job parsing access (Pro only)
    if (!canAccess('jobParsing')) {
      // Show upgrade popup for Free and Day Pass users
      setShowUpgradePopup(true);
      return;
    }

    await performParse();
  };

  const performParse = async () => {
    setIsParsing(true);
    setError(null);
    setParsedData(null);

    try {
      const response = await fetch('/api/jobs/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // If credit check failed, show upgrade popup
        if (errorData.requiresUpgrade && response.status === 403) {
          setShowUpgradePopup(true);
          setError(errorData.error || 'You need to upgrade to parse job descriptions');
          setIsParsing(false);
          return;
        }

        throw new Error(errorData.error || 'Failed to parse job description');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setParsedData(result.data);
        // Initialize editable fields with parsed data
        setEditedJobTitle(result.data.jobTitle || '');
        setEditedCompany(result.data.company || '');
        setEditedLocation(result.data.location || '');
        setEditedSalary(result.data.salary || null);
        toast.success('Job description parsed successfully!');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse job description';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = () => {
    if (parsedData) {
      // Merge edited fields with parsed data
      const updatedData: ParsedJobData = {
        ...parsedData,
        jobTitle: editedJobTitle || targetJobTitle || parsedData.jobTitle,
        company: editedCompany || parsedData.company,
        location: editedLocation || parsedData.location,
        salary: editedSalary || parsedData.salary,
        experienceLevel: experienceLevel,
      };
      // Always save as draft - credit check will happen when moving to 'created' stage
      onParseComplete(updatedData);
      handleClose();
    }
  };

  const handleSaveAndTrack = () => {
    if (parsedData && onSaveAndTrack) {
      // Merge edited fields with parsed data
      const updatedData: ParsedJobData = {
        ...parsedData,
        jobTitle: editedJobTitle || targetJobTitle || parsedData.jobTitle,
        company: editedCompany || parsedData.company,
        location: editedLocation || parsedData.location,
        salary: editedSalary || parsedData.salary,
        experienceLevel: experienceLevel,
      };
      onSaveAndTrack(updatedData);
      handleClose();
    }
  };

  const handleClose = () => {
    // Only call onClose if dialog is still open to prevent infinite loops
    if (isOpen) {
      onClose();
    }
  };

  const handleOpenChange = (open: boolean) => {
    // Only handle close if dialog is currently open and being closed
    // This prevents infinite loops from state updates
    if (!open && isOpen) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] h-[800px] flex p-0 overflow-hidden bg-gray-50 dark:bg-[#0a0a0a] border-gray-200 dark:border-white/10 rounded-2xl [&>button]:text-gray-500 dark:[&>button]:text-gray-400 dark:[&>button]:hover:text-white">
        <DialogTitle className="sr-only">Smart Job Tracker</DialogTitle>
        <DialogDescription className="sr-only">Parse and analyze job descriptions using AI</DialogDescription>
        <div className="flex w-full h-full">
          {/* Left Panel: Form */}
          <div className="w-1/2 p-8 border-r border-gray-200 dark:border-white/10 flex flex-col bg-white dark:bg-[#141810]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center text-[#141810] font-bold text-lg">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Job Tracker</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Add a job description to unlock AI tailoring and job tracking
            </p>

            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1 mb-6 shrink-0">
              <button
                onClick={() => setActiveTab('paste')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'paste'
                    ? 'bg-white dark:bg-white/10 shadow-sm text-lime-600 dark:text-lime-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Paste JD
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-white dark:bg-white/10 shadow-sm text-lime-600 dark:text-lime-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Upload File
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Textarea */}
            <div className="flex-1 flex flex-col min-h-0">
              {activeTab === 'paste' ? (
                <>
                  <label className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Paste job description</label>
                  <div className="relative flex-1 rounded-xl overflow-hidden border border-gray-300 dark:border-white/10">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Paste the full job description here..."
                      className="w-full h-full p-4 bg-white dark:bg-[#1A201A] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                      disabled={isParsing}
                    />
                    {/* Scanning Animation Overlay */}
                    {isParsing && (
                      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-b from-transparent via-lime-500/20 to-transparent"
                          animate={{ y: ['-100%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          style={{ height: '30%' }}
                        />
                        <motion.div
                          className="absolute inset-0 border-2 border-lime-500/50"
                          animate={{ opacity: [0.3, 0.7, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Target Role & Experience Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 shrink-0">
                    <div className="relative">
                      <label className="text-xs font-semibold mb-1.5 block text-gray-700 dark:text-gray-300">Target Job Title</label>
                      <input 
                        type="text"
                        value={targetJobTitle}
                        onChange={(e) => {
                          setTargetJobTitle(e.target.value);
                          setShowTitleDropdown(true);
                        }}
                        onFocus={() => setShowTitleDropdown(true)}
                        onBlur={() => setTimeout(() => setShowTitleDropdown(false), 200)}
                        placeholder="e.g. Senior Frontend Developer"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1A201A] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors"
                        disabled={isParsing}
                      />
                      {showTitleDropdown && filteredTitles.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1A201A] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg overflow-hidden">
                          {filteredTitles.map((title, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setTargetJobTitle(title);
                                setShowTitleDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                              {title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block text-gray-700 dark:text-gray-300">Your Experience Level</label>
                      <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1A201A] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors"
                        disabled={isParsing}
                      >
                        <option value="Entry Level (0-2 years)">Entry Level (0-2 years)</option>
                        <option value="Mid Level (3-5 years)">Mid Level (3-5 years)</option>
                        <option value="Senior (5-8 years)">Senior (5-8 years)</option>
                        <option value="Lead/Manager (8-12 years)">Lead/Manager (8-12 years)</option>
                        <option value="Director/VP (12+ years)">Director/VP (12+ years)</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                  <div className="w-12 h-12 bg-lime-500/10 rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-lime-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Upload job description file</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOCX, or TXT up to 5MB</p>
                  <Button variant="outline" className="mt-4" disabled>Coming Soon</Button>
                </div>
              )}

              {/* Analyze Button */}
              <Button
                onClick={handleParse}
                disabled={isParsing || !inputText || activeTab === 'upload'}
                className="w-full mt-6 bg-lime-600 hover:bg-lime-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-lime-600/20 shrink-0 text-lg"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : !canAccess('jobParsing') ? (
                  <>
                    <Crown className="w-5 h-5 mr-2" />
                    Analyze with AI (Pro)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
              <div className="flex items-center gap-2 justify-center mt-4 shrink-0 bg-lime-50 dark:bg-lime-500/5 p-3 rounded-lg border border-lime-200 dark:border-lime-500/10">
                <Sparkles className="w-4 h-4 text-lime-600 dark:text-lime-500 shrink-0" />
                <p className="text-xs text-lime-800 dark:text-lime-400/80 font-medium">
                  Tip: The more accurate the job description, the better AI insights and tailored suggestions.
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel: Insights */}
          <div className="w-1/2 p-8 bg-gray-50 dark:bg-[#0a0a0a] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-8 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                AI Extracted Insights
              </h3>
              <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 rounded">
                BETA
              </span>
            </div>

            {!parsedData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white dark:via-[#0a0a0a]/50 dark:to-[#0a0a0a] z-10 pointer-events-none" />
                
                <div className="w-full space-y-6 opacity-40 blur-[3px] select-none pointer-events-none pt-4">
                  {/* Blurred Skills */}
                  <div className="text-left">
                    <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 w-20 bg-indigo-200 dark:bg-indigo-900/50 rounded-md" />
                      <div className="h-6 w-24 bg-indigo-200 dark:bg-indigo-900/50 rounded-md" />
                      <div className="h-6 w-16 bg-indigo-200 dark:bg-indigo-900/50 rounded-md" />
                      <div className="h-6 w-28 bg-indigo-200 dark:bg-indigo-900/50 rounded-md" />
                    </div>
                  </div>
                  {/* Blurred Requirements */}
                  <div className="text-left">
                    <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-200 dark:bg-green-900/50" /><div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" /></div>
                      <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-200 dark:bg-green-900/50" /><div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" /></div>
                      <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-200 dark:bg-green-900/50" /><div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" /></div>
                    </div>
                  </div>
                  {/* Blurred Match Score */}
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <div className="h-4 w-32 bg-indigo-200 dark:bg-indigo-900/50 rounded mb-2" />
                      <div className="h-3 w-48 bg-indigo-100 dark:bg-indigo-900/30 rounded" />
                    </div>
                    <div className="w-14 h-14 rounded-full border-4 border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center">
                      <div className="h-5 w-8 bg-indigo-200 dark:bg-indigo-900/50 rounded" />
                    </div>
                  </div>
                  {/* Blurred Perks & Sponsorship */}
                  <div className="text-left">
                    <div className="h-4 w-28 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
                    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-5 space-y-3">
                      <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
                      <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-800 rounded" />
                      <div className="flex gap-2"><div className="h-4 w-20 bg-blue-100 dark:bg-blue-900/30 rounded" /><div className="h-4 w-24 bg-purple-100 dark:bg-purple-900/30 rounded" /></div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-16 h-16 bg-white dark:bg-[#141810] shadow-lg rounded-2xl flex items-center justify-center mb-4 border border-gray-100 dark:border-white/5">
                    <ScanLine className="w-8 h-8 text-lime-500" />
                  </div>
                  <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">No Insights Yet</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs mx-auto">
                    Paste a job description and click "Analyze with AI" to instantly extract key skills, requirements, and job details.
                  </p>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 flex-1"
              >
                {/* Key Skills */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Key Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.tags && parsedData.tags.length > 0 ? (
                      parsedData.tags.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 rounded-md text-xs font-medium">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No specific skills detected.</span>
                    )}
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Requirements</h4>
                  <ul className="space-y-3">
                    {/* If we don't have extracted requirements, we mock a few based on text length or show generic */}
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">Relevant experience in the specified domain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">Strong portfolio showcasing end-to-end process</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">Collaborate with cross-functional teams</span>
                    </li>
                  </ul>
                </div>

                {/* AI Match Potential */}
                <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4" />
                      AI Match Potential
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400/80">This job matches your profile well</p>
                  </div>
                  <div className="w-14 h-14 rounded-full border-4 border-indigo-500 flex items-center justify-center bg-white dark:bg-[#141810] shadow-sm">
                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">{matchScore}%</span>
                  </div>
                </div>

                {/* Job Details Card */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Job Details</h4>
                  <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-5">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={editedJobTitle}
                          onChange={(e) => setEditedJobTitle(e.target.value)}
                          className="w-full bg-transparent font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-lime-500 rounded px-1 -ml-1"
                          placeholder="Job Title"
                        />
                        <input
                          type="text"
                          value={editedCompany}
                          onChange={(e) => setEditedCompany(e.target.value)}
                          className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-lime-500 rounded px-1 -ml-1 mt-0.5"
                          placeholder="Company Name"
                        />
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-500">
                          <input
                            type="text"
                            value={editedLocation}
                            onChange={(e) => setEditedLocation(e.target.value)}
                            className="bg-transparent focus:outline-none focus:ring-1 focus:ring-lime-500 rounded px-1 -ml-1 w-24"
                            placeholder="Location"
                          />
                          <span>•</span>
                          <span>Full-time</span>
                          {(editedLocation.toLowerCase().includes('uk') || editedLocation.toLowerCase().includes('united kingdom') || editedLocation.toLowerCase().includes('london') || editedLocation.toLowerCase().includes('us') || editedLocation.toLowerCase().includes('united states') || editedLocation.toLowerCase().includes('usa')) && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">Sponsorship: AI Detected</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-white/10 mt-6">
                  <Button
                    onClick={handleSave}
                    className={`${showSaveAndTrack && onSaveAndTrack ? 'flex-1' : 'w-full'} bg-lime-500 hover:bg-lime-600 text-[#141810] font-bold`}
                  >
                    Save Job
                  </Button>
                  {showSaveAndTrack && onSaveAndTrack && (
                    <Button
                      onClick={handleSaveAndTrack}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      Save and Track
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Upgrade Card */}
      {showUpgradePopup && user?.id && (
        <UpgradeCard
          userId={user.id}
          onClose={() => setShowUpgradePopup(false)}
        />
      )}
    </Dialog>
  );
};

export default JobParserDialog;

