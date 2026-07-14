/**
 * UNIFIED CV DATA STRUCTURE SCHEMA
 * 
 * This is the single source of truth for all CV data across the application.
 * All modules (MasterCV onboarding, CV parser, Studio, preview components)
 * MUST use this exact structure for reading and writing CV data.
 * 
 * NO TRANSFORMATION LAYERS - Direct serialization/deserialization only.
 */

import { SnippetOverrides } from './snippets';

/**
 * Section structure entry defining order and visibility
 */
export interface CVSectionStructure {
  id: string;        // Unique UUID, e.g., "uuid-1", "uuid-2"
  type: string;      // Section type, e.g., "personal_header", "work_experience"
  visible: boolean;  // Section visibility
  column?: 'sidebar' | 'main'; // For two-column layouts
}


/**
 * CV structure defining section order and metadata
 */
export interface CVStructure {
  sections: CVSectionStructure[];
}

/**
 * Content map keyed by section IDs
 */
export type CVContentMap = Record<string, any>;

export interface UnifiedCVDataStructure {
  // Structure and Content Map (new architecture)
  structure?: CVStructure;  // Optional for backward compatibility
  content?: CVContentMap;   // Optional for backward compatibility

  // Template ID
  templateId?: string;      // Template ID for structure initialization

  // Snippet overrides for section design variants
  snippetOverrides?: SnippetOverrides;

  // Personal Information
  basics: {
    name: string;
    label: string;
    image: string;
    email: string;
    phone: string;
    url: string;
    summary: string;
    location: {
      address: string;
      postalCode: string;
      city: string;
      countryCode: string;
      region: string;
    };
    profiles: Array<{
      network: string;
      username: string;
      url: string;
    }>;
  };

  // Work Experience
  work: Array<{
    name: string;
    position: string;
    url: string;
    startDate: string;
    endDate: string;
    summary: string;
    highlights: string[];
  }>;

  // Volunteer Experience
  volunteer: Array<{
    organization: string;
    position: string;
    url: string;
    startDate: string;
    endDate: string;
    summary: string;
    highlights: string[];
  }>;

  // Education
  education: Array<{
    institution: string;
    url: string;
    area: string;
    studyType: string;
    startDate: string;
    endDate: string;
    score: string;
    courses?: string[];  // Optional field
    description?: string;
  }>;

  // Awards and Recognition
  awards: Array<{
    title: string;
    date: string;
    awarder: string;
    summary: string;
  }>;

  // Certificates
  certificates: Array<{
    name: string;
    date: string;
    issuer: string;
    url: string;
    description: string;
  }>;

  // Publications
  publications: Array<{
    name: string;
    publisher: string;
    releaseDate: string;
    url: string;
    summary: string;
  }>;

  // Skills
  // Canonical shape: Array<{ category: string; skills: string[] }>
  // Legacy/fallback shape accepted during normalization: Array<{ category?: string; name?: string; skills?: string[]; keywords?: string[]; skillsText?: string; level?: string }>
  skills: Array<{
    category: string;
    skills: string[];
  }>;

  // Languages
  languages: Array<{
    language: string;
    fluency: string;
  }>;

  // Interests
  interests: Array<{
    name: string;
    keywords: string[];
  }>;

  // References
  references: Array<{
    name: string;
    reference: string;
  }>;

  // Projects
  projects: Array<{
    name: string;
    startDate: string;
    endDate: string;
    description: string;
    highlights?: string[];  // Optional field
    keywords: string[];  // Technologies/skills used in the project
    url: string;
  }>;
}

/**
 * UNIFIED CV DOCUMENT SCHEMA
 * 
 * This represents the complete CV document as stored in the database.
 * All API endpoints MUST use this structure for serialization/deserialization.
 */
export interface UnifiedCVDocument {
  // Document Identity
  id: string;
  userId: string;
  title: string;

  // CV Content (using unified structure)
  cvData: UnifiedCVDataStructure;

  // Template Information
  templateId: string;
  templateName?: string;

  // Document Status
  status: 'draft' | 'published' | 'archived';
  version: number;

  // Journey and Type Information
  journeyId?: string; // Optional link to an application journey
  cvType?: 'master' | 'journey' | 'standalone'; // CV type for Resume Enhancer

