'use client';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Briefcase, FileText, CheckCircle, Download, Trash2, Filter, SortAsc, MoreVertical, Search, ArrowRight, Star, Clock, Building2 } from 'lucide-react';
import { JobJourneyProvider, useJobJourney } from '@/contexts/JobJourneyContext';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useOptimizedDataFetching } from '@/lib/hooks/useOptimizedDataFetching';
import { ApplicationJourneySkeleton } from '@/components/ui/OptimizedSkeletons';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';

// Lazy load heavy components
import dynamicImport from 'next/dynamic';


const PageHeader = dynamicImport(() => import('@/components/dashboard/PageHeader'), {
  loading: () => <div className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
});

// OnboardingModal removed - no longer needed

const JourneyStatusBanner = dynamicImport(() => import('@/components/JourneyStatusBanner'), {
  loading: () => <div className="h-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg mb-4" />
});

const JourneyTimelineCard = dynamicImport(() => import('@/components/dashboard/JourneyTimelineCard'), {
  loading: () => <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg mb-4" />
});

const NewJourneyCard = dynamicImport(() => import('@/components/dashboard/NewJourneyCard'), {
  loading: () => <div className="h-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg mb-4" />
});

interface Journey {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'in-progress' | 'completed';
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  atsScore?: number;
  cvId?: string;
  coverLetterId?: string;
}

