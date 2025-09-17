/**
 * CV Journey Relationship Service
 * 
 * This service manages the relationships between Jobs, CVs, Cover Letters, and CV Journeys
 * according to the CV Journey management system architecture.
 * 
 * Key principles:
 * - CV Journey acts as a central linking hub for each job application
 * - CV Journey holds links to Job, CV, and Cover Letter (not the documents themselves)
 * - Master CV is the single source of truth for all tailored CVs
 * - Canvas queries all CVs and Cover Letters regardless of CV Journey
 */

import { CVJourney } from '@/models/CVJourney';
import { JobApplication } from '@/models/JobApplication';
import { CV } from '@/models/CV';
import { CoverLetter } from '@/models/CoverLetter';

export interface CVJourneyRelationship {
  journeyId: string;
  jobId: string;
  cvId?: string;
  coverLetterId?: string;
  atsScore?: number;
  userId: string;
  jobTitle: string;
  company: string;
  status: 'in-progress' | 'completed' | 'paused';
  currentStep: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentWithJourney {
  documentId: string;
  documentType: 'cv' | 'cover-letter';
  title: string;
  journeyId?: string;
  jobId?: string;
  jobTitle?: string;
  company?: string;
  status?: string;
  lastModified: Date;
}

export class CVJourneyRelationshipService {
  /**
   * Get CV Journey by Job ID
   */
  static async getJourneyByJobId(jobId: string, userId: string): Promise<CVJourneyRelationship | null> {
    try {
      const journey = await CVJourney.findOne({ jobId, userId });
      if (!journey) return null;

      return {
        journeyId: journey._id.toString(),
        jobId: journey.jobId,
        cvId: journey.cvId,
        coverLetterId: journey.coverLetterId,
        atsScore: journey.atsScore,
        userId: journey.userId,
        jobTitle: journey.jobTitle,
        company: journey.company,
        status: journey.status,
        currentStep: journey.currentStep,
        createdAt: journey.createdAt,
        updatedAt: journey.updatedAt
      };
    } catch (error) {
      console.error('Error getting journey by job ID:', error);
      return null;
    }
  }

  /**
   * Get CV Journey by CV ID
   */
  static async getJourneyByCVId(cvId: string, userId: string): Promise<CVJourneyRelationship | null> {
    try {
      const journey = await CVJourney.findOne({ cvId, userId });
      if (!journey) return null;

      return {
        journeyId: journey._id.toString(),
        jobId: journey.jobId,
        cvId: journey.cvId,
        coverLetterId: journey.coverLetterId,
        atsScore: journey.atsScore,
        userId: journey.userId,
        jobTitle: journey.jobTitle,
        company: journey.company,
        status: journey.status,
        currentStep: journey.currentStep,
        createdAt: journey.createdAt,
        updatedAt: journey.updatedAt
      };
    } catch (error) {
      console.error('Error getting journey by CV ID:', error);
      return null;
    }
  }

  /**
   * Get CV Journey by Cover Letter ID
   */
  static async getJourneyByCoverLetterId(coverLetterId: string, userId: string): Promise<CVJourneyRelationship | null> {
    try {
      const journey = await CVJourney.findOne({ coverLetterId, userId });
      if (!journey) return null;

      return {
        journeyId: journey._id.toString(),
        jobId: journey.jobId,
        cvId: journey.cvId,
        coverLetterId: journey.coverLetterId,
        atsScore: journey.atsScore,
        userId: journey.userId,
        jobTitle: journey.jobTitle,
        company: journey.company,
        status: journey.status,
        currentStep: journey.currentStep,
        createdAt: journey.createdAt,
        updatedAt: journey.updatedAt
      };
    } catch (error) {
      console.error('Error getting journey by cover letter ID:', error);
      return null;
    }
  }

  /**
   * Get all CV Journeys for a user
   */
  static async getAllJourneysForUser(userId: string): Promise<CVJourneyRelationship[]> {
    try {
      const journeys = await CVJourney.find({ userId }).sort({ createdAt: -1 });
      
      return journeys.map(journey => ({
        journeyId: journey._id.toString(),
        jobId: journey.jobId,
        cvId: journey.cvId,
        coverLetterId: journey.coverLetterId,
        atsScore: journey.atsScore,
        userId: journey.userId,
        jobTitle: journey.jobTitle,
        company: journey.company,
        status: journey.status,
        currentStep: journey.currentStep,
        createdAt: journey.createdAt,
        updatedAt: journey.updatedAt
      }));
    } catch (error) {
      console.error('Error getting all journeys for user:', error);
      return [];
    }
  }

