import { CoverLetterData } from '@/types/cv';

export interface DefaultCoverLetterService {
  ensureDefaultCoverLetter(userId: string): Promise<string>;
  getDefaultCoverLetterContent(): string;
}

class DefaultCoverLetterServiceImpl implements DefaultCoverLetterService {
  private readonly DEFAULT_TITLE = 'Master Cover Letter';
  
  /**
   * Ensures user has at least one cover letter by creating a default template if none exist
   * @param userId - The user ID
   * @returns Promise<string> - The ID of the default cover letter (existing or newly created)
   */
  async ensureDefaultCoverLetter(userId: string): Promise<string> {
    try {
      console.log('🔍 DefaultCoverLetterService - Checking for existing cover letters for user:', userId);
      
      // First, check if user has any cover letters
      const response = await fetch(`/api/cover-letters?userId=${userId}`);
      
      if (!response.ok) {
        console.error('❌ DefaultCoverLetterService - Failed to fetch cover letters:', response.status);
        throw new Error('Failed to fetch cover letters');
      }
      
      const result = await response.json();
      const existingCoverLetters = result.data?.coverLetters || [];
      
      console.log('🔍 DefaultCoverLetterService - Found existing cover letters:', existingCoverLetters.length);
      
      // If user has cover letters, return the first one for duplication
      if (existingCoverLetters.length > 0) {
        const firstCoverLetter = existingCoverLetters[0];
        console.log('✅ DefaultCoverLetterService - Using existing cover letter:', firstCoverLetter.id);
        return firstCoverLetter.id;
      }
      
      // If no cover letters exist, create a default template
      console.log('🔄 DefaultCoverLetterService - No cover letters found, creating default template');
      return await this.createDefaultTemplate(userId);
      
    } catch (error) {
      console.error('❌ DefaultCoverLetterService - Error ensuring default cover letter:', error);
      throw error;
    }
  }
  
  /**
   * Creates a default template cover letter
   * @param userId - The user ID
   * @returns Promise<string> - The ID of the newly created default cover letter
   */
  private async createDefaultTemplate(userId: string): Promise<string> {
    try {
      const defaultContent = this.getDefaultCoverLetterContent();
      
      const response = await fetch('/api/cover-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: this.DEFAULT_TITLE,
          content: defaultContent,
          status: 'draft',
          metadata: {
            isDefaultTemplate: true,
            isPublic: false,
            lastModified: new Date(),
            version: 1
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ DefaultCoverLetterService - Failed to create default template:', response.status, errorData);
        throw new Error('Failed to create default cover letter template');
      }
      
      const result = await response.json();
      const coverLetterId = result.data?.id;
      
      if (!coverLetterId) {
        throw new Error('No cover letter ID returned from creation');
      }
      
      console.log('✅ DefaultCoverLetterService - Created default template:', coverLetterId);
      return coverLetterId;
      
    } catch (error) {
      console.error('❌ DefaultCoverLetterService - Error creating default template:', error);
      throw error;
    }
  }
  
  /**
   * Returns the default body content for a new cover letter template
   * Note: This returns ONLY the body (with salutation), not header or footer
   * @returns string - Default cover letter body content
   */
  getDefaultCoverLetterContent(): string {
    // Return ONLY body content starting with salutation
    // Header and footer will be generated from CV data
    return `Dear Hiring Manager,

I am writing to express my strong interest in the [Position Title] position at [Company Name]. With my background in [Your Field/Industry] and passion for [Relevant Skills/Interests], I am excited about the opportunity to contribute to your team.

In my current role as [Current Position] at [Current Company], I have developed expertise in [Key Skills/Responsibilities]. I have successfully [Key Achievement 1] and [Key Achievement 2], which I believe would be valuable assets to your organization.

I am particularly drawn to [Company Name] because of [Specific Reason - Company Values, Mission, Recent News, etc.]. I am confident that my skills in [Relevant Skills] and my experience with [Relevant Experience] make me a strong candidate for this position.

I would welcome the opportunity to discuss how my qualifications align with your needs.`;
  }
}

// Export singleton instance
export const defaultCoverLetterService = new DefaultCoverLetterServiceImpl();