const ApplicationJourneyPageContent: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { userData, loading: userLoading, error: userError } = useUserData();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    startJourney,
    updateJobInfo,
    updateCurrentStep,
    updateCurrentJobId,
    updateAtsScore,
    updateCVId,
    updateCoverLetterId,
    updateJourneyStatus
  } = useJobJourney();
  const { theme, isDark } = useTheme();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNewJourneyCard, setShowNewJourneyCard] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<'lastUpdated' | 'creationDate' | 'jobTitle'>('lastUpdated');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Cache for API responses
  const [cache, setCache] = useState<Record<string, {
    journeys?: Journey[];
    userProfile?: any;
    lastFetch?: number;
  }>>({});

  // Memoized user ID using unified authentication
  const userId = useMemo(() => {
    return getUserIdForAPI(user);
  }, [user]);

  // Optimized parallel data fetching with better error handling
  const fetchAllData = useCallback(async (userId: string) => {
    const cacheKey = `data_${userId}`;
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 seconds cache

    // Check cache first
    if (cache[cacheKey] && cache[cacheKey].lastFetch && (now - cache[cacheKey].lastFetch) < CACHE_DURATION) {
      const cachedData = cache[cacheKey];
      setJourneys(cachedData.journeys || []);
      setUserProfile(cachedData.userProfile || null);
      setLoading(false);
      return;
    }

    try {
      // Single optimized API call that includes both journeys and user profile
      const response = await fetch(`/api/journeys?userId=${userId}&status=all&includeUserProfile=true`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Process combined data
      if (result.success) {
        const journeysData = result.data.journeys || [];
        setJourneys(journeysData);

        // Update cache with combined data
        setCache(prev => ({
          ...prev,
          [cacheKey]: {
            journeys: journeysData,
            userProfile: result.data.userProfile || null,
            lastFetch: now
          }
        }));

        // Set user profile if available
        if (result.data.userProfile) {
          setUserProfile(result.data.userProfile);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      // Don't show loading state forever on error
      setTimeout(() => setLoading(false), 2000);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => {
    if (userId) {
      fetchAllData(userId);
    } else if (!authLoading) {
      // If no user, stop loading after a short delay
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000); // Reduced from 2000ms to 1000ms
      return () => clearTimeout(timer);
    }
  }, [userId, authLoading, fetchAllData]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSortDropdown) {
        const target = event.target as Element;
        if (!target.closest('[data-sort-dropdown]')) {
          setShowSortDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown]);

  // Refresh journeys data (for after creating/deleting journeys)
  const refreshJourneys = useCallback(async () => {
    if (userId) {
      // Clear cache and fetch fresh data
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[`data_${userId}`];
        return newCache;
      });
      await fetchAllData(userId);
    }
  }, [userId, fetchAllData]);

  const handleResumeJourney = useCallback((journey: Journey) => {
    
    // Map journey status to JourneyStatus type
    const mapJourneyStatus = (status: string): 'onboarding' | 'job-added' | 'cv-created' | 'ats-checked' | 'cover-letter-created' | 'completed' => {
      switch (status) {
        case 'in-progress':
          // Determine the appropriate status based on current step and linked documents
          if (journey.currentStep >= 5) return 'completed';
          if (journey.coverLetterId) return 'cover-letter-created';
          if (journey.atsScore) return 'ats-checked';
          if (journey.cvId) return 'cv-created';
          return 'job-added';
        case 'completed':
          return 'completed';
        default:
          return 'job-added';
      }
    };
    
    // Resume the journey with complete state restoration
    updateCurrentJobId(journey.jobId);
    updateJobInfo(journey.jobTitle, journey.company);
    updateCurrentStep(journey.currentStep);
    updateJourneyStatus(mapJourneyStatus(journey.status));
    
    // Restore linked documents if they exist
    if (journey.cvId) {
      updateCVId(journey.cvId);
    }
    if (journey.coverLetterId) {
      updateCoverLetterId(journey.coverLetterId);
    }
    if (journey.atsScore) {
      updateAtsScore(journey.atsScore);
    }
    
    // Navigate to studio with journey context
    let studioUrl = `/studio?journeyId=${journey.jobId}`;
    
    // Determine the appropriate mode based on journey progress
    let mode = 'cv-onboarding'; // Default for new journeys
    
    if (journey.cvId) {
      // If CV exists, determine mode based on journey status
      if (journey.status === 'in-progress') {
        // Check if we need ATS editing or can proceed to cover letter
        if (journey.atsScore && journey.atsScore >= 80) {
          mode = 'cover-letter-edit'; // Ready for cover letter
        } else {
          mode = 'ats-edit'; // Need to improve ATS score
        }
      } else {
        mode = 'ats-edit'; // Default to ATS editing for existing CVs
      }
    }
    
    // Add document type and ID based on what's available
    if (journey.cvId) {
      studioUrl += `&type=cv&mode=${mode}&cvId=${journey.cvId}`;
    } else if (journey.coverLetterId) {
      studioUrl += `&type=cover_letter&mode=cover-letter-edit&coverLetterId=${journey.coverLetterId}`;
    } else {
      // Default to CV step if no documents are linked
      studioUrl += `&type=cv&mode=${mode}&step=2`;
    }
    
    router.push(studioUrl);
  }, [updateCurrentJobId, updateJobInfo, updateCurrentStep, updateJourneyStatus, updateCVId, updateCoverLetterId, updateAtsScore]);

  // Handle resume parameter from URL
  useEffect(() => {
    const resumeJourneyId = searchParams.get('resume');
    if (resumeJourneyId && journeys.length > 0) {
      const journeyToResume = journeys.find(j => j.id === resumeJourneyId);
      if (journeyToResume) {
        handleResumeJourney(journeyToResume);
        // Clean up URL parameter
        const url = new URL(window.location.href);
        url.searchParams.delete('resume');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [journeys, searchParams, handleResumeJourney]);

  const handleStartNewJourney = () => {
    setShowNewJourneyCard(true);
  };


  const handleJourneyCreated = useCallback(async (journeyData: {
    jobId: string;
    cvId: string;
    journeyName: string;
  }) => {
    // Start the journey with the selected job and CV
    startJourney(journeyData.jobId);
    setShowNewJourneyCard(false);
    
    // Refresh journeys list
    await refreshJourneys();
  }, [startJourney, refreshJourneys]);

  const handleDownloadFiles = (journey: Journey) => {
    // TODO: Implement download functionality
  };

  const handleDeleteJourney = async (journeyId: string) => {
    try {
      setIsDeleting(true);
      const userId = user?.uid;
      if (!userId) {
        console.error('No user ID available');
        return;
      }

      
      // Call the Journeys API to delete the journey (job)
      const response = await fetch(`/api/journeys?journeyId=${journeyId}&userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete journey');
      }

      const result = await response.json();

      // Remove from local state
      setJourneys(prev => prev.filter(journey => journey.id !== journeyId));
      
      // Close confirmation dialog
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting journey:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsDeleting(false);
    }
  };

  // Memoized filtering and sorting for better performance
  const filteredAndSortedJourneys = useMemo(() => {
    if (journeys.length === 0) return [];

    const filtered = journeys.filter(journey => {
      // Filter by search query (optimized search)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const jobTitle = journey.jobTitle.toLowerCase();
        const company = journey.company.toLowerCase();

        // Use indexOf for better performance than includes
        return jobTitle.indexOf(query) !== -1 || company.indexOf(query) !== -1;
      }

      return true;
    });

    // Sort the filtered results
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'creationDate':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'jobTitle':
          return a.jobTitle.localeCompare(b.jobTitle);
        case 'lastUpdated':
        default:
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      }
    });
  }, [journeys, searchQuery, sortBy]);



  return (
    <div className="space-y-6">
      {/* Page Header - Always show immediately */}
      <PageHeader
        title="Application Journeys"
        description="Manage your job application journeys and track progress"
        user={{
          name: getUserDisplayName(userData),
          email: getUserEmail(userData),
          username: userData?.username || userData?.email?.split('@')[0] || 'user',
          profilePhoto: getUserAvatar(userData),
          designation: 'Software Developer',
          subscription: userData?.subscription
        }}
        showSettings={true}
      />

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search journeys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
              aria-label="Search journeys"
              role="searchbox"
            />
          </div>

          {/* Sort By Button */}
          <div className="relative" data-sort-dropdown>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all duration-200 bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-700 dark:text-gray-300 hover:bg-[#141810] dark:hover:bg-[#141810]"
            >
              <SortAsc className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sortBy === 'lastUpdated' ? 'Last Updated' : 
                 sortBy === 'creationDate' ? 'Creation Date' : 
                 sortBy === 'jobTitle' ? 'Job Title' : 'Sort By'}
              </span>
            </button>
            
            {/* Sort Dropdown */}
            <AnimatePresence>
              {showSortDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-1 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 min-w-[160px]"
                >
                  {[
                    { value: 'lastUpdated', label: 'Last Updated' },
                    { value: 'creationDate', label: 'Creation Date' },
                    { value: 'jobTitle', label: 'Job Title' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value as any);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        sortBy === option.value
                          ? 'bg-lime-500/10 text-lime-700 dark:text-lime-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Buttons - Only show when there are journeys */}
        {journeys.length > 0 && (
          <div className="flex gap-3">
            <motion.button
              onClick={handleStartNewJourney}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-black font-medium rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-4 w-4" />
              Start New Journey
            </motion.button>
          </div>
        )}
      </div>



      {/* Journeys Grid */}
      <div className="space-y-4">
        {loading ? (
          // Show skeleton loaders while data is loading
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                  <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedJourneys.length === 0 ? (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {journeys.length === 0 ? (
              // Empty state for new users
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-lime-100 dark:bg-lime-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ArrowRight className="h-10 w-10 text-lime-600 dark:text-lime-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Start Your First Journey
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Create your first CV journey to track your job application progress
                </p>
                <motion.button
                  onClick={handleStartNewJourney}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-black font-medium rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="h-5 w-5" />
                  Start New Journey
                </motion.button>
              </div>
            ) : (
              // No results for filters
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No journeys found
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Try adjusting your search criteria
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                  }}
                  className="text-lime-600 dark:text-lime-400 hover:text-lime-700 dark:hover:text-lime-300 font-medium"
                >
                  Clear search
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {/* New Journey Card */}
            {showNewJourneyCard && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <NewJourneyCard
                  onJourneyCreated={handleJourneyCreated}
                  onCancel={() => setShowNewJourneyCard(false)}
                />
              </motion.div>
            )}
            
            {/* Existing Journeys */}
            {filteredAndSortedJourneys.map((journey) => (
              <JourneyTimelineCard
                key={journey.id}
                journey={journey}
                onResume={handleResumeJourney}
                onDownload={handleDownloadFiles}
                onDelete={handleDeleteJourney}
                onShowDeleteConfirm={setShowDeleteConfirm}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals - OnboardingModal removed */}
      
      

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Delete Journey?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  You are about to permanently delete this journey. This action cannot be undone.
                </p>
                
                {/* Journey Details */}
                {(() => {
                  const journey = journeys.find(j => j.id === showDeleteConfirm);
                  return journey ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {journey.jobTitle}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {journey.company}
                      </p>
                    </div>
                  ) : null;
                })()}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteJourney(showDeleteConfirm);
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Journey'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ApplicationJourneyPage: React.FC = () => {
  return (
    <JobJourneyProvider>
      <ApplicationJourneyPageContent />
    </JobJourneyProvider>
  );
};

export default ApplicationJourneyPage;
