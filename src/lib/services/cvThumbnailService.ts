import { getConnection } from '@/lib/database';
import CV from '@/models/CV';
import Template from '@/models/Template';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getS3PublicUrl } from '@/lib/s3-client';
import { getTemplateById } from '@/lib/templates/template-utils';

/**
 * Service to generate and save CV thumbnails to S3
 */
export class CVThumbnailService {
  /**
   * Generate and save thumbnail for a CV
   * @param cvId - CV ID
   * @param userId - User ID
   * @param forceRegenerate - Force regeneration even if recent thumbnail exists
   * @returns Thumbnail URL or null
   */
  static async generateAndSaveThumbnail(
    cvId: string,
    userId: string,
    forceRegenerate: boolean = false
  ): Promise<string | null> {
    try {
      await getConnection();
      
      // Find the CV
      const cv = await CV.findOne({ _id: cvId, userId });
      if (!cv) {
        console.log('❌ CVThumbnailService - CV not found:', { cvId, userId });
        return null;
      }

      // Check if thumbnail is recent (less than 7 days old) and not forcing regeneration
      if (!forceRegenerate) {
        const now = new Date();
        const thumbnailAge = cv.metadata?.thumbnailGeneratedAt 
          ? now.getTime() - new Date(cv.metadata.thumbnailGeneratedAt).getTime()
          : Infinity;
        
        const isThumbnailRecent = thumbnailAge < 7 * 24 * 60 * 60 * 1000; // 7 days

        if (cv.metadata?.thumbnailUrl && isThumbnailRecent) {
          console.log('✅ CVThumbnailService - Using existing recent thumbnail');
          return cv.metadata.thumbnailUrl;
        }
      }

      // Get the template
      let template: any = null;
      
      // Check hardcoded templates first
      const templateIdStr = cv.templateId?.toString() || '';
      const hardcodedTemplate = getTemplateById(templateIdStr);
      
      if (hardcodedTemplate) {
        template = hardcodedTemplate;
      } else {
        // Try database template
        template = await Template.findById(cv.templateId);
      }
      
      if (!template) {
        console.log('❌ CVThumbnailService - Template not found:', { templateId: cv.templateId });
        return null;
      }

      // Generate thumbnail
      const thumbnailUrl = await this.generateCVThumbnail(cv, template);
      
      if (thumbnailUrl) {
        // Update CV with new thumbnail
        await CV.findByIdAndUpdate(cvId, {
          'metadata.thumbnailUrl': thumbnailUrl,
          'metadata.thumbnailGeneratedAt': new Date()
        });
        
        console.log('✅ CVThumbnailService - Thumbnail generated and saved:', thumbnailUrl);
        return thumbnailUrl;
      }
      
      return null;
    } catch (error) {
      console.error('❌ CVThumbnailService - Error generating thumbnail:', error);
      return null;
    }
  }

  /**
   * Generate SVG thumbnail and upload to S3
   */
  private static async generateCVThumbnail(cv: any, template: any): Promise<string> {
    try {
      // Generate SVG-based thumbnail
      const svgContent = this.generateCVThumbnailSVG(cv, template);
      
      // Get S3 client
      const s3Client = getS3Client();

      // Create S3 key for thumbnail
      const userId = cv.userId?.toString() || 'unknown';
      const cvId = cv._id?.toString() || 'unknown';
      const timestamp = Date.now();
      const s3Key = `thumbnails/${userId}/${cvId}-${timestamp}.svg`;

      // Upload SVG to S3
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
        ContentType: 'image/svg+xml',
        Body: Buffer.from(svgContent),
        Metadata: {
          cvId: cvId,
          userId: userId,
          generatedAt: new Date().toISOString(),
        },
      });

      await s3Client.send(command);

