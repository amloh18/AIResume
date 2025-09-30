import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';

/**
 * Adapter utility to convert between CV data formats
 */

// Type guard to check if data is in UnifiedCVDataStructure format
export const isUnifiedCVDataStructure = (data: any): data is UnifiedCVDataStructure => {
  return data && typeof data === 'object' && 'basics' in data;
};

// Type guard to check if data is in old CVData format (for backward compatibility)
export const isOldCVData = (data: any): data is any => {
  return data && typeof data === 'object' && 'personalInfo' in data;
};

/**
 * Convert any CV data format to UnifiedCVDataStructure (JSON Resume format)
 */
export const toUnifiedCVDataStructure = (data: any): UnifiedCVDataStructure => {
  // If it's already UnifiedCVDataStructure format
  if (isUnifiedCVDataStructure(data)) {
    return data;
  }
  
  // Convert from old CVData format
  if (isOldCVData(data)) {
    return {
      basics: {
        name: `${data.personalInfo?.firstName || ''} ${data.personalInfo?.lastName || ''}`.trim(),
        label: '', // Not available in old format
        image: '',
        email: data.personalInfo?.email || '',
        phone: data.personalInfo?.phone || '',
        url: data.personalInfo?.website || '',
        summary: data.personalInfo?.summary || '',
        location: {
          address: '',
          postalCode: '',
          city: data.personalInfo?.location || '',
          countryCode: '',
          region: ''
        },
        profiles: [
          ...(data.personalInfo?.linkedin ? [{
            network: 'linkedin',
            username: '',
            url: data.personalInfo.linkedin
          }] : []),
          ...(data.personalInfo?.github ? [{
            network: 'github', 
            username: '',
            url: data.personalInfo.github
          }] : [])
        ]
      },
      work: data.experience?.map((exp: any) => ({
        name: exp.company || '',
        position: exp.jobTitle || '',
        url: '',
        startDate: exp.startDate || '',
        endDate: exp.current ? '' : exp.endDate || '',
        summary: exp.description || '',
        highlights: exp.achievements || []
      })) || [],
      volunteer: [],
      education: data.education?.map((edu: any) => ({
        institution: edu.institution || '',
        url: '',
        area: edu.field || '',
        studyType: edu.degree || '',
        startDate: edu.startDate || '',
        endDate: edu.current ? '' : edu.endDate || '',
        score: edu.gpa || '',
        courses: []
      })) || [],
      awards: [],
      certificates: data.certifications?.map((cert: any) => ({
        name: cert.name || '',
        date: cert.date || '',
        issuer: cert.issuer || '',
        url: cert.url || ''
      })) || [],
      publications: [],
      skills: data.skills?.map((skill: any) => ({
        name: skill.category || '',
        level: '',
        keywords: skill.skills || []
      })) || [],
      languages: data.languages?.map((lang: any) => ({
        language: lang.language || '',
        fluency: lang.proficiency || ''
      })) || [],
      interests: [],
      references: [],
      projects: data.projects?.map((proj: any) => ({
        name: proj.title || '',
        startDate: proj.startDate || '',
        endDate: proj.current ? '' : proj.endDate || '',
        description: proj.description || '',
        highlights: proj.technologies || [],
        url: proj.url || ''
      })) || []
    };
  }
  
  // Fallback: return empty structure
  return {
    basics: {
      name: '',
      label: '',
      image: '',
      email: '',
      phone: '',
      url: '',
      summary: '',
      location: {
        address: '',
        postalCode: '',
        city: '',
        countryCode: '',
        region: ''
      },
      profiles: []
    },
    work: [],
    volunteer: [],
    education: [],
    awards: [],
    certificates: [],
    publications: [],
    skills: [],
    languages: [],
    interests: [],
    references: [],
    projects: []
  };
};
