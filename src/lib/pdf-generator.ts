/**
 * PDF Generation Utility
 * 
 * Ensures pixel-perfect representation with vector objects
 * and proper multi-page handling for CV previews
 */

import { PreviewResult, RenderedPage, RenderedSection, DesignSettings } from '@/types/design-settings';

// PDF generation options
export interface PDFGenerationOptions {
  format: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  quality: 'draft' | 'standard' | 'high' | 'print';
  includeMetadata: boolean;
  watermark?: string;
}

// PDF generation result
export interface PDFGenerationResult {
  success: boolean;
  pdfBlob?: Blob;
  downloadUrl?: string;
  error?: string;
  metadata: {
    pageCount: number;
    fileSize: number;
    generationTime: number;
    quality: string;
  };
}

/**
 * Generate PDF from preview result with high fidelity
 */
export async function generatePDFFromPreview(
  previewResult: PreviewResult,
  designSettings: DesignSettings,
  options: Partial<PDFGenerationOptions> = {}
): Promise<PDFGenerationResult> {
  const startTime = Date.now();
  
  try {
    const defaultOptions: PDFGenerationOptions = {
      format: designSettings.pageSize,
      orientation: 'portrait',
      margins: {
        top: 30.5, // 1.2 inches in mm
        bottom: 30.5,
        left: 30.5,
        right: 30.5
      },
      quality: 'print',
      includeMetadata: true,
      ...options
    };

    // Create PDF document
    const pdfDoc = await createPDFDocument(previewResult, designSettings, defaultOptions);
    
    // Generate PDF blob
    const pdfBlob = await pdfDoc.save('blob');
    const downloadUrl = URL.createObjectURL(pdfBlob);
    
    const generationTime = Date.now() - startTime;
    
    return {
      success: true,
      pdfBlob,
      downloadUrl,
      metadata: {
        pageCount: previewResult.totalPages,
        fileSize: pdfBlob.size,
        generationTime,
        quality: defaultOptions.quality
      }
    };
    
  } catch (error) {
    console.error('PDF generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        pageCount: 0,
        fileSize: 0,
        generationTime: Date.now() - startTime,
        quality: options.quality || 'standard'
      }
    };
  }
}

/**
 * Create PDF document with proper formatting
 */
async function createPDFDocument(
  previewResult: PreviewResult,
  designSettings: DesignSettings,
  options: PDFGenerationOptions
): Promise<any> {
  // This would integrate with a PDF library like jsPDF or PDFKit
  // For now, we'll create a mock implementation
  
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.format
  });

  // Set up document metadata
  if (options.includeMetadata) {
    doc.setProperties({
      title: 'CV - Professional Resume',
      subject: 'Curriculum Vitae',
      author: 'Circle CV App',
      creator: 'Circle CV App',
      producer: 'Circle CV App'
    });
  }

  // Process each page
  for (let pageIndex = 0; pageIndex < previewResult.pages.length; pageIndex++) {
    const page = previewResult.pages[pageIndex];
    
    if (pageIndex > 0) {
      doc.addPage();
    }
    
    // Render page content
    await renderPageToPDF(doc, page, designSettings, options);
  }

  return doc;
}

/**
 * Render individual page to PDF
 */
async function renderPageToPDF(
  doc: any,
  page: RenderedPage,
  designSettings: DesignSettings,
  options: PDFGenerationOptions
): Promise<void> {
  const pageWidth = options.format === 'A4' ? 210 : 216;
  const pageHeight = options.format === 'A4' ? 297 : 279;
  
  // Set up page margins
  const contentX = options.margins.left;
  const contentY = options.margins.top;
  const contentWidth = pageWidth - options.margins.left - options.margins.right;
  const contentHeight = pageHeight - options.margins.top - options.margins.bottom;

  // Set default font
  doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'normal');
  doc.setFontSize(designSettings.bodySize);

  let currentY = contentY;

  // Render each section
  for (const section of page.sections) {
    currentY = await renderSectionToPDF(
      doc,
      section,
      contentX,
      currentY,
      contentWidth,
      designSettings
    );
    
    // Add spacing between sections
    currentY += 8;
  }
}

/**
 * Render individual section to PDF
 */
