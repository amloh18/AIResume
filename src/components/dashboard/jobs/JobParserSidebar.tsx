'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, FileText, Loader2, CheckCircle, AlertCircle, ScanLine, 
  Crown, Check, Upload, LayoutDashboard, Briefcase, Building2, MapPin, 
  DollarSign, GraduationCap, Shield, HelpCircle, Link, ChevronDown, 
  Zap, Clipboard, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useMembership } from '@/lib/hooks/useMembership';
import UpgradeCard from '@/components/dashboard/UpgradeCard';

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
  sponsorship?: string;
  benefits?: string[];
  extractedJd?: any;
}

interface JobParserSidebarProps {
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

const JobParserSidebar: React.FC<JobParserSidebarProps> = ({
  isOpen,
  onClose,
  onParseComplete,
  showSaveAndTrack = false,
  onSaveAndTrack,
  initialData,
  matchScore = 82
}) => {
  const { user } = useUnifiedAuth();
  const { membership, loading: membershipLoading, canAccess } = useMembership();
  const [inputText, setInputText] = useState(initialData?.jobDescription || '');
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'url'>('paste');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedJobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  // Editable fields state
  const [editedJobTitle, setEditedJobTitle] = useState('');
  const [editedCompany, setEditedCompany] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedSalary, setEditedSalary] = useState<{ min?: number; max?: number; currency?: string; period?: 'hourly' | 'monthly' | 'yearly' }>({
    min: undefined,
    max: undefined,
    currency: '$',
    period: 'yearly'
  });
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [editedBenefits, setEditedBenefits] = useState<string[]>([]);
  const [newBenefitInput, setNewBenefitInput] = useState('');
  const [sponsorship, setSponsorship] = useState<'yes' | 'no' | 'unknown'>('unknown');

  // Dropdown & selector states
  const [experienceLevel, setExperienceLevel] = useState('Mid Level');
  const [isPasteAreaCollapsed, setIsPasteAreaCollapsed] = useState(false);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const fetchRecentJobs = async () => {
    if (!user?.id) return;
    setRecentLoading(true);
    try {
      const response = await fetch('/api/jobs/list?limit=3');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data.jobs)) {
          setRecentJobs(result.data.jobs);
        } else if (result.success && Array.isArray(result.data)) {
          setRecentJobs(result.data);
        } else {
          // Try /api/jobs fallback
          const backupRes = await fetch('/api/jobs?limit=3');
          if (backupRes.ok) {
            const backupResult = await backupRes.json();
            const list = backupResult.jobs || backupResult.data || [];
            if (Array.isArray(list)) setRecentJobs(list);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching recent jobs:', err);
    } finally {
      setRecentLoading(false);
    }
  };

  // Reset form and fetch recent jobs when sidebar closes/opens
  useEffect(() => {
    if (!isOpen) {
      setInputText('');
      setUrlInput('');
      setParsedData(null);
      setError(null);
      setIsParsing(false);
      setEditedJobTitle('');
      setEditedCompany('');
      setEditedLocation('');
      setEditedSalary({ min: undefined, max: undefined, currency: '$', period: 'yearly' });
      setEditedTags([]);
      setEditedBenefits([]);
      setNewBenefitInput('');
      setSponsorship('unknown');
      setActiveTab('paste');
      setExperienceLevel('Mid Level');
      setIsPasteAreaCollapsed(false);
    } else {
      if (initialData?.jobDescription) {
        setInputText(initialData.jobDescription);
      }
      if (user?.id) {
        fetchRecentJobs();
      }
    }
  }, [isOpen, initialData, user?.id]);

