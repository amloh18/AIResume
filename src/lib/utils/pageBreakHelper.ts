/**
 * Page Break Helper for A4 Preview
 * Provides utilities for smart page breaks that don't split sections
 */

export const A4_HEIGHT_PX = 1122; // A4 height at 96 DPI (297mm)
export const A4_WIDTH_PX = 794;  // A4 width at 96 DPI (210mm)

export interface PageBreakConfig {
  // Minimum space at bottom of page before forcing break (in pixels)
  minBottomSpace: number;
  // Avoid breaking these elements
  avoidBreakInside: string[];
  // Force break before these elements
  breakBefore: string[];
}

export const defaultPageBreakConfig: PageBreakConfig = {
  minBottomSpace: 100, // Leave at least 100px at bottom
  avoidBreakInside: [
    '.cv-section-item',      // Individual work/education entries
    '.cv-section-header',    // Section headers with their first item
    '.skill-category-group', // Skill categories
    '.certificate-item',     // Certificate entries
    '.project-item'          // Project entries
  ],
  breakBefore: [
    '.cv-section'            // Start new sections on new page if needed
  ]
};

/**
 * Generate CSS for smart page breaks in preview
 */
export function generatePageBreakCSS(config: PageBreakConfig = defaultPageBreakConfig): string {
  const avoidBreakCSS = config.avoidBreakInside
    .map(selector => `${selector} { page-break-inside: avoid; break-inside: avoid; }`)
    .join('\n  ');
    
  const breakBeforeCSS = config.breakBefore
    .map(selector => `${selector}:not(:first-child) { page-break-before: auto; break-before: auto; }`)
    .join('\n  ');

  return `
  /* Smart Page Break Styles */
  @media print {
    ${avoidBreakCSS}
    ${breakBeforeCSS}
    
    /* A4 Page configuration */
    @page {
      size: A4;
      margin: 0;
    }
    
    body {
      margin: 0;
      padding: 0;
    }
  }
  
  /* Preview mode simulation */
  .cv-preview-page {
    position: relative;
    width: ${A4_WIDTH_PX}px;
    min-height: ${A4_HEIGHT_PX}px;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin: 20px auto;
    page-break-after: always;
    break-after: page;
  }
  
  .cv-preview-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  
  /* Avoid breaking inside these elements */
  ${config.avoidBreakInside.map(selector => `${selector}`).join(',\n  ')} {
    page-break-inside: avoid;
    break-inside: avoid;
    position: relative;
  }
  
  /* Section headers stay with content */
  .cv-section-header {
    page-break-after: avoid;
    break-after: avoid;
  }
  
  .cv-section-header + .cv-section-content {
    page-break-before: avoid;
    break-before: avoid;
  }
  `;
}

/**
 * Calculate if an element would overflow the current page
 */
export function wouldOverflowPage(
  elementHeight: number,
  currentPageHeight: number,
  config: PageBreakConfig = defaultPageBreakConfig
): boolean {
  return currentPageHeight + elementHeight > A4_HEIGHT_PX - config.minBottomSpace;
}

/**
 * Get page break points for content based on section heights
 */
export function calculatePageBreaks(
  sectionHeights: { id: string; height: number; canBreak: boolean }[],
  config: PageBreakConfig = defaultPageBreakConfig
): number[] {
  const breakPoints: number[] = [];
  let currentPageHeight = 0;
  let sectionIndex = 0;

  for (const section of sectionHeights) {
    // Check if adding this section would overflow
    if (wouldOverflowPage(section.height, currentPageHeight, config)) {
      // If section can't be broken and would overflow, start new page
      if (!section.canBreak) {
        breakPoints.push(sectionIndex);
        currentPageHeight = section.height;
      } else {
        // Section can be broken, add it to current page
        currentPageHeight += section.height;
      }
    } else {
      currentPageHeight += section.height;
    }
    
    sectionIndex++;
  }

  return breakPoints;
}

/**
 * Apply page break styling to an element
 */
export function applyPageBreakStyle(element: HTMLElement, breakBefore: boolean = false) {
  if (breakBefore) {
    element.style.pageBreakBefore = 'always';
    element.style.breakBefore = 'page';
  } else {
    element.style.pageBreakInside = 'avoid';
    element.style.breakInside = 'avoid';
  }
}