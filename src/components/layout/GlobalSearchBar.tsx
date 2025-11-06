'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Briefcase, FileText, Mail, X, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { formatCardTime } from '@/lib/utils/timeUtils';
import JobModal from '@/components/dashboard/JobModal';

interface SearchResult {
  id: string;
  type: 'job' | 'cv' | 'coverLetter';
  title: string;
  company?: string;
  location?: string;
  status?: string;
  journeyId?: string;
  jobId?: string;
  targetCompany?: string;
  isMaster?: boolean;
  updatedAt: string;
}

interface SearchResponse {
  success: boolean;
  data: {
    jobs: SearchResult[];
    cvs: SearchResult[];
    coverLetters: SearchResult[];
  };
}

const GlobalSearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse['data']>({
    jobs: [],
    cvs: [],
    coverLetters: []
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [journeysForJob, setJourneysForJob] = useState<any[]>([]);
  const [isMobileOverlayOpen, setIsMobileOverlayOpen] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useUnifiedAuth();

  // Debounce search
  useEffect(() => {
    if (query.length < 2) {
      setResults({ jobs: [], cvs: [], coverLetters: [] });
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, user?.id]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!user?.id || searchQuery.length < 2) return;

    setIsLoading(true);
    try {
      const response = await authenticatedFetchWithUserId(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`,
        user.id
      );
      const data: SearchResponse = await response.json();
      
      if (data.success) {
        setResults(data.data);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobClick = async (job: SearchResult) => {
    if (!user?.id) return;

    try {
      // Fetch full job data
      const jobResponse = await authenticatedFetchWithUserId(
        `/api/jobs?id=${job.id}`,
        user.id
      );
      const jobData = await jobResponse.json();

      if (jobData.success && jobData.data?.job) {
        // Fetch journeys for this job
        const journeysResponse = await authenticatedFetchWithUserId(
          `/api/application-journey?jobId=${job.id}`,
          user.id
        );
        const journeysData = await journeysResponse.json();

        setSelectedJob(jobData.data.job);
        setJourneysForJob(journeysData.success ? journeysData.data.journeys || [] : []);
        setShowJobModal(true);
        setIsOpen(false);
        setIsMobileOverlayOpen(false);
        setQuery('');
      }
    } catch (error) {
      console.error('Error loading job:', error);
    }
  };

  const handleCVClick = (cv: SearchResult) => {
    if (cv.journeyId) {
      router.push(`/studio?journeyId=${cv.journeyId}&cvId=${cv.id}&type=cv`);
    } else {
      router.push(`/studio?cvId=${cv.id}&type=cv`);
    }
    setIsOpen(false);
    setIsMobileOverlayOpen(false);
    setQuery('');
  };

  const handleCoverLetterClick = (coverLetter: SearchResult) => {
    if (coverLetter.journeyId) {
      router.push(`/studio?journeyId=${coverLetter.journeyId}&coverLetterId=${coverLetter.id}&type=cover_letter`);
    } else {
      router.push(`/studio?coverLetterId=${coverLetter.id}&type=cover_letter`);
    }
    setIsOpen(false);
    setIsMobileOverlayOpen(false);
    setQuery('');
  };

  const totalResults = results.jobs.length + results.cvs.length + results.coverLetters.length;

  const SearchResultsDropdown = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a230f] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[600px] overflow-y-auto"
    >
      {isLoading ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          Searching...
        </div>
      ) : totalResults === 0 ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          No results found
        </div>
      ) : (
        <div className="py-2">
          {/* Jobs Section */}
          {results.jobs.length > 0 && (
            <div className="px-3 py-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Jobs ({results.jobs.length})
              </div>
              {results.jobs.map((job) => (
                <motion.div
                  key={job.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleJobClick(job)}
                  className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors mb-1"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {job.title}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {job.company}
                        {job.location && ` • ${job.location}`}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          job.status === 'applied' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          job.status === 'interview' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          job.status === 'offer' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                          'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                        }`}>
                          {job.status}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatCardTime(job.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* CVs Section */}
          {results.cvs.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-200 dark:border-white/10">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                CVs ({results.cvs.length})
              </div>
              {results.cvs.map((cv) => (
                <motion.div
                  key={cv.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleCVClick(cv)}
                  className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors mb-1"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-lime-100 dark:bg-lime-900/30 rounded-lg">
                      <FileText className="h-4 w-4 text-lime-600 dark:text-lime-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {cv.title}
                        </div>
                        {cv.isMaster && (
                          <span className="text-xs px-2 py-0.5 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400 rounded-full">
                            Master
                          </span>
                        )}
                      </div>
                      {cv.jobId && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                          Job: {cv.jobId}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatCardTime(cv.updatedAt)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Cover Letters Section */}
          {results.coverLetters.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-200 dark:border-white/10">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Cover Letters ({results.coverLetters.length})
              </div>
              {results.coverLetters.map((cl) => (
                <motion.div
                  key={cl.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleCoverLetterClick(cl)}
                  className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors mb-1"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Mail className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {cl.title}
                      </div>
                      {cl.targetCompany && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                          For: {cl.targetCompany}
                        </div>
                      )}
                      {cl.jobId && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                          Job: {cl.jobId}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatCardTime(cl.updatedAt)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );

  return (
    <>
      {/* Desktop Search Bar */}
      <div ref={searchRef} className="relative hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search jobs, CVs, cover letters..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.length >= 2) {
                setIsOpen(true);
              }
            }}
            onFocus={() => {
              if (query.length >= 2) {
                setIsOpen(true);
              }
            }}
            className="w-full max-w-xs pl-10 pr-10 py-2 rounded-lg bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {isOpen && query.length >= 2 && <SearchResultsDropdown />}
        </AnimatePresence>
      </div>

      {/* Mobile Search Icon */}
      <div className="md:hidden relative" ref={searchRef}>
        <button
          onClick={() => setIsMobileOverlayOpen(true)}
          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
        >
          <Search size={18} />
        </button>

        {/* Mobile Overlay */}
        <AnimatePresence>
          {isMobileOverlayOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={() => {
                  setIsMobileOverlayOpen(false);
                  setIsOpen(false);
                  setQuery('');
                }}
              />
              
              {/* Search Overlay */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-0 left-0 right-0 bg-white dark:bg-[#1a230f] border-b border-gray-200 dark:border-white/10 z-50 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search jobs, CVs, cover letters..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (e.target.value.length >= 2) {
                        setIsOpen(true);
                      }
                    }}
                    onFocus={() => {
                      if (query.length >= 2) {
                        setIsOpen(true);
                      }
                    }}
                    autoFocus
                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all"
                  />
                  <button
                    onClick={() => {
                      setIsMobileOverlayOpen(false);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Results in overlay */}
                <AnimatePresence>
                  {isOpen && query.length >= 2 && (
                    <div className="mt-2 max-h-[70vh] overflow-y-auto">
                      <SearchResultsDropdown />
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Job Modal */}
      {showJobModal && selectedJob && (
        <JobModal
          job={selectedJob}
          journeys={journeysForJob}
          onClose={() => {
            setShowJobModal(false);
            setSelectedJob(null);
            setJourneysForJob([]);
          }}
          onRefresh={async () => {
            if (selectedJob && user?.id) {
              const journeysResponse = await authenticatedFetchWithUserId(
                `/api/application-journey?jobId=${selectedJob.id}`,
                user.id
              );
              const journeysData = await journeysResponse.json();
              setJourneysForJob(journeysData.success ? journeysData.data.journeys || [] : []);
            }
          }}
        />
      )}
    </>
  );
};

export default GlobalSearchBar;

