'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

// Types
export interface AIAnalysis {
  experienceLevel: {
    level: string;
    rationale: string;
  };
  careerPath: {
    step1: { title: string; reasoning: string };
    step2: { title: string; reasoning: string };
    step3: { title: string; reasoning: string };
  };
  strategicSuggestions: {
    hardSkill: { skill: string; rationale: string };
    softSkill: { skill: string; rationale: string };
    experienceReframe: {
      original: string;
      improved: string;
      rationale: string;
    };
  };
  impactScore?: {
    quantifiableStatements?: number;
    highImpactVerbs?: number;
    industryKeywords?: number;
    insights?: Array<{
      type: string;
      message: string;
    }>;
  };
  careerCoherence?: {
    score?: number;
    strengths?: string[];
    redFlags?: Array<{
      issue: string;
      impact: string;
      action?: string;
    }>;
  };
  cvOptimization?: {
    totalLength?: string;
    bulletPointLength?: string;
    educationPlacement?: string;
  };
  skillsGap?: {
    skills?: Array<{
      name: string;
      mentions: number;
      quantifiedUse: number;
      gapInsight: string;
    }>;
    focusDistribution?: Array<{
      area: string;
      percentage: number;
    }>;
  };
  seniorTranslation?: {
    translations?: Array<{
      current: string;
      improved: string;
      shift: string;
    }>;
  };
  industrySpecialization?: {
    specialization?: string;
    keywords?: string[];
    contactIssues?: Array<{
      issue: string;
      action: string;
    }>;
  };
}

export interface AICareerReportState {
  currentStep: 1 | 2 | 3;
  cvData: UnifiedCVDataStructure;
  uploadedFile: File | null;
  aiAnalysis: AIAnalysis | null;
  isAnalyzing: boolean;
  completedSteps: number[];
  activeSection: string;
  isUploading: boolean;
  uploadError: string | null;
  jobData: any | null;
  jobId: string | null;
  isLoadingJob: boolean;
  jobError: string | null;
  availableSections: any[];
}

// Action Types
type AICareerReportAction =
  | { type: 'SET_CURRENT_STEP'; payload: 1 | 2 | 3 }
  | { type: 'SET_CV_DATA'; payload: UnifiedCVDataStructure }
  | { type: 'UPDATE_CV_DATA'; payload: Partial<UnifiedCVDataStructure> }
  | { type: 'SET_UPLOADED_FILE'; payload: File | null }
  | { type: 'SET_AI_ANALYSIS'; payload: AIAnalysis }
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'SET_COMPLETED_STEP'; payload: number }
  | { type: 'SET_ACTIVE_SECTION'; payload: string }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_UPLOAD_ERROR'; payload: string | null }
  | { type: 'SET_JOB_DATA'; payload: any | null }
  | { type: 'SET_JOB_ID'; payload: string | null }
  | { type: 'SET_LOADING_JOB'; payload: boolean }
  | { type: 'SET_JOB_ERROR'; payload: string | null }
  | { type: 'SET_AVAILABLE_SECTIONS'; payload: any[] }
  | { type: 'ADD_SECTION'; payload: any }
  | { type: 'RESET_STATE' };

// LocalStorage utilities
const STORAGE_KEY = 'ai-career-report-data';

const saveToStorage = (state: AICareerReportState) => {
  if (typeof window !== 'undefined') {
    try {
      // Save CV data and important state - also save step 3 data to preserve after sign-in
      const dataToSave = {
        currentStep: state.currentStep,
        cvData: state.cvData,
        // Save AI analysis if it exists (for step 3 restoration)
        aiAnalysis: state.aiAnalysis,
        uploadedFile: state.uploadedFile ? {
          name: state.uploadedFile.name,
          size: state.uploadedFile.size,
          type: state.uploadedFile.type,
          lastModified: state.uploadedFile.lastModified
        } : null,
        completedSteps: state.completedSteps,
        activeSection: state.activeSection,
        isUploading: state.isUploading,
        uploadError: state.uploadError,
        availableSections: state.availableSections,
        jobId: state.jobId,
        jobData: state.jobData,
        lastSaved: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('Failed to save AI Career Report data to localStorage:', error);
    }
  }
};

const loadFromStorage = (): Partial<AICareerReportState> | null => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if data is not too old (24 hours)
        if (parsed.lastSaved && (Date.now() - parsed.lastSaved) < 24 * 60 * 60 * 1000) {
          return parsed;
        } else {
          // Clear old data
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load AI Career Report data from localStorage:', error);
    }
  }
  return null;
};

const clearStorage = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear AI Career Report data from localStorage:', error);
    }
  }
};

