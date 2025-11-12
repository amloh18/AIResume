import { ITemplate } from '@/types/template';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';

// Import hardcoded template components
import { DataDrivenProTemplate } from './custom-renderers/DataDrivenProTemplate';
import { DesignerModernTemplate } from './custom-renderers/DesignerModernTemplate';
import { ElegantTimelineTemplate } from './custom-renderers/ElegantTimelineTemplate';
import { ExecutiveProfessionalLayoutTemplate } from './custom-renderers/ExecutiveProfessionalLayoutTemplate';
import { ExecutiveStandardTemplate } from './custom-renderers/ExecutiveStandardTemplate';
import { TechProBlueTemplate } from './custom-renderers/TechProBlueTemplate';
import { TheModernCVTemplate } from './custom-renderers/TheModernCVTemplate';

// Hardcoded template registry
export const CustomTemplates = {
  DataDrivenProTemplate,
  DesignerModernTemplate,
  ElegantTimelineTemplate,
  ExecutiveProfessionalLayoutTemplate,
  ExecutiveStandardTemplate,
  TechProBlueTemplate,
  TheModernCVTemplate
};

/**
 * Helper function to get S3 fallback URL for template thumbnails
 * @param filename - The filename from the local path (e.g., "Data Driven Pro.JPG")
 * @returns S3 URL if NEXT_PUBLIC_S3_BASE_URL is set, otherwise null
 */
export function getTemplateThumbnailS3Url(filename: string): string | null {
  // Extract filename from path if full path is provided
  const cleanFilename = filename.includes('/') ? filename.split('/').pop() || filename : filename;
  
  // Get S3 base URL - works in both client and server contexts
  // Next.js injects NEXT_PUBLIC_ vars at build time, so they're available at runtime
  const s3BaseUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;
  
  if (s3BaseUrl) {
    return `${s3BaseUrl}/${encodeURIComponent(cleanFilename)}`;
  }
  
  return null;
}

/**
 * Helper function to get template thumbnail URL (local first, S3 as fallback)
 * This function must be called at runtime to ensure env vars are available
 * @param filename - The filename from the local path (e.g., "Data Driven Pro.JPG")
 * @returns Local path first, S3 URL is available via getTemplateThumbnailS3Url for error handling
 */
export function getTemplateThumbnailUrl(filename: string): string {
  // Extract filename from path if full path is provided
  const cleanFilename = filename.includes('/') ? filename.split('/').pop() || filename : filename;
  
  // Always return local path first - use error handlers in components to fallback to S3
  return `/templates/${cleanFilename}`;
}

/**
 * Resolve template thumbnail URLs at runtime
 * This ensures environment variables are properly read when templates are used
 * @param template - Template object with thumbnail filename
 * @returns Template with resolved thumbnail URL
 */
export function resolveTemplateThumbnail<T extends { thumbnail?: string }>(template: T): T {
  try {
    if (!template.thumbnail) {
      return template;
    }
    
    // If thumbnail is already a full URL (starts with http), return as-is
    if (template.thumbnail.startsWith('http://') || template.thumbnail.startsWith('https://')) {
      return template;
    }
    
    // If thumbnail is already a local path starting with /, return as-is
    if (template.thumbnail.startsWith('/')) {
      return template;
    }
    
    // If thumbnail is a local path, extract filename and resolve
    const filename = template.thumbnail.split('/').pop() || template.thumbnail;
    return {
      ...template,
      thumbnail: getTemplateThumbnailUrl(filename)
    };
  } catch (error) {
    console.error('Error resolving template thumbnail:', error, template);
    // Return template with original thumbnail if resolution fails
    return template;
  }
}

/**
 * Resolve all template thumbnails at runtime
 * Use this function when loading templates to ensure S3 URLs are properly resolved
 */
export function resolveTemplateThumbnails<T extends { thumbnail?: string }>(templates: T[]): T[] {
  return templates.map(template => resolveTemplateThumbnail(template));
}

