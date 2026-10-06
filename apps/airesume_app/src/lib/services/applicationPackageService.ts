/**
 * Application Package Service
 * 
 * This service implements the corrected "Application Package" model where:
 * 1. Each CV Journey is a distinct "Application Package" containing one job, one CV, one cover letter
 * 2. Documents are locked to packages via journey_id field
 * 3. CV reuse is achieved through duplication, not direct linking
 * 4. Multiple applications for the same job create separate packages
 */

export interface ApplicationPackageData {
  userId: string;
  jobId: string;
  journeyName?: string;
  jobData?: {
    jobTitle?: string;
    title?: string;
    company?: string;
    [key: string]: any;
  };
}

export interface DuplicateCVData {
  sourceCvId: string;
  userId: string;
  newTitle?: string;
  jobTitle?: string;
  company?: string;
}

export interface PackageLinkResult {
  success: boolean;
  message: string;
  data?: {
    journeyId?: string;
    cvId?: string;
    coverLetterId?: string;
  };
  error?: string;
}

export class ApplicationPackageService {
  
  /**
   * Create a new Application Package (CV Journey) for a job
   * This is the entry point for both "Job First" and "Document First" approaches
   */
  static async createNewPackage(data: ApplicationPackageData): Promise<PackageLinkResult> {
    try {
      console.log('🎯 ApplicationPackageService - Creating new application package:', data);
      
      const { userId, jobId, journeyName, jobData: providedJobData } = data;
      
      // Use provided job data if available, otherwise fetch it
      let job: any = null;
      
      if (providedJobData) {
        // Use the job data that was already provided (from the save response)
        job = providedJobData;
        console.log('🔍 ApplicationPackageService - Using provided job data:', job);
      } else {
        // Fallback: Fetch job details for the journey
        const jobResponse = await fetch(`/api/jobs/${jobId}?userId=${userId}`);
        if (!jobResponse.ok) {
          console.error('❌ ApplicationPackageService - Job API response not OK:', jobResponse.status);
          // If job fetch fails, try to create package with minimal data
          console.warn('⚠️ ApplicationPackageService - Job fetch failed, attempting to create package with jobId only');
          job = {
            jobTitle: journeyName?.replace('Application for ', '').split(' at ')[0] || 'Untitled Job',
            company: journeyName?.split(' at ')[1] || 'Unknown Company',
            title: journeyName?.replace('Application for ', '').split(' at ')[0] || 'Untitled Job'
          };
        } else {
          const jobResponseData = await jobResponse.json();
          console.log('🔍 ApplicationPackageService - Job API response:', jobResponseData);
          
          // Handle different response formats from jobs API
          job = jobResponseData.job || jobResponseData.data?.job || jobResponseData.data;
          
          if (!job) {
            console.error('❌ ApplicationPackageService - Job data not found in response:', jobResponseData);
            return {
              success: false,
              message: 'Job data not found'
            };
          }
        }
      }
      
      // Create new CV Journey (Application Package)
      const response = await fetch('/api/application-journey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobId,
          jobTitle: job.jobTitle || job.title,
          company: job.company,
          journeyName: journeyName || `Application for ${job.jobTitle || job.title} at ${job.company}`,
          status: 'in-progress',
          currentStep: 1,
          totalSteps: 5,
          steps: [
            { stepId: 1, name: 'Job Tracking', status: 'completed' },
            { stepId: 2, name: 'CV Creation', status: 'active' },
            { stepId: 3, name: 'ATS Scoring', status: 'pending' },
            { stepId: 4, name: 'Cover Letter', status: 'pending' },
            { stepId: 5, name: 'Application', status: 'pending' }
          ]
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ApplicationPackageService - CV Journey API error:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          return {
            success: false,
            message: errorData.message || 'Failed to create application package'
          };
        } catch (parseError) {
          return {
            success: false,
            message: `Failed to create application package (${response.status})`
          };
        }
      }
      
      const result = await response.json();
      
      console.log('✅ ApplicationPackageService - Application package created:', result.data);
      
      return {
        success: true,
        message: 'Application package created successfully',
        data: {
          journeyId: result.data.journey._id || result.data.journey.id
        }
      };
      
    } catch (error) {
      console.error('❌ ApplicationPackageService - Error creating package:', error);
      return {
        success: false,
        message: 'Failed to create application package',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Duplicate a CV and create a freestanding copy ready for new package assignment
   * This implements the "To Re-use is to DUPLICATE" principle
   */
  static async duplicateCV(data: DuplicateCVData): Promise<PackageLinkResult> {
    try {
      console.log('🔄 ApplicationPackageService - Duplicating CV:', data);
      
      const { sourceCvId, userId, newTitle, jobTitle, company } = data;
      
      // Fetch the source CV
      const cvResponse = await fetch(`/api/cvs/${sourceCvId}?userId=${userId}`);
      if (!cvResponse.ok) {
        return {
          success: false,
          message: 'Source CV not found'
        };
      }
      
      const cvData = await cvResponse.json();
      const sourceCV = cvData.data?.cv;
      
      if (!sourceCV) {
        return {
          success: false,
          message: 'Source CV data not found'
        };
      }
      
      // Generate title with job context if available
      const finalTitle = newTitle || (jobTitle && company 
        ? `${jobTitle} - ${company} CV`
        : `${sourceCV.title} (Copy)`);

      // Create duplicate CV (freestanding - no journeyId)
      const duplicateResponse = await fetch('/api/cvs/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceCvId,
          userId,
          customTitle: finalTitle,
          journeyId: null // Create freestanding CV
        }),
      });
      
      if (!duplicateResponse.ok) {
        const errorData = await duplicateResponse.json();
        return {
          success: false,
          message: errorData.message || 'Failed to duplicate CV'
        };
      }
      
      const duplicateResult = await duplicateResponse.json();
      
      console.log('✅ ApplicationPackageService - CV duplicated successfully:', duplicateResult.data.cv.id);
      
      return {
        success: true,
        message: 'CV duplicated successfully',
        data: {
          cvId: duplicateResult.data.cv.id
        }
      };
      
    } catch (error) {
      console.error('❌ ApplicationPackageService - Error duplicating CV:', error);
      return {
        success: false,
        message: 'Failed to duplicate CV',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Lock a freestanding document to an Application Package
   * This enforces bi-directional linking between document and journey
   */
  static async lockDocumentToPackage(
    documentId: string,
    journeyId: string,
    documentType: 'cv' | 'coverLetter',
    userId: string
  ): Promise<PackageLinkResult> {
    try {
      console.log('🔒 ApplicationPackageService - Locking document to package:', {
        documentId,
        journeyId,
        documentType
      });
      
      // First, verify the document is freestanding (no existing journeyId)
      const endpoint = documentType === 'cv' ? `/api/cvs/${documentId}` : `/api/cover-letters/${documentId}`;
      const docResponse = await fetch(`${endpoint}?userId=${userId}`);
      
      if (!docResponse.ok) {
        return {
          success: false,
          message: `${documentType.toUpperCase()} not found`
        };
      }
      
      const docData = await docResponse.json();
      const document = docData.data?.[documentType] || docData.data?.coverLetter;
      
      if (!document) {
        return {
          success: false,
          message: `${documentType.toUpperCase()} data not found`
        };
      }
      
      // Enforce the constraint: Documents with journeyId cannot be reassigned
      if (document.journeyId) {
        return {
          success: false,
          message: `This ${documentType} is already part of another application package and cannot be reused. Please duplicate it first.`
        };
      }
      
      // Update the document with journeyId
      const updateResponse = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...document,
          journeyId
        }),
      });
      
