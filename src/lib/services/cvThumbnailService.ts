import { getConnection } from '@/lib/database';
import CV from '@/models/CV';
import Template from '@/models/Template';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getS3PublicUrl } from '@/lib/s3-client';
import { getTemplateById } from '@/lib/templates/template-utils';
import { normalizeCvDataForCanvas } from '@/lib/utils/cv-canvas-normalizer';
import mongoose from 'mongoose';

/**
 * Service to generate and save CV thumbnails to S3
 */
export class CVThumbnailService {
  static async saveProvidedThumbnailSvg(
    cvId: string,
    userId: string,
    svgContent: string
  ): Promise<string | null> {
    try {
      await getConnection();

      const cv = await CV.findOne({ _id: cvId, userId });
      if (!cv) {
        console.log('❌ CVThumbnailService - CV not found for provided SVG:', { cvId, userId });
        return null;
      }

      const normalizedSvg = normalizeSvgPayload(svgContent);
      if (!normalizedSvg) {
        console.warn('⚠️ CVThumbnailService - Provided SVG payload was empty');
        return null;
      }

      const thumbnailUrl = await this.uploadThumbnailSvg({
        svgContent: normalizedSvg,
        userId: cv.userId?.toString() || userId,
        cvId: cv._id?.toString() || cvId,
        keyPrefix: 'cv-snapshot-',
      });

      await CV.findByIdAndUpdate(cvId, {
        'metadata.thumbnailUrl': thumbnailUrl,
        'metadata.thumbnailGeneratedAt': new Date()
      });

      return thumbnailUrl;
    } catch (error) {
      console.error('❌ CVThumbnailService - Error saving provided SVG thumbnail:', error);
      return null;
    }
  }

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
      } else if (mongoose.Types.ObjectId.isValid(templateIdStr)) {
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
  private static async generateCVThumbnail(cv: any, template: any): Promise<string | null> {
    try {
      // Generate SVG-based thumbnail
      const svgContent = this.generateCVThumbnailSVG(cv, template);
      return await this.uploadThumbnailSvg({
        svgContent,
        userId: cv.userId?.toString() || 'unknown',
        cvId: cv._id?.toString() || 'unknown',
      });
    } catch (error) {
      console.error('❌ CVThumbnailService - Error creating CV thumbnail:', error);
      return null;
    }
  }

  private static async uploadThumbnailSvg({
    svgContent,
    userId,
    cvId,
    keyPrefix = '',
  }: {
    svgContent: string;
    userId: string;
    cvId: string;
    keyPrefix?: string;
  }): Promise<string | null> {
    try {
      const s3Client = getS3Client();
      const timestamp = Date.now();
      const s3Key = `thumbnails/${userId}/${keyPrefix}${cvId}-${timestamp}.svg`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
        ContentType: 'image/svg+xml',
        Body: Buffer.from(svgContent),
        Metadata: {
          cvId,
          userId,
          generatedAt: new Date().toISOString(),
        },
      });

      await s3Client.send(command);
      return getS3PublicUrl(s3Key);
    } catch (error: any) {
      const errorCode = error?.Code || error?.name || '';
      console.error(`❌ S3 thumbnail upload failed for CV ${cvId}:`, {
        code: errorCode,
        message: error?.message,
        fault: error?.['$fault'],
      });
      // Return null instead of crashing — the caller will handle missing thumbnails gracefully
      return null;
    }
  }

  /**
   * Generate SVG content for CV thumbnail matching the layout of the template
   */
  private static generateCVThumbnailSVG(cv: any, template: any): string {
    const cvData = normalizeCvDataForCanvas(cv.cvData) || cv.cvData || {};
    const templateStyles = template.globalStyles || {};
    
    const width = 300;
    const height = 400;
    const padding = 15;
    
    // Get CV data
    const name = cvData.basics?.name || 'Your Name';
    const title = cvData.basics?.label || cvData.basics?.title || 'Professional Title';
    const email = cvData.basics?.email || 'email@example.com';
    const phone = cvData.basics?.phone || 'Phone';
    
    // Get work experience (first 2 items)
    const workItems = (cvData.experience || cvData.work || []).slice(0, 2);
    
    // Get education (first 2 items)
    const educationItems = cvData.education?.slice(0, 2) || [];
    
    // Get skills
    const skillsList = (cvData.skills || [])
      .map((skill: any) => skill.skillsText || skill.name || skill.category || skill)
      .filter(Boolean);
    const skillsString = skillsList.slice(0, 8).join(', ');
    
    // Template colors and styles
    const primaryColor = templateStyles.primaryColor || '#1e293b';
    const backgroundColor = templateStyles.backgroundColor || '#ffffff';
    const fontFamily = templateStyles.fontFamily || 'Arial, sans-serif';
    
    // Extract template accent color if available
    const accentColor = templateStyles.accentColor || templateStyles.secondaryColor || primaryColor;

    // Detect layout configuration from template
    const isTwoColumn = template.layoutType === 'two-column' || 
                        template.layoutType === 'sidebar-left' || 
                        template.layoutType === 'sidebar-right' || 
                        ['tpl-2', 'tpl-3', 'tpl-4', 'tpl-5', 'tpl-9', 'tpl-10', 'tpl-11', 'tpl-12', 'tpl-13', 'tpl-15'].includes(template.id);
                        
    const isDarkSidebar = template.id === 'tpl-9' || template.id === 'tpl-15' || template.layoutType?.includes('dark');
    const isCentered = !isTwoColumn && (template.id === 'tpl-6' || template.id === 'tpl-14');

    let svgInnerContent = '';

    if (isTwoColumn) {
      // Sidebar layout configuration
      const sidebarWidth = 95;
      const sidebarBg = isDarkSidebar ? primaryColor : '#f8fafc';
      const sidebarTextColor = isDarkSidebar ? '#e2e8f0' : '#475569';
      const sidebarHeadingColor = isDarkSidebar ? '#ffffff' : accentColor;
      
      const skillsSplit = skillsList.slice(0, 6);

      svgInnerContent = `
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
        <!-- Sidebar background -->
        <rect x="0" y="0" width="${sidebarWidth}" height="${height}" fill="${sidebarBg}" stroke="#e5e7eb" stroke-width="0.5"/>
        
        <!-- Sidebar Content -->
        <!-- Contact Section -->
        <text x="10" y="30" class="cv-text cv-sidebar-heading" fill="${sidebarHeadingColor}">Contact</text>
        <line x1="10" y1="35" x2="${sidebarWidth - 10}" y2="35" stroke="${sidebarHeadingColor}" stroke-width="0.5" opacity="0.4"/>
        
        ${email ? `<text x="10" y="47" class="cv-text cv-sidebar-small" fill="${sidebarTextColor}">${this.escapeXml(email.length > 16 ? email.substring(0, 14) + '..' : email)}</text>` : ''}
        ${phone ? `<text x="10" y="58" class="cv-text cv-sidebar-small" fill="${sidebarTextColor}">${this.escapeXml(phone)}</text>` : ''}
        
        <!-- Skills Section -->
        ${skillsSplit.length > 0 ? `
          <text x="10" y="85" class="cv-text cv-sidebar-heading" fill="${sidebarHeadingColor}">Skills</text>
          <line x1="10" y1="90" x2="${sidebarWidth - 10}" y2="90" stroke="${sidebarHeadingColor}" stroke-width="0.5" opacity="0.4"/>
          ${skillsSplit.map((s: string, idx: number) => `
            <text x="10" y="${102 + idx * 12}" class="cv-text cv-sidebar-small" fill="${sidebarTextColor}">${this.escapeXml(s.length > 15 ? s.substring(0, 13) + '..' : s)}</text>
          `).join('')}
        ` : ''}

        <!-- Main Area Content -->
        <!-- Header -->
        <text x="${sidebarWidth + 12}" y="32" class="cv-text cv-title" fill="${primaryColor}">${this.escapeXml(name)}</text>
        <text x="${sidebarWidth + 12}" y="45" class="cv-text cv-subtitle" fill="${accentColor}">${this.escapeXml(title)}</text>
        
        <!-- Work Experience -->
        ${workItems.length > 0 ? `
          <text x="${sidebarWidth + 12}" y="78" class="cv-text cv-section" fill="${accentColor}">Experience</text>
          <line x1="${sidebarWidth + 12}" y1="83" x2="${width - padding}" y2="83" stroke="${accentColor}" stroke-width="0.75"/>
          ${workItems.map((job: any, index: number) => `
            <text x="${sidebarWidth + 12}" y="${95 + index * 42}" class="cv-text cv-body" fill="${primaryColor}">${this.escapeXml(job.position || 'Position')}</text>
            <text x="${sidebarWidth + 12}" y="${106 + index * 42}" class="cv-text cv-small" fill="#475569">${this.escapeXml(job.name || 'Company')}</text>
            <text x="${sidebarWidth + 12}" y="${116 + index * 42}" class="cv-text cv-mini" fill="#64748b">${this.escapeXml(job.startDate || '')} - ${this.escapeXml(job.endDate || 'Present')}</text>
          `).join('')}
        ` : ''}

        <!-- Education -->
        ${educationItems.length > 0 ? `
          <text x="${sidebarWidth + 12}" y="185" class="cv-text cv-section" fill="${accentColor}">Education</text>
          <line x1="${sidebarWidth + 12}" y1="190" x2="${width - padding}" y2="190" stroke="${accentColor}" stroke-width="0.75"/>
          ${educationItems.map((edu: any, index: number) => `
            <text x="${sidebarWidth + 12}" y="${202 + index * 36}" class="cv-text cv-body" fill="${primaryColor}">${this.escapeXml(edu.institution || 'Institution')}</text>
            <text x="${sidebarWidth + 12}" y="${213 + index * 36}" class="cv-text cv-small" fill="#475569">${this.escapeXml(edu.area || 'Field of Study')}</text>
            <text x="${sidebarWidth + 12}" y="${223 + index * 36}" class="cv-text cv-mini" fill="#64748b">${this.escapeXml(edu.startDate || '')} - ${this.escapeXml(edu.endDate || '')}</text>
          `).join('')}
        ` : ''}
      `;
    } else {
      // One-column layout (Left-aligned or Centered)
      const contentX = isCentered ? width / 2 : padding;
      const textAnchor = isCentered ? 'middle' : 'start';

      svgInnerContent = `
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
        <!-- Accent top bar -->
        <rect width="${width}" height="4" fill="${accentColor}"/>
        
        <!-- Header -->
        <text x="${contentX}" y="28" class="cv-text cv-title" text-anchor="${textAnchor}" fill="${primaryColor}">${this.escapeXml(name)}</text>
        <text x="${contentX}" y="42" class="cv-text cv-subtitle" text-anchor="${textAnchor}" fill="${accentColor}">${this.escapeXml(title)}</text>
        <text x="${contentX}" y="55" class="cv-text cv-small" text-anchor="${textAnchor}" fill="#64748b">${this.escapeXml(email)} ${phone ? `| ${phone}` : ''}</text>
        
        <!-- Work Experience -->
        ${workItems.length > 0 ? `
          <text x="${padding}" y="80" class="cv-text cv-section" fill="${accentColor}">Work Experience</text>
          <line x1="${padding}" y1="85" x2="${width - padding}" y2="85" stroke="${accentColor}" stroke-width="0.75"/>
          ${workItems.map((job: any, index: number) => `
            <text x="${padding}" y="${98 + index * 42}" class="cv-text cv-body" fill="${primaryColor}">${this.escapeXml(job.position || 'Position')}</text>
            <text x="${width - padding}" y="${98 + index * 42}" class="cv-text cv-mini" text-anchor="end" fill="#64748b">${this.escapeXml(job.startDate || '')} - ${this.escapeXml(job.endDate || 'Present')}</text>
            <text x="${padding}" y="${110 + index * 42}" class="cv-text cv-small" fill="#475569">${this.escapeXml(job.name || 'Company')}</text>
          `).join('')}
        ` : ''}
        
        <!-- Education -->
        ${educationItems.length > 0 ? `
          <text x="${padding}" y="185" class="cv-text cv-section" fill="${accentColor}">Education</text>
          <line x1="${padding}" y1="190" x2="${width - padding}" y2="190" stroke="${accentColor}" stroke-width="0.75"/>
          ${educationItems.map((edu: any, index: number) => `
            <text x="${padding}" y="${203 + index * 36}" class="cv-text cv-body" fill="${primaryColor}">${this.escapeXml(edu.institution || 'Institution')}</text>
            <text x="${width - padding}" y="${203 + index * 36}" class="cv-text cv-mini" text-anchor="end" fill="#64748b">${this.escapeXml(edu.startDate || '')} - ${this.escapeXml(edu.endDate || '')}</text>
            <text x="${padding}" y="${215 + index * 36}" class="cv-text cv-small" fill="#475569">${this.escapeXml(edu.area || 'Field of Study')}</text>
          `).join('')}
        ` : ''}
        
        <!-- Skills -->
        ${skillsString ? `
          <text x="${padding}" y="280" class="cv-text cv-section" fill="${accentColor}">Skills</text>
          <line x1="${padding}" y1="285" x2="${width - padding}" y2="285" stroke="${accentColor}" stroke-width="0.75"/>
          <text x="${padding}" y="298" class="cv-text cv-small" fill="#475569">${this.escapeXml(skillsString.length > 60 ? skillsString.substring(0, 57) + '...' : skillsString)}</text>
        ` : ''}
      `;
    }

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .cv-text { font-family: ${fontFamily}; }
            .cv-title { font-size: 13.5px; font-weight: 800; }
            .cv-subtitle { font-size: 9.5px; font-weight: 600; }
            .cv-body { font-size: 8.5px; font-weight: 700; }
            .cv-small { font-size: 7.5px; }
            .cv-mini { font-size: 6.5px; }
            .cv-section { font-size: 10px; font-weight: 800; letter-spacing: 0.5px; }
            .cv-sidebar-heading { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .cv-sidebar-small { font-size: 7px; font-weight: 500; }
          </style>
        </defs>
        
        ${svgInnerContent}
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

function normalizeSvgPayload(svgContent: string): string {
  if (!svgContent) return '';

  if (svgContent.startsWith('data:image/svg+xml;base64,')) {
    return Buffer.from(svgContent.replace('data:image/svg+xml;base64,', ''), 'base64').toString('utf-8');
  }

  if (svgContent.startsWith('data:image/svg+xml;charset=utf-8,')) {
    return decodeURIComponent(svgContent.replace('data:image/svg+xml;charset=utf-8,', ''));
  }

  if (svgContent.startsWith('data:image/svg+xml,')) {
    return decodeURIComponent(svgContent.replace('data:image/svg+xml,', ''));
  }

  return svgContent;
}
