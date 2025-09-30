import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';

// Download CV data as JSON
export const downloadAsJSON = (cvData: UnifiedCVDataStructure, filename: string = 'cv-data.json') => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('JSON download is only available in browser environment');
  }

  const dataStr = JSON.stringify(cvData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Download CV as PDF using html2canvas and jsPDF
export const downloadAsPDF = async (elementRef: HTMLElement, filename: string = 'cv.pdf') => {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error('PDF generation is only available in browser environment');
    }

    // Dynamic imports to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default;
    
    // Use html2pdf library which is more reliable
    const html2pdf = (await import('html2pdf.js')).default;
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels
        height: 1123, // A4 height in pixels
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      }
    };
    
    await html2pdf().set(opt).from(elementRef).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};

// Download CV as high-quality image (PNG)
export const downloadAsImage = async (elementRef: HTMLElement, filename: string = 'cv.png') => {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error('Image generation is only available in browser environment');
    }

    // Dynamic imports to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default;
    
    const canvas = await html2canvas(elementRef, {
      scale: 3, // Higher scale for better quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels
      height: 1123, // A4 height in pixels
      logging: false
    });
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating image:', error);
    alert('Failed to generate image. Please try again.');
  }
};

// Download CV as DOCX using docx library
export const downloadAsDOCX = async (cvData: UnifiedCVDataStructure, filename: string = 'cv.docx') => {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error('DOCX generation is only available in browser environment');
    }

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: cvData.basics.name || 'Your Name',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: cvData.basics.label || 'Professional Title',
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: cvData.basics.email || '',
                break: 1,
              }),
              new TextRun({
                text: cvData.basics.phone || '',
                break: 1,
              }),
              new TextRun({
                text: cvData.basics.location?.city || '',
                break: 1,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }), // Spacing
          
          // Summary
          ...(cvData.basics.summary ? [
            new Paragraph({
              text: 'Professional Summary',
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: cvData.basics.summary,
            }),
            new Paragraph({ text: '' }), // Spacing
          ] : []),
          
          // Work Experience
          ...(cvData.work.length > 0 ? [
            new Paragraph({
              text: 'Work Experience',
              heading: HeadingLevel.HEADING_2,
            }),
            ...cvData.work.flatMap(work => [
              new Paragraph({
                text: work.position,
                heading: HeadingLevel.HEADING_3,
              }),
              new Paragraph({
                text: `${work.name} | ${work.startDate} - ${work.endDate}`,
              }),
              new Paragraph({
                text: work.summary || '',
              }),
              new Paragraph({ text: '' }), // Spacing
            ]),
          ] : []),
          
          // Education
          ...(cvData.education.length > 0 ? [
            new Paragraph({
              text: 'Education',
              heading: HeadingLevel.HEADING_2,
            }),
            ...cvData.education.flatMap(edu => [
              new Paragraph({
                text: `${edu.studyType} in ${edu.area}`,
                heading: HeadingLevel.HEADING_3,
              }),
              new Paragraph({
                text: `${edu.institution} | ${edu.startDate} - ${edu.endDate}`,
              }),
              new Paragraph({ text: '' }), // Spacing
            ]),
          ] : []),
          
          // Skills
          ...(cvData.skills.length > 0 ? [
            new Paragraph({
              text: 'Skills',
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: cvData.skills.map(skill => skill.name).join(', '),
            }),
            new Paragraph({ text: '' }), // Spacing
          ] : []),
          
          // Projects
          ...(cvData.projects.length > 0 ? [
            new Paragraph({
              text: 'Projects',
              heading: HeadingLevel.HEADING_2,
            }),
            ...cvData.projects.flatMap(project => [
              new Paragraph({
                text: project.name,
                heading: HeadingLevel.HEADING_3,
              }),
              new Paragraph({
                text: project.description || '',
              }),
              new Paragraph({ text: '' }), // Spacing
            ]),
          ] : []),
        ],
      }],
    });
    
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    alert('Failed to generate DOCX. Please try again.');
  }
};
