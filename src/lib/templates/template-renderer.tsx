import React from 'react';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate, ISectionBlueprint } from '@/models/Template';
import { generateTemplateCSS } from './default-template';

// Component registry for dynamic section rendering
import PersonalHeader from '@/components/cv-sections/PersonalHeader';
import WorkExperience from '@/components/cv-sections/WorkExperience';
import Education from '@/components/cv-sections/Education';
import Skills from '@/components/cv-sections/Skills';
import Projects from '@/components/cv-sections/Projects';
import Certificates from '@/components/cv-sections/Certificates';
import Languages from '@/components/cv-sections/Languages';
import Volunteer from '@/components/cv-sections/Volunteer';
import Awards from '@/components/cv-sections/Awards';
import Publications from '@/components/cv-sections/Publications';

// Component registry mapping
const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  PersonalHeader,
  WorkExperience,
  Education,
  Skills,
  Projects,
  Certificates,
  Languages,
  Volunteer,
  Awards,
  Publications
};

// Data mapping interface for CV sections
interface SectionDataMapping {
  personal_header: 'basics';
  work_experience: 'work';
  education: 'education';
  skills: 'skills';
  projects: 'projects';
  certificates: 'certificates';
  languages: 'languages';
  volunteer: 'volunteer';
  awards: 'awards';
  publications: 'publications';
}

const SECTION_DATA_MAP: Record<keyof SectionDataMapping, keyof UnifiedCVDataStructure> = {
  personal_header: 'basics',
  work_experience: 'work',
  education: 'education',
  skills: 'skills',
  projects: 'projects',
  certificates: 'certificates',
  languages: 'languages',
  volunteer: 'volunteer',
  awards: 'awards',
  publications: 'publications'
};

