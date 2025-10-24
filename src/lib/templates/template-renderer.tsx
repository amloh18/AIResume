import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate, ISectionBlueprint } from '@/models/Template';
import { generateTemplateCSS } from './default-template';
import { convertToTemplateSectionOrder } from '@/lib/section-mapping';

// Component registry for dynamic section rendering
import PersonalHeader from '@/components/cv-sections/PersonalHeader';
import Profile from '@/components/cv-sections/Profile';
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
  PersonalHeaderSection: PersonalHeader, // Alias
  HeaderSection: PersonalHeader, // Alias for new naming
  Profile,
  ProfileSection: Profile, // Alias
  WorkExperience,
  WorkExperienceSection: WorkExperience, // Alias
  ExperienceSection: WorkExperience, // Alias for new naming
  Education,
  EducationSection: Education, // Alias for new naming
  Skills,
  SkillsSection: Skills, // Alias for new naming
  Projects,
  ProjectsSection: Projects, // Alias for new naming
  Certificates,
  CertificatesSection: Certificates, // Alias for new naming
  Languages,
  LanguagesSection: Languages, // Alias for new naming
  Volunteer,
  VolunteerSection: Volunteer, // Alias for new naming
  Awards,
  AwardsSection: Awards, // Alias for new naming
  Publications,
  PublicationsSection: Publications, // Alias for new naming
  SummarySection: Profile, // Use Profile for summary section
  ContactSection: PersonalHeader // Use PersonalHeader for contact
};

// Data mapping interface for CV sections
interface SectionDataMapping {
  personal_header: 'basics';
  header: 'basics';
  summary: 'basics';
  profile: 'basics';
  work_experience: 'work';
  experience: 'work';
  education: 'education';
  skills: 'skills';
  projects: 'projects';
  certificates: 'certificates';
  languages: 'languages';
  volunteer: 'volunteer';
  awards: 'awards';
  publications: 'publications';
  contact: 'basics';
}

const SECTION_DATA_MAP: Record<keyof SectionDataMapping, keyof UnifiedCVDataStructure> = {
  personal_header: 'basics',
  header: 'basics',
  summary: 'basics',
  profile: 'basics',
  work_experience: 'work',
  experience: 'work',
  education: 'education',
  skills: 'skills',
  projects: 'projects',
  certificates: 'certificates',
  languages: 'languages',
  volunteer: 'volunteer',
  awards: 'awards',
  publications: 'publications',
  contact: 'basics'
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
  
  // Convert frontend section order to template section order
  const templateSectionOrder = sectionOrder ? convertToTemplateSectionOrder(sectionOrder) : undefined;
  
  // Determine which sections to render
  let sectionsToRender = getSectionsToRender(
    template.availableSections,
    templateSectionOrder,
    sectionVisibility,
    enabledSections
  );
  
  
  // CRITICAL: Ensure personal_header is ALWAYS first, regardless of any other logic
  sectionsToRender = sectionsToRender.sort((a, b) => {
    if (a.key === 'personal_header') return -1;
    if (b.key === 'personal_header') return 1;
    return 0;
  });


  // Check if section has data
  const hasDataForSection = (sectionKey: string): boolean => {
    const dataKey = SECTION_DATA_MAP[sectionKey as keyof SectionDataMapping];
    if (!dataKey) return false;

    const data = cvData[dataKey];
    
    // If no data exists, return false
    if (!data) return false;
    
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
          // Always render sections that are in the template, regardless of data
          // The section components themselves will handle empty data gracefully

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

  // Filter by enabled sections if provided - THIS IS THE KEY FILTER FOR PAGE SPLITTING
  if (enabledSections && enabledSections.length > 0) {
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
  if (sectionOrder && sectionOrder.length > 0) {
    const orderMap = new Map(sectionOrder.map((key, index) => [key, index]));
    sectionsToRender.sort((a, b) => {
      const aOrder = orderMap.get(a.key) ?? 999;
      const bOrder = orderMap.get(b.key) ?? 999;
      return aOrder - bOrder;
    });
  }
  // Note: personal_header priority is enforced at the renderer level

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
        description: '',
        highlights: ['Responsive design', 'SEO optimized'],
        url: 'https://janedoe.dev'
      }
    ]
  };
}

export default TemplateRenderer;
