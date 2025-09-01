// Template type definitions for TypeScript export functionality

export interface ISectionBlueprint {
  key: string;
  displayName: string;
  componentName: string;
  isList: boolean;
  defaultItemContent: any;
  description?: string;
  icon?: string;
  category?: string;
  maxItems?: number;
  minItems?: number;
}

export interface ITemplate {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: 'cv' | 'portfolio' | 'cover-letter' | 'resume' | 'custom';
  categories?: string[];
  tier: 'free' | 'premium';
  globalStyles: {
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    fontSize: string;
    lineHeight: string;
    spacing: string;
    borderRadius: string;
    boxShadow: string;
    customCSS?: string;
  };
  availableSections: ISectionBlueprint[];
  templateData?: any;
  isActive: boolean;
  isDefault: boolean;
  isPublished: boolean;
  globalAccess: boolean;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Template preview data interface
export interface TemplatePreviewData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    title: string;
    summary: string;
  };
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    duration: string;
    description: string;
  }>;
  skills: Array<string>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string;
  }>;
}
