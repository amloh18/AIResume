import React from 'react';

interface CVData {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    title?: string;
    summary?: string;
  };
  experience?: Array<{
    company?: string;
    position?: string;
    duration?: string;
    description?: string;
    title?: string;
    dateRange?: string;
    bullets?: string[];
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    duration?: string;
    description?: string;
    degreeTitle?: string;
    dateRange?: string;
    grade?: string;
  }>;
  skills?: Array<string>;
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string;
    title?: string;
    dateRange?: string;
    bullets?: string[];
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    date?: string;
    description?: string;
  }>;
  languages?: Array<{
    language?: string;
    proficiency?: string;
  }>;
  [key: string]: any;
}

interface TemplateSection {
  key: string;
  displayName: string;
  componentName: string;
  isList: boolean;
  defaultItemContent: any;
}

interface PreviewBridgeProps {
  cvData: CVData;
  templateSections: TemplateSection[];
  className?: string;
}

// Enhanced section mapping dictionary for complex data structures
const SECTION_MAPPING = {
  // Personal Information mappings
  'personal_info': {
    displayName: 'Personal Information',
    dataKeys: ['personalInfo', 'fullName', 'contact', 'profileSummary'],
    fallbackData: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      title: 'Professional',
      summary: 'Experienced professional with expertise in various domains.'
    }
  },
  'header': {
    displayName: 'Header',
    dataKeys: ['personalInfo', 'fullName', 'contact', 'profileSummary'],
    fallbackData: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      title: 'Professional',
      summary: 'Experienced professional with expertise in various domains.'
    }
  },

  // Experience mappings
  'experience': {
    displayName: 'Work Experience',
    dataKeys: ['experience', 'workExperience.positions', 'workExperience'],
    fallbackData: [{
      company: 'Company Name',
      position: 'Job Title',
      duration: '2020 - Present',
      description: 'Job description and responsibilities.'
    }]
  },
  'workExperience': {
    displayName: 'Work Experience',
    dataKeys: ['experience', 'workExperience.positions', 'workExperience'],
    fallbackData: [{
      company: 'Company Name',
      position: 'Job Title',
      duration: '2020 - Present',
      description: 'Job description and responsibilities.'
    }]
  },
  'positions': {
    displayName: 'Positions',
    dataKeys: ['experience', 'workExperience.positions', 'workExperience'],
    fallbackData: [{
      company: 'Company Name',
      position: 'Job Title',
      duration: '2020 - Present',
      description: 'Job description and responsibilities.'
    }]
  },

  // Education mappings
  'education': {
    displayName: 'Education',
    dataKeys: ['education', 'education.degrees', 'academicBackground'],
    fallbackData: [{
      institution: 'University Name',
      degree: 'Degree Title',
      duration: '2016 - 2020',
      description: 'Educational achievements and focus areas.'
    }]
  },
  'degrees': {
    displayName: 'Education',
    dataKeys: ['education', 'education.degrees', 'academicBackground'],
    fallbackData: [{
      institution: 'University Name',
      degree: 'Degree Title',
      duration: '2016 - 2020',
      description: 'Educational achievements and focus areas.'
    }]
  },

  // Skills mappings
  'skills': {
    displayName: 'Skills',
    dataKeys: ['skills', 'skillsQualifications.skillsGroups', 'skillsList', 'skillsCommaList', 'skillsWithDots'],
    fallbackData: ['Skill 1', 'Skill 2', 'Skill 3', 'Skill 4', 'Skill 5']
  },
  'skillsList': {
    displayName: 'Skills',
    dataKeys: ['skills', 'skillsQualifications.skillsGroups', 'skillsList', 'skillsCommaList', 'skillsWithDots'],
    fallbackData: ['Skill 1', 'Skill 2', 'Skill 3', 'Skill 4', 'Skill 5']
  },
  'skillsQualifications': {
    displayName: 'Skills & Qualifications',
    dataKeys: ['skills', 'skillsQualifications.skillsGroups', 'skillsList', 'skillsCommaList', 'skillsWithDots'],
    fallbackData: ['Skill 1', 'Skill 2', 'Skill 3', 'Skill 4', 'Skill 5']
  },

  // Projects mappings
  'projects': {
    displayName: 'Projects',
    dataKeys: ['projects', 'projectExperience.projects', 'projectExperience'],
    fallbackData: [{
      name: 'Project Name',
      description: 'Project description and outcomes.',
      technologies: 'Technologies used'
    }]
  },
  'projectExperience': {
    displayName: 'Project Experience',
    dataKeys: ['projects', 'projectExperience.projects', 'projectExperience'],
    fallbackData: [{
      name: 'Project Name',
      description: 'Project description and outcomes.',
      technologies: 'Technologies used'
    }]
  },

  // Leadership/Responsibility mappings
  'positionsOfResponsibility': {
    displayName: 'Positions of Responsibility',
    dataKeys: ['positionsOfResponsibility.positions', 'positionsOfResponsibility', 'leadership'],
    fallbackData: [{
      title: 'Leadership Role',
      organization: 'Organization Name',
      dateRange: '2020 - Present',
      description: 'Leadership responsibilities and achievements.'
    }]
  },
  'leadership': {
    displayName: 'Leadership',
    dataKeys: ['positionsOfResponsibility.positions', 'positionsOfResponsibility', 'leadership'],
    fallbackData: [{
      title: 'Leadership Role',
      organization: 'Organization Name',
      dateRange: '2020 - Present',
      description: 'Leadership responsibilities and achievements.'
    }]
  },

  // Certifications mappings
  'certifications': {
    displayName: 'Certifications',
    dataKeys: ['certifications'],
    fallbackData: [{
      name: 'Certification Name',
      issuer: 'Issuing Organization',
      date: '2023',
      description: 'Certification description'
    }]
  },

  // Languages mappings
  'languages': {
    displayName: 'Languages',
    dataKeys: ['languages', 'languagesList', 'languageChips', 'languagesBullets'],
    fallbackData: [{
      language: 'English',
      proficiency: 'Native'
    }]
  },

  // Summary mappings
  'summary': {
    displayName: 'Summary',
    dataKeys: ['personalInfo', 'profileSummary', 'summary'],
    fallbackData: 'Professional summary and career objectives.'
  },
  'profileSummary': {
    displayName: 'Profile Summary',
    dataKeys: ['personalInfo', 'profileSummary', 'summary'],
    fallbackData: 'Professional summary and career objectives.'
  },

  // Awards mappings
  'awards': {
    displayName: 'Awards',
    dataKeys: ['awards'],
    fallbackData: ['Award 1', 'Award 2', 'Award 3']
  },

  // Quote mappings
  'favoriteQuote': {
    displayName: 'Favorite Quote',
    dataKeys: ['favoriteQuote', 'quote'],
    fallbackData: 'Your favorite inspirational quote here.'
  }
};

