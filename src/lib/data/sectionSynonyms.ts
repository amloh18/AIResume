/**
 * Section Header Synonyms
 * 
 * Maps alternative section header names to standard section names
 * Used for ATS-friendly section header validation
 */

export const SECTION_SYNONYMS: Record<string, string[]> = {
  'Work Experience': [
    'Professional History',
    'Work',
    'Employment',
    'Career',
    'Professional Experience',
    'Work History',
    'Employment History',
    'Career History',
    'Professional Background',
    'Experience',
    'Work Background'
  ],
  'Education': [
    'Education Background',
    'Academic',
    'Academic Background',
    'Qualifications',
    'Academic Qualifications',
    'Educational Background',
    'Academic History',
    'Education History',
    'Academic Credentials',
    'Educational Credentials'
  ],
  'Skills': [
    'Technical Skills',
    'Competencies',
    'Core Skills',
    'Expertise',
    'Technical Competencies',
    'Professional Skills',
    'Key Skills',
    'Skill Set',
    'Competencies & Skills',
    'Technical Expertise'
  ],
  'Projects': [
    'Project Experience',
    'Personal Projects',
    'Portfolio',
    'Project Portfolio',
    'Key Projects',
    'Notable Projects'
  ],
  'Certificates': [
    'Certifications',
    'Professional Certifications',
    'Credentials',
    'Certificates & Certifications',
    'Professional Credentials'
  ]
};

/**
 * Get standard section name from alternative name
 */
export function getStandardSectionName(alternativeName: string): string | null {
  const normalized = alternativeName.toLowerCase().trim();
  
  for (const [standard, synonyms] of Object.entries(SECTION_SYNONYMS)) {
    if (normalized === standard.toLowerCase()) {
      return standard;
    }
    for (const synonym of synonyms) {
      if (normalized === synonym.toLowerCase()) {
        return standard;
      }
    }
  }
  
  return null;
}

/**
 * Check if a section name matches any standard section (with synonyms)
 */
export function isStandardSection(sectionName: string): boolean {
  return getStandardSectionName(sectionName) !== null;
}

/**
 * Date Season to Month Mapping
 */
export const SEASON_TO_MONTH: Record<string, number> = {
  'Spring': 3,
  'Summer': 6,
  'Fall': 9,
  'Autumn': 9,
  'Winter': 12
};

/**
 * Title Abbreviation Map
 */
export const TITLE_ABBREVIATIONS: Record<string, string> = {
  'Sr.': 'Senior',
  'Sr': 'Senior',
  'Jr.': 'Junior',
  'Jr': 'Junior',
  'Mgr': 'Manager',
  'Mgr.': 'Manager',
  'VP': 'Vice President',
  'Dir': 'Director',
  'Dir.': 'Director',
  'Exec': 'Executive',
  'Exec.': 'Executive',
  'PM': 'Project Manager', // Context-dependent, but default
  'PM.': 'Project Manager',
  'Dev': 'Developer',
  'Dev.': 'Developer',
  'Eng': 'Engineer',
  'Eng.': 'Engineer',
  'CTO': 'Chief Technology Officer',
  'CEO': 'Chief Executive Officer',
  'CFO': 'Chief Financial Officer',
  'COO': 'Chief Operating Officer',
  'CMO': 'Chief Marketing Officer'
};

/**
 * Expand title abbreviation
 */
export function expandTitleAbbreviation(title: string): string {
  const trimmed = title.trim();
  
  // Check exact match first
  if (TITLE_ABBREVIATIONS[trimmed]) {
    return TITLE_ABBREVIATIONS[trimmed];
  }
  
  // Check if title contains abbreviation
  for (const [abbr, expansion] of Object.entries(TITLE_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr.replace('.', '\\.')}\\b`, 'gi');
    if (regex.test(trimmed)) {
      return trimmed.replace(regex, expansion);
    }
  }
  
  return trimmed;
}

/**
 * Present/Current date synonyms
 */
export const PRESENT_SYNONYMS = ['Present', 'Current', 'Now', 'Ongoing', 'Till Date', 'To Date', 'Till Now'];

/**
 * Check if a date string represents "present"
 */
export function isPresentDate(dateStr: string): boolean {
  if (!dateStr) return false;
  return PRESENT_SYNONYMS.some(synonym => 
    dateStr.trim().toLowerCase() === synonym.toLowerCase()
  );
}



