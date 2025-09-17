'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import JourneyTimelineCard from './JourneyTimelineCard';
import NewJourneyCard from './NewJourneyCard';
import { 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus
} from 'lucide-react';

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

interface AnalyticsJourneyWidgetProps {
  onResumeJourney: (journey: Journey) => void;
  onDeleteJourney: (journeyId: string) => void;
  onViewJourney: (journey: Journey) => void;
}

const AnalyticsJourneyWidget: React.FC<AnalyticsJourneyWidgetProps> = ({
  onResumeJourney,
  onDeleteJourney,
  onViewJourney
}) => {
  const { data: session } = useSession();
  const { state } = useJobJourney();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNewJourneyCard, setShowNewJourneyCard] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchJourneys();
    }
  }, [session?.user?.id]);

  const fetchJourneys = async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) {
        console.error('No user ID available');
        return;
      }
      
      console.log('🔍 AnalyticsJourneyWidget - Fetching journeys for user:', userId);
      const response = await fetch(`/api/cv-journey?userId=${userId}&status=in-progress`);
      console.log('🔍 AnalyticsJourneyWidget - Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch journeys');
      }
      
      const result = await response.json();
      console.log('🔍 AnalyticsJourneyWidget - API result:', result);
      
      if (result.success) {
        console.log('🔍 AnalyticsJourneyWidget - Journeys fetched:', result.data.journeys);
        console.log('🔍 AnalyticsJourneyWidget - Number of journeys:', result.data.journeys?.length || 0);
        setJourneys(result.data.journeys || []);
      } else {
        console.error('Error fetching journeys:', result.message);
        setJourneys([]);
      }
    } catch (error) {
      console.error('Error fetching journeys:', error);
      setJourneys([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Get live progress data for a journey
  const getLiveProgress = (journey: Journey) => {
    const isActiveJourney = state.isJourneyActive && state.currentJobId === journey.jobId;
    return isActiveJourney ? {
      currentStep: state.currentStep,
      totalSteps: state.steps.length,
      atsScore: state.atsScore,
      cvId: state.cvId,
      coverLetterId: state.coverLetterId,
      status: state.journeyStatus === 'completed' ? 'completed' : 'in-progress'
    } : {
      currentStep: journey.currentStep,
      totalSteps: journey.totalSteps,
      atsScore: journey.atsScore,
      cvId: journey.cvId,
      coverLetterId: journey.coverLetterId,
      status: journey.status
    };
  };

  const incompleteJourneys = journeys.filter(journey => journey.status === 'in-progress');
  const journeysPerPage = 3; // Show maximum 3 journeys per page
  const totalPages = Math.ceil(incompleteJourneys.length / journeysPerPage);

  const handleDeleteJourney = async (journeyId: string) => {
    try {
      setIsDeleting(true);
      const userId = session?.user?.id;
      if (!userId) {
        console.error('No user ID available');
        return;
      }

      console.log('🔍 AnalyticsJourneyWidget - Deleting journey:', journeyId);
      
      // Call the API to delete the journey (job) from database
      const response = await fetch(`/api/cv-journey`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId, userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete journey');
      }

      const result = await response.json();
      console.log('🔍 AnalyticsJourneyWidget - Journey deleted successfully:', result);

      // Remove from local state
      setJourneys(prev => prev.filter(journey => journey.id !== journeyId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting journey:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsDeleting(false);
    }
  };

  const handleJourneyCreated = async (journeyData: {
    jobId: string;
    cvId: string;
    journeyName: string;
  }) => {
    console.log('🎉 Journey created:', journeyData);
    setShowNewJourneyCard(false);
    await fetchJourneys(); // Refresh the journeys list
  };

  const getCurrentPageJourneys = () => {
    const startIndex = currentPage * journeysPerPage;
    return incompleteJourneys.slice(startIndex, startIndex + journeysPerPage);
  };

  const nextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const prevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (totalPages <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [totalPages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (totalPages <= 1) return;
      
      if (event.key === 'ArrowLeft') {
        prevPage();
      } else if (event.key === 'ArrowRight') {
        nextPage();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [totalPages]);

  if (loading) {
    return (
      <div className="glass-widget-premium glass-shimmer rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">CV Journeys</h2>
            <p className="text-gray-600 dark:text-white/60 text-sm">Loading your career progress...</p>
          </div>
        </div>
        
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading CV Journeys</h3>
          <p className="text-gray-600 dark:text-white/60 text-sm">
            Fetching your career application progress...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-widget-premium glass-shimmer rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">CV Journeys</h2>
          <p className="text-gray-600 dark:text-white/60 text-sm">
            {incompleteJourneys.length} incomplete journey{incompleteJourneys.length !== 1 ? 's' : ''}
          </p>
        </div>
        {incompleteJourneys.length > 0 && (
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => {
                console.log('🔍 AnalyticsJourneyWidget - Start New button clicked');
                setShowNewJourneyCard(true);
                console.log('🔍 AnalyticsJourneyWidget - showNewJourneyCard set to true');
              }}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-3 w-3" />
              Start New
            </motion.button>
            <motion.button
              onClick={() => window.location.href = '/dashboard/cv-journey'}
              className="px-3 py-1.5 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors text-sm flex items-center gap-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye className="h-3 w-3" />
              View All
            </motion.button>
          </div>
        )}
      </div>

      {incompleteJourneys.length === 0 ? (
        <div className="space-y-4">
          {/* Single Skeleton Card */}
          <motion.div
            className="glass-card-premium rounded-lg p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Header Skeleton */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-32 animate-pulse"></div>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-24 animate-pulse"></div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-16 h-6 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse"></div>
                <div className="w-16 h-6 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                <div className="w-6 h-6 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Timeline Skeleton */}
            <div className="relative mb-3">
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-white/10"></div>
              <div className="relative flex justify-between">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div key={step} className="flex flex-col items-center relative z-10">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse"></div>
                    <div className="mt-2">
                      <div className="w-16 h-4 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                      <div className="w-12 h-3 bg-gray-200 dark:bg-white/10 rounded mt-1 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Info Skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                <div className="w-20 h-3 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-3 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
              </div>
            </div>
          </motion.div>
          
          {/* Empty State Message */}
          <div className="text-center py-4">
            <div className="text-gray-600 dark:text-white/60 text-sm mb-1">No incomplete journeys</div>
            <p className="text-gray-500 dark:text-white/50 text-xs">All your CV journeys are complete!</p>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden">
          {/* Navigation Arrows */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mb-4">
              <motion.button
                onClick={prevPage}
                disabled={currentPage === 0}
                className="p-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
              
              <div className="text-gray-600 dark:text-white/60 text-sm">
                {currentPage + 1} of {totalPages}
              </div>
              
              <motion.button
                onClick={nextPage}
                disabled={currentPage === totalPages - 1}
                className="p-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>
          )}
          
          {/* Carousel Container */}
          <div className="space-y-4">
            {/* New Journey Card */}
            {showNewJourneyCard && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {console.log('🔍 AnalyticsJourneyWidget - Rendering NewJourneyCard')}
                <NewJourneyCard
                  onJourneyCreated={handleJourneyCreated}
                  onCancel={() => {
                    console.log('🔍 AnalyticsJourneyWidget - NewJourneyCard cancelled');
                    setShowNewJourneyCard(false);
                  }}
                />
              </motion.div>
            )}
            
            {/* Existing Journeys */}
            {incompleteJourneys.slice(currentPage * journeysPerPage, currentPage * journeysPerPage + journeysPerPage).map((journey, index) => (
              <motion.div
                key={journey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <JourneyTimelineCard
                  journey={journey}
                  onResume={onResumeJourney}
                  onDownload={(journey) => {
                    // Handle download functionality
                    console.log('Download journey:', journey);
                  }}
                  onDelete={onDeleteJourney}
                  onShowDeleteConfirm={setShowDeleteConfirm}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination Dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => (
              <motion.button
                key={index}
                onClick={() => goToPage(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentPage === index 
                    ? 'bg-lime-500 scale-125' 
                    : 'bg-gray-300 dark:bg-white/30 hover:bg-gray-400 dark:hover:bg-white/50'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                title={`Page ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md w-full mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Delete Journey</h3>
              <p className="text-white/60 mb-6">
                Are you sure you want to delete this journey? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteJourney(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default AnalyticsJourneyWidget;