async function renderSectionToPDF(
  doc: any,
  section: RenderedSection,
  x: number,
  y: number,
  width: number,
  designSettings: DesignSettings
): Promise<number> {
  let currentY = y;

  // Set font for section header
  doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'bold');
  doc.setFontSize(designSettings.sectionSize);
  doc.setTextColor(designSettings.primaryColor || '#1f2937');

  // Render section header
  const sectionTitle = getSectionTitle(section.key);
  doc.text(sectionTitle, x, currentY);
  currentY += 8;

  // Add underline
  doc.setDrawColor(designSettings.primaryColor || '#1f2937');
  doc.setLineWidth(0.5);
  doc.line(x, currentY - 2, x + width, currentY - 2);

  currentY += 4;

  // Set font for section content
  doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'normal');
  doc.setFontSize(designSettings.bodySize);
  doc.setTextColor(designSettings.secondaryColor || '#6b7280');

  // Render section content based on type
  switch (section.key) {
    case 'basics':
    case 'personal_header':
      currentY = await renderPersonalHeaderToPDF(doc, section, x, currentY, width, designSettings);
      break;
    case 'work':
    case 'professional_experience':
      currentY = await renderWorkExperienceToPDF(doc, section, x, currentY, width, designSettings);
      break;
    case 'skills':
      currentY = await renderSkillsToPDF(doc, section, x, currentY, width, designSettings);
      break;
    case 'education':
      currentY = await renderEducationToPDF(doc, section, x, currentY, width, designSettings);
      break;
    case 'projects':
      currentY = await renderProjectsToPDF(doc, section, x, currentY, width, designSettings);
      break;
    case 'languages':
      currentY = await renderLanguagesToPDF(doc, section, x, currentY, width, designSettings);
      break;
    case 'certificates':
      currentY = await renderCertificatesToPDF(doc, section, x, currentY, width, designSettings);
      break;
    default:
      currentY = await renderGenericSectionToPDF(doc, section, x, currentY, width, designSettings);
  }

  return currentY;
}

/**
 * Render personal header section
 */
async function renderPersonalHeaderToPDF(
  doc: any,
  section: RenderedSection,
  x: number,
  y: number,
  width: number,
  designSettings: DesignSettings
): Promise<number> {
  let currentY = y;
  const data = section.data;

  // Name
  doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'bold');
  doc.setFontSize(designSettings.headerSize);
  doc.setTextColor(designSettings.primaryColor || '#1f2937');
  doc.text(data.name || 'Your Name', x, currentY);
  currentY += 8;

  // Title
  doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'normal');
  doc.setFontSize(designSettings.sectionSize);
  doc.setTextColor(designSettings.secondaryColor || '#6b7280');
  doc.text(data.label || 'Professional Title', x, currentY);
  currentY += 6;

  // Contact details
  doc.setFontSize(designSettings.bodySize);
  const contactDetails = [];
  if (data.email) contactDetails.push(data.email);
  if (data.phone) contactDetails.push(data.phone);
  if (data.location?.city) contactDetails.push(data.location.city);
  
  if (contactDetails.length > 0) {
    doc.text(contactDetails.join(' • '), x, currentY);
    currentY += 6;
  }

  // Summary
  if (data.summary) {
    currentY += 4;
    const summaryLines = doc.splitTextToSize(data.summary, width);
    doc.text(summaryLines, x, currentY);
    currentY += summaryLines.length * 4;
  }

  return currentY;
}

/**
 * Render work experience section
 */
async function renderWorkExperienceToPDF(
  doc: any,
  section: RenderedSection,
  x: number,
  y: number,
  width: number,
  designSettings: DesignSettings
): Promise<number> {
  let currentY = y;
  const workData = section.data;

  for (const job of workData) {
    // Job title and company
    doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'bold');
    doc.setFontSize(designSettings.bodySize + 2);
    doc.setTextColor(designSettings.primaryColor || '#1f2937');
    doc.text(job.position || 'Position', x, currentY);
    
    // Company name
    doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'normal');
    doc.setFontSize(designSettings.bodySize);
    doc.setTextColor(designSettings.secondaryColor || '#6b7280');
    doc.text(job.name || 'Company', x + 2, currentY + 4);
    
    // Date range (right aligned)
    const dateRange = job.startDate && job.endDate ? `${job.startDate} - ${job.endDate}` : job.startDate || '';
    if (dateRange) {
      const dateWidth = doc.getTextWidth(dateRange);
      doc.text(dateRange, x + width - dateWidth, currentY);
    }
    
    currentY += 8;

    // Job summary
    if (job.summary) {
      const summaryLines = doc.splitTextToSize(job.summary, width - 4);
      doc.text(summaryLines, x + 2, currentY);
      currentY += summaryLines.length * 4;
    }

    // Job highlights
    if (job.highlights && job.highlights.length > 0) {
      for (const highlight of job.highlights) {
        doc.text(`• ${highlight}`, x + 4, currentY);
        currentY += 4;
      }
    }

    currentY += 6; // Space between jobs
  }

  return currentY;
}

