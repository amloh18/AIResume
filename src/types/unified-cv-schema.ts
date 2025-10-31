/**
 * UNIFIED CV DATA STRUCTURE SCHEMA
 * 
 * This is the single source of truth for all CV data across the application.
 * All modules (MasterCV onboarding, CV parser, Studio, preview components)
 * MUST use this exact structure for reading and writing CV data.
 * 
 * NO TRANSFORMATION LAYERS - Direct serialization/deserialization only.
 */

/**
 * Section structure entry defining order and visibility
 */
export interface CVSectionStructure {
  id: string;        // Unique UUID, e.g., "uuid-1", "uuid-2"
  type: string;      // Section type, e.g., "personal_header", "work_experience"
  visible: boolean;  // Section visibility
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
    courses: string[];
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
    highlights: string[];
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
  
  // Metadata
  metadata: {
    isMaster: boolean;
    lastModified: Date;
    createdFrom?: string;
    tags: string[];
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
    atsScore?: number;
    atsScoreDate?: Date;
    thumbnailUrl?: string;
    thumbnailGeneratedAt?: Date;
    starred: boolean;
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

