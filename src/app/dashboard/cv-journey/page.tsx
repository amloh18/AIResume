'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Plus, Briefcase, FileText, CheckCircle, Download, Trash2 } from 'lucide-react';
import PageHeader from '@/components/dashboard/PageHeader';
import { JobJourneyProvider, useJobJourney } from '@/contexts/JobJourneyContext';
import OnboardingModal from '@/components/modals/OnboardingModal';
import JobPipelineCardModal from '@/components/modals/JobPipelineCardModal';
import JourneyStatusBanner from '@/components/JourneyStatusBanner';
import JourneyTimelineCard from '@/components/dashboard/JourneyTimelineCard';

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
  const { isJourneyActive, currentJobId, startJourney } = useJobJourney();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      // Fetch user's journeys from backend
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
      
      const response = await fetch(`/api/journeys?userId=${userId}&status=all`);
      if (!response.ok) {
        throw new Error('Failed to fetch journeys');
      }
      
      const result = await response.json();
      if (result.success) {
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

  const handleStartNewJourney = () => {
    // Start a new journey with no jobId to trigger step 1 (Add Job)
    startJourney('temp');
    setShowPipelineModal(true);
  };

  const handleResumeJourney = (journey: Journey) => {
    console.log('🔍 CV Journey Page - Resuming journey:', journey);
    console.log('🔍 CV Journey Page - Job ID:', journey.jobId);
    startJourney(journey.jobId);
    setShowPipelineModal(true);
  };

  const handleDownloadFiles = (journey: Journey) => {
    // TODO: Implement download functionality
    console.log('Downloading files for journey:', journey.id);
  };

  const handleDeleteJourney = async (journeyId: string) => {
    try {
      setIsDeleting(true);
      const userId = session?.user?.id;
      if (!userId) {
        console.error('No user ID available');
        return;
      }

      console.log('🔍 CV Journey Page - Deleting journey:', journeyId);
      
      // Call the API to delete the journey (job) from database
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



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading journeys...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="CV Journey"
        description="Track your CV creation progress for each job application"
        user={session?.user || { name: 'User', email: 'user@example.com' }}
        showSettings={true}
      />

      {/* Start New Journey Card */}
      <motion.div
        className="bg-gradient-to-r from-lime-500/10 to-lime-600/10 border border-lime-500/20 rounded-xl p-6"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Start New Journey</h3>
            <p className="text-white/60">Begin creating a CV for a new job application</p>
          </div>
          <motion.button
            onClick={handleStartNewJourney}
            className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="h-4 w-4" />
            Start New Journey
          </motion.button>
        </div>
      </motion.div>

      {/* Journeys Timeline */}
      <div className="space-y-6">
        {journeys.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-white/40 text-lg mb-2">No journeys yet</div>
            <p className="text-white/60">Start your first CV creation journey to see it here</p>
          </motion.div>
        ) : (
          journeys.map((journey) => (
            <JourneyTimelineCard
              key={journey.id}
              journey={journey}
              onResume={handleResumeJourney}
              onDownload={handleDownloadFiles}
              onDelete={handleDeleteJourney}
              onShowDeleteConfirm={setShowDeleteConfirm}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
      
      <JobPipelineCardModal
        key={currentJobId || 'new-journey'}
        isOpen={showPipelineModal}
        onClose={() => setShowPipelineModal(false)}
        jobId={currentJobId}
      />

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
                  onClick={() => {
                    handleDeleteJourney(showDeleteConfirm);
                  }}
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

const CVJourneyPage: React.FC = () => {
  return (
    <JobJourneyProvider>
      <CVJourneyPageContent />
    </JobJourneyProvider>
  );
};

export default CVJourneyPage;
