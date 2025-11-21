'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, FileText, Loader2, CheckCircle, AlertCircle, ScanLine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

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
  onParseComplete: (data: ParsedJobData, status: 'draft' | 'created') => void;
}

const JobParserDialog: React.FC<JobParserDialogProps> = ({
  isOpen,
  onClose,
  onParseComplete
}) => {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedJobData | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'draft' | 'created'>('draft');
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when dialog is closed
      setInputText('');
      setParsedData(null);
      setError(null);
      setSelectedStatus('draft');
      setIsParsing(false);
    }
  }, [isOpen]);

  const handleParse = async () => {
    if (!inputText) {
      setError('Please enter job description text');
      return;
    }

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
        throw new Error(errorData.error || 'Failed to parse job description');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setParsedData(result.data);
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
      onParseComplete(parsedData, selectedStatus);
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
            Paste a job description to automatically extract job details
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

              {/* Preview Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Job Title
                  </label>
                  <div className="p-2 bg-gray-50 dark:bg-[#1A201A] rounded border border-gray-200 dark:border-lime-500/20 text-gray-900 dark:text-white">
                    {parsedData.jobTitle || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Company
                  </label>
                  <div className="p-2 bg-gray-50 dark:bg-[#1A201A] rounded border border-gray-200 dark:border-lime-500/20 text-gray-900 dark:text-white">
                    {parsedData.company || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Location
                  </label>
                  <div className="p-2 bg-gray-50 dark:bg-[#1A201A] rounded border border-gray-200 dark:border-lime-500/20 text-gray-900 dark:text-white">
                    {parsedData.location || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Salary
                  </label>
                  <div className="p-2 bg-gray-50 dark:bg-[#1A201A] rounded border border-gray-200 dark:border-lime-500/20 text-gray-900 dark:text-white">
                    {parsedData.salary?.min && parsedData.salary?.max
                      ? `${parsedData.salary.currency || 'USD'} ${parsedData.salary.min}-${parsedData.salary.max} ${parsedData.salary.period || 'yearly'}`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Save as:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedStatus('draft')}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      selectedStatus === 'draft'
                        ? 'bg-gray-200 dark:bg-[#2a3a1f] border-gray-400 dark:border-lime-500/40 text-gray-900 dark:text-white'
                        : 'bg-white dark:bg-[#1A201A] border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#232f1c]'
                    }`}
                  >
                    <div className="text-sm font-medium">Draft</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      No CV journey (saved for later)
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedStatus('created')}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      selectedStatus === 'created'
                        ? 'bg-lime-100 dark:bg-lime-900/30 border-lime-400 dark:border-[#80FF00]/50 text-gray-900 dark:text-white'
                        : 'bg-white dark:bg-[#1A201A] border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#232f1c]'
                    }`}
                  >
                    <div className="text-sm font-medium">Create</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      With CV journey (ready to tailor)
                    </div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setParsedData(null)}
                  variant="outline"
                  className="flex-1 border-gray-300 dark:border-lime-500/30 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#232f1c]"
                >
                  Parse Again
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-lime-500 hover:bg-lime-600 dark:bg-[#80FF00] dark:hover:bg-[#80FF00]/80 text-black dark:text-black"
                >
                  Save Job
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobParserDialog;