export interface TemplateRendererProps {
  cvData: UnifiedCVDataStructure;
  template: ITemplate;
  className?: string;
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  enabledSections?: string[];
  customStyles?: React.CSSProperties;
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  cvData,
  template,
  className = '',
  sectionOrder,
  sectionVisibility = {},
  enabledSections,
  customStyles = {}
}) => {
  // Generate CSS variables from template styles
  const templateCSS = generateTemplateCSS(template.globalStyles);
  
  // Determine which sections to render
  const sectionsToRender = getSectionsToRender(
    template.availableSections,
    sectionOrder,
    sectionVisibility,
    enabledSections
  );

  // Check if section has data
  const hasDataForSection = (sectionKey: string): boolean => {
    const dataKey = SECTION_DATA_MAP[sectionKey as keyof SectionDataMapping];
    if (!dataKey || !cvData[dataKey]) return false;

    const data = cvData[dataKey];
    
    // For array sections, check if array has items
    if (Array.isArray(data)) {
      return data.length > 0;
    }
    
    // For object sections (like basics), check if it has meaningful content
    if (typeof data === 'object' && data !== null) {
      return Object.values(data).some(value => {
        if (typeof value === 'string') return value.trim() !== '';
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(v => typeof v === 'string' && v.trim() !== '');
        }
        return false;
      });
    }
    
    return false;
  };

  return (
    <>
      {/* Inject template CSS */}
      <style dangerouslySetInnerHTML={{ __html: templateCSS + (template.globalStyles.customCSS || '') }} />
      
      <div 
        className={`cv-container ${className}`}
        style={{
          fontFamily: template.globalStyles.fontFamily,
          fontSize: template.globalStyles.fontSize,
          lineHeight: template.globalStyles.lineHeight,
          backgroundColor: template.globalStyles.backgroundColor,
          color: template.globalStyles.primaryColor,
          ...customStyles
        }}
      >
        {sectionsToRender.map((section) => {
          // Skip sections with no data (unless it's a required section)
          if (!hasDataForSection(section.key) && !section.minItems) {
            return null;
          }

          const Component = COMPONENT_REGISTRY[section.componentName];
          if (!Component) {
            console.warn(`Component ${section.componentName} not found in registry`);
            return null;
          }

          const dataKey = SECTION_DATA_MAP[section.key as keyof SectionDataMapping];
          const sectionData = dataKey ? cvData[dataKey] : null;

          return (
            <div key={section.key} className="section-content">
              <Component
                data={sectionData}
                sectionConfig={section}
                template={template}
                cvData={cvData}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};

// Helper function to determine which sections to render
function getSectionsToRender(
  availableSections: ISectionBlueprint[],
  sectionOrder?: string[],
  sectionVisibility?: Record<string, boolean>,
  enabledSections?: string[]
): ISectionBlueprint[] {
  let sectionsToRender = [...availableSections];

  // Filter by enabled sections if provided
  if (enabledSections) {
    sectionsToRender = sectionsToRender.filter(section => 
      enabledSections.includes(section.key)
    );
  }

  // Filter by visibility settings
  if (sectionVisibility && Object.keys(sectionVisibility).length > 0) {
    sectionsToRender = sectionsToRender.filter(section => 
      sectionVisibility[section.key] !== false
    );
  }

  // Apply custom order if provided
  if (sectionOrder) {
    const orderMap = new Map(sectionOrder.map((key, index) => [key, index]));
    sectionsToRender.sort((a, b) => {
      const aOrder = orderMap.get(a.key) ?? 999;
      const bOrder = orderMap.get(b.key) ?? 999;
      return aOrder - bOrder;
    });
  }

  return sectionsToRender;
}

// Template validation helper
export function validateTemplateData(cvData: UnifiedCVDataStructure, template: ITemplate): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required sections
  template.availableSections.forEach(section => {
    if (section.minItems && section.minItems > 0) {
      const dataKey = SECTION_DATA_MAP[section.key as keyof SectionDataMapping];
      if (dataKey) {
        const data = cvData[dataKey];
        
        if (!data) {
          errors.push(`Required section "${section.displayName}" is missing data`);
        } else if (Array.isArray(data) && data.length < section.minItems!) {
          errors.push(`Section "${section.displayName}" requires at least ${section.minItems} items, but has ${data.length}`);
        }
      }
    }

    // Check maximum items
    if (section.maxItems) {
      const dataKey = SECTION_DATA_MAP[section.key as keyof SectionDataMapping];
      if (dataKey) {
        const data = cvData[dataKey];
        
        if (Array.isArray(data) && data.length > section.maxItems) {
          warnings.push(`Section "${section.displayName}" has ${data.length} items, which exceeds the recommended maximum of ${section.maxItems}`);
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Template preview generator
export function generateTemplatePreview(template: ITemplate): UnifiedCVDataStructure {
  return {
    basics: template.templateData?.sampleBasics || {
      name: 'Jane Doe',
      label: 'Software Engineer',
      image: '',
      email: 'jane.doe@email.com',
      phone: '+1 (555) 123-4567',
      url: 'https://janedoe.dev',
      summary: 'Passionate software engineer with experience in modern web technologies.',
      location: {
        address: '',
        postalCode: '',
        city: 'San Francisco',
        countryCode: 'US',
        region: 'CA'
      },
      profiles: [
        { network: 'LinkedIn', username: 'janedoe', url: 'https://linkedin.com/in/janedoe' },
        { network: 'GitHub', username: 'janedoe', url: 'https://github.com/janedoe' }
      ]
    },
    work: template.templateData?.sampleWork || [
      {
        name: 'Tech Company',
        position: 'Software Engineer',
        url: 'https://techcompany.com',
        startDate: '2021-01',
        endDate: '',
        summary: 'Developing innovative software solutions.',
        highlights: [
          'Built scalable web applications',
          'Collaborated with cross-functional teams'
        ]
      }
    ],
    volunteer: template.templateData?.sampleVolunteer || [],
    education: template.templateData?.sampleEducation || [
      {
        institution: 'University of Technology',
        url: '',
        area: 'Computer Science',
        studyType: 'Bachelor of Science',
        startDate: '2017-09',
        endDate: '2021-05',
        score: '3.8 GPA',
        courses: []
      }
    ],
    awards: template.templateData?.sampleAwards || [],
    certificates: template.templateData?.sampleCertificates || [],
    publications: template.templateData?.samplePublications || [],
    skills: template.templateData?.sampleSkills || [
      {
        name: 'Programming',
        level: 'Advanced',
        keywords: ['JavaScript', 'TypeScript', 'React', 'Node.js']
      }
    ],
    languages: template.templateData?.sampleLanguages || [
      { language: 'English', fluency: 'Native' },
      { language: 'Spanish', fluency: 'Intermediate' }
    ],
    interests: template.templateData?.sampleInterests || [
      { name: 'Technology', keywords: ['AI', 'Web Development'] }
    ],
    references: template.templateData?.sampleReferences || [],
    projects: template.templateData?.sampleProjects || [
      {
        name: 'Portfolio Website',
        startDate: '2023-01',
        endDate: '2023-03',
        description: 'Personal portfolio built with React and Next.js',
        highlights: ['Responsive design', 'SEO optimized'],
        url: 'https://janedoe.dev'
      }
    ]
  };
}

export default TemplateRenderer;
