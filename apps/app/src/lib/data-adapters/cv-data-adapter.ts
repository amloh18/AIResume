/**
 * CV Data Adapter
 * 
 * This module provides comprehensive data transformation between different CV data formats:
 * 1. CV Parsing output (from AI parser)
 * 2. Master CV Onboarding data
 * 3. Database CV JSON structure
 * 4. Studio structure sections
 * 5. Template rendering data
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { SECTION_MAPPING } from '@/lib/section-mapping';

// CV Parsing output format (from AI parser)
export interface ParsedCVData {
  personalInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedin: string;
    github: string;
    summary: string;
  };
  basics?: {
    name: string;
    label: string;
    email: string;
    phone: string;
    location: {
      city: string;
      region: string;
      countryCode: string;
    };
    summary: string;
    url: string;
    profiles: Array<{
      network: string;
      username: string;
      url: string;
    }>;
  };
  experience?: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    achievements: string[];
  }>;
  work?: Array<{
    name: string;
    position: string;
    startDate: string;
    endDate: string;
    summary: string;
    highlights: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    current: boolean;
    gpa: string;
    description: string;
  }>;
  skills?: Array<{
    category: string;
    skills: string[];
  }>;
  projects?: Array<{
    title: string;
    description: string;
    technologies: string[];
    url: string;
    startDate: string;
    endDate: string;
    current: boolean;
  }>;
  volunteer?: Array<{
    organization?: string;
    name?: string; // Alternative field name
    position: string;
    url?: string;
    startDate: string;
    endDate: string;
    current?: boolean;
    summary?: string;
    description?: string; // Alternative field name
    highlights?: string[];
  }>;
}

// Master CV Onboarding data format
export interface MasterCVOnboardingData {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  website: string;
  linkedin: string;
  github: string;
  workExperience: Array<{
    id: string;
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string;
  }>;
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string;
    url: string;
    startDate: string;
    endDate: string;
  }>;
  skills: string[];
  languages: Array<{
    id: string;
    language: string;
    proficiency: 'Native' | 'Fluent' | 'Conversational' | 'Basic';
  }>;
  achievements: string;
  interests: string[];
}

// Database CV JSON structure (MongoDB)
export interface DatabaseCVData {
  _id: string;
  userId: string;
  title: string;
  cvData: UnifiedCVDataStructure;
  templateId: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  metadata: {
    isMaster: boolean;
    lastModified: Date;
    createdFrom?: string;
    tags: string[];
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
    atsScore?: number;
    atsScoreDate?: Date;
    thumbnailUrl?: string;
    thumbnailGeneratedAt?: Date;
    starred: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert parsed CV data to unified CV structure
 */