      // Return public URL
      return getS3PublicUrl(s3Key);
    } catch (error) {
      console.error('❌ CVThumbnailService - Error creating CV thumbnail:', error);
      return '';
    }
  }

  /**
   * Generate SVG content for CV thumbnail
   */
  private static generateCVThumbnailSVG(cv: any, template: any): string {
    const cvData = cv.cvData || {};
    const templateStyles = template.globalStyles || {};
    
    const width = 300;
    const height = 400;
    const padding = 15;
    
    // Get CV data
    const name = cvData.basics?.name || 'Your Name';
    const title = cvData.basics?.label || 'Professional Title';
    const email = cvData.basics?.email || 'email@example.com';
    const phone = cvData.basics?.phone || 'Phone';
    
    // Get work experience (first 2 items)
    const workItems = cvData.work?.slice(0, 2) || [];
    
    // Get education (first 2 items)
    const educationItems = cvData.education?.slice(0, 2) || [];
    
    // Get skills (first 8 items)
    const skills = cvData.skills?.slice(0, 8).map((skill: any) => skill.name || skill).join(', ') || '';
    
    // Template colors and styles
    const primaryColor = templateStyles.primaryColor || '#333';
    const backgroundColor = templateStyles.backgroundColor || '#fff';
    const fontFamily = templateStyles.fontFamily || 'Arial, sans-serif';
    const fontSize = templateStyles.fontSize || '14px';
    const lineHeight = templateStyles.lineHeight || '1.4';
    
    // Extract template accent color if available
    const accentColor = templateStyles.accentColor || primaryColor;
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .cv-text { font-family: ${fontFamily}; }
            .cv-title { font-size: 16px; font-weight: bold; fill: ${primaryColor}; }
            .cv-subtitle { font-size: 12px; fill: #666; }
            .cv-body { font-size: 10px; fill: ${primaryColor}; }
            .cv-small { font-size: 8px; fill: #666; }
            .cv-section { font-size: 12px; font-weight: bold; fill: ${accentColor}; }
          </style>
        </defs>
        
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
        
        <!-- Header -->
        <text x="${padding}" y="25" class="cv-text cv-title">${this.escapeXml(name)}</text>
        <text x="${padding}" y="40" class="cv-text cv-subtitle">${this.escapeXml(title)}</text>
        <text x="${padding}" y="55" class="cv-text cv-small">${this.escapeXml(email)} | ${this.escapeXml(phone)}</text>
        
        <!-- Work Experience -->
        ${workItems.length > 0 ? `
          <text x="${padding}" y="80" class="cv-text cv-section">Work Experience</text>
          <line x1="${padding}" y1="85" x2="${width - padding}" y2="85" stroke="${accentColor}" stroke-width="1"/>
          ${workItems.map((job: any, index: number) => `
            <text x="${padding}" y="${100 + index * 35}" class="cv-text cv-body">${this.escapeXml(job.position || 'Position')}</text>
            <text x="${padding}" y="${112 + index * 35}" class="cv-text cv-small">${this.escapeXml(job.name || 'Company')} | ${this.escapeXml(job.startDate || 'Start')} - ${this.escapeXml(job.endDate || 'End')}</text>
          `).join('')}
        ` : ''}
        
        <!-- Education -->
        ${educationItems.length > 0 ? `
          <text x="${padding}" y="${workItems.length > 0 ? 170 + workItems.length * 35 : 80}" class="cv-text cv-section">Education</text>
          <line x1="${padding}" y1="${workItems.length > 0 ? 175 + workItems.length * 35 : 85}" x2="${width - padding}" y2="${workItems.length > 0 ? 175 + workItems.length * 35 : 85}" stroke="${accentColor}" stroke-width="1"/>
          ${educationItems.map((edu: any, index: number) => `
            <text x="${padding}" y="${(workItems.length > 0 ? 190 : 100) + workItems.length * 35 + index * 25}" class="cv-text cv-body">${this.escapeXml(edu.institution || 'Institution')}</text>
            <text x="${padding}" y="${(workItems.length > 0 ? 202 : 112) + workItems.length * 35 + index * 25}" class="cv-text cv-small">${this.escapeXml(edu.area || 'Field of Study')} | ${this.escapeXml(edu.startDate || 'Start')} - ${this.escapeXml(edu.endDate || 'End')}</text>
          `).join('')}
        ` : ''}
        
        <!-- Skills -->
        ${skills ? `
          <text x="${padding}" y="${height - 30}" class="cv-text cv-section">Skills</text>
          <text x="${padding}" y="${height - 15}" class="cv-text cv-small">${this.escapeXml(skills)}</text>
        ` : ''}
      </svg>
    `;
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(text: string): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

