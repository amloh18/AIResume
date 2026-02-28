import { CVSectionStructure } from '@/types/unified-cv-schema';
import { FIXED_SIDEBAR_SECTIONS } from '@/lib/constants/cv-sections';

interface SectionWithHeight {
  section: CVSectionStructure;
  estimatedHeight: number;
}

const SECTION_BASE_HEIGHTS: Record<string, number> = {
  personal: 120,
  personal_header: 120,
  contact: 100,
  summary: 150,
  work: 300,
  education: 200,
  skills: 180,
  projects: 250,
  languages: 120,
  certificates: 150,
  awards: 150,
  volunteer: 200,
  publications: 180,
  interests: 100,
  references: 150,
};

const estimateSectionHeight = (
  section: CVSectionStructure,
  cvData: any
): number => {
  const baseHeight = SECTION_BASE_HEIGHTS[section.type] || 150;
  
  const sectionData = cvData[section.type];
  if (!sectionData) return baseHeight;

  if (Array.isArray(sectionData)) {
    const itemCount = sectionData.length;
    
    if (section.type === 'work') {
      return baseHeight + (itemCount * 150);
    } else if (section.type === 'education') {
      return baseHeight + (itemCount * 100);
    } else if (section.type === 'projects') {
      return baseHeight + (itemCount * 120);
    } else if (section.type === 'skills') {
      return baseHeight + (itemCount * 40);
    } else if (section.type === 'languages') {
      return baseHeight + (itemCount * 30);
    } else {
      return baseHeight + (itemCount * 80);
    }
  }

  if (section.type === 'summary' && cvData.basics?.summary) {
    const textLength = cvData.basics.summary.length;
    return Math.max(baseHeight, 80 + (textLength / 5));
  }

  return baseHeight;
};

export interface ColumnDistribution {
  sidebar: CVSectionStructure[];
  main: CVSectionStructure[];
}

/**
 * Calculate optimal column distribution for two-column templates.
 * 
 * This function balances sections between sidebar and main columns based on
 * estimated content height. Fixed sidebar sections (personal, contact) always
 * go in the sidebar.
 * 
 * @param sections - All CV sections
 * @param cvData - CV data for height estimation
 * @param templateType - Template type (not currently used, reserved for future)
 * @returns Updated sections with column assignments
 */
export const calculateOptimalColumnDistribution = (
  sections: CVSectionStructure[],
  cvData: any,
  templateType: string
): CVSectionStructure[] => {
  const visibleSections = sections.filter(s => s.visible !== false);
  
  const sectionsWithHeights: SectionWithHeight[] = visibleSections.map(section => ({
    section,
    estimatedHeight: estimateSectionHeight(section, cvData),
  }));

  // Fixed sections always go in sidebar
  const fixedSections = sectionsWithHeights.filter(s => 
    FIXED_SIDEBAR_SECTIONS.includes(s.section.type as 'personal' | 'personal_header' | 'contact')
  );
  
  // Movable sections can be distributed
  const movableSections = sectionsWithHeights.filter(s => 
    !FIXED_SIDEBAR_SECTIONS.includes(s.section.type as 'personal' | 'personal_header' | 'contact')
  );

  // Sort by height (largest first) for greedy bin packing
  movableSections.sort((a, b) => b.estimatedHeight - a.estimatedHeight);

  let sidebarColumn: SectionWithHeight[] = [...fixedSections];
  let mainColumn: SectionWithHeight[] = [];
  let sidebarHeight = fixedSections.reduce((sum, s) => sum + s.estimatedHeight, 0);
  let mainHeight = 0;

  // Greedy bin packing - add to whichever column is shorter
  for (const section of movableSections) {
    if (sidebarHeight <= mainHeight) {
      sidebarColumn.push(section);
      sidebarHeight += section.estimatedHeight;
    } else {
      mainColumn.push(section);
      mainHeight += section.estimatedHeight;
    }
  }

  // Update sections with column assignments
  const updatedSections = visibleSections.map(section => {
    const isInSidebar = sidebarColumn.some(s => s.section.id === section.id);
    const isInMain = mainColumn.some(s => s.section.id === section.id);
    
    return {
      ...section,
      column: isInSidebar ? 'sidebar' as const : (isInMain ? 'main' as const : section.column),
    };
  });

  return updatedSections;
};

/**
 * Get a score (0-100) representing how balanced the columns are.
 * 100 = perfectly balanced, 0 = completely unbalanced.
 */
export const getColumnBalanceScore = (
  sections: CVSectionStructure[],
  cvData: any
): number => {
  const sidebarSections = sections.filter(s => s.column === 'sidebar' && s.visible !== false);
  const mainSections = sections.filter(s => s.column === 'main' && s.visible !== false);

  const sidebarHeight = sidebarSections.reduce(
    (sum, s) => sum + estimateSectionHeight(s, cvData),
    0
  );
  const mainHeight = mainSections.reduce(
    (sum, s) => sum + estimateSectionHeight(s, cvData),
    0
  );

  const totalHeight = sidebarHeight + mainHeight;
  if (totalHeight === 0) return 100;

  const difference = Math.abs(sidebarHeight - mainHeight);
  const balance = ((totalHeight - difference) / totalHeight) * 100;

  return Math.round(balance);
};

// Re-export for backward compatibility
export { FIXED_SIDEBAR_SECTIONS };