export function adaptParsedCVToUnified(parsedData: ParsedCVData): UnifiedCVDataStructure {
  const personalInfo = parsedData.personalInfo;
  const basics = parsedData.basics;

  // Type guard to check if we have personalInfo (old format) or basics (new format)
  const hasFirstName = personalInfo && 'firstName' in personalInfo;
  const locationData = personalInfo?.location || basics?.location;
  const locationIsString = typeof locationData === 'string';
  const locationIsObject = locationData && typeof locationData === 'object';

  return {
    basics: {
      name: hasFirstName && personalInfo?.firstName && personalInfo?.lastName
        ? `${personalInfo.firstName} ${personalInfo.lastName}`.trim()
        : basics?.name || '',
      label: ((personalInfo && 'professionalTitle' in personalInfo ? (personalInfo.professionalTitle as string) : '') || basics?.label || '') as string,
      image: '',
      email: personalInfo?.email || basics?.email || '',
      phone: personalInfo?.phone || basics?.phone || '',
      url: personalInfo?.website || basics?.url || '',
      summary: personalInfo?.summary || basics?.summary || '',
      location: {
        address: '',
        postalCode: '',
        city: locationIsString ? locationData : (locationIsObject ? locationData.city : ''),
        countryCode: locationIsObject ? locationData.countryCode : '',
        region: locationIsObject ? locationData.region : ''
      },
      profiles: [
        ...(personalInfo?.linkedin ? [{
          network: 'linkedin',
          username: '',
          url: personalInfo.linkedin
        }] : []),
        ...(personalInfo?.github ? [{
          network: 'github',
          username: '',
          url: personalInfo.github
        }] : []),
        ...(basics?.profiles || [])
      ]
    },
    work: (parsedData.experience || parsedData.work || []).map(exp => {
      const hasCompany = exp && 'company' in exp;
      const hasCurrent = exp && 'current' in exp;
      return {
        name: hasCompany ? exp.company : (exp.name || ''),
        position: (typeof exp.position === 'string' ? exp.position : (typeof exp.position === 'object' && exp.position !== null ? String(exp.position) : '')) || ('jobTitle' in exp ? (exp.jobTitle as string) : '') || '',
        url: '',
        startDate: exp.startDate || '',
        endDate: hasCurrent && exp.current ? '' : (exp.endDate || ''),
        summary: (() => {
          // Helper function to clean text for ATS compatibility
          const cleanTextForATS = (text: string): string => {
            if (!text || typeof text !== 'string') return '';

            const cleaned = text
              // Remove bullet point characters
              .replace(/[●•▪▫◦‣⁃⁌⁍∙◘◙◉○◯◐◑◒◓◔◕◖◗◗◘◙◚◛◜◝◞◟◠◡]/g, '')
              .replace(/^[\s]*[-*→▶▸▹►▻▼▽▪▫]\s*/gm, '')
              .replace(/^[\s]*[•◦‣]\s*/gm, '')
              .replace(/^[\s]*[0-9]+[.)]\s*/gm, '')
              .replace(/^[\s]*[a-z][.)]\s*/gm, '')
              // Replace special dashes with regular hyphens
              .replace(/[—–]/g, '-')
              // Replace smart quotes
              .replace(/[""'']/g, '"')
              .replace(/['']/g, "'")
              // Fix multiple spaces
              .replace(/[ \t]+/g, ' ')
              .replace(/[ \t]*\n[ \t]*/g, '\n')
              .replace(/\n{3,}/g, '\n\n')
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .join('\n')
              // Fix common spelling mistakes
              .replace(/\bupto\b/gi, 'up to')
              .replace(/\balot\b/gi, 'a lot')
              .replace(/\bteh\b/gi, 'the')
              .replace(/\badn\b/gi, 'and')
              .replace(/\btaht\b/gi, 'that')
              .replace(/\brecieve\b/gi, 'receive')
              .replace(/\bseperate\b/gi, 'separate')
              .replace(/\boccured\b/gi, 'occurred')
              .replace(/\bbegining\b/gi, 'beginning')
              .replace(/\bexistance\b/gi, 'existence')
              // Remove remaining special characters
              .replace(/[^\w\s.,;:!?()\-'"/\n]/g, ' ')
              .replace(/[ \t]+/g, ' ')
              .trim();

            return cleaned;
          };

          const description = ('description' in exp ? exp.description : '') || '';
          const summary = ('summary' in exp ? exp.summary : '') || '';
          const achievements = ('achievements' in exp && Array.isArray(exp.achievements) ? exp.achievements : []) || [];
          const highlights = ('highlights' in exp && Array.isArray(exp.highlights) ? exp.highlights : []) || [];

          // Build full summary from all fields
          const parts = [description, summary];

          // Add achievements and highlights to summary (as paragraphs or bullet points)
          // Since we're merging, we'll format them as text
          [...achievements, ...highlights].forEach(item => {
            if (item && typeof item === 'string') parts.push(item);
          });

          // Filter empty strings and duplicates
          const uniqueParts = Array.from(new Set(parts.filter(Boolean)));

          const fullSummary = uniqueParts.map(p => cleanTextForATS(p)).join('\n\n');

          return fullSummary;
        })(),
        highlights: [] // Always empty highlights to prevent duplication (moved to summary)
      };
    }),
    volunteer: (parsedData.volunteer || []).map(vol => {
      // Handle both old format and new format
      const hasOrganization = vol && 'organization' in vol;
      const hasCurrent = vol && 'current' in vol;

      const summary = vol.summary || vol.description || '';
      const highlights = Array.isArray(vol.highlights) ? vol.highlights : [];

      const fullSummary = [summary, ...highlights].filter(Boolean).join('\n\n');

      return {
        organization: hasOrganization ? (vol.organization || '') : (vol.name || ''),
        position: vol.position || '',
        url: vol.url || '',
        startDate: vol.startDate || '',
        endDate: hasCurrent && vol.current ? '' : (vol.endDate || ''),
        summary: fullSummary,
        highlights: [] // Empty highlights to prevent duplication
      };
    }),
    education: (parsedData.education || []).map(edu => ({
      institution: edu.institution || '',
      url: '',
      area: edu.field || '',
      studyType: edu.degree || '',
      startDate: edu.startDate || '',
      endDate: edu.current ? '' : (edu.endDate || ''),
      score: edu.gpa || '',
      courses: []
    })),
    awards: [],
    certificates: [],
    publications: [],
    skills: (parsedData.skills || []).map(skill => {
      // Handle both old format (name/level/keywords) and new format (category/skills)
      if ('category' in skill && 'skills' in skill) {
        return {
          category: skill.category || '',
          skills: skill.skills || []
        };
      } else {
        // Old format conversion - check what properties exist
        if ('name' in skill && 'keywords' in skill) {
          // Old format with name/level/keywords
          return {
            category: (skill as any).name || '',
            skills: Array.isArray((skill as any).keywords) ? (skill as any).keywords : []
          };
        } else if ('category' in skill) {
          return {
            category: (skill as any).category || '',
            skills: []
          };
        } else {
          return {
            category: '',
            skills: []
          };
        }
      }
    }),
    languages: [],
    interests: [],
    references: [],
    projects: (parsedData.projects || []).map(proj => {
      const hasCurrent = proj && 'current' in proj;
      return {
        name: (('title' in proj && typeof proj.title === 'string' ? proj.title : '') || ('name' in proj && typeof proj.name === 'string' ? proj.name : '') || '') as string,
        startDate: proj.startDate || '',
        endDate: hasCurrent && proj.current ? '' : (proj.endDate || ''),
        keywords: ('technologies' in proj ? proj.technologies : []) || ('keywords' in proj ? proj.keywords : []) || [],
        description: (() => {
          const desc = proj.description || '';
          const highlights = ('highlights' in proj && Array.isArray(proj.highlights) ? proj.highlights : []) || [];
          if (highlights.length === 0) return desc;
          const points = highlights.map(h => `• ${h}`).join('\n');
          return desc ? `${desc}\n\n${points}` : points;
        })(),
        highlights: [],
        url: proj.url || ''
      };
    })
  };
}

