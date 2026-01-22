'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Briefcase, FileText, Mail, X, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { formatCardTime } from '@/lib/utils/timeUtils';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
// TODO: CVPreviewModal was deleted with ai-career-report cleanup - using CVPreviewContent as replacement
// import CVPreviewModal from '@/components/ai-career-report/CVPreviewModal';
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';
import CoverLetterPreviewModal from '@/components/notifications/CoverLetterPreviewModal';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

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
  const [showCVModal, setShowCVModal] = useState(false);
  const [selectedCVData, setSelectedCVData] = useState<UnifiedCVDataStructure | null>(null);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [selectedCoverLetterData, setSelectedCoverLetterData] = useState<any>(null);
  const [coverLetterCVData, setCoverLetterCVData] = useState<any>(null);
  const [coverLetterJobData, setCoverLetterJobData] = useState<any>(null);

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
        setIsMobileOverlayOpen(false);
      }
    };

    if (isOpen || isMobileOverlayOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMobileOverlayOpen]);

  const performSearch = async (searchQuery: string) => {
    if (!user?.id || searchQuery.length < 2) {
      setResults({ jobs: [], cvs: [], coverLetters: [] });
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authenticatedFetchWithUserId(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`,
        user.id
      );

      if (!response.ok) {
        console.error('Search API error:', response.status, response.statusText);
        setResults({ jobs: [], cvs: [], coverLetters: [] });
        setIsOpen(false);
        return;
      }

      const data: SearchResponse = await response.json();

      if (data.success && data.data) {
        setResults(data.data);
        const totalResults = data.data.jobs.length + data.data.cvs.length + data.data.coverLetters.length;
        console.log('Search results:', { query: searchQuery, totalResults, jobs: data.data.jobs.length, cvs: data.data.cvs.length, coverLetters: data.data.coverLetters.length });
        // Always show dropdown if query is long enough, even if no results
        if (searchQuery.length >= 2) {
          setIsOpen(true);
        }
      } else {
        console.error('Search response error:', data);
        setResults({ jobs: [], cvs: [], coverLetters: [] });
        // Still show dropdown to display "No results found"
        if (searchQuery.length >= 2) {
          setIsOpen(true);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults({ jobs: [], cvs: [], coverLetters: [] });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobClick = async (job: SearchResult) => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    try {
      console.log('Loading job:', job.id);

      // Fetch full job data - try both API endpoints
      let jobResponse;
      let jobData;

      // First try the route with ID in path
      try {
        jobResponse = await authenticatedFetchWithUserId(
          `/api/jobs/${job.id}`,
          user.id
        );

        if (!jobResponse.ok) {
          // Fallback to query parameter endpoint
          jobResponse = await authenticatedFetchWithUserId(
            `/api/jobs?id=${job.id}`,
            user.id
          );
        }

        if (!jobResponse.ok) {
          console.error('Job API error:', jobResponse.status, jobResponse.statusText);
          return;
        }

        jobData = await jobResponse.json();
        console.log('Job data received:', jobData);
      } catch (fetchError) {
        console.error('Error fetching job:', fetchError);
        return;
      }

      if (jobData.success && (jobData.data?.job || jobData.job)) {
        const fetchedJob = jobData.data?.job || jobData.job;

        // Fetch journeys for this job
        try {
          const journeysResponse = await authenticatedFetchWithUserId(
            `/api/application-journey?jobId=${job.id}`,
            user.id
          );
          const journeysData = await journeysResponse.json();

          setSelectedJob(fetchedJob);
          setJourneysForJob(journeysData.success && journeysData.data?.journeys ? journeysData.data.journeys : []);
          setShowJobModal(true);
          setIsOpen(false);
          setIsMobileOverlayOpen(false);
          setQuery('');
        } catch (journeyError) {
          console.error('Error fetching journeys:', journeyError);
          // Still show the job modal even if journeys fail
          setSelectedJob(fetchedJob);
          setJourneysForJob([]);
          setShowJobModal(true);
          setIsOpen(false);
          setIsMobileOverlayOpen(false);
          setQuery('');
        }
      } else {
        console.error('Invalid job data structure:', jobData);
      }
    } catch (error) {
      console.error('Error loading job:', error);
    }
  };

  const handleCVClick = async (cv: SearchResult) => {
    if (!user?.id) return;

    try {
      // Fetch CV data
      const cvResponse = await authenticatedFetchWithUserId(
        `/api/cvs/${cv.id}?userId=${user.id}`,
        user.id
      );

      if (!cvResponse.ok) {
        console.error('CV API error:', cvResponse.status, cvResponse.statusText);
        return;
      }

      const cvData = await cvResponse.json();

      if (cvData.success && cvData.data?.cv) {
        // Extract cvData from the response - handle different response structures
        const cv = cvData.data.cv;
        const unifiedCVData = cv.cvData || cv;

        // Ensure it's in the UnifiedCVDataStructure format
        if (unifiedCVData && (unifiedCVData.basics || unifiedCVData.name)) {
          setSelectedCVData(unifiedCVData as UnifiedCVDataStructure);
          setShowCVModal(true);
          setIsOpen(false);
          setIsMobileOverlayOpen(false);
          setQuery('');
        } else {
          console.error('Invalid CV data structure:', unifiedCVData);
        }
      }
    } catch (error) {
      console.error('Error loading CV:', error);
    }
  };

  const handleCoverLetterClick = async (coverLetter: SearchResult) => {
    if (!user?.id) return;

    try {
      // Fetch Cover Letter data
      const clResponse = await authenticatedFetchWithUserId(
        `/api/cover-letters/${coverLetter.id}?userId=${user.id}`,
        user.id
      );

      if (!clResponse.ok) {
        console.error('Cover Letter API error:', clResponse.status, clResponse.statusText);
        return;
      }

      const clData = await clResponse.json();

      if (clData.success && clData.coverLetter) {
        const coverLetterData = {
          title: clData.coverLetter.title || 'Untitled Cover Letter',
          content: clData.coverLetter.content || '',
          metadata: clData.coverLetter.metadata || {}
        };

        // Try to fetch CV data if journeyId or cvId is available
        let cvData = null;
        let jobData = null;

        if (coverLetter.journeyId || clData.coverLetter.journeyId) {
          try {
            const journeyId = coverLetter.journeyId || clData.coverLetter.journeyId;
            const journeyResponse = await authenticatedFetchWithUserId(
              `/api/application-journey?journeyId=${journeyId}`,
              user.id
            );
            if (journeyResponse.ok) {
              const journeyData = await journeyResponse.json();
              if (journeyData.success && journeyData.data?.journey) {
                const journey = journeyData.data.journey;

                // Fetch CV if cvId exists
                if (journey.cvId) {
                  const cvRes = await authenticatedFetchWithUserId(
                    `/api/cvs/${journey.cvId}?userId=${user.id}`,
                    user.id
                  );
                  if (cvRes.ok) {
                    const cvResult = await cvRes.json();
                    if (cvResult.success && cvResult.data?.cv) {
                      cvData = cvResult.data.cv.cvData || cvResult.data.cv;
                    }
                  }
                }

                // Fetch Job if jobId exists
                if (journey.jobId) {
                  const jobRes = await authenticatedFetchWithUserId(
                    `/api/jobs?id=${journey.jobId}`,
                    user.id
                  );
                  if (jobRes.ok) {
                    const jobResult = await jobRes.json();
                    if (jobResult.success && jobResult.data?.job) {
                      jobData = jobResult.data.job;
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error fetching journey/CV/Job data for cover letter:', err);
            // Continue without CV/Job data - preview will use defaults
          }
        }

        setCoverLetterCVData(cvData);
        setCoverLetterJobData(jobData);
        setSelectedCoverLetterData(coverLetterData);
        setShowCoverLetterModal(true);
        setIsOpen(false);
        setIsMobileOverlayOpen(false);
        setQuery('');
      }
    } catch (error) {
      console.error('Error loading Cover Letter:', error);
    }
  };

  const totalResults = results.jobs.length + results.cvs.length + results.coverLetters.length;

  const SearchResultsDropdown = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 mt-2 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] max-h-[600px] overflow-y-auto w-[300px] tablet:w-[350px] desktop:w-[400px] desktop:w-[450px]"
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
        <div className="py-1">
          {/* Jobs Section */}
          {results.jobs.length > 0 && (
            <div className="px-2 py-1">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 px-2">
                Jobs ({results.jobs.length})
              </div>
              {results.jobs.map((job) => (
                <motion.div
                  key={job.id}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  onClick={() => handleJobClick(job)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors group"
                >
                  <div className="flex-shrink-0">
                    <Briefcase className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-400 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                      {job.title}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                      {job.company}
                      {job.location && ` • ${job.location}`}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${job.status === 'applied' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        job.status === 'interview' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          job.status === 'offer' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                      }`}>
                      {job.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* CVs Section */}
          {results.cvs.length > 0 && (
            <div className="px-2 py-1 border-t border-gray-200/50 dark:border-white/10">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 px-2">
                CVs ({results.cvs.length})
              </div>
              {results.cvs.map((cv) => (
                <motion.div
                  key={cv.id}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  onClick={() => handleCVClick(cv)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors group"
                >
                  <div className="flex-shrink-0">
                    <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-lime-400 dark:group-hover:text-lime-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                        {cv.title}
                      </div>
                      {cv.isMaster && (
                        <span className="text-xs px-1.5 py-0.5 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400 rounded-full flex-shrink-0">
                          Master
                        </span>
                      )}
                    </div>
                    {cv.jobId && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                        Job: {cv.jobId}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Cover Letters Section */}
          {results.coverLetters.length > 0 && (
            <div className="px-2 py-1 border-t border-gray-200/50 dark:border-white/10">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 px-2">
                Cover Letters ({results.coverLetters.length})
              </div>
              {results.coverLetters.map((cl) => (
                <motion.div
                  key={cl.id}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  onClick={() => handleCoverLetterClick(cl)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors group"
                >
                  <div className="flex-shrink-0">
                    <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-purple-400 dark:group-hover:text-purple-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                      {cl.title}
                    </div>
                    {cl.targetCompany && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                        For: {cl.targetCompany}
                      </div>
                    )}
                    {cl.jobId && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                        Job: {cl.jobId}
                      </div>
                    )}
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
      {/* Desktop/Tablet Search Bar */}
      <div ref={searchRef} className="relative hidden tablet:block shrink min-w-[220px] max-w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 z-10" />
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
            onKeyDown={(e) => {
              // Prevent form submission on Enter key
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            className="w-[clamp(220px,28vw,450px)] max-w-full pl-10 pr-10 py-2 rounded-2xl bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all text-sm"
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
      <div className="tablet:hidden relative" ref={searchRef}>
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
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
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
                    onKeyDown={(e) => {
                      // Prevent form submission on Enter key
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    autoFocus
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all"
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

      {/* Job Sidebar */}
      {showJobModal && selectedJob && (
        <JobSidebar
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

      {/* CV Preview Modal */}
      {showCVModal && selectedCVData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => {
          setShowCVModal(false);
          setSelectedCVData(null);
        }}>
          <div className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">CV Preview</h2>
              <button
                onClick={() => {
                  setShowCVModal(false);
                  setSelectedCVData(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <CVPreviewContent cvData={selectedCVData} />
            </div>
          </div>
        </div>
      )}

      {/* Cover Letter Preview Modal */}
      {showCoverLetterModal && selectedCoverLetterData && (
        <CoverLetterPreviewModal
          isOpen={showCoverLetterModal}
          onClose={() => {
            setShowCoverLetterModal(false);
            setSelectedCoverLetterData(null);
            setCoverLetterCVData(null);
            setCoverLetterJobData(null);
          }}
          coverLetterData={selectedCoverLetterData}
          cvData={coverLetterCVData}
          jobData={coverLetterJobData}
        />
      )}
    </>
  );
};

export default GlobalSearchBar;

