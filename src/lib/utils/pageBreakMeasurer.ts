/**
 * Page Break Measurement Utility
 * Provides functions for measuring actual DOM heights and calculating smart page breaks
 */

export interface EntryMeasurement {
  index: number;
  headerHeight: number;
  contentHeight: number;
  totalHeight: number;
  canSplit: boolean; // Whether this entry can be split across pages
}

export interface SectionMeasurement {
  id: string;
  type: string;
  headerHeight: number;
  entries: EntryMeasurement[];
  spacing: number; // Margin/spacing after section
  totalHeight: number;
}

export interface ContentMeasurements {
  sections: SectionMeasurement[];
  totalHeight: number;
}

export interface PageBreakDecision {
  breakType: 'section' | 'entry' | 'within-entry';
  pageNumber: number;
  sectionId: string;
  entryIndex?: number;
  splitAtLine?: number; // For within-entry breaks
}

export interface PageAssignment {
  pageNumber: number;
  sections: {
    sectionId: string;
    entries: number[]; // Entry indices for this page
    partialEntry?: {
      entryIndex: number;
      startLine: number;
      endLine: number;
    };
  }[];
}

export interface PageBreakConfig {
  minBottomSpace: number; // Minimum space at bottom before forcing break
  minLinesTogether: number; // Minimum lines that must stay together (default: 2)
  maxPageHeight: number; // Maximum height available for content on a page
}

/**
 * Measure heights of sections and entries from DOM elements
 */
export function measureSectionHeights(
  container: HTMLElement,
  sectionSelectors: Record<string, string>
): ContentMeasurements {
  const measurements: SectionMeasurement[] = [];
  let totalHeight = 0;

  // Find all section elements
  const sectionElements = container.querySelectorAll('.section-content, [class*="section"]');
  
  sectionElements.forEach((sectionEl, index) => {
    const element = sectionEl as HTMLElement;
    const sectionId = element.getAttribute('data-section-id') || `section-${index}`;
    const sectionType = element.getAttribute('data-section-type') || '';
    
    // Measure section header
    const headerEl = element.querySelector('.section-header, h2, h3') as HTMLElement;
    const headerHeight = headerEl ? headerEl.offsetHeight : 0;
    
    // Measure entries within section
    const entries: EntryMeasurement[] = [];
    const entrySelector = sectionSelectors[sectionType] || '.experience-item, .education-item, .project-item, .certificate-item';
    const entryElements = element.querySelectorAll(entrySelector);
    
    entryElements.forEach((entryEl, entryIndex) => {
      const entry = entryEl as HTMLElement;
      const headerEl = entry.querySelector('.item-header, .entry-header') as HTMLElement;
      const contentEl = entry.querySelector('.item-summary, .item-content, .entry-content') as HTMLElement;
      
      const entryHeaderHeight = headerEl ? headerEl.offsetHeight : 0;
      const entryContentHeight = contentEl ? contentEl.offsetHeight : entry.offsetHeight - entryHeaderHeight : 0;
      const entryTotalHeight = entry.offsetHeight;
      
      // Determine if entry can be split (has content that can be broken)
      const canSplit = entryContentHeight > 0 && contentEl !== null;
      
      entries.push({
        index: entryIndex,
        headerHeight: entryHeaderHeight,
        contentHeight: entryContentHeight,
        totalHeight: entryTotalHeight,
        canSplit
      });
    });
    
    // If no entries found, treat entire section as one block
    if (entries.length === 0) {
      const sectionHeight = element.offsetHeight;
      entries.push({
        index: 0,
        headerHeight: headerHeight,
        contentHeight: sectionHeight - headerHeight,
        totalHeight: sectionHeight,
        canSplit: false
      });
    }
    
    // Measure spacing after section
    const computedStyle = window.getComputedStyle(element);
    const marginBottom = parseInt(computedStyle.marginBottom) || 0;
    const spacing = marginBottom;
    
    const sectionTotalHeight = element.offsetHeight + spacing;
    
    measurements.push({
      id: sectionId,
      type: sectionType,
      headerHeight,
      entries,
      spacing,
      totalHeight: sectionTotalHeight
    });
    
    totalHeight += sectionTotalHeight;
  });

  return {
    sections: measurements,
    totalHeight
  };
}

