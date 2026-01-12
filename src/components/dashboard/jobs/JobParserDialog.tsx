'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, FileText, Loader2, CheckCircle, AlertCircle, ScanLine, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
}

interface JobParserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onParseComplete: (data: ParsedJobData) => void;
  customDescription?: string;
  showSaveAndTrack?: boolean; // New prop to show "Save and Track" option
  onSaveAndTrack?: (data: ParsedJobData) => void; // Callback for "Save and Track"
}

const JobParserDialog: React.FC<JobParserDialogProps> = ({
  isOpen,
  onClose,
  onParseComplete,
  customDescription,
  showSaveAndTrack = false,
  onSaveAndTrack
}) => {
  const { user } = useUnifiedAuth();
  const { membership, loading: membershipLoading, canAccess } = useMembership();
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedJobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  // Editable fields state
  const [editedJobTitle, setEditedJobTitle] = useState('');
  const [editedCompany, setEditedCompany] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedSalary, setEditedSalary] = useState<{ min?: number; max?: number; currency?: string; period?: 'hourly' | 'monthly' | 'yearly' } | null>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when dialog is closed
      setInputText('');
      setParsedData(null);
      setError(null);
      setIsParsing(false);
      setEditedJobTitle('');
      setEditedCompany('');
      setEditedLocation('');
      setEditedSalary(null);
    }
  }, [isOpen]);

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
        jobTitle: editedJobTitle || parsedData.jobTitle,
        company: editedCompany || parsedData.company,
        location: editedLocation || parsedData.location,
        salary: editedSalary || parsedData.salary,
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
        jobTitle: editedJobTitle || parsedData.jobTitle,
        company: editedCompany || parsedData.company,
        location: editedLocation || parsedData.location,
        salary: editedSalary || parsedData.salary,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#141810] border-gray-200 dark:border-lime-500/20 [&>button]:text-gray-500 dark:[&>button]:text-gray-400 dark:[&>button]:hover:text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Sparkles className="w-5 h-5 text-lime-500 dark:text-[#80FF00]" />
            Quick Add Job (Magic Paste)
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {customDescription || 'Paste a job description to automatically extract job details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Section */}
          {!parsedData && (
            <div className="space-y-4">
              {/* Text Input */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                  <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  Job Description Text
                </label>
                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste the full job description here..."
                    rows={8}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1A201A] border-gray-300 dark:border-lime-500/30 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50 resize-none relative z-10"
                    disabled={isParsing}
                  />
                  {/* Scanning Animation Overlay */}
                  {isParsing && (
                    <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none z-20">
                      {/* Scanning line animation */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-lime-500/20 to-transparent"
                        animate={{
                          y: ['-100%', '100%'],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        style={{
                          height: '30%',
                        }}
                      />
                      {/* Shimmer effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{
                          x: ['-100%', '100%'],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        style={{
                          width: '50%',
                        }}
                      />
                      {/* Pulsing border */}
                      <motion.div
                        className="absolute inset-0 rounded-lg border-2 border-lime-500/50"
                        animate={{
                          opacity: [0.3, 0.7, 0.3],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Info Section - How to Copy Description */}
              <div className="p-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  💡 How to copy job description:
                </p>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 font-bold mt-0.5">1.</span>
                    <span>Copy everything from the job board page - we'll do the cleaning for you!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 font-bold mt-0.5">2.</span>
                    <span>We automatically extract: <strong>company name</strong>, <strong>salary</strong>, <strong>location</strong>, and <strong>job description</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 font-bold mt-0.5">3.</span>
                    <span>No need to format or clean up - just paste everything as-is</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 font-bold mt-0.5">4.</span>
                    <span>Our AI will parse and organize all the details automatically</span>
                  </li>
                </ul>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Parse Button */}
              <Button
                onClick={handleParse}
                disabled={isParsing || !inputText}
                className="w-full bg-lime-500 hover:bg-lime-600 text-black"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : !canAccess('jobParsing') ? (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    Parse · PRO
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4 mr-2" />
                    Parse
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Preview Section */}
          {parsedData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  Job details extracted successfully! Review and save.
                </p>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={editedJobTitle}
                    onChange={(e) => setEditedJobTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1A201A] rounded border border-lime-500/30 dark:border-lime-500/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50"
                    placeholder="Enter job title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={editedCompany}
                    onChange={(e) => setEditedCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1A201A] rounded border border-lime-500/30 dark:border-lime-500/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editedLocation}
                    onChange={(e) => setEditedLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1A201A] rounded border border-lime-500/30 dark:border-lime-500/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50"
                    placeholder="Enter location"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Salary
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    <input
                      type="text"
                      value={editedSalary?.min || ''}
                      onChange={(e) => {
                        const min = e.target.value ? parseFloat(e.target.value) : undefined;
                        setEditedSalary(prev => ({ ...prev, min, currency: prev?.currency || 'USD', period: prev?.period || 'yearly' }));
                      }}
                      className="flex-1 min-w-[80px] px-2 py-2 text-sm bg-gray-50 dark:bg-[#1A201A] rounded border border-lime-500/30 dark:border-lime-500/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50"
                      placeholder="Min"
                    />
                    <input
                      type="text"
                      value={editedSalary?.max || ''}
                      onChange={(e) => {
                        const max = e.target.value ? parseFloat(e.target.value) : undefined;
                        setEditedSalary(prev => ({ ...prev, max, currency: prev?.currency || 'USD', period: prev?.period || 'yearly' }));
                      }}
                      className="flex-1 min-w-[80px] px-2 py-2 text-sm bg-gray-50 dark:bg-[#1A201A] rounded border border-lime-500/30 dark:border-lime-500/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50"
                      placeholder="Max"
                    />
                    <select
                      value={editedSalary?.currency || 'USD'}
                      onChange={(e) => setEditedSalary(prev => ({ ...prev, currency: e.target.value as string, period: prev?.period || 'yearly' }))}
                      className="px-2 py-2 text-sm bg-gray-50 dark:bg-[#1A201A] rounded border border-lime-500/30 dark:border-lime-500/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50 min-w-[70px]"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                    </select>
                    <select
                      value={editedSalary?.period || 'yearly'}
                      onChange={(e) => setEditedSalary(prev => ({ ...prev, period: e.target.value as 'hourly' | 'monthly' | 'yearly' }))}
                      className="px-2 py-2 text-sm bg-gray-50 dark:bg-[#1A201A] rounded border border-lime-500/30 dark:border-lime-500/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50 min-w-[60px]"
                    >
                      <option value="hourly">/hr</option>
                      <option value="monthly">/mo</option>
                      <option value="yearly">/yr</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Info Message */}
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Job will be saved as draft. Move it to "Created" stage to start CV journey (requires credit).
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setParsedData(null);
                    setEditedJobTitle('');
                    setEditedCompany('');
                    setEditedLocation('');
                    setEditedSalary(null);
                  }}
                  variant="outline"
                  className={`${showSaveAndTrack && onSaveAndTrack ? 'flex-1' : 'flex-1'} border-gray-300 dark:border-lime-500/30 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#232f1c]`}
                >
                  Parse Again
                </Button>
                <Button
                  onClick={handleSave}
                  className={`${showSaveAndTrack && onSaveAndTrack ? 'flex-1' : 'flex-1'} bg-lime-500 hover:bg-lime-600 dark:bg-[#80FF00] dark:hover:bg-[#80FF00]/80 text-black dark:text-black`}
                >
                  Save Job
                </Button>
                {showSaveAndTrack && onSaveAndTrack && (
                  <Button
                    onClick={handleSaveAndTrack}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                  >
                    Save and Track
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>

      {/* Upgrade Card - shown before parsing for free users to save AI tokens */}
      {showUpgradePopup && user?.id && (
        <UpgradeCard
          userId={user.id}
          onClose={() => {
            setShowUpgradePopup(false);
            // Don't automatically parse - user must click parse again after dismissing
            // This prevents wasting AI tokens if they dismiss without upgrading
          }}
        />
      )}
    </Dialog>
  );
};

export default JobParserDialog;

