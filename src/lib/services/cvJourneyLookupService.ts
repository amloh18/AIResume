/**
 * CV Journey Lookup Service
 * 
 * This service handles finding existing CV journeys by CV ID or cover letter ID,
 * ensuring we can retrieve the source of truth (CV journey) for any document.
 */

export interface CVJourneyInfo {
  journeyId: string;
  cvId?: string;
  coverLetterId?: string;
  jobId: string;
  userId: string;
  status: string;
  currentStep: number;
  jobTitle?: string;
  company?: string;
}

export class CVJourneyLookupService {
  /**
   * Find CV journey by CV ID
   */
  static async findJourneyByCVId(cvId: string, userId: string): Promise<CVJourneyInfo | null> {
    try {
      console.log('🔍 CVJourneyLookupService - Finding journey by CV ID:', cvId);
      
      const response = await fetch(`/api/cv-journey?userId=${userId}&cvId=${cvId}`);
      
      if (!response.ok) {
        console.log('❌ No journey found for CV ID:', cvId);
        return null;
      }
      
      const data = await response.json();
      
      if (data.success && data.data.journeys && data.data.journeys.length > 0) {
        const journey = data.data.journeys[0];
        console.log('✅ Found journey for CV:', journey);
        return {
          journeyId: journey.journeyId,
          cvId: journey.cvId,
          coverLetterId: journey.coverLetterId,
          jobId: journey.jobId,
          userId: journey.userId,
          status: journey.status,
          currentStep: journey.currentStep,
          jobTitle: journey.jobTitle,
          company: journey.company
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error finding journey by CV ID:', error);
      return null;
    }
  }

  /**
   * Find CV journey by cover letter ID
   */
  static async findJourneyByCoverLetterId(coverLetterId: string, userId: string): Promise<CVJourneyInfo | null> {
    try {
      console.log('🔍 CVJourneyLookupService - Finding journey by cover letter ID:', coverLetterId);
      
      const response = await fetch(`/api/cv-journey?userId=${userId}&coverLetterId=${coverLetterId}`);
      
      if (!response.ok) {
        console.log('❌ No journey found for cover letter ID:', coverLetterId);
        return null;
      }
      
      const data = await response.json();
      
      if (data.success && data.data.journeys && data.data.journeys.length > 0) {
        const journey = data.data.journeys[0];
        console.log('✅ Found journey for cover letter:', journey);
        return {
          journeyId: journey.journeyId,
          cvId: journey.cvId,
          coverLetterId: journey.coverLetterId,
          jobId: journey.jobId,
          userId: journey.userId,
          status: journey.status,
          currentStep: journey.currentStep,
          jobTitle: journey.jobTitle,
          company: journey.company
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error finding journey by cover letter ID:', error);
      return null;
    }
  }

  /**
   * Find CV journey by job ID
   */
  static async findJourneyByJobId(jobId: string, userId: string): Promise<CVJourneyInfo | null> {
    try {
      console.log('🔍 CVJourneyLookupService - Finding journey by job ID:', jobId);
      
      const response = await fetch(`/api/cv-journey?userId=${userId}&jobId=${jobId}`);
      
      if (!response.ok) {
        console.log('❌ No journey found for job ID:', jobId);
        return null;
      }
      
      const data = await response.json();
      
      if (data.success && data.data.journeys && data.data.journeys.length > 0) {
        const journey = data.data.journeys[0];
        console.log('✅ Found journey for job:', journey);
        return {
          journeyId: journey.journeyId,
          cvId: journey.cvId,
          coverLetterId: journey.coverLetterId,
          jobId: journey.jobId,
          userId: journey.userId,
          status: journey.status,
          currentStep: journey.currentStep,
          jobTitle: journey.jobTitle,
          company: journey.company
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error finding journey by job ID:', error);
      return null;
    }
  }

  /**
   * Get comprehensive journey info for studio initialization
   */
  static async getJourneyInfoForStudio(
    cvId?: string | null,
    coverLetterId?: string | null,
    jobId?: string | null,
    userId: string
  ): Promise<CVJourneyInfo | null> {
    try {
      console.log('🔍 CVJourneyLookupService - Getting journey info for studio:', {
        cvId,
        coverLetterId,
        jobId,
        userId
      });

      // Try to find journey by CV ID first
      if (cvId) {
        const journey = await this.findJourneyByCVId(cvId, userId);
        if (journey) {
          console.log('✅ Found journey by CV ID');
          return journey;
        }
      }

      // Try to find journey by cover letter ID
      if (coverLetterId) {
        const journey = await this.findJourneyByCoverLetterId(coverLetterId, userId);
        if (journey) {
          console.log('✅ Found journey by cover letter ID');
          return journey;
        }
      }

      // Try to find journey by job ID
      if (jobId) {
        const journey = await this.findJourneyByJobId(jobId, userId);
        if (journey) {
          console.log('✅ Found journey by job ID');
          return journey;
        }
      }

      console.log('❌ No existing journey found');
      return null;
    } catch (error) {
      console.error('❌ Error getting journey info for studio:', error);
      return null;
    }
  }
}
