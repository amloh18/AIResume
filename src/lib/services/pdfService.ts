import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { templateRendererService } from './templateRendererService';
import { rendererHealthService } from './rendererHealthService';
import { pdfCacheService } from './pdfCacheService';
import { fileProtectionService } from './fileProtectionService';
import { BaseService } from './baseService';
import { puppeteerPoolService } from './puppeteerPoolService';
import { configService } from './configService';
import { metricsService } from './metricsService';
import { logger } from '@/lib/structured-logger';

export interface PDFGenerationOptions {
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  format?: 'pdf' | 'docx' | 'doc';
  password?: string;
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
}

export class PDFService extends BaseService {
  private static instance: PDFService;

  private constructor() {
    super('PDFService');
  }

  static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  /**
   * Generate PDF from CV data and template (enhanced version)
   * Uses TemplateRenderer to match preview exactly
   */
  static async generatePDF(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    const instance = PDFService.getInstance();
    return instance.generatePDFInternal(cvData, template, options);
  }

  private async generatePDFInternal(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    return this.timeOperation('generatePDF', async () => {
      const config = configService.getPDFConfig();
      const cacheConfig = config.cache;

      // Check cache first
      const cacheKey = pdfCacheService.generateCacheKey(
        cvData,
        template,
        options.paperSize || 'A4',
        options.format || 'pdf'
      );

      const cached = await pdfCacheService.get(cacheKey);
      if (cached) {
        await metricsService.trackOperation(
          this.serviceName,
          'generatePDF',
          0,
          true,
          undefined,
          { cached: true }
        );
        return cached;
      }

      // Generate PDF with retry logic
      return this.withRetry(
        async () => {
          // Check renderer health
          const isHealthy = await rendererHealthService.checkHealth();
          if (!isHealthy) {
            logger.warn(`${this.serviceName}: Renderer health check failed, using fallback`);
            return await this.generatePDFFallback(cvData, template, options);
          }

          // Render template to HTML
          const html = await templateRendererService.renderToHTML(cvData, template, {
            paperSize: options.paperSize || 'A4',
            orientation: options.orientation || 'portrait',
            sectionOrder: options.sectionOrder,
            sectionVisibility: options.sectionVisibility
          });

          // Generate PDF from HTML using Puppeteer pool
          let pdfBuffer: Buffer;
          try {
            pdfBuffer = await this.generatePDFFromHTML(cvData, html, options);
          } catch (puppeteerError) {
            logger.error(`${this.serviceName}: Puppeteer PDF generation failed`, puppeteerError instanceof Error ? puppeteerError : new Error(String(puppeteerError)));
            // Fallback to alternative method
            return await this.generatePDFFallback(cvData, template, options);
          }

          // Apply protection if password provided
          if (options.password) {
            pdfBuffer = await fileProtectionService.protectPDF(pdfBuffer, options.password);
          }

          const blob = new Blob([pdfBuffer], { type: 'application/pdf' });

          // Cache the result
          await pdfCacheService.set(cacheKey, blob, cacheConfig.ttl);

          return blob;
        },
        configService.getRetryConfig(),
        { cvId: (cvData as any).id, templateId: template?.id || template?._id }
      );
    });
  }

  /**
   * Generate PDF from HTML using Puppeteer pool
   */
  private async generatePDFFromHTML(
    cvData: UnifiedCVDataStructure,
    html: string,
    options: PDFGenerationOptions
  ): Promise<Buffer> {
    const config = configService.getPDFConfig().puppeteer;
    const browser = await puppeteerPoolService.getBrowser();

    try {
      const page = await browser.newPage();

      try {
        // Set timeout
        page.setDefaultTimeout(config.timeout);

        // Set content
        await page.setContent(html, {
          waitUntil: 'networkidle0'
        });

        // Extract name for PDF metadata
        const name = (cvData.basics?.name || 'Resume').trim();
        const title = `${name} - Resume`;

        // Generate text-based PDF (not image-based) for ATS compatibility
        const pdfBuffer = await page.pdf({
          format: options.paperSize || 'A4',
          landscape: options.orientation === 'landscape',
          printBackground: true,
          margin: {
            top: '0mm',
            right: '0mm',
            bottom: '0mm',
            left: '0mm'
          },
          // Ensure text is selectable (not rendered as image)
          preferCSSPageSize: true,
          // Add metadata for ATS compatibility (Critical Action Item - Edge Case #36)
          displayHeaderFooter: false,
          // Ensure proper encoding
          tagged: true, // PDF/A compliance for better ATS parsing
          // Inject PDF metadata for ATS compatibility
          title: title,
          author: name,
          subject: 'Resume',
          keywords: 'Resume, CV, Curriculum Vitae',
          creator: 'CVCircle.io',
          producer: 'CVCircle.io'
        });

        return Buffer.from(pdfBuffer);
      } finally {
        await page.close();
      }
    } finally {
      await puppeteerPoolService.releaseBrowser(browser);
    }
  }

  /**
   * Fallback PDF generation using jsPDF (simpler but less accurate)
   */
  private async generatePDFFallback(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    options: PDFGenerationOptions
  ): Promise<Blob> {
    console.log('Using fallback PDF generation');

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: options.orientation === 'landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: options.paperSize === 'Letter' ? 'letter' : 'a4'
    });

    // Set font
    doc.setFont('helvetica');

    // Header
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text(cvData.basics.name || '', 20, 30);

    // Contact info
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    let yPos = 40;
    if (cvData.basics.email) {
      doc.text(cvData.basics.email, 20, yPos);
      yPos += 7;
    }
    if (cvData.basics.phone) {
      doc.text(cvData.basics.phone, 20, yPos);
      yPos += 7;
    }
    if (cvData.basics.location?.city) {
      doc.text(cvData.basics.location.city, 20, yPos);
      yPos += 7;
    }

    // Summary
    if (cvData.basics.summary) {
      yPos += 10;
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('Professional Summary', 20, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      const summaryLines = doc.splitTextToSize(cvData.basics.summary, 170);
      doc.text(summaryLines, 20, yPos);
      yPos += summaryLines.length * 7 + 10;
    }

    // Experience
    if (cvData.work && cvData.work.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('Work Experience', 20, yPos);
      yPos += 10;

      cvData.work.forEach((exp) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text(exp.position, 20, yPos);
        yPos += 7;

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`${exp.name} | ${exp.startDate} - ${exp.endDate || 'Present'}`, 20, yPos);
        yPos += 7;

        if (exp.summary) {
          const descLines = doc.splitTextToSize(exp.summary, 170);
          doc.text(descLines, 20, yPos);
          yPos += descLines.length * 7;
        }

        yPos += 5;
      });
    }

    // Education
    if (cvData.education && cvData.education.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('Education', 20, yPos);
      yPos += 10;

      cvData.education.forEach((edu) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text(`${edu.studyType} ${edu.area && `in ${edu.area}`}`, 20, yPos);
        yPos += 7;

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`${edu.institution} | ${edu.startDate} - ${edu.endDate || 'Present'}`, 20, yPos);
        yPos += 10;
      });
    }

    // Skills
    if (cvData.skills && cvData.skills.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('Skills', 20, yPos);
      yPos += 10;

      cvData.skills.forEach((skill) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text(`${skill.category}: ${skill.skills.join(', ')}`, 20, yPos);
        yPos += 7;
      });
    }

    return doc.output('blob');
  }

  static downloadPDF(blob: Blob, filename: string = 'cv.pdf') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
