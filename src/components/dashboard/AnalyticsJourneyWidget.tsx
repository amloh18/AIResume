'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Download, 
  Trash2, 
  Play,
  Calendar,
  Building,
  ChevronLeft,
  ChevronRight,
  Eye,
  Circle,
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
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const steps = [
    { id: 1, label: 'Add Job', icon: Briefcase, preview: 'Job Details' },
    { id: 2, label: 'Create CV', icon: FileText, preview: 'CV Document' },
    { id: 3, label: 'ATS Score', icon: CheckCircle, preview: 'Score Analysis' },
    { id: 4, label: 'Cover Letter', icon: FileText, preview: 'Cover Letter' },
    { id: 5, label: 'Download', icon: Download, preview: 'Final Files' }
  ];

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
      
      const response = await fetch(`/api/journeys?userId=${userId}&status=in-progress`);
      if (!response.ok) {
        throw new Error('Failed to fetch journeys');
      }
      
      const result = await response.json();
      if (result.success) {
        console.log('🔍 AnalyticsJourneyWidget - Journeys fetched:', result.data.journeys);
        setJourneys(result.data.journeys);
      } else {
        console.error('Error fetching journeys:', result.message);
      }
    } catch (error) {
      console.error('Error fetching journeys:', error);
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

  const incompleteJourneys = journeys.filter(journey => journey.status === 'in-progress');
  const journeysPerPage = 1; // Show 1 journey per page
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
      const response = await fetch(`/api/journeys?journeyId=${journeyId}&userId=${userId}`, {
        method: 'DELETE',
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
      <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-6" style={{ borderDasharray: '8 4' } as React.CSSProperties}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">CV Journeys</h2>
          <p className="text-white/60 text-sm">
            {incompleteJourneys.length} incomplete journey{incompleteJourneys.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => {
              // Start new journey - open modal instead of routing
              const event = new CustomEvent('openCVJourneyModal', { detail: { step: 1 } });
              window.dispatchEvent(event);
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
      </div>

      {incompleteJourneys.length === 0 ? (
        <div className="space-y-4">
          {/* Skeleton Cards */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="bg-white/5 border border-white/10 rounded-lg p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {/* Header Skeleton */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 bg-white/10 rounded animate-pulse"></div>
                    <div className="h-4 bg-white/10 rounded w-32 animate-pulse"></div>
                  </div>
                  <div className="h-3 bg-white/10 rounded w-24 animate-pulse"></div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-16 h-6 bg-white/10 rounded-full animate-pulse"></div>
                  <div className="w-16 h-6 bg-white/10 rounded animate-pulse"></div>
                  <div className="w-6 h-6 bg-white/10 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Timeline Skeleton */}
              <div className="relative mb-3">
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/10"></div>
                <div className="relative flex justify-between">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div key={step} className="flex flex-col items-center relative z-10">
                      <div className="w-6 h-6 bg-white/10 rounded-full animate-pulse"></div>
                      <div className="mt-2">
                        <div className="w-16 h-4 bg-white/10 rounded animate-pulse"></div>
                        <div className="w-12 h-3 bg-white/10 rounded mt-1 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Info Skeleton */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-white/10 rounded animate-pulse"></div>
                  <div className="w-20 h-3 bg-white/10 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-3 bg-white/10 rounded animate-pulse"></div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Empty State Message */}
          <div className="text-center py-4">
            <div className="text-white/40 text-sm mb-1">No incomplete journeys</div>
            <p className="text-white/60 text-xs">All your CV journeys are complete!</p>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden" style={{ height: '200px' }}>
          {/* Navigation Arrows */}
          {totalPages > 1 && (
            <>
              <motion.button
                onClick={prevPage}
                disabled={currentPage === 0}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
              
              <motion.button
                onClick={nextPage}
                disabled={currentPage === totalPages - 1}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </>
          )}
          
          {/* Carousel Container */}
          <motion.div
            className="h-full"
            animate={{ y: -currentPage * 200 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {Array.from({ length: totalPages }, (_, pageIndex) => (
              <div key={pageIndex} className="flex flex-col justify-center" style={{ height: '200px' }}>
                <div className="space-y-4">
                  {incompleteJourneys.slice(pageIndex * journeysPerPage, pageIndex * journeysPerPage + journeysPerPage).map((journey, index) => (
                    <motion.div
                      key={journey.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-300"
                      whileHover={{ 
                        scale: 1.02,
                        y: -2
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Building className="h-4 w-4 text-lime-400" />
                            <h3 className="text-sm font-semibold text-white">{journey.jobTitle}</h3>
                          </div>
                          <p className="text-white/60 text-xs">{journey.company}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Step {journey.currentStep}/{journey.totalSteps}
                          </div>
                          
                          <motion.button
                            onClick={() => {
                              // Open CV Journey Modal instead of routing
                              const event = new CustomEvent('openCVJourneyModal', { 
                                detail: { 
                                  step: journey.currentStep,
                                  journey: journey
                                } 
                              });
                              window.dispatchEvent(event);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded text-xs transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Resume Journey"
                          >
                            <Play className="h-3 w-3" />
                            Resume
                          </motion.button>
                          
                          <motion.button
                            onClick={() => setShowDeleteConfirm(journey.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Delete Journey"
                          >
                            <Trash2 className="h-3 w-3" />
                          </motion.button>
                        </div>
                      </div>

                      {/* Timeline with Preview Cards */}
                      <div className="relative mb-3">
                        {/* Timeline Line */}
                        <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/10" />
                        
                        {/* Steps with Preview Cards */}
                        <div className="relative flex justify-between">
                          {steps.map((step, index) => {
                            // Enhanced step status calculation
                            const getStepStatus = (stepId: number) => {
                              switch (stepId) {
                                case 1: return journey.jobTitle && journey.company ? 'completed' : 'pending';
                                case 2: return journey.cvId ? 'completed' : (journey.currentStep >= 2 ? 'active' : 'pending');
                                case 3: return (journey.atsScore !== undefined && journey.cvId) ? 'completed' : (journey.currentStep >= 3 && journey.cvId ? 'active' : 'pending');
                                case 4: return (journey.coverLetterId && journey.coverLetterId.trim() !== '') ? 'completed' : (journey.currentStep >= 4 && journey.atsScore !== undefined ? 'active' : 'pending');
                                case 5: return journey.status === 'completed' ? 'completed' : (journey.currentStep >= 5 && journey.coverLetterId ? 'active' : 'pending');
                                default: return 'pending';
                              }
                            };
                            
                            const stepStatus = getStepStatus(step.id);
                            const isCompleted = stepStatus === 'completed';
                            const isCurrent = stepStatus === 'active';
                            const Icon = step.icon;
                            
                            return (
                              <div key={step.id} className="flex flex-col items-center relative z-10">
                                {/* Step Circle */}
                                <motion.div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 ${
                                    isCompleted
                                      ? 'bg-lime-500 border-lime-500 text-black'
                                      : isCurrent
                                      ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                                      : 'bg-white/5 border-white/20 text-white/40'
                                  }`}
                                  whileHover={{ scale: 1.1 }}
                                >
                                  <Icon className="h-3 w-3" />
                                </motion.div>
                                
                                {/* Preview Card */}
                                <div className="mt-2 text-center">
                                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                                    isCompleted 
                                      ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30' 
                                      : isCurrent
                                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                      : 'bg-white/5 text-white/40 border border-white/10'
                                  }`}>
                                    {step.preview}
                                  </div>
                                  
                                  {/* ATS Score for step 3 */}
                                  {step.id === 3 && journey.atsScore && (
                                    <div className="text-xs text-lime-400 mt-1">
                                      {journey.atsScore}%
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Progress Info */}
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created {formatDate(journey.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Progress: {Math.round((journey.currentStep / journey.totalSteps) * 100)}%</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Pagination Dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => (
              <motion.button
                key={index}
                onClick={() => goToPage(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentPage === index 
                    ? 'bg-lime-500 scale-125' 
                    : 'bg-white/30 hover:bg-white/50'
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