const PreviewBridge: React.FC<PreviewBridgeProps> = ({ 
  cvData, 
  templateSections, 
  className = '' 
}) => {
  
  // Enhanced data extraction function for nested structures
  const extractNestedData = (data: any, path: string): any => {
    if (!data || !path) return null;
    
    const keys = path.split('.');
    let current = data;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }
    
    return current;
  };

  // Clean and validate CV data with enhanced nested structure support
  const cleanCVData = (data: any): any => {
    if (!data || typeof data !== 'object') {
      return {
        personalInfo: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          location: 'San Francisco, CA',
          title: 'Professional',
          summary: 'Experienced professional with expertise in various domains.'
        },
        experience: [{
          company: 'Company Name',
          position: 'Job Title',
          duration: '2020 - Present',
          description: 'Job description and responsibilities.'
        }],
        education: [{
          institution: 'University Name',
          degree: 'Degree Title',
          duration: '2016 - 2020',
          description: 'Educational achievements and focus areas.'
        }],
        skills: ['Skill 1', 'Skill 2', 'Skill 3', 'Skill 4', 'Skill 5'],
        projects: [{
          name: 'Project Name',
          description: 'Project description and outcomes.',
          technologies: 'Technologies used'
        }]
      };
    }

    // If data contains template metadata, extract only CV data
    if (data.name && data.category && data.templateData) {
      return cleanCVData(data.templateData);
    }

    // If data contains template metadata directly, extract CV data
    if (data.name && data.category && !data.personalInfo && !data.fullName) {
      const cvDataKeys = ['personalInfo', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'fullName', 'contact', 'profileSummary', 'workExperience', 'positionsOfResponsibility', 'projectExperience', 'skillsQualifications', 'awards', 'favoriteQuote'];
      const cleanData: any = {};
      
      cvDataKeys.forEach(key => {
        if (data[key]) {
          cleanData[key] = data[key];
        }
      });
      
      return Object.keys(cleanData).length > 0 ? cleanData : cleanCVData(null);
    }

    return data;
  };

  const cleanedCVData = cleanCVData(cvData);
  
  // Enhanced smart data mapping function with nested path support
  const getMappedData = (sectionKey: string): any => {
    const mapping = SECTION_MAPPING[sectionKey as keyof typeof SECTION_MAPPING];
    
    if (!mapping) {
      // If no mapping found, try to find data by key name
      return cleanedCVData[sectionKey] || null;
    }

    // Try to get data from mapped keys (including nested paths)
    for (const dataKey of mapping.dataKeys) {
      if (dataKey.includes('.')) {
        // Handle nested paths like 'workExperience.positions'
        const nestedData = extractNestedData(cleanedCVData, dataKey);
        if (nestedData) {
          return nestedData;
        }
      } else if (cleanedCVData[dataKey]) {
        return cleanedCVData[dataKey];
      }
    }

    // Return fallback data if no data found
    return mapping.fallbackData;
  };

  // Get section display name
  const getSectionDisplayName = (sectionKey: string): string => {
    const mapping = SECTION_MAPPING[sectionKey as keyof typeof SECTION_MAPPING];
    return mapping?.displayName || sectionKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  // Enhanced render section content with better handling of complex data structures
  const renderSectionContent = (section: TemplateSection, data: any) => {
    if (!data) return null;

    const displayName = getSectionDisplayName(section.key);

    if (section.isList && Array.isArray(data)) {
      return (
        <div key={section.key} className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1">
            {displayName}
          </h2>
          {data.map((item: any, index: number) => (
            <div key={index} className="mb-3">
              {item.company && (
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-900">{item.position || item.title || 'Position'}</h3>
                  <span className="text-sm text-gray-600">{item.duration || item.dateRange || 'Duration'}</span>
                </div>
              )}
              {item.institution && (
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-900">{item.degree || item.degreeTitle || 'Degree'}</h3>
                  <span className="text-sm text-gray-600">{item.duration || item.dateRange || 'Duration'}</span>
                </div>
              )}
              {item.company && <p className="text-sm text-blue-600">{item.company}</p>}
              {item.institution && <p className="text-sm text-blue-600">{item.institution}</p>}
              {item.description && <p className="text-sm text-gray-700">{item.description}</p>}
              {item.bullets && Array.isArray(item.bullets) && (
                <ul className="text-sm text-gray-700 mt-1">
                  {item.bullets.map((bullet: string, bulletIndex: number) => (
                    <li key={bulletIndex} className="ml-4 list-disc">{bullet}</li>
                  ))}
                </ul>
              )}
              {item.name && (
                <div>
                  <h3 className="font-medium text-gray-900">{item.name || item.title}</h3>
                  {item.description && <p className="text-sm text-gray-700">{item.description}</p>}
                  {item.technologies && <p className="text-sm text-blue-600">{item.technologies}</p>}
                </div>
              )}
              {item.organization && <p className="text-sm text-blue-600">{item.organization}</p>}
            </div>
          ))}
        </div>
      );
    }

    if (Array.isArray(data) && !section.isList) {
      // Handle skills array or other simple arrays
      return (
        <div key={section.key} className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1">
            {displayName}
          </h2>
          <p className="text-sm text-gray-700">{data.join(', ')}</p>
        </div>
      );
    }

    if (typeof data === 'object' && data !== null) {
      // Handle complex objects like skillsQualifications
      if (data.skillsGroups && Array.isArray(data.skillsGroups)) {
        return (
          <div key={section.key} className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1">
              {displayName}
            </h2>
            {data.skillsGroups.map((group: any, index: number) => (
              <div key={index} className="mb-3">
                <h3 className="font-medium text-gray-900 text-sm">{group.groupTitle}</h3>
                {group.items && Array.isArray(group.items) && (
                  <p className="text-sm text-gray-700">{group.items.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        );
      }

      // Handle personal info object
      return (
        <div key={section.key} className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1">
            {displayName}
          </h2>
          {data.name && <h1 className="text-2xl font-bold text-gray-900 mb-2">{data.name}</h1>}
          {data.title && <p className="text-lg text-blue-600 mb-1">{data.title}</p>}
          {data.email && data.phone && (
            <p className="text-sm text-gray-600">{data.email} • {data.phone}</p>
          )}
          {data.location && <p className="text-sm text-gray-600">{data.location}</p>}
          {data.summary && <p className="text-sm text-gray-700 mt-2">{data.summary}</p>}
        </div>
      );
    }

    if (typeof data === 'string') {
      return (
        <div key={section.key} className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1">
            {displayName}
          </h2>
          <p className="text-sm text-gray-700">{data}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`bg-white border border-gray-300 rounded-lg shadow-lg p-8 ${className}`}>
      {/* Header with personal info */}
      {cleanedCVData.personalInfo && (
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {cleanedCVData.personalInfo.name || cleanedCVData.fullName || 'John Doe'}
          </h1>
          <p className="text-lg text-blue-600 mb-1">
            {cleanedCVData.personalInfo.title || 'Professional'}
          </p>
          <p className="text-sm text-gray-600">
            {cleanedCVData.personalInfo.email || cleanedCVData.contact?.email || 'email@example.com'} • {cleanedCVData.personalInfo.phone || cleanedCVData.contact?.phone || '+1 (555) 123-4567'}
          </p>
          <p className="text-sm text-gray-600">
            {cleanedCVData.personalInfo.location || 'Location'}
          </p>
        </div>
      )}

      {/* Render sections based on template structure */}
      {templateSections.map((section) => {
        const mappedData = getMappedData(section.key);
        return renderSectionContent(section, mappedData);
      })}

      {/* Fallback: render any remaining data not covered by template sections */}
      {Object.keys(cleanedCVData).map((key) => {
        const sectionExists = templateSections.some(section => 
          section.key === key || 
          SECTION_MAPPING[key as keyof typeof SECTION_MAPPING] ||
          SECTION_MAPPING[section.key as keyof typeof SECTION_MAPPING]?.dataKeys.includes(key)
        );
        
        if (!sectionExists && cleanedCVData[key] && key !== 'personalInfo' && key !== 'fullName' && key !== 'contact') {
          return (
            <div key={key} className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1">
                {getSectionDisplayName(key)}
              </h2>
              {Array.isArray(cleanedCVData[key]) ? (
                <p className="text-sm text-gray-700">{cleanedCVData[key].join(', ')}</p>
              ) : (
                <p className="text-sm text-gray-700">{String(cleanedCVData[key])}</p>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

export default PreviewBridge; 