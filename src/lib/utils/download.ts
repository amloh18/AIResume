import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

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

// Download CV as PDF using server-side API for exact preview matching
export const downloadAsPDF = async (
  elementRef: HTMLElement,
  filename: string = 'cv.pdf',
  cvId?: string,
  options?: {
    paperSize?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    jobTitle?: string;
  }
) => {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error('PDF generation is only available in browser environment');
    }

    // If cvId is provided, use server-side API for exact preview matching
    if (cvId) {
      try {
        const params = new URLSearchParams({
          format: 'pdf',
          paperSize: options?.paperSize || 'A4',
          orientation: options?.orientation || 'portrait',
        });

        if (options?.jobTitle) {
          params.append('jobTitle', options.jobTitle);
        }

        const response = await fetch(`/api/cvs/${cvId}/download?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Server PDF generation failed: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return; // Success - exit early
      } catch (apiError) {
        console.warn('Server-side PDF generation failed, falling back to client-side:', apiError);
        // Continue to fallback method below
      }
    }

    // Fallback: Client-side PDF generation using jsPDF html method
    console.log('Using client-side PDF generation (fallback)');

    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'px',
      format: options?.paperSize === 'Letter' ? [816, 1056] : [794, 1123],
      hotfixes: ['px_scaling'],
    });

    const clone = elementRef.cloneNode(true) as HTMLElement;
    clone.style.width = options?.paperSize === 'Letter' ? '816px' : '794px';
    clone.style.height = 'auto';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.overflow = 'visible';
    
    const editorSelectors = [
      '.no-print', '[data-no-print]', '.cv-drag-handle', '.cv-drag-overlay',
      '.inline-add-section-button', '.section-hover-controls', '.cv-editor-only',
      '.cv-section-drag-overlay', '.cv-drop-zone-indicator', '.cv-page-visualizer',
    ];
    clone.querySelectorAll(editorSelectors.join(',')).forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
    
    clone.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
    });

    // Fix SVGs
    const svgs = clone.querySelectorAll('svg');
    svgs.forEach((svg) => {
      const originalSvg = elementRef.querySelector(`svg.lucide-${svg.classList[1]?.replace('lucide-', '')}`) || svg;
      const computedStyle = window.getComputedStyle(originalSvg);
      const color = computedStyle.color || '#000000';
      const width = svg.getAttribute('width') || computedStyle.width || '16px';
      const height = svg.getAttribute('height') || computedStyle.height || '16px';

      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      
      const svgString = new XMLSerializer().serializeToString(svg)
        .replace(/currentColor/g, color);
        
      const img = document.createElement('img');
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
      img.style.width = width;
      img.style.height = height;
      img.className = svg.className.baseVal || '';
      
      if (svg.parentNode) {
        svg.parentNode.replaceChild(img, svg);
      }
    });

    document.body.appendChild(clone);

    try {
      await doc.html(clone, {
        x: 0,
        y: 0,
        width: options?.paperSize === 'Letter' ? 816 : 794,
        windowWidth: options?.paperSize === 'Letter' ? 816 : 794,
        autoPaging: 'text',
      });
      doc.save(filename);
    } finally {
      document.body.removeChild(clone);
    }

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

// Download CV as DOCX - uses server-side API for consistent output
export const downloadAsDOCX = async (
  cvData: UnifiedCVDataStructure,
  filename: string = 'cv.docx',
  cvId?: string,
  options?: {
    paperSize?: 'A4' | 'Letter';
  }
) => {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error('DOCX generation is only available in browser environment');
    }

    // If cvId is provided, use server-side API for consistent output
    if (cvId) {
      try {
        const params = new URLSearchParams({
          format: 'docx',
          paperSize: options?.paperSize || 'A4',
        });

        const response = await fetch(`/api/cvs/${cvId}/download?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Server DOCX generation failed: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return; // Success - exit early
      } catch (apiError) {
        console.warn('Server-side DOCX generation failed, falling back to client-side:', apiError);
        // Continue to fallback method below
      }
    }

    // Fallback: Client-side DOCX generation using docx library
    // Note: This is a simplified version - server-side generation is preferred for full section support
    console.log('Using client-side DOCX generation (fallback - limited section support)');

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
              text: cvData.skills.map(skill => skill.category + ': ' + skill.skills.join(', ')).join('; '),
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