  /**
   * Get all CVs with their associated CV Journey information
   */
  static async getCVsWithJourneyInfo(userId: string): Promise<DocumentWithJourney[]> {
    try {
      // Get all CVs for the user
      const cvs = await CV.find({ userId }).sort({ updatedAt: -1 });
      
      // Get all CV Journeys for the user
      const journeys = await CVJourney.find({ userId });
      
      // Create a map of CV ID to Journey
      const cvToJourneyMap = new Map();
      journeys.forEach(journey => {
        if (journey.cvId) {
          cvToJourneyMap.set(journey.cvId, journey);
        }
      });

      // Combine CV data with journey information
      return cvs.map(cv => {
        const journey = cvToJourneyMap.get(cv._id.toString());
        return {
          documentId: cv._id.toString(),
          documentType: 'cv' as const,
          title: cv.title,
          journeyId: journey?._id.toString(),
          jobId: journey?.jobId,
          jobTitle: journey?.jobTitle,
          company: journey?.company,
          status: cv.status,
          lastModified: cv.updatedAt
        };
      });
    } catch (error) {
      console.error('Error getting CVs with journey info:', error);
      return [];
    }
  }

  /**
   * Get all Cover Letters with their associated CV Journey information
   */
  static async getCoverLettersWithJourneyInfo(userId: string): Promise<DocumentWithJourney[]> {
    try {
      // Get all Cover Letters for the user
      const coverLetters = await CoverLetter.find({ userId }).sort({ updatedAt: -1 });
      
      // Get all CV Journeys for the user
      const journeys = await CVJourney.find({ userId });
      
      // Create a map of Cover Letter ID to Journey
      const coverLetterToJourneyMap = new Map();
      journeys.forEach(journey => {
        if (journey.coverLetterId) {
          coverLetterToJourneyMap.set(journey.coverLetterId, journey);
        }
      });

      // Combine Cover Letter data with journey information
      return coverLetters.map(coverLetter => {
        const journey = coverLetterToJourneyMap.get(coverLetter._id.toString());
        return {
          documentId: coverLetter._id.toString(),
          documentType: 'cover-letter' as const,
          title: coverLetter.title,
          journeyId: journey?._id.toString(),
          jobId: journey?.jobId,
          jobTitle: journey?.jobTitle,
          company: journey?.company,
          status: coverLetter.status,
          lastModified: coverLetter.updatedAt
        };
      });
    } catch (error) {
      console.error('Error getting cover letters with journey info:', error);
      return [];
    }
  }

  /**
   * Update CV Journey with CV ID
   */
  static async linkCVToJourney(journeyId: string, cvId: string): Promise<boolean> {
    try {
      const journey = await CVJourney.findById(journeyId);
      if (!journey) return false;

      journey.cvId = cvId;
      journey.currentStep = 2; // Move to CV creation step
      journey.steps[1].status = 'completed'; // Mark CV creation as completed
      journey.metadata.updatedAt = new Date();
      journey.metadata.lastAccessedAt = new Date();

      await journey.save();
      return true;
    } catch (error) {
      console.error('Error linking CV to journey:', error);
      return false;
    }
  }

  /**
   * Update CV Journey with Cover Letter ID
   */
  static async linkCoverLetterToJourney(journeyId: string, coverLetterId: string): Promise<boolean> {
    try {
      const journey = await CVJourney.findById(journeyId);
      if (!journey) return false;

      journey.coverLetterId = coverLetterId;
      journey.currentStep = 4; // Move to cover letter step
      journey.steps[3].status = 'completed'; // Mark cover letter creation as completed
      journey.metadata.updatedAt = new Date();
      journey.metadata.lastAccessedAt = new Date();

      await journey.save();
      return true;
    } catch (error) {
      console.error('Error linking cover letter to journey:', error);
      return false;
    }
  }