/**
 * Render skills section
 */
async function renderSkillsToPDF(
  doc: any,
  section: RenderedSection,
  x: number,
  y: number,
  width: number,
  designSettings: DesignSettings
): Promise<number> {
  let currentY = y;
  const skillsData = section.data;
  const renderingStyle = section.styles?.skillsRenderingStyle || 'chip';

  switch (renderingStyle) {
    case 'chip':
      // Render skills as chips (simulated with rectangles)
      let chipX = x;
      const chipHeight = 6;
      const chipSpacing = 2;
      
      for (const skill of skillsData) {
        const skillText = skill.name;
        const textWidth = doc.getTextWidth(skillText);
        const chipWidth = textWidth + 4;
        
        // Check if chip fits on current line
        if (chipX + chipWidth > x + width) {
          chipX = x;
          currentY += chipHeight + chipSpacing;
        }
        
        // Draw chip background
        doc.setFillColor(designSettings.primaryColor || '#1f2937');
        doc.roundedRect(chipX, currentY - chipHeight + 2, chipWidth, chipHeight, 1, 1, 'F');
        
        // Draw chip text
        doc.setTextColor('#ffffff');
        doc.setFontSize(designSettings.bodySize - 2);
        doc.text(skillText, chipX + 2, currentY);
        
        chipX += chipWidth + chipSpacing;
      }
      
      currentY += chipHeight + 4;
      break;
      
    case 'inline':
      // Render skills inline
      const skillsText = skillsData.map(skill => skill.name).join(', ');
      doc.text(skillsText, x, currentY);
      currentY += 6;
      break;
      
    case 'bulleted':
      // Render skills as bulleted list
      for (const skill of skillsData) {
        doc.text(`• ${skill.name}`, x, currentY);
        currentY += 4;
      }
      break;
  }

  return currentY;
}

/**
 * Render education section
 */
async function renderEducationToPDF(
  doc: any,
  section: RenderedSection,
  x: number,
  y: number,
  width: number,
  designSettings: DesignSettings
): Promise<number> {
  let currentY = y;
  const educationData = section.data;

  for (const edu of educationData) {
    // Institution
    doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'bold');
    doc.setFontSize(designSettings.bodySize + 2);
    doc.setTextColor(designSettings.primaryColor || '#1f2937');
    doc.text(edu.institution || 'Institution', x, currentY);
    
    // Degree
    doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'normal');
    doc.setFontSize(designSettings.bodySize);
    doc.setTextColor(designSettings.secondaryColor || '#6b7280');
    doc.text(`${edu.studyType} in ${edu.area}`, x + 2, currentY + 4);
    
    // Date range (right aligned)
    const dateRange = edu.startDate && edu.endDate ? `${edu.startDate} - ${edu.endDate}` : edu.startDate || '';
    if (dateRange) {
      const dateWidth = doc.getTextWidth(dateRange);
      doc.text(dateRange, x + width - dateWidth, currentY);
    }
    
    currentY += 8;
  }

  return currentY;
}

/**
 * Render projects section
 */
async function renderProjectsToPDF(
  doc: any,
  section: RenderedSection,
  x: number,
  y: number,
  width: number,
  designSettings: DesignSettings
): Promise<number> {
  let currentY = y;
  const projectsData = section.data;

  for (const project of projectsData) {
    // Project name
    doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'bold');
    doc.setFontSize(designSettings.bodySize + 2);
    doc.setTextColor(designSettings.primaryColor || '#1f2937');
    doc.text(project.name || 'Project Name', x, currentY);
    
    // Date range (right aligned)
    const dateRange = project.startDate && project.endDate ? `${project.startDate} - ${project.endDate}` : project.startDate || '';
    if (dateRange) {
      const dateWidth = doc.getTextWidth(dateRange);
      doc.text(dateRange, x + width - dateWidth, currentY);
    }
    
    currentY += 6;

    // Project description
    if (project.description) {
      const descriptionLines = doc.splitTextToSize(project.description, width - 4);
      doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'normal');
      doc.setFontSize(designSettings.bodySize);
      doc.setTextColor(designSettings.secondaryColor || '#6b7280');
      doc.text(descriptionLines, x + 2, currentY);
      currentY += descriptionLines.length * 4;
    }

    currentY += 6; // Space between projects
  }

  return currentY;
}

