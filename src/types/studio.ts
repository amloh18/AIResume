import { CVDataStructure } from './cv';
import { UnifiedCVDataStructure } from './unified-cv-schema';

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
  documentData: UnifiedCVDataStructure | CVDataStructure | string; // CV data or cover letter content
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
  updateDocument: (data: UnifiedCVDataStructure | CVDataStructure | string) => void;
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

// ============================================================================
// Studio Editor Types (New)
// ============================================================================

// Studio View Modes
export type StudioViewMode = 'default' | 'ats-fix';

// ATS Pillars
export type ATSPillar =
  | 'completeness'
  | 'impactVerbs'
  | 'quantification'
  | 'formatting'
  | 'readability';

// Pillar Scores (each out of 20, total = 100)
export interface PillarScores {
  completeness: number;    // 0-20 (expanded from CV Score's 25)
  impactVerbs: number;     // 0-20
  quantification: number;  // 0-20
  formatting: number;      // 0-20 (expanded from CV Score's 15)
  readability: number;     // 0-20
}

// Section-wise Analysis
export interface SectionAnalysis {
  sectionId: string;
  sectionName: string;
  pillarScores: PillarScores;
  annotations: StudioAnnotation[];
  overallScore: number;
}

// Color mapping for annotation underlines
export const PILLAR_COLORS: Record<ATSPillar, { color: string; style: 'solid' | 'dashed' | 'dotted' | 'wavy' | 'double' }> = {
  impactVerbs: { color: '#8B5CF6', style: 'wavy' },       // Purple - wavy
  quantification: { color: '#F59E0B', style: 'dashed' }, // Amber - dashed
  completeness: { color: '#EF4444', style: 'solid' },    // Red - solid
  formatting: { color: '#3B82F6', style: 'dotted' },     // Blue - dotted
  readability: { color: '#10B981', style: 'double' },    // Green - double
};

// Extended annotation with pillar and visual properties
export interface StudioAnnotation {
  id: string;
  category: 'impact' | 'keywords' | 'clarity' | 'formatting' | 'grammar' | 'structure' | 'other';
  severity: 'low' | 'medium' | 'high';
  fieldPath: string;
  originalText: string;
  replacementText: string;
  match: {
    start: number | null;
    end: number | null;
    matchStrategy: 'exact' | 'fuzzy' | 'field';
  };
  issue: string;
  impactScoreDelta: number;
  status: 'open' | 'applied' | 'dismissed' | 'suppressed' | 'semantic_match';

  // Studio-specific extensions
  pillar: ATSPillar;
  sectionId: string;
  underlineColor: string;
  underlineStyle: 'solid' | 'dashed' | 'dotted' | 'wavy' | 'double';
}

// Studio Theme Config
export interface StudioThemeConfig {
  mode: 'light' | 'dark' | 'system';
  colors: {
    // Light mode colors
    light: {
      bgPrimary: string;
      bgSecondary: string;
      bgTertiary: string;
      textPrimary: string;
      textSecondary: string;
      textTertiary: string;
      accentPrimary: string;
      border: string;
    };
    // Dark mode colors (derived from resume-enhancer)
    dark: {
      bgPrimary: string;      // #0a0d07
      bgSecondary: string;    // #141810
      bgTertiary: string;     // #1a230f
      textPrimary: string;    // white
      textSecondary: string;  // gray-400
      textTertiary: string;   // gray-500
      accentPrimary: string;  // #80FF00
      border: string;         // white/10
    };
  };
}

// Default theme configuration
export const STUDIO_THEME_DEFAULTS: StudioThemeConfig = {
  mode: 'system',
  colors: {
    light: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f9fafb',
      bgTertiary: '#f3f4f6',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      textTertiary: '#9ca3af',
      accentPrimary: '#65a30d', // lime-600
      border: '#e5e7eb',
    },
    dark: {
      bgPrimary: '#0a0d07',
      bgSecondary: '#141810',
      bgTertiary: '#1a230f',
      textPrimary: '#ffffff',
      textSecondary: '#9ca3af',
      textTertiary: '#6b7280',
      accentPrimary: '#80FF00',
      border: 'rgba(255, 255, 255, 0.1)',
    },
  },
};

// Pane configuration for 3-column layout
export interface StudioPaneConfig {
  previewWidth: number;     // percentage (default: 40)
  scorecardWidth: number;   // percentage (default: 25)
  workbenchWidth: number;   // percentage (default: 35)
  minWidth: number;         // minimum width in pixels (default: 200)
}

export const DEFAULT_PANE_CONFIG: StudioPaneConfig = {
  previewWidth: 40,
  scorecardWidth: 25,
  workbenchWidth: 35,
  minWidth: 200,
};
