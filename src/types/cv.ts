// @ts-nocheck
export interface CVDataStructure {
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
  work: Array<{
    name: string;
    position: string;
    url: string;
    startDate: string;
    endDate: string;
    summary: string;
    highlights: string[];
  }>;
  volunteer: Array<{
    organization: string;
    position: string;
    url: string;
    startDate: string;
    endDate: string;
    summary: string;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    url: string;
    area: string;
    studyType: string;
    startDate: string;
    endDate: string;
    score: string;
    courses: string[];
  }>;
  awards: Array<{
    title: string;
    date: string;
    awarder: string;
    summary: string;
  }>;
  certificates: Array<{
    name: string;
    date: string;
    issuer: string;
    url: string;
  }>;
  publications: Array<{
    name: string;
    publisher: string;
    releaseDate: string;
    url: string;
    summary: string;
  }>;
  skills: Array<{
    name: string;
    level: string;
    keywords: string[];
  }>;
  languages: Array<{
    language: string;
    fluency: string;
  }>;
  interests: Array<{
    name: string;
    keywords: string[];
  }>;
  references: Array<{
    name: string;
    reference: string;
  }>;
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

export interface CVDesignSettings {
  // Typography
  fontFamily: string;
  headerFontSize: number;
  bodyFontSize: number;
  sectionFontSize: number;
  
  // Spacing
  lineSpacing: number;
  letterSpacing: number;
  sectionSpacing: number;
  
  // Layout
  pagePadding: {
    top: number;
    bottom: number;
  };
  
  // Color Scheme
  colorScheme: 'professional' | 'modern' | 'creative' | 'minimal';
  
  // Template
  templateId?: string;
  templateName?: string;
}

// CV Session - Complete state of a CV including template and design settings
export interface CVSession {
  // Session metadata
  sessionId: string;
  cvId: string;
  userId: string;
  createdAt: Date;
  lastModified: Date;
  version: number;
  
  // CV Content Data
  cvData: CVDataStructure;
  
  // Template Configuration (snapshot of selected template)
  template: {
    id: string;
    name: string;
    description?: string;
    category: string;
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
    availableSections: Array<{
      id: string;
      type: string;
      title: string;
      required: boolean;
      order: number;
    }>;
  };
  
  // Design Settings (user customizations)
  designSettings: CVDesignSettings;
  
  // Layout Configuration
  layout: {
    sectionOrder: string[];
    activeSection: string;
    panelWidth: number;
    isCollapsed: boolean;
  };
  
  // Session State
  status: 'draft' | 'published' | 'archived';
  isDirty: boolean; // Whether session has unsaved changes
  autoSaveEnabled: boolean;
  
  // Metadata
  metadata: {
    title: string;
    tags: string[];
    notes?: string;
    lastEditSession?: Date;
    editCount: number;
  };
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  order: number;
}

export interface OnboardingFormData {
  currentStep: number;
  steps: OnboardingStep[];
  formData: any;
  isCompleted: boolean;
}

export interface UserRole {
  id: 'student' | 'professional' | 'recruiter';
  title: string;
  description: string;
  icon: string;
  color: string;
  available?: boolean;
}

export interface CVJourney {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'in-progress' | 'completed' | 'paused' | 'processing_documents' | 'creation_failed' | 'ready';
  currentStep: number;
  totalSteps: number;
  cvId?: string;
  coverLetterId?: string;
  atsScore?: number;
  steps: Array<{
    stepId: number;
    name: string;
    status: 'pending' | 'active' | 'completed';
    completedAt?: Date;
    data?: any;
  }>;
  generationState?: {
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    mode: 'tailored' | 'fallback';
    reasonCode: string;
    title: string;
    summary: string;
    supportMessage: string;
    nextAction: 'wait' | 'review' | 'retry' | 'upgrade' | 'edit_manually' | 'contact_support';
    nextActionLabel: string;
    isTailoredEligible: boolean;
    aiCreditsRemaining?: number;
    aiCreditsLimit?: number;
    fallbackCreated?: boolean;
    failureMessage?: string;
    documents: {
      cv: 'queued' | 'created' | 'failed';
      coverLetter: 'queued' | 'created' | 'failed';
    };
    updatedAt: string;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt: Date;
    completedAt?: Date;
    tags?: string[];
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastWorkedOn?: string;
  completedAt?: string;
  journeyDuration?: number;
  atsScoreHistory?: Array<{ score: number; calculatedAt: string }>;
  downloadHistory?: Array<{ downloadedAt: string; fileType: string }>;
  _debug?: {
    linkedCVId?: string;
    linkedCVMetadata?: any;
    linkedCoverLetterId?: string;
    jobStatus?: string;
  };
}

// Re-export UnifiedCVDataStructure from unified-cv-schema
export type { UnifiedCVDataStructure } from './unified-cv-schema';

// Re-export CoverLetterData from studio
export type { CoverLetterData } from './studio';
