import { CVDataStructure } from './cv';

// Studio Entry Modes
export type StudioEntryMode = 'journey' | 'standalone';
export type DocumentType = 'cv' | 'cover-letter';

// Studio Session Context
export interface StudioSessionContext {
  mode: StudioEntryMode;
  documentType: DocumentType;
  
  // Journey Mode Properties
  journeyId?: string;
  applicationJourney?: ApplicationJourneyData;
  linkedJob?: JobData;
  
  // Standalone Mode Properties
  documentId?: string;
  
  // Common Properties
  userId: string;
  currentDocument?: CVData | CoverLetterData;
}

// Data Interfaces for Studio
export interface ApplicationJourneyData {
  id: string;
  journeyId: string;
  userId: string;
  jobId: string;
  cvId?: string;
  coverLetterId?: string;
  status: string;
  currentStep: number;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    priority: 'low' | 'medium' | 'high';
    tags: string[];
  };
}

export interface JobData {
  id: string;
  userId: string;
  jobTitle: string;
  company: string;
  jobDescription?: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  deadline?: Date;
  atsAnalysis?: {
    matchedKeywords: string[];
    missingKeywords: string[];
    suggestions: string[];
  };
}

export interface CVData {
  id: string;
  userId: string;
  title: string;
  cvData: CVDataStructure;
  templateId: string;
  template?: TemplateData;
  metadata: {
    isMaster: boolean;
    lastModified: Date;
    tags: string[];
    atsScore?: number;
  };
}

export interface CoverLetterData {
  id: string;
  userId: string;
  title: string;
  content: string;
  metadata: {
    lastModified: Date;
    wordCount: number;
    tags: string[];
    atsScore?: number;
  };
}

export interface TemplateData {
  id: string;
  name: string;
  globalStyles: {
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    fontSize: string;
    lineHeight: string;
    spacing: string;
  };
  availableSections: any[];
}

// Studio State Management
export interface StudioState {
  // Session Context
  sessionContext: StudioSessionContext;
  
  // Loading States
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  lastSavedAt?: Date;
  
  // Document Data
  documentData: CVDataStructure | string; // CV data or cover letter content
  documentTitle: string;
  isDocumentModified: boolean;
  
  // Job Integration
  selectedJobId?: string;
  availableJobs: JobData[];
  atsAnalysis?: {
    score: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    suggestions: string[];
  };
  
  // UI State
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  activeLeftTab: 'structure' | 'design' | 'ats';
  
  // Template & Design
  selectedTemplateId: string;
  designOverrides: Record<string, any>;
  previewSettings: {
    zoom: number;
    paperSize: 'A4' | 'Letter';
  };
  
  // Error Handling
  error?: string;
}

// Studio Actions
export interface StudioActions {
  // Session Management
  initializeSession: (params: StudioInitParams) => Promise<void>;
  
  // Document Operations
  updateDocument: (data: CVDataStructure | string) => void;
  saveDocument: () => Promise<void>;
  switchTemplate: (templateId: string) => void;
  
  // Job Integration
  selectJob: (jobId: string) => Promise<void>;
  runATSAnalysis: () => Promise<void>;
  
  // UI Actions
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setActiveLeftTab: (tab: 'structure' | 'design' | 'ats') => void;
  
  // Navigation
  exitStudio: () => void;
  navigateToJourney: () => void;
}

// Studio Initialization Parameters
export interface StudioInitParams {
  // Journey Mode
  journeyId?: string;
  
  // Standalone Mode
  documentId?: string;
  
  // Common
  documentType: DocumentType;
  userId: string;
  
  // Optional overrides
  mode?: StudioEntryMode;
}

// Studio Hook Return Type
export interface UseStudioReturn {
  state: StudioState;
  actions: StudioActions;
}

// ATS Integration Types
export interface ATSAnalysisRequest {
  documentContent: CVDataStructure | string;
  jobDescription: string;
  documentType: DocumentType;
}

export interface ATSAnalysisResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  analysis: {
    contentRelevance: number;
    keywordDensity: number;
    formatOptimization: number;
  };
}
