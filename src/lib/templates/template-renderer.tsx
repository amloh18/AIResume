import React, { memo } from 'react';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { ISectionBlueprint } from '@/models/Template';
import { generateTemplateCSS } from './default-template';
import { convertToTemplateSectionOrder } from '@/lib/section-mapping';
import { generateEnforcedCSS } from './shared-layout-css';
import * as CustomTemplates from './custom-renderers';

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

// Import hardcoded template system
import { CustomTemplates as HardcodedTemplates } from './hardcoded-templates';

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

const TemplateRendererComponent: React.FC<TemplateRendererProps> = ({
  cvData,
  template,
  className = '',
  sectionOrder, // Legacy prop - kept for backward compatibility
  sectionVisibility = {}, // Legacy prop - kept for backward compatibility
  enabledSections,
  customStyles = {}
}) => {
  // HOOK REMOVAL: Removed useMemo to avoid "Invalid hook call" errors during server-side PDF generation
  // where the React dispatcher might not be correctly initialized in the manual renderToString context.
  // Performance impact is negligible for these lightweight operations.

  // Generate CSS 
  const templateCSS = template?.globalStyles ? generateTemplateCSS(template.globalStyles) : '';

  // Combine CSS
  const combinedCSS = templateCSS + (template?.globalStyles?.customCSS || '');

  // Get sections from structure if available
  let sectionsFromStructure = null;
  if (cvData?.structure?.sections && Array.isArray(cvData.structure.sections)) {
    // Use structure as source of truth - preserve all sections for lookup
    sectionsFromStructure = cvData.structure.sections.map(section => ({
      id: section.id,
      type: section.type,
      visible: section.visible
    }));
  }

  // IMPORTANT: Never use sample/hardcoded data - only use the provided cvData
  // If cvData is null or undefined, this component should not render
  // BUT: Check AFTER hooks are called (Rules of Hooks)
  if (!cvData) {
    console.warn('⚠️ TemplateRenderer - cvData is null/undefined. Component should not render without actual CV data.');
    return null;
  }

  // Check if this is a custom template with a hardcoded renderer
  const customRenderer = template.customRenderer;
  console.log('🔍 TemplateRenderer - Checking custom renderer:', {
    customRenderer,
    hasHardcodedTemplates: !!HardcodedTemplates,
    availableKeys: Object.keys(HardcodedTemplates || {}),
    templateName: template.name
  });

  if (customRenderer && HardcodedTemplates[customRenderer as keyof typeof HardcodedTemplates]) {
    const CustomTemplateComponent = HardcodedTemplates[customRenderer as keyof typeof HardcodedTemplates] as React.ComponentType<{
      cvData: UnifiedCVDataStructure;
      className?: string;
      enabledSections?: string[];
    }>;

    console.log('✅ TemplateRenderer - Using custom renderer:', customRenderer);

    // For custom renderers, pass full cvData and let CSS handle natural page breaks
    // Don't filter by enabledSections - let content flow naturally across pages
    const enforcedCSS = generateEnforcedCSS();
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: enforcedCSS }} />
        <CustomTemplateComponent cvData={cvData} className={className} />
      </>
    );
  } else if (customRenderer) {
    console.error('❌ TemplateRenderer - Custom renderer not found:', {
      customRenderer,
      availableRenderers: Object.keys(HardcodedTemplates || {})
    });
  }

  // Determine section order - use structure if available, otherwise use legacy props
  let finalSectionOrder: string[] | undefined;
  let finalSectionVisibility: Record<string, boolean> = {};

  if (sectionsFromStructure) {
    // Use structure-based order and visibility
    // Filter to only visible sections for order, but preserve all for lookup
    const visibleSections = sectionsFromStructure.filter(s => s.visible);
    finalSectionOrder = visibleSections.map(s => s.type);
    sectionsFromStructure.forEach(section => {
      finalSectionVisibility[section.type] = section.visible;
    });
  } else {
    // Fall back to legacy props
    finalSectionOrder = sectionOrder ? convertToTemplateSectionOrder(sectionOrder) : undefined;
    finalSectionVisibility = sectionVisibility;
  }

  // Determine which sections to render
  // Ensure availableSections is an array before passing
  let availableSectionsArray = Array.isArray(template?.availableSections)
    ? template.availableSections
    : [];

  // FALLBACK: If availableSections is empty but columnLayout has sections, use those
  if (availableSectionsArray.length === 0 && template?.columnLayout?.main?.sections) {
    console.log('⚠️ TemplateRenderer - availableSections is empty, using columnLayout.main.sections as fallback');
    const columnSections = template.columnLayout.main.sections;
    availableSectionsArray = columnSections.map((sectionKey: string) => {
      // Map section keys to component names based on COMPONENT_REGISTRY
      const sectionKeyToComponentName: Record<string, string> = {
        'personal_header': 'PersonalHeader',
        'header': 'PersonalHeader',
        'summary': 'Profile',
        'profile': 'Profile',
        'work_experience': 'WorkExperience',
        'experience': 'WorkExperience',
        'education': 'Education',
        'skills': 'Skills',
        'projects': 'Projects',
        'certificates': 'Certificates',
        'languages': 'Languages',
        'volunteer': 'Volunteer',
        'awards': 'Awards',
        'publications': 'Publications'
      };

      const componentName = sectionKeyToComponentName[sectionKey] || sectionKey;
      const hasComponent = !!COMPONENT_REGISTRY[componentName];

      return {
        key: sectionKey,
        displayName: sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        componentName: componentName,
        isList: ['work_experience', 'education', 'skills', 'projects', 'certificates', 'languages', 'volunteer', 'awards', 'publications'].includes(sectionKey),
        defaultItemContent: {}
      };
    }).filter((section: any) => {
      // Only include sections that have a component in the registry
      return !!COMPONENT_REGISTRY[section.componentName];
    });

    console.log('✅ TemplateRenderer - Generated availableSections from columnLayout:', availableSectionsArray);
  }

  let sectionsToRender = getSectionsToRender(
    availableSectionsArray,
    finalSectionOrder,
    finalSectionVisibility,
    enabledSections
  );

  console.log('📋 TemplateRenderer - Sections to render:', {
    availableSectionsCount: availableSectionsArray.length,
    sectionsToRenderCount: sectionsToRender.length,
    sectionsToRender: sectionsToRender.map(s => s.key),
    enabledSections: enabledSections || 'ALL SECTIONS',
    filteredByEnabled: enabledSections && enabledSections.length > 0 ? 'YES' : 'NO'
  });


  // CRITICAL: Ensure personal_header is ALWAYS first, but only if it's in the filtered list
  // Only sort if personal_header is actually in the sectionsToRender
  if (sectionsToRender.some(s => s.key === 'personal_header')) {
    sectionsToRender = sectionsToRender.sort((a, b) => {
      if (a.key === 'personal_header') return -1;
      if (b.key === 'personal_header') return 1;
      return 0;
    });
  }


  // Check if section has data - supports both structure/content map and legacy format
  const hasDataForSection = (sectionKey: string, sectionId?: string): boolean => {
    // If using structure/content map, check content map first
    if (sectionId && cvData.content && cvData.content[sectionId]) {
      const content = cvData.content[sectionId];
      // Check if content has meaningful data
      if (Array.isArray(content)) {
        return content.length > 0;
      }
      if (typeof content === 'object' && content !== null) {
        return Object.values(content).some(value => {
          if (typeof value === 'string') return value.trim() !== '';
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === 'object' && value !== null) {
            return Object.values(value).some(v => typeof v === 'string' && v.trim() !== '');
          }
          return false;
        });
      }
      return !!content;
    }

    // Fall back to legacy format
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
      <style dangerouslySetInnerHTML={{ __html: combinedCSS }} />

      <div
        className={`cv-container ${className}`}
        style={{
          fontFamily: template?.globalStyles?.fontFamily || 'Calibri, Arial, sans-serif',
          fontSize: template?.globalStyles?.fontSize || '11pt',
          lineHeight: template?.globalStyles?.lineHeight || '1.2',
          backgroundColor: template?.globalStyles?.backgroundColor || '#ffffff',
          color: template?.globalStyles?.primaryColor || '#000000',
          ...customStyles
        }}
      >
        {sectionsToRender.map((section) => {
          const Component = COMPONENT_REGISTRY[section.componentName];
          if (!Component) {
            console.warn(`Component ${section.componentName} not found in registry`);
            return null;
          }

          // NEW: Get data from content map if using structure, otherwise from legacy arrays
          let sectionData: any = null;
          let sectionId: string | undefined = undefined;

          if (sectionsFromStructure) {
            // Find section in structure by type
            const structureSection = sectionsFromStructure.find(s => s.type === section.key);
            if (structureSection && cvData.content && cvData.content[structureSection.id]) {
              sectionData = cvData.content[structureSection.id];
              sectionId = structureSection.id;
            }
          }

          // Fall back to legacy format if content map doesn't have data
          if (!sectionData) {
            const dataKey = SECTION_DATA_MAP[section.key as keyof SectionDataMapping];
            sectionData = dataKey ? cvData[dataKey] : null;
          }

          // Check if section has data before rendering
          const hasData = hasDataForSection(section.key, sectionId);

          // Skip rendering if section has no data
          if (!hasData) {
            return null;
          }

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

// Memoize TemplateRenderer to prevent unnecessary re-renders
export const TemplateRenderer = memo(TemplateRendererComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.cvData === nextProps.cvData &&
    prevProps.template === nextProps.template &&
    JSON.stringify(prevProps.sectionOrder) === JSON.stringify(nextProps.sectionOrder) &&
    JSON.stringify(prevProps.sectionVisibility) === JSON.stringify(nextProps.sectionVisibility) &&
    JSON.stringify(prevProps.enabledSections) === JSON.stringify(nextProps.enabledSections) &&
    JSON.stringify(prevProps.customStyles) === JSON.stringify(nextProps.customStyles)
  );
});

TemplateRenderer.displayName = 'TemplateRenderer';

// Helper function to determine which sections to render
function getSectionsToRender(
  availableSections: ISectionBlueprint[],
  sectionOrder?: string[],
  sectionVisibility?: Record<string, boolean>,
  enabledSections?: string[]
): ISectionBlueprint[] {
  // Ensure availableSections is an array
  const sections = Array.isArray(availableSections) ? availableSections : [];
  let sectionsToRender = [...sections];

  // Filter by enabled sections if provided - THIS IS THE KEY FILTER FOR PAGE SPLITTING
  if (enabledSections && enabledSections.length > 0) {
    const beforeFilter = sectionsToRender.length;
    sectionsToRender = sectionsToRender.filter(section =>
      enabledSections.includes(section.key)
    );
    const afterFilter = sectionsToRender.length;

    // Debug logging for duplicate detection
    if (beforeFilter !== afterFilter) {
      console.log('🔍 getSectionsToRender - Filtered sections:', {
        before: beforeFilter,
        after: afterFilter,
        enabledSections,
        filteredSections: sectionsToRender.map(s => s.key),
        removedSections: sections.filter(s => !enabledSections.includes(s.key)).map(s => s.key)
      });
    }
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
// Returns empty CV data structure - no hardcoded sample data
export function generateTemplatePreview(template: ITemplate): UnifiedCVDataStructure {
  // Use template's sample data if available, otherwise return empty default structure
  // No hardcoded fallback data
  if (template.templateData) {
    return {
      basics: template.templateData.sampleBasics || DEFAULT_UNIFIED_CV_DATA.basics,
      work: template.templateData.sampleWork || [],
      volunteer: template.templateData.sampleVolunteer || [],
      education: template.templateData.sampleEducation || [],
      awards: template.templateData.sampleAwards || [],
      certificates: template.templateData.sampleCertificates || [],
      publications: template.templateData.samplePublications || [],
      skills: template.templateData.sampleSkills || [],
      languages: template.templateData.sampleLanguages || [],
      interests: template.templateData.sampleInterests || [],
      references: template.templateData.sampleReferences || [],
      projects: template.templateData.sampleProjects || []
    };
  }

  // Return empty default structure - no hardcoded data
  return { ...DEFAULT_UNIFIED_CV_DATA };
}

export default TemplateRenderer;
