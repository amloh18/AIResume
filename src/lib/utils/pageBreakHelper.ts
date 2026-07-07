import { PAGE_SIZE, getPageMetrics } from '@/lib/constants/pageMetrics';

/**
 * Page Break Helper for A4 Preview
 * Provides utilities for smart page breaks that don't split sections
 *
 * IMPORTANT: All rules are scoped under `.pdf-preview-mode` so they only
 * apply during print/export and do NOT affect the live editor canvas.
 */

import { PAGE_SIZE, getPageMetrics } from '@/lib/constants/pageMetrics';

export const A4_WIDTH_PX = getPageMetrics('A4').widthPx;
export const A4_HEIGHT_PX = getPageMetrics('A4').heightPx;

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
  const scope = '.pdf-preview-mode';
  const avoidBreakCSS = config.avoidBreakInside
    .map(selector => `${scope} ${selector} { page-break-inside: avoid; break-inside: avoid; }`)
    .join('\n  ');

  const breakBeforeCSS = config.breakBefore
    .map(selector => `${scope} ${selector}:not(:first-child) { page-break-before: auto; break-before: auto; }`)
    .join('\n  ');

  return `
  /* Smart Page Break Styles - scoped under .pdf-preview-mode to avoid affecting the live editor */
  @media print {
    ${avoidBreakCSS}
    ${breakBeforeCSS}

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
  ${scope} .cv-preview-page {
    position: relative;
    width: ${A4_WIDTH_PX}px;
    min-height: ${A4_HEIGHT_PX}px;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin: 20px auto;
    page-break-after: always;
    break-after: page;
  }
  ${scope} .cv-preview-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  ${config.avoidBreakInside.map(selector => `${scope} ${selector}`).join(',\n  ')} {
    page-break-inside: avoid;
    break-inside: avoid;
    position: relative;
  }

  ${scope} .cv-section-header,
  ${scope} .section-header {
    page-break-after: avoid;
    break-after: avoid;
    orphans: 2;
    widows: 2;
  }

  ${scope} .cv-section-header + .cv-section-content,
  ${scope} .section-header + .experience-list,
  ${scope} .section-header + .education-list,
  ${scope} .section-header + .project-list {
    page-break-before: avoid;
    break-before: avoid;
  }

  ${scope} .entry-header,
  ${scope} .item-header {
    page-break-after: avoid;
    break-after: avoid;
  }

  ${scope} .entry-header + .entry-content,
  ${scope} .item-header + .item-summary,
  ${scope} .item-header + .item-content {
    page-break-before: avoid;
    break-before: avoid;
    orphans: 2;
    widows: 2;
  }

  ${scope} .entry-content,
  ${scope} .item-summary,
  ${scope} .item-content,
  ${scope} .education-description {
    orphans: 2;
    widows: 2;
  }

  ${scope} .work-experience-item,
  ${scope} .experience-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  ${scope} .education-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  ${scope} .project-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  ${scope} .skill-category-group {
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