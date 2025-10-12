import JSZip from 'jszip';
import { PDFService } from './pdfService';

export interface FileSizeEstimates {
  cv: number;
  coverLetter: number;
  jobDescription: number;
  total: number;
}

export interface JourneyData {
  id: string;
  jobTitle: string;
  company: string;
  cvId?: string;
  coverLetterId?: string;
  jobId: string;
  atsScore?: number;
  completedAt?: Date;
  journeyDuration?: number;
}

export interface JobData {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  requirements?: string;
  qualifications?: string;
  benefits?: string;
  url?: string;
  deadline?: Date;
}

export class ZipDownloadService {
  /**
   * Generate file size estimates for download confirmation
   */
  static async getFileSizeEstimates(journeyData: JourneyData): Promise<FileSizeEstimates> {
    // Estimate file sizes based on typical document lengths
    const cvSize = 150000; // ~150KB for CV PDF
    const coverLetterSize = 50000; // ~50KB for cover letter PDF
    const jobDescriptionSize = 80000; // ~80KB for job description PDF
    const summarySize = 60000; // ~60KB for summary PDF
    const zipOverhead = 10000; // ~10KB for ZIP overhead

    return {
      cv: cvSize,
      coverLetter: coverLetterSize,
      jobDescription: jobDescriptionSize,
      total: cvSize + coverLetterSize + jobDescriptionSize + summarySize + zipOverhead
    };
  }

  /**
   * Generate ZIP file containing all application documents
   */
  static async generateApplicationZip(
    journeyData: JourneyData,
    jobData: JobData,
    cvData?: any,
    coverLetterData?: any
  ): Promise<Blob> {
    const zip = new JSZip();

    try {
      // Generate CV PDF
      if (cvData && journeyData.cvId) {
        const cvPdf = await PDFService.generatePDF(cvData, {}); // Use default template
        zip.file(`${journeyData.jobTitle} - CV.pdf`, cvPdf);
      }

      // Generate Cover Letter PDF
      if (coverLetterData && journeyData.coverLetterId) {
        const coverLetterPdf = await PDFService.generateCoverLetterPDF(coverLetterData);
        zip.file(`${journeyData.jobTitle} - Cover Letter.pdf`, coverLetterPdf);
      }

      // Generate Job Description PDF
      const jobDescriptionPdf = await this.generateJobDescriptionPDF(jobData);
      zip.file(`${journeyData.jobTitle} - Job Description.pdf`, jobDescriptionPdf);

      // Generate Application Summary PDF
      const summaryPdf = await this.generateApplicationSummaryPDF(journeyData, jobData);
      zip.file(`${journeyData.jobTitle} - Application Summary.pdf`, summaryPdf);

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      return zipBlob;

    } catch (error) {
      console.error('Error generating application ZIP:', error);
      throw new Error('Failed to generate application files');
    }
  }

  /**
   * Generate individual file (CV, Cover Letter, or Job Description)
   */
  static async generateIndividualFile(
    type: 'cv' | 'coverLetter' | 'jobDescription',
    journeyData: JourneyData,
    jobData: JobData,
    cvData?: any,
    coverLetterData?: any
  ): Promise<Blob> {
    switch (type) {
      case 'cv':
        if (!cvData || !journeyData.cvId) {
          throw new Error('CV data not available');
        }
        return await PDFService.generatePDF(cvData, {});

      case 'coverLetter':
        if (!coverLetterData || !journeyData.coverLetterId) {
          throw new Error('Cover letter data not available');
        }
        return await PDFService.generateCoverLetterPDF(coverLetterData);

      case 'jobDescription':
        return await this.generateJobDescriptionPDF(jobData);

      default:
        throw new Error('Invalid file type');
    }
  }

  /**
   * Generate formatted Job Description PDF
   */
  private static async generateJobDescriptionPDF(jobData: JobData): Promise<Blob> {
    // This would use jsPDF to create a formatted job description
    // For now, return a simple text-based PDF
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(jobData.title, 20, 30);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(jobData.company, 20, 45);
    
    if (jobData.location) {
      doc.text(jobData.location, 20, 55);
    }

    // Job Description
    if (jobData.description) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Job Description', 20, 75);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const descriptionLines = doc.splitTextToSize(jobData.description, 170);
      doc.text(descriptionLines, 20, 90);
    }

    // Requirements
    if (jobData.requirements) {
      const yPos = jobData.description ? 120 : 90;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Requirements', 20, yPos);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const requirementsLines = doc.splitTextToSize(jobData.requirements, 170);
      doc.text(requirementsLines, 20, yPos + 15);
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Saved: ${new Date().toLocaleDateString()}`, 20, pageHeight - 20);
    if (jobData.url) {
      doc.text(`URL: ${jobData.url}`, 20, pageHeight - 10);
    }

    return doc.output('blob');
  }

  /**
   * Generate Application Summary PDF
   */
  private static async generateApplicationSummaryPDF(
    journeyData: JourneyData,
    jobData: JobData
  ): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Application Summary - ${journeyData.jobTitle}`, 20, 30);

    // Journey Overview
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Journey Overview', 20, 50);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Job Title: ${journeyData.jobTitle}`, 20, 65);
    doc.text(`Company: ${journeyData.company}`, 20, 75);
    doc.text(`Journey ID: ${journeyData.id}`, 20, 85);
    
    if (journeyData.completedAt) {
      doc.text(`Completed: ${journeyData.completedAt.toLocaleDateString()}`, 20, 95);
    }

    if (journeyData.journeyDuration) {
      const hours = Math.floor(journeyData.journeyDuration / 60);
      const minutes = journeyData.journeyDuration % 60;
      doc.text(`Duration: ${hours}h ${minutes}m`, 20, 105);
    }

    // ATS Score
    if (journeyData.atsScore !== undefined) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ATS Score', 20, 125);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Score: ${journeyData.atsScore}%`, 20, 140);
    }

    // Documents
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Included Documents', 20, 160);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('✓ CV (PDF)', 20, 175);
    doc.text('✓ Cover Letter (PDF)', 20, 185);
    doc.text('✓ Job Description (PDF)', 20, 195);
    doc.text('✓ Application Summary (PDF)', 20, 205);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, pageHeight - 20);

    return doc.output('blob');
  }

  /**
   * Generate Cover Letter PDF (placeholder - would use actual cover letter service)
   */
  private static async generateCoverLetterPDF(coverLetterData: any): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Simple cover letter PDF generation
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Cover Letter', 20, 30);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    if (coverLetterData.content) {
      const lines = doc.splitTextToSize(coverLetterData.content, 170);
      doc.text(lines, 20, 50);
    } else {
      doc.text('Cover letter content not available', 20, 50);
    }

    return doc.output('blob');
  }
}