  // Metadata
  metadata: {
    isMaster: boolean;
    lastModified: Date;
    createdFrom?: string | mongoose.Types.ObjectId;
    createdVia?: string; // How the CV was created (e.g., 'ai-career-report', 'journey')
    tags: string[];
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
    atsScore?: number;
    atsScoreDate?: Date;
    thumbnailUrl?: string;
    thumbnailGeneratedAt?: Date;
    starred: boolean;
    cvType?: 'master' | 'journey' | 'standalone'; // Also in metadata for backward compatibility
    atsScoreCap?: number;
    parentMasterId?: string;
    isUserMaster?: boolean;
    fresherMode?: boolean;
    canvasDesign?: any;
    canvasTemplate?: any;
    canvasZones?: any;
    canvasTemplatesZones?: any;
    canvasTemplatesDesign?: any;
    analysisSnapshot?: {
      healthIndex: number;
      atsReadability: number;
      keywordCoverage: number;
      impactScore: number;
      strengths: string[];
      weaknesses: string[];
      generatedAt: Date;
    };
    surgeonAnalysis?: {
      score: number;
      fixes: any[];
      annotations: any[];
      targetRole: string;
      seniorityLevel: string;
      analyzedAt: Date;
      contentHash: string;
      jobDataHash?: string;
      scoreReport?: any;
    };
    cvScore?: number;
    aiAnalysis?: any;
    documentState?: 'editable' | 'frozen' | 'read-only';
    frozenAt?: Date;
    frozenReason?: 'plan_downgrade' | 'limit_exceeded' | 'pass_expired' | 'premium_template_restriction';
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * UNIFIED CV API RESPONSE SCHEMA
 * 
 * All API endpoints MUST return data in this exact format.
 * No transformation or mapping should occur.
 */
export interface UnifiedCVAPIResponse {
  success: boolean;
  message: string;
  data: {
    cv?: UnifiedCVDocument;
    cvs?: UnifiedCVDocument[];
    total?: number;
    counts?: {
      total: number;
      drafts: number;
      published: number;
      archived: number;
      starred: number;
    };
  };
  error?: string;
}

/**
 * UNIFIED CV CREATE/UPDATE REQUEST SCHEMA
 * 
 * All API endpoints MUST accept data in this exact format.
 * No transformation or mapping should occur.
 */
export interface UnifiedCVRequest {
  title: string;
  cvData: UnifiedCVDataStructure;
  templateId: string;
  status?: 'draft' | 'published' | 'archived';
  metadata?: {
    isMaster?: boolean;
    tags?: string[];
    isPublic?: boolean;
    starred?: boolean;
  };
}

/**
 * VALIDATION SCHEMA
 * 
 * JSON Schema for runtime validation of unified CV data structure.
 * All incoming data MUST pass this validation.
 */
export const UNIFIED_CV_VALIDATION_SCHEMA = {
  type: "object",
  required: ["basics", "work", "education", "skills", "projects", "certificates", "languages"],
  properties: {
    basics: {
      type: "object",
      required: ["name", "email"],
      properties: {
        name: { type: "string", minLength: 1 },
        label: { type: "string" },
        image: { type: "string" },
        email: { type: "string", format: "email" },
        phone: { type: "string" },
        url: { type: "string" },
        summary: { type: "string" },
        location: {
          type: "object",
          properties: {
            address: { type: "string" },
            postalCode: { type: "string" },
            city: { type: "string" },
            countryCode: { type: "string" },
            region: { type: "string" }
          }
        },
        profiles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              network: { type: "string" },
              username: { type: "string" },
              url: { type: "string" }
            }
          }
        }
      }
    },
    work: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          position: { type: "string" },
          url: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          summary: { type: "string" },
          highlights: { type: "array", items: { type: "string" } }
        }
      }
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          url: { type: "string" },
          area: { type: "string" },
          studyType: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          score: { type: "string" },
          courses: { type: "array", items: { type: "string" } },
          description: { type: "string" }
        }
      }
    },
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          skills: { type: "array", items: { type: "string" } }
        }
      }
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          description: { type: "string" },
          highlights: { type: "array", items: { type: "string" } },
          keywords: { type: "array", items: { type: "string" } },
          url: { type: "string" }
        }
      }
    },
    certificates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          date: { type: "string" },
          issuer: { type: "string" },
          url: { type: "string" }
        }
      }
    },
    languages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          language: { type: "string" },
          fluency: { type: "string" }
        }
      }
    }
  }
};

/**
 * DEFAULT EMPTY CV DATA
 * 
 * Use this as the starting point for all new CVs.
 * Ensures consistency across all entry points.
 */
export const DEFAULT_UNIFIED_CV_DATA: UnifiedCVDataStructure = {
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

/**
 * SCHEMA VERSION
 * 
 * Increment this when making breaking changes to the unified schema.
 * All modules must be updated to support the new version.
 */
export const UNIFIED_CV_SCHEMA_VERSION = "1.0.0";

export const SECTION_TYPE_TO_FIELD_MAP: Record<string, keyof UnifiedCVDataStructure> = {
  'volunteer': 'volunteer',
  'publications': 'publications',
  'languages': 'languages',
  'interests': 'interests',
  'references': 'references',
  'awards': 'awards',
  'certificates': 'certificates',
  'projects': 'projects',
  'skills': 'skills',
  'education': 'education',
  'work_experience': 'work'
};

export const DEFAULT_SECTION_ITEM: Record<string, any> = {
  'volunteer': {
    organization: 'Organization Name',
    position: 'Volunteer Role',
    url: '',
    startDate: 'Jan 2020',
    endDate: 'Present',
    summary: '',
    highlights: []
  },
  'publications': {
    name: 'Publication Title',
    publisher: 'Publisher Name',
    releaseDate: '2024',
    url: '',
    summary: ''
  },
  'languages': {
    language: 'Language',
    fluency: 'Native'
  },
  'interests': {
    name: 'Interest Category',
    keywords: ['Hobby 1', 'Hobby 2']
  },
  'references': {
    name: 'Reference Name',
    reference: 'Available upon request'
  },
  'awards': {
    title: 'Award Title',
    date: '2024',
    awarder: 'Awarding Organization',
    summary: ''
  },
  'certificates': {
    name: 'Certificate Name',
    issuer: 'Issuing Organization',
    date: '2024',
    url: '',
    description: ''
  },
  'projects': {
    name: 'Project Name',
    startDate: 'Jan 2024',
    endDate: 'Present',
    description: 'Project description',
    highlights: [],
    keywords: [],
    url: ''
  },
  'skills': {
    category: 'Skill Category',
    skills: ['Skill 1', 'Skill 2']
  },
  'education': {
    institution: 'Name of University',
    url: '',
    area: 'ENTER YOUR MAJOR',
    studyType: '',
    startDate: 'Jan 2005',
    endDate: 'Jan 2007',
    score: '',
    description: ''
  },
  'work': {
    name: 'Company Name',
    position: 'Job Title',
    url: '',
    startDate: 'Jan 2020',
    endDate: 'Present',
    summary: 'Enter your job responsibilities and achievements',
    highlights: []
  }
};

