'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import JourneyTimelineCard from '@/components/dashboard/JourneyTimelineCard';
import { CVJourney } from '@/types/cv';
import toast from 'react-hot-toast';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';

interface JobApplication {
  id: string;
  _id: string;
  jobTitle: string;
  title?: string;
  company: string;
}

interface CreatedStageViewProps {
  jobs: JobApplication[];
  journeys: CVJourney[];
  getJobJourneys: (jobId: string) => CVJourney[];
  getJourneyProgress: (journey: CVJourney) => number;
  getJourneyStatusText: (jobJourneys: CVJourney[], jobStatus?: string) => string;
  onJobClick: (job: JobApplication) => void;
  onRefresh?: () => void;
}

const CreatedStageView: React.FC<CreatedStageViewProps> = ({
  jobs,
  journeys,
  getJobJourneys,
  getJourneyProgress,
  getJourneyStatusText,
  onJobClick,
  onRefresh
}) => {
  const { user } = useUnifiedAuth();

  const handleDeleteJourney = async (journey: any) => {
    try {
      const journeyId = journey.id || journey._id;
      if (!journeyId) {
        toast.error('Journey ID not found');
        return;
      }

      const userId = getUserIdForAPI(user);
      if (!userId) {
        toast.error('User not authenticated');
        return;
      }

      const response = await fetch('/api/application-journey', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete journey');
      }

      toast.success('Journey deleted successfully. Job moved to draft stage.');
      
      // Refresh data if callback provided, otherwise reload page
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting journey:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete journey');
    }
  };
  // Get all journeys for jobs in created stage
  const allJourneys = jobs.flatMap(job => {
    const jobJourneys = getJobJourneys(job.id || job._id);
    return jobJourneys.map(journey => ({
      journey,
      job
    }));
  });

  if (allJourneys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No active journeys
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Create CV and Cover Letter for a job to start a journey.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {allJourneys.map(({ journey, job }) => {
        const progress = getJourneyProgress(journey);
        const statusText = getJourneyStatusText([journey], job.status);

        // Convert journey to format expected by JourneyTimelineCard
        const getDateString = (date: any): string => {
          if (!date) return new Date().toISOString();
          if (date instanceof Date) return date.toISOString();
          return new Date(date).toISOString();
        };

        const journeyData = {
          id: journey.id || (journey as any)._id?.toString() || '',
          jobId: journey.jobId || job.id || job._id,
          jobTitle: journey.jobTitle || job.jobTitle || job.title || '',
          company: journey.company || job.company,
          status: (journey.status || 'in-progress') as 'in-progress' | 'completed' | 'paused' | 'processing_documents' | 'creation_failed' | 'ready',
          currentStep: journey.currentStep || 1,
          totalSteps: journey.totalSteps || 5,
          createdAt: getDateString(journey.metadata?.createdAt || (journey as any).createdAt),
          updatedAt: getDateString(journey.metadata?.updatedAt || (journey as any).updatedAt),
          lastModified: getDateString(journey.metadata?.updatedAt || (journey as any).updatedAt),
          title: `${journey.jobTitle || job.jobTitle || job.title} - ${journey.company || job.company}`,
          atsScore: journey.atsScore,
          cvId: journey.cvId,
          coverLetterId: journey.coverLetterId,
          lastWorkedOn: journey.metadata?.lastAccessedAt
            ? getDateString(journey.metadata.lastAccessedAt)
            : undefined
        };

        return (
          <motion.div
            key={journey.id || journey._id || job.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
          >
            <JourneyTimelineCard
              journey={journeyData as any}
              onResume={() => onJobClick(job)}
              onDownload={() => {}}
              onRefresh={() => {}}
              onDelete={handleDeleteJourney}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

export default CreatedStageView;

