'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Building,
  Calendar,
  DollarSign,
  MapPin,
  Briefcase,
  Info
} from 'lucide-react';

interface JobParserProps {
  onJobParsed?: (job: any) => void;
  onClose?: () => void;
  isOpen: boolean;
}

interface ParsedJob {
  jobid: string;
  title: string;
  company: string;
  description: string;
  sourceUrl: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  sponsorship: boolean;
  createdAt: string;
}

const JobParser: React.FC<JobParserProps> = ({ onJobParsed, onClose, isOpen }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedJob, setParsedJob] = useState<ParsedJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleParseJob = async (demoMode = false) => {
    if (!demoMode && !url.trim()) {
      setError('Please enter a job URL');
      return;
    }

    if (!demoMode && !url.includes('indeed.com')) {
      setError('Only Indeed URLs are supported');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setParsedJob(null);

    try {
      const requestBody = demoMode 
        ? { url: 'https://demo.indeed.com/job', demo: true }
        : { url: url.trim() };

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
        setSuccess(demoMode ? 'Demo job parsed successfully!' : data.message);
        if (onJobParsed) {
          onJobParsed(data.data);
        }
      } else {
        // Handle specific error cases
        if (data.message.includes('blocking automated requests') || 
            data.message.includes('Unable to access')) {
          setError(`Indeed is currently blocking automated requests. 

This is a common issue with job sites. You can:
• Try again in a few minutes
• Copy the job details manually and use "Add Job" instead
• Check if the job posting is still active
• Try the demo mode to see how it works`);
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

  const formatSalary = (salary?: ParsedJob['salary']) => {
    if (!salary) return 'Not specified';
    const { min, max, currency = 'USD', period = 'yearly' } = salary;
    if (min && max) {
      return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}/${period}`;
    } else if (min) {
      return `${currency} ${min.toLocaleString()}/${period}`;
    } else if (max) {
      return `${currency} ${max.toLocaleString()}/${period}`;
    }
    return 'Not specified';
  };

  const truncateDescription = (description: string, maxLength: number = 200) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
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
                  <p className="text-white/60 text-sm">Parse Indeed job postings</p>
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
                Indeed Job URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.indeed.com/viewjob?jk=..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent"
                  disabled={isLoading}
                />
                <motion.button
                  onClick={() => handleParseJob(false)}
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
                <motion.button
                  onClick={() => handleParseJob(true)}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title="Try demo mode to see how job parsing works"
                >
                  Demo
                </motion.button>
              </div>
              <p className="text-white/40 text-xs mt-2 flex items-center gap-1">
                <Info size={12} />
                Works with Indeed URLs only. Note: Some job postings may be blocked by Indeed's anti-bot measures.
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

            {/* Parsed Job Display */}
            <AnimatePresence>
              {parsedJob && (
                <motion.div
                  className="bg-white/5 border border-white/10 rounded-xl p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {parsedJob.title}
                      </h3>
                      <div className="flex items-center gap-4 text-white/60 text-sm">
                        <div className="flex items-center gap-1">
                          <Building size={14} />
                          {parsedJob.company}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(parsedJob.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={parsedJob.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-white/80">
                      <DollarSign size={16} />
                      <span className="text-sm">{formatSalary(parsedJob.salary)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Briefcase size={16} />
                      <span className="text-sm">
                        {parsedJob.sponsorship ? 'Visa Sponsorship Available' : 'No Visa Sponsorship'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-white/80 font-medium mb-2">Description</h4>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {truncateDescription(parsedJob.description)}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      onClick={handleClose}
                      className="flex-1 bg-white/10 text-white py-2 px-4 rounded-lg hover:bg-white/20 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Close
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        if (onJobParsed) {
                          onJobParsed(parsedJob);
                        }
                        handleClose();
                      }}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Add to Tracker
                    </motion.button>
                  </div>
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