/**
 * Convert master CV onboarding data to unified CV structure
 */
export function adaptMasterCVToUnified(masterData: MasterCVOnboardingData): UnifiedCVDataStructure {
  return {
    basics: {
      name: masterData.fullName,
      label: masterData.professionalTitle,
      image: '',
      email: masterData.email,
      phone: masterData.phone,
      url: masterData.website,
      summary: masterData.summary,
      location: {
        address: '',
        postalCode: '',
        city: masterData.location,
        countryCode: '',
        region: ''
      },
      profiles: [
        ...(masterData.linkedin ? [{
          network: 'linkedin',
          username: '',
          url: masterData.linkedin
        }] : []),
        ...(masterData.github ? [{
          network: 'github',
          username: '',
          url: masterData.github
        }] : [])
      ]
    },
    work: masterData.workExperience.map(exp => ({
      name: exp.company,
      position: exp.jobTitle,
      url: '',
      startDate: exp.startDate,
      endDate: exp.isCurrent ? '' : exp.endDate,
      summary: exp.description,
      highlights: []
    })),
    volunteer: [],
    education: masterData.education.map(edu => ({
      institution: edu.institution,
      url: '',
      area: '',
      studyType: edu.degree,
      startDate: edu.startDate,
      endDate: edu.isCurrent ? '' : edu.endDate,
      score: '',
      courses: []
    })),
    awards: [],
    certificates: [],
    publications: [],
    skills: masterData.skills.map(skill => ({
      category: skill,
      skills: []
    })),
    languages: masterData.languages.map(lang => ({
      language: lang.language,
      fluency: lang.proficiency
    })),
    interests: masterData.interests.map(interest => ({
      name: interest,
      keywords: []
    })),
    references: [],
    projects: masterData.projects.map(proj => ({
      name: proj.name,
      startDate: proj.startDate,
      endDate: proj.endDate,
      description: proj.description,
      highlights: proj.technologies.split(',').map(t => t.trim()),
      keywords: [],
      url: proj.url
    }))
  };
}

