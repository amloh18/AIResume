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

// Column Layout Configuration
export interface IColumnLayout {
  leftColumn?: {
    width: string;
    sections: string[];
  };
  rightColumn?: {
    width: string;
    sections: string[];
  };
  main?: {
    width: string;
    sections: string[];
  };
}

// Section-specific styling configuration
export interface ISectionStyling {
  [sectionKey: string]: {
    [styleProperty: string]: any;
  };
}

// Unified template type that works for both Mongoose models and plain objects
export interface ITemplate {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: 'cv' | 'portfolio' | 'cover-letter' | 'resume' | 'custom';
  categories?: string[];
  tier: 'free' | 'premium';
  layoutType?: 'one-column' | 'two-column' | 'three-column' | 'custom';
  globalStyles: {
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    fontSize: string;
    lineHeight: string;
    spacing: string;
    borderRadius?: string;
    boxShadow?: string;
    customCSS?: string;
  };
  columnLayout?: IColumnLayout;
  sectionStyling?: ISectionStyling;
  availableSections: ISectionBlueprint[];
  templateData?: any;
  customRenderer?: string;
  isActive: boolean;
  isDefault: boolean;
  isPublished: boolean;
  globalAccess: boolean;
  version: number;
  createdBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  pageSettings?: {
    format: 'A4' | 'Letter' | 'Legal' | 'custom';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: string;
      bottom: string;
      left: string;
      right: string;
    };
    maxHeight?: string;
  };
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
