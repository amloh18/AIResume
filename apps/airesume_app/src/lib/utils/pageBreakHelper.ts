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
    '.cv-section-item',           // Individual work/education entries
    '.cv-entry-item',             // Generic entry items
    '.work-experience-item',      // Work experience entries
    '.experience-item',           // Experience entries (alias)
    '.education-item',            // Education entries
    '.project-item',              // Project entries
    '.certificate-item',          // Certificate entries
    '.volunteer-item',           // Volunteer entries
    '.award-item',               // Award entries
    '.cv-section-header',        // Section headers with their first item
    '.section-header',            // Section headers
    '.skill-category-group',     // Skill categories
    '.entry-header',             // Entry headers (title/company/date block)
    '.item-header'               // Item headers (alias)
  ],
  breakBefore: [
    '.cv-section',              // Start new sections on new page if needed
    '.section-content'           // Section content blocks
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
  
  /* Section headers stay with content - Never orphan headers */
  .cv-section-header,
  .section-header {
    page-break-after: avoid;
    break-after: avoid;
    orphans: 2;
    widows: 2;
  }
  
  /* Keep section header with first entry */
  .cv-section-header + .cv-section-content,
  .section-header + .experience-list,
  .section-header + .education-list,
  .section-header + .project-list {
    page-break-before: avoid;
    break-before: avoid;
  }
  
  /* Entry headers stay with content */
  .entry-header,
  .item-header {
    page-break-after: avoid;
    break-after: avoid;
  }
  
  /* Keep entry header with at least 2 lines of content */
  .entry-header + .entry-content,
  .item-header + .item-summary,
  .item-header + .item-content {
    page-break-before: avoid;
    break-before: avoid;
    orphans: 2;
    widows: 2;
  }
  
  /* Prevent orphaned lines - minimum 2 lines together */
  .entry-content,
  .item-summary,
  .item-content,
  .education-description {
    orphans: 2;
    widows: 2;
  }
  
  /* Work Experience specific rules */
  .work-experience-item,
  .experience-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  /* Education specific rules */
  .education-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  /* Project specific rules */
  .project-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  /* Skills section - keep categories together */
  .skill-category-group {
    page-break-inside: avoid;
    break-inside: avoid;
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