/**
 * Convert unified CV structure to database format
 */
export function adaptUnifiedToDatabase(
  unifiedData: UnifiedCVDataStructure,
  userId: string,
  templateId: string,
  title: string = 'My CV'
): Partial<DatabaseCVData> {
  return {
    userId,
    title,
    cvData: unifiedData,
    templateId,
    status: 'draft',
    version: 1,
    metadata: {
      isMaster: false,
      lastModified: new Date(),
      tags: [],
      isPublic: false,
      viewCount: 0,
      downloadCount: 0,
      starred: false
    }
  };
}

/**
 * Convert database CV data to unified structure
 */
export function adaptDatabaseToUnified(dbData: DatabaseCVData): UnifiedCVDataStructure {
  return dbData.cvData;
}

/**
 * Get section data by section key from unified CV structure
 */
export function getSectionDataByKey(
  cvData: UnifiedCVDataStructure,
  sectionKey: string
): any {
  const mapping = SECTION_MAPPING[sectionKey];
  if (!mapping) {
    console.warn(`Unknown section key: ${sectionKey}`);
    return null;
  }

  return cvData[mapping.dataKey];
}

/**
 * Update section data in unified CV structure
 */
export function updateSectionDataByKey(
  cvData: UnifiedCVDataStructure,
  sectionKey: string,
  data: any
): UnifiedCVDataStructure {
  const mapping = SECTION_MAPPING[sectionKey];
  if (!mapping) {
    console.warn(`Unknown section key: ${sectionKey}`);
    return cvData;
  }

  return {
    ...cvData,
    [mapping.dataKey]: data
  };
}

/**
 * Validate CV data structure
 */
