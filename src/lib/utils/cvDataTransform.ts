import { CVDataStructure } from '@/types/cv';

// Simplified database CV format - only what's needed for saving
export interface DatabaseCVData {
  basics: {
    name: string;
    email: string;
    phone: string;
    url: string;
    summary: string;
    location: {
      address: string;
      city: string;
    };
    profiles: Array<{
      network: string;
      url: string;
    }>;
  };
  work: Array<{
    name: string;
    position: string;
    startDate: string;
    endDate: string;
    summary: string;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    area: string;
    studyType: string;
    startDate: string;
    endDate: string;
    score: string;
  }>;
  skills: Array<{
    name: string;
    keywords: string[];
  }>;
  projects: Array<{
    name: string;
    startDate: string;
    endDate: string;
    description: string;
    url: string;
  }>;
  certificates: Array<{
    name: string;
    date: string;
    issuer: string;
    url: string;
  }>;
  languages: Array<{
    language: string;
    fluency: string;
  }>;
}

// Transform database CV data to Studio format
export const transformDatabaseToStudio = (dbData: DatabaseCVData): CVDataStructure => {
  return {
    basics: {
      name: dbData.basics.name || '',
      label: '',
      image: '',
      email: dbData.basics.email || '',
      phone: dbData.basics.phone || '',
      url: dbData.basics.url || '',
      summary: dbData.basics.summary || '',
      location: {
        address: dbData.basics.location?.address || '',
        postalCode: '',
        city: dbData.basics.location?.city || '',
        countryCode: '',
        region: ''
      },
      profiles: dbData.basics.profiles?.map(profile => ({
        network: profile.network,
        username: '',
        url: profile.url
      })) || []
    },
    work: dbData.work?.map(work => ({
      name: work.name || '',
      position: work.position || '',
      url: '',
      startDate: work.startDate || '',
      endDate: work.endDate || '',
      summary: work.summary || '',
      highlights: work.highlights || []
    })) || [],
    volunteer: [],
    education: dbData.education?.map(edu => ({
      institution: edu.institution || '',
      url: '',
      area: edu.area || '',
      studyType: edu.studyType || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      score: edu.score || '',
      courses: []
    })) || [],
    awards: [],
    certificates: dbData.certificates?.map(cert => ({
      name: cert.name || '',
      date: cert.date || '',
      issuer: cert.issuer || '',
      url: cert.url || ''
    })) || [],
    publications: [],
    skills: dbData.skills?.map(skill => ({
      name: skill.name || '',
      level: '',
      keywords: skill.keywords || []
    })) || [],
    languages: dbData.languages?.map(lang => ({
      language: lang.language || '',
      fluency: lang.fluency || ''
    })) || [],
    interests: [],
    references: [],
    projects: dbData.projects?.map(proj => ({
      name: proj.name || '',
      startDate: proj.startDate || '',
      endDate: proj.endDate || '',
      description: proj.description || '',
      highlights: [],
      url: proj.url || ''
    })) || []
  };
};

// Transform Studio format to database format
export const transformStudioToDatabase = (studioData: CVDataStructure): DatabaseCVData => {
  return {
    basics: {
      name: studioData.basics.name || '',
      email: studioData.basics.email || '',
      phone: studioData.basics.phone || '',
      url: studioData.basics.url || '',
      summary: studioData.basics.summary || '',
      location: {
        address: studioData.basics.location.address || '',
        city: studioData.basics.location.city || ''
      },
      profiles: studioData.basics.profiles?.map(profile => ({
        network: profile.network,
        url: profile.url
      })) || []
    },
    work: studioData.work?.map(work => ({
      name: work.name || '',
      position: work.position || '',
      startDate: work.startDate || '',
      endDate: work.endDate || '',
      summary: work.summary || '',
      highlights: work.highlights || []
    })) || [],
    education: studioData.education?.map(edu => ({
      institution: edu.institution || '',
      area: edu.area || '',
      studyType: edu.studyType || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      score: edu.score || ''
    })) || [],
    skills: studioData.skills?.map(skill => ({
      name: skill.name || '',
      keywords: skill.keywords || []
    })) || [],
    projects: studioData.projects?.map(proj => ({
      name: proj.name || '',
      startDate: proj.startDate || '',
      endDate: proj.endDate || '',
      description: proj.description || '',
      url: proj.url || ''
    })) || [],
    certificates: studioData.certificates?.map(cert => ({
      name: cert.name || '',
      date: cert.date || '',
      issuer: cert.issuer || '',
      url: cert.url || ''
    })) || [],
    languages: studioData.languages?.map(lang => ({
      language: lang.language || '',
      fluency: lang.fluency || ''
    })) || []
  };
};