/**
 * Render languages section
 */
async function renderLanguagesToPDF(
  doc: any,
  section: RenderedSection,
  x: number,
  y: number,
  width: number,
  designSettings: DesignSettings
): Promise<number> {
  let currentY = y;
  const languagesData = section.data;

  // Render languages as chips
  let chipX = x;
  const chipHeight = 6;
  const chipSpacing = 2;
  
  for (const lang of languagesData) {
    const langText = `${lang.language} (${lang.fluency})`;
    const textWidth = doc.getTextWidth(langText);
    const chipWidth = textWidth + 4;
    
    // Check if chip fits on current line
    if (chipX + chipWidth > x + width) {
      chipX = x;
      currentY += chipHeight + chipSpacing;
    }
    
    // Draw chip background
    doc.setFillColor(designSettings.primaryColor || '#1f2937');
    doc.roundedRect(chipX, currentY - chipHeight + 2, chipWidth, chipHeight, 1, 1, 'F');
    
    // Draw chip text
    doc.setTextColor('#ffffff');
    doc.setFontSize(designSettings.bodySize - 2);
    doc.text(langText, chipX + 2, currentY);
    
    chipX += chipWidth + chipSpacing;
  }
  
  currentY += chipHeight + 4;

  return currentY;
}

/**
 * Render certificates section
 */
async function renderCertificatesToPDF(
  doc: any,
  section: RenderedSection,
  x: number,
  y: number,
  width: number,
  designSettings: DesignSettings
): Promise<number> {
  let currentY = y;
  const certificatesData = section.data;

  for (const cert of certificatesData) {
    // Certificate name
    doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'bold');
    doc.setFontSize(designSettings.bodySize + 2);
    doc.setTextColor(designSettings.primaryColor || '#1f2937');
    doc.text(cert.name || 'Certificate Name', x, currentY);
    
    // Issuer
    doc.setFont(designSettings.fontFamily.replace(/,.*$/, ''), 'normal');
    doc.setFontSize(designSettings.bodySize);
    doc.setTextColor(designSettings.secondaryColor || '#6b7280');
    doc.text(cert.issuer || 'Issuer', x + 2, currentY + 4);
    
    // Date (right aligned)
    if (cert.date) {
      const dateWidth = doc.getTextWidth(cert.date);
      doc.text(cert.date, x + width - dateWidth, currentY);
    }
    
    currentY += 8;
  }

  return currentY;
}

/**
 * Render generic section
 */
async function renderGenericSectionToPDF(
  doc: any,
  section: RenderedSection,
  x: number,
  y: number,
  width: number,
  designSettings: DesignSettings
): Promise<number> {
  let currentY = y;
  
  // Render section data as JSON (fallback)
  const sectionData = JSON.stringify(section.data, null, 2);
  const dataLines = doc.splitTextToSize(sectionData, width - 4);
  doc.text(dataLines, x + 2, currentY);
  currentY += dataLines.length * 4;

  return currentY;
}

/**
 * Get section title from section key
 */
function getSectionTitle(sectionKey: string): string {
  const sectionTitles: Record<string, string> = {
    'basics': 'Personal Information',
    'personal_header': 'Personal Information',
    'work': 'Professional Experience',
    'professional_experience': 'Professional Experience',
    'education': 'Education',
    'skills': 'Skills',
    'projects': 'Projects',
    'languages': 'Languages',
    'certificates': 'Certificates'
  };
  
  return sectionTitles[sectionKey] || sectionKey.replace(/_/g, ' ').toUpperCase();
}

/**
 * Download PDF file
 */
export function downloadPDF(pdfBlob: Blob, filename: string = 'cv.pdf'): void {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Print PDF
 */
export function printPDF(pdfBlob: Blob): void {
  const url = URL.createObjectURL(pdfBlob);
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.contentWindow?.print();
  document.body.removeChild(iframe);
  URL.revokeObjectURL(url);
}