// Hardcoded template definitions - using ITemplate from types
export const HARDCODED_TEMPLATES: ITemplate[] = [
  {
    id: 'data-driven-pro-template',
    name: 'Data Driven Pro',
    description: 'Professional template designed for data scientists, analysts, and technical professionals',
    thumbnail: 'Data Driven Pro.png',
    category: 'cv',
    categories: ['Professional', 'Technical'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#1E40AF',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.4',
      spacing: '1.2rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'certificates']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    customRenderer: 'DataDrivenProTemplate'
  },
  {
    id: 'designer-modern-template',
    name: 'Designer Modern',
    description: 'Contemporary template with modern typography and clean design aesthetics',
    thumbnail: 'Designer Modern.png',
    category: 'cv',
    categories: ['Creative', 'Modern'],
    tier: 'premium',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Helvetica Neue, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.6',
      spacing: '1.5rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'awards']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    customRenderer: 'DesignerModernTemplate'
  },
  {
    id: 'elegant-timeline-template',
    name: 'Elegant Timeline',
    description: 'Sophisticated template with timeline-based layout and elegant typography',
    thumbnail: 'Elegant Timeline.png',
    category: 'cv',
    categories: ['Elegant', 'Professional'],
    tier: 'premium',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Playfair Display, serif',
      primaryColor: '#1F2937',
      secondaryColor: '#6B7280',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      spacing: '1.5rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'awards']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: true,
    isPublished: true,
    globalAccess: true,
    version: 1,
    customRenderer: 'ElegantTimelineTemplate'
  },
  {
    id: 'executive-professional-layout-template',
    name: 'Executive Professional',
    description: 'Professional layout designed for executive-level positions',
    thumbnail: 'Executive Professional.png',
    category: 'cv',
    categories: ['Professional', 'Executive'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Montserrat, Arial, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      spacing: '1.5rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'languages']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    customRenderer: 'ExecutiveProfessionalLayoutTemplate'
  },
  {
    id: 'executive-standard-template',
    name: 'Executive Standard',
    description: 'Standard executive template with traditional corporate styling',
    thumbnail: 'Executive Standard.png',
    category: 'cv',
    categories: ['Executive', 'Professional'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Calibri, sans-serif',
      primaryColor: '#1E3A8A',
      secondaryColor: '#334155',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.3',
      spacing: '1.2rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'awards', 'languages']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    customRenderer: 'ExecutiveStandardTemplate'
  },
  {
    id: 'tech-pro-blue-template',
    name: 'Tech Pro Blue',
    description: 'Technical professional template with blue accent colors and modern design',
    thumbnail: 'Tech Pro Blue.png',
    category: 'cv',
    categories: ['Technical', 'Professional'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#2563EB',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.4',
      spacing: '1.2rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'certificates']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    customRenderer: 'TechProBlueTemplate'
  },
  {
    id: 'the-modern-cv-template',
    name: 'The Modern CV',
    description: 'Contemporary template with modern typography, clean design, and professional layout with sidebar accent',
    thumbnail: 'Data Driven Pro.png',
    category: 'cv',
    categories: ['Modern', 'Professional'],
    tier: 'free',
    layoutType: 'two-column',
    globalStyles: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      primaryColor: '#111827',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      spacing: '1.2rem',
      borderRadius: '0px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'languages']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    customRenderer: 'TheModernCVTemplate'
  },
  {
    id: 'executive-minimal-template',
    name: 'Executive Minimal',
    description: 'Minimalist executive template with clean design and professional styling',
    thumbnail: 'Executive minimal.png',
    category: 'cv',
    categories: ['Executive', 'Minimal'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Calibri, Arial, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.3',
      spacing: '1.2rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'languages']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1
  },
  {
    id: 'header-professional-template',
    name: 'Header Professional',
    description: 'Professional template with prominent header design and clean layout',
    thumbnail: 'Header Professional.png',
    category: 'cv',
    categories: ['Professional'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Arial, sans-serif',
      primaryColor: '#1E3A8A',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.4',
      spacing: '1.2rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'certificates']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1
  },
  {
    id: 'minimal-professional-template',
    name: 'Minimal Professional',
    description: 'Clean and minimal professional template with modern design aesthetics',
    thumbnail: 'Minimal Professional.png',
    category: 'cv',
    categories: ['Professional', 'Minimal'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Helvetica Neue, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      spacing: '1.5rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'awards']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1
  },
  {
    id: 'one-pager-professional-template',
    name: 'One Pager Professional',
    description: 'Compact one-page professional template optimized for concise presentation',
    thumbnail: 'One pager Professional.jpg',
    category: 'cv',
    categories: ['Professional', 'Compact'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Calibri, Arial, sans-serif',
      primaryColor: '#1E40AF',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '12px',
      lineHeight: '1.3',
      spacing: '1rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1
  },
  {
    id: 'professional-minimal-template',
    name: 'Professional Minimal',
    description: 'Professional minimal template with clean design and elegant typography',
    thumbnail: 'Professinal Minimal.png',
    category: 'cv',
    categories: ['Professional', 'Minimal'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#111827',
      secondaryColor: '#6B7280',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      spacing: '1.5rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'awards']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1
  }
];

// Generate preview data for hardcoded templates
// Returns empty CV data structure - no hardcoded sample data
export const generateHardcodedTemplatePreview = (templateId: string): UnifiedCVDataStructure => {
  // Return empty default structure - no hardcoded data
  return { ...DEFAULT_UNIFIED_CV_DATA };
};