  /**
   * Update CV Journey with ATS Score
   */
  static async updateJourneyATSScore(journeyId: string, atsScore: number): Promise<boolean> {
    try {
      const journey = await CVJourney.findById(journeyId);
      if (!journey) return false;

      journey.atsScore = atsScore;
      journey.currentStep = 3; // Move to ATS score step
      journey.steps[2].status = 'completed'; // Mark ATS score as completed
      journey.metadata.updatedAt = new Date();
      journey.metadata.lastAccessedAt = new Date();

      await journey.save();
      return true;
    } catch (error) {
      console.error('Error updating journey ATS score:', error);
      return false;
    }
  }

  /**
   * Complete CV Journey
   */
  static async completeJourney(journeyId: string): Promise<boolean> {
    try {
      const journey = await CVJourney.findById(journeyId);
      if (!journey) return false;

      journey.status = 'completed';
      journey.currentStep = 5; // Move to final step
      journey.steps[4].status = 'completed'; // Mark download as completed
      journey.metadata.completedAt = new Date();
      journey.metadata.updatedAt = new Date();
      journey.metadata.lastAccessedAt = new Date();

      await journey.save();
      return true;
    } catch (error) {
      console.error('Error completing journey:', error);
      return false;
    }
  }

  /**
   * Get Master CV for a user
   */
  static async getMasterCV(userId: string): Promise<any> {
    try {
      const masterCV = await CV.findOne({ userId, isMaster: true });
      return masterCV;
    } catch (error) {
      console.error('Error getting master CV:', error);
      return null;
    }
  }

  /**
   * Create a tailored CV from Master CV
   */
  static async createTailoredCVFromMaster(masterCVId: string, jobId: string, userId: string, title: string): Promise<string | null> {
    try {
      const masterCV = await CV.findById(masterCVId);
      if (!masterCV) return null;

      // Create new CV with Master CV data
      const tailoredCV = new CV({
        userId,
        title,
        cvData: masterCV.cvData,
        status: 'draft',
        version: 1,
        isMaster: false,
        styling: masterCV.styling,
        metadata: {
          lastModified: new Date(),
          createdFrom: masterCV._id,
          tags: [],
          isPublic: false,
          viewCount: 0,
          downloadCount: 0,
          starred: false
        }
      });

      await tailoredCV.save();

      // Link to CV Journey
      const journey = await CVJourney.findOne({ jobId, userId });
      if (journey) {
        await this.linkCVToJourney(journey._id.toString(), tailoredCV._id.toString());
      }

      return tailoredCV._id.toString();
    } catch (error) {
      console.error('Error creating tailored CV from master:', error);
      return null;
    }
  }

  /**
   * Validate CV Journey relationships
   */
  static async validateJourneyRelationships(journeyId: string): Promise<{
    isValid: boolean;
    issues: string[];
    journey?: CVJourneyRelationship;
  }> {
    try {
      const journey = await CVJourney.findById(journeyId);
      if (!journey) {
        return { isValid: false, issues: ['Journey not found'] };
      }

      const issues: string[] = [];

      // Check if job exists
      const job = await JobApplication.findById(journey.jobId);
      if (!job) {
        issues.push('Linked job not found');
      }

      // Check if CV exists (if linked)
      if (journey.cvId) {
        const cv = await CV.findById(journey.cvId);
        if (!cv) {
          issues.push('Linked CV not found');
        }
      }

      // Check if Cover Letter exists (if linked)
      if (journey.coverLetterId) {
        const coverLetter = await CoverLetter.findById(journey.coverLetterId);
        if (!coverLetter) {
          issues.push('Linked Cover Letter not found');
        }
      }

      const journeyData: CVJourneyRelationship = {
        journeyId: journey._id.toString(),
        jobId: journey.jobId,
        cvId: journey.cvId,
        coverLetterId: journey.coverLetterId,
        atsScore: journey.atsScore,
        userId: journey.userId,
        jobTitle: journey.jobTitle,
        company: journey.company,
        status: journey.status,
        currentStep: journey.currentStep,
        createdAt: journey.createdAt,
        updatedAt: journey.updatedAt
      };

      return {
        isValid: issues.length === 0,
        issues,
        journey: journeyData
      };
    } catch (error) {
      console.error('Error validating journey relationships:', error);
      return { isValid: false, issues: ['Validation error'] };
    }
  }
}
