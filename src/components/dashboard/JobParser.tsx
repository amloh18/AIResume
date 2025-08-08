'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Info
} from 'lucide-react';

interface JobParserProps {
  onJobParsed?: (job: any) => void;
  onClose?: () => void;
  isOpen: boolean;
}



const JobParser: React.FC<JobParserProps> = ({ onJobParsed, onClose, isOpen }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedJob, setParsedJob] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleParseJob = async () => {
    if (!url.trim()) {
      setError('Please enter a job URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setParsedJob(null);

    try {
      const requestBody = { url: url.trim() };

      const response = await fetch('/api/parse-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setParsedJob(data.data);
        setSuccess('Job parsed successfully! Opening job form...');
        
        // Call the onJobParsed callback to populate the add job form
        if (onJobParsed) {
          onJobParsed(data.data);
        }
        
        // Close the parser modal after a short delay
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 1500);
      } else {
        // Handle specific error cases
        if (data.message.includes('blocking automated requests') || 
            data.message.includes('Unable to access') ||
            data.message.includes('anti-bot protection')) {
          setError(`The job site is currently blocking automated requests. 

This is a common issue with job sites. You can:
• Try again in a few minutes
• Copy the job details manually and use "Add Job" instead
• Check if the job posting is still active`);
        } else if (data.message.includes('timeout')) {
          setError(`The job page took too long to load. 

This might be because:
• The job site is slow or overloaded
• The URL is not accessible
• The page has complex content

You can:
• Try again in a few minutes
• Check if the URL is correct and accessible`);
        } else if (data.message.includes('not a job posting')) {
          setError(`Unable to extract job information from this URL. 

This might be because:
• The URL is not a job posting page
• The page has a different structure
• The job posting has been removed

You can:
• Verify the URL is a job posting page
• Try a different job URL
• Copy the job details manually and use "Add Job" instead`);
        } else {
          setError(data.message || 'Failed to parse job');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse job');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setParsedJob(null);
    setError(null);
    setSuccess(null);
    if (onClose) {
      onClose();
    }
  };



  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-full flex items-center justify-center">
                  <Link size={20} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Job Parser</h2>
                  <p className="text-white/60 text-sm">Parse any job posting URL</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/60 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* URL Input */}
            <div className="mb-6">
              <label className="block text-white/80 text-sm font-medium mb-2">
                Job Posting URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.indeed.com/viewjob?jk=... or any job posting URL"
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent"
                  disabled={isLoading}
                />
                <motion.button
                  onClick={handleParseJob}
                  disabled={isLoading || !url.trim()}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    'Parse Job'
                  )}
                </motion.button>
              </div>
              <p className="text-white/40 text-xs mt-2 flex items-center gap-1">
                <Info size={12} />
                Works with any job posting URL. Supports Indeed, LinkedIn, Glassdoor, and other job sites.
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AlertCircle size={20} className="text-red-400" />
                  <span className="text-red-400">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {success && (
                <motion.div
                  className="mb-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CheckCircle size={20} className="text-green-400" />
                  <span className="text-green-400">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>


          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobParser; 