export function validateCVData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data) {
    errors.push('CV data is required');
    return { isValid: false, errors };
  }

  if (!data.basics) {
    errors.push('Basics section is required');
  } else {
    if (!data.basics.name) {
      errors.push('Name is required in basics section');
    }
    if (!data.basics.email) {
      errors.push('Email is required in basics section');
    }
  }

  // Validate array sections
  const arraySections = ['work', 'education', 'skills', 'projects', 'certificates', 'languages'];
  arraySections.forEach(section => {
    if (data[section] && !Array.isArray(data[section])) {
      errors.push(`${section} section must be an array`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get section display name by section key
 */
export function getSectionDisplayName(sectionKey: string): string {
  const mapping = SECTION_MAPPING[sectionKey];
  return mapping ? mapping.displayName : sectionKey;
}

/**
 * Get all available sections for a CV
 */
export function getAvailableSections(): Array<{
  key: string;
  displayName: string;
  description: string;
  icon: string;
  category: string;
  isRequired: boolean;
  isList: boolean;
}> {
  return Object.values(SECTION_MAPPING).map(mapping => ({
    key: mapping.frontendId,
    displayName: mapping.displayName,
    description: mapping.description,
    icon: mapping.icon,
    category: mapping.category,
    isRequired: mapping.isRequired,
    isList: mapping.isList
  }));
}

/**
 * Clean up CV data by removing highlights from summary fields
 * This fixes existing CVs that have highlights incorrectly appended to summary
 */
export function cleanupSummaryFields(cvData: UnifiedCVDataStructure): UnifiedCVDataStructure {
  if (!cvData) return cvData;

  const cleaned = { ...cvData };

  // Clean work experience summaries
  if (cleaned.work && Array.isArray(cleaned.work)) {
    cleaned.work = cleaned.work.map(job => {
      if (!job.summary || !job.highlights || !Array.isArray(job.highlights) || job.highlights.length === 0) {
        return job;
      }

      // Check if summary contains highlights text
      const summary = job.summary;
      const highlightsText = job.highlights.join('\n');

      // Remove highlights from summary if they appear at the end
      // Look for common patterns like "Key achievements", bullet points, or direct highlight text
      let cleanedSummary = summary;

      // Remove "Key achievements" section and everything after it
      const keyAchievementsRegex = /(?:\n\s*)?(?:Key\s+achievements?|Achievements?|Highlights?)[:\s]*\n/i;
      const keyAchievementsMatch = cleanedSummary.match(keyAchievementsRegex);
      if (keyAchievementsMatch) {
        cleanedSummary = cleanedSummary.substring(0, keyAchievementsMatch.index).trim();
      }

      // Remove individual highlights that appear at the end of summary
      // Check each highlight and remove it if it appears in the summary
      job.highlights.forEach(highlight => {
        if (highlight && typeof highlight === 'string') {
          const cleanHighlight = highlight.trim();
          // Remove bullet points and common prefixes
          const normalizedHighlight = cleanHighlight
            .replace(/^[●•▪▫◦‣⁃⁌⁍∙◘◙◉○◯◐◑◒◓◔◕◖◗◗◘◙◚◛◜◝◞◟◠◡]/g, '')
            .replace(/^[\s]*[-*→▶▸▹►▻▼▽▪▫]\s*/g, '')
            .replace(/^[\s]*[•◦‣]\s*/g, '')
            .trim();

          if (normalizedHighlight.length > 10) {
            // Check if this highlight appears in the summary (case-insensitive, partial match)
            const highlightLower = normalizedHighlight.toLowerCase();
            const summaryLower = cleanedSummary.toLowerCase();

            // Find and remove the highlight text from summary
            // Look for the highlight text, possibly with bullet points or formatting
            const patterns = [
              new RegExp(`\\n\\s*[-•*]?\\s*${escapeRegex(normalizedHighlight)}`, 'gi'),
              new RegExp(`\\n\\s*${escapeRegex(normalizedHighlight)}`, 'gi'),
              new RegExp(`${escapeRegex(normalizedHighlight)}`, 'gi')
            ];

            for (const pattern of patterns) {
              if (summaryLower.includes(highlightLower)) {
                // Find the position and remove it
                const match = cleanedSummary.match(pattern);
                if (match) {
                  const beforeMatch = cleanedSummary.substring(0, match.index || 0);
                  const afterMatch = cleanedSummary.substring((match.index || 0) + match[0].length);
                  cleanedSummary = (beforeMatch + afterMatch).trim();
                  break;
                }
              }
            }
          }
        }
      });

      // Clean up extra newlines
      cleanedSummary = cleanedSummary.replace(/\n{3,}/g, '\n\n').trim();

      return {
        ...job,
        summary: cleanedSummary
      };
    });
  }

  return cleaned;
}

/**
 * Helper function to escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