// Initial State
const getInitialState = (): AICareerReportState => {
  const savedData = loadFromStorage();
  
  return {
    currentStep: savedData?.currentStep || 1,
    cvData: savedData?.cvData || {
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
    },
    uploadedFile: null, // File objects can't be serialized, will be handled separately
    aiAnalysis: savedData?.aiAnalysis || null, // Restore AI analysis if available
    isAnalyzing: false,
    completedSteps: savedData?.completedSteps || [],
    activeSection: savedData?.activeSection || 'personal',
    isUploading: false,
    uploadError: null,
    jobData: savedData?.jobData || null,
    jobId: savedData?.jobId || null,
    isLoadingJob: false,
    jobError: null,
    availableSections: savedData?.availableSections || []
  };
};

// Reducer
function aiCareerReportReducer(
  state: AICareerReportState,
  action: AICareerReportAction
): AICareerReportState {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
        completedSteps: state.completedSteps.includes(action.payload - 1)
          ? state.completedSteps
          : [...state.completedSteps, action.payload - 1]
      };

    case 'SET_CV_DATA':
      return {
        ...state,
        cvData: action.payload
      };

    case 'UPDATE_CV_DATA':
      return {
        ...state,
        cvData: {
          ...state.cvData,
          ...action.payload
        }
      };

    case 'SET_UPLOADED_FILE':
      return {
        ...state,
        uploadedFile: action.payload
      };

    case 'SET_AI_ANALYSIS':
      return {
        ...state,
        aiAnalysis: action.payload
      };

    case 'SET_ANALYZING':
      return {
        ...state,
        isAnalyzing: action.payload
      };

    case 'SET_COMPLETED_STEP':
      return {
        ...state,
        completedSteps: state.completedSteps.includes(action.payload)
          ? state.completedSteps
          : [...state.completedSteps, action.payload]
      };

    case 'SET_ACTIVE_SECTION':
      return {
        ...state,
        activeSection: action.payload
      };

    case 'SET_UPLOADING':
      return {
        ...state,
        isUploading: action.payload
      };

    case 'SET_UPLOAD_ERROR':
      return {
        ...state,
        uploadError: action.payload
      };

    case 'SET_JOB_DATA':
      return {
        ...state,
        jobData: action.payload
      };

    case 'SET_JOB_ID':
      return {
        ...state,
        jobId: action.payload
      };

    case 'SET_LOADING_JOB':
      return {
        ...state,
        isLoadingJob: action.payload
      };

    case 'SET_JOB_ERROR':
      return {
        ...state,
        jobError: action.payload
      };

    case 'SET_AVAILABLE_SECTIONS':
      return {
        ...state,
        availableSections: action.payload
      };

    case 'ADD_SECTION':
      return {
        ...state,
        availableSections: [...state.availableSections, action.payload]
      };

    case 'RESET_STATE':
      return getInitialState();

    default:
      return state;
  }
}

// Context
const AICareerReportContext = createContext<{
  state: AICareerReportState;
  dispatch: React.Dispatch<AICareerReportAction>;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: 1 | 2 | 3) => void;
} | null>(null);

// Provider
export function AICareerReportProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(aiCareerReportReducer, getInitialState());

  // Save to localStorage whenever state changes (keep saving for step 3 until CV is actually saved)
  useEffect(() => {
    // Always save CV data to localStorage, even in step 3, until Master CV is saved
    // This ensures data persists if user needs to sign in
    if (typeof window !== 'undefined') {
      const masterCVCreated = sessionStorage.getItem('masterCVCreated');
      if (masterCVCreated !== 'true') {
        saveToStorage(state);
      }
    }
  }, [state]);

  // Don't clear storage when reaching step 3 - keep it until CV is actually saved
  // Storage will be cleared when the Master CV is successfully created
  // This ensures data persists if user needs to sign in

  const nextStep = () => {
    if (state.currentStep < 3) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: (state.currentStep + 1) as 1 | 2 | 3 });
    }
  };

  const prevStep = () => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: (state.currentStep - 1) as 1 | 2 | 3 });
    }
  };

  const goToStep = (step: 1 | 2 | 3) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  };

  return (
    <AICareerReportContext.Provider
      value={{
        state,
        dispatch,
        nextStep,
        prevStep,
        goToStep
      }}
    >
      {children}
    </AICareerReportContext.Provider>
  );
}

// Hook
export function useAICareerReport() {
  const context = useContext(AICareerReportContext);
  if (!context) {
    throw new Error('useAICareerReport must be used within an AICareerReportProvider');
  }
  return context;
}