/**
 * Calculate smart page breaks based on measurements and priority rules
 */
export function calculateSmartPageBreaks(
  measurements: ContentMeasurements,
  config: PageBreakConfig
): PageAssignment[] {
  const pageAssignments: PageAssignment[] = [];
  let currentPage = 1;
  let currentPageHeight = 0;
  
  // Initialize first page
  pageAssignments[currentPage] = {
    pageNumber: currentPage,
    sections: []
  };

  for (const section of measurements.sections) {
    const sectionHeaderHeight = section.headerHeight;
    const sectionSpacing = section.spacing;
    
    // Priority 1: Try to break between sections
    const sectionFitsOnCurrentPage = currentPageHeight + section.totalHeight <= config.maxPageHeight;
    
    if (!sectionFitsOnCurrentPage && pageAssignments[currentPage].sections.length > 0) {
      // Section doesn't fit, start new page
      currentPage++;
      currentPageHeight = 0;
      pageAssignments[currentPage] = {
        pageNumber: currentPage,
        sections: []
      };
    }
    
    // Check if section header alone fits
    const headerFits = sectionHeaderHeight <= config.maxPageHeight;
    if (!headerFits) {
      console.warn(`⚠️ Section header too tall: ${section.id} (${sectionHeaderHeight}px)`);
    }
    
    // Priority 2: Try to keep entries together, break between entries
    let sectionStartHeight = currentPageHeight;
    let entriesForCurrentPage: number[] = [];
    let sectionStarted = false;
    
    for (const entry of section.entries) {
      const entryWithHeader = sectionStarted ? entry.totalHeight : sectionHeaderHeight + entry.totalHeight + sectionSpacing;
      const wouldFit = currentPageHeight + entryWithHeader <= config.maxPageHeight;
      
      if (!wouldFit && (entriesForCurrentPage.length > 0 || sectionStarted)) {
        // Entry doesn't fit, need to break
        
        // If we haven't started the section yet, start it on new page
        if (!sectionStarted) {
          currentPage++;
          currentPageHeight = 0;
          pageAssignments[currentPage] = {
            pageNumber: currentPage,
            sections: []
          };
          sectionStartHeight = 0;
        } else {
          // Save current page's entries for this section
          if (entriesForCurrentPage.length > 0) {
            const lastSectionIndex = pageAssignments[currentPage].sections.length - 1;
            if (lastSectionIndex >= 0 && pageAssignments[currentPage].sections[lastSectionIndex].sectionId === section.id) {
              pageAssignments[currentPage].sections[lastSectionIndex].entries = entriesForCurrentPage;
            } else {
              pageAssignments[currentPage].sections.push({
                sectionId: section.id,
                entries: entriesForCurrentPage
              });
            }
          }
          
          // Start new page
          currentPage++;
          currentPageHeight = 0;
          pageAssignments[currentPage] = {
            pageNumber: currentPage,
            sections: []
          };
          entriesForCurrentPage = [];
        }
        
        // Add section header on new page if not started
        if (!sectionStarted) {
          currentPageHeight += sectionHeaderHeight;
          sectionStarted = true;
        }
      }
      
      // Priority 3: If entry doesn't fit, try to split it
      if (!wouldFit && entry.canSplit && entry.contentHeight > 0) {
        // Calculate minimum content height (header + 2 lines minimum)
        const minContentHeight = entry.headerHeight + (config.minLinesTogether * 20); // ~20px per line
        const remainingHeight = config.maxPageHeight - currentPageHeight;
        
        if (remainingHeight >= entry.headerHeight + minContentHeight) {
          // Can split entry - header + some content on current page
          const linesOnCurrentPage = Math.floor((remainingHeight - entry.headerHeight) / 20);
          const totalLines = Math.ceil(entry.contentHeight / 20);
          
          // Add partial entry to current page
          entriesForCurrentPage.push(entry.index);
          if (!sectionStarted) {
            pageAssignments[currentPage].sections.push({
              sectionId: section.id,
              entries: [],
              partialEntry: {
                entryIndex: entry.index,
                startLine: 0,
                endLine: linesOnCurrentPage
              }
            });
            currentPageHeight += sectionHeaderHeight + entry.headerHeight + (linesOnCurrentPage * 20);
            sectionStarted = true;
          } else {
            const lastSectionIndex = pageAssignments[currentPage].sections.length - 1;
            if (lastSectionIndex >= 0 && pageAssignments[currentPage].sections[lastSectionIndex].sectionId === section.id) {
              pageAssignments[currentPage].sections[lastSectionIndex].partialEntry = {
                entryIndex: entry.index,
                startLine: 0,
                endLine: linesOnCurrentPage
              };
            }
            currentPageHeight += entry.headerHeight + (linesOnCurrentPage * 20);
          }
          
          // Remaining content goes to next page
          currentPage++;
          currentPageHeight = entry.headerHeight + ((totalLines - linesOnCurrentPage) * 20);
          pageAssignments[currentPage] = {
            pageNumber: currentPage,
            sections: [{
              sectionId: section.id,
              entries: [],
              partialEntry: {
                entryIndex: entry.index,
                startLine: linesOnCurrentPage,
                endLine: totalLines
              }
            }]
          };
          entriesForCurrentPage = [];
          continue;
        } else {
          // Can't split, move entire entry to next page
          if (sectionStarted) {
            // Save current page entries
            const lastSectionIndex = pageAssignments[currentPage].sections.length - 1;
            if (lastSectionIndex >= 0 && pageAssignments[currentPage].sections[lastSectionIndex].sectionId === section.id) {
              pageAssignments[currentPage].sections[lastSectionIndex].entries = entriesForCurrentPage;
            }
          }
          
          currentPage++;
          currentPageHeight = sectionStarted ? 0 : sectionHeaderHeight;
          pageAssignments[currentPage] = {
            pageNumber: currentPage,
            sections: []
          };
          
          if (!sectionStarted) {
            sectionStarted = true;
          }
        }
      }
      
      // Entry fits, add it to current page
      if (!sectionStarted) {
        pageAssignments[currentPage].sections.push({
          sectionId: section.id,
          entries: []
        });
        currentPageHeight += sectionHeaderHeight;
        sectionStarted = true;
      }
      
      entriesForCurrentPage.push(entry.index);
      currentPageHeight += entry.totalHeight;
    }
    
    // Save entries for this section on current page
    if (entriesForCurrentPage.length > 0) {
      const lastSectionIndex = pageAssignments[currentPage].sections.length - 1;
      if (lastSectionIndex >= 0 && pageAssignments[currentPage].sections[lastSectionIndex].sectionId === section.id) {
        pageAssignments[currentPage].sections[lastSectionIndex].entries = entriesForCurrentPage;
      } else if (sectionStarted) {
        pageAssignments[currentPage].sections.push({
          sectionId: section.id,
          entries: entriesForCurrentPage
        });
      }
    }
    
    // Add section spacing
    currentPageHeight += sectionSpacing;
  }

  return pageAssignments;
}

/**
 * Measure entry heights from DOM (for work experience, education, etc.)
 */
export function measureEntryHeights(
  sectionElement: HTMLElement,
  entrySelector: string
): EntryMeasurement[] {
  const entries: EntryMeasurement[] = [];
  const entryElements = sectionElement.querySelectorAll(entrySelector);
  
  entryElements.forEach((entryEl, index) => {
    const entry = entryEl as HTMLElement;
    const headerEl = entry.querySelector('.item-header, .entry-header, [class*="header"]') as HTMLElement;
    const contentEl = entry.querySelector('.item-summary, .item-content, .entry-content, [class*="content"]') as HTMLElement;
    
    const headerHeight = headerEl ? headerEl.offsetHeight : 0;
    const contentHeight = contentEl ? contentEl.offsetHeight : (entry.offsetHeight - headerHeight);
    const totalHeight = entry.offsetHeight;
    
    // Entry can be split if it has substantial content
    const canSplit = contentHeight > 40; // At least 40px of content to split
    
    entries.push({
      index,
      headerHeight,
      contentHeight,
      totalHeight,
      canSplit
    });
  });
  
  return entries;
}

