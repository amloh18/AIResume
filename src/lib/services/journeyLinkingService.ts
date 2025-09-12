/**
 * Centralized Journey Linking Service
 * 
 * This service handles all job-CV linking operations through the CV Journey system,
 * eliminating duplication across different components.
 */

import { useJobJourney } from '@/contexts/JobJourneyContext';

export interface JourneyLinkData {
  jobId: string;
  cvId: string;
  userId: string;
  journeyName?: string;
}

export interface JourneyLinkResult {
  success: boolean;
  journeyId?: string;
  message: string;
  error?: string;
}

export class JourneyLinkingService {
  /**
   * Link a job to a CV through the CV Journey system
   * This creates or updates a journey for the job-CV pair
   */
  static async linkJobToCV(data: JourneyLinkData): Promise<JourneyLinkResult> {
    try {
      console.log('🔍 JourneyLinkingService - Linking job to CV:', data);

      const { jobId, cvId, userId, journeyName } = data;

      // Check if a journey already exists for this job
      const existingJourney = await this.getJourneyByJobId(jobId, userId);
      
      if (existingJourney) {
        // Update existing journey with new CV
        return await this.updateJourneyCV(existingJourney.id, cvId, userId);
      } else {
        // Create new journey
        return await this.createJourney({
          jobId,
          cvId,
          userId,
          journeyName: journeyName || `Application for ${jobId}`
        });
      }
    } catch (error) {
      console.error('❌ JourneyLinkingService - Error linking job to CV:', error);
      return {
        success: false,
        message: 'Failed to link job to CV',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Unlink a job from a CV by ending the journey
   */
  static async unlinkJobFromCV(jobId: string, userId: string): Promise<JourneyLinkResult> {
    try {
      console.log('🔍 JourneyLinkingService - Unlinking job from CV:', { jobId, userId });

      const journey = await this.getJourneyByJobId(jobId, userId);
      
      if (!journey) {
        return {
          success: false,
          message: 'No journey found for this job'
        };
      }

      // End the journey (this will unlink the CV)
      const response = await fetch('/api/journeys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journeyId: journey.id,
          userId: userId
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Job unlinked from CV successfully'
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          message: 'Failed to unlink job from CV',
          error: errorData.message || 'Unknown error'
        };
      }
    } catch (error) {
      console.error('❌ JourneyLinkingService - Error unlinking job from CV:', error);
      return {
        success: false,
        message: 'Failed to unlink job from CV',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get journey information for a specific job
   */
  static async getJourneyByJobId(jobId: string, userId: string): Promise<any | null> {
    try {
      const response = await fetch(`/api/cv-journey?userId=${userId}&jobId=${jobId}`);
      
      if (response.ok) {
        const result = await response.json();
        return result.success && result.data.journeys.length > 0 
          ? result.data.journeys[0] 
          : null;
      }
      
      return null;
    } catch (error) {
      console.error('❌ JourneyLinkingService - Error getting journey:', error);
      return null;
    }
  }

  /**
   * Get all journeys for a user
   */
  static async getUserJourneys(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/cv-journey?userId=${userId}&status=all`);
      
      if (response.ok) {
        const result = await response.json();
        return result.success ? result.data.journeys : [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ JourneyLinkingService - Error getting user journeys:', error);
      return [];
    }
  }

  /**
   * Create a new journey
   */
  private static async createJourney(data: {
    jobId: string;
    cvId: string;
    userId: string;
    journeyName: string;
  }): Promise<JourneyLinkResult> {
    try {
      // First, get job details for journey name
      const jobResponse = await fetch(`/api/jobs/${data.jobId}?userId=${data.userId}`);
      if (!jobResponse.ok) {
        throw new Error('Failed to fetch job details');
      }
      const jobData = await jobResponse.json();

      // Create journey using the CVJourney API
      const response = await fetch('/api/cv-journey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: data.userId,
          jobId: data.jobId,
          cvId: data.cvId,
          journeyName: data.journeyName || `${jobData.job?.jobTitle || 'Job'} at ${jobData.job?.company || 'Company'}`,
          currentStep: 2, // CV step completed
          status: 'in-progress'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          journeyId: result.data.journey.id,
          message: 'Journey created successfully'
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          message: 'Failed to create journey',
          error: errorData.message || 'Unknown error'
        };
      }
    } catch (error) {
      console.error('❌ JourneyLinkingService - Error creating journey:', error);
      return {
        success: false,
        message: 'Failed to create journey',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing journey with a new CV
   */
  private static async updateJourneyCV(journeyId: string, cvId: string, userId: string): Promise<JourneyLinkResult> {
    try {
      // Get the journey to find the jobId
      const journey = await this.getJourneyByJobId(journeyId, userId);
      if (!journey) {
        return {
          success: false,
          message: 'Journey not found'
        };
      }

      const response = await fetch('/api/cv-journey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          jobId: journey.jobId,
          cvId: cvId,
          currentStep: 2, // CV step completed
          status: 'in-progress'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          journeyId: result.data.journey.id,
          message: 'Journey updated successfully'
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          message: 'Failed to update journey',
          error: errorData.message || 'Unknown error'
        };
      }
    } catch (error) {
      console.error('❌ JourneyLinkingService - Error updating journey:', error);
      return {
        success: false,
        message: 'Failed to update journey',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get CV information for a specific job
   */
  static async getLinkedCV(jobId: string, userId: string): Promise<any | null> {
    try {
      const journey = await this.getJourneyByJobId(jobId, userId);
      
      if (!journey || !journey.cvId) {
        return null;
      }

      // Fetch CV details
      const response = await fetch(`/api/cvs/${journey.cvId}?userId=${userId}`);
      
      if (response.ok) {
        const result = await response.json();
        return result.success ? result.data.cv : null;
      }
      
      return null;
    } catch (error) {
      console.error('❌ JourneyLinkingService - Error getting linked CV:', error);
      return null;
    }
  }

  /**
   * Check if a job is linked to any CV
   */
  static async isJobLinked(jobId: string, userId: string): Promise<boolean> {
    try {
      const journey = await this.getJourneyByJobId(jobId, userId);
      return journey && journey.cvId ? true : false;
    } catch (error) {
      console.error('❌ JourneyLinkingService - Error checking job link status:', error);
      return false;
    }
  }

  /**
   * Get all jobs linked to a specific CV
   */
  static async getJobsLinkedToCV(cvId: string, userId: string): Promise<any[]> {
    try {
      const journeys = await this.getUserJourneys(userId);
      return journeys.filter(journey => journey.cvId === cvId);
    } catch (error) {
      console.error('❌ JourneyLinkingService - Error getting jobs linked to CV:', error);
      return [];
    }
  }
}

/**
 * React hook for using the journey linking service
 */
export const useJourneyLinking = () => {
  const { startJourney, endJourney, updateCVId, updateCVName } = useJobJourney();

  const linkJobToCV = async (data: Omit<JourneyLinkData, 'userId'> & { userId: string }) => {
    const result = await JourneyLinkingService.linkJobToCV(data);
    
    if (result.success && result.journeyId) {
      // Start the journey in the context
      startJourney(result.journeyId);
      
      // Update CV ID and fetch CV name
      if (data.cvId) {
        updateCVId(data.cvId);
        
        // Fetch CV name
        try {
          const cvResponse = await fetch(`/api/cvs/${data.cvId}?userId=${data.userId}`);
          if (cvResponse.ok) {
            const cvData = await cvResponse.json();
            console.log('🔍 CV Data for name:', cvData);
            const cvName = cvData.data?.cv?.title || 'CV Document';
            console.log('🔍 Extracted CV name:', cvName);
            updateCVName(cvName);
          }
        } catch (error) {
          console.warn('Failed to fetch CV name:', error);
        }
      }
    }
    
    return result;
  };

  const unlinkJobFromCV = async (jobId: string, userId: string) => {
    const result = await JourneyLinkingService.unlinkJobFromCV(jobId, userId);
    
    if (result.success) {
      // End the journey in the context
      endJourney();
    }
    
    return result;
  };

  return {
    linkJobToCV,
    unlinkJobFromCV,
    getJourneyByJobId: JourneyLinkingService.getJourneyByJobId,
    getUserJourneys: JourneyLinkingService.getUserJourneys,
    getLinkedCV: JourneyLinkingService.getLinkedCV,
    isJobLinked: JourneyLinkingService.isJobLinked,
    getJobsLinkedToCV: JourneyLinkingService.getJobsLinkedToCV
  };
};
