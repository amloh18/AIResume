'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useFirebaseAuth } from '@/lib/hooks/useFirebaseAuth';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Briefcase, FileText, CheckCircle, Download, Trash2, Filter, SortAsc, MoreVertical, Search, ArrowRight, Star, Clock, Building2 } from 'lucide-react';
import { JobJourneyProvider, useJobJourney } from '@/contexts/JobJourneyContext';
import { useTheme } from '@/lib/contexts/ThemeContext';

// Lazy load heavy components
import dynamic from 'next/dynamic';

const PageHeader = dynamic(() => import('@/components/dashboard/PageHeader'), {
  loading: () => <div className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
});

const OnboardingModal = dynamic(() => import('@/components/modals/OnboardingModal'), {
  ssr: false
});

const JourneyStatusBanner = dynamic(() => import('@/components/JourneyStatusBanner'), {
  loading: () => <div className="h-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg mb-4" />
});

const JourneyTimelineCard = dynamic(() => import('@/components/dashboard/JourneyTimelineCard'), {
  loading: () => <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg mb-4" />
});

const NewJourneyCard = dynamic(() => import('@/components/dashboard/NewJourneyCard'), {
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

const CVJourneyPageContent: React.FC = () => {
  const { data: session } = useSession();
  const { user, loading: authLoading } = useFirebaseAuth();
  const searchParams = useSearchParams();
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Cache for API responses
  const [cache, setCache] = useState<{
    journeys?: Journey[];
    userProfile?: any;
    lastFetch?: number;
  }>({});

  // Memoized user ID
  const userId = useMemo(() => {
    return session?.user?.id || user?.uid;
  }, [session?.user?.id, user?.uid]);

  // Optimized parallel data fetching
  const fetchAllData = useCallback(async (userId: string) => {
    const cacheKey = `data_${userId}`;
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 seconds cache

    // Check cache first
    if (cache[cacheKey] && cache[cacheKey].lastFetch && (now - cache[cacheKey].lastFetch) < CACHE_DURATION) {
      setJourneys(cache[cacheKey].journeys || []);
      setUserProfile(cache[cacheKey].userProfile || null);
      setLoading(false);
      return;
    }

    try {
      // Parallel API calls for better performance
      const [journeysResponse, userResponse] = await Promise.all([
        fetch(`/api/journeys?userId=${userId}&status=all`),
        fetch('/api/user')
      ]);

      const [journeysResult, userResult] = await Promise.all([
        journeysResponse.json(),
        userResponse.json()
      ]);

      // Process journeys data
      if (journeysResult.success) {
        const journeysData = journeysResult.data.journeys || [];
        setJourneys(journeysData);
        
        // Update cache
        setCache(prev => ({
          ...prev,
          [cacheKey]: {
            journeys: journeysData,
            userProfile: userResult.success ? userResult.user : null,
            lastFetch: now
          }
        }));
      }

      // Process user profile data
      if (userResult.success && userResult.user) {
        setUserProfile(userResult.user);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
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
    console.log('🔍 CV Journey Page - Resuming journey:', journey);
    
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
    
    console.log('✅ CV Journey Page - Journey resumed with complete state');
  }, [updateCurrentJobId, updateJobInfo, updateCurrentStep, updateJourneyStatus, updateCVId, updateCoverLetterId, updateAtsScore]);

  // Handle resume parameter from URL
  useEffect(() => {
    const resumeJourneyId = searchParams.get('resume');
    if (resumeJourneyId && journeys.length > 0) {
      const journeyToResume = journeys.find(j => j.id === resumeJourneyId);
      if (journeyToResume) {
        console.log('🔍 CV Journey Page - Auto-resuming journey from URL:', journeyToResume);
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
    console.log('Downloading files for journey:', journey.id);
  };

  const handleDeleteJourney = async (journeyId: string) => {
    try {
      setIsDeleting(true);
      const userId = user?.uid;
      if (!userId) {
        console.error('No user ID available');
        return;
      }

      console.log('🔍 CV Journey Page - Deleting journey:', journeyId);
      
      // Call the Journeys API to delete the journey (job)
      const response = await fetch(`/api/journeys?journeyId=${journeyId}&userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete journey');
      }

      const result = await response.json();
      console.log('🔍 CV Journey Page - Journey deleted successfully:', result);

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
    return journeys
      .filter(journey => {
        // Filter by status
        if (filterStatus !== 'all' && journey.status !== filterStatus) {
          return false;
        }
        
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            journey.jobTitle.toLowerCase().includes(query) ||
            journey.company.toLowerCase().includes(query)
          );
        }
        
        return true;
      })
      .sort((a, b) => {
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
  }, [journeys, filterStatus, searchQuery, sortBy]);



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-600 dark:text-gray-300 mb-2">Loading journeys...</div>
            {!user?.uid && !authLoading && (
              <div className="text-sm text-red-500 dark:text-red-400">
                No user session found. Please log in again.
              </div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Debug: User status: {user ? 'Available' : 'Not available'}
            </div>
          <button
            onClick={() => {
              console.log('Manual refresh clicked');
              setLoading(true);
              refreshJourneys();
            }}
            className="mt-4 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="CV Journeys"
        description="Manage your job application journeys and track progress"
        user={{
          name: userProfile?.firstName + ' ' + userProfile?.lastName || session?.user?.name || user?.displayName || 'User',
          email: userProfile?.email || session?.user?.email || user?.email || 'user@example.com',
          username: userProfile?.username || session?.user?.username || user?.email?.split('@')[0],
          profilePhoto: userProfile?.avatar || session?.user?.image || session?.user?.profilePhoto || user?.photoURL,
          designation: userProfile?.designation || session?.user?.designation || 'Software Developer'
        }}
        showSettings={true}
      />

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search journeys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-lime-50 dark:bg-lime-900/20 border-lime-200 dark:border-lime-800 text-lime-700 dark:text-lime-300'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <motion.button
            onClick={() => startJourney(currentJobId || '')}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Briefcase className="h-4 w-4" />
            Resume Journey
          </motion.button>
          
          <motion.button
            onClick={handleStartNewJourney}
            className="flex items-center gap-2 px-6 py-2 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors shadow-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="h-4 w-4" />
            Start New Journey
          </motion.button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Sort By */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                >
                  <option value="lastUpdated">Last Updated</option>
                  <option value="creationDate">Creation Date</option>
                  <option value="jobTitle">Job Title</option>
                </select>
              </div>

              {/* Filter by Status */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                >
                  <option value="all">All Journeys</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journeys Grid */}
      <div className="space-y-4">
        {filteredAndSortedJourneys.length === 0 ? (
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors"
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
                  Try adjusting your search or filter criteria
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setShowFilters(false);
                  }}
                  className="text-lime-600 dark:text-lime-400 hover:text-lime-700 dark:hover:text-lime-300 font-medium"
                >
                  Clear filters
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

      {/* Modals */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
      
      

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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

const CVJourneyPage: React.FC = () => {
  return (
    <JobJourneyProvider>
      <CVJourneyPageContent />
    </JobJourneyProvider>
  );
};

export default CVJourneyPage;
