import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

/**
 * LinkedIn Profile Data Structure (based on v2 API)
 */
export interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: {
    'displayImage~': {
      elements: Array<{
        identifiers: Array<{
          identifier: string;
        }>;
      }>;
    };
  };
  headline?: string;
  summary?: string;
  vanityName?: string;
  locationName?: string;
  positions?: {
    values: Array<{
      id: string;
      title: string;
      summary?: string;
      startDate?: {
        year: number;
        month?: number;
        day?: number;
      };
      endDate?: {
        year: number;
        month?: number;
        day?: number;
      };
      company?: {
        name: string;
        url?: string;
      };
    }>;
    _total: number;
  };
  educations?: {
    values: Array<{
      id: string;
      schoolName: string;
      degree?: string;
      fieldOfStudy?: string;
      startDate?: {
        year: number;
        month?: number;
        day?: number;
      };
      endDate?: {
        year: number;
        month?: number;
        day?: number;
      };
    }>;
    _total: number;
  };
  skills?: {
    values: Array<{
      id: string;
      name: string;
    }>;
    _total: number;
  };
  languages?: {
    values: Array<{
      id: string;
      language: {
        name: string;
      };
      proficiency?: {
        name: string;
      };
    }>;
    _total: number;
  };
  emailAddress?: string;
  publicProfileUrl?: string;
}

/**
 * Map LinkedIn profile data to UnifiedCVDataStructure
 */
export const mapLinkedInProfileToCV = (profile: LinkedInProfile): UnifiedCVDataStructure => {
  // Extract profile picture URL
  let imageUrl = '';
  if (profile.profilePicture?.['displayImage~']?.elements) {
    const elements = profile.profilePicture['displayImage~'].elements;
    if (elements.length > 0 && elements[0].identifiers?.length > 0) {
      imageUrl = elements[0].identifiers[0].identifier;
    }
  }

  // Build full name
  const fullName = `${profile.localizedFirstName || ''} ${profile.localizedLastName || ''}`.trim() || profile.id;

  return {
    basics: {
      name: fullName,
      label: profile.headline || '',
      image: imageUrl,
      email: profile.emailAddress || '',
      phone: '',
      url: profile.publicProfileUrl || `https://www.linkedin.com/in/${profile.vanityName || profile.id}`,
      summary: profile.summary || '',
      location: {
        address: profile.locationName || '',
        postalCode: '',
        city: profile.locationName?.split(',')[0] || '',
        countryCode: '',
        region: '',
      },
      profiles: [
        {
          network: 'LinkedIn',
          username: profile.vanityName || profile.id,
          url: profile.publicProfileUrl || `https://www.linkedin.com/in/${profile.vanityName || profile.id}`,
        },
      ],
    },
    work: (profile.positions?.values || []).map((position) => ({
      name: position.company?.name || '',
      position: position.title || '',
      url: position.company?.url || '',
      startDate: formatLinkedInDate(position.startDate),
      endDate: formatLinkedInDate(position.endDate) || 'Present',
      summary: position.summary || '',
      highlights: [],
    })),
    education: (profile.educations?.values || []).map((education) => ({
      institution: education.schoolName || '',
      url: '',
      area: education.fieldOfStudy || '',
      studyType: education.degree || '',
      startDate: formatLinkedInDate(education.startDate) || '',
      endDate: formatLinkedInDate(education.endDate) || '',
      score: '',
      courses: [],
    })),
    volunteer: [],
    skills: (profile.skills?.values || []).map((skill) => ({
      category: 'General',
      skills: [skill.name],
    })),
    projects: [],
    awards: [],
    certificates: [],
    publications: [],
    languages: (profile.languages?.values || []).map((lang) => ({
      language: lang.language?.name || '',
      fluency: mapLinkedInProficiency(lang.proficiency?.name) || '',
    })),
    interests: [],
    references: [],
  };
};

/**
 * Format LinkedIn date object to YYYY-MM-DD string
 */
const formatLinkedInDate = (date?: {
  year: number;
  month?: number;
  day?: number;
}): string => {
  if (!date) return '';
  const year = date.year;
  const month = date.month || 1;
  const day = date.day || 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Map LinkedIn proficiency to standard format
 */
const mapLinkedInProficiency = (proficiency?: string): string => {
  if (!proficiency) return '';
  const proficiencyMap: Record<string, string> = {
    'elementary': 'Elementary proficiency',
    'limited_working': 'Limited working proficiency',
    'professional_working': 'Professional working proficiency',
    'full_professional': 'Full professional proficiency',
    'native_or_bilingual': 'Native or bilingual proficiency',
  };
  return proficiencyMap[proficiency.toLowerCase()] || proficiency;
};