  // Read from Clipboard utility for LinkedIn/Indeed quick paste
  const handleClipboardPaste = async (source: string) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        toast.success(`Pasted job description from ${source}!`);
      } else {
        toast.error('Clipboard is empty. Please copy a job description first.');
      }
    } catch (err) {
      toast.error('Could not access clipboard. Please paste manually into the text area.');
    }
  };

  const handleParse = async () => {
    if (activeTab === 'url') {
      if (!urlInput) {
        setError('Please enter a job URL');
        return;
      }
    } else {
      if (!inputText) {
        setError('Please enter job description text');
        return;
      }
    }

    if (!user?.id) {
      setError('Please sign in to parse job descriptions');
      return;
    }

    if (membershipLoading) {
      setIsParsing(true);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!canAccess('jobParsing')) {
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
        body: JSON.stringify(
          activeTab === 'url'
            ? { url: urlInput }
            : { text: inputText }
        ),
      });

      if (!response.ok) {
        const errorData = await response.json();
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
        setEditedLocation(result.data.location || result.data.location?.value || '');
        
        if (result.data.salary) {
          setEditedSalary({
            min: result.data.salary.min,
            max: result.data.salary.max,
            currency: result.data.salary.currency || '$',
            period: result.data.salary.period || 'yearly'
          });
        }
        
        if (result.data.tags) {
          setEditedTags(result.data.tags);
        }

        if (result.data.experienceLevel) {
          setExperienceLevel(result.data.experienceLevel);
        }

        // Extract benefits and sponsorship
        const richData = result.data.extractedJd || result.data.richData;
        let extractedBenefits: string[] = [];
        if (richData?.compensation?.benefits) {
          extractedBenefits = richData.compensation.benefits.map((b: any) => b.detail || b.category);
        } else if (result.data.benefits) {
          extractedBenefits = result.data.benefits;
        }
        setEditedBenefits(extractedBenefits);

        if (result.data.sponsorship) {
          setSponsorship(result.data.sponsorship);
        } else if (richData?.right_to_work?.visa_sponsorship_offered !== undefined) {
          setSponsorship(richData.right_to_work.visa_sponsorship_offered ? 'yes' : 'no');
        } else {
          setSponsorship('unknown');
        }

        setIsPasteAreaCollapsed(true);
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
      const updatedData: ParsedJobData & { sponsorship?: string; benefits?: string[] } = {
        ...parsedData,
        jobTitle: editedJobTitle || parsedData.jobTitle,
        company: editedCompany || parsedData.company,
        location: editedLocation || parsedData.location,
        salary: editedSalary,
        experienceLevel: experienceLevel,
        tags: editedTags,
        sponsorship: sponsorship,
        benefits: editedBenefits,
      };
      onParseComplete(updatedData);
      handleClose();
    }
  };

  const handleSaveAndTrack = () => {
    if (parsedData && onSaveAndTrack) {
      const updatedData: ParsedJobData & { sponsorship?: string; benefits?: string[] } = {
        ...parsedData,
        jobTitle: editedJobTitle || parsedData.jobTitle,
        company: editedCompany || parsedData.company,
        location: editedLocation || parsedData.location,
        salary: editedSalary,
        experienceLevel: experienceLevel,
        tags: editedTags,
        sponsorship: sponsorship,
        benefits: editedBenefits,
      };
      onSaveAndTrack(updatedData);
      handleClose();
    }
  };

  const handleClose = () => {
    if (isOpen) {
      onClose();
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      if (!editedTags.includes(newTagInput.trim())) {
        setEditedTags([...editedTags, newTagInput.trim()]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveBenefit = (benefitToRemove: string) => {
    setEditedBenefits(editedBenefits.filter(b => b !== benefitToRemove));
  };

  const handleAddBenefit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newBenefitInput.trim()) {
      e.preventDefault();
      if (!editedBenefits.includes(newBenefitInput.trim())) {
        setEditedBenefits([...editedBenefits, newBenefitInput.trim()]);
      }
      setNewBenefitInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter(t => t !== tagToRemove));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity duration-300"
          />

          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: 'calc(100% + 12px)' }}
            animate={{ x: 0 }}
            exit={{ x: 'calc(100% + 12px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-3 right-3 bottom-3 w-full max-w-[560px] bg-white dark:bg-[#0c0f0a] shadow-2xl flex flex-col z-[9999] rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-150 dark:border-white/5 flex flex-col relative shrink-0">
              <button
                onClick={handleClose}
                className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h2 className="!text-lg font-bold text-gray-900 dark:text-white">Smart Job Analysis</h2>
                <span className="px-2 py-0.5 text-[9px] font-bold text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                  BETA
                </span>
              </div>
              <p className="text-small text-gray-500 dark:text-gray-400">
                Let AI extract key details, skills, and insights from the job description.
              </p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Tab Bar */}
              <div className="flex bg-gray-100 dark:bg-white/5 rounded-full p-1 border border-gray-200/50 dark:border-white/5 shrink-0">
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 py-1.5 text-small font-semibold rounded-full transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'paste'
                      ? 'bg-white dark:bg-white/10 shadow-sm text-lime-600 dark:text-lime-400'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  Paste Text
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-1.5 text-small font-semibold rounded-full transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'upload'
                      ? 'bg-white dark:bg-white/10 shadow-sm text-lime-600 dark:text-lime-400'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload File
                </button>
                <button
                  onClick={() => setActiveTab('url')}
                  className={`flex-1 py-1.5 text-small font-semibold rounded-full transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'url'
                      ? 'bg-white dark:bg-white/10 shadow-sm text-lime-600 dark:text-lime-400'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  Import URL
                </button>
              </div>

              {/* Paste Area Panel */}
              <AnimatePresence initial={false}>
                {!isPasteAreaCollapsed ? (
                  <motion.div
                    initial={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden space-y-4"
                  >
                    {activeTab === 'paste' ? (
                      <div className="space-y-4">
                        <div className="relative border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl p-4 bg-gray-50/50 dark:bg-white/5 transition-colors focus-within:border-lime-500 dark:focus-within:border-lime-400">
                          <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Paste the full job description here..."
                            className="w-full h-44 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none resize-none text-small leading-relaxed"
                            disabled={isParsing}
                          />
                          {!inputText && (
                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-4">
                              <FileText className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-2" />
                              <p className="text-small font-medium text-gray-700 dark:text-gray-300">Paste job description here</p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">or drag and drop a file</p>
                            </div>
                          )}
                          {isParsing && (
                            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl">
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-b from-transparent via-lime-500/10 to-transparent"
                                animate={{ y: ['-100%', '100%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                style={{ height: '40%' }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Social Quick Paste */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleClipboardPaste('LinkedIn')}
                            className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30 rounded-xl text-small font-medium transition-colors"
                          >
                            <span className="font-bold text-[11px] bg-blue-700 text-white rounded px-1 py-0.5">in</span>
                            Paste from LinkedIn
                          </button>
                          <button
                            onClick={() => handleClipboardPaste('Indeed')}
                            className="flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30 rounded-xl text-small font-medium transition-colors"
                          >
                            <span className="font-bold text-[11px] bg-indigo-700 text-white rounded px-1 py-0.5">i</span>
                            Paste from Indeed
                          </button>
                        </div>
                      </div>
                    ) : activeTab === 'upload' ? (
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl py-12 px-6 bg-gray-50/50 dark:bg-white/5 text-center">
                        <Upload className="w-8 h-8 text-lime-500 mb-3" />
                        <p className="text-small font-bold text-gray-900 dark:text-white mb-1">Upload job description file</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-4">PDF, DOCX, or TXT up to 5MB</p>
                        <Button variant="outline" size="tablet" className="rounded-xl border-gray-200 dark:border-white/10 text-small" disabled>
                          Select File
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl py-12 px-6 bg-gray-50/50 dark:bg-white/5 text-center">
                        <Link className="w-8 h-8 text-lime-500 mb-3" />
                        <p className="text-small font-bold text-gray-900 dark:text-white mb-1">Import Job from URL</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-4">Automatically scrap JD details from job listings</p>
                        <input
                          type="url"
                          placeholder="https://linkedin.com/jobs/view/..."
                          className="w-full max-w-xs px-3 py-1.5 text-small bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none mb-3"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          disabled={isParsing}
                        />
                        <Button
                          variant="outline"
                          size="tablet"
                          className="rounded-xl border-gray-200 dark:border-white/10 text-small"
                          disabled={isParsing || !urlInput}
                          onClick={handleParse}
                        >
                          {isParsing ? 'Importing...' : 'Import Link'}
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-lime-500/10 dark:bg-lime-500/5 border border-lime-500/20 rounded-2xl p-4 flex items-center justify-between shrink-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-5 h-5 text-lime-500 shrink-0" />
                      <div>
                        <p className="text-small font-bold text-gray-900 dark:text-white">Job Extracted Successfully</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Original text source cached</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPasteAreaCollapsed(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl text-[10px] font-bold transition-all shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Re-paste
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Experience Level Selector */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-small font-bold text-gray-700 dark:text-gray-300">Experience Level</span>
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Entry Level', 'Mid Level', 'Senior Level', 'Lead / Manager'].map((level) => {
                    const isActive = experienceLevel === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setExperienceLevel(level)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-small font-medium transition-all ${
                          isActive
                            ? 'border-lime-500 dark:border-lime-400 bg-lime-50/50 dark:bg-lime-950/20 text-lime-700 dark:text-lime-400'
                            : 'border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 bg-white dark:bg-transparent text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />}
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Selector */}
              <div className="space-y-2">
                <span className="text-small font-bold text-gray-700 dark:text-gray-300">Location</span>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={editedLocation}
                    onChange={(e) => setEditedLocation(e.target.value)}
                    placeholder="Enter location (e.g. United Kingdom)"
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-transparent border border-gray-200 dark:border-white/5 rounded-xl text-small text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                  />
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Analyze with AI Button */}
              <div className="space-y-3">
                <button
                  onClick={handleParse}
                  disabled={isParsing || (activeTab === 'paste' && !inputText) || (activeTab === 'url' && !urlInput) || activeTab === 'upload'}
                  className="w-full relative py-3 bg-gradient-to-r from-lime-500 to-emerald-600 hover:brightness-105 transition-all text-white font-bold rounded-xl text-small shadow-lg shadow-lime-500/10 flex items-center justify-center gap-2"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : !canAccess('jobParsing') ? (
                    <>
                      <Crown className="w-4 h-4" />
                      Analyze with AI (Pro)
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze with AI
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 mt-2">
                  <Zap className="w-3.5 h-3.5 text-lime-500" />
                  <span>~8 sec</span>
                </div>
              </div>

              {/* Separator / Divider */}
              <div className="relative flex items-center justify-center py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-150 dark:border-white/5"></div></div>
                <div className="relative bg-white dark:bg-[#0c0f0a] px-3">
                  <span className="text-[10px] text-gray-400 dark:text-gray-600 font-bold uppercase tracking-widest">AI Extraction results</span>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-xl text-small">
                  <AlertCircle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              {/* AI will extract / Extracted details Form */}
              {!parsedData ? (
                // What AI will extract grid
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border border-gray-150 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/5 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-lime-100 dark:bg-lime-900/20 text-lime-600 dark:text-lime-400 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-900 dark:text-white">Role & Title</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">Job role and seniority</p>
                      </div>
                    </div>
                    <div className="p-3 border border-gray-150 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/5 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-900 dark:text-white">Salary Insights</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">Salary range (if any)</p>
                      </div>
                    </div>
                    <div className="p-3 border border-gray-150 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/5 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-900 dark:text-white">Skills</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">Technical & soft skills</p>
                      </div>
                    </div>
                    <div className="p-3 border border-gray-150 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/5 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <ScanLine className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-900 dark:text-white">ATS Keywords</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">Important keywords</p>
                      </div>
                    </div>
                    <div className="p-3 border border-gray-150 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/5 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-900 dark:text-white">Responsibilities</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">Key job responsibilities</p>
                      </div>
                    </div>
                    <div className="p-3 border border-gray-150 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/5 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-900 dark:text-white">Education</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">Degrees & qualifications</p>
                      </div>
                    </div>
                    <div className="p-3 border border-gray-150 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/5 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-900 dark:text-white">Experience</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">Years & level required</p>
                      </div>
                    </div>
                    <div className="p-3 border border-gray-150 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/5 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-900 dark:text-white">Company Info</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">Company & location</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Extracted Details Form
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Job Title */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Extracted Role & Title</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={editedJobTitle}
                        onChange={(e) => setEditedJobTitle(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl text-small text-gray-900 dark:text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                        placeholder="Job Title"
                      />
                    </div>
                  </div>

                  {/* Company & Location in a grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Company Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={editedCompany}
                          onChange={(e) => setEditedCompany(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl text-small text-gray-900 dark:text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                          placeholder="Company"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={editedLocation}
                          onChange={(e) => setEditedLocation(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl text-small text-gray-900 dark:text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                          placeholder="Location"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Experience Level & Visa Sponsorship */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Experience Level</label>
                      <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full py-2 px-3 bg-gray-50 dark:bg-[#1A201A] border border-gray-200 dark:border-white/5 rounded-xl text-small text-gray-900 dark:text-white focus:outline-none focus:border-lime-500"
                      >
                        <option value="Entry Level">Entry Level</option>
                        <option value="Mid Level">Mid Level</option>
                        <option value="Senior Level">Senior Level</option>
                        <option value="Lead / Manager">Lead / Manager</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Visa Sponsorship</label>
                      <select
                        value={sponsorship}
                        onChange={(e) => setSponsorship(e.target.value as 'yes' | 'no' | 'unknown')}
                        className="w-full py-2 px-3 bg-gray-50 dark:bg-[#1A201A] border border-gray-200 dark:border-white/5 rounded-xl text-small text-gray-900 dark:text-white focus:outline-none focus:border-lime-500"
                      >
                        <option value="yes">Yes (Sponsored)</option>
                        <option value="no">No</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>

                  {/* Salary Range */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Extracted Salary Insights</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative col-span-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-small text-gray-400">$</span>
                        <input
                          type="number"
                          value={editedSalary?.min || ''}
                          onChange={(e) => setEditedSalary({ ...editedSalary, min: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full pl-6 pr-2 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl text-small text-gray-900 dark:text-white focus:outline-none focus:border-lime-500"
                          placeholder="Min"
                        />
                      </div>
                      <div className="relative col-span-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-small text-gray-400">$</span>
                        <input
                          type="number"
                          value={editedSalary?.max || ''}
                          onChange={(e) => setEditedSalary({ ...editedSalary, max: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full pl-6 pr-2 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl text-small text-gray-900 dark:text-white focus:outline-none focus:border-lime-500"
                          placeholder="Max"
                        />
                      </div>
                      <select
                        value={editedSalary?.period || 'yearly'}
                        onChange={(e) => setEditedSalary({ ...editedSalary, period: e.target.value as 'hourly' | 'monthly' | 'yearly' })}
                        className="col-span-1 py-2 px-2 bg-gray-50 dark:bg-[#1A201A] border border-gray-200 dark:border-white/5 rounded-xl text-small text-gray-900 dark:text-white focus:outline-none"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>

                  {/* Skills/Tags */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Extracted Key Skills</label>
                    <div className="p-3 border border-gray-200 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/5 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {editedTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30 rounded-lg text-[10px] font-medium"
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Add key skill & press Enter..."
                        className="w-full bg-transparent border-t border-gray-250 dark:border-white/5 pt-2 text-[11px] text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Benefits & Perks */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Benefits & Perks</label>
                    <div className="p-3 border border-gray-200 dark:border-white/5 rounded-xl bg-gray-50/50 dark:bg-white/5 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {editedBenefits.length === 0 ? (
                          <span className="text-[10px] text-gray-400">No benefits added yet</span>
                        ) : (
                          editedBenefits.map((benefit, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-[10px] font-medium"
                            >
                              {benefit}
                              <button
                                onClick={() => handleRemoveBenefit(benefit)}
                                className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-200"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <input
                        type="text"
                        value={newBenefitInput}
                        onChange={(e) => setNewBenefitInput(e.target.value)}
                        onKeyDown={handleAddBenefit}
                        placeholder="Add benefit & press Enter..."
                        className="w-full bg-transparent border-t border-gray-250 dark:border-white/5 pt-2 text-[11px] text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* JD Quality & ATS Insights */}
                  {parsedData.extractedJd && (
                    <div className="space-y-3 pt-3 border-t border-gray-150 dark:border-white/5">
                      <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300">JD Quality & ATS Metrics</h4>
                      
                      {/* Score & ATS platform row */}
                      <div className="grid grid-cols-2 gap-3">
                        {parsedData.extractedJd.jd_quality?.jd_quality_score !== undefined && (
                          <div className="p-3 rounded-xl bg-lime-500/5 dark:bg-lime-500/5 border border-lime-500/20 flex flex-col justify-center">
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Quality Score</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-h3 font-extrabold text-lime-600 dark:text-lime-400">
                                {parsedData.extractedJd.jd_quality.jd_quality_score}%
                              </span>
                              <span className="text-[10px] text-gray-500 font-medium capitalize">
                                ({parsedData.extractedJd.jd_quality.jd_quality_grade || 'Fair'})
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {parsedData.extractedJd.application_info?.ats_platform && (
                          <div className="p-3 rounded-xl bg-blue-500/5 dark:bg-blue-500/5 border border-blue-500/20 flex flex-col justify-center">
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">ATS Platform</span>
                            <span className="text-small font-bold text-blue-600 dark:text-blue-400 mt-1 capitalize">
                              {parsedData.extractedJd.application_info.ats_platform}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Red Flags / Warnings */}
                      {parsedData.extractedJd.jd_quality?.jd_red_flags && parsedData.extractedJd.jd_quality.jd_red_flags.length > 0 && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-900/20 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Red Flags ({parsedData.extractedJd.jd_quality.jd_red_flags.length})</span>
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[10px] text-gray-600 dark:text-gray-400">
                            {parsedData.extractedJd.jd_quality.jd_red_flags.map((flagObj: any, idx: number) => (
                              <li key={idx}>
                                <strong className="text-gray-700 dark:text-gray-300">{flagObj.flag}:</strong> {flagObj.detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Positive Signals */}
                      {parsedData.extractedJd.jd_quality?.jd_positive_signals && parsedData.extractedJd.jd_quality.jd_positive_signals.length > 0 && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/20 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Positive Signals ({parsedData.extractedJd.jd_quality.jd_positive_signals.length})</span>
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[10px] text-gray-600 dark:text-gray-400">
                            {parsedData.extractedJd.jd_quality.jd_positive_signals.map((sigObj: any, idx: number) => (
                              <li key={idx}>
                                <strong className="text-gray-700 dark:text-gray-300">{sigObj.signal}:</strong> {sigObj.detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

            </div>

            {/* Bottom Actions Panel */}
            {parsedData && (
              <div className="p-6 border-t border-gray-150 dark:border-white/5 bg-gray-50 dark:bg-[#0c0f0a] flex gap-3 shrink-0">
                <Button
                  onClick={handleSave}
                  className={`${showSaveAndTrack && onSaveAndTrack ? 'flex-1' : 'w-full'} bg-lime-500 hover:bg-lime-600 text-[#141810] font-bold rounded-xl text-small py-5`}
                >
                  Save Job
                </Button>
                {showSaveAndTrack && onSaveAndTrack && (
                  <Button
                    onClick={handleSaveAndTrack}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-small py-5"
                  >
                    Save and Track
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Upgrade Card */}
      {showUpgradePopup && user?.id && (
        <UpgradeCard
          userId={user.id}
          onClose={() => setShowUpgradePopup(false)}
        />
      )}
    </AnimatePresence>
  );
};

export default JobParserSidebar;