      if (!updateResponse.ok) {
        return {
          success: false,
          message: `Failed to lock ${documentType} to package`
        };
      }
      
      // Update the CV Journey with the document ID
      const journeyUpdateField = documentType === 'cv' ? 'cvId' : 'coverLetterId';
      const journeyResponse = await fetch(`/api/application-journey/${journeyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          [journeyUpdateField]: documentId,
          metadata: {
            updatedAt: new Date(),
            lastAccessedAt: new Date()
          }
        }),
      });
      
      if (!journeyResponse.ok) {
        return {
          success: false,
          message: 'Failed to update journey with document reference'
        };
      }
      
      console.log(`✅ ApplicationPackageService - ${documentType.toUpperCase()} locked to package successfully`);
      
      return {
        success: true,
        message: `${documentType.toUpperCase()} locked to application package successfully`,
        data: {
          journeyId,
          [documentType === 'cv' ? 'cvId' : 'coverLetterId']: documentId
        }
      };
      
    } catch (error) {
      console.error(`❌ ApplicationPackageService - Error locking ${documentType} to package:`, error);
      return {
        success: false,
        message: `Failed to lock ${documentType} to application package`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Create a new application for an existing job (allows multiple applications per job)
   * This implements the corrected workflow where multiple packages can exist for the same job
   */
  static async createAdditionalApplicationForJob(
    jobId: string,
    userId: string,
    journeyName?: string
  ): Promise<PackageLinkResult> {
    try {
      console.log('🎯 ApplicationPackageService - Creating additional application for job:', jobId);
      
      // Always create a NEW package, never reuse existing ones
      return await this.createNewPackage({
        userId,
        jobId,
        journeyName
      });
      
    } catch (error) {
      console.error('❌ ApplicationPackageService - Error creating additional application:', error);
      return {
        success: false,
        message: 'Failed to create additional application',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get all available freestanding documents for package assignment
   * These are documents with journeyId = null
   */
  static async getFreestrandingDocuments(
    userId: string,
    documentType: 'cv' | 'coverLetter'
  ): Promise<any[]> {
    try {
      const endpoint = documentType === 'cv' ? '/api/cvs' : '/api/cover-letters';
      const response = await fetch(`${endpoint}?userId=${userId}&freestanding=true`);
      
      if (!response.ok) {
        console.error(`Failed to fetch freestanding ${documentType}s`);
        return [];
      }
      
      const data = await response.json();
      return data.data?.[documentType === 'cv' ? 'cvs' : 'coverLetters'] || [];
      
    } catch (error) {
      console.error(`Error fetching freestanding ${documentType}s:`, error);
      return [];
    }
  }
}
